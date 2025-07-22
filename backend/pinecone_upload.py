import os
import json
import re
from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
from dotenv import load_dotenv
import uuid
from datetime import datetime
import requests
import chess

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

def extract_move_features(move_str: str, fen: str) -> Dict:
    """Extract enhanced move features from move string and position."""
    features = {
        'piece_moved': '',
        'move_type': 'quiet',
        'is_check': False,
        'is_capture': False,
        'is_castle': False,
        'is_promotion': False,
        'attacked_piece': '',
        'from_square': '',
        'to_square': '',
        'move_distance': 0
    }
    
    if not move_str or not fen:
        return features
    
    try:
        board = chess.Board(fen)
        move = chess.Move.from_uci(move_str)
        
        # Extract basic move info
        from_square = chess.square_name(move.from_square)
        to_square = chess.square_name(move.to_square)
        piece = board.piece_at(move.from_square)
        
        features['from_square'] = from_square
        features['to_square'] = to_square
        
        if piece:
            features['piece_moved'] = piece.symbol().lower()
            
            # Calculate move distance
            from_file, from_rank = chess.square_file(move.from_square), chess.square_rank(move.from_square)
            to_file, to_rank = chess.square_file(move.to_square), chess.square_rank(move.to_square)
            features['move_distance'] = max(abs(to_file - from_file), abs(to_rank - from_rank))
        
        # Check for capture
        if board.is_capture(move):
            features['is_capture'] = True
            features['move_type'] = 'capture'
            captured_piece = board.piece_at(move.to_square)
            if captured_piece:
                features['attacked_piece'] = captured_piece.symbol().lower()
        
        # Check for castling
        if board.is_castling(move):
            features['is_castle'] = True
            features['move_type'] = 'castle'
        
        # Check for promotion
        if move.promotion:
            features['is_promotion'] = True
            features['move_type'] = 'promotion'
        
        # Make the move to check for check
        board.push(move)
        if board.is_check():
            features['is_check'] = True
            if features['move_type'] == 'quiet':
                features['move_type'] = 'check'
        
    except Exception as e:
        print(f"Error extracting move features: {e}")
    
    return features

def get_enhanced_data_from_analysis(analysis_result: Dict) -> Dict:
    """Extract enhanced data from AI engine analysis result."""
    enhanced_data = analysis_result.get('enhanced_analysis', {})
    
    # Return the comprehensive analysis from AI engine
    return {
        'material_balance': enhanced_data.get('material_balance', 0.0),
        'king_safety_score': enhanced_data.get('king_safety', 0.5),
        'pawn_structure_score': enhanced_data.get('pawn_structure', 0.5),
        'piece_activity_score': enhanced_data.get('piece_activity', 0.5),
        'center_control_score': enhanced_data.get('center_control', 0.5),
        'position_complexity': enhanced_data.get('position_complexity', 0.5),
        'tactical_complexity': enhanced_data.get('tactical_complexity', 0.5),
        'threats_count': enhanced_data.get('threats_count', 0),
        'hanging_pieces': enhanced_data.get('hanging_pieces', []),
        'winning_probability': enhanced_data.get('winning_probability', 0.5),
        'drawing_probability': enhanced_data.get('drawing_probability', 0.0),
        'sharpness_score': enhanced_data.get('sharpness_score', 0.0),
        'eval_volatility': enhanced_data.get('eval_volatility', 0.0),
        'best_continuation': enhanced_data.get('best_continuation', []),
        'tactical_motifs': enhanced_data.get('tactical_motifs', []),
        'positional_themes': enhanced_data.get('positional_themes', []),
        'threat_patterns': enhanced_data.get('threat_patterns', []),
        'defensive_resources': enhanced_data.get('defensive_resources', []),
        'novelty_score': enhanced_data.get('novelty_score', 0.0),
        'position_frequency': enhanced_data.get('position_frequency', 0.0)
    }

def extract_time_data(commentary: str, move_number: int) -> Dict:
    """Extract time management data from commentary."""
    time_data = {
        'time_spent': 0.0,
        'time_remaining': 0.0,
        'time_pressure': False,
        'avg_time_per_move': 0.0,
        'time_percentile': 0.5,
        'clock_percentage_used': 0.0
    }
    
    if not commentary:
        return time_data
    
    try:
        # Extract clock time from chess.com format [%clk 0:14:27.8]
        clk_match = re.search(r'\[%clk (\d+):(\d+):(\d+)\.?(\d*)\]', commentary)
        if clk_match:
            hours, minutes, seconds, decimal = clk_match.groups()
            total_seconds = int(hours) * 3600 + int(minutes) * 60 + int(seconds)
            if decimal:
                total_seconds += float(f"0.{decimal}")
            time_data['time_remaining'] = total_seconds
            time_data['time_pressure'] = total_seconds < 60
    except Exception as e:
        print(f"Error extracting time data: {e}")
    
    return time_data

