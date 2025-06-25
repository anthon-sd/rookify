import os
import json
from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from dotenv import load_dotenv
import uuid
from datetime import datetime
import requests

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Initialize Pinecone client
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

# Initialize OpenAI client (for fallback)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# New vector DB configuration
PINECONE_INDEX_NAME = "rookify-vector-db"
EMBEDDING_DIMENSIONS = 1024
EMBEDDING_MODEL = "llama-text-embed-v2"

def get_embedding(text: str, use_llama: bool = True) -> List[float]:
    """
    Get embedding for a text using either Llama or OpenAI's API.
    
    Args:
        text (str): The text to get embedding for
        use_llama (bool): Whether to use Llama model (default) or OpenAI fallback
        
    Returns:
        List[float]: The embedding vector
    """
    if not text:
        return [0.0] * EMBEDDING_DIMENSIONS
    
    try:
        if use_llama:
            # Use Pinecone's inference API with Llama model
            # First check if we have the inference endpoint configured
            inference_host = os.getenv('PINECONE_INFERENCE_HOST')
            if inference_host:
                response = requests.post(
                    f"{inference_host}/v1/embed",
                    headers={
                        "Authorization": f"Bearer {os.getenv('PINECONE_API_KEY')}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": EMBEDDING_MODEL,
                        "inputs": [{"text": text}]
                    },
                    timeout=30
                )
                if response.status_code == 200:
                    result = response.json()
                    return result['data'][0]['values']
                else:
                    print(f"Pinecone inference API error: {response.status_code} - {response.text}")
                    # Fall back to OpenAI
                    return get_embedding(text, use_llama=False)
            else:
                # If no Pinecone inference endpoint, use OpenAI
                return get_embedding(text, use_llama=False)
        else:
            # Fallback to OpenAI (but we need to truncate to 1024 dimensions)
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                dimensions=EMBEDDING_DIMENSIONS  # Truncate to match our vector DB
            )
            return response.data[0].embedding
            
    except Exception as e:
        print(f"Error getting embedding: {e}")
        # Return zero vector as fallback
        return [0.0] * EMBEDDING_DIMENSIONS

def prepare_vector_from_supabase_game(game_data: Dict, moment: Dict, moment_index: int) -> Dict:
    """
    Prepare a vector record from Supabase game data and a specific moment.
    
    Args:
        game_data (Dict): Game data from Supabase game_analysis table
        moment (Dict): Individual moment from key_moments JSONB
        moment_index (int): Index of the moment in the game
        
    Returns:
        Dict: Record ready for Pinecone
    """
    # Create a text representation for embedding
    text_for_embedding = f"""
    Position: {moment.get('position_fen', 'N/A')}
    Move: {moment.get('move', 'N/A')}
    Commentary: {moment.get('commentary', moment.get('llm_analysis', 'N/A'))}
    Phase: {moment.get('phase', 'N/A')}
    Accuracy: {moment.get('accuracy_class', 'N/A')}
    Opening: {game_data.get('opening_name', 'N/A')}
    Skill Category: {moment.get('skill_category', 'N/A')}
    Sub-skill: {moment.get('sub_skill', 'N/A')}
    """
    
    # Get embedding using the new model
    embedding = get_embedding(text_for_embedding.strip())
    
    # Determine user's rating based on color
    user_rating = game_data.get('white_rating', 1500) if game_data.get('user_color') == 'white' else game_data.get('black_rating', 1500)
    opponent_rating = game_data.get('black_rating', 1500) if game_data.get('user_color') == 'white' else game_data.get('white_rating', 1500)
    
    # Create enhanced metadata compatible with Pinecone schema
    metadata = {
        'user_id': str(game_data.get('user_id', '')),
        'game_id': str(game_data.get('game_id', game_data.get('id', ''))),
        'color': game_data.get('user_color', ''),
        'opponent_rating': int(opponent_rating) if opponent_rating else 0,
        'user_rating': int(user_rating) if user_rating else 0,
        'result': game_data.get('result', ''),
        'timestamp': game_data.get('game_timestamp', game_data.get('created_at', '')),
        'source': game_data.get('platform', 'chess.com'),
        'move_number': int(moment.get('move_number', moment_index + 1)),
        'fen': moment.get('position_fen', ''),
        'move': moment.get('move', ''),
        'eval_score': float(moment.get('eval_score', 0.0)) if moment.get('eval_score') is not None else 0.0,
        'stockfish_best': moment.get('stockfish_best', ''),
        'delta_cp': float(moment.get('delta_cp', 0.0)) if moment.get('delta_cp') is not None else 0.0,
        'accuracy_class': moment.get('accuracy_class', ''),
        'phase': moment.get('phase', ''),
        'skill_category': moment.get('skill_category', ''),
        'sub_skill': moment.get('sub_skill', ''),
        'score_impact': int(moment.get('score_impact', 0)) if moment.get('score_impact') else 0,
        'commentary': moment.get('commentary', moment.get('llm_analysis', '')),
        'opening_name': game_data.get('opening_name', ''),
        'eco_code': game_data.get('eco_code', ''),
        'is_tactical_puzzle': bool(moment.get('is_tactical_puzzle', False)),
        
        # Additional helpful metadata
        'is_brilliant': bool(moment.get('is_brilliant', False)),
        'is_great': bool(moment.get('is_great', False)),
        'game_url': game_data.get('game_url', ''),
        'supabase_game_id': str(game_data.get('id', ''))
    }

    # Ensure all metadata values are valid types for Pinecone
    for k, v in list(metadata.items()):
        if isinstance(v, (dict, list)):
            metadata[k] = json.dumps(v)
        elif v is None:
            metadata[k] = ''

    # Create unique ID for this vector
    vector_id = f"{game_data.get('user_id', '')}_{game_data.get('id', '')}_{moment_index}"

    return {
        "id": vector_id,
        "values": embedding,
        "metadata": metadata
    }

