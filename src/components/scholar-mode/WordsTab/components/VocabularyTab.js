/**
 * VocabularyTab Component
 *
 * Personal vocabulary management with spaced repetition review (SRS).
 * Features: word list, study mode, progress stats, due reviews.
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useVocabulary } from '../../../../hooks';
import VocabularyReview from '../../../study/VocabularyReview';
import './VocabularyTab.css';

const VocabularyTab = React.memo(function VocabularyTab({ showFrench = false }) {
  const { vocabulary, markReviewed, getStats, removeWord } = useVocabulary();
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const stats = getStats();

  const handleComplete = useCallback(() => {
    setIsReviewing(false);
  }, []);

  // Review mode
  if (isReviewing) {
    return (
      <div className="vocabulary-tab reviewing">
        <button className="back-btn" onClick={() => setIsReviewing(false)}>
          ← Back to Word List
        </button>
        <VocabularyReview
          vocabulary={vocabulary}
          showFrench={showFrench}
          onComplete={handleComplete}
          onMarkReviewed={markReviewed}
          maxCards={20}
        />
      </div>
    );
  }

  return (
    <div className="vocabulary-tab">
      {/* Stats Summary */}
      <div className="vocab-stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Words</span>
        </div>
        <div className="stat-card due">
          <span className="stat-value">{stats.dueNow}</span>
          <span className="stat-label">Due Now</span>
        </div>
        <div className="stat-card mastered">
          <span className="stat-value">{stats.mastered}</span>
          <span className="stat-label">Mastered</span>
        </div>
        <div className="stat-card accuracy">
          <span className="stat-value">{stats.accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
      </div>

      {/* Review Button */}
      {vocabulary.length > 0 && (
        <button
          className="btn-start-review"
          onClick={() => setIsReviewing(true)}
          disabled={stats.dueNow === 0}
        >
          <span className="btn-icon">📚</span>
          {stats.dueNow > 0 ? (
            <>Start Review ({stats.dueNow} due)</>
          ) : (
            <>No Words Due - Check Back Later</>
          )}
        </button>
      )}

      {/* Word List */}
      {vocabulary.length > 0 ? (
        <div className="word-list">
          <div className="word-list-header">
            <h5>Saved Words ({vocabulary.length})</h5>
            <button
              className="toggle-all-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'Show All'}
            </button>
          </div>
          <div className="word-grid">
            {(showAll ? vocabulary : vocabulary.slice(0, 8)).map(word => (
              <div 
                key={word.id} 
                className={`word-card ${word.mastered ? 'mastered' : ''}`}
              >
                <span className="word-hebrew" dir="rtl">{word.hebrew}</span>
                <span className="word-english">{word.english}</span>
                {word.mastered && <span className="mastered-badge">✓</span>}
                <button
                  className="word-remove"
                  onClick={() => removeWord(word.id)}
                  title="Remove word"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {!showAll && vocabulary.length > 8 && (
            <div className="show-more-hint">
              +{vocabulary.length - 8} more words
            </div>
          )}
        </div>
      ) : (
        <div className="vocab-empty-state">
          <span className="empty-icon">📖</span>
          <h5>No Vocabulary Yet</h5>
          <p>Click on Hebrew words while reading to save them to your vocabulary.</p>
          <p className="empty-hint">
            Saved words will appear here for spaced repetition review.
          </p>
        </div>
      )}
    </div>
  );
});

VocabularyTab.propTypes = {
  showFrench: PropTypes.bool
};

export default VocabularyTab;
