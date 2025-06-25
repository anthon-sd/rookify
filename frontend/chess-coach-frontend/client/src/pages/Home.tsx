import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface UserStats {
  gamesAnalyzed: number
  drillsCompleted: number
  averageAccuracy: number
  recentGames: Array<{
    id: string
    opponent: string
    result: 'win' | 'loss' | 'draw'
    date: string
    rating: number
  }>
}

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userStats, setUserStats] = useState<UserStats>({
    gamesAnalyzed: 0,
    drillsCompleted: 0,
    averageAccuracy: 0,
    recentGames: []
  })
  const [loading, setLoading] = useState(false)

  // Mock data for demonstration - in production this would fetch from API
  useEffect(() => {
    if (user) {
      setLoading(true)
      // Simulate API call with mock data
      setTimeout(() => {
        setUserStats({
          gamesAnalyzed: Math.floor(Math.random() * 50) + 10,
          drillsCompleted: Math.floor(Math.random() * 100) + 25,
          averageAccuracy: Math.floor(Math.random() * 30) + 70,
          recentGames: [
            { id: '1', opponent: 'ChessMaster2000', result: 'win', date: '2024-01-15', rating: 1650 },
            { id: '2', opponent: 'TacticalGuru', result: 'loss', date: '2024-01-14', rating: 1700 },
            { id: '3', opponent: 'EndgameExpert', result: 'draw', date: '2024-01-13', rating: 1625 },
          ]
        })
        setLoading(false)
      }, 1000)
    }
  }, [user])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const handleQuickStart = (action: string) => {
    switch (action) {
      case 'analyze':
        navigate('/analyze')
        break
      case 'drills':
        navigate('/drills')
        break
      case 'profile':
        navigate('/profile')
        break
      default:
        break
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-600'
      case 'loss': return 'text-red-600'
      case 'draw': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getResultEmoji = (result: string) => {
    switch (result) {
      case 'win': return '🏆'
      case 'loss': return '❌'
      case 'draw': return '🤝'
      default: return '🎯'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {user ? `${getGreeting()}, ${user.username || user.email}!` : 'Welcome to RookifyCoach'}
        </h1>
        <p className="text-xl text-muted-foreground">
          {user ? 'Ready to improve your chess skills today?' : 'Your AI-powered chess coaching companion'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('analyze')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Game Analysis
            </CardTitle>
            <CardDescription>
              Upload and analyze your chess games with AI-powered insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleQuickStart('analyze')}>
              Analyze Games
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('drills')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Training Drills
            </CardTitle>
            <CardDescription>
              Practice tactical patterns and improve your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleQuickStart('drills')}>
              Start Drills
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleQuickStart('profile')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Skill Profile
            </CardTitle>
            <CardDescription>
              Track your progress and see detailed performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleQuickStart('profile')}>
              View Profile
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Your Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading stats...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{user.rating || 1200}</div>
                    <div className="text-sm text-muted-foreground">Current Rating</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{userStats.gamesAnalyzed}</div>
                    <div className="text-sm text-muted-foreground">Games Analyzed</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{userStats.drillsCompleted}</div>
                    <div className="text-sm text-muted-foreground">Drills Completed</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{userStats.averageAccuracy}%</div>
                    <div className="text-sm text-muted-foreground">Avg. Accuracy</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading recent games...</div>
              ) : userStats.recentGames.length > 0 ? (
                <div className="space-y-3">
                  {userStats.recentGames.map((game) => (
                    <div key={game.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getResultEmoji(game.result)}</span>
                        <div>
                          <div className="font-medium">vs {game.opponent}</div>
                          <div className="text-sm text-muted-foreground">{game.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${getResultColor(game.result)}`}>
                          {game.result.toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground">{game.rating}</div>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => navigate('/analyze')}
                  >
                    View All Games
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">🎲</div>
                  <p>No recent games found</p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/analyze')}
                  >
                    Upload Your First Game
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Tip */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Daily Chess Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">
            "Control the center squares early in the game. Pieces placed on central squares like e4, d4, e5, and d5 have maximum mobility and influence over the board."
          </p>
          <Button 
            variant="outline"
            onClick={() => navigate('/learn')}
          >
            Learn More Tips
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 