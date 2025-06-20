const express = require("express");
const cors = require("cors");
const supabaseAuth = require('./middleware/auth');
require("dotenv").config();

// Import routes
const chessApiRoutes = require('./routes/chessApi');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Chess Coach API Running");
});

// Protect all chess API routes
app.use('/api/chess', supabaseAuth, chessApiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 