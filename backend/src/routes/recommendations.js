const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');

// Create a new recommendation
router.post('/', async (req, res) => {
  try {
    const recommendation = await databaseService.createRecommendation(req.body);
    res.status(201).json(recommendation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get recommendations for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const recommendations = await databaseService.getRecommendationsByUserId(req.params.userId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 