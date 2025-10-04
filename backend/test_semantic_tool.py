#!/usr/bin/env python3
"""
Minimal runner to exercise the main semantic search tool logic with local embeddings only.
- Embeds a fixed query using sentence-transformers (CPU)
- Calls Supabase RPC with the embedded vector using the user's JWT
- Optional METRIC env var: 'cosine' | 'ip' | 'l2' (requires corresponding RPCs in DB; no fallbacks)
- Merges results, dedupes by id (keep highest similarity), sorts desc by similarity
- Prints JSON: {"results": [...]} or {"error": "message"}
"""

import json
import os
import sys
import pathlib
from dotenv import load_dotenv

# Ensure we can import `tools.semantic_search` when run from repo root or backend/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

load_dotenv()

from tools.semantic_search import _embed_query_nvidia, _rpc_match_entries

DEFAULT_QUERY = "AI Python Tutor project with React Native and FastAPI"
DEFAULT_MATCH_COUNT = 10
METRIC = None

# IMPORTANT: Token is embedded to enable running as a script without CLI.
# You may override via env var USER_TOKEN if set.
USER_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6Iko5bjdqb0lIN1gxamtLc1ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FkbWVxYWV0bWd4dGxyc2FydWljLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNGQyOWQxOS02NzA5LTQyY2YtOWQ3Ni1hNmMzZDA5MmM2ZWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2ODUxMDc3LCJpYXQiOjE3NTY4NDc0NzcsImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3RfbmFtZSI6IkpvZWwiLCJsYXN0X25hbWUiOiJNYmFrYSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiZDRkMjlkMTktNjcwOS00MmNmLTlkNzYtYTZjM2QwOTJjNmVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTY4NDc0Nzd9XSwic2Vzc2lvbl9pZCI6IjhjMWE4Nzg5LTlhOTQtNDkyYy05OTVkLWZjNDIwNDYyNmRiYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.KYnkz9eivbNG5FQxNo5Zr0cElv_fkWR1REt8q5c6r7o"


def _merge_dedupe_sort(entries):
    """Merge entries, dedupe by id keeping highest similarity, sort desc by similarity."""
    by_id = {}
    no_id = []
    for r in entries:
        item = {
            "id": r.get("id"),
            "client_id": r.get("client_id"),
            "title": r.get("title"),
            "date": r.get("date"),
            "similarity": r.get("similarity"),
        }
        _id = item.get("id")
        if _id is None:
            no_id.append(item)
            continue
        prev = by_id.get(_id)
        curr_sim = float(item.get("similarity") or 0)
        if prev is None or curr_sim > float(prev.get("similarity") or 0):
            by_id[_id] = item

    merged = list(by_id.values()) + no_id
    merged.sort(key=lambda x: float(x.get("similarity") or 0), reverse=True)
    return merged


def run():
    query = DEFAULT_QUERY
    user_token = USER_TOKEN
    match_count = DEFAULT_MATCH_COUNT

    try:
        if not user_token:
            raise RuntimeError("USER_TOKEN is missing. Set it in code or via env var USER_TOKEN.")

        query_embedding = _embed_query_nvidia(query)
        results = _rpc_match_entries(query_embedding, match_count, user_token, METRIC, None, None, None)
        merged = _merge_dedupe_sort(results)
        print(json.dumps({"results": merged}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))


if __name__ == "__main__":
    run()