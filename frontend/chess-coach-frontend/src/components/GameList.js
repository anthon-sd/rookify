import React, { useState, useEffect } from 'react';
import backendApi from '../services/backendApi';
import './GameList.css';

const GameList = ({ onGameSelect, selectedGameId }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });
  const [filters, setFilters] = useState({
    platform: '',
    result: '',
    search: ''
  });

  useEffect(() => {
    loadGames();
  }, [pagination.offset, filters.platform]);

  const loadGames = async (reset = false) => {
    if (!backendApi.isAuthenticated()) return;

    setLoading(true);
    setError(null);

    try {
      const offset = reset ? 0 : pagination.offset;
      const response = await backendApi.getGames(
        pagination.limit,
        offset,
        filters.platform || null
      );

      // Handle different response formats
      const gamesList = Array.isArray(response) ? response : (response.games || response.data || []);
      const total = response.total || (Array.isArray(response) ? response.length : gamesList.length);
      const hasMore = response.has_more || false;
      const limit = response.limit || pagination.limit;

      if (reset) {
        setGames(gamesList);
      } else {
        setGames(prev => offset === 0 ? gamesList : [...prev, ...gamesList]);
      }

      setPagination(prev => ({
        ...prev,
        offset: reset ? limit : offset,
        total: total,
        hasMore: hasMore
      }));

    } catch (error) {
      setError('Failed to load games: ' + error.message);
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const loadMoreGames = () => {
    if (!loading && pagination.hasMore) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeControl = (timeControl) => {
    if (!timeControl) return 'Unknown';
    // Handle different time control formats
    if (typeof timeControl === 'string') {
      return timeControl;
    }
    if (typeof timeControl === 'object' && timeControl.time_class) {
      return timeControl.time_class;
    }
    return 'Unknown';
  };

  const getResultIcon = (result, whitePlayer, blackPlayer, userColor) => {
    if (!result) return '⚪';
    
    if (result === '1-0') {
      return userColor === 'white' ? '🟢' : '🔴'; // Win/Loss
    } else if (result === '0-1') {
      return userColor === 'black' ? '🟢' : '🔴'; // Win/Loss
    } else if (result === '1/2-1/2') {
      return '🟡'; // Draw
    }
    return '⚪';
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'chess.com': return '♔';
      case 'lichess': return '♕';
      default: return '♖';
    }
  };

  const filteredGames = (Array.isArray(games) ? games : []).filter(game => {
    if (!game) return false;
    if (filters.result && game.result !== filters.result) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const whitePlayer = game.white_username || game.white_player || '';
      const blackPlayer = game.black_username || game.black_player || '';
      const opening = game.opening_name || '';
      
      return (
        whitePlayer.toLowerCase().includes(searchLower) ||
        blackPlayer.toLowerCase().includes(searchLower) ||
        opening.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="game-list">
      <div className="game-list-header">
        <h3>Your Analyzed Games ({pagination.total})</h3>
        
        <div className="game-filters">
          <select
            value={filters.platform}
            onChange={(e) => handleFilterChange('platform', e.target.value)}
            className="filter-select"
          >
            <option value="">All Platforms</option>
            <option value="chess.com">Chess.com</option>
            <option value="lichess">Lichess</option>
          </select>

          <select
            value={filters.result}
            onChange={(e) => handleFilterChange('result', e.target.value)}
            className="filter-select"
          >
            <option value="">All Results</option>
            <option value="1-0">White Wins</option>
            <option value="0-1">Black Wins</option>
            <option value="1/2-1/2">Draws</option>
          </select>

          <input
            type="text"
            placeholder="Search players, openings..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-search"
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => loadGames(true)} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="game-list-content">
        {filteredGames.map((game) => {
          // Handle the actual data structure from backend
          const whiteUsername = game.white_username || game.white_player || 'Unknown';
          const blackUsername = game.black_username || game.black_player || 'Unknown';
          const gameDate = game.game_timestamp || game.created_at || game.game_date;
          const keyMoments = game.key_moments || [];
          const keyMomentsCount = (() => {
            if (Array.isArray(keyMoments)) {
              return keyMoments.length;
            }
            if (typeof keyMoments === 'string') {
              try {
                const parsed = JSON.parse(keyMoments);
                return Array.isArray(parsed) ? parsed.length : 0;
              } catch (error) {
                console.warn('Failed to parse key_moments JSON:', error);
                return 0;
              }
            }
            return 0;
          })();
          
          return (
            <div
              key={game.id}
              className={`game-item ${selectedGameId === game.id ? 'selected' : ''}`}
              onClick={() => onGameSelect(game)}
            >
              <div className="game-item-header">
                <div className="game-players">
                  <span className="platform-icon" title={game.platform}>
                    {getPlatformIcon(game.platform)}
                  </span>
                  <span className="white-player">{whiteUsername}</span>
                  <span className="vs">vs</span>
                  <span className="black-player">{blackUsername}</span>
                  <span className="result-icon">
                    {getResultIcon(game.result, whiteUsername, blackUsername, game.user_color)}
                  </span>
                </div>
                <div className="game-result">{game.result || 'Unknown'}</div>
              </div>

              <div className="game-item-details">
                <div className="game-meta">
                  <span className="game-date">{formatDate(gameDate)}</span>
                  <span className="time-control">{formatTimeControl(game.time_control)}</span>
                  <span className="opening">{game.opening_name || 'Unknown Opening'}</span>
                </div>
                
                <div className="game-stats">
                  {keyMomentsCount > 0 && (
                    <div className="key-moments-preview">
                      <span className="moments-count">
                        {keyMomentsCount} move{keyMomentsCount !== 1 ? 's' : ''} analyzed
                      </span>
                    </div>
                  )}
                  
                  {game.total_moves && (
                    <div className="total-moves">
                      <span className="moves-count">
                        {game.total_moves} total moves
                      </span>
                    </div>
                  )}
                  
                  {(game.blunders_count > 0 || game.mistakes_count > 0) && (
                    <div className="accuracy-summary">
                      {game.blunders_count > 0 && <span className="blunders">{game.blunders_count} blunders</span>}
                      {game.mistakes_count > 0 && <span className="mistakes">{game.mistakes_count} mistakes</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading games...</span>
          </div>
        )}

        {!loading && filteredGames.length === 0 && !error && (
          <div className="empty-state">
            <h4>No games found</h4>
            <p>
              {games.length === 0 
                ? "Start by syncing games from Chess.com or Lichess!"
                : "Try adjusting your filters to see more games."
              }
            </p>
          </div>
        )}

        {!loading && pagination.hasMore && filteredGames.length > 0 && (
          <button onClick={loadMoreGames} className="load-more-button">
            Load More Games
          </button>
        )}
      </div>
    </div>
  );
};

export default GameList; 