from typing import Dict, List, Tuple, Optional
import re
import chess
from pattern_recognition import PatternRecognizer

# Chess taxonomy data structure
CHESS_TAXONOMY = {
    "Rules of the game": {
        "Board setup": "Opening",
        "Piece movements": "All",
        "Check, checkmate, stalemate": "All",
        "Castling": "Opening",
        "Promotion": "Endgame",
        "En passant": "All",
        "Notation": "All",
    },
    "Point value of pieces": {
        "Understand good vs bad trades": "All"
    },
    "Very basic opening principles": {
        "Control the center": "All",
        "Develop your pieces": "Opening",
        "Castle before move 10": "Opening",
        "Don't bring queen out early": "Opening"
    },
    "Types of pieces": {
        "Pawns": "All",
        "Minor pieces (knights+bishops)": "All",
        "Major pieces (queens + rooks)": "All"
    },
    "Blunder check": {
        "Check your king": "All",
        "Check opponent's king": "All",
        "Check your major/minor pieces": "All",
        "Check opponent's major/minor pieces": "All"
    },
    "Basic tactics": {
        "Knight forks": "All",
        "Pawn forks": "All",
        "Queen forks": "All",
        "Bishop pins": "All",
        "Rook pins": "All",
        "Back rank mate": "All"
    },
    "1 Move tactics": {
        "Mate-in-1's": "All",
        "1 move fork, pin, skewer, etc": "All"
    },
    "Basic endgame mates": {
        "King + Queen vs King mate": "Endgame",
        "King + Rook vs King mate": "Endgame"
    },
    "Basic endgame principles": {
        "Activate your king": "Endgame",
        "Create passed pawns": "Endgame",
        "Push passed pawns": "Endgame",
        "Watch out for opponent's passed pawns": "Endgame"
    },
    "Basic positional ideas": {
        "Holes/outposts": "Middlegame",
        "Good vs bad bishops": "Middlegame",
        "Weak squares": "Middlegame",
        "Weak vs safe king": "Middlegame",
        "Dominated knights": "Middlegame",
        "Rooks are good on 7th rank": "Endgame",
        "Rooks should go to open or half open files": "Middlegame"
    },
    "Very basic opening repertoire": {
        "Systems as white against black's 3 most common replies": "Opening",
        "System as black against e4": "Opening",
        "System as black against d4": "Opening"
    },
    "Basic opening ideas": {
        "Understand the key ideas with your white systems": "Opening",
        "Understand key ideas with black systems": "Opening"
    },
    "Intermediate tactics": {
        "Trapped piece": "All",
        "Batteries": "All",
        "Double checks": "All",
        "Discovered checks": "All",
        "Discovered Attacks": "All",
        "Deflection": "All",
        "Overloaded defender": "All",
        "Skewer": "All"
    },
    "2-3 move tactics": {
        "Mate-in-2's": "All",
        "Mate-in-3's": "All",
        "2 move combinations to win material": "All",
        "3 move combinations to win material": "All"
    },
    "Unbalanced trades": {
        "2 minor pieces vs rook+pawn": "All",
        "3 minor pieces vs queen": "All",
        "Minor piece + 2 pawns vs rook": "All",
        "2 rooks vs queen": "All",
        "Rook + bishop vs queen": "All",
        "Rook + knight vs queen": "All"
    },
    "King and pawn endgames": {
        "Opposition (what it is)": "Endgame",
        "King in the box (to catch pawns)": "Endgame",
        "King + pawn vs king (winning)": "Endgame",
        "King + pawn vs king (drawn)": "Endgame",
        "Opposition (when and how to use it)": "Endgame",
        "The power of passed pawns": "Endgame",
        "Crooked king path": "Endgame",
        "Zugzwang": "Endgame"
    },
    "Pawn structures": {
        "Pawn islands": "All",
        "Pawn chains": "All",
        "Passed pawns": "All",
        "Tripled pawns": "All",
        "Connected pawns": "All",
        "Isolated pawns": "All",
        "Doubled pawns": "All",
        "Backward pawns": "All",
        "Pawn majority vs pawn minority": "All"
    },
    "Mating patterns": {
        "Queen next to king": "All",
        "Back rank mate": "All",
        "Ladder mate": "All",
        "Lolli's mate": "All",
        "Damiano's mate": "All",
        "Dovetail + Swallow's tail mate": "All",
        "Epaulette mate": "All",
        "Greco's mate": "All",
        "Blind swine mate": "All",
        "Anastasia's mate": "All",
        "Hook mate": "All",
        "Opera's mate": "All",
        "Morphy and Pillsbury's mate": "All",
        "Vukovic's mate": "All",
        "Reti's mate": "All",
        "Boden's mate": "All",
        "Double bishop mate": "All",
        "Legal's mate": "All",
        "Knight and bishop combo mate": "All",
        "Smothered mate": "All"
    },
    "Understand how to defend your king against threats": {
        "Know when to NOT castle": "Middlegame",
        "Monitor opponent's queen carefully": "Middlegame",
        "Trading pieces": "Middlegame",
        "Plan BEFORE attack occurs": "Middlegame",
        "Counterattack!": "Middlegame",
        "Avoid open files on king": "Middlegame",
        "Consider ALL threats": "Middlegame",
        "f4/f5 idea on kingside castling": "Middlegame",
        "NOT capturing your opponent's pawn": "Middlegame"
    },
    "Attacking principles": {
        "Lead in development": "Middlegame",
        "Central control": "Middlegame",
        "Exposed enemy king": "Middlegame",
        "Tactics are required": "Middlegame",
        "Opposite side castling": "Middlegame",
        "Need advantages": "Middlegame",
        "Attack specific weaknesses": "Middlegame",
        "Have/create open lines": "Middlegame",
        "Remove key defenders": "Middlegame",
        "Momentum is important": "Middlegame",
        "Certain openings lead to more aggressive positions": "Middlegame",
        "Generally it's easier to attack than to defend": "Middlegame",
        "Have enough pieces": "Middlegame",
        "Use ALL your pieces": "Middlegame",
        "Sacrifice multiple pieces when necessary": "Middlegame",
        "Doesn't have to end in checkmate": "Middlegame",
        "Know ALL common mating patterns": "Middlegame"
    },
    "How to analyze your games": {
        "Know how to check databases for similar games": "All",
        "Know how to use stockfish to find mistakes": "All",
        "Fix opening problems and poor plans based on above analysis": "All"
    },
    "The process for making a good plan": {
        "Prioritize": "Middlegame",
        "Attack or defend?": "Middlegame",
        "Short-term vs Long-term": "Middlegame",
        "Easy to stop?": "Middlegame",
        "Multiple plans at the same time?": "Middlegame",
        "Specific tactics": "Middlegame"
    },
    "Mating nets": {
        "What is a mating net": "Middlegame",
        "The power of mating nets": "Middlegame",
        "How to recognize and set up mating nets in your games": "Middlegame"
    },
    "Understand all official rules for tournaments": {
        "Touch move": "All",
        "Notating on boards without coordinates": "All",
        "Understand different time controls": "All",
        "Know how to set your digital clock": "All",
        "Threefold repetition": "All",
        "Fifty-move rule": "All"
    },
    "Time management": {
        "Practice using time at the right moments in the game": "All"
    },
    "Intermediate positional ideas": {
        "Understand when to trade a knight for a bishop": "Middlegame",
        "Understand that moving pawns forward can create permanent weaknesses": "Middlegame",
        "Importance of blockading weak pawns (isolated, doubled, backward)": "Middlegame",
        "Exchange sacrifice": "Middlegame",
        "Weak color complex": "Middlegame",
        "Minority attack": "Middlegame"
    },
    "Intermediate endgame mates": {
        "King + 2 bishops vs king mate": "Endgame",
        "King + knight + bishop vs king mate": "Endgame"
    },
    "Intermediate rook endgames": {
        "King + Rook vs King + Pawn (how to stop the pawn)": "Endgame",
        "Importance of cutting off the king": "Endgame",
        "Lucena position": "Endgame",
        "Philidor position": "Endgame"
    },
    "Specific opening pawn structures": {
        "Caro formation": "Middlegame",
        "Slav formation": "Middlegame",
        "Sicilian - Scheveningen formation": "Middlegame",
        "Sicilian - Dragon formation": "Middlegame",
        "Boleslavsky hole formation": "Middlegame",
        "Maroczy Bind formation": "Middlegame",
        "Hedgehog formation": "Middlegame",
        "Rauzer formation": "Middlegame",
        "d5 chain formation": "Middlegame",
        "e5 chain formation": "Middlegame",
        "Modern Benoni formation": "Middlegame",
        "Isolated d pawn formation": "Middlegame",
        "Hanging pawns formation": "Middlegame",
        "Panov formation": "Middlegame",
        "Stonewall formation": "Middlegame",
        "Closed Sicilian formation": "Middlegame",
        "Botvinnik system formation": "Middlegame"
    },
    "Full opening repertoire": {
        "Complete lines with white until move 10 (approximately)": "Opening",
        "Complete lines with black until move 10 (approximately)": "Opening"
    },
    "Keep emotions under control": {
        "Fear/doubt": "All",
        "Overconfidence": "All",
        "Laziness": "All",
        "Tilt": "All"
    },
    "Queen + pawn endgames": {
        "Queen vs b,d,e or g pawns": "Endgame",
        "Queen vs a or h pawns": "Endgame",
        "Queen vs c or f pawns": "Endgame",
        "Queen vs Queen + pawn": "Endgame",
        "Queens with multiple pawns on the board": "Endgame"
    },
    "Bishop endgames": {
        "Opposite colored bishops": "Endgame",
        "Same colored bishops": "Endgame",
        "1 bishop vs 2 connected pawns": "Endgame",
        "Bishop + 1 pawn vs bishop (same color)": "Endgame",
        "Bishops and multiple pawns": "Endgame"
    },
    "Knight endgames": {
        "Knight vs outside passed pawn": "Endgame",
        "Knight vs center passed pawn": "Endgame",
        "Knight + pawn vs Knight": "Endgame",
        "Knight + extra pawn(s) vs knight and pawns": "Endgame"
    },
    "Minor piece endgames": {
        "Pawns on only one side of the board": "Endgame",
        "Pawns on both sides of the board": "Endgame",
        "Closed positions": "Endgame",
        "Open positions": "Endgame",
        "Knight vs bishop situations": "Endgame"
    },
    "Sacrifice ideas": {
        "Positional pawn sacrifice": "All",
        "f2/f7 piece sacrifice": "Middlegame",
        "Greek gift sacrifice": "Middlegame",
        "Nd5 piece sacrifice": "Middlegame",
        "Fishing pole sacrifice": "Middlegame"
    },
    "Advanced tactics": {
        "Mate-in-4 or more moves": "All",
        "4+ move combinations": "All",
        "Wide variety of tactical motifs": "All"
    },
    "Advanced endgames": {
        "King triangulation (losing a tempo)": "Endgame",
        "Stalemate ideas": "Endgame",
        "Queen + King vs Rook + King": "Endgame",
        "Queen + King vs Knight + King": "Endgame",
        "Rook + King vs Bishop + King": "Endgame",
        "Rook + King vs Knight + King": "Endgame",
        "Rook + Bishop + King vs Rook + King": "Endgame",
        "Rook + Knight + King vs Rook + King": "Endgame"
    },
    "In-depth opening knowledge": {
        "Complete lines with white until move 15-20 (approximately)": "Opening",
        "Complete lines with black until move 15-20 (approximately)": "Opening",
        "Up to date on current opening theory from top GM games": "Opening",
        "Understand long term ideas and plans behind all openings you play": "Opening",
        "Understand all resulting pawn structures from openings played": "Opening",
        "Understand complex transpositions from one line to another": "Opening"
    },
    "GM thought process": {
        "Evaluate positions properly": "All",
        "Only calculate each line once, but accurately": "All",
        "Choose the correct candidate moves": "All",
        "Eliminate bad moves quickly": "All",
        "Ability to separate long term positional ideas from short term concrete lines": "All"
    },
    "External factors": {
        "Enough sleep before and during tournaments": "All",
        "Healthy diet": "All",
        "Regular exercise": "All"
    }
}

