// =============================================================================
// Dictionary Preloader Service
// Pre-warms the translation cache with common Hebrew/Aramaic words on app load
// Improves UX by having definitions ready before user clicks
// SINGLE SOURCE OF TRUTH for common word lists (other modules import from here)
// =============================================================================

import { createLogger } from '../utils/debug';

const log = createLogger('DictionaryPreloader');

// =============================================================================
// Common Word Lists (exported for use by combinedTranslationService)
// =============================================================================

// Most common Hebrew words in Torah/Tanakh (high frequency)
export const COMMON_HEBREW_WORDS = [
  // Particles & conjunctions (highest frequency)
  'את', 'אל', 'על', 'כי', 'לא', 'אשר', 'כל', 'עם', 'מן', 'גם',
  'אם', 'או', 'עד', 'רק', 'אך', 'כן', 'לכן', 'אף', 'פן', 'בין',
  // Common verbs (high frequency)
  'אמר', 'היה', 'בא', 'עשה', 'נתן', 'הלך', 'ראה', 'שמע', 'ידע', 'לקח',
  'שב', 'קרא', 'דבר', 'עלה', 'יצא', 'שלח', 'עמד', 'שם', 'בנה', 'מצא',
  'אכל', 'שתה', 'ישב', 'קום', 'מות', 'חיה', 'אהב', 'שמר', 'זכר', 'כתב',
  // Common nouns (high frequency)
  'יום', 'בן', 'איש', 'אב', 'אם', 'בית', 'ארץ', 'עיר', 'שם', 'דבר',
  'יד', 'עין', 'לב', 'נפש', 'פנים', 'ראש', 'רגל', 'מים', 'שמים', 'אדם',
  'אלהים', 'מלך', 'עבד', 'כהן', 'נביא', 'שנה', 'עולם', 'דרך', 'משפט', 'תורה',
  // Common adjectives/adverbs
  'טוב', 'רע', 'גדול', 'קטן', 'רב', 'חדש', 'ישן', 'קדוש', 'טהור', 'טמא',
];

// Common Aramaic/Talmudic words
export const COMMON_ARAMAIC_WORDS = [
  // Talmudic terms
  'גמרא', 'משנה', 'תנא', 'אמורא', 'רבי', 'רב', 'מר',
  'הלכה', 'אגדה', 'מדרש', 'ברייתא', 'תוספתא',
  // Common Aramaic verbs
  'אמר', 'קאמר', 'תנן', 'תניא', 'איתמר',
  // Logical/Argumentative terms
  'אלא', 'אי', 'דילמא', 'השתא', 'למה', 'מאי', 'היכי',
  // Common nouns with Aramaic emphatic state
  'מילתא', 'עלמא', 'גברא', 'אינש', 'ביתא',
];

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

/**
 * Check if preloading is beneficial (e.g., cache is cold)
 * @returns {boolean} - True if preloading would be helpful
 */
export const shouldPreload = () => {
  // Could check localStorage for last preload time
  // For now, always return true on first load
  const lastPreload = localStorage.getItem('dictionary_preload_time');
  if (!lastPreload) return true;

  // Preload if more than 24 hours since last preload
  const hoursSincePreload = (Date.now() - parseInt(lastPreload, 10)) / (1000 * 60 * 60);
  return hoursSincePreload > 24;
};

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
 */
export const initializePreload = async () => {
  // PRIORITY 1: Load ALL local dictionaries in background
  // This gives instant offline lookups for ~30,000 words
  try {
    const { preloadDictionaries } = await import('./scholarlyLexiconService');
    const stats = await preloadDictionaries();
    log.info(`[Preload] Local dictionaries loaded: ${stats.totalEntries} entries (Jastrow: ${stats.jastrow.entries}, BDB: ${stats.bdb.entries}, Strong's: ${stats.strongs.entries})`);
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
