/**
 * useCommentaryLoader - Custom hook for loading commentary data
 *
 * Extracts all commentary loading logic from TorahReader to reduce complexity.
 * Manages Rashi, Tosafot, Maharsha, Ramban, Ibn Ezra, Sforno, and Soncino loading.
 *
 * Features:
 * - Batch loading for chapters (single API call instead of per-verse)
 * - Deduplication via refs to prevent infinite loops
 * - Supports both Torah and Talmud content types
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  isTalmudBook,
  getRashiForChapter,
  getTosafotForDaf,
  getMaharshaForDaf,
  getRambanForChapter,
  getIbnEzraForChapter,
  getSfornoForChapter
} from '../services/sefariaApi';
import { getSoncinoFootnotesForTractate, isTractateAvailable } from '../services/soncinoService';
import { createLogger } from '../utils/debug';

const log = createLogger('useCommentaryLoader');

/**
 * Configuration for each commentary type
 */
const COMMENTARY_CONFIG = {
  rashi: {
    name: 'Rashi',
    supportsTorah: true,
    supportsTalmud: true,
    batchLoad: true
  },
  tosafot: {
    name: 'Tosafot',
    supportsTorah: false,
    supportsTalmud: true,
    batchLoad: true
  },
  maharsha: {
    name: 'Maharsha',
    supportsTorah: false,
    supportsTalmud: true,
    batchLoad: true
  },
  ramban: {
    name: 'Ramban',
    supportsTorah: true,
    supportsTalmud: false,
    batchLoad: true
  },
  ibnEzra: {
    name: 'Ibn Ezra',
    supportsTorah: true,
    supportsTalmud: false,
    batchLoad: false
  },
  sforno: {
    name: 'Sforno',
    supportsTorah: true,
    supportsTalmud: false,
    batchLoad: false
  },
  soncino: {
    name: 'Soncino',
    supportsTorah: false,
    supportsTalmud: true,
    batchLoad: true
  }
};

/**
 * useCommentaryLoader - Hook for loading and managing commentary data
 *
 * @param {Object} options
 * @param {string} options.selectedBook - Currently selected book
 * @param {string|number} options.selectedChapter - Currently selected chapter
 * @param {Array} options.verses - Array of verse objects
 * @param {boolean} options.isTorahBook - Whether the current book is Torah
 * @param {Object} options.showFlags - Object with show flags for each commentary
 * @returns {Object} Commentary data and loading states
 */
