import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SyncModalProps {
  isOpen: boolean
  platform: 'chess.com' | 'lichess' | null
  onClose: () => void
  onStartSync: (syncData: {
    platform: string
    username: string
    months: number
    lichessToken?: string
    fromDate?: string
    toDate?: string
    gameMode?: string
    result?: string
    color?: string
  }) => Promise<void>
}

export function SyncModal({ isOpen, platform, onClose, onStartSync }: SyncModalProps) {
  const [username, setUsername] = useState('')
  const [months, setMonths] = useState(1)
  const [lichessToken, setLichessToken] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [useCustomDates, setUseCustomDates] = useState(false)
  const [gameMode, setGameMode] = useState('all')
  const [result, setResult] = useState('all')
  const [color, setColor] = useState('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (platform === 'lichess' && !lichessToken.trim()) {
      setError('Lichess API token is required')
      return
    }

    if (useCustomDates && (!fromDate || !toDate)) {
      setError('Both from and to dates are required when using custom date range')
      return
    }

    if (useCustomDates && new Date(fromDate) >= new Date(toDate)) {
      setError('From date must be before to date')
      return
    }

    setIsLoading(true)

    try {
      await onStartSync({
        platform: platform!,
        username: username.trim(),
        months: useCustomDates ? 12 : months, // Default to 12 months for custom dates
        lichessToken: platform === 'lichess' ? lichessToken.trim() : undefined,
        fromDate: useCustomDates ? fromDate : undefined,
        toDate: useCustomDates ? toDate : undefined,
        gameMode: gameMode !== 'all' ? gameMode : undefined,
        result: result !== 'all' ? result : undefined,
        color: color !== 'all' ? color : undefined,
      })
      
      // Reset form on success
      setUsername('')
      setMonths(1)
      setLichessToken('')
      setFromDate('')
      setToDate('')
      setUseCustomDates(false)
      setGameMode('all')
      setResult('all')
      setColor('all')
      setShowAdvanced(false)
      onClose()
    } catch (error: any) {
      setError(error.message || 'Failed to start sync')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !platform) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">
              {platform === 'chess.com' ? '♟️' : '♞'}
            </span>
            Sync from {platform === 'chess.com' ? 'Chess.com' : 'Lichess'}
          </CardTitle>
          <CardDescription>
            Import and analyze your games from {platform === 'chess.com' ? 'Chess.com' : 'Lichess'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                {platform === 'chess.com' ? 'Chess.com' : 'Lichess'} Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your username"
                disabled={isLoading}
                required
              />
            </div>

            {platform === 'lichess' && (
              <div>
                <label htmlFor="lichessToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Lichess API Token
                </label>
                <input
                  type="password"
                  id="lichessToken"
                  value={lichessToken}
                  onChange={(e) => setLichessToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your Lichess API token"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your token from{' '}
                  <a
                    href="https://lichess.org/account/oauth/token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    lichess.org/account/oauth/token
                  </a>
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="useCustomDates"
                  checked={useCustomDates}
                  onChange={(e) => setUseCustomDates(e.target.checked)}
                  className="rounded"
                  disabled={isLoading}
                />
                <label htmlFor="useCustomDates" className="text-sm font-medium text-gray-700">
                  Use custom date range
                </label>
              </div>

              {useCustomDates ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="fromDate" className="block text-xs text-gray-600 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      id="fromDate"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="toDate" className="block text-xs text-gray-600 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      id="toDate"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="months" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Months
                  </label>
                  <select
                    id="months"
                    value={months}
                    onChange={(e) => setMonths(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value={1}>1 month</option>
                    <option value={2}>2 months</option>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>1 year</option>
                    <option value={24}>2 years</option>
                  </select>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="showAdvanced"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                  className="rounded"
                  disabled={isLoading}
                />
                <label htmlFor="showAdvanced" className="text-sm font-medium text-gray-700">
                  Show advanced filters
                </label>
              </div>

              {showAdvanced && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Filter games to sync (optional)
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label htmlFor="gameMode" className="block text-xs text-gray-600 mb-1">
                        Game Mode
                      </label>
                      <select
                        id="gameMode"
                        value={gameMode}
                        onChange={(e) => setGameMode(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isLoading}
                      >
                        <option value="all">All Game Modes</option>
                        <option value="bullet">Bullet (≤3 min)</option>
                        <option value="blitz">Blitz (3-10 min)</option>
                        <option value="rapid">Rapid (10-30 min)</option>
                        <option value="classical">Classical (&gt;30 min)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="result" className="block text-xs text-gray-600 mb-1">
                        Result Filter
                      </label>
                      <select
                        id="result"
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isLoading}
                      >
                        <option value="all">All Results</option>
                        <option value="wins">Only My Wins</option>
                        <option value="draws">Only My Draws</option>
                        <option value="losses">Only My Losses</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="color" className="block text-xs text-gray-600 mb-1">
                        Color Filter
                      </label>
                      <select
                        id="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isLoading}
                      >
                        <option value="all">Both Colors</option>
                        <option value="white">Only Playing White</option>
                        <option value="black">Only Playing Black</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    💡 These filters help you sync only specific types of games instead of all games from the selected time period.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Starting Sync...
                  </span>
                ) : (
                  'Start Sync'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 