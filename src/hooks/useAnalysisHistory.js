/**
 * useAnalysisHistory - Track AI analysis history with caching
 *
 * Data flow improvements:
 * - O(1) cache lookups via Map (was linear scan)
 * - Debounced persistence to avoid localStorage thrashing
 * - Flush-on-unmount to prevent data loss
 * - Stable callback references via ref
 * - Collision-safe ID generation
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { safeGet, safeSet } from '../utils/safeLocalStorage';

const STORAGE_KEY = 'torah-reader-analysis-history';
const MAX_HISTORY_SIZE = 50;
const PERSIST_DEBOUNCE_MS = 500;

// Collision-safe ID
let idCounter = 0;
const generateId = () => `${Date.now()}_${(idCounter++) % 1000}_${Math.random().toString(36).slice(2, 6)}`;

// Build a lookup key for cache Map
const cacheKey = (reference, mode) => `${reference}::${mode}`;

function useAnalysisHistory() {
  const [history, setHistory] = useState(() => safeGet(STORAGE_KEY, []));

  // Ref for stable callbacks
  const historyRef = useRef(history);
  historyRef.current = history;

  // O(1) lookup cache - rebuilt when history changes
  const cacheMap = useMemo(() => {
    const map = new Map();
    for (const item of history) {
      const key = cacheKey(item.reference, item.mode);
      if (!map.has(key)) map.set(key, item);
    }
    return map;
  }, [history]);

  // Debounced persistence with flush-on-unmount
  const debounceRef = useRef(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      safeSet(STORAGE_KEY, history);
      isDirtyRef.current = false;
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [history]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        safeSet(STORAGE_KEY, historyRef.current);
      }
    };
  }, []);

  // Add analysis with dedup
  const addAnalysis = useCallback((analysis) => {
    setHistory(prev => {
      const id = analysis.id || generateId();
      const entry = { ...analysis, id, timestamp: Date.now() };
      const key = cacheKey(analysis.reference, analysis.mode);
      const filtered = prev.filter(item => cacheKey(item.reference, item.mode) !== key);
      return [entry, ...filtered].slice(0, MAX_HISTORY_SIZE);
    });
  }, []);

  // O(1) cache lookup
  const getCachedResult = useCallback((reference, mode) => {
    return cacheMap.get(cacheKey(reference, mode))?.result || null;
  }, [cacheMap]);

  // Stable ref-based recent analyses
  const getRecentAnalyses = useCallback((count = 10) => {
    return historyRef.current.slice(0, count);
  }, []);

  const removeAnalysis = useCallback((id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    addAnalysis,
    getCachedResult,
    getRecentAnalyses,
    removeAnalysis,
    clearHistory
  };
}

export default useAnalysisHistory;
