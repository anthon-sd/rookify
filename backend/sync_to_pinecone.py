#!/usr/bin/env python3
"""
Utility script to sync game analysis data from Supabase to Pinecone Vector DB.
This script ensures schema compatibility between the two databases.
Updated to use the new "rookify-vector-db" index.
"""

import os
import sys
import json
import psycopg2
from typing import List, Dict, Optional
from dotenv import load_dotenv
from pinecone_upload import upload_supabase_game_to_pinecone, PINECONE_INDEX_NAME
import argparse

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def get_supabase_connection():
    """Create a connection to the Supabase PostgreSQL database."""
    conn_params = {
        'host': os.getenv('SUPABASE_HOST'),
        'port': os.getenv('SUPABASE_PORT', '5432'),
        'database': os.getenv('SUPABASE_DB'),
        'user': os.getenv('SUPABASE_USER'),
        'password': os.getenv('SUPABASE_PASSWORD')
    }
    
    return psycopg2.connect(**conn_params)

def fetch_games_for_sync(conn, user_id: Optional[str] = None, limit: Optional[int] = None, 
                        only_unsynced: bool = True) -> List[Dict]:
    """
    Fetch games from Supabase that need to be synced to Pinecone.
    
    Args:
        conn: Database connection
        user_id: Optional filter by specific user
        limit: Optional limit on number of games
        only_unsynced: Only fetch games not yet uploaded to Pinecone
        
    Returns:
        List of game dictionaries
    """
    cursor = conn.cursor()
    
    # Build query
    query = """
        SELECT 
            id, user_id, game_url, platform, game_id, pgn,
            white_username, black_username, white_rating, black_rating,
            user_color, result, time_control, game_timestamp,
            opening_name, eco_code, key_moments, analysis,
            strengths, weaknesses, avg_accuracy, total_moves,
            blunders_count, mistakes_count, inaccuracies_count,
            pinecone_uploaded, pinecone_vector_count,
            created_at, updated_at
        FROM game_analysis
        WHERE key_moments IS NOT NULL 
        AND key_moments != '[]'::jsonb
    """
    
    params = []
    
    if only_unsynced:
        query += " AND (pinecone_uploaded = FALSE OR pinecone_uploaded IS NULL)"
    
    if user_id:
        query += " AND user_id = %s"
        params.append(user_id)
    
    query += " ORDER BY created_at DESC"
    
    if limit:
        query += " LIMIT %s"
        params.append(limit)
    
    cursor.execute(query, params)
    
    # Convert to list of dictionaries
    columns = [desc[0] for desc in cursor.description]
    games = []
    
    for row in cursor.fetchall():
        game_dict = dict(zip(columns, row))
        
        # Convert datetime objects to ISO format strings
        for field in ['game_timestamp', 'created_at', 'updated_at']:
            if game_dict.get(field):
                game_dict[field] = game_dict[field].isoformat()
        
        games.append(game_dict)
    
    cursor.close()
    return games

