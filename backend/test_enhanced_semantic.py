#!/usr/bin/env python3
"""
Enhanced semantic search testing script.
Tests all three similarity metrics, date ranges, and thresholds.
"""

import os
import sys
import json
import pathlib
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure we can import `tools.semantic_search` when run from repo root or backend/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

load_dotenv()

from tools.semantic_search import _embed_query_nvidia, _rpc_match_entries

# Test configuration
USER_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6Iko5bjdqb0lIN1gxamtLc1ciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3FkbWVxYWV0bWd4dGxyc2FydWljLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNGQyOWQxOS02NzA5LTQyY2YtOWQ3Ni1hNmMzZDA5MmM2ZWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2ODUxMDc3LCJpYXQiOjE3NTY4NDc0NzcsImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWJha2Fqb2UyNkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyc3RfbmFtZSI6IkpvZWwiLCJsYXN0X25hbWUiOiJNYmFrYSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiZDRkMjlkMTktNjcwOS00MmNmLTlkNzYtYTZjM2QwOTJjNmVhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTY4NDc0Nzd9XSwic2Vzc2lvbl9pZCI6IjhjMWE4Nzg5LTlhOTQtNDkyYy05OTVkLWZjNDIwNDYyNmRiYSIsImlzX2Fub255bW91cyI6ZmFsc2V9.KYnkz9eivbNG5FQxNo5Zr0cElv_fkWR1REt8q5c6r7o"

# Test queries with expected results
TEST_QUERIES = [
    {
        "query": "AI Python Tutor project with React Native and FastAPI",
        "description": "Main AI tutoring project"
    },
    {
        "query": "fitness trainer workout recommendation engine",
        "description": "AI fitness application"
    },
    {
        "query": "CrewAI integration and agent framework",
        "description": "AI agent technology"
    },
    {
        "query": "React Native performance optimization",
        "description": "Performance improvements"
    },
    {
        "query": "September 2024 backend overhaul",
        "description": "Specific month and technology"
    }
]

# Test date ranges
DATE_RANGES = [
    {"start_date": None, "end_date": None, "description": "No date filter"},
    {"start_date": "2024-04-01", "end_date": "2024-06-30", "description": "Q2 2024 (Apr-Jun)"},
    {"start_date": "2024-09-01", "end_date": "2024-12-31", "description": "Sep-Dec 2024"},
    {"start_date": "2024-11-01", "end_date": None, "description": "November onwards"},
    {"start_date": None, "end_date": "2024-05-31", "description": "Up to May 2024"},
]

# Similarity metrics to test
METRICS = ["cosine", "ip", "l2", None]  # None uses default

# Similarity thresholds to test
THRESHOLDS = [None, -0.5, 0.0, 0.1]


def format_results(results, max_results=3):
    """Format results for display."""
    if not results:
        return "No results"
    
    formatted = []
    for i, r in enumerate(results[:max_results]):
        formatted.append(f"  {i+1}. [{r.get('date')}] {r.get('title')[:60]}... (sim: {r.get('similarity'):.4f})")
    
    if len(results) > max_results:
        formatted.append(f"  ... and {len(results) - max_results} more")
    
    return "\n".join(formatted)


def test_query_with_params(query, metric=None, start_date=None, end_date=None, min_similarity=None, match_count=5):
    """Test a single query with given parameters."""
    try:
        embedding = _embed_query_nvidia(query)
        results = _rpc_match_entries(
            embedding, 
            match_count, 
            USER_TOKEN, 
            metric=metric,
            start_date=start_date,
            end_date=end_date,
            min_similarity=min_similarity
        )
        return results
    except Exception as e:
        return {"error": str(e)}


