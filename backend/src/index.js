const express = require("express");
const cors = require("cors");
require("dotenv").config();
const supabase = require("./config/supabase");

// Import routes
const userRoutes = require('./routes/users');
const gameAnalysisRoutes = require('./routes/gameAnalysis');
const recommendationRoutes = require('./routes/recommendations');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Chess Coach API Running");
});

// Test Supabase connection
app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    res.json({ message: "Database connection successful", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/game-analysis', gameAnalysisRoutes);
app.use('/api/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 