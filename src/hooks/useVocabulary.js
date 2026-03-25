import { useCallback, useMemo, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import { cleanHebrewWordStrict } from '../utils/hebrewUtils';
import {
  initializeSRS,
  createCard,
  processReview,
  getDueCards,
  getStats as getSRSStats,
  getOptimalSession,
  importFromVocabulary,
  QUALITY as SRS_QUALITY,
  MASTERY_THRESHOLDS
} from '../services/srsService';

/**
 * SM-2 Spaced Repetition Algorithm
 * Now enhanced with centralized SRS service for advanced features
 *
 * Quality ratings:
 * 0 - Complete blackout (reset)
 * 1 - Incorrect, but recognized after seeing answer
 * 2 - Incorrect, but easy recall after seeing answer
 * 3 - Correct with difficulty
 * 4 - Correct with hesitation
 * 5 - Perfect response
 */

// Calculate next interval based on SM-2 algorithm (local fallback)
const calculateNextReview = (word, quality) => {
  const now = new Date();

  // Get current values or defaults
  let interval = word.interval || 1; // days
  let easeFactor = word.easeFactor || 2.5;
  let repetitions = word.repetitions || 0;

  if (quality < 3) {
    // Failed review - reset
    repetitions = 0;
    interval = 1;
  } else {
    // Successful review
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  // Calculate next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval,
    easeFactor: Math.round(easeFactor * 100) / 100,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastReviewed: now.toISOString()
  };
};

/**
 * Custom hook for managing vocabulary/word bank with Spaced Repetition
 * Uses SM-2 algorithm for optimal learning retention
 * Now integrated with centralized SRS service for advanced features
 */
export const useVocabulary = () => {
  const [vocabulary, setVocabulary] = useLocalStorage('torahVocabulary', []);

  // Initialize SRS service and sync vocabulary on mount
  useEffect(() => {
    initializeSRS();
    // Import existing vocabulary into SRS service for unified tracking
    if (vocabulary.length > 0) {
      importFromVocabulary(vocabulary);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a word to vocabulary
  const addWord = useCallback((word, english, french = '', context = '') => {
    const cleanWord = cleanHebrewWordStrict(word);

    setVocabulary(prev => {
      // Check if word already exists
      const exists = prev.some(w => w.hebrew === cleanWord);
      if (exists) return prev;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const wordId = Date.now();

      // Also create card in centralized SRS service
      createCard(
        `vocab_${wordId}`,
        cleanWord,
        english,
        { type: 'vocabulary', french, context, source: 'vocabulary-hook' }
      );

      return [...prev, {
        id: wordId,
        hebrew: cleanWord,
        original: word, // Keep original with vowels
        english,
        french,
        context,
        addedAt: now.toISOString(),
        // SRS fields
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        lastReviewed: null,
        nextReview: tomorrow.toISOString(),
        // Legacy fields for backwards compatibility
        reviewCount: 0,
        mastered: false,
        // New tracking
        correctCount: 0,
        incorrectCount: 0
      }];
    });
  }, [setVocabulary]);

  // Remove a word from vocabulary
  const removeWord = useCallback((wordId) => {
    setVocabulary(prev => prev.filter(w => w.id !== wordId));
  }, [setVocabulary]);

  // Update a word (e.g., add French translation)
  const updateWord = useCallback((wordId, updates) => {
    setVocabulary(prev => prev.map(w =>
      w.id === wordId ? { ...w, ...updates } : w
    ));
  }, [setVocabulary]);

  // Mark word as reviewed with quality rating (0-5)
  // Simplified: correct=true maps to quality 4, correct=false maps to quality 1
  const markReviewed = useCallback((wordId, correct = true, quality = null) => {
    setVocabulary(prev => prev.map(w => {
      if (w.id !== wordId) return w;

      // Determine quality rating
      const q = quality !== null ? quality : (correct ? 4 : 1);

      // Calculate next review using SM-2
      const srsUpdates = calculateNextReview(w, q);

      // Update counts
      const reviewCount = (w.reviewCount || 0) + 1;
      const correctCount = (w.correctCount || 0) + (q >= 3 ? 1 : 0);
      const incorrectCount = (w.incorrectCount || 0) + (q < 3 ? 1 : 0);

      // Determine if mastered - uses MASTERY_THRESHOLDS for single source of truth
      const mastered = srsUpdates.interval >= MASTERY_THRESHOLDS.MASTERED.minInterval &&
                       srsUpdates.easeFactor >= 2.0;

      return {
        ...w,
        ...srsUpdates,
        reviewCount,
        correctCount,
        incorrectCount,
        mastered
      };
    }));
  }, [setVocabulary]);

  // Check if word is in vocabulary
  const hasWord = useCallback((word) => {
    if (!word) return false;
    const cleanWord = cleanHebrewWordStrict(word);
    return vocabulary.some(w => w.hebrew === cleanWord);
  }, [vocabulary]);

  // Check if word is marked as "known" (mastered or high repetitions)
  const isKnown = useCallback((word) => {
    if (!word) return false;
    const cleanWord = cleanHebrewWordStrict(word);
    const wordEntry = vocabulary.find(w => w.hebrew === cleanWord);
    // Consider "known" if mastered or has 3+ successful reviews
    return wordEntry ? (wordEntry.mastered || (wordEntry.repetitions || 0) >= 3) : false;
  }, [vocabulary]);

  // Toggle a word's known status (quick mark as known/unknown)
  const toggleKnown = useCallback((word) => {
    if (!word) return;
    const cleanWord = cleanHebrewWordStrict(word);

    setVocabulary(prev => {
      const existingIdx = prev.findIndex(w => w.hebrew === cleanWord);

      if (existingIdx === -1) {
        // Add as mastered
        const now = new Date();
        return [...prev, {
          id: Date.now(),
          hebrew: cleanWord,
          original: word,
          english: '',
          french: '',
          context: '',
          addedAt: now.toISOString(),
          interval: 30,
          easeFactor: 2.5,
          repetitions: 5,
          lastReviewed: now.toISOString(),
          nextReview: null,
          reviewCount: 5,
          mastered: true,
          correctCount: 5,
          incorrectCount: 0
        }];
      } else {
        // Toggle mastered status
        const word = prev[existingIdx];
        const newMastered = !word.mastered;
        return prev.map((w, idx) =>
          idx === existingIdx
            ? {
                ...w,
                mastered: newMastered,
                repetitions: newMastered ? Math.max(w.repetitions || 0, 5) : 0,
                interval: newMastered ? 30 : 1
              }
            : w
        );
      }
    });
  }, [setVocabulary]);

  // Count of known words
  const knownCount = useMemo(() => {
    return vocabulary.filter(w => w.mastered || (w.repetitions || 0) >= 3).length;
  }, [vocabulary]);

  // Get words due for review (SRS-based)
  const getWordsForReview = useCallback((limit = 10) => {
    const now = new Date();

    return vocabulary
      .filter(w => {
        if (w.mastered) return false;
        // If no next review set, it's due
        if (!w.nextReview) return true;
        // Check if due
        return new Date(w.nextReview) <= now;
      })
      .sort((a, b) => {
        // Sort by: overdue first, then by ease factor (harder words first)
        const aDate = a.nextReview ? new Date(a.nextReview) : new Date(0);
        const bDate = b.nextReview ? new Date(b.nextReview) : new Date(0);
        if (aDate.getTime() !== bDate.getTime()) {
          return aDate.getTime() - bDate.getTime();
        }
        return (a.easeFactor || 2.5) - (b.easeFactor || 2.5);
      })
      .slice(0, limit);
  }, [vocabulary]);

  // Get words coming up for review soon (next 7 days)
  const getUpcomingReviews = useCallback(() => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcoming = {};

    vocabulary.forEach(w => {
      if (w.mastered || !w.nextReview) return;
      const reviewDate = new Date(w.nextReview);
      if (reviewDate > now && reviewDate <= nextWeek) {
        const dateKey = reviewDate.toISOString().split('T')[0];
        if (!upcoming[dateKey]) upcoming[dateKey] = [];
        upcoming[dateKey].push(w);
      }
    });

    return upcoming;
  }, [vocabulary]);

  // Count of words due today
  const dueToday = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return vocabulary.filter(w => {
      if (w.mastered) return false;
      if (!w.nextReview) return true;
      return new Date(w.nextReview) <= endOfDay;
    }).length;
  }, [vocabulary]);

  // Get statistics
  const getStats = useCallback(() => {
    const total = vocabulary.length;
    const mastered = vocabulary.filter(w => w.mastered).length;
    const now = new Date();

    // Due for review
    const dueNow = vocabulary.filter(w => {
      if (w.mastered) return false;
      if (!w.nextReview) return true;
      return new Date(w.nextReview) <= now;
    }).length;

    // Learning (reviewed at least once but not mastered)
    const learning = vocabulary.filter(w =>
      !w.mastered && w.repetitions > 0
    ).length;

    // New (never reviewed)
    const newWords = vocabulary.filter(w =>
      !w.repetitions || w.repetitions === 0
    ).length;

    // Average ease factor
    const avgEase = vocabulary.length > 0
      ? vocabulary.reduce((sum, w) => sum + (w.easeFactor || 2.5), 0) / vocabulary.length
      : 2.5;

    // Total reviews
    const totalReviews = vocabulary.reduce((sum, w) => sum + (w.reviewCount || 0), 0);

    // Accuracy
    const totalCorrect = vocabulary.reduce((sum, w) => sum + (w.correctCount || 0), 0);
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    return {
      total,
      mastered,
      learning,
      newWords,
      dueNow,
      needsReview: dueNow, // Alias for backwards compatibility
      avgEase: Math.round(avgEase * 100) / 100,
      totalReviews,
      accuracy
    };
  }, [vocabulary]);

  // Clear all vocabulary
  const clearVocabulary = useCallback(() => {
    setVocabulary([]);
  }, [setVocabulary]);

  // Export vocabulary
  const exportVocabulary = useCallback(() => {
    return JSON.stringify(vocabulary, null, 2);
  }, [vocabulary]);

  // Import vocabulary
  const importVocabulary = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        setVocabulary(prev => {
          const newWords = imported.filter(w =>
            !prev.some(existing => existing.hebrew === w.hebrew)
          );
          return [...prev, ...newWords];
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to import vocabulary:', e);
    }
    return false;
  }, [setVocabulary]);

  // Get optimal study session using SRS service
  const getOptimalStudySession = useCallback((minutes = 15) => {
    return getOptimalSession(minutes);
  }, []);

  // Get SRS service stats (centralized)
  const getSRSServiceStats = useCallback(() => {
    return getSRSStats();
  }, []);

  // Get cards due from SRS service
  const getSRSDueCards = useCallback((options = {}) => {
    return getDueCards(options);
  }, []);

  // Process review through SRS service
  const processSRSReview = useCallback((cardId, quality) => {
    return processReview(cardId, quality);
  }, []);

  return {
    vocabulary,
    addWord,
    removeWord,
    updateWord,
    markReviewed,
    hasWord,
    // Interlinear/Mastery features
    isKnown,
    toggleKnown,
    knownCount,
    getWordsForReview,
    getUpcomingReviews,
    dueToday,
    getStats,
    clearVocabulary,
    exportVocabulary,
    importVocabulary,
    // 2026 SRS Service Integration
    getOptimalStudySession,
    getSRSServiceStats,
    getSRSDueCards,
    processSRSReview,
    SRS_QUALITY
  };
};

export default useVocabulary;
