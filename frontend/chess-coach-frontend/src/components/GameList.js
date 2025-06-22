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

      if (reset) {
        setGames(response.games);
      } else {
        setGames(prev => offset === 0 ? response.games : [...prev, ...response.games]);
      }

      setPagination(prev => ({
        ...prev,
        offset: reset ? response.limit : offset,
        total: response.total,
        hasMore: response.has_more
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

  const getResultIcon = (result, whitePlayer, blackPlayer, currentUsername) => {
    if (!result || !currentUsername) return '⚪';
    
    const isUserWhite = whitePlayer?.toLowerCase().includes(currentUsername.toLowerCase());
    const isUserBlack = blackPlayer?.toLowerCase().includes(currentUsername.toLowerCase());
    
    if (result === '1-0') {
      return isUserWhite ? '🟢' : '🔴'; // Win/Loss
    } else if (result === '0-1') {
      return isUserBlack ? '🟢' : '🔴'; // Win/Loss
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
      return (
        game.white_player?.toLowerCase().includes(searchLower) ||
        game.black_player?.toLowerCase().includes(searchLower) ||
        game.opening_name?.toLowerCase().includes(searchLower)
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
        {filteredGames.map((game) => (
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
                <span className="white-player">{game.white_player || 'Unknown'}</span>
                <span className="vs">vs</span>
                <span className="black-player">{game.black_player || 'Unknown'}</span>
                <span className="result-icon">
                  {getResultIcon(game.result, game.white_player, game.black_player, 'current_user')}
                </span>
              </div>
              <div className="game-result">{game.result || 'Unknown'}</div>
            </div>

            <div className="game-item-details">
              <div className="game-meta">
                <span className="game-date">{formatDate(game.game_date)}</span>
                <span className="time-control">{formatTimeControl(game.time_control)}</span>
                <span className="opening">{game.opening_name || 'Unknown Opening'}</span>
              </div>
              
              {game.key_moments && game.key_moments.length > 0 && (
                <div className="key-moments-preview">
                  <span className="moments-count">
                    {game.key_moments.length} key moment{game.key_moments.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

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