import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def create_rookify_index():
    """
    Create a new Pinecone index for Rookify user data with the updated schema.
    This function is primarily for documentation - the index "rookify-vector-db" 
    has already been created via the Pinecone console.
    """
    # Initialize Pinecone client
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    
    index_name = "rookify-vector-db"
    
    # Check if index already exists
    if index_name in pc.list_indexes().names():
        print(f"Index '{index_name}' already exists.")
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        print(f"Current index stats: {stats}")
        return
    
    # Create new index (this matches your console configuration)
    pc.create_index(
        name=index_name,
        dimension=1024,  # Updated for llama-text-embed-v2
        metric="cosine",
        spec=ServerlessSpec(
            cloud='gcp',  # Updated to match your GCP configuration
            region='europe-west4'  # Updated to match your region
        )
    )
    
    print(f"Successfully created index '{index_name}'")
    
    # Print index description
    index = pc.Index(index_name)
    print("\nIndex Description:")
    print(f"Name: {index_name}")
    print(f"Dimension: 1024")
    print(f"Metric: cosine")
    print(f"Cloud: GCP")
    print(f"Region: europe-west4")
    print(f"Embedding Model: llama-text-embed-v2")
    print("\nSchema:")
    print("""
    Field Name         Type      Description
    id                 string    Unique identifier for the embedding (UUID or hash)
    embedding          float[]   Vector generated from FEN + commentary + context (1024 dimensions)
    user_id            string    Unique player ID (internal or from Chess.com username)
    game_id            string    Unique identifier for the game (can be PGN Event + Date)
    supabase_game_id   string    UUID of the game record in Supabase
    color              string    "white" or "black"
    opponent_rating    int       Opponent's Elo from PGN metadata
    user_rating        int       Player's Elo from PGN metadata
    result             string    "1-0", "0-1", or "1/2-1/2"
    timestamp          datetime  UTC datetime the game was played
    source             string    "chess.com" or "lichess"
    move_number        int       Move number for the position
    fen                string    Forsyth–Edwards Notation of the board at this point
    move               string    The move made by the player (e.g., Re8)
    eval_score         float     Stockfish evaluation of the position after the move (in centipawns)
    stockfish_best     string    The best move according to Stockfish
    delta_cp           float     Difference in centipawns between best move and actual move
    accuracy_class     string    "brilliant", "best", "great", "balanced", "book", "forced", "inaccuracy", "mistake", "blunder"
                                    - forced: moves required to maintain evaluation or when very limited legal options exist
    phase              string    "opening", "middlegame", "endgame"
    skill_category     string    One of the major areas: "Openings", "Tactics", "Strategy", "Endgames", "Time Management"
    sub_skill          string    Specific theme or concept: "Forks", "Pins", "Pawn Structure", "King Safety"
    score_impact       int       Positive or negative impact on skill score from this move
    commentary         string    Human-readable explanation or feedback for the move
    opening_name       string    Detected opening name (e.g., "Sicilian Defense")
    eco_code           string    Opening classification (e.g., "B20")
    is_tactical_puzzle bool      Whether the position could be used as a training puzzle
    is_brilliant       bool      Whether the move was classified as brilliant
    is_great           bool      Whether the move was classified as great (accuracy_class == "Great")
    game_url           string    URL to the original game on chess platform
    
    # Enhanced Move Features
    piece_moved        string    Type of piece that moved (e.g., 'knight', 'pawn')
    move_type          string    Type of move: capture/check/castle/promotion/quiet
    is_check           bool      Whether the move gives check
    is_capture         bool      Whether the move captures a piece
    is_castle          bool      Whether the move is castling
    is_promotion       bool      Whether the move promotes a pawn
    attacked_piece     string    Type of piece captured (if applicable)
    from_square        string    Source square of the move (e.g., 'e2')
    to_square          string    Destination square of the move (e.g., 'e4')
    move_distance      int       Number of squares the piece traveled
    
    # Position Complexity Metrics
    material_balance   float     Material count difference (positive favors white)
    king_safety_score  float     King safety metric (0-1 scale)
    pawn_structure_score float   Quality of pawn structure (0-1 scale)
    piece_activity_score float   How active the pieces are (0-1 scale)
    center_control_score float   Central square control (0-1 scale)
    position_complexity float    Overall position complexity (0-1 scale)
    tactical_complexity float    Tactical richness of position (0-1 scale)
    threats_count      int       Number of threats in the position
    hanging_pieces     string    JSON array of undefended pieces
    
    # Time Management Data
    time_spent         float     Seconds spent on this move
    time_remaining     float     Seconds remaining after the move
    time_pressure      bool      Whether player was in time pressure (<60s)
    avg_time_per_move  float     Running average time per move
    time_percentile    float     Time usage compared to similar positions (0-1)
    clock_percentage_used float  Percentage of total time used for this move
    
    # Enhanced Pattern Recognition
    tactical_motifs    string    JSON array of detected tactical patterns
    positional_themes  string    JSON array of strategic themes
    mistake_pattern    string    Specific type of mistake made
    threat_patterns    string    JSON array of threat patterns
    defensive_resources string   JSON array of available defensive options
    
    # Learning Analytics
    improvement_priority float   Priority for study/improvement (1-10 scale)
    concept_tags       string    JSON array of learning concepts
    difficulty_score   float     Position difficulty for the user (0-1 scale)
    critical_moment    bool      Whether this is a key decision point
    learning_opportunity string  Specific learning focus area
    similar_position_count int   Number of similar positions in database
    
    # Historical Context
    moves_since_theory int       Moves since leaving opening theory
    previous_move      string    The move that preceded this one
    position_frequency float     How common this position is (0-1 scale)
    novelty_score      float     How unusual the position is (0-1 scale)
    opening_deviation  bool      Whether player left the main opening line
    transition_move    bool      Whether this move transitions game phases
    
    # Enhanced Evaluation Data
    eval_before        float     Position evaluation before the move (centipawns)
    eval_after         float     Position evaluation after the move (centipawns)
    winning_probability float    Win probability after the move (0-1 scale)
    drawing_probability float    Draw probability after the move (0-1 scale)
    sharpness_score    float     How critical/sharp the position is (0-1 scale)
    eval_volatility    float     How much the evaluation is changing
    best_continuation  string    JSON array of best moves from position
    
    # Personalization Hooks
    user_pattern_frequency float How often user encounters this pattern type (0-1)
    user_success_rate  float     User's success rate in similar positions (0-1)
    typical_user_mistake bool    Whether this is a common error for this user
    personalized_difficulty float Difficulty adjusted for user level (0-1)
    improvement_delta  float     User's progress on this pattern type
    last_seen_days_ago int       Days since user last encountered similar position
    """)

