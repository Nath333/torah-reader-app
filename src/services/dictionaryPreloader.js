/**
 * @deprecated This file is DEPRECATED as of PRO SCHOLAR V8.
 *
 * Dictionary preloading has been consolidated into dictionaryLoader.js
 * Please import from there instead:
 *
 * import {
 *   initializeDictionaries,
 *   shouldPreload,
 *   COMMON_HEBREW_WORDS,
 *   COMMON_ARAMAIC_WORDS
 * } from './dictionaryLoader';
 *
 * This file re-exports for backwards compatibility.
 */

import { createLogger } from '../utils/debug';
import {
  COMMON_HEBREW_WORDS,
  COMMON_ARAMAIC_WORDS,
  initializeDictionaries,
  shouldPreload
} from './dictionaryLoader';

// Re-export from consolidated module
export { COMMON_HEBREW_WORDS, COMMON_ARAMAIC_WORDS, initializeDictionaries, shouldPreload };

const log = createLogger('DictionaryPreloader');

// All words to preload
const ALL_COMMON_WORDS = [...COMMON_HEBREW_WORDS, ...COMMON_ARAMAIC_WORDS];

/**
 * Pre-warm the translation cache with common words
 * Call this on app initialization for faster lookups
 * Uses local dictionaries first (instant, no API) then optionally fetches from API
 *
 * @param {Object} options - Preload options
 * @param {boolean} options.silent - Suppress console output
 * @param {boolean} options.localOnly - Only use local dictionaries (default: true, faster)
 * @param {number} options.batchSize - Words per batch for API (default: 5)
 * @param {number} options.delayMs - Delay between API batches (default: 100)
 * @returns {Promise<number>} - Number of words successfully cached
 */
export const preloadCommonWords = async (options = {}) => {
  const { silent = false, localOnly = true, batchSize = 5, delayMs = 100 } = options;

  // Lazy import to avoid circular dependencies
  const combinedService = await import('./combinedTranslationService');

  if (!silent) {
    log.info(`[Preload] Starting cache warm-up with ${ALL_COMMON_WORDS.length} common words (local: ${localOnly})...`);
  }

  const startTime = Date.now();
  let cachedCount = 0;

  try {
    // FAST PATH: Use local-only preloading (no API calls, instant)
    if (localOnly) {
      cachedCount = await combinedService.preloadCommonWords();
      const duration = Date.now() - startTime;
      if (!silent) {
        log.info(`[Preload] Local cache warm-up complete: ${cachedCount} words in ${duration}ms`);
      }
      return cachedCount;
    }

    // SLOW PATH: Use API-based prefetching (network required)
    for (let i = 0; i < ALL_COMMON_WORDS.length; i += batchSize) {
      const batch = ALL_COMMON_WORDS.slice(i, i + batchSize);

      try {
        const results = await combinedService.prefetchTranslations(batch);
        cachedCount += results.size;
      } catch (e) {
        // Continue with next batch on error
        if (!silent) {
          log.warn(`[Preload] Batch error:`, e.message);
        }
      }

      // Small delay between batches to be nice to APIs
      if (i + batchSize < ALL_COMMON_WORDS.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const duration = Date.now() - startTime;
    if (!silent) {
      log.info(`[Preload] API cache warm-up complete: ${cachedCount}/${ALL_COMMON_WORDS.length} words cached in ${duration}ms`);
    }
  } catch (e) {
    if (!silent) {
      log.error(`[Preload] Cache warm-up failed:`, e.message);
    }
  }

  return cachedCount;
};

/**
 * Preload words for a specific verse/passage
 * Use when loading a new chapter or parsha
 *
 * @param {string[]} words - Array of Hebrew words to preload
 * @returns {Promise<Map>} - Map of word to translation result
 */
export const preloadVerseWords = async (words) => {
  if (!words || words.length === 0) return new Map();

  const { prefetchTranslations } = await import('./combinedTranslationService');
  return prefetchTranslations(words);
};

// shouldPreload is re-exported from dictionaryLoader (see line 22)
// Local implementation removed to avoid duplicate export

/**
 * Mark preload as complete
 */
export const markPreloadComplete = () => {
  localStorage.setItem('dictionary_preload_time', Date.now().toString());
};

/**
 * Initialize preloading (call from App.js useEffect)
 * Loads ALL local dictionaries (Jastrow + BDB + Strong's = ~30k entries)
 * Only preloads common words if cache is cold
 *
 * PRO SCHOLAR V7: Uses unified dictionaryLoader (single source of truth)
 * This avoids duplicate loading between scholarlyLexiconService and dictionaryLoader
 */
export const initializePreload = async () => {
  // PRIORITY 1: Load ALL local dictionaries via unified dictionaryLoader
  // This gives instant offline lookups for ~30,000 words
  // NOTE: dictionaryLoader is the single source of truth for dictionary data
  try {
    const dictionaryLoader = await import('./dictionaryLoader');
    await dictionaryLoader.preloadDictionaries();
    const status = dictionaryLoader.getCacheStatus();
    log.info(`[Preload] Local dictionaries loaded via dictionaryLoader: BDB=${status.bdb}, Jastrow=${status.jastrow}, Strongs=${status.strongs}`);
  } catch (e) {
    log.warn('[Preload] Could not load local dictionaries:', e.message);
  }

  // PRIORITY 2: Preload common words into translation cache
  if (shouldPreload()) {
    await preloadCommonWords({ silent: true });
    markPreloadComplete();
  }
};

const dictionaryPreloader = {
  preloadCommonWords,
  preloadVerseWords,
  shouldPreload,
  markPreloadComplete,
  initializePreload,
  COMMON_HEBREW_WORDS,
  COMMON_ARAMAIC_WORDS,
};

export default dictionaryPreloader;
