import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def create_rookify_index():
    """
    Create a new Pinecone index for Rookify user data with the specified schema.
    """
    # Initialize Pinecone client
    pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
    
    index_name = "rookify-user-data"
    
    # Check if index already exists
    if index_name in pc.list_indexes().names():
        print(f"Index '{index_name}' already exists. Deleting it...")
        pc.delete_index(index_name)
    
    # Create new index
    pc.create_index(
        name=index_name,
        dimension=1536,  # Dimension for text-embedding-3-small
        metric="cosine",
        spec=ServerlessSpec(
            cloud='aws',
            region='us-east-1'
        )
    )
    
    print(f"Successfully created index '{index_name}'")
    
    # Print index description
    index = pc.Index(index_name)
    print("\nIndex Description:")
    print(f"Name: {index_name}")
    print(f"Dimension: 1536")
    print(f"Metric: cosine")
    print("\nSchema:")
    print("""
    Field Name         Type      Description
    id                 string    Unique identifier for the embedding (UUID or hash)
    embedding          float[]   Vector generated from FEN + commentary + context
    user_id            string    Unique player ID (internal or from Chess.com username)
    game_id            string    Unique identifier for the game (can be PGN Event + Date)
    color              string    "white" or "black"
    opponent_rating    int       Opponent's Elo from PGN metadata
    user_rating        int       Player's Elo from PGN metadata
    result             string    "1-0", "0-1", or "1/2-1/2"
    timestamp          datetime  UTC datetime the game was played
    source             string    Always "chess.com" in this case
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
    """)

if __name__ == "__main__":
    create_rookify_index() 