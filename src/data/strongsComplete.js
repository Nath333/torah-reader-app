/**
 * Strong's Hebrew Dictionary (Thin Wrapper)
 *
 * This module provides the same API as before but loads data dynamically
 * from public/data/strongsComplete.json instead of bundling it.
 *
 * Source: https://github.com/openscriptures/strongs
 * Data is loaded on first access and cached in memory.
 * This reduces bundle size by ~8.4MB.
 */

import {
  getStrongs,
  lookupStrongsByWord as dynamicLookupByWord,
  lookupStrongsByNumber as dynamicLookupByNumber,
  lookupStrongsSync,
  isDictionaryLoaded
} from '../services/dictionaryLoader';

// =============================================================================
// DEPRECATED: Direct data access
// =============================================================================

// Properties checked by React Fast Refresh - don't warn for these
const REACT_INTERNAL_PROPS = new Set([
  '$$typeof', 'prototype', 'render', 'displayName', 'name', 'length',
  'propTypes', 'defaultProps', 'contextTypes', 'childContextTypes',
  'getDerivedStateFromProps', 'getDerivedStateFromError', 'type',
  Symbol.toStringTag, Symbol.iterator, 'then', 'constructor'
]);

/** @deprecated Use lookupStrongsByWord() instead */
export const STRONGS_BY_WORD = new Proxy({}, {
  get(target, prop) {
    // Ignore React Fast Refresh internal property checks
    if (REACT_INTERNAL_PROPS.has(prop) || typeof prop === 'symbol') {
      return undefined;
    }

    const cached = lookupStrongsSync(prop);
    if (cached) return cached;

    if (!isDictionaryLoaded('strongs')) {
      console.warn("[Strong's] Direct access to STRONGS_BY_WORD is deprecated. Use lookupStrongsByWord() instead.");
      getStrongs();
    }
    return undefined;
  },
  has(target, prop) {
    return lookupStrongsSync(prop) !== null;
  },
  ownKeys() {
    console.warn("[Strong's] Enumerating STRONGS_BY_WORD is not supported with dynamic loading.");
    return [];
  }
});

/** @deprecated Use lookupStrongsByNumber() instead */
export const STRONGS_BY_NUMBER = new Proxy({}, {
  get(target, prop) {
    // Ignore React Fast Refresh internal property checks
    if (REACT_INTERNAL_PROPS.has(prop) || typeof prop === 'symbol') {
      return undefined;
    }
    console.warn("[Strong's] Direct access to STRONGS_BY_NUMBER is deprecated. Use lookupStrongsByNumber() instead.");
    return undefined;
  }
});

// =============================================================================
// ASYNC LOOKUP FUNCTIONS (Recommended)
// =============================================================================

/**
 * Look up a Hebrew word in Strong's
 * @param {string} word - Hebrew word (without nikud)
 * @returns {Promise<Object|null>} Strong's entry or null
 */
export const lookupStrongsByWord = async (word) => {
  if (!word) return null;
  return dynamicLookupByWord(word);
};

/**
 * Look up by Strong's number
 * @param {string} strongs - Strong's number (e.g., "H1234")
 * @returns {Promise<Object|null>} Strong's entry or null
 */
export const lookupStrongsByNumber = async (strongs) => {
  if (!strongs) return null;
  return dynamicLookupByNumber(strongs);
};

/**
 * Search Strong's by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching entries
 */
export const searchStrongs = async (query) => {
  if (!query || query.length < 2) return [];

  const data = await getStrongs();
  if (!data?.byWord) return [];

  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [word, entry] of Object.entries(data.byWord)) {
    if (word.includes(query) ||
        entry.definition?.toLowerCase().includes(lowerQuery) ||
        entry.lemma?.includes(query) ||
        entry.strongs?.includes(query.toUpperCase())) {
      results.push({ word, ...entry });
      if (results.length >= 50) break;
    }
  }

  return results;
};

/**
 * Get Strong's statistics
 * @returns {Promise<Object>} Stats object
 */
export const getStrongsStats = async () => {
  const data = await getStrongs();
  return {
    totalWords: data?.byWord ? Object.keys(data.byWord).length : 0,
    totalNumbers: data?.byNumber ? Object.keys(data.byNumber).length : 0,
    source: "Strong's Hebrew Dictionary"
  };
};

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Synchronous lookup - only returns data if already cached
 * @param {string} word - Hebrew word
 * @returns {Object|null} Entry or null if not cached
 */
export { lookupStrongsSync };

/**
 * Check if Strong's data is loaded
 * @returns {boolean}
 */
export const isStrongsLoaded = () => isDictionaryLoaded('strongs');

/**
 * Preload Strong's data
 * @returns {Promise<void>}
 */
export const preloadStrongs = () => getStrongs();

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default STRONGS_BY_NUMBER;
