from flask import Flask, request, jsonify
from stockfish import Stockfish
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Initialize Stockfish - using the Linux installation
stockfish = Stockfish(
    path="/usr/local/bin/stockfish",
    parameters={
        "Threads": 2,
        "Minimum Thinking Time": 30
    }
)

def get_llm_analysis(evaluation: dict, best_move: str, user_level: str = "intermediate", user_rating: int = None) -> str:
    """
    Get personalized chess analysis using OpenAI's GPT model.
    
    Args:
        evaluation: Stockfish evaluation dictionary
        best_move: Best move in algebraic notation
        user_level: User's chess level (beginner, intermediate, advanced)
        user_rating: User's chess rating (e.g., FIDE, USCF, or Chess.com rating)
        
    Returns:
        Personalized analysis feedback
    """
    score = evaluation.get("value", 0)
    mate = evaluation.get("type") == "mate"
    
    # Construct the prompt based on the position evaluation
    if mate:
        position_context = f"{'White' if score > 0 else 'Black'} has a forced mate in {abs(score)} moves."
    else:
        score_in_pawns = score / 100
        if abs(score_in_pawns) < 0.5:
            position_context = "The position is roughly equal."
        elif abs(score_in_pawns) < 1.5:
            position_context = f"{'White' if score > 0 else 'Black'} has a slight advantage."
        else:
            position_context = f"{'White' if score > 0 else 'Black'} has a significant advantage."

    # Add rating context to the prompt
    rating_context = ""
    if user_rating:
        if user_rating < 1200:
            rating_context = f" (Rated {user_rating} - Beginner)"
        elif user_rating < 1800:
            rating_context = f" (Rated {user_rating} - Intermediate)"
        elif user_rating < 2200:
            rating_context = f" (Rated {user_rating} - Advanced)"
        else:
            rating_context = f" (Rated {user_rating} - Expert)"

    prompt = f"""You are a chess coach analyzing a position for a {user_level} level player{rating_context}.
    
Position context: {position_context}
Best move: {best_move}

Please provide a brief, clear analysis of the position that is appropriate for a {user_level} level player{rating_context}.
Focus on:
1. The key ideas in the position
2. Why the best move is strong
3. What the player should be thinking about
4. Specific tactical or strategic concepts that would be most relevant for this rating level

Keep the analysis concise and educational, tailored to the player's rating level."""

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # or "gpt-3.5-turbo" for a more cost-effective option
            messages=[
                {"role": "system", "content": "You are a helpful chess coach who provides clear, educational analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=250
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Fallback to a basic analysis if OpenAI call fails
        return f"{position_context} The best move is {best_move}."

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
    user_rating = data.get("user_rating")
    
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
        
        # Get personalized analysis using OpenAI
        analysis = get_llm_analysis(evaluation, best_move, user_level, user_rating)
        
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