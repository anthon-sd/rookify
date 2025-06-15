import requests
from typing import List, Dict, Optional, Tuple
import os
from dotenv import load_dotenv
import chess
import chess.engine
import uuid
from datetime import datetime

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class GameAnalyzer:
    def __init__(self, ai_engine_url: str = None, stockfish_path: str = None):
        """
        Initialize the game analyzer to use the AI engine service.
        
        Args:
            ai_engine_url (str, optional): URL of the AI engine service
            stockfish_path (str, optional): Path to Stockfish executable
        """
        self.ai_engine_url = ai_engine_url or os.getenv('AI_ENGINE_URL', 'http://localhost:5000')
        self.stockfish_path = stockfish_path or os.getenv('STOCKFISH_PATH', '/usr/games/stockfish')
        self.engine = None

    def _get_engine(self) -> chess.engine.SimpleEngine:
        """Get or create a Stockfish engine instance."""
        if self.engine is None:
            self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)
        return self.engine

    def material_count(self, board: chess.Board) -> int:
        """Calculate material count difference (white perspective)."""
        piece_values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
        score = 0
        for p, val in piece_values.items():
            score += len(board.pieces(p, chess.WHITE)) * val
            score -= len(board.pieces(p, chess.BLACK)) * val
        return score

    def classify_move(self, delta_cp: float, is_book: bool = False, is_tactical: bool = False, 
                     is_brilliant: bool = False, is_great: bool = False) -> str:
        """Classify a move based on evaluation difference and special cases."""
        if is_brilliant: return "Brilliant"
        if is_great: return "Great"
        if is_book: return "Book"
        if delta_cp == 0: return "Best"
        elif delta_cp <= 20: return "Excellent"
        elif delta_cp <= 50: return "Good"
        elif delta_cp <= 150: return "Inaccuracy"
        elif delta_cp <= 300: return "Mistake"
        elif delta_cp <= 800: return "Miss"
        else: return "Blunder"

    def determine_phase(self, move_number: int, board: chess.Board) -> str:
        """Determine the game phase based on move number and piece count."""
        if move_number <= 10: return "opening"
        elif board.occupied_co[chess.WHITE].bit_count() + board.occupied_co[chess.BLACK].bit_count() <= 10: 
            return "endgame"
        else: return "middlegame"

    def detect_brilliance(self, prev_eval: float, player_eval: float, 
                         mat_before: int, mat_after: int, best_score: float) -> Tuple[bool, bool]:
        """Detect brilliant or great moves based on material and evaluation."""
        mat_loss = mat_before - mat_after
        if mat_loss >= 3 and player_eval > 200 and best_score == 0: return True, False
        if mat_loss >= 1 and player_eval > 100: return False, True
        return False, False

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

    def analyze_game_moments(self, moments: List[Dict], depth: int = 20) -> List[Dict]:
        """
        Analyze a list of game moments with enhanced move classification using the AI engine service.
        
        Args:
            moments (List[Dict]): List of game moments to analyze
            depth (int): Analysis depth
            
        Returns:
            List[Dict]: Analyzed moments with identified key positions
        """
        analyzed_moments = []
        all_recommendations = []
        prev_eval = None
        prev_mat = None
        for i, moment in enumerate(moments):
            board = chess.Board(moment['position_fen'])
            move_number = i + 1
            mat_before = self.material_count(board)

            # Analyze position with AI engine (get best move and eval)
            best_info = self.analyze_position(moment['position_fen'], depth)
            best_move = best_info.get("best_move")
            best_eval = best_info.get("evaluation", {}).get("value")
            if best_info.get("evaluation", {}).get("type") == "mate":
                # Assign a large value for mate
                best_eval = 10000 if best_eval > 0 else -10000

            # Make the move
            if moment.get('move'):
                move = chess.Move.from_uci(moment['move'])
                board.push(move)

            # Analyze resulting position
            deep_info = self.analyze_position(board.fen(), depth)
            player_eval = deep_info.get("evaluation", {}).get("value")
            if deep_info.get("evaluation", {}).get("type") == "mate":
                player_eval = 10000 if player_eval > 0 else -10000

            # Calculate evaluation difference
            delta_cp = abs((player_eval or 0) - (best_eval or 0))

            # Get material count after move
            mat_after = self.material_count(board)

            # Detect brilliant/great moves
            is_brilliant, is_great = self.detect_brilliance(
                prev_eval if prev_eval is not None else 0,
                player_eval if player_eval is not None else 0,
                prev_mat if prev_mat is not None else mat_before,
                mat_after,
                best_eval if best_eval is not None else 0
            )

            # Classify the move
            accuracy_class = self.classify_move(
                delta_cp, 
                is_brilliant=is_brilliant, 
                is_great=is_great
            )

            # Determine game phase
            phase = self.determine_phase(move_number, board)

            # Create analyzed moment
            analyzed_moment = {
                **moment,
                'id': str(uuid.uuid4()),
                'move_number': move_number,
                'stockfish_best': best_move,
                'eval_score': player_eval,
                'delta_cp': delta_cp,
                'accuracy_class': accuracy_class,
                'is_brilliant': is_brilliant,
                'is_great': is_great,
                'phase': phase,
                'timestamp': datetime.utcnow().isoformat()
            }

            # Generate recommendations for significant mistakes
            if accuracy_class in ['Mistake', 'Miss', 'Blunder']:
                recommendations = self._generate_recommendation(analyzed_moment)
                if recommendations:
                    all_recommendations.extend(recommendations)

            analyzed_moments.append(analyzed_moment)
            prev_eval = player_eval
            prev_mat = mat_after

        # Add recommendations to the first analyzed moment
        if analyzed_moments and all_recommendations:
            analyzed_moments[0]['recommendations'] = all_recommendations

        return analyzed_moments

    def _generate_recommendation(self, moment: Dict) -> Optional[List[Dict]]:
        """
        Generate recommendations for a key moment.
        
        Args:
            moment (Dict): The analyzed moment
            
        Returns:
            Optional[List[Dict]]: List of recommendations if applicable
        """
        try:
            from chess_taxonomy import map_to_taxonomy
            
            # Map the position to the chess taxonomy with multiple skills
            skill_matches = map_to_taxonomy(
                moment.get('commentary', ''),
                moment.get('accuracy_class', ''),
                moment.get('position_fen'),
                moment.get('move'),
                moment.get('delta_cp', 0)
            )
            
            # Create recommendations for each skill match
            recommendations = []
            for skill, sub_skill, phase, confidence in skill_matches:
                # Only include high-confidence matches
                if confidence >= 0.6:
                    recommendation = {
                        'user_id': moment.get('user_id', ''),
                        'game_analysis_id': moment.get('game_id', ''),
                        'recommendation': f"Practice {sub_skill} in {skill} to improve your {phase} play.",
                        'priority': 3 if moment.get('accuracy_class') == 'Blunder' else 
                                  (2 if moment.get('accuracy_class') == 'Miss' else 1),
                        'status': 'pending',
                        'skill_category': skill,
                        'sub_skill': sub_skill,
                        'phase': phase,
                        'confidence': confidence,
                        'position_fen': moment.get('position_fen', ''),
                        'move': moment.get('move', ''),
                        'commentary': moment.get('commentary', ''),
                        'accuracy_class': moment.get('accuracy_class', ''),
                        'delta_cp': moment.get('delta_cp', 0)
                    }
                    recommendations.append(recommendation)
            
            return recommendations
        except Exception as e:
            print(f"Error generating recommendation: {e}")
            return None 