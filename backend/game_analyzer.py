import requests
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class GameAnalyzer:
    def __init__(self, ai_engine_url: str = None):
        """
        Initialize the game analyzer to use the AI engine service.
        
        Args:
            ai_engine_url (str, optional): URL of the AI engine service
        """
        self.ai_engine_url = ai_engine_url or os.getenv('AI_ENGINE_URL', 'http://ai-engine:5000')
    
    def analyze_position(self, fen: str, depth: int = 20) -> Dict:
        """
        Analyze a position using the AI engine service.
        
        Args:
            fen (str): FEN string of the position
            depth (int): Analysis depth
            
        Returns:
            Dict: Analysis results including evaluation and best move
        """
        response = requests.post(
            f"{self.ai_engine_url}/analyze",
            json={
                "fen": fen,
                "depth": depth
            }
        )
        response.raise_for_status()
        return response.json()
    
    def identify_key_moments(self, position: Dict, analysis: Dict) -> Dict:
        """
        Identify if a position is a key moment (blunder, mistake, etc.).
        
        Args:
            position (Dict): Position information
            analysis (Dict): Analysis results
            
        Returns:
            Dict: Updated position with identified key moment
        """
        # Convert evaluation to a number
        eval_dict = analysis['evaluation']
        if eval_dict['type'] == 'mate':
            eval_num = float('inf') if eval_dict['value'] > 0 else float('-inf')
        else:
            eval_num = eval_dict['value']
        
        # Determine if it's a blunder or mistake
        if abs(eval_num) > 300:  # More than 3 pawns difference
            position['tag'] = 'blunder'
            position['commentary'] = f"Critical position: {eval_num} centipawns. Best move was {analysis['best_move']}."
        elif abs(eval_num) > 150:  # More than 1.5 pawns difference
            position['tag'] = 'mistake'
            position['commentary'] = f"Significant mistake: {eval_num} centipawns. Best move was {analysis['best_move']}."
        
        return position
    
    def analyze_game_moments(self, moments: List[Dict], depth: int = 20) -> List[Dict]:
        """
        Analyze a list of game moments.
        
        Args:
            moments (List[Dict]): List of game moments to analyze
            depth (int): Analysis depth
            
        Returns:
            List[Dict]: Analyzed moments with identified key positions
        """
        analyzed_moments = []
        
        for moment in moments:
            # Analyze the position
            analysis = self.analyze_position(moment['position_fen'], depth)
            
            # Identify if it's a key moment
            analyzed_moment = self.identify_key_moments(moment, analysis)
            
            # Add analysis results
            analyzed_moment['analysis'] = analysis
            
            analyzed_moments.append(analyzed_moment)
        
        return analyzed_moments 