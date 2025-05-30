const axios = require("axios");

/**
 * Fetches the archives (monthly game collections) for a given Chess.com username
 * @param {string} username - The Chess.com username
 * @returns {Promise<string[]>} Array of archive URLs
 * @throws {Error} If the API request fails or username is invalid
 */
const fetchRecentGames = async (username) => {
  try {
    const url = `https://api.chess.com/pub/player/${username}/games/archives`;
    const { data } = await axios.get(url);
    return data.archives;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Player "${username}" not found on Chess.com`);
    }
    throw new Error(`Failed to fetch games: ${error.message}`);
  }
};

/**
 * Fetches games from a specific archive URL
 * @param {string} archiveUrl - The archive URL from fetchRecentGames
 * @returns {Promise<Object[]>} Array of game objects
 */
const fetchGamesFromArchive = async (archiveUrl) => {
  try {
    const { data } = await axios.get(archiveUrl);
    return data.games;
  } catch (error) {
    throw new Error(`Failed to fetch games from archive: ${error.message}`);
  }
};

/**
 * Fetches all recent games for a player
 * @param {string} username - The Chess.com username
 * @param {number} months - Number of recent months to fetch (default: 1)
 * @returns {Promise<Object[]>} Array of game objects
 */
const fetchAllRecentGames = async (username, months = 1) => {
  try {
    const archives = await fetchRecentGames(username);
    const recentArchives = archives.slice(-months);
    
    const gamesPromises = recentArchives.map(archiveUrl => 
      fetchGamesFromArchive(archiveUrl)
    );
    
    const gamesArrays = await Promise.all(gamesPromises);
    return gamesArrays.flat();
  } catch (error) {
    throw new Error(`Failed to fetch recent games: ${error.message}`);
  }
};

module.exports = {
  fetchRecentGames,
  fetchGamesFromArchive,
  fetchAllRecentGames
}; 