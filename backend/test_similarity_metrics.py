#!/usr/bin/env python3
"""
Test script to compare pgvector similarity metrics (cosine, inner product, euclidean)
using local sentence-transformers embeddings on provided journal entries.

This script will:
1. Embed a test query using sentence-transformers (local CPU)
2. Test all three pgvector similarity operators: <=> (cosine), <#> (inner product), <-> (euclidean)
3. Compare results and ranking differences
4. Show which metric performs best for the journal data

Usage:
- Set EMBEDDING_BACKEND=local in .env (default)
- Ensure sentence-transformers is installed: pip install sentence-transformers
- Run: python test_similarity_metrics.py
"""

import json
import os
import sys
import pathlib
from typing import List, Dict, Any
from dotenv import load_dotenv

# Ensure we can import from tools
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

load_dotenv()

from tools.semantic_search import _embed_query_local, _rpc_match_entries

# Test queries related to the journal entries provided
TEST_QUERIES = [
    "python projects",
    "mobile app development", 
    "react native",
    "AI and machine learning",
    "performance optimization",
    "backend API development",
    "user interface design",
    "fitness app features"
]

# User token from previous test file
USER_TOKEN = os.getenv("USER_TOKEN") or "eyJhbGciOiJIUzI1NiIsImtpZCI6Iko5bjdqb0lIN1gxamtLc1ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FkbWVxYWV0bWd4dGxyc2FydWljLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNGQyOWQxOS02NzA5LTQyY2YtOWQ3Ni1hNmMzZDA5MmM2ZWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MzgwNDgxLCJpYXQiOjE3NTYzNzY4ODEsImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3RfbmFtZSI6IkpvZWwiLCJsYXN0X25hbWUiOiJNYmFrYSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiZDRkMjlkMTktNjcwOS00MmNmLTlkNzYtYTZjM2QwOTJjNmVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTYzNzY4ODF9XSwic2Vzc2lvbl9pZCI6IjQyYTEyZThjLTVmMGYtNDc4Ni1iZDliLTA3YTZiODQ5M2Q0MCIsImlzX2Fub255bW91cyI6ZmFsc2V9.1AEAPIQHQDzaJzUkZHOdnEoMtPOFhdKs4kH1JQVLXi0"

MATCH_COUNT = 10

def format_results(results: List[Dict[str, Any]], metric_name: str) -> Dict[str, Any]:
    """Format and sort results for display."""
    formatted = []
    for r in results:
        formatted.append({
            "id": r.get("id"),
            "title": r.get("title", "")[:60] + "..." if len(r.get("title", "")) > 60 else r.get("title", ""),
            "date": r.get("date"),
            "similarity": round(float(r.get("similarity", 0)), 4)
        })
    
    # Sort by similarity (descending)
    formatted.sort(key=lambda x: x["similarity"], reverse=True)
    
    return {
        "metric": metric_name,
        "total_results": len(formatted),
        "results": formatted
    }

def compare_rankings(cosine_results: List, ip_results: List, l2_results: List) -> Dict[str, Any]:
    """Compare how different metrics rank the same documents."""
    
    # Get top 5 IDs from each metric
    cosine_top5 = [r.get("id") for r in cosine_results[:5] if r.get("id")]
    ip_top5 = [r.get("id") for r in ip_results[:5] if r.get("id")]
    l2_top5 = [r.get("id") for r in l2_results[:5] if r.get("id")]
    
    # Find overlaps
    cosine_ip_overlap = len(set(cosine_top5) & set(ip_top5))
    cosine_l2_overlap = len(set(cosine_top5) & set(l2_top5))
    ip_l2_overlap = len(set(ip_top5) & set(l2_top5))
    
    return {
        "cosine_vs_inner_product_overlap": f"{cosine_ip_overlap}/5",
        "cosine_vs_euclidean_overlap": f"{cosine_l2_overlap}/5", 
        "inner_product_vs_euclidean_overlap": f"{ip_l2_overlap}/5",
        "cosine_top5_ids": cosine_top5,
        "inner_product_top5_ids": ip_top5,
        "euclidean_top5_ids": l2_top5
    }

