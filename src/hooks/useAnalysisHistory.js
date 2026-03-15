import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * Manage AI analysis history
 * Tracks completed analyses with results for quick reference
 */
const useAnalysisHistory = () => {
  const [history, setHistory] = useLocalStorage('analysisHistory', []);

  // Maximum number of history entries to keep
  const MAX_HISTORY = 50;

  // Add analysis to history
  const addAnalysis = useCallback((analysis) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reference: analysis.reference,
      book: analysis.book,
      chapter: analysis.chapter,
      verse: analysis.verse,
      mode: analysis.mode,
      modeName: analysis.modeName,
      textType: analysis.textType,
      summary: analysis.summary || analysis.result?.summary || analysis.result?.oneLineSummary || '',
      timestamp: new Date().toISOString(),
      result: analysis.result
    };

    setHistory(prev => {
      // Add new entry at the beginning
      const updated = [entry, ...prev];
      // Keep only MAX_HISTORY entries
      return updated.slice(0, MAX_HISTORY);
    });

    return entry.id;
  }, [setHistory]);

  // Get analysis by ID
  const getAnalysis = useCallback((id) => {
    return history.find(h => h.id === id);
  }, [history]);

  // Get analyses for a specific reference
  const getAnalysesForReference = useCallback((reference) => {
    return history.filter(h => h.reference === reference);
  }, [history]);

  // Check if analysis exists for reference + mode
  const hasAnalysis = useCallback((reference, mode) => {
    return history.some(h => h.reference === reference && h.mode === mode);
  }, [history]);

  // Get cached result for reference + mode
  const getCachedResult = useCallback((reference, mode) => {
    const entry = history.find(h => h.reference === reference && h.mode === mode);
    return entry?.result || null;
  }, [history]);

  // Remove analysis from history
  const removeAnalysis = useCallback((id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, [setHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  // Get recent analyses (last N)
  const getRecentAnalyses = useCallback((count = 10) => {
    return history.slice(0, count);
  }, [history]);

  // Get analysis stats
  const getStats = useCallback(() => {
    const modeCount = {};
    const bookCount = {};

    history.forEach(h => {
      modeCount[h.mode] = (modeCount[h.mode] || 0) + 1;
      if (h.book) {
        bookCount[h.book] = (bookCount[h.book] || 0) + 1;
      }
    });

    return {
      totalAnalyses: history.length,
      modeCount,
      bookCount,
      mostUsedMode: Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      mostStudiedBook: Object.entries(bookCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    };
  }, [history]);

  return {
    history,
    addAnalysis,
    getAnalysis,
    getAnalysesForReference,
    hasAnalysis,
    getCachedResult,
    removeAnalysis,
    clearHistory,
    getRecentAnalyses,
    getStats
  };
};

export default useAnalysisHistory;