def prepare_vector_record(record: Dict) -> Dict:
    """
    Prepare a record for Pinecone by adding the embedding (legacy function for backward compatibility).
    
    Args:
        record (Dict): The record from game analysis
        
    Returns:
        Dict: Record ready for Pinecone
    """
    # Create a text representation for embedding
    metadata = record.get('metadata', record)  # Handle both formats
    text_for_embedding = f"""
    Position: {metadata.get('fen', 'N/A')}
    Move: {metadata.get('move', 'N/A')}
    Commentary: {metadata.get('commentary', 'N/A')}
    Phase: {metadata.get('phase', 'N/A')}
    Skill Category: {metadata.get('skill_category', 'N/A')}
    Sub-skill: {metadata.get('sub_skill', 'N/A')}
    Opening: {metadata.get('opening_name', 'N/A')}
    """
    
    # Get embedding
    embedding = get_embedding(text_for_embedding.strip())
    
    # Create enhanced metadata with all required fields
    enhanced_metadata = {
        'user_id': metadata.get('user_id', ''),
        'game_id': metadata.get('game_id', ''),
        'color': metadata.get('color', ''),
        'opponent_rating': metadata.get('opponent_rating', 0),
        'user_rating': metadata.get('user_rating', 0),
        'result': metadata.get('result', ''),
        'timestamp': metadata.get('timestamp', ''),
        'source': metadata.get('source', 'chess.com'),
        'move_number': metadata.get('move_number', 0),
        'fen': metadata.get('fen', ''),
        'move': metadata.get('move', ''),
        'eval_score': metadata.get('eval_score', 0.0),
        'stockfish_best': metadata.get('stockfish_best', ''),
        'delta_cp': metadata.get('delta_cp', 0.0),
        'accuracy_class': metadata.get('accuracy_class', ''),
        'phase': metadata.get('phase', ''),
        'skill_category': metadata.get('skill_category', ''),
        'sub_skill': metadata.get('sub_skill', ''),
        'score_impact': metadata.get('score_impact', 0),
        'commentary': metadata.get('commentary', ''),
        'opening_name': metadata.get('opening_name', ''),
        'eco_code': metadata.get('eco_code', ''),
        'is_tactical_puzzle': metadata.get('is_tactical_puzzle', False)
    }

    # Ensure all metadata values are valid types for Pinecone
    for k, v in list(enhanced_metadata.items()):
        if isinstance(v, (dict, list)):
            enhanced_metadata[k] = json.dumps(v)

    return {
        "id": record.get("id", f"{metadata.get('user_id', '')}_{metadata.get('game_id', '')}_{metadata.get('move_number', 0)}"),
        "values": embedding,
        "metadata": enhanced_metadata
    }

