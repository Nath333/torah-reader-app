/**
 * LoadingStates - Enhanced Loading, Error, and Empty state components
 * Features: Skeleton loading, animated spinners, friendly error messages
 */
import React from 'react';

/**
 * LoadingState - Shows a loading indicator with optional message
 */
export const LoadingState = React.memo(({
  message = 'Loading...',
  subMessage,
  variant = 'default', // 'default' | 'minimal' | 'skeleton'
  lines = 5
}) => {
  // Skeleton variant for content loading
  if (variant === 'skeleton') {
    return (
      <div className="loading-state skeleton-state">
        <div className="skeleton-content">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`skeleton-line ${i === 0 ? 'skeleton-header' : ''} ${i === lines - 1 ? 'short' : i % 2 === 0 ? 'full' : 'medium'}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Minimal variant for inline loading
  if (variant === 'minimal') {
    return (
      <div className="loading-state minimal">
        <div className="loading-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
        {message && <span className="loading-message">{message}</span>}
      </div>
    );
  }

  // Default loading state
  return (
    <div className="loading-state enhanced">
      <div className="loading-spinner" role="status" aria-label="Loading">
        <div className="spinner-ring" />
        <div className="spinner-ring" />
        <div className="spinner-ring" />
      </div>
      <span className="loading-message">{message}</span>
      {subMessage && <span className="loading-submessage">{subMessage}</span>}
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

/**
 * ErrorState - Shows an error with optional retry button
 */
export const ErrorState = React.memo(({
  error,
  onRetry,
  title = 'Something went wrong',
  suggestions = []
}) => (
  <div className="error-state" role="alert">
    <div className="error-icon-wrapper">
      <span className="error-icon" aria-hidden="true">⚠️</span>
    </div>
    <h4 className="error-title">{title}</h4>
    <p className="error-message">{error || 'An unexpected error occurred. Please try again.'}</p>

    {suggestions.length > 0 && (
      <ul className="error-suggestions">
        {suggestions.map((suggestion, i) => (
          <li key={i}>{suggestion}</li>
        ))}
      </ul>
    )}

    {onRetry && (
      <button
        className="error-retry"
        onClick={onRetry}
        type="button"
      >
        <span className="retry-icon">↻</span>
        Try Again
      </button>
    )}
  </div>
));

ErrorState.displayName = 'ErrorState';

/**
 * EmptyState - Shows when no content is available
 * Enhanced with tips for Torah study
 */
export const EmptyState = React.memo(({
  icon = '📭',
  message = 'No content available',
  suggestion,
  action,
  actionLabel = 'Get Started',
  tips = [],
  context = null // 'verse', 'chapter', 'talmud', etc.
}) => (
  <div className="tab-empty enhanced">
    <div className="empty-icon-wrapper">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
    </div>
    <span className="empty-text">{message}</span>
    {suggestion && <span className="empty-suggestion">{suggestion}</span>}

    {/* Contextual tips for getting started */}
    {tips.length > 0 && (
      <div className="empty-tips">
        <span className="tips-label">💡 Tips:</span>
        <ul className="tips-list">
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Context-aware hint */}
    {context === 'verse' && (
      <p className="empty-context-hint">
        Click on a verse number or highlight text to begin
      </p>
    )}
    {context === 'chapter' && (
      <p className="empty-context-hint">
        Navigate to a chapter to see available tools
      </p>
    )}
    {context === 'talmud' && (
      <p className="empty-context-hint">
        This feature is available for Talmud texts
      </p>
    )}

    {action && (
      <button
        className="empty-action"
        onClick={action}
        type="button"
      >
        {actionLabel}
      </button>
    )}
  </div>
));

/**
 * WelcomeState - Friendly introduction for new users
 */
export const WelcomeState = React.memo(({
  tabName,
  description,
  features = [],
  getStartedText
}) => (
  <div className="welcome-state">
    <div className="welcome-header">
      <span className="welcome-icon">👋</span>
      <h4 className="welcome-title">Welcome to {tabName}</h4>
    </div>
    {description && <p className="welcome-description">{description}</p>}

    {features.length > 0 && (
      <div className="welcome-features">
        <span className="features-label">What you can do:</span>
        <ul className="features-list">
          {features.map((feature, i) => (
            <li key={i}>
              <span className="feature-icon">{feature.icon}</span>
              <span className="feature-text">{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {getStartedText && (
      <div className="welcome-cta">
        <span className="cta-arrow">→</span>
        <span className="cta-text">{getStartedText}</span>
      </div>
    )}
  </div>
));

EmptyState.displayName = 'EmptyState';
WelcomeState.displayName = 'WelcomeState';

/**
 * LoadingOverlay - Full overlay loading state
 */
export const LoadingOverlay = React.memo(({
  message = 'Processing...',
  transparent = false
}) => (
  <div className={`loading-overlay ${transparent ? 'transparent' : ''}`}>
    <div className="overlay-content">
      <div className="loading-spinner large">
        <div className="spinner-ring" />
        <div className="spinner-ring" />
        <div className="spinner-ring" />
      </div>
      <span className="overlay-message">{message}</span>
    </div>
  </div>
));

LoadingOverlay.displayName = 'LoadingOverlay';

/**
 * ProgressBar - Shows progress for long operations
 */
export const ProgressBar = React.memo(({
  progress = 0,
  message,
  showPercentage = true
}) => (
  <div className="progress-container">
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
    <div className="progress-info">
      {message && <span className="progress-message">{message}</span>}
      {showPercentage && <span className="progress-percent">{Math.round(progress)}%</span>}
    </div>
  </div>
));

ProgressBar.displayName = 'ProgressBar';
