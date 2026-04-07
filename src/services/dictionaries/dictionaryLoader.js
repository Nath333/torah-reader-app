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

import { createLogger } from '../../utils/debug';
// Centralized Hebrew text utilities (single source of truth)
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../../utils/hebrewUtils';
// Use canonical prefix list (DRY - single source of truth)
import { HEBREW_PREFIXES_ORDERED } from '../../constants/morphology';
// Use shared SOURCE_CONFIG for dictionary tiers (DRY)
import { SOURCE_CONFIG } from '../../constants/sourceConfig';

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
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
// Academic Hebrew lexicons
  geseniusLexicon: null,  // Gesenius - Classical Hebrew grammar (6,979 entries)
  kleinLexicon: null,     // Klein - Etymology-focused Hebrew (6,979 entries)
  // Scholarly data (lazy-loaded from JSON)
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
// Major Etymology Databases
  sefariaCache: null,         // 2,493 entries - Pre-parsed Klein, BDB, Jastrow, Strong's
  rootMeaningsPro: null,      // 18,898 entries - Main unified etymology database
  etymologyBDB: null,         // 2,591 entries - Cognates from BDB
  etymologyJastrow: null,     // 16,794 entries - Cross-refs from Jastrow
  wiktionaryCache: null       // 108+ entries - Proto-Semitic reconstructions
};

/** Loading promises to prevent duplicate fetches */
const loadingPromises = {
  bdb: null,
  jastrow: null,
  strongs: null,
  bdbLexicon: null,
  bdbAramaic: null,
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
// Academic Hebrew lexicons
  geseniusLexicon: null,
  kleinLexicon: null,
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
// Major Etymology Databases
  sefariaCache: null,
  rootMeaningsPro: null,
  etymologyBDB: null,
  etymologyJastrow: null,
  wiktionaryCache: null
};

/** Loading state for UI feedback */
const loadingState = {
  bdb: false,
  jastrow: false,
  strongs: false,
  bdbLexicon: false,
  bdbAramaic: false,
  jastrowLexicon: false,
  strongLexicon: false,
  calAramaic: false,
  jastrowAramaic: false,
// Academic Hebrew lexicons
  geseniusLexicon: false,
  kleinLexicon: false,
  rootMeanings: false,
  semanticFields: false,
  rabbiBiographies: false,
  realia: false,
// Major Etymology Databases
  sefariaCache: false,
  rootMeaningsPro: false,
  etymologyBDB: false,
  etymologyJastrow: false,
  wiktionaryCache: false
};

// =============================================================================
// SHARED CONSTANTS & HELPERS (DRY)
// =============================================================================

// Replaces local COMMON_PREFIXES — the canonical list includes 3/4-letter combos
const COMMON_PREFIXES = HEBREW_PREFIXES_ORDERED;

/** Words that shouldn't have root extraction applied */
const COMMON_WHOLE_WORDS = ['שבת', 'תורה', 'משנה', 'גמרא', 'ברכה', 'תפלה', 'מצוה', 'עולם', 'ישראל', 'אדם'];

/**
 * Shared root extraction helper (DRY)
 * Extracts root from word using rootExtraction service with fallback
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<{root: string|null, alternativeRoots: Array}>}
 */
async function extractRootHelper(word) {
  let extractedRoot = null;
  let alternativeRoots = [];

  // Skip extraction for known whole words
  if (COMMON_WHOLE_WORDS.includes(word)) {
    return { root: word, alternativeRoots: [] };
  }

  // Try rootExtraction service first
  try {
    const { extractRootsWithDirectValidation } = await import('../analysis/rootExtraction');
    const rootResult = extractRootsWithDirectValidation(word);

    if (rootResult?.bestMatch?.root) {
      extractedRoot = rootResult.bestMatch.root;
    } else if (rootResult?.hypotheses?.length > 0) {
      extractedRoot = rootResult.hypotheses[0].root;
    } else if (rootResult?.allMatches?.length > 0) {
      extractedRoot = rootResult.allMatches[0].root;
    }

    // Collect alternative hypotheses
    const allHypotheses = rootResult?.hypotheses || rootResult?.allMatches || [];
    alternativeRoots = allHypotheses
      .slice(0, 3)
      .map(h => ({ root: h.root, confidence: h.confidence, note: h.note }))
      .filter(h => h.root && h.root !== extractedRoot);
  } catch {
    // Root extraction service unavailable - use fallback
  }

  // Fallback: basic stem extraction
  if (!extractedRoot) {
    extractedRoot = extractRootFallback(word);
  }

  return { root: extractedRoot, alternativeRoots };
}

/**
 * Fallback root extraction without rootExtraction module (DRY)
 * @param {string} word - Hebrew word
 * @returns {string|null} Extracted root
 */
