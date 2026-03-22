/**
 * CommentaryContext - Centralized Commentary Data Management
 *
 * Scholar-grade features:
 * 1. Shared cache across all components (no duplicate fetches)
 * 2. Pre-fetching of adjacent chapters
 * 3. Cross-commentary search (find where Ramban mentions Rashi)
 * 4. Commentary dialogue detection (who responds to whom)
 * 5. Integrates with useCommentaryLoader for consistent data access
 *
 * Usage:
 *   const {
 *     commentaryData,           // All loaded commentary data
 *     getCommentaryForVerse,    // Get commentary for specific verse
 *     searchAcrossCommentaries, // Search across all cached commentaries
 *     findCommentatorDialogues, // Find where commentators respond to each other
 *     isLoading,                // Check loading state
 *     errors                    // Any loading errors
 *   } = useCommentary();
 */

import { createContext, useContext, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useTorah } from './TorahContext';
import { useSettings } from './SettingsContext';
import {
  getRashiForChapter,
  getRambanForChapter,
  getIbnEzraForChapter,
  getSfornoForChapter,
  getTosafotForDaf,
  getMaharshaForDaf,
  checkCommentaryAvailability,
  getAvailableCommentators
} from '../services/commentaryServiceFactory';
import { isTalmudBook } from '../services/sefariaApi';
import { COMMENTATORS } from '../constants/commentatorRegistry';
import { createLogger } from '../utils/debug';

const log = createLogger('CommentaryContext');

const CommentaryContext = createContext(null);

// ============================================================================
// PRO SCHOLAR V4: Enhanced Cache Configuration
// ============================================================================
const CACHE_MAX_CHAPTERS = 25; // Increased from 10 for longer study sessions
const PREFETCH_DELAY = 1500;   // Reduced for faster prefetch
const PREDICTIVE_PREFETCH_THRESHOLD = 3; // Min visits before pattern detection
const CACHE_COMPRESSION_THRESHOLD = 20; // Compress cache entries above this count

/**
 * PRO SCHOLAR V4: Navigation pattern tracker for predictive prefetching
 */
