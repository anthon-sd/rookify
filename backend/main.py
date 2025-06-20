from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from chess_analysis import ChessAnalyzer
from datetime import timedelta, datetime, timezone
import os
import uuid
from models.auth import UserCreate, User, UserUpdate, Token
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from config.database import supabase, USERS_TABLE
from chess_com import ChessComAPI, parse_pgn_game
from lichess_api import LichessAPI
from game_analyzer import GameAnalyzer
from pinecone_upload import upload_to_pinecone
from utils.rate_limiter import check_sync_rate_limit, get_rate_limiter_for_platform
from typing import Optional

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

# Initialize the game analyzer
game_analyzer = GameAnalyzer()

class AnalysisRequest(BaseModel):
    fen: str = None
    pgn: str = None
    depth: int = 20

class ChessComRequest(BaseModel):
    username: str
    days: Optional[int] = 30

class GameAnalysisRequest(BaseModel):
    pgn: str
    user_id: str
    depth: Optional[int] = 20

class SimilarPositionsRequest(BaseModel):
    fen: str
    user_id: Optional[str] = None
    skill_category: Optional[str] = None
    phase: Optional[str] = None
    top_k: int = 10

class RecommendationRequest(BaseModel):
    user_id: str
    game_analysis_id: str
    priority: int = 0

class SyncRequest(BaseModel):
    platform: str  # "chess.com" or "lichess"
    username: str
    months: int = 1  # How many months back to sync
    lichess_token: Optional[str] = None  # For Lichess private games

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

