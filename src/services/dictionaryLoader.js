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
// PRO SCHOLAR: Centralized Hebrew text utilities (single source of truth)
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../utils/hebrewUtils';

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
  // PRO SCHOLAR V16: Academic Hebrew lexicons
  geseniusLexicon: null,  // Gesenius - Classical Hebrew grammar (6,979 entries)
  kleinLexicon: null,     // Klein - Etymology-focused Hebrew (6,979 entries)
  // Scholarly data (lazy-loaded from JSON)
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
  // PRO SCHOLAR V12: Major Etymology Databases
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
  // PRO SCHOLAR V16: Academic Hebrew lexicons
  geseniusLexicon: null,
  kleinLexicon: null,
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
  // PRO SCHOLAR V12: Major Etymology Databases
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
  // PRO SCHOLAR V16: Academic Hebrew lexicons
  geseniusLexicon: false,
  kleinLexicon: false,
  rootMeanings: false,
  semanticFields: false,
  rabbiBiographies: false,
  realia: false,
  // PRO SCHOLAR V12: Major Etymology Databases
  sefariaCache: false,
  rootMeaningsPro: false,
  etymologyBDB: false,
  etymologyJastrow: false,
  wiktionaryCache: false
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
    // PRIMARY DICTIONARIES (Complete versions)
    bdb: 'bdbComplete.json',
    jastrow: 'jastrowComplete.json',
    strongs: 'strongsComplete.json',
    // PRO SCHOLAR V14: Redirects to complete versions (data merged)
    // Legacy keys now point to consolidated files
    bdbLexicon: 'bdbComplete.json',       // MERGED: was bdb_lexicon.json (subset)
    bdbAramaic: 'bdbComplete.json',       // MERGED: was bdb_aramaic.json (subset)
    jastrowLexicon: 'jastrowComplete.json', // MERGED: was jastrow_lexicon.json (subset)
    jastrowAramaic: 'jastrowComplete.json', // MERGED: was jastrow_aramaic.json (subset)
    strongLexicon: 'strongsComplete.json',  // MERGED: was strong_lexicon.json (subset)
    // ESSENTIAL LEXICONS (Not redundant - unique data)
    calAramaic: 'cal_aramaic.json',           // CAL - 12,243 Aramaic entries (FREE!)
    // PRO SCHOLAR V16: Academic Hebrew lexicons
    geseniusLexicon: 'gesenius_lexicon.json', // Gesenius - Classical Hebrew grammar (6,979 entries)
    kleinLexicon: 'klein_lexicon.json',       // Klein - Etymology-focused Hebrew (6,979 entries)
    // Scholarly data
    rootMeanings: 'root_meanings_pro.json',   // MERGED: was root_meanings.json (subset)
    semanticFields: 'semantic_fields.json',
    rabbiBiographies: 'rabbi_biographies.json',
    realia: 'realia.json',
    // PRO SCHOLAR V12: Major Etymology Databases
    sefariaCache: 'sefaria_lexicon_cache.json',        // 2,493 pre-parsed entries
    rootMeaningsPro: 'root_meanings_pro.json',          // 22,049 unified entries (strengthened!)
    etymologyBDB: 'etymology_bdb_extracted.json',       // 2,591 cognates (source data)
    etymologyJastrow: 'etymology_jastrow_extracted.json', // 16,794 cross-refs (source data)
    wiktionaryCache: 'wiktionary_etymology_cache.json'  // 108+ Proto-Semitic
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
      log.error(`Error loading ${name}:`, error.message);
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
 * PRO SCHOLAR V12: Enhanced BDB lookup helper
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
 * PRO SCHOLAR V12: Enhanced with multiple key variations
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
 * PRO SCHOLAR V12: Enhanced with multiple key variations
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
 * PRO SCHOLAR V12: Enhanced dictionary lookup with multiple key variations
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
 * PRO SCHOLAR V12: Enhanced with multiple key variations
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
 * PRO SCHOLAR V12: Enhanced with multiple key variations
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
// PRO SCHOLAR V15: GESENIUS (Only remaining academic lexicon)
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
 * PRO SCHOLAR V16: Klein Etymological Dictionary
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
// PRO SCHOLAR V12: MAJOR ETYMOLOGY DATABASES
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
 * Synchronous access to PRO SCHOLAR V12 etymology databases
 */
