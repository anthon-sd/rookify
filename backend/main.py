from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, Query, Request
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
from typing import Optional, List, Dict
import json
import requests
import chess.pgn
import io
from utils.sync_job_compliance import sync_job_manager

# Configuration
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://ai-engine:5000")

app = FastAPI(title="Chess Coach Backend")

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"REQUEST: {request.method} {request.url}")
    auth_header = request.headers.get("authorization", "NONE")
    print(f"AUTH: {auth_header[:50] if auth_header != 'NONE' else 'NO AUTH HEADER'}")
    
    response = await call_next(request)
    print(f"RESPONSE: {response.status_code}")
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
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
    months: int = 1  # How many months back to sync (for backward compatibility)
    fromDate: Optional[str] = None  # Start date for sync (YYYY-MM-DD format)
    toDate: Optional[str] = None  # End date for sync (YYYY-MM-DD format)
    lichess_token: Optional[str] = None  # For Lichess private games
    # New filter parameters
    game_types: Optional[List[str]] = None  # ["bullet", "blitz", "rapid", "classical"]
    results: Optional[List[str]] = None  # ["win", "loss", "draw"]
    colors: Optional[List[str]] = None  # ["white", "black"]

# Helper functions
def extract_game_date_from_game(game: dict) -> Optional[datetime]:
    """Extract game date from Chess.com game data."""
    try:
        # Try to extract from PGN first
        pgn = game.get('pgn', '')
        if '[Date "' in pgn:
            import re
            date_match = re.search(r'\[Date "(\d{4}\.\d{2}\.\d{2})"\]', pgn)
            if date_match:
                date_str = date_match.group(1).replace('.', '-')
                return datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
        
        # Try to extract from URL or other metadata
        if 'url' in game:
            # Chess.com URLs often contain date info: /game/live/12345678901234567890?moves=...
            # For now, return None and rely on API filtering
            pass
        
        return None
    except Exception:
        return None

def classify_time_control(time_control: str) -> str:
    """Classify time control into game type categories."""
    if not time_control:
        return "unknown"
    
    import re
    
    # Parse time control (e.g., "600+0", "180+2")
    match = re.match(r'(\d+)\+(\d+)', time_control)
    if match:
        base_time = int(match.group(1))
        increment = int(match.group(2))
        total_time = base_time + 40 * increment  # Estimate with 40 moves
    else:
        # Try to parse single number (seconds)
        try:
            total_time = int(time_control)
        except:
            return "unknown"
    
    # Classify based on total time in seconds
    if total_time < 180:  # Less than 3 minutes
        return "bullet"
    elif total_time < 600:  # Less than 10 minutes
        return "blitz"
    elif total_time < 1800:  # Less than 30 minutes
        return "rapid"
    else:
        return "classical"

def should_include_game(game_dict: Dict, pgn: str, request: SyncRequest) -> bool:
    """Check if game matches filter criteria."""
    import chess.pgn
    import io
    
    # Parse PGN headers
    game = chess.pgn.read_game(io.StringIO(pgn))
    if not game:
        return False
    
    headers = game.headers
    
    # Check game type filter
    if request.game_types:
        time_control = headers.get("TimeControl", "")
        game_type = classify_time_control(time_control)
        if game_type not in request.game_types:
            return False
    
    # Check result filter
    if request.results:
        result = headers.get("Result", "")
        user_color = "white" if headers.get("White", "").lower() == request.username.lower() else "black"
        
        # Convert result to user perspective
        if result == "1-0":
            user_result = "win" if user_color == "white" else "loss"
        elif result == "0-1":
            user_result = "loss" if user_color == "white" else "win"
        elif result == "1/2-1/2":
            user_result = "draw"
        else:
            return False  # Unknown result
        
        if user_result not in request.results:
            return False
    
    # Check color filter
    if request.colors:
        user_color = "white" if headers.get("White", "").lower() == request.username.lower() else "black"
        if user_color not in request.colors:
            return False
    
    return True

