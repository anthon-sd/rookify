const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');

// Create a new game analysis
router.post('/', async (req, res) => {
  try {
    const analysis = await databaseService.createGameAnalysis(req.body);
    res.status(201).json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get game analyses for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const analyses = await databaseService.getGameAnalysisByUserId(req.params.userId);
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 