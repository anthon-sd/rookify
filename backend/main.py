from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chess_analysis import ChessAnalyzer
import os

app = FastAPI(title="Chess Coach Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize chess analyzer
try:
    chess_analyzer = ChessAnalyzer()
except RuntimeError as e:
    print(f"Warning: Failed to initialize Stockfish: {e}")
    chess_analyzer = None

class AnalysisRequest(BaseModel):
    fen: str = None
    pgn: str = None
    depth: int = 20

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "backend"}

@app.post("/analyze")
async def analyze_position(request: AnalysisRequest):
    if chess_analyzer is None:
        raise HTTPException(status_code=503, detail="Chess analysis service is not available")
    
    if request.fen:
        return chess_analyzer.analyze_fen(request.fen, request.depth)
    elif request.pgn:
        return chess_analyzer.analyze_pgn(request.pgn, request.depth)
    else:
        raise HTTPException(status_code=400, detail="Either FEN or PGN must be provided")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 