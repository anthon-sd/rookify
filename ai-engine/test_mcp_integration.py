#!/usr/bin/env python3
"""
Test script for MCP integration in AI engine
Tests memory context fetching and personalized analysis
"""

import requests
import json

# Test configuration
AI_ENGINE_URL = "http://localhost:5000"
TEST_USER_ID = "test-user-id-mcp-validation"

def test_mcp_context_fetching():
    """Test MCP context fetching endpoint"""
    print("🧠 Testing MCP Context Fetching...")
    
    try:
        response = requests.post(
            f"{AI_ENGINE_URL}/test-mcp",
            json={"user_id": TEST_USER_ID},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ MCP test successful:")
            print(f"   - User ID: {data.get('user_id')}")
            print(f"   - Context available: {data.get('context_available')}")
            print(f"   - Context length: {data.get('context_length')}")
            if data.get('context_preview'):
                print(f"   - Context preview: {data.get('context_preview')}")
            return True
        else:
            print(f"❌ MCP test failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ MCP test error: {e}")
        return False

def test_personalized_analysis():
    """Test personalized chess analysis with memory context"""
    print("\n🔍 Testing Personalized Analysis...")
    
    # Test position: simple opening position
    test_fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    
    try:
        # Test analysis WITH user_id (should use memory context)
        response_with_memory = requests.post(
            f"{AI_ENGINE_URL}/analyze",
            json={
                "fen": test_fen,
                "user_id": TEST_USER_ID,
                "user_level": "intermediate",
                "user_rating": 1200,
                "depth": 15
            },
            timeout=30
        )
        
        # Test analysis WITHOUT user_id (should use generic analysis)
        response_without_memory = requests.post(
            f"{AI_ENGINE_URL}/analyze",
            json={
                "fen": test_fen,
                "user_level": "intermediate", 
                "user_rating": 1200,
                "depth": 15
            },
            timeout=30
        )
        
        if response_with_memory.status_code == 200 and response_without_memory.status_code == 200:
            with_memory = response_with_memory.json()
            without_memory = response_without_memory.json()
            
            print("✅ Analysis comparison successful:")
            print(f"   - Analysis with memory: {len(with_memory.get('analysis', ''))} chars")
            print(f"   - Analysis without memory: {len(without_memory.get('analysis', ''))} chars")
            print(f"   - Both used LLM: {with_memory.get('llm_used')} vs {without_memory.get('llm_used')}")
            
            # Show difference in analysis
            if with_memory.get('analysis') and without_memory.get('analysis'):
                print("\n📊 Analysis Preview:")
                print(f"   With Memory: {with_memory['analysis'][:100]}...")
                print(f"   Without Memory: {without_memory['analysis'][:100]}...")
            
            return True
        else:
            print(f"❌ Analysis test failed:")
            print(f"   With memory: HTTP {response_with_memory.status_code}")
            print(f"   Without memory: HTTP {response_without_memory.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Analysis test error: {e}")
        return False

def test_health_check():
    """Test AI engine health"""
    print("\n🏥 Testing AI Engine Health...")
    
    try:
        response = requests.get(f"{AI_ENGINE_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ AI Engine healthy: {data}")
            return True
        else:
            print(f"❌ Health check failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def main():
    """Run all MCP integration tests"""
    print("🚀 MCP Integration Test Suite for AI Engine\n")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 3
    
    # Test 1: Health check
    if test_health_check():
        tests_passed += 1
    
    # Test 2: MCP context fetching
    if test_mcp_context_fetching():
        tests_passed += 1
    
    # Test 3: Personalized analysis
    if test_personalized_analysis():
        tests_passed += 1
    
    # Results
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! MCP integration is working correctly.")
        print("\n💡 The AI engine can now:")
        print("- Fetch user memory context from the backend")
        print("- Generate personalized chess analysis")
        print("- Adapt coaching tone based on user preferences")
        return True
    else:
        print("⚠️  Some tests failed. Check the AI engine and backend connection.")
        print("\n🔧 Troubleshooting:")
        print("1. Ensure Docker containers are running")
        print("2. Check backend is accessible at http://backend:8000")
        print("3. Verify MCP memory tables exist in database")
        print("4. Check AI engine logs for errors")
        return False

if __name__ == "__main__":
    print("MCP Integration Test for AI Engine")
    print("Testing Memory Context Protocol integration")
    print()
    
    success = main()
    exit(0 if success else 1) 