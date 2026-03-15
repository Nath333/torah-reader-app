import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * Custom hook for managing vocabulary/word bank
 * Stores Hebrew words with their translations for later review
 */
export const useVocabulary = () => {
  const [vocabulary, setVocabulary] = useLocalStorage('torahVocabulary', []);

  // Add a word to vocabulary
  const addWord = useCallback((word, english, french = '', context = '') => {
    const cleanWord = word
      .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
      .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters

    setVocabulary(prev => {
      // Check if word already exists
      const exists = prev.some(w => w.hebrew === cleanWord);
      if (exists) return prev;

      return [...prev, {
        id: Date.now(),
        hebrew: cleanWord,
        original: word, // Keep original with vowels
        english,
        french,
        context,
        addedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null,
        mastered: false
      }];
    });
  }, [setVocabulary]);

  // Remove a word from vocabulary
  const removeWord = useCallback((wordId) => {
    setVocabulary(prev => prev.filter(w => w.id !== wordId));
  }, [setVocabulary]);

  // Update a word (e.g., add French translation)
  const updateWord = useCallback((wordId, updates) => {
    setVocabulary(prev => prev.map(w =>
      w.id === wordId ? { ...w, ...updates } : w
    ));
  }, [setVocabulary]);

  // Mark word as reviewed
  const markReviewed = useCallback((wordId, correct = true) => {
    setVocabulary(prev => prev.map(w => {
      if (w.id !== wordId) return w;
      const reviewCount = w.reviewCount + 1;
      return {
        ...w,
        reviewCount,
        lastReviewed: new Date().toISOString(),
        mastered: correct && reviewCount >= 5
      };
    }));
  }, [setVocabulary]);

  // Check if word is in vocabulary
  const hasWord = useCallback((word) => {
    const cleanWord = word
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[^\u05D0-\u05EA]/g, '');
    return vocabulary.some(w => w.hebrew === cleanWord);
  }, [vocabulary]);

  // Get words for review (not mastered, sorted by least reviewed)
  const getWordsForReview = useCallback((limit = 10) => {
    return vocabulary
      .filter(w => !w.mastered)
      .sort((a, b) => a.reviewCount - b.reviewCount)
      .slice(0, limit);
  }, [vocabulary]);

  // Get statistics
  const getStats = useCallback(() => {
    const total = vocabulary.length;
    const mastered = vocabulary.filter(w => w.mastered).length;
    const needsReview = vocabulary.filter(w => !w.mastered).length;
    return { total, mastered, needsReview };
  }, [vocabulary]);

  // Clear all vocabulary
  const clearVocabulary = useCallback(() => {
    setVocabulary([]);
  }, [setVocabulary]);

  // Export vocabulary
  const exportVocabulary = useCallback(() => {
    return JSON.stringify(vocabulary, null, 2);
  }, [vocabulary]);

  // Import vocabulary
  const importVocabulary = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        setVocabulary(prev => {
          const newWords = imported.filter(w =>
            !prev.some(existing => existing.hebrew === w.hebrew)
          );
          return [...prev, ...newWords];
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to import vocabulary:', e);
    }
    return false;
  }, [setVocabulary]);

  return {
    vocabulary,
    addWord,
    removeWord,
    updateWord,
    markReviewed,
    hasWord,
    getWordsForReview,
    getStats,
    clearVocabulary,
    exportVocabulary,
    importVocabulary
  };
};

export default useVocabulary;
