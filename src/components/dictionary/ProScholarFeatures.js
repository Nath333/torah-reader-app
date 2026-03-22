// =============================================================================
// ProScholarFeatures.js - PRO SCHOLAR v3 Advanced Components
// Quick Review, Learning Insights, and enhanced analysis features
// =============================================================================

import React, { useState, useCallback } from 'react';

// Safe SRS import
let getMasteryLevel;
try {
  getMasteryLevel = require('../../services/srsService').getMasteryLevel;
} catch (e) {
  getMasteryLevel = (card) => {
    if (!card) return { level: 'new', icon: '✨' };
    const { interval = 0, repetitions = 0 } = card;
    if (interval >= 21 && repetitions >= 5) return { level: 'mastered', icon: '⭐' };
    if (repetitions >= 3) return { level: 'learning', icon: '📚' };
    if (repetitions >= 1) return { level: 'started', icon: '🌱' };
    return { level: 'new', icon: '✨' };
  };
}

// =============================================================================
// Quick SRS Review Buttons
// =============================================================================

/**
 * Quick SRS Review Buttons - Rate and process in one click
 * Allows rapid spaced repetition review with visual feedback
 *
 * @param {Object} props
 * @param {Function} props.onReview - Callback receiving quality rating (0-5)
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.showLabels=true] - Show button labels
 */