def get_phase_from_taxonomy(skill: str, sub_skill: str) -> str:
    """Get the phase for a skill from the taxonomy."""
    return CHESS_TAXONOMY.get(skill, {}).get(sub_skill, "All")

def analyze_position_patterns(fen: str, move: str, eval_change: float) -> List[Tuple[str, str, float]]:
    """
    Analyze a position for patterns and map them to skills.
    
    Args:
        fen (str): FEN string of the position
        move (str): The move made
        eval_change (float): Change in evaluation
        
    Returns:
        List[Tuple[str, str, float]]: List of (skill, sub_skill, confidence) tuples
    """
    board = chess.Board(fen)
    pattern_recognizer = PatternRecognizer()
    
    # Get patterns from the position
    patterns = pattern_recognizer.analyze_position(board)
    
    # Map patterns to skills
    skill_matches = []
    for pattern in patterns:
        # Get confidence for this pattern in this position
        confidence = pattern_recognizer.get_pattern_confidence(pattern, board)
        
        # Add all related skills from the pattern
        for skill, sub_skill in pattern.related_skills:
            skill_matches.append((skill, sub_skill, confidence))
    
    return skill_matches

def find_matching_skills(
    comment: str,
    chapter_name: str,
    fen: str = None,
    move: str = None,
    eval_change: float = None
) -> List[Tuple[str, str, float]]:
    """
    Find matching skills based on commentary, position, and evaluation.
    
    Args:
        comment (str): Commentary about the position/move
        chapter_name (str): Name of the chapter/section
        fen (str, optional): FEN string of the position
        move (str, optional): The move made
        eval_change (float, optional): Change in evaluation
        
    Returns:
        List[Tuple[str, str, float]]: List of (skill, sub_skill, confidence) tuples
    """
    skill_matches = []
    
    # Get pattern-based matches if position information is available
    if fen and move:
        pattern_matches = analyze_position_patterns(fen, move, eval_change or 0)
        skill_matches.extend(pattern_matches)
    
    # Get text-based matches from commentary
    for skill, sub_skills in CHESS_TAXONOMY.items():
        for sub_skill in sub_skills:
            # Check if sub_skill is mentioned in the comment
            if sub_skill.lower() in comment.lower():
                # Calculate confidence based on context
                confidence = 0.7  # Base confidence
                
                # Increase confidence if the skill is mentioned in the chapter name
                if skill.lower() in chapter_name.lower():
                    confidence += 0.2
                
                # Adjust confidence based on evaluation change
                if eval_change is not None:
                    if abs(eval_change) > 300:  # Significant evaluation change
                        confidence += 0.1
                
                skill_matches.append((skill, sub_skill, min(confidence, 1.0)))
    
    return skill_matches

