/**
 * Dynamic Dictionary Loader Service — FAÇADE (splits 04/10 + 20/10/2026)
 *
 * Le noyau (état, cache, loadDictionary, santé) vit dans loaderCore.js ;
 * les attestations de textes dans loaderAttestations.js ; les lookups et
 * getters dans loaderLookups.js ; l'étymologie dans loaderEtymology.js ; le
 * shoresh dans loaderRootMeanings.js ; les préchargements dans loaderPreload.js.
 * Cette façade garde l'intégralité de la surface publique historique : aucun
 * importeur modifié.
 */

import { createLogger } from '../../utils/debug';
import { cache, loadingState } from './loaderCore';

export { getDictionaryHealth, getUnhealthyDictionaries, getDictionaryHealthSummary } from './loaderCore';

import { getTextAttestations, getTextAttestationsAsync } from './loaderAttestations';
export { getTextAttestations, getTextAttestationsAsync } from './loaderAttestations';

// Modules extraits (20/10) — ré-exportés tels quels pour la surface publique
import {
  getBDB, lookupBDBByWord, lookupBDBByStrongs, lookupBDBSync,
  getJastrow, lookupJastrowByWord, lookupJastrowSync,
  getStrongs, lookupStrongsByWord, lookupStrongsByNumber, lookupStrongsSync,
  getBDBLexicon, getBDBAramaic, getJastrowLexicon, getStrongLexicon,
  getCALAramaic, getJastrowAramaic,
  getBDBLexiconData, getBDBAramaicData, getJastrowLexiconData,
  getStrongLexiconData, getCALAramaicData, getJastrowAramaicData,
  getGeseniusLexicon, getGeseniusLexiconData, getKleinLexicon, getKleinLexiconData,
  getRootMeanings, getSemanticFields, getRabbiBiographies, getRealia,
  getRootMeaningsData, getSemanticFieldsData, getRabbiBiographiesData, getRealiaData,
  getBDBData, getJastrowData, getStrongsData,
  lookupAllDictionaries, lookupAllSync
} from './loaderLookups';
import {
  getSefariaCache, getRootMeaningsPro, getEtymologyJastrow, getWiktionaryCache,
  getSefariaCacheData, getRootMeaningsProData, getEtymologyJastrowData,
  getWiktionaryCacheData, lookupAllEtymology
} from './loaderEtymology';
import { getRootMeaning, getRootMeaningFromAllSources, getRootMeaningAsync } from './loaderRootMeanings';
import {
  preloadDictionaries, preloadLexicons, preloadAcademicSources, preloadScholarlyData,
  preloadEtymologyDatabases, COMMON_HEBREW_WORDS, COMMON_ARAMAIC_WORDS,
  shouldPreload, classifyBookCategory, preloadForBook, waitForPreload,
  isCoreDictionariesLoaded, initializePreload
} from './loaderPreload';

const log = createLogger('DictionaryLoader');

export {
  // BDB
  getBDB, lookupBDBByWord, lookupBDBByStrongs, lookupBDBSync, getBDBData,
  // Jastrow
  getJastrow, lookupJastrowByWord, lookupJastrowSync, getJastrowData,
  // Strong's
  getStrongs, lookupStrongsByWord, lookupStrongsByNumber, lookupStrongsSync, getStrongsData,
  // Additional Lexicons (lazy-loaded)
  getBDBLexicon, getBDBAramaic, getJastrowLexicon, getStrongLexicon,
  getCALAramaic, getJastrowAramaic,
  getBDBLexiconData, getBDBAramaicData, getJastrowLexiconData,
  getStrongLexiconData, getCALAramaicData, getJastrowAramaicData,
  preloadLexicons,
  // Academic Hebrew lexicons
  getGeseniusLexicon, getGeseniusLexiconData, getKleinLexicon, getKleinLexiconData,
  preloadAcademicSources,
  // Scholarly Data (lazy-loaded)
  getRootMeanings, getSemanticFields, getRabbiBiographies, getRealia,
  getRootMeaningsData, getSemanticFieldsData, getRabbiBiographiesData, getRealiaData,
  preloadScholarlyData,
  // Etymology Databases (lazy-loaded)
  getSefariaCache, getRootMeaningsPro, getEtymologyJastrow, getWiktionaryCache,
  getSefariaCacheData, getRootMeaningsProData, getEtymologyJastrowData,
  getWiktionaryCacheData, lookupAllEtymology, preloadEtymologyDatabases,
  // Root Meaning Lookup (shoresh translation)
  getRootMeaning, getRootMeaningFromAllSources, getRootMeaningAsync,
  // Common word lists + preload par catégorie
  COMMON_HEBREW_WORDS, COMMON_ARAMAIC_WORDS,
  shouldPreload, classifyBookCategory, preloadForBook, waitForPreload,
  isCoreDictionariesLoaded, initializePreload,
  // Unified lookup
  lookupAllDictionaries, lookupAllSync,
  // Core preloads
  preloadDictionaries
};

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

