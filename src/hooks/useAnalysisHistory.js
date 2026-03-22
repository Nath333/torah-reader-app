/**
 * useAnalysisHistory - Track AI analysis history with caching
 *
 * Provides caching and history tracking for AI-powered text analysis.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'torah-reader-analysis-history';
const MAX_HISTORY_SIZE = 50;

function useAnalysisHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save analysis history:', e);
    }
  }, [history]);

  // Add a new analysis to history
  const addAnalysis = useCallback((analysis) => {
    setHistory(prev => {
      const newHistory = [
        { ...analysis, id: analysis.id || Date.now().toString(), timestamp: Date.now() },
        ...prev.filter(item =>
          !(item.reference === analysis.reference && item.mode === analysis.mode)
        )
      ].slice(0, MAX_HISTORY_SIZE);
      return newHistory;
    });
  }, []);

  // Get cached result for a reference and mode
  const getCachedResult = useCallback((reference, mode) => {
    const item = history.find(
      h => h.reference === reference && h.mode === mode
    );
    return item?.result || null;
  }, [history]);

  // Get recent analyses
  const getRecentAnalyses = useCallback((count = 10) => {
    return history.slice(0, count);
  }, [history]);

  // Remove an analysis from history
  const removeAnalysis = useCallback((id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear all history
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
