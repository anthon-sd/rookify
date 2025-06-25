import { backendApi } from './api';

// Description: Get user profile data
// Endpoint: GET /users/me + game statistics
// Request: {}
// Response: User profile with skills, statistics, and achievements
export const getProfileData = async () => {
  console.log('Fetching profile data...');
  try {
    if (!backendApi.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    // Get current user data
    const user = await backendApi.getCurrentUser();
    
    // Get all user games for statistics
    const allGames = await backendApi.getGames(100, 0); // Get more games for better stats
    
    // Calculate statistics
    const totalGames = allGames.length;
    const gamesWithAccuracy = allGames.filter(game => 
      (game.white_accuracy && game.white_player === user.username) ||
      (game.black_accuracy && game.black_player === user.username)
    );
    
    const totalAccuracy = gamesWithAccuracy.reduce((sum, game) => {
      const accuracy = game.white_player === user.username 
        ? game.white_accuracy || 0 
        : game.black_accuracy || 0;
      return sum + accuracy;
    }, 0);
    
    const averageAccuracy = gamesWithAccuracy.length > 0 
      ? Math.round(totalAccuracy / gamesWithAccuracy.length) 
      : 75;

    // Generate rating history (simplified)
    const ratingHistory = [];
    const baseRating = user.rating - 100;
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (11 - i));
      ratingHistory.push({
        date: date.toISOString().split('T')[0],
        rating: baseRating + Math.round((i / 11) * 100) + Math.random() * 20 - 10
      });
    }

    // Calculate skill levels based on rating and games
    const skillLevel = Math.floor((user.rating - 1000) / 200);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        ratingHistory,
        playstyle: user.playstyle || 'Balanced Player',
        joinDate: user.created_at || new Date().toISOString().split('T')[0],
        totalGames,
        lessonsCompleted: Math.floor(totalGames / 5) // Estimate based on games
      },
      skillTree: [
        {
          category: "Tactics",
          skills: [
            { name: "Pin Recognition", level: Math.min(skillLevel, 5), maxLevel: 5, isUnlocked: skillLevel >= 1 },
            { name: "Fork Mastery", level: Math.min(skillLevel - 1, 5), maxLevel: 5, isUnlocked: skillLevel >= 2 },
            { name: "Skewer Technique", level: Math.min(skillLevel - 2, 5), maxLevel: 5, isUnlocked: skillLevel >= 3 },
            { name: "Discovered Attacks", level: Math.min(skillLevel - 3, 5), maxLevel: 5, isUnlocked: skillLevel >= 4 },
            { name: "Double Check", level: Math.min(skillLevel - 4, 5), maxLevel: 5, isUnlocked: skillLevel >= 5 }
          ]
        },
        {
          category: "Endgames", 
          skills: [
            { name: "King & Pawn", level: Math.min(skillLevel, 5), maxLevel: 5, isUnlocked: skillLevel >= 1 },
            { name: "Rook Endgames", level: Math.min(skillLevel - 1, 5), maxLevel: 5, isUnlocked: skillLevel >= 2 },
            { name: "Queen Endgames", level: Math.min(skillLevel - 2, 5), maxLevel: 5, isUnlocked: skillLevel >= 3 },
            { name: "Minor Piece", level: Math.min(skillLevel - 3, 5), maxLevel: 5, isUnlocked: skillLevel >= 4 }
          ]
        },
        {
          category: "Openings",
          skills: [
            { name: "Italian Game", level: Math.min(skillLevel, 5), maxLevel: 5, isUnlocked: skillLevel >= 1 },
            { name: "Sicilian Defense", level: Math.min(skillLevel - 1, 5), maxLevel: 5, isUnlocked: skillLevel >= 2 },
            { name: "Queen's Gambit", level: Math.min(skillLevel - 2, 5), maxLevel: 5, isUnlocked: skillLevel >= 3 },
            { name: "French Defense", level: Math.min(skillLevel - 3, 5), maxLevel: 5, isUnlocked: skillLevel >= 4 }
          ]
        }
      ],
      statistics: {
        accuracy: averageAccuracy,
        averageAccuracy: 78, // General average
        strongestSkills: ["Tactical Vision", "Opening Preparation", "Time Management"],
        improvementAreas: [
          { skill: "Endgame Technique", successRate: Math.max(averageAccuracy - 10, 50), recommendation: "Practice more endgame positions" },
          { skill: "Time Management", successRate: Math.max(averageAccuracy - 5, 60), recommendation: "Play more rapid games to improve time control" },
          { skill: "Opening Preparation", successRate: Math.max(averageAccuracy + 5, 75), recommendation: "Study main line variations deeper" }
        ]
      },
      achievements: [
        {
          id: "1",
          name: "First Victory", 
          description: "Win your first game",
          isUnlocked: totalGames > 0,
          unlockedDate: totalGames > 0 ? new Date().toISOString().split('T')[0] : undefined,
          icon: "🏆"
        },
        {
          id: "2",
          name: "Game Analyzer",
          description: "Analyze 10 games",
          isUnlocked: totalGames >= 10,
          unlockedDate: totalGames >= 10 ? new Date().toISOString().split('T')[0] : undefined,
          icon: "📊"
        },
        {
          id: "3",
          name: "Dedicated Player",
          description: "Play 50 games",
          isUnlocked: totalGames >= 50,
          unlockedDate: totalGames >= 50 ? new Date().toISOString().split('T')[0] : undefined,
          icon: "⚡"
        },
        {
          id: "4",
          name: "Rating Climber",
          description: "Reach 1600 rating",
          isUnlocked: user.rating >= 1600,
          unlockedDate: user.rating >= 1600 ? new Date().toISOString().split('T')[0] : undefined,
          icon: "📈"
        },
        {
          id: "5",
          name: "Chess Scholar",
          description: "Reach 1800 rating",
          isUnlocked: user.rating >= 1800,
          unlockedDate: user.rating >= 1800 ? new Date().toISOString().split('T')[0] : undefined,
          icon: "🎓"
        }
      ].filter(achievement => achievement.isUnlocked !== false) // Only return relevant achievements
    };
  } catch (error: any) {
    console.error('Error fetching profile data:', error);
    throw new Error(error.message);
  }
};