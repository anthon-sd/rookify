# Chess AI Engine

This is a Flask-based chess analysis engine that uses Stockfish to analyze chess positions.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
.\venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Stockfish:
- Download Stockfish from https://stockfishchess.org/download/
- Place the Stockfish executable in the ai-engine directory
- Update the path in app.py if needed

## Running the Server

```bash
python app.py
```

The server will start on port 5001.

## API Usage

Send a POST request to `/analyze` with a JSON body containing a FEN position:

```json
{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

The response will contain the best move in the format:

```json
{
    "best_move": "e2e4"
}
``` 