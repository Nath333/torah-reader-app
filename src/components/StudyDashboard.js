/**
 * StudyDashboard - Compact study progress and quick actions panel
 *
 * Features:
 * - Study timer with session tracking
 * - Daily progress towards goals
 * - Study streak display
 * - Quick actions for common tasks
 * - Daily learning schedule
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStudySession } from '../hooks/useStudySession';
import { getDailyLearning, getRandomInspiration } from '../services/scholarlyApiService';
import './StudyDashboard.css';

// =============================================================================
// TIMER DISPLAY
// =============================================================================

const TimerDisplay = ({ time, isActive, onStart, onPause, onStop }) => {
  return (
    <div className="timer-display">
      <div className="timer-time">{time}</div>
      <div className="timer-controls">
        {!isActive ? (
          <button className="timer-btn start" onClick={onStart} title="Start studying">
            ▶
          </button>
        ) : (
          <button className="timer-btn pause" onClick={onPause} title="Pause">
            ⏸
          </button>
        )}
        {isActive && (
          <button className="timer-btn stop" onClick={onStop} title="End session">
            ⏹
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// PROGRESS RING
// =============================================================================

const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = '#3B82F6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="progress-ring-bg"
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-progress"
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="progress-ring-text"
      >
        {progress}%
      </text>
    </svg>
  );
};

// =============================================================================
// STREAK DISPLAY
// =============================================================================

const StreakDisplay = ({ current, longest }) => {
  return (
    <div className="streak-display">
      <div className="streak-flame">🔥</div>
      <div className="streak-info">
        <span className="streak-current">{current}</span>
        <span className="streak-label">day streak</span>
      </div>
      {longest > current && (
        <span className="streak-best" title="Personal best">
          Best: {longest}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// DAILY LEARNING ITEM
// =============================================================================

const DailyLearningItem = ({ item, onSelect }) => {
  if (!item) return null;

  return (
    <button
      className="daily-learning-item"
      onClick={() => onSelect(item)}
      title={item.displayValue?.en || item.ref}
    >
      <span className="daily-item-title">
        {item.title?.en || 'Daily Learning'}
      </span>
      <span className="daily-item-value">
        {item.displayValue?.en || item.ref}
      </span>
    </button>
  );
};

// =============================================================================
// QUICK ACTION BUTTON
// =============================================================================

const QuickAction = ({ icon, label, onClick, badge }) => {
  return (
    <button className="quick-action" onClick={onClick} title={label}>
      <span className="quick-action-icon">{icon}</span>
      {badge > 0 && <span className="quick-action-badge">{badge}</span>}
    </button>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StudyDashboard = ({
  onNavigateToText,
  onOpenVocabulary,
  onOpenBookmarks,
  onOpenNotes,
  compact = false
}) => {
  const {
    isActive,
    formattedTime,
    startSession,
    pauseSession,
    endSession,
    streaks,
    getTodayProgress,
    currentSession
  } = useStudySession();

  const [dailyLearning, setDailyLearning] = useState(null);
  const [inspiration, setInspiration] = useState(null);
  const [showInspiration, setShowInspiration] = useState(false);

  // Fetch daily learning on mount
  useEffect(() => {
    const fetchDaily = async () => {
      const learning = await getDailyLearning();
      setDailyLearning(learning);
    };
    fetchDaily();
  }, []);

  // Get fresh inspiration
  const refreshInspiration = useCallback(async () => {
    const text = await getRandomInspiration();
    setInspiration(text);
    setShowInspiration(true);
  }, []);

  const todayProgress = getTodayProgress();

  const handleEndSession = useCallback(() => {
    const session = endSession();
    if (session) {
      // Could show a summary modal here
      console.log('Session ended:', session);
    }
  }, [endSession]);

  const handleDailySelect = useCallback((item) => {
    if (onNavigateToText && item.ref) {
      onNavigateToText(item.ref);
    }
  }, [onNavigateToText]);

  // Compact view for sidebar
  if (compact) {
    return (
      <div className="study-dashboard compact">
        <div className="dashboard-row">
          <TimerDisplay
            time={formattedTime}
            isActive={isActive}
            onStart={startSession}
            onPause={pauseSession}
            onStop={handleEndSession}
          />
          <StreakDisplay current={streaks.current} longest={streaks.longest} />
        </div>

        <div className="progress-row">
          <div className="progress-item" title={`${todayProgress.minutesStudied} / ${todayProgress.goals.dailyMinutes} minutes`}>
            <ProgressRing progress={todayProgress.progress.minutes} size={40} strokeWidth={4} />
            <span className="progress-label">Time</span>
          </div>
          <div className="progress-item" title={`${todayProgress.versesRead} / ${todayProgress.goals.dailyVerses} verses`}>
            <ProgressRing progress={todayProgress.progress.verses} size={40} strokeWidth={4} color="#10B981" />
            <span className="progress-label">Verses</span>
          </div>
          <div className="progress-item" title={`${todayProgress.wordsLearned} / ${todayProgress.goals.dailyVocabulary} words`}>
            <ProgressRing progress={todayProgress.progress.vocabulary} size={40} strokeWidth={4} color="#F59E0B" />
            <span className="progress-label">Words</span>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="study-dashboard">
      {/* Header with timer and streak */}
      <div className="dashboard-header">
        <TimerDisplay
          time={formattedTime}
          isActive={isActive}
          onStart={startSession}
          onPause={pauseSession}
          onStop={handleEndSession}
        />
        <StreakDisplay current={streaks.current} longest={streaks.longest} />
      </div>

      {/* Current session stats (when active) */}
      {isActive && (
        <div className="session-stats">
          <span>📖 {currentSession.versesRead} verses</span>
          <span>📝 {currentSession.wordsLearned} words</span>
          <span>🔖 {currentSession.bookmarksAdded} bookmarks</span>
        </div>
      )}

      {/* Progress towards daily goals */}
      <div className="daily-progress">
        <h4>Today's Progress</h4>
        <div className="progress-grid">
          <div className="progress-item">
            <ProgressRing progress={todayProgress.progress.minutes} />
            <div className="progress-details">
              <span className="progress-value">
                {todayProgress.minutesStudied} / {todayProgress.goals.dailyMinutes}
              </span>
              <span className="progress-label">Minutes</span>
            </div>
          </div>

          <div className="progress-item">
            <ProgressRing progress={todayProgress.progress.verses} color="#10B981" />
            <div className="progress-details">
              <span className="progress-value">
                {todayProgress.versesRead} / {todayProgress.goals.dailyVerses}
              </span>
              <span className="progress-label">Verses</span>
            </div>
          </div>

          <div className="progress-item">
            <ProgressRing progress={todayProgress.progress.vocabulary} color="#F59E0B" />
            <div className="progress-details">
              <span className="progress-value">
                {todayProgress.wordsLearned} / {todayProgress.goals.dailyVocabulary}
              </span>
              <span className="progress-label">Words</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Learning Schedule */}
      {dailyLearning && (
        <div className="daily-learning">
          <h4>Daily Learning</h4>
          <div className="daily-items">
            {dailyLearning.parashat && (
              <DailyLearningItem
                item={{ ...dailyLearning.parashat, title: { en: 'Parasha' } }}
                onSelect={handleDailySelect}
              />
            )}
            {dailyLearning.dafYomi && (
              <DailyLearningItem
                item={{ ...dailyLearning.dafYomi, title: { en: 'Daf Yomi' } }}
                onSelect={handleDailySelect}
              />
            )}
            {dailyLearning.mishnahYomit && (
              <DailyLearningItem
                item={{ ...dailyLearning.mishnahYomit, title: { en: 'Mishnah' } }}
                onSelect={handleDailySelect}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <QuickAction icon="📚" label="Vocabulary" onClick={onOpenVocabulary} />
        <QuickAction icon="🔖" label="Bookmarks" onClick={onOpenBookmarks} />
        <QuickAction icon="📝" label="Notes" onClick={onOpenNotes} />
        <QuickAction icon="✨" label="Inspiration" onClick={refreshInspiration} />
      </div>

      {/* Inspiration Modal */}
      {showInspiration && inspiration && (
        <div className="inspiration-overlay" onClick={() => setShowInspiration(false)}>
          <div className="inspiration-card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowInspiration(false)}>×</button>
            <div className="inspiration-text" dir="rtl" lang="he">
              {inspiration.he}
            </div>
            <div className="inspiration-translation">
              {inspiration.text}
            </div>
            <div className="inspiration-source">
              — {inspiration.heRef || inspiration.ref}
            </div>
            <button className="refresh-btn" onClick={refreshInspiration}>
              Get Another ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyDashboard;