export function QuickReviewButtons({ onReview, compact = false, showLabels = true }) {
  const [reviewing, setReviewing] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleReview = useCallback((quality) => {
    if (reviewing !== null) return;

    setReviewing(quality);
    const result = onReview?.(quality);

    if (result) {
      const mastery = getMasteryLevel(result);
      setFeedback({
        quality,
        mastery: mastery.level,
        icon: mastery.icon,
        nextDays: result.interval
      });

      setTimeout(() => {
        setFeedback(null);
        setReviewing(null);
      }, 1500);
    } else {
      setTimeout(() => setReviewing(null), 300);
    }
  }, [onReview, reviewing]);

  const buttons = [
    { quality: 1, label: 'Again', icon: '🔴', desc: 'Forgot completely', color: '#ef4444' },
    { quality: 3, label: 'Hard', icon: '🟠', desc: 'Recalled with difficulty', color: '#f59e0b' },
    { quality: 4, label: 'Good', icon: '🟢', desc: 'Recalled correctly', color: '#22c55e' },
    { quality: 5, label: 'Easy', icon: '⭐', desc: 'Instant recall', color: '#10b981' },
  ];

  return (
    <div className={`wic-quick-review ${compact ? 'compact' : ''}`}>
      <div className="quick-review-header">
        <span className="quick-review-icon">🧠</span>
        <span className="quick-review-title">Quick Review</span>
      </div>

      {feedback ? (
        <div className={`quick-review-feedback quality-${feedback.quality}`}>
          <span className="feedback-icon">{feedback.icon}</span>
          <span className="feedback-message">
            {feedback.mastery} • Next in {feedback.nextDays} day{feedback.nextDays !== 1 ? 's' : ''}
          </span>
        </div>
      ) : (
        <div className="quick-review-buttons">
          {buttons.map(({ quality, label, icon, desc, color }) => (
            <button
              key={quality}
              className={`review-btn quality-${quality} ${reviewing === quality ? 'active' : ''}`}
              onClick={() => handleReview(quality)}
              disabled={reviewing !== null}
              title={desc}
              style={{ '--btn-color': color }}
            >
              <span className="review-btn-icon">{icon}</span>
              {showLabels && !compact && <span className="review-btn-label">{label}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Learning Insights Panel
// =============================================================================

/**
 * Learning Insights Panel - Shows difficulty, study time, and learning stats
 * Provides transparency into the learning algorithm's analysis
 *
 * @param {Object} props
 * @param {Object} props.difficulty - Difficulty analysis { level, score, factors }
 * @param {Object} props.studyTime - Study time estimate { seconds, label }
 * @param {Object} props.srsCard - SRS card data
 * @param {Object} props.cacheStats - Cache hit/miss stats
 * @param {boolean} [props.defaultExpanded=false] - Start expanded
 */
export function LearningInsightsPanel({
  difficulty,
  studyTime,
  srsCard,
  cacheStats,
  defaultExpanded = false
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!difficulty && !studyTime && !srsCard) return null;

  const DIFFICULTY_CONFIG = {
    easy: { color: '#10b981', icon: '🌱', label: 'Easy' },
    beginner: { color: '#22c55e', icon: '📗', label: 'Beginner' },
    intermediate: { color: '#f59e0b', icon: '📙', label: 'Intermediate' },
    expert: { color: '#ef4444', icon: '📕', label: 'Expert' },
    unknown: { color: '#6b7280', icon: '❓', label: 'Unknown' }
  };

  const config = DIFFICULTY_CONFIG[difficulty?.level] || DIFFICULTY_CONFIG.unknown;

  return (
    <div className="wic-learning-insights">
      <button
        className="insights-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="insights-icon">📊</span>
        <span className="insights-title">Learning Insights</span>
        <span className={`insights-toggle ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      <div className="insights-summary">
        {/* Difficulty indicator */}
        {difficulty && (
          <div
            className="insight-badge difficulty"
            style={{ '--insight-color': config.color }}
            title={`Difficulty: ${difficulty.score}%`}
          >
            <span className="badge-icon">{config.icon}</span>
            <span className="badge-label">{config.label}</span>
            <span className="badge-score">{difficulty.score}%</span>
          </div>
        )}

        {/* Study time estimate */}
        {studyTime && (
          <div className="insight-badge study-time" title={`Estimated: ${studyTime.seconds} seconds`}>
            <span className="badge-icon">⏱️</span>
            <span className="badge-label">{studyTime.label}</span>
          </div>
        )}

        {/* Cache status */}
        {cacheStats && (cacheStats.hits + cacheStats.misses) > 0 && (
          <div className="insight-badge cache" title="Cache hit rate">
            <span className="badge-icon">💾</span>
            <span className="badge-label">
              {Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)}%
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="insights-details">
          {/* Difficulty factors */}
          {difficulty?.factors?.length > 0 && (
            <div className="insight-section">
              <span className="section-label">Difficulty Factors:</span>
              <div className="factor-pills">
                {difficulty.factors.map((factor, i) => (
                  <span key={i} className="factor-pill">{factor}</span>
                ))}
              </div>
            </div>
          )}

          {/* SRS stats */}
          {srsCard && (
            <div className="insight-section">
              <span className="section-label">SRS Progress:</span>
              <div className="srs-progress">
                <div className="progress-stat">
                  <span className="stat-value">{srsCard.repetitions || 0}</span>
                  <span className="stat-label">Reviews</span>
                </div>
                <div className="progress-stat">
                  <span className="stat-value">{srsCard.interval || 0}d</span>
                  <span className="stat-label">Interval</span>
                </div>
                <div className="progress-stat">
                  <span className="stat-value">{Math.round((srsCard.easeFactor || 2.5) * 100)}%</span>
                  <span className="stat-label">Ease</span>
                </div>
              </div>
            </div>
          )}

          {/* Study time breakdown */}
          {studyTime && (
            <div className="insight-section">
              <span className="section-label">Study Time:</span>
              <div className="time-breakdown">
                <span className="time-value">{studyTime.seconds}s</span>
                <span className="time-hint">
                  {difficulty?.level === 'expert' ? 'Complex word - take your time' :
                   difficulty?.level === 'easy' ? 'Quick review word' :
                   'Standard study time'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// History Panel - Shows recent lookup history
// =============================================================================

/**
 * History Panel - Shows recent word lookup history
 *
 * @param {Object} props
 * @param {Array} props.history - Array of history items
 * @param {Function} props.onSelect - Callback when selecting a history item
 * @param {Function} props.onClear - Callback to clear history
 * @param {number} [props.maxDisplay=5] - Max items to display
 */
export function HistoryPanel({ history, onSelect, onClear, maxDisplay = 5 }) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) return null;

  const displayItems = expanded ? history : history.slice(0, maxDisplay);
  const hasMore = history.length > maxDisplay;

  return (
    <div className="wic-history-panel">
      <div className="history-header">
        <span className="history-icon">🕐</span>
        <span className="history-title">Recent Words</span>
        {onClear && (
          <button className="history-clear-btn" onClick={onClear} title="Clear history">
            Clear
          </button>
        )}
      </div>

      <div className="history-list">
        {displayItems.map((item, i) => (
          <button
            key={i}
            className="history-item"
            onClick={() => onSelect?.(item.word)}
          >
            <span className="history-word" dir="rtl">{item.word}</span>
            <span className="history-def">{item.english?.slice(0, 30)}...</span>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          className="history-expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show ${history.length - maxDisplay} more`}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Cross-References Mini - Compact inline references
// =============================================================================

/**
 * Cross-References Mini - Shows inline cross-references
 *
 * @param {Object} props
 * @param {Object} props.crossRefs - Cross-reference data
 * @param {Function} props.onSelect - Callback when selecting a reference
 */
export function CrossRefsMini({ crossRefs, onSelect }) {
  if (!crossRefs) return null;

  const { sameRoot = [], semanticField = [], relatedConcepts = [] } = crossRefs;
  const total = sameRoot.length + semanticField.length + relatedConcepts.length;

  if (total === 0) return null;

  return (
    <div className="wic-crossrefs-mini">
      <span className="crossrefs-label">Related:</span>
      <div className="crossrefs-tags">
        {sameRoot.slice(0, 2).map((word, i) => (
          <button
            key={`root-${i}`}
            className="crossref-tag root"
            onClick={() => onSelect?.(word)}
            title="Same root"
          >
            <span dir="rtl">{word}</span>
          </button>
        ))}
        {semanticField.slice(0, 2).map((word, i) => (
          <button
            key={`sem-${i}`}
            className="crossref-tag semantic"
            onClick={() => onSelect?.(word)}
            title="Same semantic field"
          >
            <span dir="rtl">{word}</span>
          </button>
        ))}
        {total > 4 && (
          <span className="crossref-more">+{total - 4}</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

const ProScholarFeatures = {
  QuickReviewButtons,
  LearningInsightsPanel,
  HistoryPanel,
  CrossRefsMini
};

export default ProScholarFeatures;
