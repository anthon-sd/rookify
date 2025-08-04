#!/usr/bin/env python3
"""
Test script to debug the game analysis pipeline
"""

from backend.chess_com import parse_pgn_game
from backend.game_analyzer import GameAnalyzer
import requests
import json

def test_pgn_parsing():
    """Test PGN parsing functionality"""
    print("=" * 50)
    print("Testing PGN Parsing")
    print("=" * 50)
    
    sample_pgn = '''[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.15"]
[Round "-"]
[White "testuser"]
[Black "opponent"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1485"]
[TimeControl "600"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Bb7 10. d4 Re8 1-0'''
    
    try:
        moments = parse_pgn_game(sample_pgn)
        print(f"✅ PGN parsing successful")
        print(f"   Parsed {len(moments)} moments")
        
        if moments:
            print(f"   First moment keys: {list(moments[0].keys())}")
            print(f"   First moment sample: {moments[0]}")
        else:
            print("❌ No moments parsed")
            
        return moments
    except Exception as e:
        print(f"❌ PGN parsing failed: {e}")
        import traceback
        traceback.print_exc()
        return []

def test_ai_engine_connectivity():
    """Test AI engine connectivity and analysis"""
    print("\n" + "=" * 50)
    print("Testing AI Engine Connectivity")
    print("=" * 50)
    
    try:
        # Test health endpoint
        health_response = requests.get("http://localhost:5000/health", timeout=10)
        print(f"✅ AI Engine health: {health_response.status_code}")
        print(f"   Response: {health_response.json()}")
        
        # Test analysis endpoint
        test_payload = {
            "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "depth": 15,
            "user_level": "intermediate",
            "user_rating": 1500
        }
        
        analysis_response = requests.post(
            "http://localhost:5000/analyze",
            json=test_payload,
            timeout=30
        )
        
        print(f"✅ AI Engine analysis: {analysis_response.status_code}")
        result = analysis_response.json()
        print(f"   Best move: {result.get('best_move')}")
        print(f"   Evaluation: {result.get('evaluation')}")
        print(f"   LLM used: {result.get('llm_used')}")
        print(f"   Analysis length: {len(result.get('analysis', ''))}")
        
        return True
    except Exception as e:
        print(f"❌ AI Engine test failed: {e}")
        return False

def test_game_analyzer():
    """Test the GameAnalyzer class"""
    print("\n" + "=" * 50)
    print("Testing GameAnalyzer")
    print("=" * 50)
    
    try:
        analyzer = GameAnalyzer()
        print(f"✅ GameAnalyzer initialized")
        print(f"   AI Engine URL: {analyzer.ai_engine_url}")
        
        # Test with sample moments
        sample_moments = [
            {
                "user_id": "test-user",
                "position_fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                "move": "e7e5",
                "game_url": "test-game"
            }
        ]
        
        print("   Testing analyze_game_moments...")
        analyzed = analyzer.analyze_game_moments(
            sample_moments, 
            depth=10, 
            user_rating=1500, 
            user_level="intermediate"
        )
        
        print(f"✅ Analysis completed")
        print(f"   Analyzed {len(analyzed)} moments")
        
        if analyzed:
            print(f"   First analyzed moment keys: {list(analyzed[0].keys())}")
        
        return True
    except Exception as e:
        print(f"❌ GameAnalyzer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_full_pipeline():
    """Test the complete analysis pipeline"""
    print("\n" + "=" * 50)
    print("Testing Full Pipeline")
    print("=" * 50)
    
    # Parse PGN
    moments = test_pgn_parsing()
    if not moments:
        print("❌ Cannot test full pipeline - PGN parsing failed")
        return False
    
    # Test AI engine
    if not test_ai_engine_connectivity():
        print("❌ Cannot test full pipeline - AI engine failed")
        return False
    
    # Test game analyzer
    if not test_game_analyzer():
        print("❌ Cannot test full pipeline - GameAnalyzer failed")
        return False
    
    print("\n✅ Full pipeline test completed successfully!")
    return True

if __name__ == "__main__":
    print("🚀 Starting analysis pipeline debugging...")
    test_full_pipeline()