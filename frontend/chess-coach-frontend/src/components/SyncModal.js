import React, { useState } from 'react';
import './SyncModal.css';

const SyncModal = ({ isOpen, onClose, onStartSync, platform }) => {
  const [formData, setFormData] = useState({
    username: '',
    months: 1,
    lichessToken: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const syncData = {
        platform,
        username: formData.username,
        months: formData.months,
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
      setFormData({ username: '', months: 1, lichessToken: '' });
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
            <label htmlFor="months">Time Period</label>
            <select
              id="months"
              name="months"
              value={formData.months}
              onChange={handleInputChange}
              disabled={isLoading}
            >
              <option value={1}>Last 1 month</option>
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <div className="field-help">
              Choose how far back to sync your games
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