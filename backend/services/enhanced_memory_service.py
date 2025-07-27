"""
Enhanced Memory Context Protocol (MCP) Service for Rookify
Combines structured Supabase memory with vector database insights
for sophisticated AI coaching and personalized recommendations
"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta

try:
    import numpy as np
except ImportError:
    # Fallback for environments without numpy
    class NumpyFallback:
        @staticmethod
        def mean(values):
            return sum(values) / len(values) if values else 0.0
    np = NumpyFallback()

from services.memory_service import MemoryService
# Import UserProfiler only when needed to avoid circular imports
try:
    from user_profiling_integration import UserProfiler
except ImportError:
    UserProfiler = None
from pinecone_upload import get_embedding, pc, PINECONE_INDEX_NAME
from config.database import supabase

logger = logging.getLogger(__name__)

class EnhancedMemoryService(MemoryService):
    """
    Enhanced Memory Service that combines Supabase structured data
    with vector database insights for comprehensive user context
    """
    
    def __init__(self):
        super().__init__()
        try:
            self.profiler = UserProfiler() if UserProfiler else None
            self.index = pc.Index(PINECONE_INDEX_NAME)
        except Exception as e:
            logger.warning(f"Could not initialize UserProfiler or Pinecone: {e}")
            self.profiler = None
            self.index = None
        
    async def get_user_context(self, user_id: str, include_vector_insights: bool = True) -> Dict:
        """
        Get comprehensive user context combining structured memory and vector insights
        
        Args:
            user_id: User's UUID
            include_vector_insights: Whether to include computationally expensive vector analysis
            
        Returns:
            Enhanced context dictionary with both structured and vector-based insights
        """
        try:
            # Get structured data from Supabase
            memory = await self.get_memory_from_supabase(user_id)
            
            if not include_vector_insights:
                return memory
            
            # Enrich with vector-based insights
            vector_insights = await self._get_vector_insights(user_id)
            
            # Combine for comprehensive context
            enhanced_context = {
                **memory,
                'vector_insights': vector_insights,
                'context_type': 'enhanced',
                'generated_at': datetime.now().isoformat()
            }
            
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Error getting enhanced user context for {user_id}: {e}")
            # Fallback to basic memory if vector analysis fails
            return await self.get_memory_from_supabase(user_id)
    
    async def get_memory_from_supabase(self, user_id: str) -> Dict:
        """Get structured memory data from Supabase"""
        memory = await self.get_or_create_memory(user_id)
        return memory
    
    async def _get_vector_insights(self, user_id: str) -> Dict:
        """Generate comprehensive vector-based insights"""
        try:
            if not self.index or not self.profiler:
                logger.warning("Vector database or profiler not available for insights")
                return {}
                
            insights = {}
            
            # Get playing style embedding
            insights['playing_style_embedding'] = await self.get_style_embedding(user_id)
            
            # Get weakness patterns
            insights['weakness_patterns'] = self.profiler.analyze_user_weaknesses(user_id, days=90)
            
            # Get similar player insights
            insights['similar_player_insights'] = await self.get_similar_player_insights(user_id)
            
            # Get tactical strength analysis
            insights['tactical_strengths'] = await self.analyze_tactical_patterns(user_id)
            
            # Get opening repertoire insights
            insights['opening_insights'] = await self.analyze_opening_patterns(user_id)
            
            # Get time management patterns
            insights['time_patterns'] = await self.analyze_time_management(user_id)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating vector insights for {user_id}: {e}")
            return {}
    
    async def get_style_embedding(self, user_id: str) -> List[float]:
        """
        Generate a playing style embedding from user's moves in vector DB
        
        Args:
            user_id: User's UUID
            
        Returns:
            Composite embedding representing the user's playing style
        """
        try:
            if not self.index:
                logger.warning("Vector database not available for style embedding")
                return [0.1] * 1024
            # Query user's recent moves with various characteristics
            style_queries = [
                "aggressive attacking chess move",
                "positional strategic chess move", 
                "tactical combination chess move",
                "defensive solid chess move",
                "sacrificial bold chess move"
            ]
            
            style_scores = []
            
            for query in style_queries:
                # Get user's moves matching this style
                query_embedding = get_embedding(query)
                
                user_moves = self.index.query(
                    vector=query_embedding,
                    filter={'user_id': user_id},
                    top_k=50,
                    include_metadata=True
                )
                
                # Calculate style affinity score
                if user_moves.matches:
                    scores = [match.score for match in user_moves.matches]
                    avg_score = np.mean(scores)
                    style_scores.append(avg_score)
                else:
                    style_scores.append(0.0)
            
            # Create composite style embedding
            base_embedding = get_embedding("chess playing style analysis")
            
            # Weight the base embedding by style characteristics
            weighted_embedding = []
            for i, val in enumerate(base_embedding):
                if i < len(style_scores):
                    weighted_val = val * (1 + style_scores[i % len(style_scores)])
                else:
                    weighted_val = val
                weighted_embedding.append(weighted_val)
            
            return weighted_embedding[:1024]  # Ensure correct dimensionality
            
        except Exception as e:
            logger.error(f"Error generating style embedding for {user_id}: {e}")
            return [0.1] * 1024  # Return neutral embedding on error
    
    async def get_similar_player_insights(self, user_id: str) -> Dict:
        """
        Find players with similar patterns and extract insights
        """
        try:
            # Get user's style embedding
            user_style = await self.get_style_embedding(user_id)
            
            # Find similar players by querying with user's style
            similar_results = self.index.query(
                vector=user_style,
                filter={'user_id': {'$ne': user_id}},  # Exclude current user
                top_k=100,
                include_metadata=True
            )
            
            # Group by similar users
            similar_users = {}
            for match in similar_results.matches:
                other_user_id = match.metadata.get('user_id')
                if other_user_id and other_user_id != user_id:
                    if other_user_id not in similar_users:
                        similar_users[other_user_id] = []
                    similar_users[other_user_id].append({
                        'score': match.score,
                        'position_type': match.metadata.get('skill_category', 'unknown'),
                        'accuracy': match.metadata.get('accuracy_class', 'unknown')
                    })
            
            # Analyze top similar players
            top_similar = sorted(
                similar_users.items(), 
                key=lambda x: np.mean([m['score'] for m in x[1]]), 
                reverse=True
            )[:5]
            
            insights = {
                'similar_player_count': len(similar_users),
                'top_similar_players': []
            }
            
            for similar_user_id, matches in top_similar:
                avg_similarity = np.mean([m['score'] for m in matches])
                common_patterns = {}
                
                for match in matches:
                    pattern = match['position_type']
                    if pattern in common_patterns:
                        common_patterns[pattern] += 1
                    else:
                        common_patterns[pattern] = 1
                
                insights['top_similar_players'].append({
                    'user_id': similar_user_id,
                    'similarity_score': avg_similarity,
                    'common_patterns': common_patterns,
                    'match_count': len(matches)
                })
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting similar player insights for {user_id}: {e}")
            return {'error': str(e)}
    
    async def analyze_tactical_patterns(self, user_id: str) -> Dict:
        """Analyze user's tactical strengths and weaknesses"""
        try:
            tactical_queries = [
                "pin tactic chess combination",
                "fork tactic chess move", 
                "skewer tactic chess pattern",
                "discovered attack chess tactic",
                "deflection tactic chess move",
                "double attack chess combination"
            ]
            
            tactical_analysis = {}
            
            for query in tactical_queries:
                tactic_name = query.split()[0]
                query_embedding = get_embedding(query)
                
                # Find user's performance with this tactic
                results = self.index.query(
                    vector=query_embedding,
                    filter={
                        'user_id': user_id,
                        'skill_category': 'Tactics'
                    },
                    top_k=30,
                    include_metadata=True
                )
                
                if results.matches:
                    scores = [match.score for match in results.matches]
                    accuracies = [
                        1.0 if match.metadata.get('accuracy_class') == 'excellent' else
                        0.8 if match.metadata.get('accuracy_class') == 'good' else
                        0.5 if match.metadata.get('accuracy_class') == 'inaccuracy' else
                        0.2 if match.metadata.get('accuracy_class') == 'mistake' else 0.0
                        for match in results.matches
                    ]
                    
                    tactical_analysis[tactic_name] = {
                        'avg_similarity': np.mean(scores),
                        'avg_accuracy': np.mean(accuracies),
                        'frequency': len(results.matches),
                        'strength_level': self._categorize_tactical_strength(np.mean(scores), np.mean(accuracies))
                    }
            
            return tactical_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing tactical patterns for {user_id}: {e}")
            return {}
    
    async def analyze_opening_patterns(self, user_id: str) -> Dict:
        """Analyze user's opening repertoire and performance"""
        try:
            opening_queries = [
                "italian game opening chess",
                "sicilian defense opening chess",
                "queen's gambit opening chess", 
                "french defense opening chess",
                "caro kann defense opening chess",
                "english opening chess"
            ]
            
            opening_analysis = {}
            
            for query in opening_queries:
                opening_name = " ".join(query.split()[:2])
                query_embedding = get_embedding(query)
                
                results = self.index.query(
                    vector=query_embedding,
                    filter={
                        'user_id': user_id,
                        'phase': 'opening'
                    },
                    top_k=20,
                    include_metadata=True
                )
                
                if results.matches:
                    scores = [match.score for match in results.matches]
                    results_data = [match.metadata.get('result', 'unknown') for match in results.matches]
                    
                    win_rate = len([r for r in results_data if r == 'win']) / len(results_data) if results_data else 0
                    
                    opening_analysis[opening_name] = {
                        'familiarity': np.mean(scores),
                        'frequency': len(results.matches),
                        'win_rate': win_rate,
                        'performance_level': self._categorize_opening_performance(np.mean(scores), win_rate)
                    }
            
            return opening_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing opening patterns for {user_id}: {e}")
            return {}
    
    async def analyze_time_management(self, user_id: str) -> Dict:
        """Analyze user's time management patterns"""
        try:
            # Query positions where time pressure was a factor
            time_queries = [
                "time pressure chess position",
                "rapid chess decision making",
                "blitz chess time management"
            ]
            
            time_analysis = {}
            
            for query in time_queries:
                query_embedding = get_embedding(query)
                
                results = self.index.query(
                    vector=query_embedding,
                    filter={'user_id': user_id},
                    top_k=50,
                    include_metadata=True
                )
                
                if results.matches:
                    # Analyze accuracy under time pressure
                    time_pressure_accuracy = []
                    for match in results.matches:
                        accuracy_class = match.metadata.get('accuracy_class', 'unknown')
                        if accuracy_class in ['excellent', 'good']:
                            time_pressure_accuracy.append(1.0)
                        elif accuracy_class in ['inaccuracy']:
                            time_pressure_accuracy.append(0.5)
                        else:
                            time_pressure_accuracy.append(0.0)
                    
                    time_analysis[query.split()[0]] = {
                        'sample_size': len(results.matches),
                        'accuracy_under_pressure': np.mean(time_pressure_accuracy) if time_pressure_accuracy else 0.0,
                        'avg_similarity': np.mean([match.score for match in results.matches])
                    }
            
            return time_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing time management for {user_id}: {e}")
            return {}
    
    def _categorize_tactical_strength(self, similarity: float, accuracy: float) -> str:
        """Categorize tactical strength based on similarity and accuracy"""
        if similarity > 0.8 and accuracy > 0.8:
            return "excellent"
        elif similarity > 0.6 and accuracy > 0.6:
            return "good"
        elif similarity > 0.4 and accuracy > 0.4:
            return "developing"
        else:
            return "needs_work"
    
    def _categorize_opening_performance(self, familiarity: float, win_rate: float) -> str:
        """Categorize opening performance"""
        if familiarity > 0.7 and win_rate > 0.6:
            return "strong"
        elif familiarity > 0.5 and win_rate > 0.4:
            return "comfortable" 
        elif familiarity > 0.3:
            return "learning"
        else:
            return "unfamiliar"
    
    async def get_personalized_training_recommendations(self, user_id: str) -> Dict:
        """
        Generate personalized training recommendations based on enhanced context
        """
        try:
            # Get comprehensive user context
            context = await self.get_user_context(user_id)
            vector_insights = context.get('vector_insights', {})
            
            recommendations = {
                'tactical_training': [],
                'opening_study': [],
                'strategic_focus': [],
                'time_management': []
            }
            
            # Tactical recommendations
            tactical_patterns = vector_insights.get('tactical_strengths', {})
            for tactic, data in tactical_patterns.items():
                if data.get('strength_level') == 'needs_work':
                    recommendations['tactical_training'].append({
                        'focus': tactic,
                        'priority': 'high',
                        'reason': f"Low accuracy ({data.get('avg_accuracy', 0):.1%}) in {tactic} positions"
                    })
            
            # Opening recommendations
            opening_insights = vector_insights.get('opening_insights', {})
            for opening, data in opening_insights.items():
                if data.get('performance_level') == 'unfamiliar' and data.get('frequency', 0) > 0:
                    recommendations['opening_study'].append({
                        'opening': opening,
                        'priority': 'medium',
                        'reason': f"Encountered {data.get('frequency', 0)} times but unfamiliar"
                    })
            
            # Time management recommendations
            time_patterns = vector_insights.get('time_patterns', {})
            for time_type, data in time_patterns.items():
                if data.get('accuracy_under_pressure', 1.0) < 0.5:
                    recommendations['time_management'].append({
                        'focus': f"{time_type}_training",
                        'priority': 'high',
                        'reason': f"Accuracy drops to {data.get('accuracy_under_pressure', 0):.1%} under time pressure"
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating training recommendations for {user_id}: {e}")
            return {}
    
    async def update_memory_with_insights(self, user_id: str, session_data: Dict) -> Dict:
        """
        Enhanced memory update that incorporates vector insights
        """
        # First update using parent class method
        updated_memory = await super().update_memory_after_session(user_id, session_data)
        
        try:
            # Generate fresh insights after the session
            if session_data.get('include_vector_analysis', False):
                vector_insights = await self._get_vector_insights(user_id)
                
                # Update memory with key insights
                insight_summary = {
                    'last_vector_analysis': datetime.now().isoformat(),
                    'tactical_focus': self._extract_tactical_focus(vector_insights),
                    'style_evolution': self._track_style_evolution(user_id, vector_insights),
                    'improvement_areas': self._identify_improvement_areas(vector_insights)
                }
                
                # Store insights in memory
                updated_memory['vector_insight_summary'] = insight_summary
                
                # Update in database
                result = supabase.table('user_memory').update({
                    'vector_insight_summary': insight_summary
                }).eq('id', updated_memory['id']).execute()
                
                if result.data:
                    updated_memory = result.data[0]
            
            return updated_memory
            
        except Exception as e:
            logger.error(f"Error updating memory with insights for {user_id}: {e}")
            return updated_memory  # Return basic update if enhancement fails
    
    def _extract_tactical_focus(self, vector_insights: Dict) -> str:
        """Extract main tactical focus area from insights"""
        tactical_strengths = vector_insights.get('tactical_strengths', {})
        
        if not tactical_strengths:
            return 'general_tactics'
        
        # Find area needing most work
        needs_work = [
            tactic for tactic, data in tactical_strengths.items()
            if data.get('strength_level') == 'needs_work'
        ]
        
        if needs_work:
            return needs_work[0]
        
        # If nothing needs work, focus on developing areas
        developing = [
            tactic for tactic, data in tactical_strengths.items()
            if data.get('strength_level') == 'developing'
        ]
        
        return developing[0] if developing else 'advanced_tactics'
    
    def _track_style_evolution(self, user_id: str, vector_insights: Dict) -> Dict:
        """Track how user's playing style is evolving"""
        # This would compare current style embedding with historical data
        # For now, return basic style tracking
        return {
            'current_style': 'balanced',  # Would be derived from style embedding
            'trend': 'stable',
            'confidence': 0.8
        }
    
    def _identify_improvement_areas(self, vector_insights: Dict) -> List[str]:
        """Identify top improvement areas from vector analysis"""
        areas = []
        
        # Check tactical weaknesses
        tactical_strengths = vector_insights.get('tactical_strengths', {})
        weak_tactics = [
            tactic for tactic, data in tactical_strengths.items()
            if data.get('avg_accuracy', 1.0) < 0.5
        ]
        areas.extend(weak_tactics[:2])  # Top 2 tactical weaknesses
        
        # Check opening performance
        opening_insights = vector_insights.get('opening_insights', {})
        weak_openings = [
            opening for opening, data in opening_insights.items()
            if data.get('win_rate', 1.0) < 0.4
        ]
        if weak_openings:
            areas.append('opening_preparation')
        
        # Check time management
        time_patterns = vector_insights.get('time_patterns', {})
        if any(data.get('accuracy_under_pressure', 1.0) < 0.5 for data in time_patterns.values()):
            areas.append('time_management')
        
        return areas[:3]  # Return top 3 areas 