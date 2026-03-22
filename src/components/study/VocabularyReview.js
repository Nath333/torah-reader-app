/**
 * VocabularyReview - Spaced Repetition Vocabulary Practice
 *
 * A flashcard-based review system using spaced repetition (SM-2 algorithm)
 * to help users learn and retain Hebrew/Aramaic vocabulary.
 *
 * Features:
 * - Flashcard interface with flip animation
 * - Spaced repetition scheduling (uses useVocabulary hook's SRS)
 * - Progress tracking and statistics
 * - Multiple study modes (recognition, recall, spelling)
 *
 * NOTE: SRS algorithm is implemented in useVocabulary hook - this component
 * is purely presentational and calls onMarkReviewed for state updates.
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import './VocabularyReview.css';

// =============================================================================
// Flashcard Component
// =============================================================================

const Flashcard = React.memo(function Flashcard({
  word,
  isFlipped,
  onFlip,
  showFrench
}) {
  return (
    <div
      className={`flashcard ${isFlipped ? 'flipped' : ''}`}
      onClick={onFlip}
    >
      <div className="flashcard-inner">
        {/* Front - Hebrew/Aramaic word */}
        <div className="flashcard-front">
          <span className="card-label">Hebrew</span>
          <span className="card-word" dir="rtl">{word.hebrew}</span>
          {word.transliteration && (
            <span className="card-transliteration">{word.transliteration}</span>
          )}
          <span className="card-hint">Tap to reveal</span>
        </div>

        {/* Back - Translation */}
        <div className="flashcard-back">
          <span className="card-label">English</span>
          <span className="card-translation">{word.english}</span>
          {showFrench && word.french && (
            <>
              <span className="card-label french">French</span>
              <span className="card-translation french">{word.french}</span>
            </>
          )}
          {word.context && (
            <div className="card-context">
              <span className="context-label">Context:</span>
              <span className="context-text" dir="rtl">{word.context}</span>
            </div>
          )}
          {word.source && (
            <span className="card-source">{word.source}</span>
          )}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Rating Buttons
// =============================================================================

