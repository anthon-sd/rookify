#!/usr/bin/env python3
"""
User Profiling Integration with Pinecone Vector Database
This module provides personalized chess recommendations based on user's game history
and playing patterns using the new rookify-vector-db index.
"""

import os
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from pinecone_upload import query_vector_db, get_embedding, PINECONE_INDEX_NAME, pc
from utils.db_batch import get_supabase_connection

class UserProfiler:
    """
    Advanced user profiling system that analyzes playing patterns
    and provides personalized recommendations using vector similarity.
    """
    
    def __init__(self):
        self.index = pc.Index(PINECONE_INDEX_NAME)
    
    def analyze_user_weaknesses(self, user_id: str, days: int = 30) -> Dict:
        """
        Analyze user's recent games to identify weakness patterns.
        
        Args:
            user_id: User's UUID
            days: Number of days to look back
            
        Returns:
            Dictionary with weakness analysis
        """
        try:
            # Query user's recent mistake patterns from vector DB
            filter_conditions = {
                'user_id': user_id,
                'accuracy_class': {'$in': ['mistake', 'blunder', 'miss']}
            }
            
            # Search for patterns in user's mistakes
            mistake_query = "tactical mistake blunder position analysis"
            results = self.index.query(
                vector=get_embedding(mistake_query),
                filter=filter_conditions,
                top_k=100,
                include_metadata=True
            )
            
            # Analyze patterns
            weakness_patterns = self._analyze_mistake_patterns(results.matches)
            
            return {
                'user_id': user_id,
                'analysis_period_days': days,
                'total_mistakes_analyzed': len(results.matches),
                'weakness_patterns': weakness_patterns,
                'recommendations': self._generate_improvement_recommendations(weakness_patterns)
            }
            
        except Exception as e:
            print(f"Error analyzing user weaknesses: {e}")
            return {'error': str(e)}
    
    def _analyze_mistake_patterns(self, matches: List) -> Dict:
        """Analyze patterns in user's mistakes."""
        patterns = {
            'phase_weaknesses': {},
            'skill_weaknesses': {},
            'opening_problems': {},
            'rating_performance': {}
        }
        
        for match in matches:
            metadata = match.metadata
            
            # Phase analysis
            phase = metadata.get('phase', 'unknown')
            patterns['phase_weaknesses'][phase] = patterns['phase_weaknesses'].get(phase, 0) + 1
            
            # Skill category analysis
            skill = metadata.get('skill_category', 'unknown')
            patterns['skill_weaknesses'][skill] = patterns['skill_weaknesses'].get(skill, 0) + 1
            
            # Opening analysis
            opening = metadata.get('opening_name', 'unknown')
            if opening != 'unknown':
                patterns['opening_problems'][opening] = patterns['opening_problems'].get(opening, 0) + 1
            
            # Rating-based performance
            user_rating = metadata.get('user_rating', 0)
            opponent_rating = metadata.get('opponent_rating', 0)
            rating_diff = opponent_rating - user_rating
            
            if rating_diff < -100:
                rating_category = 'against_lower_rated'
            elif rating_diff > 100:
                rating_category = 'against_higher_rated'
            else:
                rating_category = 'similar_rating'
            
            patterns['rating_performance'][rating_category] = patterns['rating_performance'].get(rating_category, 0) + 1
        
        return patterns
    
    def _generate_improvement_recommendations(self, patterns: Dict) -> List[Dict]:
        """Generate specific improvement recommendations based on patterns."""
        recommendations = []
        
        # Phase-based recommendations
        phase_weaknesses = patterns.get('phase_weaknesses', {})
        for phase, count in sorted(phase_weaknesses.items(), key=lambda x: x[1], reverse=True)[:3]:
            recommendations.append({
                'type': 'phase_improvement',
                'phase': phase,
                'priority': 'high' if count > 5 else 'medium',
                'recommendation': f"Focus on {phase} training - {count} mistakes identified",
                'specific_actions': self._get_phase_specific_actions(phase)
            })
        
        # Skill-based recommendations  
        skill_weaknesses = patterns.get('skill_weaknesses', {})
        for skill, count in sorted(skill_weaknesses.items(), key=lambda x: x[1], reverse=True)[:2]:
            recommendations.append({
                'type': 'skill_improvement',
                'skill_category': skill,
                'priority': 'high' if count > 3 else 'medium',
                'recommendation': f"Practice {skill} - {count} related mistakes",
                'specific_actions': self._get_skill_specific_actions(skill)
            })
        
        return recommendations
    
    def _get_phase_specific_actions(self, phase: str) -> List[str]:
        """Get specific training actions for a game phase."""
        actions = {
            'opening': [
                "Study opening principles and common patterns",
                "Review your opening repertoire",
                "Practice tactical puzzles in your openings"
            ],
            'middlegame': [
                "Work on tactical pattern recognition",
                "Study pawn structure concepts",
                "Practice positional evaluation"
            ],
            'endgame': [
                "Study basic endgame patterns",
                "Practice king and pawn endgames",
                "Learn theoretical endgame positions"
            ]
        }
        return actions.get(phase, ["General chess study recommended"])
    
    def _get_skill_specific_actions(self, skill: str) -> List[str]:
        """Get specific training actions for a skill category."""
        actions = {
            'Tactics': [
                "Solve 10-15 tactical puzzles daily",
                "Focus on pattern recognition",
                "Practice time-pressured tactics"
            ],
            'Strategy': [
                "Study classic strategic games",
                "Learn pawn structure principles",
                "Practice positional evaluation"
            ],
            'Openings': [
                "Expand your opening repertoire",
                "Study opening principles",
                "Analyze your opening statistics"
            ],
            'Endgames': [
                "Study fundamental endgame positions",
                "Practice basic endgame techniques",
                "Learn endgame calculation methods"
            ]
        }
        return actions.get(skill, ["General improvement recommended"])
    
    def find_similar_players(self, user_id: str, rating_range: int = 100) -> List[Dict]:
        """
        Find players with similar playing patterns and rating.
        
        Args:
            user_id: User's UUID
            rating_range: Rating range to search within
            
        Returns:
            List of similar players with their characteristics
        """
        try:
            # Get user's recent games to create a "playing style" embedding
            user_games = self._get_user_recent_games(user_id, limit=50)
            
            if not user_games:
                return []
            
            # Create a composite query representing the user's style
            style_query = self._create_user_style_query(user_games)
            
            # Search for similar patterns from other users
            results = self.index.query(
                vector=get_embedding(style_query),
                filter={
                    'user_id': {'$ne': user_id},  # Exclude the user themselves
                    'user_rating': {
                        '$gte': user_games[0].get('user_rating', 1500) - rating_range,
                        '$lte': user_games[0].get('user_rating', 1500) + rating_range
                    }
                },
                top_k=20,
                include_metadata=True
            )
            
            # Group by user and analyze similarities
            similar_users = self._group_and_analyze_similar_users(results.matches)
            
            return similar_users[:5]  # Return top 5 similar players
            
        except Exception as e:
            print(f"Error finding similar players: {e}")
            return []
    
    def _get_user_recent_games(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get user's recent games from vector database."""
        try:
            results = self.index.query(
                vector=[0.1] * 1024,  # Dummy vector for metadata-only search
                filter={'user_id': user_id},
                top_k=limit,
                include_metadata=True
            )
            
            return [match.metadata for match in results.matches]
        except:
            return []
    
    def _create_user_style_query(self, games: List[Dict]) -> str:
        """Create a text query representing the user's playing style."""
        # Analyze the user's characteristics
        openings = {}
        phases = {}
        accuracy_classes = {}
        
        for game in games:
            opening = game.get('opening_name', '')
            if opening:
                openings[opening] = openings.get(opening, 0) + 1
            
            phase = game.get('phase', '')
            if phase:
                phases[phase] = phases.get(phase, 0) + 1
            
            accuracy = game.get('accuracy_class', '')
            if accuracy:
                accuracy_classes[accuracy] = accuracy_classes.get(accuracy, 0) + 1
        
        # Build style description
        top_opening = max(openings.items(), key=lambda x: x[1])[0] if openings else "varied openings"
        top_phase = max(phases.items(), key=lambda x: x[1])[0] if phases else "middlegame"
        avg_rating = sum(game.get('user_rating', 1500) for game in games) / len(games) if games else 1500
        
        style_query = f"chess player {avg_rating} rating {top_opening} {top_phase} specialist"
        
        return style_query
    
    def _group_and_analyze_similar_users(self, matches: List) -> List[Dict]:
        """Group matches by user and analyze their playing characteristics."""
        user_groups = {}
        
        for match in matches:
            user_id = match.metadata.get('user_id')
            if user_id not in user_groups:
                user_groups[user_id] = []
            user_groups[user_id].append(match.metadata)
        
        similar_users = []
        for user_id, games in user_groups.items():
            if len(games) >= 3:  # Only include users with sufficient data
                user_profile = self._analyze_user_profile(games)
                user_profile['user_id'] = user_id
                user_profile['similarity_score'] = sum(match.score for match in matches if match.metadata.get('user_id') == user_id) / len(games)
                similar_users.append(user_profile)
        
        return sorted(similar_users, key=lambda x: x['similarity_score'], reverse=True)
    
    def _analyze_user_profile(self, games: List[Dict]) -> Dict:
        """Analyze a user's playing profile from their games."""
        if not games:
            return {}
        
        # Calculate statistics
        avg_rating = sum(game.get('user_rating', 1500) for game in games) / len(games)
        
        # Most common characteristics
        openings = {}
        phases = {}
        results = {}
        
        for game in games:
            opening = game.get('opening_name', '')
            if opening:
                openings[opening] = openings.get(opening, 0) + 1
            
            phase = game.get('phase', '')
            if phase:
                phases[phase] = phases.get(phase, 0) + 1
            
            result = game.get('result', '')
            if result:
                results[result] = results.get(result, 0) + 1
        
        return {
            'average_rating': round(avg_rating),
            'total_games_analyzed': len(games),
            'favorite_openings': sorted(openings.items(), key=lambda x: x[1], reverse=True)[:3],
            'strongest_phase': max(phases.items(), key=lambda x: x[1])[0] if phases else 'unknown',
            'win_rate': results.get('1-0', 0) / len(games) if '1-0' in results else 0
        }
    
    def get_personalized_training_positions(self, user_id: str, skill_focus: str = None, difficulty: str = 'adaptive') -> List[Dict]:
        """
        Get personalized training positions based on user's weaknesses.
        
        Args:
            user_id: User's UUID
            skill_focus: Specific skill to focus on (optional)
            difficulty: 'easy', 'medium', 'hard', or 'adaptive'
            
        Returns:
            List of training positions with metadata
        """
        try:
            # Get user's current skill level and weaknesses
            user_analysis = self.analyze_user_weaknesses(user_id)
            
            if 'error' in user_analysis:
                return []
            
            # Determine search parameters based on user analysis
            search_filters = {'user_id': {'$ne': user_id}}  # Exclude user's own positions
            
            if skill_focus:
                search_filters['skill_category'] = skill_focus
            else:
                # Focus on user's biggest weakness
                weaknesses = user_analysis.get('weakness_patterns', {}).get('skill_weaknesses', {})
                if weaknesses:
                    top_weakness = max(weaknesses.items(), key=lambda x: x[1])[0]
                    search_filters['skill_category'] = top_weakness
            
            # Adaptive difficulty based on user's typical performance
            if difficulty == 'adaptive':
                user_games = self._get_user_recent_games(user_id, 20)
                if user_games:
                    avg_rating = sum(game.get('user_rating', 1500) for game in user_games) / len(user_games)
                    search_filters['user_rating'] = {
                        '$gte': avg_rating - 200,
                        '$lte': avg_rating + 200
                    }
            
            # Search for training positions
            training_query = f"chess tactical training position {skill_focus if skill_focus else 'improvement'}"
            results = self.index.query(
                vector=get_embedding(training_query),
                filter=search_filters,
                top_k=20,
                include_metadata=True
            )
            
            # Format training positions
            training_positions = []
            for match in results.matches:
                position = {
                    'fen': match.metadata.get('fen'),
                    'skill_category': match.metadata.get('skill_category'),
                    'sub_skill': match.metadata.get('sub_skill'),
                    'phase': match.metadata.get('phase'),
                    'difficulty_rating': match.metadata.get('user_rating', 1500),
                    'commentary': match.metadata.get('commentary'),
                    'best_move': match.metadata.get('stockfish_best'),
                    'source_game_url': match.metadata.get('game_url'),
                    'relevance_score': match.score
                }
                training_positions.append(position)
            
            return training_positions
            
        except Exception as e:
            print(f"Error getting personalized training positions: {e}")
            return []

def test_user_profiling():
    """Test the user profiling functionality."""
    profiler = UserProfiler()
    
    # Test with a sample user ID (replace with actual user ID)
    test_user_id = "sample-user-id"
    
    print("Testing User Profiling System")
    print("=" * 50)
    
    # Test weakness analysis
    print("1. Analyzing user weaknesses...")
    weaknesses = profiler.analyze_user_weaknesses(test_user_id)
    print(f"   Result: {len(weaknesses.get('weakness_patterns', {}))} patterns found")
    
    # Test similar players
    print("2. Finding similar players...")
    similar = profiler.find_similar_players(test_user_id)
    print(f"   Result: {len(similar)} similar players found")
    
    # Test training positions
    print("3. Getting training positions...")
    positions = profiler.get_personalized_training_positions(test_user_id, skill_focus="Tactics")
    print(f"   Result: {len(positions)} training positions found")
    
    print("✅ User profiling test completed!")

if __name__ == "__main__":
    test_user_profiling() 