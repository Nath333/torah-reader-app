import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

const MAX_HISTORY = 20;

/**
 * Track reading history
 */
const useReadingHistory = () => {
  const [history, setHistory] = useLocalStorage('readingHistory', []);

  const addToHistory = useCallback((book, chapter) => {
    if (!book || !chapter) return;

    const entry = {
      book,
      chapter: String(chapter),
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(h =>
        !(h.book === book && h.chapter === String(chapter))
      );
      // Add to front, limit size
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return { history, addToHistory, clearHistory };
};

export default useReadingHistory;
