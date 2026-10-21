// =============================================================================
// Lookups et getters de dictionnaires — BDB, Jastrow, Strong's, lexiques
// complets, sources académiques, données savantes, accès brut, lookup unifié.
// Extrait de dictionaryLoader.js (recette docs/DECOUPE-MONOLITHES.md).
// L'état (cache, loadDictionary) vit dans loaderCore.js.
// =============================================================================

import { normalizeFinals, stripAllDiacritics } from '../../utils/hebrewUtils';
import { cache, loadDictionary } from './loaderCore';

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
