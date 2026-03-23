// =============================================================================
// PRO SCHOLAR V10: useScholarlyLookup HOOK
// React hook for scholarly word lookups with parallel sources + consensus
// =============================================================================

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { lookupParallel, getSourceComparison, clearWordCache } from '../services/unifiedLookupService';
import { prefetchWord, createPrefetchHandlers } from '../services/wordPrefetchService';

// PRO SCHOLAR V10.3: Cache delegated to unifiedLookupService (15 min TTL, 2000 entries)
// Removed duplicate hookCache - caching now centralized in service layer

/**
 * useScholarlyLookup - Hook for scholarly word lookups
 *
 * Features:
 * - Parallel dictionary fetching (all sources at once)
 * - Expert consensus scoring
 * - Source tier classification
 * - Prefetch support for hover/focus
 * - Comparison mode for scholarly analysis
 *
 * @param {string} word - Hebrew word to look up
 * @param {Object} options - Lookup options
 * @returns {Object} Lookup result with all sources and consensus
 */
export const useScholarlyLookup = (word, options = {}) => {
  const {
    enabled = true,
    contextMode = null,
    includeStrongs = true,
    prefetchOnMount = false
  } = options;

  // State
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track current word to prevent stale updates
  const currentWordRef = useRef(word);

  // Memoized lookup function
  // PRO SCHOLAR V10.3: Caching delegated to unifiedLookupService
  const lookup = useCallback((wordToLookup) => {
    if (!wordToLookup || wordToLookup.length < 2) {
      setResult(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // lookupParallel handles caching internally (15 min TTL, 2000 entries)
      const lookupResult = lookupParallel(wordToLookup, {
        contextMode,
        includeStrongs
      });

      // Only update if this is still the current word
      if (currentWordRef.current === wordToLookup) {
        setResult(lookupResult);
        setIsLoading(false);
      }

      return lookupResult;
    } catch (err) {
      if (currentWordRef.current === wordToLookup) {
        setError(err.message || 'Lookup failed');
        setIsLoading(false);
      }
      return null;
    }
  }, [contextMode, includeStrongs]);

  // Effect: lookup when word changes
  useEffect(() => {
    currentWordRef.current = word;

    if (enabled && word) {
      lookup(word);
    } else {
      setResult(null);
      setError(null);
      setIsLoading(false);
    }
  }, [word, enabled, lookup]);

  // Prefetch on mount if enabled
  useEffect(() => {
    if (prefetchOnMount && word) {
      prefetchWord(word, lookupParallel);
    }
  }, [prefetchOnMount, word]);

  // Computed properties
  const computed = useMemo(() => {
    if (!result) {
      return {
        hasResult: false,
        sourceCount: 0,
        hasAcademicSource: false,
        consensusLevel: 'unknown',
        primaryDefinition: null
      };
    }

    return {
      hasResult: true,
      sourceCount: result.sourceCount || result.allSources?.length || 0,
      hasAcademicSource: result.hasAcademicSource || false,
      hasTier1Source: result.hasTier1Source || false,
      consensusLevel: result.consensus?.level?.level || 'unknown',
      consensusScore: result.consensus?.weightedScore || 0,
      primaryDefinition: result.english || result.primary?.definition || null,
      primarySource: result.source || result.primary?.name || null,
      alternativeCount: result.alternatives?.length || 0,
      hasDivergentOpinions: (result.consensus?.divergentOpinions?.length || 0) > 0
    };
  }, [result]);

  // Prefetch handler for hover/focus
  const handlePrefetch = useCallback((wordToPrefetch) => {
    if (wordToPrefetch && wordToPrefetch !== word) {
      prefetchWord(wordToPrefetch, lookupParallel);
    }
  }, [word]);

  // Manual refresh
  // PRO SCHOLAR V10.3: Uses service-level cache clearing
  const refresh = useCallback(() => {
    if (word) {
      // Clear cache for this word in unifiedLookupService
      clearWordCache(word);
      lookup(word);
    }
  }, [word, lookup]);

  return {
    // Core result
    result,
    isLoading,
    error,

    // All sources for scholarly comparison
    allSources: result?.allSources || [],
    primary: result?.primary || null,
    alternatives: result?.alternatives || [],

    // Consensus analysis
    consensus: result?.consensus || null,

    // Computed flags
    ...computed,

    // Actions
    lookup,
    refresh,
    prefetch: handlePrefetch
  };
};

/**
 * useSourceComparison - Hook for comparing sources on a word
 *
 * @param {string} word - Word to compare
 * @returns {Object} Comparison result
 */
export const useSourceComparison = (word) => {
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!word || word.length < 2) {
      setComparison(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = getSourceComparison(word);
      setComparison(result);
    } catch {
      setComparison({ hasComparison: false, error: 'Comparison failed' });
    }
    setIsLoading(false);
  }, [word]);

  return {
    comparison,
    isLoading,
    hasComparison: comparison?.hasComparison || false,
    semanticOverlap: comparison?.semanticOverlap || 0,
    coreAgreement: comparison?.coreAgreement || null,
    notes: comparison?.notes || []
  };
};

/**
 * usePrefetchHandlers - Hook for verse/word prefetching
 *
 * @param {Function} lookupFn - Lookup function to use (default: lookupParallel)
 * @returns {Object} Prefetch handlers
 */
export const usePrefetchHandlers = (lookupFn = lookupParallel) => {
  return useMemo(() => createPrefetchHandlers(lookupFn), [lookupFn]);
};

/**
 * useScholarlyMode - Hook for toggling scholarly display mode
 *
 * @param {boolean} initialExpanded - Initial expanded state
 * @returns {Object} Mode state and toggles
 */
export const useScholarlyMode = (initialExpanded = false) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showConsensus, setShowConsensus] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(true);

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);
  const toggleConsensus = useCallback(() => setShowConsensus(prev => !prev), []);
  const toggleAlternatives = useCallback(() => setShowAlternatives(prev => !prev), []);

  return {
    isExpanded,
    showConsensus,
    showAlternatives,
    toggleExpanded,
    toggleConsensus,
    toggleAlternatives,
    setIsExpanded,
    setShowConsensus,
    setShowAlternatives
  };
};

export default useScholarlyLookup;
