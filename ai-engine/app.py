import os
import logging
import asyncio
from typing import Optional, List, Dict
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
import json
import chess
import chess.engine
import re

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import BaseModel, Field, ValidationError
from openai import OpenAI
from stockfish import Stockfish

# Load environment variables
load_dotenv()

class Config:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    STOCKFISH_PATH: str = os.getenv("STOCKFISH_PATH", "/usr/local/bin/stockfish")
    STOCKFISH_THREADS: int = int(os.getenv("STOCKFISH_THREADS", 2))
    STOCKFISH_HASH: int = int(os.getenv("STOCKFISH_HASH", 128))
    STOCKFISH_MIN_TIME: int = int(os.getenv("STOCKFISH_MIN_TIME", 100))
    STOCKFISH_POOL_SIZE: int = int(os.getenv("STOCKFISH_POOL_SIZE", 4))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

class AnalyzeRequest(BaseModel):
    fen: Optional[str] = None
    pgn: Optional[str] = None
    depth: int = Field(default=20, ge=1, le=100)
    user_level: str = Field(default="intermediate")
    user_rating: Optional[int] = None
    skip_llm: bool = Field(default=False)
    move_context: Optional[Dict] = None

    class Config:
        extra = "forbid"

class PositionRequest(BaseModel):
    fen: str
    depth: Optional[int] = None
    move_context: Optional[Dict] = None
    position_id: Optional[str] = None
    user_level: str = Field(default="intermediate")
    user_rating: Optional[int] = None

class BatchAnalyzeRequest(BaseModel):
    positions: List[PositionRequest] = Field(..., max_items=100)
    default_depth: int = Field(default=20, ge=1, le=100)
    user_level: str = Field(default="intermediate")
    user_rating: Optional[int] = None
    selective_llm: bool = Field(default=True)
    
    class Config:
        extra = "forbid"