@app.post("/chess-com/connect")
async def connect_chess_com(request: ChessComRequest):
    """
    Connect to Chess.com and fetch user's recent games.
    """
    try:
        api = ChessComAPI(request.username)
        profile = api.get_user_profile()
        games = api.get_recent_games(request.days)
        
        return {
            "status": "success",
            "profile": profile,
            "games_count": len(games)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chess-com/analyze-games")
async def analyze_chess_com_games(request: ChessComRequest):
    """
    Analyze user's recent games from Chess.com.
    """
    try:
        # Get games from Chess.com
        api = ChessComAPI(request.username)
        games = api.get_recent_games(request.days)
        
        all_moments = []
        all_recommendations = []
        
        for pgn in games:
            # Parse game into moments
            moments = parse_pgn_game(pgn)
            
            # Update user_id for all moments
            for moment in moments:
                moment['user_id'] = request.username
            
            # Analyze moments
            analyzed_moments = game_analyzer.analyze_game_moments(moments)
            
            # Extract recommendations
            if analyzed_moments and 'recommendations' in analyzed_moments[0]:
                all_recommendations.extend(analyzed_moments[0]['recommendations'])
            
            all_moments.extend(analyzed_moments)
        
        # Upload to vector database
        upload_to_pinecone(all_moments)
        
        # Store recommendations in database
        if all_recommendations:
            from config.database import supabase
            result = supabase.table('recommendations').insert(all_recommendations).execute()
        
        return {
            "status": "success",
            "analyzed_moments": len(all_moments),
            "games_analyzed": len(games),
            "recommendations_generated": len(all_recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-game")
async def analyze_game(request: GameAnalysisRequest):
    """
    Analyze a single game and store key moments in the vector database.
    """
    try:
        # Parse game into moments
        moments = parse_pgn_game(request.pgn)
        
        # Update user_id for all moments
        for moment in moments:
            moment['user_id'] = request.user_id
        
        # Analyze moments
        analyzed_moments = game_analyzer.analyze_game_moments(moments, request.depth)
        
        # Upload to vector database
        upload_to_pinecone(analyzed_moments)
        
        return {
            "status": "success",
            "analyzed_moments": len(analyzed_moments)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similar-positions")
async def get_similar_positions(request: SimilarPositionsRequest):
    """
    Get similar positions from the vector database.
    """
    try:
        from pinecone_upload import query_vector_db
        
        # Create a text representation of the position for querying
        query_text = f"Position: {request.fen}"
        
        # Query the vector database
        similar_positions = query_vector_db(
            query_text=query_text,
            user_id=request.user_id,
            skill_category=request.skill_category,
            phase=request.phase,
            top_k=request.top_k
        )
        
        return {
            "status": "success",
            "similar_positions": similar_positions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommendations")
async def create_recommendation(request: RecommendationRequest):
    """
    Create a new recommendation for a user.
    """
    try:
        from pinecone_upload import query_vector_db
        
        # Get similar positions for this game
        similar_positions = query_vector_db(
            query_text=f"Position: {request.fen}",
            user_id=request.user_id,
            top_k=5
        )
        
        # Create recommendation based on similar positions
        recommendation = {
            "user_id": request.user_id,
            "game_analysis_id": request.game_analysis_id,
            "recommendation": "Practice this position to improve your understanding of similar positions.",
            "priority": request.priority,
            "status": "pending",
            "similar_positions": similar_positions
        }
        
        # Store in database
        from config.database import supabase
        result = supabase.table('recommendations').insert(recommendation).execute()
        
        return {
            "status": "success",
            "recommendation": result.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommendations/{user_id}")
async def get_user_recommendations(user_id: str):
    """
    Get all recommendations for a user.
    """
    try:
        from config.database import supabase
        
        result = supabase.table('recommendations')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('priority', desc=True)\
            .execute()
        
        return {
            "status": "success",
            "recommendations": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/recommendations/{recommendation_id}")
async def update_recommendation_status(recommendation_id: str, status: str):
    """
    Update the status of a recommendation.
    """
    try:
        from config.database import supabase
        
        result = supabase.table('recommendations')\
            .update({'status': status})\
            .eq('id', recommendation_id)\
            .execute()
        
        return {
            "status": "success",
            "recommendation": result.data[0]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Game Sync Endpoints
@app.post("/sync-games/{user_id}")
async def sync_platform_games(
    user_id: str,
    request: SyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Sync games from chess platform for analysis.
    Returns immediately and processes in background.
    """
    # Verify user owns this account
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Check rate limit for sync jobs
    if not await check_sync_rate_limit(user_id):
        raise HTTPException(
            status_code=429, 
            detail="Too many sync requests. Please wait before starting another sync."
        )
    
    # Validate platform
    if request.platform not in ["chess.com", "lichess"]:
        raise HTTPException(status_code=400, detail="Platform must be 'chess.com' or 'lichess'")
    
    # Create sync job record
    sync_job = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'platform': request.platform,
        'username': request.username,
        'months_requested': request.months,
        'status': 'pending',
        'games_found': 0,
        'games_analyzed': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    try:
        # Store sync job in database
        result = supabase.table('sync_jobs').insert(sync_job).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create sync job")
        
        # Queue background task
        background_tasks.add_task(
            process_sync_job,
            sync_job['id'],
            user_id,
            request
        )
        
        return {
            'sync_job_id': sync_job['id'],
            'status': 'started',
            'message': f'Syncing games from {request.platform}...'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start sync: {str(e)}")

async def process_sync_job(sync_job_id: str, user_id: str, request: SyncRequest):
    """Background task to sync and analyze games."""
    try:
        # Update status to fetching
        supabase.table('sync_jobs').update({
            'status': 'fetching',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', sync_job_id).execute()
        
        # Fetch games based on platform
        games = []
        if request.platform == "chess.com":
            api = ChessComAPI(request.username)
            # Get games from the last N months
            games = api.get_player_games_by_month_range(
                request.username,
                months_back=request.months
            )
        elif request.platform == "lichess":
            api = LichessAPI(token=request.lichess_token)
            since = datetime.now(timezone.utc) - timedelta(days=30 * request.months)
            games = api.get_user_games(
                request.username,
                since=since,
                max_games=100
            )
        else:
            raise ValueError(f"Unsupported platform: {request.platform}")
        
        # Update games found
        supabase.table('sync_jobs').update({
            'games_found': len(games),
            'status': 'analyzing'
        }).eq('id', sync_job_id).execute()
        
        # Analyze games in batches
        analyzer = GameAnalyzer()
        analyzed_count = 0
        
        for i, game in enumerate(games):
            try:
                # Check if game already analyzed
                existing = supabase.table('game_analysis').select('id').eq(
                    'user_id', user_id
                ).eq('game_url', game['url']).execute()
                
                if existing.data:
                    continue
                
                # Parse and analyze game
                if request.platform == "chess.com":
                    moments = parse_pgn_game(game['pgn'])
                else:  # lichess
                    # For Lichess, we need to parse the PGN differently
                    moments = parse_pgn_game(game['pgn'])
                
                # Update user_id for all moments
                for moment in moments:
                    moment['user_id'] = user_id
                
                analyzed_moments = analyzer.analyze_game_moments(moments)
                
                # Store analysis
                game_analysis = {
                    'user_id': user_id,
                    'game_url': game['url'],
                    'platform': request.platform,
                    'pgn': game['pgn'],
                    'key_moments': analyzed_moments,
                    'sync_job_id': sync_job_id,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                
                supabase.table('game_analysis').insert(game_analysis).execute()
                analyzed_count += 1
                
                # Update progress
                supabase.table('sync_jobs').update({
                    'games_analyzed': analyzed_count
                }).eq('id', sync_job_id).execute()
                
                # Upload to vector database
                upload_to_pinecone(analyzed_moments)
                
            except Exception as game_error:
                print(f"Error analyzing game {i+1}: {game_error}")
                continue
        
        # Final status update
        supabase.table('sync_jobs').update({
            'status': 'completed',
            'completed_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', sync_job_id).execute()
        
    except Exception as e:
        # Update job with error
        supabase.table('sync_jobs').update({
            'status': 'failed',
            'error': str(e),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', sync_job_id).execute()
        print(f"Sync job {sync_job_id} failed: {e}")

@app.get("/sync-status/{sync_job_id}")
async def get_sync_status(sync_job_id: str, current_user: User = Depends(get_current_user)):
    """Get the status of a sync job."""
    try:
        result = supabase.table('sync_jobs').select('*').eq('id', sync_job_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sync job not found")
        
        sync_job = result.data[0]
        
        # Verify user owns this sync job
        if sync_job['user_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        return sync_job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sync-jobs/{user_id}")
async def get_user_sync_jobs(user_id: str, current_user: User = Depends(get_current_user)):
    """Get all sync jobs for a user."""
    # Verify user owns this account
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        result = supabase.table('sync_jobs')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .execute()
        
        return {
            "status": "success",
            "sync_jobs": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 