/**
 * Dynamic Dictionary Loader Service
 *
 * Loads dictionary data on-demand from public/data/*.json instead of bundling.
 * This reduces initial bundle size by ~30MB (uncompressed) / ~6MB (gzipped).
 *
 * Features:
 * - Lazy loading on first access
 * - In-memory caching after load
 * - Graceful error handling
 * - Loading state tracking
 */

import { createLogger } from '../utils/debug';

const log = createLogger('DictionaryLoader');

// =============================================================================
// CACHE & STATE
// =============================================================================

/** Cached dictionary data */
const cache = {
  bdb: null,
  jastrow: null,
  strongs: null,
  // Additional lexicons (lazy-loaded from JSON)
  bdbLexicon: null,
  bdbAramaic: null,
  kleinLexicon: null,
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
  // PRO SCHOLAR V11: New Academic Sources
  halotLexicon: null,     // HALOT - Modern academic standard (Tier 1)
  djbaLexicon: null,      // DJBA - Sokoloff's Babylonian Aramaic (Tier 1)
  djpaLexicon: null,      // DJPA - Sokoloff's Palestinian Aramaic (Tier 1)
  geseniusLexicon: null,  // Gesenius - Classical Hebrew grammar (Tier 2)
  twotLexicon: null,      // TWOT - Theological wordbook (Tier 2)
  targumLexicon: null,    // Targum vocabulary (Tier 2)
  // Scholarly data (lazy-loaded from JSON)
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null
};

/** Loading promises to prevent duplicate fetches */
const loadingPromises = {
  bdb: null,
  jastrow: null,
  strongs: null,
  bdbLexicon: null,
  bdbAramaic: null,
  kleinLexicon: null,
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
  // PRO SCHOLAR V11: New Academic Sources
  halotLexicon: null,
  djbaLexicon: null,
  djpaLexicon: null,
  geseniusLexicon: null,
  twotLexicon: null,
  targumLexicon: null,
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null
};

/** Loading state for UI feedback */
const loadingState = {
  bdb: false,
  jastrow: false,
  strongs: false,
  bdbLexicon: false,
  bdbAramaic: false,
  kleinLexicon: false,
  jastrowLexicon: false,
  strongLexicon: false,
  calAramaic: false,
  jastrowAramaic: false,
  // PRO SCHOLAR V11: New Academic Sources
  halotLexicon: false,
  djbaLexicon: false,
  djpaLexicon: false,
  geseniusLexicon: false,
  twotLexicon: false,
  targumLexicon: false,
  rootMeanings: false,
  semanticFields: false,
  rabbiBiographies: false,
  realia: false
};

// =============================================================================
// CORE LOADING FUNCTIONS
// =============================================================================

/**
 * Load a dictionary from public/data
 * @param {'bdb' | 'jastrow' | 'strongs'} name - Dictionary name
 * @returns {Promise<Object>} Dictionary data
 */
