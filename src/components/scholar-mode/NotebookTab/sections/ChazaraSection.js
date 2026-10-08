import React, { useState, useCallback } from 'react';
import useMastery, { MASTERY_LEVELS } from '../../../../hooks/useMastery';

// =============================================================================
// Chazara Section - Guided Spaced Repetition Review
// =============================================================================
export const ChazaraSection = ({ onNavigateToVerse }) => {
  const {
    getDueForReview,
    incrementMastery,
    decrementMastery,
    getVerseMastery
  } = useMastery();

  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewed, setReviewed] = useState([]);

  const dueItems = getDueForReview().filter(i => i.type === 'verse');
  const currentItem = dueItems[sessionIndex];
  const progress = dueItems.length > 0 ? ((sessionIndex) / dueItems.length) * 100 : 0;

  const handleResponse = useCallback((remembered) => {
    if (!currentItem) return;

    if (remembered) {
      incrementMastery(currentItem.book, currentItem.chapter, currentItem.verse);
    } else {
      decrementMastery(currentItem.book, currentItem.chapter, currentItem.verse);
    }

    setReviewed(prev => [...prev, { ...currentItem, remembered }]);

    if (sessionIndex + 1 >= dueItems.length) {
      setSessionComplete(true);
    } else {
      setSessionIndex(prev => prev + 1);
    }
  }, [currentItem, sessionIndex, dueItems.length, incrementMastery, decrementMastery]);

  const handleSkip = useCallback(() => {
    if (sessionIndex + 1 >= dueItems.length) {
      setSessionComplete(true);
    } else {
      setSessionIndex(prev => prev + 1);
    }
  }, [sessionIndex, dueItems.length]);

  const handleGoToVerse = useCallback(() => {
    if (currentItem && onNavigateToVerse) {
      onNavigateToVerse(currentItem.verse, currentItem.book, currentItem.chapter);
    }
  }, [currentItem, onNavigateToVerse]);

  const resetSession = useCallback(() => {
    setSessionIndex(0);
    setSessionComplete(false);
    setReviewed([]);
  }, []);

  if (dueItems.length === 0) {
    return (
      <div className="chazara-section">
        <div className="chazara-empty">
          <span className="empty-icon">✨</span>
          <h4>All Caught Up!</h4>
          <p>No verses due for review right now.</p>
          <p className="hebrew-text">כל הכבוד!</p>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    const rememberedCount = reviewed.filter(r => r.remembered).length;
    return (
      <div className="chazara-section">
        <div className="chazara-complete">
          <span className="complete-icon">🎯</span>
          <h4>Session Complete!</h4>
          <div className="session-stats">
            <div className="stat">
              <span className="stat-value">{reviewed.length}</span>
              <span className="stat-label">Reviewed</span>
            </div>
            <div className="stat success">
              <span className="stat-value">{rememberedCount}</span>
              <span className="stat-label">Remembered</span>
            </div>
            <div className="stat">
              <span className="stat-value">{reviewed.length - rememberedCount}</span>
              <span className="stat-label">Need Work</span>
            </div>
          </div>
          <button className="restart-btn" onClick={resetSession}>
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  const currentLevel = currentItem ? getVerseMastery(currentItem.book, currentItem.chapter, currentItem.verse) : 0;
  const levelConfig = MASTERY_LEVELS[currentLevel];

  return (
    <div className="chazara-section">
      {/* Progress Bar */}
      <div className="session-progress">
        <div className="progress-info">
          <span>Chazara Session</span>
          <span>{sessionIndex + 1} / {dueItems.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current Card */}
      <div className="review-card">
        <div className="card-header">
          <button className="verse-link" onClick={handleGoToVerse}>
            {currentItem.book} {currentItem.chapter}:{currentItem.verse}
          </button>
          <span className="level-badge" style={{ background: levelConfig.color }}>
            {levelConfig.icon} {levelConfig.hebrewName}
          </span>
        </div>

        <div className="card-question">
          <span className="question-icon">🤔</span>
          <p>Do you remember this verse?</p>
          <p className="hebrew-prompt">האם אתה זוכר פסוק זה?</p>
        </div>

        <div className="card-actions">
          <button className="action-btn forgot" onClick={() => handleResponse(false)}>
            <span className="btn-icon">😕</span>
            <span className="btn-text">Forgot</span>
            <span className="btn-hebrew">שכחתי</span>
          </button>
          <button className="action-btn skip" onClick={handleSkip}>
            <span className="btn-icon">⏭️</span>
            <span className="btn-text">Skip</span>
          </button>
          <button className="action-btn remembered" onClick={() => handleResponse(true)}>
            <span className="btn-icon">💪</span>
            <span className="btn-text">Got it!</span>
            <span className="btn-hebrew">זכרתי</span>
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="chazara-tip">
        <span className="tip-icon">💡</span>
        <span className="tip-text">
          Spaced repetition optimizes memory retention. Review at increasing intervals!
        </span>
      </div>
    </div>
  );
};
