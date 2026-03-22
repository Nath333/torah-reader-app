/**
 * MasteryTab - Progress and Mastery Tracking for Scholar Mode
 *
 * Tracks understanding levels for verses, chapters, and concepts.
 * Features spaced repetition reminders and motivational feedback.
 * Includes Yeshiva-style learning tools: questions, chiddushim notes, commentary tracking.
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import MasteryTracker, {
  ChapterMasteryOverview,
  MasteryStatsDashboard
} from '../study/MasteryTracker';
import useMastery, { MASTERY_LEVELS } from '../../hooks/useMastery';
import './StudyToolsTab.css';

// Common commentaries for "Learned With" tracking
const COMMON_COMMENTARIES = [
  { id: 'rashi', name: 'Rashi', hebrewName: 'רש״י' },
  { id: 'ramban', name: 'Ramban', hebrewName: 'רמב״ן' },
  { id: 'ibn-ezra', name: 'Ibn Ezra', hebrewName: 'אבן עזרא' },
  { id: 'sforno', name: 'Sforno', hebrewName: 'ספורנו' },
  { id: 'onkelos', name: 'Onkelos', hebrewName: 'אונקלוס' },
  { id: 'ohr-hachaim', name: 'Ohr HaChaim', hebrewName: 'אור החיים' }
];

// =============================================================================
// Mastery Level Guide - Explains the system
// =============================================================================

const MasteryGuide = React.memo(function MasteryGuide({ onClose }) {
  return (
    <div className="mastery-guide">
      <div className="guide-header">
        <h5>Understanding Levels</h5>
        <button className="guide-close" onClick={onClose}>×</button>
      </div>
      <div className="guide-levels">
        {Object.entries(MASTERY_LEVELS).map(([level, config]) => (
          <div key={level} className="guide-level" style={{ '--level-color': config.color }}>
            <span className="guide-icon">{config.icon}</span>
            <div className="guide-info">
              <span className="guide-name">{config.name}</span>
              <span className="guide-desc">{config.description}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="guide-tip">
        Rate honestly - the system uses spaced repetition to schedule reviews!
      </p>
    </div>
  );
});

// =============================================================================
// Due for Review Banner - Surfaces spaced repetition
// =============================================================================

const DueForReviewBanner = React.memo(function DueForReviewBanner({ dueItems, onReviewClick }) {
  if (!dueItems || dueItems.length === 0) return null;

  const urgentCount = dueItems.filter(i => i.level <= 2).length;

  return (
    <div className={`due-review-banner ${urgentCount > 0 ? 'urgent' : ''}`}>
      <div className="banner-icon">🔔</div>
      <div className="banner-content">
        <span className="banner-title">
          {urgentCount > 0 ? `${urgentCount} need review soon!` : `${dueItems.length} due for review`}
        </span>
        <span className="banner-subtitle">
          Spaced repetition helps long-term retention
        </span>
      </div>
      <button className="banner-action" onClick={onReviewClick}>
        Review Now
      </button>
    </div>
  );
});

// =============================================================================
// Motivational Message based on progress
// =============================================================================

const MotivationalMessage = React.memo(function MotivationalMessage({ stats }) {
  const message = useMemo(() => {
    if (!stats || stats.total === 0) {
      return { text: "Start your journey! Rate verses as you study.", icon: "🌱" };
    }

    const masteredPercent = stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0;
    const proficientPercent = stats.total > 0 ? ((stats.mastered + stats.proficient) / stats.total) * 100 : 0;

    if (masteredPercent >= 50) {
      return { text: "Amazing! You've mastered over half your verses!", icon: "🏆" };
    }
    if (proficientPercent >= 50) {
      return { text: "Great progress! Keep reviewing to reach mastery.", icon: "⭐" };
    }
    if (stats.total >= 10) {
      return { text: `${stats.total} verses tracked! Consistency is key.`, icon: "📚" };
    }
    if (stats.totalReviews >= 5) {
      return { text: "Good habit forming! Regular review builds memory.", icon: "💪" };
    }
    return { text: "Track your understanding to boost retention!", icon: "🎯" };
  }, [stats]);

  return (
    <div className="motivational-message">
      <span className="motiv-icon">{message.icon}</span>
      <span className="motiv-text">{message.text}</span>
    </div>
  );
});

// =============================================================================
// Chapter Heatmap - Visual grid showing mastery of all verses
// =============================================================================

const ChapterHeatmap = React.memo(function ChapterHeatmap({
  book,
  chapter,
  totalVerses,
  currentVerse,
  onVerseClick
}) {
  const { getVerseMastery } = useMastery();

  if (!totalVerses || totalVerses === 0) return null;

  const verses = Array.from({ length: totalVerses }, (_, i) => i + 1);

  return (
    <div className="chapter-heatmap">
      <div className="heatmap-header">
        <h5>Chapter {chapter} Progress</h5>
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
      <div className="heatmap-grid">
        {verses.map(v => {
          const level = getVerseMastery(book, chapter, v);
          const config = MASTERY_LEVELS[level];
          const isCurrent = v === currentVerse;

          return (
            <button
              key={v}
              className={`heatmap-cell ${isCurrent ? 'current' : ''}`}
              style={{ background: config.color }}
              onClick={() => onVerseClick?.(v)}
              title={`Verse ${v}: ${config.name} (${config.hebrewName})`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// =============================================================================
// Yeshiva Learning Tools - Question markers, notes, commentary tracking
// =============================================================================

const YeshivaTools = React.memo(function YeshivaTools({ book, chapter, verse, verseText }) {
  const {
    toggleQuestion,
    getVerseMetadata,
    setVerseNotes,
    toggleLearnedWith
  } = useMastery();

  const [notesInput, setNotesInput] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const metadata = getVerseMetadata(book, chapter, verse);

  // Sync notes input with stored notes when verse changes
  React.useEffect(() => {
    setNotesInput(metadata.notes || '');
    setShowNotes(!!metadata.notes);
  }, [book, chapter, verse, metadata.notes]);

  const handleSaveNotes = useCallback(() => {
    setVerseNotes(book, chapter, verse, notesInput);
  }, [book, chapter, verse, notesInput, setVerseNotes]);

  const verseRef = `${book} ${chapter}:${verse}`;

  return (
    <div className="yeshiva-tools">
      {/* Verse Reference */}
      <div className="yeshiva-verse-ref">
        <span className="ref-text">{verseRef}</span>
        {verseText && (
          <p className="verse-preview" dir="rtl">{verseText.slice(0, 80)}...</p>
        )}
      </div>

      {/* Question Marker */}
      <div className="tool-section question-section">
        <button
          className={`question-toggle ${metadata.hasQuestion ? 'active' : ''}`}
          onClick={() => toggleQuestion(book, chapter, verse)}
          title={metadata.hasQuestion ? 'Remove question flag' : 'Mark for asking Rebbe/teacher'}
        >
          <span className="toggle-icon">{metadata.hasQuestion ? '❓' : '?'}</span>
          <span className="toggle-text">
            {metadata.hasQuestion ? 'Question flagged' : 'Ask the Rebbe'}
          </span>
          <span className="toggle-hebrew">שאלה לרב</span>
        </button>
        {metadata.hasQuestion && (
          <p className="question-hint">This verse is marked for discussion with your teacher</p>
        )}
      </div>

      {/* Learned With Tracking */}
      <div className="tool-section learned-with-section">
        <h5 className="section-title">
          <span>Learned With</span>
          <span className="hebrew-title">נלמד עם</span>
        </h5>
        <div className="commentary-toggles">
          {COMMON_COMMENTARIES.map(comm => {
            const isChecked = metadata.learnedWith.includes(comm.id);
            return (
              <button
                key={comm.id}
                className={`commentary-toggle ${isChecked ? 'active' : ''}`}
                onClick={() => toggleLearnedWith(book, chapter, verse, comm.id)}
                title={`${comm.name} (${comm.hebrewName})`}
              >
                <span className="comm-check">{isChecked ? '✓' : ''}</span>
                <span className="comm-name">{comm.hebrewName}</span>
              </button>
            );
          })}
        </div>
        {metadata.learnedWith.length > 0 && (
          <p className="learned-summary">
            Studied with {metadata.learnedWith.length} commentar{metadata.learnedWith.length === 1 ? 'y' : 'ies'}
          </p>
        )}
      </div>

      {/* Chiddushim Notes */}
      <div className="tool-section notes-section">
        <button
          className="notes-toggle"
          onClick={() => setShowNotes(!showNotes)}
        >
          <span className="toggle-icon">{metadata.notes ? '📝' : '✏️'}</span>
          <span className="toggle-text">
            {metadata.notes ? 'View Chiddushim' : 'Add Chiddushim'}
          </span>
          <span className="toggle-hebrew">חידושים</span>
          <span className="expand-icon">{showNotes ? '▲' : '▼'}</span>
        </button>

        {showNotes && (
          <div className="notes-editor">
            <textarea
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              placeholder="Write your insights, questions, or connections..."
              className="notes-input"
              rows={4}
            />
            <div className="notes-actions">
              <button
                className="save-notes-btn"
                onClick={handleSaveNotes}
                disabled={notesInput === metadata.notes}
              >
                Save Notes
              </button>
              {metadata.notes && notesInput !== metadata.notes && (
                <button
                  className="revert-btn"
                  onClick={() => setNotesInput(metadata.notes)}
                >
                  Revert
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// Questions List View - All verses flagged for asking
// =============================================================================

const QuestionsListView = React.memo(function QuestionsListView({ onNavigateToVerse }) {
  const { getVersesWithQuestions, toggleQuestion } = useMastery();
  const questions = getVersesWithQuestions();

  if (questions.length === 0) {
    return (
      <div className="questions-empty">
        <span className="empty-icon">❓</span>
        <h5>No Questions Yet</h5>
        <p>Mark verses with "?" when you have questions to ask your Rebbe or teacher.</p>
      </div>
    );
  }

  return (
    <div className="questions-list">
      <div className="list-header">
        <h5>Questions to Ask</h5>
        <span className="list-count">{questions.length} שאלות</span>
      </div>
      <div className="list-items">
        {questions.map(item => (
          <div key={item.key} className="question-item">
            <button
              className="item-ref"
              onClick={() => onNavigateToVerse?.(item.verse, item.book, item.chapter)}
            >
              {item.book} {item.chapter}:{item.verse}
            </button>
            <button
              className="item-remove"
              onClick={() => toggleQuestion(item.book, item.chapter, item.verse)}
              title="Remove question flag"
            >
              ✓ Answered
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Notes List View - All verses with chiddushim
// =============================================================================

const NotesListView = React.memo(function NotesListView({ onNavigateToVerse }) {
  const { getVersesWithNotes } = useMastery();
  const notes = getVersesWithNotes();

  if (notes.length === 0) {
    return (
      <div className="notes-empty">
        <span className="empty-icon">📝</span>
        <h5>No Chiddushim Yet</h5>
        <p>Add your insights and discoveries as you learn each verse.</p>
      </div>
    );
  }

  return (
    <div className="notes-list">
      <div className="list-header">
        <h5>Your Chiddushim</h5>
        <span className="list-count">{notes.length} חידושים</span>
      </div>
      <div className="list-items">
        {notes.map(item => (
          <div key={item.key} className="note-item">
            <button
              className="item-ref"
              onClick={() => onNavigateToVerse?.(item.verse, item.book, item.chapter)}
            >
              {item.book} {item.chapter}:{item.verse}
            </button>
            <p className="item-preview">{item.notes.slice(0, 100)}{item.notes.length > 100 ? '...' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Siyum (Completion) Celebration & Tracking
// =============================================================================

const SiyumPanel = React.memo(function SiyumPanel({ book, chapter, totalVerses, onNavigateToVerse }) {
  const {
    hasChapterSiyum,
    markChapterSiyum,
    getChapterCompletionProgress,
    getSiyumim
  } = useMastery();

  const [showCelebration, setShowCelebration] = useState(false);
  const hasSiyum = hasChapterSiyum(book, chapter);
  const completionProgress = getChapterCompletionProgress(book, chapter, totalVerses);
  const allSiyumim = getSiyumim();

  const handleMarkSiyum = useCallback(() => {
    markChapterSiyum(book, chapter, totalVerses);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, [book, chapter, totalVerses, markChapterSiyum]);

  return (
    <div className="siyum-panel">
      {/* Current Chapter Siyum Status */}
      {book && chapter && (
        <div className="siyum-current">
          <div className="siyum-header">
            <h5>Chapter Completion</h5>
            <span className="hebrew-title">סיום פרק</span>
          </div>

          {hasSiyum ? (
            <div className="siyum-completed">
              <span className="siyum-icon">🎉</span>
              <div className="siyum-info">
                <span className="siyum-title">Siyum Complete!</span>
                <span className="siyum-subtitle">{book} Chapter {chapter} - מזל טוב!</span>
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

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="siyum-celebration">
          <div className="celebration-content">
            <span className="celebration-emoji">🎉</span>
            <h3>מזל טוב!</h3>
            <p>Siyum on {book} Chapter {chapter}</p>
            <span className="celebration-subtitle">הדרן עלך</span>
          </div>
        </div>
      )}

      {/* Past Siyumim List */}
      <div className="siyumim-list">
        <h5>Your Siyumim</h5>
        {allSiyumim.length === 0 ? (
          <p className="no-siyumim">No siyumim yet. Keep learning!</p>
        ) : (
          <div className="siyumim-items">
            {allSiyumim.slice(0, 10).map(s => (
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
  );
});

// =============================================================================
// Guided Chazara (Review) Session
// =============================================================================

const GuidedChazaraSession = React.memo(function GuidedChazaraSession({ onNavigateToVerse }) {
  const { getDueForReview, incrementMastery, decrementMastery, getVerseMastery } = useMastery();
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
      <div className="chazara-empty">
        <span className="empty-icon">✨</span>
        <h5>All Caught Up!</h5>
        <p>No verses due for review right now.</p>
        <p className="hebrew-text">כל הכבוד!</p>
      </div>
    );
  }

  if (sessionComplete) {
    const rememberedCount = reviewed.filter(r => r.remembered).length;
    return (
      <div className="chazara-complete">
        <span className="complete-icon">🎯</span>
        <h5>Session Complete!</h5>
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
    );
  }

  const currentLevel = currentItem ? getVerseMastery(currentItem.book, currentItem.chapter, currentItem.verse) : 0;
  const levelConfig = MASTERY_LEVELS[currentLevel];

  return (
    <div className="chazara-session">
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
    </div>
  );
});

// =============================================================================
// Main Component - Mastery Tab
// =============================================================================

const MasteryTab = ({
  book,
  chapter,
  verse,
  verseText,
  totalVerses,
  onNavigateToVerse
}) => {
  // Views: 'verse' | 'tools' | 'chapter' | 'overview' | 'review' | 'questions' | 'notes' | 'siyum' | 'chazara'
  const [view, setView] = useState('verse');
  const [showGuide, setShowGuide] = useState(false);

  const { getDueForReview, getStats, getVersesWithQuestions, getVersesWithNotes, getSiyumim } = useMastery();
  const dueItems = getDueForReview();
  const stats = getStats();
  const questionsCount = getVersesWithQuestions().length;
  const notesCount = getVersesWithNotes().length;
  const siyumimCount = getSiyumim().length;

  return (
    <div className="mastery-tab">
      {/* Header with help button */}
      <div className="mastery-header">
        <div className="header-main">
          <span className="mastery-icon">📈</span>
          <div className="header-text">
            <h4>Mastery Tracking</h4>
            <p className="mastery-desc">
              Self-assess to reinforce learning with spaced repetition
            </p>
          </div>
        </div>
        <button
          className="help-btn"
          onClick={() => setShowGuide(!showGuide)}
          title="How mastery levels work"
        >
          ?
        </button>
      </div>

      {/* Guide panel (expandable) */}
      {showGuide && <MasteryGuide onClose={() => setShowGuide(false)} />}

      {/* Due for Review Banner */}
      <DueForReviewBanner
        dueItems={dueItems}
        onReviewClick={() => setView('review')}
      />

      {/* Motivational Message */}
      <MotivationalMessage stats={stats} />

      {/* View Tabs - Two rows for better organization */}
      <div className="mastery-view-tabs">
        <div className="tabs-row primary">
          <button
            className={`view-tab ${view === 'verse' ? 'active' : ''}`}
            onClick={() => setView('verse')}
          >
            Level
          </button>
          <button
            className={`view-tab ${view === 'tools' ? 'active' : ''}`}
            onClick={() => setView('tools')}
          >
            Tools
          </button>
          <button
            className={`view-tab ${view === 'chapter' ? 'active' : ''}`}
            onClick={() => setView('chapter')}
          >
            Chapter
          </button>
          <button
            className={`view-tab ${view === 'overview' ? 'active' : ''}`}
            onClick={() => setView('overview')}
          >
            Stats
          </button>
        </div>
        <div className="tabs-row secondary">
          <button
            className={`view-tab siyum-tab ${view === 'siyum' ? 'active' : ''}`}
            onClick={() => setView('siyum')}
          >
            Siyum {siyumimCount > 0 && `(${siyumimCount})`}
          </button>
          <button
            className={`view-tab chazara-tab ${view === 'chazara' ? 'active' : ''}`}
            onClick={() => setView('chazara')}
          >
            Chazara {dueItems.length > 0 && `(${dueItems.length})`}
          </button>
          <button
            className={`view-tab questions-tab ${view === 'questions' ? 'active' : ''}`}
            onClick={() => setView('questions')}
          >
            Questions {questionsCount > 0 && `(${questionsCount})`}
          </button>
          <button
            className={`view-tab notes-tab ${view === 'notes' ? 'active' : ''}`}
            onClick={() => setView('notes')}
          >
            Notes {notesCount > 0 && `(${notesCount})`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mastery-content">
        {view === 'verse' && book && chapter && verse && (
          <MasteryTracker
            book={book}
            chapter={chapter}
            verse={verse}
            text={verseText}
            mode="card"
          />
        )}

        {view === 'verse' && (!book || !chapter || !verse) && (
          <div className="mastery-empty">
            <span className="empty-icon">📖</span>
            <p>Select a verse to track mastery</p>
            <p className="empty-hint">Click on any verse, then rate your understanding</p>
          </div>
        )}

        {/* Yeshiva Tools View */}
        {view === 'tools' && book && chapter && verse && (
          <YeshivaTools
            book={book}
            chapter={chapter}
            verse={verse}
            verseText={verseText}
          />
        )}

        {view === 'tools' && (!book || !chapter || !verse) && (
          <div className="mastery-empty">
            <span className="empty-icon">📚</span>
            <p>Select a verse to use learning tools</p>
            <p className="empty-hint">Mark questions, track commentaries, add chiddushim</p>
          </div>
        )}

        {/* Questions List View */}
        {view === 'questions' && (
          <QuestionsListView onNavigateToVerse={onNavigateToVerse} />
        )}

        {/* Notes List View */}
        {view === 'notes' && (
          <NotesListView onNavigateToVerse={onNavigateToVerse} />
        )}

        {view === 'chapter' && book && chapter && (
          <>
            <ChapterHeatmap
              book={book}
              chapter={chapter}
              totalVerses={totalVerses || 0}
              currentVerse={verse}
              onVerseClick={onNavigateToVerse}
            />
            <ChapterMasteryOverview
              book={book}
              chapter={chapter}
              totalVerses={totalVerses || 0}
            />
          </>
        )}

        {view === 'chapter' && (!book || !chapter) && (
          <div className="mastery-empty">
            <span className="empty-icon">📑</span>
            <p>Select a chapter to view progress</p>
          </div>
        )}

        {view === 'overview' && (
          <MasteryStatsDashboard />
        )}

        {/* Siyum View - Completion milestones */}
        {view === 'siyum' && (
          <SiyumPanel
            book={book}
            chapter={chapter}
            totalVerses={totalVerses}
            onNavigateToVerse={onNavigateToVerse}
          />
        )}

        {/* Guided Chazara Session */}
        {view === 'chazara' && (
          <GuidedChazaraSession onNavigateToVerse={onNavigateToVerse} />
        )}
      </div>
    </div>
  );
};

MasteryTab.propTypes = {
  book: PropTypes.string,
  chapter: PropTypes.number,
  verse: PropTypes.number,
  verseText: PropTypes.string,
  totalVerses: PropTypes.number,
  onNavigateToVerse: PropTypes.func
};

// Export with both names for backwards compatibility
export { MasteryTab };
export default React.memo(MasteryTab);
