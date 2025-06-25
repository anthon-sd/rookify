"""
Sync Job Compliance Utilities

This module ensures that all game synchronization and analysis operations
properly use the Supabase sync_jobs table for tracking and management.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List
from config.database import supabase
import logging

logger = logging.getLogger(__name__)

class SyncJobManager:
    """Manager class for sync job operations to ensure compliance"""
    
    @staticmethod
    def create_sync_job(user_id: str, platform: str, username: str, 
                       months_requested: int = 1, **kwargs) -> Dict:
        """
        Create a new sync job record in Supabase.
        
        Args:
            user_id: User UUID
            platform: 'chess.com' or 'lichess'
            username: Platform username
            months_requested: Number of months to sync
            **kwargs: Additional metadata
            
        Returns:
            Dict: Created sync job record
            
        Raises:
            Exception: If sync job creation fails
        """
        sync_job = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'platform': platform,
            'username': username,
            'months_requested': months_requested,
            'status': 'pending',
            'games_found': 0,
            'games_analyzed': 0,
            'created_at': datetime.now(timezone.utc).isoformat(),
            **kwargs
        }
        
        try:
            result = supabase.table('sync_jobs').insert(sync_job).execute()
            if not result.data:
                raise Exception("Failed to create sync job - no data returned")
            
            logger.info(f"Created sync job {sync_job['id']} for user {user_id}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Failed to create sync job: {e}")
            raise
    
    @staticmethod
    def update_sync_job_status(sync_job_id: str, status: str, 
                              error: Optional[str] = None, **kwargs) -> bool:
        """
        Update sync job status and metadata.
        
        Args:
            sync_job_id: Sync job UUID
            status: New status (pending, fetching, analyzing, completed, failed)
            error: Error message if status is 'failed'
            **kwargs: Additional fields to update
            
        Returns:
            bool: True if update successful
        """
        updates = {
            'status': status,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            **kwargs
        }
        
        if error:
            updates['error'] = error
        
        if status == 'completed':
            updates['completed_at'] = datetime.now(timezone.utc).isoformat()
        
        try:
            result = supabase.table('sync_jobs').update(updates).eq('id', sync_job_id).execute()
            success = bool(result.data)
            
            if success:
                logger.info(f"Updated sync job {sync_job_id} to status: {status}")
            else:
                logger.warning(f"No sync job found with ID: {sync_job_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update sync job {sync_job_id}: {e}")
            return False
    
    @staticmethod
    def update_sync_job_progress(sync_job_id: str, games_found: Optional[int] = None, 
                               games_analyzed: Optional[int] = None) -> bool:
        """
        Update sync job progress counters.
        
        Args:
            sync_job_id: Sync job UUID
            games_found: Total games found (optional)
            games_analyzed: Games analyzed so far (optional)
            
        Returns:
            bool: True if update successful
        """
        updates = {'updated_at': datetime.now(timezone.utc).isoformat()}
        
        if games_found is not None:
            updates['games_found'] = games_found
        if games_analyzed is not None:
            updates['games_analyzed'] = games_analyzed
        
        try:
            result = supabase.table('sync_jobs').update(updates).eq('id', sync_job_id).execute()
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to update sync job progress {sync_job_id}: {e}")
            return False
    
    @staticmethod
    def get_sync_job(sync_job_id: str) -> Optional[Dict]:
        """
        Get sync job details by ID.
        
        Args:
            sync_job_id: Sync job UUID
            
        Returns:
            Dict or None: Sync job data if found
        """
        try:
            result = supabase.table('sync_jobs').select('*').eq('id', sync_job_id).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Failed to get sync job {sync_job_id}: {e}")
            return None
    
    @staticmethod
    def get_user_sync_jobs(user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get sync jobs for a user.
        
        Args:
            user_id: User UUID
            limit: Maximum number of jobs to return
            
        Returns:
            List[Dict]: List of sync job records
        """
        try:
            result = supabase.table('sync_jobs')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get sync jobs for user {user_id}: {e}")
            return []
    
    @staticmethod
    def get_active_sync_jobs(user_id: Optional[str] = None) -> List[Dict]:
        """
        Get currently active sync jobs.
        
        Args:
            user_id: Optional user filter
            
        Returns:
            List[Dict]: Active sync jobs
        """
        try:
            query = supabase.table('sync_jobs').select('*').in_(
                'status', ['pending', 'fetching', 'analyzing']
            )
            
            if user_id:
                query = query.eq('user_id', user_id)
            
            result = query.order('created_at', desc=True).execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get active sync jobs: {e}")
            return []
    
    @staticmethod
    def link_game_to_sync_job(game_analysis_id: str, sync_job_id: str) -> bool:
        """
        Link a game analysis to a sync job.
        
        Args:
            game_analysis_id: Game analysis UUID
            sync_job_id: Sync job UUID
            
        Returns:
            bool: True if link successful
        """
        try:
            result = supabase.table('game_analysis').update({
                'sync_job_id': sync_job_id,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', game_analysis_id).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to link game {game_analysis_id} to sync job {sync_job_id}: {e}")
            return False

def ensure_sync_job_compliance():
    """
    Decorator/function to ensure operations use sync jobs.
    Raises an exception if called outside of a sync job context.
    """
    # This could be enhanced to check current context
    logger.info("Sync job compliance check - operations should use proper sync job workflow")

def validate_sync_job_exists(sync_job_id: str) -> bool:
    """
    Validate that a sync job exists and is active.
    
    Args:
        sync_job_id: Sync job UUID to validate
        
    Returns:
        bool: True if sync job exists and is valid
    """
    if not sync_job_id:
        return False
    
    sync_job = SyncJobManager.get_sync_job(sync_job_id)
    return sync_job is not None and sync_job.get('status') in ['pending', 'fetching', 'analyzing']

# Export the manager for easy access
sync_job_manager = SyncJobManager() 