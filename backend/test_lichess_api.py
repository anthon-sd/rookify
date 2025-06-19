#!/usr/bin/env python3

"""
Test script for Lichess API client.
This script demonstrates how to use the LichessAPI class to fetch games.
"""

from lichess_api import LichessAPI
from datetime import datetime, timedelta, timezone
import json

def test_lichess_api():
    """Test the Lichess API client with a well-known player."""
    
    print("=== Testing Lichess API Client ===\n")
    
    # Initialize API client (no token needed for public data)
    api = LichessAPI()
    
    # Test 1: Get player information
    print("Test 1: Getting player information for 'DrNykterstein' (Magnus Carlsen)")
    try:
        player_info = api.get_player_info('DrNykterstein')
        print(f"✅ Username: {player_info['username']}")
        print(f"✅ Title: {player_info.get('title', 'None')}")
        print(f"✅ Total games: {player_info['games_played']}")
        print(f"✅ Ratings: {list(player_info['ratings'].keys())}")
        print()
    except Exception as e:
        print(f"❌ Error getting player info: {e}")
        return
    
    # Test 2: Get recent games
    print("Test 2: Getting recent games (last 3 days, max 5 games)")
    try:
        since = datetime.now(timezone.utc) - timedelta(days=3)
        games = api.get_user_games(
            username='DrNykterstein',
            max_games=5,
            since=since,
            game_types=['blitz', 'rapid', 'classical']
        )
        
        print(f"✅ Found {len(games)} recent games")
        
        if games:
            # Show details of first game
            game = games[0]
            print(f"\nFirst game details:")
            print(f"  URL: {game['url']}")
            print(f"  Platform: {game['platform']}")
            print(f"  Time Control: {game['time_control']}")
            print(f"  Time Class: {game['time_class']}")
            print(f"  Rated: {game['rated']}")
            print(f"  Opening: {game['opening']}")
            print(f"  White: {game['white']['username']} ({game['white']['rating']}) - {game['white']['result']}")
            print(f"  Black: {game['black']['username']} ({game['black']['rating']}) - {game['black']['result']}")
            print(f"  User Color: {game['user_color']}")
            
            # Show PGN snippet
            pgn_lines = game['pgn'].split('\n')
            print(f"\nPGN Headers (first 10 lines):")
            for i, line in enumerate(pgn_lines[:10]):
                print(f"  {line}")
            if len(pgn_lines) > 10:
                print(f"  ... (and {len(pgn_lines) - 10} more lines)")
        
        print()
    except Exception as e:
        print(f"❌ Error getting games: {e}")
        return
    
    # Test 3: Get games from specific time period
    print("Test 3: Getting games from a specific week")
    try:
        # Get games from 1 week ago
        since = datetime.now(timezone.utc) - timedelta(days=14)
        until = datetime.now(timezone.utc) - timedelta(days=7)
        
        games = api.get_user_games(
            username='DrNykterstein',
            max_games=10,
            since=since,
            until=until,
            game_types=['rapid']  # Only rapid games
        )
        
        print(f"✅ Found {len(games)} rapid games from specific week")
        
        if games:
            print("Game time controls:")
            for i, game in enumerate(games[:3]):  # Show first 3
                print(f"  {i+1}. {game['time_control']} - {game['opening'][:30]}...")
        
        print()
    except Exception as e:
        print(f"❌ Error getting historical games: {e}")
        return
    
    # Test 4: Test convenience method
    print("Test 4: Using convenience method for recent games")
    try:
        recent_games = api.get_recent_games('DrNykterstein', days=2)
        print(f"✅ Found {len(recent_games)} games from last 2 days")
        print()
    except Exception as e:
        print(f"❌ Error with convenience method: {e}")
        return
    
    print("🎉 All tests passed! Lichess API client is working correctly.")

def test_pgn_format():
    """Test PGN format generation with a sample game."""
    print("\n=== Testing PGN Format ===\n")
    
    api = LichessAPI()
    
    try:
        # Get one game and validate PGN format
        games = api.get_user_games('DrNykterstein', max_games=1)
        
        if not games:
            print("⚠️  No games found for PGN testing - trying with more days")
            # Try getting games from a longer period
            since = datetime.now(timezone.utc) - timedelta(days=30)
            games = api.get_user_games('DrNykterstein', max_games=1, since=since)
        
        if games:
            game = games[0]
            pgn = game['pgn']
            
            print("Generated PGN:")
            print("-" * 50)
            print(pgn)
            print("-" * 50)
            
            # Basic PGN validation
            required_headers = ['Event', 'Site', 'Date', 'White', 'Black', 'Result']
            pgn_lines = pgn.split('\n')
            
            found_headers = []
            for line in pgn_lines:
                if line.startswith('[') and line.endswith(']'):
                    header_name = line.split(' ')[0][1:]
                    found_headers.append(header_name)
            
            print("\nPGN Validation:")
            for header in required_headers:
                if header in found_headers:
                    print(f"✅ {header} header present")
                else:
                    print(f"❌ {header} header missing")
            
            # Check if moves are present
            moves_section = False
            for line in pgn_lines:
                if line and not line.startswith('['):
                    moves_section = True
                    break
            
            if moves_section:
                print("✅ Moves section present")
            else:
                print("❌ Moves section missing")
        else:
            print("⚠️  No games found to test PGN format")
            
    except Exception as e:
        print(f"❌ Error testing PGN format: {e}")

if __name__ == "__main__":
    test_lichess_api()
    test_pgn_format() 