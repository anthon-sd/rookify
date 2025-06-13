from pgn_parser import parse_pgn

# Sample game from the provided PGN
sample_game = '''[Event "Live Chess"]
[Site "Chess.com"]
[Date "2025.05.30"]
[Round "-"]
[White "Swaayven"]
[Black "rocky3633"]
[Result "1-0"]
[CurrentPosition "r1b2r1k/3pqpQ1/2p1p2p/ppP1P2N/3P4/3n4/PP3PPP/R4RK1 b - - 0 19"]
[Timezone "UTC"]
[ECO "A04"]
[ECOUrl "https://www.chess.com/openings/Reti-Opening"]
[UTCDate "2025.05.30"]
[UTCTime "00:33:45"]
[WhiteElo "1147"]
[BlackElo "1151"]
[TimeControl "600"]
[Termination "Swaayven won by checkmate"]
[StartTime "00:33:45"]
[EndDate "2025.05.30"]
[EndTime "00:37:27"]
[Link "https://www.chess.com/game/live/139010529170"]

1. Nf3 {[%clk 0:09:57.1]} 1... a6 {[%clk 0:09:57.2]} 2. d4 {[%clk 0:09:53.4]} 2... h6 {[%clk 0:09:55.9]} 3. e4 {[%clk 0:09:48.5]} 3... e6 {[%clk 0:09:55.2]} 4. Bd3 {[%clk 0:09:40.1]} 4... c6 {[%clk 0:09:53.8]} 5. c4 {[%clk 0:09:31]} 5... Ne7 {[%clk 0:09:52.4]} 6. Bf4 {[%clk 0:09:19.6]} 6... Ng6 {[%clk 0:09:50.4]} 7. Bg3 {[%clk 0:09:11.8]} 7... Be7 {[%clk 0:09:41.5]} 8. O-O {[%clk 0:09:00.9]} 8... b5 {[%clk 0:09:40.2]} 9. c5 {[%clk 0:08:52.8]} 9... a5 {[%clk 0:09:38.1]} 10. Nc3 {[%clk 0:08:33.4]} 10... Na6 {[%clk 0:09:35.6]} 11. Ne5 {[%clk 0:08:26.4]} 11... Nxe5 {[%clk 0:09:33.8]} 12. Bxe5 {[%clk 0:08:21.3]} 12... Bf6 {[%clk 0:09:32.5]} 13. Bxf6 {[%clk 0:08:06.6]} 13... Qxf6 {[%clk 0:09:30.8]} 14. e5 {[%clk 0:08:03.5]} 14... Qe7 {[%clk 0:09:28.8]} 15. Ne4 {[%clk 0:07:56.8]} 15... O-O {[%clk 0:09:22.5]} 16. Qg4 {[%clk 0:07:48.6]} 16... Nb4 {[%clk 0:09:19.4]} 17. Nf6+ {[%clk 0:07:33.9]} 17... Kh8 {[%clk 0:09:15.2]} 18. Nh5 {[%clk 0:07:19.9]} 18... Nxd3 {[%clk 0:09:10.1]} 19. Qxg7# {[%clk 0:07:14.7]} 1-0'''

def main():
    # Parse the game
    metadata, moves = parse_pgn(sample_game)
    
    # Print game information
    print("\n=== Game Information ===")
    print(f"Event: {metadata.event}")
    print(f"Date: {metadata.date}")
    print(f"White: {metadata.white} ({metadata.white_elo})")
    print(f"Black: {metadata.black} ({metadata.black_elo})")
    print(f"Result: {metadata.result}")
    print(f"Opening: {metadata.eco} - {metadata.eco_url}")
    print(f"Termination: {metadata.termination}")
    
    # Print moves
    print("\n=== Moves ===")
    for move in moves:
        print(f"\nMove {move.move_number}:")
        print(f"  White: {move.white_move} ({move.white_clock})")
        if move.black_move:
            print(f"  Black: {move.black_move} ({move.black_clock})")

if __name__ == "__main__":
    main() 