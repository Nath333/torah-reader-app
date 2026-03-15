import { useState, useEffect, useCallback, useRef } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * Study Session Tracker Hook
 * Tracks study time, goals, streaks, and provides analytics
 */
export function useStudySession() {
  // Persistent storage
  const [studyData, setStudyData] = useLocalStorage('torahStudyData', {
    sessions: [],
    goals: {
      dailyMinutes: 15,
      weeklyDays: 5,
      dailyVerses: 10,
      dailyVocabulary: 5
    },
    streaks: {
      current: 0,
      longest: 0,
      lastStudyDate: null
    },
    totalStats: {
      totalMinutes: 0,
      totalSessions: 0,
      totalVerses: 0,
      totalVocabulary: 0
    }
  });

  // Current session state
  const [isActive, setIsActive] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentSession, setCurrentSession] = useState({
    versesRead: 0,
    wordsLearned: 0,
    notesCreated: 0,
    bookmarksAdded: 0
  });

  const timerRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (isActive && sessionStart) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStart) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, sessionStart]);

  // Start a new study session
  const startSession = useCallback(() => {
    const now = Date.now();
    setSessionStart(now);
    setIsActive(true);
    setElapsedSeconds(0);
    setCurrentSession({
      versesRead: 0,
      wordsLearned: 0,
      notesCreated: 0,
      bookmarksAdded: 0
    });
  }, []);

  // Pause the current session
  const pauseSession = useCallback(() => {
    setIsActive(false);
  }, []);

  // Resume a paused session
  const resumeSession = useCallback(() => {
    if (sessionStart) {
      setIsActive(true);
    }
  }, [sessionStart]);

  // End and save the current session
  const endSession = useCallback(() => {
    if (!sessionStart) return null;

    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    const durationMinutes = Math.round(duration / 60);
    const today = new Date().toISOString().split('T')[0];

    const session = {
      id: Date.now(),
      date: today,
      startTime: new Date(sessionStart).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: duration,
      durationMinutes,
      ...currentSession
    };

    setStudyData(prev => {
      // Update sessions
      const sessions = [...prev.sessions, session];

      // Update total stats
      const totalStats = {
        totalMinutes: prev.totalStats.totalMinutes + durationMinutes,
        totalSessions: prev.totalStats.totalSessions + 1,
        totalVerses: prev.totalStats.totalVerses + currentSession.versesRead,
        totalVocabulary: prev.totalStats.totalVocabulary + currentSession.wordsLearned
      };

      // Update streaks
      const lastStudyDate = prev.streaks.lastStudyDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let currentStreak = prev.streaks.current;
      if (lastStudyDate === today) {
        // Already studied today, no change
      } else if (lastStudyDate === yesterdayStr) {
        // Continuing streak
        currentStreak += 1;
      } else if (!lastStudyDate) {
        // First ever session
        currentStreak = 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }

      const longestStreak = Math.max(prev.streaks.longest, currentStreak);

      return {
        ...prev,
        sessions,
        totalStats,
        streaks: {
          current: currentStreak,
          longest: longestStreak,
          lastStudyDate: today
        }
      };
    });

    // Reset session state
    setIsActive(false);
    setSessionStart(null);
    setElapsedSeconds(0);
    setCurrentSession({
      versesRead: 0,
      wordsLearned: 0,
      notesCreated: 0,
      bookmarksAdded: 0
    });

    return session;
  }, [sessionStart, currentSession, setStudyData]);

  // Track verse reading
  const trackVerseRead = useCallback((count = 1) => {
    setCurrentSession(prev => ({
      ...prev,
      versesRead: prev.versesRead + count
    }));
  }, []);

  // Track word learned
  const trackWordLearned = useCallback((count = 1) => {
    setCurrentSession(prev => ({
      ...prev,
      wordsLearned: prev.wordsLearned + count
    }));
  }, []);

  // Track note created
  const trackNoteCreated = useCallback(() => {
    setCurrentSession(prev => ({
      ...prev,
      notesCreated: prev.notesCreated + 1
    }));
  }, []);

  // Track bookmark added
  const trackBookmarkAdded = useCallback(() => {
    setCurrentSession(prev => ({
      ...prev,
      bookmarksAdded: prev.bookmarksAdded + 1
    }));
  }, []);

  // Update goals
  const updateGoals = useCallback((newGoals) => {
    setStudyData(prev => ({
      ...prev,
      goals: { ...prev.goals, ...newGoals }
    }));
  }, [setStudyData]);

  // Get today's progress
  const getTodayProgress = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = studyData.sessions.filter(s => s.date === today);

    const minutesStudied = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0) +
      (isActive ? Math.floor(elapsedSeconds / 60) : 0);
    const versesRead = todaySessions.reduce((sum, s) => sum + s.versesRead, 0) +
      (isActive ? currentSession.versesRead : 0);
    const wordsLearned = todaySessions.reduce((sum, s) => sum + s.wordsLearned, 0) +
      (isActive ? currentSession.wordsLearned : 0);

    return {
      minutesStudied,
      versesRead,
      wordsLearned,
      sessionsCount: todaySessions.length + (isActive ? 1 : 0),
      goals: studyData.goals,
      progress: {
        minutes: Math.min(100, Math.round((minutesStudied / studyData.goals.dailyMinutes) * 100)),
        verses: Math.min(100, Math.round((versesRead / studyData.goals.dailyVerses) * 100)),
        vocabulary: Math.min(100, Math.round((wordsLearned / studyData.goals.dailyVocabulary) * 100))
      }
    };
  }, [studyData, isActive, elapsedSeconds, currentSession]);

  // Get weekly statistics
  const getWeeklyStats = useCallback(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekSessions = studyData.sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekAgo && sessionDate <= now;
    });

    // Group by day
    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        minutes: 0,
        verses: 0,
        words: 0,
        sessions: 0
      };
    }

    weekSessions.forEach(session => {
      if (dailyStats[session.date]) {
        dailyStats[session.date].minutes += session.durationMinutes;
        dailyStats[session.date].verses += session.versesRead;
        dailyStats[session.date].words += session.wordsLearned;
        dailyStats[session.date].sessions += 1;
      }
    });

    const daysStudied = Object.values(dailyStats).filter(d => d.sessions > 0).length;
    const totalMinutes = Object.values(dailyStats).reduce((sum, d) => sum + d.minutes, 0);
    const totalVerses = Object.values(dailyStats).reduce((sum, d) => sum + d.verses, 0);

    return {
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .reverse(),
      summary: {
        daysStudied,
        totalMinutes,
        totalVerses,
        averageMinutesPerDay: daysStudied > 0 ? Math.round(totalMinutes / daysStudied) : 0,
        goalProgress: Math.round((daysStudied / studyData.goals.weeklyDays) * 100)
      }
    };
  }, [studyData]);

  // Format elapsed time
  const formatTime = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Clear all study data (for testing/reset)
  const clearAllData = useCallback(() => {
    setStudyData({
      sessions: [],
      goals: {
        dailyMinutes: 15,
        weeklyDays: 5,
        dailyVerses: 10,
        dailyVocabulary: 5
      },
      streaks: {
        current: 0,
        longest: 0,
        lastStudyDate: null
      },
      totalStats: {
        totalMinutes: 0,
        totalSessions: 0,
        totalVerses: 0,
        totalVocabulary: 0
      }
    });
  }, [setStudyData]);

  return {
    // Session state
    isActive,
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    currentSession,

    // Session controls
    startSession,
    pauseSession,
    resumeSession,
    endSession,

    // Tracking
    trackVerseRead,
    trackWordLearned,
    trackNoteCreated,
    trackBookmarkAdded,

    // Goals
    goals: studyData.goals,
    updateGoals,

    // Stats
    streaks: studyData.streaks,
    totalStats: studyData.totalStats,
    getTodayProgress,
    getWeeklyStats,

    // Data management
    sessions: studyData.sessions,
    clearAllData
  };
}

export default useStudySession;
