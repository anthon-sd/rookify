from dataclasses import dataclass
from typing import List, Dict, Optional
import re
from datetime import datetime

@dataclass
class GameMetadata:
    event: str
    site: str
    date: str
    round: str
    white: str
    black: str
    result: str
    current_position: str
    timezone: str
    eco: str
    eco_url: str
    utc_date: str
    utc_time: str
    white_elo: int
    black_elo: int
    time_control: str
    termination: str
    start_time: str
    end_date: str
    end_time: str
    link: str

@dataclass
class Move:
    move_number: int
    white_move: str
    white_clock: str
    black_move: Optional[str] = None
    black_clock: Optional[str] = None

class PGNParser:
    def __init__(self, pgn_text: str):
        self.pgn_text = pgn_text
        self.metadata: Optional[GameMetadata] = None
        self.moves: List[Move] = []

    def parse(self) -> tuple[GameMetadata, List[Move]]:
        """Parse the PGN text into metadata and moves."""
        # Split the PGN into metadata and moves sections
        sections = self.pgn_text.split('\n\n')
        metadata_text = sections[0]
        moves_text = sections[1] if len(sections) > 1 else ""

        # Parse metadata
        self.metadata = self._parse_metadata(metadata_text)
        
        # Parse moves
        self.moves = self._parse_moves(moves_text)

        return self.metadata, self.moves

    def _parse_metadata(self, metadata_text: str) -> GameMetadata:
        """Parse the metadata section of the PGN."""
        metadata_dict = {}
        
        # Extract metadata using regex
        pattern = r'\[(\w+)\s+"([^"]*)"\]'
        matches = re.findall(pattern, metadata_text)
        
        # Field name mapping
        field_mapping = {
            'Event': 'event',
            'Site': 'site',
            'Date': 'date',
            'Round': 'round',
            'White': 'white',
            'Black': 'black',
            'Result': 'result',
            'CurrentPosition': 'current_position',
            'Timezone': 'timezone',
            'ECO': 'eco',
            'ECOUrl': 'eco_url',
            'UTCDate': 'utc_date',
            'UTCTime': 'utc_time',
            'WhiteElo': 'white_elo',
            'BlackElo': 'black_elo',
            'TimeControl': 'time_control',
            'Termination': 'termination',
            'StartTime': 'start_time',
            'EndDate': 'end_date',
            'EndTime': 'end_time',
            'Link': 'link'
        }
        
        for key, value in matches:
            # Convert numeric values
            if key in ['WhiteElo', 'BlackElo']:
                value = int(value)
            # Map the field name to the correct case
            if key in field_mapping:
                metadata_dict[field_mapping[key]] = value

        return GameMetadata(**metadata_dict)

    def _parse_moves(self, moves_text: str) -> List[Move]:
        """Parse the moves section of the PGN."""
        moves = []
        # This regex will match both white and black moves with clocks, handling '...' for black
        move_entries = re.findall(r'(\d+)\.\s*([^\s]+)\s*\{([^}]*)\}\s*(?:\d+\.\.\.\s*([^\s]+)\s*\{([^}]*)\})?', moves_text)
        for entry in move_entries:
            move_number = int(entry[0])
            white_move = entry[1]
            white_clock = entry[2]
            black_move = entry[3] if entry[3] else None
            black_clock = entry[4] if entry[4] else None
            move = Move(
                move_number=move_number,
                white_move=white_move,
                white_clock=white_clock,
                black_move=black_move,
                black_clock=black_clock
            )
            moves.append(move)
        return moves

def parse_pgn(pgn_text: str) -> tuple[GameMetadata, List[Move]]:
    """Convenience function to parse PGN text."""
    parser = PGNParser(pgn_text)
    return parser.parse() 