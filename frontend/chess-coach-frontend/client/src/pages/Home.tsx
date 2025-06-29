import { useState, useEffect } from "react"
import { getDashboardData } from "@/api/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Target, BookOpen, Trophy, ChevronRight, Zap, Star, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { SyncGamesDialog } from "@/components/SyncGamesDialog"

interface DashboardData {
  greeting: string
  rating: number
  ratingTrend: 'up' | 'down' | 'stable'
  dailyChallenge: {
    title: string
    difficulty: string
    theme: string
  }
  weeklyStats: {
    gamesPlayed: number
    wins: number
    losses: number
    draws: number
  }
  accuracy: {
    current: number
    trend: number
  }
  streak: {
    type: string
    count: number
  }
  timeSpent: number
  currentJourney: {
    name: string
    progress: number
    nextMilestone: string
  }
  recommendations: Array<{
    type: string
    title: string
    description: string
    action: string
  }>
}

export function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getDashboardData() as DashboardData
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load dashboard data</p>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'review': return <BookOpen className="h-5 w-5 text-slate-800 dark:text-slate-200" />
      case 'practice': return <Target className="h-5 w-5 text-emerald-600" />
      case 'advance': return <Star className="h-5 w-5 text-amber-500" />
      default: return <Zap className="h-5 w-5 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="rookify-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
              {dashboardData.greeting}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{dashboardData.rating}</span>
                {getTrendIcon(dashboardData.ratingTrend)}
              </div>
              <Badge variant="secondary" className="rookify-badge">
                Current Rating
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            <Card className="rookify-card border-2 border-amber-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Daily Challenge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="font-semibold">{dashboardData.dailyChallenge.title}</h3>
                <p className="text-sm text-muted-foreground">{dashboardData.dailyChallenge.theme}</p>
                <Badge variant="outline" className="border-amber-400 text-amber-600">{dashboardData.dailyChallenge.difficulty}</Badge>
                <Button className="w-full rookify-button-gold mt-3">
                  Start Challenge
                </Button>
              </CardContent>
            </Card>

            <Card className="rookify-card border-2 border-blue-400">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-blue-500" />
                  Sync Your Games
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Import and analyze games from Chess.com or Lichess</p>
                <SyncGamesDialog 
                  trigger={
                    <Button className="w-full rookify-button-primary mt-3">
                      Sync Games
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rookify-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dashboardData.weeklyStats.gamesPlayed}</div>
            <p className="text-sm text-muted-foreground">Games This Week</p>
            <div className="text-xs mt-1 text-slate-600 dark:text-slate-400">
              {dashboardData.weeklyStats.wins}W - {dashboardData.weeklyStats.losses}L - {dashboardData.weeklyStats.draws}D
            </div>
          </CardContent>
        </Card>

        <Card className="rookify-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-emerald-600">{dashboardData.accuracy.current}%</span>
              {dashboardData.accuracy.trend > 0 && (
                <span className="text-sm text-emerald-500">+{dashboardData.accuracy.trend}%</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </CardContent>
        </Card>

        <Card className="rookify-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{dashboardData.streak.count}</div>
            <p className="text-sm text-muted-foreground">{dashboardData.streak.type} Streak</p>
            <div className="flex justify-center mt-1">
              {Array.from({ length: Math.min(dashboardData.streak.count, 5) }).map((_, i) => (
                <div key={i} className="w-2 h-2 bg-violet-500 rounded-full mx-0.5"></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rookify-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{dashboardData.timeSpent}</span>
            </div>
            <p className="text-sm text-muted-foreground">Minutes This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Journey Progress */}
      <Card className="rookify-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            Active Journey Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{dashboardData.currentJourney.name}</h3>
              <p className="text-sm text-muted-foreground">{dashboardData.currentJourney.nextMilestone}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">{dashboardData.currentJourney.progress}%</div>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
          <Progress value={dashboardData.currentJourney.progress} className="h-3" />
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Zap className="h-5 w-5 text-amber-500" />
          Personalized Recommendations
        </h2>
        <div className="grid gap-4">
          {dashboardData.recommendations.map((rec, index) => (
            <Card key={index} className="rookify-card hover:shadow-xl transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    {getRecommendationIcon(rec.type)}
                    <div className="space-y-1">
                      <h3 className="font-semibold group-hover:text-amber-600 transition-colors text-slate-900 dark:text-slate-100">
                        {rec.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="group-hover:bg-amber-50 dark:group-hover:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      {rec.action}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}