export function getSefariaCacheData() { return cache.sefariaCache; }
export function getRootMeaningsProData() { return cache.rootMeaningsPro; }
export function getEtymologyBDBData() { return cache.etymologyBDB; }
export function getEtymologyJastrowData() { return cache.etymologyJastrow; }
export function getWiktionaryCacheData() { return cache.wiktionaryCache; }

/**
 * PRO SCHOLAR V12: Lookup word in all etymology databases
 * SMART: If exact word not found, automatically tries 3-letter root extraction
 * @param {string} word - Hebrew/Aramaic word (inflected form like יציאות)
 * @returns {Promise<Object>} Combined etymology data from all sources
 */
export async function lookupAllEtymology(word) {
  // Helper to lookup a single word in all databases
  // PRO SCHOLAR V12: Supports all access patterns: direct, .entries, .byWord
  const lookupWord = async (w) => {
    const accessData = (d, word) => d?.[word] || d?.entries?.[word] || d?.byWord?.[word] || null;

    const [sefaria, rootPro, bdbEty, jastrowEty, wiktionary] = await Promise.all([
      getSefariaCache().then(d => accessData(d, w)).catch(() => null),
      getRootMeaningsPro().then(d => accessData(d, w)).catch(() => null),
      getEtymologyBDB().then(d => accessData(d, w)).catch(() => null),
      getEtymologyJastrow().then(d => accessData(d, w)).catch(() => null),
      getWiktionaryCache().then(d => accessData(d, w)).catch(() => null)
    ]);
    return { sefaria, rootMeaningsPro: rootPro, etymologyBDB: bdbEty, etymologyJastrow: jastrowEty, wiktionary };
  };

  // PRO SCHOLAR V12: ALWAYS compute extracted root first, even if exact match found
  // This ensures the UI can display the proper root (e.g., יציאות → יצא)
  let computedRoot = null;
  let alternativeRootsEarly = [];

  // Quick fallback root extraction (same logic as below, but computed early)
  {
    let stem = word;
    let tempPrefix = null;
    let skipPrefixStrip = false;

    const commonWords = ['שבת', 'תורה', 'משנה', 'גמרא', 'ברכה', 'תפלה', 'מצוה', 'עולם', 'ישראל', 'אדם'];
    if (commonWords.includes(word)) {
      computedRoot = word;
    } else {
      // Check for hollow verb pattern
      if (word.length >= 4) {
        let tempStem = word;
        const suffixes = ['ים', 'ות', 'ין'];
        for (const suf of suffixes) {
          if (tempStem.endsWith(suf)) {
            tempStem = tempStem.slice(0, -suf.length);
            break;
          }
        }
        if (tempStem.length === 4 && tempStem[1] === 'ו') {
          skipPrefixStrip = true;
        }
        if (tempStem.length === 3 && !['ה', 'ו', 'ב', 'כ', 'ל'].includes(tempStem[0])) {
          skipPrefixStrip = true;
        }
      }

      // Strip prefix if safe
      if (!skipPrefixStrip) {
        const prefixes = ['וה', 'בה', 'לה', 'מה', 'שה', 'וב', 'ול', 'ומ', 'וכ', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];
        for (const pre of prefixes) {
          if (stem.startsWith(pre) && stem.length > pre.length + 2) {
            tempPrefix = pre;
            stem = stem.slice(pre.length);
            break;
          }
        }
      }

      // Infinitive pattern
      if (tempPrefix === 'ל' && stem.length >= 4) {
        if (stem.endsWith('ות')) {
          computedRoot = stem.slice(0, -2) + 'ה';
        } else if (stem[stem.length - 2] === 'ו') {
          computedRoot = stem.slice(0, -2) + stem.slice(-1);
        }
      }

      // Strip suffixes and extract
      if (!computedRoot) {
        const suffixes = ['ות', 'ים', 'ין', 'ה', 'ת', 'ן', 'נו', 'כם', 'הם', 'הן'];
        for (const suf of suffixes) {
          if (stem.endsWith(suf) && stem.length > suf.length + 1) {
            stem = stem.slice(0, -suf.length);
            break;
          }
        }

        if (stem.length === 4 && stem[2] === 'י') {
          computedRoot = stem[0] + stem[1] + stem[3]; // Action noun
        } else if (stem.length === 4 && stem[1] === 'ו') {
          computedRoot = stem[0] + stem[2] + stem[3]; // Hollow verb
        } else if (stem.length === 4) {
          computedRoot = stem.slice(0, 3);
        } else if (stem.length === 3) {
          computedRoot = restoreFinals(stem);
        } else if (stem.length === 2) {
          computedRoot = stem + 'ה'; // LAMED-HE
        }
      }
    }
  }

  // First try exact word lookup
  const exactResult = await lookupWord(word);
  const hasExact = !!(exactResult.sefaria || exactResult.rootMeaningsPro ||
                      exactResult.etymologyBDB || exactResult.etymologyJastrow || exactResult.wiktionary);

  // If found, return with the computed root (not null!)
  if (hasExact) {
    return {
      ...exactResult,
      hasEtymology: true,
      lookupWord: word,
      extractedRoot: computedRoot !== word ? computedRoot : null, // Only set if different from word
      usedRootFallback: false
    };
  }

  // PRO SCHOLAR V12: Smart root extraction - extract 3-letter root and try again
  let extractedRoot = null;
  let alternativeRoots = []; // Store alternative hypotheses
  try {
    // Lazy import to avoid circular dependencies
    const { extractRootsWithDirectValidation } = await import('./rootExtraction');
    const rootResult = extractRootsWithDirectValidation(word);

    // extractRootsWithDirectValidation returns {hypotheses, bestMatch, allMatches, ...}
    if (rootResult?.bestMatch?.root) {
      extractedRoot = rootResult.bestMatch.root;
    } else if (rootResult?.hypotheses?.length > 0) {
      extractedRoot = rootResult.hypotheses[0].root;
    } else if (rootResult?.allMatches?.length > 0) {
      extractedRoot = rootResult.allMatches[0].root;
    }

    // PRO SCHOLAR V12: Collect alternative root hypotheses (top 3)
    const allHypotheses = rootResult?.hypotheses || rootResult?.allMatches || [];
    alternativeRoots = allHypotheses
      .slice(0, 3)
      .map(h => ({ root: h.root, confidence: h.confidence, note: h.note }))
      .filter(h => h.root && h.root !== extractedRoot);
  } catch {
    // Root extraction failed - will use fallback below
  }

  // PRO SCHOLAR V12: Enhanced fallback root extraction
  // Handles common patterns without depending on rootExtraction module
  if (!extractedRoot) {
    let stem = word;
    let strippedPrefix = null;

    // COMMON WORDS: Skip extraction for known complete words
    const commonWords = ['שבת', 'תורה', 'משנה', 'גמרא', 'ברכה', 'תפלה', 'מצוה', 'עולם', 'ישראל', 'אדם'];
    if (commonWords.includes(word)) {
      extractedRoot = word;
    } else {
      // PRO SCHOLAR V12: Smart prefix detection
      // Don't strip single-letter prefixes that could be part of 3-letter roots
      // First check if word WITHOUT prefix stripping yields a valid pattern

      // Check for patterns that suggest the first letter is part of the root:
      // 1. Hollow verb participle: XוXX (שומר, קונה, etc.) - ו at position 1
      // 2. Regular verb with suffix: 4+ letters with suffix
      let skipPrefixStrip = false;

      // Check if this looks like a hollow verb (X-ו-X-X + optional suffix)
      if (word.length >= 4) {
        // Strip suffix first to check pattern
        let tempStem = word;
        const suffixes = ['ים', 'ות', 'ין'];
        for (const suf of suffixes) {
          if (tempStem.endsWith(suf)) {
            tempStem = tempStem.slice(0, -suf.length);
            break;
          }
        }
        // If after stripping suffix we have 4-letter stem with ו at position 1,
        // this is likely a hollow verb participle - don't strip the first letter
        if (tempStem.length === 4 && tempStem[1] === 'ו') {
          skipPrefixStrip = true;
        }
        // If after stripping suffix we have 3-letter stem, don't strip prefix
        // (the first letter is likely part of the root)
        if (tempStem.length === 3 && !['ה', 'ו', 'ב', 'כ', 'ל'].includes(tempStem[0])) {
          skipPrefixStrip = true;
        }
      }

      // Strip common prefixes (ב, ה, ו, ל, מ, כ, ש and combinations)
      // But only if we didn't detect a pattern that suggests prefix is part of root
      if (!skipPrefixStrip) {
        const prefixes = ['וה', 'בה', 'לה', 'מה', 'שה', 'וב', 'ול', 'ומ', 'וכ', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];
        for (const pre of prefixes) {
          if (stem.startsWith(pre) && stem.length > pre.length + 2) {
            strippedPrefix = pre;
            stem = stem.slice(pre.length);
            break;
          }
        }
      }

      // INFINITIVE PATTERN: לכתוב, לראות, לעשות → כתב, ראה, עשה
      if (strippedPrefix === 'ל' && stem.length >= 4) {
        // Check for infinitive ending in ות (לראות → ראה) - LAMED-HE verbs
        if (stem.endsWith('ות')) {
          extractedRoot = stem.slice(0, -2) + 'ה';
        }
        // Check for infinitive with ו before last letter (לכתוב → כתב, לשמור → שמר)
        else if (stem.length >= 4 && stem[stem.length - 2] === 'ו') {
          extractedRoot = stem.slice(0, -2) + stem.slice(-1);
        }
      }

      // If not infinitive, continue with suffix stripping
      if (!extractedRoot) {
        // Strip common suffixes
        const suffixes = ['ות', 'ים', 'ין', 'ה', 'ת', 'ן', 'נו', 'כם', 'הם', 'הן'];
        for (const suf of suffixes) {
          if (stem.endsWith(suf) && stem.length > suf.length + 1) {
            stem = stem.slice(0, -suf.length);
            break;
          }
        }

        // Extract root based on stem length
        // 4-letter stem: action noun pattern (R1-R2-י-R3) like יציא → יצא
        if (stem.length === 4 && stem[2] === 'י') {
          extractedRoot = stem[0] + stem[1] + stem[3];
        }
        // 4-letter stem with ו in position 2: hollow verb (שומר → שמר)
        else if (stem.length === 4 && stem[1] === 'ו') {
          extractedRoot = stem[0] + stem[2] + stem[3];
          alternativeRoots.push({ root: stem.slice(0, 3), confidence: 60, note: 'first-3' });
        }
        // 4-letter stem: try first 3 letters
        else if (stem.length === 4) {
          extractedRoot = stem.slice(0, 3);
          alternativeRoots.push({ root: stem.slice(1), confidence: 50, note: 'last-3' });
        }
        // 3-letter stem: direct root (normalize final letters כ→ך, מ→ם, etc.)
        else if (stem.length === 3) {
          extractedRoot = restoreFinals(stem);
        }
        // 2-letter stem: LAMED-HE weak verb (פנ → פנה, בנ → בנה)
        else if (stem.length === 2) {
          extractedRoot = stem + 'ה';
          alternativeRoots.push({ root: stem + 'א', confidence: 60, note: 'LAMED-ALEPH' });
          alternativeRoots.push({ root: stem + 'י', confidence: 50, note: 'LAMED-YOD' });
        }
      }
    }
  }

  // If we found a root different from the word, try looking it up
  if (extractedRoot && extractedRoot !== word) {
    const rootResult = await lookupWord(extractedRoot);
    const hasRoot = !!(rootResult.sefaria || rootResult.rootMeaningsPro ||
                       rootResult.etymologyBDB || rootResult.etymologyJastrow || rootResult.wiktionary);

    if (hasRoot) {
      return {
        ...rootResult,
        hasEtymology: true,
        lookupWord: word,
        extractedRoot: extractedRoot,
        alternativeRoots: alternativeRoots,
        usedRootFallback: true
      };
    }

    // PRO SCHOLAR V12: Try alternative roots in parallel if primary failed
    if (alternativeRoots.length > 0) {
      const altResults = await Promise.all(
        alternativeRoots.map(async (alt) => {
          const result = await lookupWord(alt.root);
          const found = !!(result.sefaria || result.rootMeaningsPro ||
                          result.etymologyBDB || result.etymologyJastrow || result.wiktionary);
          return { ...alt, result, found };
        })
      );

      // Find first alternative that has data
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
    extractedRoot: extractedRoot,
    alternativeRoots: alternativeRoots // Include even if no match found
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
 * PRO SCHOLAR V15: Preload academic sources (call for Pro Scholar mode)
 * Streamlined to only include FREE public domain sources
 * @returns {Promise<void>}
 */
export async function preloadAcademicSources() {
  log.debug('Preloading PRO SCHOLAR V15 academic sources...');
  await Promise.all([
    loadDictionary('geseniusLexicon').catch(() => null),  // Gesenius - 6,979 entries (public domain)
    loadDictionary('calAramaic').catch(() => null)        // CAL - 12,243 Aramaic entries (FREE!)
  ]);
  log.debug('PRO SCHOLAR V15 academic sources preloaded');
}

/**
 * PRO SCHOLAR V12: Preload major etymology databases
 * These contain ~40,000+ combined etymology entries
 * @returns {Promise<void>}
 */
export async function preloadEtymologyDatabases() {
  log.debug('Preloading PRO SCHOLAR V12 etymology databases...');
  await Promise.all([
    loadDictionary('sefariaCache').catch(() => null),      // 2,493 entries
    loadDictionary('rootMeaningsPro').catch(() => null),   // 18,898 entries
    loadDictionary('etymologyBDB').catch(() => null),      // 2,591 entries
    loadDictionary('etymologyJastrow').catch(() => null),  // 16,794 entries
    loadDictionary('wiktionaryCache').catch(() => null)    // 108+ entries
  ]);
  log.debug('PRO SCHOLAR V12 etymology databases preloaded');
}

// =============================================================================
// PRO SCHOLAR V20: TEXT ATTESTATIONS FROM SEFARIA CACHE
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

  for (const lexiconEntry of entry.entries) {
    const refs = lexiconEntry.refs || [];
    for (const ref of refs) {
      // Skip dictionary cross-references
      if (isDictionaryRef(ref)) continue;

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

  // If no real text refs found, return null
  if (allRefs.size === 0) {
    return null;
  }

  return {
    word: entry.word || word,
    totalRefs: allRefs.size,
    categories,
    allRefs: Array.from(allRefs),
    source: 'Sefaria Lexicon Cache'
  };
}

/**
 * Get text attestations with async loading (ensures cache is loaded)
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Object|null>} Text attestations
 */
export async function getTextAttestationsAsync(word) {
  // Ensure Sefaria cache is loaded
  await loadDictionary('sefariaCache');
  return getTextAttestations(word);
}

// =============================================================================
// PRO SCHOLAR V20: ROOT MEANING LOOKUP (SHORESH)
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
    .split(/[;,\(]/)[0]
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

  // Set primary definition (prefer tier 1)
  if (results.definitions.length > 0) {
    const tier1 = results.definitions.find(d => d.tier === 1);
    results.primaryDefinition = tier1?.shortDef || results.definitions[0].shortDef;
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
    loadDictionary('strongs').catch(() => null)
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
    // PRO SCHOLAR V15: Academic sources (streamlined)
    geseniusLexicon: cache.geseniusLexicon !== null,
    // Scholarly data
    rootMeanings: cache.rootMeanings !== null,
    semanticFields: cache.semanticFields !== null,
    rabbiBiographies: cache.rabbiBiographies !== null,
    realia: cache.realia !== null,
    // PRO SCHOLAR V12: Etymology databases
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

// Deduplication flags for initializePreload
let preloadPromise = null;
let preloadComplete = false;

/**
 * PRO SCHOLAR V13: Wait for core dictionary preload to complete
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

  // Preload hasn't started or previous attempt failed - start/retry
  try {
    await initializePreload();
  } catch {
    // Initialization failed — return current state
  }
  return preloadComplete;
}

/**
 * PRO SCHOLAR V13: Check if core dictionaries are loaded (sync check)
 * @returns {boolean} True if BDB, Jastrow, and Strong's are loaded
 */
export function isCoreDictionariesLoaded() {
  return preloadComplete && cache.bdb !== null && cache.jastrow !== null;
}

/**
 * PRO SCHOLAR V8: Full initialization with common word preloading
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

      // PRIORITY 2.6: PRO SCHOLAR V12 - Preload major etymology databases
      // These contain ~40,000+ combined etymology entries from scholarly sources
      preloadEtymologyDatabases().then(() => {
        log.debug('[Preload] Etymology databases loaded (Sefaria, BDB, Jastrow, Wiktionary)');
      }).catch(() => {
        log.debug('[Preload] Etymology databases preload skipped');
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

  // PRO SCHOLAR V16: Academic Hebrew lexicons
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

  // PRO SCHOLAR V12: Etymology Databases (lazy-loaded)
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

  // PRO SCHOLAR V20: Text Attestations (where word appears in texts)
  getTextAttestations,
  getTextAttestationsAsync,

  // PRO SCHOLAR V20: Root Meaning Lookup (shoresh translation)
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

  // PRO SCHOLAR V8: Unified initialization
  initializeDictionaries,
  initializePreload,
  shouldPreload,
  COMMON_HEBREW_WORDS,
  COMMON_ARAMAIC_WORDS,

  // PRO SCHOLAR V13: Preload synchronization
  waitForPreload,
  isCoreDictionariesLoaded
};

export default dictionaryLoader;
