import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import chess.pgn
import io
import time

class ChessComAPIError(Exception):
    """Custom exception for Chess.com API errors"""
    pass

class ChessComAPI:
    def __init__(self, username: str):
        """
        Initialize Chess.com API client.
        
        Args:
            username (str): Chess.com username
        """
        self.username = username.lower()  # Chess.com usernames are case-insensitive
        self.base_url = "https://api.chess.com/pub/player"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Rookify/1.0 (https://github.com/yourusername/rookify)'
        })
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """
        Make a request to the Chess.com API with proper error handling and rate limiting.
        
        Args:
            endpoint (str): API endpoint to call
            params (Dict, optional): Query parameters
            
        Returns:
            Dict: API response
            
        Raises:
            ChessComAPIError: If the API request fails
        """
        url = f"{self.base_url}/{self.username}/{endpoint}"
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            # Add a small delay to respect rate limits
            time.sleep(0.1)
            
            return response.json()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                raise ChessComAPIError(f"Access denied. Please check if the profile is public: {url}")
            elif e.response.status_code == 404:
                raise ChessComAPIError(f"Profile not found: {url}")
            elif e.response.status_code == 429:
                raise ChessComAPIError("Rate limit exceeded. Please try again later.")
            else:
                raise ChessComAPIError(f"API request failed: {str(e)}")
        except requests.exceptions.RequestException as e:
            raise ChessComAPIError(f"Network error: {str(e)}")
    
    def get_user_profile(self) -> Dict:
        """
        Get additional details about a Chess.com player.
        Endpoint: https://api.chess.com/pub/player/{username}
        """
        return self._make_request("")
    
    def get_user_stats(self) -> Dict:
        """
        Get ratings, win/loss, and other stats about a player's game play.
        Endpoint: https://api.chess.com/pub/player/{username}/stats
        """
        return self._make_request("stats")
    
    def get_monthly_archives(self) -> List[str]:
        """
        Get list of monthly archives available for this player.
        Endpoint: https://api.chess.com/pub/player/{username}/games/archives
        """
        response = self._make_request("games/archives")
        return response.get('archives', [])
    
    def get_monthly_games(self, year: int, month: int) -> List[str]:
        """
        Get all games for a specific month.
        Endpoint: https://api.chess.com/pub/player/{username}/games/{YYYY}/{MM}
        
        Args:
            year (int): Year
            month (int): Month (1-12)
            
        Returns:
            List[str]: List of PGN strings
        """
        response = self._make_request(f"games/{year}/{month:02d}")
        
        pgn_list = []
        for game in response.get('games', []):
            if 'pgn' in game:
                pgn_list.append(game['pgn'])
        
        return pgn_list
    
    def get_live_games(self, base_time: int, increment: Optional[int] = None) -> List[Dict]:
        """
        Get Live Chess games by time control.
        Endpoint: https://api.chess.com/pub/player/{username}/games/live/{BASETIME}/(INCREMENT)
        
        Args:
            base_time (int): Base time in seconds
            increment (int, optional): Increment in seconds
            
        Returns:
            List[Dict]: List of game data
        """
        endpoint = f"games/live/{base_time}"
        if increment is not None:
            endpoint += f"/{increment}"
            
        return self._make_request(endpoint)
    
    def get_recent_games(self, days: int = 30) -> List[str]:
        """
        Get user's recent games from the last N days.
        
        Args:
            days (int): Number of days to look back
            
        Returns:
            List[str]: List of PGN strings
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        all_games = []
        current_date = start_date
        
        while current_date <= end_date:
            year = current_date.year
            month = current_date.month
            try:
                games = self.get_monthly_games(year, month)
                all_games.extend(games)
            except ChessComAPIError as e:
                print(f"Warning: Could not fetch games for {year}-{month:02d}: {str(e)}")
            
            current_date = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)
        
        return all_games

def parse_pgn_game(pgn: str) -> List[Dict]:
    """
    Parse a PGN game and extract key moments.
    
    Args:
        pgn (str): PGN string of the game
        
    Returns:
        List[Dict]: List of key moments with metadata
    """
    game = chess.pgn.read_game(io.StringIO(pgn))
    if not game:
        return []
    
    key_moments = []
    node = game
    
    while node.variations:
        next_node = node.variations[0]
        
        # Extract position and move information
        position = {
            "user_id": game.headers.get("White", ""),  # Will be updated later
            "tag": "position",  # Will be updated by analysis
            "theme": "",  # Will be updated by analysis
            "position_fen": node.board().fen(),
            "move": next_node.move.uci() if next_node.move else "",
            "commentary": next_node.comment if next_node.comment else "",
            "game_url": game.headers.get("Site", ""),
            "timestamp": game.headers.get("UTCDate", "") + " " + game.headers.get("UTCTime", ""),
            "source": "chess_com",
            "time_control": game.headers.get("TimeControl", ""),
            "game_type": "live" if game.headers.get("TimeControl", "").isdigit() else "daily",
            "result": game.headers.get("Result", ""),
            "white_rating": game.headers.get("WhiteElo", ""),
            "black_rating": game.headers.get("BlackElo", "")
        }
        
        key_moments.append(position)
        node = next_node
    
    return key_moments 