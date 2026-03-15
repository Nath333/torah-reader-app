/**
 * LoadingStates - Loading, Error, and Empty state components
 */
import React from 'react';

export const LoadingState = React.memo(({ message = 'Loading...', subMessage }) => (
  <div className="loading-state enhanced">
    <div className="loading-spinner"></div>
    <span className="loading-message">{message}</span>
    {subMessage && <span className="loading-submessage">{subMessage}</span>}
  </div>
));

export const ErrorState = React.memo(({ error, onRetry }) => (
  <div className="error-state">
    <span className="error-icon">⚠️</span>
    <span className="error-message">{error || 'Something went wrong'}</span>
    {onRetry && (
      <button className="error-retry" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
));

export const EmptyState = React.memo(({ icon, message, suggestion }) => (
  <div className="tab-empty enhanced">
    <span className="empty-icon">{icon}</span>
    <span className="empty-text">{message}</span>
    {suggestion && <span className="empty-suggestion">{suggestion}</span>}
  </div>
));
