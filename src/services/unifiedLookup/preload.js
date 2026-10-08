// Extrait de unifiedLookupService.js (recette docs/DECOUPE-MONOLITHES.md).
// Étage PRELOAD : réchauffement du cache + état de préchargement.
// Les fonctions de la façade sont importées en cycle paresseux (appels
// runtime uniquement — pattern validé dans morphology).
import { cleanHebrewWord } from '../../utils/hebrewUtils';
import { lookupCache } from './state';
import { quickLookup, lookupWord } from '../unifiedLookupService';
import { loadAcademicCriticalWords } from '../../constants/criticalWords';
import { COMMON_HEBREW_WORDS, COMMON_ARAMAIC_WORDS } from '../dictionaries/dictionaryLoader';
import { IS_DEV as DEBUG } from '../../utils/debug';

let preloadingPromise = null;
let preloadingComplete = false;

// =============================================================================
// CACHE WARMING
// =============================================================================

/**
 * Warm cache with words from text
 * Pre-fetches translations for better UX
 *
 * @param {string} text - Text containing words to cache
 * @param {Object} options - Lookup options
 */
export const warmCache = async (text, options = {}) => {
  if (!text) return;

  // Split text into words (simple split, no complex parsing needed)
  const words = text
    .split(/[\s\u0591-\u05C7]+/) // Split on whitespace and cantillation
    .map(w => cleanHebrewWord(w))
    .filter(w => w && w.length >= 2);

  // Deduplicate
  const uniqueWords = [...new Set(words)];

  // Look up in batches to warm cache
  const batchSize = 20;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(word => lookupWord(word, { ...options, skipCache: false }))
    );
  }
};

/**
 * Preload common Hebrew and Aramaic words into cache
 * @param {string[]} words - Optional custom word list (default: common words)
 * @returns {Promise<number>} Number of words successfully preloaded
 */
export const preloadCommonWords = async (words = null) => {
  // Return existing promise if already preloading
  if (preloadingPromise) return preloadingPromise;

  // Skip if already completed
  if (preloadingComplete) return preloadedCount;

  preloadingPromise = (async () => {
    // PRO SCHOLAR V12: Preload academic critical words first (fast, ~100 entries)
    await loadAcademicCriticalWords().catch(() => null);

    // Get word list - either provided or defaults
    const wordList = words || [...COMMON_HEBREW_WORDS, ...COMMON_ARAMAIC_WORDS];

    let successCount = 0;
    const startTime = Date.now();

    if (DEBUG) {
      log.debug(`[Preload] Starting preload of ${wordList.length} words...`);
    }

    // Load from local dictionaries using quickLookup (instant, no API)
    for (const word of wordList) {
      const cleaned = cleanHebrewWord(word);
      if (!cleaned) continue;

      // Check if already cached
      const cacheKey = `${cleaned}:default`;
      if (lookupCache.has?.(cacheKey)) {
        successCount++;
        continue;
      }

      // Use quickLookup (sync, local only)
      const result = quickLookup(cleaned);
      if (result?.english) {
        successCount++;
      }
    }

    if (DEBUG) {
      log.debug(`[Preload] Complete: ${successCount}/${wordList.length} in ${Date.now() - startTime}ms`);
    }

    preloadingComplete = true;
    preloadedCount = successCount;
    return successCount;
  })();

  return preloadingPromise;
};

/**
 * Check if common words have been preloaded
 * @returns {boolean}
 */
export const isPreloadComplete = () => preloadingComplete;

/**
 * Get preloading status
 * @returns {Object} Preload status with count and completion flag
 */
export const getPreloadStatus = () => ({
  complete: preloadingComplete,
  count: preloadedCount,
  inProgress: preloadingPromise !== null && !preloadingComplete
});

/**
 * Check if a word is already in cache
 *
 * @param {string} word - Word to check
 * @param {Object} options - Lookup options
 * @returns {boolean} True if cached
 */
export const isCached = (word, options = {}) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return false;

  const cacheKey = `${cleaned}:${options.contextMode || 'default'}`;
  return lookupCache.has?.(cacheKey) || false;
};

// Re-export cleanHebrewWord for consumers
