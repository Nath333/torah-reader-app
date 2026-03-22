/**
 * EmptyState - Professional empty state component
 *
 * Displays a friendly message when there's no content to show,
 * with optional icon, description, and action buttons.
 */

import React, { memo } from 'react';

// Empty State Icons
const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const VocabularyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    <path d="M8 7h8M8 11h6" />
  </svg>
);

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CommentaryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    <path d="M8 9h8M8 13h6" />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

const AnalysisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
    <polyline points="7.5 19.79 7.5 14.6 3 12" />
    <polyline points="21 12 16.5 14.6 16.5 19.79" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const iconMap = {
  bookmark: BookmarkIcon,
  search: SearchIcon,
  history: HistoryIcon,
  vocabulary: VocabularyIcon,
  note: NoteIcon,
  commentary: CommentaryIcon,
  error: ErrorIcon,
  analysis: AnalysisIcon,
};

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {string} props.icon - Icon type: 'bookmark', 'search', 'history', 'vocabulary', 'note', 'commentary', 'error', 'analysis'
 * @param {string} props.title - Main heading
 * @param {string} props.description - Explanatory text
 * @param {ReactNode} props.children - Custom content or action buttons
 * @param {boolean} props.compact - Use compact variant
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = memo(({
  icon = 'search',
  title,
  description,
  children,
  compact = false,
  className = '',
}) => {
  const Icon = iconMap[icon] || SearchIcon;

  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''} ${className}`}>
      <div className="empty-state-icon">
        <Icon />
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-description">{description}</p>}
      {children && <div className="empty-state-action">{children}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// Pre-configured empty states for common scenarios
export const BookmarksEmpty = memo(({ onAction }) => (
  <EmptyState
    icon="bookmark"
    title="No bookmarks yet"
    description="Save verses you want to revisit later by clicking the bookmark icon on any verse."
  >
    {onAction && (
      <button className="btn btn-primary" onClick={onAction}>
        Start Reading
      </button>
    )}
  </EmptyState>
));

export const HistoryEmpty = memo(({ onAction }) => (
  <EmptyState
    icon="history"
    title="No reading history"
    description="Your reading history will appear here as you explore different texts."
  >
    {onAction && (
      <button className="btn btn-primary" onClick={onAction}>
        Start Reading
      </button>
    )}
  </EmptyState>
));

export const VocabularyEmpty = memo(({ onAction }) => (
  <EmptyState
    icon="vocabulary"
    title="No saved words"
    description="Click on Hebrew words while reading to save them to your vocabulary bank for review."
  >
    {onAction && (
      <button className="btn btn-primary" onClick={onAction}>
        Start Learning
      </button>
    )}
  </EmptyState>
));

export const SearchEmpty = memo(({ query }) => (
  <EmptyState
    icon="search"
    title="No results found"
    description={query ? `No results for "${query}". Try a different search term.` : 'Enter a search term to find verses.'}
  />
));

export const NotesEmpty = memo(({ onAction }) => (
  <EmptyState
    icon="note"
    title="No notes yet"
    description="Add personal notes to any verse to capture your thoughts and insights."
  >
    {onAction && (
      <button className="btn btn-secondary" onClick={onAction}>
        Add Note
      </button>
    )}
  </EmptyState>
));

export const CommentaryEmpty = memo(({ commentator }) => (
  <EmptyState
    icon="commentary"
    title="No commentary available"
    description={commentator ? `${commentator} does not have commentary on this passage.` : 'No commentary is available for this selection.'}
    compact
  />
));

export const AnalysisEmpty = memo(({ onAction }) => (
  <EmptyState
    icon="analysis"
    title="Select text to analyze"
    description="Choose a verse or passage, then select an analysis mode to explore deeper insights."
  >
    {onAction && (
      <button className="btn btn-primary" onClick={onAction}>
        Select Text
      </button>
    )}
  </EmptyState>
));

export const ErrorEmpty = memo(({ message, onRetry }) => (
  <EmptyState
    icon="error"
    title="Something went wrong"
    description={message || 'An unexpected error occurred. Please try again.'}
  >
    {onRetry && (
      <button className="btn btn-primary" onClick={onRetry}>
        Try Again
      </button>
    )}
  </EmptyState>
));

export default EmptyState;
