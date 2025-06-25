import { useState, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useAuth } from '@/contexts/AuthContext'
import { backendApi, type SyncJob, type GameData } from '@/lib/api'
import { SyncModal } from '@/components/SyncModal'
import { SyncProgress } from '@/components/SyncProgress'
import { GameList } from '@/components/GameList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function Analyze() {
  const { user: supabaseUser } = useAuth()
  
  // Chess game state
  const [game, setGame] = useState(new Chess())
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [selectedGameData, setSelectedGameData] = useState<GameData | null>(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const completeGameRef = useRef<Chess | null>(null)
  
  // Backend authentication
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [loadingGameAnalysis, setLoadingGameAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Games data
  const [games, setGames] = useState<GameData[]>([])
  const [hasMoreGames, setHasMoreGames] = useState(true)
  const [gameOffset, setGameOffset] = useState(0)
  
  // Sync-related state
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean; platform: 'chess.com' | 'lichess' | null }>({ 
    isOpen: false, 
    platform: null 
  })
  const [activeSyncJob, setActiveSyncJob] = useState<SyncJob | null>(null)
  const [, setSyncHistory] = useState<SyncJob[]>([])

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize backend authentication
  useEffect(() => {
    const initializeBackendAuth = async () => {
      console.log('🚀 Initializing backend authentication...')
      console.log('Supabase user:', supabaseUser?.email)
      console.log('Backend already authenticated:', backendApi.isAuthenticated())
      
      if (supabaseUser && !backendApi.isAuthenticated()) {
        console.log('🔄 Starting backend authentication process...')
        try {
          const result = await backendApi.tryAutoLogin(supabaseUser)
          if (result.success) {
            console.log('✅ Backend authentication successful!')
            setIsBackendAuthenticated(true)
            void Promise.all([loadSyncHistory(), loadGames()])
          } else {
            console.log('❌ Backend auto-login failed:', result.message)
            setError(`Backend authentication failed: ${result.message}`)
          }
        } catch (error: any) {
          console.error('💥 Backend authentication error:', error)
          setError(`Backend authentication error: ${error.message}`)
        }
      } else if (backendApi.isAuthenticated()) {
        console.log('✅ Using existing backend authentication')
        setIsBackendAuthenticated(true)
        void Promise.all([loadSyncHistory(), loadGames()])
      } else {
        console.log('⏳ Waiting for Supabase user...')
      }
    }

    initializeBackendAuth()
  }, [supabaseUser])

  // Load sync history
  const loadSyncHistory = async () => {
    try {
      console.log('📅 Loading sync history...')
      const response = await backendApi.getSyncHistory()
      console.log('📅 Sync history response:', response)
      
      const history = Array.isArray(response) ? response : []
      setSyncHistory(history)
      
      // Check for any active sync jobs
      const activeSyncs = history.filter(job => 
        job.status === 'pending' || job.status === 'fetching' || job.status === 'analyzing'
      )
      
      if (activeSyncs.length > 0) {
        setActiveSyncJob(activeSyncs[0])
        console.log('🔄 Found active sync job:', activeSyncs[0])
      }
    } catch (error: any) {
      console.error('💥 Failed to load sync history:', error)
      setSyncHistory([])
    }
  }

  // Load games from backend
  const loadGames = async (offset = 0, append = false) => {
    if (!isBackendAuthenticated) {
      console.log('🎮 Skipping games load - not authenticated')
      return
    }
    
    console.log('🎮 Loading games...')
    setIsLoading(true)
    try {
      const gamesData = await backendApi.getGames(20, offset)
      console.log('🎮 Games loaded:', gamesData)
      
      const gamesList = Array.isArray(gamesData) ? gamesData : []
      
      if (append) {
        setGames(prev => [...prev, ...gamesList])
      } else {
        setGames(gamesList)
      }
      
      setHasMoreGames(gamesList.length === 20)
      setGameOffset(offset + gamesList.length)
      
      console.log('🎮 Games set:', gamesList.length, 'games')
    } catch (error: any) {
      console.error('💥 Failed to load games:', error)
      if (!error.message.includes('404') && !error.message.includes('not found')) {
        setError('Failed to load games: ' + error.message)
      }
      if (!append) {
        setGames([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Load more games
  const handleLoadMoreGames = () => {
    loadGames(gameOffset, true)
  }

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // TODO: Implement PGN file parsing
      console.log('PGN file selected:', file.name)
      setError('PGN file upload is not yet implemented. Please use the sync feature instead.')
    }
  }

  // Sync handlers
  const handleSyncButtonClick = (platform: 'chess.com' | 'lichess') => {
    if (!supabaseUser) {
      setError('Please login to sync your games')
      return
    }

    if (!isBackendAuthenticated) {
      setError('Backend authentication required. Please try refreshing the page.')
      return
    }

    setSyncModal({ isOpen: true, platform })
  }

  const handleStartSync = async (syncData: any) => {
    try {
      setError(null)
      const result = await backendApi.startSync(
        syncData.platform,
        syncData.username,
        syncData.months,
        syncData.lichessToken,
        syncData.fromDate,
        syncData.toDate,
        syncData.gameMode,
        syncData.result,
        syncData.color
      )
      
      setActiveSyncJob(result)
      await loadSyncHistory()
      
      console.log('Sync started successfully:', result)
    } catch (error: any) {
      setError('Failed to start sync: ' + error.message)
      throw error
    }
  }

  const handleSyncComplete = async (syncResult: SyncJob) => {
    console.log('Sync completed:', syncResult)
    setActiveSyncJob(null)
    void Promise.all([loadSyncHistory(), loadGames()])
  }

  const handleSyncError = (errorMessage: string) => {
    setError('Sync failed: ' + errorMessage)
    setActiveSyncJob(null)
  }

  // Game selection and analysis
  const handleGameSelect = async (gameItem: GameData) => {
    console.log('🎯 Game selected:', gameItem)
    
    if (!gameItem?.id) {
      console.error('❌ Invalid game item:', gameItem)
      setError('Invalid game selected')
      return
    }

    if (!isBackendAuthenticated) {
      setError('Backend authentication required to view game analysis')
      return
    }

    setSelectedGame(gameItem.id)
    setLoadingGameAnalysis(true)
    setError(null)

    try {
      console.log('📡 Fetching game analysis for ID:', gameItem.id)
      const gameData = await backendApi.getGameAnalysis(gameItem.id)
      console.log('📊 Game analysis received:', gameData)
      
      setSelectedGameData(gameData)
      
      // Initialize the chess game with the PGN if available
      if (gameData.pgn && typeof gameData.pgn === 'string' && gameData.pgn.trim().length > 0) {
        try {
          console.log('🎯 Loading PGN for game:', gameData.id)
          
          // Clean the PGN before attempting to parse it
          let cleanedPgn = gameData.pgn.trim()
            .replace(/\(\%[^)]*\)/g, '') // Remove malformed annotations
            .replace(/\{[^}]*\}/g, '') // Remove comments in braces
            .replace(/\([^)]*\)/g, '') // Remove parenthetical annotations
            .replace(/\$\d+/g, '') // Remove numeric annotations
            .replace(/\?+/g, '') // Remove question marks
            .replace(/!+/g, '') // Remove exclamation marks
            .replace(/[^\w\s\-\.=+#O\n\[\]]/g, ' ') // Keep only valid PGN characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
          
          // Create a new game and load the cleaned PGN
          const newGame = new Chess()
          
          try {
            newGame.loadPgn(cleanedPgn)
            // If we get here, PGN was loaded successfully
            console.log('✅ PGN loaded successfully')
            console.log('📚 Total moves:', newGame.history().length)
            
            // Reset to starting position for navigation
            const gameFromStart = new Chess()
            setGame(gameFromStart)
            setCurrentMoveIndex(0)
            
            // Store the complete game for navigation
            completeGameRef.current = newGame
            setError(null)
          } catch (loadError) {
            console.error('❌ Failed to load PGN:', loadError)
            setError('Unable to parse game moves - PGN format may be corrupted')
            setGame(new Chess())
            setCurrentMoveIndex(0)
            completeGameRef.current = null
          }
        } catch (pgnError: any) {
          console.error('💥 Error loading PGN:', pgnError)
          setError('Game moves are corrupted and cannot be parsed. Try re-syncing this game.')
          setGame(new Chess())
          setCurrentMoveIndex(0)
          completeGameRef.current = null
        }
      } else {
        console.log('⚠️ No valid PGN data available for this game')
        setGame(new Chess())
        setCurrentMoveIndex(0)
        completeGameRef.current = null
      }
    } catch (error: any) {
      setError('Failed to load game analysis: ' + error.message)
      console.error('Error loading game analysis:', error)
    } finally {
      setLoadingGameAnalysis(false)
    }
  }

  // Game navigation
  const goToNextMove = () => {
    if (!completeGameRef.current) return

    const totalMoves = completeGameRef.current.history().length
    
    if (currentMoveIndex < totalMoves) {
      const newGame = new Chess()
      const moves = completeGameRef.current.history()
      
      for (let i = 0; i <= currentMoveIndex; i++) {
        try {
          newGame.move(moves[i])
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError)
          break
        }
      }
      
      setGame(newGame)
      setCurrentMoveIndex(currentMoveIndex + 1)
    }
  }

  const goToPreviousMove = () => {
    if (!completeGameRef.current) return

    if (currentMoveIndex > 0) {
      const newGame = new Chess()
      const moves = completeGameRef.current.history()
      
      for (let i = 0; i < currentMoveIndex - 1; i++) {
        try {
          newGame.move(moves[i])
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError)
          break
        }
      }
      
      setGame(newGame)
      setCurrentMoveIndex(currentMoveIndex - 1)
    }
  }

  const goToMove = (moveIndex: number) => {
    if (!completeGameRef.current) return

    const totalMoves = completeGameRef.current.history().length
    
    if (moveIndex >= 0 && moveIndex <= totalMoves) {
      const newGame = new Chess()
      const moves = completeGameRef.current.history()
      
      for (let i = 0; i < moveIndex; i++) {
        try {
          newGame.move(moves[i])
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError)
          break
        }
      }
      
      setGame(newGame)
      setCurrentMoveIndex(moveIndex)
    }
  }

  const getTotalMoves = () => {
    return completeGameRef.current ? completeGameRef.current.history().length : 0
  }

  // Utility function to safely parse key moments
  const parseKeyMoments = (keyMoments: string | any[] | undefined) => {
    if (!keyMoments) return []
    
    try {
      if (typeof keyMoments === 'string') {
        const parsed = JSON.parse(keyMoments)
        return Array.isArray(parsed) ? parsed : []
      }
      if (Array.isArray(keyMoments)) {
        return keyMoments
      }
      return []
    } catch (error) {
      console.warn('Failed to parse key_moments:', error)
      return []
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Analyze Your Games
        </h1>
        <p className="text-xl text-muted-foreground">
          Import your games and get AI-powered analysis to improve your play
        </p>
      </div>

      {/* Authentication Status */}
      {supabaseUser && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium">Welcome, {supabaseUser.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {isBackendAuthenticated ? '🔒 Sync Ready' : '⚠️ Sync Authentication Required'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-xl">⚠️</span>
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Upload/Sync Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📂</span>
            Import Your Games
          </CardTitle>
          <CardDescription>
            Upload PGN files or sync directly from chess platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PGN Upload */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 flex flex-col gap-2"
              disabled={!isBackendAuthenticated}
            >
              <span className="text-2xl">📄</span>
              <span>Upload PGN File</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Chess.com Sync */}
            <Button
              variant="outline"
              onClick={() => handleSyncButtonClick('chess.com')}
              className="h-20 flex flex-col gap-2"
              disabled={!isBackendAuthenticated}
            >
              <span className="text-2xl">♟️</span>
              <span>Sync from Chess.com</span>
            </Button>

            {/* Lichess Sync */}
            <Button
              variant="outline"
              onClick={() => handleSyncButtonClick('lichess')}
              className="h-20 flex flex-col gap-2"
              disabled={!isBackendAuthenticated}
            >
              <span className="text-2xl">♞</span>
              <span>Sync from Lichess</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sync Progress */}
      {activeSyncJob && (
        <div className="mb-8">
          <SyncProgress
            syncJob={activeSyncJob}
            onComplete={handleSyncComplete}
            onError={handleSyncError}
          />
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Games List */}
        <div>
          <GameList
            games={games}
            selectedGameId={selectedGame}
            isLoading={isLoading}
            onGameSelect={handleGameSelect}
            onLoadMore={hasMoreGames ? handleLoadMoreGames : undefined}
            hasMore={hasMoreGames}
          />
        </div>

        {/* Game Analysis */}
        <div className="space-y-6">
          {selectedGameData ? (
            <>
              {/* Game Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">♟️</span>
                    Game Analysis
                  </CardTitle>
                  <CardDescription>
                    {selectedGameData.white_player} vs {selectedGameData.black_player}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="capitalize">{selectedGameData.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Result:</span>
                      <span>{selectedGameData.result}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opening:</span>
                      <span>{selectedGameData.opening}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Control:</span>
                      <span>{selectedGameData.time_control}</span>
                    </div>
                    {(selectedGameData.white_accuracy || selectedGameData.black_accuracy) && (
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span>
                          {selectedGameData.white_accuracy && `W: ${Math.round(selectedGameData.white_accuracy)}%`}
                          {selectedGameData.white_accuracy && selectedGameData.black_accuracy && ' | '}
                          {selectedGameData.black_accuracy && `B: ${Math.round(selectedGameData.black_accuracy)}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chess Board */}
              <Card>
                <CardHeader>
                  <CardTitle>Position Analysis</CardTitle>
                  <CardDescription>
                    Move {currentMoveIndex} of {getTotalMoves()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGameAnalysis ? (
                    <div className="text-center py-8">
                      <div className="text-2xl mb-2">🔄</div>
                      <div className="text-gray-600">Loading game analysis...</div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Chessboard
                          position={game.fen()}
                          arePiecesDraggable={false}
                          boardWidth={350}
                        />
                      </div>

                      {/* Move Navigation */}
                      <div className="flex justify-center gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToMove(0)}
                          disabled={currentMoveIndex === 0}
                        >
                          ⏮️
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousMove}
                          disabled={currentMoveIndex === 0}
                        >
                          ⏪
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextMove}
                          disabled={currentMoveIndex >= getTotalMoves()}
                        >
                          ⏩
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToMove(getTotalMoves())}
                          disabled={currentMoveIndex >= getTotalMoves()}
                        >
                          ⏭️
                        </Button>
                      </div>

                      {/* Key Moments */}
                      {selectedGameData.key_moments && parseKeyMoments(selectedGameData.key_moments).length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Key Moments</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {parseKeyMoments(selectedGameData.key_moments).map((moment: any, index: number) => (
                              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                                <div className="font-medium">Move {moment.move_number || index + 1}</div>
                                <div className="text-gray-600">{moment.analysis || moment.description || 'Critical position'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-2xl mb-4">🎯</div>
                <h3 className="text-xl font-medium mb-2">Select a Game to Analyze</h3>
                <p className="text-muted-foreground">
                  Choose a game from your collection to view detailed analysis and key moments
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sync Modal */}
      <SyncModal
        isOpen={syncModal.isOpen}
        platform={syncModal.platform}
        onClose={() => setSyncModal({ isOpen: false, platform: null })}
        onStartSync={handleStartSync}
      />
    </div>
  )
} 