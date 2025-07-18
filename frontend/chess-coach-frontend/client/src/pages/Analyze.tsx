import { useState, useEffect } from "react"
import { getGames, getGameAnalysis } from '@/api/games'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Upload, ExternalLink, BarChart3, Clock, Trophy, AlertCircle, CheckCircle, Star } from "lucide-react"
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
  criticalMoments: Array<{ moveNumber: number, type: string, description: string, delta_cp?: number, move?: string }>
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

  const getMomentIcon = (type: string) => {
    switch (type) {
      case 'brilliant':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'blunder':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'mistake':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="board">Board</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
                  <TabsTrigger value="moments">Key Moments</TabsTrigger>
                  <TabsTrigger value="coach">Coach Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="board" className="space-y-4">
                  <ChessBoard 
                    pgn={gameAnalysis.pgn || selectedGame?.pgn || ''}
                    criticalMoments={gameAnalysis.criticalMoments}
                    userColor={getUserColor(gameAnalysis)}
                    moveAccuracyData={gameAnalysis.moveAccuracyData}
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
                          {gameAnalysis.moveAccuracyData.map((moveData, index) => (
                            <div
                              key={index}
                              className={`h-6 rounded text-xs flex items-center justify-center text-white font-bold ${
                                moveData.type === 'blunder' ? 'bg-red-600' :
                                moveData.type === 'mistake' || moveData.type === 'miss' ? 'bg-orange-500' :
                                moveData.type === 'inaccuracy' ? 'bg-yellow-500' :
                                moveData.type === 'brilliant' ? 'bg-cyan-500' :
                                moveData.type === 'great' ? 'bg-green-500' :
                                moveData.type === 'good' ? 'bg-green-400' :
                                'bg-green-400'
                              }`}
                              title={`Half-move ${index + 1}: ${moveData.accuracy}% (${moveData.type})`}
                            >
                              {Math.floor(index / 2) + 1}{index % 2 === 0 ? 'w' : 'b'}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
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

                <TabsContent value="mistakes" className="space-y-3">
                  {gameAnalysis.moves && gameAnalysis.moves.length > 0 ? (
                    gameAnalysis.moves
                      .filter(move => move.accuracy === 'mistake' || move.accuracy === 'blunder' || move.accuracy === 'miss')
                      .map((move, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold">{move.move}</span>
                            <span className="text-sm text-muted-foreground">Move {move.moveNumber}</span>
                            <Badge variant={move.accuracy === 'blunder' ? 'destructive' : 'secondary'}>
                              {move.accuracy}
                            </Badge>
                          </div>
                          {move.comment && (
                            <p className="text-sm text-muted-foreground">{move.comment}</p>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No significant mistakes found in this game!</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="moments" className="space-y-3">
                  {gameAnalysis.criticalMoments && gameAnalysis.criticalMoments.length > 0 ? (
                    gameAnalysis.criticalMoments.map((moment, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to board tab and the specific move
                          const boardTab = document.querySelector('[value="board"]') as HTMLElement;
                          if (boardTab) {
                            boardTab.click();
                          }
                          console.log('Navigate to move', moment.moveNumber, moment);
                        }}
                      >
                        {getMomentIcon(moment.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Move {moment.moveNumber}</span>
                            {moment.move && (
                              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {moment.move}
                              </span>
                            )}
                            <Badge variant={moment.type === 'blunder' ? 'destructive' : moment.type === 'brilliant' ? 'default' : 'secondary'}>
                              {moment.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{moment.description}</p>
                          {moment.delta_cp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Evaluation change: {moment.delta_cp > 0 ? '+' : ''}{moment.delta_cp} centipawns
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No critical moments identified in this game.</p>
                    </div>
                  )}
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