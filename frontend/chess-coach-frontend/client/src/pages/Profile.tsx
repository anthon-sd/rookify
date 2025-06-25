import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

interface UserProfile {
  gamesPlayed: number
  winRate: number
  averageAccuracy: number
  favoriteOpening: string
  strongestPhase: string
  weakestPhase: string
  ratingHistory: Array<{ date: string; rating: number }>
  achievements: Array<{ 
    id: string
    title: string
    description: string
    dateEarned: string
    icon: string
  }>
  gameStats: {
    wins: number
    losses: number
    draws: number
    totalTime: string
  }
  tacticalStats: {
    puzzlesSolved: number
    accuracy: number
    averageRating: number
    favoriteTheme: string
  }
}

export function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  // Mock data - in production this would be fetched from API
  useEffect(() => {
    if (user) {
      setLoading(true)
      setTimeout(() => {
        setProfile({
          gamesPlayed: Math.floor(Math.random() * 200) + 50,
          winRate: Math.floor(Math.random() * 30) + 55,
          averageAccuracy: Math.floor(Math.random() * 20) + 75,
          favoriteOpening: "Sicilian Defense",
          strongestPhase: "Middle Game",
          weakestPhase: "Endgame",
          ratingHistory: [
            { date: "2024-01-01", rating: 1180 },
            { date: "2024-01-15", rating: 1220 },
            { date: "2024-02-01", rating: 1195 },
            { date: "2024-02-15", rating: 1245 },
            { date: "2024-03-01", rating: user.rating || 1200 },
          ],
          achievements: [
            {
              id: "1",
              title: "First Victory",
              description: "Won your first game",
              dateEarned: "2024-01-05",
              icon: "🏆"
            },
            {
              id: "2", 
              title: "Puzzle Master",
              description: "Solved 100 tactical puzzles",
              dateEarned: "2024-01-20",
              icon: "🧩"
            },
            {
              id: "3",
              title: "Rating Climber",
              description: "Increased rating by 50 points",
              dateEarned: "2024-02-10",
              icon: "📈"
            }
          ],
          gameStats: {
            wins: Math.floor(Math.random() * 80) + 30,
            losses: Math.floor(Math.random() * 60) + 20,
            draws: Math.floor(Math.random() * 20) + 5,
            totalTime: "48h 32m"
          },
          tacticalStats: {
            puzzlesSolved: Math.floor(Math.random() * 300) + 100,
            accuracy: Math.floor(Math.random() * 25) + 70,
            averageRating: Math.floor(Math.random() * 200) + 1400,
            favoriteTheme: "Pin"
          }
        })
        setLoading(false)
      }, 1000)
    }
  }, [user])

  const getRatingTrend = () => {
    if (!profile?.ratingHistory || profile.ratingHistory.length < 2) return "stable"
    const latest = profile.ratingHistory[profile.ratingHistory.length - 1].rating
    const previous = profile.ratingHistory[profile.ratingHistory.length - 2].rating
    return latest > previous ? "up" : latest < previous ? "down" : "stable"
  }

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case "up": return "📈"
      case "down": return "📉"
      default: return "➡️"
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up": return "text-green-600"
      case "down": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Please log in to view your profile</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Skill Profile
        </h1>
        <p className="text-xl text-muted-foreground">
          Track your chess improvement and performance metrics
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-2xl">📊 Loading your profile...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Info & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Player Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                    {(user.username || user.email)[0].toUpperCase()}
                  </div>
                  <h3 className="text-xl font-semibold">{user.username || "Player"}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Current Rating:</span>
                    <span className="font-semibold">{user.rating || 1200}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Play Style:</span>
                    <span className="font-semibold">{user.playstyle || "Balanced"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Member Since:</span>
                    <span className="font-semibold">Jan 2024</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{profile?.gamesPlayed || 0}</div>
                    <div className="text-sm text-muted-foreground">Games Played</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{profile?.winRate || 0}%</div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{profile?.averageAccuracy || 0}%</div>
                    <div className="text-sm text-muted-foreground">Avg. Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className={`text-3xl font-bold ${getTrendColor(getRatingTrend())}`}>
                      {getTrendEmoji(getRatingTrend())}
                    </div>
                    <div className="text-sm text-muted-foreground">Rating Trend</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🎮</span>
                  Game Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-green-600 text-xl">🏆</span>
                      Wins
                    </span>
                    <span className="font-bold text-green-600">{profile?.gameStats.wins || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-red-600 text-xl">❌</span>
                      Losses
                    </span>
                    <span className="font-bold text-red-600">{profile?.gameStats.losses || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-yellow-600 text-xl">🤝</span>
                      Draws
                    </span>
                    <span className="font-bold text-yellow-600">{profile?.gameStats.draws || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600 text-xl">⏱️</span>
                      Total Play Time
                    </span>
                    <span className="font-bold text-blue-600">{profile?.gameStats.totalTime || "0h 0m"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🧩</span>
                  Tactical Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span>Puzzles Solved</span>
                    <span className="font-bold text-purple-600">{profile?.tacticalStats.puzzlesSolved || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Accuracy</span>
                    <span className="font-bold text-green-600">{profile?.tacticalStats.accuracy || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Average Rating</span>
                    <span className="font-bold text-blue-600">{profile?.tacticalStats.averageRating || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span>Favorite Theme</span>
                    <span className="font-bold text-orange-600">{profile?.tacticalStats.favoriteTheme || "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💪</span>
                  Strengths & Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">🔥 Strongest Phase</h4>
                  <p className="text-green-700">{profile?.strongestPhase || "Middle Game"}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">📚 Focus Area</h4>
                  <p className="text-yellow-700">{profile?.weakestPhase || "Endgame"}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">♟️ Favorite Opening</h4>
                  <p className="text-blue-700">{profile?.favoriteOpening || "Italian Game"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏅</span>
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile?.achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground">Earned on {achievement.dateEarned}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                Rating Progress
              </CardTitle>
              <CardDescription>
                Your rating progression over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {profile?.ratingHistory.map((entry, index) => (
                    <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold">{entry.rating}</div>
                      <div className="text-xs text-muted-foreground">{entry.date}</div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Button variant="outline">View Detailed History</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 