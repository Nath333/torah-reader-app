/**
 * Strong's Hebrew Concordance - Thin Wrapper
 *
 * BUNDLE OPTIMIZATION: Data moved to public/data/strongsComplete.json
 * This module provides the same API but loads dynamically via dictionaryLoader.
 */

import {
  lookupStrongsByWord as dynamicLookupByWord,
  lookupStrongsByNumber as dynamicLookupByNumber,
  lookupStrongsSync as syncLookup,
  getStrongs,
  isDictionaryLoaded
} from '../services/dictionaries/dictionaryLoader';
import { createDeprecatedLookupProxy } from './proxyHelpers';

/** @deprecated Use lookupStrongsByWord() instead */
export const STRONGS_BY_WORD = createDeprecatedLookupProxy({
  syncLookup,
  triggerLoad: getStrongs,
  isLoaded: () => isDictionaryLoaded('strongs'),
  name: "Strong's",
  apiName: 'STRONGS_BY_WORD',
  preferredFn: 'lookupStrongsByWord()'
});

/** @deprecated Use lookupStrongsByNumber() instead */
export const STRONGS_BY_NUMBER = createDeprecatedLookupProxy({
  name: "Strong's",
  apiName: 'STRONGS_BY_NUMBER',
  preferredFn: 'lookupStrongsByNumber()'
});

/**
 * Look up a word in Strong's concordance
 * @param {string} word - Hebrew word
 * @returns {Promise<Object|null>} Strong's entry
 */
export async function lookupStrongsByWord(word) {
  return dynamicLookupByWord(word);
}

/**
 * Look up by Strong's number
 * @param {string} number - Strong's number (e.g., "H1234")
 * @returns {Promise<Object|null>} Strong's entry
 */
export async function lookupStrongsByNumber(number) {
  return dynamicLookupByNumber(number);
}

/**
 * Search Strong's dictionary
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching entries
 */
export async function searchStrongs(query) {
  const data = await getStrongs();
  if (!data?.byWord) return [];
  const entries = Object.entries(data.byWord);
  return entries
    .filter(([word]) => word.includes(query))
    .slice(0, 50)
    .map(([word, entry]) => ({ word, ...entry }));
}

/**
 * Get Strong's statistics
 * @returns {Object} Entry counts
 */
export async function getStrongsStats() {
  const data = await getStrongs();
  return {
    totalWords: Object.keys(data?.byWord || {}).length,
    totalNumbers: Object.keys(data?.byNumber || {}).length,
  };
}

/**
 * Check if Strong's is loaded
 * @returns {boolean}
 */
export function isStrongsLoaded() {
  return isDictionaryLoaded('strongs');
}

/**
 * Preload Strong's dictionary
 * @returns {Promise<void>}
 */
export async function preloadStrongs() {
  await getStrongs();
}

/**
 * Synchronous lookup (returns cached data only)
 * @param {string} word
 * @returns {Object|null}
 */
export function lookupStrongsSync(word) {
  return syncLookup(word);
}

export default {
  lookupStrongsByWord,
  lookupStrongsByNumber,
  lookupStrongsSync,
  searchStrongs,
  getStrongsStats,
  isStrongsLoaded,
  preloadStrongs,
};
