import { useState, useEffect, useRef } from 'react';
import { translateWithSource, translateEnglishToFrench } from '../services/dictionaries/englishToFrenchService';
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

    // Filter items that need translation (not already translated or being translated)
    const toTranslate = onkelos.filter(item => {
      return item.english && !onkelosTranslatingRef.current.has(item.verse);
    });

    if (toTranslate.length === 0) return;

    let cancelled = false;
    const itemKeys = toTranslate.map(item => item.verse);

    // Mark as translating to prevent duplicate requests
    itemKeys.forEach(k => onkelosTranslatingRef.current.add(k));

    const translateOnkelos = async () => {
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
    return () => {
      cancelled = true;
      // Remove in-flight items from tracking ref so they can be retried
      itemKeys.forEach(k => onkelosTranslatingRef.current.delete(k));
    };
  }, [showFrench, showOnkelos, onkelos]);

  // Load French translations for main verses (parallel loading)
  useEffect(() => {
    if (!showFrench || verses.length === 0) return;

    // Filter verses that need translation (not already being translated)
    const toTranslate = verses.filter(verse => {
      const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
      return verse.englishText && !verseTranslatingRef.current.has(cacheKey);
    });

    if (toTranslate.length === 0) return;

    let cancelled = false;
    const itemKeys = toTranslate.map(verse => `${selectedBook}:${selectedChapter}:${verse.verse}`);

    // Mark as translating to prevent duplicate requests
    itemKeys.forEach(k => verseTranslatingRef.current.add(k));

    const translateVerses = async () => {
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
    return () => {
      cancelled = true;
      // Remove in-flight items from tracking ref so they can be retried
      itemKeys.forEach(k => verseTranslatingRef.current.delete(k));
    };
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
