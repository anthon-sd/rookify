import requests
import json
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from urllib.parse import urljoin
from chess_taxonomy import map_to_taxonomy
from dotenv import load_dotenv
import os

# Load environment variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

@dataclass
class ChessNode:
    fen: str
    comment: Optional[str]
    move: Optional[str]
    node_index: int
    skill: Optional[str] = None
    sub_skill: Optional[str] = None
    phase: Optional[str] = None

@dataclass
class ChessChapter:
    name: str
    url: str
    nodes: List[ChessNode]

@dataclass
class ChessStudy:
    id: str
    url: str
    chapters: List[ChessChapter]

def fetch_lichess_study(study_id: str, access_token: str) -> Optional[str]:
    """
    Fetch a Lichess study by its ID in PGN format.
    
    Args:
        study_id (str): The ID of the Lichess study to fetch
        access_token (str): Your Lichess API access token
        
    Returns:
        str: The study data in PGN format
    """
    url = f"https://lichess.org/api/study/{study_id}.pgn"
    headers = {
        "Accept": "application/x-chess-pgn",
        "Authorization": f"Bearer {access_token}"
    }
    
    print(f"Fetching study from: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.text
        print(f"Received {len(data)} characters of data")
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching study: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response content: {e.response.text}")
        return None

def parse_pgn_metadata(line: str) -> Tuple[str, str]:
    """Parse a PGN metadata line into key-value pair."""
    if not (line.startswith('[') and line.endswith(']')):
        return None, None
    content = line.strip('[]')
    if ' ' not in content:
        return None, None
    key, value = content.split(' ', 1)
    return key, value.strip('"')

def parse_study_data(data: str, study_id: str) -> Optional[ChessStudy]:
    """
    Parse the PGN data into a structured ChessStudy object.
    
    Args:
        data (str): The PGN data from Lichess
        study_id (str): The study ID
        
    Returns:
        ChessStudy: Structured study data
    """
    if not data:
        return None

    study_url = f"https://lichess.org/study/{study_id}"
    chapters = []
    current_chapter = None
    current_nodes = []
    node_index = 0
    
    for line in data.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Check for new chapter
        if line.startswith('[Event'):
            # Save previous chapter if it exists
            if current_chapter is not None:
                chapters.append(ChessChapter(
                    name=current_chapter,
                    url=f"{study_url}/{current_chapter}",
                    nodes=current_nodes
                ))
            
            # Start new chapter
            current_chapter = None
            current_nodes = []
            node_index = 0
            
            # Parse chapter name from metadata
            key, value = parse_pgn_metadata(line)
            if key == 'Event':
                current_chapter = value
        
        # Parse FEN position
        elif line.startswith('[FEN'):
            key, value = parse_pgn_metadata(line)
            if key == 'FEN':
                # Create node with default skill values
                node = ChessNode(
                    fen=value,
                    comment=None,
                    move=None,
                    node_index=node_index
                )
                # Map to taxonomy if there's a comment
                if node.comment:
                    node.skill, node.sub_skill, node.phase = map_to_taxonomy(node.comment, current_chapter or "")
                current_nodes.append(node)
                node_index += 1
        
        # Parse comments
        elif line.startswith('{') and line.endswith('}'):
            if current_nodes:
                current_nodes[-1].comment = line.strip('{}')
                # Update taxonomy mapping when comment is added
                current_nodes[-1].skill, current_nodes[-1].sub_skill, current_nodes[-1].phase = map_to_taxonomy(
                    current_nodes[-1].comment, current_chapter or ""
                )
        
        # Parse moves
        elif not line.startswith('[') and current_nodes:
            current_nodes[-1].move = line
    
    # Add the last chapter
    if current_chapter is not None:
        chapters.append(ChessChapter(
            name=current_chapter,
            url=f"{study_url}/{current_chapter}",
            nodes=current_nodes
        ))
    
    return ChessStudy(
        id=study_id,
        url=study_url,
        chapters=chapters
    )

def create_vector_db_record(study: ChessStudy, node: ChessNode, chapter: ChessChapter) -> Dict:
    """
    Create a record for vector database storage.
    
    Args:
        study (ChessStudy): The study object
        node (ChessNode): The node to create a record for
        chapter (ChessChapter): The chapter containing the node
        
    Returns:
        Dict: Record ready for vector database
    """
    # Map the position to the chess taxonomy
    skill, sub_skill, phase = map_to_taxonomy(node.comment or "", chapter.name)
    
    return {
        "id": f"{study.id}_{chapter.name}_{node.node_index}",
        "metadata": {
            "fen": node.fen,
            "comment": node.comment,
            "move": node.move,
            "chapter": chapter.name,
            "study_url": study.url,
            "chapter_url": chapter.url,
            "skill": skill,
            "sub_skill": sub_skill,
            "phase": phase
        }
    }

def save_study_to_json(study: ChessStudy, output_file: str = "study_output.json"):
    """
    Save the study data to a JSON file.
    
    Args:
        study (ChessStudy): The study to save
        output_file (str): The output file path
    """
    study_dict = {
        "id": study.id,
        "url": study.url,
        "chapters": [
            {
                "name": chapter.name,
                "url": chapter.url,
                "nodes": [
                    {
                        "node_index": node.node_index,
                        "fen": node.fen,
                        "move": node.move,
                        "comment": node.comment,
                        "skill": node.skill,
                        "sub_skill": node.sub_skill,
                        "phase": node.phase
                    }
                    for node in chapter.nodes
                ]
            }
            for chapter in study.chapters
        ]
    }
    
    with open(output_file, 'w') as f:
        json.dump(study_dict, f, indent=2)
    print(f"Study data saved to {output_file}")

if __name__ == "__main__":
    # Example usage
    study_id = "kI8ikTU4"
    access_token = "lip_KCKTv1fQyRwSljyU5uTm"
    
    print(f"Attempting to fetch study with ID: {study_id}")
    data = fetch_lichess_study(study_id, access_token)
    
    if data:
        print("\nParsing study data...")
        study = parse_study_data(data, study_id)
        
        if study:
            print(f"\nStudy: {study.id}")
            print(f"URL: {study.url}")
            print(f"Number of chapters: {len(study.chapters)}")
            
            for chapter in study.chapters:
                print(f"\nChapter: {chapter.name}")
                print(f"URL: {chapter.url}")
                print(f"Number of positions: {len(chapter.nodes)}")
                
                for node in chapter.nodes:
                    print("\nPosition:")
                    print(f"FEN: {node.fen}")
                    if node.move:
                        print(f"Move: {node.move}")
                    if node.comment:
                        print(f"Comment: {node.comment}")
                    
                    # Create vector DB record
                    record = create_vector_db_record(study, node, chapter)
                    print("\nVector DB Record:")
                    print(json.dumps(record, indent=2))
            
            # After processing the study, save it to JSON
            save_study_to_json(study)
        else:
            print("Failed to parse study data")
    else:
        print("Failed to fetch study data. Please check the study ID and try again.")