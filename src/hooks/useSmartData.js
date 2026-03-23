/**
 * useSmartData - React hook for intelligent data fetching
 * Handles connectivity, caching, and fallback automatically
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import smartDataService from '../services/smartDataService';

// =============================================================================
// useConnectivity - Track network/API status
// =============================================================================

export const useConnectivity = () => {
  const [status, setStatus] = useState(() => smartDataService.getConnectivityStatus());

  useEffect(() => {
    // Initial check
    smartDataService.checkConnectivity().then(setStatus);

    // Subscribe to changes
    const unsubscribe = smartDataService.onConnectivityChange(setStatus);

    // Periodic check every 30s
    const interval = setInterval(() => {
      smartDataService.checkConnectivity().then(setStatus);
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const refresh = useCallback(async () => {
    const newStatus = await smartDataService.checkConnectivity(true);
    setStatus(newStatus);
    return newStatus;
  }, []);

  return { ...status, refresh };
};

// =============================================================================
// useSmartLookup - Word lookup with smart fallback
// =============================================================================

export const useSmartLookup = (options = {}) => {
  const { language = 'hebrew', includeFrench = true } = options;

  const [selectedWord, setSelectedWord] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const lookup = useCallback(async (word) => {
    // Toggle off if same word
    if (selectedWord === word) {
      setSelectedWord(null);
      setResult(null);
      return null;
    }

    // Cancel previous lookup using native AbortController
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setSelectedWord(word);
    setIsLoading(true);
    setError(null);

    try {
      const lookupResult = await smartDataService.smartLookup(word, {
        includeFrench,
        language
      });

      if (!controller.signal.aborted) {
        if (lookupResult.success) {
          setResult(lookupResult);
          setError(null);
        } else {
          setResult(null);
          setError(lookupResult.error || 'Word not found');
        }
      }

      return lookupResult;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message);
        setResult(null);
      }
      return null;
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [selectedWord, includeFrench, language]);

  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setSelectedWord(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    selectedWord,
    result,
    isLoading,
    error,
    lookup,
    clear,
    // Convenience accessors
    english: result?.english,
    french: result?.french,
    sources: result?.sources || [],
    isOffline: result?.offline || false,
    source: result?.source
  };
};

// =============================================================================
// useSmartRAG - RAG context with prefetching
// =============================================================================

export const useSmartRAG = (options = {}) => {
  const { autoPrefetch = true } = options;

  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentRef = useRef(null);

  const fetchContext = useCallback(async ({ book, chapter, verse, mode = 'summary' }) => {
    const key = `${book}:${chapter}:${verse}:${mode}`;

    // Skip if already fetching same context
    if (currentRef.current === key && isLoading) {
      return context;
    }

    currentRef.current = key;
    setIsLoading(true);
    setError(null);

    try {
      const ragContext = await smartDataService.smartRAG({
        book,
        chapter,
        verse,
        mode
      });

      if (currentRef.current === key) {
        setContext(ragContext);

        // Auto-prefetch next verses
        if (autoPrefetch && ragContext) {
          smartDataService.prefetchRAGContext(book, chapter, verse, mode);
        }
      }

      return ragContext;
    } catch (err) {
      if (currentRef.current === key) {
        setError(err.message);
        setContext(null);
      }
      return null;
    } finally {
      if (currentRef.current === key) {
        setIsLoading(false);
      }
    }
  }, [autoPrefetch, isLoading, context]);

  const clear = useCallback(() => {
    currentRef.current = null;
    setContext(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    context,
    isLoading,
    error,
    fetchContext,
    clear,
    // Convenience accessors
    sources: context?.sources || [],
    sourceCount: context?.sources?.length || 0,
    fromCache: context?.fromCache || false,
    reference: context?.reference
  };
};

// =============================================================================
// useSmartAnalysis - AI analysis with RAG enhancement
// =============================================================================

export const useSmartAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const analyze = useCallback(async ({
    text,
    book,
    chapter,
    verse,
    mode = 'summary',
    source = 'Torah'
  }) => {
    // Cancel previous analysis using native AbortController
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await smartDataService.smartAnalyze({
        text,
        book,
        chapter,
        verse,
        mode,
        source
      });

      if (!controller.signal.aborted) {
        if (result.success) {
          setAnalysis(result);
          setError(null);
        } else {
          setAnalysis(null);
          setError(result.error);
        }
      }

      return result;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message);
        setAnalysis(null);
      }
      return null;
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyze,
    clear,
    // Convenience accessors
    ragEnhanced: analysis?.ragEnhanced || false,
    ragSourceCount: analysis?.ragSourceCount || 0,
    fromCache: analysis?.fromCache || false
  };
};

// =============================================================================
// useDataAvailability - Check what features are available
// =============================================================================

export const useDataAvailability = () => {
  const [availability, setAvailability] = useState({
    connectivity: { isOnline: true, mode: 'checking' },
    cache: { lookupMemory: 0, lookupOffline: 0, ragMemory: 0, ragOffline: 0 },
    features: {
      wordLookup: true,
      scholarlyLookup: false,
      ragContext: false,
      aiAnalysis: false,
      frenchTranslation: false
    }
  });

  useEffect(() => {
    const checkAvailability = async () => {
      const result = await smartDataService.getDataAvailability();
      setAvailability(result);
    };

    checkAvailability();

    // Re-check when connectivity changes
    const unsubscribe = smartDataService.onConnectivityChange(() => {
      checkAvailability();
    });

    return unsubscribe;
  }, []);

  return availability;
};

// =============================================================================
// usePrefetch - Manual prefetching control
// =============================================================================

export const usePrefetch = () => {
  const prefetchRAG = useCallback(async (book, chapter, currentVerse, mode) => {
    await smartDataService.prefetchRAGContext(book, chapter, currentVerse, mode);
  }, []);

  const prefetchWords = useCallback(async (words) => {
    await smartDataService.prefetchWordLookups(words);
  }, []);

  return { prefetchRAG, prefetchWords };
};

// =============================================================================
// Combined hook for common use case
// =============================================================================

export const useSmartStudy = ({ book, chapter, verse, mode = 'summary' } = {}) => {
  const connectivity = useConnectivity();
  const lookup = useSmartLookup();
  const rag = useSmartRAG();
  const analysis = useSmartAnalysis();
  const availability = useDataAvailability();
  const { prefetchRAG } = usePrefetch();

  // Auto-fetch RAG when reference changes
  useEffect(() => {
    if (book && chapter && verse) {
      rag.fetchContext({ book, chapter, verse, mode });
    }
  }, [book, chapter, verse, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch on verse change
  useEffect(() => {
    if (book && chapter && verse && connectivity.isOnline) {
      prefetchRAG(book, chapter, verse, mode);
    }
  }, [book, chapter, verse, mode, connectivity.isOnline, prefetchRAG]);

  return {
    // Connectivity
    isOnline: connectivity.isOnline,
    mode: connectivity.mode,
    connectivity,

    // Word lookup
    lookupWord: lookup.lookup,
    selectedWord: lookup.selectedWord,
    wordResult: lookup.result,
    wordLoading: lookup.isLoading,
    clearWord: lookup.clear,

    // RAG context
    ragContext: rag.context,
    ragSources: rag.sources,
    ragLoading: rag.isLoading,
    ragFromCache: rag.fromCache,

    // AI analysis
    analyze: analysis.analyze,
    analysisResult: analysis.analysis,
    analysisLoading: analysis.isLoading,
    analysisError: analysis.error,
    clearAnalysis: analysis.clear,

    // Features
    features: availability.features,
    cacheStats: availability.cache
  };
};

// =============================================================================
// Default export
// =============================================================================

const useSmartDataHooks = {
  useConnectivity,
  useSmartLookup,
  useSmartRAG,
  useSmartAnalysis,
  useDataAvailability,
  usePrefetch,
  useSmartStudy
};

export default useSmartDataHooks;
