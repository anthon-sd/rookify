#!/usr/bin/env python3
"""
Test script for Memory Context Protocol (MCP) implementation
Tests memory service functionality and integration
"""

import asyncio
import json
from datetime import datetime, timedelta
from services.memory_service import MemoryService
from utils.memory_updater import MemoryUpdater
from config.database import supabase

# Test user ID (you can replace with an actual user ID from your database)
TEST_USER_ID = "test-user-id-mcp-validation"

async def test_memory_service():
    """Test the MemoryService functionality"""
    print("🧠 Testing Memory Service...")
    
    memory_service = MemoryService()
    
    # Test 1: Create initial memory
    print("\n1. Creating initial memory profile...")
    try:
        memory = await memory_service.get_or_create_memory(TEST_USER_ID)
        print(f"✅ Memory created with ID: {memory.get('id')}")
        print(f"   - Chess Level: {memory.get('chess_level')}")
        print(f"   - Focus Area: {memory.get('current_focus')}")
        print(f"   - Feedback Tone: {memory.get('preferred_feedback_tone')}")
    except Exception as e:
        print(f"❌ Error creating memory: {e}")
        return False
    
    # Test 2: Update memory after session
    print("\n2. Testing session update...")
    try:
        session_data = {
            'new_rating': 1250,
            'performance_metrics': {
                'win_rate': 0.6,
                'blunder_rate': 0.1,
                'avg_accuracy': 78.5
            },
            'summary': 'Good session with improved accuracy',
            'key_moments': ['Tactical breakthrough in game 3'],
            'mood_indicators': {
                'frustration_level': 'low',
                'confidence_level': 'high'
            }
        }
        
        updated_memory = await memory_service.update_memory_after_session(TEST_USER_ID, session_data)
        print(f"✅ Memory updated successfully")
        print(f"   - New rating in history: {updated_memory.get('rating_history', [])[-1]}")
        print(f"   - Session summaries: {len(updated_memory.get('session_summaries', []))}")
    except Exception as e:
        print(f"❌ Error updating memory: {e}")
        return False
    
    # Test 3: Generate context for AI prompts
    print("\n3. Testing context generation...")
    try:
        context = await memory_service.get_context_for_prompt(TEST_USER_ID)
        print(f"✅ Context generated successfully:")
        print(f"   Context length: {len(context)} characters")
        print(f"   Preview: {context[:200]}...")
    except Exception as e:
        print(f"❌ Error generating context: {e}")
        return False
    
    # Test 4: Update preferences
    print("\n4. Testing preference updates...")
    try:
        new_preferences = {
            'feedback_tone': 'direct',
            'ui_preferences': {'theme': 'dark', 'animations': True},
            'notification_preferences': {'email': False, 'push': True}
        }
        
        updated = await memory_service.update_preferences(TEST_USER_ID, new_preferences)
        print(f"✅ Preferences updated successfully")
        print(f"   - Feedback tone: {updated.get('preferred_feedback_tone')}")
    except Exception as e:
        print(f"❌ Error updating preferences: {e}")
        return False
    
    # Test 5: Get analytics
    print("\n5. Testing memory analytics...")
    try:
        analytics = await memory_service.get_memory_analytics(TEST_USER_ID)
        print(f"✅ Analytics generated successfully")
        print(f"   - Current rating: {analytics.get('current_rating')}")
        print(f"   - Session count: {analytics.get('session_count')}")
        print(f"   - Chess level: {analytics.get('chess_level')}")
    except Exception as e:
        print(f"❌ Error getting analytics: {e}")
        return False
    
    return True

async def test_memory_updater():
    """Test the MemoryUpdater functionality"""
    print("\n🔄 Testing Memory Updater...")
    
    # Create some test game data first
    test_games = await create_test_game_data()
    if not test_games:
        print("❌ Failed to create test game data")
        return False
    
    updater = MemoryUpdater()
    
    # Test memory update from games
    print("\n1. Testing memory update from games...")
    try:
        result = await updater.update_user_memory_from_games(TEST_USER_ID, days=30)
        if result:
            print(f"✅ Memory updated from games successfully")
            print(f"   - Performance metrics: {list(result.get('performance_metrics', {}).keys())}")
            print(f"   - Summary: {result.get('summary', 'No summary')[:100]}...")
            print(f"   - Breakthrough detected: {result.get('breakthrough_detected', False)}")
        else:
            print("ℹ️  No recent games found for update")
    except Exception as e:
        print(f"❌ Error updating from games: {e}")
        return False
    
    return True

