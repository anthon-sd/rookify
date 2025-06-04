from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from chess_analysis import ChessAnalyzer
from datetime import timedelta, datetime
import os
from models.auth import UserCreate, User, UserUpdate, Token
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from config.database import supabase, USERS_TABLE

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

# Authentication endpoints
@app.post("/register", response_model=User)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = supabase.table(USERS_TABLE).select("*").eq("email", user.email).execute()
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    now = datetime.utcnow().isoformat()
    rating_progress = [{"rating": user.rating, "timestamp": now}]
    user_data = {
        "email": user.email,
        "username": user.username,
        "hashed_password": hashed_password,
        "rating": user.rating,
        "playstyle": user.playstyle,
        "rating_progress": rating_progress
    }
    
    result = supabase.table(USERS_TABLE).insert(user_data).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user"
        )
    
    return result.data[0]

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Get user from database
    result = supabase.table(USERS_TABLE).select("*").eq("email", form_data.username).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = result.data[0]
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=User)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    update_data = user_update.dict(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    # Handle rating progress
    if "rating" in update_data:
        user_db = supabase.table(USERS_TABLE).select("rating_progress").eq("id", current_user.id).single().execute()
        rating_progress = user_db.data["rating_progress"] if user_db.data and user_db.data.get("rating_progress") else []
        rating_progress.append({"rating": update_data["rating"], "timestamp": datetime.utcnow().isoformat()})
        update_data["rating_progress"] = rating_progress

    # Remove fields that should not be updated
    update_data.pop("id", None)
    update_data.pop("created_at", None)
    update_data.pop("updated_at", None)

    result = supabase.table(USERS_TABLE).update(update_data).eq("id", current_user.id).execute()
    print("Supabase update result:", result)  # For debugging
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not update user. Supabase error: {getattr(result, 'error', None)}"
        )

    return result.data[0]

# Existing endpoints
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