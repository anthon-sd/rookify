import { useState, useEffect, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  SkipBack, 
  ChevronLeft, 
  ChevronRight, 
  SkipForward, 
  RotateCcw, 
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CriticalMoment {
  moveNumber: number
  type: string
  description: string
  delta_cp?: number
  move?: string
}

interface Move {
  move: string
  evaluation: number
  accuracy: string
  comment?: string
  moveNumber: number
}

interface ChessBoardProps {
  pgn: string
  criticalMoments?: CriticalMoment[]
  userColor?: 'white' | 'black'
  className?: string
  moveAccuracyData?: Array<{ moveNumber: number, accuracy: number, type: string }>
  moves?: Move[]
}

export function ChessBoard({ pgn, criticalMoments = [], userColor = 'white', className, moveAccuracyData = [], moves = [] }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess())
  const [gameHistory, setGameHistory] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(userColor)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [highlightLastMove] = useState(true)
  const [rightClickToDraw] = useState(true)
  const [arrows, setArrows] = useState<any[]>([])
  const [moveSquares, setMoveSquares] = useState({})
  const moveListRef = useRef<HTMLDivElement>(null)

  // Initialize game from PGN and set board orientation
  useEffect(() => {
    if (pgn) {
      const newGame = new Chess()
      try {
        newGame.loadPgn(pgn)
        const history = newGame.history()
        
        // Reset to start position
        newGame.reset()
        setGame(newGame)
        setGameHistory(history)
        setCurrentMoveIndex(-1)
        setArrows([])
        setMoveSquares({})
        
        // Set board orientation based on user color
        setBoardOrientation(userColor)
      } catch (error) {
        console.error('Error loading PGN:', error)
      }
    }
  }, [pgn, userColor])

  // Navigation functions
  const goToMove = useCallback((moveIndex: number) => {
    if (moveIndex < -1 || moveIndex >= gameHistory.length) return

    const newGame = new Chess()
    
    // Play moves up to the target index
    for (let i = 0; i <= moveIndex; i++) {
      try {
        newGame.move(gameHistory[i])
      } catch (error) {
        console.error('Error making move:', gameHistory[i], error)
        return
      }
    }

    setGame(newGame)
    setCurrentMoveIndex(moveIndex)

    // Update move highlighting
    if (highlightLastMove && moveIndex >= 0) {
      const lastMove = newGame.history({ verbose: true }).pop()
      if (lastMove) {
        setMoveSquares({
          [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
          [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
        })
      }
    } else {
      setMoveSquares({})
    }

    // Scroll move list to current move
    scrollToCurrentMove(moveIndex)
  }, [gameHistory, highlightLastMove])

  const scrollToCurrentMove = (moveIndex: number) => {
    if (moveListRef.current) {
      const moveElement = moveListRef.current.querySelector(`[data-move-index="${moveIndex}"]`)
      if (moveElement) {
        moveElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const goToFirst = () => goToMove(-1)
  const goToPrevious = () => goToMove(currentMoveIndex - 1)
  const goToNext = () => goToMove(currentMoveIndex + 1)
  const goToLast = () => goToMove(gameHistory.length - 1)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case 'Home':
          e.preventDefault()
          goToFirst()
          break
        case 'End':
          e.preventDefault()
          goToLast()
          break
        case 'f':
          e.preventDefault()
          setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentMoveIndex, gameHistory.length])

  // Get move accuracy styling
  const getMoveAccuracyStyle = (moveIndex: number) => {
    // Direct mapping: moveIndex corresponds to half-move index in moveAccuracyData
    const moveData = moveAccuracyData[moveIndex]
    if (!moveData) return ''

    // Use the same logic as the "Accuracy Throughout Game" section
    switch (moveData.type) {
      case 'blunder':
        return 'bg-red-600 text-white'
      case 'mistake':
      case 'miss':
        return 'bg-orange-500 text-white'
      case 'inaccuracy':
        return 'bg-yellow-500 text-white'
      case 'brilliant':
        return 'bg-cyan-500 text-white'
      case 'great':
        return 'bg-green-500 text-white'
      case 'good':
        return 'bg-green-400 text-white'
      default:
        return 'bg-green-400 text-white'
    }
  }

  // Check if move is a critical moment
  const isCriticalMoment = (moveIndex: number) => {
    const moveNumber = Math.floor(moveIndex / 2) + 1
    return criticalMoments.some(moment => moment.moveNumber === moveNumber)
  }

  // Format moves for display
  const formatMovesForDisplay = () => {
    const formattedMoves = []
    for (let i = 0; i < gameHistory.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1
      const whiteMove = gameHistory[i]
      const blackMove = gameHistory[i + 1]

      formattedMoves.push({
        moveNumber,
        white: whiteMove,
        black: blackMove,
        whiteIndex: i,
        blackIndex: i + 1
      })
    }

    return formattedMoves
  }

  // Handle right-click to draw arrows
  const handleSquareRightClick = (square: string) => {
    if (!rightClickToDraw) return

    setArrows(prev => {
      const newArrows = [...prev]
      const existingIndex = newArrows.findIndex(arrow => arrow.from === square || arrow.to === square)
      
      if (existingIndex >= 0) {
        newArrows.splice(existingIndex, 1)
      } else {
        // Simple implementation - just highlight the square
        newArrows.push({ from: square, to: square, color: 'red' })
      }
      
      return newArrows
    })
  }

  return (
    <div className={cn('grid lg:grid-cols-3 gap-6', className)}>
      {/* Chess Board */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Game Analysis Board</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
                  title="Flip board (F)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCoordinates(!showCoordinates)}
                  title="Toggle coordinates"
                >
                  {showCoordinates ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title="Toggle sound"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chess Board */}
            <div className="flex justify-center">
              <div className="w-full max-w-[500px]">
                <Chessboard
                  position={game.fen()}
                  boardOrientation={boardOrientation}
                  showBoardNotation={showCoordinates}
                  customSquareStyles={moveSquares}
                  customArrows={arrows}
                  onSquareRightClick={handleSquareRightClick}
                  arePiecesDraggable={false}
                  boardWidth={500}
                  customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                  }}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                />
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirst}
                disabled={currentMoveIndex === -1}
                title="First move (Home)"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentMoveIndex === -1}
                title="Previous move (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {currentMoveIndex === -1 ? 'Start' : `Move ${currentMoveIndex + 1} of ${gameHistory.length}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentMoveIndex >= gameHistory.length - 1}
                title="Next move (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToLast}
                disabled={currentMoveIndex >= gameHistory.length - 1}
                title="Last move (End)"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Game Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Use arrow keys to navigate • F to flip board • Right-click to draw arrows</p>
              <p className="text-xs mt-1">Board oriented from your perspective ({userColor})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Move List */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Move List</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]" ref={moveListRef}>
              <div className="space-y-1">
                {formatMovesForDisplay().map((movePair) => {
                  // Find evaluation data for white and black moves
                  const whiteEval = moves.find(m => m.moveNumber === (movePair.whiteIndex + 1) && (movePair.whiteIndex % 2 === 0))?.evaluation || 0;
                  const blackEval = moves.find(m => m.moveNumber === (movePair.blackIndex + 1) && (movePair.blackIndex % 2 === 1))?.evaluation || 0;
                  
                  const formatEval = (evaluation: number) => {
                    if (Math.abs(evaluation) > 5000) {
                      return evaluation > 0 ? 'M+' : 'M-';
                    }
                    const pawns = evaluation / 100;
                    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
                  };

                  return (
                    <div key={movePair.moveNumber} className="flex items-center gap-1 text-sm">
                      {/* Move number */}
                      <span className="text-muted-foreground w-8 text-right">
                        {movePair.moveNumber}.
                      </span>

                      {/* White move */}
                      <div className="flex flex-col items-start">
                        <button
                          data-move-index={movePair.whiteIndex}
                          onClick={() => goToMove(movePair.whiteIndex)}
                          className={cn(
                            'px-2 py-1 rounded text-left min-w-[60px] transition-colors',
                            'focus:outline-none focus:ring-0',
                            getMoveAccuracyStyle(movePair.whiteIndex),
                            isCriticalMoment(movePair.whiteIndex) && 'ring-2 ring-yellow-400'
                          )}
                          style={{
                            border: currentMoveIndex === movePair.whiteIndex 
                              ? '3px solid #000000' 
                              : '3px solid transparent',
                            outline: 'none',
                            boxShadow: 'none'
                          }}
                        >
                          {movePair.white}
                        </button>
                        {whiteEval !== 0 && (
                          <span className={cn(
                            "text-xs px-1 rounded font-mono",
                            whiteEval > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                          )}>
                            {formatEval(whiteEval)}
                          </span>
                        )}
                      </div>

                      {/* Black move */}
                      {movePair.black && (
                        <div className="flex flex-col items-start">
                          <button
                            data-move-index={movePair.blackIndex}
                            onClick={() => goToMove(movePair.blackIndex)}
                            className={cn(
                              'px-2 py-1 rounded text-left min-w-[60px] transition-colors',
                              'focus:outline-none focus:ring-0',
                              getMoveAccuracyStyle(movePair.blackIndex),
                              isCriticalMoment(movePair.blackIndex) && 'ring-2 ring-yellow-400'
                            )}
                            style={{
                              border: currentMoveIndex === movePair.blackIndex 
                                ? '3px solid #000000' 
                                : '3px solid transparent',
                              outline: 'none',
                              boxShadow: 'none'
                            }}
                          >
                            {movePair.black}
                          </button>
                          {blackEval !== 0 && (
                            <span className={cn(
                              "text-xs px-1 rounded font-mono",
                              blackEval > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                            )}>
                              {formatEval(blackEval)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Move Legend */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Move Quality:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  <span>Brilliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Great</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Inaccuracy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Mistake</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span>Blunder</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-yellow-400 rounded"></div>
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 