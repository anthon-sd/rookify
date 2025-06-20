import React, { useState, useEffect } from 'react';
import backendApi from '../services/backendApi';
import './SyncProgress.css';

const SyncProgress = ({ syncJobId, onComplete, onError }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!syncJobId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await backendApi.getSyncStatus(syncJobId);
        setSyncStatus(status);

        // Check if sync is complete or failed
        if (status.status === 'completed') {
          setIsPolling(false);
          if (onComplete) {
            onComplete(status);
          }
        } else if (status.status === 'failed') {
          setIsPolling(false);
          if (onError) {
            onError(status.error || 'Sync failed');
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
        setIsPolling(false);
        if (onError) {
          onError(error.message);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [syncJobId, isPolling, onComplete, onError]);

  if (!syncStatus) {
    return (
      <div className="sync-progress">
        <div className="sync-status">
          <span className="status-indicator status-pending"></span>
          Initializing sync...
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'fetching':
        return '📥';
      case 'analyzing':
        return '🔍';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#3182CE';
      case 'fetching':
        return '#38A169';
      case 'analyzing':
        return '#ECC94B';
      case 'completed':
        return '#38A169';
      case 'failed':
        return '#E53E3E';
      default:
        return '#3182CE';
    }
  };

  const calculateProgress = () => {
    if (syncStatus.status === 'completed') return 100;
    if (syncStatus.status === 'failed') return 0;
    if (syncStatus.games_found === 0) return 10; // Show some progress for fetching
    
    return Math.round((syncStatus.games_analyzed / syncStatus.games_found) * 100);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="sync-progress">
      <div className="sync-header">
        <h3>
          {getStatusIcon(syncStatus.status)} 
          Syncing from {syncStatus.platform}
        </h3>
        <div className="sync-meta">
          <span>Username: {syncStatus.username}</span>
          <span>Started: {formatTime(syncStatus.created_at)}</span>
        </div>
      </div>

      <div className="sync-status">
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span 
            className="status-value"
            style={{ color: getStatusColor(syncStatus.status) }}
          >
            {syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1)}
          </span>
        </div>

        {syncStatus.games_found > 0 && (
          <div className="status-row">
            <span className="status-label">Games Found:</span>
            <span className="status-value">{syncStatus.games_found}</span>
          </div>
        )}

        {syncStatus.games_analyzed > 0 && (
          <div className="status-row">
            <span className="status-label">Games Analyzed:</span>
            <span className="status-value">
              {syncStatus.games_analyzed} / {syncStatus.games_found}
            </span>
          </div>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${calculateProgress()}%`,
              backgroundColor: getStatusColor(syncStatus.status)
            }}
          />
        </div>
        <span className="progress-text">{calculateProgress()}%</span>
      </div>

      {syncStatus.status === 'completed' && (
        <div className="completion-summary">
          <div className="completion-stats">
            <div className="stat">
              <span className="stat-number">{syncStatus.games_found}</span>
              <span className="stat-label">Games Found</span>
            </div>
            <div className="stat">
              <span className="stat-number">{syncStatus.games_analyzed}</span>
              <span className="stat-label">Games Analyzed</span>
            </div>
            <div className="stat">
              <span className="stat-number">
                {formatTime(syncStatus.completed_at)}
              </span>
              <span className="stat-label">Completed At</span>
            </div>
          </div>
        </div>
      )}

      {syncStatus.status === 'failed' && syncStatus.error && (
        <div className="error-details">
          <h4>Error Details:</h4>
          <p>{syncStatus.error}</p>
        </div>
      )}

      {isPolling && syncStatus.status !== 'completed' && syncStatus.status !== 'failed' && (
        <div className="polling-indicator">
          <div className="spinner"></div>
          <span>Updating status...</span>
        </div>
      )}
    </div>
  );
};

export default SyncProgress; 