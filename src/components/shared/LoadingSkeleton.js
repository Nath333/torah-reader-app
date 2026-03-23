import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './LoadingSkeleton.css';

// Hebrew loading messages for Torah study context
const hebrewMessages = [
  { hebrew: 'טוען...', english: 'Loading...' },
  { hebrew: 'מכין את הטקסט...', english: 'Preparing text...' },
  { hebrew: 'מביא פירושים...', english: 'Fetching commentaries...' },
  { hebrew: 'מחפש...', english: 'Searching...' },
];

// PRO SCHOLAR V5: Deterministic pseudo-random widths to avoid SSR hydration mismatch
// Uses a simple hash based on index to create varied but consistent widths
const DETERMINISTIC_WIDTHS = {
  verse: [
    { hebrew: 92, english: 78 },
    { hebrew: 88, english: 72 },
    { hebrew: 95, english: 85 },
    { hebrew: 90, english: 68 },
    { hebrew: 87, english: 82 },
    { hebrew: 93, english: 75 },
    { hebrew: 89, english: 80 },
    { hebrew: 91, english: 70 },
  ],
  search: [
    { title: 38, text: 55 },
    { title: 42, text: 62 },
    { title: 35, text: 48 },
    { title: 45, text: 58 },
    { title: 40, text: 52 },
  ],
  sidebar: [72, 85, 68, 78, 90, 65, 82],
  analysis: [85, 78, 92, 72],
  analytics: [45, 62, 38, 85, 52, 70, 48],
};

const getWidth = (type, index, field = null) => {
  const widths = DETERMINISTIC_WIDTHS[type];
  if (!widths) return 75;
  const idx = index % widths.length;
  if (field && typeof widths[idx] === 'object') {
    return widths[idx][field] || 75;
  }
  return typeof widths[idx] === 'number' ? widths[idx] : 75;
};