function extractRootFallback(word) {
  let stem = word;

  // Check for hollow verb pattern - don't strip prefix if detected
  let skipPrefixStrip = false;
  if (word.length >= 4) {
    let tempStem = word;
    const suffixes = ['ים', 'ות', 'ין'];
    for (const suf of suffixes) {
      if (tempStem.endsWith(suf)) {
        tempStem = tempStem.slice(0, -suf.length);
        break;
      }
    }
    if (tempStem.length === 4 && tempStem[1] === 'ו') skipPrefixStrip = true;
    if (tempStem.length === 3 && !['ה', 'ו', 'ב', 'כ', 'ל'].includes(tempStem[0])) skipPrefixStrip = true;
  }

  // Strip prefix if safe
  let strippedPrefix = null;
  if (!skipPrefixStrip) {
    for (const pre of COMMON_PREFIXES) {
      if (stem.startsWith(pre) && stem.length > pre.length + 2) {
        strippedPrefix = pre;
        stem = stem.slice(pre.length);
        break;
      }
    }
  }

  // Infinitive pattern: לכתוב → כתב
  if (strippedPrefix === 'ל' && stem.length >= 4) {
    if (stem.endsWith('ות')) return stem.slice(0, -2) + 'ה';
    if (stem[stem.length - 2] === 'ו') return stem.slice(0, -2) + stem.slice(-1);
  }

  // Strip suffixes
  const suffixes = ['ות', 'ים', 'ין', 'ה', 'ת', 'ן', 'נו', 'כם', 'הם', 'הן'];
  for (const suf of suffixes) {
    if (stem.endsWith(suf) && stem.length > suf.length + 1) {
      stem = stem.slice(0, -suf.length);
      break;
    }
  }

  // Extract root based on stem length
  if (stem.length === 4 && stem[2] === 'י') return stem[0] + stem[1] + stem[3];
  if (stem.length === 4 && stem[1] === 'ו') return stem[0] + stem[2] + stem[3];
  if (stem.length === 4) return stem.slice(0, 3);
  if (stem.length === 3) return restoreFinals(stem);
  if (stem.length === 2) return stem + 'ה';

  return null;
}

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
    // PRIMARY DICTIONARIES (Complete versions)
    bdb: 'bdbComplete.json',
    jastrow: 'jastrowComplete.json',
    strongs: 'strongsComplete.json',
    // Redirects to complete versions (data merged)
    // Legacy keys now point to consolidated files
    bdbLexicon: 'bdbComplete.json',       // MERGED: was bdb_lexicon.json (subset)
    bdbAramaic: 'bdbComplete.json',       // MERGED: was bdb_aramaic.json (subset)
    jastrowLexicon: 'jastrowComplete.json', // MERGED: was jastrow_lexicon.json (subset)
    jastrowAramaic: 'jastrowComplete.json', // MERGED: was jastrow_aramaic.json (subset)
    strongLexicon: 'strongsComplete.json',  // MERGED: was strong_lexicon.json (subset)
    // ESSENTIAL LEXICONS (Not redundant - unique data)
    calAramaic: 'cal_aramaic.json',           // CAL - 12,243 Aramaic entries (FREE!)
    // Academic Hebrew lexicons
    geseniusLexicon: 'gesenius_lexicon.json', // Gesenius - Classical Hebrew grammar (6,979 entries)
    kleinLexicon: 'klein_lexicon.json',       // Klein - Etymology-focused Hebrew (6,979 entries)
    // Scholarly data
    rootMeanings: 'root_meanings_pro.json',   // MERGED: was root_meanings.json (subset)
    semanticFields: 'semantic_fields.json',
    rabbiBiographies: 'rabbi_biographies.json',
    realia: 'realia.json',
    // Major Etymology Databases
    sefariaCache: 'sefaria_lexicon_cache.json',        // 2,493 pre-parsed entries
    rootMeaningsPro: 'root_meanings_pro.json',          // 22,049 unified entries (strengthened!)
    etymologyBDB: 'etymology_bdb_extracted.json',       // 2,591 cognates (source data)
    etymologyJastrow: 'etymology_jastrow_extracted.json', // 16,794 cross-refs (source data)
    wiktionaryCache: 'wiktionary_etymology_cache.json'  // 108+ Proto-Semitic
  }[name];

  loadingPromises[name] = fetch(`${process.env.PUBLIC_URL}/data/${fileName}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${name}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('json')) {
        throw new Error(`Expected JSON for ${name} but got ${contentType}`);
      }
      return response.json();
    })
    .then(data => {
      cache[name] = data;
      loadingState[name] = false;
      // Keep resolved promise so concurrent callers still get the result
      loadingPromises[name] = Promise.resolve(data);
      log.debug(`Loaded ${name}: ${Object.keys(data.byWord || data).length} entries`);
      return data;
    })
    .catch(error => {
      loadingState[name] = false;
      // Clear promise on failure so retry is possible
      loadingPromises[name] = null;
      if (error instanceof SyntaxError) {
        log.error(`[${name}] Malformed JSON:`, error.message);
      } else if (error instanceof TypeError) {
        log.error(`[${name}] Network error:`, error.message);
      } else {
        log.error(`[${name}] Load failed:`, error.message);
      }
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
 * Enhanced BDB lookup helper
 */
function findInBDB(data, word) {
  if (!data || !word) return null;

  // BDB may have byWord nested structure
  const byWord = data.byWord || data;

  // Try 1: Exact match
  if (byWord[word]) return byWord[word];

  // Try 2: Stripped nikud
  const stripped = stripAllDiacritics(word);
  if (byWord[stripped]) return byWord[stripped];

  // Try 3: Normalized finals
  const normalized = normalizeFinals(stripped);
  if (byWord[normalized]) return byWord[normalized];

  // Try 4: Check direct data keys (BDB may not have byWord)
  if (data !== byWord) {
    if (data[stripped]) return data[stripped];
    if (data[normalized]) return data[normalized];
  }

  return null;
}

/**
 * Look up a word in BDB
 * Enhanced with multiple key variations
 * @param {string} word - Hebrew word (without nikud)
 * @returns {Promise<Object|null>} BDB entry or null
 */
export async function lookupBDBByWord(word) {
  try {
    const data = await getBDB();
    return findInBDB(data, word);
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
 * Enhanced with multiple key variations
 * @param {string} word - Hebrew word
 * @returns {Object|null} BDB entry or null if not cached
 */
export function lookupBDBSync(word) {
  if (!cache.bdb) return null;
  return findInBDB(cache.bdb, word);
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
 * Enhanced dictionary lookup with multiple key variations
 * Uses centralized hebrewUtils functions (single source of truth)
 * Tries: exact → stripped → normalized → lemma search
 */
function findInDictionary(data, word) {
  if (!data || !word) return null;

  // Try 1: Exact match
  if (data[word]) return data[word];

  // Try 2: Stripped nikud (using centralized stripAllDiacritics)
  const stripped = stripAllDiacritics(word);
  if (data[stripped]) return data[stripped];

  // Try 3: Normalized finals (using centralized normalizeFinals)
  const normalized = normalizeFinals(stripped);
  if (data[normalized]) return data[normalized];

  // Try 4: Search by lemma field (slower but more thorough)
  const entries = Object.values(data);
  for (const entry of entries) {
    // Check if lemma contains our word (handles entries like "פני, פָּנָה")
    const lemma = entry.lemma || entry.headword || entry.word || '';
    const lemmaStripped = stripAllDiacritics(lemma);

    if (lemmaStripped === stripped || lemmaStripped === normalized) {
      return entry;
    }

    // Check if lemma contains multiple forms separated by comma/space
    if (lemmaStripped.includes(stripped) || lemmaStripped.includes(normalized)) {
      // Verify it's a word boundary match, not substring
      const lemmaWords = lemmaStripped.split(/[,\s]+/).map(w => w.trim());
      if (lemmaWords.includes(stripped) || lemmaWords.includes(normalized)) {
        return entry;
      }
    }
  }

  return null;
}

/**
 * Look up a word in Jastrow
 * Enhanced with multiple key variations
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Promise<Object|null>} Jastrow entry or null
 */
export async function lookupJastrowByWord(word) {
  try {
    const data = await getJastrow();
    return findInDictionary(data, word);
  } catch {
    return null;
  }
}

/**
 * Synchronous Jastrow lookup (returns cached data only)
 * Enhanced with multiple key variations
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Object|null} Jastrow entry or null if not cached
 */
export function lookupJastrowSync(word) {
  if (!cache.jastrow) return null;
  return findInDictionary(cache.jastrow, word);
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
export function getBDBLexiconData() { return cache.bdbLexicon; }
export function getBDBAramaicData() { return cache.bdbAramaic; }
export function getJastrowLexiconData() { return cache.jastrowLexicon; }
export function getStrongLexiconData() { return cache.strongLexicon; }
export function getCALAramaicData() { return cache.calAramaic; }
export function getJastrowAramaicData() { return cache.jastrowAramaic; }

// =============================================================================
// GESENIUS (Only remaining academic lexicon)
// =============================================================================

/**
 * Get Gesenius data - Classical Hebrew grammar reference
 * Public domain (1910) with scholarly enrichment from STEP Bible, BDB, Wiktionary
 * @returns {Promise<Object>} Gesenius dictionary (6,979 entries)
 */
export async function getGeseniusLexicon() {
  return loadDictionary('geseniusLexicon');
}

/**
 * Synchronous access to Gesenius (returns null if not loaded)
 */
export function getGeseniusLexiconData() { return cache.geseniusLexicon; }

/**
 * Klein Etymological Dictionary
 * Etymology-focused Hebrew dictionary with cognates and Proto-Semitic
 * @returns {Promise<Object>} Klein dictionary (6,979 entries)
 */
export async function getKleinLexicon() {
  return loadDictionary('kleinLexicon');
}

/**
 * Synchronous access to Klein (returns null if not loaded)
 */
export function getKleinLexiconData() { return cache.kleinLexicon; }

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
// MAJOR ETYMOLOGY DATABASES
// =============================================================================

/**
 * Get Sefaria lexicon cache (2,493 entries)
 * Pre-parsed Klein, BDB, Jastrow, Strong's from Sefaria API
 * @returns {Promise<Object>} Sefaria cache data
 */
export async function getSefariaCache() {
  return loadDictionary('sefariaCache');
}

/**
 * Get Pro root meanings database (18,898 entries)
 * Main unified etymology database with all scholarly sources
 * @returns {Promise<Object>} Root meanings pro data
 */
export async function getRootMeaningsPro() {
  return loadDictionary('rootMeaningsPro');
}

/**
 * Get BDB extracted etymology (2,591 entries)
 * Cognates and etymological data parsed from BDB
 * @returns {Promise<Object>} Etymology BDB data
 */
export async function getEtymologyBDB() {
  return loadDictionary('etymologyBDB');
}

/**
 * Get Jastrow extracted etymology (16,794 entries)
 * Cross-references and etymological data parsed from Jastrow
 * @returns {Promise<Object>} Etymology Jastrow data
 */
export async function getEtymologyJastrow() {
  return loadDictionary('etymologyJastrow');
}

/**
 * Get Wiktionary etymology cache (108+ entries)
 * Proto-Semitic reconstructions and cognate data
 * @returns {Promise<Object>} Wiktionary cache data
 */
export async function getWiktionaryCache() {
  return loadDictionary('wiktionaryCache');
}

/**
 * Synchronous access to  etymology databases
 */
export function getSefariaCacheData() { return cache.sefariaCache; }
export function getRootMeaningsProData() { return cache.rootMeaningsPro; }
export function getEtymologyBDBData() { return cache.etymologyBDB; }
export function getEtymologyJastrowData() { return cache.etymologyJastrow; }
export function getWiktionaryCacheData() { return cache.wiktionaryCache; }

/**
 * Lookup word in all etymology databases (DRY refactor)
 * SMART: If exact word not found, automatically tries 3-letter root extraction
 * @param {string} word - Hebrew/Aramaic word (inflected form like יציאות)
 * @returns {Promise<Object>} Combined etymology data from all sources
 */
export async function lookupAllEtymology(word) {
  // Helper to lookup a single word in all databases
  const lookupWord = async (w) => {
    const accessData = (d, key) => d?.[key] || d?.entries?.[key] || d?.byWord?.[key] || null;

    const [sefaria, rootPro, bdbEty, jastrowEty, wiktionary] = await Promise.all([
      getSefariaCache().then(d => accessData(d, w)).catch(() => null),
      getRootMeaningsPro().then(d => accessData(d, w)).catch(() => null),
      getEtymologyBDB().then(d => accessData(d, w)).catch(() => null),
      getEtymologyJastrow().then(d => accessData(d, w)).catch(() => null),
      getWiktionaryCache().then(d => accessData(d, w)).catch(() => null)
    ]);
    return { sefaria, rootMeaningsPro: rootPro, etymologyBDB: bdbEty, etymologyJastrow: jastrowEty, wiktionary };
  };

  // Check if result has any data
  const hasData = (result) => !!(result.sefaria || result.rootMeaningsPro ||
    result.etymologyBDB || result.etymologyJastrow || result.wiktionary);

  const { root: extractedRoot, alternativeRoots } = await extractRootHelper(word);

  // First try exact word lookup
  const exactResult = await lookupWord(word);
  if (hasData(exactResult)) {
    return {
      ...exactResult,
      hasEtymology: true,
      lookupWord: word,
      extractedRoot: extractedRoot !== word ? extractedRoot : null,
      usedRootFallback: false
    };
  }

  // Try root-based lookup if we have an extracted root
  if (extractedRoot && extractedRoot !== word) {
    const rootResult = await lookupWord(extractedRoot);
    if (hasData(rootResult)) {
      return {
        ...rootResult,
        hasEtymology: true,
        lookupWord: word,
        extractedRoot,
        alternativeRoots,
        usedRootFallback: true
      };
    }

    // Try alternative roots in parallel if primary failed
    if (alternativeRoots.length > 0) {
      const altResults = await Promise.all(
        alternativeRoots.map(async (alt) => {
          const result = await lookupWord(alt.root);
          return { ...alt, result, found: hasData(result) };
        })
      );

      const successfulAlt = altResults.find(a => a.found);
      if (successfulAlt) {
        return {
          ...successfulAlt.result,
          hasEtymology: true,
          lookupWord: word,
          extractedRoot: successfulAlt.root,
          primaryRootAttempt: extractedRoot,
          alternativeRoots: alternativeRoots.filter(a => a.root !== successfulAlt.root),
          usedRootFallback: true,
          usedAlternativeRoot: true
        };
      }
    }
  }

  // Nothing found
  return {
    ...exactResult,
    hasEtymology: false,
    lookupWord: word,
    extractedRoot,
    alternativeRoots
  };
}

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
    loadDictionary('etymologyBDB').catch(() => null),      // 2,591 entries
    loadDictionary('etymologyJastrow').catch(() => null),  // 16,794 entries
    loadDictionary('wiktionaryCache').catch(() => null)    // 108+ entries
  ]);
  log.debug(' etymology databases preloaded');
}

// =============================================================================
// TEXT ATTESTATIONS FROM SEFARIA CACHE
// Shows WHERE a word appears in Talmud, Mishnah, Midrash, etc.
// =============================================================================

/**
 * Patterns to identify dictionary cross-references (NOT text attestations)
 * These should be filtered out - we only want real text references
 */
const DICTIONARY_REF_PATTERNS = [
  /^Klein Dictionary/i,
  /^BDB/i,
  /^Jastrow/i,
  /^HALOT/i,
  /^Gesenius/i,
  /^Strong/i,
  /^TWOT/i,
  /^CAL/i
];

/**
 * Check if a reference is a dictionary cross-reference (not a text)
 * @param {string} ref - Reference string
 * @returns {boolean} True if this is a dictionary reference
 */
const isDictionaryRef = (ref) => {
  if (!ref || typeof ref !== 'string') return true;
  return DICTIONARY_REF_PATTERNS.some(pattern => pattern.test(ref));
};

/**
 * Categorize a text reference by type
 * @param {string} ref - Reference string like "Shabbat 73a" or "Mishnah Berakhot 1:1"
 * @returns {string} Category: 'talmud', 'mishnah', 'midrash', 'tanakh', 'targum', 'other'
 */
const categorizeTextRef = (ref) => {
  if (!ref) return 'other';
  const lower = ref.toLowerCase();

  // Mishnah (must check before Talmud since some tractates overlap)
  if (lower.startsWith('mishnah') || lower.startsWith('mishna')) return 'mishnah';

  // Jerusalem Talmud
  if (lower.startsWith('jerusalem talmud') || lower.startsWith('yerushalmi')) return 'yerushalmi';

  // Tosefta
  if (lower.startsWith('tosefta')) return 'tosefta';

  // Midrash
  if (lower.includes('rabbah') || lower.includes('midrash') ||
      lower.startsWith('sifra') || lower.startsWith('sifrei') || lower.startsWith('sifre') ||
      lower.includes('tehillim') || lower.includes('tanchuma')) return 'midrash';

  // Targum
  if (lower.startsWith('targum')) return 'targum';

  // Tanakh references (book names)
  const tanakhBooks = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
    'joshua', 'judges', 'samuel', 'kings', 'isaiah', 'jeremiah', 'ezekiel',
    'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
    'zephaniah', 'haggai', 'zechariah', 'malachi', 'psalms', 'proverbs', 'job',
    'song of songs', 'ruth', 'lamentations', 'ecclesiastes', 'esther', 'daniel',
    'ezra', 'nehemiah', 'chronicles'];
  if (tanakhBooks.some(book => lower.startsWith(book))) return 'tanakh';

  // Babylonian Talmud (tractate names with daf)
  if (/\d+[ab]/.test(ref)) return 'bavli';

  return 'other';
};

/**
 * Get text attestations for a word from Sefaria cache
 * Returns WHERE this word appears in Talmud, Mishnah, Midrash, etc.
 *
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} Text attestations grouped by category
 *
 * @example
 * getTextAttestations('אב')
 * // Returns:
 * // {
 * //   word: 'אב',
 * //   totalRefs: 12,
 * //   categories: {
 * //     bavli: ['Shabbat 73a', 'Rosh Hashanah 18b'],
 * //     mishnah: ['Mishnah Shabbat 7:1'],
 * //     midrash: ['Shemot Rabbah 46:5'],
 * //     yerushalmi: ['Jerusalem Talmud Nedarim 5:6:3']
 * //   },
 * //   allRefs: [...] // flat array of all refs
 * // }
 */
export function getTextAttestations(word) {
  const sefariaCache = cache.sefariaCache;
  if (!sefariaCache?.entries) {
    return null;
  }

  // Try exact match first
  let entry = sefariaCache.entries[word];

  // Try without vowel points
  if (!entry) {
    const stripped = stripAllDiacritics(word);
    entry = sefariaCache.entries[stripped];
  }

  if (!entry?.entries) {
    return null;
  }

  // Collect all refs from all lexicon entries
  const allRefs = new Set();
  const dictionaryRefs = new Set(); // Track dictionary cross-refs separately
  const categories = {
    bavli: [],
    yerushalmi: [],
    mishnah: [],
    tosefta: [],
    midrash: [],
    targum: [],
    tanakh: [],
    other: []
  };

// Also collect dictionary sources info
  const dictionarySources = {};

  for (const lexiconEntry of entry.entries) {
    // Track which dictionaries have this word
    if (lexiconEntry.lexicon) {
      const lexName = lexiconEntry.lexicon.replace(' Dictionary', '');
      if (!dictionarySources[lexName]) {
        dictionarySources[lexName] = {
          name: lexName,
          definition: lexiconEntry.definition,
          pos: lexiconEntry.pos,
          strongNumber: lexiconEntry.strongNumber
        };
      }
    }

    const refs = lexiconEntry.refs || [];
    for (const ref of refs) {
      // Separate dictionary cross-references from text references
      if (isDictionaryRef(ref)) {
        dictionaryRefs.add(ref);
        continue;
      }

      // Skip duplicates
      if (allRefs.has(ref)) continue;
      allRefs.add(ref);

      // Categorize the reference
      const category = categorizeTextRef(ref);
      if (categories[category]) {
        categories[category].push(ref);
      } else {
        categories.other.push(ref);
      }
    }
  }

// Return data even if no text refs (we have dictionary sources)
  const hasTextRefs = allRefs.size > 0;
  const hasDictSources = Object.keys(dictionarySources).length > 0;

  if (!hasTextRefs && !hasDictSources) {
    return null;
  }

  return {
    word: entry.word || word,
    totalRefs: allRefs.size,
    categories,
    allRefs: Array.from(allRefs),
// Include dictionary sources even when no text refs
    dictionarySources: Object.values(dictionarySources),
    dictionaryRefsCount: dictionaryRefs.size,
    hasTextRefs,
    source: 'Sefaria Lexicon Cache'
  };
}

/**
 * Get text attestations with async loading (ensures cache is loaded)
 * Enhanced with local dictionary fallback for rich detail
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Object|null>} Text attestations with dictionary sources
 */
export async function getTextAttestationsAsync(word) {
  if (!word) return null;

  // Ensure Sefaria cache is loaded
  await loadDictionary('sefariaCache');

  // Helper to check if result has useful data (text refs OR dictionary sources)
  const hasUsefulData = (r) => r && (r.totalRefs > 0 || r.dictionarySources?.length > 0);

  // Helper to try lookup and return if found
  const tryLookup = (w, method, metadata = {}) => {
    const result = getTextAttestations(w);
    if (hasUsefulData(result)) {
      return { ...result, lookupMethod: method, ...metadata };
    }
    return null;
  };

  // 1. Try direct lookup
  let result = tryLookup(word, 'exact');
  if (result?.totalRefs > 0) return result;

  // Keep best partial result (has dict sources but no text refs)
  let bestPartial = result;

  // 2. Try normalized finals
  const withFinals = restoreFinals(stripAllDiacritics(word));
  if (withFinals !== word) {
    result = tryLookup(withFinals, 'normalized-finals');
    if (result?.totalRefs > 0) return result;
    if (hasUsefulData(result) && !bestPartial) bestPartial = result;
  }

  // 3. Try root-based lookup using shared helper
  const { root: extractedRoot } = await extractRootHelper(word);
  if (extractedRoot && extractedRoot !== word) {
    result = tryLookup(extractedRoot, 'root-fallback', { originalWord: word, usedRoot: extractedRoot });
    if (result?.totalRefs > 0) return result;
    if (hasUsefulData(result) && !bestPartial) bestPartial = result;

    // Also try with finals restored
    const rootWithFinals = restoreFinals(extractedRoot);
    if (rootWithFinals !== extractedRoot) {
      result = tryLookup(rootWithFinals, 'root-fallback-finals', { originalWord: word, usedRoot: rootWithFinals });
      if (result?.totalRefs > 0) return result;
      if (hasUsefulData(result) && !bestPartial) bestPartial = result;
    }
  }

  // 4. Try prefix stripping using shared constant
  const stripped = stripAllDiacritics(word);
  for (const prefix of COMMON_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      result = tryLookup(withoutPrefix, 'prefix-stripped', { originalWord: word, strippedPrefix: prefix });
      if (result?.totalRefs > 0) return result;
      if (hasUsefulData(result) && !bestPartial) bestPartial = result;
    }
  }

// If we found dictionary sources but no text refs, return that
  if (bestPartial) {
    return { ...bestPartial, hasTextRefs: false };
  }

// Final fallback - check local dictionaries for sources
  const localSources = await getLocalDictionarySources(word, extractedRoot);
  if (localSources.length > 0) {
    return {
      word,
      totalRefs: 0,
      categories: {},
      allRefs: [],
      dictionarySources: localSources,
      hasTextRefs: false,
      lookupMethod: 'local-dictionaries',
      source: 'Local Dictionaries'
    };
  }

// Try live Sefaria API as final fallback (if enabled)
  const liveSources = await fetchSefariaLexiconLive(word);
  if (liveSources && liveSources.length > 0) {
    return {
      word,
      totalRefs: 0,
      categories: {},
      allRefs: [],
      dictionarySources: liveSources,
      hasTextRefs: false,
      lookupMethod: 'sefaria-api-live',
      source: 'Sefaria API (Live)'
    };
  }

  // Return "not found" metadata for UI
  return {
    word,
    totalRefs: 0,
    categories: {},
    allRefs: [],
    dictionarySources: [],
    hasTextRefs: false,
    lookupMethod: 'not-found',
    source: 'Sefaria Lexicon Cache'
  };
}

/**
 * Fetch lexicon data from live Sefaria API
 * Used when local caches don't have the word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Array>} Array of dictionary source objects
 */
async function fetchSefariaLexiconLive(word) {
  if (!word || word.length < 2) return [];

  const SEFARIA_BASE = process.env.NODE_ENV === 'development'
    ? '/sefaria-api'
    : 'https://www.sefaria.org/api';

  try {
    const cleaned = stripAllDiacritics(word);
    const response = await fetch(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // Transform Sefaria response to our format
    return data.map((entry, idx) => {
      const source = entry.parent_lexicon || entry.lexicon || 'Sefaria';
      const tierInfo = getDictionaryTierInfo(source);
      return {
        name: source,
        fullName: tierInfo.fullName,
        definition: entry.content?.definition || entry.content?.senses?.[0]?.definition || '',
        pos: entry.content?.morphology || '',
        strongNumber: entry.content?.strong_number || null,
        tier: tierInfo.tier,
        tierIcon: tierInfo.icon,
        priority: tierInfo.priority + idx,
        lemma: entry.headword || null,
        fromLiveApi: true
      };
    }).filter(s => s.definition);
  } catch (err) {
    log.debug('[SefariaLive] API fetch failed:', err.message);
    return [];
  }
}

/**
 * Get dictionary sources from local caches
 * Fallback when Sefaria cache doesn't have the word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Array>} Array of dictionary source objects
 */
/**
 * Dictionary tier configuration (DRY - derived from SOURCE_CONFIG)
 * Maps display names to SOURCE_CONFIG keys with additional UI metadata
 */
const TIER_ICONS = { gold: '🎓', silver: '📚', bronze: '📖' };
const TIER_NAMES = { gold: 'academic', silver: 'standard', bronze: 'supplementary' };

const getDictionaryTierInfo = (name) => {
  // Map display names to SOURCE_CONFIG keys
  const keyMap = {
    'BDB': 'bdb', 'Jastrow': 'jastrow', 'Gesenius': 'gesenius',
    'Klein': 'klein', "Strong's": 'strongs', 'CAL': 'cal'
  };
  const key = keyMap[name] || name.toLowerCase();
  const config = SOURCE_CONFIG[key];
  if (!config) return { tier: 'standard', icon: '📖', priority: 99, fullName: name };

  const tier = config.tier || 'bronze';
  const priorityMap = { gold: 1, silver: 5, bronze: 9 };
  return {
    tier: TIER_NAMES[tier] || tier,
    icon: TIER_ICONS[tier] || '📖',
    priority: priorityMap[tier] + (key === 'bdb' ? 0 : key === 'jastrow' ? 1 : key === 'gesenius' ? 2 : key === 'klein' ? 3 : key === 'cal' ? 4 : 5),
    fullName: config.fullName || name
  };
};

async function getLocalDictionarySources(word, preExtractedRoot = null) {
  const sources = [];
  const cleaned = stripAllDiacritics(word);

// Ensure all dictionaries are loaded first (critical fix)
  await Promise.all([
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('strongs').catch(() => null),
    loadDictionary('geseniusLexicon').catch(() => null),
    loadDictionary('kleinLexicon').catch(() => null),
    loadDictionary('calAramaic').catch(() => null)
  ]);

  const wordsToTry = new Set([word, cleaned, normalizeFinals(cleaned), restoreFinals(cleaned)]);

  // Try root extraction for better coverage (use pre-extracted root if available)
  const extractedRoot = preExtractedRoot || (await extractRootHelper(word)).root;
  if (extractedRoot && extractedRoot.length >= 2) {
    wordsToTry.add(extractedRoot);
    wordsToTry.add(normalizeFinals(extractedRoot));
    wordsToTry.add(restoreFinals(extractedRoot));
  }

// Check each dictionary with tier info
  const dictChecks = [
    { cacheRef: () => cache.bdb, name: 'BDB', getEntry: (d, w) => d?.byWord?.[w] || d?.[w] },
    { cacheRef: () => cache.jastrow, name: 'Jastrow', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.strongs, name: "Strong's", getEntry: (d, w) => d?.byWord?.[w] || d?.[w] },
    { cacheRef: () => cache.geseniusLexicon, name: 'Gesenius', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.kleinLexicon, name: 'Klein', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.calAramaic, name: 'CAL', getEntry: (d, w) => d?.[w] },
  ];

  for (const { cacheRef, name, getEntry } of dictChecks) {
    const dictCache = cacheRef(); // Get fresh reference after load
    if (!dictCache) continue;

    let entry = null;
    let foundWord = null;
    for (const w of wordsToTry) {
      entry = getEntry(dictCache, w);
      if (entry) {
        foundWord = w;
        break;
      }
    }

    if (entry) {
      const def = entry.definition || entry.gloss || entry.english || entry.meaning || '';
      if (def) {
// Use DRY helper derived from SOURCE_CONFIG
        const tierInfo = getDictionaryTierInfo(name);
        sources.push({
          name,
          fullName: tierInfo.fullName,
          definition: def,
          pos: entry.pos || entry.partOfSpeech || '',
          strongNumber: entry.strongNumber || entry.strongs || entry.strong || null,
          tier: tierInfo.tier,
          tierIcon: tierInfo.icon,
          priority: tierInfo.priority,
// Additional scholarly metadata
          lemma: entry.lemma || entry.headword || null,
          etymology: entry.etymology || entry.cognates || null,
          references: entry.refs || entry.references || null,
          foundVia: foundWord !== word && foundWord !== cleaned ? foundWord : null
        });
      }
    }
  }

  // Sort by priority (academic dictionaries first)
  sources.sort((a, b) => a.priority - b.priority);

  return sources;
}

// =============================================================================
// ROOT MEANING LOOKUP (SHORESH)
// Shows the meaning of the 3-letter root from multiple dictionaries
// =============================================================================

/**
 * Extract a short definition (first meaning only)
 * @param {string} definition - Full definition text
 * @returns {string} Short definition
 */
function extractShortDefinition(definition) {
  if (!definition) return '';
  const short = definition
    .split(/[;,(]/)[0]
    .replace(/^(to |a |an |the )/i, '')
    .trim();
  return short.length > 60 ? short.slice(0, 57) + '...' : short;
}

/**
 * Look up root meaning from root_meanings_pro.json (22,049 entries)
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Object|null} Root meaning data
 */
export function getRootMeaning(root) {
  const rootData = cache.rootMeaningsPro || cache.rootMeanings;
  if (!rootData?.entries) return null;

  const cleaned = stripAllDiacritics(root || '');
  if (!cleaned || cleaned.length < 2) return null;

  let entry = rootData.entries[cleaned];
  if (!entry) {
    const withFinal = restoreFinals(cleaned);
    entry = rootData.entries[withFinal];
  }
  if (!entry) return null;

  return {
    root: entry.key || cleaned,
    lemma: entry.lemma,
    definition: entry.definition,
    shortDef: extractShortDefinition(entry.definition),
    pos: entry.pos,
    isAramaic: entry.isAramaic,
    isBiblicalHebrew: entry.isBiblicalHebrew,
    semanticField: entry.semanticField,
    sources: entry.sources || [],
    cognates: entry.etymology?.cognates || null,
    protoSemitic: entry.etymology?.protoSemitic || null,
    qualityScore: entry.qualityScore || 0,
    source: 'Root Meanings Pro'
  };
}

/**
 * Look up root meaning from ALL dictionary sources
 * Aggregates definitions from BDB, Jastrow, Klein, Strong's
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Object|null} Aggregated root meanings from all sources
 */
export function getRootMeaningFromAllSources(root) {
  const cleaned = stripAllDiacritics(root || '');
  if (!cleaned || cleaned.length < 2) return null;

  const results = {
    root: cleaned,
    definitions: [],
    sources: [],
    primaryDefinition: null,
    isAramaic: false,
    semanticField: null
  };

  // 1. Check root_meanings_pro (main source - 22,049 entries)
  const rootPro = getRootMeaning(cleaned);
  if (rootPro) {
    results.definitions.push({
      source: 'Root Meanings Pro',
      definition: rootPro.definition,
      shortDef: rootPro.shortDef,
      pos: rootPro.pos,
      tier: 1
    });
    results.sources.push(...(rootPro.sources || []));
    results.isAramaic = rootPro.isAramaic;
    results.semanticField = rootPro.semanticField;
    results.cognates = rootPro.cognates;
    results.protoSemitic = rootPro.protoSemitic;
  }

  // 2. Check BDB (Biblical Hebrew)
  const bdb = cache.bdb?.byWord?.[cleaned] || cache.bdb?.[cleaned];
  if (bdb) {
    const def = bdb.definition || bdb.gloss || bdb.english;
    if (def && !results.definitions.some(d => d.source === 'BDB')) {
      results.definitions.push({
        source: 'BDB',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: bdb.pos,
        strongNumber: bdb.strongNumber,
        tier: 1
      });
      if (!results.sources.includes('BDB')) results.sources.push('BDB');
    }
  }

  // 3. Check Jastrow (Talmudic/Aramaic)
  const jastrow = cache.jastrow?.[cleaned];
  if (jastrow) {
    const def = jastrow.definition || jastrow.english;
    if (def && !results.definitions.some(d => d.source === 'Jastrow')) {
      results.definitions.push({
        source: 'Jastrow',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: jastrow.pos,
        isAramaic: jastrow.isAramaic,
        tier: 1
      });
      if (!results.sources.includes('Jastrow')) results.sources.push('Jastrow');
      if (jastrow.isAramaic) results.isAramaic = true;
    }
  }

  // 4. Check Klein (Etymology-focused)
  const klein = cache.kleinLexicon?.[cleaned];
  if (klein) {
    const def = klein.definition || klein.gloss;
    if (def && !results.definitions.some(d => d.source === 'Klein')) {
      results.definitions.push({
        source: 'Klein',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: klein.pos,
        etymology: klein.etymology,
        tier: 2
      });
      if (!results.sources.includes('Klein')) results.sources.push('Klein');
    }
  }

  // 5. Check Strong's (Concordance)
  const strongs = cache.strongs?.byWord?.[cleaned] || cache.strongs?.[cleaned];
  if (strongs) {
    const def = strongs.definition || strongs.kjv_def || strongs.strongs_def;
    if (def && !results.definitions.some(d => d.source === "Strong's")) {
      results.definitions.push({
        source: "Strong's",
        definition: def,
        shortDef: extractShortDefinition(def),
        strongNumber: strongs.strongNumber || strongs.H,
        tier: 3
      });
      if (!results.sources.includes("Strong's")) results.sources.push("Strong's");
    }
  }

  // 6. Check Gesenius (Academic source)
  const gesenius = cache.geseniusLexicon?.[cleaned] || cache.geseniusLexicon?.byWord?.[cleaned];
  if (gesenius) {
    const def = gesenius.definition || gesenius.gloss || gesenius.english;
    if (def && !results.definitions.some(d => d.source === 'Gesenius')) {
      results.definitions.push({
        source: 'Gesenius',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: gesenius.pos,
        tier: 1
      });
      if (!results.sources.includes('Gesenius')) results.sources.push('Gesenius');
    }
  }

  // 7. Check CAL Aramaic (for Aramaic roots)
  const calAramaic = cache.calAramaic?.[cleaned];
  if (calAramaic) {
    const def = calAramaic.definition || calAramaic.meaning;
    if (def && !results.definitions.some(d => d.source === 'CAL')) {
      results.definitions.push({
        source: 'CAL',
        definition: def,
        shortDef: extractShortDefinition(def),
        isAramaic: true,
        tier: 1
      });
      if (!results.sources.includes('CAL')) results.sources.push('CAL');
      results.isAramaic = true;
    }
  }

  // Set primary definition (prefer tier 1)
  if (results.definitions.length > 0) {
    const tier1 = results.definitions.find(d => d.tier === 1);
    results.primaryDefinition = tier1?.shortDef || results.definitions[0].shortDef;
  }

// Determine usage eras based on which dictionaries have data
  const eras = [];
  if (results.sources.includes('BDB') || results.sources.includes('Gesenius')) {
    eras.push('biblical');
  }
  if (results.sources.includes('Jastrow') || results.sources.includes('CAL')) {
    eras.push('talmudic');
    if (!eras.includes('mishnaic')) eras.push('mishnaic');
  }
  // If only Strong's, assume biblical
  if (results.sources.includes("Strong's") && !eras.includes('biblical')) {
    eras.push('biblical');
  }
  results.eras = eras;

// Add frequency estimates based on sources
  // (Actual frequency data would come from corpus analysis)
  if (results.definitions.length > 0) {
    const hasMultipleSources = results.sources.length > 1;
    const hasBiblicalSource = eras.includes('biblical');
    const hasTalmudicSource = eras.includes('talmudic');

    results.frequency = {
      biblical: hasBiblicalSource ? (hasMultipleSources ? 'common' : 'attested') : null,
      talmudic: hasTalmudicSource ? (hasMultipleSources ? 'common' : 'attested') : null,
      sourceCount: results.sources.length
    };
  }

  return results.definitions.length > 0 ? results : null;
}

/**
 * Async version that ensures dictionaries are loaded
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Promise<Object|null>} Root meanings from all sources
 */
export async function getRootMeaningAsync(root) {
  await Promise.all([
    loadDictionary('rootMeaningsPro').catch(() => null),
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('kleinLexicon').catch(() => null),
    loadDictionary('strongs').catch(() => null),
// Additional academic sources
    loadDictionary('geseniusLexicon').catch(() => null),
    loadDictionary('calAramaic').catch(() => null)
  ]);
  return getRootMeaningFromAllSources(root);
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
    calAramaic: cache.calAramaic !== null,
    jastrowAramaic: cache.jastrowAramaic !== null,
    bdbLexicon: cache.bdbLexicon !== null,
    bdbAramaic: cache.bdbAramaic !== null,
// Academic sources (streamlined)
    geseniusLexicon: cache.geseniusLexicon !== null,
    // Scholarly data
    rootMeanings: cache.rootMeanings !== null,
    semanticFields: cache.semanticFields !== null,
    rabbiBiographies: cache.rabbiBiographies !== null,
    realia: cache.realia !== null,
// Etymology databases
    sefariaCache: cache.sefariaCache !== null,
    rootMeaningsPro: cache.rootMeaningsPro !== null,
    etymologyBDB: cache.etymologyBDB !== null,
    etymologyJastrow: cache.etymologyJastrow !== null,
    wiktionaryCache: cache.wiktionaryCache !== null
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
 * Initialize all dictionary loading (call on app startup)
 * Unified initialization point
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

// Deduplication flags for initializePreload
let preloadPromise = null;
let preloadComplete = false;

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
 * Full initialization with common word preloading
 * Replaces dictionaryPreloader.initializePreload()
 *
 * Features deduplication to prevent multiple concurrent calls.
 *
 * @returns {Promise<void>}
 */
export async function initializePreload() {
  // Deduplication: If already complete, return immediately
  if (preloadComplete) {
    log.debug('[Preload] Already complete, skipping');
    return;
  }

  // Deduplication: If already in progress, return the existing promise
  if (preloadPromise) {
    log.debug('[Preload] Already in progress, waiting for existing preload');
    return preloadPromise;
  }

  // Start the preload and store the promise for deduplication
  preloadPromise = (async () => {
    try {
      // PRIORITY 1: Load core dictionaries (BDB, Jastrow, Strong's)
      await preloadDictionaries();
      const status = getCacheStatus();
      log.debug(`[Preload] Core dictionaries loaded: BDB=${status.bdb}, Jastrow=${status.jastrow}, Strongs=${status.strongs}`);

      // PRIORITY 2: Preload additional lexicons, academic sources, and etymology databases
      // Await all secondary preloads before marking complete to avoid incomplete lookups
      await Promise.allSettled([
        preloadLexicons().then(() => {
          log.debug('[Preload] Additional lexicons loaded');
        }),
        preloadAcademicSources().then(() => {
          log.debug('[Preload] Academic sources loaded (DJBA, DJPA, HALOT, etc.)');
        }),
        preloadEtymologyDatabases().then(() => {
          log.debug('[Preload] Etymology databases loaded (Sefaria, BDB, Jastrow, Wiktionary)');
        })
      ]);

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
  getBDBLexicon,
  getBDBAramaic,
  getJastrowLexicon,
  getStrongLexicon,
  getCALAramaic,
  getJastrowAramaic,
  getBDBLexiconData,
  getBDBAramaicData,
  getJastrowLexiconData,
  getStrongLexiconData,
  getCALAramaicData,
  getJastrowAramaicData,
  preloadLexicons,

// Academic Hebrew lexicons
  getGeseniusLexicon,
  getGeseniusLexiconData,
  getKleinLexicon,
  getKleinLexiconData,
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

// Etymology Databases (lazy-loaded)
  getSefariaCache,
  getRootMeaningsPro,
  getEtymologyBDB,
  getEtymologyJastrow,
  getWiktionaryCache,
  getSefariaCacheData,
  getRootMeaningsProData,
  getEtymologyBDBData,
  getEtymologyJastrowData,
  getWiktionaryCacheData,
  lookupAllEtymology,
  preloadEtymologyDatabases,

// Text Attestations (where word appears in texts)
  getTextAttestations,
  getTextAttestationsAsync,

// Root Meaning Lookup (shoresh translation)
  getRootMeaning,
  getRootMeaningFromAllSources,
  getRootMeaningAsync,

  // Utilities
  preloadDictionaries,
  isDictionaryLoaded,
  isDictionaryLoading,
  getLoadingStatus,
  getCacheStatus,
  clearCache,
  lookupAllDictionaries,
  lookupAllSync,

// Unified initialization
  initializeDictionaries,
  initializePreload,
  shouldPreload,
  // COMMON_HEBREW_WORDS,
  // COMMON_ARAMAIC_WORDS,

// Preload synchronization
  waitForPreload,
  isCoreDictionariesLoaded
};

export default dictionaryLoader;
