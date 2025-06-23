import os
import logging
from typing import Optional

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
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

class AnalyzeRequest(BaseModel):
    fen: Optional[str] = None
    pgn: Optional[str] = None
    depth: int = Field(default=20, ge=1, le=100)
    user_level: str = Field(default="intermediate")
    user_rating: Optional[int] = None

    class Config:
        extra = "forbid"


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    # Configure logging
    logging.basicConfig(level=app.config['LOG_LEVEL'])
    logger = logging.getLogger(__name__)

    # Initialize clients
    openai_client = OpenAI(api_key=app.config['OPENAI_API_KEY'])
    stockfish = Stockfish(
        path=app.config['STOCKFISH_PATH'],
        parameters={
            "Threads": app.config['STOCKFISH_THREADS'],
            "Hash": app.config['STOCKFISH_HASH'],
            "Minimum Thinking Time": app.config['STOCKFISH_MIN_TIME'],
        }
    )

    def get_llm_analysis(evaluation: dict, best_move: str,
                         user_level: str = "intermediate",
                         user_rating: Optional[int] = None) -> str:
        """
        Generate personalized chess analysis via OpenAI.
        """
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
            if req.fen:
                stockfish.set_fen_position(req.fen)
            else:
                stockfish.set_position_from_pgn(req.pgn)

            stockfish.set_depth(req.depth)
            evaluation = stockfish.get_evaluation()
            best_move = stockfish.get_best_move()
            analysis = get_llm_analysis(
                evaluation, best_move,
                req.user_level, req.user_rating
            )

            return jsonify(
                evaluation=evaluation,
                best_move=best_move,
                analysis=analysis
            ), 200
        except Exception as exc:
            logger.exception("Error during analysis")
            return jsonify(error='Internal server error'), 500

    return app


if __name__ == '__main__':  # pragma: no cover
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 