import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { 
  ExternalLink, 
  Calendar as CalendarIcon,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Crown,
  Zap,
  Target,
  Gamepad2,
  RefreshCw
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { startGameSync, getSyncStatus, getSyncHistory } from "@/api/games"
import { SyncJob } from "@/api/api"

interface SyncGamesDialogProps {
  trigger?: React.ReactNode
  onSyncComplete?: () => void
}

export function SyncGamesDialog({ trigger, onSyncComplete }: SyncGamesDialogProps) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<string>("")
  const [username, setUsername] = useState("")
  const [lichessToken, setLichessToken] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date() // today
  })
  
  // Filters
  const [gameTypes, setGameTypes] = useState<string[]>([])
  const [results, setResults] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  
  // Sync state
  const [currentSync, setCurrentSync] = useState<SyncJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([])
  const [activeTab, setActiveTab] = useState("sync")
  
  const { toast } = useToast()

  // Date formatting functions
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Unknown date"
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString()
  }

  const formatDisplayTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "Unknown time"
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? "Invalid time" : date.toLocaleTimeString()
  }

  // Load sync history when dialog opens
  useEffect(() => {
    if (open) {
      loadSyncHistory()
    }
  }, [open])

  // Poll for sync status updates
  useEffect(() => {
    if (currentSync?.id && ['pending', 'fetching', 'analyzing'].includes(currentSync.status)) {
      const interval = setInterval(async () => {
        try {
          const status = await getSyncStatus(currentSync.id)
          setCurrentSync(status)
          
          if (status.games_found > 0) {
            setProgress((status.games_analyzed / status.games_found) * 100)
          }
          
          if (status.status === 'completed') {
            toast({
              title: "Sync Complete! 🎉",
              description: `Successfully analyzed ${status.games_analyzed} games from ${status.platform}`,
            })
            onSyncComplete?.()
            loadSyncHistory()
          } else if (status.status === 'failed') {
            toast({
              title: "Sync Failed",
              description: status.error || "An unknown error occurred",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error('Error polling sync status:', error)
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [currentSync, toast, onSyncComplete])

  const loadSyncHistory = async () => {
    try {
      const history = await getSyncHistory()
      // The API returns an object with sync_jobs array or just an array
      const historyArray = Array.isArray(history) ? history : (history as any).sync_jobs || []
      setSyncHistory(historyArray)
      
      // Check if there's an active sync job that should be resumed
      const activeJob = historyArray.find((job: SyncJob) => 
        ['pending', 'fetching', 'analyzing'].includes(job.status)
      )
      
      if (activeJob && !currentSync) {
        console.log('Resuming active sync job:', activeJob.id, 'Status:', activeJob.status)
        setCurrentSync(activeJob)
        setActiveTab("progress")
        
        // Set initial progress if available
        if (activeJob.games_found > 0) {
          setProgress((activeJob.games_analyzed / activeJob.games_found) * 100)
        }
      }
    } catch (error) {
      console.error('Error loading sync history:', error)
    }
  }

  const handleStartSync = async () => {
    if (!platform || !username) {
      toast({
        title: "Missing Information",
        description: "Please select a platform and enter your username",
        variant: "destructive",
      })
      return
    }

    if (platform === "lichess" && !lichessToken) {
      toast({
        title: "Lichess Token Required",
        description: "Please provide your Lichess API token for private games",
        variant: "destructive",
      })
      return
    }

    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates for the sync",
        variant: "destructive",
      })
      return
    }

    if (dateRange.from > dateRange.to) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setProgress(0)

    try {
      const syncOptions = {
        fromDate: formatDate(dateRange.from),
        toDate: formatDate(dateRange.to),
        lichessToken: platform === "lichess" ? lichessToken : undefined,
        game_types: gameTypes.length > 0 ? gameTypes : undefined,
        results: results.length > 0 ? results : undefined,
        colors: colors.length > 0 ? colors : undefined,
      }

      const job = await startGameSync(platform, username, syncOptions)
      setCurrentSync(job)
      setActiveTab("progress")
      
      toast({
        title: "Sync Started! ⚡",
        description: `Fetching games from ${platform} between ${formatDisplayDate(dateRange.from.toISOString())} and ${formatDisplayDate(dateRange.to.toISOString())}`,
      })
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start sync",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'analyzing':
        return <Zap className="h-4 w-4 text-blue-500" />
      case 'fetching':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case 'failed':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case 'analyzing':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case 'fetching':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const setQuickDateRange = (days: number) => {
    const to = new Date()
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setDateRange({ from, to })
  }

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <ExternalLink className="h-4 w-4" />
      Sync Games
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-blue-500" />
            Sync Chess Games
          </DialogTitle>
          <DialogDescription>
            Import and analyze your games from Chess.com or Lichess
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">New Sync</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chess.com">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Chess.com
                      </div>
                    </SelectItem>
                    <SelectItem value="lichess">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Lichess
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Your chess username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Lichess Token */}
            {platform === "lichess" && (
              <div className="space-y-2">
                <Label htmlFor="lichess-token">Lichess API Token</Label>
                <Input
                  id="lichess-token"
                  type="password"
                  placeholder="Required for private games"
                  value={lichessToken}
                  onChange={(e) => setLichessToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your token from <a href="https://lichess.org/account/oauth/token" target="_blank" className="text-blue-500 hover:underline">Lichess API settings</a>
                </p>
              </div>
            )}

            {/* Date Range Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Date Range</Label>
                <p className="text-sm text-muted-foreground">Select the period of games to sync and analyze</p>
              </div>

              {/* Quick Date Range Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickDateRange(7)}
                  type="button"
                >
                  Last 7 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickDateRange(30)}
                  type="button"
                >
                  Last 30 days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickDateRange(90)}
                  type="button"
                >
                  Last 3 months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuickDateRange(365)}
                  type="button"
                >
                  Last year
                </Button>
              </div>

              {/* Custom Date Range Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="from-date"
                      type="date"
                      value={dateRange.from ? formatDate(dateRange.from) : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        setDateRange(prev => ({ ...prev, from: date }))
                      }}
                      max={formatDate(new Date())}
                      min="2010-01-01"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="to-date"
                      type="date"
                      value={dateRange.to ? formatDate(dateRange.to) : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        setDateRange(prev => ({ ...prev, to: date }))
                      }}
                      max={formatDate(new Date())}
                      min="2010-01-01"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Date Range Summary */}
              {dateRange.from && dateRange.to && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Selected Range:</strong> {formatDisplayDate(dateRange.from.toISOString())} to {formatDisplayDate(dateRange.to.toISOString())}
                    {' '}({Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days)
                  </p>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <h4 className="font-medium">Filters (Optional)</h4>
              
              {/* Game Types */}
              <div className="space-y-2">
                <Label>Game Types</Label>
                <div className="flex flex-wrap gap-2">
                  {["bullet", "blitz", "rapid", "classical"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`game-type-${type}`}
                        checked={gameTypes.includes(type)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked === true) {
                            setGameTypes([...gameTypes, type])
                          } else {
                            setGameTypes(gameTypes.filter(t => t !== type))
                          }
                        }}
                      />
                      <Label htmlFor={`game-type-${type}`} className="capitalize">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className="space-y-2">
                <Label>Results</Label>
                <div className="flex flex-wrap gap-2">
                  {["win", "loss", "draw"].map((result) => (
                    <div key={result} className="flex items-center space-x-2">
                      <Checkbox
                        id={`result-${result}`}
                        checked={results.includes(result)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked === true) {
                            setResults([...results, result])
                          } else {
                            setResults(results.filter(r => r !== result))
                          }
                        }}
                      />
                      <Label htmlFor={`result-${result}`} className="capitalize">{result}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label>Colors</Label>
                <div className="flex flex-wrap gap-2">
                  {["white", "black"].map((color) => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={`color-${color}`}
                        checked={colors.includes(color)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked === true) {
                            setColors([...colors, color])
                          } else {
                            setColors(colors.filter(c => c !== color))
                          }
                        }}
                      />
                      <Label htmlFor={`color-${color}`} className="capitalize">{color}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartSync} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Sync
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {currentSync ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Sync Progress</span>
                    <Badge className={getStatusColor(currentSync.status)}>
                      {getStatusIcon(currentSync.status)}
                      <span className="ml-1 capitalize">{currentSync.status}</span>
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {currentSync.platform} • {currentSync.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSync.status === 'failed' && currentSync.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{currentSync.error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{currentSync.games_analyzed} / {currentSync.games_found} games</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Games Found:</span>
                      <span className="ml-2 font-medium">{currentSync.games_found}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Games Analyzed:</span>
                      <span className="ml-2 font-medium">{currentSync.games_analyzed}</span>
                    </div>
                  </div>

                  {currentSync.status === 'completed' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Sync completed successfully! Your games are now available in the Analyze section.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active sync. Start a new sync to see progress here.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {syncHistory.length > 0 ? (
              <div className="space-y-3">
                {syncHistory.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{job.platform}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{job.username}</span>
                            <Badge className={getStatusColor(job.status)}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1 capitalize">{job.status}</span>
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDisplayDate(job.created_at)} at {formatDisplayTime(job.created_at)}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{job.games_analyzed} / {job.games_found} games</div>
                          {job.status === 'completed' && job.completed_at && (
                            <div className="text-muted-foreground">
                              Completed {formatDisplayTime(job.completed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      {job.error && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{job.error}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sync history found. Start your first sync to see results here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 