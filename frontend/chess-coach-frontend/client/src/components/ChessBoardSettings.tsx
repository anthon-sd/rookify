import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Palette, 
  Eye, 
  MousePointer2,
  Crown
} from 'lucide-react'

interface ChessBoardSettingsProps {
  onSettingsChange?: (settings: ChessBoardSettings) => void
  className?: string
}

export interface ChessBoardSettings {
  boardTheme: 'classic' | 'modern' | 'wood' | 'metal' | 'neon'
  pieceSet: 'classic' | 'modern' | 'medieval' | 'minimalist'
  showCoordinates: boolean
  showLastMove: boolean
  showLegalMoves: boolean
  enableSounds: boolean
  animationSpeed: number
  enableArrows: boolean
  enableHighlights: boolean
  autoFlip: boolean
  boardSize: number
}

const defaultSettings: ChessBoardSettings = {
  boardTheme: 'classic',
  pieceSet: 'classic',
  showCoordinates: true,
  showLastMove: true,
  showLegalMoves: false,
  enableSounds: true,
  animationSpeed: 200,
  enableArrows: true,
  enableHighlights: true,
  autoFlip: false,
  boardSize: 500
}

export function ChessBoardSettings({ onSettingsChange, className }: ChessBoardSettingsProps) {
  const [settings, setSettings] = useState<ChessBoardSettings>(defaultSettings)
  const [isOpen, setIsOpen] = useState(false)

  const updateSetting = <K extends keyof ChessBoardSettings>(
    key: K, 
    value: ChessBoardSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
    onSettingsChange?.(defaultSettings)
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
        title="Board Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Board Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-500" />
            <Label className="text-sm font-medium">Visual Appearance</Label>
          </div>
          
          <div className="space-y-3 ml-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Board Theme</Label>
              <Select 
                value={settings.boardTheme} 
                onValueChange={(value: ChessBoardSettings['boardTheme']) => 
                  updateSetting('boardTheme', value)
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="neon">Neon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Piece Set</Label>
              <Select 
                value={settings.pieceSet} 
                onValueChange={(value: ChessBoardSettings['pieceSet']) => 
                  updateSetting('pieceSet', value)
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="medieval">Medieval</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Board Size</Label>
              <div className="px-3">
                <Slider
                  value={[settings.boardSize]}
                  onValueChange={([value]: number[]) => updateSetting('boardSize', value)}
                  max={600}
                  min={300}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>300px</span>
                  <span>{settings.boardSize}px</span>
                  <span>600px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Display Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-500" />
            <Label className="text-sm font-medium">Display Options</Label>
          </div>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Show Coordinates</Label>
              <Switch
                checked={settings.showCoordinates}
                onCheckedChange={(checked: boolean) => updateSetting('showCoordinates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Highlight Last Move</Label>
              <Switch
                checked={settings.showLastMove}
                onCheckedChange={(checked: boolean) => updateSetting('showLastMove', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Show Legal Moves</Label>
              <Switch
                checked={settings.showLegalMoves}
                onCheckedChange={(checked: boolean) => updateSetting('showLegalMoves', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Auto Flip Board</Label>
              <Switch
                checked={settings.autoFlip}
                onCheckedChange={(checked: boolean) => updateSetting('autoFlip', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Interaction Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MousePointer2 className="h-4 w-4 text-purple-500" />
            <Label className="text-sm font-medium">Interaction</Label>
          </div>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Arrows</Label>
              <Switch
                checked={settings.enableArrows}
                onCheckedChange={(checked: boolean) => updateSetting('enableArrows', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Enable Highlights</Label>
              <Switch
                checked={settings.enableHighlights}
                onCheckedChange={(checked: boolean) => updateSetting('enableHighlights', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Sound Effects</Label>
              <Switch
                checked={settings.enableSounds}
                onCheckedChange={(checked: boolean) => updateSetting('enableSounds', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Animation Speed</Label>
              <div className="px-3">
                <Slider
                  value={[settings.animationSpeed]}
                  onValueChange={([value]: number[]) => updateSetting('animationSpeed', value)}
                  max={500}
                  min={50}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Fast</span>
                  <span>{settings.animationSpeed}ms</span>
                  <span>Slow</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Actions</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="flex-1"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>

        {/* Pro Features Badge */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            <Label className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Pro Features
            </Label>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Coming Soon
            </Badge>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Advanced themes, custom piece sets, and engine integration will be available with Pro subscription.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 