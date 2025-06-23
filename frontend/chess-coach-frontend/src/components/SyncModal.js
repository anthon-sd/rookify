import React, { useState } from 'react';
import './SyncModal.css';

const SyncModal = ({ isOpen, onClose, onStartSync, platform }) => {
  // Calculate default date range (last 30 days)
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      fromDate: thirtyDaysAgo.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0]
    };
  };

  const [formData, setFormData] = useState({
    username: '',
    fromDate: getDefaultDates().fromDate,
    toDate: getDefaultDates().toDate,
    lichessToken: '',
  });
  const [filters, setFilters] = useState({
    gameTypes: {
      bullet: false,
      blitz: true,
      rapid: true,
      classical: false
    },
    results: {
      win: true,
      loss: true,
      draw: true
    },
    colors: {
      white: true,
      black: true
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate date range
    const fromDate = new Date(formData.fromDate);
    const toDate = new Date(formData.toDate);
    
    if (fromDate >= toDate) {
      setError('From date must be before to date');
      setIsLoading(false);
      return;
    }

    // Check if date range is reasonable (not more than 2 years)
    const daysDifference = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (daysDifference > 730) {
      setError('Date range cannot exceed 2 years');
      setIsLoading(false);
      return;
    }

    try {
      // Calculate months for backend compatibility (approximate)
      const months = Math.ceil(daysDifference / 30);
      
      const syncData = {
        platform,
        username: formData.username,
        months: Math.max(1, months), // Ensure at least 1 month
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        // Add filters
        game_types: Object.entries(filters.gameTypes)
          .filter(([_, checked]) => checked)
          .map(([type, _]) => type),
        results: Object.entries(filters.results)
          .filter(([_, checked]) => checked)
          .map(([result, _]) => result),
        colors: Object.entries(filters.colors)
          .filter(([_, checked]) => checked)
          .map(([color, _]) => color),
        ...(platform === 'lichess' && formData.lichessToken && {
          lichessToken: formData.lichessToken,
        }),
      };

      await onStartSync(syncData);
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to start sync');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    if (!isLoading) {
      const defaultDates = getDefaultDates();
      setFormData({ 
        username: '', 
        fromDate: defaultDates.fromDate,
        toDate: defaultDates.toDate,
        lichessToken: '' 
      });
      setFilters({
        gameTypes: {
          bullet: false,
          blitz: true,
          rapid: true,
          classical: false
        },
        results: {
          win: true,
          loss: true,
          draw: true
        },
        colors: {
          white: true,
          black: true
        }
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sync-modal-overlay" onClick={handleClose}>
      <div className="sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sync-modal-header">
          <h2>Sync from {platform === 'chess.com' ? 'Chess.com' : 'Lichess'}</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sync-form">
          <div className="form-group">
            <label htmlFor="username">
              {platform === 'chess.com' ? 'Chess.com' : 'Lichess'} Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder={`Enter your ${platform === 'chess.com' ? 'Chess.com' : 'Lichess'} username`}
              required
              disabled={isLoading}
            />
            <div className="field-help">
              This is your public username on {platform === 'chess.com' ? 'Chess.com' : 'Lichess'}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="date-range">Date Range</label>
            <div className="date-range-container">
              <div className="date-input-group">
                <label htmlFor="fromDate" className="date-label">From</label>
                <input
                  id="fromDate"
                  name="fromDate"
                  type="date"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  max={formData.toDate}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="toDate" className="date-label">To</label>
                <input
                  id="toDate"
                  name="toDate"
                  type="date"
                  value={formData.toDate}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  min={formData.fromDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="field-help">
              Select the date range for games to sync (maximum 2 years)
            </div>
            <div className="date-presets">
              <button
                type="button"
                className="preset-button"
                onClick={() => {
                  const today = new Date();
                  const lastWeek = new Date();
                  lastWeek.setDate(today.getDate() - 7);
                  setFormData(prev => ({
                    ...prev,
                    fromDate: lastWeek.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0]
                  }));
                }}
                disabled={isLoading}
              >
                Last Week
              </button>
              <button
                type="button"
                className="preset-button"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date();
                  lastMonth.setMonth(today.getMonth() - 1);
                  setFormData(prev => ({
                    ...prev,
                    fromDate: lastMonth.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0]
                  }));
                }}
                disabled={isLoading}
              >
                Last Month
              </button>
              <button
                type="button"
                className="preset-button"
                onClick={() => {
                  const today = new Date();
                  const lastThreeMonths = new Date();
                  lastThreeMonths.setMonth(today.getMonth() - 3);
                  setFormData(prev => ({
                    ...prev,
                    fromDate: lastThreeMonths.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0]
                  }));
                }}
                disabled={isLoading}
              >
                Last 3 Months
              </button>
              <button
                type="button"
                className="preset-button"
                onClick={() => {
                  const today = new Date();
                  const lastYear = new Date();
                  lastYear.setFullYear(today.getFullYear() - 1);
                  setFormData(prev => ({
                    ...prev,
                    fromDate: lastYear.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0]
                  }));
                }}
                disabled={isLoading}
              >
                Last Year
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Game Types</label>
            <div className="filter-checkboxes">
              {Object.entries(filters.gameTypes).map(([type, checked]) => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      gameTypes: { ...prev.gameTypes, [type]: e.target.checked }
                    }))}
                    disabled={isLoading}
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
            <div className="field-help">
              Select which time controls to include (bullet &lt; 3min, blitz &lt; 10min, rapid &lt; 30min, classical ≥ 30min)
            </div>
          </div>

          <div className="form-group">
            <label>Results</label>
            <div className="filter-checkboxes">
              {Object.entries(filters.results).map(([result, checked]) => (
                <label key={result} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      results: { ...prev.results, [result]: e.target.checked }
                    }))}
                    disabled={isLoading}
                  />
                  {result.charAt(0).toUpperCase() + result.slice(1)}
                </label>
              ))}
            </div>
            <div className="field-help">
              Include games based on your results
            </div>
          </div>

          <div className="form-group">
            <label>Colors</label>
            <div className="filter-checkboxes">
              {Object.entries(filters.colors).map(([color, checked]) => (
                <label key={color} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      colors: { ...prev.colors, [color]: e.target.checked }
                    }))}
                    disabled={isLoading}
                  />
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </label>
              ))}
            </div>
            <div className="field-help">
              Include games where you played as white or black
            </div>
          </div>

          {platform === 'lichess' && (
            <div className="form-group">
              <label htmlFor="lichessToken">
                Lichess API Token (Optional)
              </label>
              <input
                id="lichessToken"
                name="lichessToken"
                type="password"
                value={formData.lichessToken}
                onChange={handleInputChange}
                placeholder="Enter your Lichess API token"
                disabled={isLoading}
              />
              <div className="field-help">
                Optional: Provides access to private games and better rate limits.
                Get your token from{' '}
                <a 
                  href="https://lichess.org/account/oauth/token" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Lichess OAuth
                </a>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sync-button"
              disabled={isLoading || !formData.username}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Starting Sync...
                </>
              ) : (
                `Start Sync from ${platform === 'chess.com' ? 'Chess.com' : 'Lichess'}`
              )}
            </button>
          </div>
        </form>

        <div className="sync-info">
          <h3>What happens during sync?</h3>
          <ul>
            <li>🔍 We'll fetch your recent games from {platform === 'chess.com' ? 'Chess.com' : 'Lichess'}</li>
            <li>🤖 Each game will be analyzed with our AI engine</li>
            <li>📊 Key positions and moves will be identified</li>
            <li>💡 Personalized recommendations will be generated</li>
            <li>⚡ This process runs in the background - you can continue using the app</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SyncModal; 