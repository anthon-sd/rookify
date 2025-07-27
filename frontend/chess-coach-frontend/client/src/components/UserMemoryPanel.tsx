import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backendApi } from '@/api/api';

interface UserMemoryPanelProps {
  userId: string;
}

interface UserMemory {
  chess_level?: string;
  current_focus?: string;
  playstyle_profile?: {
    type: string;
  };
  frequent_errors?: string[];
  session_summaries?: Array<{
    timestamp: string;
    summary: string;
  }>;
  preferred_feedback_tone?: string;
}

interface UserPreferences {
  feedback_tone?: string;
}

export function UserMemoryPanel({ userId }: UserMemoryPanelProps) {
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserMemory();
    fetchUserPreferences();
  }, [userId]);

  const fetchUserMemory = async () => {
    try {
      setError(null);
      const response = await backendApi.getUserMemory(userId);
      setMemory(response.memory || {});
    } catch (error: any) {
      console.error('Failed to fetch memory:', error);
      setError('Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await backendApi.getUserPreferences(userId);
      setPreferences(response.preferences || {});
    } catch (error: any) {
      console.error('Failed to fetch preferences:', error);
      // Don't set error here as preferences might not exist yet
    }
  };

  const handleResetMemory = async () => {
    try {
      setError(null);
      await backendApi.resetUserMemory(userId);
      await fetchUserMemory();
    } catch (error: any) {
      console.error('Failed to reset memory:', error);
      setError('Failed to reset memory');
    }
  };

  const updatePreference = async (key: string, value: any) => {
    try {
      setError(null);
      await backendApi.updateUserPreferences(userId, { [key]: value });
      await fetchUserPreferences();
      // Update memory state if it affects displayed preferences
      if (key === 'feedback_tone') {
        setMemory(prev => prev ? { ...prev, preferred_feedback_tone: value } : null);
      }
    } catch (error: any) {
      console.error('Failed to update preference:', error);
      setError('Failed to update preference');
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading memory...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32 text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Chess Mind</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Chess Level</h3>
                <p className="text-sm text-muted-foreground">
                  {memory?.chess_level || 'Not assessed yet'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Current Focus</h3>
                <p className="text-sm text-muted-foreground">
                  {memory?.current_focus || 'General improvement'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Playing Style</h3>
                <p className="text-sm text-muted-foreground">
                  {memory?.playstyle_profile?.type || 'Balanced'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Common Mistakes</h3>
                {memory?.frequent_errors && memory.frequent_errors.length > 0 ? (
                  <ul className="text-sm text-muted-foreground">
                    {memory.frequent_errors.slice(0, 3).map((error: string, i: number) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No common mistakes identified yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="progress">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Rating Trend</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Progress tracking coming soon
                </p>
                {/* Placeholder for future chart component */}
                <div className="h-32 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground">Chart will appear here</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold">Recent Sessions</h3>
                {memory?.session_summaries && memory.session_summaries.length > 0 ? (
                  <div className="space-y-2">
                    {memory.session_summaries.slice(-3).map((session: any, i: number) => (
                      <div key={i} className="text-sm p-2 bg-muted rounded">
                        <p className="font-medium">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">{session.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recent sessions recorded yet
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preferences">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Feedback Style</h3>
                <Select
                  value={memory?.preferred_feedback_tone || preferences?.feedback_tone || 'balanced'}
                  onValueChange={(value) => updatePreference('feedback_tone', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select feedback style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle">Gentle & Encouraging</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="direct">Direct & Critical</SelectItem>
                    <SelectItem value="tough">Tough Love</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Reset Memory</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Your Chess Mind?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all your personalized coaching data and start fresh. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetMemory}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 