import os
import json
from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Initialize Pinecone client
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def get_embedding(text: str) -> List[float]:
    """
    Get embedding for a text using OpenAI's API.
    
    Args:
        text (str): The text to get embedding for
        
    Returns:
        List[float]: The embedding vector
    """
    if not text:
        return []
        
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def prepare_vector_record(record: Dict) -> Dict:
    """
    Prepare a record for Pinecone by adding the embedding.
    
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
    embedding = get_embedding(text_for_embedding)
    
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

def upload_to_pinecone(records: List[Dict], index_name: str = "rookify-user-data"):
    """
    Upload records to Pinecone.
    
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
    index_name: str = "rookify-user-data"
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

if __name__ == "__main__":
    # Example usage
    study_file = "study_output.json"  # This should be the output from lichess_study.py
    process_study_file(study_file) 