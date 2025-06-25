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
    accuracy_class     string    "best", "excellent", "good", "inaccuracy", "mistake", "blunder"
    phase              string    "opening", "middlegame", "endgame"
    skill_category     string    One of the major areas: "Openings", "Tactics", "Strategy", "Endgames", "Time Management"
    sub_skill          string    Specific theme or concept: "Forks", "Pins", "Pawn Structure", "King Safety"
    score_impact       int       Positive or negative impact on skill score from this move
    commentary         string    Human-readable explanation or feedback for the move
    opening_name       string    Detected opening name (e.g., "Sicilian Defense")
    eco_code           string    Opening classification (e.g., "B20")
    is_tactical_puzzle bool      Whether the position could be used as a training puzzle
    is_brilliant       bool      Whether the move was classified as brilliant
    is_great           bool      Whether the move was classified as great
    game_url           string    URL to the original game on chess platform
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