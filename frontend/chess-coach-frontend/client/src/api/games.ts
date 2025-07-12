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

    // Transform backend response to match frontend expectations
    return {
      moves: [], // This would need to be parsed from PGN
      criticalMoments: keyMoments.map((moment: any, index: number) => ({
        moveNumber: moment.move_number || index + 1,
        type: moment.type || 'note',
        description: moment.description || moment.comment || 'Key moment'
      })),
      summary: {
        accuracy: gameData.white_player === backendApi.user?.username 
          ? gameData.white_accuracy || 0 
          : gameData.black_accuracy || 0,
        mistakes: 0, // These would need to be calculated from analysis
        blunders: 0,
        brilliantMoves: 0
      },
      coachNotes: gameData.analysis_summary || 'No analysis available yet',
      pgn: gameData.pgn,
      opening: gameData.opening,
      result: gameData.result
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