import { useState, useEffect } from "react"
import { getLearningContent } from "@/api/learning"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, CheckCircle, Lock, Play, Star } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface Module {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: number
  progress: number
  isUnlocked: boolean
  lessons: Array<{
    id: string
    title: string
    completed: boolean
    duration: number
  }>
}

export function Learn() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await getLearningContent()
        setModules(data.modules || [])
      } catch (error) {
        console.error('Error fetching learning content:', error)
        toast({
          title: "Error",
          description: "Failed to load learning content",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [toast])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
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
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Learn Chess
        </h1>
        <p className="text-muted-foreground">
          Structured learning paths to improve your chess skills
        </p>
      </div>

      {/* Learning Modules */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Card
            key={module.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              !module.isUnlocked ? 'opacity-60' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <BookOpen className="h-5 w-5 text-blue-500" />
                {!module.isUnlocked && <Lock className="h-4 w-4 text-gray-400" />}
              </div>
              <CardTitle className="text-lg">{module.title}</CardTitle>
              <CardDescription className="text-sm">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getDifficultyColor(module.difficulty)}>
                  {module.difficulty}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {module.estimatedTime}min
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{module.progress}%</span>
                </div>
                <Progress value={module.progress} className="h-2" />
              </div>

              <div className="text-sm text-muted-foreground">
                {module.lessons.length} lessons
              </div>

              {module.isUnlocked && (
                <Button className="w-full">
                  {module.progress > 0 ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Start Module
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Your Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {modules.reduce((acc, module) => acc + module.lessons.filter(l => l.completed).length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Lessons Completed</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(modules.reduce((acc, module) => acc + module.progress, 0) / modules.length || 0)}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {modules.filter(m => m.isUnlocked).length}
              </div>
              <div className="text-sm text-muted-foreground">Modules Unlocked</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}