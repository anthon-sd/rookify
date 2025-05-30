import requests
import json

def test_analyze_endpoint():
    url = "http://127.0.0.1:5001/analyze"
    headers = {"Content-Type": "application/json"}
    
    # Test with starting position
    data = {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print("Status Code:", response.status_code)
        print("Response:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test_analyze_endpoint() 