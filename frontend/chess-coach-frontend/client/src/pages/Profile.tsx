import { useState, useEffect } from "react"
import { getProfileData } from "@/api/profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, TrendingUp, Trophy, Target, BarChart3, Star, Lock, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/useToast"
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ProfileData {
  user: {
    id: string
    username: string
    email: string
    rating: number
    ratingHistory: Array<{ date: string, rating: number }>
    playstyle: string
    joinDate: string
    totalGames: number
    lessonsCompleted: number
  }
  skillTree: Array<{
    category: string
    skills: Array<{
      name: string
      level: number
      maxLevel: number
      isUnlocked: boolean
    }>
  }>
  statistics: {
    accuracy: number
    averageAccuracy: number
    strongestSkills: string[]
    improvementAreas: Array<{ skill: string, successRate: number, recommendation: string }>
  }
  achievements: Array<{
    id: string
    name: string
    description: string
    isUnlocked: boolean
    unlockedDate?: string
    icon: string
  }>
}

export function Profile() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const data = await getProfileData() as ProfileData
        setProfileData(data)
      } catch (error) {
        console.error('Error fetching profile data:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [toast])

  const getSkillColor = (level: number, maxLevel: number) => {
    const percentage = (level / maxLevel) * 100
    if (percentage === 0) return "bg-gray-200"
    if (percentage <= 25) return "bg-red-400"
    if (percentage <= 50) return "bg-yellow-400"
    if (percentage <= 75) return "bg-blue-400"
    return "bg-green-400"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load profile data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="chess-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="w-24 h-24 mx-auto md:mx-0">
              <AvatarImage src="/avatar.jpg" />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl">
                {profileData.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-2xl font-bold">{profileData.user.username}</h1>
              <p className="text-muted-foreground">{profileData.user.email}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  {profileData.user.rating} Rating
                </Badge>
                <Badge variant="outline">{profileData.user.playstyle}</Badge>
                <Badge variant="secondary">
                  Member since {new Date(profileData.user.joinDate).getFullYear()}
                </Badge>
              </div>
            </div>

            <div className="text-center space-y-4">
              <Button className="chess-button">
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600">{profileData.user.totalGames}</div>
                  <div className="text-muted-foreground">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600">{profileData.user.lessonsCompleted}</div>
                  <div className="text-muted-foreground">Lessons Done</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Rating Chart */}
          <Card className="chess-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Rating Progress
              </CardTitle>
              <CardDescription>
                Your rating progression over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Rating chart - to be implemented with recharts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="chess-card">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {profileData.statistics.accuracy}%
                </div>
                <div className="text-sm text-muted-foreground mb-2">Current Accuracy</div>
                <div className="text-xs text-green-600">
                  +{profileData.statistics.accuracy - profileData.statistics.averageAccuracy}% above average
                </div>
              </CardContent>
            </Card>

            <Card className="chess-card">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {profileData.user.rating}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Peak Rating</div>
                <div className="text-xs text-blue-600">
                  +{Math.max(...profileData.user.ratingHistory.map(h => h.rating)) - Math.min(...profileData.user.ratingHistory.map(h => h.rating))} total gain
                </div>
              </CardContent>
            </Card>

            <Card className="chess-card">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {profileData.statistics.strongestSkills.length}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Mastered Skills</div>
                <div className="text-xs text-purple-600">
                  Top strengths identified
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          {/* Skill Tree */}
          {profileData.skillTree.map((category) => (
            <Card key={category.category} className="chess-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {category.skills.map((skill) => (
                    <div key={skill.name} className={`p-4 rounded-lg border ${
                      skill.isUnlocked ? 'border-gray-200' : 'border-gray-100 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {skill.isUnlocked ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-medium">{skill.name}</span>
                        </div>
                        <Badge variant="outline">
                          {skill.level}/{skill.maxLevel}
                        </Badge>
                      </div>
                      <Progress
                        value={(skill.level / skill.maxLevel) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between mt-1">
                        {Array.from({ length: skill.maxLevel }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < skill.level ? getSkillColor(skill.level, skill.maxLevel) : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profileData.achievements.map((achievement) => (
              <Card key={achievement.id} className={`chess-card ${
                achievement.isUnlocked
                  ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                  : 'opacity-60'
              }`}>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h3 className="font-semibold mb-2">{achievement.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {achievement.description}
                  </p>
                  {achievement.isUnlocked ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <Trophy className="h-3 w-3 mr-1" />
                      Unlocked {achievement.unlockedDate && new Date(achievement.unlockedDate).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="improvement" className="space-y-6">
          {/* Strongest Skills */}
          <Card className="chess-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Your Strongest Skills
              </CardTitle>
              <CardDescription>
                Areas where you excel compared to players at your level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {profileData.statistics.strongestSkills.map((skill, index) => (
                  <div key={skill} className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl mb-2">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="font-medium">{skill}</div>
                    <div className="text-sm text-muted-foreground">#{index + 1} Strength</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Improvement Areas */}
          <Card className="chess-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Areas for Improvement
              </CardTitle>
              <CardDescription>
                Targeted recommendations to boost your performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData.statistics.improvementAreas.map((area) => (
                <div key={area.skill} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{area.skill}</h4>
                    <Badge variant="outline">{area.successRate}% success rate</Badge>
                  </div>
                  <Progress value={area.successRate} className="h-2 mb-2" />
                  <p className="text-sm text-muted-foreground">{area.recommendation}</p>
                  <Button size="sm" variant="outline" className="mt-2">
                    Start Practice
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}