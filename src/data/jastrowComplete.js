/**
 * Jastrow Dictionary (Thin Wrapper)
 *
 * This module provides the same API as before but loads data dynamically
 * from public/data/jastrowComplete.json instead of bundling it.
 *
 * Source: Marcus Jastrow, "A Dictionary of the Targumim, the Talmud Babli and Yerushalmi" (1903)
 * Data is loaded on first access and cached in memory.
 * This reduces bundle size by ~11MB.
 */

import {
  getJastrow,
  lookupJastrowByWord,
  lookupJastrowSync,
  isDictionaryLoaded
} from '../services/dictionaryLoader';

// =============================================================================
// DEPRECATED: Direct data access
// =============================================================================

/** @deprecated Use lookupJastrow() instead */
export const JASTROW_COMPLETE = new Proxy({}, {
  get(target, prop) {
    const cached = lookupJastrowSync(prop);
    if (cached) return cached;

    if (!isDictionaryLoaded('jastrow')) {
      console.warn('[Jastrow] Direct access to JASTROW_COMPLETE is deprecated. Use lookupJastrow() instead.');
      getJastrow();
    }
    return undefined;
  },
  has(target, prop) {
    return lookupJastrowSync(prop) !== null;
  },
  ownKeys() {
    console.warn('[Jastrow] Enumerating JASTROW_COMPLETE is not supported with dynamic loading.');
    return [];
  }
});

// =============================================================================
// ASYNC LOOKUP FUNCTIONS (Recommended)
// =============================================================================

/**
 * Look up an Aramaic/Hebrew word in Jastrow
 * @param {string} word - Word to look up
 * @returns {Promise<Object|null>} Jastrow entry or null
 */
export const lookupJastrow = async (word) => {
  if (!word) return null;
  return lookupJastrowByWord(word);
};

/**
 * Search Jastrow by query string
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching entries
 */
export const searchJastrow = async (query) => {
  if (!query || query.length < 2) return [];

  const data = await getJastrow();
  if (!data) return [];

  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [word, entry] of Object.entries(data)) {
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
 * Get all Aramaic entries
 * @returns {Promise<Array>} Aramaic entries
 */
export const getAramaicEntries = async () => {
  const data = await getJastrow();
  if (!data) return [];

  return Object.entries(data)
    .filter(([, entry]) => entry.isAramaic)
    .map(([word, entry]) => ({ word, ...entry }));
};

/**
 * Get Jastrow statistics
 * @returns {Promise<Object>} Stats object
 */
export const getJastrowStats = async () => {
  const data = await getJastrow();
  if (!data) return { totalEntries: 0, aramaicEntries: 0, source: 'Jastrow Dictionary' };

  const entries = Object.values(data);
  return {
    totalEntries: entries.length,
    aramaicEntries: entries.filter(e => e.isAramaic).length,
    source: 'Jastrow Dictionary (1903)'
  };
};

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Synchronous lookup - only returns data if already cached
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Object|null} Entry or null if not cached
 */
export { lookupJastrowSync };

/**
 * Check if Jastrow data is loaded
 * @returns {boolean}
 */
export const isJastrowLoaded = () => isDictionaryLoaded('jastrow');

/**
 * Preload Jastrow data
 * @returns {Promise<void>}
 */
export const preloadJastrow = () => getJastrow();

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default JASTROW_COMPLETE;
