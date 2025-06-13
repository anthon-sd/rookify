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
        record (Dict): The record from lichess_study.py or game analysis
        
    Returns:
        Dict: Record ready for Pinecone
    """
    # Create a text representation for embedding
    metadata = record.get('metadata', record)  # Handle both formats
    text_for_embedding = f"""
    Position: {metadata.get('fen', metadata.get('position_fen', 'N/A'))}
    Move: {metadata.get('move', 'N/A')}
    Comment: {metadata.get('comment', metadata.get('commentary', 'N/A'))}
    Chapter: {metadata.get('chapter', 'N/A')}
    Skill: {metadata.get('skill', 'N/A')}
    Sub-skill: {metadata.get('sub_skill', 'N/A')}
    Phase: {metadata.get('phase', 'N/A')}
    """
    
    # Get embedding
    embedding = get_embedding(text_for_embedding)
    
    # Extract user_id from the record or use a default
    user_id = metadata.get('user_id', 'default')
    
    # Create enhanced metadata with additional fields
    enhanced_metadata = {
        **metadata,
        'user_id': user_id,
        'tag': metadata.get('tag', 'position'),
        'theme': metadata.get('theme', metadata.get('skill', '')),
        'timestamp': metadata.get('timestamp', ''),
        'rating': metadata.get('rating', ''),
        'source': metadata.get('source', 'game_analysis')
    }

    # Ensure all metadata values are valid types for Pinecone
    for k, v in list(enhanced_metadata.items()):
        if isinstance(v, (dict, list)):
            enhanced_metadata[k] = json.dumps(v)

    return {
        "id": record.get("id", f"{user_id}_{metadata.get('fen', metadata.get('position_fen', ''))}"),
        "values": embedding,
        "metadata": enhanced_metadata
    }

def upload_to_pinecone(records: List[Dict], index_name: str = "rookify-index"):
    """
    Upload records to Pinecone.
    
    Args:
        records (List[Dict]): List of records to upload
        index_name (str): Name of the Pinecone index
    """
    # Create index if it doesn't exist
    if index_name not in pc.list_indexes().names():
        pc.create_index(
            name=index_name,
            dimension=1536,  # Dimension for text-embedding-3-small
            metric="cosine",
            spec=ServerlessSpec(
                cloud='aws',
                region='us-west-2'
            )
        )
    
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
    tag: str = None,
    theme: str = None,
    top_k: int = 10,
    index_name: str = "rookify-index"
) -> List[Dict]:
    """
    Query the vector database with optional filters.
    
    Args:
        query_text (str): The text to search for
        user_id (str, optional): Filter by user ID
        tag (str, optional): Filter by tag (e.g., 'blunder', 'puzzle', 'game')
        theme (str, optional): Filter by theme (e.g., 'forks', 'endgame')
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
    if tag:
        filter_dict['tag'] = tag
    if theme:
        filter_dict['theme'] = theme
    
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