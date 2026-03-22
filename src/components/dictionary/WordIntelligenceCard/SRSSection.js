/**
 * SRSSection Component
 * Spaced Repetition System section with quick review
 */

import React, { useState, useEffect, useCallback, memo } from 'react';

// Try to import SRS service
let getCard, createCard, processReview, getStats, getMasteryLevel, MASTERY_THRESHOLDS;
try {
  const srsService = require('../../../services/srsService');
  getCard = srsService.getCard;
  createCard = srsService.createCard;
  processReview = srsService.processReview;
  getStats = srsService.getStats;
  getMasteryLevel = srsService.getMasteryLevel;
  MASTERY_THRESHOLDS = srsService.MASTERY_THRESHOLDS;
} catch (e) {
  // Fallback constants
  MASTERY_THRESHOLDS = {
    MASTERED: { minInterval: 21, minRepetitions: 5, label: 'mastered', icon: '⭐' },
    LEARNING: { minRepetitions: 3, label: 'learning', icon: '📚' },
    STARTED: { minRepetitions: 1, label: 'started', icon: '🌱' },
    NEW: { minRepetitions: 0, label: 'new', icon: '✨' },
  };
  getCard = () => null;
  createCard = () => null;
  processReview = () => null;
  getStats = () => ({ total: 0, retention: 0 });
  getMasteryLevel = (card) => {
    if (!card) return { level: MASTERY_THRESHOLDS.NEW.label, icon: MASTERY_THRESHOLDS.NEW.icon };
    const { interval = 0, repetitions = 0 } = card;
    if (interval >= MASTERY_THRESHOLDS.MASTERED.minInterval &&
        repetitions >= MASTERY_THRESHOLDS.MASTERED.minRepetitions) {
      return { level: MASTERY_THRESHOLDS.MASTERED.label, icon: MASTERY_THRESHOLDS.MASTERED.icon };
    }
    if (repetitions >= MASTERY_THRESHOLDS.LEARNING.minRepetitions) {
      return { level: MASTERY_THRESHOLDS.LEARNING.label, icon: MASTERY_THRESHOLDS.LEARNING.icon };
    }
    if (repetitions >= MASTERY_THRESHOLDS.STARTED.minRepetitions) {
      return { level: MASTERY_THRESHOLDS.STARTED.label, icon: MASTERY_THRESHOLDS.STARTED.icon };
    }
    return { level: MASTERY_THRESHOLDS.NEW.label, icon: MASTERY_THRESHOLDS.NEW.icon };
  };
}

// Utility to clean Hebrew word
let cleanHebrewWord;
try {
  cleanHebrewWord = require('../../../utils/hebrewUtils').cleanHebrewWord;
} catch (e) {
  cleanHebrewWord = (w) => w;
}

// Generate SRS card ID from word
const getCardId = (word) => `vocab-${cleanHebrewWord(word)}`;

// Quick review quality ratings for SRS (SM-2 algorithm: 0-5 scale)
const SRS_RATINGS = [
  { q: 0, icon: '?', tip: 'Forgot' },
  { q: 1, icon: '✗', tip: 'Wrong' },
  { q: 2, icon: '~', tip: 'Hard' },
  { q: 3, icon: '✓', tip: 'OK' },
  { q: 4, icon: '✓✓', tip: 'Easy' },
  { q: 5, icon: '⭐', tip: 'Perfect' },
];

/**
 * SRS (Spaced Repetition System) section with Quick Review
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {string} props.definition - Primary definition
 * @param {string} [props.root] - Root string
 * @param {Function} [props.onUpdate] - Callback when SRS card is updated
 */
function SRSSection({ word, definition, root, onUpdate }) {
  const [srsCard, setSrsCard] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const existing = getCard?.(getCardId(word));
    setSrsCard(existing);
    setShowRatings(false);
    setFeedback(null);
  }, [word]);

  const handleAddToSRS = useCallback(() => {
    if (isAdding || !createCard) return;
    setIsAdding(true);

    const newCard = createCard(getCardId(word), word, definition || 'Unknown', {
      type: 'vocabulary',
      hebrewRoot: root,
      source: 'WordIntelligenceCard'
    });

    setSrsCard(newCard);
    setIsAdding(false);
    onUpdate?.();
  }, [word, definition, root, isAdding, onUpdate]);

  const handleQuickReview = useCallback((quality) => {
    if (!srsCard || !processReview) return;

    try {
      const updated = processReview(getCardId(word), quality);
      setSrsCard(updated);
      setShowRatings(false);

      // Show brief feedback
      const feedbackText = quality >= 3
        ? `Next: ${updated.interval} day${updated.interval > 1 ? 's' : ''}`
        : 'Review again soon';
      setFeedback(feedbackText);
      setTimeout(() => setFeedback(null), 2000);

      onUpdate?.();
    } catch (e) {
      console.error('[SRSSection] Review failed:', e);
    }
  }, [srsCard, word, onUpdate]);

  const stats = getStats?.() || { total: 0, retention: 0 };

  // Card exists - show status and quick review
  if (srsCard) {
    const mastery = getMasteryLevel(srsCard);
    const nextReviewDate = srsCard.nextReview
      ? new Date(srsCard.nextReview).toLocaleDateString()
      : 'Now';
    const isDue = srsCard.nextReview <= Date.now();

    return (
      <div className={`wic-srs in-srs ${mastery.level}`}>
        <div className="srs-status">
          <span className="srs-icon">{mastery.icon}</span>
          <span className="srs-level">{mastery.level}</span>
          {isDue && <span className="srs-due-badge">Due!</span>}
        </div>

        {feedback ? (
          <div className="srs-feedback">{feedback}</div>
        ) : showRatings ? (
          <div className="srs-ratings">
            <span className="ratings-label">How well did you know this?</span>
            <div className="ratings-buttons">
              {SRS_RATINGS.map(({ q, icon, tip }) => (
                <button
                  key={q}
                  className={`rating-btn q-${q}`}
                  onClick={() => handleQuickReview(q)}
                  title={tip}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="srs-meta">
              <span>Interval: {srsCard.interval} days</span>
              <span>Next: {nextReviewDate}</span>
            </div>
            <div className="srs-actions">
              <button
                className="srs-review-btn"
                onClick={() => setShowRatings(true)}
              >
                Quick Review
              </button>
            </div>
            <div className="srs-stats">
              <span>{srsCard.repetitions} reviews</span>
              <span>Ease: {Math.round(srsCard.easeFactor * 100)}%</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Card doesn't exist - show add button
  return (
    <div className="wic-srs not-in-srs">
      <button className="srs-add-btn" onClick={handleAddToSRS} disabled={isAdding}>
        <span className="srs-icon">➕</span>
        <span className="srs-text">Add to SRS</span>
      </button>
      <span className="srs-hint">{stats.total} words tracked</span>
    </div>
  );
}

export default memo(SRSSection);
