import { backendApi } from './api';

// Description: Get user dashboard data including stats and recommendations
// Endpoint: GET /users/me (user data) + game statistics
// Request: {}
// Response: Dashboard data with user stats and recommendations
export const getDashboardData = async () => {
  console.log('Fetching dashboard data...');
  try {
    if (!backendApi.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    // Get current user data
    const user = await backendApi.getCurrentUser();
    if (!user) {
      throw new Error('User data not available');
    }
    
    // Get recent games for statistics
    const recentGamesResponse = await backendApi.getGames(20, 0); // Last 20 games
    const recentGames = Array.isArray(recentGamesResponse) ? recentGamesResponse : [];
    
    // Calculate weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weeklyGames = recentGames.filter(game => 
      game && game.played_at && new Date(game.played_at) >= weekStart
    );
    
    const wins = weeklyGames.filter(game => game && game.result === 'win').length;
    const losses = weeklyGames.filter(game => game && game.result === 'loss').length;
    const draws = weeklyGames.filter(game => game && game.result === 'draw').length;
    
    // Calculate average accuracy
    const gamesWithAccuracy = recentGames.filter(game => 
      game && (
        (game.white_accuracy && game.white_player === user.username) ||
        (game.black_accuracy && game.black_player === user.username)
      )
    );
    
    const totalAccuracy = gamesWithAccuracy.reduce((sum, game) => {
      if (!game) return sum;
      const accuracy = game.white_player === user.username 
        ? game.white_accuracy || 0 
        : game.black_accuracy || 0;
      return sum + accuracy;
    }, 0);
    
    const averageAccuracy = gamesWithAccuracy.length > 0 
      ? Math.round(totalAccuracy / gamesWithAccuracy.length) 
      : 75;

    // Get time of day for greeting
    const hour = new Date().getHours();
    let timeGreeting = 'Good evening';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';

    return {
      greeting: `${timeGreeting}, ${user.username}! Keep up the great work!`,
      rating: user.rating || 1500,
      ratingTrend: 'stable', // This would need historical data to calculate
      dailyChallenge: {
        title: "Tactical Tuesday",
        difficulty: "Intermediate", 
        theme: "Pin Tactics"
      },
      weeklyStats: {
        gamesPlayed: weeklyGames.length,
        wins,
        losses,
        draws
      },
      accuracy: {
        current: averageAccuracy,
        trend: 0 // This would need historical comparison
      },
      streak: {
        type: "Learning",
        count: 1 // This would need to be tracked
      },
      timeSpent: 0, // This would need to be tracked
      currentJourney: {
        name: "Chess Improvement Journey",
        progress: Math.min(Math.round((user.rating - 1000) / 10), 100),
        nextMilestone: `Reach ${user.rating + 100} rating`
      },
      recommendations: [
        {
          type: "review",
          title: "Review Recent Games",
          description: `You have ${recentGames.length} recent games to analyze`,
          action: "Review Now"
        },
        {
          type: "practice", 
          title: "Tactical Training",
          description: "Improve your tactical vision with daily puzzles",
          action: "Start Practice"
        },
        {
          type: "advance",
          title: "Import More Games",
          description: "Sync more games from Chess.com or Lichess for better analysis",
          action: "Import Games"
        }
      ]
    };
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    
    // Return fallback data if there's an error
    const fallbackUser = backendApi.user || { username: 'User', rating: 1500 };
    return {
      greeting: `Good day, ${fallbackUser.username}! Keep improving!`,
      rating: fallbackUser.rating || 1500,
      ratingTrend: 'stable' as const,
      dailyChallenge: {
        title: "Daily Challenge",
        difficulty: "Intermediate", 
        theme: "Tactical Training"
      },
      weeklyStats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      },
      accuracy: {
        current: 75,
        trend: 0
      },
      streak: {
        type: "Learning",
        count: 0
      },
      timeSpent: 0,
      currentJourney: {
        name: "Chess Improvement Journey",
        progress: 10,
        nextMilestone: `Reach ${(fallbackUser.rating || 1500) + 100} rating`
      },
      recommendations: [
        {
          type: "review",
          title: "Connect Your Account",
          description: "Connect to Chess.com or Lichess to start analyzing your games",
          action: "Get Started"
        }
      ]
    };
  }
};