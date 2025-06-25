import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import type { GameData } from '@/lib/api'

interface GameListProps {
  games: GameData[]
  selectedGameId: string | null
  isLoading: boolean
  onGameSelect: (game: GameData) => void
  onLoadMore?: () => void
  hasMore?: boolean
}

export function GameList({ 
  games, 
  selectedGameId, 
  isLoading, 
  onGameSelect, 
  onLoadMore, 
  hasMore = false 
}: GameListProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')
  const [gameModeFilter, setGameModeFilter] = useState<string>('all')
  const [colorFilter, setColorFilter] = useState<string>('all')

  // Utility function to determine game mode from time control
  const getGameMode = (timeControl: string): string => {
    if (!timeControl) return 'unknown'
    
    // Parse time control to get base time in seconds
    const timeMatch = timeControl.match(/^(\d+)/)
    if (!timeMatch) return 'unknown'
    
    const baseTime = parseInt(timeMatch[1])
    
    // If it contains a '+', it's likely already in minutes+increment format
    if (timeControl.includes('+')) {
      if (baseTime <= 3) return 'bullet'
      if (baseTime <= 10) return 'blitz'
      if (baseTime <= 30) return 'rapid'
      return 'classical'
    }
    
    // If it's a large number, assume it's in seconds
    if (baseTime > 600) { // > 10 minutes in seconds
      const minutes = baseTime / 60
      if (minutes <= 3) return 'bullet'
      if (minutes <= 10) return 'blitz'
      if (minutes <= 30) return 'rapid'
      return 'classical'
    }
    
    // Otherwise assume it's already in minutes
    if (baseTime <= 3) return 'bullet'
    if (baseTime <= 10) return 'blitz'
    if (baseTime <= 30) return 'rapid'
    return 'classical'
  }

  // Utility function to determine if user was playing white or black
  const getUserColor = (game: GameData): 'white' | 'black' | 'unknown' => {
    if (!user?.email) return 'unknown'
    
    // Try to match by email or username
    const userIdentifiers = [
      user.email,
      user.email.split('@')[0], // username part of email
      user.username
    ].filter(Boolean)
    
    const whitePlayerLower = game.white_player.toLowerCase()
    const blackPlayerLower = game.black_player.toLowerCase()
    
    for (const identifier of userIdentifiers) {
      if (identifier && whitePlayerLower.includes(identifier.toLowerCase())) {
        return 'white'
      }
      if (identifier && blackPlayerLower.includes(identifier.toLowerCase())) {
        return 'black'
      }
    }
    
    return 'unknown'
  }

  // Utility function to get user's result from the game
  const getUserResult = (game: GameData): 'win' | 'loss' | 'draw' | 'unknown' => {
    const userColor = getUserColor(game)
    if (userColor === 'unknown') return 'unknown'
    
    if (game.result.includes('1/2')) return 'draw'
    if (game.result === '1-0') return userColor === 'white' ? 'win' : 'loss'
    if (game.result === '0-1') return userColor === 'black' ? 'win' : 'loss'
    
    return 'unknown'
  }

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          game.white_player.toLowerCase().includes(query) ||
          game.black_player.toLowerCase().includes(query) ||
          game.opening.toLowerCase().includes(query)
        
        if (!matchesSearch) return false
      }

      // Platform filter
      if (platformFilter !== 'all' && game.platform !== platformFilter) {
        return false
      }

      // Game mode filter
      if (gameModeFilter !== 'all') {
        const gameMode = getGameMode(game.time_control)
        if (gameMode !== gameModeFilter) {
          return false
        }
      }

      // Color filter
      if (colorFilter !== 'all') {
        const userColor = getUserColor(game)
        if (userColor !== colorFilter) {
          return false
        }
      }

      // Result filter (updated to use user's perspective)
      if (resultFilter !== 'all') {
        const userResult = getUserResult(game)
        if (resultFilter === 'wins' && userResult !== 'win') {
          return false
        }
        if (resultFilter === 'draws' && userResult !== 'draw') {
          return false
        }
        if (resultFilter === 'losses' && userResult !== 'loss') {
          return false
        }
      }

      return true
    })
  }, [games, searchQuery, platformFilter, gameModeFilter, colorFilter, resultFilter, user])

  const getResultIcon = (game: GameData) => {
    const userResult = getUserResult(game)
    switch (userResult) {
      case 'win': return '🏆'
      case 'loss': return '❌'
      case 'draw': return '🤝'
      default: return '❓'
    }
  }

  const getResultColor = (game: GameData) => {
    const userResult = getUserResult(game)
    switch (userResult) {
      case 'win': return 'text-green-600'
      case 'loss': return 'text-red-600'
      case 'draw': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeControl = (timeControl: string) => {
    // Convert seconds to readable format
    if (timeControl.includes('+')) {
      return timeControl // Already formatted
    }
    
    const seconds = parseInt(timeControl)
    if (isNaN(seconds)) return timeControl
    
    const minutes = Math.floor(seconds / 60)
    const increment = 0 // Simplified
    
    return `${minutes}+${increment}`
  }

  const getAccuracyDisplay = (whiteAccuracy?: number, blackAccuracy?: number) => {
    if (!whiteAccuracy && !blackAccuracy) return null
    
    return (
      <div className="flex gap-2 text-xs">
        {whiteAccuracy && (
          <span className="text-gray-600">W: {Math.round(whiteAccuracy)}%</span>
        )}
        {blackAccuracy && (
          <span className="text-gray-600">B: {Math.round(blackAccuracy)}%</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            Your Games ({filteredGames.length})
          </CardTitle>
          <CardDescription>
            Browse and analyze your synced games
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by player name or opening..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Platforms</option>
                <option value="chess.com">Chess.com</option>
                <option value="lichess">Lichess</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Game Mode
              </label>
              <select
                value={gameModeFilter}
                onChange={(e) => setGameModeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Modes</option>
                <option value="bullet">Bullet</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
                <option value="classical">Classical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Both Colors</option>
                <option value="white">Playing White</option>
                <option value="black">Playing Black</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Result
              </label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Results</option>
                <option value="wins">My Wins</option>
                <option value="draws">My Draws</option>
                <option value="losses">My Losses</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-gray-600">Loading games...</div>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-gray-600">
              {games.length === 0 
                ? "No games found. Try syncing some games first!"
                : "No games match your current filters."
              }
            </div>
          </div>
        ) : (
          filteredGames.map((game) => (
            <Card
              key={game.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedGameId === game.id 
                  ? 'ring-2 ring-purple-500 bg-purple-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onGameSelect(game)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Players */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{game.white_player}</span>
                      <span className="text-gray-400">vs</span>
                      <span className="font-medium">{game.black_player}</span>
                                             <span className={`text-lg ${getResultColor(game)}`}>
                         {getResultIcon(game)}
                       </span>
                      <span className={`text-sm font-medium ${getResultColor(game)}`}>
                        {game.result}
                      </span>
                    </div>

                    {/* Game Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="capitalize">{game.platform}</span>
                      </span>
                      <span>{formatDate(game.played_at)}</span>
                      <span className="font-medium">{getGameMode(game.time_control)} - {formatTimeControl(game.time_control)}</span>
                      <span className="font-medium">{game.opening}</span>
                      {getUserColor(game) !== 'unknown' && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getUserColor(game) === 'white' 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-gray-800 text-white'
                        }`}>
                          Playing {getUserColor(game)}
                        </span>
                      )}
                    </div>

                    {/* Accuracy */}
                    {getAccuracyDisplay(game.white_accuracy, game.black_accuracy)}
                  </div>

                  {/* Select Indicator */}
                  <div className="ml-4">
                    {selectedGameId === game.id ? (
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm">▶</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Load More */}
        {hasMore && onLoadMore && (
          <div className="text-center py-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More Games'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 