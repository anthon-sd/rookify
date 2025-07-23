import { ChessBoard } from './ChessBoard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Sample PGN for demonstration
const samplePGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.15"]
[Round "-"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[TimeControl "600+5"]
[ECO "C00"]
[Opening "French Defense"]

1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Qg4 Qc7 8. Qxg7 Rg8 9. Qxh7 cxd4 10. Ne2 Nbc6 11. f4 Bd7 12. Qd3 dxc3 13. h4 O-O-O 14. h5 Nf5 15. h6 Nxh6 16. Qg3 Nf5 17. Qf3 Rg2 18. Rh2 Rxh2 19. Qxf5 exf5 20. Nxc3 1-0`

// Sample moves data for demonstration
const sampleMoves = [
  { move: 'e4', evaluation: 0.3, accuracy: 'good', moveNumber: 1 },
  { move: 'e6', evaluation: 0.2, accuracy: 'good', moveNumber: 1 },
  { move: 'd4', evaluation: 0.4, accuracy: 'good', moveNumber: 2 },
  { move: 'd5', evaluation: 0.3, accuracy: 'good', moveNumber: 2 },
  { move: 'Nc3', evaluation: 0.5, accuracy: 'good', moveNumber: 3 },
  { move: 'Bb4', evaluation: 0.2, accuracy: 'good', moveNumber: 3 },
  { move: 'e5', evaluation: 0.6, accuracy: 'good', moveNumber: 4 },
  { move: 'c5', evaluation: 0.4, accuracy: 'good', moveNumber: 4 },
  { move: 'a3', evaluation: 0.8, accuracy: 'great', moveNumber: 5 },
  { move: 'Bxc3+', evaluation: 0.5, accuracy: 'good', moveNumber: 5 },
  { move: 'bxc3', evaluation: 0.7, accuracy: 'good', moveNumber: 6 },
  { move: 'Ne7', evaluation: 0.6, accuracy: 'good', moveNumber: 6 },
  { move: 'Qg4', evaluation: 1.2, accuracy: 'great', moveNumber: 7 },
  { move: 'Qc7', evaluation: 0.8, accuracy: 'good', moveNumber: 7 },
  { move: 'Qxg7', evaluation: 2.5, accuracy: 'brilliant', moveNumber: 8 },
  { move: 'Rg8', evaluation: -1.8, accuracy: 'mistake', moveNumber: 8 },
  { move: 'Qxh7', evaluation: 4.2, accuracy: 'brilliant', moveNumber: 9 },
  { move: 'cxd4', evaluation: -2.5, accuracy: 'blunder', moveNumber: 9 },
]

export function ChessBoardDemo() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Chess GUI Demo
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">Interactive</Badge>
              <Badge variant="default">Chess.js + React-Chessboard</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              This demonstrates a high-quality chess GUI similar to Chess.com with the following features:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Interactive Board:</strong> Click moves to navigate through the game</li>
              <li><strong>Keyboard Navigation:</strong> Use arrow keys, Home/End to navigate</li>
              <li><strong>Move Quality:</strong> Color-coded moves showing brilliant, best, great, balanced, mistakes, and blunders</li>
              <li><strong>Critical Moments:</strong> Special highlighting for key tactical moments</li>
              <li><strong>Board Controls:</strong> Flip board (F key), toggle coordinates, sound effects</li>
              <li><strong>Analysis Integration:</strong> Evaluation bars and engine analysis</li>
              <li><strong>Responsive Design:</strong> Works on desktop and mobile devices</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ChessBoard 
        pgn={samplePGN}
        moveAccuracyData={sampleMoves.map(move => ({
          moveNumber: move.moveNumber,
          accuracy: move.evaluation * 100,
          type: move.accuracy
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Opening</p>
              <p className="font-medium">French Defense</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Control</p>
              <p className="font-medium">10+5</p>
            </div>
            <div>
              <p className="text-muted-foreground">Result</p>
              <p className="font-medium">1-0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Moves</p>
              <p className="font-medium">20</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg">
              <div className="text-2xl font-bold text-cyan-600">2</div>
              <div className="text-sm text-muted-foreground">Brilliant Moves</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">14</div>
              <div className="text-sm text-muted-foreground">Balanced Moves</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">1</div>
              <div className="text-sm text-muted-foreground">Mistakes</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">1</div>
              <div className="text-sm text-muted-foreground">Blunders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 