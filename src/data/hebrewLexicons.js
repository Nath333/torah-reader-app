/**
 * Hebrew/Aramaic Lexicons - Lazy-loaded from JSON
 *
 * BUNDLE OPTIMIZATION: The large dictionary data (~468KB) has been moved to
 * public/data/*.json files and is now lazy-loaded via dictionaryLoader.js.
 *
 * This file provides the same API as before but uses cached data from
 * the lazy loader. The dictionaries are preloaded on app initialization.
 *
 * Sources:
 * - BDB (Biblical Hebrew): 534 entries -> bdb_lexicon.json
 * - BDB Aramaic: 91 entries -> bdb_aramaic.json
 * - Klein (Etymological): 644 entries -> klein_lexicon.json
 * - Jastrow (Talmudic): 650 entries -> jastrow_lexicon.json
 * - Strong's: 469 entries -> strong_lexicon.json
 *
 * Total: 2388 entries (loaded on-demand, not bundled)
 */

import {
  getBDBLexiconData,
  getBDBAramaicData,
  getKleinLexiconData,
  getJastrowLexiconData,
  getStrongLexiconData,
  preloadLexicons
} from '../services/dictionaryLoader';

// =============================================================================
// LAZY-LOADED LEXICON GETTERS
// These return null if data hasn't been preloaded yet
// =============================================================================

/** @returns {Object|null} BDB Lexicon data */
export const BDB_LEXICON = new Proxy({}, {
  get: (_, prop) => getBDBLexiconData()?.[prop]
});

/** @returns {Object|null} BDB Aramaic data */
export const BDB_ARAMAIC = new Proxy({}, {
  get: (_, prop) => getBDBAramaicData()?.[prop]
});

/** @returns {Object|null} Klein Lexicon data */
export const KLEIN_LEXICON = new Proxy({}, {
  get: (_, prop) => getKleinLexiconData()?.[prop]
});

/** @returns {Object|null} Jastrow Lexicon data */
export const JASTROW_LEXICON = new Proxy({}, {
  get: (_, prop) => getJastrowLexiconData()?.[prop]
});

/** @returns {Object|null} Strong's Lexicon data */
export const STRONG_LEXICON = new Proxy({}, {
  get: (_, prop) => getStrongLexiconData()?.[prop]
});

// =============================================================================
// LOOKUP FUNCTIONS (use lazy-loaded data)
// =============================================================================

/**
 * Clean word by removing nikud/cantillation and normalizing finals
 */
const cleanWord = (word) => {
  if (!word) return '';
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  return cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
};

/**
 * Lookup word in all lexicons
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} Results from all lexicons
 */
export const lookupAllLexicons = (word) => {
  if (!word) return null;

  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  const normalized = cleanWord(cleaned);

  const result = {};
  const bdbData = getBDBLexiconData();
  const bdbAramaicData = getBDBAramaicData();
  const kleinData = getKleinLexiconData();
  const jastrowData = getJastrowLexiconData();
  const strongData = getStrongLexiconData();

  if (bdbData?.[cleaned] || bdbData?.[normalized]) {
    result.bdb = bdbData[cleaned] || bdbData[normalized];
  }
  if (bdbAramaicData?.[cleaned] || bdbAramaicData?.[normalized]) {
    result.bdbAramaic = bdbAramaicData[cleaned] || bdbAramaicData[normalized];
  }
  if (kleinData?.[cleaned] || kleinData?.[normalized]) {
    result.klein = kleinData[cleaned] || kleinData[normalized];
  }
  if (jastrowData?.[cleaned] || jastrowData?.[normalized]) {
    result.jastrow = jastrowData[cleaned] || jastrowData[normalized];
  }
  if (strongData?.[cleaned] || strongData?.[normalized]) {
    result.strong = strongData[cleaned] || strongData[normalized];
  }

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Lookup in BDB lexicon
 */
export const lookupBDB = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  return getBDBLexiconData()?.[cleaned] || null;
};

/**
 * Lookup in Klein lexicon
 */
export const lookupKlein = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  return getKleinLexiconData()?.[cleaned] || null;
};

/**
 * Lookup in Jastrow lexicon
 */
export const lookupJastrowLocal = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  return getJastrowLexiconData()?.[cleaned] || null;
};

/**
 * Lookup in Strong's lexicon
 */
export const lookupStrong = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '').trim();
  return getStrongLexiconData()?.[cleaned] || null;
};

/**
 * Get lexicon statistics
 */
export const getLexiconStats = () => ({
  bdb: 534,
  bdbAramaic: 91,
  klein: 644,
  jastrow: 650,
  strong: 469,
  total: 2388,
  downloadDate: '2026-03-17',
  lazyLoaded: true
});

/**
 * Preload all lexicons (call on app init for synchronous lookups)
 */
export const preloadAllLexicons = preloadLexicons;

const hebrewLexicons = {
  BDB_LEXICON,
  BDB_ARAMAIC,
  KLEIN_LEXICON,
  JASTROW_LEXICON,
  STRONG_LEXICON,
  lookupAllLexicons,
  lookupBDB,
  lookupKlein,
  lookupJastrowLocal,
  lookupStrong,
  getLexiconStats,
  preloadAllLexicons
};

export default hebrewLexicons;
