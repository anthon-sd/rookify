"""
Memory Context Protocol (MCP) Service for Rookify
Manages long-term user memory and context for personalized AI coaching
"""

import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import uuid4
import logging

from config.database import supabase
# Import UserProfiler only when needed to avoid circular imports
# from user_profiling_integration import UserProfiler

logger = logging.getLogger(__name__)

class MemoryService:
    """
    Manages user memory and context for the MCP system
    """
    
    def __init__(self):
        self.profiler = None  # Initialize lazily to avoid circular imports
        
    async def get_or_create_memory(self, user_id: str) -> Dict:
        """Get existing memory or create initial memory profile"""
        try:
            # Check for existing memory
            result = supabase.table('user_memory').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                return result.data[0]
            
            # Create initial memory based on game history
            initial_memory = await self._create_initial_memory(user_id)
            
            # Insert into database
            memory_data = {
                'user_id': user_id,
                'memory_type': 'profile',
                **initial_memory
            }
            
            result = supabase.table('user_memory').insert(memory_data).execute()
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error getting/creating memory for user {user_id}: {e}")
            raise
    
    async def _create_initial_memory(self, user_id: str) -> Dict:
        """Create initial memory profile from user's game history"""
        # Get user's basic info
        user_result = supabase.table('users').select('*').eq('id', user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        
        # Analyze recent games for patterns
        try:
            if self.profiler is None:
                from user_profiling_integration import UserProfiler
                self.profiler = UserProfiler()
            weaknesses = self.profiler.analyze_user_weaknesses(user_id, days=90)
        except Exception as e:
            logger.warning(f"Could not load user profiler: {e}")
            weaknesses = {}
        
        # Determine chess level and emotional profile
        rating = user.get('rating', 1200)
        chess_level = self._determine_chess_level(rating)
        
        initial_memory = {
            'chess_level': chess_level,
            'rating_history': [{'rating': rating, 'timestamp': datetime.now().isoformat()}],
            'playstyle_profile': {
                'type': user.get('playstyle', 'balanced'),
                'aggressiveness': 0.5,
                'risk_tolerance': 0.5,
                'time_management': 'moderate'
            },
            'frequent_errors': list(weaknesses.get('weakness_patterns', {}).get('skill_weaknesses', {}).keys()),
            'current_focus': self._determine_focus_area(weaknesses),
            'emotional_profile': {
                'confidence_level': 'moderate',
                'tilt_susceptibility': 0.5,
                'learning_style': 'visual',
                'preferred_pace': 'steady'
            },
            'frustration_tendency': 'moderate',
            'preferred_feedback_tone': 'encouraging',
            'motivation_triggers': ['improvement', 'understanding']
        }
        
        return initial_memory
    
    def _determine_chess_level(self, rating: int) -> str:
        """Determine chess level from rating"""
        if rating < 800:
            return 'beginner'
        elif rating < 1200:
            return 'novice'
        elif rating < 1600:
            return 'intermediate'
        elif rating < 2000:
            return 'advanced'
        else:
            return 'expert'
    
    def _determine_focus_area(self, weaknesses: Dict) -> str:
        """Determine primary focus area from weakness analysis"""
        skill_weaknesses = weaknesses.get('weakness_patterns', {}).get('skill_weaknesses', {})
        if not skill_weaknesses:
            return 'general improvement'
        
        # Find the most problematic area
        worst_skill = max(skill_weaknesses.items(), key=lambda x: x[1])[0]
        return worst_skill.lower().replace('_', ' ')
    
    async def update_memory_after_session(self, user_id: str, session_data: Dict) -> Dict:
        """Update memory based on session activity"""
        memory = await self.get_or_create_memory(user_id)
        
        # Update rating history if changed
        if 'new_rating' in session_data:
            rating_history = memory.get('rating_history', [])
            rating_history.append({
                'rating': session_data['new_rating'],
                'timestamp': datetime.now().isoformat()
            })
            memory['rating_history'] = rating_history[-50:]  # Keep last 50 entries
        
        # Update emotional state based on performance
        if 'performance_metrics' in session_data:
            await self._update_emotional_profile(memory, session_data['performance_metrics'])
        
        # Add session summary
        session_summaries = memory.get('session_summaries', [])
        session_summaries.append({
            'timestamp': datetime.now().isoformat(),
            'summary': session_data.get('summary', ''),
            'key_moments': session_data.get('key_moments', []),
            'mood_indicators': session_data.get('mood_indicators', {})
        })
        memory['session_summaries'] = session_summaries[-10:]  # Keep last 10
        
        # Update memory in database
        result = supabase.table('user_memory').update(memory).eq('id', memory['id']).execute()
        
        # Create snapshot if significant change
        if self._is_significant_change(memory, session_data):
            await self._create_memory_snapshot(user_id, memory['id'], 'milestone')
        
        return result.data[0]
    
    async def _update_emotional_profile(self, memory: Dict, performance: Dict):
        """Update emotional profile based on performance patterns"""
        emotional_profile = memory.get('emotional_profile', {})
        
        # Detect frustration patterns
        if performance.get('blunder_rate', 0) > 0.2:
            emotional_profile['tilt_susceptibility'] = min(
                emotional_profile.get('tilt_susceptibility', 0.5) + 0.1, 1.0
            )
        
        # Update confidence based on win rate
        win_rate = performance.get('win_rate', 0.5)
        if win_rate > 0.6:
            emotional_profile['confidence_level'] = 'high'
        elif win_rate < 0.4:
            emotional_profile['confidence_level'] = 'low'
        
        memory['emotional_profile'] = emotional_profile
    
    def _is_significant_change(self, memory: Dict, session_data: Dict) -> bool:
        """Determine if changes warrant a memory snapshot"""
        # Rating milestone
        if 'new_rating' in session_data:
            rating_history = memory.get('rating_history', [])
            if len(rating_history) > 1:
                old_rating = rating_history[-2]['rating']
                if abs(session_data['new_rating'] - old_rating) >= 100:
                    return True
        
        # Breakthrough moment
        if session_data.get('breakthrough_detected', False):
            return True
        
        return False
    
    async def _create_memory_snapshot(self, user_id: str, memory_id: str, reason: str):
        """Create a snapshot of current memory state"""
        memory = await self.get_or_create_memory(user_id)
        
        snapshot_data = {
            'user_id': user_id,
            'memory_id': memory_id,
            'snapshot_data': memory,
            'reason': reason
        }
        
        supabase.table('memory_snapshots').insert(snapshot_data).execute()
    
    async def get_context_for_prompt(self, user_id: str, include_recent: bool = True) -> str:
        """Generate context string for AI prompt injection"""
        memory = await self.get_or_create_memory(user_id)
        
        # Build context
        context_parts = []
        
        # Basic profile
        context_parts.append(f"Chess Level: {memory.get('chess_level', 'intermediate')}")
        
        # Current rating and trend
        rating_history = memory.get('rating_history', [])
        if rating_history:
            current_rating = rating_history[-1]['rating']
            context_parts.append(f"Current Rating: {current_rating}")
            
            if len(rating_history) > 1:
                trend = current_rating - rating_history[-2]['rating']
                trend_text = "improving" if trend > 0 else "declining" if trend < 0 else "stable"
                context_parts.append(f"Recent Trend: {trend_text}")
        
        # Playstyle
        playstyle = memory.get('playstyle_profile', {})
        context_parts.append(f"Playstyle: {playstyle.get('type', 'balanced')}")
        
        # Current focus
        if memory.get('current_focus'):
            context_parts.append(f"Working on: {memory['current_focus']}")
        
        # Frequent errors
        errors = memory.get('frequent_errors', [])
        if errors:
            context_parts.append(f"Common mistakes: {', '.join(errors[:3])}")
        
        # Emotional context
        emotional = memory.get('emotional_profile', {})
        feedback_tone = memory.get('preferred_feedback_tone', 'balanced')
        context_parts.append(f"Preferred feedback style: {feedback_tone}")
        
        if emotional.get('confidence_level') == 'low':
            context_parts.append("Note: Player confidence is low, be extra encouraging")
        elif emotional.get('tilt_susceptibility', 0) > 0.7:
            context_parts.append("Note: Player may be frustrated, provide calming guidance")
        
        # Recent session context
        if include_recent:
            summaries = memory.get('session_summaries', [])
            if summaries:
                last_session = summaries[-1]
                context_parts.append(f"Last session: {last_session.get('summary', 'No summary')}")
        
        return "\n".join(context_parts)
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """Get user's UI and notification preferences"""
        memory = await self.get_or_create_memory(user_id)
        
        return {
            'ui_preferences': memory.get('ui_preferences', {}),
            'notification_preferences': memory.get('notification_preferences', {}),
            'training_schedule': memory.get('training_schedule', {}),
            'feedback_tone': memory.get('preferred_feedback_tone', 'balanced')
        }
    
    async def update_preferences(self, user_id: str, preferences: Dict) -> Dict:
        """Update user preferences"""
        memory = await self.get_or_create_memory(user_id)
        
        # Update specific preference categories
        if 'ui_preferences' in preferences:
            memory['ui_preferences'] = preferences['ui_preferences']
        if 'notification_preferences' in preferences:
            memory['notification_preferences'] = preferences['notification_preferences']
        if 'training_schedule' in preferences:
            memory['training_schedule'] = preferences['training_schedule']
        if 'feedback_tone' in preferences:
            memory['preferred_feedback_tone'] = preferences['feedback_tone']
        
        result = supabase.table('user_memory').update(memory).eq('id', memory['id']).execute()
        return result.data[0]
    
    async def reset_user_memory(self, user_id: str) -> Dict:
        """Reset user memory to start fresh"""
        # Delete existing memory
        supabase.table('user_memory').delete().eq('user_id', user_id).execute()
        supabase.table('memory_snapshots').delete().eq('user_id', user_id).execute()
        
        # Create fresh memory
        return await self.get_or_create_memory(user_id)
    
    async def get_memory_analytics(self, user_id: str) -> Dict:
        """Get analytics about user's memory and progress"""
        memory = await self.get_or_create_memory(user_id)
        
        # Calculate analytics
        rating_history = memory.get('rating_history', [])
        rating_trend = 0
        if len(rating_history) > 1:
            recent_ratings = [r['rating'] for r in rating_history[-10:]]
            rating_trend = (recent_ratings[-1] - recent_ratings[0]) / len(recent_ratings)
        
        session_summaries = memory.get('session_summaries', [])
        session_count = len(session_summaries)
        
        breakthrough_moments = memory.get('breakthrough_moments', [])
        breakthrough_count = len(breakthrough_moments)
        
        # Get snapshots for timeline
        snapshots_result = supabase.table('memory_snapshots').select('*').eq(
            'user_id', user_id
        ).order('created_at', desc=True).limit(10).execute()
        
        return {
            'user_id': user_id,
            'memory_created': memory.get('created_at'),
            'last_updated': memory.get('updated_at'),
            'chess_level': memory.get('chess_level'),
            'current_rating': rating_history[-1]['rating'] if rating_history else 1200,
            'rating_trend': rating_trend,
            'session_count': session_count,
            'breakthrough_count': breakthrough_count,
            'current_focus': memory.get('current_focus'),
            'confidence_level': memory.get('emotional_profile', {}).get('confidence_level', 'moderate'),
            'recent_snapshots': snapshots_result.data if snapshots_result.data else []
        }
    
    async def find_similar_users_by_memory(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Find users with similar memory patterns for community features"""
        memory = await self.get_or_create_memory(user_id)
        
        user_rating = memory.get('rating_history', [{'rating': 1200}])[-1]['rating']
        user_level = memory.get('chess_level', 'intermediate')
        
        # Find users with similar characteristics
        rating_range = 200
        similar_memories = supabase.table('user_memory').select('*').filter(
            'chess_level', 'eq', user_level
        ).execute()
        
        similar_users = []
        for similar_memory in similar_memories.data:
            if similar_memory['user_id'] == user_id:
                continue
                
            similar_rating_history = similar_memory.get('rating_history', [])
            if similar_rating_history:
                similar_rating = similar_rating_history[-1]['rating']
                if abs(similar_rating - user_rating) <= rating_range:
                    # Calculate similarity score based on multiple factors
                    similarity_score = self._calculate_memory_similarity(memory, similar_memory)
                    
                    similar_users.append({
                        'user_id': similar_memory['user_id'],
                        'chess_level': similar_memory.get('chess_level'),
                        'current_focus': similar_memory.get('current_focus'),
                        'similarity_score': similarity_score,
                        'playstyle': similar_memory.get('playstyle_profile', {}).get('type', 'balanced')
                    })
        
        # Sort by similarity and return top matches
        similar_users.sort(key=lambda x: x['similarity_score'], reverse=True)
        return similar_users[:limit]
    
    def _calculate_memory_similarity(self, memory1: Dict, memory2: Dict) -> float:
        """Calculate similarity between two user memories"""
        similarity_score = 0.0
        
        # Compare focus areas
        if memory1.get('current_focus') == memory2.get('current_focus'):
            similarity_score += 0.3
        
        # Compare frequent errors
        errors1 = set(memory1.get('frequent_errors', []))
        errors2 = set(memory2.get('frequent_errors', []))
        if errors1 and errors2:
            error_overlap = len(errors1.intersection(errors2)) / len(errors1.union(errors2))
            similarity_score += error_overlap * 0.2
        
        # Compare playstyle
        style1 = memory1.get('playstyle_profile', {}).get('type', 'balanced')
        style2 = memory2.get('playstyle_profile', {}).get('type', 'balanced')
        if style1 == style2:
            similarity_score += 0.2
        
        # Compare learning pace
        pace1 = memory1.get('learning_pace', 'moderate')
        pace2 = memory2.get('learning_pace', 'moderate')
        if pace1 == pace2:
            similarity_score += 0.1
        
        # Compare confidence levels
        conf1 = memory1.get('emotional_profile', {}).get('confidence_level', 'moderate')
        conf2 = memory2.get('emotional_profile', {}).get('confidence_level', 'moderate')
        if conf1 == conf2:
            similarity_score += 0.1
        
        # Compare feedback preferences
        tone1 = memory1.get('preferred_feedback_tone', 'balanced')
        tone2 = memory2.get('preferred_feedback_tone', 'balanced')
        if tone1 == tone2:
            similarity_score += 0.1
        
        return similarity_score 