export function useCommentaryLoader({
  selectedBook,
  selectedChapter,
  verses = [],
  isTorahBook = false,
  showFlags = {}
}) {
  // Data states
  const [rashiData, setRashiData] = useState({});
  const [tosafotData, setTosafotData] = useState({});
  const [maharshaData, setMaharshaData] = useState({});
  const [rambanData, setRambanData] = useState({});
  const [ibnEzraData, setIbnEzraData] = useState({});
  const [sfornoData, setSfornoData] = useState({});
  const [soncinoData, setSoncinoData] = useState({});

  // Loading states
  const [rashiLoading, setRashiLoading] = useState({});
  const [tosafotLoading, setTosafotLoading] = useState(false);
  const [maharshaLoading, setMaharshaLoading] = useState(false);
  const [rambanLoading, setRambanLoading] = useState({});
  const [ibnEzraLoading, setIbnEzraLoading] = useState({});
  const [sfornoLoading, setSfornoLoading] = useState({});
  const [soncinoLoading, setSoncinoLoading] = useState(false);

  // Error states for UI feedback
  const [errors, setErrors] = useState({});

  // Refs to track loaded items and prevent duplicate requests
  const rashiLoadedRef = useRef(new Set());
  const rambanLoadedRef = useRef(new Set());
  const ibnEzraLoadedRef = useRef(new Set());
  const sfornoLoadedRef = useRef(new Set());
  const tosafotLoadedRef = useRef(new Set());
  const maharshaLoadedRef = useRef(new Set());
  const soncinoLoadedRef = useRef(new Set());

  // AbortController ref for canceling in-flight requests
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset when book/chapter changes
  useEffect(() => {
    // Cancel any in-flight requests when navigation changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, [selectedBook, selectedChapter]);

  // Derived values
  const isTalmud = useMemo(() => isTalmudBook(selectedBook), [selectedBook]);
  const hasVerses = verses.length > 0;
  const hasSoncinoAvailable = useMemo(() => {
    return isTalmud && isTractateAvailable(selectedBook);
  }, [isTalmud, selectedBook]);

  // Normalized Rashi data: provides verse-level keys for both Torah and Talmud
  // For Talmud, expands daf-level data to all verse keys for backwards compatibility
  const rashiDataByVerse = useMemo(() => {
    if (isTalmud) {
      // For Talmud, daf-level data needs to be mapped to verse-level keys
      const dafKey = `${selectedBook}:${selectedChapter}`;
      const dafData = rashiData[dafKey];
      if (!dafData || !verses.length) return rashiData;

      // Create object with verse-level keys pointing to same daf data
      const normalized = { ...rashiData };
      verses.forEach(verse => {
        const verseKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
        normalized[verseKey] = dafData;
      });
      return normalized;
    }
    return rashiData;
  }, [isTalmud, selectedBook, selectedChapter, rashiData, verses]);

  // ============================================================================
  // Rashi Loading
  // ============================================================================
  const loadRashiForChapter = useCallback(async () => {
    const chapterKey = `${selectedBook}:${selectedChapter}`;
    if (rashiLoadedRef.current.has(chapterKey)) return;
    rashiLoadedRef.current.add(chapterKey);

    setRashiLoading(prev => ({ ...prev, [chapterKey]: true }));
    try {
      log.debug(`Rashi: Batch loading chapter ${chapterKey}`);

      // Use batch API for all cases (Torah, Tanach, AND Talmud)
      // This fixes N+1 problem: was making 30+ calls per daf, now makes 1
      const verseMap = await getRashiForChapter(selectedBook, selectedChapter);

      // Check if still mounted and not aborted before updating state
      if (!mountedRef.current) return;

      const newRashiData = {};

      if (isTalmud) {
        // Talmud: all comments come under 'all' key (daf-level, not verse-level)
        const allComments = verseMap.get('all') || [];
        // Store under daf key (same pattern as Tosafot/Maharsha)
        newRashiData[chapterKey] = allComments;
        rashiLoadedRef.current.add(chapterKey);
        log.debug(`Rashi: Loaded ${allComments.length} Talmud comments with single API call`);
      } else {
        // Torah/Tanach: verse-level comments
        verseMap.forEach((comments, verseNum) => {
          const cacheKey = `${selectedBook}:${selectedChapter}:${verseNum}`;
          newRashiData[cacheKey] = comments;
          rashiLoadedRef.current.add(cacheKey);
        });
        log.debug(`Rashi: Loaded ${verseMap.size} verses with batch API call`);
      }
      setRashiData(prev => ({ ...prev, ...newRashiData }));
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to batch fetch Rashi:', error);
      setErrors(prev => ({ ...prev, rashi: error.message || 'Failed to load Rashi commentary' }));
    }
    if (mountedRef.current) {
      setRashiLoading(prev => ({ ...prev, [chapterKey]: false }));
    }
  }, [selectedBook, selectedChapter, isTalmud]);

  // ============================================================================
  // Tosafot Loading (Talmud only)
  // ============================================================================
  const loadTosafot = useCallback(async () => {
    const cacheKey = `${selectedBook}:${selectedChapter}`;
    if (!isTalmud || tosafotLoadedRef.current.has(cacheKey)) return;
    tosafotLoadedRef.current.add(cacheKey);

    setTosafotLoading(true);
    try {
      const comments = await getTosafotForDaf(selectedBook, selectedChapter);
      if (!mountedRef.current) return;
      setTosafotData(prev => ({ ...prev, [cacheKey]: comments }));
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to fetch Tosafot:', error);
      setTosafotData(prev => ({ ...prev, [cacheKey]: [] }));
      setErrors(prev => ({ ...prev, tosafot: error.message || 'Failed to load Tosafot commentary' }));
    }
    if (mountedRef.current) setTosafotLoading(false);
  }, [selectedBook, selectedChapter, isTalmud]);

  // ============================================================================
  // Maharsha Loading (Talmud only)
  // ============================================================================
  const loadMaharsha = useCallback(async () => {
    const cacheKey = `${selectedBook}:${selectedChapter}`;
    if (!isTalmud || maharshaLoadedRef.current.has(cacheKey)) return;
    maharshaLoadedRef.current.add(cacheKey);

    setMaharshaLoading(true);
    try {
      const data = await getMaharshaForDaf(selectedBook, selectedChapter);
      if (!mountedRef.current) return;
      setMaharshaData(prev => ({ ...prev, [cacheKey]: data }));
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to fetch Maharsha:', error);
      setMaharshaData(prev => ({ ...prev, [cacheKey]: { comments: [] } }));
      setErrors(prev => ({ ...prev, maharsha: error.message || 'Failed to load Maharsha commentary' }));
    }
    if (mountedRef.current) setMaharshaLoading(false);
  }, [selectedBook, selectedChapter, isTalmud]);

  // ============================================================================
  // Soncino Loading (Talmud only)
  // ============================================================================
  const loadSoncino = useCallback(async () => {
    if (!selectedChapter) {
      log.verbose('Soncino: No daf selected, skipping');
      return;
    }

    const cacheKey = `${selectedBook}:${selectedChapter}`;
    if (!isTalmud || !hasSoncinoAvailable || soncinoLoadedRef.current.has(cacheKey)) {
      return;
    }
    soncinoLoadedRef.current.add(cacheKey);

    setSoncinoLoading(true);
    try {
      log.verbose(`Soncino: Fetching footnotes for ${selectedBook} ${selectedChapter}`);
      const footnotes = await getSoncinoFootnotesForTractate(selectedBook, selectedChapter);
      if (!mountedRef.current) return;
      log.verbose(`Soncino: Got ${footnotes?.length || 0} footnotes`);
      setSoncinoData(prev => ({ ...prev, [cacheKey]: footnotes }));
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Soncino: Failed to fetch:', error);
      setSoncinoData(prev => ({ ...prev, [cacheKey]: [], _error: error.message }));
      setErrors(prev => ({ ...prev, soncino: error.message || 'Failed to load Soncino commentary' }));
    }
    if (mountedRef.current) setSoncinoLoading(false);
  }, [selectedBook, selectedChapter, isTalmud, hasSoncinoAvailable]);

  // ============================================================================
  // Ramban Loading (Torah only)
  // ============================================================================
  const loadRambanForChapter = useCallback(async () => {
    const chapterKey = `ramban:${selectedBook}:${selectedChapter}`;
    if (rambanLoadedRef.current.has(chapterKey)) return;
    rambanLoadedRef.current.add(chapterKey);

    setRambanLoading(prev => ({ ...prev, [chapterKey]: true }));
    try {
      log.debug(`Ramban: Batch loading chapter ${selectedBook} ${selectedChapter}`);
      const verseMap = await getRambanForChapter(selectedBook, selectedChapter);

      if (!mountedRef.current) return;

      const newRambanData = {};
      verseMap.forEach((comments, verseNum) => {
        const cacheKey = `${selectedBook}:${selectedChapter}:${verseNum}`;
        newRambanData[cacheKey] = { comments };
        rambanLoadedRef.current.add(cacheKey);
      });

      setRambanData(prev => ({ ...prev, ...newRambanData }));
      log.debug(`Ramban: Loaded ${verseMap.size} verses with batch API call`);
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to batch fetch Ramban:', error);
      setErrors(prev => ({ ...prev, ramban: error.message || 'Failed to load Ramban commentary' }));
    }
    if (mountedRef.current) setRambanLoading(prev => ({ ...prev, [chapterKey]: false }));
  }, [selectedBook, selectedChapter]);

  // ============================================================================
  // Ibn Ezra Loading (Torah only, batch per chapter)
  // ============================================================================
  const loadIbnEzraForChapter = useCallback(async () => {
    const chapterKey = `ibnezra:${selectedBook}:${selectedChapter}`;
    if (ibnEzraLoadedRef.current.has(chapterKey)) return;
    ibnEzraLoadedRef.current.add(chapterKey);

    setIbnEzraLoading(prev => ({ ...prev, [chapterKey]: true }));
    try {
      log.debug(`Ibn Ezra: Batch loading chapter ${selectedBook}:${selectedChapter}`);
      const verseMap = await getIbnEzraForChapter(selectedBook, selectedChapter);

      if (!mountedRef.current) return;

      // Convert Map to object with verse-level keys
      const newIbnEzraData = {};
      verseMap.forEach((comments, verseNum) => {
        const cacheKey = `${selectedBook}:${selectedChapter}:${verseNum}`;
        newIbnEzraData[cacheKey] = { comments };
        ibnEzraLoadedRef.current.add(cacheKey);
      });

      setIbnEzraData(prev => ({ ...prev, ...newIbnEzraData }));
      log.debug(`Ibn Ezra: Loaded ${verseMap.size} verses with single API call`);
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to batch fetch Ibn Ezra:', error);
      setErrors(prev => ({ ...prev, ibnEzra: error.message || 'Failed to load Ibn Ezra commentary' }));
    }
    if (mountedRef.current) setIbnEzraLoading(prev => ({ ...prev, [chapterKey]: false }));
  }, [selectedBook, selectedChapter]);

  // ============================================================================
  // Sforno Loading (Torah only, batch per chapter)
  // ============================================================================
  const loadSfornoForChapter = useCallback(async () => {
    const chapterKey = `sforno:${selectedBook}:${selectedChapter}`;
    if (sfornoLoadedRef.current.has(chapterKey)) return;
    sfornoLoadedRef.current.add(chapterKey);

    setSfornoLoading(prev => ({ ...prev, [chapterKey]: true }));
    try {
      log.debug(`Sforno: Batch loading chapter ${selectedBook}:${selectedChapter}`);
      const verseMap = await getSfornoForChapter(selectedBook, selectedChapter);

      if (!mountedRef.current) return;

      // Convert Map to object with verse-level keys
      const newSfornoData = {};
      verseMap.forEach((comments, verseNum) => {
        const cacheKey = `${selectedBook}:${selectedChapter}:${verseNum}`;
        newSfornoData[cacheKey] = { comments };
        sfornoLoadedRef.current.add(cacheKey);
      });

      setSfornoData(prev => ({ ...prev, ...newSfornoData }));
      log.debug(`Sforno: Loaded ${verseMap.size} verses with single API call`);
    } catch (error) {
      if (!mountedRef.current) return;
      log.error('Failed to batch fetch Sforno:', error);
      setErrors(prev => ({ ...prev, sforno: error.message || 'Failed to load Sforno commentary' }));
    }
    if (mountedRef.current) setSfornoLoading(prev => ({ ...prev, [chapterKey]: false }));
  }, [selectedBook, selectedChapter]);

  // ============================================================================
  // Effects to trigger loading based on show flags
  // ============================================================================

  // Load Rashi
  useEffect(() => {
    if (showFlags.showRashi && hasVerses) {
      loadRashiForChapter();
    }
  }, [showFlags.showRashi, hasVerses, selectedBook, selectedChapter, loadRashiForChapter]);

  // Load Tosafot (Talmud only)
  useEffect(() => {
    if (showFlags.showTosafot && isTalmud) {
      loadTosafot();
    }
  }, [showFlags.showTosafot, isTalmud, loadTosafot]);

  // Load Maharsha (Talmud only)
  useEffect(() => {
    if (showFlags.showMaharsha && isTalmud) {
      loadMaharsha();
    }
  }, [showFlags.showMaharsha, isTalmud, loadMaharsha]);

  // Load Soncino (Talmud only)
  useEffect(() => {
    if (showFlags.showSoncino && hasSoncinoAvailable) {
      loadSoncino();
    }
  }, [showFlags.showSoncino, hasSoncinoAvailable, loadSoncino]);

  // Load Ramban (Torah only)
  useEffect(() => {
    if (showFlags.showRamban && isTorahBook && hasVerses) {
      loadRambanForChapter();
    }
  }, [showFlags.showRamban, isTorahBook, hasVerses, selectedBook, selectedChapter, loadRambanForChapter]);

  // Load Ibn Ezra (Torah only, batch per chapter)
  useEffect(() => {
    if (showFlags.showIbnEzra && isTorahBook && hasVerses) {
      loadIbnEzraForChapter();
    }
  }, [showFlags.showIbnEzra, isTorahBook, hasVerses, selectedBook, selectedChapter, loadIbnEzraForChapter]);

  // Load Sforno (Torah only, batch per chapter)
  useEffect(() => {
    if (showFlags.showSforno && isTorahBook && hasVerses) {
      loadSfornoForChapter();
    }
  }, [showFlags.showSforno, isTorahBook, hasVerses, selectedBook, selectedChapter, loadSfornoForChapter]);

  // ============================================================================
  // Helper functions for consumers
  // ============================================================================

  /**
   * Get Rashi for a specific verse (uses normalized data with verse-level keys)
   */
  const getRashiForVerse = useCallback((verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    return rashiDataByVerse[cacheKey] || [];
  }, [selectedBook, selectedChapter, rashiDataByVerse]);

  /**
   * Get commentary data for a specific verse
   */
  const getCommentaryForVerse = useCallback((verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    const dafKey = `${selectedBook}:${selectedChapter}`;

    return {
      // Use helper that handles Talmud daf-level vs Torah verse-level
      rashi: getRashiForVerse(verseNumber),
      tosafot: tosafotData[dafKey] || [],
      maharsha: maharshaData[dafKey]?.comments || [],
      ramban: rambanData[cacheKey]?.comments || [],
      ibnEzra: ibnEzraData[cacheKey]?.comments || [],
      sforno: sfornoData[cacheKey]?.comments || [],
      soncino: soncinoData[dafKey] || []
    };
  }, [selectedBook, selectedChapter, getRashiForVerse, tosafotData, maharshaData, rambanData, ibnEzraData, sfornoData, soncinoData]);

  /**
   * Check if any commentary is loading for a verse
   */
  const isCommentaryLoading = useCallback((verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    const chapterKey = `${selectedBook}:${selectedChapter}`;

    return (
      rashiLoading[chapterKey] ||
      tosafotLoading ||
      maharshaLoading ||
      rambanLoading[`ramban:${chapterKey}`] ||
      ibnEzraLoading[cacheKey] ||
      sfornoLoading[cacheKey] ||
      soncinoLoading
    );
  }, [selectedBook, selectedChapter, rashiLoading, tosafotLoading, maharshaLoading, rambanLoading, ibnEzraLoading, sfornoLoading, soncinoLoading]);

  /**
   * Clear all cached data (useful when switching books/chapters)
   */
  const clearCache = useCallback(() => {
    setRashiData({});
    setTosafotData({});
    setMaharshaData({});
    setRambanData({});
    setIbnEzraData({});
    setSfornoData({});
    setSoncinoData({});
    setErrors({});

    rashiLoadedRef.current.clear();
    rambanLoadedRef.current.clear();
    ibnEzraLoadedRef.current.clear();
    sfornoLoadedRef.current.clear();
    tosafotLoadedRef.current.clear();
    maharshaLoadedRef.current.clear();
    soncinoLoadedRef.current.clear();
  }, []);

  /**
   * Clear a specific error
   */
  const clearError = useCallback((commentaryType) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[commentaryType];
      return next;
    });
  }, []);

  return {
    // Data (rashiData is normalized: verse-level keys for both Torah and Talmud)
    rashiData: rashiDataByVerse,
    tosafotData,
    maharshaData,
    rambanData,
    ibnEzraData,
    sfornoData,
    soncinoData,

    // Loading states
    rashiLoading,
    tosafotLoading,
    maharshaLoading,
    rambanLoading,
    ibnEzraLoading,
    sfornoLoading,
    soncinoLoading,

    // Derived values
    isTalmud,
    hasSoncinoAvailable,

    // Error states
    errors,
    clearError,

    // Helper functions
    getRashiForVerse,
    getCommentaryForVerse,
    isCommentaryLoading,
    clearCache,

    // Manual loaders (for advanced use)
    loadRashiForChapter,
    loadTosafot,
    loadMaharsha,
    loadSoncino,
    loadRambanForChapter,
    loadIbnEzraForChapter,
    loadSfornoForChapter,

    // Configuration (for UI)
    COMMENTARY_CONFIG
  };
}

export default useCommentaryLoader;