async function loadDictionary(name) {
  // Return cached data if available
  if (cache[name]) {
    return cache[name];
  }

  // Return existing promise if already loading
  if (loadingPromises[name]) {
    return loadingPromises[name];
  }

  // Start loading
  loadingState[name] = true;
  log.debug(`Loading ${name} dictionary...`);

  const fileName = {
    bdb: 'bdbComplete.json',
    jastrow: 'jastrowComplete.json',
    strongs: 'strongsComplete.json',
    // Additional lexicons extracted from hebrewLexicons.js
    bdbLexicon: 'bdb_lexicon.json',
    bdbAramaic: 'bdb_aramaic.json',
    kleinLexicon: 'klein_lexicon.json',
    jastrowLexicon: 'jastrow_lexicon.json',
    strongLexicon: 'strong_lexicon.json',
    calAramaic: 'cal_aramaic.json',
    jastrowAramaic: 'jastrow_aramaic.json',
    // PRO SCHOLAR V11: New Academic Sources (Tier 1 & 2)
    halotLexicon: 'halot_lexicon.json',       // HALOT - Modern academic standard
    djbaLexicon: 'djba_lexicon.json',         // DJBA - Sokoloff's Babylonian Aramaic
    djpaLexicon: 'djpa_lexicon.json',         // DJPA - Sokoloff's Palestinian Aramaic
    geseniusLexicon: 'gesenius_lexicon.json', // Gesenius - Classical Hebrew grammar
    twotLexicon: 'twot_lexicon.json',         // TWOT - Theological wordbook
    targumLexicon: 'targum_lexicon.json',     // Targum vocabulary
    // Scholarly data extracted from data/*.js
    rootMeanings: 'root_meanings.json',
    semanticFields: 'semantic_fields.json',
    rabbiBiographies: 'rabbi_biographies.json',
    realia: 'realia.json'
  }[name];

  loadingPromises[name] = fetch(`${process.env.PUBLIC_URL}/data/${fileName}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${name}: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      cache[name] = data;
      loadingState[name] = false;
      loadingPromises[name] = null;
      log.debug(`Loaded ${name}: ${Object.keys(data.byWord || data).length} entries`);
      return data;
    })
    .catch(error => {
      loadingState[name] = false;
      loadingPromises[name] = null;
      console.error(`[DictionaryLoader] Error loading ${name}:`, error);
      throw error;
    });

  return loadingPromises[name];
}

// =============================================================================
// BDB (Brown-Driver-Briggs)
// =============================================================================

/**
 * Get BDB dictionary data
 * @returns {Promise<Object>} BDB data with byWord and byStrongs indexes
 */
export async function getBDB() {
  return loadDictionary('bdb');
}

/**
 * Look up a word in BDB
 * @param {string} word - Hebrew word (without nikud)
 * @returns {Promise<Object|null>} BDB entry or null
 */
export async function lookupBDBByWord(word) {
  try {
    const data = await getBDB();
    return data?.byWord?.[word] || data?.[word] || null;
  } catch {
    return null;
  }
}

/**
 * Look up by Strong's number in BDB
 * @param {string} strongs - Strong's number (e.g., "H1234")
 * @returns {Promise<Object|null>} BDB entry or null
 */
export async function lookupBDBByStrongs(strongs) {
  try {
    const data = await getBDB();
    return data?.byStrongs?.[strongs] || null;
  } catch {
    return null;
  }
}

/**
 * Synchronous BDB lookup (returns cached data only)
 * @param {string} word - Hebrew word
 * @returns {Object|null} BDB entry or null if not cached
 */
export function lookupBDBSync(word) {
  if (!cache.bdb) return null;
  return cache.bdb?.byWord?.[word] || cache.bdb?.[word] || null;
}

// =============================================================================
// JASTROW
// =============================================================================

/**
 * Get Jastrow dictionary data
 * @returns {Promise<Object>} Jastrow data
 */
export async function getJastrow() {
  return loadDictionary('jastrow');
}

/**
 * Look up a word in Jastrow
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Promise<Object|null>} Jastrow entry or null
 */
export async function lookupJastrowByWord(word) {
  try {
    const data = await getJastrow();
    return data?.[word] || null;
  } catch {
    return null;
  }
}

/**
 * Synchronous Jastrow lookup (returns cached data only)
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Object|null} Jastrow entry or null if not cached
 */
export function lookupJastrowSync(word) {
  if (!cache.jastrow) return null;
  return cache.jastrow?.[word] || null;
}

// =============================================================================
// STRONG'S
// =============================================================================

/**
 * Get Strong's dictionary data
 * @returns {Promise<Object>} Strong's data with byWord and byNumber indexes
 */
export async function getStrongs() {
  return loadDictionary('strongs');
}

/**
 * Look up a word in Strong's
 * @param {string} word - Hebrew word
 * @returns {Promise<Object|null>} Strong's entry or null
 */
export async function lookupStrongsByWord(word) {
  try {
    const data = await getStrongs();
    return data?.byWord?.[word] || data?.[word] || null;
  } catch {
    return null;
  }
}

/**
 * Look up by Strong's number
 * @param {string} number - Strong's number (e.g., "H1234")
 * @returns {Promise<Object|null>} Strong's entry or null
 */
export async function lookupStrongsByNumber(number) {
  try {
    const data = await getStrongs();
    return data?.byNumber?.[number] || null;
  } catch {
    return null;
  }
}

/**
 * Synchronous Strong's lookup (returns cached data only)
 * @param {string} word - Hebrew word
 * @returns {Object|null} Strong's entry or null if not cached
 */
export function lookupStrongsSync(word) {
  if (!cache.strongs) return null;
  return cache.strongs?.byWord?.[word] || cache.strongs?.[word] || null;
}

// =============================================================================
// ADDITIONAL LEXICONS (lazy-loaded from extracted JSON)
// =============================================================================

/**
 * Get Klein lexicon data
 * @returns {Promise<Object>} Klein dictionary
 */
export async function getKleinLexicon() {
  return loadDictionary('kleinLexicon');
}

/**
 * Get BDB Lexicon data (from hebrewLexicons.js)
 * @returns {Promise<Object>} BDB Lexicon dictionary
 */
export async function getBDBLexicon() {
  return loadDictionary('bdbLexicon');
}

/**
 * Get BDB Aramaic data
 * @returns {Promise<Object>} BDB Aramaic dictionary
 */
export async function getBDBAramaic() {
  return loadDictionary('bdbAramaic');
}

/**
 * Get Jastrow Lexicon data (from hebrewLexicons.js)
 * @returns {Promise<Object>} Jastrow Lexicon dictionary
 */
export async function getJastrowLexicon() {
  return loadDictionary('jastrowLexicon');
}

/**
 * Get Strong's Lexicon data (from hebrewLexicons.js)
 * @returns {Promise<Object>} Strong's Lexicon dictionary
 */
export async function getStrongLexicon() {
  return loadDictionary('strongLexicon');
}

/**
 * Get CAL Aramaic data
 * @returns {Promise<Object>} CAL Aramaic dictionary
 */
export async function getCALAramaic() {
  return loadDictionary('calAramaic');
}

/**
 * Get Jastrow Aramaic data (small subset)
 * @returns {Promise<Object>} Jastrow Aramaic dictionary
 */
export async function getJastrowAramaic() {
  return loadDictionary('jastrowAramaic');
}

/**
 * Synchronous access to cached lexicons (returns null if not loaded)
 */
export function getKleinLexiconData() { return cache.kleinLexicon; }
export function getBDBLexiconData() { return cache.bdbLexicon; }
export function getBDBAramaicData() { return cache.bdbAramaic; }
export function getJastrowLexiconData() { return cache.jastrowLexicon; }
export function getStrongLexiconData() { return cache.strongLexicon; }
export function getCALAramaicData() { return cache.calAramaic; }
export function getJastrowAramaicData() { return cache.jastrowAramaic; }

// =============================================================================
// PRO SCHOLAR V11: NEW ACADEMIC SOURCES
// =============================================================================

/**
 * Get HALOT data - Modern academic standard (Tier 1)
 * Hebrew and Aramaic Lexicon of the Old Testament (Koehler-Baumgartner)
 * @returns {Promise<Object>} HALOT dictionary
 */
export async function getHALOTLexicon() {
  return loadDictionary('halotLexicon');
}

/**
 * Get DJBA data - Sokoloff's Dictionary of Jewish Babylonian Aramaic (Tier 1)
 * Essential for Talmud Bavli study
 * @returns {Promise<Object>} DJBA dictionary
 */
export async function getDJBALexicon() {
  return loadDictionary('djbaLexicon');
}

/**
 * Get DJPA data - Sokoloff's Dictionary of Jewish Palestinian Aramaic (Tier 1)
 * Essential for Jerusalem Talmud and Midrash
 * @returns {Promise<Object>} DJPA dictionary
 */
export async function getDJPALexicon() {
  return loadDictionary('djpaLexicon');
}

/**
 * Get Gesenius data - Classical Hebrew grammar reference (Tier 2)
 * @returns {Promise<Object>} Gesenius dictionary
 */
export async function getGeseniusLexicon() {
  return loadDictionary('geseniusLexicon');
}

/**
 * Get TWOT data - Theological Wordbook of OT (Tier 2)
 * Shows theological and semantic development
 * @returns {Promise<Object>} TWOT dictionary
 */
export async function getTWOTLexicon() {
  return loadDictionary('twotLexicon');
}

/**
 * Get Targum Lexicon data (Tier 2)
 * Vocabulary from Aramaic Bible translations
 * @returns {Promise<Object>} Targum dictionary
 */
export async function getTargumLexicon() {
  return loadDictionary('targumLexicon');
}

/**
 * Synchronous access to PRO SCHOLAR V11 cached lexicons (returns null if not loaded)
 */
export function getHALOTLexiconData() { return cache.halotLexicon; }
export function getDJBALexiconData() { return cache.djbaLexicon; }
export function getDJPALexiconData() { return cache.djpaLexicon; }
export function getGeseniusLexiconData() { return cache.geseniusLexicon; }
export function getTWOTLexiconData() { return cache.twotLexicon; }
export function getTargumLexiconData() { return cache.targumLexicon; }

// =============================================================================
// SCHOLARLY DATA (lazy-loaded from extracted JSON)
// =============================================================================

/**
 * Get root meanings data (from rootDatabase.js)
 * @returns {Promise<Object>} Root meanings dictionary
 */
export async function getRootMeanings() {
  return loadDictionary('rootMeanings');
}

/**
 * Get semantic fields data (from rootDatabase.js)
 * @returns {Promise<Object>} Semantic fields dictionary
 */
export async function getSemanticFields() {
  return loadDictionary('semanticFields');
}

/**
 * Get rabbi biographies data
 * @returns {Promise<Object>} Rabbi biographies dictionary
 */
export async function getRabbiBiographies() {
  return loadDictionary('rabbiBiographies');
}

/**
 * Get realia/measures data
 * @returns {Promise<Object>} Realia dictionary
 */
export async function getRealia() {
  return loadDictionary('realia');
}

/**
 * Synchronous access to cached scholarly data (returns null if not loaded)
 */
export function getRootMeaningsData() { return cache.rootMeanings; }
export function getSemanticFieldsData() { return cache.semanticFields; }
export function getRabbiBiographiesData() { return cache.rabbiBiographies; }
export function getRealiaData() { return cache.realia; }

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
    loadDictionary('kleinLexicon').catch(() => null),
    loadDictionary('calAramaic').catch(() => null),
    loadDictionary('jastrowAramaic').catch(() => null),
    loadDictionary('bdbLexicon').catch(() => null),
    loadDictionary('bdbAramaic').catch(() => null)
  ]);
  log.debug('Additional lexicons preloaded');
}

/**
 * PRO SCHOLAR V11: Preload new academic sources (call for Pro Scholar mode)
 * These are Tier 1 & 2 academic lexicons for advanced study
 * @returns {Promise<void>}
 */
export async function preloadAcademicSources() {
  log.debug('Preloading PRO SCHOLAR V11 academic sources...');
  await Promise.all([
    // Tier 1 - Peer-Reviewed Academic
    loadDictionary('halotLexicon').catch(() => null),
    loadDictionary('djbaLexicon').catch(() => null),
    loadDictionary('djpaLexicon').catch(() => null),
    // Tier 2 - Established Scholarly
    loadDictionary('geseniusLexicon').catch(() => null),
    loadDictionary('twotLexicon').catch(() => null),
    loadDictionary('targumLexicon').catch(() => null)
  ]);
  log.debug('PRO SCHOLAR V11 academic sources preloaded');
}

/**
 * Check if a dictionary is loaded
 * @param {'bdb' | 'jastrow' | 'strongs'} name - Dictionary name
 * @returns {boolean}
 */
export function isDictionaryLoaded(name) {
  return cache[name] !== null;
}

/**
 * Check if a dictionary is currently loading
 * @param {'bdb' | 'jastrow' | 'strongs'} name - Dictionary name
 * @returns {boolean}
 */
export function isDictionaryLoading(name) {
  return loadingState[name];
}

/**
 * Get loading status for all dictionaries
 * @returns {{ bdb: boolean, jastrow: boolean, strongs: boolean }}
 */
export function getLoadingStatus() {
  return { ...loadingState };
}

/**
 * Get cache status for all dictionaries
 * @returns {Object} Cache status for all dictionaries and lexicons
 */
export function getCacheStatus() {
  return {
    // Core dictionaries
    bdb: cache.bdb !== null,
    jastrow: cache.jastrow !== null,
    strongs: cache.strongs !== null,
    // Additional lexicons
    kleinLexicon: cache.kleinLexicon !== null,
    calAramaic: cache.calAramaic !== null,
    jastrowAramaic: cache.jastrowAramaic !== null,
    bdbLexicon: cache.bdbLexicon !== null,
    bdbAramaic: cache.bdbAramaic !== null,
    // PRO SCHOLAR V11: Academic sources
    halotLexicon: cache.halotLexicon !== null,
    djbaLexicon: cache.djbaLexicon !== null,
    djpaLexicon: cache.djpaLexicon !== null,
    geseniusLexicon: cache.geseniusLexicon !== null,
    twotLexicon: cache.twotLexicon !== null,
    targumLexicon: cache.targumLexicon !== null,
    // Scholarly data
    rootMeanings: cache.rootMeanings !== null,
    semanticFields: cache.semanticFields !== null,
    rabbiBiographies: cache.rabbiBiographies !== null,
    realia: cache.realia !== null
  };
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

/**
 * Clear dictionary cache (for memory management)
 * @param {'bdb' | 'jastrow' | 'strongs'} [name] - Optional specific dictionary
 */
export function clearCache(name) {
  if (name) {
    cache[name] = null;
    log.debug(`Cleared ${name} cache`);
  } else {
    cache.bdb = null;
    cache.jastrow = null;
    cache.strongs = null;
    log.debug('Cleared all dictionary caches');
  }
}

// =============================================================================
// RAW DATA ACCESS (for morphological analysis)
// =============================================================================

/**
 * Get raw BDB dictionary data (for morphological lookups)
 * Returns null if not yet loaded - use preloadDictionaries() first
 * @returns {Object|null} BDB dictionary with byWord and byStrongs indexes
 */
export function getBDBData() {
  return cache.bdb;
}

/**
 * Get raw Jastrow dictionary data (for morphological lookups)
 * @returns {Object|null} Jastrow dictionary
 */
export function getJastrowData() {
  return cache.jastrow;
}

/**
 * Get raw Strong's dictionary data (for morphological lookups)
 * @returns {Object|null} Strong's dictionary with byWord and byNumber indexes
 */
export function getStrongsData() {
  return cache.strongs;
}

// =============================================================================
// UNIFIED LOOKUP
// =============================================================================

/**
 * Look up a word across all dictionaries
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<{ bdb: Object|null, jastrow: Object|null, strongs: Object|null }>}
 */
export async function lookupAllDictionaries(word) {
  const [bdb, jastrow, strongs] = await Promise.all([
    lookupBDBByWord(word),
    lookupJastrowByWord(word),
    lookupStrongsByWord(word)
  ]);

  return { bdb, jastrow, strongs };
}

/**
 * Synchronous lookup across all cached dictionaries
 * @param {string} word - Hebrew/Aramaic word
 * @returns {{ bdb: Object|null, jastrow: Object|null, strongs: Object|null }}
 */
export function lookupAllSync(word) {
  return {
    bdb: lookupBDBSync(word),
    jastrow: lookupJastrowSync(word),
    strongs: lookupStrongsSync(word)
  };
}

// =============================================================================
// PRO SCHOLAR V8: Common Word Lists (consolidated from dictionaryPreloader)
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
 * Initialize all dictionary loading (call on app startup)
 * PRO SCHOLAR V8: Unified initialization point
 * @returns {Promise<Object>} Loading status
 */
export async function initializeDictionaries() {
  log.debug('Initializing dictionaries...');
  const startTime = Date.now();

  await preloadDictionaries();

  const status = getCacheStatus();
  const duration = Date.now() - startTime;

  log.debug(`Dictionaries initialized in ${duration}ms`, status);

  // Store last preload time
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dictionary_preload_time', Date.now().toString());
  }

  return {
    status,
    duration,
    loaded: Object.values(status).filter(Boolean).length
  };
}

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

/**
 * PRO SCHOLAR V8: Full initialization with common word preloading
 * Replaces dictionaryPreloader.initializePreload()
 *
 * @returns {Promise<void>}
 */
export async function initializePreload() {
  // PRIORITY 1: Load core dictionaries (BDB, Jastrow, Strong's)
  await preloadDictionaries();
  const status = getCacheStatus();
  log.debug(`[Preload] Core dictionaries loaded: BDB=${status.bdb}, Jastrow=${status.jastrow}, Strongs=${status.strongs}`);

  // PRIORITY 2: Preload additional lexicons (lazy-loaded from JSON)
  // These are smaller and needed for scholar mode lookups
  preloadLexicons().then(() => {
    log.debug('[Preload] Additional lexicons loaded');
  }).catch(() => {
    log.debug('[Preload] Additional lexicons preload skipped');
  });

  // PRIORITY 2.5: PRO SCHOLAR V11 - Preload academic sources (DJBA, DJPA, HALOT, etc.)
  // These are Tier 1 academic sources essential for scholarly Aramaic lookups
  preloadAcademicSources().then(() => {
    log.debug('[Preload] Academic sources loaded (DJBA, DJPA, HALOT, etc.)');
  }).catch(() => {
    log.debug('[Preload] Academic sources preload skipped');
  });

  // PRIORITY 3: Preload common words into translation cache (if cache is cold)
  if (shouldPreload()) {
    try {
      const { preloadCommonWords } = await import('./unifiedLookupService');
      await preloadCommonWords();
      localStorage.setItem('dictionary_preload_time', Date.now().toString());
    } catch (e) {
      log.debug('[Preload] Common words preload skipped:', e.message);
    }
  }
}

const dictionaryLoader = {
  // BDB
  getBDB,
  lookupBDBByWord,
  lookupBDBByStrongs,
  lookupBDBSync,
  getBDBData,

  // Jastrow
  getJastrow,
  lookupJastrowByWord,
  lookupJastrowSync,
  getJastrowData,

  // Strong's
  getStrongs,
  lookupStrongsByWord,
  lookupStrongsByNumber,
  lookupStrongsSync,
  getStrongsData,

  // Additional Lexicons (lazy-loaded)
  getKleinLexicon,
  getBDBLexicon,
  getBDBAramaic,
  getJastrowLexicon,
  getStrongLexicon,
  getCALAramaic,
  getJastrowAramaic,
  getKleinLexiconData,
  getBDBLexiconData,
  getBDBAramaicData,
  getJastrowLexiconData,
  getStrongLexiconData,
  getCALAramaicData,
  getJastrowAramaicData,
  preloadLexicons,

  // PRO SCHOLAR V11: Academic Sources (lazy-loaded)
  getHALOTLexicon,
  getDJBALexicon,
  getDJPALexicon,
  getGeseniusLexicon,
  getTWOTLexicon,
  getTargumLexicon,
  getHALOTLexiconData,
  getDJBALexiconData,
  getDJPALexiconData,
  getGeseniusLexiconData,
  getTWOTLexiconData,
  getTargumLexiconData,
  preloadAcademicSources,

  // Scholarly Data (lazy-loaded)
  getRootMeanings,
  getSemanticFields,
  getRabbiBiographies,
  getRealia,
  getRootMeaningsData,
  getSemanticFieldsData,
  getRabbiBiographiesData,
  getRealiaData,
  preloadScholarlyData,

  // Utilities
  preloadDictionaries,
  isDictionaryLoaded,
  isDictionaryLoading,
  getLoadingStatus,
  getCacheStatus,
  clearCache,
  lookupAllDictionaries,
  lookupAllSync,

  // PRO SCHOLAR V8: Unified initialization
  initializeDictionaries,
  initializePreload,
  shouldPreload,
  COMMON_HEBREW_WORDS,
  COMMON_ARAMAIC_WORDS
};

export default dictionaryLoader;
