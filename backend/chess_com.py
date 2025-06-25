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
            print(f"🌐 CHESS.COM: Making request to {url}")
            response = self.session.get(url, params=params, timeout=30)  # 30 second timeout
            response.raise_for_status()
            print(f"✅ CHESS.COM: Request successful ({response.status_code})")
            
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
        return self.get_games_by_date_range(start_date, end_date)
    
    def get_games_by_date_range(self, start_date: datetime, end_date: datetime) -> List[str]:
        """
        Get user's games within a specific date range.
        
        Args:
            start_date (datetime): Start date for games
            end_date (datetime): End date for games
            
        Returns:
            List[str]: List of PGN strings
        """
        print(f"🔍 CHESS.COM: Starting date range fetch for {start_date.date()} to {end_date.date()}")
        all_games = []
        current_date = start_date
        
        while current_date <= end_date:
            year = current_date.year
            month = current_date.month
            print(f"📅 CHESS.COM: Fetching games for {year}-{month:02d}")
            try:
                games = self.get_monthly_games(year, month)
                print(f"✅ CHESS.COM: Retrieved {len(games)} games for {year}-{month:02d}")
                
                # Filter games by date range
                filtered_games = []
                for i, pgn in enumerate(games):
                    if i % 10 == 0:  # Progress update every 10 games
                        print(f"🔍 CHESS.COM: Processing game {i+1}/{len(games)}")
                    
                    game_date = self._extract_game_date(pgn)
                    if game_date and start_date.date() <= game_date <= end_date.date():
                        filtered_games.append(pgn)
                
                print(f"✅ CHESS.COM: Filtered to {len(filtered_games)} games in date range for {year}-{month:02d}")
                all_games.extend(filtered_games)
                
            except ChessComAPIError as e:
                print(f"⚠️ CHESS.COM: Could not fetch games for {year}-{month:02d}: {str(e)}")
            except Exception as e:
                print(f"💥 CHESS.COM: Unexpected error for {year}-{month:02d}: {str(e)}")
            
            current_date = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)
        
        print(f"🎯 CHESS.COM: Final result: {len(all_games)} total games in date range")
        return all_games
    
    def _extract_game_date(self, pgn: str) -> Optional[datetime.date]:
        """
        Extract game date from PGN string.
        
        Args:
            pgn (str): PGN string
            
        Returns:
            datetime.date: Game date or None if not found
        """
        try:
            import re
            
            # Multiple date formats to try
            date_patterns = [
                r'\[Date "(\d{4}\.\d{2}\.\d{2})"\]',      # [Date "2023.12.31"]
                r'\[Date "(\d{4}-\d{2}-\d{2})"\]',       # [Date "2023-12-31"]
                r'\[Date "(\d{4}/\d{2}/\d{2})"\]',       # [Date "2023/12/31"]
                r'\[UTCDate "(\d{4}\.\d{2}\.\d{2})"\]',  # [UTCDate "2023.12.31"]
                r'\[UTCDate "(\d{4}-\d{2}-\d{2})"\]',    # [UTCDate "2023-12-31"]
            ]
            
            for pattern in date_patterns:
                date_match = re.search(pattern, pgn)
                if date_match:
                    date_str = date_match.group(1).replace('.', '-').replace('/', '-')
                    return datetime.fromisoformat(date_str).date()
            
            return None
        except Exception as e:
            print(f"💥 CHESS.COM: Error extracting date: {e}")
            return None

def parse_pgn_game(pgn: str) -> List[Dict]:
    """
    Parse a PGN game and extract key moments.
    
    Args:
        pgn (str): PGN string of the game
        
    Returns:
        List[Dict]: List of key moments with metadata
    """
    print(f"🔍 PGN_PARSER DEBUG: parse_pgn_game called with:")
    print(f"   - pgn type: {type(pgn)}")
    print(f"   - pgn length: {len(pgn) if isinstance(pgn, str) else 'N/A'}")
    print(f"   - pgn preview: {pgn[:200] if isinstance(pgn, str) else pgn}...")
    
    try:
        game = chess.pgn.read_game(io.StringIO(pgn))
        print(f"🔍 PGN_PARSER DEBUG: chess.pgn.read_game returned: {type(game)}")
        
        if not game:
            print("🔍 PGN_PARSER DEBUG: game is None/False, returning []")
            return []
    except Exception as e:
        print(f"❌ PGN_PARSER ERROR: Failed to parse PGN: {e}")
        print(f"   - PGN content: {pgn}")
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
    
    print(f"🔍 PGN_PARSER DEBUG: Completed parsing, returning {len(key_moments)} moments")
    print(f"🔍 PGN_PARSER DEBUG: key_moments type: {type(key_moments)}")
    return key_moments

# Test function for debugging
def test_date_extraction():
    """Test function to debug date extraction"""
    sample_pgn = '''[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.15"]
[Round "-"]
[White "testuser"]
[Black "opponent"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1485"]
[TimeControl "600"]
[Termination "testuser won by checkmate"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Bb7 10. d4 Re8 11. Nbd2 Bf8 12. a4 h6 13. Bc2 exd4 14. cxd4 Nb4 15. Bb1 c5 16. d5 Nd7 17. Ra3 f5 18. Rae3 Nc2 19. Bxc2 fxe4 20. Rxe4 Rxe4 21. Nxe4 c4 22. Ng3 Nc5 23. Be3 Qd7 24. Qc2 Re8 25. Bd4 Nd3 26. Re2 Be7 27. Rxe7 Rxe7 28. Qxd3 Qe8 29. Qf5 Rf7 30. Qe6 1-0'''
    
    api = ChessComAPI("testuser")
    date = api._extract_game_date(sample_pgn)
    print(f"Test date extraction result: {date}")
    return date

if __name__ == "__main__":
    # Run test when script is executed directly
    test_date_extraction() 