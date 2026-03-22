/**
 * useProScholarV4 - React hook for Pro Scholar v4 features
 *
 * Provides easy access to all Pro Scholar v4 capabilities:
 * - Word analysis with caching
 * - Cross-references with RAG
 * - Knowledge graph data
 * - SRS integration
 *
 * @example
 * const { analyzeWord, getCrossRefs, features } = useProScholarV4();
 *
 * const analysis = await analyzeWord('בראשית', { verseRef: 'Genesis.1.1' });
 *
 * @module useProScholarV4
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

// Lazy import to avoid circular dependencies
let ProScholarV4 = null;
const getProScholar = () => {
  if (!ProScholarV4) {
    try {
      ProScholarV4 = require('../services/proScholarV4');
    } catch (e) {
      console.warn('[useProScholarV4] Failed to load ProScholarV4:', e.message);
      ProScholarV4 = { default: null };
    }
  }
  return ProScholarV4.default || ProScholarV4;
};

/**
 * Hook for Pro Scholar v4 features
 * @param {Object} options - Configuration options
 * @param {boolean} [options.preloadServices=true] - Preload common services on mount
 * @param {string[]} [options.servicesToPreload] - Specific services to preload
 * @returns {Object} Pro Scholar v4 API
 */
export function useProScholarV4(options = {}) {
  const {
    preloadServices: shouldPreload = true,
    servicesToPreload = ['wordLookup', 'grammarAnalysis', 'semanticField'],
  } = options;

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  // Initialize on mount
  useEffect(() => {
    try {
      const proScholar = getProScholar();
      if (proScholar && shouldPreload) {
        proScholar.preloadServices(servicesToPreload);
      }
      setIsReady(true);
    } catch (e) {
      setError(e.message);
    }
  }, [shouldPreload, servicesToPreload]);

  // Analyze a word with all v4 features
  const analyzeWord = useCallback(async (word, options = {}) => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    try {
      return await proScholar.analyzeWord(word, options);
    } catch (e) {
      console.error('[useProScholarV4] analyzeWord failed:', e);
      return null;
    }
  }, []);

  // Get cross-references
  const getCrossRefs = useCallback(async (word, options = {}) => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    try {
      return await proScholar.getCrossReferences(word, options);
    } catch (e) {
      console.error('[useProScholarV4] getCrossRefs failed:', e);
      return null;
    }
  }, []);

  // Get knowledge graph data
  const getKnowledgeGraph = useCallback((entity) => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    return proScholar.getKnowledgeGraph(entity);
  }, []);

  // SRS card management
  const getSRSCard = useCallback((word, definition) => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    return proScholar.getSRSCard(word, definition);
  }, []);

  const processSRSReview = useCallback((word, quality) => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    return proScholar.processSRSReview(word, quality);
  }, []);

  // Cache management
  const clearCache = useCallback((namespace) => {
    const proScholar = getProScholar();
    if (!proScholar) return;

    proScholar.clearCache(namespace);
  }, []);

  const getCacheStats = useCallback(() => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    return proScholar.getCacheStats();
  }, []);

  // Telemetry
  const getTelemetry = useCallback(() => {
    const proScholar = getProScholar();
    if (!proScholar) return null;

    return proScholar.getTelemetry();
  }, []);

  // Feature flags
  const features = useMemo(() => {
    const proScholar = getProScholar();
    return proScholar?.FEATURES || {};
  }, []);

  // Version
  const version = useMemo(() => {
    const proScholar = getProScholar();
    return proScholar?.VERSION || 'unknown';
  }, []);

  return {
    // State
    isReady,
    error,
    version,
    features,

    // Word Analysis
    analyzeWord,
    getCrossRefs,

    // Knowledge Graph
    getKnowledgeGraph,

    // SRS
    getSRSCard,
    processSRSReview,

    // Cache
    clearCache,
    getCacheStats,

    // Telemetry
    getTelemetry,
  };
}

/**
 * Hook for word analysis with loading state
 * @param {string} word - Word to analyze
 * @param {Object} options - Analysis options
 * @returns {Object} { data, loading, error, refetch }
 */
export function useWordAnalysis(word, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { analyzeWord } = useProScholarV4({ preloadServices: true });

  const fetch = useCallback(async () => {
    if (!word) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeWord(word, options);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [word, options, analyzeWord]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for cross-references with loading state
 * @param {string} word - Word to find references for
 * @param {Object} options - Lookup options
 * @returns {Object} { data, loading, error, refetch }
 */
export function useCrossRefs(word, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getCrossRefs } = useProScholarV4({ preloadServices: false });

  const fetch = useCallback(async () => {
    if (!word) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCrossRefs(word, options);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [word, options, getCrossRefs]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for SRS card with automatic loading
 * @param {string} word - Word for SRS card
 * @param {string} [definition] - Definition for new card creation
 * @returns {Object} { card, review, loading }
 */
export function useSRSCard(word, definition = '') {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);

  const { getSRSCard, processSRSReview } = useProScholarV4({ preloadServices: false });

  // Load card on mount
  useEffect(() => {
    if (word) {
      setCard(getSRSCard(word, definition));
    }
  }, [word, definition, getSRSCard]);

  // Review function
  const review = useCallback((quality) => {
    if (!word) return null;

    setLoading(true);
    const updated = processSRSReview(word, quality);
    setCard(updated);
    setLoading(false);

    return updated;
  }, [word, processSRSReview]);

  return { card, review, loading };
}

/**
 * Hook for knowledge graph data
 * @param {string} entity - Entity name (rabbi, concept)
 * @returns {Object} { data, findPath }
 */
export function useKnowledgeGraph(entity) {
  const { getKnowledgeGraph } = useProScholarV4({ preloadServices: false });

  const data = useMemo(() => {
    if (!entity) return null;
    return getKnowledgeGraph(entity);
  }, [entity, getKnowledgeGraph]);

  const findPath = useCallback((target) => {
    if (!data?.findPath) return null;
    return data.findPath(target);
  }, [data]);

  return { data, findPath };
}

// Default export
export default useProScholarV4;
