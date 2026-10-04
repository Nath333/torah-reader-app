/**
 * Dynamic Dictionary Loader Service — FAÇADE (split 04/10/2026)
 *
 * Le noyau (état, cache, loadDictionary, santé) vit dans loaderCore.js ;
 * les attestations de textes dans loaderAttestations.js. Cette façade garde
 * l'intégralité de la surface publique historique : aucun importeur modifié.
 */

import { createLogger } from '../../utils/debug';
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../../utils/hebrewUtils';
import { isTorahBook, isTalmudBook, isMishnahBook } from '../sefariaApi';

import {
  cache,
  loadDictionary,
  loadingState,
  extractRootHelper,
  extractRootFallback
} from './loaderCore';

export { getDictionaryHealth, getUnhealthyDictionaries, getDictionaryHealthSummary } from './loaderCore';

import { getTextAttestations, getTextAttestationsAsync } from './loaderAttestations';
export { getTextAttestations, getTextAttestationsAsync } from './loaderAttestations';

const log = createLogger('DictionaryLoader');

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

    const [sefaria, rootPro, jastrowEty, wiktionary] = await Promise.all([
      getSefariaCache().then(d => accessData(d, w)).catch(() => null),
      getRootMeaningsPro().then(d => accessData(d, w)).catch(() => null),
      getEtymologyJastrow().then(d => accessData(d, w)).catch(() => null),
      getWiktionaryCache().then(d => accessData(d, w)).catch(() => null)
    ]);
    return { sefaria, rootMeaningsPro: rootPro, etymologyJastrow: jastrowEty, wiktionary };
  };

  // Check if result has any data
  const hasData = (result) => !!(result.sefaria || result.rootMeaningsPro ||
    result.etymologyJastrow || result.wiktionary);

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
    loadDictionary('etymologyJastrow').catch(() => null),  // 16,794 entries
    loadDictionary('wiktionaryCache').catch(() => null)    // 108+ entries
  ]);
  log.debug(' etymology databases preloaded');
}

// =============================================================================

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
  getEtymologyJastrow,
  getWiktionaryCache,
  getSefariaCacheData,
  getRootMeaningsProData,
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
  preloadForBook,
  classifyBookCategory,
  shouldPreload,
  // COMMON_HEBREW_WORDS,
  // COMMON_ARAMAIC_WORDS,

// Preload synchronization
  waitForPreload,
  isCoreDictionariesLoaded
};

export default dictionaryLoader;

