/**
 * NotebookTab - Personal Study Journal
 *
 * Consolidates all personal tracking features:
 * - Questions (Kushyot): Track questions while learning
 * - Insights (Chiddushim): Record novel insights
 * - Progress: Track understanding levels and mastery
 * - Today: Today's learning summary and streak + Study Mode selector
 *
 * This is your personal "machberet" (notebook) for Torah study.
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useStudyMode, STUDY_MODE_CONFIG } from '../../context/StudyModeContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import useMastery, { MASTERY_LEVELS } from '../../hooks/useMastery';
import './NotebookTab.css';

// =============================================================================
// Sub-tab configurations
// =============================================================================
const SUB_TABS = [
  { id: 'questions', label: 'קושיות', sublabel: 'Questions', icon: '❓', description: 'Track your questions' },
  { id: 'insights', label: 'חידושים', sublabel: 'Insights', icon: '✨', description: 'Record novel insights' },
  { id: 'progress', label: 'התקדמות', sublabel: 'Progress', icon: '📈', description: 'Track mastery' },
  { id: 'chazara', label: 'חזרה', sublabel: 'Chazara', icon: '🔄', description: 'Spaced repetition review' },
  { id: 'today', label: 'היום', sublabel: 'Today', icon: '📅', description: "Today's summary" }
];

// =============================================================================
// Questions Section (from KushyaTracker)
// =============================================================================
const QuestionsSection = ({ currentContext }) => {
  const {
    kushyot = [],
    addKushya,
    resolveKushya,
    deferKushya,
    deleteKushya,
    getOpenKushyot
  } = useStudyMode();

  const [newQuestion, setNewQuestion] = useState('');
  const [priority, setPriority] = useState('normal');
  const [filter, setFilter] = useState('open');
  const [expandedId, setExpandedId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [terutz, setTerutz] = useState('');

  const filteredKushyot = kushyot.filter(k => {
    if (filter === 'all') return true;
    return k.status === filter;
  });

  const openCount = getOpenKushyot?.()?.length || 0;

  const handleAddQuestion = useCallback(() => {
    if (newQuestion.trim() && addKushya) {
      addKushya(newQuestion.trim(), { ...currentContext, priority });
      setNewQuestion('');
      setPriority('normal');
    }
  }, [newQuestion, currentContext, priority, addKushya]);

  const handleResolve = useCallback((id) => {
    if (terutz.trim() && resolveKushya) {
      resolveKushya(id, terutz.trim());
      setTerutz('');
      setResolvingId(null);
    }
  }, [terutz, resolveKushya]);

  const formatRef = (ctx) => {
    if (!ctx) return '';
    return `${ctx.book} ${ctx.chapter}:${ctx.verse}`;
  };

  const priorityColors = {
    low: '#94a3b8',
    normal: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };

  return (
    <div className="questions-section">
      {/* Add Question Form */}
      <div className="add-form">
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="מה הקושיא? What's your question about this text?"
          rows={2}
        />
        <div className="form-row">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            className="btn-primary"
            onClick={handleAddQuestion}
            disabled={!newQuestion.trim()}
          >
            Add Question
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['open', 'resolved', 'deferred', 'all'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'open' && openCount > 0 && (
              <span className="count">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="questions-list">
        {filteredKushyot.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📚</span>
            <p>No {filter === 'all' ? '' : filter} questions.</p>
            <p className="hebrew-quote">אין לומדין תורה אלא מתוך קושיא</p>
          </div>
        ) : (
          filteredKushyot.map(k => (
            <div
              key={k.id}
              className={`question-item status-${k.status}`}
            >
              <div
                className="question-header"
                onClick={() => setExpandedId(expandedId === k.id ? null : k.id)}
              >
                <span className="status-icon">
                  {k.status === 'resolved' ? '✅' : k.status === 'deferred' ? '⏳' : '❓'}
                </span>
                <div className="question-main">
                  <p className="question-text">{k.text}</p>
                  <div className="question-meta">
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: priorityColors[k.priority] }}
                    >
                      {k.priority}
                    </span>
                    {k.context && (
                      <span className="context-ref">{formatRef(k.context)}</span>
                    )}
                  </div>
                </div>
                <span className="expand-icon">{expandedId === k.id ? '▼' : '▶'}</span>
              </div>

              {expandedId === k.id && (
                <div className="question-body">
                  {k.status === 'resolved' && k.terutz && (
                    <div className="terutz-display">
                      <div className="terutz-label">תירוץ:</div>
                      <p>{k.terutz}</p>
                    </div>
                  )}

                  {k.status === 'open' && resolvingId !== k.id && (
                    <div className="question-actions">
                      <button onClick={() => setResolvingId(k.id)}>✅ Resolve</button>
                      <button onClick={() => deferKushya?.(k.id)}>⏳ Defer</button>
                      <button onClick={() => deleteKushya?.(k.id)}>🗑️ Delete</button>
                    </div>
                  )}

                  {resolvingId === k.id && (
                    <div className="resolve-form">
                      <textarea
                        value={terutz}
                        onChange={(e) => setTerutz(e.target.value)}
                        placeholder="Enter the terutz (answer)..."
                        rows={2}
                      />
                      <div className="form-actions">
                        <button onClick={() => handleResolve(k.id)} disabled={!terutz.trim()}>
                          Save
                        </button>
                        <button onClick={() => { setResolvingId(null); setTerutz(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Insights Section (Chiddushim from LimmudLog)
// =============================================================================
const InsightsSection = ({ currentBook, currentChapter }) => {
  const [learningLog, setLearningLog] = useLocalStorage('limmudLog', {
    entries: [],
    chiddushim: []
  });

  const [newInsight, setNewInsight] = useState('');
  const [source, setSource] = useState('');

  const addInsight = useCallback(() => {
    if (!newInsight.trim()) return;

    const insight = {
      id: `insight_${Date.now()}`,
      text: newInsight.trim(),
      source: source.trim() || null,
      reference: currentBook && currentChapter
        ? `${currentBook} ${currentChapter}`
        : 'General',
      timestamp: Date.now()
    };

    setLearningLog(prev => ({
      ...prev,
      chiddushim: [insight, ...prev.chiddushim]
    }));

    setNewInsight('');
    setSource('');
  }, [newInsight, source, currentBook, currentChapter, setLearningLog]);

  const deleteInsight = useCallback((id) => {
    setLearningLog(prev => ({
      ...prev,
      chiddushim: prev.chiddushim.filter(c => c.id !== id)
    }));
  }, [setLearningLog]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="insights-section">
      {/* Add Insight Form */}
      <div className="add-form">
        <textarea
          value={newInsight}
          onChange={(e) => setNewInsight(e.target.value)}
          placeholder="Write your chiddush (novel insight)..."
          rows={3}
        />
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source/Inspiration (optional)"
        />
        <button
          className="btn-primary"
          onClick={addInsight}
          disabled={!newInsight.trim()}
        >
          ✨ Save Insight
        </button>
      </div>

      {/* Insights List */}
      <div className="insights-list">
        {learningLog.chiddushim.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✨</span>
            <p>No insights recorded yet.</p>
            <p className="hebrew-quote">אין בית המדרש בלא חידוש</p>
            <p className="translation">"No study hall without novel insights"</p>
          </div>
        ) : (
          learningLog.chiddushim.map(insight => (
            <div key={insight.id} className="insight-item">
              <div className="insight-header">
                <span className="insight-ref">{insight.reference}</span>
                <span className="insight-date">{formatDate(insight.timestamp)}</span>
              </div>
              <p className="insight-text">{insight.text}</p>
              {insight.source && (
                <div className="insight-source">Based on: {insight.source}</div>
              )}
              <button
                className="delete-btn"
                onClick={() => deleteInsight(insight.id)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Progress Section (Enhanced with useMastery + ChapterHeatmap + Siyum)
// =============================================================================
const ProgressSection = ({ currentBook, currentChapter, currentVerse, totalVerses, onNavigateToVerse }) => {
  const {
    getVerseMastery,
    setVerseMastery,
    getStats,
    getDueForReview,
    hasChapterSiyum,
    markChapterSiyum,
    getChapterCompletionProgress,
    getSiyumim
  } = useMastery();

  const [view, setView] = useState('overview'); // overview, heatmap, siyum
  const [showCelebration, setShowCelebration] = useState(false);

  const stats = getStats();
  const dueItems = getDueForReview();
  const siyumim = getSiyumim();

  // Chapter completion progress
  const completionProgress = currentBook && currentChapter
    ? getChapterCompletionProgress(currentBook, currentChapter, totalVerses || 30)
    : { progress: 0, eligible: false };

  const hasSiyum = currentBook && currentChapter
    ? hasChapterSiyum(currentBook, currentChapter)
    : false;

  // Handle marking a siyum
  const handleMarkSiyum = useCallback(() => {
    if (currentBook && currentChapter && totalVerses) {
      markChapterSiyum(currentBook, currentChapter, totalVerses);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [currentBook, currentChapter, totalVerses, markChapterSiyum]);

  // Generate verse cells for heatmap
  const verseCount = totalVerses || 30;
  const verseCells = Array.from({ length: verseCount }, (_, i) => i + 1);

  return (
    <div className="progress-section enhanced">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="siyum-celebration">
          <div className="celebration-content">
            <span className="celebration-emoji">🎉</span>
            <h3>מזל טוב!</h3>
            <p>Siyum on {currentBook} Chapter {currentChapter}</p>
            <span className="celebration-subtitle">הדרן עלך</span>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="progress-view-toggle">
        <button
          className={`view-btn ${view === 'overview' ? 'active' : ''}`}
          onClick={() => setView('overview')}
        >
          📊 Stats
        </button>
        <button
          className={`view-btn ${view === 'heatmap' ? 'active' : ''}`}
          onClick={() => setView('heatmap')}
        >
          🗺️ Heatmap
        </button>
        <button
          className={`view-btn ${view === 'siyum' ? 'active' : ''}`}
          onClick={() => setView('siyum')}
        >
          🎉 Siyum {siyumim.length > 0 && `(${siyumim.length})`}
        </button>
      </div>

      {/* Stats Overview */}
      {view === 'overview' && (
        <>
          <div className="stats-overview">
            <div className="stat-card">
              <span className="stat-value">{stats.total || 0}</span>
              <span className="stat-label">Verses Tracked</span>
            </div>
            <div className="stat-card highlight">
              <span className="stat-value">{stats.mastered || 0}</span>
              <span className="stat-label">Mastered</span>
            </div>
            <div className="stat-card warning">
              <span className="stat-value">{dueItems.length}</span>
              <span className="stat-label">Due Review</span>
            </div>
          </div>

          {/* Level Breakdown */}
          <div className="level-breakdown">
            <h4>Understanding Levels</h4>
            <div className="level-bars">
              {Object.entries(MASTERY_LEVELS).map(([level, config]) => {
                const count = stats.byLevel?.[level] || 0;
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

                return (
                  <div key={level} className="level-bar-row">
                    <span className="level-icon" style={{ color: config.color }}>
                      {config.icon}
                    </span>
                    <span className="level-name">{config.hebrewName}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{ width: `${percentage}%`, backgroundColor: config.color }}
                      />
                    </div>
                    <span className="level-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Due for Review Banner */}
          {dueItems.length > 0 && (
            <div className="due-review-banner">
              <div className="banner-icon">🔔</div>
              <div className="banner-content">
                <span className="banner-title">{dueItems.length} items due for review!</span>
                <span className="banner-subtitle">Spaced repetition helps retention</span>
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div className="motivational-message">
            <span className="motiv-icon">
              {stats.total === 0 ? '🌱' : stats.mastered >= stats.total / 2 ? '🏆' : '📚'}
            </span>
            <span className="motiv-text">
              {stats.total === 0
                ? 'Start tracking! Rate verses as you study.'
                : stats.mastered >= stats.total / 2
                  ? 'Amazing! You\'ve mastered over half your verses!'
                  : `${stats.total} verses tracked! Keep going.`}
            </span>
          </div>
        </>
      )}

      {/* Chapter Heatmap */}
      {view === 'heatmap' && (
        <div className="chapter-heatmap">
          <div className="heatmap-header">
            <h4>{currentBook || 'Select a book'} {currentChapter ? `Chapter ${currentChapter}` : ''}</h4>
            <div className="heatmap-legend">
              {[0, 1, 2, 3, 4, 5].map(level => (
                <span
                  key={level}
                  className="legend-item"
                  style={{ background: MASTERY_LEVELS[level].color }}
                  title={`${MASTERY_LEVELS[level].name} (${MASTERY_LEVELS[level].hebrewName})`}
                />
              ))}
            </div>
          </div>
          {currentBook && currentChapter ? (
            <div className="heatmap-grid">
              {verseCells.map(v => {
                const level = getVerseMastery(currentBook, currentChapter, v);
                const config = MASTERY_LEVELS[level];
                const isCurrent = v === currentVerse;

                return (
                  <button
                    key={v}
                    className={`heatmap-cell ${isCurrent ? 'current' : ''}`}
                    style={{ background: config.color }}
                    onClick={() => onNavigateToVerse?.(v)}
                    title={`Verse ${v}: ${config.name} (${config.hebrewName})`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🗺️</span>
              <p>Select a chapter to see verse mastery</p>
            </div>
          )}

          {/* Quick Rate Current Verse */}
          {currentBook && currentChapter && currentVerse && (
            <div className="quick-rate">
              <span className="rate-label">Rate verse {currentVerse}:</span>
              <div className="rate-buttons">
                {[0, 1, 2, 3, 4, 5].map(level => {
                  const config = MASTERY_LEVELS[level];
                  const isActive = getVerseMastery(currentBook, currentChapter, currentVerse) === level;
                  return (
                    <button
                      key={level}
                      className={`rate-btn ${isActive ? 'active' : ''}`}
                      style={{ '--level-color': config.color }}
                      onClick={() => setVerseMastery(currentBook, currentChapter, currentVerse, level)}
                      title={`${config.name}: ${config.description}`}
                    >
                      {config.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Siyum Panel */}
      {view === 'siyum' && (
        <div className="siyum-panel">
          {/* Current Chapter Siyum Status */}
          {currentBook && currentChapter && (
            <div className="siyum-current">
              <div className="siyum-header">
                <h4>Chapter Completion</h4>
                <span className="hebrew-title">סיום פרק</span>
              </div>

              {hasSiyum ? (
                <div className="siyum-completed">
                  <span className="siyum-icon">🎉</span>
                  <div className="siyum-info">
                    <span className="siyum-title">Siyum Complete!</span>
                    <span className="siyum-subtitle">{currentBook} Chapter {currentChapter} - מזל טוב!</span>
                  </div>
                </div>
              ) : (
                <div className="siyum-progress">
                  <div className="progress-info">
                    <span className="progress-label">
                      {completionProgress.versesAtBekiut || 0} / {totalVerses || '?'} verses at Bekiut level
                    </span>
                    <span className="progress-percent">{Math.round(completionProgress.progress)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${completionProgress.progress}%`,
                        background: completionProgress.eligible
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : '#94a3b8'
                      }}
                    />
                  </div>
                  {completionProgress.eligible ? (
                    <button className="siyum-btn ready" onClick={handleMarkSiyum}>
                      <span className="btn-icon">🎊</span>
                      <span className="btn-text">Mark Siyum!</span>
                      <span className="btn-hebrew">עשה סיום</span>
                    </button>
                  ) : (
                    <p className="siyum-hint">
                      Reach 80% at Bekiut level (בקיאות) to mark a siyum
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Past Siyumim List */}
          <div className="siyumim-list">
            <h4>Your Siyumim 🎉</h4>
            {siyumim.length === 0 ? (
              <p className="no-siyumim">No siyumim yet. Keep learning!</p>
            ) : (
              <div className="siyumim-items">
                {siyumim.slice(0, 10).map(s => (
                  <div key={s.key} className="siyum-item">
                    <span className="siyum-badge">🎉</span>
                    <span className="siyum-ref">
                      {s.siyumType === 'chapter' ? `${s.book} Ch. ${s.chapter}` : s.book}
                    </span>
                    <span className="siyum-date">
                      {new Date(s.completedAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Chazara Section - Guided Spaced Repetition Review
// =============================================================================
const ChazaraSection = ({ onNavigateToVerse }) => {
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

// =============================================================================
// Today Section (with StudyModeSelector)
// =============================================================================
const TodaySection = ({ currentBook, currentChapter }) => {
  const [learningLog] = useLocalStorage('limmudLog', {
    entries: [],
    chiddushim: []
  });

  const {
    kushyot = [],
    getOpenKushyot,
    currentMode,
    switchMode,
    features,
    currentSession
  } = useStudyMode();

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayInsights = learningLog.chiddushim.filter(c => c.timestamp >= todayTimestamp);
    const todayQuestions = kushyot.filter(k => k.createdAt >= todayTimestamp);
    const todayResolved = kushyot.filter(k =>
      k.status === 'resolved' && k.resolvedAt >= todayTimestamp
    );

    // Calculate streak (simple version)
    let streak = 0;
    const dates = learningLog.chiddushim.map(c => {
      const d = new Date(c.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);

    if (uniqueDates.length > 0 && uniqueDates[0] === todayTimestamp) {
      streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const diff = uniqueDates[i - 1] - uniqueDates[i];
        if (diff <= 86400000) { // 1 day in ms
          streak++;
        } else {
          break;
        }
      }
    }

    return {
      insights: todayInsights.length,
      questions: todayQuestions.length,
      resolved: todayResolved.length,
      streak,
      openQuestions: getOpenKushyot?.()?.length || 0
    };
  }, [learningLog, kushyot, getOpenKushyot]);

  const getDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'בוקר טוב', english: 'Good Morning' };
    if (hour < 17) return { text: 'צהריים טובים', english: 'Good Afternoon' };
    if (hour < 21) return { text: 'ערב טוב', english: 'Good Evening' };
    return { text: 'לילה טוב', english: 'Good Night' };
  };

  const greeting = getDayGreeting();

  // Get current mode config
  const modeConfig = STUDY_MODE_CONFIG?.[currentMode] || {
    name: 'עיון',
    englishName: 'In-depth Study',
    icon: '📖',
    description: 'Deep analytical study'
  };

  return (
    <div className="today-section">
      {/* Greeting */}
      <div className="greeting-card">
        <span className="greeting-hebrew">{greeting.text}</span>
        <span className="greeting-english">{greeting.english}</span>
        {todayStats.streak > 1 && (
          <div className="streak-badge">
            🔥 {todayStats.streak} day streak!
          </div>
        )}
      </div>

      {/* Study Mode Selector (from YeshivaTab) */}
      <div className="study-mode-selector-card">
        <div className="mode-header">
          <h4>לימוד Mode</h4>
          {currentSession && (
            <span className="session-active">Session Active</span>
          )}
        </div>
        <div className="mode-buttons">
          {STUDY_MODE_CONFIG && Object.entries(STUDY_MODE_CONFIG).map(([mode, config]) => (
            <button
              key={mode}
              className={`mode-btn ${mode === currentMode ? 'active' : ''}`}
              onClick={() => switchMode?.(mode)}
            >
              <span className="mode-icon">{config.icon}</span>
              <span className="mode-name">{config.name}</span>
              <span className="mode-english">{config.englishName?.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        <p className="mode-description">{modeConfig.description}</p>
        <div className="mode-features">
          <FeatureIndicator label="Commentaries" enabled={features?.showAllCommentaries} />
          <FeatureIndicator label="AI" enabled={features?.enableAI} />
          <FeatureIndicator label="Cross-refs" enabled={features?.showCrossRefs} />
          {features?.enableSRS && <FeatureIndicator label="SRS" enabled={true} highlight />}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="today-stats">
        <div className="today-stat">
          <span className="stat-icon">✨</span>
          <span className="stat-value">{todayStats.insights}</span>
          <span className="stat-label">Insights</span>
        </div>
        <div className="today-stat">
          <span className="stat-icon">❓</span>
          <span className="stat-value">{todayStats.questions}</span>
          <span className="stat-label">Questions</span>
        </div>
        <div className="today-stat">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{todayStats.resolved}</span>
          <span className="stat-label">Resolved</span>
        </div>
      </div>

      {/* Open Questions Reminder */}
      {todayStats.openQuestions > 0 && (
        <div className="reminder-card">
          <span className="reminder-icon">📋</span>
          <div className="reminder-content">
            <strong>{todayStats.openQuestions} open questions</strong>
            <p>Consider reviewing and resolving your kushyot</p>
          </div>
        </div>
      )}

      {/* Motivational Quote */}
      <div className="quote-card">
        <p className="quote-text">
          "הלומד תורה מקיים את העולם"
        </p>
        <p className="quote-translation">
          "One who studies Torah sustains the world"
        </p>
      </div>

      {/* Current Context */}
      {currentBook && currentChapter && (
        <div className="context-card">
          <span className="context-label">Currently Studying:</span>
          <span className="context-ref">{currentBook} {currentChapter}</span>
        </div>
      )}
    </div>
  );
};

// Feature indicator component for study mode
const FeatureIndicator = ({ label, enabled, highlight = false }) => (
  <span className={`feature-indicator ${enabled ? 'enabled' : 'disabled'} ${highlight ? 'highlight' : ''}`}>
    <span className="feature-dot">{enabled ? '●' : '○'}</span>
    <span className="feature-label">{label}</span>
  </span>
);

// =============================================================================
// Main NotebookTab Component
// =============================================================================
// =============================================================================
// Export to Markdown
// =============================================================================
const exportToMarkdown = (kushyot, chiddushim) => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  let markdown = `# Torah Study Notes\n`;
  markdown += `*Exported: ${date}*\n\n`;

  // Export Questions
  if (kushyot && kushyot.length > 0) {
    markdown += `## ❓ Questions (קושיות)\n\n`;
    kushyot.forEach((k, idx) => {
      const status = k.status === 'resolved' ? '✅' : k.status === 'deferred' ? '⏸️' : '❓';
      const ref = k.context ? `${k.context.book} ${k.context.chapter}:${k.context.verse}` : '';
      markdown += `### ${idx + 1}. ${status} ${k.question}\n`;
      if (ref) markdown += `*Reference: ${ref}*\n\n`;
      if (k.terutz) markdown += `**Answer:** ${k.terutz}\n\n`;
      markdown += `---\n\n`;
    });
  }

  // Export Insights
  if (chiddushim && chiddushim.length > 0) {
    markdown += `## ✨ Insights (חידושים)\n\n`;
    chiddushim.forEach((c, idx) => {
      const ref = c.context ? `${c.context.book} ${c.context.chapter}` : '';
      markdown += `### ${idx + 1}. ${c.title || 'Insight'}\n`;
      if (ref) markdown += `*${ref}*\n\n`;
      markdown += `${c.content}\n\n`;
      if (c.tags && c.tags.length > 0) {
        markdown += `**Tags:** ${c.tags.join(', ')}\n\n`;
      }
      markdown += `---\n\n`;
    });
  }

  markdown += `\n---\n*Generated by Sefarim Reader*`;

  return markdown;
};

const downloadMarkdown = (content, filename) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const NotebookTab = ({
  selectedBook,
  selectedChapter,
  selectedVerse,
  totalVerses,
  onNavigateToVerse
}) => {
  const [activeSubTab, setActiveSubTab] = useState('questions');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get data from StudyModeContext
  const { kushyot = [], chiddushim = [] } = useStudyMode();

  // Get due items count for badge
  const { getDueForReview } = useMastery();
  const dueCount = getDueForReview().filter(i => i.type === 'verse').length;

  const currentContext = {
    book: selectedBook,
    chapter: selectedChapter,
    verse: selectedVerse?.verse
  };

  const handleSubTabSwitch = useCallback((newTab) => {
    if (newTab === activeSubTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSubTab(newTab);
      setIsTransitioning(false);
    }, 150);
  }, [activeSubTab]);

  const handleExport = useCallback(() => {
    const markdown = exportToMarkdown(kushyot, chiddushim);
    const date = new Date().toISOString().split('T')[0];
    downloadMarkdown(markdown, `torah-notes-${date}.md`);
  }, [kushyot, chiddushim]);

  const totalNotes = (kushyot?.length || 0) + (chiddushim?.length || 0);

  return (
    <div className="notebook-tab">
      {/* Header with export */}
      <div className="notebook-header">
        <span className="notebook-title">📓 מחברת</span>
        {totalNotes > 0 && (
          <button
            className="export-btn"
            onClick={handleExport}
            title="Export notes to Markdown"
          >
            📥 Export ({totalNotes})
          </button>
        )}
      </div>

      {/* Sub-tab navigation */}
      <div className="notebook-sub-tabs">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            className={`sub-tab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => handleSubTabSwitch(tab.id)}
            disabled={isTransitioning}
          >
            <span className="sub-tab-icon">{tab.icon}</span>
            <span className="sub-tab-label">{tab.label}</span>
            <span className="sub-tab-sublabel">{tab.sublabel}</span>
            {tab.id === 'chazara' && dueCount > 0 && (
              <span className="sub-tab-badge">{dueCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className={`notebook-content ${isTransitioning ? 'transitioning' : ''}`}>
        {activeSubTab === 'questions' && (
          <QuestionsSection currentContext={currentContext} />
        )}

        {activeSubTab === 'insights' && (
          <InsightsSection
            currentBook={selectedBook}
            currentChapter={selectedChapter}
          />
        )}

        {activeSubTab === 'progress' && (
          <ProgressSection
            currentBook={selectedBook}
            currentChapter={selectedChapter}
            currentVerse={selectedVerse?.verse}
            totalVerses={totalVerses}
            onNavigateToVerse={onNavigateToVerse}
          />
        )}

        {activeSubTab === 'chazara' && (
          <ChazaraSection onNavigateToVerse={onNavigateToVerse} />
        )}

        {activeSubTab === 'today' && (
          <TodaySection
            currentBook={selectedBook}
            currentChapter={selectedChapter}
          />
        )}
      </div>
    </div>
  );
};

NotebookTab.propTypes = {
  selectedBook: PropTypes.string,
  selectedChapter: PropTypes.number,
  selectedVerse: PropTypes.object,
  totalVerses: PropTypes.number,
  onNavigateToVerse: PropTypes.func
};

export default NotebookTab;