def upload_supabase_game_to_pinecone(game_data: Dict, index_name: str = PINECONE_INDEX_NAME) -> int:
    """
    Upload a game from Supabase to Pinecone, converting key_moments to individual vectors.
    
    Args:
        game_data (Dict): Game data from Supabase game_analysis table
        index_name (str): Name of the Pinecone index
        
    Returns:
        int: Number of vectors uploaded
    """
    index = pc.Index(index_name)
    
    # Parse key_moments if it's a string
    key_moments = game_data.get('key_moments', [])
    if isinstance(key_moments, str):
        try:
            key_moments = json.loads(key_moments)
        except json.JSONDecodeError:
            print(f"Failed to parse key_moments for game {game_data.get('id')}")
            return 0
    
    if not key_moments:
        print(f"No key moments found for game {game_data.get('id')}")
        return 0
    
    # Prepare vectors for each moment
    vectors = []
    for i, moment in enumerate(key_moments):
        try:
            vector = prepare_vector_from_supabase_game(game_data, moment, i)
            # Validate embedding dimensions
            if len(vector['values']) != EMBEDDING_DIMENSIONS:
                print(f"Warning: Embedding dimension mismatch for moment {i}. Expected {EMBEDDING_DIMENSIONS}, got {len(vector['values'])}")
                # Pad or truncate as needed
                if len(vector['values']) < EMBEDDING_DIMENSIONS:
                    vector['values'].extend([0.0] * (EMBEDDING_DIMENSIONS - len(vector['values'])))
                else:
                    vector['values'] = vector['values'][:EMBEDDING_DIMENSIONS]
            vectors.append(vector)
        except Exception as e:
            print(f"Error preparing vector for moment {i} in game {game_data.get('id')}: {e}")
    
    if not vectors:
        return 0
    
    # Upload in batches of 100
    batch_size = 100
    uploaded_count = 0
    
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        try:
            index.upsert(vectors=batch)
            uploaded_count += len(batch)
            print(f"Uploaded batch {i//batch_size + 1} of {(len(vectors) + batch_size - 1)//batch_size} ({len(batch)} vectors)")
        except Exception as e:
            print(f"Error uploading batch {i//batch_size + 1}: {e}")
    
    return uploaded_count

def upload_to_pinecone(records: List[Dict], index_name: str = PINECONE_INDEX_NAME):
    """
    Upload records to Pinecone (legacy function for backward compatibility).
    
    Args:
        records (List[Dict]): List of records to upload
        index_name (str): Name of the Pinecone index
    """
    # Get the index
    index = pc.Index(index_name)
    
    # Prepare records for upload
    vectors = [prepare_vector_record(record) for record in records]
    
    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i//batch_size + 1} of {(len(vectors) + batch_size - 1)//batch_size}")

def process_study_file(file_path: str):
    """
    Process a study file and upload its contents to Pinecone.
    
    Args:
        file_path (str): Path to the study file
    """
    try:
        with open(file_path, 'r') as f:
            study_data = json.load(f)
        
        # Extract records from the study data
        records = []
        for chapter in study_data.get('chapters', []):
            for node in chapter.get('nodes', []):
                # Convert null values to empty strings for metadata
                record = {
                    "id": f"{study_data['id']}_{chapter['name']}_{node['node_index']}",
                    "metadata": {
                        "fen": node['fen'],
                        "comment": node.get('comment') or "",
                        "move": node.get('move') or "",
                        "chapter": chapter['name'],
                        "study_url": study_data['url'],
                        "chapter_url": chapter['url'],
                        "skill": node.get('skill') or "",
                        "sub_skill": node.get('sub_skill') or "",
                        "phase": node.get('phase') or ""
                    }
                }
                records.append(record)
        
        # Upload to Pinecone
        upload_to_pinecone(records)
        print(f"Successfully processed and uploaded {len(records)} positions")
        
    except Exception as e:
        print(f"Error processing study file: {e}")
        if hasattr(e, 'response'):
            print(f"HTTP response headers: {e.response.headers}")
            print(f"HTTP response body: {e.response.text}")

def query_vector_db(
    query_text: str,
    user_id: str = None,
    skill_category: str = None,
    phase: str = None,
    top_k: int = 10,
    index_name: str = PINECONE_INDEX_NAME
) -> List[Dict]:
    """
    Query the vector database with optional filters.
    
    Args:
        query_text (str): The text to search for
        user_id (str, optional): Filter by user ID
        skill_category (str, optional): Filter by skill category
        phase (str, optional): Filter by game phase
        top_k (int): Number of results to return
        index_name (str): Name of the Pinecone index
        
    Returns:
        List[Dict]: List of matching records with their metadata
    """
    # Get the index
    index = pc.Index(index_name)
    
    # Get embedding for the query text
    query_embedding = get_embedding(query_text)
    
    # Prepare filter
    filter_dict = {}
    if user_id:
        filter_dict['user_id'] = user_id
    if skill_category:
        filter_dict['skill_category'] = skill_category
    if phase:
        filter_dict['phase'] = phase
    
    # Query the index
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter_dict if filter_dict else None
    )
    
    return results.matches

def test_vector_db_connection():
    """
    Test the connection to the new vector database.
    """
    try:
        index = pc.Index(PINECONE_INDEX_NAME)
        stats = index.describe_index_stats()
        print(f"✅ Successfully connected to Pinecone index: {PINECONE_INDEX_NAME}")
        print(f"Index stats: {stats}")
        
        # Test embedding generation
        test_text = "This is a test position in chess with a tactical opportunity"
        embedding = get_embedding(test_text)
        print(f"✅ Successfully generated embedding with {len(embedding)} dimensions")
        
        return True
    except Exception as e:
        print(f"❌ Error connecting to vector database: {e}")
        return False

if __name__ == "__main__":
    # Test the new vector DB configuration
    print("Testing new Pinecone Vector DB configuration...")
    test_vector_db_connection() 