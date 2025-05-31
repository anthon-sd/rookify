from flask import Flask, request, jsonify
from stockfish import Stockfish
import os

app = Flask(__name__)

# Initialize Stockfish - using the Linux installation
stockfish = Stockfish(path="/usr/local/bin/stockfish")

@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "service": "ai-engine"})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data or "fen" not in data:
        return jsonify({"error": "No FEN position provided"}), 400
    
    try:
        stockfish.set_fen_position(data["fen"])
        best_move = stockfish.get_best_move()
        return jsonify({"best_move": best_move})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000) 