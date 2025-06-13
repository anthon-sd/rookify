import unittest
from pgn_parser import parse_pgn, GameMetadata, Move

class TestPGNParser(unittest.TestCase):
    def setUp(self):
        self.sample_pgn = '''[Event "Let's Play!"]
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

1. e4 {[%clk 0:00:05]} 1... c6 {[%clk 1:37:50.5]} 2. Nf3 {[%clk 0:22:02.2]} 2... d5 {[%clk 0:37:20.1]}'''

    def test_metadata_parsing(self):
        metadata, moves = parse_pgn(self.sample_pgn)
        
        # Test metadata fields
        self.assertEqual(metadata.event, "Let's Play!")
        self.assertEqual(metadata.site, "Chess.com")
        self.assertEqual(metadata.white, "tiziano011269")
        self.assertEqual(metadata.black, "Swaayven")
        self.assertEqual(metadata.white_elo, 1074)
        self.assertEqual(metadata.black_elo, 999)
        self.assertEqual(metadata.result, "0-1")

    def test_moves_parsing(self):
        metadata, moves = parse_pgn(self.sample_pgn)
        
        # Test first move
        self.assertEqual(moves[0].move_number, 1)
        self.assertEqual(moves[0].white_move, "e4")
        self.assertEqual(moves[0].white_clock, "[%clk 0:00:05]")
        self.assertEqual(moves[0].black_move, "c6")
        self.assertEqual(moves[0].black_clock, "[%clk 1:37:50.5]")
        
        # Test second move
        self.assertEqual(moves[1].move_number, 2)
        self.assertEqual(moves[1].white_move, "Nf3")
        self.assertEqual(moves[1].white_clock, "[%clk 0:22:02.2]")
        self.assertEqual(moves[1].black_move, "d5")
        self.assertEqual(moves[1].black_clock, "[%clk 0:37:20.1]")

if __name__ == '__main__':
    unittest.main() 