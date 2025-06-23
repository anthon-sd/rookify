import os
import logging
import asyncio
from typing import Optional, List, Dict
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
import json

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
        """Analyze a single position using Stockfish pool"""
        engine = pool.acquire()
        try:
            # Set position
            engine.set_fen_position(position_req.fen)
            depth = position_req.depth or 20
            engine.set_depth(depth)
            
            # Get evaluation and best move
            evaluation = engine.get_evaluation()
            best_move = engine.get_best_move()
            
            result = {
                'position_id': position_req.position_id,
                'evaluation': evaluation,
                'best_move': best_move,
                'fen': position_req.fen,
                'depth': depth
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