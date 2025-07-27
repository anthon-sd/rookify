"""
Background task for updating user memory based on game analysis
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict
from services.memory_service import MemoryService
from config.database import supabase

class MemoryUpdater:
    """Updates user memory based on recent activity"""
    
    def __init__(self):
        self.memory_service = MemoryService()
    
    async def update_user_memory_from_games(self, user_id: str, days: int = 7):
        """Analyze recent games and update memory"""
        # Get recent games
        since = (datetime.now() - timedelta(days=days)).isoformat()
        games_result = supabase.table('game_analysis').select('*').eq(
            'user_id', user_id
        ).gte('created_at', since).execute()
        
        if not games_result.data:
            return
        
        games = games_result.data
        
        # Analyze performance
        performance_metrics = self._calculate_performance_metrics(games)
        
        # Detect patterns and breakthroughs
        patterns = self._detect_patterns(games)
        
        # Create session data
        session_data = {
            'performance_metrics': performance_metrics,
            'patterns_detected': patterns,
            'summary': self._generate_summary(games, performance_metrics),
            'mood_indicators': self._detect_mood_indicators(games),
            'key_moments': self._extract_key_moments(games),
            'breakthrough_detected': self._detect_breakthrough(games, performance_metrics)
        }
        
        # Update memory
        await self.memory_service.update_memory_after_session(user_id, session_data)
        
        return session_data
    
    def _calculate_performance_metrics(self, games: List[Dict]) -> Dict:
        """Calculate performance metrics from games"""
        total_games = len(games)
        if total_games == 0:
            return {}
            
        wins = sum(1 for g in games if self._is_win(g))
        draws = sum(1 for g in games if self._is_draw(g))
        
        # Calculate move-level statistics
        total_blunders = sum(g.get('blunders_count', 0) for g in games)
        total_mistakes = sum(g.get('mistakes_count', 0) for g in games)
        total_inaccuracies = sum(g.get('inaccuracies_count', 0) for g in games)
        total_moves = sum(g.get('total_moves', 0) for g in games)
        
        # Calculate accuracy
        accuracies = [g.get('avg_accuracy', 0) for g in games if g.get('avg_accuracy')]
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
        
        return {
            'games_played': total_games,
            'win_rate': wins / total_games,
            'draw_rate': draws / total_games,
            'loss_rate': (total_games - wins - draws) / total_games,
            'blunder_rate': total_blunders / total_moves if total_moves > 0 else 0,
            'mistake_rate': total_mistakes / total_moves if total_moves > 0 else 0,
            'inaccuracy_rate': total_inaccuracies / total_moves if total_moves > 0 else 0,
            'avg_accuracy': avg_accuracy,
            'total_blunders': total_blunders,
            'total_mistakes': total_mistakes,
            'total_inaccuracies': total_inaccuracies
        }
    
    def _is_draw(self, game: Dict) -> bool:
        """Check if game was a draw"""
        return game.get('result') == '1/2-1/2'
    
    def _is_win(self, game: Dict) -> bool:
        """Check if game was won by the user"""
        user_color = game.get('user_color')
        result = game.get('result')
        
        if user_color == 'white' and result == '1-0':
            return True
        elif user_color == 'black' and result == '0-1':
            return True
        return False
    

    
    def _detect_patterns(self, games: List[Dict]) -> Dict:
        """Detect patterns in user's games"""
        patterns = {
            'opening_preferences': {},
            'time_control_performance': {},
            'color_performance': {'white': 0, 'black': 0},
            'phase_weaknesses': {},
            'improvement_areas': []
        }
        
        # Analyze opening preferences
        for game in games:
            opening = game.get('opening_name', 'Unknown')
            if opening != 'Unknown':
                patterns['opening_preferences'][opening] = patterns['opening_preferences'].get(opening, 0) + 1
        
        # Analyze color performance
        for game in games:
            color = game.get('user_color')
            if color and self._is_win(game):
                patterns['color_performance'][color] += 1
        
        # Analyze time control performance
        for game in games:
            time_control = game.get('time_control', 'Unknown')
            if time_control != 'Unknown':
                if time_control not in patterns['time_control_performance']:
                    patterns['time_control_performance'][time_control] = {'games': 0, 'wins': 0}
                patterns['time_control_performance'][time_control]['games'] += 1
                if self._is_win(game):
                    patterns['time_control_performance'][time_control]['wins'] += 1
        
        return patterns
    
    def _generate_summary(self, games: List[Dict], performance: Dict) -> str:
        """Generate a text summary of the session"""
        total_games = performance.get('games_played', 0)
        win_rate = performance.get('win_rate', 0)
        blunder_rate = performance.get('blunder_rate', 0)
        avg_accuracy = performance.get('avg_accuracy', 0)
        
        summary_parts = []
        
        # Performance summary
        if win_rate > 0.6:
            summary_parts.append(f"Strong performance with {win_rate:.1%} win rate")
        elif win_rate < 0.4:
            summary_parts.append(f"Challenging session with {win_rate:.1%} win rate")
        else:
            summary_parts.append(f"Balanced session with {win_rate:.1%} win rate")
        
        # Accuracy summary
        if avg_accuracy > 85:
            summary_parts.append(f"excellent accuracy ({avg_accuracy:.1f}%)")
        elif avg_accuracy > 75:
            summary_parts.append(f"good accuracy ({avg_accuracy:.1f}%)")
        else:
            summary_parts.append(f"accuracy needs work ({avg_accuracy:.1f}%)")
        
        # Blunder analysis
        if blunder_rate > 0.05:
            summary_parts.append("high blunder rate suggests need for more careful calculation")
        elif blunder_rate < 0.02:
            summary_parts.append("clean play with minimal blunders")
        
        return f"Played {total_games} games. " + ", ".join(summary_parts) + "."
    
    def _detect_mood_indicators(self, games: List[Dict]) -> Dict:
        """Detect mood indicators from game patterns"""
        indicators = {
            'frustration_level': 'normal',
            'confidence_level': 'normal',
            'focus_level': 'normal'
        }
        
        # Detect frustration from blunder clusters
        recent_games = sorted(games, key=lambda x: x.get('created_at', ''))[-5:]
        high_blunder_games = sum(1 for g in recent_games if g.get('blunders_count', 0) > 2)
        
        if high_blunder_games >= 3:
            indicators['frustration_level'] = 'high'
        elif high_blunder_games >= 2:
            indicators['frustration_level'] = 'elevated'
        
        # Detect confidence from win streaks
        win_streak = 0
        for game in reversed(recent_games):
            if self._is_win(game):
                win_streak += 1
            else:
                break
        
        if win_streak >= 3:
            indicators['confidence_level'] = 'high'
        elif len([g for g in recent_games if self._is_win(g)]) == 0:
            indicators['confidence_level'] = 'low'
        
        # Detect focus from accuracy consistency
        accuracies = [g.get('avg_accuracy', 0) for g in recent_games if g.get('avg_accuracy')]
        if accuracies:
            accuracy_variance = max(accuracies) - min(accuracies)
            if accuracy_variance > 20:
                indicators['focus_level'] = 'inconsistent'
            elif all(acc > 80 for acc in accuracies):
                indicators['focus_level'] = 'excellent'
        
                return indicators
    
    def _extract_key_moments(self, games: List[Dict]) -> List[Dict]:
        """Extract key moments from games"""
        key_moments = []
        
        for game in games:
            # Extract significant moments from game analysis
            if game.get('key_moments'):
                try:
                    moments = game['key_moments'] if isinstance(game['key_moments'], list) else []
                    for moment in moments[:2]:  # Top 2 moments per game
                        key_moments.append({
                            'game_id': game.get('id'),
                            'game_url': game.get('game_url'),
                            'moment': moment,
                            'timestamp': game.get('created_at')
                        })
                except:
                    pass
        
        return key_moments[:10]  # Return top 10 key moments
    
    def _detect_breakthrough(self, games: List[Dict], performance: Dict) -> bool:
        """Detect if user had a breakthrough moment"""
        # Check for significant improvement indicators
        win_rate = performance.get('win_rate', 0)
        avg_accuracy = performance.get('avg_accuracy', 0)
        blunder_rate = performance.get('blunder_rate', 0)
        
        # Breakthrough criteria
        if win_rate > 0.7 and avg_accuracy > 85 and blunder_rate < 0.02:
            return True
        
        # Check for rating gains (would need to compare with previous sessions)
        ratings = [g.get('user_rating', 0) for g in games if g.get('user_rating')]
        if ratings and len(ratings) > 1:
            rating_gain = max(ratings) - min(ratings)
            if rating_gain > 50:  # Significant rating gain
                return True
        
        return False

# Convenience function for manual memory updates
async def update_user_memory(user_id: str, days: int = 7):
    """Update a single user's memory"""
    updater = MemoryUpdater()
    return await updater.update_user_memory_from_games(user_id, days) 