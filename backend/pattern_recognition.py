from typing import List, Dict, Tuple, Optional, Set
import chess
import chess.engine
import re
from dataclasses import dataclass
from enum import Enum
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PatternType(Enum):
    TACTICAL = "tactical"
    STRATEGIC = "strategic"
    POSITIONAL = "positional"
    OPENING = "opening"
    ENDGAME = "endgame"

@dataclass(frozen=True)
class Pattern:
    type: PatternType
    name: str
    description: str
    confidence: float
    phase: str
    related_skills: Tuple[Tuple[str, str], ...]

class PatternRecognizer:
    def __init__(self):
        self.patterns = self._initialize_patterns()
        self.engine = None
        self.stockfish_path = os.getenv('STOCKFISH_PATH', '/usr/games/stockfish')
        self.analysis_depth = 15  # Default analysis depth

    def _get_engine(self) -> chess.engine.SimpleEngine:
        """Get or create a Stockfish engine instance."""
        if self.engine is None:
            self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)
        return self.engine

    def _analyze_with_stockfish(self, board: chess.Board, depth: int = None) -> Dict:
        """Analyze position with Stockfish."""
        engine = self._get_engine()
        depth = depth or self.analysis_depth
        
        # Get the best move and evaluation
        info = engine.analyse(board, chess.engine.Limit(depth=depth))
        
        score = info.get('score', None)
        
        return {
            'best_move': info.get('pv', [None])[0],
            'evaluation': score,
            'depth': info.get('depth', 0)
        }

    def _initialize_patterns(self) -> List[Pattern]:
        """Initialize the list of patterns to recognize."""
        return [
            # Tactical Patterns
            Pattern(
                PatternType.TACTICAL,
                "Fork",
                "A move that attacks two or more pieces simultaneously",
                0.9,
                "All",
                (("Basic tactics", "Knight forks"), ("Basic tactics", "Pawn forks"), ("Basic tactics", "Queen forks"))
            ),
            Pattern(
                PatternType.TACTICAL,
                "Pin",
                "A piece is pinned when it cannot move without exposing a more valuable piece",
                0.9,
                "All",
                (("Basic tactics", "Pins"),)
            ),
            Pattern(
                PatternType.TACTICAL,
                "Skewer",
                "A move that forces a valuable piece to move, exposing a less valuable piece behind it",
                0.9,
                "All",
                (("Basic tactics", "Skewers"),)
            ),
            
            # Strategic Patterns
            Pattern(
                PatternType.STRATEGIC,
                "Knight Outpost",
                "A knight on an advanced square that cannot be attacked by enemy pawns",
                0.9,
                "Middlegame",
                (("Basic positional ideas", "Holes/outposts"),)
            ),
            Pattern(
                PatternType.STRATEGIC,
                "Bad Bishop",
                "A bishop that is blocked by its own pawns",
                0.8,
                "Middlegame",
                (("Basic positional ideas", "Good vs bad bishops"),)
            ),
            
            # Positional Patterns
            Pattern(
                PatternType.POSITIONAL,
                "Isolated Pawn",
                "A pawn with no friendly pawns on adjacent files",
                0.9,
                "All",
                (("Pawn structures", "Isolated pawns"),)
            ),
            Pattern(
                PatternType.POSITIONAL,
                "Doubled Pawns",
                "Two pawns of the same color on the same file",
                0.9,
                "All",
                (("Pawn structures", "Doubled pawns"),)
            ),
            
            # Opening Patterns
            Pattern(
                PatternType.OPENING,
                "Fianchetto",
                "Development of a bishop to b2/g2 (White) or b7/g7 (Black)",
                0.9,
                "Opening",
                (("Very basic opening principles", "Fianchetto"),)
            ),
            
            # Endgame Patterns
            Pattern(
                PatternType.ENDGAME,
                "Opposition",
                "Kings facing each other with one square between them",
                0.9,
                "Endgame",
                (("Basic endgame ideas", "King and pawn endgames"),)
            )
        ]

    def analyze_position(self, board: chess.Board) -> List[Pattern]:
        """Analyze a position for patterns."""
        found_patterns = set()  # Use a set to avoid duplicates
        
        # Analyze tactical patterns
        tactical_patterns = self._analyze_tactical_patterns(board)
        found_patterns.update(tactical_patterns)
        
        # Analyze strategic patterns
        strategic_patterns = self._analyze_strategic_patterns(board)
        found_patterns.update(strategic_patterns)
        
        # Analyze positional patterns
        positional_patterns = self._analyze_positional_patterns(board)
        found_patterns.update(positional_patterns)
        
        # Analyze phase-specific patterns
        phase_patterns = self._analyze_phase_patterns(board)
        found_patterns.update(phase_patterns)
        
        return list(found_patterns)

    def _analyze_tactical_patterns(self, board: chess.Board) -> Set[Pattern]:
        """Analyze the position for tactical patterns."""
        patterns = set()
        
        # Check for forks
        if self._has_fork(board):
            patterns.add(next(p for p in self.patterns if p.name == "Fork"))
        
        # Check for pins
        if self._has_pin(board):
            patterns.add(next(p for p in self.patterns if p.name == "Pin"))
        
        # Check for skewers
        if self._has_skewer(board):
            patterns.add(next(p for p in self.patterns if p.name == "Skewer"))
        
        return patterns

    def _analyze_strategic_patterns(self, board: chess.Board) -> Set[Pattern]:
        """Analyze the position for strategic patterns."""
        patterns = set()
        
        # Check for knight outposts
        if self._has_knight_outpost(board):
            patterns.add(next(p for p in self.patterns if p.name == "Knight Outpost"))
        
        # Check for bad bishops
        if self._has_bad_bishop(board):
            patterns.add(next(p for p in self.patterns if p.name == "Bad Bishop"))
        
        return patterns

    def _analyze_positional_patterns(self, board: chess.Board) -> Set[Pattern]:
        """Analyze the position for positional patterns."""
        patterns = set()
        
        # Check for isolated pawns
        if self._has_isolated_pawns(board):
            patterns.add(next(p for p in self.patterns if p.name == "Isolated Pawn"))
        
        # Check for doubled pawns
        if self._has_doubled_pawns(board):
            patterns.add(next(p for p in self.patterns if p.name == "Doubled Pawns"))
        
        return patterns

    def _analyze_phase_patterns(self, board: chess.Board) -> Set[Pattern]:
        """Analyze the position for phase-specific patterns."""
        patterns = set()
        
        # Check for opening patterns
        if self._is_opening_position(board):
            if self._has_fianchetto(board):
                patterns.add(next(p for p in self.patterns if p.name == "Fianchetto"))
        
        # Check for endgame patterns
        if self._is_endgame_position(board):
            if self._has_opposition(board):
                patterns.add(next(p for p in self.patterns if p.name == "Opposition"))
        
        return patterns

    def _has_fork(self, board: chess.Board) -> bool:
        """Check if there is a fork in the position using both rule-based and Stockfish analysis."""
        # First check with rule-based approach
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None:
                continue
            
            # Get all legal moves for this piece
            for move in board.legal_moves:
                if move.from_square == square:
                    # Make the move
                    board.push(move)
                    # Count attacked pieces
                    attacked_pieces = len([sq for sq in chess.SQUARES 
                                        if board.is_attacked_by(piece.color, sq)])
                    # Undo the move
                    board.pop()
                    
                    if attacked_pieces >= 2:
                        # Verify with Stockfish
                        analysis = self._analyze_with_stockfish(board)
                        if analysis['best_move'] == move:
                            return True
        return False
    
    def _has_pin(self, board: chess.Board) -> bool:
        """Check if there is a pin in the position using both rule-based and Stockfish analysis."""
        # First check with rule-based approach
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None or piece.piece_type == chess.KING:
                continue
            
            # Check if piece is pinned
            if board.is_pinned(piece.color, square):
                # Verify with Stockfish
                analysis = self._analyze_with_stockfish(board)
                if analysis['evaluation'].relative.score() > 100:  # Significant advantage
                    return True
        return False
    
    def _has_skewer(self, board: chess.Board) -> bool:
        """Check if there is a skewer in the position using both rule-based and Stockfish analysis."""
        # First check with rule-based approach
        # For each attacker, check if it attacks a piece and there is a more valuable piece behind it
        for attacker_square in chess.SQUARES:
            attacker = board.piece_at(attacker_square)
            if attacker is None or attacker.piece_type not in [chess.BISHOP, chess.ROOK, chess.QUEEN]:
                continue
            for direction in [chess.square(1, 0), chess.square(0, 1), chess.square(-1, 0), chess.square(0, -1),
                              chess.square(1, 1), chess.square(-1, 1), chess.square(1, -1), chess.square(-1, -1)]:
                ray = []
                sq = attacker_square
                while True:
                    sq = chess.square_mirror(sq + direction)
                    if not chess.SQUARES.__contains__(sq):
                        break
                    piece = board.piece_at(sq)
                    if piece:
                        ray.append((sq, piece))
                        if len(ray) == 2:
                            # Check if the first is less valuable than the second (skewer)
                            if piece.color != attacker.color and ray[0][1].color != attacker.color:
                                if self._piece_value(ray[0][1].piece_type) < self._piece_value(ray[1][1].piece_type):
                                    # Optionally verify with Stockfish
                                    analysis = self._analyze_with_stockfish(board)
                                    if analysis['evaluation'] and analysis['evaluation'].relative.score(mate_score=100000) > 100:
                                        return True
                            break
                # End of direction
        return False

    def _piece_value(self, piece_type):
        # Standard piece values
        return {
            chess.PAWN: 1,
            chess.KNIGHT: 3,
            chess.BISHOP: 3,
            chess.ROOK: 5,
            chess.QUEEN: 9,
            chess.KING: 100
        }.get(piece_type, 0)
    
    def _has_knight_outpost(self, board: chess.Board) -> bool:
        """Check if there is a knight outpost using both rule-based and Stockfish analysis."""
        # First check with rule-based approach
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None or piece.piece_type != chess.KNIGHT:
                continue
            
            # Check if knight is on an advanced square
            rank = chess.square_rank(square)
            if (piece.color == chess.WHITE and rank >= 4) or \
               (piece.color == chess.BLACK and rank <= 3):
                # Check if it's protected and can't be attacked by pawns
                if board.is_attacked_by(piece.color, square) and \
                   not any(board.is_attacked_by(not piece.color, square) for _ in range(2)):
                    # Verify with Stockfish
                    analysis = self._analyze_with_stockfish(board)
                    if analysis['evaluation'].relative.score() > 50:  # Slight advantage
                        return True
        return False
    
    def _has_bad_bishop(self, board: chess.Board) -> bool:
        """Check if there is a bad bishop using both rule-based and Stockfish analysis."""
        # First check with rule-based approach
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None or piece.piece_type != chess.BISHOP:
                continue
            
            # Check if bishop is blocked by own pawns
            file = chess.square_file(square)
            rank = chess.square_rank(square)
            if piece.color == chess.WHITE:
                if any(board.piece_at(chess.square(file, r)) for r in range(rank + 1, 8)):
                    # Verify with Stockfish
                    analysis = self._analyze_with_stockfish(board)
                    if analysis['evaluation'].relative.score() < -50:  # Slight disadvantage
                        return True
            else:
                if any(board.piece_at(chess.square(file, r)) for r in range(0, rank)):
                    # Verify with Stockfish
                    analysis = self._analyze_with_stockfish(board)
                    if analysis['evaluation'].relative.score() > 50:  # Slight advantage for opponent
                        return True
        return False
    
    def _has_isolated_pawns(self, board: chess.Board) -> bool:
        """Check if there are isolated pawns in the position."""
        for file in range(8):
            for color in [chess.WHITE, chess.BLACK]:
                has_pawn = False
                has_adjacent_pawn = False
                
                # Check current file
                for rank in range(8):
                    square = chess.square(file, rank)
                    piece = board.piece_at(square)
                    if piece and piece.piece_type == chess.PAWN and piece.color == color:
                        has_pawn = True
                        break
                
                # Check adjacent files
                for adj_file in [file - 1, file + 1]:
                    if 0 <= adj_file < 8:
                        for rank in range(8):
                            square = chess.square(adj_file, rank)
                            piece = board.piece_at(square)
                            if piece and piece.piece_type == chess.PAWN and piece.color == color:
                                has_adjacent_pawn = True
                                break
                
                if has_pawn and not has_adjacent_pawn:
                    return True
        return False
    
    def _has_doubled_pawns(self, board: chess.Board) -> bool:
        """Check if there are doubled pawns in the position."""
        for file in range(8):
            pawn_count = 0
            for rank in range(8):
                square = chess.square(file, rank)
                piece = board.piece_at(square)
                if piece and piece.piece_type == chess.PAWN:
                    pawn_count += 1
            
            if pawn_count >= 2:
                return True
        return False
    
    def _is_opening_position(self, board: chess.Board) -> bool:
        """Check if the position is in the opening phase."""
        return board.fullmove_number <= 10

    def _is_endgame_position(self, board: chess.Board) -> bool:
        """Check if the position is in the endgame phase."""
        return len(board.piece_map()) <= 10

    def _has_fianchetto(self, board: chess.Board) -> bool:
        """Check if there is a fianchetto in the position."""
        for color in [chess.WHITE, chess.BLACK]:
            for square in [chess.B2, chess.G2] if color == chess.WHITE else [chess.B7, chess.G7]:
                piece = board.piece_at(square)
                if piece and piece.piece_type == chess.BISHOP and piece.color == color:
                    return True
        return False
    
    def _has_opposition(self, board: chess.Board) -> bool:
        """Check if there is opposition in the position."""
        if len(board.piece_map()) <= 4:  # Simple endgame
            white_king = None
            black_king = None
            
            for square, piece in board.piece_map().items():
                if piece.piece_type == chess.KING:
                    if piece.color == chess.WHITE:
                        white_king = square
                    else:
                        black_king = square
            
            if white_king and black_king:
                white_rank = chess.square_rank(white_king)
                black_rank = chess.square_rank(black_king)
                white_file = chess.square_file(white_king)
                black_file = chess.square_file(black_king)
                
                if abs(white_rank - black_rank) == 1 and white_file == black_file:
                    return True
        return False

    def get_pattern_confidence(self, pattern: Pattern, board: chess.Board) -> float:
        """Calculate the confidence score for a pattern in the given position."""
        base_confidence = pattern.confidence
        
        # Get Stockfish analysis
        analysis = self._analyze_with_stockfish(board)
        score_obj = analysis['evaluation']
        if score_obj is not None:
            eval_score = score_obj.relative.score(mate_score=100000)
        else:
            eval_score = 0
        
        # Adjust confidence based on pattern type and evaluation
        if pattern.type == PatternType.TACTICAL:
            if abs(eval_score) > 200:
                return min(base_confidence + 0.2, 1.0)
            elif abs(eval_score) > 100:
                return min(base_confidence + 0.1, 1.0)
            return base_confidence
        elif pattern.type == PatternType.STRATEGIC:
            if abs(eval_score) > 100:
                return min(base_confidence + 0.1, 1.0)
            return max(base_confidence - 0.1, 0.0)
        elif pattern.type == PatternType.POSITIONAL:
            return base_confidence
        elif pattern.type == PatternType.OPENING:
            return min(base_confidence + 0.1, 1.0)
        elif pattern.type == PatternType.ENDGAME:
            return base_confidence
        
        return base_confidence

    def __del__(self):
        """Clean up the engine when the object is destroyed."""
        if self.engine:
            self.engine.quit() 