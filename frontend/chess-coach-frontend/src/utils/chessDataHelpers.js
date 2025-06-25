/**
 * Chess Data Processing Utilities
 * 
 * Helper functions for parsing and handling chess game data
 * in the frontend components.
 */

/**
 * Safely parse key moments data that might be JSON string or array
 * @param {string|Array} keyMoments - Raw key moments data
 * @returns {Array} Parsed key moments array
 */
export const parseKeyMoments = (keyMoments) => {
  if (!keyMoments) return [];
  
  try {
    if (typeof keyMoments === 'string') {
      const parsed = JSON.parse(keyMoments);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(keyMoments)) {
      return keyMoments;
    }
    return [];
  } catch (error) {
    console.error('Error parsing key moments:', error);
    return [];
  }
};

/**
 * Format chess evaluation score for display
 * @param {number} evaluation - Raw evaluation in centipawns
 * @returns {string} Formatted evaluation string
 */
export const formatEvaluation = (evaluation) => {
  if (evaluation === undefined || evaluation === null) return '';
  
  const evalInPawns = evaluation / 100;
  const sign = evalInPawns > 0 ? '+' : '';
  return `${sign}${evalInPawns.toFixed(2)}`;
};

/**
 * Get display color for move accuracy
 * @param {string} accuracy - Move accuracy class
 * @returns {string} CSS color class
 */
export const getAccuracyColor = (accuracy) => {
  const accuracyLower = (accuracy || '').toLowerCase();
  
  switch (accuracyLower) {
    case 'brilliant': return 'brilliant';
    case 'great': return 'great';
    case 'good': return 'good';
    case 'inaccuracy': return 'inaccuracy';
    case 'mistake': return 'mistake';
    case 'miss':
    case 'blunder': return 'blunder';
    default: return 'unknown';
  }
};

/**
 * Format move notation for display
 * @param {number} moveNumber - Move number
 * @param {number} index - Move index (0-based)
 * @param {string} move - Move notation
 * @returns {string} Formatted move string
 */
export const formatMoveNotation = (moveNumber, index, move) => {
  const isWhiteMove = index % 2 === 0;
  const dots = isWhiteMove ? '.' : '...';
  return `${moveNumber}${dots} ${move || 'N/A'}`;
};

/**
 * Validate and parse PGN data
 * @param {string} pgn - PGN string
 * @returns {Object} Validation result with success flag and error message
 */
export const validatePGN = (pgn) => {
  if (!pgn || typeof pgn !== 'string') {
    return { 
      valid: false, 
      error: 'PGN data is missing or invalid' 
    };
  }
  
  // Check for basic PGN structure
  const hasHeaders = pgn.includes('[Event') || pgn.includes('[Site');
  const hasMoves = /\d+\./.test(pgn); // Contains move numbers
  
  if (!hasHeaders && !hasMoves) {
    return { 
      valid: false, 
      error: 'PGN does not contain valid chess game data' 
    };
  }
  
  return { valid: true };
};

/**
 * Extract game metadata from game object
 * @param {Object} game - Game data object
 * @returns {Object} Extracted metadata
 */
export const extractGameMetadata = (game) => {
  return {
    whitePlayer: game.white_username || game.white_player || 'Unknown',
    blackPlayer: game.black_username || game.black_player || 'Unknown',
    result: game.result || 'Unknown',
    platform: game.platform || 'Unknown',
    timeControl: game.time_control || 'Unknown',
    opening: game.opening_name || 'Unknown Opening',
    gameDate: game.game_timestamp || game.created_at || game.game_date,
    userColor: game.user_color,
    totalMoves: game.total_moves,
    blundersCount: game.blunders_count || 0,
    mistakesCount: game.mistakes_count || 0,
    inaccuraciesCount: game.inaccuracies_count || 0
  };
};

/**
 * Get result icon based on game result and user color
 * @param {string} result - Game result (1-0, 0-1, 1/2-1/2)
 * @param {string} userColor - User's color (white/black)
 * @returns {string} Result emoji
 */
export const getResultIcon = (result, userColor) => {
  if (!result) return '⚪';
  
  if (result === '1-0') {
    return userColor === 'white' ? '🟢' : '🔴';
  } else if (result === '0-1') {
    return userColor === 'black' ? '🟢' : '🔴';
  } else if (result === '1/2-1/2') {
    return '🟡';
  }
  return '⚪';
};

/**
 * Get platform icon
 * @param {string} platform - Platform name
 * @returns {string} Platform emoji
 */
export const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'chess.com': return '♔';
    case 'lichess': return '♕';
    default: return '♖';
  }
};

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
export const formatGameDate = (dateString) => {
  if (!dateString) return 'Unknown Date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time control for display
 * @param {string|Object} timeControl - Time control data
 * @returns {string} Formatted time control
 */
export const formatTimeControl = (timeControl) => {
  if (!timeControl) return 'Unknown';
  
  if (typeof timeControl === 'string') {
    return timeControl;
  }
  if (typeof timeControl === 'object' && timeControl.time_class) {
    return timeControl.time_class;
  }
  return 'Unknown';
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}; 