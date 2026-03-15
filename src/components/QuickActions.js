import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './QuickActions.css';

/**
 * QuickActions - A collapsible dropdown menu for secondary toolbar actions
 * Improves UI by consolidating less-used features into a clean dropdown
 */
const QuickActions = ({
  onOpenDiscover,
  onOpenVersions,
  onOpenAudio,
  onOpenVocabulary,
  onOpenStudy,
  onOpenBookmarks,
  onOpenHistory,
  onOpenHelp,
  vocabularyCount,
  isDiscoverActive,
  isVersionsActive,
  isVocabularyActive,
  isStudyActive,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleAction = (action) => {
    action();
    setIsOpen(false);
  };

  const actions = [
    {
      id: 'discover',
      label: 'Discover',
      description: 'Explore random texts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      onClick: onOpenDiscover,
      isActive: isDiscoverActive,
      shortcut: null,
    },
    {
      id: 'versions',
      label: 'Text Versions',
      description: 'Compare translations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      onClick: onOpenVersions,
      isActive: isVersionsActive,
      shortcut: null,
    },
    {
      id: 'audio',
      label: 'Audio Player',
      description: 'Listen to readings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      ),
      onClick: onOpenAudio,
      isActive: false,
      shortcut: null,
    },
    { type: 'divider' },
    {
      id: 'vocabulary',
      label: 'Vocabulary Bank',
      description: 'Saved words for learning',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      onClick: onOpenVocabulary,
      isActive: isVocabularyActive,
      badge: vocabularyCount > 0 ? vocabularyCount : null,
      shortcut: null,
    },
    {
      id: 'study',
      label: 'Study Dashboard',
      description: 'Track progress & goals',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onOpenStudy,
      isActive: isStudyActive,
      shortcut: null,
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      description: 'Your saved verses',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      ),
      onClick: onOpenBookmarks,
      isActive: false,
      shortcut: 'Ctrl+B',
    },
    {
      id: 'history',
      label: 'Reading History',
      description: 'Recently viewed',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
      ),
      onClick: onOpenHistory,
      isActive: false,
      shortcut: 'Ctrl+H',
    },
    { type: 'divider' },
    {
      id: 'help',
      label: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      onClick: onOpenHelp,
      isActive: false,
      shortcut: '?',
    },
  ];

  return (
    <div className="quick-actions">
      <button
        ref={buttonRef}
        className={`quick-actions-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Quick Actions"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="trigger-label">More</span>
        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div ref={menuRef} className="quick-actions-menu" role="menu">
          <div className="menu-header">
            <span>Quick Actions</span>
          </div>
          <div className="menu-items">
            {actions.map((action, index) => {
              if (action.type === 'divider') {
                return <div key={`divider-${index}`} className="menu-divider" />;
              }

              return (
                <button
                  key={action.id}
                  className={`menu-item ${action.isActive ? 'active' : ''}`}
                  onClick={() => handleAction(action.onClick)}
                  role="menuitem"
                >
                  <span className="menu-item-icon">{action.icon}</span>
                  <div className="menu-item-content">
                    <span className="menu-item-label">{action.label}</span>
                    <span className="menu-item-description">{action.description}</span>
                  </div>
                  {action.badge && (
                    <span className="menu-item-badge">{action.badge}</span>
                  )}
                  {action.shortcut && (
                    <kbd className="menu-item-shortcut">{action.shortcut}</kbd>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

QuickActions.propTypes = {
  onOpenDiscover: PropTypes.func.isRequired,
  onOpenVersions: PropTypes.func.isRequired,
  onOpenAudio: PropTypes.func.isRequired,
  onOpenVocabulary: PropTypes.func.isRequired,
  onOpenStudy: PropTypes.func.isRequired,
  onOpenBookmarks: PropTypes.func.isRequired,
  onOpenHistory: PropTypes.func.isRequired,
  onOpenHelp: PropTypes.func.isRequired,
  vocabularyCount: PropTypes.number,
  isDiscoverActive: PropTypes.bool,
  isVersionsActive: PropTypes.bool,
  isVocabularyActive: PropTypes.bool,
  isStudyActive: PropTypes.bool,
};

QuickActions.defaultProps = {
  vocabularyCount: 0,
  isDiscoverActive: false,
  isVersionsActive: false,
  isVocabularyActive: false,
  isStudyActive: false,
};

export default React.memo(QuickActions);
