/**
 * useMastery - Track understanding levels for verses, concepts, and passages
 *
 * A spaced repetition-inspired mastery tracking system that helps users
 * track their understanding of Torah/Talmud content over time.
 *
 * Mastery Levels:
 * 0 - Not studied (new)
 * 1 - Seen (read once)
 * 2 - Learning (studying)
 * 3 - Familiar (understood basics)
 * 4 - Proficient (can explain)
 * 5 - Mastered (deep understanding)
 */

import { useState, useEffect, useCallback } from 'react';
import { safeGet, safeSet } from '../utils/safeLocalStorage';

const STORAGE_KEY = 'torah_mastery_data';

// Mastery level configuration with Hebrew scholarly terminology
export const MASTERY_LEVELS = {
  0: {
    name: 'New',
    hebrewName: 'חדש',
    icon: '⚪',
    color: '#94a3b8',
    description: 'Not yet studied',
    hebrewDesc: 'טרם נלמד'
  },
  1: {
    name: 'Seen',
    hebrewName: 'נקרא',
    icon: '🔵',
    color: '#3b82f6',
    description: 'Read at least once',
    hebrewDesc: 'קריאה ראשונה'
  },
  2: {
    name: 'Learning',
    hebrewName: 'לומד',
    icon: '🟡',
    color: '#f59e0b',
    description: 'Currently studying',
    hebrewDesc: 'בתהליך לימוד'
  },
  3: {
    name: 'Bekiut',
    hebrewName: 'בקיאות',
    icon: '🟢',
    color: '#10b981',
    description: 'Basic familiarity',
    hebrewDesc: 'הבנה בסיסית'
  },
  4: {
    name: 'Iyun',
    hebrewName: 'עיון',
    icon: '🟣',
    color: '#8b5cf6',
    description: 'In-depth understanding',
    hebrewDesc: 'הבנה מעמיקה'
  },
  5: {
    name: 'Mastered',
    hebrewName: 'שליטה',
    icon: '⭐',
    color: '#eab308',
    description: 'Can teach others',
    hebrewDesc: 'יכול ללמד אחרים'
  }
};

/**
 * Generate a unique key for a verse/passage
 */
const generateKey = (book, chapter, verse) => {
  return `${book}:${chapter}:${verse}`;
};

/**
 * Generate key for a concept/term
 */
const generateConceptKey = (concept) => {
  return `concept:${concept.toLowerCase().trim()}`;
};

/**
 * Calculate review interval based on mastery level (spaced repetition)
 * Returns days until next recommended review
 */
const getReviewInterval = (level) => {
  const intervals = {
    0: 0,    // New - review immediately
    1: 1,    // Seen - review tomorrow
    2: 3,    // Learning - review in 3 days
    3: 7,    // Familiar - review in 1 week
    4: 14,   // Proficient - review in 2 weeks
    5: 30    // Mastered - review in 1 month
  };
  return intervals[level] || 0;
};

/**
 * Check if item is due for review
 */
const isDueForReview = (lastReviewed, level) => {
  if (!lastReviewed) return true;

  const interval = getReviewInterval(level);
  const daysSince = Math.floor((Date.now() - lastReviewed) / (1000 * 60 * 60 * 24));

  return daysSince >= interval;
};

/**
 * useMastery Hook - Track and manage mastery levels
 */
