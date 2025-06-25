import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Learn() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Learn Chess</h1>
        <p className="text-xl text-muted-foreground">
          Educational resources and chess theory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Learning resources and tutorials will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will include chess theory, opening principles, 
            endgame studies, and strategic concepts to help improve your game.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 