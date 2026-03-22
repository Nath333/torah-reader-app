/**
 * CommentaryContext - Centralized Commentary Data Management
 *
 * Scholar-grade features:
 * 1. Shared cache across all components (no duplicate fetches)
 * 2. Pre-fetching of adjacent chapters
 * 3. Cross-commentary search (find where Ramban mentions Rashi)
 * 4. Commentary dialogue detection (who responds to whom)
 *
 * Usage:
 *   const { getCommentaryForVerse, searchAcrossCommentaries, prefetchAdjacent } = useCommentary();
 */

import React, { createContext, useContext, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useTorah } from './TorahContext';
import { useSettings } from './SettingsContext';
import {
  getCommentary,
  getAvailableCommentators,
  getRashiForChapter,
  getRambanForChapter,
  checkCommentaryAvailability
} from '../services/commentaryServiceFactory';
import { COMMENTATORS } from '../constants/commentatorRegistry';
import { createLogger } from '../utils/debug';

const log = createLogger('CommentaryContext');

const CommentaryContext = createContext(null);

// Cache configuration
const CACHE_MAX_CHAPTERS = 10; // Keep up to 10 chapters in memory
const PREFETCH_DELAY = 2000; // Wait 2s before prefetching adjacent

/**
 * CommentaryProvider - Wraps app to provide global commentary state
 */
