import { useState, useEffect } from "react"
import { getGames, getGameAnalysis } from "@/api/games"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Upload, ExternalLink, BarChart3, Clock, Trophy, AlertCircle, CheckCircle, Star } from "lucide-react"
import { useToast } from "@/hooks/useToast"

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
}

interface GameAnalysis {
  moves: Array<{ move: string, evaluation: number, accuracy: string, comment?: string }>
  criticalMoments: Array<{ moveNumber: number, type: string, description: string }>
  summary: { accuracy: number, mistakes: number, blunders: number, brilliantMoves: number }
  coachNotes: string
}

export function Analyze() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const data = await getGames() as { games: Game[] }
        setGames(data.games)
      } catch (error) {
        console.error('Error fetching games:', error)
        toast({
          title: "Error",
          description: "Failed to load games",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [toast])

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
          <Button variant="outline" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Connect Chess.com
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Games Library */}
        <Card className="chess-card">
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
            {games.map((game) => (
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
                      {game.accuracy}%
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
        <Card className="chess-card">
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
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
                  <TabsTrigger value="moments">Key Moments</TabsTrigger>
                  <TabsTrigger value="coach">Coach Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{gameAnalysis.summary.accuracy}%</div>
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

                  <div className="space-y-2">
                    <h4 className="font-medium">Accuracy Throughout Game</h4>
                    <Progress value={gameAnalysis.summary.accuracy} className="h-2" />
                  </div>
                </TabsContent>

                <TabsContent value="mistakes" className="space-y-3">
                  {gameAnalysis.moves
                    .filter(move => move.accuracy === 'mistake' || move.accuracy === 'blunder')
                    .map((move, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold">{move.move}</span>
                          <Badge variant={move.accuracy === 'blunder' ? 'destructive' : 'secondary'}>
                            {move.accuracy}
                          </Badge>
                        </div>
                        {move.comment && (
                          <p className="text-sm text-muted-foreground">{move.comment}</p>
                        )}
                      </div>
                    ))}
                </TabsContent>

                <TabsContent value="moments" className="space-y-3">
                  {gameAnalysis.criticalMoments.map((moment, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getMomentIcon(moment.type)}
                      <div>
                        <div className="font-medium">Move {moment.moveNumber}</div>
                        <p className="text-sm text-muted-foreground">{moment.description}</p>
                      </div>
                    </div>
                  ))}
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