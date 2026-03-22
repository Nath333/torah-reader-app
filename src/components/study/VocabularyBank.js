import React, { useState, useCallback, useMemo, useEffect } from 'react';
import srsService, { QUALITY, getMasteryLevel } from '../../services/srsService';
import learningService, {
  LEARNING_LEVELS,
  calculateLevel,
  getStudyFocus,
  generateMilestones,
  analyzeRootFamilyGaps,
  createOptimizedSession
} from '../../services/learningRecommendationService';
import './VocabularyBank.css';

const VocabularyBank = ({
  vocabulary,
  onRemoveWord,
  onUpdateWord,
  onMarkReviewed,
  onClear,
  onExport,
  onImport,
  getWordsForReview,
  getStats: getPropsStats
}) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'review', 'stats', 'learn'
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [editFrench, setEditFrench] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'alphabetical', 'reviews', 'due'
  const [srsStats, setSrsStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  // Learning recommendations state
  const [learningData, setLearningData] = useState(null);

  // Initialize SRS and sync vocabulary
  useEffect(() => {
    if (vocabulary?.length > 0) {
      // Import new vocabulary items into SRS system
      const newWords = vocabulary.filter(word => !srsService.getCard(word.id));
      if (newWords.length > 0) {
        srsService.importFromVocabulary(newWords);
      }
    }
    // Update stats
    const currentStats = srsService.getStats();
    setSrsStats(currentStats);
    setForecast(srsService.getReviewForecast(7));
    setDueCards(srsService.getDueCards({ limit: 50 }));

    // Calculate learning recommendations
    try {
      const masteredWords = vocabulary?.filter(w => w.mastered).map(w => w.hebrew) || [];
      const studyHistory = vocabulary?.map(w => ({
        word: w.hebrew,
        reviews: w.reviewCount || 0,
        lastReview: w.lastReviewed
      })) || [];

      const level = calculateLevel({
        versesStudied: vocabulary?.length || 0,
        vocabularyMastered: masteredWords.length,
        commentatorsExplored: 1
      });

      const focus = getStudyFocus({
        srsCards: dueCards,
        studyHistory,
        masteredWords
      });

      const milestones = generateMilestones({
        vocabularyMastered: masteredWords.length,
        totalWords: vocabulary?.length || 0,
        streak: currentStats?.streak || 0
      });

      const rootGaps = analyzeRootFamilyGaps(masteredWords);

      setLearningData({
        level,
        focus,
        milestones,
        rootGaps,
        masteredCount: masteredWords.length
      });
    } catch (err) {
      console.warn('Learning recommendations failed:', err);
    }
  }, [vocabulary, dueCards]);

  // Get combined stats (SRS-enhanced)
  const stats = useMemo(() => {
    if (srsStats) {
      return {
        total: srsStats.total || vocabulary?.length || 0,
        mastered: srsStats.mastered,
        needsReview: srsStats.dueNow,
        learning: srsStats.learning,
        new: srsStats.new,
        retention: srsStats.retention,
        streak: srsStats.streak,
        totalReviews: srsStats.totalReviews,
        dueTomorrow: srsStats.dueTomorrow
      };
    }
    return getPropsStats?.() || { total: 0, mastered: 0, needsReview: 0 };
  }, [srsStats, getPropsStats, vocabulary]);

  // Use SRS due cards for review, fallback to props
  const reviewWords = useMemo(() => {
    if (dueCards.length > 0) {
      // Map SRS cards back to vocabulary format
      return dueCards.map(card => {
        const vocabWord = vocabulary?.find(v => v.id === card.id);
        return {
          ...vocabWord,
          id: card.id,
          hebrew: card.front,
          english: card.back,
          srsCard: card, // Attach SRS data
          mastery: getMasteryLevel(card)
        };
      }).filter(w => w.hebrew);
    }
    return getWordsForReview?.(20) || [];
  }, [dueCards, vocabulary, getWordsForReview]);

  // Filter and sort vocabulary
  const filteredVocabulary = useMemo(() => {
    let filtered = vocabulary || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.hebrew.includes(searchQuery) ||
        w.english?.toLowerCase().includes(query) ||
        w.french?.toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'alphabetical':
        return [...filtered].sort((a, b) => a.hebrew.localeCompare(b.hebrew, 'he'));
      case 'reviews':
        return [...filtered].sort((a, b) => b.reviewCount - a.reviewCount);
      case 'recent':
      default:
        return [...filtered].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }
  }, [vocabulary, searchQuery, sortBy]);

  // SRS Review handler with quality rating
  const handleSrsReview = useCallback((quality) => {
    const currentWord = reviewWords[reviewIndex];
    if (currentWord) {
      try {
        // Process review with SM-2 algorithm
        srsService.processReview(currentWord.id, quality);

        // Also notify parent for any additional tracking
        onMarkReviewed?.(currentWord.id, quality >= QUALITY.CORRECT_DIFFICULT);

        // Refresh SRS data
        setSrsStats(srsService.getStats());
        setDueCards(srsService.getDueCards({ limit: 50 }));
      } catch (err) {
        console.warn('SRS review failed:', err);
      }
    }

    setShowAnswer(false);
    setShowQualityPicker(false);

    // Move to next card (remove reviewed card from current session)
    if (reviewIndex >= reviewWords.length - 1) {
      setReviewIndex(0);
    }
  }, [reviewIndex, reviewWords, onMarkReviewed]);

  // Legacy handler for simple correct/incorrect (maps to SRS quality)
  const handleNextCard = useCallback((correct) => {
    const quality = correct ? QUALITY.CORRECT_HESITATION : QUALITY.INCORRECT;
    handleSrsReview(quality);
  }, [handleSrsReview]);

  // Edit handlers
  const handleStartEdit = useCallback((word) => {
    setEditingWord(word.id);
    setEditFrench(word.french || '');
  }, []);

  const handleSaveEdit = useCallback((wordId) => {
    onUpdateWord?.(wordId, { french: editFrench });
    setEditingWord(null);
    setEditFrench('');
  }, [editFrench, onUpdateWord]);

  // Export/Import handlers
  const handleExport = useCallback(() => {
    const data = onExport?.();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'torah-vocabulary.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [onExport]);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImport?.(event.target.result);
      };
      reader.readAsText(file);
    }
  }, [onImport]);

  // Render word list
  const renderWordList = () => (
    <div className="vocabulary-list-container">
      <div className="vocabulary-toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
          <option value="recent">Most Recent</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="reviews">Most Reviewed</option>
        </select>
      </div>

      {filteredVocabulary.length === 0 ? (
        <div className="empty-vocabulary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p>No words saved yet</p>
          <span>Click on Hebrew words while reading to add them here</span>
        </div>
      ) : (
        <div className="vocabulary-list">
          {filteredVocabulary.map((word) => (
            <div key={word.id} className={`vocabulary-item ${word.mastered ? 'mastered' : ''}`}>
              <div className="word-main">
                <span className="word-hebrew">{word.original || word.hebrew}</span>
                <div className="word-translations">
                  <span className="word-english">{word.english || '—'}</span>
                  {editingWord === word.id ? (
                    <div className="edit-french">
                      <input
                        type="text"
                        value={editFrench}
                        onChange={(e) => setEditFrench(e.target.value)}
                        placeholder="French translation..."
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(word.id)} className="save-btn">Save</button>
                      <button onClick={() => setEditingWord(null)} className="cancel-btn">Cancel</button>
                    </div>
                  ) : (
                    <span className="word-french" onClick={() => handleStartEdit(word)}>
                      {word.french || <em>+ Add French</em>}
                    </span>
                  )}
                </div>
              </div>
              <div className="word-meta">
                <span className="review-count" title="Review count">
                  {word.reviewCount}x
                </span>
                {word.mastered && <span className="mastered-badge">Mastered</span>}
                <button
                  className="remove-word"
                  onClick={() => onRemoveWord?.(word.id)}
                  title="Remove word"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render flashcard review
  const renderReview = () => {
    if (reviewWords.length === 0) {
      return (
        <div className="no-review-words">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>All caught up!</p>
          <span>Add more words or review mastered ones</span>
        </div>
      );
    }

    const currentWord = reviewWords[reviewIndex];

    return (
      <div className="flashcard-container">
        <div className="flashcard-progress">
          Card {reviewIndex + 1} of {reviewWords.length}
        </div>

        <div className={`flashcard ${showAnswer ? 'flipped' : ''}`} onClick={() => setShowAnswer(!showAnswer)}>
          <div className="flashcard-front">
            <span className="flashcard-hebrew">{currentWord.original || currentWord.hebrew}</span>
            <span className="flashcard-hint">Click to reveal</span>
          </div>
          <div className="flashcard-back">
            <div className="flashcard-translations">
              <div className="translation-row">
                <span className="lang-label">EN:</span>
                <span className="translation-text">{currentWord.english || '—'}</span>
              </div>
              <div className="translation-row">
                <span className="lang-label">FR:</span>
                <span className="translation-text">{currentWord.french || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {showAnswer && !showQualityPicker && (
          <div className="flashcard-actions">
            <button className="action-incorrect" onClick={() => handleNextCard(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              Still Learning
            </button>
            <button className="action-correct" onClick={() => setShowQualityPicker(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Got It!
            </button>
          </div>
        )}

        {showAnswer && showQualityPicker && (
          <div className="srs-quality-picker">
            <p className="quality-prompt">How well did you remember?</p>
            <div className="quality-buttons">
              <button
                className="quality-btn quality-3"
                onClick={() => handleSrsReview(QUALITY.CORRECT_DIFFICULT)}
                title="Correct but difficult"
              >
                <span className="quality-icon">😓</span>
                <span className="quality-label">Hard</span>
              </button>
              <button
                className="quality-btn quality-4"
                onClick={() => handleSrsReview(QUALITY.CORRECT_HESITATION)}
                title="Correct with some hesitation"
              >
                <span className="quality-icon">🤔</span>
                <span className="quality-label">Good</span>
              </button>
              <button
                className="quality-btn quality-5"
                onClick={() => handleSrsReview(QUALITY.PERFECT)}
                title="Perfect recall, no hesitation"
              >
                <span className="quality-icon">✨</span>
                <span className="quality-label">Easy</span>
              </button>
            </div>
            <button
              className="quality-cancel"
              onClick={() => setShowQualityPicker(false)}
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render statistics (SRS-enhanced)
  const renderStats = () => (
    <div className="vocabulary-stats">
      {/* Primary Stats Row */}
      <div className="stats-primary">
        <div className="stat-card total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Words</div>
        </div>
        <div className="stat-card mastered">
          <div className="stat-number">{stats.mastered}</div>
          <div className="stat-label">Mastered</div>
        </div>
        <div className="stat-card learning">
          <div className="stat-number">{stats.learning || 0}</div>
          <div className="stat-label">Learning</div>
        </div>
        <div className="stat-card due">
          <div className="stat-number">{stats.needsReview || 0}</div>
          <div className="stat-label">Due Now</div>
        </div>
      </div>

      {/* SRS Stats Row */}
      {srsStats && (
        <div className="stats-srs">
          <div className="stat-card retention">
            <div className="stat-number">{stats.retention || 0}%</div>
            <div className="stat-label">Retention</div>
          </div>
          <div className="stat-card streak">
            <div className="stat-number">{stats.streak || 0}</div>
            <div className="stat-label">Day Streak</div>
          </div>
          <div className="stat-card reviews">
            <div className="stat-number">{stats.totalReviews || 0}</div>
            <div className="stat-label">Reviews</div>
          </div>
          <div className="stat-card tomorrow">
            <div className="stat-number">{stats.dueTomorrow || 0}</div>
            <div className="stat-label">Tomorrow</div>
          </div>
        </div>
      )}

      {/* 7-Day Forecast */}
      {forecast.length > 0 && (
        <div className="stats-forecast">
          <h4>7-Day Forecast</h4>
          <div className="forecast-bars">
            {forecast.map((day, i) => (
              <div key={i} className="forecast-day">
                <div
                  className="forecast-bar"
                  style={{ height: `${Math.min(100, (day.dueCount / Math.max(...forecast.map(d => d.dueCount), 1)) * 100)}%` }}
                >
                  <span className="forecast-count">{day.dueCount}</span>
                </div>
                <span className="forecast-label">{i === 0 ? 'Today' : day.date.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-actions">
        <button onClick={handleExport} className="export-btn" disabled={vocabulary?.length === 0}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Export
        </button>
        <label className="import-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Import
          <input type="file" accept=".json" onChange={handleImport} hidden />
        </label>
        {vocabulary?.length > 0 && (
          <button onClick={onClear} className="clear-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        )}
      </div>
    </div>
  );

  // Render learning recommendations (PRO SCHOLAR)
  const renderLearn = () => {
    if (!learningData) {
      return (
        <div className="learning-loading">
          <div className="loading-spinner" />
          <p>Analyzing your learning patterns...</p>
        </div>
      );
    }

    const { level, focus, milestones, rootGaps, masteredCount } = learningData;
    const levelInfo = LEARNING_LEVELS[level?.toUpperCase()] || LEARNING_LEVELS.BEGINNER;

    return (
      <div className="learning-recommendations">
        {/* Level Badge */}
        <div className="learning-level-card">
          <div className="level-badge" data-level={levelInfo.id}>
            <span className="level-hebrew">{levelInfo.hebrewLabel}</span>
            <span className="level-english">{levelInfo.label}</span>
          </div>
          <div className="level-progress">
            <div className="progress-label">
              <span>{masteredCount} words mastered</span>
              <span>Next: {LEARNING_LEVELS.INTERMEDIATE.criteria.vocabularyMastered} words</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (masteredCount / LEARNING_LEVELS.INTERMEDIATE.criteria.vocabularyMastered) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Study Focus */}
        {focus && (
          <div className="study-focus-card">
            <h4>📍 Today's Focus</h4>
            <p className="focus-main">{focus.focus || 'Review due vocabulary'}</p>
            {focus.secondaryGoals?.length > 0 && (
              <div className="secondary-goals">
                <span className="goals-label">Also consider:</span>
                <ul>
                  {focus.secondaryGoals.slice(0, 3).map((goal, i) => (
                    <li key={i}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
            {focus.bestStudyTime && (
              <p className="best-time">Best study time: <strong>{focus.bestStudyTime}</strong></p>
            )}
          </div>
        )}

        {/* Milestones */}
        {milestones?.length > 0 && (
          <div className="milestones-card">
            <h4>🏆 Milestones</h4>
            <div className="milestones-list">
              {milestones.slice(0, 4).map((milestone, i) => (
                <div
                  key={i}
                  className={`milestone ${milestone.achieved ? 'achieved' : ''}`}
                >
                  <span className="milestone-icon">{milestone.achieved ? '✓' : '○'}</span>
                  <div className="milestone-info">
                    <span className="milestone-name">{milestone.name}</span>
                    {milestone.hebrewName && (
                      <span className="milestone-hebrew">{milestone.hebrewName}</span>
                    )}
                  </div>
                  {!milestone.achieved && milestone.progress !== undefined && (
                    <span className="milestone-progress">{Math.round(milestone.progress * 100)}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root Family Gaps */}
        {rootGaps?.gaps?.length > 0 && (
          <div className="root-gaps-card">
            <h4>🌱 Root Families to Learn</h4>
            <p className="gaps-description">
              Learning related words from the same root helps retention
            </p>
            <div className="root-gaps-list">
              {rootGaps.gaps.slice(0, 5).map((gap, i) => (
                <div key={i} className="root-gap">
                  <span className="root-hebrew">{gap.root}</span>
                  <span className="root-meaning">{gap.meaning}</span>
                  <span className="root-mastery">
                    {gap.mastered}/{gap.total} known
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        <div className="learning-actions">
          <button
            className="action-btn primary"
            onClick={() => { setActiveTab('review'); setReviewIndex(0); setShowAnswer(false); }}
          >
            Start Optimized Session
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="vocabulary-bank">
      <div className="vocabulary-header">
        <h2>My Vocabulary</h2>
        <div className="vocabulary-tabs">
          <button
            className={`tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Words ({vocabulary?.length || 0})
          </button>
          <button
            className={`tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => { setActiveTab('review'); setReviewIndex(0); setShowAnswer(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Review
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            Stats
          </button>
          <button
            className={`tab ${activeTab === 'learn' ? 'active' : ''}`}
            onClick={() => setActiveTab('learn')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            Learn
          </button>
        </div>
      </div>

      <div className="vocabulary-content">
        {activeTab === 'list' && renderWordList()}
        {activeTab === 'review' && renderReview()}
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'learn' && renderLearn()}
      </div>
    </div>
  );
};

export default React.memo(VocabularyBank);
