from flask import Flask, request, jsonify
from stockfish import Stockfish
import os

app = Flask(__name__)

# Initialize Stockfish - using the Linux installation
stockfish = Stockfish(
    path="/usr/local/bin/stockfish",
    parameters={
        "Threads": 2,
        "Minimum Thinking Time": 30
    }
)

def get_llm_analysis(evaluation: dict, best_move: str, user_level: str = "intermediate") -> str:
    """
    Stub for LLM-based analysis. This will be replaced with actual LLM integration later.
    
    Args:
        evaluation: Stockfish evaluation dictionary
        best_move: Best move in algebraic notation
        user_level: User's chess level (beginner, intermediate, advanced)
        
    Returns:
        Personalized analysis feedback
    """
    # This is a simple stub that will be replaced with actual LLM analysis
    score = evaluation.get("value", 0)
    mate = evaluation.get("type") == "mate"
    
    if mate:
        if score > 0:
            return f"White has a forced mate in {abs(score)} moves. The best move is {best_move}."
        else:
            return f"Black has a forced mate in {abs(score)} moves. The best move is {best_move}."
    
    # Convert centipawns to a more readable format
    score_in_pawns = score / 100
    
    if abs(score_in_pawns) < 0.5:
        return f"The position is roughly equal. {best_move} is a solid move."
    elif abs(score_in_pawns) < 1.5:
        return f"{'White' if score > 0 else 'Black'} has a slight advantage. {best_move} is the best move."
    else:
        return f"{'White' if score > 0 else 'Black'} has a significant advantage. {best_move} is the strongest move."

@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "service": "ai-engine"})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    depth = data.get("depth", 20)
    user_level = data.get("user_level", "intermediate")
    
    try:
        if "fen" in data:
            stockfish.set_fen_position(data["fen"])
        elif "pgn" in data:
            stockfish.set_position_from_pgn(data["pgn"])
        else:
            return jsonify({"error": "Either FEN or PGN must be provided"}), 400
        
        stockfish.set_depth(depth)
        evaluation = stockfish.get_evaluation()
        best_move = stockfish.get_best_move()
        
        # Get personalized analysis
        analysis = get_llm_analysis(evaluation, best_move, user_level)
        
        return jsonify({
            "evaluation": evaluation,
            "best_move": best_move,
            "analysis": analysis,
            "fen": data.get("fen"),
            "pgn": data.get("pgn")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000) 