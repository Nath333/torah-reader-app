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

const log = createLogger('DictionaryLoader');

// =============================================================================
// CACHE & STATE
// =============================================================================

/** Cached dictionary data */
const cache = {
  bdb: null,
  jastrow: null,
  strongs: null
};

/** Loading promises to prevent duplicate fetches */
const loadingPromises = {
  bdb: null,
  jastrow: null,
  strongs: null
};

/** Loading state for UI feedback */
const loadingState = {
  bdb: false,
  jastrow: false,
  strongs: false
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
  log(`Loading ${name} dictionary...`);

  const fileName = {
    bdb: 'bdbComplete.json',
    jastrow: 'jastrowComplete.json',
    strongs: 'strongsComplete.json'
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
      log(`Loaded ${name}: ${Object.keys(data.byWord || data).length} entries`);
      return data;
    })
    .catch(error => {
      loadingState[name] = false;
      loadingPromises[name] = null;
      console.error(`[DictionaryLoader] Error loading ${name}:`, error);
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
 * Look up a word in BDB
 * @param {string} word - Hebrew word (without nikud)
 * @returns {Promise<Object|null>} BDB entry or null
 */
export async function lookupBDBByWord(word) {
  try {
    const data = await getBDB();
    return data?.byWord?.[word] || data?.[word] || null;
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
 * @param {string} word - Hebrew word
 * @returns {Object|null} BDB entry or null if not cached
 */
export function lookupBDBSync(word) {
  if (!cache.bdb) return null;
  return cache.bdb?.byWord?.[word] || cache.bdb?.[word] || null;
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
 * Look up a word in Jastrow
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Promise<Object|null>} Jastrow entry or null
 */
export async function lookupJastrowByWord(word) {
  try {
    const data = await getJastrow();
    return data?.[word] || null;
  } catch {
    return null;
  }
}

/**
 * Synchronous Jastrow lookup (returns cached data only)
 * @param {string} word - Aramaic/Hebrew word
 * @returns {Object|null} Jastrow entry or null if not cached
 */
export function lookupJastrowSync(word) {
  if (!cache.jastrow) return null;
  return cache.jastrow?.[word] || null;
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
// PRELOADING & UTILITIES
// =============================================================================

/**
 * Preload all dictionaries (call on app init for better UX)
 * @returns {Promise<void>}
 */
export async function preloadDictionaries() {
  log('Preloading all dictionaries...');
  await Promise.all([
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('strongs').catch(() => null)
  ]);
  log('All dictionaries preloaded');
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
 * @returns {{ bdb: boolean, jastrow: boolean, strongs: boolean }}
 */
export function getCacheStatus() {
  return {
    bdb: cache.bdb !== null,
    jastrow: cache.jastrow !== null,
    strongs: cache.strongs !== null
  };
}

/**
 * Clear dictionary cache (for memory management)
 * @param {'bdb' | 'jastrow' | 'strongs'} [name] - Optional specific dictionary
 */
export function clearCache(name) {
  if (name) {
    cache[name] = null;
    log(`Cleared ${name} cache`);
  } else {
    cache.bdb = null;
    cache.jastrow = null;
    cache.strongs = null;
    log('Cleared all dictionary caches');
  }
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

const dictionaryLoader = {
  // BDB
  getBDB,
  lookupBDBByWord,
  lookupBDBByStrongs,
  lookupBDBSync,

  // Jastrow
  getJastrow,
  lookupJastrowByWord,
  lookupJastrowSync,

  // Strong's
  getStrongs,
  lookupStrongsByWord,
  lookupStrongsByNumber,
  lookupStrongsSync,

  // Utilities
  preloadDictionaries,
  isDictionaryLoaded,
  isDictionaryLoading,
  getLoadingStatus,
  getCacheStatus,
  clearCache,
  lookupAllDictionaries,
  lookupAllSync
};

export default dictionaryLoader;
