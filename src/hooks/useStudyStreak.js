/**
 * useStudyStreak - Track study streaks and daily study activity
 *
 * Features:
 * - Current streak (consecutive days of study)
 * - Longest streak ever achieved
 * - Total days studied
 * - Last study date tracking
 * - Automatic streak update on app use
 */
import { useCallback, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';

// Helper: Get date string in YYYY-MM-DD format
const getDateString = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Helper: Get yesterday's date string
const getYesterdayString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
};

// Default streak data
const DEFAULT_STREAK_DATA = {
  currentStreak: 0,
  longestStreak: 0,
  totalDays: 0,
  lastStudyDate: null,
  studyDates: [], // Array of date strings for calendar view
  weeklyGoal: 7, // Days per week target
  dailyGoalMinutes: 15, // Minutes per day target
  todayMinutes: 0, // Minutes studied today
  lastSessionStart: null
};

export default function useStudyStreak() {
  const [streakData, setStreakData] = useLocalStorage('torah-study-streak', DEFAULT_STREAK_DATA);

  // Record a study session (call when user starts reading)
  const recordStudy = useCallback(() => {
    const today = getDateString();
    const yesterday = getYesterdayString();

    setStreakData(prev => {
      const data = { ...prev };

      // If already studied today, just return
      if (data.lastStudyDate === today) {
        return data;
      }

      // Add today to study dates if not already there
      if (!data.studyDates.includes(today)) {
        data.studyDates = [...(data.studyDates || []), today];
        data.totalDays = (data.totalDays || 0) + 1;
      }

      // Calculate streak
      if (data.lastStudyDate === yesterday) {
        // Consecutive day - increment streak
        data.currentStreak = (data.currentStreak || 0) + 1;
      } else if (data.lastStudyDate === today) {
        // Same day - no change
      } else {
        // Streak broken - reset to 1
        data.currentStreak = 1;
      }

      // Update longest streak
      if (data.currentStreak > (data.longestStreak || 0)) {
        data.longestStreak = data.currentStreak;
      }

      // Update last study date
      data.lastStudyDate = today;

      // Track session start
      data.lastSessionStart = Date.now();

      return data;
    });
  }, [setStreakData]);

  // Update today's study time (call periodically or on unmount)
  const updateStudyTime = useCallback((additionalMinutes = 0) => {
    setStreakData(prev => {
      const today = getDateString();
      const data = { ...prev };

      // Only count time if we have a session start and it's still today
      if (data.lastSessionStart && data.lastStudyDate === today) {
        const sessionMinutes = Math.floor((Date.now() - data.lastSessionStart) / 60000);
        data.todayMinutes = (data.todayMinutes || 0) + sessionMinutes + additionalMinutes;
        data.lastSessionStart = Date.now(); // Reset for next calculation
      } else if (data.lastStudyDate !== today) {
        // New day - reset today's minutes
        data.todayMinutes = additionalMinutes;
      }

      return data;
    });
  }, [setStreakData]);

  // Check if streak is at risk (didn't study yesterday)
  const isStreakAtRisk = useMemo(() => {
    const today = getDateString();
    const yesterday = getYesterdayString();

    // If last study was before yesterday, streak is already broken
    if (streakData.lastStudyDate &&
        streakData.lastStudyDate !== today &&
        streakData.lastStudyDate !== yesterday) {
      return false; // Streak already broken
    }

    // If last study was yesterday and we haven't studied today, streak is at risk
    return streakData.lastStudyDate === yesterday;
  }, [streakData.lastStudyDate]);

  // Get streak status message
  const getStreakMessage = useCallback(() => {
    const today = getDateString();
    const { currentStreak, lastStudyDate } = streakData;

    if (!lastStudyDate) {
      return { emoji: '🌱', message: 'Start your study journey today!' };
    }

    if (lastStudyDate === today) {
      if (currentStreak >= 30) {
        return { emoji: '🔥', message: `Amazing! ${currentStreak} day streak!` };
      } else if (currentStreak >= 7) {
        return { emoji: '⭐', message: `Great job! ${currentStreak} day streak!` };
      } else if (currentStreak >= 3) {
        return { emoji: '📚', message: `${currentStreak} day streak - keep it up!` };
      } else {
        return { emoji: '✓', message: 'You studied today!' };
      }
    }

    if (isStreakAtRisk) {
      return { emoji: '⚠️', message: `Study today to keep your ${currentStreak} day streak!` };
    }

    return { emoji: '📖', message: 'Ready to study?' };
  }, [streakData, isStreakAtRisk]);

  // Get weekly progress
  const getWeeklyProgress = useCallback(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(getDateString(date));
    }

    const studiedDays = weekDates.filter(d =>
      (streakData.studyDates || []).includes(d)
    ).length;

    return {
      daysStudied: studiedDays,
      goal: streakData.weeklyGoal || 7,
      percentage: Math.round((studiedDays / (streakData.weeklyGoal || 7)) * 100),
      weekDates,
      studyDates: streakData.studyDates || []
    };
  }, [streakData]);

  // Set weekly goal
  const setWeeklyGoal = useCallback((days) => {
    setStreakData(prev => ({
      ...prev,
      weeklyGoal: Math.min(7, Math.max(1, days))
    }));
  }, [setStreakData]);

  // Set daily goal
  const setDailyGoal = useCallback((minutes) => {
    setStreakData(prev => ({
      ...prev,
      dailyGoalMinutes: Math.max(5, minutes)
    }));
  }, [setStreakData]);

  // Reset streak data
  const resetStreak = useCallback(() => {
    setStreakData(DEFAULT_STREAK_DATA);
  }, [setStreakData]);

  // Get stats for dashboard
  const getStats = useCallback(() => {
    const today = getDateString();
    const weekProgress = getWeeklyProgress();

    return {
      currentStreak: streakData.currentStreak || 0,
      longestStreak: streakData.longestStreak || 0,
      totalDays: streakData.totalDays || 0,
      lastStudyDate: streakData.lastStudyDate,
      studiedToday: streakData.lastStudyDate === today,
      todayMinutes: streakData.todayMinutes || 0,
      dailyGoalMinutes: streakData.dailyGoalMinutes || 15,
      dailyGoalMet: (streakData.todayMinutes || 0) >= (streakData.dailyGoalMinutes || 15),
      weeklyProgress: weekProgress,
      isStreakAtRisk
    };
  }, [streakData, getWeeklyProgress, isStreakAtRisk]);

  return {
    // Data
    currentStreak: streakData.currentStreak || 0,
    longestStreak: streakData.longestStreak || 0,
    totalDays: streakData.totalDays || 0,
    lastStudyDate: streakData.lastStudyDate,
    todayMinutes: streakData.todayMinutes || 0,
    isStreakAtRisk,

    // Actions
    recordStudy,
    updateStudyTime,
    setWeeklyGoal,
    setDailyGoal,
    resetStreak,

    // Helpers
    getStreakMessage,
    getWeeklyProgress,
    getStats
  };
}
