// =============================================================================
// Unified Lookup Service — FAÇADE (étage final du split, 21/10)
// Le cœur (pipeline lookupWord/executeLookup), les modes, la morpho, les
// variantes et les dictionnaires locaux vivent dans ./unifiedLookup/ ;
// les données/databases/scoring/export y étaient déjà (08/10).
// La façade garde getRootFamilyExpansion, les helpers sémantiques/français,
// la gestion de cache et l'intégralité de la surface publique.
// =============================================================================

import { IS_DEV as DEBUG } from '../utils/debug';
import { cleanHebrewWord } from './dictionaries/hebrewDictionary';
import { translateEnglishToFrench } from './dictionaries/englishToFrenchService';
import { extractRootsWithAsyncValidation, getRootFamily } from './analysis/rootExtraction';
import { lookupCache } from './unifiedLookup/state';
import {
  getSourceTier, calculateConsensus, CONSENSUS_LEVELS, formatConsensusForUI,
  raceWithEarlyReturn, getResultQualityScore, rankSourcesByTier, SCHOLARLY_TIERS
} from './scholarSourceAggregator';
import { rankDefinitions, detectContextType, detectDomain, CONTEXT_TYPES } from './contextualDefinitionService';
import { RELIABILITY_TIERS } from '../constants/dictionarySources';
import {
  SEMANTIC_DOMAINS, getWordSemantics, getSynonyms, getAntonyms, getRelatedWords, getDomain
} from './scholarly/semanticFieldService';
import { WORD_RELATIONSHIP_TYPES } from './scholarly/wordRelationshipService';
import {
  ARAMAIC_DIALECTS, CITATION_FORMATS, COMPARATIVE_SEMITIC_DB, CROSS_REFERENCE_DB,
  HAPAX_DATABASE, HISTORICAL_PERIODS, LINGUISTIC_PERIODS, SEMANTIC_EVOLUTION_DB,
  analyzeDialectalPeriod, generateAcademicCitations, generateAllCitations, generateCitation,
  generateSBLCitation, getComparativeSemiticData, getCrossReferences, getHapaxInfo,
  getHistoricalUsageTimeline, isLikelyHapax
} from './unifiedLookup/databases';
import { CONFIDENCE_SCORING, calculateConfidence } from './unifiedLookup/scoring';
import {
  UNCERTAINTY_LEVELS, generateScholarlyUncertainty,
  exportToJsonLD, exportToMarkdown, exportToFlashcard
} from './unifiedLookup/export';
import { generateLookupVariants, getDictionaries } from './unifiedLookup/variants';
import { lookupAllLocalDictionaries } from './unifiedLookup/localAll';
import { getMorphology, getMorphologicalHint } from './unifiedLookup/morphology';
import { lookupWord, getPipeline } from './unifiedLookup/pipeline';
import { quickLookup, progressiveLookup, progressiveBatchLookup, batchLookup } from './unifiedLookup/modes';

// Ré-exports historiques (contrat inchangé — blocs d'origine conservés)
export { generateCitation, generateAllCitations, CITATION_FORMATS, generateSBLCitation, generateAcademicCitations, CROSS_REFERENCE_DB, getCrossReferences };
export { CONFIDENCE_SCORING, calculateConfidence };
export { UNCERTAINTY_LEVELS, generateScholarlyUncertainty, exportToJsonLD, exportToMarkdown, exportToFlashcard };
export { LINGUISTIC_PERIODS, ARAMAIC_DIALECTS, HAPAX_DATABASE, COMPARATIVE_SEMITIC_DB, HISTORICAL_PERIODS, SEMANTIC_EVOLUTION_DB } from './unifiedLookup/databases';
export { analyzeDialectalPeriod, getHapaxInfo, isLikelyHapax, getComparativeSemiticData, getHistoricalUsageTimeline } from './unifiedLookup/databases';
export { cleanHebrewWord } from './dictionaries/hebrewDictionary';
export { lookupWord, getPipeline };
export { quickLookup, progressiveLookup, progressiveBatchLookup, batchLookup };
export { lookupAllLocalDictionaries };
export { getMorphology, getMorphologicalHint };

// =============================================================================
// ROOT FAMILY EXPANSION
// =============================================================================

