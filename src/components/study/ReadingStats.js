import React, { useMemo } from 'react';
import './ReadingStats.css';

const ReadingStats = ({
  book,
  chapter,
  totalChapters,
  verseCount,
  currentVerse = 1,
  readingHistory = []
}) => {
  // Calculate reading progress
  const progress = useMemo(() => {
    if (!verseCount) return 0;
    return Math.round((currentVerse / verseCount) * 100);
  }, [currentVerse, verseCount]);

  // Calculate word count estimate (rough estimate based on verse count)
  const wordEstimate = useMemo(() => {
    // Average Torah verse is about 10-15 Hebrew words
    return verseCount ? verseCount * 12 : 0;
  }, [verseCount]);

  // Reading time estimate (2 words per second for Hebrew text)
  const readingTime = useMemo(() => {
    const minutes = Math.ceil(wordEstimate / 120); // 2 words/sec = 120 words/min
    return minutes;
  }, [wordEstimate]);

  // Calculate reading streak (consecutive days)
  const streakData = useMemo(() => {
    if (!readingHistory || readingHistory.length === 0) {
      return { streak: 0, totalChaptersRead: 0, uniqueBooks: 0 };
    }

    // Get unique dates from history
    const dates = readingHistory
      .map(h => {
        const date = new Date(h.timestamp);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a);

    // Calculate streak
    let streak = 0;
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Check if user read today or yesterday to start streak
    const firstDate = dates[0];
    if (firstDate === todayNormalized || firstDate === todayNormalized - oneDayMs) {
      streak = 1;
      let expectedDate = firstDate - oneDayMs;

      for (let i = 1; i < dates.length; i++) {
        if (dates[i] === expectedDate) {
          streak++;
          expectedDate -= oneDayMs;
        } else if (dates[i] < expectedDate) {
          break;
        }
      }
    }

    // Count unique books
    const uniqueBooks = new Set(readingHistory.map(h => h.book)).size;

    return {
      streak,
      totalChaptersRead: readingHistory.length,
      uniqueBooks
    };
  }, [readingHistory]);

  // Get motivational message based on streak
  const getStreakMessage = (streak) => {
    if (streak === 0) return "Start your learning journey today!";
    if (streak === 1) return "Great start! Keep it up!";
    if (streak < 7) return "Building momentum!";
    if (streak < 30) return "Amazing consistency!";
    if (streak < 100) return "Incredible dedication!";
    return "Legendary learner!";
  };

  // Recent history count
  const recentSessionsCount = readingHistory.length;

  return (
    <div className="reading-stats">
      {/* Reading Streak Banner */}
      {streakData.streak > 0 && (
        <div className={`streak-banner ${streakData.streak >= 7 ? 'on-fire' : ''}`}>
          <div className="streak-flame">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.5 1.5-4.5 3-6 .378-.378.795-.714 1.236-1.006C9.812 8.088 10 7.078 10 6c0-1.5-.5-2.5-1-3 2 0 4 1.5 5 3.5.5 1 .75 2 .75 3 0 .5-.083 1-.25 1.5.333-.167.667-.5 1-1 .5-.75.75-1.5.75-2.5 0-.5-.083-1-.25-1.5 2 1 3.25 3 3.25 5.5 0 1-.25 2-.75 3-.25.5-.583.958-1 1.375-.417.417-.917.792-1.5 1.125-.583.333-1.25.583-2 .75S13.333 18 12.5 18c-.333 0-.667-.042-1-.125v.125c0 2.5 2 5 5.5 5h-5z" />
            </svg>
          </div>
          <div className="streak-content">
            <div className="streak-number">{streakData.streak}</div>
            <div className="streak-text">
              <span className="streak-label">Day Streak</span>
              <span className="streak-message">{getStreakMessage(streakData.streak)}</span>
            </div>
          </div>
          <div className="streak-stats">
            <div className="mini-stat">
              <span className="mini-value">{streakData.totalChaptersRead}</span>
              <span className="mini-label">chapters</span>
            </div>
            <div className="mini-stat">
              <span className="mini-value">{streakData.uniqueBooks}</span>
              <span className="mini-label">books</span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{verseCount}</span>
            <span className="stat-label">Verses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{readingTime}</span>
            <span className="stat-label">min read</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{chapter}/{totalChapters || '?'}</span>
            <span className="stat-label">Chapter</span>
          </div>
        </div>

        {recentSessionsCount > 0 && (
          <div className="stat-card accent">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{recentSessionsCount}</span>
              <span className="stat-label">Sessions</span>
            </div>
          </div>
        )}
      </div>

      {progress > 0 && progress < 100 && (
        <div className="reading-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}% read</span>
        </div>
      )}

      <div className="reading-tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>Click on Hebrew words to see definitions. Use keyboard shortcuts (?) for quick navigation.</span>
      </div>
    </div>
  );
};

export default React.memo(ReadingStats);
