from __future__ import annotations

import os
import json
from typing import Type, Optional, List, Dict, Any

import requests
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL") 
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


class SemanticSearchInput(BaseModel):
  """Input schema for semantic search over journal entries."""
  query: str = Field(..., description="Natural language query to search the user's journal entries.")
  match_count: int = Field(10, ge=1, le=50, description="Number of results to return (1-50). Default 10.")
  user_token: str = Field(..., description="User's Supabase access token (JWT). Used to respect RLS.")


def _l2_normalize(vec: List[float]) -> List[float]:
  s = sum(v * v for v in vec)
  if s <= 0:
    return vec
  import math
  n = math.sqrt(s)
  return [v / n for v in vec]


def _embed_query_gemini(query: str) -> List[float]:
  if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment")
  url = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "text-embedding-004:embedContent?key=" + GEMINI_API_KEY
  )
  body = {"content": {"parts": [{"text": query}]}}
  resp = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=30)
  if not resp.ok:
    raise RuntimeError(f"Gemini embed error {resp.status_code}: {resp.text}")
  data = resp.json()
  values = data.get("embedding", {}).get("values")
  if not isinstance(values, list):
    raise RuntimeError("Unexpected Gemini embed response shape")
  return _l2_normalize([float(x) for x in values])


def _rpc_match_entries(query_embedding: List[float], match_count: int, user_token: str) -> List[Dict[str, Any]]:
  if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")

  rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/match_journal_entries"
  headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {user_token}",  # use user's token so RLS enforces ownership
  }
  payload = {"query_embedding": query_embedding, "match_count": match_count}
  resp = requests.post(rpc_url, headers=headers, data=json.dumps(payload), timeout=30)
  if not resp.ok:
    raise RuntimeError(f"Supabase RPC error {resp.status_code}: {resp.text}")
  return resp.json()


class SemanticSearchJournalTool(BaseTool):
  name: str = "Semantic Search Journal Entries"
  description: str = (
    "Given a natural-language query, embeds it with Gemini and performs a pgvector semantic "
    "search over the authenticated user's journal entries in Supabase. Returns the top matches "
    "with similarity scores, titles, and dates. Requires the user's Supabase JWT to respect RLS."
  )
  args_schema: Type[BaseModel] = SemanticSearchInput

  def _run(self, query: str, match_count: int, user_token: str) -> str:
    try:
      embedding = _embed_query_gemini(query)
      results = _rpc_match_entries(embedding, match_count, user_token)
      # Keep response compact
      simplified = [
        {
          "id": r.get("id"),
          "client_id": r.get("client_id"),
          "title": r.get("title"),
          "date": r.get("date"),
          "similarity": r.get("similarity"),
        }
        for r in results
      ]
      return json.dumps({"results": simplified}, ensure_ascii=False)
    except Exception as e:
      return json.dumps({"error": str(e)}, ensure_ascii=False)