# Authentication endpoints
@app.post("/register", response_model=User)
async def register(user: UserCreate):
    try:
        # Check if user already exists
        existing_user = supabase.table(USERS_TABLE).select("*").eq("email", user.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        existing_username = supabase.table(USERS_TABLE).select("*").eq("username", user.username).execute()
        if existing_username.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
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
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Handle database constraint errors and other exceptions
        error_message = str(e)
        if "duplicate key value violates unique constraint" in error_message:
            if "email" in error_message:
                detail = "Email already registered"
            elif "username" in error_message:
                detail = "Username already taken"
            else:
                detail = "Account with this information already exists"
        else:
            detail = f"Database error: {error_message}"
            
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

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
    print(f"👤 /users/me called for user: {current_user.id} - {current_user.email}")
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

@app.get("/debug")
async def debug_endpoint():
    print("DEBUG: Test endpoint called - debugging is working!")
    return {"debug": "working", "message": "Debug endpoint reached"}

@app.get("/debug-headers")
async def debug_headers_endpoint(request: Request):
    print("DEBUG: Headers endpoint called")
    headers = dict(request.headers)
    print(f"DEBUG: All headers: {headers}")
    auth_header = headers.get('authorization', 'NONE')
    print(f"DEBUG: Authorization header: {auth_header}")
    return {"headers": headers, "auth": auth_header}

@app.get("/debug-auth")
async def debug_auth_endpoint(current_user: User = Depends(get_current_user)):
    print("DEBUG: Auth endpoint reached - user authenticated!")
    return {"debug": "auth working", "user_id": current_user.id}

@app.get("/debug/game/{game_id}")
async def debug_game_data(game_id: str):
    """
    Debug endpoint to check what data exists for a specific game
    """
    try:
        response = supabase.table('game_analysis').select("*").eq('id', game_id).execute()
        
        if not response.data:
            return {"error": "Game not found", "game_id": game_id}
        
        game = response.data[0]
        
        return {
            "game_id": game_id,
            "has_pgn": bool(game.get('pgn')),
            "pgn_length": len(game.get('pgn', '')) if game.get('pgn') else 0,
            "pgn_preview": game.get('pgn', '')[:200] if game.get('pgn') else None,
            "key_moments_type": type(game.get('key_moments')).__name__,
            "key_moments_count": len(game.get('key_moments', [])) if game.get('key_moments') else 0,
            "all_fields": list(game.keys()),
            "platform": game.get('platform'),
            "game_url": game.get('game_url'),
            "user_id": game.get('user_id')
        }
        
    except Exception as e:
        return {"error": str(e), "game_id": game_id}

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
    Test connection to Chess.com for a user.
    """
    try:
        api = ChessComAPI(request.username)
        profile = api.get_user_profile()
        stats = api.get_user_stats()
        
        return {
            "status": "success",
            "profile": profile,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================================================================
# IMPORTANT: ALL GAME SYNC AND ANALYSIS OPERATIONS MUST USE THE SYNC JOBS TABLE
# 
# Use the /sync-games/{user_id} endpoint for all chess platform synchronization.
# This ensures proper tracking, progress monitoring, rate limiting, and user auth.
# 
# Legacy endpoints that bypass sync jobs have been removed for consistency.
# ================================================================================

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
    # Debug: Log what we received from frontend
    print(f"🔍 SYNC DEBUG: Received request - platform: {request.platform}, username: {request.username}")
    print(f"🔍 SYNC DEBUG: Date params - fromDate: '{request.fromDate}', toDate: '{request.toDate}', months: {request.months}")
    
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
    
    # Create sync job record using SyncJobManager for compliance
    try:
        sync_job = sync_job_manager.create_sync_job(
            user_id=user_id,
            platform=request.platform,
            username=request.username,
            months_requested=request.months
        )
        
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
        # Update status to fetching using SyncJobManager
        sync_job_manager.update_sync_job_status(sync_job_id, 'fetching')
        
        # Debug: Log what date parameters we received
        print(f"🔍 DEBUG: fromDate = '{request.fromDate}', toDate = '{request.toDate}', months = {request.months}")
        
        # Determine date range for fetching games
        if request.fromDate and request.toDate:
            # Use specific date range if provided
            since = datetime.fromisoformat(request.fromDate).replace(tzinfo=timezone.utc)
            until = datetime.fromisoformat(request.toDate).replace(tzinfo=timezone.utc)
            print(f"✅ Using specific date range: {since.date()} to {until.date()}")
        else:
            # Fall back to months-based calculation
            until = datetime.now(timezone.utc)
            since = until - timedelta(days=30 * request.months)
            print(f"⚠️ Fallback to months-based: {since.date()} to {until.date()} (fromDate: {request.fromDate}, toDate: {request.toDate})")
        
        # Fetch games based on platform
        games = []
        if request.platform == "chess.com":
            api = ChessComAPI(request.username)
            print(f"♟️ Fetching Chess.com games from {since.date()} to {until.date()}")
            
            # Get PGN strings from Chess.com using specific date range
            pgn_games = api.get_games_by_date_range(since, until)
            
            # Convert PGN strings to game dictionaries for consistency
            games = []
            for i, pgn in enumerate(pgn_games):
                # Extract basic info from PGN for URL (Chess.com doesn't provide URLs in API)
                game_dict = {
                    'pgn': pgn,
                    'url': f"https://chess.com/game/{request.username}/{i+1}",  # Placeholder URL
                    'platform': 'chess.com'
                }
                games.append(game_dict)
            
        elif request.platform == "lichess":
            api = LichessAPI(token=request.lichess_token)
            print(f"🏆 Fetching Lichess games from {since} to {until}")
            
            # Use game_types filter for Lichess API if provided
            lichess_game_types = request.game_types if request.game_types else ["bullet", "blitz", "rapid", "classical"]
            
            games = api.get_user_games(
                request.username,
                since=since,
                until=until,
                max_games=100,
                game_types=lichess_game_types
            )
        else:
            raise ValueError(f"Unsupported platform: {request.platform}")
        
        # Filter games based on user preferences
        if request.game_types or request.results or request.colors:
            print(f"🎯 Applying filters: game_types={request.game_types}, results={request.results}, colors={request.colors}")
            filtered_games = []
            for game in games:
                if should_include_game(game, game['pgn'], request):
                    filtered_games.append(game)
            games = filtered_games
            print(f"🎯 Filtered to {len(games)} games matching criteria")
        
        # Update games found using SyncJobManager
        sync_job_manager.update_sync_job_status(sync_job_id, 'analyzing')
        sync_job_manager.update_sync_job_progress(sync_job_id, games_found=len(games))
        
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
                
                # DEBUG: Log what we got from parse_pgn_game
                print(f"🔍 DEBUG Game {i+1}: parse_pgn_game returned type: {type(moments)}")
                print(f"🔍 DEBUG Game {i+1}: moments value: {moments}")
                if isinstance(moments, list):
                    print(f"🔍 DEBUG Game {i+1}: moments length: {len(moments)}")
                    if len(moments) > 0:
                        print(f"🔍 DEBUG Game {i+1}: first moment type: {type(moments[0])}")
                
                # Safety check: ensure moments is a list
                if not isinstance(moments, list):
                    print(f"❌ ERROR Game {i+1}: Expected list, got {type(moments)}. Skipping this game.")
                    continue
                
                if len(moments) == 0:
                    print(f"⚠️ WARNING Game {i+1}: No moments found in game. Skipping.")
                    continue
                
                # Update user_id for all moments
                for moment in moments:
                    moment['user_id'] = user_id
                
                # Get user rating for selective analysis
                try:
                    user_result = supabase.table('users').select('rating').eq('id', user_id).execute()
                    user_rating = user_result.data[0]['rating'] if user_result.data else 1500
                except:
                    user_rating = 1500  # Default rating
                
                print(f"🔍 DEBUG Game {i+1}: About to call analyze_game_moments with:")
                print(f"   - moments: {type(moments)} with {len(moments)} items")
                print(f"   - depth: 12")
                print(f"   - user_rating: {user_rating}")
                print(f"   - user_level: intermediate")
                
                # Use batch processing with selective criteria - HOTFIX APPLIED
                from hotfix_batch_processing import safe_analyze_game_moments
                analyzed_moments = safe_analyze_game_moments(
                    analyzer,
                    moments, 
                    depth=12, 
                    user_rating=user_rating,
                    user_level="intermediate"
                )
                
                # Extract enhanced metadata from PGN
                from utils.db_batch import extract_pgn_headers, calculate_game_statistics
                pgn_headers = extract_pgn_headers(game['pgn'])
                game_stats = calculate_game_statistics(analyzed_moments)
                
                # Store analysis with enhanced schema
                game_analysis = {
                    'user_id': user_id,
                    'game_url': game['url'],
                    'platform': request.platform,
                    'game_id': game.get('id', game['url'].split('/')[-1]),
                    'pgn': game['pgn'],
                    'key_moments': analyzed_moments,
                    'sync_job_id': sync_job_id,
                    
                    # Enhanced fields from PGN headers
                    'white_username': pgn_headers.get('white'),
                    'black_username': pgn_headers.get('black'),
                    'white_rating': pgn_headers.get('white_elo'),
                    'black_rating': pgn_headers.get('black_elo'),
                    'user_color': 'white' if pgn_headers.get('white') == request.username else 'black' if pgn_headers.get('black') == request.username else None,
                    'result': pgn_headers.get('result'),
                    'time_control': pgn_headers.get('time_control'),
                    'game_timestamp': pgn_headers.get('datetime'),
                    'opening_name': pgn_headers.get('opening'),
                    'eco_code': pgn_headers.get('eco'),
                    
                    # Game statistics
                    'avg_accuracy': game_stats.get('avg_accuracy'),
                    'total_moves': game_stats.get('total_moves'),
                    'blunders_count': game_stats.get('blunders_count', 0),
                    'mistakes_count': game_stats.get('mistakes_count', 0),
                    'inaccuracies_count': game_stats.get('inaccuracies_count', 0),
                    
                    # Pinecone sync status
                    'pinecone_uploaded': False,
                    'pinecone_vector_count': 0,
                    
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                
                result = supabase.table('game_analysis').insert(game_analysis).execute()
                game_db_id = result.data[0]['id'] if result.data else None
                analyzed_count += 1
                
                # Update progress using SyncJobManager
                sync_job_manager.update_sync_job_progress(sync_job_id, games_analyzed=analyzed_count)
                
                # Upload to vector database with enhanced metadata
                if game_db_id:
                    try:
                        from pinecone_upload import upload_supabase_game_to_pinecone, PINECONE_INDEX_NAME
                        # Get the saved game with all metadata for Pinecone upload
                        enhanced_game_data = game_analysis.copy()
                        enhanced_game_data['id'] = game_db_id
                        
                        vector_count = upload_supabase_game_to_pinecone(enhanced_game_data, PINECONE_INDEX_NAME)
                        
                        # Update the record with Pinecone sync status
                        if vector_count > 0:
                            supabase.table('game_analysis').update({
                                'pinecone_uploaded': True,
                                'pinecone_vector_count': vector_count
                            }).eq('id', game_db_id).execute()
                            print(f"✅ Uploaded {vector_count} vectors to {PINECONE_INDEX_NAME}")
                    except Exception as pinecone_error:
                        print(f"Warning: Failed to upload to Pinecone: {pinecone_error}")
                        # Continue processing even if Pinecone upload fails
                
            except Exception as game_error:
                print(f"Error analyzing game {i+1}: {game_error}")
                import traceback
                print(f"Full traceback: {traceback.format_exc()}")
                continue
        
        # Final status update using SyncJobManager
        sync_job_manager.update_sync_job_status(sync_job_id, 'completed')
        
    except Exception as e:
        # Update job with error using SyncJobManager
        sync_job_manager.update_sync_job_status(sync_job_id, 'failed', error=str(e))
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

@app.post("/admin/cleanup-stuck-sync-jobs")
async def cleanup_stuck_sync_jobs(current_user: User = Depends(get_current_user)):
    """
    Admin endpoint to cleanup stuck sync jobs.
    Marks jobs stuck in 'analyzing' status for more than 2 hours as failed.
    """
    try:
        # Calculate cutoff time (2 hours ago)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=2)
        cutoff_iso = cutoff_time.isoformat()
        
        # Find stuck jobs
        stuck_jobs_query = supabase.table('sync_jobs').select('*').eq('status', 'analyzing').execute()
        
        if not stuck_jobs_query.data:
            return {"message": "No analyzing jobs found", "cleaned_up": 0}
        
        stuck_jobs = []
        for job in stuck_jobs_query.data:
            # Check if job is old enough (created more than 2 hours ago)
            job_created = datetime.fromisoformat(job['created_at'].replace('Z', '+00:00'))
            if job_created < cutoff_time:
                stuck_jobs.append(job)
        
        if not stuck_jobs:
            return {"message": "No stuck jobs found (all analyzing jobs are recent)", "cleaned_up": 0}
        
        # Update stuck jobs to failed status
        cleaned_count = 0
        for job in stuck_jobs:
            try:
                update_result = supabase.table('sync_jobs').update({
                    'status': 'failed',
                    'error': 'Job was stuck in analyzing status - cleaned up by admin',
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('id', job['id']).execute()
                
                if update_result.data:
                    cleaned_count += 1
                    print(f"✅ Cleaned up stuck job: {job['id']} (user: {job['user_id']}, platform: {job['platform']})")
                
            except Exception as job_error:
                print(f"❌ Failed to clean up job {job['id']}: {job_error}")
        
        return {
            "message": f"Cleaned up {cleaned_count} stuck sync jobs",
            "cleaned_up": cleaned_count,
            "stuck_jobs": [{"id": job['id'], "user_id": job['user_id'], "platform": job['platform'], "created_at": job['created_at']} for job in stuck_jobs]
        }
        
    except Exception as e:
        print(f"Error in cleanup_stuck_sync_jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/fix-specific-sync-job/{sync_job_id}")
async def fix_specific_sync_job(sync_job_id: str, current_user: User = Depends(get_current_user)):
    """
    Admin endpoint to fix a specific stuck sync job by ID.
    """
    try:
        # Get the job
        job_result = supabase.table('sync_jobs').select('*').eq('id', sync_job_id).execute()
        
        if not job_result.data:
            raise HTTPException(status_code=404, detail="Sync job not found")
        
        job = job_result.data[0]
        
        # Update the job to failed status
        update_result = supabase.table('sync_jobs').update({
            'status': 'failed',
            'error': f'Job was stuck in {job["status"]} status - manually fixed by admin',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', sync_job_id).execute()
        
        if update_result.data:
            print(f"✅ Fixed stuck job: {sync_job_id} (user: {job['user_id']}, platform: {job['platform']})")
            return {
                "message": f"Successfully fixed stuck sync job {sync_job_id}",
                "job": job,
                "updated": update_result.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update sync job")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fixing sync job {sync_job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/games/{user_id}")
async def get_user_games(
    user_id: str,
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = Query(None, regex=r"^(chess\.com|lichess)$")
):
    """
    Get analyzed games for a user with pagination
    """
    try:
        print(f"🎮 Fetching games for user: {user_id}")
        print(f"📄 Pagination: limit={limit}, offset={offset}, platform={platform}")
        print(f"👤 Current user: {current_user.id}")
        
        # Verify user can access this data
        if current_user.id != user_id:
            print(f"❌ Access denied: {current_user.id} != {user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build query - only select columns that exist
        query = supabase.table('game_analysis').select(
            "id, user_id, game_url, platform, pgn, key_moments"
        ).eq('user_id', user_id)
        
        # Add platform filter if specified
        if platform:
            query = query.eq('platform', platform)
        
        # Add pagination and ordering - use id for ordering since created_at doesn't exist
        query = query.order('id', desc=True).range(offset, offset + limit - 1)
        
        print(f"🔍 Executing query...")
        response = query.execute()
        
        print(f"📊 Query result: {len(response.data) if response.data else 0} games found")
        
        if response.data is None:
            print("⚠️ No data returned from query")
            return {"games": [], "total": 0}
        
        # Get total count for pagination
        count_response = supabase.table('game_analysis').select(
            "id", count="exact"
        ).eq('user_id', user_id)
        
        if platform:
            count_response = count_response.eq('platform', platform)
        
        count_result = count_response.execute()
        total = len(count_result.data) if count_result.data else 0
        
        print(f"✅ Returning {len(response.data)} games (total: {total})")
        
        return {
            "games": response.data,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Error fetching games for user {user_id}: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch games: {str(e)}")

@app.get("/games/{user_id}/{game_id}")
async def get_game_analysis(
    user_id: str,
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed analysis for a specific game
    """
    try:
        # Verify user can access this data
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        response = supabase.table('game_analysis').select("*").eq(
            'user_id', user_id
        ).eq('id', game_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Game not found")
        
        game = response.data[0]
        
        # Parse key_moments if it exists
        if game.get('key_moments'):
            try:
                if isinstance(game['key_moments'], str):
                    game['key_moments'] = json.loads(game['key_moments'])
            except json.JSONDecodeError:
                print(f"Invalid JSON in key_moments for game {game_id}")
                game['key_moments'] = []
        
        return game
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching game {game_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch game: {str(e)}")

@app.post("/games/{user_id}/{game_id}/analyze")
async def reanalyze_game_position(
    user_id: str,
    game_id: str,
    position_data: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Get fresh analysis for a specific position in a game
    """
    try:
        # Verify user can access this data
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate position data
        fen = position_data.get('fen')
        move_number = position_data.get('move_number', 1)
        
        if not fen:
            raise HTTPException(status_code=400, detail="FEN position required")
        
        # Call AI engine for analysis
        ai_response = requests.post(
            f"{AI_ENGINE_URL}/analyze",
            json={
                "fen": fen,
                "depth": 20,
                "user_level": "intermediate"
            },
            timeout=30
        )
        
        if ai_response.status_code != 200:
            raise HTTPException(status_code=500, detail="AI analysis failed")
        
        analysis = ai_response.json()
        
        # Add move context
        analysis['move_number'] = move_number
        analysis['fen'] = fen
        analysis['timestamp'] = datetime.now(timezone.utc).isoformat()
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing position for game {game_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze position: {str(e)}")

@app.get("/user-profile/{user_id}/weaknesses")
async def get_user_weaknesses(
    user_id: str,
    current_user: User = Depends(get_current_user),
    days: int = Query(30, ge=7, le=90)
):
    """
    Get user's weakness analysis based on recent games using vector similarity.
    """
    # Verify user can access this data
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        from user_profiling_integration import UserProfiler
        profiler = UserProfiler()
        
        weaknesses = profiler.analyze_user_weaknesses(user_id, days)
        
        if 'error' in weaknesses:
            raise HTTPException(status_code=500, detail=weaknesses['error'])
        
        return {
            "status": "success",
            "user_id": user_id,
            "analysis": weaknesses
        }
        
    except Exception as e:
        print(f"Error getting user weaknesses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-profile/{user_id}/similar-players")
async def get_similar_players(
    user_id: str,
    current_user: User = Depends(get_current_user),
    rating_range: int = Query(100, ge=50, le=500)
):
    """
    Find players with similar playing patterns and rating.
    """
    # Verify user can access this data
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        from user_profiling_integration import UserProfiler
        profiler = UserProfiler()
        
        similar_players = profiler.find_similar_players(user_id, rating_range)
        
        return {
            "status": "success",
            "user_id": user_id,
            "similar_players": similar_players,
            "rating_range": rating_range
        }
        
    except Exception as e:
        print(f"Error finding similar players: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-profile/{user_id}/training-positions")
async def get_training_positions(
    user_id: str,
    current_user: User = Depends(get_current_user),
    skill_focus: Optional[str] = Query(None, regex=r"^(Tactics|Strategy|Openings|Endgames|Time Management)$"),
    difficulty: str = Query("adaptive", regex=r"^(easy|medium|hard|adaptive)$"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get personalized training positions based on user's weaknesses.
    """
    # Verify user can access this data
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        from user_profiling_integration import UserProfiler
        profiler = UserProfiler()
        
        positions = profiler.get_personalized_training_positions(
            user_id, 
            skill_focus=skill_focus, 
            difficulty=difficulty
        )
        
        # Limit results
        positions = positions[:limit]
        
        return {
            "status": "success",
            "user_id": user_id,
            "training_positions": positions,
            "filters": {
                "skill_focus": skill_focus,
                "difficulty": difficulty,
                "limit": limit
            }
        }
        
    except Exception as e:
        print(f"Error getting training positions: {e}")
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

@app.get("/admin/vector-db/status")
async def get_vector_db_status(current_user: User = Depends(get_current_user)):
    """
    Get status and statistics of the vector database.
    Admin endpoint to monitor the vector DB health.
    """
    try:
        from pinecone_upload import pc, PINECONE_INDEX_NAME, test_vector_db_connection
        
        # Test connection
        connection_ok = test_vector_db_connection()
        
        if not connection_ok:
            raise HTTPException(status_code=503, detail="Vector database connection failed")
        
        # Get index statistics
        index = pc.Index(PINECONE_INDEX_NAME)
        stats = index.describe_index_stats()
        
        # Get sync status from Supabase
        sync_status_query = supabase.table('game_analysis').select(
            'pinecone_uploaded, pinecone_vector_count'
        ).execute()
        
        total_games = len(sync_status_query.data) if sync_status_query.data else 0
        synced_games = len([g for g in sync_status_query.data if g.get('pinecone_uploaded')]) if sync_status_query.data else 0
        total_vectors_expected = sum(g.get('pinecone_vector_count', 0) for g in sync_status_query.data) if sync_status_query.data else 0
        
        return {
            "status": "healthy",
            "index_name": PINECONE_INDEX_NAME,
            "connection": "ok" if connection_ok else "failed",
            "vector_stats": {
                "total_vectors": stats.get('total_vector_count', 0),
                "dimension": stats.get('dimension', 1024),
                "fullness": stats.get('index_fullness', 0),
                "namespaces": list(stats.get('namespaces', {}).keys()) if stats.get('namespaces') else ['default']
            },
            "sync_status": {
                "total_games_in_supabase": total_games,
                "games_synced_to_pinecone": synced_games,
                "sync_percentage": (synced_games / total_games * 100) if total_games > 0 else 0,
                "total_vectors_expected": total_vectors_expected
            }
        }
        
    except Exception as e:
        print(f"Error getting vector DB status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/vector-db/sync")
async def trigger_vector_db_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    user_id: Optional[str] = None,
    limit: Optional[int] = None,
    force_resync: bool = False
):
    """
    Trigger a sync of game data to the vector database.
    Admin endpoint to manually sync data.
    """
    try:
        # Add sync task to background
        background_tasks.add_task(
            run_vector_db_sync,
            user_id=user_id,
            limit=limit,
            force_resync=force_resync
        )
        
        return {
            "status": "sync_started",
            "message": "Vector database sync started in background",
            "parameters": {
                "user_id": user_id,
                "limit": limit,
                "force_resync": force_resync
            }
        }
        
    except Exception as e:
        print(f"Error triggering vector DB sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_vector_db_sync(user_id: Optional[str] = None, limit: Optional[int] = None, force_resync: bool = False):
    """
    Background task to sync data to vector database.
    """
    try:
        print(f"🚀 Starting vector DB sync - user_id: {user_id}, limit: {limit}, force_resync: {force_resync}")
        
        # Import sync function
        from sync_to_pinecone import sync_games_to_pinecone
        
        # Run the sync
        stats = sync_games_to_pinecone(
            user_id=user_id,
            limit=limit,
            only_unsynced=not force_resync,
            dry_run=False
        )
        
        print(f"✅ Vector DB sync completed: {stats}")
        
    except Exception as e:
        print(f"❌ Vector DB sync failed: {e}")

if __name__ == "__main__":
    import uvicorn
    
    # Test filtering functionality
    def test_filtering():
        """Test game filtering functionality"""
        print("Testing game filtering functionality...")
        
        # Test time control classification
        test_cases = [
            ("60+0", "bullet"),
            ("180+0", "blitz"),
            ("300+3", "blitz"),
            ("600+0", "rapid"),
            ("900+10", "rapid"),
            ("1800+0", "classical"),
            ("3600+0", "classical"),
            ("invalid", "unknown"),
            ("", "unknown"),
        ]
        
        for time_control, expected in test_cases:
            result = classify_time_control(time_control)
            status = "✅" if result == expected else "❌"
            print(f"{status} {time_control} -> {result} (expected: {expected})")
        
        # Test PGN parsing for filtering
        sample_pgn = '''[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.15"]
[Round "-"]
[White "testuser"]
[Black "opponent"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1485"]
[TimeControl "600+0"]
[Termination "testuser won by checkmate"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Bb7 10. d4 Re8 11. Nbd2 Bf8 12. a4 h6 13. Bc2 exd4 14. cxd4 Nb4 15. Bb1 c5 16. d5 Nd7 17. Ra3 f5 18. Rae3 Nc2 19. Bxc2 fxe4 20. Rxe4 Rxe4 21. Nxe4 c4 22. Ng3 Nc5 23. Be3 Qd7 24. Qc2 Re8 25. Bd4 Nd3 26. Re2 Be7 27. Rxe7 Rxe7 28. Qxd3 Qe8 29. Qf5 Rf7 30. Qe6 1-0'''
        
        # Create a test sync request
        class TestSyncRequest:
            def __init__(self, game_types=None, results=None, colors=None):
                self.username = "testuser"
                self.game_types = game_types
                self.results = results
                self.colors = colors
        
        # Test filtering scenarios
        test_scenarios = [
            (TestSyncRequest(game_types=["rapid"]), True, "rapid game should be included"),
            (TestSyncRequest(game_types=["bullet"]), False, "bullet filter should exclude rapid game"),
            (TestSyncRequest(results=["win"]), True, "win filter should include winning game"),
            (TestSyncRequest(results=["loss"]), False, "loss filter should exclude winning game"),
            (TestSyncRequest(colors=["white"]), True, "white filter should include white game"),
            (TestSyncRequest(colors=["black"]), False, "black filter should exclude white game"),
        ]
        
        for request, expected, description in test_scenarios:
            result = should_include_game({}, sample_pgn, request)
            status = "✅" if result == expected else "❌"
            print(f"{status} {description}: {result}")
        
        print("Filtering tests completed!")
    
    # Run tests if this file is executed directly
    # test_filtering()
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 