def test_single_query(query: str) -> Dict[str, Any]:
    """Test a single query against all three similarity metrics."""
    
    print(f"\n🔍 Testing query: '{query}'")
    print("=" * 50)
    
    try:
        # Generate embedding once
        embedding = _embed_query_local(query)
        print(f"✅ Generated embedding (dim: {len(embedding)})")
        
        results = {}
        metrics = [
            ("cosine", "cosine"),
            ("inner_product", "ip"), 
            ("euclidean", "l2")
        ]
        
        for metric_name, metric_code in metrics:
            try:
                print(f"🧮 Testing {metric_name} similarity...")
                raw_results = _rpc_match_entries(embedding, MATCH_COUNT, USER_TOKEN, metric_code)
                results[metric_name] = format_results(raw_results, metric_name)
                print(f"✅ {metric_name}: {len(raw_results)} results")
            except Exception as e:
                print(f"❌ {metric_name} failed: {e}")
                results[metric_name] = {"error": str(e)}
        
        # Compare rankings if we have results
        comparison = None
        if all(metric in results and "error" not in results[metric] for metric in ["cosine", "inner_product", "euclidean"]):
            comparison = compare_rankings(
                results["cosine"]["results"],
                results["inner_product"]["results"],
                results["euclidean"]["results"]
            )
        
        return {
            "query": query,
            "embedding_dim": len(embedding),
            "results_by_metric": results,
            "ranking_comparison": comparison
        }
        
    except Exception as e:
        return {
            "query": query,
            "error": str(e)
        }

def main():
    """Run similarity metric comparison tests."""
    
    print("🧠 Semantic Search Similarity Metrics Comparison")
    print("Using local sentence-transformers embeddings")
    print(f"Model: {os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')}")
    print("=" * 60)
    
    if not USER_TOKEN:
        print("❌ USER_TOKEN is missing. Set it in .env or as environment variable.")
        return
    
    all_results = []
    
    for query in TEST_QUERIES:
        result = test_single_query(query)
        all_results.append(result)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    successful_tests = [r for r in all_results if "error" not in r]
    failed_tests = [r for r in all_results if "error" in r]
    
    print(f"✅ Successful tests: {len(successful_tests)}/{len(TEST_QUERIES)}")
    print(f"❌ Failed tests: {len(failed_tests)}")
    
    if failed_tests:
        print("\nFailed queries:")
        for test in failed_tests:
            print(f"  - '{test['query']}': {test['error']}")
    
    # Metric availability summary
    if successful_tests:
        metric_success = {"cosine": 0, "inner_product": 0, "euclidean": 0}
        for test in successful_tests:
            for metric in metric_success.keys():
                if metric in test.get("results_by_metric", {}) and "error" not in test["results_by_metric"][metric]:
                    metric_success[metric] += 1
        
        print(f"\nMetric availability:")
        for metric, count in metric_success.items():
            print(f"  - {metric}: {count}/{len(successful_tests)} queries")
    
    # Save detailed results
    output_file = "similarity_metrics_test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Detailed results saved to: {output_file}")
    
    # Recommendations
    print("\n🎯 RECOMMENDATIONS")
    print("=" * 60)
    print("1. If all metrics work: Test with your actual queries to see which gives better results")
    print("2. Cosine similarity (<=>): Good default, works with normalized and non-normalized vectors")
    print("3. Inner product (<#>): Fastest if vectors are normalized (as they are in this implementation)")
    print("4. Euclidean distance (<->): Good for absolute distance, less common for text similarity")
    print("\nNext: Create metric-specific RPC functions in your Supabase database if not already present.")

if __name__ == "__main__":
    main()
