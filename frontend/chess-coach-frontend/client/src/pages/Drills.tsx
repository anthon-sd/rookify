import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Drills() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Training Drills</h1>
        <p className="text-xl text-muted-foreground">
          Practice tactical patterns and improve your chess skills
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Interactive training drills will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will feature tactical puzzles, endgame training, 
            and personalized drill recommendations based on your game analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 