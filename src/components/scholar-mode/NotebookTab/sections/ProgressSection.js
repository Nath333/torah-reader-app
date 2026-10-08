import React, { useState, useCallback } from 'react';
import useMastery, { MASTERY_LEVELS } from '../../../../hooks/useMastery';

// =============================================================================
// Progress Section (Enhanced with useMastery + ChapterHeatmap + Siyum)
// =============================================================================
export const ProgressSection = ({ currentBook, currentChapter, currentVerse, totalVerses, onNavigateToVerse }) => {
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
