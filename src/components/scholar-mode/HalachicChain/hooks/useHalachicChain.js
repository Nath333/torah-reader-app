/**
 * useHalachicChain Hook
 *
 * Manages the 7-layer halachic decision chain state with smart caching.
 * משנה → גמרא → ראשונים → טור/בית יוסף → שולחן ערוך → אחרונים → פוסקים
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { buildHalachicChain } from '../utils/chainBuilder';
import { calculateMajority } from '../utils/majorityCalculator';
import { HALACHIC_LAYERS, DEFAULT_CHAIN_OPTIONS } from '../types';
import { getCache, setCache, generateCacheKey } from '../utils/chainCache';

// Canonical layer order for the שושלת הוראה
const LAYER_ORDER = [
  HALACHIC_LAYERS.MISHNAH,
  HALACHIC_LAYERS.GEMARA,
  HALACHIC_LAYERS.RISHONIM,
  HALACHIC_LAYERS.TUR,
  HALACHIC_LAYERS.PSAK,
  HALACHIC_LAYERS.ACHARONIM,
  HALACHIC_LAYERS.POSKIM
];

export const useHalachicChain = (text, reference, options = {}) => {
  const config = useMemo(() => ({
    ...DEFAULT_CHAIN_OPTIONS,
    ...options
  }), [options]);

  const cacheKey = useMemo(() =>
    generateCacheKey(reference, config),
    [reference, config]
  );

  // State
  const [chain, setChain] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState([...LAYER_ORDER]);
  const [focusedOpinion, setFocusedOpinion] = useState(null);
  const [educationalMode, setEducationalMode] = useState(true);

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const buildChain = useCallback(async (forceRefresh = false) => {
    if (!text || !reference) return;

    let cached = null;
    if (!forceRefresh) {
      cached = getCache(cacheKey);
      if (cached && isMountedRef.current) {
        setChain(cached);
        setIsBackgroundRefreshing(true);
      }
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    if (!cached || forceRefresh) setIsLoading(true);
    setError(null);

    try {
      const chainData = await buildHalachicChain(
        text, reference, config, abortControllerRef.current.signal
      );

      if (isMountedRef.current) {
        // Calculate majority from Rishonim
        if (chainData.layers[HALACHIC_LAYERS.RISHONIM]?.decisions) {
          chainData.majority = calculateMajority(
            chainData.layers[HALACHIC_LAYERS.RISHONIM].decisions
          );
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

  useEffect(() => { buildChain(); }, [buildChain]);

  const toggleLayer = useCallback((layerId) => {
    setVisibleLayers(prev => {
      const isVisible = prev.includes(layerId);
      if (isVisible) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== layerId);
      }
      const newLayers = [...prev, layerId];
      return newLayers.sort((a, b) => LAYER_ORDER.indexOf(a) - LAYER_ORDER.indexOf(b));
    });
  }, []);

  const showAllLayers = useCallback(() => {
    setVisibleLayers([...LAYER_ORDER]);
  }, []);

  const focusLayer = useCallback((layerId) => {
    setVisibleLayers([layerId]);
  }, []);

  const selectOpinion = useCallback((opinion) => {
    setFocusedOpinion(prev =>
      prev?.authority === opinion?.authority ? null : opinion
    );
  }, []);

  const toggleEducationalMode = useCallback(() => {
    setEducationalMode(prev => !prev);
  }, []);

  const refresh = useCallback(() => buildChain(true), [buildChain]);

  const stats = useMemo(() => {
    if (!chain) return null;
    return {
      totalOpinions: chain.layers[HALACHIC_LAYERS.MISHNAH]?.opinions?.length || 0,
      totalQuestions: chain.layers[HALACHIC_LAYERS.GEMARA]?.analysis?.length || 0,
      rishonimCount: chain.layers[HALACHIC_LAYERS.RISHONIM]?.decisions?.length || 0,
      hasTur: !!chain.layers[HALACHIC_LAYERS.TUR]?.turAnalysis,
      acharonimCount: chain.layers[HALACHIC_LAYERS.ACHARONIM]?.decisions?.length || 0,
      poskimCount: chain.layers[HALACHIC_LAYERS.POSKIM]?.decisions?.length || 0,
      hasPsak: !!chain.layers[HALACHIC_LAYERS.PSAK]?.psak,
      traditionsAgree: chain.layers[HALACHIC_LAYERS.PSAK]?.psak?.traditionsAgree ?? true,
      majorityRuling: chain.majority?.ruling || null
    };
  }, [chain]);

  const visibleChain = useMemo(() => {
    if (!chain) return null;
    return {
      ...chain,
      layers: Object.fromEntries(
        Object.entries(chain.layers).filter(([key]) => visibleLayers.includes(key))
      )
    };
  }, [chain, visibleLayers]);

  // Expose klalei pesika and opinion flows from the full chain
  const klaleiPesika = useMemo(() => chain?.klaleiPesika || null, [chain]);
  const opinionFlows = useMemo(() => chain?.opinionFlows || [], [chain]);

  // Get flow for the currently focused opinion
  const focusedFlow = useMemo(() => {
    if (!focusedOpinion || !opinionFlows.length) return null;
    return opinionFlows.find(f => f.originAuthority === focusedOpinion.authority) || null;
  }, [focusedOpinion, opinionFlows]);

  return {
    chain: visibleChain,
    fullChain: chain,
    stats,
    klaleiPesika,
    opinionFlows,
    focusedFlow,
    isLoading,
    isBackgroundRefreshing,
    error,
    visibleLayers,
    focusedOpinion,
    educationalMode,
    toggleLayer,
    showAllLayers,
    focusLayer,
    selectOpinion,
    toggleEducationalMode,
    refresh,
    isLayerVisible: (layerId) => visibleLayers.includes(layerId)
  };
};

export default useHalachicChain;