class StockfishPool:
    """Pool of Stockfish instances for parallel processing"""
    
    def __init__(self, size=4, **stockfish_params):
        self.size = size
        self.params = stockfish_params
        self.pool = Queue(maxsize=size)
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Create Stockfish instances"""
        for _ in range(self.size):
            try:
                engine = Stockfish(**self.params)
                self.pool.put(engine)
            except Exception as e:
                logging.error(f"Failed to create Stockfish instance: {e}")
    
    def acquire(self):
        """Get a Stockfish instance from pool"""
        return self.pool.get()
    
    def release(self, engine):
        """Return Stockfish instance to pool"""
        self.pool.put(engine)

def should_get_llm_analysis(move_context: Dict, user_rating: int = 1500) -> bool:
    """Determine if a position warrants LLM analysis based on selective criteria"""
    if not move_context:
        return False
    
    # Always analyze these move types
    critical_moves = ['Brilliant', 'Great', 'Mistake', 'Blunder', 'Miss', 'Inaccuracy']
    accuracy_class = move_context.get('accuracy_class', '')
    if accuracy_class in critical_moves:
        return True
    
    # Get user-specific thresholds
    thresholds = get_analysis_threshold(user_rating)
    
    # Check if move qualifies based on user level
    if accuracy_class not in thresholds['focus_on']:
        return False
    
    # Analyze mistakes with frequency limits
    if accuracy_class == 'Mistake':
        mistakes_analyzed = move_context.get('mistakes_analyzed_in_game', 0)
        return mistakes_analyzed < thresholds['max_mistakes_per_game']
    
    # Critical evaluation swings
    delta_cp = move_context.get('delta_cp', 0)
    if delta_cp > thresholds['delta_cp_threshold']:
        return True
    
    # Phase transitions
    if move_context.get('phase_transition'):
        return True
    
    # Tactical moments
    if move_context.get('is_tactical'):
        return True
    
    # Endgame positions with few pieces
    if (move_context.get('phase') == 'endgame' and 
        move_context.get('piece_count', 32) < 8):
        return True
    
    # Mate-in-X positions
    if move_context.get('is_mate'):
        return True
    
    return False

def get_analysis_threshold(user_rating: int) -> Dict:
    """Get analysis thresholds based on user rating"""
    if user_rating < 1200:  # Beginner
        return {
            'delta_cp_threshold': 100,
            'max_mistakes_per_game': 3,
            'max_analyses_per_game': 5,
            'focus_on': ['Blunder', 'Miss', 'Brilliant']
        }
    elif user_rating < 1800:  # Intermediate
        return {
            'delta_cp_threshold': 50,
            'max_mistakes_per_game': 5,
            'max_analyses_per_game': 8,
            'focus_on': ['Blunder', 'Miss', 'Mistake', 'Brilliant', 'Great']
        }
    else:  # Advanced
        return {
            'delta_cp_threshold': 30,
            'max_mistakes_per_game': 7,
            'max_analyses_per_game': 10,
            'focus_on': ['Blunder', 'Miss', 'Mistake', 'Inaccuracy', 'Brilliant', 'Great']
        }

def extract_comprehensive_analysis(engine: Stockfish, fen: str, move_context: Optional[Dict] = None) -> Dict:
    """Extract comprehensive analysis data from Stockfish for enhanced vector schema"""
    
    analysis = {}
    
    try:
        # Create chess board for additional analysis
        board = chess.Board(fen)
        
        # Position complexity metrics
        analysis['material_balance'] = calculate_material_balance(board)
        analysis['piece_activity'] = calculate_piece_activity(board)
        analysis['king_safety'] = calculate_king_safety(board, engine)
        analysis['pawn_structure'] = calculate_pawn_structure(board)
        analysis['center_control'] = calculate_center_control(board)
        analysis['position_complexity'] = calculate_position_complexity(board, engine)
        analysis['tactical_complexity'] = calculate_tactical_complexity(board)
        analysis['threats_count'] = count_threats(board)
        analysis['hanging_pieces'] = find_hanging_pieces(board)
        
        # Enhanced evaluation data
        evaluation = engine.get_evaluation()
        analysis['winning_probability'] = eval_to_win_probability(evaluation)
        analysis['drawing_probability'] = eval_to_draw_probability(evaluation)
        analysis['sharpness_score'] = calculate_sharpness(board, engine)
        analysis['eval_volatility'] = calculate_eval_volatility(board, engine)
        
        # Get multi-PV lines for best continuation
        analysis['best_continuation'] = get_best_continuation(engine)
        
        # Tactical pattern detection
        analysis['tactical_motifs'] = detect_tactical_motifs(board)
        analysis['positional_themes'] = detect_positional_themes(board)
        analysis['threat_patterns'] = detect_threat_patterns(board)
        analysis['defensive_resources'] = detect_defensive_resources(board)
        
        # Historical context
        analysis['novelty_score'] = calculate_novelty_score(board)
        analysis['position_frequency'] = estimate_position_frequency(fen)
        
    except Exception as e:
        logging.error(f"Error in comprehensive analysis: {e}")
        # Return defaults if analysis fails
        analysis = {
            'material_balance': 0.0,
            'piece_activity': 0.5,
            'king_safety': 0.5,
            'pawn_structure': 0.5,
            'center_control': 0.5,
            'position_complexity': 0.5,
            'tactical_complexity': 0.5,
            'threats_count': 0,
            'hanging_pieces': [],
            'winning_probability': 0.5,
            'drawing_probability': 0.0,
            'sharpness_score': 0.0,
            'eval_volatility': 0.0,
            'best_continuation': [],
            'tactical_motifs': [],
            'positional_themes': [],
            'threat_patterns': [],
            'defensive_resources': [],
            'novelty_score': 0.0,
            'position_frequency': 0.0
        }
    
    return analysis

def calculate_material_balance(board: chess.Board) -> float:
    """Calculate material balance (positive favors white)"""
    piece_values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
    
    white_material = sum(len(board.pieces(piece_type, chess.WHITE)) * value 
                        for piece_type, value in piece_values.items())
    black_material = sum(len(board.pieces(piece_type, chess.BLACK)) * value 
                        for piece_type, value in piece_values.items())
    
    return white_material - black_material

def calculate_piece_activity(board: chess.Board) -> float:
    """Calculate piece activity score (0-1)"""
    mobility = len(list(board.legal_moves))
    # Normalize by typical move count
    return min(1.0, mobility / 40.0)

def calculate_king_safety(board: chess.Board, engine: Stockfish) -> float:
    """Calculate king safety score (0-1)"""
    # Simple heuristic based on king position and surrounding pawns
    king_square = board.king(board.turn)
    if king_square is None:
        return 0.0
    
    # Check if king is castled (rough approximation)
    king_file = chess.square_file(king_square)
    castled = king_file < 3 or king_file > 5  # Likely castled if on a/b/c or f/g/h files
    
    # Count pawn shield
    pawn_shield = 0
    king_rank = chess.square_rank(king_square)
    for file_offset in [-1, 0, 1]:
        shield_file = king_file + file_offset
        if 0 <= shield_file <= 7:
            shield_square = chess.square(shield_file, king_rank + (1 if board.turn else -1))
            if board.piece_at(shield_square) and board.piece_at(shield_square).piece_type == chess.PAWN:
                pawn_shield += 1
    
    safety_score = (0.3 if castled else 0.0) + (pawn_shield * 0.2)
    return min(1.0, safety_score)

def calculate_pawn_structure(board: chess.Board) -> float:
    """Calculate pawn structure quality (0-1)"""
    # Count doubled, isolated, and passed pawns
    white_pawns = board.pieces(chess.PAWN, chess.WHITE)
    black_pawns = board.pieces(chess.PAWN, chess.BLACK)
    
    score = 0.5  # Base score
    
    # Penalize doubled pawns
    for file in range(8):
        white_count = len([sq for sq in white_pawns if chess.square_file(sq) == file])
        black_count = len([sq for sq in black_pawns if chess.square_file(sq) == file])
        if white_count > 1:
            score -= 0.05 * (white_count - 1)
        if black_count > 1:
            score -= 0.05 * (black_count - 1)
    
    return max(0.0, min(1.0, score))

def calculate_center_control(board: chess.Board) -> float:
    """Calculate center control score (0-1)"""
    center_squares = [chess.E4, chess.E5, chess.D4, chess.D5]
    controlled = sum(1 for sq in center_squares if board.is_attacked_by(board.turn, sq))
    return controlled / 4.0

def calculate_position_complexity(board: chess.Board, engine: Stockfish) -> float:
    """Calculate overall position complexity (0-1)"""
    total_pieces = len(board.piece_map())
    legal_moves = len(list(board.legal_moves))
    
    # Normalize complexity
    piece_factor = min(1.0, total_pieces / 32.0)
    move_factor = min(1.0, legal_moves / 40.0)
    
    return (piece_factor + move_factor) / 2.0

def calculate_tactical_complexity(board: chess.Board) -> float:
    """Calculate tactical complexity (0-1)"""
    # Count checks, captures, and threats
    legal_moves = list(board.legal_moves)
    tactical_moves = 0
    
    for move in legal_moves:
        if board.is_capture(move):
            tactical_moves += 1
        
        # Check if move gives check
        board.push(move)
        if board.is_check():
            tactical_moves += 1
        board.pop()
    
    return min(1.0, tactical_moves / len(legal_moves) if legal_moves else 0.0)

def count_threats(board: chess.Board) -> int:
    """Count number of threats in position"""
    threats = 0
    
    # Count hanging pieces
    for square in board.piece_map():
        piece = board.piece_at(square)
        if piece and piece.color != board.turn:
            if board.is_attacked_by(board.turn, square):
                threats += 1
    
    return threats

def find_hanging_pieces(board: chess.Board) -> List[str]:
    """Find hanging pieces"""
    hanging = []
    
    for square in board.piece_map():
        piece = board.piece_at(square)
        if piece and piece.color != board.turn:
            if board.is_attacked_by(board.turn, square) and not board.is_attacked_by(piece.color, square):
                hanging.append(chess.square_name(square))
    
    return hanging

def eval_to_win_probability(evaluation: Dict) -> float:
    """Convert centipawn evaluation to win probability"""
    if evaluation.get('type') == 'mate':
        return 1.0 if evaluation.get('value', 0) > 0 else 0.0
    
    cp = evaluation.get('value', 0)
    # Sigmoid function to convert centipawns to probability
    return 1 / (1 + 10**(-cp/400))

def eval_to_draw_probability(evaluation: Dict) -> float:
    """Estimate draw probability based on evaluation"""
    if evaluation.get('type') == 'mate':
        return 0.0
    
    cp = abs(evaluation.get('value', 0))
    # Higher draw probability for positions close to 0.00
    return max(0.0, 0.4 - (cp / 200))

def calculate_sharpness(board: chess.Board, engine: Stockfish) -> float:
    """Calculate position sharpness (0-1)"""
    # Positions with many captures, checks, and tactical motifs are sharp
    legal_moves = list(board.legal_moves)
    sharp_moves = sum(1 for move in legal_moves if board.is_capture(move))
    
    return min(1.0, sharp_moves / max(1, len(legal_moves)))

def calculate_eval_volatility(board: chess.Board, engine: Stockfish) -> float:
    """Calculate evaluation volatility (simplified)"""
    # For now, return based on position complexity
    return calculate_tactical_complexity(board)

def get_best_continuation(engine: Stockfish) -> List[str]:
    """Get best continuation moves"""
    try:
        best_move = engine.get_best_move()
        if best_move:
            return [best_move]
    except:
        pass
    return []

def detect_tactical_motifs(board: chess.Board) -> List[str]:
    """Detect tactical patterns in position"""
    motifs = []
    
    # Simple pattern detection
    legal_moves = list(board.legal_moves)
    
    # Look for forks, pins, skewers, etc.
    for move in legal_moves:
        board.push(move)
        
        # Check for fork (attacking multiple pieces)
        attacked_pieces = []
        for square in board.piece_map():
            piece = board.piece_at(square)
            if piece and piece.color != board.turn and board.is_attacked_by(board.turn, square):
                attacked_pieces.append(square)
        
        if len(attacked_pieces) > 1:
            motifs.append('fork')
        
        board.pop()
        
        # Only check first few moves to avoid timeout
        if len(motifs) > 0:
            break
    
    return list(set(motifs))

def detect_positional_themes(board: chess.Board) -> List[str]:
    """Detect positional themes"""
    themes = []
    
    # Detect weak squares, outposts, etc.
    if len(board.pieces(chess.KNIGHT, chess.WHITE)) > 0:
        themes.append('knight_activity')
    
    if len(board.pieces(chess.BISHOP, chess.WHITE)) > len(board.pieces(chess.BISHOP, chess.BLACK)):
        themes.append('bishop_pair')
    
    return themes

def detect_threat_patterns(board: chess.Board) -> List[str]:
    """Detect threat patterns"""
    threats = []
    
    if board.is_check():
        threats.append('check')
    
    # Look for back rank weakness
    king_square = board.king(not board.turn)
    if king_square and chess.square_rank(king_square) in [0, 7]:
        threats.append('back_rank')
    
    return threats

def detect_defensive_resources(board: chess.Board) -> List[str]:
    """Detect defensive resources"""
    resources = []
    
    # Count escape squares for king
    king_square = board.king(board.turn)
    if king_square:
        escape_squares = 0
        for direction in [-9, -8, -7, -1, 1, 7, 8, 9]:
            target = king_square + direction
            if 0 <= target < 64 and not board.is_attacked_by(not board.turn, target):
                escape_squares += 1
        
        if escape_squares > 2:
            resources.append('king_mobility')
    
    return resources

def calculate_novelty_score(board: chess.Board) -> float:
    """Calculate position novelty (simplified)"""
    # For now, return based on piece count (fewer pieces = more novel endgame)
    total_pieces = len(board.piece_map())
    return max(0.0, 1.0 - (total_pieces / 32.0))

def estimate_position_frequency(fen: str) -> float:
    """Estimate how common this position is (simplified)"""
    # Very basic heuristic - could be enhanced with actual database lookups
    piece_count = fen.count('r') + fen.count('n') + fen.count('b') + fen.count('q') + \
                 fen.count('R') + fen.count('N') + fen.count('B') + fen.count('Q')
    
    # More pieces = more common (opening/middlegame)
    return min(1.0, piece_count / 20.0)

def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    # Configure logging
    logging.basicConfig(level=app.config['LOG_LEVEL'])
    logger = logging.getLogger(__name__)

    # Initialize clients
    openai_client = OpenAI(api_key=app.config['OPENAI_API_KEY'])
    
    # Initialize Stockfish pool
    stockfish_pool = StockfishPool(
        size=app.config['STOCKFISH_POOL_SIZE'],
        path=app.config['STOCKFISH_PATH'],
        parameters={
            "Threads": app.config['STOCKFISH_THREADS'],
            "Hash": app.config['STOCKFISH_HASH'],
            "Minimum Thinking Time": app.config['STOCKFISH_MIN_TIME'],
        }
    )

    def analyze_single_position(position_req: PositionRequest, pool: StockfishPool) -> Dict:
        """Analyze a single position using Stockfish pool with comprehensive data extraction"""
        engine = pool.acquire()
        try:
            # Set position
            engine.set_fen_position(position_req.fen)
            depth = position_req.depth or 20
            engine.set_depth(depth)
            
            # Get comprehensive Stockfish analysis
            evaluation = engine.get_evaluation()
            best_move = engine.get_best_move()
            
            # Extract enhanced Stockfish data
            enhanced_data = extract_comprehensive_analysis(engine, position_req.fen, position_req.move_context)
            
            result = {
                'position_id': position_req.position_id,
                'evaluation': evaluation,
                'best_move': best_move,
                'fen': position_req.fen,
                'depth': depth,
                'enhanced_analysis': enhanced_data
            }
            
            # Add LLM analysis if criteria met
            if not position_req.move_context or not position_req.move_context.get('skip_llm', False):
                if should_get_llm_analysis(position_req.move_context or {}, position_req.user_rating or 1500):
                    try:
                        analysis = get_llm_analysis(
                            evaluation, best_move,
                            position_req.user_level,
                            position_req.user_rating
                        )
                        result['analysis'] = analysis
                        result['llm_used'] = True
                    except Exception as e:
                        logger.warning(f"LLM analysis failed: {e}")
                        result['llm_used'] = False
                else:
                    result['llm_used'] = False
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing position {position_req.position_id}: {e}")
            return {
                'position_id': position_req.position_id,
                'error': str(e),
                'status': 'failed'
            }
        finally:
            pool.release(engine)

    def get_llm_analysis(evaluation: dict, best_move: str,
                         user_level: str = "intermediate",
                         user_rating: Optional[int] = None) -> str:
        """Generate personalized chess analysis via OpenAI."""
        score = evaluation.get("value", 0)
        is_mate = evaluation.get("type") == "mate"

        if is_mate:
            side = 'White' if score > 0 else 'Black'
            context = f"{side} has a forced mate in {abs(score)} moves."
        else:
            pawns = score / 100
            if abs(pawns) < 0.5:
                context = "The position is roughly equal."
            elif abs(pawns) < 1.5:
                side = 'White' if score > 0 else 'Black'
                context = f"{side} has a slight advantage."
            else:
                side = 'White' if score > 0 else 'Black'
                context = f"{side} has a significant advantage."

        # Rating context for tailoring
        rating_ctx = ""
        if user_rating:
            level = ("Beginner" if user_rating < 1200 else
                     "Intermediate" if user_rating < 1800 else
                     "Advanced" if user_rating < 2200 else "Expert")
            rating_ctx = f" (Rated {user_rating} - {level})"

        prompt = (
            f"You are a chess coach analyzing a position for a {user_level} level player{rating_ctx}."
            f"\n\nPosition context: {context}"
            f"\nBest move: {best_move}"
            "\n\nPlease provide a brief, clear analysis of the position that is appropriate for a {user_level} level player{rating_ctx}."
            "\nFocus on:"
            "\n1. The key ideas in the position"
            "\n2. Why the best move is strong"
            "\n3. What the player should be thinking about"
            "\n4. Specific tactical or strategic concepts that would be most relevant for this rating level"
            "\n\nKeep the analysis concise and educational, tailored to the player's rating level."
        )

        try:
            resp = openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are an empathetic chess coach."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=250
            )
            return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error("OpenAI request failed", exc_info=exc)
            return f"{context} The best move is {best_move}."

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify(status='healthy', service='ai-engine')

    @app.route('/analyze', methods=['POST'])
    def analyze():
        try:
            payload = request.get_json(force=True)
            req = AnalyzeRequest(**payload)
        except ValidationError as ve:
            return jsonify(error=ve.errors()), 400
        except Exception:
            return jsonify(error='Invalid JSON payload'), 400

        try:
            # Convert to position request for unified processing
            pos_req = PositionRequest(
                fen=req.fen,
                depth=req.depth,
                move_context=req.move_context,
                position_id="single",
                user_level=req.user_level,
                user_rating=req.user_rating
            )
            
            if req.skip_llm and pos_req.move_context:
                pos_req.move_context['skip_llm'] = True
            
            result = analyze_single_position(pos_req, stockfish_pool)
            
            # Return in original format for compatibility
            return jsonify(
                evaluation=result.get('evaluation'),
                best_move=result.get('best_move'),
                analysis=result.get('analysis', ''),
                llm_used=result.get('llm_used', False)
            ), 200
            
        except Exception as exc:
            logger.exception("Error during analysis")
            return jsonify(error='Internal server error'), 500

    @app.route('/analyze-batch', methods=['POST'])
    def analyze_batch():
        """Analyze multiple positions in parallel"""
        try:
            payload = request.get_json(force=True)
            req = BatchAnalyzeRequest(**payload)
            
            # Update default values for positions that don't have them
            for position in req.positions:
                if position.depth is None:
                    position.depth = req.default_depth
                if not hasattr(position, 'user_level') or not position.user_level:
                    position.user_level = req.user_level
                if not hasattr(position, 'user_rating') or not position.user_rating:
                    position.user_rating = req.user_rating
                
                # Add selective LLM flag
                if req.selective_llm and position.move_context:
                    position.move_context['selective_llm'] = True
            
            # Process positions in parallel
            max_workers = min(len(req.positions), stockfish_pool.size)
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = []
                
                for position in req.positions:
                    future = executor.submit(analyze_single_position, position, stockfish_pool)
                    futures.append(future)
                
                # Collect results with timeout
                results = []
                for future in futures:
                    try:
                        result = future.result(timeout=60)  # 60 second timeout per position
                        results.append(result)
                    except Exception as e:
                        results.append({
                            'error': str(e),
                            'status': 'failed'
                        })
            
            successful = len([r for r in results if 'error' not in r])
            llm_calls = len([r for r in results if r.get('llm_used', False)])
            
            return jsonify({
                'results': results,
                'total': len(results),
                'successful': successful,
                'failed': len(results) - successful,
                'llm_calls_made': llm_calls,
                'llm_calls_saved': len(results) - llm_calls
            }), 200
            
        except ValidationError as ve:
            return jsonify(error=ve.errors()), 400
        except Exception as e:
            logger.exception("Error during batch analysis")
            return jsonify(error=f'Batch analysis failed: {str(e)}'), 500

    return app


if __name__ == '__main__':  # pragma: no cover
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 