export function CommentaryProvider({ children }) {
  const { selectedBook, selectedChapter } = useTorah();
  const { showRashi, showRamban, showIbnEzra, showSforno, showTosafot, showMaharsha } = useSettings();

  // ============================================================================
  // Global Commentary Cache
  // ============================================================================
  const cacheRef = useRef(new Map()); // Map<cacheKey, commentaryData>
  const loadingRef = useRef(new Set()); // Set<cacheKey> for in-flight requests
  const [cacheVersion, setCacheVersion] = useState(0); // Trigger re-renders on cache update

  /**
   * Generate cache key for a chapter's commentary
   */
  const getCacheKey = useCallback((book, chapter, commentator) => {
    return `${commentator}:${book}:${chapter}`;
  }, []);

  /**
   * Check if commentary is in cache
   */
  const isInCache = useCallback((book, chapter, commentator) => {
    return cacheRef.current.has(getCacheKey(book, chapter, commentator));
  }, [getCacheKey]);

  /**
   * Get commentary from cache
   */
  const getFromCache = useCallback((book, chapter, commentator) => {
    return cacheRef.current.get(getCacheKey(book, chapter, commentator));
  }, [getCacheKey]);

  /**
   * Add commentary to cache (with LRU eviction)
   */
  const addToCache = useCallback((book, chapter, commentator, data) => {
    const key = getCacheKey(book, chapter, commentator);

    // LRU eviction: remove oldest if at capacity
    if (cacheRef.current.size >= CACHE_MAX_CHAPTERS * 7) { // 7 commentators max
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      book,
      chapter,
      commentator
    });

    setCacheVersion(v => v + 1); // Trigger re-render
  }, [getCacheKey]);

  // ============================================================================
  // Commentary Loading
  // ============================================================================

  /**
   * Load a specific commentator for a chapter
   */
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

    loadingRef.current.add(key);

    try {
      log.debug(`Loading ${commentator} for ${book} ${chapter}`);

      // Use batch loading for Rashi and Ramban
      let result;
      if (commentator === 'rashi') {
        const verseMap = await getRashiForChapter(book, chapter);
        result = { verseMap, type: 'chapter' };
      } else if (commentator === 'ramban') {
        const verseMap = await getRambanForChapter(book, chapter);
        result = { verseMap, type: 'chapter' };
      } else {
        // Per-verse loading for others
        result = await getCommentary(commentator, book, chapter);
      }

      addToCache(book, chapter, commentator, result);
      return result;
    } catch (error) {
      log.error(`Failed to load ${commentator}:`, error);
      return null;
    } finally {
      loadingRef.current.delete(key);
    }
  }, [getCacheKey, getFromCache, addToCache]);

  /**
   * Load all enabled commentaries for current chapter
   */
  const loadEnabledCommentaries = useCallback(async () => {
    if (!selectedBook || !selectedChapter) return;

    const promises = [];

    if (showRashi) promises.push(loadCommentary(selectedBook, selectedChapter, 'rashi'));
    if (showRamban) promises.push(loadCommentary(selectedBook, selectedChapter, 'ramban'));
    if (showIbnEzra) promises.push(loadCommentary(selectedBook, selectedChapter, 'ibn_ezra'));
    if (showSforno) promises.push(loadCommentary(selectedBook, selectedChapter, 'sforno'));
    if (showTosafot) promises.push(loadCommentary(selectedBook, selectedChapter, 'tosafot'));
    if (showMaharsha) promises.push(loadCommentary(selectedBook, selectedChapter, 'maharsha'));

    await Promise.all(promises);
  }, [selectedBook, selectedChapter, showRashi, showRamban, showIbnEzra, showSforno, showTosafot, showMaharsha, loadCommentary]);

  // Auto-load when chapter changes
  useEffect(() => {
    loadEnabledCommentaries();
  }, [loadEnabledCommentaries]);

  // ============================================================================
  // Pre-fetching Adjacent Chapters
  // ============================================================================

  /**
   * Prefetch next and previous chapters
   */
  const prefetchAdjacent = useCallback(async (book, chapter) => {
    const prevChapter = parseInt(chapter) - 1;
    const nextChapter = parseInt(chapter) + 1;

    const enabledCommentators = [];
    if (showRashi) enabledCommentators.push('rashi');
    if (showRamban) enabledCommentators.push('ramban');

    // Prefetch in background (don't await)
    setTimeout(async () => {
      for (const commentator of enabledCommentators) {
        if (prevChapter >= 1) {
          loadCommentary(book, prevChapter, commentator);
        }
        loadCommentary(book, nextChapter, commentator);
      }
    }, PREFETCH_DELAY);
  }, [showRashi, showRamban, loadCommentary]);

  // Auto-prefetch when settling on a chapter
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

  /**
   * Search for a term across all cached commentaries
   * @param {string} searchTerm - Hebrew or English term to search
   * @returns {Array} Matches with commentator, verse, and context
   */
  const searchAcrossCommentaries = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const results = [];
    const searchLower = searchTerm.toLowerCase();
    const searchHebrew = searchTerm; // Keep original for Hebrew

    cacheRef.current.forEach((cached, key) => {
      const { data, book, chapter, commentator } = cached;

      // Handle verseMap structure (Rashi, Ramban batch)
      if (data?.verseMap) {
        data.verseMap.forEach((comments, verseNum) => {
          comments.forEach((comment, idx) => {
            const matchInHebrew = comment.hebrew?.includes(searchHebrew);
            const matchInEnglish = comment.english?.toLowerCase().includes(searchLower);
            const matchInDibur = comment.diburHamatchil?.includes(searchHebrew);

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
          });
        });
      }

      // Handle array of comments structure
      if (Array.isArray(data?.comments)) {
        data.comments.forEach((comment, idx) => {
          const matchInHebrew = comment.hebrew?.includes(searchHebrew);
          const matchInEnglish = comment.english?.toLowerCase().includes(searchLower);

          if (matchInHebrew || matchInEnglish) {
            results.push({
              commentator,
              commentatorInfo: COMMENTATORS[commentator] || { name: commentator },
              book,
              chapter,
              verse: comment.verse || null,
              commentIndex: idx,
              matchType: matchInHebrew ? 'hebrew' : 'english',
              snippet: comment.hebrew?.substring(0, 150) || comment.english?.substring(0, 150)
            });
          }
        });
      }
    });

    return results;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- cacheVersion triggers re-renders

  /**
   * Find commentator dialogues - where one responds to another
   * Uses the respondsTo data from commentatorRegistry
   */
  const findCommentatorDialogues = useCallback((book, chapter, verse) => {
    const dialogues = [];

    // Get all cached commentaries for this verse
    const verseCommentaries = {};

    Object.keys(COMMENTATORS).forEach(commentatorId => {
      const cached = getFromCache(book, chapter, commentatorId);
      if (cached?.data?.verseMap) {
        const comments = cached.data.verseMap.get(verse) || cached.data.verseMap.get(parseInt(verse));
        if (comments?.length > 0) {
          verseCommentaries[commentatorId] = comments;
        }
      }
    });

    // Check for response patterns
    Object.entries(verseCommentaries).forEach(([commentatorId, comments]) => {
      const info = COMMENTATORS[commentatorId];
      if (info?.respondsTo?.length > 0) {
        info.respondsTo.forEach(respondedToId => {
          if (verseCommentaries[respondedToId]) {
            dialogues.push({
              responder: { id: commentatorId, ...info },
              respondedTo: { id: respondedToId, ...COMMENTATORS[respondedToId] },
              responderComments: comments,
              respondedToComments: verseCommentaries[respondedToId]
            });
          }
        });
      }
    });

    return dialogues;
  }, [getFromCache]);

  // ============================================================================
  // Verse-Level Access
  // ============================================================================

  /**
   * Get all commentaries for a specific verse
   */
  const getCommentariesForVerse = useCallback((book, chapter, verse) => {
    const result = {};

    ['rashi', 'ramban', 'ibn_ezra', 'sforno', 'tosafot', 'maharsha'].forEach(commentator => {
      const cached = getFromCache(book, chapter, commentator);

      if (cached?.data?.verseMap) {
        // Batch-loaded format
        const comments = cached.data.verseMap.get(verse) || cached.data.verseMap.get(parseInt(verse)) || [];
        result[commentator] = comments;
      } else if (cached?.data?.comments) {
        // Array format - filter by verse
        result[commentator] = cached.data.comments.filter(c => c.verse === verse || c.verse === parseInt(verse));
      } else {
        result[commentator] = [];
      }
    });

    return result;
  }, [getFromCache]);

  /**
   * Check if any commentary is loading
   */
  const isLoading = useCallback((book, chapter, commentator) => {
    if (commentator) {
      return loadingRef.current.has(getCacheKey(book, chapter, commentator));
    }
    // Check if any commentator is loading for this chapter
    return ['rashi', 'ramban', 'ibn_ezra', 'sforno', 'tosafot', 'maharsha'].some(c =>
      loadingRef.current.has(getCacheKey(book, chapter, c))
    );
  }, [getCacheKey]);

  // ============================================================================
  // Cache Statistics (for debugging)
  // ============================================================================

  const getCacheStats = useCallback(() => {
    const stats = {
      totalEntries: cacheRef.current.size,
      byCommentator: {},
      oldestEntry: null,
      newestEntry: null
    };

    cacheRef.current.forEach((cached, key) => {
      const { commentator, timestamp } = cached;
      stats.byCommentator[commentator] = (stats.byCommentator[commentator] || 0) + 1;

      if (!stats.oldestEntry || timestamp < stats.oldestEntry.timestamp) {
        stats.oldestEntry = { key, timestamp };
      }
      if (!stats.newestEntry || timestamp > stats.newestEntry.timestamp) {
        stats.newestEntry = { key, timestamp };
      }
    });

    return stats;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- cacheVersion triggers re-renders

  /**
   * Clear the entire cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    loadingRef.current.clear();
    setCacheVersion(v => v + 1);
    log.debug('Commentary cache cleared');
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo(() => ({
    // Data access
    getCommentariesForVerse,
    getFromCache,
    isInCache,
    isLoading,

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
    cacheVersion
  }), [
    getCommentariesForVerse, getFromCache, isInCache, isLoading,
    loadCommentary, loadEnabledCommentaries, prefetchAdjacent,
    searchAcrossCommentaries, findCommentatorDialogues, selectedBook,
    getCacheStats, clearCache, cacheVersion
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

export default CommentaryContext;
