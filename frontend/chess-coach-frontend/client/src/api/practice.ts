import { backendApi } from './api';

// Description: Get practice exercises and drills
// Note: This provides static practice content for now, could be enhanced with dynamic content
export const getPracticeExercises = async () => {
  console.log('Fetching practice exercises...');
  try {
    const user = backendApi.isAuthenticated() ? await backendApi.getCurrentUser() : null;
    const skillLevel = user ? Math.floor((user.rating - 1000) / 200) : 0;
    
    return {
      categories: [
        {
          id: "tactics",
          title: "Tactical Drills",
          description: "Sharpen your tactical vision",
          icon: "⚔️",
          exercises: [
            {
              id: "1",
              title: "Pin Puzzles",
              difficulty: "Beginner",
              completed: skillLevel >= 1,
              rating: Math.max(1000, user?.rating - 200 || 1200),
              timeLimit: 30,
              description: "Master pin tactics"
            },
            {
              id: "2", 
              title: "Fork Challenges",
              difficulty: "Beginner",
              completed: skillLevel >= 2,
              rating: Math.max(1100, user?.rating - 150 || 1300),
              timeLimit: 45,
              description: "Perfect your fork technique"
            },
            {
              id: "3",
              title: "Combination Training",
              difficulty: "Intermediate", 
              completed: skillLevel >= 3,
              rating: Math.max(1300, user?.rating - 100 || 1500),
              timeLimit: 60,
              description: "Complex tactical combinations"
            }
          ]
        },
        {
          id: "endgames",
          title: "Endgame Practice",
          description: "Master essential endgames",
          icon: "👑",
          exercises: [
            {
              id: "4",
              title: "King & Pawn vs King",
              difficulty: "Beginner",
              completed: skillLevel >= 2,
              rating: Math.max(1000, user?.rating - 300 || 1200),
              timeLimit: 120,
              description: "Basic pawn endgames"
            },
            {
              id: "5",
              title: "Rook Endgames",
              difficulty: "Intermediate",
              completed: skillLevel >= 4,
              rating: Math.max(1400, user?.rating - 200 || 1600),
              timeLimit: 180,
              description: "Essential rook endings"
            }
          ]
        },
        {
          id: "openings",
          title: "Opening Drills",
          description: "Practice opening principles",
          icon: "🏁",
          exercises: [
            {
              id: "6",
              title: "Center Control",
              difficulty: "Beginner",
              completed: skillLevel >= 1,
              rating: Math.max(1000, user?.rating - 250 || 1200),
              timeLimit: 60,
              description: "Control the center squares"
            },
            {
              id: "7",
              title: "Development Race",
              difficulty: "Intermediate",
              completed: skillLevel >= 3,
              rating: Math.max(1200, user?.rating - 200 || 1400),
              timeLimit: 90,
              description: "Efficient piece development"
            }
          ]
        }
      ],
      dailyChallenge: {
        id: "daily-1",
        title: "Daily Tactical Challenge",
        difficulty: skillLevel >= 3 ? "Intermediate" : "Beginner",
        description: "Today's featured puzzle",
        timeLimit: 120,
        rating: user?.rating || 1500,
        completed: false
      },
      userStats: {
        totalSolved: user ? Math.floor((user.rating - 1000) / 25) : 0,
        accuracy: user ? Math.min(95, 60 + skillLevel * 5) : 75,
        averageTime: user ? Math.max(30, 120 - skillLevel * 15) : 90,
        streak: user ? Math.floor(Math.random() * 10) + 1 : 0
      }
    };
  } catch (error: any) {
    console.error('Error fetching practice exercises:', error);
    // Return basic content if there's an error
    return {
      categories: [],
      dailyChallenge: null,
      userStats: { totalSolved: 0, accuracy: 0, averageTime: 0, streak: 0 }
    };
  }
};

// Description: Get specific exercise content
export const getExerciseContent = async (exerciseId: string) => {
  console.log(`Fetching exercise content for ${exerciseId}...`);
  try {
    // This would normally fetch specific exercise content from the backend
    // For now, return a sample exercise structure
    return {
      id: exerciseId,
      title: "Sample Exercise",
      description: "This is a sample exercise. In a real implementation, this would contain a chess position, moves, and solutions.",
      position: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Starting position FEN
      moves: [],
      solution: [],
      hint: "Look for tactical opportunities",
      explanation: "This would contain the solution explanation"
    };
  } catch (error: any) {
    console.error('Error fetching exercise content:', error);
    throw new Error(error.message);
  }
};

// Description: Submit exercise solution
export const submitExerciseSolution = async (exerciseId: string, _solution: string[], timeSpent: number) => {
  console.log(`Submitting solution for exercise ${exerciseId}...`);
  try {
    // This would normally submit to the backend and track user progress
    // For now, return a mock response
    const isCorrect = Math.random() > 0.3; // 70% chance of being correct for demo
    
    return {
      correct: isCorrect,
      rating: isCorrect ? 1500 + Math.floor(Math.random() * 100) : 1400 + Math.floor(Math.random() * 100),
      timeSpent,
      explanation: "This would contain feedback about the solution",
      nextExercise: `exercise-${parseInt(exerciseId.split('-')[1] || '1') + 1}`
    };
  } catch (error: any) {
    console.error('Error submitting exercise solution:', error);
    throw new Error(error.message);
  }
};