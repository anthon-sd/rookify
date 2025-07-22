import { backendApi } from './api';

// Description: Get user's game library
// Endpoint: GET /games/{user_id}
// Request: { limit?: number, offset?: number, platform?: string }
// Response: Array of GameData objects
export const getGames = async (limit = 20, offset = 0, platform?: string) => {
  console.log('🔍 Fetching games...');
  console.log('🔍 Auth status:', backendApi.isAuthenticated());
  console.log('🔍 User:', backendApi.user);
  console.log('🔍 Token exists:', !!backendApi.token);
  try {
    const gamesResponse = await backendApi.getGames(limit, offset, platform);
    console.log('🔍 Backend response:', gamesResponse);
    const games = Array.isArray(gamesResponse) ? gamesResponse : [];
    
          // Transform the backend response to match the expected frontend format
      return {
        games: games.map(game => {
          // Debug logging for opponent determination
          console.log('🔍 Game data:', {
            white_player: game.white_player,
            black_player: game.black_player,
            backend_opponent: game.opponent,
            user_result: game.user_result
          });
          
          // Use the opponent and user_result that the backend already calculated correctly
          return {
            id: game.id,
            opponent: game.opponent || 'Unknown',
            result: game.user_result || 'unknown',
            accuracy: game.user_accuracy || 0,
            date: game.played_at ? new Date(game.played_at).toISOString().split('T')[0] : 'Unknown',
            opening: game.opening || 'Unknown Opening',
            analysisStatus: game.analysis_summary ? 'completed' : 'pending',
            keyInsight: game.analysis_summary || 'Analysis pending',
            timeControl: game.time_control || 'Unknown',
            platform: game.platform || '',
            pgn: game.pgn || ''
          };
        })
      };
  } catch (error: any) {
    console.error('Error fetching games:', error);
    throw new Error(error.message);
  }
};

