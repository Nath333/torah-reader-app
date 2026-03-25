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

  // Reading time estimate (2 words per second for Hebrew text)
  const readingTime = useMemo(() => {
    const wordEstimate = verseCount ? verseCount * 12 : 0;
    return Math.ceil(wordEstimate / 120);
  }, [verseCount]);

  // Calculate reading streak (consecutive days)
  const streakData = useMemo(() => {
    if (!readingHistory || readingHistory.length === 0) {
      return { streak: 0, totalChaptersRead: 0, uniqueBooks: 0 };
    }

    const dates = readingHistory
      .map(h => {
        const date = new Date(h.timestamp);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

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

    return {
      streak,
      totalChaptersRead: readingHistory.length,
      uniqueBooks: new Set(readingHistory.map(h => h.book)).size
    };
  }, [readingHistory]);

  return (
    <div className="reading-stats-bar">
      {/* Streak indicator */}
      {streakData.streak > 0 && (
        <div className={`stat-chip streak ${streakData.streak >= 7 ? 'on-fire' : ''}`}>
          <span className="chip-icon">🔥</span>
          <span className="chip-value">{streakData.streak}</span>
        </div>
      )}

      {/* Quick stats */}
      <div className="stat-chip">
        <span className="chip-value">{verseCount}</span>
        <span className="chip-label">verses</span>
      </div>

      <div className="stat-chip">
        <span className="chip-value">{readingTime}m</span>
        <span className="chip-label">read</span>
      </div>

      <div className="stat-chip">
        <span className="chip-value">{chapter}/{totalChapters || '?'}</span>
        <span className="chip-label">ch</span>
      </div>

      {readingHistory.length > 0 && (
        <div className="stat-chip accent">
          <span className="chip-value">{readingHistory.length}</span>
          <span className="chip-label">sessions</span>
        </div>
      )}

      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div className="progress-chip">
          <div className="mini-progress">
            <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="chip-value">{progress}%</span>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="hint-chip" title="Press ? for keyboard shortcuts">
        <span>?</span>
      </div>
    </div>
  );
};

export default React.memo(ReadingStats);
