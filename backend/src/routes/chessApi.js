const express = require('express');
const router = express.Router();
const { fetchAllRecentGames } = require('../services/chessApiService');

// Test endpoint to fetch recent games for a player
router.get('/games/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { months = 1 } = req.query;
    
    const games = await fetchAllRecentGames(username, parseInt(months));
    res.json({
      success: true,
      data: games,
      count: games.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 