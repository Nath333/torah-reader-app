/**
 * Shared Components for CommentarySummary
 * Reusable UI elements: InfoCard, TopicTag, SefariaLink, etc.
 */

import React, { memo } from 'react';

// ============================================================================
// Visual Concept Cards - Alternative to Diagrams
// ============================================================================
export const ConceptFlow = memo(function ConceptFlow({ concepts }) {
  if (!concepts || concepts.length === 0) return null;

  return (
    <div className="concept-flow">
      {concepts.map((concept, i) => (
        <React.Fragment key={i}>
          <div className="concept-node">
            <span className="concept-text">{concept}</span>
          </div>
          {i < concepts.length - 1 && <div className="concept-arrow">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
});

// ============================================================================
// Clickable Element Wrapper - Handles keyboard accessibility
// ============================================================================
export const ClickableElement = memo(function ClickableElement({
  children,
  onClick,
  className = '',
  title = '',
  as: Component = 'span'
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <Component
      className={`clickable-element ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={title}
    >
      {children}
    </Component>
  );
});

// ============================================================================
// Sefaria Link - Deep linking to Sefaria.org
// ============================================================================
export const SefariaLink = memo(function SefariaLink({ reference, children, className = '' }) {
  if (!reference) return <span className={className}>{children}</span>;

  // Clean and encode the reference for Sefaria URL
  const cleanRef = reference
    .replace(/\s+/g, '_')
    .replace(/:/g, '.')
    .replace(/[()]/g, '');

  return (
    <a
      href={`https://www.sefaria.org/${encodeURIComponent(cleanRef)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`sefaria-link ${className}`}
      title={`Open "${reference}" on Sefaria`}
    >
      {children}
    </a>
  );
});

// ============================================================================
// Topic Tag with Icon - Now Clickable
// ============================================================================
const TOPIC_ICONS = {
  'Teshuvah': '🔄', 'Mitzvot': '📜', 'Mussar': '💡', 'Halacha': '⚖️',
  'Aggadah': '📖', 'Kabbalah': '✨', 'Torah': '📕', 'Prayer': '🙏',
  'Shabbat': '🕯️', 'Ethics': '🤝', 'Creation': '🌍', 'Prophecy': '👁️',
  'History': '📚', 'Language': '🔤', 'Emunah': '❤️', 'Middot': '🌟',
  'Chesed': '💝', 'Justice': '⚖️', 'Faith': '🌟', 'Wisdom': '🧠'
};

const getTopicIcon = (topic) => {
  const normalized = topic.toLowerCase();
  for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
    if (normalized.includes(key.toLowerCase())) return icon;
  }
  return '🏷️';
};

export const TopicTag = memo(function TopicTag({ topic, onClick }) {
  const handleClick = () => onClick?.(topic);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(topic);
    }
  };

  return (
    <span
      className={`topic-tag ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Search for "${topic}" topics` : undefined}
    >
      <span className="topic-icon">{getTopicIcon(topic)}</span>
      {topic}
    </span>
  );
});

// ============================================================================
// Info Card Component
// ============================================================================
export const InfoCard = memo(function InfoCard({
  icon,
  title,
  children,
  className = '',
  highlight = false
}) {
  return (
    <div className={`info-card ${className} ${highlight ? 'highlight' : ''}`}>
      <div className="info-card-header">
        <span className="info-card-icon">{icon}</span>
        <h4 className="info-card-title">{title}</h4>
      </div>
      <div className="info-card-content">
        {children}
      </div>
    </div>
  );
});

// ============================================================================
// Clickable Hebrew Keywords
// ============================================================================
export const KeywordChips = memo(function KeywordChips({ keywords, onWordLookup }) {
  if (!keywords || keywords.length === 0 || !onWordLookup) return null;

  return (
    <div className="keyword-chips">
      {keywords.map((word, i) => (
        <button
          key={i}
          className="keyword-chip clickable"
          onClick={() => onWordLookup(word)}
          title={`Look up "${word}"`}
          dir="rtl"
        >
          {word}
        </button>
      ))}
    </div>
  );
});
