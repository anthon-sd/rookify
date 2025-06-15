import os
from dotenv import load_dotenv
import chess
import chess.pgn
from io import StringIO
from chess_taxonomy import map_to_taxonomy, get_all_skills, get_sub_skills
from pattern_recognition import PatternRecognizer

def analyze_game(pgn_text: str):
    """Analyze a complete game for patterns and skills."""
    print("\nAnalyzing Game")
    print("=============")
    
    # Parse the PGN
    pgn = StringIO(pgn_text)
    game = chess.pgn.read_game(pgn)
    
    if not game:
        print("Error: Could not parse PGN")
        return
    
    # Print game info
    print(f"\nGame: {game.headers.get('White', 'Unknown')} vs {game.headers.get('Black', 'Unknown')}")
    print(f"Result: {game.headers.get('Result', 'Unknown')}")
    print(f"ECO: {game.headers.get('ECO', 'Unknown')}")
    
    # Get all moves
    moves = list(game.mainline_moves())
    
    # Analyze opening position (after 10 moves)
    print("\nAnalyzing Opening Position (after 10 moves)")
    print("------------------------------------------")
    board = chess.Board()
    for move in moves[:10]:
        board.push(move)
    
    # Get patterns and skills for opening position
    pattern_recognizer = PatternRecognizer()
    patterns = pattern_recognizer.analyze_position(board)
    print("\nPatterns found:")
    for pattern in patterns:
        print(f"- {pattern.name}: {pattern.confidence:.2f}")
    
    matches = map_to_taxonomy("", "Opening", board.fen(), "", 0)
    print("\nSkills identified:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Analyze middlegame position (after 20 moves)
    print("\nAnalyzing Middlegame Position (after 20 moves)")
    print("--------------------------------------------")
    board = chess.Board()
    for move in moves[:20]:
        board.push(move)
    
    patterns = pattern_recognizer.analyze_position(board)
    print("\nPatterns found:")
    for pattern in patterns:
        print(f"- {pattern.name}: {pattern.confidence:.2f}")
    
    matches = map_to_taxonomy("", "Middlegame", board.fen(), "", 0)
    print("\nSkills identified:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Analyze endgame position (last 10 moves)
    print("\nAnalyzing Endgame Position (last 10 moves)")
    print("-----------------------------------------")
    board = chess.Board()
    for move in moves[:-10]:
        board.push(move)
    
    patterns = pattern_recognizer.analyze_position(board)
    print("\nPatterns found:")
    for pattern in patterns:
        print(f"- {pattern.name}: {pattern.confidence:.2f}")
    
    matches = map_to_taxonomy("", "Endgame", board.fen(), "", 0)
    print("\nSkills identified:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")

def test_skill_attribution():
    """Test the enhanced skill attribution engine with various positions."""
    print("\nTesting Enhanced Skill Attribution Engine")
    print("=========================================")
    
    # Test 1: Tactical Position (Fork)
    print("\nTest 1: Tactical Position (Fork)")
    print("--------------------------------")
    fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1"
    move = "d5"
    comment = "Black plays d5, creating a fork on c4 and e4"
    chapter = "Tactical Patterns"
    
    matches = map_to_taxonomy(comment, chapter, fen, move, 200)
    print("\nMatches found:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Test 2: Strategic Position (Knight Outpost)
    print("\nTest 2: Strategic Position (Knight Outpost)")
    print("-------------------------------------------")
    fen = "r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 1"
    move = "Nc6"
    comment = "Black develops the knight to c6, eyeing the d4 outpost"
    chapter = "Strategic Play"
    
    matches = map_to_taxonomy(comment, chapter, fen, move, 50)
    print("\nMatches found:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Test 3: Endgame Position (Opposition)
    print("\nTest 3: Endgame Position (Opposition)")
    print("-------------------------------------")
    fen = "8/8/8/4k3/4K3/8/8/8 w - - 0 1"
    move = "Ke4"
    comment = "White takes the opposition with Ke4"
    chapter = "Endgame Techniques"
    
    matches = map_to_taxonomy(comment, chapter, fen, move, 100)
    print("\nMatches found:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Test 4: Opening Position (Fianchetto)
    print("\nTest 4: Opening Position (Fianchetto)")
    print("-------------------------------------")
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R b KQkq - 0 1"
    move = "g6"
    comment = "Black prepares to fianchetto the bishop"
    chapter = "Opening Principles"
    
    matches = map_to_taxonomy(comment, chapter, fen, move, 30)
    print("\nMatches found:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")
    
    # Test 5: Positional Position (Isolated Pawn)
    print("\nTest 5: Positional Position (Isolated Pawn)")
    print("------------------------------------------")
    fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1"
    move = "exd5"
    comment = "White captures on d5, creating an isolated pawn"
    chapter = "Pawn Structures"
    
    matches = map_to_taxonomy(comment, chapter, fen, move, -50)
    print("\nMatches found:")
    for skill, sub_skill, phase, conf in matches:
        print(f"- {skill} > {sub_skill} ({phase}): {conf:.2f}")

def test_pattern_recognition():
    """Test the pattern recognition system directly."""
    print("\nTesting Pattern Recognition System")
    print("=================================")
    
    pattern_recognizer = PatternRecognizer()
    
    # Test 1: Fork Pattern
    print("\nTest 1: Fork Pattern")
    print("--------------------")
    fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1"
    board = chess.Board(fen)
    patterns = pattern_recognizer.analyze_position(board)
    print("\nPatterns found:")
    for pattern in patterns:
        print(f"- {pattern.name}: {pattern.confidence:.2f}")
    
    # Test 2: Knight Outpost
    print("\nTest 2: Knight Outpost")
    print("---------------------")
    fen = "r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 1"
    board = chess.Board(fen)
    patterns = pattern_recognizer.analyze_position(board)
    print("\nPatterns found:")
    for pattern in patterns:
        print(f"- {pattern.name}: {pattern.confidence:.2f}")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # The PGN game to analyze
    pgn_text = '''[Event "Let's Play!"]
[Site "Chess.com"]
[Date "2025.05.20"]
[Round "-"]
[White "tiziano011269"]
[Black "Swaayven"]
[Result "0-1"]
[CurrentPosition "8/8/8/5p1P/8/8/3Kpk2/8 w - - 2 57"]
[Timezone "UTC"]
[ECO "B13"]
[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-Exchange-Variation-3...cxd5-4.Nf3"]
[UTCDate "2025.05.20"]
[UTCTime "22:55:03"]
[WhiteElo "1074"]
[BlackElo "999"]
[TimeControl "1/86400"]
[Termination "Swaayven won by resignation"]
[StartTime "22:55:03"]
[EndDate "2025.05.30"]
[EndTime "12:32:38"]
[Link "https://www.chess.com/game/daily/816694922"]

1. e4 {[%clk 0:00:05]} 1... c6 {[%clk 1:37:50.5]} 2. Nf3 {[%clk 0:22:02.2]} 2... d5 {[%clk 0:37:20.1]} 3. exd5 {[%clk 0:34:13.7]} 3... cxd5 {[%clk 1:13:13]} 4. d4 {[%clk 0:01:06.4]} 4... Bf5 {[%clk 0:02:47.6]} 5. Nc3 {[%clk 0:23:01.4]} 5... e6 {[%clk 0:01:13.6]} 6. Bb5+ {[%clk 0:50:17.5]} 6... Nc6 {[%clk 0:06:44.4]} 7. Ne5 {[%clk 0:01:06.2]} 7... Ne7 {[%clk 0:02:51]} 8. Qh5 {[%clk 0:16:08.4]} 8... g6 {[%clk 0:00:19.5]} 9. Qe2 {[%clk 0:01:14]} 9... a6 {[%clk 1:21:31.8]} 10. Bxc6+ {[%clk 0:45:14.3]} 10... Nxc6 {[%clk 0:03:40.3]} 11. Nxc6 {[%clk 0:00:20.7]} 11... bxc6 {[%clk 0:10:05.4]} 12. O-O {[%clk 0:00:20.3]} 12... Qb6 {[%clk 0:06:13.5]} 13. Na4 {[%clk 0:10:07.6]} 13... Qxd4 {[%clk 0:06:53.4]} 14. Nc3 {[%clk 0:00:18.4]} 14... Bc5 {[%clk 0:00:41.8]} 15. Be3 {[%clk 0:00:06.1]} 15... Qb4 {[%clk 0:55:02.4]} 16. Bxc5 {[%clk 0:47:50.6]} 16... Qxc5 {[%clk 0:00:29.7]} 17. Qe5 {[%clk 0:00:30.2]} 17... Ke7 {[%clk 0:01:24.1]} 18. Rfe1 {[%clk 0:01:13.7]} 18... f6 {[%clk 0:20:33.5]} 19. Qe2 {[%clk 0:04:34]} 19... Rab8 {[%clk 0:05:49.9]} 20. Qxa6 {[%clk 0:00:38.9]} 20... Rxb2 {[%clk 0:02:44.5]} 21. Na4 {[%clk 0:02:12.8]} 21... Qxc2 {[%clk 0:03:44.1]} 22. Nxb2 {[%clk 0:16:48]} 22... Qxb2 {[%clk 0:05:13.5]} 23. Qa7+ {[%clk 0:04:46.5]} 23... Kd6 {[%clk 0:52:52.7]} 24. Rac1 {[%clk 0:07:54.8]} 24... e5 {[%clk 0:13:03.2]} 25. Qa6 {[%clk 0:00:05.8]} 25... Bd7 {[%clk 0:00:12.6]} 26. Rb1 {[%clk 0:03:54.5]} 26... Qd2 {[%clk 0:03:53.6]} 27. Rf1 {[%clk 0:11:00.7]} 27... Bf5 {[%clk 0:00:12.3]} 28. Rb6 {[%clk 0:00:13.9]} 28... Rc8 {[%clk 0:13:14.8]} 29. Qa3+ {[%clk 0:03:36.5]} 29... Ke6 {[%clk 0:01:47.5]} 30. Qa4 {[%clk 0:06:05.2]} 30... h5 {[%clk 0:06:50.8]} 31. Rxc6+ {[%clk 0:00:47.2]} 31... Rxc6 {[%clk 0:01:10.2]} 32. Qxc6+ {[%clk 0:01:01.4]} 32... Ke7 {[%clk 0:36:03.2]} 33. h3 {[%clk 0:35:34.2]} 33... Qxa2 {[%clk 0:19:22.4]} 34. Qc7+ {[%clk 0:00:10]} 34... Bd7 {[%clk 0:00:22.9]} 35. Qc5+ {[%clk 0:02:53.9]} 35... Ke6 {[%clk 0:01:44.5]} 36. Qf8 {[%clk 0:00:44]} 36... g5 {[%clk 0:10:44.8]} 37. Qg8+ {[%clk 0:03:27.6]} 37... Ke7 {[%clk 0:11:48.2]} 38. Qh7+ {[%clk 0:04:57.4]} 38... Ke6 {[%clk 0:05:14.3]} 39. Qxh5 {[%clk 0:00:31.5]} 39... Bb5 {[%clk 0:05:54.6]} 40. Qf3 {[%clk 0:10:33.1]} 40... Bxf1 {[%clk 0:05:53.3]} 41. Kxf1 {[%clk 0:02:11.5]} 41... e4 {[%clk 0:00:08]} 42. Qg4+ {[%clk 0:00:11.7]} 42... Ke5 {[%clk 0:04:58.3]} 43. Qg3+ {[%clk 0:02:18.5]} 43... Kd4 {[%clk 0:02:52.6]} 44. Qe3+ {[%clk 0:33:10.8]} 44... Ke5 {[%clk 0:27:21.8]} 45. f3 {[%clk 0:35:46.6]} 45... Qc4+ {[%clk 0:05:43.8]} 46. Kf2 {[%clk 0:11:30.8]} 46... Qd3 {[%clk 0:26:14.8]} 47. g3 {[%clk 0:02:55]} 47... Qxe3+ {[%clk 0:05:25.6]} 48. Kxe3 {[%clk 0:01:14.7]} 48... d4+ {[%clk 0:00:06.4]} 49. Ke2 {[%clk 0:03:13.6]} 49... f5 {[%clk 0:50:58.5]} 50. h4 {[%clk 0:02:17.9]} 50... gxh4 {[%clk 0:50:39.7]} 51. gxh4 {[%clk 0:07:03]} 51... e3 {[%clk 0:16:21.7]} 52. Kd3 {[%clk 0:06:07.7]} 52... Kf4 {[%clk 0:11:55.9]} 53. Ke2 {[%clk 1:05:05.5]} 53... d3+ {[%clk 0:00:28.6]} 54. Kxd3 {[%clk 0:05:56.6]} 54... Kxf3 {[%clk 0:00:21.9]} 55. h5 {[%clk 0:00:15.3]} 55... e2 {[%clk 0:00:01.1]} 56. Kd2 {[%clk 0:00:01.5]} 56... Kf2 {[%clk 0:00:01.9]} 0-1'''
    
    try:
        # Analyze the game
        analyze_game(pgn_text)
        
        # Run the standard tests
        test_skill_attribution()
        test_pattern_recognition()
    except Exception as e:
        print("\nException occurred during testing:")
        import traceback
        traceback.print_exc() 