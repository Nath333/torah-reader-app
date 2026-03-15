import React from 'react';
import './LoadingSkeleton.css';

// Hebrew loading messages for Torah study context
const hebrewMessages = [
  { hebrew: 'טוען...', english: 'Loading...' },
  { hebrew: 'מכין את הטקסט...', english: 'Preparing text...' },
  { hebrew: 'מביא פירושים...', english: 'Fetching commentaries...' },
  { hebrew: 'מחפש...', english: 'Searching...' },
];

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
            <div className="skeleton-hebrew" style={{ width: `${85 + Math.random() * 15}%` }} />
            <div className="skeleton-english" style={{ width: `${65 + Math.random() * 25}%` }} />
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
            <div className="skeleton-search-title" style={{ width: `${30 + Math.random() * 20}%` }} />
            <div className="skeleton-search-text" />
            <div className="skeleton-search-text short" style={{ width: `${45 + Math.random() * 20}%` }} />
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
            <div className="skeleton-nav-text" style={{ width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // Full page loading with Hebrew message
  if (type === 'fullpage') {
    const msg = message || hebrewMessages[Math.floor(Math.random() * hebrewMessages.length)];
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

  // Inline spinner with message
  if (type === 'spinner') {
    const msg = message || hebrewMessages[0];
    return (
      <div className="skeleton-spinner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
        </svg>
        <span>{typeof msg === 'string' ? msg : msg.english}</span>
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

  return null;
};

export default React.memo(LoadingSkeleton);
