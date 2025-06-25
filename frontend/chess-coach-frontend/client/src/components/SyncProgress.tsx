import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { backendApi, type SyncJob } from '@/lib/api'

interface SyncProgressProps {
  syncJob: SyncJob | null
  onComplete: (result: SyncJob) => void
  onError: (error: string) => void
}

export function SyncProgress({ syncJob, onComplete, onError }: SyncProgressProps) {
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(syncJob)
  const [isPolling, setIsPolling] = useState(false)

  const pollSyncStatus = useCallback(async () => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return
    }

    try {
      const updatedJob = await backendApi.getSyncStatus(currentJob.id)
      setCurrentJob(updatedJob)

      if (updatedJob.status === 'completed') {
        setIsPolling(false)
        onComplete(updatedJob)
      } else if (updatedJob.status === 'failed') {
        setIsPolling(false)
        onError(updatedJob.error_message || 'Sync failed')
      }
    } catch (error: any) {
      console.error('Failed to get sync status:', error)
      setIsPolling(false)
      onError(error.message || 'Failed to check sync status')
    }
  }, [currentJob, onComplete, onError])

  useEffect(() => {
    setCurrentJob(syncJob)
    
    if (syncJob && (syncJob.status === 'pending' || syncJob.status === 'fetching' || syncJob.status === 'analyzing')) {
      setIsPolling(true)
    }
  }, [syncJob])

  useEffect(() => {
    if (!isPolling || !currentJob) return

    const interval = setInterval(pollSyncStatus, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [isPolling, pollSyncStatus, currentJob])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'fetching':
        return '🔄'
      case 'analyzing':
        return '🧠'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '⚪'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Preparing to sync...'
      case 'fetching':
        return 'Downloading games...'
      case 'analyzing':
        return 'Analyzing positions...'
      case 'completed':
        return 'Sync completed successfully!'
      case 'failed':
        return 'Sync failed'
      default:
        return 'Unknown status'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600'
      case 'fetching':
        return 'text-blue-600'
      case 'analyzing':
        return 'text-purple-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  if (!currentJob) return null

  const progressPercentage = currentJob.progress || 0
  const isActive = currentJob.status === 'pending' || currentJob.status === 'fetching' || currentJob.status === 'analyzing'

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon(currentJob.status)}</span>
          Sync Progress
        </CardTitle>
        <CardDescription>
          Syncing games from {currentJob.platform} for user {currentJob.username}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`font-medium ${getStatusColor(currentJob.status)}`}>
            {getStatusText(currentJob.status)}
          </span>
          <span className="text-sm text-gray-500">
            Duration: {formatDuration(currentJob.started_at, currentJob.completed_at)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                currentJob.status === 'completed'
                  ? 'bg-green-500'
                  : currentJob.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              } ${isActive ? 'animate-pulse' : ''}`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Games Found:</span>
            <span className="font-medium">{currentJob.games_found || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Games Analyzed:</span>
            <span className="font-medium">{currentJob.games_analyzed || 0}</span>
          </div>
        </div>

        {/* Error Message */}
        {currentJob.status === 'failed' && currentJob.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            <strong>Error:</strong> {currentJob.error_message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          {currentJob.status === 'completed' && (
            <Button
              onClick={() => onComplete(currentJob)}
              className="text-sm"
            >
              View Games
            </Button>
          )}
          {(currentJob.status === 'failed') && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-sm"
            >
              Try Again
            </Button>
          )}
        </div>

        {/* Live Updates Indicator */}
        {isActive && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Checking for updates every 2 seconds...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 