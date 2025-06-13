import requests
import json
from chess_com import ChessComAPI, parse_pgn_game
from game_analyzer import GameAnalyzer
from pinecone_upload import upload_to_pinecone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def test_chess_com_integration():
    """Test the Chess.com API integration."""
    print("\n=== Testing Chess.com Integration ===")
    
    # Replace with your Chess.com username
    username = "Swaayven"  # Using your account as an example
    
    try:
        # Initialize API
        print(f"\nInitializing Chess.com API for user: {username}")
        api = ChessComAPI(username)
        
        # Get user profile
        print("\nFetching user profile...")
        profile = api.get_user_profile()
        if not profile:
            raise Exception("Failed to fetch user profile")
        print(f"Successfully fetched profile for {username}")
        
        # Get user stats
        print("\nFetching user stats...")
        stats = api.get_user_stats()
        if not stats:
            raise Exception("Failed to fetch user stats")
        print(f"Successfully fetched stats for {username}")
        
        # Get monthly archives
        print("\nFetching monthly archives...")
        archives = api.get_monthly_archives()
        if not archives:
            print("Warning: No monthly archives found")
        else:
            print(f"Found {len(archives)} monthly archives")
        
        # Get recent games
        print("\nFetching recent games...")
        games = api.get_recent_games(days=7)  # Last 7 days
        if not games:
            print("Warning: No recent games found")
        else:
            print(f"Found {len(games)} games from the last 7 days")
        
        # Get live games for 15+10 time control
        print("\nFetching live games (15+10)...")
        live_games = api.get_live_games(base_time=900, increment=10)
        if not live_games:
            print("Warning: No live games found")
        else:
            print(f"Found {len(live_games)} live games with 15+10 time control")
        
        if games:
            # Parse first game
            print("\nParsing first game...")
            moments = parse_pgn_game(games[0])
            if not moments:
                print("Warning: Failed to parse game moments")
            else:
                print(f"Successfully parsed {len(moments)} positions from the game")
            
            if moments:
                # Test game analysis
                print("\n=== Testing Game Analysis ===")
                analyzer = GameAnalyzer(ai_engine_url="http://ai-engine:5000")
                
                # Analyze first few positions
                print("\nAnalyzing positions...")
                analyzed_moments = analyzer.analyze_game_moments(moments[:3])
                if not analyzed_moments:
                    print("Warning: Failed to analyze game moments")
                else:
                    print(f"Successfully analyzed {len(analyzed_moments)} positions")
                    for i, moment in enumerate(analyzed_moments, 1):
                        print(f"\nPosition {i}:")
                        print(f"FEN: {moment['position_fen']}")
                        print(f"Tag: {moment['tag']}")
                        print(f"Commentary: {moment['commentary']}")
                        print(f"Analysis: {moment['analysis']}")
                
                # Test vector database upload
                print("\n=== Testing Vector Database Upload ===")
                print("Uploading analyzed moments to Pinecone...")
                try:
                    upload_to_pinecone(analyzed_moments)
                    print("Successfully uploaded moments to Pinecone")
                except Exception as e:
                    print(f"Error uploading to Pinecone: {str(e)}")
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        raise
    
    return username

def test_api_endpoints():
    """Test the FastAPI endpoints."""
    print("\n=== Testing API Endpoints ===")
    
    # Base URL for the API - use Docker port
    base_url = "http://localhost:8000"
    
    # Get the username from the integration test
    username = test_chess_com_integration()
    
    try:
        # Test connection endpoint
        print(f"\nTesting /chess-com/connect endpoint for user: {username}")
        response = requests.post(
            f"{base_url}/chess-com/connect",
            json={"username": username, "days": 7}
        )
        if response.status_code != 200:
            print(f"Error: Connection endpoint returned status code {response.status_code}")
            print(f"Response: {response.text}")
        else:
            print("Successfully connected to Chess.com API")
        
        # Test game analysis endpoint
        if response.status_code == 200:
            print(f"\nTesting /chess-com/analyze-games endpoint for user: {username}")
            response = requests.post(
                f"{base_url}/chess-com/analyze-games",
                json={"username": username, "days": 7}
            )
            if response.status_code != 200:
                print(f"Error: Analysis endpoint returned status code {response.status_code}")
                print(f"Response: {response.text}")
            else:
                print("Successfully analyzed games")
        
        # Test position analysis
        print("\nTesting position analysis endpoint...")
        try:
            analysis = requests.post(
                "http://ai-engine:5000/analyze",
                json={
                    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                    "depth": 20
                }
            )
            if analysis.status_code != 200:
                print(f"Error: Position analysis returned status code {analysis.status_code}")
                print(f"Response: {analysis.text}")
            else:
                print("Successfully analyzed starting position")
        except Exception as e:
            print(f"Error during position analysis: {str(e)}")
        
    except Exception as e:
        print(f"Error testing API endpoints: {str(e)}")
        raise

if __name__ == "__main__":
    print("Starting Chess.com Integration Tests...")
    
    try:
        # Test API endpoints (which will also run the integration test)
        test_api_endpoints()
        print("\nAll tests completed successfully!")
    except Exception as e:
        print(f"\nTests failed with error: {str(e)}")
        exit(1) 