// Description: Get detailed game analysis
// Endpoint: GET /games/{user_id}/{game_id}
// Request: { gameId: string }
// Response: Detailed game analysis with moves, key moments, and summary
export const getGameAnalysis = async (gameId: string) => {
  console.log(`Fetching analysis for game ${gameId}...`);
  try {
    const gameData = await backendApi.getGameAnalysis(gameId);
    console.log('Raw game data from backend:', gameData);
    
    // Parse key moments if they exist
    let keyMoments = [];
    if (gameData.key_moments) {
      try {
        const parsedMoments = typeof gameData.key_moments === 'string' 
          ? JSON.parse(gameData.key_moments)
          : gameData.key_moments;
        keyMoments = Array.isArray(parsedMoments) ? parsedMoments : [];
      } catch (e) {
        console.warn('Failed to parse key moments:', e);
        keyMoments = [];
      }
    }

    console.log('Parsed key moments:', keyMoments);

    // Transform key moments into moves array with Stockfish evaluations
    const moves = keyMoments.map((moment: any) => ({
      move: moment.move || `Move ${moment.move_number}`,
      evaluation: moment.eval_score !== undefined ? moment.eval_score : 0, // Use Stockfish evaluation, not delta
      accuracy: moment.accuracy_class?.toLowerCase() || 'good',
      comment: moment.description || moment.comment || '',
      moveNumber: moment.move_number || 0
    }));

    // Log evaluation data for debugging
    console.log('🎯 Stockfish evaluations for centipawn chart:', 
      moves.map(m => ({ move: m.moveNumber, evaluation: m.evaluation })).slice(0, 10)
    );

    // Filter critical moments to only show significant ones (mistakes, blunders, brilliant moves)
    const significantMoments = keyMoments.filter((moment: any) => {
      const accuracyClass = moment.accuracy_class?.toLowerCase() || '';
      return ['blunder', 'mistake', 'miss', 'brilliant', 'great'].includes(accuracyClass);
    });

    // Create move-by-move accuracy data for the chart
    const moveAccuracyData = keyMoments.map((moment: any, index: number) => {
      const accuracyClass = moment.accuracy_class?.toLowerCase() || 'good';
      let accuracyScore = 100;
      
      // Convert accuracy class to numeric score
      switch (accuracyClass) {
        case 'best': accuracyScore = 100; break;
        case 'excellent': accuracyScore = 95; break;
        case 'good': accuracyScore = 85; break;
        case 'inaccuracy': accuracyScore = 70; break;
        case 'mistake': accuracyScore = 50; break;
        case 'miss': accuracyScore = 30; break;
        case 'blunder': accuracyScore = 10; break;
        case 'brilliant': accuracyScore = 100; break;
        case 'great': accuracyScore = 98; break;
        default: accuracyScore = 80;
      }
      
      return {
        moveNumber: moment.move_number || index + 1,
        accuracy: accuracyScore,
        type: accuracyClass
      };
    });

    // Enhanced coach notes with specific recommendations
    const mistakeCount = keyMoments.filter(m => m.accuracy_class?.toLowerCase() === 'mistake').length;
    const blunderCount = keyMoments.filter(m => m.accuracy_class?.toLowerCase() === 'blunder').length;
    const brilliantCount = keyMoments.filter(m => m.accuracy_class?.toLowerCase() === 'brilliant').length;
    
    let detailedCoachNotes = gameData.analysis || gameData.analysis_summary || '';
    
    // Add specific recommendations
    if (blunderCount > 0) {
      detailedCoachNotes += `\n\n🎯 Focus Area: You made ${blunderCount} blunder${blunderCount > 1 ? 's' : ''} in this game. Review these critical moments and consider what you were thinking during these moves.`;
    }
    
    if (mistakeCount > 0) {
      detailedCoachNotes += `\n\n📚 Study Tip: ${mistakeCount} mistake${mistakeCount > 1 ? 's' : ''} occurred. Practice similar positions to improve your pattern recognition.`;
    }
    
    if (brilliantCount > 0) {
      detailedCoachNotes += `\n\n⭐ Great Job: You found ${brilliantCount} brilliant move${brilliantCount > 1 ? 's' : ''}! This shows excellent calculation ability.`;
    }
    
    if (gameData.avg_accuracy && gameData.avg_accuracy > 90) {
      detailedCoachNotes += '\n\n💪 Excellent accuracy! Keep up the precise play.';
    } else if (gameData.avg_accuracy && gameData.avg_accuracy < 70) {
      detailedCoachNotes += '\n\n🔍 Consider slowing down and double-checking your moves before playing them.';
    }

    // Transform backend response to match frontend expectations
    return {
      moves: moves,
      criticalMoments: significantMoments.map((moment: any, index: number) => ({
        moveNumber: moment.move_number || index + 1,
        type: moment.accuracy_class?.toLowerCase() || 'note',
        description: moment.description || moment.comment || `${moment.accuracy_class} move`,
        delta_cp: moment.delta_cp || 0,
        move: moment.move || ''
      })),
      summary: {
        // Use avg_accuracy from backend, fallback to user_accuracy or calculated accuracy
        accuracy: gameData.avg_accuracy || gameData.user_accuracy || 
                 (gameData.white_player === backendApi.user?.username 
                   ? gameData.white_accuracy || 0 
                   : gameData.black_accuracy || 0),
        // Use the actual counts from backend analysis
        mistakes: gameData.mistakes_count || 0,
        blunders: gameData.blunders_count || 0,
        brilliantMoves: gameData.brilliant_moves_count || 0
      },
      coachNotes: detailedCoachNotes.trim(),
      pgn: gameData.pgn,
      opening: gameData.opening_name || gameData.opening,
      result: gameData.result,
      moveAccuracyData: moveAccuracyData, // Add this for the accuracy chart
      white_player: gameData.white_player,
      black_player: gameData.black_player
    };
  } catch (error: any) {
    console.error('Error fetching game analysis:', error);
    throw new Error(error.message);
  }
};

// Description: Start game sync from chess platforms
// Endpoint: POST /sync-games/{user_id}
export const startGameSync = async (platform: string, username: string, options: any = {}) => {
  try {
    return await backendApi.startSync(
      platform, 
      username, 
      options.months || 1,
      options.lichessToken,
      options.fromDate,
      options.toDate,
      options.gameMode,
      options.result,
      options.color
    );
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Description: Get sync job status
// Endpoint: GET /sync-status/{job_id}
export const getSyncStatus = async (jobId: string) => {
  try {
    return await backendApi.getSyncStatus(jobId);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Description: Get user's sync job history
// Endpoint: GET /sync-jobs/{user_id}
export const getSyncHistory = async () => {
  try {
    return await backendApi.getSyncHistory();
  } catch (error: any) {
    throw new Error(error.message);
  }
};