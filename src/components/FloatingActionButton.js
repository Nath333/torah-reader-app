import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './FloatingActionButton.css';

/**
 * FloatingActionButton - Mobile-friendly quick access to common actions
 * Appears as a floating button that expands into a radial menu
 */
const FloatingActionButton = ({
  onFocusMode,
  onSplitView,
  onTraditional,
  onBookmark,
  onSearch,
  isVisible,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isExpanded) setIsExpanded(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  const handleAction = (action) => {
    action();
    setIsExpanded(false);
  };

  const actions = [
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      onClick: onSearch,
      color: 'blue',
    },
    {
      id: 'focus',
      label: 'Focus Mode',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      ),
      onClick: onFocusMode,
      color: 'purple',
    },
    {
      id: 'split',
      label: 'Split View',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      ),
      onClick: onSplitView,
      color: 'teal',
    },
    {
      id: 'traditional',
      label: 'Traditional',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="9" x2="9" y2="21" />
          <line x1="15" y1="9" x2="15" y2="21" />
        </svg>
      ),
      onClick: onTraditional,
      color: 'amber',
    },
    {
      id: 'bookmark',
      label: 'Bookmark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      ),
      onClick: onBookmark,
      color: 'rose',
    },
  ];

  if (!isVisible) return null;

  return (
    <div ref={fabRef} className={`fab-container ${isExpanded ? 'expanded' : ''}`}>
      {/* Backdrop for mobile */}
      {isExpanded && <div className="fab-backdrop" onClick={() => setIsExpanded(false)} />}

      {/* Action buttons */}
      <div className="fab-actions">
        {actions.map((action, index) => (
          <button
            key={action.id}
            className={`fab-action fab-action-${action.color}`}
            onClick={() => handleAction(action.onClick)}
            style={{ '--index': index }}
            title={action.label}
            aria-label={action.label}
          >
            {action.icon}
            <span className="fab-action-label">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main FAB button */}
      <button
        className={`fab-main ${isExpanded ? 'active' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
      >
        <svg className="fab-icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <svg className="fab-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

FloatingActionButton.propTypes = {
  onFocusMode: PropTypes.func.isRequired,
  onSplitView: PropTypes.func.isRequired,
  onTraditional: PropTypes.func.isRequired,
  onBookmark: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  isVisible: PropTypes.bool,
};

FloatingActionButton.defaultProps = {
  isVisible: true,
};

export default React.memo(FloatingActionButton);
