import chess.pgn
import json
from game_analyzer import GameAnalyzer
import os
from dotenv import load_dotenv
from io import StringIO

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def test_game_analysis():
    try:
        # Sample game PGN (a famous game between Kasparov and Topalov)
        sample_pgn = """
[Event "Wijk aan Zee"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[EventDate "1999.01.15"]
[Round "4"]
[Result "1-0"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[ECO "B07"]
[WhiteElo "2812"]
[BlackElo "2700"]
[PlyCount "87"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6
9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5
16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5
23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7
Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1
36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5
43. Kc1 Rd2 44. Qa7 1-0
"""

        # Create game analyzer instance
        analyzer = GameAnalyzer(
            ai_engine_url='http://localhost:5000'  # Explicitly set the URL
        )

        # Parse the PGN
        game = chess.pgn.read_game(StringIO(sample_pgn))
        if not game:
            raise ValueError("Failed to parse PGN game")
        
        # Convert game to moments
        moments = []
        board = chess.Board()
        
        for move in game.mainline_moves():
            # Get FEN before the move
            position_fen = board.fen()
            
            # Make the move
            board.push(move)
            
            # Create moment
            moment = {
                'position_fen': position_fen,
                'move': move.uci(),
                'commentary': game.comment if hasattr(game, 'comment') else '',
                'user_id': 'test_user',
                'game_id': 'test_game'
            }
            moments.append(moment)

        # Analyze the game
        analyzed_moments = analyzer.analyze_game_moments(moments, depth=20)

        # Print analysis results
        print("\nGame Analysis Results:")
        print("=" * 80)
        
        for moment in analyzed_moments:
            print(f"\nMove {moment['move_number']}: {moment['move']}")
            print(f"Accuracy: {moment['accuracy_class']}")
            print(f"Evaluation: {moment['eval_score']} centipawns")
            print(f"Delta CP: {moment['delta_cp']}")
            print(f"Phase: {moment['phase']}")
            if moment.get('is_brilliant'):
                print("*** BRILLIANT MOVE ***")
            if moment.get('is_great'):
                print("*** GREAT MOVE ***")
            if moment.get('recommendations'):
                print("\nRecommendations:")
                for rec in moment['recommendations']:
                    print(f"- {rec['recommendation']} (Priority: {rec['priority']})")
            print("-" * 40)

    except Exception as e:
        print(f"Error during game analysis: {str(e)}")
        raise

if __name__ == "__main__":
    test_game_analysis() 