/**
 * Get related words from the same root family
 * Provides scholarly context by showing cognate forms
 *
 * @param {string} word - The word to analyze
 * @param {Object} options - Options for root family lookup
 * @returns {Promise<Object>} Root family information
 */
export const getRootFamilyExpansion = async (word, options = {}) => {
  const { maxRelated = 10, includeDefinitions = true } = options;

  try {
    // Extract roots from the word
    // PRO SCHOLAR V12: Use async version to ensure dictionaries are loaded
    const rootResult = await extractRootsWithAsyncValidation(word);
    const bestRoot = rootResult?.bestMatch || rootResult?.hypotheses?.[0] || rootResult?.allMatches?.[0];
    if (!bestRoot?.root) {
      return { root: null, related: [], hasFamily: false };
    }

    // Get the best root
    const primaryRoot = bestRoot.root;
    if (!primaryRoot || primaryRoot.length < 3) {
      return { root: null, related: [], hasFamily: false };
    }

    // Get root family (if available)
    let family = null;
    try {
      family = getRootFamily?.(primaryRoot);
    } catch (err) {
      // getRootFamily may not be available
    }

    // Build related words list
    const related = [];
    if (family?.derivatives) {
      for (const derivative of family.derivatives.slice(0, maxRelated)) {
        const item = {
          word: derivative.word || derivative,
          relationship: derivative.type || 'derivative'
        };

        // Optionally look up definitions for related words
        if (includeDefinitions && typeof derivative === 'object' && derivative.word) {
          const def = quickLookup(derivative.word, { contextMode: options.contextMode });
          if (def?.english) {
            item.definition = def.english;
          }
        }

        related.push(item);
      }
    }

    return {
      root: primaryRoot,
      rootMeaning: bestRoot?.meaning || family?.meaning,
      confidence: bestRoot?.confidence,
      related,
      hasFamily: related.length > 0,
      binyan: bestRoot?.binyan,
      semanticField: family?.semanticField
    };
  } catch (err) {
    if (DEBUG) {
      log.debug(`[RootFamily] Error expanding family for "${word}": ${err.message}`);
    }
    return { root: null, related: [], hasFamily: false };
  }
};

/**
 * Get morphological analysis for a word (prefixes, suffixes, root breakdown)
 * @param {string} word - Word to analyze
 * @returns {Object} Morphological breakdown
 */

/**
 * Get cache statistics
 */
export const getCacheStats = () => lookupCache.getStats?.() || { size: 0 };

/**
 * Clear the lookup cache
 */
export const clearCache = () => lookupCache.clear?.();

/**
 * Clear cache entries for a specific word
 * Used by hooks to force refresh without clearing entire cache
 * @param {string} word - Word to clear from cache
 */
export const clearWordCache = (word) => {
  if (!word || !lookupCache.delete) return;
  // Clear all possible cache key variants for this word
  const cleanedWord = cleanHebrewWord(word);
  const variants = [word, cleanedWord, `${word}:auto`, `${cleanedWord}:auto`];
  variants.forEach(key => lookupCache.delete(key));
};

/**
 * Glossary-compatible lookup wrapper
 * Provides WordGlossary-compatible response shape from unifiedLookupService
 * This enables migration from scholarlyLookup while maintaining compatibility
 *
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {string} contextType - Context type ('talmudic', 'biblical', etc.)
 * @returns {Object|null} WordGlossary-compatible result object
 */
export const glossaryLookup = (word, contextType = 'talmudic') => {
  const result = quickLookup(word, { contextMode: contextType });

  if (!result || (!result.english && (!result.sources || result.sources.length === 0))) {
    return null;
  }

  // Map to WordGlossary expected shape
  const primarySource = result.sources?.[0];
  return {
    word: result.cleanedWord || result.word,
    definition: result.english || primarySource?.definition,
    source: result.source || primarySource?.name?.toLowerCase() || 'unified',
    sourceName: primarySource?.name || result.source,
    root: result.rootData?.root || result.root,
    isLocal: result.offline || primarySource?._isLocal,
    isLexicon: primarySource?.tier?.level <= 2,
    matchType: result.matchType || (result.rootData?.root ? 'ROOT_DERIVED' : 'EXACT'),
    // Additional scholarly data
    confidence: result.confidence,
    sources: result.sources,
    morphology: result.morphology
  };
};