const useMastery = () => {
  const [masteryData, setMasteryData] = useState(() => {
    return safeGet(STORAGE_KEY, { items: {}, stats: { totalItems: 0, totalReviews: 0 } });
  });

  // Persist using safeLocalStorage
  useEffect(() => {
    safeSet(STORAGE_KEY, masteryData);
  }, [masteryData]);

  /**
   * Get mastery level for a verse
   */
  const getVerseMastery = useCallback((book, chapter, verse) => {
    const key = generateKey(book, chapter, verse);
    const item = masteryData.items[key];
    return item ? item.level : 0;
  }, [masteryData.items]);

  /**
   * Get mastery level for a concept
   */
  const getConceptMastery = useCallback((concept) => {
    const key = generateConceptKey(concept);
    const item = masteryData.items[key];
    return item ? item.level : 0;
  }, [masteryData.items]);

  /**
   * Set mastery level for a verse (preserves existing metadata)
   */
  const setVerseMastery = useCallback((book, chapter, verse, level) => {
    const key = generateKey(book, chapter, verse);
    const clampedLevel = Math.max(0, Math.min(5, level));

    setMasteryData(prev => {
      const existing = prev.items[key];
      const isNew = !existing;

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: {
            type: 'verse',
            book,
            chapter,
            verse,
            level: clampedLevel,
            lastReviewed: Date.now(),
            reviewCount: (existing?.reviewCount || 0) + 1,
            created: existing?.created || Date.now(),
            // Preserve Yeshiva learning metadata
            hasQuestion: existing?.hasQuestion || false,
            learnedWith: existing?.learnedWith || [],
            notes: existing?.notes || '',
            difficulty: existing?.difficulty || null
          }
        },
        stats: {
          ...prev.stats,
          totalItems: isNew ? prev.stats.totalItems + 1 : prev.stats.totalItems,
          totalReviews: prev.stats.totalReviews + 1
        }
      };
    });
  }, []);

  /**
   * Toggle "has question" flag - mark verses you need to ask about
   */
  const toggleQuestion = useCallback((book, chapter, verse) => {
    const key = generateKey(book, chapter, verse);

    setMasteryData(prev => {
      const existing = prev.items[key] || {
        type: 'verse', book, chapter, verse, level: 0,
        created: Date.now(), reviewCount: 0
      };

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: {
            ...existing,
            hasQuestion: !existing.hasQuestion,
            lastReviewed: Date.now()
          }
        },
        stats: {
          ...prev.stats,
          totalItems: prev.items[key] ? prev.stats.totalItems : prev.stats.totalItems + 1
        }
      };
    });
  }, []);

  /**
   * Get verse metadata (question flag, notes, learned with)
   */
  const getVerseMetadata = useCallback((book, chapter, verse) => {
    const key = generateKey(book, chapter, verse);
    const item = masteryData.items[key];
    return {
      hasQuestion: item?.hasQuestion || false,
      learnedWith: item?.learnedWith || [],
      notes: item?.notes || '',
      difficulty: item?.difficulty || null,
      reviewCount: item?.reviewCount || 0,
      lastReviewed: item?.lastReviewed || null
    };
  }, [masteryData.items]);

  /**
   * Set verse notes (chiddushim/insights)
   */
  const setVerseNotes = useCallback((book, chapter, verse, notes) => {
    const key = generateKey(book, chapter, verse);

    setMasteryData(prev => {
      const existing = prev.items[key] || {
        type: 'verse', book, chapter, verse, level: 0,
        created: Date.now(), reviewCount: 0
      };

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: { ...existing, notes, lastReviewed: Date.now() }
        },
        stats: {
          ...prev.stats,
          totalItems: prev.items[key] ? prev.stats.totalItems : prev.stats.totalItems + 1
        }
      };
    });
  }, []);

  /**
   * Toggle "learned with commentary" - track which mefarshim you studied
   */
  const toggleLearnedWith = useCallback((book, chapter, verse, commentary) => {
    const key = generateKey(book, chapter, verse);

    setMasteryData(prev => {
      const existing = prev.items[key] || {
        type: 'verse', book, chapter, verse, level: 0,
        created: Date.now(), reviewCount: 0, learnedWith: []
      };

      const learnedWith = existing.learnedWith || [];
      const newLearnedWith = learnedWith.includes(commentary)
        ? learnedWith.filter(c => c !== commentary)
        : [...learnedWith, commentary];

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: { ...existing, learnedWith: newLearnedWith, lastReviewed: Date.now() }
        },
        stats: {
          ...prev.stats,
          totalItems: prev.items[key] ? prev.stats.totalItems : prev.stats.totalItems + 1
        }
      };
    });
  }, []);

  /**
   * Get all verses with questions (need to ask Rebbe)
   */
  const getVersesWithQuestions = useCallback(() => {
    return Object.entries(masteryData.items)
      .filter(([, item]) => item.type === 'verse' && item.hasQuestion)
      .map(([key, item]) => ({ key, ...item }));
  }, [masteryData.items]);

  /**
   * Get all verses with notes (chiddushim)
   */
  const getVersesWithNotes = useCallback(() => {
    return Object.entries(masteryData.items)
      .filter(([, item]) => item.type === 'verse' && item.notes && item.notes.trim())
      .map(([key, item]) => ({ key, ...item }));
  }, [masteryData.items]);

  /**
   * Set mastery level for a concept
   */
  const setConceptMastery = useCallback((concept, level, definition = null) => {
    const key = generateConceptKey(concept);
    const clampedLevel = Math.max(0, Math.min(5, level));

    setMasteryData(prev => {
      const existing = prev.items[key];
      const isNew = !existing;

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: {
            type: 'concept',
            concept,
            definition: definition || existing?.definition,
            level: clampedLevel,
            lastReviewed: Date.now(),
            reviewCount: (existing?.reviewCount || 0) + 1,
            created: existing?.created || Date.now()
          }
        },
        stats: {
          ...prev.stats,
          totalItems: isNew ? prev.stats.totalItems + 1 : prev.stats.totalItems,
          totalReviews: prev.stats.totalReviews + 1
        }
      };
    });
  }, []);

  /**
   * Increment mastery level (progress)
   */
  const incrementMastery = useCallback((book, chapter, verse) => {
    const currentLevel = getVerseMastery(book, chapter, verse);
    if (currentLevel < 5) {
      setVerseMastery(book, chapter, verse, currentLevel + 1);
    }
  }, [getVerseMastery, setVerseMastery]);

  /**
   * Decrement mastery level (forgot/struggled)
   */
  const decrementMastery = useCallback((book, chapter, verse) => {
    const currentLevel = getVerseMastery(book, chapter, verse);
    if (currentLevel > 0) {
      setVerseMastery(book, chapter, verse, currentLevel - 1);
    }
  }, [getVerseMastery, setVerseMastery]);

  /**
   * Cycle mastery level (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0)
   */
  const cycleMastery = useCallback((book, chapter, verse) => {
    const currentLevel = getVerseMastery(book, chapter, verse);
    const nextLevel = (currentLevel + 1) % 6;
    setVerseMastery(book, chapter, verse, nextLevel);
  }, [getVerseMastery, setVerseMastery]);

  /**
   * Mark verse as seen (level 1)
   */
  const markAsSeen = useCallback((book, chapter, verse) => {
    const currentLevel = getVerseMastery(book, chapter, verse);
    if (currentLevel === 0) {
      setVerseMastery(book, chapter, verse, 1);
    }
  }, [getVerseMastery, setVerseMastery]);

  /**
   * Get items due for review
   */
  const getDueForReview = useCallback(() => {
    const dueItems = [];

    Object.entries(masteryData.items).forEach(([key, item]) => {
      if (isDueForReview(item.lastReviewed, item.level)) {
        dueItems.push({ key, ...item });
      }
    });

    // Sort by urgency (lower level = more urgent)
    return dueItems.sort((a, b) => a.level - b.level);
  }, [masteryData.items]);

  /**
   * Get mastery statistics
   */
  const getStats = useCallback(() => {
    const items = Object.values(masteryData.items);
    const byLevel = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    items.forEach(item => {
      byLevel[item.level] = (byLevel[item.level] || 0) + 1;
    });

    const verseItems = items.filter(i => i.type === 'verse');
    const conceptItems = items.filter(i => i.type === 'concept');

    return {
      total: items.length,
      verses: verseItems.length,
      concepts: conceptItems.length,
      byLevel,
      mastered: byLevel[5],
      proficient: byLevel[4],
      familiar: byLevel[3],
      learning: byLevel[2],
      seen: byLevel[1],
      new: byLevel[0],
      averageLevel: items.length > 0
        ? items.reduce((sum, i) => sum + i.level, 0) / items.length
        : 0,
      totalReviews: masteryData.stats.totalReviews
    };
  }, [masteryData.items, masteryData.stats.totalReviews]);

  /**
   * Get chapter mastery overview
   */
  const getChapterMastery = useCallback((book, chapter) => {
    const prefix = `${book}:${chapter}:`;
    const chapterItems = Object.entries(masteryData.items)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, item]) => item);

    if (chapterItems.length === 0) {
      return { progress: 0, averageLevel: 0, versesStudied: 0 };
    }

    const averageLevel = chapterItems.reduce((sum, i) => sum + i.level, 0) / chapterItems.length;
    const progress = (averageLevel / 5) * 100;

    return {
      progress,
      averageLevel,
      versesStudied: chapterItems.length,
      items: chapterItems
    };
  }, [masteryData.items]);

  /**
   * Get book mastery overview
   */
  const getBookMastery = useCallback((book) => {
    const prefix = `${book}:`;
    const bookItems = Object.entries(masteryData.items)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, item]) => item);

    if (bookItems.length === 0) {
      return { progress: 0, averageLevel: 0, versesStudied: 0, chapters: {} };
    }

    const chapters = {};
    bookItems.forEach(item => {
      if (!chapters[item.chapter]) {
        chapters[item.chapter] = [];
      }
      chapters[item.chapter].push(item);
    });

    const averageLevel = bookItems.reduce((sum, i) => sum + i.level, 0) / bookItems.length;
    const progress = (averageLevel / 5) * 100;

    return {
      progress,
      averageLevel,
      versesStudied: bookItems.length,
      chaptersStudied: Object.keys(chapters).length,
      chapters
    };
  }, [masteryData.items]);

  /**
   * Export mastery data
   */
  const exportData = useCallback(() => {
    return JSON.stringify(masteryData, null, 2);
  }, [masteryData]);

  /**
   * Import mastery data
   */
  const importData = useCallback((jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.items && data.stats) {
        setMasteryData(data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Clear all mastery data
   */
  const clearAll = useCallback(() => {
    setMasteryData({ items: {}, stats: { totalItems: 0, totalReviews: 0 } });
  }, []);

  // =============================================================================
  // Siyum (Completion) Tracking
  // =============================================================================

  /**
   * Mark a chapter as completed (siyum)
   */
  const markChapterSiyum = useCallback((book, chapter, totalVerses) => {
    const siyumKey = `siyum:${book}:${chapter}`;

    setMasteryData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [siyumKey]: {
          type: 'siyum',
          siyumType: 'chapter',
          book,
          chapter,
          totalVerses,
          completedAt: Date.now(),
          celebratedAt: Date.now()
        }
      }
    }));
  }, []);

  /**
   * Mark a book as completed (siyum)
   */
  const markBookSiyum = useCallback((book, totalChapters) => {
    const siyumKey = `siyum:${book}`;

    setMasteryData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [siyumKey]: {
          type: 'siyum',
          siyumType: 'book',
          book,
          totalChapters,
          completedAt: Date.now(),
          celebratedAt: Date.now()
        }
      }
    }));
  }, []);

  /**
   * Check if chapter has siyum
   */
  const hasChapterSiyum = useCallback((book, chapter) => {
    const siyumKey = `siyum:${book}:${chapter}`;
    return !!masteryData.items[siyumKey];
  }, [masteryData.items]);

  /**
   * Check if book has siyum
   */
  const hasBookSiyum = useCallback((book) => {
    const siyumKey = `siyum:${book}`;
    return !!masteryData.items[siyumKey];
  }, [masteryData.items]);

  /**
   * Get all siyumim (completions)
   */
  const getSiyumim = useCallback(() => {
    return Object.entries(masteryData.items)
      .filter(([, item]) => item.type === 'siyum')
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => b.completedAt - a.completedAt);
  }, [masteryData.items]);

  /**
   * Check chapter completion progress (for siyum eligibility)
   * Returns percentage of verses at level 3+ (bekiut or higher)
   */
  const getChapterCompletionProgress = useCallback((book, chapter, totalVerses) => {
    if (!totalVerses || totalVerses === 0) return { progress: 0, eligible: false };

    const prefix = `${book}:${chapter}:`;
    const chapterItems = Object.entries(masteryData.items)
      .filter(([key, item]) => key.startsWith(prefix) && item.type === 'verse')
      .map(([, item]) => item);

    const atBekiutOrHigher = chapterItems.filter(i => i.level >= 3).length;
    const progress = (atBekiutOrHigher / totalVerses) * 100;

    return {
      progress,
      versesAtBekiut: atBekiutOrHigher,
      totalVerses,
      eligible: progress >= 80 // 80% at bekiut level or higher
    };
  }, [masteryData.items]);

  return {
    // Verse mastery
    getVerseMastery,
    getMastery: getVerseMastery, // Alias for backward compatibility
    setVerseMastery,
    setMastery: setVerseMastery, // Alias for backward compatibility
    incrementMastery,
    decrementMastery,
    cycleMastery,
    markAsSeen,

    // Yeshiva learning features
    toggleQuestion,
    getVerseMetadata,
    setVerseNotes,
    toggleLearnedWith,
    getVersesWithQuestions,
    getVersesWithNotes,

    // Concept mastery
    getConceptMastery,
    setConceptMastery,

    // Review system
    getDueForReview,

    // Statistics
    getStats,
    getChapterMastery,
    getBookMastery,

    // Siyum (completion) tracking
    markChapterSiyum,
    markBookSiyum,
    hasChapterSiyum,
    hasBookSiyum,
    getSiyumim,
    getChapterCompletionProgress,

    // Data management
    exportData,
    importData,
    clearAll,

    // Raw data (for components that need it)
    masteryData
  };
};

export default useMastery;
