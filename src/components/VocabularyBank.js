import React, { useState, useCallback, useMemo } from 'react';
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
  getStats
}) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'review', 'stats'
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [editFrench, setEditFrench] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'alphabetical', 'reviews'

  const stats = useMemo(() => getStats?.() || { total: 0, mastered: 0, needsReview: 0 }, [getStats]);
  const reviewWords = useMemo(() => getWordsForReview?.(20) || [], [getWordsForReview]);

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

  // Review handlers
  const handleNextCard = useCallback((correct) => {
    if (reviewWords[reviewIndex]) {
      onMarkReviewed?.(reviewWords[reviewIndex].id, correct);
    }
    setShowAnswer(false);
    setReviewIndex(prev => (prev + 1) % Math.max(reviewWords.length, 1));
  }, [reviewIndex, reviewWords, onMarkReviewed]);

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

        {showAnswer && (
          <div className="flashcard-actions">
            <button className="action-incorrect" onClick={() => handleNextCard(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              Still Learning
            </button>
            <button className="action-correct" onClick={() => handleNextCard(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Got It!
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render statistics
  const renderStats = () => (
    <div className="vocabulary-stats">
      <div className="stat-card total">
        <div className="stat-number">{stats.total}</div>
        <div className="stat-label">Total Words</div>
      </div>
      <div className="stat-card mastered">
        <div className="stat-number">{stats.mastered}</div>
        <div className="stat-label">Mastered</div>
      </div>
      <div className="stat-card learning">
        <div className="stat-number">{stats.needsReview}</div>
        <div className="stat-label">Learning</div>
      </div>
      <div className="stat-card progress">
        <div className="stat-number">
          {stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%
        </div>
        <div className="stat-label">Progress</div>
      </div>

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
        </div>
      </div>

      <div className="vocabulary-content">
        {activeTab === 'list' && renderWordList()}
        {activeTab === 'review' && renderReview()}
        {activeTab === 'stats' && renderStats()}
      </div>
    </div>
  );
};

export default React.memo(VocabularyBank);
