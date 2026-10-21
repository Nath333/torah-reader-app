// =============================================================================
// Préchargement des dictionnaires — preload par famille, plan par catégorie
// de livre (tanakh/talmud/mishnah/mixed), synchronisation (waitForPreload).
// Extrait de dictionaryLoader.js (recette docs/DECOUPE-MONOLITHES.md).
// =============================================================================

import { createLogger } from '../../utils/debug';
import { isTorahBook, isTalmudBook, isMishnahBook } from '../sefariaApi';
import { cache, loadDictionary } from './loaderCore';

const log = createLogger('DictionaryLoader');

// =============================================================================
// PRELOADING & UTILITIES
// =============================================================================

/**
 * Preload core dictionaries (call on app init for better UX)
 * @returns {Promise<void>}
 */
export async function preloadDictionaries() {
  log.debug('Preloading core dictionaries...');
  await Promise.all([
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('strongs').catch(() => null)
  ]);
  log.debug('Core dictionaries preloaded');
}

/**
 * Preload additional lexicons (call after core dictionaries for scholar mode)
 * @returns {Promise<void>}
 */
export async function preloadLexicons() {
  log.debug('Preloading additional lexicons...');
  await Promise.all([
    loadDictionary('calAramaic').catch(() => null),      // CAL - 12,243 Aramaic entries
    loadDictionary('jastrowAramaic').catch(() => null),
    loadDictionary('bdbLexicon').catch(() => null),
    loadDictionary('bdbAramaic').catch(() => null)
  ]);
  log.debug('Additional lexicons preloaded');
}

/**
 * Preload academic sources (call for Pro Scholar mode)
 * Streamlined to only include FREE public domain sources
 * @returns {Promise<void>}
 */
export async function preloadAcademicSources() {
  log.debug('Preloading  academic sources...');
  await Promise.all([
    loadDictionary('geseniusLexicon').catch(() => null),  // Gesenius - 6,979 entries (public domain)
    loadDictionary('calAramaic').catch(() => null)        // CAL - 12,243 Aramaic entries (FREE!)
  ]);
  log.debug(' academic sources preloaded');
}

/**
 * Preload major etymology databases
 * These contain ~40,000+ combined etymology entries
 * @returns {Promise<void>}
 */
export async function preloadEtymologyDatabases() {
  log.debug('Preloading  etymology databases...');
  await Promise.all([
    loadDictionary('sefariaCache').catch(() => null),      // 2,493 entries
    loadDictionary('rootMeaningsPro').catch(() => null),   // 18,898 entries
    loadDictionary('etymologyJastrow').catch(() => null),  // 16,794 entries
    loadDictionary('wiktionaryCache').catch(() => null)    // 108+ entries
  ]);
  log.debug(' etymology databases preloaded');
}

/**
 * Preload scholarly data (call for scholar mode features)
 * @returns {Promise<void>}
 */
export async function preloadScholarlyData() {
  log.debug('Preloading scholarly data...');
  await Promise.all([
    loadDictionary('rootMeanings').catch(() => null),
    loadDictionary('semanticFields').catch(() => null),
    loadDictionary('rabbiBiographies').catch(() => null),
    loadDictionary('realia').catch(() => null)
  ]);
  log.debug('Scholarly data preloaded');
}

// =============================================================================
// Common Word Lists (consolidated from dictionaryPreloader)
// =============================================================================

/** Most common Hebrew words in Torah/Tanakh */
export const COMMON_HEBREW_WORDS = [
  'את', 'אל', 'על', 'כי', 'לא', 'אשר', 'כל', 'עם', 'מן', 'גם',
  'אם', 'או', 'עד', 'רק', 'אך', 'כן', 'לכן', 'אף', 'פן', 'בין',
  'אמר', 'היה', 'בא', 'עשה', 'נתן', 'הלך', 'ראה', 'שמע', 'ידע', 'לקח',
  'שב', 'קרא', 'דבר', 'עלה', 'יצא', 'שלח', 'עמד', 'שם', 'בנה', 'מצא',
  'יום', 'בן', 'איש', 'אב', 'בית', 'ארץ', 'עיר', 'יד', 'עין', 'לב',
  'נפש', 'פנים', 'ראש', 'רגל', 'מים', 'שמים', 'אדם', 'אלהים', 'מלך', 'תורה'
];

/** Common Aramaic/Talmudic words */
export const COMMON_ARAMAIC_WORDS = [
  'גמרא', 'משנה', 'תנא', 'רבי', 'רב', 'הלכה', 'מדרש', 'ברייתא',
  'אמר', 'קאמר', 'תנן', 'תניא', 'איתמר', 'אלא', 'אי', 'דילמא',
  'מילתא', 'עלמא', 'גברא', 'ביתא'
];

/**
 * Check if preloading should run (cache is cold)
 * @returns {boolean}
 */
export function shouldPreload() {
  if (typeof localStorage === 'undefined') return true;
  const lastPreload = localStorage.getItem('dictionary_preload_time');
  if (!lastPreload) return true;
  const hoursSincePreload = (Date.now() - parseInt(lastPreload, 10)) / (1000 * 60 * 60);
  return hoursSincePreload > 24;
}

// Deduplication flags for initializePreload
let preloadPromise = null;
let preloadComplete = false;

// Per-category deduplication: once a category's lexicons are loaded, skip repeat work.
const categoryPreloadPromises = Object.create(null);
const categoryPreloadComplete = Object.create(null);

/**
 * Per-category preload plans.
 *
 * The aggregate files (sefariaCache, rootMeaningsPro) are loaded for every
 * category — they contain pre-parsed entries from BDB/Jastrow/Klein/Strong's
 * and cover most lookups on the reading path.
 *
 * Full source JSONs stay lazy (loaded on first individual getBDB/getJastrow/
 * getStrongs call) unless explicitly listed here for the active book category.
 */
