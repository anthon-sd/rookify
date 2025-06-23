import requests
from typing import Dict, Optional
import os

class ChessAnalyzer:
    def __init__(self, ai_engine_url: str = "http://ai-engine:5000"):
        """
        Initialize the chess analyzer to communicate with the ai-engine service.
        
        Args:
            ai_engine_url: URL of the ai-engine service
        """
        self.ai_engine_url = ai_engine_url

    def analyze_fen(self, fen: str, depth: int = 20) -> Dict:
        """
        Analyze a position given in FEN notation.
        
        Args:
            fen: FEN string representing the chess position
            depth: Analysis depth (default: 20)
            
        Returns:
            Dictionary containing analysis results
        """
        response = requests.post(
            f"{self.ai_engine_url}/analyze",
            json={"fen": fen, "depth": depth},
            timeout=120  # Increased timeout for AI engine with OpenAI calls
        )
        response.raise_for_status()
        return response.json()

    def analyze_pgn(self, pgn: str, depth: int = 20) -> Dict:
        """
        Analyze a game given in PGN format.
        
        Args:
            pgn: PGN string representing the chess game
            depth: Analysis depth (default: 20)
            
        Returns:
            Dictionary containing analysis results
        """
        response = requests.post(
            f"{self.ai_engine_url}/analyze",
            json={"pgn": pgn, "depth": depth},
            timeout=120  # Increased timeout for AI engine with OpenAI calls
        )
        response.raise_for_status()
        return response.json() 