def verify_index_configuration():
    """
    Verify that the existing index matches our expected configuration.
    """
    try:
        pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
        index_name = "rookify-vector-db"
        
        if index_name not in pc.list_indexes().names():
            print(f"❌ Index '{index_name}' not found!")
            print("Available indexes:", pc.list_indexes().names())
            return False
        
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        
        print(f"✅ Index '{index_name}' found and accessible")
        print(f"📊 Index Statistics:")
        print(f"   Total vectors: {stats.get('total_vector_count', 0)}")
        print(f"   Dimension: {stats.get('dimension', 'Unknown')}")
        print(f"   Namespaces: {list(stats.get('namespaces', {}).keys()) if stats.get('namespaces') else ['default']}")
        
        # Test a simple query
        try:
            test_vector = [0.1] * 1024  # Test vector with correct dimensions
            results = index.query(
                vector=test_vector,
                top_k=1,
                include_metadata=True
            )
            print(f"✅ Query test successful - found {len(results.matches)} results")
        except Exception as query_error:
            print(f"⚠️  Query test failed: {query_error}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying index configuration: {e}")
        return False

def get_index_info():
    """
    Get detailed information about the current index configuration.
    """
    try:
        pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
        
        print("🔍 Pinecone Index Information:")
        print("=" * 50)
        
        # List all indexes
        indexes = pc.list_indexes()
        print(f"Available Indexes: {indexes.names()}")
        
        index_name = "rookify-vector-db"
        if index_name in indexes.names():
            index = pc.Index(index_name)
            
            # Get index stats
            stats = index.describe_index_stats()
            print(f"\n📊 Index: {index_name}")
            print(f"Host: https://rookify-vector-db-motvuzs.svc.gcp-europe-west4-defd.pinecone.io")
            print(f"Total Vectors: {stats.get('total_vector_count', 0):,}")
            print(f"Dimension: {stats.get('dimension', 'Unknown')}")
            print(f"Fullness: {stats.get('index_fullness', 0):.2%}")
            
            # Namespace information
            namespaces = stats.get('namespaces', {})
            if namespaces:
                print(f"\n📁 Namespaces:")
                for ns_name, ns_stats in namespaces.items():
                    print(f"   {ns_name}: {ns_stats.get('vector_count', 0):,} vectors")
            else:
                print(f"\n📁 Using default namespace")
            
            return True
        else:
            print(f"❌ Index '{index_name}' not found!")
            return False
            
    except Exception as e:
        print(f"❌ Error getting index info: {e}")
        return False

if __name__ == "__main__":
    print("Rookify Pinecone Index Management")
    print("=" * 40)
    
    # Verify the existing index
    if verify_index_configuration():
        print("\n" + "=" * 40)
        get_index_info()
    else:
        print("\n❌ Index verification failed!")
        print("Please check your Pinecone API key and index configuration.") 