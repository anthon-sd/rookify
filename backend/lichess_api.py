import requests
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
import chess.pgn
import io

class LichessAPI:
    def __init__(self, token: Optional[str] = None):
        """
        Initialize Lichess API client.
        Token is optional - only needed for accessing private user data.
        """
        self.base_url = "https://lichess.org/api"
        self.headers = {
            'Accept': 'application/x-ndjson'
        }
        if token:
            self.headers['Authorization'] = f'Bearer {token}'
    
    def get_user_games(
        self, 
        username: str, 
        max_games: int = 20,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        game_types: List[str] = ["blitz", "rapid", "classical"]
    ) -> List[Dict]:
        """
        Fetch user's games from Lichess.
        
        Args:
            username: Lichess username
            max_games: Maximum number of games to fetch
            since: Start date for games
            until: End date for games
            game_types: List of game types to include
            
        Returns:
            List of game dictionaries
        """
        params = {
            'max': max_games,
            'perfType': ','.join(game_types),
            'clocks': 'true',
            'evals': 'true',
            'opening': 'true'
        }
        
        if since:
            params['since'] = int(since.timestamp() * 1000)
        if until:
            params['until'] = int(until.timestamp() * 1000)
            
        response = requests.get(
            f"{self.base_url}/games/user/{username}",
            headers=self.headers,
            params=params,
            stream=True
        )
        response.raise_for_status()
        
        games = []
        for line in response.iter_lines():
            if line:
                game_data = json.loads(line)
                games.append(self._parse_game(game_data, username))
                
        return games
    
    def _parse_game(self, game_data: Dict, username: str) -> Dict:
        """Convert Lichess game format to our standard format."""
        # Determine user color
        white_user_data = game_data['players']['white'].get('user', {})
        black_user_data = game_data['players']['black'].get('user', {})
        white_user = white_user_data.get('name', '') if isinstance(white_user_data, dict) else ''
        black_user = black_user_data.get('name', '') if isinstance(black_user_data, dict) else ''
        is_white = white_user.lower() == username.lower()
        
        return {
            'url': f"https://lichess.org/{game_data['id']}",
            'pgn': self._build_pgn(game_data),
            'time_control': self._format_time_control(game_data.get('clock', {})),
            'end_time': game_data.get('lastMoveAt'),
            'rated': game_data.get('rated', False),
            'time_class': game_data.get('speed'),
            'rules': game_data.get('variant', 'standard'),
            'white': {
                'username': white_user,
                'rating': game_data['players']['white'].get('rating'),
                'result': self._get_result('white', game_data)
            },
            'black': {
                'username': black_user,
                'rating': game_data['players']['black'].get('rating'),
                'result': self._get_result('black', game_data)
            },
            'platform': 'lichess',
            'game_id': game_data['id'],
            'opening': game_data.get('opening', {}).get('name', '') if isinstance(game_data.get('opening'), dict) else '',
            'opening_eco': game_data.get('opening', {}).get('eco', '') if isinstance(game_data.get('opening'), dict) else '',
            'user_color': 'white' if is_white else 'black'
        }
    
    def _build_pgn(self, game_data: Dict) -> str:
        """Build PGN string from Lichess game data."""
        # Start with headers
        pgn_lines = []
        
        # Required PGN headers
        pgn_lines.append(f'[Event "Lichess {game_data.get("speed", "").title()}"]')
        pgn_lines.append(f'[Site "https://lichess.org/{game_data["id"]}"]')
        
        # Format date
        created_at = game_data.get('createdAt', 0)
        if created_at:
            date = datetime.fromtimestamp(created_at / 1000)
            pgn_lines.append(f'[Date "{date.strftime("%Y.%m.%d")}"]')
        else:
            pgn_lines.append('[Date "????.??.??"]')
        
        pgn_lines.append('[Round "-"]')
        
        # Players
        white_user = game_data['players']['white'].get('user', {})
        black_user = game_data['players']['black'].get('user', {})
        white_player = white_user.get('name', 'Anonymous') if isinstance(white_user, dict) else 'Anonymous'
        black_player = black_user.get('name', 'Anonymous') if isinstance(black_user, dict) else 'Anonymous'
        pgn_lines.append(f'[White "{white_player}"]')
        pgn_lines.append(f'[Black "{black_player}"]')
        
        # Result
        result = self._get_game_result(game_data)
        pgn_lines.append(f'[Result "{result}"]')
        
        # Additional headers
        if 'opening' in game_data and isinstance(game_data['opening'], dict):
            pgn_lines.append(f'[Opening "{game_data["opening"].get("name", "")}"]')
            pgn_lines.append(f'[ECO "{game_data["opening"].get("eco", "")}"]')
        
        # Time control
        if 'clock' in game_data:
            clock = game_data['clock']
            time_control = f"{clock.get('initial', 0)}+{clock.get('increment', 0)}"
            pgn_lines.append(f'[TimeControl "{time_control}"]')
        
        # Ratings
        white_rating = game_data['players']['white'].get('rating', '?')
        black_rating = game_data['players']['black'].get('rating', '?')
        pgn_lines.append(f'[WhiteElo "{white_rating}"]')
        pgn_lines.append(f'[BlackElo "{black_rating}"]')
        
        # Termination
        status = game_data.get('status', 'unknown')
        pgn_lines.append(f'[Termination "{status}"]')
        
        # Add empty line before moves
        pgn_lines.append('')
        
        # Add moves
        moves = game_data.get('moves', '')
        if moves:
            # Convert moves to standard PGN format
            move_list = moves.split()
            pgn_moves = []
            
            for i, move in enumerate(move_list):
                if i % 2 == 0:  # White move
                    move_number = (i // 2) + 1
                    pgn_moves.append(f"{move_number}.{move}")
                else:  # Black move
                    pgn_moves.append(move)
            
            # Join moves with spaces, add result
            moves_line = ' '.join(pgn_moves) + f' {result}'
            pgn_lines.append(moves_line)
        else:
            pgn_lines.append(result)
        
        return '\n'.join(pgn_lines)
    
    def _get_result(self, color: str, game_data: Dict) -> str:
        """Get result for a specific color (win/loss/draw)."""
        status = game_data.get('status')
        winner = game_data.get('winner')
        
        if status in ['draw', 'stalemate']:
            return 'draw'
        elif winner == color:
            return 'win'
        elif winner and winner != color:
            return 'loss'
        else:
            return 'draw'  # Default for unclear cases
    
    def _get_game_result(self, game_data: Dict) -> str:
        """Get game result in PGN format (1-0, 0-1, 1/2-1/2)."""
        status = game_data.get('status')
        winner = game_data.get('winner')
        
        if status in ['draw', 'stalemate'] or not winner:
            return '1/2-1/2'
        elif winner == 'white':
            return '1-0'
        elif winner == 'black':
            return '0-1'
        else:
            return '1/2-1/2'
    
    def _format_time_control(self, clock_data: Dict) -> str:
        """Format time control for display."""
        if not clock_data:
            return 'unlimited'
        
        initial = clock_data.get('initial', 0)
        increment = clock_data.get('increment', 0)
        
        # Convert milliseconds to seconds
        initial_seconds = initial // 1000
        increment_seconds = increment // 1000
        
        # Convert to minutes if >= 60 seconds
        if initial_seconds >= 60:
            initial_minutes = initial_seconds // 60
            return f"{initial_minutes}+{increment_seconds}"
        else:
            return f"{initial_seconds}+{increment_seconds}"
    
    def get_player_info(self, username: str) -> Dict:
        """
        Get player information from Lichess.
        
        Args:
            username: Lichess username
            
        Returns:
            Dict with player information
        """
        response = requests.get(
            f"{self.base_url}/user/{username}",
            headers={'Accept': 'application/json'}
        )
        response.raise_for_status()
        
        data = response.json()
        
        return {
            'username': data.get('username'),
            'title': data.get('title'),
            'ratings': data.get('perfs', {}),
            'games_played': data.get('count', {}).get('all', 0),
            'profile': data.get('profile', {}),
            'created_at': data.get('createdAt'),
            'seen_at': data.get('seenAt'),
            'play_time': data.get('playTime', {}).get('total', 0)
        }
    
    def get_recent_games(self, username: str, days: int = 7) -> List[Dict]:
        """
        Get recent games for a user (convenience method).
        
        Args:
            username: Lichess username
            days: Number of days back to fetch games
            
        Returns:
            List of recent games
        """
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return self.get_user_games(
            username=username,
            since=since,
            max_games=50
        ) 