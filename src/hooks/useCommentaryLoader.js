/**
 * useCommentaryLoader - Custom hook for loading commentary data
 *
 * PRO SCHOLAR V10.1: Performance optimizations
 *
 * Fixes:
 * - Stabilized effect dependencies to prevent multiple re-runs
 * - Batched reducer actions to reduce renders
 * - Effect-level deduplication with stable key generation
 *
 * Features:
 * - Consolidated state management with useReducer
 * - Generic loader factory (eliminates repetitive code)
 * - Parallel loading when multiple commentaries are enabled
 * - Retry mechanism for failed requests
 * - Request deduplication across all commentary types
 *
 * Supports: Rashi, Tosafot, Maharsha, Ramban, Ibn Ezra, Sforno, Soncino
 */

import { useCallback, useEffect, useRef, useMemo, useReducer } from 'react';
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

// =============================================================================
// CONFIGURATION
// =============================================================================

const COMMENTARY_CONFIG = {
  rashi: {
    name: 'Rashi',
    key: 'rashi',
    supportsTorah: true,
    supportsTalmud: true,
    showFlag: 'showRashi',
    fetcher: getRashiForChapter,
    usesVerseMap: true,
    talmudDafLevel: true
  },
  tosafot: {
    name: 'Tosafot',
    key: 'tosafot',
    supportsTorah: false,
    supportsTalmud: true,
    showFlag: 'showTosafot',
    fetcher: getTosafotForDaf,
    usesVerseMap: false,
    talmudDafLevel: true
  },
  maharsha: {
    name: 'Maharsha',
    key: 'maharsha',
    supportsTorah: false,
    supportsTalmud: true,
    showFlag: 'showMaharsha',
    fetcher: getMaharshaForDaf,
    usesVerseMap: false,
    talmudDafLevel: true,
    wrapInComments: true
  },
  ramban: {
    name: 'Ramban',
    key: 'ramban',
    supportsTorah: true,
    supportsTalmud: false,
    showFlag: 'showRamban',
    fetcher: getRambanForChapter,
    usesVerseMap: true,
    wrapInComments: true
  },
  ibnEzra: {
    name: 'Ibn Ezra',
    key: 'ibnEzra',
    supportsTorah: true,
    supportsTalmud: false,
    showFlag: 'showIbnEzra',
    fetcher: getIbnEzraForChapter,
    usesVerseMap: true,
    wrapInComments: true
  },
  sforno: {
    name: 'Sforno',
    key: 'sforno',
    supportsTorah: true,
    supportsTalmud: false,
    showFlag: 'showSforno',
    fetcher: getSfornoForChapter,
    usesVerseMap: true,
    wrapInComments: true
  },
  soncino: {
    name: 'Soncino',
    key: 'soncino',
    supportsTorah: false,
    supportsTalmud: true,
    showFlag: 'showSoncino',
    fetcher: getSoncinoFootnotesForTractate,
    usesVerseMap: false,
    talmudDafLevel: true,
    requiresAvailabilityCheck: true
  }
};

const COMMENTARY_KEYS = Object.keys(COMMENTARY_CONFIG);

// =============================================================================
// REDUCER (with batched actions)
// =============================================================================

const initialState = {
  data: {
    rashi: {},
    tosafot: {},
    maharsha: {},
    ramban: {},
    ibnEzra: {},
    sforno: {},
    soncino: {}
  },
  loading: {
    rashi: false,
    tosafot: false,
    maharsha: false,
    ramban: false,
    ibnEzra: false,
    sforno: false,
    soncino: false
  },
  errors: {},
  retryCounts: {}
};

function commentaryReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.commentary]: action.value }
      };

    case 'SET_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          [action.commentary]: { ...state.data[action.commentary], ...action.data }
        }
      };

    // BATCHED: Set data + clear error + set loading=false in one dispatch
    case 'LOAD_SUCCESS': {
      const newErrors = { ...state.errors };
      delete newErrors[action.commentary];
      return {
        ...state,
        data: {
          ...state.data,
          [action.commentary]: { ...state.data[action.commentary], ...action.data }
        },
        loading: { ...state.loading, [action.commentary]: false },
        errors: newErrors
      };
    }

    // BATCHED: Set error + set empty data + set loading=false in one dispatch
    case 'LOAD_ERROR':
      return {
        ...state,
        data: {
          ...state.data,
          [action.commentary]: { ...state.data[action.commentary], ...action.emptyData }
        },
        loading: { ...state.loading, [action.commentary]: false },
        errors: { ...state.errors, [action.commentary]: action.error }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.commentary]: action.error }
      };

    case 'CLEAR_ERROR': {
      const newErrors = { ...state.errors };
      delete newErrors[action.commentary];
      return { ...state, errors: newErrors };
    }

    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCounts: {
          ...state.retryCounts,
          [action.key]: (state.retryCounts[action.key] || 0) + 1
        }
      };

    case 'RESET_ALL':
      return initialState;

    case 'RESET_DATA':
      return {
        ...state,
        data: initialState.data,
        errors: {},
        retryCounts: {}
      };

    default:
      return state;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useCommentaryLoader({
  selectedBook,
  selectedChapter,
  verses = [],
  isTorahBook = false,
  showFlags = {},
  enablePrefetch = false
}) {
  const [state, dispatch] = useReducer(commentaryReducer, initialState);

  // Refs for deduplication and lifecycle
  const loadedKeysRef = useRef(new Set());
  const pendingRequestsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const lastLoadConfigRef = useRef('');

  // Derived values
  const isTalmud = useMemo(() => isTalmudBook(selectedBook), [selectedBook]);
  const hasVerses = verses.length > 0;
  const hasSoncinoAvailable = useMemo(() => {
    return isTalmud && isTractateAvailable(selectedBook);
  }, [isTalmud, selectedBook]);

  // STABILIZE showFlags - extract primitive values to prevent effect re-runs
  const showRashi = showFlags.showRashi || false;
  const showTosafot = showFlags.showTosafot || false;
  const showMaharsha = showFlags.showMaharsha || false;
  const showRamban = showFlags.showRamban || false;
  const showIbnEzra = showFlags.showIbnEzra || false;
  const showSforno = showFlags.showSforno || false;
  const showSoncino = showFlags.showSoncino || false;

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, [selectedBook, selectedChapter]);

  // ==========================================================================
  // GENERIC LOADER (stable - no changing dependencies in closure)
  // ==========================================================================

  const loadCommentary = useCallback(async (config, book, chapter, talmud) => {
    const { key, name, fetcher, usesVerseMap, talmudDafLevel, wrapInComments } = config;
    const chapterKey = `${key}:${book}:${chapter}`;

    // Deduplication check
    if (loadedKeysRef.current.has(chapterKey)) {
      return;
    }

    // Check for pending request
    if (pendingRequestsRef.current.has(chapterKey)) {
      return pendingRequestsRef.current.get(chapterKey);
    }

    loadedKeysRef.current.add(chapterKey);
    dispatch({ type: 'SET_LOADING', commentary: key, value: true });

    const loadPromise = (async () => {
      try {
        log.debug(`${name}: Loading ${book} ${chapter}`);

        const result = await fetcher(book, chapter);

        if (!mountedRef.current) return;

        let newData = {};
        const dafKey = `${book}:${chapter}`;

        if (usesVerseMap && result instanceof Map) {
          if (talmud && talmudDafLevel) {
            const allComments = result.get('all') || [];
            newData[dafKey] = allComments;
            log.debug(`${name}: Loaded ${allComments.length} Talmud comments`);
          } else {
            result.forEach((comments, verseNum) => {
              const cacheKey = `${book}:${chapter}:${verseNum}`;
              newData[cacheKey] = wrapInComments ? { comments } : comments;
            });
            log.debug(`${name}: Loaded ${result.size} verses`);
          }
        } else {
          newData[dafKey] = wrapInComments ? { comments: result } : result;
          log.debug(`${name}: Loaded ${Array.isArray(result) ? result.length : 0} comments`);
        }

        // BATCHED dispatch - single state update (3 actions → 1)
        dispatch({ type: 'LOAD_SUCCESS', commentary: key, data: newData });

      } catch (error) {
        if (!mountedRef.current) return;
        log.error(`${name}: Failed to load:`, error);

        const dafKey = `${book}:${chapter}`;
        const emptyData = { [dafKey]: wrapInComments ? { comments: [] } : [] };

        // BATCHED dispatch - single state update
        dispatch({
          type: 'LOAD_ERROR',
          commentary: key,
          error: error.message || `Failed to load ${name}`,
          emptyData
        });
      } finally {
        pendingRequestsRef.current.delete(chapterKey);
      }
    })();

    pendingRequestsRef.current.set(chapterKey, loadPromise);
    return loadPromise;
  }, []); // Empty deps - uses passed arguments instead of closure

  // ==========================================================================
  // PARALLEL LOADING EFFECT (optimized with config key deduplication)
  // ==========================================================================

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;

    // Generate stable config key to detect actual changes
    const configKey = [
      selectedBook,
      selectedChapter,
      isTalmud,
      isTorahBook,
      hasVerses,
      hasSoncinoAvailable,
      showRashi,
      showTosafot,
      showMaharsha,
      showRamban,
      showIbnEzra,
      showSforno,
      showSoncino
    ].join('|');

    // Skip if config hasn't actually changed
    if (lastLoadConfigRef.current === configKey) {
      return;
    }
    lastLoadConfigRef.current = configKey;

    const flagMap = {
      showRashi,
      showTosafot,
      showMaharsha,
      showRamban,
      showIbnEzra,
      showSforno,
      showSoncino
    };

    const toLoad = [];

    COMMENTARY_KEYS.forEach(key => {
      const config = COMMENTARY_CONFIG[key];
      const shouldShow = flagMap[config.showFlag];

      const isApplicable = isTalmud
        ? config.supportsTalmud
        : (config.supportsTorah && isTorahBook);

      const isAvailable = key === 'soncino' ? hasSoncinoAvailable : true;
      const needsVerses = config.supportsTorah && !isTalmud;
      const hasRequiredVerses = !needsVerses || hasVerses;

      if (shouldShow && isApplicable && isAvailable && hasRequiredVerses) {
        toLoad.push({ config, key });
      }
    });

    if (toLoad.length > 0) {
      log.debug(`Loading ${toLoad.length} commentaries in parallel`);
      Promise.all(
        toLoad.map(({ config }) =>
          loadCommentary(config, selectedBook, selectedChapter, isTalmud)
        )
      );
    }
  }, [
    selectedBook,
    selectedChapter,
    isTalmud,
    isTorahBook,
    hasVerses,
    hasSoncinoAvailable,
    showRashi,
    showTosafot,
    showMaharsha,
    showRamban,
    showIbnEzra,
    showSforno,
    showSoncino,
    loadCommentary
  ]);

  // ==========================================================================
  // PREFETCHING (optional)
  // ==========================================================================

  useEffect(() => {
    if (!enablePrefetch || !selectedBook || !selectedChapter) return;

    const prefetchTimeout = setTimeout(() => {
      log.debug('Prefetch: Ready for adjacent chapters');
    }, 2000);

    return () => clearTimeout(prefetchTimeout);
  }, [enablePrefetch, selectedBook, selectedChapter]);

  // ==========================================================================
  // NORMALIZED DATA (Rashi verse-level keys for Talmud)
  // ==========================================================================

  const rashiDataByVerse = useMemo(() => {
    const rashiData = state.data.rashi;

    if (isTalmud && verses.length > 0) {
      const dafKey = `${selectedBook}:${selectedChapter}`;
      const dafData = rashiData[dafKey];

      if (!dafData) {
        return rashiData;
      }

      // Create verse-level keys pointing to daf data
      const normalized = { ...rashiData };
      verses.forEach(verse => {
        const verseKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
        normalized[verseKey] = dafData;
      });
      return normalized;
    }
    return rashiData;
  }, [isTalmud, selectedBook, selectedChapter, state.data.rashi, verses]);

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  const getRashiForVerse = useCallback((verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    return rashiDataByVerse[cacheKey] || [];
  }, [selectedBook, selectedChapter, rashiDataByVerse]);

  const getCommentaryForVerse = useCallback((verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    const dafKey = `${selectedBook}:${selectedChapter}`;

    return {
      rashi: getRashiForVerse(verseNumber),
      tosafot: state.data.tosafot[dafKey] || [],
      maharsha: state.data.maharsha[dafKey]?.comments || [],
      ramban: state.data.ramban[cacheKey]?.comments || [],
      ibnEzra: state.data.ibnEzra[cacheKey]?.comments || [],
      sforno: state.data.sforno[cacheKey]?.comments || [],
      soncino: state.data.soncino[dafKey] || []
    };
  }, [selectedBook, selectedChapter, getRashiForVerse, state.data]);

  const isCommentaryLoading = useCallback(() => {
    return Object.values(state.loading).some(Boolean);
  }, [state.loading]);

  const isAnyLoading = useMemo(() => {
    return Object.values(state.loading).some(Boolean);
  }, [state.loading]);

  const clearCache = useCallback(() => {
    dispatch({ type: 'RESET_DATA' });
    loadedKeysRef.current.clear();
    pendingRequestsRef.current.clear();
    lastLoadConfigRef.current = '';
  }, []);

  const clearError = useCallback((commentaryType) => {
    dispatch({ type: 'CLEAR_ERROR', commentary: commentaryType });
  }, []);

  const retry = useCallback(async (commentaryType) => {
    const config = COMMENTARY_CONFIG[commentaryType];
    if (!config) return;

    const chapterKey = `${commentaryType}:${selectedBook}:${selectedChapter}`;
    loadedKeysRef.current.delete(chapterKey);
    dispatch({ type: 'INCREMENT_RETRY', key: chapterKey });

    await loadCommentary(config, selectedBook, selectedChapter, isTalmud);
  }, [selectedBook, selectedChapter, isTalmud, loadCommentary]);

  // Stable loader references for external use
  const loaders = useMemo(() => ({
    rashi: () => loadCommentary(COMMENTARY_CONFIG.rashi, selectedBook, selectedChapter, isTalmud),
    tosafot: () => loadCommentary(COMMENTARY_CONFIG.tosafot, selectedBook, selectedChapter, isTalmud),
    maharsha: () => loadCommentary(COMMENTARY_CONFIG.maharsha, selectedBook, selectedChapter, isTalmud),
    ramban: () => loadCommentary(COMMENTARY_CONFIG.ramban, selectedBook, selectedChapter, isTalmud),
    ibnEzra: () => loadCommentary(COMMENTARY_CONFIG.ibnEzra, selectedBook, selectedChapter, isTalmud),
    sforno: () => loadCommentary(COMMENTARY_CONFIG.sforno, selectedBook, selectedChapter, isTalmud),
    soncino: () => loadCommentary(COMMENTARY_CONFIG.soncino, selectedBook, selectedChapter, isTalmud)
  }), [selectedBook, selectedChapter, isTalmud, loadCommentary]);

  // ==========================================================================
  // RETURN VALUE
  // ==========================================================================

  return {
    // Data
    rashiData: rashiDataByVerse,
    tosafotData: state.data.tosafot,
    maharshaData: state.data.maharsha,
    rambanData: state.data.ramban,
    ibnEzraData: state.data.ibnEzra,
    sfornoData: state.data.sforno,
    soncinoData: state.data.soncino,

    // Loading states
    rashiLoading: state.loading.rashi,
    tosafotLoading: state.loading.tosafot,
    maharshaLoading: state.loading.maharsha,
    rambanLoading: state.loading.ramban,
    ibnEzraLoading: state.loading.ibnEzra,
    sfornoLoading: state.loading.sforno,
    soncinoLoading: state.loading.soncino,
    isAnyLoading,

    // Derived values
    isTalmud,
    hasSoncinoAvailable,

    // Error states
    errors: state.errors,
    clearError,
    retry,

    // Helper functions
    getRashiForVerse,
    getCommentaryForVerse,
    isCommentaryLoading,
    clearCache,

    // Manual loaders
    loadRashiForChapter: loaders.rashi,
    loadTosafot: loaders.tosafot,
    loadMaharsha: loaders.maharsha,
    loadSoncino: loaders.soncino,
    loadRambanForChapter: loaders.ramban,
    loadIbnEzraForChapter: loaders.ibnEzra,
    loadSfornoForChapter: loaders.sforno,

    // Configuration
    COMMENTARY_CONFIG
  };
}

export default useCommentaryLoader;
