import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';
import backendApi from '../services/backendApi';
import SyncModal from '../components/SyncModal';
import SyncProgress from '../components/SyncProgress';
import './Analyze.css';

const Analyze = () => {
  const { user: supabaseUser } = useAuth();
  const [game, setGame] = useState(new Chess());
  // const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  
  // Sync-related state
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);
  const [syncModal, setSyncModal] = useState({ isOpen: false, platform: null });
  const [activeSyncJob, setActiveSyncJob] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);

  // Initialize backend authentication on component mount
  useEffect(() => {
    const initializeBackendAuth = async () => {
      if (supabaseUser && !backendApi.isAuthenticated()) {
        try {
          const result = await backendApi.tryAutoLogin(supabaseUser);
          if (result.success) {
            setIsBackendAuthenticated(true);
            await loadSyncHistory();
          } else {
            console.log('Backend auto-login failed:', result.message);
          }
        } catch (error) {
          console.error('Backend authentication error:', error);
        }
      } else if (backendApi.isAuthenticated()) {
        setIsBackendAuthenticated(true);
        await loadSyncHistory();
      }
    };

    initializeBackendAuth();
  }, [supabaseUser]);

  // Load sync history
  const loadSyncHistory = async () => {
    try {
      const history = await backendApi.getSyncHistory();
      setSyncHistory(history);
      
      // Check for any active sync jobs
      const activeSyncs = history.filter(job => 
        job.status === 'pending' || job.status === 'fetching' || job.status === 'analyzing'
      );
      
      if (activeSyncs.length > 0) {
        setActiveSyncJob(activeSyncs[0]);
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  };

  // Load games from backend
  const loadGames = async () => {
    if (!isBackendAuthenticated) return;
    
    setIsLoading(true);
    try {
      // Note: We'll need to add a games endpoint to the backend
      // For now, we'll simulate with sync history data
      const completedSyncs = syncHistory.filter(job => job.status === 'completed');
      if (completedSyncs.length > 0) {
        // In a real implementation, we'd fetch actual game data
        setGames([]);
      }
    } catch (error) {
      setError('Failed to load games: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Game Upload Handlers
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // TODO: Parse PGN file and implement upload functionality
      console.log('PGN file selected:', file.name);
    }
  };

  // Sync Handlers
  const handleSyncButtonClick = (platform) => {
    if (!supabaseUser) {
      setError('Please login to sync your games');
      return;
    }

    if (!isBackendAuthenticated) {
      setError('Backend authentication required. Please try refreshing the page.');
      return;
    }

    setSyncModal({ isOpen: true, platform });
  };

  const handleStartSync = async (syncData) => {
    try {
      setError(null);
      const result = await backendApi.startSync(
        syncData.platform,
        syncData.username,
        syncData.months,
        syncData.lichessToken
      );
      
      setActiveSyncJob(result);
      await loadSyncHistory();
      
      // Show success message
      console.log('Sync started successfully:', result);
    } catch (error) {
      setError('Failed to start sync: ' + error.message);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleSyncComplete = async (syncResult) => {
    console.log('Sync completed:', syncResult);
    setActiveSyncJob(null);
    await loadSyncHistory();
    await loadGames();
  };

  const handleSyncError = (errorMessage) => {
    setError('Sync failed: ' + errorMessage);
    setActiveSyncJob(null);
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
      {/* Authentication Status */}
      {supabaseUser && (
        <div className="auth-status">
          <div className="user-info">
            Welcome, {supabaseUser.email}
            {isBackendAuthenticated ? (
              <span className="backend-status authenticated">🔒 Sync Ready</span>
            ) : (
              <span className="backend-status not-authenticated">⚠️ Sync Authentication Required</span>
            )}
          </div>
        </div>
      )}

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
            <button 
              onClick={() => handleSyncButtonClick('chess.com')} 
              className="sync-button"
              disabled={!supabaseUser || !isBackendAuthenticated || !!activeSyncJob}
            >
              🔄 Sync from Chess.com
            </button>
            <button 
              onClick={() => handleSyncButtonClick('lichess')} 
              className="sync-button"
              disabled={!supabaseUser || !isBackendAuthenticated || !!activeSyncJob}
            >
              🔄 Sync from Lichess
            </button>
          </div>
        </div>

        {/* Sync Progress */}
        {activeSyncJob && (
          <SyncProgress
            syncJobId={activeSyncJob.id}
            onComplete={handleSyncComplete}
            onError={handleSyncError}
          />
        )}

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="sync-history">
            <h3>Recent Sync Jobs</h3>
            <div className="sync-history-list">
              {syncHistory.slice(0, 3).map((job) => (
                <div key={job.id} className={`sync-history-item ${job.status}`}>
                  <div className="sync-info">
                    <span className="platform">{job.platform}</span>
                    <span className="username">{job.username}</span>
                    <span className="status">{job.status}</span>
                  </div>
                  <div className="sync-meta">
                    <span className="date">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    {job.status === 'completed' && (
                      <span className="games-count">
                        {job.games_found} games
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {games.length === 0 && (
                <div className="placeholder-message">
                  Sync your games to see detailed move analysis here
                </div>
              )}
            </div>
            <div className="feedback-panel">
              <h3>Analysis Feedback</h3>
              {games.length === 0 && (
                <div className="placeholder-message">
                  AI-powered insights will appear here after syncing games
                </div>
              )}
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

      {/* Sync Modal */}
      <SyncModal
        isOpen={syncModal.isOpen}
        platform={syncModal.platform}
        onClose={() => setSyncModal({ isOpen: false, platform: null })}
        onStartSync={handleStartSync}
      />
    </div>
  );
};

export default Analyze; 