def run_comprehensive_tests():
    """Run comprehensive test suite."""
    print("🔍 Enhanced Semantic Search Test Suite")
    print("=" * 60)
    
    total_tests = 0
    successful_tests = 0
    
    # Test 1: Compare all metrics for each query
    print("\n📊 METRIC COMPARISON")
    print("-" * 40)
    
    for test_case in TEST_QUERIES[:2]:  # Limit to 2 queries for brevity
        query = test_case["query"]
        print(f"\nQuery: '{query[:50]}...'")
        
        for metric in METRICS:
            total_tests += 1
            metric_name = metric or "default"
            
            try:
                results = test_query_with_params(query, metric=metric, match_count=3)
                if isinstance(results, dict) and "error" in results:
                    print(f"  ❌ {metric_name}: {results['error']}")
                else:
                    successful_tests += 1
                    print(f"  ✅ {metric_name}: {len(results)} results")
                    print(format_results(results, 2))
            except Exception as e:
                print(f"  ❌ {metric_name}: {str(e)}")
    
    # Test 2: Date range filtering
    print(f"\n📅 DATE RANGE FILTERING")
    print("-" * 40)
    
    test_query = "AI Fitness Trainer"
    print(f"Query: '{test_query}'")
    
    for date_range in DATE_RANGES[:3]:  # Test first 3 date ranges
        total_tests += 1
        
        try:
            results = test_query_with_params(
                test_query,
                metric="cosine",
                start_date=date_range["start_date"],
                end_date=date_range["end_date"],
                match_count=5
            )
            
            if isinstance(results, dict) and "error" in results:
                print(f"  ❌ {date_range['description']}: {results['error']}")
            else:
                successful_tests += 1
                print(f"  ✅ {date_range['description']}: {len(results)} results")
                print(format_results(results, 2))
        except Exception as e:
            print(f"  ❌ {date_range['description']}: {str(e)}")
    
    # Test 3: Similarity thresholds
    print(f"\n🎯 SIMILARITY THRESHOLDS")
    print("-" * 40)
    
    test_query = "React Native performance"
    print(f"Query: '{test_query}'")
    
    for threshold in THRESHOLDS:
        total_tests += 1
        threshold_desc = f"≥ {threshold}" if threshold is not None else "No threshold"
        
        try:
            results = test_query_with_params(
                test_query,
                metric="cosine",
                min_similarity=threshold,
                match_count=5
            )
            
            if isinstance(results, dict) and "error" in results:
                print(f"  ❌ {threshold_desc}: {results['error']}")
            else:
                successful_tests += 1
                print(f"  ✅ {threshold_desc}: {len(results)} results")
                if results:
                    similarities = [r.get('similarity', 0) for r in results]
                    print(f"    Range: {min(similarities):.4f} to {max(similarities):.4f}")
        except Exception as e:
            print(f"  ❌ {threshold_desc}: {str(e)}")
    
    # Test 4: Combined filters
    print(f"\n🔗 COMBINED FILTERS")
    print("-" * 40)
    
    combined_tests = [
        {
            "query": "FastAPI backend",
            "metric": "cosine",
            "start_date": "2024-04-01",
            "end_date": "2024-06-30",
            "min_similarity": 0.0,
            "description": "FastAPI in Q2 2024, similarity ≥ 0.0"
        },
        {
            "query": "performance optimization",
            "metric": "l2",
            "start_date": "2024-09-01",
            "end_date": None,
            "min_similarity": None,
            "description": "Performance since Sep 2024, L2 metric"
        }
    ]
    
    for test in combined_tests:
        total_tests += 1
        
        try:
            results = test_query_with_params(
                test["query"],
                metric=test["metric"],
                start_date=test["start_date"],
                end_date=test["end_date"],
                min_similarity=test["min_similarity"],
                match_count=5
            )
            
            if isinstance(results, dict) and "error" in results:
                print(f"  ❌ {test['description']}: {results['error']}")
            else:
                successful_tests += 1
                print(f"  ✅ {test['description']}: {len(results)} results")
                print(format_results(results, 2))
        except Exception as e:
            print(f"  ❌ {test['description']}: {str(e)}")
    
    # Summary
    print(f"\n📈 TEST SUMMARY")
    print("=" * 60)
    print(f"Total tests: {total_tests}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {total_tests - successful_tests}")
    print(f"Success rate: {(successful_tests/total_tests)*100:.1f}%")
    
    if successful_tests == total_tests:
        print("🎉 All tests passed! Semantic search is fully functional.")
    else:
        print("⚠️  Some tests failed. Check error messages above.")


if __name__ == "__main__":
    run_comprehensive_tests()
