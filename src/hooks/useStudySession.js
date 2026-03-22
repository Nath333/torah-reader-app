/**
 * useStudySession - Track and manage study sessions
 *
 * Features:
 * - Session timer with start/pause/end controls
 * - Track verses read, words learned, bookmarks added
 * - Daily progress towards goals
 *
 * Note: Streak tracking is delegated to useStudyStreak (single source of truth)
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import useStudyStreak from './useStudyStreak';

// Default daily goals
const DEFAULT_GOALS = {
  dailyMinutes: 30,
  dailyVerses: 20,
  dailyVocabulary: 5
};

// Get today's date string
const getTodayString = () => new Date().toDateString();

// Format seconds to MM:SS or HH:MM:SS
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Default session data
const DEFAULT_SESSION = {
  versesRead: 0,
  wordsLearned: 0,
  bookmarksAdded: 0,
  startTime: null,
  endTime: null,
  duration: 0
};

// Default daily stats
const DEFAULT_DAILY_STATS = {
  date: getTodayString(),
  minutesStudied: 0,
  versesRead: 0,
  wordsLearned: 0,
  sessions: []
};

const useStudySession = () => {
  // Persistent storage for daily stats
  const [dailyStats, setDailyStats] = useLocalStorage('torah-daily-stats', DEFAULT_DAILY_STATS);
  const [goals] = useLocalStorage('torah-study-goals', DEFAULT_GOALS);

  // Delegate streak tracking to useStudyStreak (single source of truth)
  const {
    currentStreak,
    longestStreak,
    recordStudy,
    updateStudyTime
  } = useStudyStreak();

  // Session state
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSession, setCurrentSession] = useState(DEFAULT_SESSION);
  const timerRef = useRef(null);

  // Reset daily stats if it's a new day
  useEffect(() => {
    const today = getTodayString();
    if (dailyStats.date !== today) {
      setDailyStats({
        ...DEFAULT_DAILY_STATS,
        date: today
      });
    }
  }, [dailyStats.date, setDailyStats]);

  // Formatted time as a computed value (not a function call)
  const formattedTime = useMemo(() => formatTime(elapsedTime), [elapsedTime]);

  // Start a new study session
  const startSession = useCallback(() => {
    if (isActive) return;

    const now = new Date();
    setIsActive(true);
    setElapsedTime(0);
    setCurrentSession({
      ...DEFAULT_SESSION,
      startTime: now.toISOString()
    });

    // Start the timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  }, [isActive]);

  // Pause the current session
  const pauseSession = useCallback(() => {
    if (!isActive) return;

    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isActive]);

  // End and save the session
  const endSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const sessionMinutes = Math.floor(elapsedTime / 60);

    if (elapsedTime > 0) {
      const now = new Date();
      const completedSession = {
        ...currentSession,
        endTime: now.toISOString(),
        duration: elapsedTime
      };

      // Update daily stats
      setDailyStats(prev => ({
        ...prev,
        date: getTodayString(),
        minutesStudied: (prev.minutesStudied || 0) + sessionMinutes,
        versesRead: (prev.versesRead || 0) + currentSession.versesRead,
        wordsLearned: (prev.wordsLearned || 0) + currentSession.wordsLearned,
        sessions: [...(prev.sessions || []), completedSession]
      }));

      // Delegate streak tracking to useStudyStreak (single source of truth)
      recordStudy();
      updateStudyTime(sessionMinutes);
    }

    setIsActive(false);
    setElapsedTime(0);
    setCurrentSession(DEFAULT_SESSION);
  }, [currentSession, elapsedTime, setDailyStats, recordStudy, updateStudyTime]);

  // Get today's study progress
  const getTodayProgress = useCallback(() => {
    const today = getTodayString();
    const stats = dailyStats.date === today ? dailyStats : DEFAULT_DAILY_STATS;

    // Calculate progress percentages
    const minutesProgress = Math.min(100, Math.round(((stats.minutesStudied || 0) / goals.dailyMinutes) * 100));
    const versesProgress = Math.min(100, Math.round(((stats.versesRead || 0) / goals.dailyVerses) * 100));
    const vocabularyProgress = Math.min(100, Math.round(((stats.wordsLearned || 0) / goals.dailyVocabulary) * 100));

    return {
      minutesStudied: stats.minutesStudied || 0,
      versesRead: stats.versesRead || 0,
      wordsLearned: stats.wordsLearned || 0,
      goals: goals,
      progress: {
        minutes: minutesProgress,
        verses: versesProgress,
        vocabulary: vocabularyProgress
      }
    };
  }, [dailyStats, goals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Expose streaks from useStudyStreak (single source of truth)
  const streaks = useMemo(() => ({
    current: currentStreak,
    longest: longestStreak
  }), [currentStreak, longestStreak]);

  return {
    isActive,
    formattedTime,
    startSession,
    pauseSession,
    endSession,
    streaks,
    getTodayProgress,
    currentSession
  };
};

export default useStudySession;