def update_pinecone_sync_status(conn, game_id: str, vector_count: int) -> None:
    """
    Update the Pinecone sync status for a game in Supabase.
    
    Args:
        conn: Database connection
        game_id: Game ID to update
        vector_count: Number of vectors uploaded to Pinecone
    """
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE game_analysis 
        SET pinecone_uploaded = TRUE, 
            pinecone_vector_count = %s,
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = %s
    """, (vector_count, game_id))
    
    conn.commit()
    cursor.close()

def extract_game_metadata_from_pgn(pgn: str) -> Dict:
    """
    Extract metadata from PGN string for fields that might be missing.
    
    Args:
        pgn: PGN string
        
    Returns:
        Dictionary with extracted metadata
    """
    metadata = {}
    
    if not pgn:
        return metadata
    
    lines = pgn.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('[') and line.endswith(']'):
            # Parse PGN headers
            parts = line[1:-1].split(' ', 1)
            if len(parts) == 2:
                key, value = parts
                value = value.strip('"')
                
                if key == 'White':
                    metadata['white_username'] = value
                elif key == 'Black':
                    metadata['black_username'] = value
                elif key == 'WhiteElo':
                    try:
                        metadata['white_rating'] = int(value)
                    except ValueError:
                        pass
                elif key == 'BlackElo':
                    try:
                        metadata['black_rating'] = int(value)
                    except ValueError:
                        pass
                elif key == 'Result':
                    metadata['result'] = value
                elif key == 'TimeControl':
                    metadata['time_control'] = value
                elif key == 'UTCDate' or key == 'Date':
                    metadata['game_date'] = value
                elif key == 'UTCTime' or key == 'Time':
                    metadata['game_time'] = value
                elif key == 'Opening':
                    metadata['opening_name'] = value
                elif key == 'ECO':
                    metadata['eco_code'] = value
    
    return metadata

def enhance_game_data(game_data: Dict) -> Dict:
    """
    Enhance game data with missing fields extracted from PGN or inferred.
    
    Args:
        game_data: Game data from Supabase
        
    Returns:
        Enhanced game data
    """
    enhanced = game_data.copy()
    
    # Extract metadata from PGN if fields are missing
    if game_data.get('pgn'):
        pgn_metadata = extract_game_metadata_from_pgn(game_data['pgn'])
        
        # Fill in missing fields
        for key, value in pgn_metadata.items():
            if not enhanced.get(key):
                enhanced[key] = value
    
    # Calculate total moves from key_moments if missing
    if not enhanced.get('total_moves') and enhanced.get('key_moments'):
        try:
            key_moments = enhanced['key_moments']
            if isinstance(key_moments, str):
                key_moments = json.loads(key_moments)
            enhanced['total_moves'] = len(key_moments)
        except:
            pass
    
    # Calculate accuracy statistics from key_moments if missing
    if enhanced.get('key_moments') and not enhanced.get('blunders_count'):
        try:
            key_moments = enhanced['key_moments']
            if isinstance(key_moments, str):
                key_moments = json.loads(key_moments)
            
            blunders = 0
            mistakes = 0
            inaccuracies = 0
            
            for moment in key_moments:
                accuracy_class = moment.get('accuracy_class', '').lower()
                if 'blunder' in accuracy_class:
                    blunders += 1
                elif 'mistake' in accuracy_class or 'miss' in accuracy_class:
                    mistakes += 1
                elif 'inaccuracy' in accuracy_class:
                    inaccuracies += 1
            
            enhanced['blunders_count'] = blunders
            enhanced['mistakes_count'] = mistakes
            enhanced['inaccuracies_count'] = inaccuracies
            
        except Exception as e:
            print(f"Error calculating accuracy stats: {e}")
    
    return enhanced

def sync_games_to_pinecone(user_id: Optional[str] = None, limit: Optional[int] = None, 
                          only_unsynced: bool = True, dry_run: bool = False) -> Dict:
    """
    Sync games from Supabase to Pinecone.
    
    Args:
        user_id: Optional filter by specific user
        limit: Optional limit on number of games
        only_unsynced: Only sync games not yet uploaded to Pinecone
        dry_run: If True, don't actually upload to Pinecone
        
    Returns:
        Dictionary with sync statistics
    """
    stats = {
        'games_processed': 0,
        'games_successful': 0,
        'games_failed': 0,
        'total_vectors_uploaded': 0,
        'errors': []
    }
    
    try:
        # Connect to Supabase
        conn = get_supabase_connection()
        print(f"Connected to Supabase database")
        
        # Fetch games to sync
        games = fetch_games_for_sync(conn, user_id, limit, only_unsynced)
        print(f"Found {len(games)} games to sync")
        
        if not games:
            print("No games found to sync")
            return stats
        
        # Process each game
        for game in games:
            try:
                stats['games_processed'] += 1
                game_id = game['id']
                
                print(f"\nProcessing game {stats['games_processed']}/{len(games)}: {game_id}")
                
                # Enhance game data with missing fields
                enhanced_game = enhance_game_data(game)
                
                if dry_run:
                    print(f"DRY RUN: Would upload game {game_id} to Pinecone")
                    vector_count = len(json.loads(enhanced_game.get('key_moments', '[]')))
                    stats['total_vectors_uploaded'] += vector_count
                else:
                    # Upload to Pinecone
                    vector_count = upload_supabase_game_to_pinecone(enhanced_game)
                    
                    if vector_count > 0:
                        # Update sync status in Supabase
                        update_pinecone_sync_status(conn, game_id, vector_count)
                        stats['total_vectors_uploaded'] += vector_count
                        print(f"Successfully uploaded {vector_count} vectors for game {game_id}")
                    else:
                        print(f"No vectors uploaded for game {game_id}")
                        stats['errors'].append(f"No vectors uploaded for game {game_id}")
                        stats['games_failed'] += 1
                        continue
                
                stats['games_successful'] += 1
                
            except Exception as e:
                error_msg = f"Error processing game {game.get('id', 'unknown')}: {str(e)}"
                print(f"❌ {error_msg}")
                stats['errors'].append(error_msg)
                stats['games_failed'] += 1
        
        conn.close()
        
    except Exception as e:
        error_msg = f"Database connection error: {str(e)}"
        print(f"❌ {error_msg}")
        stats['errors'].append(error_msg)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"SYNC SUMMARY:")
    print(f"Games processed: {stats['games_processed']}")
    print(f"Games successful: {stats['games_successful']}")
    print(f"Games failed: {stats['games_failed']}")
    print(f"Total vectors uploaded: {stats['total_vectors_uploaded']}")
    
    if stats['errors']:
        print(f"\nErrors ({len(stats['errors'])}):")
        for error in stats['errors'][:10]:  # Show first 10 errors
            print(f"  - {error}")
        if len(stats['errors']) > 10:
            print(f"  ... and {len(stats['errors']) - 10} more errors")
    
    return stats

def main():
    """Main function to run the sync script."""
    parser = argparse.ArgumentParser(description='Sync Supabase game data to Pinecone')
    parser.add_argument('--user-id', help='Sync games for specific user ID')
    parser.add_argument('--limit', type=int, help='Limit number of games to sync')
    parser.add_argument('--all', action='store_true', help='Sync all games (including previously synced)')
    parser.add_argument('--dry-run', action='store_true', help='Dry run - don\'t actually upload to Pinecone')
    
    args = parser.parse_args()
    
    print("Rookify Supabase -> Pinecone Sync Tool")
    print("=" * 50)
    
    # Run sync
    stats = sync_games_to_pinecone(
        user_id=args.user_id,
        limit=args.limit,
        only_unsynced=not args.all,
        dry_run=args.dry_run
    )
    
    # Exit with error code if there were failures
    if stats['games_failed'] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main() 