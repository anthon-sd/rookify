import os
import json
from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))

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
        record (Dict): The record from lichess_study.py
        
    Returns:
        Dict: Record ready for Pinecone
    """
    # Create a text representation for embedding
    text_for_embedding = f"""
    Position: {record['metadata']['fen']}
    Move: {record['metadata']['move'] or 'N/A'}
    Comment: {record['metadata']['comment'] or 'N/A'}
    Chapter: {record['metadata']['chapter']}
    Skill: {record['metadata']['skill']}
    Sub-skill: {record['metadata']['sub_skill']}
    Phase: {record['metadata']['phase']}
    """
    
    # Get embedding
    embedding = get_embedding(text_for_embedding)
    
    return {
        "id": record["id"],
        "values": embedding,
        "metadata": record["metadata"]
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

if __name__ == "__main__":
    # Example usage
    study_file = "study_output.json"  # This should be the output from lichess_study.py
    process_study_file(study_file) 