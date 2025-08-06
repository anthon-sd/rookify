import { useState, useEffect } from "react"
import { getGames, getGameAnalysis } from '@/api/games'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Upload, ExternalLink, BarChart3, Clock, Trophy, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from '@/hooks/useToast'
import { SyncGamesDialog } from "@/components/SyncGamesDialog"
import { ChessBoard } from "@/components/ChessBoard"

interface Game {
  id: string
  opponent: string
  result: 'win' | 'loss' | 'draw'
  accuracy: number
  date: string
  opening: string
  analysisStatus: 'completed' | 'in_progress' | 'pending'
  keyInsight: string
  timeControl: string
  pgn: string
}

interface GameAnalysis {
  moves: Array<{ move: string, evaluation: number, accuracy: string, comment?: string, moveNumber: number }>
  summary: { accuracy: number, mistakes: number, blunders: number, brilliantMoves: number }
  coachNotes: string
  moveAccuracyData?: Array<{ moveNumber: number, accuracy: number, type: string }>
  pgn?: string
  white_player?: string
  black_player?: string
}

export function Analyze() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [expandedMoments, setExpandedMoments] = useState<Set<number>>(new Set())
  const { toast } = useToast()
  const { user } = useAuth()

  // Helper function to extract player names from PGN
  const extractPlayersFromPGN = (pgn: string): { white: string | null, black: string | null } => {
    if (!pgn) return { white: null, black: null }
    
    const lines = pgn.split('\n')
    let whitePlayer = null
    let blackPlayer = null
    
    for (const line of lines) {
      const whiteMatch = line.match(/\[White "(.+)"\]/)
      if (whiteMatch) {
        whitePlayer = whiteMatch[1]
      }
      
      const blackMatch = line.match(/\[Black "(.+)"\]/)
      if (blackMatch) {
        blackPlayer = blackMatch[1]
      }
    }
    
    return { white: whitePlayer, black: blackPlayer }
  }

  // Helper function to determine user color
  const getUserColor = (analysis: GameAnalysis): 'white' | 'black' => {
    if (!user) {
      console.log('❌ No user data found, defaulting to white')
      return 'white'
    }
    
    // Extract player names from PGN
    const pgn = analysis.pgn || selectedGame?.pgn || ''
    const players = extractPlayersFromPGN(pgn)
    
    console.log('🎯 User color detection:', {
      pgn_white: players.white,
      pgn_black: players.black,
      api_white: analysis.white_player,
      api_black: analysis.black_player,
      current_user: user.username,
      chess_com_username: user.chess_com_username,
      lichess_username: user.lichess_username
    })
    
    // Use PGN players if available, fallback to API data
    const whitePlayer = players.white || analysis.white_player
    const blackPlayer = players.black || analysis.black_player
    
    if (!whitePlayer && !blackPlayer) {
      console.log('❌ No player data found, defaulting to white')
      return 'white'
    }
    
    // Check if user matches white player (try different username variations)
    if (whitePlayer && (
        whitePlayer === user.username || 
        whitePlayer === user.chess_com_username ||
        whitePlayer === user.lichess_username)) {
      console.log('✅ User is WHITE player')
      return 'white'
    }
    
    // Check if user matches black player
    if (blackPlayer && (
        blackPlayer === user.username || 
        blackPlayer === user.chess_com_username ||
        blackPlayer === user.lichess_username)) {
      console.log('✅ User is BLACK player')
      return 'black'
    }
    
    // Default to white if no match found
    console.log('❌ No username match found, defaulting to white')
    console.log('Available players:', { whitePlayer, blackPlayer })
    return 'white'
  }

  const fetchGames = async () => {
    console.log('🎮 Analyze page: Starting fetchGames...')
    try {
      const data = await getGames() as { games: Game[] }
      console.log('🎮 Analyze page: Received data:', data)
      console.log('🎮 Analyze page: Games array:', data.games)
      console.log('🎮 Analyze page: Number of games:', data.games?.length || 0)
      setGames(data.games)
    } catch (error) {
      console.error('❌ Error fetching games:', error)
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [toast])

  const handleSyncComplete = () => {
    // Refresh games list when sync completes
    fetchGames()
  }

  const handleGameSelect = async (game: Game) => {
    setSelectedGame(game)
    setAnalysisLoading(true)
    setCurrentMoveIndex(-1) // Reset move index when selecting new game

    try {
      const analysis = await getGameAnalysis(game.id) as GameAnalysis
      setGameAnalysis(analysis)
    } catch (error) {
      console.error('Error fetching game analysis:', error)
      toast({
        title: "Error",
        description: "Failed to load game analysis",
        variant: "destructive",
      })
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleChartMoveClick = (moveIndex: number) => {
    setCurrentMoveIndex(moveIndex)
  }

  const getResultBadge = (result: string) => {
    const variants = {
      win: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      loss: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      draw: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
    return (
      <Badge className={variants[result as keyof typeof variants]}>
        {result.toUpperCase()}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600"
    if (accuracy >= 80) return "text-blue-600"
    if (accuracy >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Game Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Review your games and learn from every move
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import PGN
          </Button>
          <SyncGamesDialog 
            onSyncComplete={handleSyncComplete}
            trigger={
              <Button variant="outline" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Sync Games
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-7 gap-6">
        {/* Games Library */}
        <Card className="chess-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Recent Games
            </CardTitle>
            <CardDescription>
              Click on any game to view detailed analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {games.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No games found. Sync your games to get started!</p>
                <div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  💡 <strong>Tip:</strong> Check out the demo page to see the chess GUI in action! 
                  <br />Navigate to the "Blank Page" in the sidebar to see a working example.
                </div>
              </div>
            ) : games.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedGame?.id === game.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">vs {game.opponent}</span>
                    {getResultBadge(game.result)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(game.analysisStatus)}
                    <span className={`font-bold ${getAccuracyColor(game.accuracy)}`}>
                      {game.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{game.opening}</span>
                  <span>{game.timeControl}</span>
                </div>

                <div className="mt-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  {game.keyInsight}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Game Analysis */}
        <Card className="chess-card lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              {selectedGame ? `Analysis: vs ${selectedGame.opponent}` : 'Select a Game'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedGame ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a game from the list to view detailed analysis</p>
              </div>
            ) : analysisLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading analysis...</p>
              </div>
            ) : gameAnalysis ? (
              <Tabs defaultValue="board" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="board">Board</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="moments">Key Moments</TabsTrigger>
                  <TabsTrigger value="coach">Coach Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="board" className="space-y-4">
                  <ChessBoard 
                    pgn={gameAnalysis.pgn || selectedGame?.pgn || ''}
                    userColor={getUserColor(gameAnalysis)}
                    moveAccuracyData={gameAnalysis.moveAccuracyData}
                    moves={gameAnalysis.moves}
                    currentMoveIndex={currentMoveIndex}
                    onMoveIndexChange={setCurrentMoveIndex}
                    onChartMoveClick={handleChartMoveClick}
                  />
                </TabsContent>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{gameAnalysis.summary.accuracy.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{gameAnalysis.summary.brilliantMoves}</div>
                      <div className="text-sm text-muted-foreground">Brilliant Moves</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{gameAnalysis.summary.mistakes}</div>
                      <div className="text-sm text-muted-foreground">Mistakes</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{gameAnalysis.summary.blunders}</div>
                      <div className="text-sm text-muted-foreground">Blunders</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Accuracy Throughout Game</h4>
                    {gameAnalysis.moveAccuracyData && gameAnalysis.moveAccuracyData.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-10 gap-1 mb-2">
                          {gameAnalysis.moveAccuracyData.map((moveData, index) => {
                            return (
                              <div
                                key={index}
                                className={`h-6 rounded text-xs flex items-center justify-center text-white font-bold ${
                                  moveData.type === 'Brilliant' ? 'bg-cyan-500' :
                                  moveData.type === 'Best' ? 'bg-green-800' :
                                  moveData.type === 'Great' ? 'bg-green-500' :
                                  moveData.type === 'Balanced' ? 'bg-green-300' :
                                  moveData.type === 'Book' ? 'bg-amber-700' :
                                  moveData.type === 'Forced' ? 'bg-gray-500' :
                                  moveData.type === 'Inaccuracy' ? 'bg-yellow-500' :
                                  moveData.type === 'Mistake' ? 'bg-orange-500' :
                                  moveData.type === 'Blunder' ? 'bg-red-600' :
                                  moveData.type === 'Checkmate' ? 'bg-black' :
                                  'bg-gray-400'
                                }`}
                                title={`Half-move ${index + 1}: ${moveData.accuracy}% (${moveData.type})`}
                              >
                                {Math.floor(index / 2) + 1}{index % 2 === 0 ? 'w' : 'b'}
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                            <span>Brilliant</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-800 rounded"></div>
                            <span>Best</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Great</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-300 rounded"></div>
                            <span>Balanced</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-amber-700 rounded"></div>
                            <span>Book</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gray-500 rounded"></div>
                            <span>Forced</span>
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
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Progress value={gameAnalysis.summary.accuracy} className="h-3" />
                        <p className="text-sm text-muted-foreground">Overall game accuracy</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="moments" className="space-y-3">
                  {(() => {
                    // Filter moves for key moments (significant moves only)
                    const keyMoments = gameAnalysis.moves?.filter(move => 
                      ['Brilliant', 'Blunder', 'Mistake', 'Best', 'Checkmate'].includes(move.accuracy)
                    ) || []

                    if (keyMoments.length === 0) {
                      return (
                  <div className="text-center py-8 text-muted-foreground">
                          <p>No key moments found in this game.</p>
                          <p>All moves were balanced or inaccuracies.</p>
                        </div>
                      )
                    }

                    const getAccuracyBadgeColor = (accuracy: string) => {
                      switch (accuracy) {
                        case 'Brilliant': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                        case 'Best': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        case 'Checkmate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        case 'Blunder': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        case 'Mistake': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }
                    }

                    const getMoveTypeIcon = (accuracy: string) => {
                      switch (accuracy) {
                        case 'Brilliant': return '✨'
                        case 'Best': return '🎯'
                        case 'Checkmate': return '♔'
                        case 'Blunder': return '💥'
                        case 'Mistake': return '⚠️'
                        default: return '📍'
                      }
                    }

                    const getTacticType = (accuracy: string) => {
                      if (accuracy === 'Checkmate') return 'Checkmate'
                      if (accuracy === 'Brilliant') return 'Tactical Shot'
                      if (accuracy === 'Best') return 'Strong Move'
                      if (accuracy === 'Blunder') return 'Critical Error'
                      if (accuracy === 'Mistake') return 'Inaccurate Play'
                      return 'Key Position'
                    }

                    const toggleExpanded = (index: number) => {
                      const newExpanded = new Set(expandedMoments)
                      if (newExpanded.has(index)) {
                        newExpanded.delete(index)
                      } else {
                        newExpanded.add(index)
                      }
                      setExpandedMoments(newExpanded)
                    }

                    return (
                      <div className="space-y-2">
                        {keyMoments.map((moment, index) => {
                          const isExpanded = expandedMoments.has(index)
                          
                          return (
                            <Card key={index} className="overflow-hidden">
                              {/* Collapsed Summary - Always Visible */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                onClick={() => toggleExpanded(index)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-gray-500" />
                                      ) : (
                                        <ChevronDown className="h-5 w-5 text-gray-500" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold">Move {moment.moveNumber}: {moment.move}</h3>
                                        <Badge className={getAccuracyBadgeColor(moment.accuracy)}>
                                          {getMoveTypeIcon(moment.accuracy)} {moment.accuracy}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>Evaluation: {moment.evaluation > 0 ? '+' : ''}{(moment.evaluation / 100).toFixed(2)}</span>
                                        <span>{getTacticType(moment.accuracy)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Click to {isExpanded ? 'collapse' : 'expand'}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Content - Only When Expanded */}
                              {isExpanded && (
                                <div className="border-t bg-gray-50 dark:bg-gray-900/50">
                                  <div className="p-6">
                                    <div className="grid lg:grid-cols-2 gap-8">
                                      {/* Chess Position */}
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-medium text-lg">Position</h4>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setCurrentMoveIndex(moment.moveNumber - 1)
                                              const boardTab = document.querySelector('[value="board"]') as HTMLElement
                                              boardTab?.click()
                                            }}
                                          >
                                            View on Main Board
                                          </Button>
                                        </div>
                                        <div className="flex justify-center">
                                          <div className="w-full max-w-md aspect-square border rounded-lg bg-white dark:bg-gray-800 p-2">
                                            <div className="w-full h-full">
                                              <ChessBoard 
                                                pgn={gameAnalysis.pgn || selectedGame?.pgn || ''}
                                                userColor={getUserColor(gameAnalysis)}
                                                currentMoveIndex={moment.moveNumber - 1}
                                                className="w-full h-full"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* AI Commentary */}
                                      <div className="space-y-4">
                                        <h4 className="font-medium text-lg">AI Analysis</h4>
                                        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                              AI
                                            </div>
                                            <div className="space-y-3 min-w-0">
                                              <p className="text-sm leading-relaxed">
                                                {moment.comment || `This ${moment.accuracy.toLowerCase()} move occurred at move ${moment.moveNumber}. ${
                                                  moment.accuracy === 'Brilliant' ? 'Excellent calculation and tactical vision!' :
                                                  moment.accuracy === 'Best' ? 'The strongest move in the position.' :
                                                  moment.accuracy === 'Checkmate' ? 'Game decisive! Perfect execution.' :
                                                  moment.accuracy === 'Blunder' ? 'A significant error that changes the evaluation dramatically.' :
                                                  moment.accuracy === 'Mistake' ? 'An inaccurate move that gives the opponent an advantage.' :
                                                  'A critical moment in the game.'
                                                }`}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Move Details */}
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                                          <h5 className="font-medium mb-3">Move Details</h5>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Move Number:</span>
                                              <span className="font-medium">{moment.moveNumber}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Move Notation:</span>
                                              <span className="font-medium font-mono">{moment.move}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Evaluation:</span>
                                              <span className="font-medium">{moment.evaluation > 0 ? '+' : ''}{(moment.evaluation / 100).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Classification:</span>
                                              <span className="font-medium">{moment.accuracy}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Tactic Type:</span>
                                              <span className="font-medium">{getTacticType(moment.accuracy)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Card>
                          )
                        })}
                  </div>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="coach" className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        C
                      </div>
                      Coach Analysis
                    </h4>
                    <p className="text-sm leading-relaxed">{gameAnalysis.coachNotes}</p>
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 