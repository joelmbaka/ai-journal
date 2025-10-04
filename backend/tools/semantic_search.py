from __future__ import annotations

import os
import json
from typing import Type, Optional, List, Dict, Any

import requests
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") 
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_NIM_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nvidia/llama-3.2-nv-embedqa-1b-v2")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "768"))  # Match existing embeddings


class SemanticSearchInput(BaseModel):
  """Input schema for semantic search over journal entries."""
  query: Optional[str] = Field(None, description="Optional natural language query. If provided, performs semantic search. If None or blank, date-only or ID-only modes may be used.")
  match_count: int = Field(10, ge=1, le=10000, description="Number of results requested (capped to 50 internally). Default 10.")
  user_token: str = Field(..., description="User's Supabase access token (JWT). Used to respect RLS.")
  ids: Optional[List[str]] = Field(default=None, description="Optional list of entry IDs to fetch full entries. When provided, query is ignored and full entries are returned.")
  # Optional: choose which pgvector similarity operator to use. Requires corresponding RPCs in DB.
  # Supported values: 'cosine' (<=>), 'ip' (<#>), 'l2' (<->)
  metric: Optional[str] = Field(
    default="cosine",
    description="Similarity metric: 'cosine' (recommended, most intuitive 0-1 scores), 'ip' (inner product), 'l2' (euclidean distance). Default: cosine.",
  )
  start_date: Optional[str] = Field(
    default=None,
    description="Optional start date filter in YYYY-MM-DD format. Only entries on or after this date will be returned.",
  )
  end_date: Optional[str] = Field(
    default=None,
    description="Optional end date filter in YYYY-MM-DD format. Only entries on or before this date will be returned.",
  )
  min_similarity: Optional[float] = Field(
    default=0.05,
    description="Minimum similarity threshold (0.05-0.1 recommended range). Only results with similarity >= this value will be returned. Default: 0.05 for quality filtering.",
  )


def _l2_normalize(vec: List[float]) -> List[float]:
  s = sum(v * v for v in vec)
  if s <= 0:
    return vec
  import math
  n = math.sqrt(s)
  return [v / n for v in vec]


 


def _embed_query_nvidia(query: str) -> List[float]:
  """Embed query using NVIDIA NIM API with configurable dimensions."""
  if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY must be set in environment")
  
  client = OpenAI(
    api_key=NVIDIA_API_KEY,
    base_url="https://integrate.api.nvidia.com/v1"
  )
  
  response = client.embeddings.create(
    input=[query],
    model=EMBEDDING_MODEL,
    encoding_format="float",
    extra_body={
      "input_type": "query", 
      "truncate": "NONE",
      "dimensions": EMBEDDING_DIMENSION
    }
  )
  
  embedding = response.data[0].embedding
  # Normalize the vector
  return _l2_normalize(embedding)


def _rpc_match_entries(
  query_embedding: List[float],
  match_count: int,
  user_token: str,
  metric: Optional[str] = None,
  start_date: Optional[str] = None,
  end_date: Optional[str] = None,
  min_similarity: Optional[float] = None,
) -> List[Dict[str, Any]]:
  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")

  # Prefer metric-specific RPCs if provided; otherwise default.
  metric = (metric or '').lower().strip() or None
  metric_rpc_map = {
    'cosine': 'match_journal_entries_cosine',
    'ip': 'match_journal_entries_ip',
    'l2': 'match_journal_entries_l2',
  }
  if metric is not None and metric not in metric_rpc_map:
    raise ValueError("Unsupported metric. Use one of: 'cosine'|'ip'|'l2'")
  rpc_name = metric_rpc_map[metric] if metric is not None else 'match_journal_entries'
  rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/{rpc_name}"
  headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {user_token}",  # use user's token so RLS enforces ownership
  }
  payload = {
    "query_embedding": query_embedding, 
    "match_count": match_count,
    "start_date": start_date,
    "end_date": end_date,
    "min_similarity": min_similarity
  }
  resp = requests.post(rpc_url, headers=headers, data=json.dumps(payload), timeout=30)
  if not resp.ok:
    raise RuntimeError(f"Supabase RPC error {resp.status_code}: {resp.text}")
  return resp.json()