def extract_pattern_data_from_analysis(moment: Dict, enhanced_before: Dict, enhanced_after: Dict) -> Dict:
    """Extract tactical patterns and positional themes from Stockfish analysis."""
    patterns = {
        'tactical_motifs': enhanced_before.get('tactical_motifs', []),
        'positional_themes': enhanced_before.get('positional_themes', []),
        'mistake_pattern': '',
        'threat_patterns': enhanced_before.get('threat_patterns', []),
        'defensive_resources': enhanced_before.get('defensive_resources', [])
    }
    
    # Identify mistake patterns based on accuracy
    accuracy_class = moment.get('accuracy_class', '').lower()
    if accuracy_class in ['mistake', 'blunder', 'miss']:
        patterns['mistake_pattern'] = f"{accuracy_class}_move"
    
    # Add patterns from commentary as fallback
    commentary = moment.get('commentary', '').lower()
    if 'fork' in commentary and 'fork' not in patterns['tactical_motifs']:
        patterns['tactical_motifs'].append('fork')
    if 'pin' in commentary and 'pin' not in patterns['tactical_motifs']:
        patterns['tactical_motifs'].append('pin')
    if 'skewer' in commentary and 'skewer' not in patterns['tactical_motifs']:
        patterns['tactical_motifs'].append('skewer')
    
    return patterns

def calculate_learning_metrics(moment: Dict, user_rating: int) -> Dict:
    """Calculate learning analytics metrics."""
    metrics = {
        'improvement_priority': 5.0,
        'concept_tags': [],
        'difficulty_score': 0.5,
        'critical_moment': False,
        'learning_opportunity': '',
        'similar_position_count': 0
    }
    
    # Priority based on accuracy class
    accuracy_class = moment.get('accuracy_class', '').lower()
    if accuracy_class == 'blunder':
        metrics['improvement_priority'] = 10.0
        metrics['critical_moment'] = True
    elif accuracy_class == 'mistake':
        metrics['improvement_priority'] = 8.0
        metrics['critical_moment'] = True
    elif accuracy_class == 'miss':
        metrics['improvement_priority'] = 7.0
    
    # Learning opportunity based on skill category
    skill_category = moment.get('skill_category', '')
    sub_skill = moment.get('sub_skill', '')
    if skill_category and sub_skill:
        metrics['learning_opportunity'] = f"{sub_skill.lower()}_practice"
        metrics['concept_tags'] = [skill_category.lower(), sub_skill.lower()]
    
    return metrics

def calculate_historical_context_from_analysis(moment: Dict, game_data: Dict, move_number: int, enhanced_before: Dict) -> Dict:
    """Calculate historical context using real analysis data."""
    context = {
        'moves_since_theory': 0,
        'previous_move': '',
        'position_frequency': enhanced_before.get('position_frequency', 0.0),
        'novelty_score': enhanced_before.get('novelty_score', 0.0),
        'opening_deviation': False,
        'transition_move': False
    }
    
    # Estimate moves since theory based on move number and phase
    phase = moment.get('phase', '')
    if phase == 'middlegame' and move_number > 10:
        context['moves_since_theory'] = move_number - 10
    elif phase == 'endgame':
        context['moves_since_theory'] = move_number - 5
    
    # Detect phase transitions
    if move_number > 1:
        context['transition_move'] = phase in ['middlegame', 'endgame'] and move_number < 25
    
    # Opening deviation based on novelty score
    context['opening_deviation'] = enhanced_before.get('novelty_score', 0.0) > 0.3
    
    return context

def extract_enhanced_evaluation_from_analysis(moment: Dict, enhanced_before: Dict, enhanced_after: Dict) -> Dict:
    """Extract enhanced evaluation data from Stockfish analysis."""
    eval_data = {
        'eval_before': float(moment.get('eval_before', 0.0)),
        'eval_after': float(moment.get('eval_after', 0.0)),
        'winning_probability': enhanced_after.get('winning_probability', 0.5),
        'drawing_probability': enhanced_after.get('drawing_probability', 0.0),
        'sharpness_score': enhanced_before.get('sharpness_score', 0.0),
        'eval_volatility': enhanced_before.get('eval_volatility', 0.0),
        'best_continuation': enhanced_before.get('best_continuation', [])
    }
    
    # Fallback calculations if enhanced data not available
    if not enhanced_after and moment.get('eval_score'):
        eval_score = float(moment.get('eval_score', 0.0))
        eval_data['winning_probability'] = 1 / (1 + 10**(-eval_score/400))
    
    # Use stockfish best move as fallback
    if not eval_data['best_continuation']:
        best_move = moment.get('stockfish_best', '')
        if best_move:
            eval_data['best_continuation'] = [best_move]
    
    return eval_data