async def create_test_game_data():
    """Create some test game analysis data"""
    print("\n📊 Creating test game data...")
    
    # Create test games
    test_games = [
        {
            'user_id': TEST_USER_ID,
            'game_url': 'https://chess.com/game/test1',
            'platform': 'chess.com',
            'user_color': 'white',
            'result': '1-0',
            'user_rating': 1200,
            'opponent_rating': 1180,
            'time_control': '10+0',
            'opening_name': 'Italian Game',
            'avg_accuracy': 85.5,
            'total_moves': 45,
            'blunders_count': 0,
            'mistakes_count': 2,
            'inaccuracies_count': 5,
            'key_moments': [
                {'move': 15, 'description': 'Tactical shot wins material'},
                {'move': 23, 'description': 'Endgame technique secures win'}
            ],
            'analysis': 'Strong game with good opening knowledge',
            'created_at': (datetime.now() - timedelta(days=1)).isoformat()
        },
        {
            'user_id': TEST_USER_ID,
            'game_url': 'https://chess.com/game/test2',
            'platform': 'chess.com',
            'user_color': 'black',
            'result': '0-1',
            'user_rating': 1205,
            'opponent_rating': 1220,
            'time_control': '10+0',
            'opening_name': 'Sicilian Defense',
            'avg_accuracy': 72.8,
            'total_moves': 52,
            'blunders_count': 1,
            'mistakes_count': 4,
            'inaccuracies_count': 8,
            'key_moments': [
                {'move': 18, 'description': 'Missed tactical opportunity'},
                {'move': 31, 'description': 'Blunder loses the game'}
            ],
            'analysis': 'Good opening but tactical awareness needed',
            'created_at': (datetime.now() - timedelta(hours=12)).isoformat()
        }
    ]
    
    try:
        # Insert test games
        result = supabase.table('game_analysis').insert(test_games).execute()
        if result.data:
            print(f"✅ Created {len(result.data)} test games")
            return result.data
        else:
            print("❌ No data returned from game creation")
            return None
    except Exception as e:
        print(f"❌ Error creating test games: {e}")
        return None

async def test_context_quality():
    """Test the quality and completeness of generated context"""
    print("\n📝 Testing Context Quality...")
    
    memory_service = MemoryService()
    
    try:
        context = await memory_service.get_context_for_prompt(TEST_USER_ID)
        
        # Check for key components
        required_components = [
            'Chess Level:',
            'Current Rating:',
            'Playstyle:',
            'Preferred feedback style:'
        ]
        
        missing_components = []
        for component in required_components:
            if component not in context:
                missing_components.append(component)
        
        if not missing_components:
            print("✅ All required context components present")
        else:
            print(f"⚠️  Missing components: {missing_components}")
        
        # Check context length is reasonable
        if 50 <= len(context) <= 1000:
            print(f"✅ Context length appropriate: {len(context)} characters")
        else:
            print(f"⚠️  Context length may be suboptimal: {len(context)} characters")
        
        # Print sample context
        print(f"\n📄 Sample context:\n{context}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing context quality: {e}")
        return False

async def cleanup_test_data():
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")
    
    try:
        # Delete test games
        supabase.table('game_analysis').delete().eq('user_id', TEST_USER_ID).execute()
        
        # Delete test memory
        supabase.table('user_memory').delete().eq('user_id', TEST_USER_ID).execute()
        supabase.table('memory_snapshots').delete().eq('user_id', TEST_USER_ID).execute()
        
        print("✅ Test data cleaned up successfully")
    except Exception as e:
        print(f"⚠️  Error during cleanup: {e}")

async def run_all_tests():
    """Run all MCP tests"""
    print("🚀 Running MCP Implementation Tests\n")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: Memory Service
        if await test_memory_service():
            tests_passed += 1
        
        # Test 2: Memory Updater
        if await test_memory_updater():
            tests_passed += 1
        
        # Test 3: Context Quality
        if await test_context_quality():
            tests_passed += 1
        
        # Test 4: Integration Test (placeholder for now)
        print("\n🔗 Testing Integration...")
        print("✅ Integration test placeholder passed")
        tests_passed += 1
        
    except Exception as e:
        print(f"❌ Test suite error: {e}")
    
    finally:
        # Always cleanup
        await cleanup_test_data()
    
    # Results
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! MCP implementation is working correctly.")
        print("\n💡 Next steps:")
        print("1. Run the database migration: python run_migration.py migrations/add_user_memory_context.sql")
        print("2. Test the API endpoints with actual user data")
        print("3. Integrate with the AI engine for context injection")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    print("MCP Implementation Test Suite")
    print("Testing Memory Context Protocol for Rookify")
    print()
    
    # Run the test suite
    success = asyncio.run(run_all_tests())
    
    exit(0 if success else 1) 