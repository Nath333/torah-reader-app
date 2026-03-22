/**
 * MasteryTracker - Visual mastery level tracking component
 *
 * Displays and allows users to update their understanding level
 * of verses, passages, and concepts. Uses a 0-5 scale with
 * intuitive visual feedback.
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import useMastery, { MASTERY_LEVELS } from '../../hooks/useMastery';
import './MasteryTracker.css';

// =============================================================================
// Mastery Level Button
// =============================================================================

const MasteryLevelButton = React.memo(function MasteryLevelButton({
  level,
  isActive,
  onClick,
  compact
}) {
  const config = MASTERY_LEVELS[level];

  return (
    <button
      className={`mastery-level-btn ${isActive ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => onClick(level)}
      title={`${config.name}: ${config.description}`}
      style={{
        '--level-color': config.color
      }}
    >
      <span className="level-icon">{config.icon}</span>
      {!compact && <span className="level-name">{config.name}</span>}
    </button>
  );
});

// =============================================================================
// Mastery Progress Bar
// =============================================================================

const MasteryProgressBar = React.memo(function MasteryProgressBar({
  level,
  showLabels = true,
  size = 'medium'
}) {
  const percentage = (level / 5) * 100;
  const config = MASTERY_LEVELS[level];

  return (
    <div className={`mastery-progress ${size}`}>
      {showLabels && (
        <div className="progress-header">
          <span className="progress-label">Mastery Level</span>
          <span className="progress-value" style={{ color: config.color }}>
            {config.icon} {config.name}
          </span>
        </div>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${MASTERY_LEVELS[0].color}, ${config.color})`
          }}
        />
        {/* Level markers */}
        <div className="progress-markers">
          {[1, 2, 3, 4, 5].map(l => (
            <div
              key={l}
              className={`progress-marker ${l <= level ? 'reached' : ''}`}
              style={{ left: `${(l / 5) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Verse Mastery Card
// =============================================================================

const VerseMasteryCard = React.memo(function VerseMasteryCard({
  book,
  chapter,
  verse,
  text,
  onLevelChange
}) {
  const { getVerseMastery, setVerseMastery } = useMastery();
  const level = getVerseMastery(book, chapter, verse);
  const config = MASTERY_LEVELS[level];

  const handleLevelChange = useCallback((newLevel) => {
    setVerseMastery(book, chapter, verse, newLevel);
    onLevelChange?.(newLevel);
  }, [book, chapter, verse, setVerseMastery, onLevelChange]);

  return (
    <div className="verse-mastery-card" style={{ '--card-accent': config.color }}>
      <div className="card-header">
        <span className="verse-ref">{book} {chapter}:{verse}</span>
        <span className="mastery-badge" style={{ background: config.color }}>
          {config.icon} {config.name}
        </span>
      </div>

      {text && (
        <div className="verse-text" dir="rtl">{text}</div>
      )}

      <div className="mastery-controls">
        <MasteryProgressBar level={level} showLabels={false} size="small" />
        <div className="level-buttons">
          {[0, 1, 2, 3, 4, 5].map(l => (
            <MasteryLevelButton
              key={l}
              level={l}
              isActive={level === l}
              onClick={handleLevelChange}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Quick Mastery Selector (Inline)
// =============================================================================

export const QuickMasterySelector = React.memo(function QuickMasterySelector({
  book,
  chapter,
  verse,
  compact = true,
  showProgress = false
}) {
  const { getVerseMastery, incrementMastery, decrementMastery } = useMastery();
  const level = getVerseMastery(book, chapter, verse);
  const config = MASTERY_LEVELS[level];
  const [celebration, setCelebration] = useState(null);

  const handleIncrement = useCallback(() => {
    const newLevel = level + 1;
    incrementMastery(book, chapter, verse);

    // Show celebration for milestones
    if (newLevel === 3) {
      setCelebration({ emoji: '🎉', text: 'Familiar!' });
    } else if (newLevel === 4) {
      setCelebration({ emoji: '🌟', text: 'Proficient!' });
    } else if (newLevel === 5) {
      setCelebration({ emoji: '🏆', text: 'Mastered!' });
    } else {
      setCelebration({ emoji: '✨', text: '+1' });
    }

    setTimeout(() => setCelebration(null), 1500);
  }, [level, incrementMastery, book, chapter, verse]);

  const handleDecrement = useCallback(() => {
    decrementMastery(book, chapter, verse);
  }, [decrementMastery, book, chapter, verse]);

  return (
    <div className={`quick-mastery ${compact ? 'compact' : ''}`}>
      {showProgress && <MasteryProgressBar level={level} showLabels={false} size="tiny" />}

      <div className="quick-controls">
        <button
          className="quick-btn decrement"
          onClick={handleDecrement}
          disabled={level === 0}
          title="Struggled / Forgot"
        >
          −
        </button>

        <button
          className={`quick-level ${celebration ? 'celebrating' : ''}`}
          style={{ background: config.color }}
          title={`${config.name}: ${config.description}`}
        >
          {celebration ? celebration.emoji : config.icon}
        </button>

        <button
          className="quick-btn increment"
          onClick={handleIncrement}
          disabled={level === 5}
          title="Got it / Understood"
        >
          +
        </button>
      </div>

      {/* Celebration toast */}
      {celebration && (
        <span className="mastery-celebration">{celebration.text}</span>
      )}
    </div>
  );
});

// =============================================================================
// Chapter Mastery Overview
// =============================================================================

export const ChapterMasteryOverview = React.memo(function ChapterMasteryOverview({
  book,
  chapter,
  totalVerses
}) {
  const { getChapterMastery } = useMastery();
  const mastery = getChapterMastery(book, chapter);

  const coveragePercent = totalVerses > 0
    ? Math.round((mastery.versesStudied / totalVerses) * 100)
    : 0;

  return (
    <div className="chapter-mastery-overview">
      <div className="overview-header">
        <h4>{book} {chapter}</h4>
        <span className="coverage">{coveragePercent}% covered</span>
      </div>

      <div className="overview-stats">
        <div className="stat">
          <span className="stat-value">{mastery.versesStudied}</span>
          <span className="stat-label">Verses Studied</span>
        </div>
        <div className="stat">
          <span className="stat-value">{mastery.averageLevel.toFixed(1)}</span>
          <span className="stat-label">Avg. Level</span>
        </div>
        <div className="stat">
          <span className="stat-value">{Math.round(mastery.progress)}%</span>
          <span className="stat-label">Mastery</span>
        </div>
      </div>

      <MasteryProgressBar level={Math.round(mastery.averageLevel)} size="medium" />
    </div>
  );
});

// =============================================================================
// Mastery Stats Dashboard
// =============================================================================

export const MasteryStatsDashboard = React.memo(function MasteryStatsDashboard() {
  const { getStats, getDueForReview, exportData } = useMastery();
  const stats = getStats();
  const dueItems = getDueForReview();

  const [showExport, setShowExport] = useState(false);

  return (
    <div className="mastery-dashboard">
      <div className="dashboard-header">
        <h3>Mastery Overview</h3>
        <div className="dashboard-actions">
          <button className="action-btn" onClick={() => setShowExport(!showExport)}>
            Export
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-title">Total Items</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.verses}</span>
          <span className="stat-title">Verses</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.concepts}</span>
          <span className="stat-title">Concepts</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.totalReviews}</span>
          <span className="stat-title">Reviews</span>
        </div>
      </div>

      {/* Level Distribution */}
      <div className="level-distribution">
        <h4>Level Distribution</h4>
        <div className="distribution-bars">
          {[5, 4, 3, 2, 1, 0].map(level => {
            const config = MASTERY_LEVELS[level];
            const count = stats.byLevel[level];
            const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={level} className="dist-row">
                <span className="dist-icon">{config.icon}</span>
                <span className="dist-name">{config.name}</span>
                <div className="dist-bar-container">
                  <div
                    className="dist-bar"
                    style={{
                      width: `${percent}%`,
                      background: config.color
                    }}
                  />
                </div>
                <span className="dist-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Due for Review */}
      {dueItems.length > 0 && (
        <div className="due-for-review">
          <h4>Due for Review ({dueItems.length})</h4>
          <div className="due-list">
            {dueItems.slice(0, 5).map(item => (
              <div key={item.key} className="due-item">
                <span className="due-icon">{MASTERY_LEVELS[item.level].icon}</span>
                <span className="due-ref">
                  {item.type === 'verse'
                    ? `${item.book} ${item.chapter}:${item.verse}`
                    : item.concept
                  }
                </span>
              </div>
            ))}
            {dueItems.length > 5 && (
              <span className="due-more">+{dueItems.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="export-modal">
          <textarea
            readOnly
            value={exportData()}
            className="export-textarea"
          />
          <button onClick={() => setShowExport(false)}>Close</button>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

const MasteryTracker = ({
  book,
  chapter,
  verse,
  text,
  mode = 'inline', // 'inline' | 'card' | 'minimal'
  onLevelChange
}) => {
  if (mode === 'card') {
    return (
      <VerseMasteryCard
        book={book}
        chapter={chapter}
        verse={verse}
        text={text}
        onLevelChange={onLevelChange}
      />
    );
  }

  if (mode === 'minimal') {
    return (
      <QuickMasterySelector
        book={book}
        chapter={chapter}
        verse={verse}
        compact
      />
    );
  }

  // Default inline mode
  return (
    <QuickMasterySelector
      book={book}
      chapter={chapter}
      verse={verse}
      showProgress
    />
  );
};

MasteryTracker.propTypes = {
  book: PropTypes.string.isRequired,
  chapter: PropTypes.number.isRequired,
  verse: PropTypes.number.isRequired,
  text: PropTypes.string,
  mode: PropTypes.oneOf(['inline', 'card', 'minimal']),
  onLevelChange: PropTypes.func
};

export default React.memo(MasteryTracker);
