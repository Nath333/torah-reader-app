/**
 * Brown-Driver-Briggs Hebrew Lexicon (Thin Wrapper)
 *
 * This module provides the same API as before but loads data dynamically
 * from public/data/bdbComplete.json instead of bundling it.
 *
 * Data is loaded on first access and cached in memory.
 * This reduces bundle size by ~9.5MB.
 */

import {
  getBDB,
  lookupBDBByWord as dynamicLookupByWord,
  lookupBDBByStrongs as dynamicLookupByStrongs,
  lookupBDBSync as syncLookup,
  isDictionaryLoaded
} from '../services/dictionaries/dictionaryLoader';
import { createDeprecatedLookupProxy } from './proxyHelpers';

// =============================================================================
// DEPRECATED: Direct data access
// Kept for backward compatibility. Prefer the async lookup functions below.
// =============================================================================

/** @deprecated Use lookupBDBByWord() instead */
export const BDB_BY_WORD = createDeprecatedLookupProxy({
  syncLookup,
  triggerLoad: getBDB,
  isLoaded: () => isDictionaryLoaded('bdb'),
  name: 'BDB',
  apiName: 'BDB_BY_WORD',
  preferredFn: 'lookupBDBByWord()'
});

/** @deprecated Use lookupBDBByStrongs() instead */
export const BDB_BY_STRONGS = createDeprecatedLookupProxy({
  name: 'BDB',
  apiName: 'BDB_BY_STRONGS',
  preferredFn: 'lookupBDBByStrongs()'
});

// =============================================================================
// ASYNC LOOKUP FUNCTIONS (Recommended)
// =============================================================================

/**
 * Look up a Hebrew word in BDB
 * @param {string} word - Hebrew word (without nikud)
 * @returns {Promise<Object|null>} BDB entry or null
 */
export const lookupBDBByWord = async (word) => {
  if (!word) return null;
  return dynamicLookupByWord(word);
};

/**
 * Look up by Strong's number
 * @param {string} strongs - Strong's number (e.g., "H1234")
 * @returns {Promise<Object|null>} BDB entry or null
 */
export const lookupBDBByStrongs = async (strongs) => {
  if (!strongs) return null;
  return dynamicLookupByStrongs(strongs);
};

/**
 * Search BDB by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching entries
 */
export const searchBDB = async (query) => {
  if (!query || query.length < 2) return [];

  const data = await getBDB();
  if (!data?.byWord) return [];

  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [word, entry] of Object.entries(data.byWord)) {
    if (word.includes(query) ||
        entry.definition?.toLowerCase().includes(lowerQuery) ||
        entry.lemma?.includes(query)) {
      results.push({ word, ...entry });
      if (results.length >= 50) break;
    }
  }

  return results;
};

/**
 * Get BDB statistics
 * @returns {Promise<Object>} Stats object
 */
export const getBDBStats = async () => {
  const data = await getBDB();
  return {
    totalWords: data?.byWord ? Object.keys(data.byWord).length : 0,
    totalStrongs: data?.byStrongs ? Object.keys(data.byStrongs).length : 0,
    source: 'Brown-Driver-Briggs Hebrew Lexicon'
  };
};

// =============================================================================
// SYNC FUNCTIONS (Only work if data is already loaded)
// =============================================================================

/**
 * Synchronous lookup - only returns data if already cached
 * @param {string} word - Hebrew word
 * @returns {Object|null} BDB entry or null if not cached
 */
export const lookupBDBSync = syncLookup;

/**
 * Check if BDB data is loaded
 * @returns {boolean}
 */
export const isBDBLoaded = () => isDictionaryLoaded('bdb');

/**
 * Preload BDB data
 * @returns {Promise<void>}
 */
export const preloadBDB = () => getBDB();

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default BDB_BY_WORD;
