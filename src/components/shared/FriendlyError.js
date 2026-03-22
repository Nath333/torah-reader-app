import React from 'react';
import './FriendlyError.css';

/**
 * FriendlyError - User-friendly error messages with helpful actions
 * Replaces generic error messages with contextual, actionable feedback
 */
const FriendlyError = ({
  type = 'generic',
  title,
  message,
  onRetry,
  onGoBack,
  onGoHome,
  details,
}) => {
  // Error type configurations
  const errorConfigs = {
    network: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55" />
          <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0122.58 9" />
          <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
          <path d="M8.53 16.11a6 6 0 016.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      ),
      defaultTitle: 'Connection Lost',
      defaultMessage: "We couldn't reach the server. Please check your internet connection and try again.",
      color: '#f59e0b',
      hebrewHint: 'בדוק את החיבור לאינטרנט',
    },
    notFound: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6M11 16h.01" />
        </svg>
      ),
      defaultTitle: 'Text Not Found',
      defaultMessage: "We couldn't find this text in our library. It may have been moved or the reference might be incorrect.",
      color: '#8b5cf6',
      hebrewHint: 'הטקסט לא נמצא',
    },
    server: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
          <path d="M12 10v4" />
        </svg>
      ),
      defaultTitle: 'Server Issue',
      defaultMessage: "Sefaria's servers are temporarily unavailable. This usually resolves quickly - please try again in a moment.",
      color: '#ef4444',
      hebrewHint: 'שרת זמנית לא זמין',
    },
    timeout: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
      ),
      defaultTitle: 'Request Timed Out',
      defaultMessage: 'The request took too long to complete. This might be due to a slow connection or heavy server load.',
      color: '#f97316',
      hebrewHint: 'הבקשה ארכה יותר מדי זמן',
    },
    empty: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      defaultTitle: 'No Content Available',
      defaultMessage: 'This section appears to be empty. Try selecting a different chapter or text.',
      color: '#64748b',
      hebrewHint: 'אין תוכן זמין',
    },
    commentary: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      ),
      defaultTitle: 'Commentary Unavailable',
      defaultMessage: "We couldn't load the commentaries for this verse. They may not be available for this text.",
      color: '#06b6d4',
      hebrewHint: 'פירושים לא זמינים',
    },
    search: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      defaultTitle: 'No Results Found',
      defaultMessage: 'Your search did not return any results. Try using different keywords or check the spelling.',
      color: '#3b82f6',
      hebrewHint: 'לא נמצאו תוצאות',
    },
    generic: {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      ),
      defaultTitle: 'Something Went Wrong',
      defaultMessage: "We encountered an unexpected error. Please try again, and if the problem persists, try refreshing the page.",
      color: '#ef4444',
      hebrewHint: 'משהו השתבש',
    },
  };

  const config = errorConfigs[type] || errorConfigs.generic;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  return (
    <div className="friendly-error" style={{ '--error-color': config.color }}>
      <div className="error-icon-container">
        <div className="error-icon">{config.icon}</div>
        <div className="error-icon-bg" />
      </div>

      <div className="error-content">
        <h3 className="error-title">{displayTitle}</h3>
        <p className="error-message">{displayMessage}</p>

        {config.hebrewHint && (
          <p className="error-hebrew-hint" dir="rtl">{config.hebrewHint}</p>
        )}
      </div>

      <div className="error-actions">
        {onRetry && (
          <button className="error-btn primary" onClick={onRetry}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            Try Again
          </button>
        )}
        {onGoBack && (
          <button className="error-btn secondary" onClick={onGoBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Go Back
          </button>
        )}
        {onGoHome && (
          <button className="error-btn secondary" onClick={onGoHome}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>
        )}
      </div>

      {details && (
        <details className="error-details">
          <summary>Technical Details</summary>
          <pre>{typeof details === 'string' ? details : JSON.stringify(details, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default React.memo(FriendlyError);
