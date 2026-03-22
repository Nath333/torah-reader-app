/**
 * LimmudLog - Learning Progress Tracker
 *
 * In yeshiva, tracking what you've learned is crucial:
 * - What sedarim (sections) have you covered
 * - What's your understanding level
 * - When did you last review (chazara)
 * - Notes and chiddushim (novel insights)
 *
 * This enables:
 * - Systematic progress tracking
 * - Spaced repetition reminders
 * - Personal chiddush journal
 * - Learning statistics
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useStudyMode } from '../../context/StudyModeContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import './LimmudLog.css';

// =============================================================================
// Understanding Levels
// =============================================================================

const UNDERSTANDING_LEVELS = {
  0: { label: 'Not Started', hebrew: 'טרם', icon: '○', color: '#bdc3c7' },
  1: { label: 'First Pass', hebrew: 'עבר פעם ראשונה', icon: '◔', color: '#3498db' },
  2: { label: 'Basic Understanding', hebrew: 'הבנה בסיסית', icon: '◑', color: '#f39c12' },
  3: { label: 'Good Understanding', hebrew: 'הבנה טובה', icon: '◕', color: '#27ae60' },
  4: { label: 'Deep Understanding', hebrew: 'הבנה עמוקה', icon: '●', color: '#8e44ad' },
  5: { label: 'Mastery', hebrew: 'בקיאות', icon: '★', color: '#f1c40f' }
};

// =============================================================================
// Chiddush (Novel Insight) Component
// =============================================================================

const ChiddushEntry = ({ chiddush, onDelete }) => {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="chiddush-entry">
      <div className="chiddush-header">
        <span className="chiddush-ref">{chiddush.reference}</span>
        <span className="chiddush-date">{formatDate(chiddush.timestamp)}</span>
      </div>
      <p className="chiddush-text">{chiddush.text}</p>
      {chiddush.source && (
        <div className="chiddush-source">Based on: {chiddush.source}</div>
      )}
      <button className="delete-chiddush" onClick={() => onDelete(chiddush.id)}>
        ✕
      </button>
    </div>
  );
};

// =============================================================================
// Progress Card Component
// =============================================================================

const ProgressCard = ({ entry, onUpdateLevel, onAddChazara }) => {
  const level = UNDERSTANDING_LEVELS[entry.level || 0];
  const daysSinceReview = entry.lastReview
    ? Math.floor((Date.now() - entry.lastReview) / (1000 * 60 * 60 * 24))
    : null;

  const needsReview = daysSinceReview !== null && daysSinceReview > 7;

  return (
    <div className={`progress-card ${needsReview ? 'needs-review' : ''}`}>
      <div className="card-main">
        <div className="card-reference">
          <span className="book">{entry.book}</span>
          <span className="chapter">Chapter {entry.chapter}</span>
        </div>

        <div className="understanding-indicator" style={{ color: level.color }}>
          <span className="level-icon">{level.icon}</span>
          <span className="level-label">{level.hebrew}</span>
        </div>
      </div>

      <div className="card-details">
        <div className="detail-row">
          <span className="label">Sessions:</span>
          <span className="value">{entry.sessions || 0}</span>
        </div>
        <div className="detail-row">
          <span className="label">Time Spent:</span>
          <span className="value">{formatTime(entry.totalTime || 0)}</span>
        </div>
        {daysSinceReview !== null && (
          <div className={`detail-row ${needsReview ? 'warning' : ''}`}>
            <span className="label">Last Review:</span>
            <span className="value">
              {daysSinceReview === 0 ? 'Today' : `${daysSinceReview} days ago`}
            </span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <select
          value={entry.level || 0}
          onChange={(e) => onUpdateLevel(entry.id, parseInt(e.target.value))}
          className="level-select"
        >
          {Object.entries(UNDERSTANDING_LEVELS).map(([val, info]) => (
            <option key={val} value={val}>{info.label}</option>
          ))}
        </select>
        <button
          className="chazara-btn"
          onClick={() => onAddChazara(entry.id)}
          title="Mark as reviewed"
        >
          🔄 Chazara
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const LimmudLog = ({ currentBook, currentChapter }) => {
  // eslint-disable-next-line no-unused-vars
  const { getStudyStats, currentSession } = useStudyMode();

  // Storage
  const [learningLog, setLearningLog] = useLocalStorage('limmudLog', {
    entries: [],
    chiddushim: [],
    goals: {}
  });

  // Local state
  const [activeTab, setActiveTab] = useState('progress'); // progress, chiddushim, stats
  const [newChiddush, setNewChiddush] = useState('');
  const [chiddushSource, setChiddushSource] = useState('');
  const [showAddChiddush, setShowAddChiddush] = useState(false);
  const [filter, setFilter] = useState('all'); // all, needs-review, mastered

  // =============================================================================
  // Entry Management
  // =============================================================================

  // eslint-disable-next-line no-unused-vars
  const getOrCreateEntry = useCallback((book, chapter) => {
    const existing = learningLog.entries.find(
      e => e.book === book && e.chapter === chapter
    );

    if (existing) return existing;

    const newEntry = {
      id: `entry_${Date.now()}`,
      book,
      chapter,
      level: 0,
      sessions: 0,
      totalTime: 0,
      lastReview: null,
      firstStudied: Date.now(),
      notes: []
    };

    setLearningLog(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));

    return newEntry;
  }, [learningLog.entries, setLearningLog]);

  const updateEntryLevel = useCallback((entryId, level) => {
    setLearningLog(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.id === entryId ? { ...e, level } : e
      )
    }));
  }, [setLearningLog]);

  const markChazara = useCallback((entryId) => {
    setLearningLog(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.id === entryId
          ? { ...e, lastReview: Date.now(), sessions: (e.sessions || 0) + 1 }
          : e
      )
    }));
  }, [setLearningLog]);

  // =============================================================================
  // Chiddush Management
  // =============================================================================

  const addChiddush = useCallback(() => {
    if (!newChiddush.trim()) return;

    const chiddush = {
      id: `chiddush_${Date.now()}`,
      text: newChiddush.trim(),
      source: chiddushSource.trim() || null,
      reference: currentBook && currentChapter
        ? `${currentBook} ${currentChapter}`
        : 'General',
      timestamp: Date.now()
    };

    setLearningLog(prev => ({
      ...prev,
      chiddushim: [chiddush, ...prev.chiddushim]
    }));

    setNewChiddush('');
    setChiddushSource('');
    setShowAddChiddush(false);
  }, [newChiddush, chiddushSource, currentBook, currentChapter, setLearningLog]);

  const deleteChiddush = useCallback((id) => {
    setLearningLog(prev => ({
      ...prev,
      chiddushim: prev.chiddushim.filter(c => c.id !== id)
    }));
  }, [setLearningLog]);

  // =============================================================================
  // Statistics
  // =============================================================================

  const stats = useMemo(() => {
    const entries = learningLog.entries;
    const chiddushim = learningLog.chiddushim;

    const totalSections = entries.length;
    const masteredSections = entries.filter(e => e.level >= 4).length;
    const needsReview = entries.filter(e => {
      if (!e.lastReview) return false;
      const days = (Date.now() - e.lastReview) / (1000 * 60 * 60 * 24);
      return days > 7;
    }).length;

    const totalTime = entries.reduce((acc, e) => acc + (e.totalTime || 0), 0);
    const totalSessions = entries.reduce((acc, e) => acc + (e.sessions || 0), 0);

    const byLevel = {};
    for (const [level] of Object.entries(UNDERSTANDING_LEVELS)) {
      byLevel[level] = entries.filter(e => (e.level || 0) === parseInt(level)).length;
    }

    return {
      totalSections,
      masteredSections,
      needsReview,
      totalTime,
      totalSessions,
      totalChiddushim: chiddushim.length,
      byLevel,
      masteryRate: totalSections > 0
        ? Math.round((masteredSections / totalSections) * 100)
        : 0
    };
  }, [learningLog]);

  // =============================================================================
  // Filtered Entries
  // =============================================================================

  const filteredEntries = useMemo(() => {
    return learningLog.entries.filter(e => {
      if (filter === 'all') return true;
      if (filter === 'needs-review') {
        if (!e.lastReview) return false;
        const days = (Date.now() - e.lastReview) / (1000 * 60 * 60 * 24);
        return days > 7;
      }
      if (filter === 'mastered') return e.level >= 4;
      return true;
    }).sort((a, b) => {
      // Sort by last review (oldest first for needs-review)
      if (a.lastReview && b.lastReview) {
        return a.lastReview - b.lastReview;
      }
      return (b.firstStudied || 0) - (a.firstStudied || 0);
    });
  }, [learningLog.entries, filter]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="limmud-log">
      {/* Header */}
      <div className="log-header">
        <h3>📚 לימוד Log</h3>
        {currentSession && (
          <span className="session-indicator">Session Active</span>
        )}
      </div>

      {/* Tabs */}
      <div className="log-tabs">
        <button
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          className={`tab ${activeTab === 'chiddushim' ? 'active' : ''}`}
          onClick={() => setActiveTab('chiddushim')}
        >
          Chiddushim ({learningLog.chiddushim.length})
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </div>

      {/* Content */}
      <div className="log-content">
        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="progress-tab">
            <div className="filter-bar">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Sections</option>
                <option value="needs-review">Needs Review ({stats.needsReview})</option>
                <option value="mastered">Mastered ({stats.masteredSections})</option>
              </select>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📖</span>
                <p>No learning recorded yet.</p>
                <p>Start studying to track your progress!</p>
              </div>
            ) : (
              <div className="progress-list">
                {filteredEntries.map(entry => (
                  <ProgressCard
                    key={entry.id}
                    entry={entry}
                    onUpdateLevel={updateEntryLevel}
                    onAddChazara={markChazara}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chiddushim Tab */}
        {activeTab === 'chiddushim' && (
          <div className="chiddushim-tab">
            <button
              className="add-chiddush-btn"
              onClick={() => setShowAddChiddush(!showAddChiddush)}
            >
              {showAddChiddush ? '✕ Cancel' : '✨ Add Chiddush'}
            </button>

            {showAddChiddush && (
              <div className="add-chiddush-form">
                <textarea
                  value={newChiddush}
                  onChange={(e) => setNewChiddush(e.target.value)}
                  placeholder="Write your chiddush (novel insight)..."
                  rows={4}
                />
                <input
                  type="text"
                  value={chiddushSource}
                  onChange={(e) => setChiddushSource(e.target.value)}
                  placeholder="Source/Inspiration (optional)"
                />
                <button
                  className="save-chiddush-btn"
                  onClick={addChiddush}
                  disabled={!newChiddush.trim()}
                >
                  Save Chiddush
                </button>
              </div>
            )}

            {learningLog.chiddushim.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✨</span>
                <p>No chiddushim recorded yet.</p>
                <p className="hebrew-quote">
                  אין בית המדרש בלא חידוש
                </p>
                <p className="translation">
                  "There is no study hall without novel insights"
                </p>
              </div>
            ) : (
              <div className="chiddushim-list">
                {learningLog.chiddushim.map(chiddush => (
                  <ChiddushEntry
                    key={chiddush.id}
                    chiddush={chiddush}
                    onDelete={deleteChiddush}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="stats-tab">
            <div className="stat-cards">
              <div className="stat-card">
                <span className="stat-value">{stats.totalSections}</span>
                <span className="stat-label">Sections Studied</span>
              </div>
              <div className="stat-card highlight">
                <span className="stat-value">{stats.masteryRate}%</span>
                <span className="stat-label">Mastery Rate</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.totalSessions}</span>
                <span className="stat-label">Total Sessions</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{formatTime(stats.totalTime)}</span>
                <span className="stat-label">Time Learning</span>
              </div>
            </div>

            <div className="level-breakdown">
              <h4>Understanding Breakdown</h4>
              <div className="level-bars">
                {Object.entries(UNDERSTANDING_LEVELS).map(([level, info]) => {
                  const count = stats.byLevel[level] || 0;
                  const percentage = stats.totalSections > 0
                    ? (count / stats.totalSections) * 100
                    : 0;

                  return (
                    <div key={level} className="level-bar-row">
                      <span className="level-icon" style={{ color: info.color }}>
                        {info.icon}
                      </span>
                      <span className="level-name">{info.label}</span>
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: info.color
                          }}
                        />
                      </div>
                      <span className="level-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {stats.needsReview > 0 && (
              <div className="review-reminder">
                <span className="reminder-icon">🔔</span>
                <span>
                  <strong>{stats.needsReview}</strong> sections need review
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default LimmudLog;
export { UNDERSTANDING_LEVELS };
