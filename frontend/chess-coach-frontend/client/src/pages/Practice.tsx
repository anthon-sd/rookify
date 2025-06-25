import { useState, useEffect } from "react"
import { getPracticeExercises } from "@/api/practice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, Zap, Trophy, Play, Timer } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface Exercise {
  id: string
  title: string
  difficulty: string
  completed: boolean
  rating: number
  timeLimit: number
  description: string
}

interface Category {
  id: string
  title: string
  description: string
  icon: string
  exercises: Exercise[]
}

export function Practice() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const data = await getPracticeExercises()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Error fetching practice exercises:', error)
        toast({
          title: "Error",
          description: "Failed to load practice exercises",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchExercises()
  }, [toast])

  const handleStartExercise = (exerciseId: string) => {
    toast({
      title: "Starting Exercise",
      description: `Loading exercise ${exerciseId}...`,
    })
  }

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
          Practice Arena
        </h1>
        <p className="text-muted-foreground">
          Sharpen your chess skills with focused practice
        </p>
      </div>

      {/* Exercise Categories */}
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">{category.icon}</span>
              {category.title}
            </CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.exercises.map((exercise) => (
                <Card key={exercise.id} className="cursor-pointer hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getDifficultyColor(exercise.difficulty)}>
                        {exercise.difficulty}
                      </Badge>
                      {exercise.completed && <Trophy className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <CardTitle className="text-lg">{exercise.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {exercise.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Rating: {exercise.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {exercise.timeLimit}s
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      variant={exercise.completed ? "secondary" : "default"}
                      onClick={() => handleStartExercise(exercise.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {exercise.completed ? "Practice Again" : "Start Exercise"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Quick Practice Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Drill
            </CardTitle>
            <CardDescription>
              Jump into a rapid practice session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">⚡</div>
              <p className="text-sm text-muted-foreground">
                5-minute focused practice session
              </p>
            </div>
            <Button className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Start Quick Drill
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Daily Challenge
            </CardTitle>
            <CardDescription>
              Today's featured challenge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">🏆</div>
              <p className="text-sm text-muted-foreground">
                Special challenge of the day
              </p>
            </div>
            <Button className="w-full">
              <Trophy className="h-4 w-4 mr-2" />
              Take Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}