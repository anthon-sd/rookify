import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_openai_analysis():
    """Test the OpenAI analysis functionality."""
    print("\n=== Testing OpenAI Analysis ===")
    
    # Test position (a common Sicilian Defense position)
    test_position = {
        "fen": "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        "depth": 20,
        "user_level": "intermediate",
        "user_rating": 1500  # Example rating for an intermediate player
    }
    
    try:
        # Make request to the analyze endpoint
        response = requests.post(
            "http://localhost:5000/analyze",
            json=test_position
        )
        
        # Check if request was successful
        if response.status_code == 200:
            result = response.json()
            print("\nAnalysis Results:")
            print("----------------")
            print(f"Best Move: {result.get('best_move')}")
            print(f"Evaluation: {result.get('evaluation')}")
            print("\nAI Analysis:")
            print(result.get('analysis'))
        else:
            print(f"Error: Request failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Error during test: {str(e)}")

if __name__ == "__main__":
    test_openai_analysis() 