// React import not needed
import { VisxCentipawnChart } from "@/components/VisxCentipawnChart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Sample chess game move data for testing
const sampleMoves = [
  { moveNumber: 1, evaluation: 15 },
  { moveNumber: 2, evaluation: 25 },
  { moveNumber: 3, evaluation: -10 },
  { moveNumber: 4, evaluation: 30 },
  { moveNumber: 5, evaluation: 45 },
  { moveNumber: 6, evaluation: -25 },
  { moveNumber: 7, evaluation: 60 },
  { moveNumber: 8, evaluation: -40 },
  { moveNumber: 9, evaluation: 120 },
  { moveNumber: 10, evaluation: -80 },
  { moveNumber: 11, evaluation: 200 },
  { moveNumber: 12, evaluation: -150 },
  { moveNumber: 13, evaluation: 350 },
  { moveNumber: 14, evaluation: -200 },
  { moveNumber: 15, evaluation: 500 },
  { moveNumber: 16, evaluation: -300 },
  { moveNumber: 17, evaluation: 800 },
  { moveNumber: 18, evaluation: -500 },
  { moveNumber: 19, evaluation: 1000 },
  { moveNumber: 20, evaluation: -800 }
]

export default function ChartTest() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Visx Chart Test</h1>
        <p className="text-muted-foreground">Testing the VisxCentipawnChart component with sample data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Centipawn Evaluation Chart (Visx)</CardTitle>
          <CardDescription>
            Sample chess position evaluations throughout a game. Green areas show white advantage, red areas show black advantage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Position Evaluation Throughout Game</h4>
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Powered by Visx + Stockfish</span>
              </div>
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 p-2 rounded">
              Debug: {sampleMoves.length} moves, Evaluation range: {Math.min(...sampleMoves.map(m => m.evaluation))} to {Math.max(...sampleMoves.map(m => m.evaluation))} centipawns
            </div>
            
            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-64">
              <VisxCentipawnChart moves={sampleMoves} />
              
              {/* Y-axis labels */}
              <div className="absolute left-1 top-2 text-xs text-green-600 font-medium">+10</div>
              <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">0</div>
              <div className="absolute left-1 bottom-2 text-xs text-red-600 font-medium">-10</div>
              
              {/* Legend */}
              <div className="absolute bottom-2 right-2 flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>White Advantage</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Black Advantage</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Visx-powered visualization showing Stockfish engine evaluation in centipawns (100 centipawns = 1 pawn advantage).
              Positive values favor White, negative values favor Black. The smooth curve is generated using visx's curveMonotoneX.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{sampleMoves.length}</div>
              <div className="text-muted-foreground">Total Moves</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-xl font-bold text-green-600">{Math.max(...sampleMoves.map(m => m.evaluation))}</div>
              <div className="text-muted-foreground">Max Advantage</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-xl font-bold text-red-600">{Math.min(...sampleMoves.map(m => m.evaluation))}</div>
              <div className="text-muted-foreground">Min Advantage</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">
                {(sampleMoves.reduce((sum, m) => sum + Math.abs(m.evaluation), 0) / sampleMoves.length).toFixed(0)}
              </div>
              <div className="text-muted-foreground">Avg Volatility</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 