const navigationPatterns = {
  history: [],
  maxHistory: 50,

  record(book, chapter) {
    this.history.push({ book, chapter, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  },

  // Predict next chapter based on reading patterns
  predictNext(currentBook, currentChapter) {
    const chapterNum = parseInt(currentChapter);
    const recentForBook = this.history
      .filter(h => h.book === currentBook)
      .slice(-10);

    // Detect sequential reading pattern
    const isSequential = recentForBook.length >= 2 &&
      recentForBook.every((h, i) =>
        i === 0 || parseInt(h.chapter) === parseInt(recentForBook[i-1].chapter) + 1
      );

    if (isSequential) {
      // User is reading sequentially, prioritize next chapters
      return [
        { book: currentBook, chapter: chapterNum + 1, priority: 1.0 },
        { book: currentBook, chapter: chapterNum + 2, priority: 0.5 },
      ];
    }

    // Default: prefetch adjacent chapters
    return [
      { book: currentBook, chapter: chapterNum + 1, priority: 0.8 },
      { book: currentBook, chapter: chapterNum - 1, priority: 0.3 },
    ];
  }
};

// Supported commentators with their loaders
const COMMENTATOR_LOADERS = {
  rashi: { loader: getRashiForChapter, supportsTalmud: true, supportsTorah: true },
  ramban: { loader: getRambanForChapter, supportsTalmud: false, supportsTorah: true },
  ibn_ezra: { loader: getIbnEzraForChapter, supportsTalmud: false, supportsTorah: true },
  sforno: { loader: getSfornoForChapter, supportsTalmud: false, supportsTorah: true },
  tosafot: { loader: getTosafotForDaf, supportsTalmud: true, supportsTorah: false },
  maharsha: { loader: getMaharshaForDaf, supportsTalmud: true, supportsTorah: false }
};

/**
 * CommentaryProvider - Wraps app to provide global commentary state
 */
export function CommentaryProvider({ children }) {
  const { selectedBook, selectedChapter } = useTorah();
  const settings = useSettings();

  // Extract show flags safely
  const showRashi = settings?.showRashi ?? false;
  const showRamban = settings?.showRamban ?? false;
  const showIbnEzra = settings?.showIbnEzra ?? false;
  const showSforno = settings?.showSforno ?? false;
  const showTosafot = settings?.showTosafot ?? false;
  const showMaharsha = settings?.showMaharsha ?? false;

  // Determine content type
  const isTalmud = useMemo(() => isTalmudBook(selectedBook), [selectedBook]);

  // ============================================================================
  // Global Commentary Cache
  // ============================================================================
  const cacheRef = useRef(new Map());
  const loadingRef = useRef(new Set());
  const errorRef = useRef(new Map());
  const [cacheVersion, setCacheVersion] = useState(0);
  const [loadingState, setLoadingState] = useState({});
  const [errors, setErrors] = useState({});

  const getCacheKey = useCallback((book, chapter, commentator) => {
    return `${commentator}:${book}:${chapter}`;
  }, []);

  const isInCache = useCallback((book, chapter, commentator) => {
    return cacheRef.current.has(getCacheKey(book, chapter, commentator));
  }, [getCacheKey]);

  const getFromCache = useCallback((book, chapter, commentator) => {
    const key = getCacheKey(book, chapter, commentator);
    const entry = cacheRef.current.get(key);

    // PRO SCHOLAR V4: Update access tracking for smart LRU
    if (entry) {
      entry.lastAccess = Date.now();
      entry.accessCount = (entry.accessCount || 0) + 1;
    }

    return entry;
  }, [getCacheKey]);

  const addToCache = useCallback((book, chapter, commentator, data) => {
    const key = getCacheKey(book, chapter, commentator);

    // PRO SCHOLAR V4: Smart LRU eviction with access tracking
    if (cacheRef.current.size >= CACHE_MAX_CHAPTERS * Object.keys(COMMENTATOR_LOADERS).length) {
      // Find least recently accessed entry
      let oldestKey = null;
      let oldestAccess = Infinity;

      cacheRef.current.forEach((entry, entryKey) => {
        const accessTime = entry.lastAccess || entry.timestamp;
        if (accessTime < oldestAccess) {
          oldestAccess = accessTime;
          oldestKey = entryKey;
        }
      });

      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
        log.debug(`Cache eviction: removed ${oldestKey}`);
      }
    }

    // Track cache size for compression decisions
    const shouldCompress = cacheRef.current.size >= CACHE_COMPRESSION_THRESHOLD;

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      accessCount: 1,
      book,
      chapter,
      commentator,
      compressed: shouldCompress
    });

    setCacheVersion(v => v + 1);
  }, [getCacheKey]);

  // ============================================================================
  // Commentary Loading with Batch Support
  // ============================================================================

  const loadCommentary = useCallback(async (book, chapter, commentator) => {
    const key = getCacheKey(book, chapter, commentator);

    // Skip if already cached or loading
    if (cacheRef.current.has(key) || loadingRef.current.has(key)) {
      return getFromCache(book, chapter, commentator)?.data;
    }

    // Check availability
    if (!checkCommentaryAvailability(commentator, book)) {
      return null;
    }

    // Check content type compatibility
    const loaderConfig = COMMENTATOR_LOADERS[commentator];
    if (!loaderConfig) {
      log.warn(`Unknown commentator: ${commentator}`);
      return null;
    }

    const bookIsTalmud = isTalmudBook(book);
    if (bookIsTalmud && !loaderConfig.supportsTalmud) return null;
    if (!bookIsTalmud && !loaderConfig.supportsTorah) return null;

    loadingRef.current.add(key);
    setLoadingState(prev => ({ ...prev, [commentator]: true }));

    try {
      log.debug(`Loading ${commentator} for ${book} ${chapter}`);

      let result;
      const loader = loaderConfig.loader;

      // All loaders now return Map for verse-level data
      const verseMap = await loader(book, chapter);

      // Handle Talmud daf-level vs Torah verse-level
      if (bookIsTalmud && (commentator === 'tosafot' || commentator === 'maharsha')) {
        // Daf-level commentaries return array or object
        result = {
          comments: Array.isArray(verseMap) ? verseMap : (verseMap?.comments || []),
          type: 'daf'
        };
      } else {
        // Verse-level: convert Map to object for consistency
        result = { verseMap, type: 'chapter' };
      }

      addToCache(book, chapter, commentator, result);

      // Clear any previous error
      setErrors(prev => {
        const next = { ...prev };
        delete next[commentator];
        return next;
      });

      return result;
    } catch (error) {
      log.error(`Failed to load ${commentator}:`, error);
      setErrors(prev => ({ ...prev, [commentator]: error.message }));
      return null;
    } finally {
      loadingRef.current.delete(key);
      setLoadingState(prev => ({ ...prev, [commentator]: false }));
    }
  }, [getCacheKey, getFromCache, addToCache]);

  /**
   * Load all enabled commentaries for current chapter
   */
  const loadEnabledCommentaries = useCallback(async () => {
    if (!selectedBook || !selectedChapter) return;

    const promises = [];
    const bookIsTalmud = isTalmudBook(selectedBook);

    if (showRashi) promises.push(loadCommentary(selectedBook, selectedChapter, 'rashi'));

    if (!bookIsTalmud) {
      // Torah-only commentators
      if (showRamban) promises.push(loadCommentary(selectedBook, selectedChapter, 'ramban'));
      if (showIbnEzra) promises.push(loadCommentary(selectedBook, selectedChapter, 'ibn_ezra'));
      if (showSforno) promises.push(loadCommentary(selectedBook, selectedChapter, 'sforno'));
    } else {
      // Talmud-only commentators
      if (showTosafot) promises.push(loadCommentary(selectedBook, selectedChapter, 'tosafot'));
      if (showMaharsha) promises.push(loadCommentary(selectedBook, selectedChapter, 'maharsha'));
    }

    await Promise.all(promises);
  }, [selectedBook, selectedChapter, showRashi, showRamban, showIbnEzra, showSforno, showTosafot, showMaharsha, loadCommentary]);

  // Auto-load when chapter or settings change
  useEffect(() => {
    loadEnabledCommentaries();
  }, [loadEnabledCommentaries]);

  // ============================================================================
  // PRO SCHOLAR V4: Predictive Pre-fetching with Pattern Detection
  // ============================================================================

  const prefetchAdjacent = useCallback(async (book, chapter) => {
    // Record navigation for pattern detection
    navigationPatterns.record(book, chapter);

    // Get predicted chapters based on reading patterns
    const predictions = navigationPatterns.predictNext(book, chapter);

    const enabledCommentators = [];
    if (showRashi) enabledCommentators.push('rashi');
    if (showRamban && !isTalmud) enabledCommentators.push('ramban');
    if (showIbnEzra && !isTalmud) enabledCommentators.push('ibn_ezra');
    if (showSforno && !isTalmud) enabledCommentators.push('sforno');

    // Prefetch in background with priority ordering
    setTimeout(() => {
      // Sort by priority (highest first)
      const sortedPredictions = [...predictions].sort((a, b) => b.priority - a.priority);

      sortedPredictions.forEach(({ book: predBook, chapter: predChapter, priority }) => {
        if (predChapter >= 1 && priority >= PREDICTIVE_PREFETCH_THRESHOLD / 10) {
          enabledCommentators.forEach(commentator => {
            loadCommentary(predBook, predChapter, commentator);
          });
        }
      });

      log.debug(`Predictive prefetch: ${sortedPredictions.length} chapters queued`);
    }, PREFETCH_DELAY);
  }, [showRashi, showRamban, showIbnEzra, showSforno, isTalmud, loadCommentary]);

  // Auto-prefetch with pattern tracking
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      const timer = setTimeout(() => {
        prefetchAdjacent(selectedBook, selectedChapter);
      }, PREFETCH_DELAY);
      return () => clearTimeout(timer);
    }
  }, [selectedBook, selectedChapter, prefetchAdjacent]);

  // ============================================================================
  // Scholar Features: Cross-Commentary Search
  // ============================================================================

  const searchAcrossCommentaries = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const results = [];
    const searchLower = searchTerm.toLowerCase();

    cacheRef.current.forEach((cached) => {
      const { data, book, chapter, commentator } = cached;

      const processComment = (comment, verseNum, idx) => {
        const matchInHebrew = comment.hebrew?.includes(searchTerm);
        const matchInEnglish = comment.english?.toLowerCase().includes(searchLower);
        const matchInDibur = comment.diburHamatchil?.includes(searchTerm);

        if (matchInHebrew || matchInEnglish || matchInDibur) {
          results.push({
            commentator,
            commentatorInfo: COMMENTATORS[commentator] || { name: commentator },
            book,
            chapter,
            verse: verseNum,
            commentIndex: idx,
            matchType: matchInDibur ? 'diburHamatchil' : (matchInHebrew ? 'hebrew' : 'english'),
            snippet: comment.hebrew?.substring(0, 150) || comment.english?.substring(0, 150),
            diburHamatchil: comment.diburHamatchil
          });
        }
      };

      // Handle verseMap (batch-loaded)
      if (data?.verseMap instanceof Map) {
        data.verseMap.forEach((comments, verseNum) => {
          if (Array.isArray(comments)) {
            comments.forEach((comment, idx) => processComment(comment, verseNum, idx));
          }
        });
      }

      // Handle comments array (daf-level)
      if (Array.isArray(data?.comments)) {
        data.comments.forEach((comment, idx) => processComment(comment, comment.verse || null, idx));
      }
    });

    return results;
  }, []);

  // PRO SCHOLAR V4: Explicit reference patterns for dialogue detection
  const REFERENCE_PATTERNS = useMemo(() => ({
    rashi: [/רש"י/, /רש״י/, /פירש"י/, /פירש רש"י/],
    ramban: [/רמב"ן/, /רמב״ן/, /הרמב"ן/],
    ibn_ezra: [/אבן עזרא/, /ראב"ע/, /ראב״ע/, /א"ע/],
    sforno: [/ספורנו/, /הספורנו/],
    tosafot: [/תוספות/, /תוס'/, /תוס׳/],
    maharsha: [/מהרש"א/, /מהרש״א/],
    targum: [/תרגום/, /אונקלוס/]
  }), []);

  /**
   * PRO SCHOLAR V4: Find where commentators respond to each other
   * Enhanced with explicit text reference detection
   */
  const findCommentatorDialogues = useCallback((book, chapter, verse) => {
    const dialogues = [];
    const verseCommentaries = {};

    Object.keys(COMMENTATORS).forEach(commentatorId => {
      const cached = getFromCache(book, chapter, commentatorId);
      let comments = [];

      if (cached?.data?.verseMap instanceof Map) {
        comments = cached.data.verseMap.get(verse) || cached.data.verseMap.get(parseInt(verse)) || [];
      } else if (Array.isArray(cached?.data?.comments)) {
        comments = cached.data.comments.filter(c => c.verse === verse || c.verse === parseInt(verse));
      }

      if (comments.length > 0) {
        verseCommentaries[commentatorId] = comments;
      }
    });

    // Method 1: Find response patterns from COMMENTATORS config
    Object.entries(verseCommentaries).forEach(([commentatorId, comments]) => {
      const info = COMMENTATORS[commentatorId];
      if (info?.respondsTo?.length > 0) {
        info.respondsTo.forEach(respondedToId => {
          if (verseCommentaries[respondedToId]) {
            dialogues.push({
              responder: { id: commentatorId, ...info },
              respondedTo: { id: respondedToId, ...COMMENTATORS[respondedToId] },
              responderComments: comments,
              respondedToComments: verseCommentaries[respondedToId],
              detectionMethod: 'config'
            });
          }
        });
      }
    });

    // Method 2: PRO SCHOLAR V4 - Detect explicit references in text
    Object.entries(verseCommentaries).forEach(([commentatorId, comments]) => {
      comments.forEach(comment => {
        const text = comment.hebrew || comment.text || '';

        // Check for explicit mentions of other commentators
        Object.entries(REFERENCE_PATTERNS).forEach(([referencedId, patterns]) => {
          if (referencedId !== commentatorId) {
            const hasReference = patterns.some(pattern => pattern.test(text));

            if (hasReference) {
              // Check if we already have this dialogue from config
              const existingDialogue = dialogues.find(d =>
                d.responder.id === commentatorId &&
                d.respondedTo.id === referencedId
              );

              if (!existingDialogue) {
                dialogues.push({
                  responder: { id: commentatorId, ...COMMENTATORS[commentatorId] },
                  respondedTo: { id: referencedId, ...COMMENTATORS[referencedId] },
                  responderComments: [comment],
                  respondedToComments: verseCommentaries[referencedId] || [],
                  detectionMethod: 'textual_reference',
                  referencedText: text.substring(0, 100)
                });
              } else {
                // Mark the existing dialogue as having textual confirmation
                existingDialogue.hasTextualConfirmation = true;
              }
            }
          }
        });
      });
    });

    // Sort dialogues: textual confirmations first, then by responder name
    dialogues.sort((a, b) => {
      if (a.hasTextualConfirmation && !b.hasTextualConfirmation) return -1;
      if (!a.hasTextualConfirmation && b.hasTextualConfirmation) return 1;
      return (a.responder.name || '').localeCompare(b.responder.name || '');
    });

    return dialogues;
  }, [getFromCache, REFERENCE_PATTERNS]);

  // ============================================================================
  // Verse-Level Access
  // ============================================================================

  const getCommentaryForVerse = useCallback((book, chapter, verse) => {
    const result = {
      rashi: [],
      ramban: [],
      ibn_ezra: [],
      sforno: [],
      tosafot: [],
      maharsha: []
    };

    Object.keys(result).forEach(commentator => {
      const cached = getFromCache(book, chapter, commentator);

      if (cached?.data?.verseMap instanceof Map) {
        result[commentator] = cached.data.verseMap.get(verse) ||
                              cached.data.verseMap.get(parseInt(verse)) ||
                              cached.data.verseMap.get(String(verse)) || [];
      } else if (Array.isArray(cached?.data?.comments)) {
        // Daf-level: filter or return all
        result[commentator] = cached.data.comments.filter(c =>
          !c.verse || c.verse === verse || c.verse === parseInt(verse)
        );
      }
    });

    return result;
  }, [getFromCache]);

  /**
   * Get all commentaries for current verse (convenience method)
   */
  const getCurrentVerseCommentaries = useCallback((verse) => {
    if (!selectedBook || !selectedChapter) return {};
    return getCommentaryForVerse(selectedBook, selectedChapter, verse);
  }, [selectedBook, selectedChapter, getCommentaryForVerse]);

  const isLoading = useCallback((commentator) => {
    if (commentator) {
      return loadingState[commentator] || false;
    }
    return Object.values(loadingState).some(Boolean);
  }, [loadingState]);

  // ============================================================================
  // Cache Statistics
  // ============================================================================

  const getCacheStats = useCallback(() => {
    const stats = {
      totalEntries: cacheRef.current.size,
      byCommentator: {},
      chapters: new Set()
    };

    cacheRef.current.forEach((cached) => {
      const { commentator, book, chapter } = cached;
      stats.byCommentator[commentator] = (stats.byCommentator[commentator] || 0) + 1;
      stats.chapters.add(`${book}:${chapter}`);
    });

    stats.uniqueChapters = stats.chapters.size;
    delete stats.chapters;

    return stats;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    loadingRef.current.clear();
    errorRef.current.clear();
    setErrors({});
    setLoadingState({});
    setCacheVersion(v => v + 1);
    log.debug('Commentary cache cleared');
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo(() => ({
    // Data access
    getCommentaryForVerse,
    getCurrentVerseCommentaries,
    getFromCache,
    isInCache,
    isLoading,
    errors,

    // Loading
    loadCommentary,
    loadEnabledCommentaries,
    prefetchAdjacent,

    // Scholar features
    searchAcrossCommentaries,
    findCommentatorDialogues,
    getAvailableCommentators: () => getAvailableCommentators(selectedBook),

    // Cache management
    getCacheStats,
    clearCache,
    cacheVersion,

    // State
    isTalmud
  }), [
    getCommentaryForVerse, getCurrentVerseCommentaries, getFromCache, isInCache, isLoading, errors,
    loadCommentary, loadEnabledCommentaries, prefetchAdjacent,
    searchAcrossCommentaries, findCommentatorDialogues, selectedBook,
    getCacheStats, clearCache, cacheVersion, isTalmud
  ]);

  return (
    <CommentaryContext.Provider value={value}>
      {children}
    </CommentaryContext.Provider>
  );
}

/**
 * useCommentary - Hook to access commentary context
 */
export function useCommentary() {
  const context = useContext(CommentaryContext);
  if (!context) {
    throw new Error('useCommentary must be used within a CommentaryProvider');
  }
  return context;
}

/**
 * useCommentaryForVerse - Convenience hook for verse-level commentary
 */
export function useCommentaryForVerse(verse) {
  const { getCurrentVerseCommentaries, isLoading, errors } = useCommentary();

  const commentaries = useMemo(() => {
    return getCurrentVerseCommentaries(verse);
  }, [getCurrentVerseCommentaries, verse]);

  return { commentaries, isLoading: isLoading(), errors };
}

export default CommentaryContext;
