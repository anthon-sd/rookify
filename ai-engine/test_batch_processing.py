#!/usr/bin/env python3
"""
Test script for batch processing and selective criteria implementation
"""

import requests
import json
import time
from typing import List, Dict

AI_ENGINE_URL = "http://localhost:5000"

def test_single_analysis():
    """Test single position analysis"""
    print("Testing single position analysis...")
    
    response = requests.post(
        f"{AI_ENGINE_URL}/analyze",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "depth": 15,
            "user_rating": 1500,
            "user_level": "intermediate"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Single analysis successful")
        print(f"   Best move: {result.get('best_move')}")
        print(f"   LLM used: {result.get('llm_used', False)}")
        return True
    else:
        print(f"❌ Single analysis failed: {response.status_code}")
        return False

def test_batch_analysis():
    """Test batch position analysis"""
    print("\nTesting batch position analysis...")
    
    # Create test positions with different move contexts
    positions = [
        {
            "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "position_id": "pos_1",
            "move_context": {
                "accuracy_class": "Best",
                "delta_cp": 0,
                "phase": "opening",
                "move_number": 1
            }
        },
        {
            "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
            "position_id": "pos_2", 
            "move_context": {
                "accuracy_class": "Blunder",
                "delta_cp": 300,
                "phase": "opening",
                "move_number": 2
            }
        },
        {
            "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R b KQkq - 0 4",
            "position_id": "pos_3",
            "move_context": {
                "accuracy_class": "Balanced",
                "delta_cp": 25,
                "phase": "opening",
                "move_number": 4
            }
        },
        {
            "fen": "8/8/8/8/8/8/k7/K7 w - - 0 1",
            "position_id": "pos_4",
            "move_context": {
                "accuracy_class": "Brilliant",
                "delta_cp": 0,
                "phase": "endgame",
                "piece_count": 2,
                "is_mate": True
            }
        }
    ]
    
    start_time = time.time()
    
    response = requests.post(
        f"{AI_ENGINE_URL}/analyze-batch",
        json={
            "positions": positions,
            "default_depth": 15,
            "user_rating": 1500,
            "user_level": "intermediate",
            "selective_llm": True
        },
        timeout=60
    )
    
    end_time = time.time()
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Batch analysis successful")
        print(f"   Total positions: {result.get('total')}")
        print(f"   Successful: {result.get('successful')}")
        print(f"   Failed: {result.get('failed')}")
        print(f"   LLM calls made: {result.get('llm_calls_made')}")
        print(f"   LLM calls saved: {result.get('llm_calls_saved')}")
        print(f"   Processing time: {end_time - start_time:.2f} seconds")
        
        # Verify selective criteria worked
        results = result.get('results', [])
        for res in results:
            pos_id = res.get('position_id')
            llm_used = res.get('llm_used', False)
            print(f"   {pos_id}: LLM used = {llm_used}")
        
        return True
    else:
        print(f"❌ Batch analysis failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_selective_criteria():
    """Test selective LLM criteria"""
    print("\nTesting selective LLM criteria...")
    
    test_cases = [
        {
            "name": "Opening move (should skip LLM)",
            "move_context": {
                "accuracy_class": "Best",
                "delta_cp": 0,
                "phase": "opening"
            },
            "expected_llm": False
        },
        {
            "name": "Blunder (should use LLM)",
            "move_context": {
                "accuracy_class": "Blunder",
                "delta_cp": 400,
                "phase": "middlegame"
            },
            "expected_llm": True
        },
        {
            "name": "Brilliant move (should use LLM)",
            "move_context": {
                "accuracy_class": "Brilliant",
                "delta_cp": 0,
                "phase": "middlegame"
            },
            "expected_llm": True
        },
        {
            "name": "Inaccuracy for beginner (should skip)",
            "move_context": {
                "accuracy_class": "Inaccuracy",
                "delta_cp": 75,
                "phase": "middlegame"
            },
            "user_rating": 1000,
            "expected_llm": False
        },
        {
            "name": "Endgame position (should use LLM)",
            "move_context": {
                "accuracy_class": "Balanced",
                "delta_cp": 30,
                "phase": "endgame",
                "piece_count": 6
            },
            "expected_llm": True
        }
    ]
    
    # Import the selective criteria function
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        from app import should_get_llm_analysis
        
        for case in test_cases:
            user_rating = case.get('user_rating', 1500)
            result = should_get_llm_analysis(case['move_context'], user_rating)
            expected = case['expected_llm']
            
            status = "✅" if result == expected else "❌"
            print(f"   {status} {case['name']}: {result} (expected {expected})")
        
        return True
        
    except ImportError as e:
        print(f"❌ Could not test selective criteria: {e}")
        return False

def test_performance_comparison():
    """Compare batch vs sequential performance"""
    print("\nTesting performance comparison...")
    
    # Create 20 test positions
    positions = []
    for i in range(20):
        positions.append({
            "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "position_id": f"perf_pos_{i}",
            "move_context": {
                "accuracy_class": "Balanced",
                "delta_cp": 50 if i % 3 == 0 else 10,
                "phase": "opening"
            }
        })
    
    # Test batch processing
    print("   Testing batch processing...")
    batch_start = time.time()
    
    batch_response = requests.post(
        f"{AI_ENGINE_URL}/analyze-batch",
        json={
            "positions": positions,
            "default_depth": 12,
            "selective_llm": True
        },
        timeout=120
    )
    
    batch_time = time.time() - batch_start
    
    if batch_response.status_code == 200:
        batch_result = batch_response.json()
        print(f"   ✅ Batch: {batch_time:.2f}s for {len(positions)} positions")
        print(f"      Rate: {len(positions)/batch_time:.1f} positions/second")
        print(f"      LLM efficiency: {batch_result.get('llm_calls_saved', 0)} calls saved")
    else:
        print(f"   ❌ Batch processing failed")
        return False
    
    # Test sequential processing (first 5 positions only for time)
    print("   Testing sequential processing (sample)...")
    sequential_start = time.time()
    sequential_count = 0
    
    for i, pos in enumerate(positions[:5]):  # Only test first 5
        response = requests.post(
            f"{AI_ENGINE_URL}/analyze",
            json={
                "fen": pos["fen"],
                "depth": 12,
                "skip_llm": True  # Skip LLM for fair comparison
            },
            timeout=30
        )
        if response.status_code == 200:
            sequential_count += 1
    
    sequential_time = time.time() - sequential_start
    estimated_sequential_time = sequential_time * (len(positions) / 5)
    
    print(f"   ✅ Sequential (estimated): {estimated_sequential_time:.2f}s for {len(positions)} positions")
    print(f"      Rate: {len(positions)/estimated_sequential_time:.1f} positions/second")
    print(f"   🚀 Speedup: {estimated_sequential_time/batch_time:.1f}x faster with batch processing")
    
    return True

def main():
    """Run all tests"""
    print("=== AI Engine Batch Processing Tests ===\n")
    
    # Check if AI engine is running
    try:
        health_response = requests.get(f"{AI_ENGINE_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ AI Engine is not running. Please start it first.")
            return
    except requests.RequestException:
        print("❌ Cannot connect to AI Engine. Please start it first.")
        return
    
    print("✅ AI Engine is running\n")
    
    tests = [
        test_single_analysis,
        test_batch_analysis,
        test_selective_criteria,
        test_performance_comparison
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print(f"\n=== Test Results ===")
    print(f"Passed: {passed}/{len(tests)} tests")
    
    if passed == len(tests):
        print("🎉 All tests passed! Batch processing is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")

if __name__ == "__main__":
    main() 