/**
 * Word Lookup Orchestrator
 * Consolidates all word lookup services into a single unified interface.
 *
 * Previously, useWordLookup imported from 9 different services.
 * This orchestrator provides a single entry point.
 *
 * PERFORMANCE: Services are lazily cached at module level to avoid
 * repeated dynamic imports on every lookup call.
 */

// Re-export everything from individual services
export { cleanHebrewWord } from '../utils/hebrewUtils';
export { lookupWordAsync, lookupWordSync } from './combinedTranslationService';
export { scholarlyLookup, lookupJastrow, lookupWordSefaria } from './scholarlyLexiconService';
export { lookupWithFallback as lookupCAL, analyzePrefix as analyzeCALPrefix } from './calDictionaryService';
export { translateEnglishToFrench } from './englishToFrenchService';
export { smartLookup, getConnectivityStatus } from './smartDataService';
export { getWordFrequency } from './wordFrequencyService';
export { analyzeWord as analyzeGrammar } from './grammarAnalysisService';
export {
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords
} from './semanticFieldService';

// Re-export constants
export { getSourceBadgeData, sortSourcesByReliability } from '../constants/dictionarySources';
export { SEMANTIC_DOMAINS } from './semanticFieldService';

// =============================================================================
// PERFORMANCE: Lazy service cache - loads once, reuses forever
// =============================================================================

let _servicesCache = null;

/**
 * Get all services with lazy initialization (singleton pattern)
 * This avoids the ~50-100ms overhead of dynamic imports on every lookup
 */
const getServices = () => {
  if (_servicesCache) return _servicesCache;

  try {
    _servicesCache = {
      cleanHebrewWord: require('../utils/hebrewUtils').cleanHebrewWord,
      smartLookup: require('./smartDataService').smartLookup,
      getWordFrequency: require('./wordFrequencyService').getWordFrequency,
      analyzeWord: require('./grammarAnalysisService').analyzeWord,
      getWordSemantics: require('./semanticFieldService').getWordSemantics,
      translateEnglishToFrench: require('./englishToFrenchService').translateEnglishToFrench,
    };
  } catch (e) {
    // Graceful degradation - return stubs if services fail to load
    console.warn('[wordLookupOrchestrator] Failed to load services:', e.message);
    _servicesCache = {
      cleanHebrewWord: (w) => w?.replace(/[^\u0590-\u05FF]/g, ''),
      smartLookup: async () => null,
      getWordFrequency: () => null,
      analyzeWord: () => null,
      getWordSemantics: () => null,
      translateEnglishToFrench: async () => null,
    };
  }

  return _servicesCache;
};

// Lookup result cache for repeated lookups of same word
const _lookupCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Unified word lookup with all enhancements
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Promise<Object>} Enhanced lookup result
 */
export const lookupWord = async (word, options = {}) => {
  const {
    includeFrench = false,
    includeFrequency = true,
    includeGrammar = true,
    includeSemantics = true,
    preferredSources = ['jastrow', 'bdb', 'sefaria'],
    useCache = true
  } = options;

  // Get cached services (loaded once, reused forever)
  const services = getServices();

  const cleanedWord = services.cleanHebrewWord(word);
  if (!cleanedWord) return null;

  // Check cache first
  const cacheKey = `${cleanedWord}:${includeFrench}:${includeFrequency}:${includeGrammar}:${includeSemantics}`;
  if (useCache && _lookupCache.has(cacheKey)) {
    const cached = _lookupCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }
    _lookupCache.delete(cacheKey);
  }

  // Get base result from smart lookup
  const result = await services.smartLookup(cleanedWord, { sources: preferredSources });
  if (!result) return null;

  // Enhance with additional data
  const enhanced = { ...result, word: cleanedWord };

  if (includeFrequency) {
    const freq = services.getWordFrequency(cleanedWord);
    if (freq) enhanced.frequency = freq;
  }

  if (includeGrammar) {
    const grammar = services.analyzeWord(cleanedWord);
    if (grammar) enhanced.grammar = grammar;
  }

  if (includeSemantics) {
    const semantics = services.getWordSemantics(cleanedWord);
    if (semantics) enhanced.semantics = semantics;
  }

  if (includeFrench && result.english) {
    try {
      enhanced.french = await services.translateEnglishToFrench(result.english);
    } catch (e) {
      // French translation is optional
    }
  }

  // Cache the result
  if (useCache) {
    // Evict oldest entries if cache is full
    if (_lookupCache.size >= CACHE_MAX_SIZE) {
      const oldestKey = _lookupCache.keys().next().value;
      _lookupCache.delete(oldestKey);
    }
    _lookupCache.set(cacheKey, { result: enhanced, timestamp: Date.now() });
  }

  return enhanced;
};

/**
 * Quick sync lookup (no network, local dictionaries only)
 * @param {string} word - Word to look up
 * @returns {Object|null} Quick lookup result
 */
export const quickLookup = (word) => {
  const services = getServices();
  const cleaned = services.cleanHebrewWord(word);
  if (!cleaned) return null;

  // Use sync lookup from combined service
  try {
    const { lookupWordSync } = require('./combinedTranslationService');
    return lookupWordSync(cleaned);
  } catch (e) {
    return null;
  }
};

/**
 * Clear the lookup cache (useful for testing or memory management)
 */
export const clearLookupCache = () => {
  _lookupCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => ({
  size: _lookupCache.size,
  maxSize: CACHE_MAX_SIZE,
  ttlMs: CACHE_TTL
});

const wordLookupOrchestrator = {
  lookupWord,
  quickLookup
};

export default wordLookupOrchestrator;
