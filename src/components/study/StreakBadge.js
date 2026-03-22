/**
 * StreakBadge - Display study streak information
 * Shows current streak, weekly progress, and motivational messages
 */
import React, { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { StudyContext } from '../../context/StudyContext';
import './StreakBadge.css';

// Default values when context is unavailable
const DEFAULT_STREAK_MESSAGE = { emoji: '📚', message: 'Start studying!' };
const DEFAULT_WEEKLY_PROGRESS = { daysStudied: 0, goal: 5, percentage: 0, weekDates: [], studyDates: [] };
const DEFAULT_STATS = { currentStreak: 0, longestStreak: 0, totalDays: 0, todayMinutes: 0, isStreakAtRisk: false };

const StreakBadge = ({ compact = false }) => {
  // Use useContext directly for null-safe access (doesn't throw if missing)
  const context = useContext(StudyContext);
  const studyStreak = context?.studyStreak;

  const streakMessage = useMemo(() => {
    return studyStreak?.getStreakMessage?.() || DEFAULT_STREAK_MESSAGE;
  }, [studyStreak]);

  const weeklyProgress = useMemo(() => {
    return studyStreak?.getWeeklyProgress?.() || DEFAULT_WEEKLY_PROGRESS;
  }, [studyStreak]);

  const stats = useMemo(() => {
    return studyStreak?.getStats?.() || DEFAULT_STATS;
  }, [studyStreak]);

  // Determine special classes based on streak
  const streakClasses = useMemo(() => {
    const classes = [];
    const streak = stats.currentStreak;

    if (streak >= 30) classes.push('high-streak', 'milestone-30');
    else if (streak >= 7) classes.push('week-plus', 'milestone-7');
    else if (streak >= 3) classes.push('milestone-3');

    return classes.join(' ');
  }, [stats.currentStreak]);

  // Compact version for sidebar
  if (compact) {
    return (
      <div className={`streak-badge compact ${stats.isStreakAtRisk ? 'at-risk' : ''} ${streakClasses}`}>
        <div className="streak-icon-compact">
          <span className="streak-emoji">{streakMessage.emoji}</span>
          <span className="streak-count">{stats.currentStreak}</span>
        </div>
        {stats.currentStreak > 0 && (
          <div className="streak-fire">
            {Array.from({ length: Math.min(stats.currentStreak, 5) }).map((_, i) => (
              <span key={i} className="fire-dot" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full version for dashboard
  return (
    <div className={`streak-badge full ${stats.isStreakAtRisk ? 'at-risk' : ''} ${streakClasses}`}>
      {/* Main Streak Display */}
      <div className="streak-main">
        <div className="streak-icon-large">
          <span className="streak-emoji-large">{streakMessage.emoji}</span>
        </div>
        <div className="streak-info">
          <div className="streak-count-large">{stats.currentStreak}</div>
          <div className="streak-label">day streak</div>
        </div>
      </div>

      {/* Message */}
      <div className="streak-message">{streakMessage.message}</div>

      {/* Weekly Progress */}
      <div className="weekly-progress">
        <div className="weekly-header">
          <span>This Week</span>
          <span className="weekly-count">{weeklyProgress.daysStudied}/{weeklyProgress.goal}</span>
        </div>
        <div className="weekly-dots">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
            const dateStr = weeklyProgress.weekDates[i];
            const isStudied = weeklyProgress.studyDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
              <div
                key={i}
                className={`day-dot ${isStudied ? 'studied' : ''} ${isToday ? 'today' : ''}`}
                title={`${day}: ${isStudied ? 'Studied' : 'Not studied'}`}
              >
                <span className="day-letter">{day}</span>
                {isStudied && <span className="check-mark">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="weekly-bar">
          <div
            className="weekly-progress-fill"
            style={{ width: `${Math.min(100, weeklyProgress.percentage)}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="streak-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.longestStreak}</span>
          <span className="stat-label">Best</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.totalDays}</span>
          <span className="stat-label">Total Days</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.todayMinutes}m</span>
          <span className="stat-label">Today</span>
        </div>
      </div>
    </div>
  );
};

StreakBadge.propTypes = {
  compact: PropTypes.bool
};

export default StreakBadge;
