import asyncio
import requests
from typing import List, Dict, Optional
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BatchProcessor:
    """Utility class for batch processing operations with retry logic"""
    
    def __init__(self, ai_engine_url: str, max_retries: int = 3, retry_delay: float = 1.0):
        self.ai_engine_url = ai_engine_url
        self.max_retries = max_retries
        self.retry_delay = retry_delay
    
    def process_with_retry(self, batch: List[Dict], **kwargs) -> List[Dict]:
        """Process batch with automatic retry on failure"""
        
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    f"{self.ai_engine_url}/analyze-batch",
                    json={
                        'positions': batch,
                        **kwargs
                    },
                    timeout=300  # 5 minutes for batch
                )
                
                if response.status_code == 200:
                    results = response.json()['results']
                    
                    # Check for partial failures
                    failed = [r for r in results if r.get('status') == 'failed']
                    successful = [r for r in results if r.get('status') != 'failed']
                    
                    if failed and attempt < self.max_retries - 1:
                        logger.warning(f"Retry attempt {attempt + 1}: {len(failed)} positions failed")
                        
                        # Retry only failed items by reconstructing the batch
                        failed_position_ids = {f.get('position_id') for f in failed}
                        retry_batch = [b for b in batch if b.get('position_id') in failed_position_ids]
                        
                        if retry_batch:
                            time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                            retry_results = self.process_with_retry(retry_batch, **kwargs)
                            
                            # Merge successful and retry results
                            successful.extend(retry_results)
                    
                    return successful
                else:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
            except Exception as e:
                logger.error(f"Batch processing attempt {attempt + 1} failed: {e}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(self.retry_delay * (2 ** attempt))
        
        return []
    
    def split_large_batch(self, positions: List[Dict], max_batch_size: int = 50) -> List[List[Dict]]:
        """Split large batches into smaller chunks"""
        batches = []
        for i in range(0, len(positions), max_batch_size):
            batch = positions[i:i + max_batch_size]
            batches.append(batch)
        return batches
    
    def process_large_batch(self, positions: List[Dict], max_batch_size: int = 50, **kwargs) -> Dict[str, Dict]:
        """Process large batches by splitting them into smaller chunks"""
        all_results = {}
        batches = self.split_large_batch(positions, max_batch_size)
        
        logger.info(f"Processing {len(positions)} positions in {len(batches)} batches")
        
        for i, batch in enumerate(batches):
            try:
                logger.info(f"Processing batch {i + 1}/{len(batches)} ({len(batch)} positions)")
                
                results = self.process_with_retry(batch, **kwargs)
                
                for result in results:
                    if 'error' not in result and result.get('position_id'):
                        all_results[result['position_id']] = result
                
                logger.info(f"Batch {i + 1}/{len(batches)} completed: {len(results)} successful")
                
            except Exception as e:
                logger.error(f"Failed to process batch {i + 1}: {e}")
                # Continue with other batches even if one fails
                continue
        
        return all_results

class AnalysisStats:
    """Helper class to track analysis statistics"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.total_positions = 0
        self.successful_analyses = 0
        self.failed_analyses = 0
        self.llm_calls_made = 0
        self.llm_calls_saved = 0
        self.start_time = None
        self.end_time = None
    
    def start_timing(self):
        self.start_time = time.time()
    
    def end_timing(self):
        self.end_time = time.time()
    
    def update_from_batch_result(self, batch_result: Dict):
        """Update stats from a batch processing result"""
        if isinstance(batch_result, dict):
            self.total_positions += batch_result.get('total', 0)
            self.successful_analyses += batch_result.get('successful', 0)
            self.failed_analyses += batch_result.get('failed', 0)
            self.llm_calls_made += batch_result.get('llm_calls_made', 0)
            self.llm_calls_saved += batch_result.get('llm_calls_saved', 0)
    
    def get_efficiency_stats(self) -> Dict:
        """Get efficiency statistics"""
        total_time = self.end_time - self.start_time if self.start_time and self.end_time else 0
        
        return {
            'total_positions_analyzed': self.total_positions,
            'successful_analyses': self.successful_analyses,
            'failed_analyses': self.failed_analyses,
            'success_rate': (self.successful_analyses / max(self.total_positions, 1)) * 100,
            'llm_calls_made': self.llm_calls_made,
            'llm_calls_saved': self.llm_calls_saved,
            'llm_efficiency': (self.llm_calls_saved / max(self.llm_calls_made + self.llm_calls_saved, 1)) * 100,
            'total_time_seconds': total_time,
            'positions_per_second': self.total_positions / max(total_time, 1)
        }
    
    def log_stats(self):
        """Log efficiency statistics"""
        stats = self.get_efficiency_stats()
        
        logger.info("=== Batch Analysis Statistics ===")
        logger.info(f"Total positions: {stats['total_positions_analyzed']}")
        logger.info(f"Success rate: {stats['success_rate']:.1f}%")
        logger.info(f"LLM efficiency: {stats['llm_efficiency']:.1f}% calls saved")
        logger.info(f"Processing speed: {stats['positions_per_second']:.1f} positions/second")
        logger.info(f"Total time: {stats['total_time_seconds']:.1f} seconds")

def create_position_fingerprint(fen: str, material_balance: int = 0) -> str:
    """Create a fingerprint for position caching"""
    # Use first 30 chars of FEN (position part) + material balance
    position_part = fen.split(' ')[0][:30]
    return f"{position_part}_{material_balance}"

def determine_user_level_from_rating(rating: int) -> str:
    """Map rating to user level string"""
    if rating < 1200:
        return "beginner"
    elif rating < 1800:
        return "intermediate"
    elif rating < 2200:
        return "advanced"
    else:
        return "expert"

def optimize_batch_order(positions: List[Dict]) -> List[Dict]:
    """Optimize batch order for better caching and efficiency"""
    # Sort by FEN to group similar positions together
    return sorted(positions, key=lambda p: p.get('fen', ''))

def validate_batch_request(positions: List[Dict]) -> tuple[bool, str]:
    """Validate a batch request"""
    if not positions:
        return False, "Empty positions list"
    
    if len(positions) > 100:
        return False, "Batch size too large (max 100 positions)"
    
    for i, pos in enumerate(positions):
        if not pos.get('fen'):
            return False, f"Position {i} missing FEN"
        
        if not pos.get('position_id'):
            return False, f"Position {i} missing position_id"
    
    return True, "Valid"

# Example usage functions
def create_game_batch(moments: List[Dict], user_rating: int = 1500, depth: int = 20) -> List[Dict]:
    """Create a batch request from game moments"""
    batch_positions = []
    
    for i, moment in enumerate(moments):
        # Position before move
        position_id_before = f"game_pos_{i}_before"
        
        move_context = {
            'move_number': i + 1,
            'phase': moment.get('phase', 'middlegame'),
            'piece_count': moment.get('piece_count', 32),
            'is_tactical': moment.get('is_tactical', False),
        }
        
        batch_positions.append({
            'fen': moment['position_fen'],
            'position_id': position_id_before,
            'depth': depth,
            'move_context': move_context,
            'user_level': determine_user_level_from_rating(user_rating),
            'user_rating': user_rating
        })
    
    return batch_positions 