const LoadingSkeleton = ({ count = 5, type = 'verse', message = null }) => {
  // Verse skeleton - for Torah/Talmud text
  if (type === 'verse') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-verse" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="skeleton-header">
              <div className="skeleton-number" />
              <div className="skeleton-actions">
                <div className="skeleton-button" />
                <div className="skeleton-button" />
                <div className="skeleton-button" />
              </div>
            </div>
            <div className="skeleton-hebrew" style={{ width: `${getWidth('verse', index, 'hebrew')}%` }} />
            <div className="skeleton-english" style={{ width: `${getWidth('verse', index, 'english')}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // Search results skeleton
  if (type === 'search') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-search-result" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="skeleton-search-title" style={{ width: `${getWidth('search', index, 'title')}%` }} />
            <div className="skeleton-search-text" />
            <div className="skeleton-search-text short" style={{ width: `${getWidth('search', index, 'text')}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // Commentary skeleton
  if (type === 'commentary') {
    return (
      <div className="skeleton-container skeleton-commentary">
        <div className="skeleton-commentary-header">
          <div className="skeleton-badge" />
          <div className="skeleton-title-short" />
        </div>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-comment" style={{ animationDelay: `${index * 75}ms` }}>
            <div className="skeleton-dibbur" />
            <div className="skeleton-line w-full" />
            <div className="skeleton-line w-3-4" />
            <div className="skeleton-line w-1-2" />
          </div>
        ))}
      </div>
    );
  }

  // Sidebar/navigation skeleton
  if (type === 'sidebar') {
    return (
      <div className="skeleton-container skeleton-sidebar">
        <div className="skeleton-sidebar-header" />
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-nav-item" style={{ animationDelay: `${index * 40}ms` }}>
            <div className="skeleton-nav-icon" />
            <div className="skeleton-nav-text" style={{ width: `${getWidth('sidebar', index)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // Full page loading with Hebrew message
  if (type === 'fullpage') {
    // Use first message for SSR consistency; message prop overrides
    const msg = message || hebrewMessages[0];
    return (
      <div className="skeleton-fullpage">
        <div className="skeleton-fullpage-content">
          <div className="skeleton-loader-ring">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
          </div>
          <div className="skeleton-message">
            <span className="skeleton-message-hebrew" dir="rtl">{msg.hebrew}</span>
            <span className="skeleton-message-english">{msg.english}</span>
          </div>
        </div>
      </div>
    );
  }

  // Inline spinner with message - uses shared LoadingSpinner component
  if (type === 'spinner') {
    const msg = message || hebrewMessages[0];
    return (
      <div className="skeleton-spinner">
        <LoadingSpinner
          size="sm"
          text={typeof msg === 'string' ? msg : msg.english}
          inline
        />
      </div>
    );
  }

  // Card skeleton (generic)
  if (type === 'card') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="skeleton-line w-1-4" />
            <div className="skeleton-line w-full" />
            <div className="skeleton-line w-3-4" />
          </div>
        ))}
      </div>
    );
  }

  // Lexicon skeleton - for word definitions
  if (type === 'lexicon') {
    return (
      <div className="skeleton-container skeleton-lexicon">
        <div className="skeleton-lexicon-header">
          <div className="skeleton-word-hebrew" />
          <div className="skeleton-word-transliteration" />
        </div>
        <div className="skeleton-lexicon-body">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton-definition" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="skeleton-badge" />
              <div className="skeleton-line w-full" />
              <div className="skeleton-line w-3-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Analysis skeleton - for AI analysis
  if (type === 'analysis') {
    return (
      <div className="skeleton-container skeleton-analysis">
        <div className="skeleton-analysis-header">
          <div className="skeleton-icon-circle" />
          <div className="skeleton-line w-1-2" />
        </div>
        <div className="skeleton-analysis-content">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-line" style={{
              width: `${getWidth('analysis', index)}%`,
              animationDelay: `${index * 80}ms`
            }} />
          ))}
        </div>
        <div className="skeleton-analysis-tags">
          <div className="skeleton-tag" />
          <div className="skeleton-tag" />
          <div className="skeleton-tag" />
        </div>
      </div>
    );
  }

  // Panel skeleton - for sidebar panels
  if (type === 'panel') {
    return (
      <div className="skeleton-container skeleton-panel">
        <div className="skeleton-panel-header">
          <div className="skeleton-line w-1-2" />
        </div>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-panel-item" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="skeleton-icon-sm" />
            <div className="skeleton-line" style={{ width: `${getWidth('sidebar', index)}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // PRO SCHOLAR V5: Word definition card skeleton
  if (type === 'word-card') {
    return (
      <div className="skeleton-container skeleton-word-card" role="status" aria-label="Loading word definition">
        {/* Header with Hebrew word */}
        <div className="skeleton-word-card-header">
          <div className="skeleton-hebrew-word" />
          <div className="skeleton-word-badges">
            <div className="skeleton-badge" />
            <div className="skeleton-badge" />
          </div>
        </div>

        {/* Source definitions */}
        <div className="skeleton-word-card-body">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton-source-block" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="skeleton-source-header">
                <div className="skeleton-source-badge" />
                <div className="skeleton-source-name" />
              </div>
              <div className="skeleton-definition-text">
                <div className="skeleton-line w-full" />
                <div className="skeleton-line w-3-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer with actions */}
        <div className="skeleton-word-card-footer">
          <div className="skeleton-action-btn" />
          <div className="skeleton-action-btn" />
        </div>
        <span className="sr-only">Loading word definition...</span>
      </div>
    );
  }

  // PRO SCHOLAR V5: Analytics/stats skeleton
  if (type === 'analytics') {
    return (
      <div className="skeleton-container skeleton-analytics" role="status" aria-label="Loading analytics">
        <div className="skeleton-stats-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-stat-box" style={{ animationDelay: `${index * 75}ms` }}>
              <div className="skeleton-stat-value" />
              <div className="skeleton-stat-label" />
            </div>
          ))}
        </div>
        <div className="skeleton-chart">
          <div className="skeleton-chart-bars">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="skeleton-chart-bar"
                style={{
                  height: `${getWidth('analytics', index)}%`,
                  animationDelay: `${index * 50}ms`
                }}
              />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading analytics...</span>
      </div>
    );
  }

  return null;
};

export default React.memo(LoadingSkeleton);
