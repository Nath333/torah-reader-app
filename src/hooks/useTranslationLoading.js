import { useState, useEffect, useRef } from 'react';
import { translateWithSource, translateEnglishToFrench } from '../services/englishToFrenchService';
import { createLogger } from '../utils/debug';

const log = createLogger('useTranslationLoading');

/**
 * Custom hook for loading French translations for verses and Onkelos.
 * Handles parallel loading and prevents duplicate translation requests.
 *
 * @param {Object} options
 * @param {Array} options.verses - Array of verse objects
 * @param {Array} options.onkelos - Array of Onkelos translations
 * @param {string} options.selectedBook - Current book
 * @param {string|number} options.selectedChapter - Current chapter
 * @param {boolean} options.showFrench - Whether French is enabled
 * @param {boolean} options.showOnkelos - Whether Onkelos is enabled
 * @returns {Object} Translation data for verses and Onkelos
 */
export default function useTranslationLoading({
  verses = [],
  onkelos = [],
  selectedBook,
  selectedChapter,
  showFrench = false,
  showOnkelos = false
}) {
  // French translations for main verses
  const [verseFrench, setVerseFrench] = useState({});

  // French translations for Onkelos
  const [onkelosFrench, setOnkelosFrench] = useState({});

  // Track which items are being translated to prevent duplicate requests
  const verseTranslatingRef = useRef(new Set());
  const onkelosTranslatingRef = useRef(new Set());

  // Load French translations for Onkelos (parallel loading)
  useEffect(() => {
    if (!showFrench || !showOnkelos || onkelos.length === 0) return;

    let cancelled = false;

    const translateOnkelos = async () => {
      // Filter items that need translation (not already translated or being translated)
      const toTranslate = onkelos.filter(item => {
        const key = item.verse;
        return item.english && !onkelosTranslatingRef.current.has(key);
      });

      if (toTranslate.length === 0) return;

      // Mark as translating to prevent duplicate requests
      toTranslate.forEach(item => onkelosTranslatingRef.current.add(item.verse));

      // Translate in parallel
      const results = await Promise.all(
        toTranslate.map(async item => {
          try {
            const french = await translateEnglishToFrench(item.english);
            return french ? { verse: item.verse, french } : null;
          } catch (error) {
            log.warn('Failed to translate Onkelos to French:', error);
            return null;
          }
        })
      );

      if (cancelled) return;

      const frenchTranslations = {};
      results.filter(Boolean).forEach(({ verse, french }) => {
        frenchTranslations[verse] = french;
      });

      if (Object.keys(frenchTranslations).length > 0) {
        setOnkelosFrench(prev => ({ ...prev, ...frenchTranslations }));
      }
    };

    translateOnkelos();
    return () => { cancelled = true; };
  }, [showFrench, showOnkelos, onkelos]);

  // Load French translations for main verses (parallel loading)
  useEffect(() => {
    if (!showFrench || verses.length === 0) return;

    let cancelled = false;

    const translateVerses = async () => {
      // Filter verses that need translation (not already being translated)
      const toTranslate = verses.filter(verse => {
        const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
        return verse.englishText && !verseTranslatingRef.current.has(cacheKey);
      });

      if (toTranslate.length === 0) return;

      // Mark as translating to prevent duplicate requests
      toTranslate.forEach(verse => {
        const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
        verseTranslatingRef.current.add(cacheKey);
      });

      // Translate in parallel - use clean englishText to avoid Sefaria footnote corruption
      const results = await Promise.all(
        toTranslate.map(async verse => {
          const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
          try {
            const result = await translateWithSource(verse.englishText);
            return result?.translation ? { cacheKey, result } : null;
          } catch (error) {
            log.warn('Failed to translate verse to French:', error);
            return null;
          }
        })
      );

      if (cancelled) return;

      const frenchTranslations = {};
      results.filter(Boolean).forEach(({ cacheKey, result }) => {
        frenchTranslations[cacheKey] = result;
      });

      if (Object.keys(frenchTranslations).length > 0) {
        setVerseFrench(prev => ({ ...prev, ...frenchTranslations }));
      }
    };

    translateVerses();
    return () => { cancelled = true; };
  }, [showFrench, verses, selectedBook, selectedChapter]);

  // Clear translations when chapter changes
  useEffect(() => {
    setOnkelosFrench({});
    setVerseFrench({});
    onkelosTranslatingRef.current.clear();
    verseTranslatingRef.current.clear();
  }, [selectedBook, selectedChapter]);

  return {
    verseFrench,
    onkelosFrench
  };
}