const CATEGORY_PRELOAD = {
  // Biblical Hebrew: BDB + Gesenius + Strong's cover Torah/Prophets/Writings.
  // Skip Jastrow/CAL — those are Talmudic Aramaic.
  tanakh: ['bdb', 'gesenius', 'strongs'],
  // Babylonian Talmud: Jastrow + CAL Aramaic cover rabbinic vocabulary.
  // Skip BDB/Gesenius/Strong's — those are Biblical Hebrew.
  talmud: ['jastrow', 'calAramaic'],
  // Mishnah: rabbinic Hebrew with biblical roots. Jastrow + BDB.
  mishnah: ['jastrow', 'bdb'],
  // Unknown/mixed: load the common trio, leave specialty lexicons lazy.
  mixed: ['bdb', 'jastrow', 'strongs']
};

/**
 * Classify a book name into a preload category.
 * @param {string|null|undefined} book
 * @returns {'tanakh'|'talmud'|'mishnah'|'mixed'}
 */
export function classifyBookCategory(book) {
  if (!book) return 'mixed';
  try {
    if (isTorahBook(book)) return 'tanakh';
    if (isTalmudBook(book)) return 'talmud';
    if (isMishnahBook(book)) return 'mishnah';
  } catch {
    // Fall through
  }
  return 'mixed';
}

/**
 * Preload only the lexicons relevant to the given book category.
 * Idempotent per category. Safe to call on every book navigation.
 *
 * @param {string} book - Book name (English, e.g. "Genesis" or "Shabbat")
 * @returns {Promise<void>}
 */
export async function preloadForBook(book) {
  const category = classifyBookCategory(book);
  if (categoryPreloadComplete[category]) return;
  if (categoryPreloadPromises[category]) return categoryPreloadPromises[category];

  const targets = CATEGORY_PRELOAD[category] || CATEGORY_PRELOAD.mixed;
  categoryPreloadPromises[category] = (async () => {
    log.debug(`[Preload] Category "${category}" loading: ${targets.join(', ')}`);
    await Promise.all(targets.map(name => loadDictionary(name).catch(() => null)));
    categoryPreloadComplete[category] = true;
    log.debug(`[Preload] Category "${category}" complete`);
  })();
  return categoryPreloadPromises[category];
}

/**
 * Wait for core dictionary preload to complete
 * Call this before performing lookups to ensure dictionaries are available.
 * Returns immediately if preload is already complete.
 * @returns {Promise<boolean>} True if dictionaries are ready
 */
export async function waitForPreload() {
  // Already loaded - return immediately
  if (preloadComplete) {
    return true;
  }

  // Preload in progress - wait for it
  if (preloadPromise) {
    try {
      await preloadPromise;
    } catch {
      // Preload failed — fall through to retry below
    }
    if (preloadComplete) return true;
  }

  // Preload hasn't started or previous attempt failed - start/retry and wait
  try {
    await initializePreload();
  } catch {
    // Initialization failed — return current state
  }
  return preloadComplete;
}

/**
 * Check if core dictionaries are loaded (sync check)
 * @returns {boolean} True if BDB, Jastrow, and Strong's are loaded
 */
export function isCoreDictionariesLoaded() {
  return preloadComplete && cache.bdb !== null && cache.jastrow !== null;
}

/**
 * Initialize dictionary preload for the current session.
 *
 * Loads the aggregate files (rootMeaningsPro + sefariaCache) that cover most
 * lookups, then — if a book context is supplied — the lexicons relevant to
 * that category. Full source JSONs not listed in the category plan remain
 * lazy and fetch on first individual lookup.
 *
 * Features deduplication to prevent multiple concurrent calls.
 *
 * @param {{ book?: string, category?: string }} [context]
 * @returns {Promise<void>}
 */
export async function initializePreload(context = null) {
  // Normalize context (also accept a bare book string)
  if (typeof context === 'string') context = { book: context };
  const category = context?.category || classifyBookCategory(context?.book);

  // Deduplication: If already complete, just make sure this category is covered.
  if (preloadComplete) {
    log.debug('[Preload] Base complete, ensuring category:', category);
    return preloadForBook(context?.book);
  }

  // Deduplication: If already in progress, wait for it then top up the category.
  if (preloadPromise) {
    log.debug('[Preload] Already in progress, waiting for existing preload');
    await preloadPromise;
    return preloadForBook(context?.book);
  }

  // Start the preload and store the promise for deduplication
  preloadPromise = (async () => {
    try {
      // PRIORITY 1: Aggregate etymology files — covers most lookups without
      // pulling in the full 40MB+ of individual source JSONs.
      await Promise.allSettled([
        loadDictionary('rootMeaningsPro').catch(() => null),
        loadDictionary('sefariaCache').catch(() => null)
      ]);
      log.debug('[Preload] Aggregate files loaded (rootMeaningsPro + sefariaCache)');

      // PRIORITY 2: Category-specific lexicons.
      await preloadForBook(context?.book);

      // PRIORITY 3: Preload common words into translation cache (if cache is cold)
      if (shouldPreload()) {
        try {
          const { preloadCommonWords } = await import('../unifiedLookupService');
          await preloadCommonWords();
          localStorage.setItem('dictionary_preload_time', Date.now().toString());
        } catch (e) {
          log.debug('[Preload] Common words preload skipped:', e.message);
        }
      }

      // Mark as complete
      preloadComplete = true;
    } finally {
      // Clear promise reference (allow retry on failure)
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}