def _rpc_date_only_entries(
  match_count: int,
  user_token: str,
  start_date: Optional[str] = None,
  end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
  """Retrieve entries by date range only, no semantic search."""
  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")
  
  # Direct Supabase query for date-only filtering
  url = f"{SUPABASE_URL}/rest/v1/journal_entries"
  headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {user_token}",
  }
  
  # Build query parameters  
  params = {"select": "id,client_id,title,date", "limit": str(match_count), "order": "date.desc"}
  
  # Build URL with date filters manually for PostgREST
  date_filters = []
  if start_date:
    date_filters.append(f"date=gte.{start_date}")
  if end_date:
    date_filters.append(f"date=lte.{end_date}")
  
  # Construct URL with proper query string
  query_string = "&".join([f"{k}={v}" for k, v in params.items()] + date_filters)
  full_url = f"{url}?{query_string}"
  
  resp = requests.get(full_url, headers=headers, timeout=30)
  if not resp.ok:
    raise RuntimeError(f"Supabase query error {resp.status_code}: {resp.text}")
  
  # Add similarity=None to match semantic search format
  results = resp.json()
  for r in results:
    r["similarity"] = None
  
  return results


def _rpc_fetch_entries_by_ids(
  ids: List[str],
  user_token: str,
) -> List[Dict[str, Any]]:
  """Fetch full journal entries by a list of IDs."""
  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")

  url = f"{SUPABASE_URL}/rest/v1/journal_entries"
  headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {user_token}",
  }
  params = {
    "select": "*",
    "id": f"in.({','.join(ids)})",
    "order": "date.desc",
  }
  resp = requests.get(url, headers=headers, params=params, timeout=30)
  if not resp.ok:
    raise RuntimeError(f"Supabase query error {resp.status_code}: {resp.text}")
  results = resp.json()
  # Normalize shape and strip heavy fields if present
  for r in results:
    r.pop("embedding", None)
    r.pop("query_embedding", None)
    r.setdefault("similarity", None)
  return results


class SemanticSearchJournalTool(BaseTool):
  name: str = "Semantic Search Journal Entries"
  description: str = (
    "🔍 JOURNAL SEARCH - Semantic search OR date-only filtering for user's journal entries. "
    "PERFECT for AI report generation, research, and content discovery.\n\n"
    "📊 CAPABILITIES:\n"
    "• Semantic search: Find entries by topic, technology, project, emotions (requires query)\n"
    "• Date-only search: Get all entries in date range (query=None)\n"
    "• Combined filtering: Date ranges + similarity thresholds\n"
    "• Multiple metrics: Cosine, inner product, or L2 distance\n\n"
    "🎯 CONCRETE EXAMPLES:\n"
    "Semantic search: {\"query\": \"React Native performance\", \"user_token\": \"eyJ...\", \"match_count\": 15, \"start_date\": \"2024-09-01\"}\n"
    "Date-only search: {\"query\": null, \"user_token\": \"eyJ...\", \"start_date\": \"2024-09-01\", \"end_date\": \"2024-09-30\", \"match_count\": 20}\n"
    "Quality filtering: {\"query\": \"debugging\", \"user_token\": \"eyJ...\", \"match_count\": 10, \"min_similarity\": 0.1}\n"
    "Fetch by IDs (full entries): {\"ids\": [\"uuid1\", \"uuid2\"], \"user_token\": \"eyJ...\"}\n\n"
    "⚡ Returns JSON with id, title, date, similarity score (None for date-only). "
    "Respects user authentication via JWT token for secure access."
  )
  args_schema: Type[BaseModel] = SemanticSearchInput

  def _run(self, query: Optional[str], match_count: int, user_token: str, metric: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None, min_similarity: Optional[float] = None, ids: Optional[List[str]] = None) -> str:
    try:
      # Normalize query: treat blanks as None
      if isinstance(query, str):
        query = query.strip()
        if query == "":
          query = None

      # Cap match_count internally to 50
      effective_count = max(1, min(int(match_count or 10), 50))

      if ids:
        # Fetch full entries by IDs
        results = _rpc_fetch_entries_by_ids(ids, user_token)
      elif query:
        # Semantic search with query
        embedding = _embed_query_nvidia(query)
        results = _rpc_match_entries(embedding, effective_count, user_token, metric, start_date, end_date, min_similarity)
      else:
        # Date-only search without semantic similarity
        results = _rpc_date_only_entries(effective_count, user_token, start_date, end_date)
        # Sort by date descending for date-only searches
        results = sorted(results, key=lambda x: x.get('date', ''), reverse=True)
      # Keep response compact
      simplified = []
      for r in results:
        entry = {
          "id": r.get("id"),
          "client_id": r.get("client_id"),
          "title": r.get("title"),
          "date": r.get("date"),
          "similarity": r.get("similarity"),
        }
        if ids:
          # Include content if present when fetching by IDs
          content_val = None
          for k in ("content", "body", "text", "markdown", "note", "entry", "journal_text"):
            if k in r:
              content_val = r.get(k)
              break
          if content_val is not None:
            entry["content"] = content_val
        simplified.append(entry)
      return json.dumps({"results": simplified}, ensure_ascii=False)
    except Exception as e:
      return json.dumps({"error": str(e)}, ensure_ascii=False)