def map_to_taxonomy(
    comment: str,
    chapter_name: str,
    fen: str = None,
    move: str = None,
    eval_change: float = None
) -> List[Tuple[str, str, str, float]]:
    """
    Map a position/move to the chess taxonomy.
    
    Args:
        comment (str): Commentary about the position/move
        chapter_name (str): Name of the chapter/section
        fen (str, optional): FEN string of the position
        move (str, optional): The move made
        eval_change (float, optional): Change in evaluation
        
    Returns:
        List[Tuple[str, str, str, float]]: List of (skill, sub_skill, phase, confidence) tuples
    """
    skill_matches = find_matching_skills(comment, chapter_name, fen, move, eval_change)
    
    # Convert to final format with phases
    result = []
    for skill, sub_skill, confidence in skill_matches:
        phase = get_phase_from_taxonomy(skill, sub_skill)
        result.append((skill, sub_skill, phase, confidence))
    
    return result

def get_all_skills() -> List[str]:
    """Get all skill categories from the taxonomy."""
    return list(CHESS_TAXONOMY.keys())

def get_sub_skills(skill: str) -> List[str]:
    """Get all sub-skills for a given skill category."""
    return list(CHESS_TAXONOMY.get(skill, {}).keys())

def get_phase(skill: str, sub_skill: str) -> str:
    """Get the phase for a given skill and sub-skill."""
    return CHESS_TAXONOMY.get(skill, {}).get(sub_skill, "All") 