def calculate_personalization_metrics(user_id: str, moment: Dict) -> Dict:
    """Calculate personalization metrics (basic implementation)."""
    metrics = {
        'user_pattern_frequency': 0.0,
        'user_success_rate': 0.5,
        'typical_user_mistake': False,
        'personalized_difficulty': 0.5,
        'improvement_delta': 0.0,
        'last_seen_days_ago': 0
    }
    
    # Basic implementation - would be enhanced with actual user history
    accuracy_class = moment.get('accuracy_class', '').lower()
    if accuracy_class in ['mistake', 'blunder']:
        metrics['typical_user_mistake'] = True
    
    return metrics

def prepare_vector_from_supabase_game(game_data: Dict, moment: Dict, moment_index: int) -> Dict:
    """
    Prepare an enhanced vector record from Supabase game data and a specific moment.
    
    This function creates a comprehensive vector with enhanced metadata including:
    - Move features (piece type, move type, capture info, etc.)
    - Position complexity metrics (material balance, piece activity, etc.)
    - Time management data (time spent, pressure indicators)
    - Pattern recognition (tactical motifs, positional themes)
    - Learning analytics (improvement priority, difficulty scoring)
    - Historical context (theory deviation, position frequency)
    - Enhanced evaluation data (win probability, sharpness)
    - Personalization hooks (user patterns, success rates)
    
    Args:
        game_data (Dict): Game data from Supabase game_analysis table
        moment (Dict): Individual moment from key_moments JSONB
        moment_index (int): Index of the moment in the game
        
    Returns:
        Dict: Enhanced vector ready for Pinecone with comprehensive metadata
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
    
    # Extract enhanced features using helper functions and real analysis data
    move_str = moment.get('move', '')
    fen = moment.get('position_fen', '')
    move_number = int(moment.get('move_number', moment_index + 1))
    
    # Use real analysis data from Stockfish enhanced analysis
    enhanced_before = moment.get('enhanced_before', {})
    enhanced_after = moment.get('enhanced_after', {})
    
    move_features = extract_move_features(move_str, fen)
    time_data = extract_time_data(moment.get('commentary', ''), move_number)
    pattern_data = extract_pattern_data_from_analysis(moment, enhanced_before, enhanced_after)
    learning_data = calculate_learning_metrics(moment, user_rating)
    historical_data = calculate_historical_context_from_analysis(moment, game_data, move_number, enhanced_before)
    evaluation_data = extract_enhanced_evaluation_from_analysis(moment, enhanced_before, enhanced_after)
    personalization_data = calculate_personalization_metrics(game_data.get('user_id', ''), moment)
    
    # Extract position metrics from real Stockfish analysis
    position_metrics = {
        'material_balance': enhanced_before.get('material_balance', 0.0),
        'king_safety_score': enhanced_before.get('king_safety', 0.5),
        'pawn_structure_score': enhanced_before.get('pawn_structure', 0.5),
        'piece_activity_score': enhanced_before.get('piece_activity', 0.5),
        'center_control_score': enhanced_before.get('center_control', 0.5),
        'position_complexity': enhanced_before.get('position_complexity', 0.5),
        'tactical_complexity': enhanced_before.get('tactical_complexity', 0.5),
        'threats_count': enhanced_before.get('threats_count', 0),
        'hanging_pieces': enhanced_before.get('hanging_pieces', [])
    }
    
    # Create enhanced metadata compatible with Pinecone schema
    metadata = {
        # Existing core fields
        'user_id': str(game_data.get('user_id', '')),
        'game_id': str(game_data.get('game_id', game_data.get('id', ''))),
        'color': game_data.get('user_color', ''),
        'opponent_rating': int(opponent_rating) if opponent_rating else 0,
        'user_rating': int(user_rating) if user_rating else 0,
        'result': game_data.get('result', ''),
        'timestamp': game_data.get('game_timestamp', game_data.get('created_at', '')),
        'source': game_data.get('platform', 'chess.com'),
        'move_number': move_number,
        'fen': fen,
        'move': move_str,
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
        'is_brilliant': bool(moment.get('is_brilliant', False)),
        'is_great': bool(moment.get('is_great', False)),
        'game_url': game_data.get('game_url', ''),
        'supabase_game_id': str(game_data.get('id', '')),
        
        # Enhanced Move Features
        'piece_moved': move_features.get('piece_moved', ''),
        'move_type': move_features.get('move_type', ''),
        'is_check': bool(move_features.get('is_check', False)),
        'is_capture': bool(move_features.get('is_capture', False)),
        'is_castle': bool(move_features.get('is_castle', False)),
        'is_promotion': bool(move_features.get('is_promotion', False)),
        'attacked_piece': move_features.get('attacked_piece', ''),
        'from_square': move_features.get('from_square', ''),
        'to_square': move_features.get('to_square', ''),
        'move_distance': int(move_features.get('move_distance', 0)),
        
        # Position Complexity Metrics
        'material_balance': float(position_metrics.get('material_balance', 0.0)),
        'king_safety_score': float(position_metrics.get('king_safety_score', 0.5)),
        'pawn_structure_score': float(position_metrics.get('pawn_structure_score', 0.5)),
        'piece_activity_score': float(position_metrics.get('piece_activity_score', 0.5)),
        'center_control_score': float(position_metrics.get('center_control_score', 0.5)),
        'position_complexity': float(position_metrics.get('position_complexity', 0.5)),
        'tactical_complexity': float(position_metrics.get('tactical_complexity', 0.5)),
        'threats_count': int(position_metrics.get('threats_count', 0)),
        'hanging_pieces': json.dumps(position_metrics.get('hanging_pieces', [])),
        
        # Time Management Data
        'time_spent': float(time_data.get('time_spent', 0.0)),
        'time_remaining': float(time_data.get('time_remaining', 0.0)),
        'time_pressure': bool(time_data.get('time_pressure', False)),
        'avg_time_per_move': float(time_data.get('avg_time_per_move', 0.0)),
        'time_percentile': float(time_data.get('time_percentile', 0.5)),
        'clock_percentage_used': float(time_data.get('clock_percentage_used', 0.0)),
        
        # Enhanced Pattern Recognition
        'tactical_motifs': json.dumps(pattern_data.get('tactical_motifs', [])),
        'positional_themes': json.dumps(pattern_data.get('positional_themes', [])),
        'mistake_pattern': pattern_data.get('mistake_pattern', ''),
        'threat_patterns': json.dumps(pattern_data.get('threat_patterns', [])),
        'defensive_resources': json.dumps(pattern_data.get('defensive_resources', [])),
        
        # Learning Analytics
        'improvement_priority': float(learning_data.get('improvement_priority', 5.0)),
        'concept_tags': json.dumps(learning_data.get('concept_tags', [])),
        'difficulty_score': float(learning_data.get('difficulty_score', 0.5)),
        'critical_moment': bool(learning_data.get('critical_moment', False)),
        'learning_opportunity': learning_data.get('learning_opportunity', ''),
        'similar_position_count': int(learning_data.get('similar_position_count', 0)),
        
        # Historical Context
        'moves_since_theory': int(historical_data.get('moves_since_theory', 0)),
        'previous_move': historical_data.get('previous_move', ''),
        'position_frequency': float(historical_data.get('position_frequency', 0.0)),
        'novelty_score': float(historical_data.get('novelty_score', 0.0)),
        'opening_deviation': bool(historical_data.get('opening_deviation', False)),
        'transition_move': bool(historical_data.get('transition_move', False)),
        
        # Enhanced Evaluation Data
        'eval_before': float(evaluation_data.get('eval_before', 0.0)),
        'eval_after': float(evaluation_data.get('eval_after', 0.0)),
        'winning_probability': float(evaluation_data.get('winning_probability', 0.5)),
        'drawing_probability': float(evaluation_data.get('drawing_probability', 0.0)),
        'sharpness_score': float(evaluation_data.get('sharpness_score', 0.0)),
        'eval_volatility': float(evaluation_data.get('eval_volatility', 0.0)),
        'best_continuation': json.dumps(evaluation_data.get('best_continuation', [])),
        
        # Personalization Hooks
        'user_pattern_frequency': float(personalization_data.get('user_pattern_frequency', 0.0)),
        'user_success_rate': float(personalization_data.get('user_success_rate', 0.5)),
        'typical_user_mistake': bool(personalization_data.get('typical_user_mistake', False)),
        'personalized_difficulty': float(personalization_data.get('personalized_difficulty', 0.5)),
        'improvement_delta': float(personalization_data.get('improvement_delta', 0.0)),
        'last_seen_days_ago': int(personalization_data.get('last_seen_days_ago', 0))
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