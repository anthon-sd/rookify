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
                     is_brilliant: bool = False, is_forced: bool = False) -> str:
        """
        Classify a chess move based on centipawn loss and special criteria.

        Args:
            delta_cp: Centipawn difference between played move and best move (use abs value).
            is_book: Whether the move is from the opening book.
            is_tactical: Whether the move involves tactical motifs.
            is_brilliant: Exceptional sacrifice or tactical move.
            is_forced: Only move to maintain evaluation or survive.

        Returns:
            String label for move quality.
        """
        abs_delta = abs(delta_cp)
        if is_brilliant:
            return "Brilliant"
        if is_book:
            return "Book"
        if is_forced:
            return "Forced"
        if abs_delta == 0:
            return "Best"
        if abs_delta <= 10:
            return "Great"
        if abs_delta <= 50:
            return "Balanced"
        if abs_delta <= 150:
            return "Inaccuracy"
        if abs_delta <= 300:
            return "Mistake"
        return "Blunder"

    def determine_phase(self, move_number: int, board: chess.Board) -> str:
        """Determine the game phase: opening, middlegame, or endgame.

        Opening: first 10 moves or queens/major pieces on board.
        Endgame: both sides lack queen, or low total material.
        Middlegame: in between.
        """
        white_queen = board.pieces(chess.QUEEN, chess.WHITE)
        black_queen = board.pieces(chess.QUEEN, chess.BLACK)
        total_pieces = len(board.piece_map())
        if move_number <= 10 and (len(white_queen) > 0 or len(black_queen) > 0):
            return "opening"
        if len(white_queen) == 0 and len(black_queen) == 0 or total_pieces <= 8:
            return "endgame"
        return "middlegame"

    def detect_brilliance(self, prev_eval: float, player_eval: float, 
                         mat_before: int, mat_after: int, best_score: float) -> bool:
        """
        Detect brilliant moves based on material sacrifice and evaluation gain.
        Brilliancy: material loss (>=3), but evaluation swings massively positive (>250cp).
        """
        mat_loss = mat_before - mat_after
        # A brilliant move: sacrifice >=3, gain > +250 centipawns
        if mat_loss >= 3 and player_eval > prev_eval + 250 and best_score == 0:
            return True
        return False

    def detect_tactical_features(self, board: chess.Board, move: chess.Move = None) -> Dict:
        """Detect checks, captures, castling (optionally add pins/forks)."""
        features = {
            'is_check': board.is_check(),
            'is_capture': board.is_capture(move) if move else False,
            'is_castle': move and board.is_castling(move) if move else False,
            'piece_count': len(board.piece_map()),
            'is_tactical': False,
            # 'is_pin': False,  # Expand if needed
            # 'is_fork': False
        }
        # Add custom tactical pattern recognition as desired here
        features['is_tactical'] = features['is_check'] or features['is_capture'] or features['is_castle']
        return features

    def detect_phase_transition(self, current_phase: str, previous_phase: str) -> bool:
        """Detect if there's a phase transition."""
        if not previous_phase:
            return False
        return current_phase != previous_phase

    def detect_forced_move(self, board: chess.Board, played_move: str, best_move: str, 
                          position_eval: float, best_eval: float, depth: int = 20) -> bool:
        """
        Detect if a move is forced:
        Only returns True when there is exactly one legal move.
        """
        legal_moves = list(board.legal_moves)
        return len(legal_moves) == 1

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
            json={"fen": fen, "depth": depth},
            timeout=120  # Increased timeout for AI engine with OpenAI calls
        )
        response.raise_for_status()
        return response.json()

    def analyze_positions_batch(self, positions: List[Dict], depth: int = 20, 
                               user_rating: int = 1500, user_level: str = "intermediate") -> Dict[str, Dict]:
        """
        Analyze multiple positions using batch processing.

        Args:
            positions: List of position dictionaries with 'fen' and 'position_id'
            depth: Analysis depth
            user_rating: User's rating for selective analysis
            user_level: User's skill level

        Returns:
            Dict mapping position_id to analysis results
        """
        batch_size = 50  # Process in chunks to avoid timeout
        all_results = {}

        for i in range(0, len(positions), batch_size):
            batch = positions[i:i + batch_size]
            try:
                response = requests.post(
                    f"{self.ai_engine_url}/analyze-batch",
                    json={
                        'positions': batch,
                        'default_depth': depth,
                        'user_rating': user_rating,
                        'user_level': user_level,
                        'selective_llm': True
                    },
                    timeout=300  # 5 minutes for batch
                )
                if response.status_code == 200:
                    batch_results = response.json()['results']
                    for result in batch_results:
                        if 'error' not in result and result.get('position_id'):
                            all_results[result['position_id']] = result
                else:
                    print(f"Batch analysis failed with status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"Error in batch analysis: {e}")
                # Fallback to individual analysis for this batch
                for pos in batch:
                    try:
                        result = self.analyze_position(pos['fen'], depth)
                        all_results[pos['position_id']] = result
                    except Exception as pos_error:
                        print(f"Failed to analyze position {pos['position_id']}: {pos_error}")

        return all_results

    def analyze_game_moments(self, moments: List[Dict], depth: int = 20, 
                             user_rating: int = 1500, user_level: str = "intermediate") -> List[Dict]:
        """
        Analyze a list of game moments with enhanced move classification using batch processing.

        Args:
            moments (List[Dict]): List of game moments to analyze
            depth (int): Analysis depth
            user_rating (int): User's rating for selective analysis
            user_level (str): User's skill level

        Returns:
            List[Dict]: Analyzed moments with identified key positions
        """
        print(f"🔍 ANALYZER DEBUG: analyze_game_moments called with:")
        print(f"   - moments type: {type(moments)}")
        print(f"   - moments value: {moments}")
        print(f"   - depth: {depth} (type: {type(depth)})")
        print(f"   - user_rating: {user_rating} (type: {type(user_rating)})")
        print(f"   - user_level: {user_level} (type: {type(user_level)})")

        if not moments:
            print("🔍 ANALYZER DEBUG: moments is empty, returning []")
            return []

        # Validation: ensure moments is a list
        if not isinstance(moments, list):
            print(f"❌ ANALYZER ERROR: moments parameter is not a list, got {type(moments)}: {moments}")
            return []

        print(f"🔍 ANALYZER DEBUG: moments is a list with {len(moments)} items")

        analyzed_moments = []
        all_recommendations = []

        # Prepare positions for batch analysis
        batch_positions = []
        position_map = {}  # Map position_id to moment index and type

        # Track game context for selective analysis
        game_context = {
            'mistakes_analyzed': 0,
            'previous_phase': None,
            'total_moments': len(moments)
        }

        for i, moment in enumerate(moments):
            board = chess.Board(moment['position_fen'])
            move_number = i + 1
            current_phase = self.determine_phase(move_number, board)

            # Detect phase transition
            phase_transition = self.detect_phase_transition(current_phase, game_context['previous_phase'])
            game_context['previous_phase'] = current_phase

            # Get tactical features for the position
            move_obj = None
            if moment.get('move'):
                try:
                    move_obj = chess.Move.from_uci(moment['move'])
                except:
                    move_obj = None

            tactical_features = self.detect_tactical_features(board, move_obj)

            # Position before move
            position_id_before = f"pos_{i}_before"
            position_map[position_id_before] = {'moment_idx': i, 'type': 'before'}

            move_context = {
                'move_number': move_number,
                'phase': current_phase,
                'phase_transition': phase_transition,
                'piece_count': tactical_features['piece_count'],
                'is_tactical': tactical_features['is_tactical'],
                'is_check': tactical_features['is_check'],
                'is_capture': tactical_features['is_capture'],
                'mistakes_analyzed_in_game': game_context['mistakes_analyzed']
            }

            batch_positions.append({
                'fen': moment['position_fen'],
                'position_id': position_id_before,
                'depth': depth,
                'move_context': move_context,
                'user_level': user_level,
                'user_rating': user_rating
            })

            # Position after move (if move exists)
            if moment.get('move') and move_obj:
                board_after = chess.Board(moment['position_fen'])
                try:
                    board_after.push(move_obj)
                    position_id_after = f"pos_{i}_after"
                    position_map[position_id_after] = {'moment_idx': i, 'type': 'after'}

                    tactical_features_after = self.detect_tactical_features(board_after)

                    move_context_after = {
                        'move_number': move_number,
                        'phase': current_phase,
                        'piece_count': tactical_features_after['piece_count'],
                        'is_tactical': tactical_features_after['is_tactical'],
                        'move_played': moment['move']
                    }

                    batch_positions.append({
                        'fen': board_after.fen(),
                        'position_id': position_id_after,
                        'depth': depth,
                        'move_context': move_context_after,
                        'user_level': user_level,
                        'user_rating': user_rating
                    })
                except Exception as e:
                    print(f"Error processing move {moment['move']}: {e}")

        # Analyze all positions in batch
        print(f"Analyzing {len(batch_positions)} positions in batch...")
        batch_results = self.analyze_positions_batch(batch_positions, depth, user_rating, user_level)

        # Process results and create analyzed moments
        prev_eval = None
        prev_mat = None

        # First pass: Calculate accuracy classes for all moves
        accuracy_classes = []
        deltas_cp = []
        
        for i, moment in enumerate(moments):
            board = chess.Board(moment['position_fen'])
            mat_before = self.material_count(board)

            # Get analysis results
            position_id_before = f"pos_{i}_before"
            position_id_after = f"pos_{i}_after"

            best_info = batch_results.get(position_id_before, {})
            best_move = best_info.get("best_move")
            best_eval = best_info.get("evaluation", {}).get("value")

            if best_info.get("evaluation", {}).get("type") == "mate":
                best_eval = 10000 if best_eval > 0 else -10000

            # Get evaluation after move
            player_eval = None
            if moment.get('move'):
                try:
                    move = chess.Move.from_uci(moment['move'])
                    board.push(move)
                    deep_info = batch_results.get(position_id_after, {})
                    player_eval = deep_info.get("evaluation", {}).get("value")
                    if deep_info.get("evaluation", {}).get("type") == "mate":
                        player_eval = 10000 if player_eval > 0 else -10000
                except Exception:
                    player_eval = None

            # Calculate evaluation difference
            delta_cp = abs((player_eval or 0) - (best_eval or 0)) if best_eval is not None else 0
            deltas_cp.append(delta_cp)

            # Get material count after move
            mat_after = self.material_count(board)

            # Detect brilliant/great moves
            is_brilliant = self.detect_brilliance(
                prev_eval if prev_eval is not None else 0,
                player_eval if player_eval is not None else 0,
                prev_mat if prev_mat is not None else mat_before,
                mat_after,
                best_eval if best_eval is not None else 0
            )

            # Detect forced moves
            is_forced = False
            if moment.get('move') and best_move:
                try:
                    board_temp = chess.Board(moment['position_fen'])
                    is_forced = self.detect_forced_move(
                        board_temp,
                        moment['move'],
                        best_move,
                        player_eval if player_eval is not None else 0,
                        best_eval if best_eval is not None else 0,
                        depth
                    )
                except Exception:
                    is_forced = False

            # Classify the move
            accuracy_class = self.classify_move(
                delta_cp, 
                is_brilliant=is_brilliant, 
                is_forced=is_forced
            )
            accuracy_classes.append(accuracy_class)
            
            prev_eval = player_eval
            prev_mat = mat_after

        # Second pass: Create analyzed moments and request LLM analysis for important moves
        llm_positions = []
        for i, moment in enumerate(moments):
            accuracy_class = accuracy_classes[i]
            delta_cp = deltas_cp[i]
            
            # Check if this move needs LLM analysis
            if accuracy_class in ['Mistake', 'Blunder', 'Brilliant', 'Great'] and delta_cp > 50:
                position_id_after = f"pos_{i}_after"
                if position_id_after in batch_results:
                    # Create enhanced move context for LLM analysis
                    enhanced_context = {
                        'accuracy_class': accuracy_class,
                        'delta_cp': delta_cp,
                        'is_tactical': True,
                        'move_number': i + 1,
                        'phase': self.determine_phase(i + 1, chess.Board(moment['position_fen']))
                    }
                    
                    llm_positions.append({
                        'fen': batch_results[position_id_after].get('fen', moment['position_fen']),
                        'position_id': f"llm_{i}",
                        'depth': depth,
                        'move_context': enhanced_context,
                        'user_level': user_level,
                        'user_rating': user_rating
                    })

        # Request LLM analysis for important positions
        llm_results = {}
        if llm_positions:
            print(f"🧠 Requesting LLM analysis for {len(llm_positions)} important positions...")
            llm_results = self.analyze_positions_batch(llm_positions, depth, user_rating, user_level)

        # Third pass: Create final analyzed moments
        for i, moment in enumerate(moments):
            board = chess.Board(moment['position_fen'])
            move_number = i + 1
            
            accuracy_class = accuracy_classes[i]
            delta_cp = deltas_cp[i]

            # Get analysis results
            position_id_before = f"pos_{i}_before"
            position_id_after = f"pos_{i}_after"

            best_info = batch_results.get(position_id_before, {})
            best_move = best_info.get("best_move")
            best_eval = best_info.get("evaluation", {}).get("value")

            if best_info.get("evaluation", {}).get("type") == "mate":
                best_eval = 10000 if best_eval > 0 else -10000

            # Get evaluation after move
            player_eval = None
            llm_analysis = None

            if moment.get('move'):
                try:
                    move = chess.Move.from_uci(moment['move'])
                    board.push(move)

                    deep_info = batch_results.get(position_id_after, {})
                    player_eval = deep_info.get("evaluation", {}).get("value")

                    if deep_info.get("evaluation", {}).get("type") == "mate":
                        player_eval = 10000 if player_eval > 0 else -10000

                    # Get LLM analysis if it was generated
                    llm_analysis = deep_info.get("analysis")
                    
                    # Check for enhanced LLM analysis
                    llm_position_id = f"llm_{i}"
                    if llm_position_id in llm_results:
                        enhanced_llm = llm_results[llm_position_id].get("analysis")
                        if enhanced_llm:
                            llm_analysis = enhanced_llm

                except Exception as e:
                    print(f"Error processing move for moment {i}: {e}")

            # Get material count after move
            mat_after = self.material_count(board)

            # Detect brilliant/great moves (recalculate for consistency)
            is_brilliant = accuracy_class == 'Brilliant'

            # Update mistake counter for selective analysis
            if accuracy_class in ['Mistake', 'Blunder']:
                game_context['mistakes_analyzed'] += 1

            # Determine game phase
            phase = self.determine_phase(move_number, board)

            # Get enhanced analysis data from batch results
            enhanced_before = batch_results.get(position_id_before, {}).get('enhanced_analysis', {})
            enhanced_after = batch_results.get(position_id_after, {}).get('enhanced_analysis', {})

            # Create analyzed moment with enhanced data
            analyzed_moment = {
                **moment,
                'id': str(uuid.uuid4()),
                'move_number': move_number,
                'stockfish_best': best_move,
                'eval_score': player_eval,
                'delta_cp': delta_cp,
                'accuracy_class': accuracy_class,
                'is_brilliant': is_brilliant,
                'phase': phase,
                'timestamp': datetime.utcnow().isoformat(),
                'llm_analysis': llm_analysis,
                'llm_used': best_info.get('llm_used', False) or batch_results.get(position_id_after, {}).get('llm_used', False),
                # Enhanced analysis data from Stockfish
                'enhanced_before': enhanced_before,
                'enhanced_after': enhanced_after,
                'eval_before': best_eval,
                'eval_after': player_eval
            }

            # Generate recommendations for significant mistakes
            if accuracy_class in ['Mistake', 'Blunder']:
                recommendations = self._generate_recommendation(analyzed_moment)
                if recommendations:
                    all_recommendations.extend(recommendations)

            analyzed_moments.append(analyzed_moment)
            prev_eval = player_eval
            prev_mat = mat_after

        # Add recommendations to the first analyzed moment
        if analyzed_moments and all_recommendations:
            analyzed_moments[0]['recommendations'] = all_recommendations

        print(f"Batch analysis complete. Processed {len(analyzed_moments)} moments.")

        # Log efficiency stats
        total_llm_calls = sum(1 for m in analyzed_moments if m.get('llm_used', False))
        print(f"LLM efficiency: {total_llm_calls}/{len(analyzed_moments)*2} positions analyzed with OpenAI ({total_llm_calls/(len(analyzed_moments)*2)*100:.1f}%)")

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
                                  (2 if moment.get('accuracy_class') == 'Mistake' else 1),
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
