/**
 * Hebrew/Aramaic Lexicons - Lazy-loaded from JSON
 *
 * BUNDLE OPTIMIZATION: The large dictionary data has been moved to
 * public/data/*.json files and is now lazy-loaded via dictionaryLoader.js.
 *
 * This file provides the same API as before but uses cached data from
 * the lazy loader. The dictionaries are preloaded on app initialization.
 *
 * PRO SCHOLAR V15: Streamlined sources (removed copyrighted Klein)
 * Sources:
 * - BDB (Biblical Hebrew): bdbComplete.json (8,050 entries)
 * - Jastrow (Talmudic): jastrowComplete.json (25,231 entries)
 * - Strong's: strongsComplete.json (8,674 entries)
 * - CAL (Aramaic): cal_aramaic.json (12,243 entries - FREE!)
 * - Gesenius: gesenius_lexicon.json (6,979 entries - public domain)
 */

import {
  getBDBLexiconData,
  getBDBAramaicData,
  getJastrowLexiconData,
  getStrongLexiconData,
  preloadLexicons
} from '../services/dictionaries/dictionaryLoader';
import { stripAllDiacritics, normalizeFinals } from '../utils/hebrewUtils';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED LEXICON GETTERS
// These return undefined for individual keys until data has been preloaded.
// =============================================================================

export const BDB_LEXICON = createLazyProxy(getBDBLexiconData);
export const BDB_ARAMAIC = createLazyProxy(getBDBAramaicData);
export const JASTROW_LEXICON = createLazyProxy(getJastrowLexiconData);
export const STRONG_LEXICON = createLazyProxy(getStrongLexiconData);

// =============================================================================
// LOOKUP FUNCTIONS (use lazy-loaded data)
// =============================================================================

/**
 * Clean word by removing nikud/cantillation and normalizing finals
 */
const cleanWord = (word) => {
  if (!word) return '';
  return normalizeFinals(stripAllDiacritics(word).trim());
};

/**
 * Lookup word in all lexicons
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} Results from all lexicons
 */
export const lookupAllLexicons = (word) => {
  if (!word) return null;

  const cleaned = stripAllDiacritics(word).trim();
  const normalized = cleanWord(word);

  const result = {};
  const bdbData = getBDBLexiconData();
  const bdbAramaicData = getBDBAramaicData();
  const jastrowData = getJastrowLexiconData();
  const strongData = getStrongLexiconData();

  if (bdbData?.[cleaned] || bdbData?.[normalized]) {
    result.bdb = bdbData[cleaned] || bdbData[normalized];
  }
  if (bdbAramaicData?.[cleaned] || bdbAramaicData?.[normalized]) {
    result.bdbAramaic = bdbAramaicData[cleaned] || bdbAramaicData[normalized];
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
  const cleaned = stripAllDiacritics(word).trim();
  return getBDBLexiconData()?.[cleaned] || null;
};

/**
 * Lookup in Jastrow lexicon
 */
export const lookupJastrowLocal = (word) => {
  if (!word) return null;
  const cleaned = stripAllDiacritics(word).trim();
  return getJastrowLexiconData()?.[cleaned] || null;
};

/**
 * Lookup in Strong's lexicon
 */
export const lookupStrong = (word) => {
  if (!word) return null;
  const cleaned = stripAllDiacritics(word).trim();
  return getStrongLexiconData()?.[cleaned] || null;
};

/**
 * Get lexicon statistics
 * PRO SCHOLAR V15: Updated to reflect streamlined sources
 */
export const getLexiconStats = () => ({
  bdb: 8050,
  jastrow: 25231,
  strong: 8674,
  cal: 12243,
  gesenius: 6979,
  total: 61177,
  note: 'PRO SCHOLAR V15 - Streamlined FREE sources only',
  lazyLoaded: true
});

/**
 * Preload all lexicons (call on app init for synchronous lookups)
 */
export const preloadAllLexicons = preloadLexicons;

const hebrewLexicons = {
  BDB_LEXICON,
  BDB_ARAMAIC,
  JASTROW_LEXICON,
  STRONG_LEXICON,
  lookupAllLexicons,
  lookupBDB,
  lookupJastrowLocal,
  lookupStrong,
  getLexiconStats,
  preloadAllLexicons
};

export default hebrewLexicons;