// =============================================================================
// SEMANTIC FIELD ENRICHMENT
// =============================================================================

/**
 * Get semantic field data for a word
 * Returns domain, synonyms, antonyms, and related words
 *
 * @param {string} word - Hebrew word to analyze
 * @param {Object} options - Options
 * @param {boolean} options.includeSynonyms - Include synonyms (default: true)
 * @param {boolean} options.includeAntonyms - Include antonyms (default: true)
 * @param {boolean} options.includeRelated - Include related words (default: false)
 * @param {number} options.relatedLimit - Max related words (default: 5)
 * @returns {Object|null} Semantic data or null if word not in vocabulary
 */
export const getSemanticField = (word, options = {}) => {
  const {
    includeSynonyms = true,
    includeAntonyms = true,
    includeRelated = false,
    relatedLimit = 5
  } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;

  const semantics = getWordSemantics(cleaned);
  if (!semantics) return null;

  const primaryDomain = semantics.primaryDomain
    ? getDomain(semantics.primaryDomain)
    : null;

  const result = {
    word: cleaned,
    root: semantics.root,
    gloss: semantics.gloss,
    domain: primaryDomain ? {
      key: semantics.primaryDomain,
      name: primaryDomain.name,
      hebrewName: primaryDomain.hebrewName,
      color: primaryDomain.color
    } : null,
    secondaryDomains: (semantics.secondaryDomains || []).map(key => {
      const domain = getDomain(key);
      return domain ? { key, name: domain.name, color: domain.color } : null;
    }).filter(Boolean),
    frequency: semantics.frequency || null,
    theologicalNote: semantics.theologicalNote || null
  };

  if (includeSynonyms) {
    result.synonyms = getSynonyms(cleaned).map(s => ({
      word: s.word,
      gloss: s.gloss,
      root: s.root
    }));
  }

  if (includeAntonyms) {
    result.antonyms = getAntonyms(cleaned).map(a => ({
      word: a.word,
      gloss: a.gloss,
      root: a.root
    }));
  }

  if (includeRelated) {
    result.relatedWords = getRelatedWords(cleaned, relatedLimit).map(r => ({
      word: r.word,
      gloss: r.gloss,
      root: r.root
    }));
  }

  return result;
};

/**
 * Enrich a lookup result with semantic field data
 *
 * @param {Object} result - Lookup result to enrich
 * @param {Object} options - Semantic options
 * @returns {Object} Result with semantics added
 */
export const enrichWithSemantics = (result, options = {}) => {
  if (!result || !result.cleanedWord) return result;

  const semantics = getSemanticField(result.cleanedWord, options);

  if (semantics) {
    result.semantics = semantics;
    if (semantics.domain) {
      result.domainColor = semantics.domain.color;
      result.domainName = semantics.domain.name;
    }
  }

  return result;
};

/**
 * Lookup word with semantic enrichment
 *
 * @param {string} word - Word to lookup
 * @param {Object} options - Lookup + semantic options
 * @returns {Object} Lookup result with semantic field data
 */
export const lookupWithSemantics = (word, options = {}) => {
  const {
    includeSynonyms = true,
    includeAntonyms = true,
    includeRelated = false,
    relatedLimit = 5,
    ...lookupOptions
  } = options;

  const result = quickLookup(word, lookupOptions);

  return enrichWithSemantics(result, {
    includeSynonyms,
    includeAntonyms,
    includeRelated,
    relatedLimit
  });
};

// =============================================================================
// FRENCH TRANSLATION
// =============================================================================

/**
 * Get French translation for English text (via Lingva API)
 * @param {string} englishText - English text to translate
 * @returns {Promise<string|null>} French translation or null
 */
export const getFrenchTranslation = async (englishText) => {
  if (!englishText) return null;
  try {
    return await translateEnglishToFrench(englishText);
  } catch (err) {
    if (DEBUG) {
      log.debug(`[French] Translation failed: ${err.message}`);
    }
    return null;
  }
};

