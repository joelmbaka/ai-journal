#!/usr/bin/env python3
"""
Direct test of semantic search functions without CrewAI imports
"""

import os
import sys
import json
import requests
import math
from dotenv import load_dotenv

# Load environment
load_dotenv()

def _l2_normalize(vec):
    """L2 normalize vector"""
    s = sum(v * v for v in vec)
    if s <= 0:
        return vec
    n = math.sqrt(s)
    return [v / n for v in vec]

def _embed_query_gemini(query):
    """Get Gemini embedding without importing the tool"""
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in environment")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_api_key}"
    body = {"content": {"parts": [{"text": query}]}}
    resp = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=30)
    
    if not resp.ok:
        raise RuntimeError(f"Gemini embed error {resp.status_code}: {resp.text}")
    
    data = resp.json()
    values = data.get("embedding", {}).get("values")
    if not isinstance(values, list):
        raise RuntimeError("Unexpected Gemini embed response shape")
    
    return _l2_normalize([float(x) for x in values])

def _rpc_match_entries(query_embedding, match_count, user_token):
    """Call Supabase RPC without importing the tool"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_anon_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")

    rpc_url = f"{supabase_url}/rest/v1/rpc/match_journal_entries"
    headers = {
        "Content-Type": "application/json",
        "apikey": supabase_anon_key,
        "Authorization": f"Bearer {user_token}",
    }
    payload = {"query_embedding": query_embedding, "match_count": match_count}
    resp = requests.post(rpc_url, headers=headers, data=json.dumps(payload), timeout=30)
    
    if not resp.ok:
        raise RuntimeError(f"Supabase RPC error {resp.status_code}: {resp.text}")
    
    return resp.json()

def test_embedding():
    """Test Gemini embedding function"""
    print("Testing Gemini embedding...")
    try:
        query = "Which apps do I have in production"
        embedding = _embed_query_gemini(query)
        print(f"✓ Embedding successful: {len(embedding)} dimensions")
        return embedding
    except Exception as e:
        print(f"✗ Embedding failed: {e}")
        return None

def test_rpc_search(embedding, user_token):
    """Test Supabase RPC function"""
    print("Testing Supabase RPC search...")
    try:
        results = _rpc_match_entries(embedding, 10, user_token)
        print(f"✓ RPC search successful: {len(results)} results")
        return results
    except Exception as e:
        print(f"✗ RPC search failed: {e}")
        return None

def test_full_tool(query, user_token):
    """Test the full tool without CrewAI import"""
    print("Testing full semantic search flow...")
    try:
        # Import individual functions to avoid CrewAI
        from tools.semantic_search import _embed_query_gemini, _rpc_match_entries
        
        # Step 1: Get embedding
        embedding = _embed_query_gemini(query)
        print(f"✓ Got embedding: {len(embedding)} dims")
        
        # Step 2: Search
        results = _rpc_match_entries(embedding, 10, user_token)
        
        # Step 3: Format like the tool does
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
        
        output = json.dumps({"results": simplified}, ensure_ascii=False)
        print("✓ Full tool test successful!")
        print("Raw JSON output:")
        print(json.dumps(json.loads(output), indent=2))
        return output
        
    except Exception as e:
        error_output = json.dumps({"error": str(e)}, ensure_ascii=False)
        print(f"✗ Full tool test failed: {e}")
        print("Error JSON output:")
        print(error_output)
        return error_output

def main():
    print("=== SemanticSearchJournalTool Direct Test ===\n")
    
    # Your token and query
    query = "Which apps do I have in production"
    user_token = "eyJhbGciOiJIUzI1NiIsImtpZCI6Iko5bjdqb0lIN1gxamtLc1ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FkbWVxYWV0bWd4dGxyc2FydWljLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNGQyOWQxOS02NzA5LTQyY2YtOWQ3Ni1hNmMzZDA5MmM2ZWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MzgwNDgxLCJpYXQiOjE3NTYzNzY4ODEsImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3RfbmFtZSI6IkpvZWwiLCJsYXN0X25hbWUiOiJNYmFrYSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiZDRkMjlkMTktNjcwOS00MmNmLTlkNzYtYTZjM2QwOTJjNmVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTYzNzY4ODF9XSwic2Vzc2lvbl9pZCI6IjQyYTEyZThjLTVmMGYtNDc4Ni1iZDliLTA3YTZiODQ5M2Q0MCIsImlzX2Fub255bW91cyI6ZmFsc2V9.1AEAPIQHQDzaJzUkZHOdnEoMtPOFhdKs4kH1JQVLXi0"
    
    print(f"Query: {query}")
    print(f"Token: {user_token[:50]}...\n")
    
    # Test components individually
    embedding = test_embedding()
    if embedding:
        results = test_rpc_search(embedding, user_token)
    
    print("\n" + "="*50 + "\n")
    
    # Test full flow
    test_full_tool(query, user_token)

if __name__ == "__main__":
    main()
