from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Dict, List
import asyncio

class RateLimiter:
    """
    Rate limiter for API calls to prevent exceeding platform limits.
    """
    
    def __init__(self, max_requests: int, time_window: timedelta):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        
    async def check_rate_limit(self, key: str) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            key: Identifier for the rate limit (e.g., user ID, IP address)
            
        Returns:
            bool: True if request is allowed, False if rate limited
        """
        now = datetime.now(timezone.utc)
        
        # Clean old requests outside the time window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < self.time_window
        ]
        
        # Check if we're within the limit
        if len(self.requests[key]) >= self.max_requests:
            return False
            
        # Add current request
        self.requests[key].append(now)
        return True
    
    async def wait_for_rate_limit(self, key: str) -> None:
        """
        Wait until rate limit allows the request.
        
        Args:
            key: Identifier for the rate limit
        """
        while not await self.check_rate_limit(key):
            # Calculate how long to wait
            oldest_request = min(self.requests[key])
            wait_time = (oldest_request + self.time_window - datetime.now(timezone.utc)).total_seconds()
            
            if wait_time > 0:
                await asyncio.sleep(min(wait_time, 1))  # Wait at most 1 second at a time
            else:
                break
    
    def get_remaining_requests(self, key: str) -> int:
        """
        Get number of remaining requests in current time window.
        
        Args:
            key: Identifier for the rate limit
            
        Returns:
            int: Number of remaining requests
        """
        now = datetime.now(timezone.utc)
        
        # Clean old requests
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if now - req_time < self.time_window
        ]
        
        return max(0, self.max_requests - len(self.requests[key]))
    
    def reset_for_key(self, key: str) -> None:
        """
        Reset rate limit for a specific key.
        
        Args:
            key: Identifier for the rate limit
        """
        if key in self.requests:
            del self.requests[key]

# Platform-specific rate limiters
# Chess.com: ~20 requests per minute (conservative estimate)
chess_com_limiter = RateLimiter(max_requests=20, time_window=timedelta(minutes=1))

# Lichess: 30 requests per minute (more generous)
lichess_limiter = RateLimiter(max_requests=30, time_window=timedelta(minutes=1))

# General API limiter for sync jobs (per user)
sync_job_limiter = RateLimiter(max_requests=5, time_window=timedelta(minutes=10))

async def get_rate_limiter_for_platform(platform: str) -> RateLimiter:
    """
    Get the appropriate rate limiter for a platform.
    
    Args:
        platform: Platform name ('chess.com' or 'lichess')
        
    Returns:
        RateLimiter: Appropriate rate limiter instance
    """
    if platform == "chess.com":
        return chess_com_limiter
    elif platform == "lichess": 
        return lichess_limiter
    else:
        raise ValueError(f"Unknown platform: {platform}")

async def check_sync_rate_limit(user_id: str) -> bool:
    """
    Check if user can start a new sync job.
    
    Args:
        user_id: User ID
        
    Returns:
        bool: True if sync is allowed, False if rate limited
    """
    return await sync_job_limiter.check_rate_limit(user_id) 