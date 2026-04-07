/**
 * useHalachicChain Hook
 * 
 * Manages the halachic decision chain state with smart caching.
 * Uses SWR (stale-while-revalidate) pattern for optimal performance.
 * 
 * Features:
 * - Caches chain results by reference
 * - Auto-refreshes in background when needed
 * - Handles layer visibility toggles
 * - Manages opinion selection/focus
 * - Calculates majority automatically
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { buildHalachicChain } from '../utils/chainBuilder';
import { calculateMajority } from '../utils/majorityCalculator';
import { HALACHIC_LAYERS, DEFAULT_CHAIN_OPTIONS } from '../types';
import { getCache, setCache, generateCacheKey } from '../utils/chainCache';

/**
 * Hook for managing halachic chain state
 * 
 * @param {string} text - The text being analyzed
 * @param {string} reference - Sefaria reference (e.g., "Berakhot.2a")
 * @param {Object} options - Configuration options
 * @returns {Object} Chain state and control functions
 */
export const useHalachicChain = (text, reference, options = {}) => {
  // Merge with defaults
  const config = useMemo(() => ({
    ...DEFAULT_CHAIN_OPTIONS,
    ...options
  }), [options]);

  // Generate stable cache key
  const cacheKey = useMemo(() => 
    generateCacheKey(reference, config),
    [reference, config]
  );

  // State
  const [chain, setChain] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState([
    HALACHIC_LAYERS.MISHNAH,
    HALACHIC_LAYERS.GEMARA,
    HALACHIC_LAYERS.RISHONIM,
    HALACHIC_LAYERS.PSAK
  ]);
  const [focusedOpinion, setFocusedOpinion] = useState(null);
  const [educationalMode, setEducationalMode] = useState(true); // Default to educational

  // Refs for preventing stale closures
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Build the halachic chain
   * Uses cache-first strategy with background refresh
   */
  const buildChain = useCallback(async (forceRefresh = false) => {
    if (!text || !reference) return;

    // Check cache first
    let cached = null;
    if (!forceRefresh) {
      cached = getCache(cacheKey);
      if (cached && isMountedRef.current) {
        setChain(cached);
        // Trigger background refresh
        setIsBackgroundRefreshing(true);
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!cached || forceRefresh) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const chainData = await buildHalachicChain(
        text,
        reference,
        config,
        abortControllerRef.current.signal
      );

      if (isMountedRef.current) {
        // Calculate majority if we have Rishonim layer
        if (chainData.layers[HALACHIC_LAYERS.RISHONIM]?.decisions) {
          const majority = calculateMajority(
            chainData.layers[HALACHIC_LAYERS.RISHONIM].decisions
          );
          chainData.majority = majority;
        }

        setChain(chainData);
        setCache(cacheKey, chainData);
        setError(null);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message || 'Failed to build halachic chain');
        console.error('HalachicChain build error:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsBackgroundRefreshing(false);
      }
    }
  }, [text, reference, cacheKey, config]);

  // Initial load
  useEffect(() => {
    buildChain();
  }, [buildChain]);

  /**
   * Toggle layer visibility
   */
  const toggleLayer = useCallback((layerId) => {
    setVisibleLayers(prev => {
      const isVisible = prev.includes(layerId);
      if (isVisible) {
        // Don't allow hiding all layers
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== layerId);
      } else {
        // Maintain order
        const newLayers = [...prev, layerId];
        const order = [HALACHIC_LAYERS.MISHNAH, HALACHIC_LAYERS.GEMARA, HALACHIC_LAYERS.RISHONIM, HALACHIC_LAYERS.PSAK];
        return newLayers.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      }
    });
  }, []);

  /**
   * Show all layers
   */
  const showAllLayers = useCallback(() => {
    setVisibleLayers([
      HALACHIC_LAYERS.MISHNAH,
      HALACHIC_LAYERS.GEMARA,
      HALACHIC_LAYERS.RISHONIM,
      HALACHIC_LAYERS.PSAK
    ]);
  }, []);

  /**
   * Hide all but one layer
   */
  const focusLayer = useCallback((layerId) => {
    setVisibleLayers([layerId]);
  }, []);

  /**
   * Select/focus on an opinion
   */
  const selectOpinion = useCallback((opinion) => {
    setFocusedOpinion(prev => 
      prev?.authority === opinion?.authority ? null : opinion
    );
  }, []);

  /**
   * Toggle educational vs practical mode
   */
  const toggleEducationalMode = useCallback(() => {
    setEducationalMode(prev => !prev);
  }, []);

  /**
   * Refresh chain data
   */
  const refresh = useCallback(() => {
    return buildChain(true);
  }, [buildChain]);

  /**
   * Get summary statistics
   */
  const stats = useMemo(() => {
    if (!chain) return null;

    const mishnahOpinions = chain.layers[HALACHIC_LAYERS.MISHNAH]?.opinions?.length || 0;
    const gemaraQuestions = chain.layers[HALACHIC_LAYERS.GEMARA]?.analysis?.length || 0;
    const rishonimCount = chain.layers[HALACHIC_LAYERS.RISHONIM]?.decisions?.length || 0;
    const hasPsak = !!chain.layers[HALACHIC_LAYERS.PSAK]?.psak;

    return {
      totalOpinions: mishnahOpinions,
      totalQuestions: gemaraQuestions,
      rishonimCount,
      hasPsak,
      majorityRuling: chain.majority?.ruling || null
    };
  }, [chain]);

  /**
   * Get filtered visible chain data
   */
  const visibleChain = useMemo(() => {
    if (!chain) return null;
    
    return {
      ...chain,
      layers: Object.fromEntries(
        Object.entries(chain.layers).filter(([key]) => 
          visibleLayers.includes(key)
        )
      )
    };
  }, [chain, visibleLayers]);

  return {
    // Data
    chain: visibleChain,
    fullChain: chain,
    stats,
    
    // State
    isLoading,
    isBackgroundRefreshing,
    error,
    visibleLayers,
    focusedOpinion,
    educationalMode,
    
    // Actions
    toggleLayer,
    showAllLayers,
    focusLayer,
    selectOpinion,
    toggleEducationalMode,
    refresh,
    
    // Helpers
    isLayerVisible: (layerId) => visibleLayers.includes(layerId)
  };
};

export default useHalachicChain;