const RatingButtons = React.memo(function RatingButtons({ onRate, disabled }) {
  const ratings = [
    { value: 0, label: 'Forgot', icon: '❌', color: '#ef4444' },
    { value: 1, label: 'Hard', icon: '😓', color: '#f97316' },
    { value: 2, label: 'Difficult', icon: '😐', color: '#f59e0b' },
    { value: 3, label: 'Good', icon: '🙂', color: '#84cc16' },
    { value: 4, label: 'Easy', icon: '😊', color: '#22c55e' },
    { value: 5, label: 'Perfect', icon: '⭐', color: '#10b981' }
  ];

  return (
    <div className="rating-buttons">
      <span className="rating-prompt">How well did you know it?</span>
      <div className="rating-options">
        {ratings.map(rating => (
          <button
            key={rating.value}
            className="rating-btn"
            onClick={() => onRate(rating.value)}
            disabled={disabled}
            style={{ '--rating-color': rating.color }}
            title={rating.label}
          >
            <span className="rating-icon">{rating.icon}</span>
            <span className="rating-label">{rating.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Progress Bar
// =============================================================================

const ReviewProgress = React.memo(function ReviewProgress({
  current,
  total,
  correct,
  incorrect
}) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="review-progress">
      <div className="progress-stats">
        <span className="progress-count">{current} / {total}</span>
        <div className="progress-scores">
          <span className="score correct">✓ {correct}</span>
          <span className="score incorrect">✗ {incorrect}</span>
        </div>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
});

// =============================================================================
// Session Summary
// =============================================================================

const SessionSummary = React.memo(function SessionSummary({
  stats,
  onRestart,
  onClose
}) {
  const accuracy = stats.total > 0
    ? Math.round((stats.correct / stats.total) * 100)
    : 0;

  const grade = accuracy >= 90 ? 'A' : accuracy >= 80 ? 'B' : accuracy >= 70 ? 'C' : accuracy >= 60 ? 'D' : 'F';
  const gradeColor = accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="session-summary">
      <div className="summary-header">
        <span className="summary-icon">🎓</span>
        <h3>Session Complete!</h3>
      </div>

      <div className="summary-grade" style={{ '--grade-color': gradeColor }}>
        <span className="grade-letter">{grade}</span>
        <span className="grade-percent">{accuracy}%</span>
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Cards Reviewed</span>
        </div>
        <div className="summary-stat correct">
          <span className="stat-value">{stats.correct}</span>
          <span className="stat-label">Correct</span>
        </div>
        <div className="summary-stat incorrect">
          <span className="stat-value">{stats.incorrect}</span>
          <span className="stat-label">Need Practice</span>
        </div>
      </div>

      <div className="summary-message">
        {accuracy >= 90 && "Excellent! You're mastering these words!"}
        {accuracy >= 70 && accuracy < 90 && "Good job! Keep practicing!"}
        {accuracy < 70 && "Don't worry, practice makes perfect!"}
      </div>

      <div className="summary-actions">
        <button className="btn-restart" onClick={onRestart}>
          Review Again
        </button>
        <button className="btn-close" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

const VocabularyReview = ({
  vocabulary = [],
  showFrench = false,
  onComplete,
  onMarkReviewed, // Callback to update vocabulary via useVocabulary hook
  maxCards = 20
}) => {
  // Session state
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0, incorrect: 0 });
  const [isComplete, setIsComplete] = useState(false);

  // Select words due for review using vocabulary's built-in SRS fields
  useEffect(() => {
    if (vocabulary.length === 0) return;

    const now = new Date();

    // Filter and sort words due for review using their SRS fields
    const dueWords = vocabulary
      .filter(word => {
        // Include if not mastered
        if (word.mastered) return false;
        // Include if no next review set (new word)
        if (!word.nextReview) return true;
        // Include if due or overdue
        return new Date(word.nextReview) <= now;
      })
      .sort((a, b) => {
        // Sort by: overdue first, then by ease factor (harder words first)
        const aDate = a.nextReview ? new Date(a.nextReview).getTime() : 0;
        const bDate = b.nextReview ? new Date(b.nextReview).getTime() : 0;
        if (aDate !== bDate) return aDate - bDate;
        return (a.easeFactor || 2.5) - (b.easeFactor || 2.5);
      })
      .slice(0, maxCards);

    setSessionWords(dueWords);
    setStats({ total: dueWords.length, correct: 0, incorrect: 0 });
  }, [vocabulary, maxCards]);

  // Current word
  const currentWord = sessionWords[currentIndex];

  // Handle card flip
  const handleFlip = useCallback(() => {
    if (!hasRated) {
      setIsFlipped(true);
    }
  }, [hasRated]);

  // Handle rating - delegates to useVocabulary hook via onMarkReviewed
  const handleRate = useCallback((quality) => {
    if (!currentWord || hasRated) return;

    setHasRated(true);

    // Call the hook's markReviewed function
    if (onMarkReviewed) {
      onMarkReviewed(currentWord.id, quality >= 3, quality);
    }

    // Update local session stats
    const isCorrect = quality >= 3;
    setStats(prev => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect
    }));

    // Move to next card after delay
    setTimeout(() => {
      if (currentIndex + 1 >= sessionWords.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setHasRated(false);
      }
    }, 800);
  }, [currentWord, currentIndex, sessionWords.length, hasRated, onMarkReviewed]);

  // Restart session
  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasRated(false);
    setIsComplete(false);
    setStats({ total: sessionWords.length, correct: 0, incorrect: 0 });
  }, [sessionWords.length]);

  // Complete session
  const handleComplete = useCallback(() => {
    onComplete?.(stats);
  }, [onComplete, stats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isFlipped) handleFlip();
      }
      if (isFlipped && !hasRated) {
        const keyMap = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
        if (keyMap[e.key] !== undefined) {
          handleRate(keyMap[e.key]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, hasRated, handleFlip, handleRate]);

  // Empty state
  if (vocabulary.length === 0) {
    return (
      <div className="vocabulary-review empty">
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <h3>No Vocabulary Yet</h3>
          <p>Start saving words while reading to build your vocabulary!</p>
        </div>
      </div>
    );
  }

  // Session complete
  if (isComplete) {
    return (
      <div className="vocabulary-review">
        <SessionSummary
          stats={stats}
          onRestart={handleRestart}
          onClose={handleComplete}
        />
      </div>
    );
  }

  // Loading
  if (!currentWord) {
    return (
      <div className="vocabulary-review loading">
        <div className="loading-spinner" />
        <span>Loading vocabulary...</span>
      </div>
    );
  }

  return (
    <div className="vocabulary-review">
      <ReviewProgress
        current={currentIndex + 1}
        total={sessionWords.length}
        correct={stats.correct}
        incorrect={stats.incorrect}
      />

      <Flashcard
        word={currentWord}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        showFrench={showFrench}
      />

      {isFlipped && (
        <RatingButtons
          onRate={handleRate}
          disabled={hasRated}
        />
      )}

      <div className="keyboard-hints">
        <span>Space/Enter to flip • 0-5 to rate</span>
      </div>
    </div>
  );
};

VocabularyReview.propTypes = {
  vocabulary: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    hebrew: PropTypes.string.isRequired,
    english: PropTypes.string.isRequired,
    french: PropTypes.string,
    transliteration: PropTypes.string,
    context: PropTypes.string,
    source: PropTypes.string,
    // SRS fields (managed by useVocabulary hook)
    interval: PropTypes.number,
    easeFactor: PropTypes.number,
    repetitions: PropTypes.number,
    nextReview: PropTypes.string,
    mastered: PropTypes.bool
  })),
  showFrench: PropTypes.bool,
  onComplete: PropTypes.func,
  onMarkReviewed: PropTypes.func, // (wordId, correct, quality) => void
  maxCards: PropTypes.number
};

export default React.memo(VocabularyReview);
