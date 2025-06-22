import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';
import backendApi from '../services/backendApi';
import SyncModal from '../components/SyncModal';
import SyncProgress from '../components/SyncProgress';
import GameList from '../components/GameList';
import './Analyze.css';

const Analyze = () => {
  const { user: supabaseUser } = useAuth();
  const [game, setGame] = useState(new Chess());
  // const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedGameData, setSelectedGameData] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [loadingGameAnalysis, setLoadingGameAnalysis] = useState(false);
  
  // Sync-related state
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);
  const [syncModal, setSyncModal] = useState({ isOpen: false, platform: null });
  const [activeSyncJob, setActiveSyncJob] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);

  // Initialize backend authentication on component mount
  useEffect(() => {
    const initializeBackendAuth = async () => {
      console.log('🚀 Initializing backend authentication...');
      console.log('Supabase user:', supabaseUser?.email);
      console.log('Backend already authenticated:', backendApi.isAuthenticated());
      
      if (supabaseUser && !backendApi.isAuthenticated()) {
        console.log('🔄 Starting backend authentication process...');
        try {
          const result = await backendApi.tryAutoLogin(supabaseUser);
          if (result.success) {
            console.log('✅ Backend authentication successful!');
            setIsBackendAuthenticated(true);
            await loadSyncHistory();
          } else {
            console.log('❌ Backend auto-login failed:', result.message);
            setError(`Backend authentication failed: ${result.message}`);
          }
        } catch (error) {
          console.error('💥 Backend authentication error:', error);
          setError(`Backend authentication error: ${error.message}`);
        }
      } else if (backendApi.isAuthenticated()) {
        console.log('✅ Using existing backend authentication');
        setIsBackendAuthenticated(true);
        await loadSyncHistory();
      } else {
        console.log('⏳ Waiting for Supabase user...');
      }
    };

    initializeBackendAuth();
  }, [supabaseUser]);

  // Load sync history
  const loadSyncHistory = async () => {
    try {
      console.log('📅 Loading sync history...');
      const response = await backendApi.getSyncHistory();
      console.log('📅 Sync history response:', response);
      
      // Ensure we have an array
      const history = Array.isArray(response) ? response : (response.data || []);
      console.log('📅 Processed sync history:', history);
      
      setSyncHistory(history);
      
      // Check for any active sync jobs
      if (Array.isArray(history) && history.length > 0) {
        const activeSyncs = history.filter(job => 
          job.status === 'pending' || job.status === 'fetching' || job.status === 'analyzing'
        );
        
        if (activeSyncs.length > 0) {
          setActiveSyncJob(activeSyncs[0]);
          console.log('🔄 Found active sync job:', activeSyncs[0]);
        }
      }
    } catch (error) {
      console.error('💥 Failed to load sync history:', error);
      // Set empty array on error to prevent crashes
      setSyncHistory([]);
    }
  };

  // Load games from backend
  const loadGames = async () => {
    if (!isBackendAuthenticated) {
      console.log('🎮 Skipping games load - not authenticated');
      return;
    }
    
    console.log('🎮 Loading games...');
    setIsLoading(true);
    try {
      // Try to load actual games from backend
      const gamesData = await backendApi.getGames(20, 0);
      console.log('🎮 Games loaded:', gamesData);
      
      // Handle different response formats
      const gamesList = Array.isArray(gamesData) ? gamesData : (gamesData.games || gamesData.data || []);
      setGames(gamesList);
      console.log('🎮 Games set:', gamesList.length, 'games');
    } catch (error) {
      console.error('💥 Failed to load games:', error);
      // Don't show error for empty games list
      if (!error.message.includes('404') && !error.message.includes('not found')) {
        setError('Failed to load games: ' + error.message);
      }
      setGames([]); // Set empty array on error
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
        syncData.lichessToken,
        syncData.fromDate,
        syncData.toDate
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

  // Game Selection Handlers
  const handleGameSelect = async (gameItem) => {
    if (!isBackendAuthenticated) {
      setError('Backend authentication required to view game analysis');
      return;
    }

    setSelectedGame(gameItem.id);
    setLoadingGameAnalysis(true);
    setError(null);

    try {
      const gameData = await backendApi.getGameAnalysis(gameItem.id);
      setSelectedGameData(gameData);
      
      // Initialize the chess game with the PGN if available
      if (gameData.pgn) {
        try {
          const newGame = new Chess();
          newGame.loadPgn(gameData.pgn);
          setGame(newGame);
          setCurrentMoveIndex(0);
          
          // Reset to starting position
          const gameFromStart = new Chess();
          setGame(gameFromStart);
        } catch (pgnError) {
          console.error('Error loading PGN:', pgnError);
          setError('Failed to load game moves');
        }
      }
    } catch (error) {
      setError('Failed to load game analysis: ' + error.message);
      console.error('Error loading game analysis:', error);
    } finally {
      setLoadingGameAnalysis(false);
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
        <div className="game-list-sidebar">
          <GameList 
            onGameSelect={handleGameSelect} 
            selectedGameId={selectedGame}
          />
        </div>

        {/* Main Analysis Panel */}
        <div className="analysis-panel">
          {selectedGameData ? (
            <>
              {/* Game Info Header */}
              <div className="game-info-header">
                <div className="game-title">
                  <h3>
                    {selectedGameData.white_player} vs {selectedGameData.black_player}
                  </h3>
                  <div className="game-meta-info">
                    <span className="game-result">{selectedGameData.result}</span>
                    <span className="game-date">
                      {new Date(selectedGameData.game_date).toLocaleDateString()}
                    </span>
                    <span className="game-platform">{selectedGameData.platform}</span>
                    {selectedGameData.opening_name && (
                      <span className="game-opening">{selectedGameData.opening_name}</span>
                    )}
                  </div>
                </div>
                {loadingGameAnalysis && (
                  <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>Loading analysis...</span>
                  </div>
                )}
              </div>

              <div className="analysis-panel-grid">
                <div className="chessboard-container">
                  <Chessboard
                    position={game.fen()}
                    boardWidth={600}
                    arePiecesDraggable={false}
                  />
                  <div className="move-controls">
                    <button onClick={goToPreviousMove} disabled={currentMoveIndex === 0}>
                      ← Previous
                    </button>
                    <span className="move-counter">
                      Move {currentMoveIndex} / {game.history().length}
                    </span>
                    <button onClick={goToNextMove} disabled={currentMoveIndex >= game.history().length}>
                      Next →
                    </button>
                  </div>
                </div>

                <div className="analysis-sidebar">
                <div className="move-timeline">
                  <h3>Move Timeline</h3>
                  {selectedGameData.key_moments && selectedGameData.key_moments.length > 0 ? (
                    <div className="key-moments-list">
                      {selectedGameData.key_moments.map((moment, index) => (
                        <div key={index} className="key-moment-item">
                          <span className="moment-move">Move {moment.move_number || index + 1}</span>
                          <span className="moment-type">{moment.type || 'Key Position'}</span>
                          {moment.evaluation && (
                            <span className="moment-eval">{moment.evaluation}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="placeholder-message">
                      No key moments analyzed for this game yet
                    </div>
                  )}
                </div>
                <div className="feedback-panel">
                  <h3>Position Analysis</h3>
                  <div className="current-position-info">
                    <div className="position-fen">
                      <strong>FEN:</strong> {game.fen()}
                    </div>
                    <button 
                      className="analyze-position-btn"
                      onClick={() => {
                        // TODO: Implement real-time position analysis
                        console.log('Analyzing position:', game.fen());
                      }}
                    >
                      🔍 Analyze Current Position
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-game-selected">
              <div className="placeholder-content">
                <h3>Select a Game to Analyze</h3>
                <p>
                  Choose a game from the list on the left to view detailed analysis,
                  move timeline, and AI insights.
                </p>
                {!isBackendAuthenticated && (
                  <p className="auth-hint">
                    Make sure you're authenticated to view game analysis.
                  </p>
                )}
              </div>
            </div>
          )}
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