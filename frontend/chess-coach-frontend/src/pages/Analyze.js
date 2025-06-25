import React, { useState, useEffect, useRef } from 'react';
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
  
  // Use useRef to store the complete game for navigation
  const completeGameRef = useRef(null);

  // Utility function to safely parse key moments
  const parseKeyMoments = (keyMoments) => {
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
      console.warn('Failed to parse key_moments in Analyze component:', error);
      console.log('Raw key_moments value:', keyMoments);
      return [];
    }
  };
  
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
    console.log('🎯 Game selected:', gameItem);
    
    if (!gameItem || !gameItem.id) {
      console.error('❌ Invalid game item:', gameItem);
      setError('Invalid game selected');
      return;
    }

    if (!isBackendAuthenticated) {
      setError('Backend authentication required to view game analysis');
      return;
    }

    setSelectedGame(gameItem.id);
    setLoadingGameAnalysis(true);
    setError(null);

    try {
      console.log('📡 Fetching game analysis for ID:', gameItem.id);
      const gameData = await backendApi.getGameAnalysis(gameItem.id);
      console.log('📊 Game analysis received:', gameData);
      console.log('📊 Game data keys:', Object.keys(gameData || {}));
      console.log('📊 PGN data type:', typeof gameData?.pgn);
      console.log('📊 PGN data length:', gameData?.pgn?.length);
      console.log('📊 Key moments type:', typeof gameData?.key_moments);
      console.log('📊 Key moments length:', gameData?.key_moments?.length);
      setSelectedGameData(gameData);
      
      // Initialize the chess game with the PGN if available
      if (gameData.pgn && typeof gameData.pgn === 'string' && gameData.pgn.trim().length > 0) {
        try {
          console.log('🎯 Loading PGN for game:', gameData.id);
          console.log('📝 PGN content length:', gameData.pgn.length);
          console.log('📝 PGN preview (first 200 chars):', gameData.pgn.substring(0, 200));
          
          // Clean the PGN before attempting to parse it
          let cleanedPgn = gameData.pgn.trim();
          
          // Remove any malformed characters and annotations that might break parsing
          cleanedPgn = cleanedPgn
            .replace(/\(\%[^)]*\)/g, '') // Remove malformed annotations like (%...
            .replace(/\{[^}]*\}/g, '') // Remove comments in braces
            .replace(/\([^)]*\)/g, '') // Remove parenthetical annotations
            .replace(/\$\d+/g, '') // Remove numeric annotations
            .replace(/\?+/g, '') // Remove question marks
            .replace(/!+/g, '') // Remove exclamation marks
            .replace(/[^\w\s\-\.=+#O\n\[\]]/g, ' ') // Keep only valid PGN characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          console.log('🧹 Cleaned PGN preview:', cleanedPgn.substring(0, 200));
          
          // Create a new game and load the cleaned PGN
          const newGame = new Chess();
          const pgnLoaded = newGame.loadPgn(cleanedPgn);
          
          if (pgnLoaded) {
            console.log('✅ PGN loaded successfully');
            console.log('📚 Total moves:', newGame.history().length);
            console.log('📚 Move history:', newGame.history());
            
            // Reset to starting position for navigation
            const gameFromStart = new Chess();
            setGame(gameFromStart);
            setCurrentMoveIndex(0);
            
            // Store the complete game for navigation
            completeGameRef.current = newGame;
            
            // Clear any previous errors
            setError(null);
            
          } else {
            console.error('❌ Failed to load cleaned PGN - chess.js returned false');
            console.error('❌ Original PGN:', gameData.pgn);
            console.error('❌ Cleaned PGN:', cleanedPgn);
            
            // Try to load just the moves part if headers are causing issues
            const movesOnly = cleanedPgn.split('\n\n').pop(); // Get the last section (moves)
            const movesOnlyGame = new Chess();
            
            console.log('🎯 Trying moves-only approach:', movesOnly.substring(0, 100));
            
            try {
              const movesOnlyLoaded = movesOnlyGame.loadPgn(movesOnly);
              if (movesOnlyLoaded) {
                console.log('✅ Moves-only PGN loaded successfully');
                const gameFromStart = new Chess();
                setGame(gameFromStart);
                setCurrentMoveIndex(0);
                completeGameRef.current = movesOnlyGame;
                setError(null);
              } else {
                throw new Error('Moves-only parsing also failed');
              }
            } catch (movesError) {
              console.error('❌ Moves-only parsing failed:', movesError);
              setError('Unable to parse game moves - PGN format may be corrupted');
              
              // Set up empty game as fallback
              setGame(new Chess());
              setCurrentMoveIndex(0);
              completeGameRef.current = null;
            }
          }
        } catch (pgnError) {
          console.error('💥 Error loading PGN:', pgnError);
          console.error('💥 Original PGN that caused error:', gameData.pgn);
          
          // Try a more aggressive cleaning approach
          try {
            console.log('🔧 Attempting aggressive PGN repair...');
            
            // Extract just the basic moves using regex
            const movePattern = /\d+\.\s*[NBKQR]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBKQR])?[+#]?\s*(?:[NBKQR]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBKQR])?[+#]?)?/g;
            const extractedMoves = gameData.pgn.match(movePattern) || [];
            
            if (extractedMoves.length > 0) {
              const reconstructedPgn = extractedMoves.join(' ');
              console.log('🔧 Reconstructed PGN:', reconstructedPgn.substring(0, 100));
              
              const repairGame = new Chess();
              const repairLoaded = repairGame.loadPgn(reconstructedPgn);
              
              if (repairLoaded) {
                console.log('✅ Aggressive repair successful');
                const gameFromStart = new Chess();
                setGame(gameFromStart);
                setCurrentMoveIndex(0);
                completeGameRef.current = repairGame;
                setError(null);
                return; // Success, exit early
              }
            }
          } catch (repairError) {
            console.error('🔧 Aggressive repair also failed:', repairError);
          }
          
          setError('Game moves are corrupted and cannot be parsed. Try re-syncing this game.');
          
          // Set up empty game as fallback
          setGame(new Chess());
          setCurrentMoveIndex(0);
          completeGameRef.current = null;
        }
      } else {
        console.log('⚠️ No valid PGN data available for this game');
        console.log('⚠️ PGN value:', gameData.pgn);
        console.log('⚠️ PGN type:', typeof gameData.pgn);
        console.log('⚠️ PGN is string:', typeof gameData.pgn === 'string');
        console.log('⚠️ PGN length:', gameData.pgn?.length);
        console.log('⚠️ PGN trim length:', gameData.pgn?.trim?.()?.length);
        
        // Set up empty game
        setGame(new Chess());
        setCurrentMoveIndex(0);
        completeGameRef.current = null;
        
        // Don't show an error if there's simply no PGN data
        // setError('No chess moves available for this game');
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
    if (!completeGameRef.current) {
      console.log('⚠️ No complete game available for navigation');
      return;
    }

    const totalMoves = completeGameRef.current.history().length;
    
    if (currentMoveIndex < totalMoves) {
      console.log(`🎯 Moving to move ${currentMoveIndex + 1}/${totalMoves}`);
      
      // Create new game and play moves up to current index + 1
      const newGame = new Chess();
      const moves = completeGameRef.current.history();
      
      for (let i = 0; i <= currentMoveIndex; i++) {
        try {
          newGame.move(moves[i]);
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError);
          break;
        }
      }
      
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const goToPreviousMove = () => {
    if (!completeGameRef.current) {
      console.log('⚠️ No complete game available for navigation');
      return;
    }

    if (currentMoveIndex > 0) {
      console.log(`🎯 Moving to move ${currentMoveIndex - 1}`);
      
      // Create new game and play moves up to current index - 1
      const newGame = new Chess();
      const moves = completeGameRef.current.history();
      
      for (let i = 0; i < currentMoveIndex - 1; i++) {
        try {
          newGame.move(moves[i]);
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError);
          break;
        }
      }
      
      setGame(newGame);
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const goToMove = (moveIndex) => {
    if (!completeGameRef.current) {
      console.log('⚠️ No complete game available for navigation');
      return;
    }

    const totalMoves = completeGameRef.current.history().length;
    
    if (moveIndex >= 0 && moveIndex <= totalMoves) {
      console.log(`🎯 Jumping to move ${moveIndex}/${totalMoves}`);
      
      // Create new game and play moves up to moveIndex
      const newGame = new Chess();
      const moves = completeGameRef.current.history();
      
      for (let i = 0; i < moveIndex; i++) {
        try {
          newGame.move(moves[i]);
        } catch (moveError) {
          console.error('❌ Error making move:', moves[i], moveError);
          break;
        }
      }
      
      setGame(newGame);
      setCurrentMoveIndex(moveIndex);
    }
  };

  const getTotalMoves = () => {
    return completeGameRef.current ? completeGameRef.current.history().length : 0;
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
                      Move {currentMoveIndex} / {getTotalMoves()}
                    </span>
                    <button onClick={goToNextMove} disabled={currentMoveIndex >= getTotalMoves()}>
                      Next →
                    </button>
                  </div>
                </div>

                <div className="analysis-sidebar">
                <div className="move-timeline">
                  <h3>Move Timeline</h3>
                  {(() => {
                    const keyMoments = parseKeyMoments(selectedGameData.key_moments);
                    
                    return keyMoments.length > 0 ? (
                      <div className="key-moments-list">
                        {keyMoments.map((moment, index) => {
                          const moveNumber = moment.move_number || Math.floor(index / 2) + 1;
                          const accuracy = moment.accuracy_class || 'Unknown';
                          const evaluation = moment.eval_score;
                          const move = moment.move;
                          const isWhiteMove = index % 2 === 0;
                          
                          return (
                            <div 
                              key={index} 
                              className={`key-moment-item ${accuracy.toLowerCase()}`}
                              onClick={() => goToMove(index)}
                              title={`Click to go to move ${moveNumber}`}
                            >
                              <div className="moment-header">
                                <span className="moment-move">
                                  {moveNumber}{isWhiteMove ? '.' : '...'} {move || 'N/A'}
                                </span>
                                <span className={`accuracy-badge ${accuracy.toLowerCase()}`}>
                                  {accuracy}
                                </span>
                              </div>
                              {evaluation !== undefined && (
                                <div className="moment-eval">
                                  Eval: {evaluation > 0 ? '+' : ''}{(evaluation / 100).toFixed(2)}
                                </div>
                              )}
                              {moment.llm_analysis && (
                                <div className="moment-analysis">
                                  {moment.llm_analysis.length > 100 
                                    ? moment.llm_analysis.substring(0, 100) + '...'
                                    : moment.llm_analysis
                                  }
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="placeholder-message">
                        No key moments analyzed for this game yet.
                        {selectedGameData.pgn ? ' Analysis may still be processing.' : ' PGN data not available.'}
                      </div>
                    );
                  })()}
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