// Étage preload déplacé dans ./unifiedLookup/preload.js (import + ré-export,
// le default object et les appels internes passent par les bindings locaux).
import {
  warmCache,
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus,
  isCached
} from './unifiedLookup/preload';
export { warmCache, preloadCommonWords, isPreloadComplete, getPreloadStatus, isCached };

// Étage enriched déplacé dans ./unifiedLookup/enriched.js (cycle paresseux).
import {
  lookupFullyEnrichedV3,
  lookupFullyEnriched,
  lookupWordEnriched,
  lookupParallel,
  getSourceComparison,
  rankDefinitionsByContext,
  lookupWithContextRanking,
  getWordRelationships,
  lookupWithRelationships
} from './unifiedLookup/enriched';
export {
  lookupFullyEnrichedV3,
  lookupFullyEnriched,
  lookupWordEnriched,
  lookupParallel,
  getSourceComparison,
  rankDefinitionsByContext,
  lookupWithContextRanking,
  getWordRelationships,
  lookupWithRelationships
};


/**
 * Synchronous word lookup - alias for quickLookup
 * API-compatible replacement for combinedTranslationService.lookupWordSync
 */
export const lookupWordSync = (word, options = {}) => quickLookup(word, options);

/**
 * Clear all caches - alias for clearCache
 * API-compatible replacement for combinedTranslationService.clearCaches
 */
export const clearCaches = () => clearCache();

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export raceWithEarlyReturn for advanced use cases
export { raceWithEarlyReturn, getResultQualityScore, rankSourcesByTier, SCHOLARLY_TIERS };

// Re-export source metadata utilities
export { RELIABILITY_TIERS };

// Re-export constants for services/index.js
export { CONTEXT_TYPES, WORD_RELATIONSHIP_TYPES };

const unifiedLookupService = {
  // Core lookup functions
  lookupWord,
  quickLookup,
  batchLookup,
  lookupAllLocalDictionaries,

  // Progressive enhancement
  progressiveLookup,
  progressiveBatchLookup,

  // Enhanced lookup
  lookupWordEnriched,
  lookupFullyEnriched,
  lookupFullyEnrichedV3,

  // Scholarly features
  generateCitation,
  generateAllCitations,
  calculateConfidence,
  getRootFamilyExpansion,
  getMorphology,

  // Contextual ranking
  rankDefinitionsByContext,
  lookupWithContextRanking,

  // Word relationships
  getWordRelationships,
  lookupWithRelationships,

  // Scholarly uncertainty
  generateScholarlyUncertainty,
  UNCERTAINTY_LEVELS,

  // Export capabilities
  exportToJsonLD,
  exportToMarkdown,
  exportToFlashcard,

  // Dialectal/Period Analysis
  analyzeDialectalPeriod,
  LINGUISTIC_PERIODS,
  ARAMAIC_DIALECTS,

  // Hapax Legomena
  getHapaxInfo,
  isLikelyHapax,
  HAPAX_DATABASE,

  // Comparative Semitic
  getComparativeSemiticData,
  COMPARATIVE_SEMITIC_DB,

  // Historical Timeline
  getHistoricalUsageTimeline,
  HISTORICAL_PERIODS,
  SEMANTIC_EVOLUTION_DB,

  // Enhanced Citations
  generateSBLCitation,
  generateAcademicCitations,
  CITATION_FORMATS,

  // Cross-References
  getCrossReferences,
  CROSS_REFERENCE_DB,

  // Legacy compatibility
  lookupParallel,
  getSourceComparison,
  lookupWordSync,
  clearCaches,

  // Cache management
  getCacheStats,
  clearCache,
  warmCache,
  isCached,

  // Preloading
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus,

  // Translation
  getFrenchTranslation,
  cleanHebrewWord,

  // Semantic field enrichment
  getSemanticField,
  enrichWithSemantics,
  lookupWithSemantics,

  // Advanced parallel fetching
  raceWithEarlyReturn,
  getResultQualityScore,
  rankSourcesByTier,

  // Constants
  SCHOLARLY_TIERS,
  SEMANTIC_DOMAINS,
  RELIABILITY_TIERS,
  CONTEXT_TYPES,
  WORD_RELATIONSHIP_TYPES
};

export default unifiedLookupService;

