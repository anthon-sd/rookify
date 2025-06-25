import logging
from typing import List, Dict, Optional
from datetime import datetime
import json
import uuid
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

class DatabaseBatchOperations:
    """Utility class for efficient batch database operations"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    def batch_insert_game_analyses(self, analyses: List[Dict], batch_size: int = 100) -> bool:
        """Insert multiple game analyses efficiently"""
        try:
            total_inserted = 0
            
            for i in range(0, len(analyses), batch_size):
                batch = analyses[i:i + batch_size]
                
                # Ensure all required fields are present
                for analysis in batch:
                    if 'id' not in analysis:
                        analysis['id'] = str(uuid.uuid4())
                    if 'created_at' not in analysis:
                        analysis['created_at'] = datetime.utcnow().isoformat()
                
                # Use Supabase's bulk insert
                result = self.supabase.table('game_analysis').insert(batch).execute()
                
                if result.data:
                    total_inserted += len(result.data)
                    logger.info(f"Inserted batch {i//batch_size + 1}: {len(result.data)} records")
                else:
                    logger.error(f"Failed to insert batch {i//batch_size + 1}")
                    return False
            
            logger.info(f"Successfully inserted {total_inserted} game analyses")
            return True
            
        except Exception as e:
            logger.error(f"Error in batch insert game analyses: {e}")
            return False
    
    def batch_insert_recommendations(self, recommendations: List[Dict], batch_size: int = 100) -> bool:
        """Insert multiple recommendations efficiently"""
        try:
            if not recommendations:
                return True
            
            total_inserted = 0
            
            for i in range(0, len(recommendations), batch_size):
                batch = recommendations[i:i + batch_size]
                
                # Ensure all required fields are present
                for rec in batch:
                    if 'id' not in rec:
                        rec['id'] = str(uuid.uuid4())
                    if 'created_at' not in rec:
                        rec['created_at'] = datetime.utcnow().isoformat()
                    if 'status' not in rec:
                        rec['status'] = 'pending'
                
                result = self.supabase.table('recommendations').insert(batch).execute()
                
                if result.data:
                    total_inserted += len(result.data)
                    logger.info(f"Inserted recommendations batch {i//batch_size + 1}: {len(result.data)} records")
                else:
                    logger.error(f"Failed to insert recommendations batch {i//batch_size + 1}")
                    return False
            
            logger.info(f"Successfully inserted {total_inserted} recommendations")
            return True
            
        except Exception as e:
            logger.error(f"Error in batch insert recommendations: {e}")
            return False
    
    def batch_update_sync_job_progress(self, sync_job_id: str, updates: Dict) -> bool:
        """Update sync job progress efficiently"""
        try:
            # Add timestamp to updates
            updates['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('sync_jobs').update(updates).eq('id', sync_job_id).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error updating sync job {sync_job_id}: {e}")
            return False
    
    def get_user_rating(self, user_id: str) -> int:
        """Get user rating with caching and fallback"""
        try:
            result = self.supabase.table('users').select('rating').eq('id', user_id).execute()
            
            if result.data and result.data[0].get('rating'):
                return result.data[0]['rating']
            else:
                logger.warning(f"No rating found for user {user_id}, using default 1500")
                return 1500
                
        except Exception as e:
            logger.error(f"Error getting user rating for {user_id}: {e}")
            return 1500
    
    def check_game_already_analyzed(self, user_id: str, game_url: str) -> bool:
        """Check if a game has already been analyzed"""
        try:
            result = self.supabase.table('game_analysis').select('id').eq(
                'user_id', user_id
            ).eq('game_url', game_url).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error checking if game already analyzed: {e}")
            return False
    
    def get_sync_job_stats(self, sync_job_id: str) -> Optional[Dict]:
        """Get current sync job statistics"""
        try:
            result = self.supabase.table('sync_jobs').select('*').eq('id', sync_job_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting sync job stats: {e}")
            return None

def prepare_game_analysis_record(user_id: str, game_url: str, platform: str, 
                               pgn: str, analyzed_moments: List[Dict], 
                               sync_job_id: str = None) -> Dict:
    """Prepare a game analysis record for database insertion"""
    
    # Serialize key_moments if it's not already a string
    key_moments_json = analyzed_moments
    if isinstance(analyzed_moments, list):
        key_moments_json = json.dumps(analyzed_moments)
    
    record = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'game_url': game_url,
        'platform': platform,
        'pgn': pgn,
        'key_moments': key_moments_json,
        'created_at': datetime.utcnow().isoformat()
    }
    
    if sync_job_id:
        record['sync_job_id'] = sync_job_id
    
    return record

def extract_recommendations_from_moments(analyzed_moments: List[Dict]) -> List[Dict]:
    """Extract recommendations from analyzed moments"""
    all_recommendations = []
    
    for moment in analyzed_moments:
        if moment.get('recommendations'):
            # If recommendations are stored in the moment
            all_recommendations.extend(moment['recommendations'])
    
    # Also check the first moment for batch recommendations
    if analyzed_moments and 'recommendations' in analyzed_moments[0]:
        all_recommendations.extend(analyzed_moments[0]['recommendations'])
    
    return all_recommendations

def batch_upload_to_pinecone(moments: List[Dict], batch_size: int = 100):
    """Upload moments to Pinecone in batches"""
    try:
        from pinecone_upload import upload_to_pinecone
        
        # Process in batches to avoid overwhelming Pinecone
        for i in range(0, len(moments), batch_size):
            batch = moments[i:i + batch_size]
            upload_to_pinecone(batch)
            logger.info(f"Uploaded batch {i//batch_size + 1} to Pinecone: {len(batch)} moments")
        
        logger.info(f"Successfully uploaded {len(moments)} moments to Pinecone")
        return True
        
    except Exception as e:
        logger.error(f"Error uploading to Pinecone: {e}")
        return False

class ProgressTracker:
    """Helper class to track and report progress during batch operations"""
    
    def __init__(self, total_items: int, report_interval: int = 10):
        self.total_items = total_items
        self.processed_items = 0
        self.successful_items = 0
        self.failed_items = 0
        self.report_interval = report_interval
        self.start_time = datetime.utcnow()
    
    def update(self, processed: int = 1, successful: bool = True):
        """Update progress counters"""
        self.processed_items += processed
        if successful:
            self.successful_items += processed
        else:
            self.failed_items += processed
        
        # Report progress at intervals
        if self.processed_items % self.report_interval == 0:
            self.report_progress()
    
    def report_progress(self):
        """Report current progress"""
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        rate = self.processed_items / max(elapsed, 1)
        remaining = self.total_items - self.processed_items
        eta = remaining / max(rate, 1)
        
        logger.info(
            f"Progress: {self.processed_items}/{self.total_items} "
            f"({(self.processed_items/self.total_items)*100:.1f}%) "
            f"Success: {self.successful_items}, Failed: {self.failed_items} "
            f"Rate: {rate:.1f}/sec, ETA: {eta:.0f}s"
        )
    
    def get_final_stats(self) -> Dict:
        """Get final statistics"""
        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            'total_items': self.total_items,
            'processed_items': self.processed_items,
            'successful_items': self.successful_items,
            'failed_items': self.failed_items,
            'success_rate': (self.successful_items / max(self.processed_items, 1)) * 100,
            'total_time_seconds': elapsed,
            'items_per_second': self.processed_items / max(elapsed, 1)
        }

def extract_pgn_headers(pgn: str) -> Dict:
    """
    Extract metadata from PGN headers.
    
    Args:
        pgn: PGN string
        
    Returns:
        Dictionary with extracted metadata
    """
    headers = {}
    
    if not pgn:
        return headers
    
    lines = pgn.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('[') and line.endswith(']'):
            # Parse PGN headers like [White "username"]
            parts = line[1:-1].split(' ', 1)
            if len(parts) == 2:
                key, value = parts
                value = value.strip('"')
                
                if key == 'White':
                    headers['white'] = value
                elif key == 'Black':
                    headers['black'] = value
                elif key == 'WhiteElo':
                    try:
                        headers['white_elo'] = int(value)
                    except ValueError:
                        pass
                elif key == 'BlackElo':
                    try:
                        headers['black_elo'] = int(value)
                    except ValueError:
                        pass
                elif key == 'Result':
                    headers['result'] = value
                elif key == 'TimeControl':
                    headers['time_control'] = value
                elif key == 'UTCDate':
                    headers['date'] = value
                elif key == 'UTCTime':
                    headers['time'] = value
                elif key == 'Opening':
                    headers['opening'] = value
                elif key == 'ECO':
                    headers['eco'] = value
    
    # Combine date and time into datetime if both exist
    if headers.get('date') and headers.get('time'):
        try:
            datetime_str = f"{headers['date']} {headers['time']}"
            dt = datetime.strptime(datetime_str, "%Y.%m.%d %H:%M:%S")
            headers['datetime'] = dt.isoformat() + 'Z'
        except ValueError:
            pass
    
    return headers

def determine_user_color(user_id: str, pgn_headers: Dict) -> Optional[str]:
    """
    Determine which color the user was playing based on available information.
    This is a placeholder - you might need to implement logic based on your user data.
    
    Args:
        user_id: User ID
        pgn_headers: Extracted PGN headers
        
    Returns:
        'white' or 'black' or None if can't determine
    """
    # This is a placeholder implementation
    # You would need to implement actual logic based on your user data
    # For now, return None and let it be filled manually or by other means
    return None

def calculate_game_statistics(analyzed_moments) -> Dict:
    """
    Calculate game statistics from analyzed moments.
    
    Args:
        analyzed_moments: List or JSON string of analyzed moments
        
    Returns:
        Dictionary with game statistics
    """
    stats = {
        'total_moves': 0,
        'blunders_count': 0,
        'mistakes_count': 0,
        'inaccuracies_count': 0,
        'avg_accuracy': None
    }
    
    try:
        # Parse moments if it's a string
        if isinstance(analyzed_moments, str):
            moments = json.loads(analyzed_moments)
        else:
            moments = analyzed_moments or []
        
        if not moments:
            return stats
        
        stats['total_moves'] = len(moments)
        
        accuracy_scores = []
        
        for moment in moments:
            accuracy_class = moment.get('accuracy_class', '').lower()
            
            if 'blunder' in accuracy_class:
                stats['blunders_count'] += 1
            elif 'mistake' in accuracy_class or 'miss' in accuracy_class:
                stats['mistakes_count'] += 1
            elif 'inaccuracy' in accuracy_class:
                stats['inaccuracies_count'] += 1
            
            # Calculate accuracy score (lower delta_cp = higher accuracy)
            delta_cp = moment.get('delta_cp', 0)
            if delta_cp is not None:
                # Convert centipawn loss to accuracy percentage (0-100)
                # Perfect move = 100%, blunder = lower score
                accuracy = max(0, 100 - (delta_cp / 10))  # Rough approximation
                accuracy_scores.append(accuracy)
        
        # Calculate average accuracy
        if accuracy_scores:
            stats['avg_accuracy'] = sum(accuracy_scores) / len(accuracy_scores)
    
    except Exception as e:
        print(f"Error calculating game statistics: {e}")
    
    return stats 