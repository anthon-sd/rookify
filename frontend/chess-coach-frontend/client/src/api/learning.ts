import { backendApi } from './api';

// Description: Get learning content and modules
// Note: This is mostly static content for now, but could be enhanced with user progress tracking
export const getLearningContent = async () => {
  console.log('Fetching learning content...');
  try {
    // For now, return static content. In the future, this could be enhanced with:
    // - User progress tracking from the backend
    // - Personalized content based on user skill level
    // - Dynamic content based on game analysis
    
    const user = backendApi.isAuthenticated() ? await backendApi.getCurrentUser() : null;
    const skillLevel = user ? Math.floor((user.rating - 1000) / 200) : 0;
    
    return {
      modules: [
        {
          id: "1",
          title: "Chess Fundamentals",
          description: "Master the basics of chess",
          difficulty: "Beginner",
          estimatedTime: 45,
          progress: skillLevel >= 1 ? 100 : 0,
          isUnlocked: true,
          lessons: [
            { id: "1-1", title: "How pieces move", completed: skillLevel >= 1, duration: 10 },
            { id: "1-2", title: "Basic rules", completed: skillLevel >= 1, duration: 15 },
            { id: "1-3", title: "Check and checkmate", completed: skillLevel >= 1, duration: 20 }
          ]
        },
        {
          id: "2", 
          title: "Tactical Patterns",
          description: "Learn essential chess tactics",
          difficulty: "Intermediate",
          estimatedTime: 60,
          progress: Math.max(0, Math.min(100, (skillLevel - 1) * 33)),
          isUnlocked: skillLevel >= 1,
          lessons: [
            { id: "2-1", title: "Pins and skewers", completed: skillLevel >= 2, duration: 20 },
            { id: "2-2", title: "Forks and double attacks", completed: skillLevel >= 2, duration: 20 },
            { id: "2-3", title: "Discovered attacks", completed: skillLevel >= 3, duration: 20 }
          ]
        },
        {
          id: "3",
          title: "Opening Principles", 
          description: "Understand chess opening strategies",
          difficulty: "Intermediate",
          estimatedTime: 75,
          progress: Math.max(0, Math.min(100, (skillLevel - 2) * 25)),
          isUnlocked: skillLevel >= 2,
          lessons: [
            { id: "3-1", title: "Control the center", completed: skillLevel >= 3, duration: 15 },
            { id: "3-2", title: "Develop pieces", completed: skillLevel >= 3, duration: 20 },
            { id: "3-3", title: "King safety", completed: skillLevel >= 3, duration: 20 },
            { id: "3-4", title: "Common openings", completed: skillLevel >= 4, duration: 20 }
          ]
        },
        {
          id: "4",
          title: "Endgame Mastery",
          description: "Essential endgame techniques", 
          difficulty: "Advanced",
          estimatedTime: 90,
          progress: Math.max(0, Math.min(100, (skillLevel - 3) * 20)),
          isUnlocked: skillLevel >= 3,
          lessons: [
            { id: "4-1", title: "King and pawn endings", completed: skillLevel >= 4, duration: 25 },
            { id: "4-2", title: "Rook endings", completed: skillLevel >= 5, duration: 30 },
            { id: "4-3", title: "Queen endings", completed: skillLevel >= 5, duration: 20 },
            { id: "4-4", title: "Minor piece endings", completed: skillLevel >= 6, duration: 15 }
          ]
        }
      ],
      userProgress: {
        totalLessonsCompleted: user ? Math.floor((user.rating - 1000) / 50) : 0,
        currentStreak: user ? Math.floor(Math.random() * 7) + 1 : 0,
        weeklyGoal: 5,
        weeklyProgress: user ? Math.floor(Math.random() * 5) + 1 : 0
      },
      recommendations: [
        {
          type: "continue",
          title: skillLevel >= 3 ? "Continue Endgame Study" : "Master Tactical Patterns",
          description: skillLevel >= 3 ? "Keep building your endgame knowledge" : "Solidify your tactical foundation",
        },
        {
          type: "practice",
          title: "Apply What You've Learned",
          description: "Practice these concepts in your games",
        }
      ]
    };
  } catch (error: any) {
    console.error('Error fetching learning content:', error);
    // Return basic content if there's an error
    return {
      modules: [],
      userProgress: { totalLessonsCompleted: 0, currentStreak: 0, weeklyGoal: 5, weeklyProgress: 0 },
      recommendations: []
    };
  }
};

// Description: Get specific lesson content
export const getLessonContent = async (lessonId: string) => {
  console.log(`Fetching lesson content for ${lessonId}...`);
  try {
    // This would normally fetch lesson content from the backend
    // For now, return a structured lesson template
    return {
      id: lessonId,
      title: "Sample Lesson",
      content: "This is sample lesson content. In a real implementation, this would contain interactive chess positions, explanations, and exercises.",
      exercises: [],
      nextLesson: null
    };
  } catch (error: any) {
    console.error('Error fetching lesson content:', error);
    throw new Error(error.message);
  }
};