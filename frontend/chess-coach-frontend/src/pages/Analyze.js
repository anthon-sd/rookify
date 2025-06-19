import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './Analyze.css';

const Analyze = () => {
  const [game, setGame] = useState(new Chess());
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  // Game Upload Handlers
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // TODO: Parse PGN file
    }
  };

  const handleSync = async (platform) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement Chess.com/Lichess sync
      console.log(`Syncing with ${platform}...`);
    } catch (err) {
      setError(`Failed to sync with ${platform}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Game Navigation Handlers
  const goToNextMove = () => {
    if (currentMoveIndex < game.history().length) {
      const newGame = new Chess(game.fen());
      newGame.move(game.history()[currentMoveIndex]);
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex > 0) {
      const newGame = new Chess();
      game.history().slice(0, currentMoveIndex - 1).forEach(move => {
        newGame.move(move);
      });
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  return (
    <div className="analyze-page">
      {/* Game Upload Section */}
      <section className="game-upload-section">
        <h2>Upload or Sync Your Game</h2>
        <div className="upload-options">
          <div className="upload-pgn">
            <input
              type="file"
              accept=".pgn"
              onChange={handleFileUpload}
              id="pgn-upload"
              className="hidden"
            />
            <label htmlFor="pgn-upload" className="upload-button">
              📂 Upload PGN File
            </label>
          </div>
          <div className="sync-options">
            <button onClick={() => handleSync('chess.com')} className="sync-button">
              🔄 Sync from Chess.com
            </button>
            <button onClick={() => handleSync('lichess')} className="sync-button">
              🔄 Sync from Lichess
            </button>
          </div>
        </div>
        {isLoading && <div className="loading-spinner">Loading...</div>}
        {error && <div className="error-message">{error}</div>}
      </section>

      {/* Game Analysis Section */}
      <div className="analysis-container">
        {/* Game List Sidebar */}
        {games.length > 0 && (
          <div className="game-list-sidebar">
            <h3>Your Games</h3>
            {games.map((game, index) => (
              <div
                key={index}
                className={`game-item ${selectedGame === index ? 'selected' : ''}`}
                onClick={() => setSelectedGame(index)}
              >
                <span>{game.date}</span>
                <span>{game.opponent}</span>
                <span>{game.result}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Analysis Panel */}
        <div className="analysis-panel">
          <div className="chessboard-container">
            <Chessboard
              position={game.fen()}
              boardWidth={600}
              arePiecesDraggable={false}
            />
            <div className="move-controls">
              <button onClick={goToPreviousMove}>← Previous</button>
              <button onClick={goToNextMove}>Next →</button>
            </div>
          </div>

          <div className="analysis-sidebar">
            <div className="move-timeline">
              <h3>Move Timeline</h3>
              {/* TODO: Implement move timeline */}
            </div>
            <div className="feedback-panel">
              <h3>Analysis Feedback</h3>
              {/* TODO: Implement AI feedback */}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="game-actions">
        <button className="action-button bookmark">
          🔖 Bookmark
        </button>
        <button className="action-button generate-drill">
          📊 Generate Drill
        </button>
        <button className="action-button annotate">
          ✏️ Annotate
        </button>
      </div>
    </div>
  );
};

export default Analyze; 