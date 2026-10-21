// =============================================================================
// Unified Root Extraction Service — FAÇADE
// Split docs/DECOUPE-MONOLITHES.md (21/10, file étendue) — modules sous
// ./rootExtraction/ : state (cache+télémétrie), patterns (données),
// hypotheses, validation, api, alternativeRoots. La façade garde les
// wrappers legacy, le ré-export ARAMAIC_PARTICLES et le default export.
// =============================================================================

import { ARAMAIC_PARTICLES } from './preClassificationService';

import { clearCache, getCacheStats, getTelemetry, resetTelemetry } from './rootExtraction/state';
import {
  DICTIONARY_TIERS, WEAK_VERB_TYPES, BINYANIM,
  PREFIX_PATTERNS, SUFFIX_PATTERNS, NOUN_PATTERNS, getSourcesForContext
} from './rootExtraction/patterns';
import { generateHypotheses } from './rootExtraction/hypotheses';
import {
  validateWithDirectDictionaries, validateWithAsyncDictionaries,
  extractRootsWithDirectValidation, extractRootsWithAsyncValidation
} from './rootExtraction/validation';
import {
  extractRoots, getBestRoot, getTopRoots, extractRootsEnhanced,
  detectCitations, getSemanticField, getRootFamily, analyzeBinyan,
  detectDialect, getHistoricalLayer, getGrammaticalAnomaly,
  getCognates, getLoanwordInfo, getHistoricalEvolution, analyzeWordComplete
} from './rootExtraction/api';
import { extractAlternativeRoots, getAllAlternativeRoots } from './rootExtraction/alternativeRoots';

export {
  // État
  clearCache, getCacheStats, getTelemetry, resetTelemetry,
  // Données / config
  DICTIONARY_TIERS, WEAK_VERB_TYPES, BINYANIM,
  PREFIX_PATTERNS, SUFFIX_PATTERNS, NOUN_PATTERNS, getSourcesForContext,
  // Pipeline
  generateHypotheses,
  validateWithDirectDictionaries, validateWithAsyncDictionaries,
  extractRootsWithDirectValidation, extractRootsWithAsyncValidation,
  // API principale
  extractRoots, getBestRoot, getTopRoots, extractRootsEnhanced,
  detectCitations, getSemanticField, getRootFamily, analyzeBinyan,
  detectDialect, getHistoricalLayer, getGrammaticalAnomaly,
  getCognates, getLoanwordInfo, getHistoricalEvolution, analyzeWordComplete,
  // Racines alternatives
  extractAlternativeRoots, getAllAlternativeRoots
};

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Legacy: extractRootsMultiHypothesis compatibility
 */
export const extractRootsMultiHypothesis = (word, lookupFn) => {
  return extractRoots(word, lookupFn);
};

/**
 * Legacy: extractAllPossibleRoots compatibility
 */
export const extractAllPossibleRoots = (word, options = {}) => {
  return extractRoots(word, { ...options, returnFormat: 'proScholar' });
};

// =============================================================================
// SERVICE EXPORT
// =============================================================================

// Re-export ARAMAIC_PARTICLES for backwards compatibility
export { ARAMAIC_PARTICLES };

const UnifiedRootService = {
  // VERSION: '6.3.0', //  with alternative root extraction

  // ★★★★ Alternative root extraction (NEWEST!)
  extractAlternativeRoots,
  getAllAlternativeRoots,

  // ★★★ Complete scholarly analysis
  analyzeWordComplete,
  getHistoricalLayer,
  getHistoricalEvolution,
  getGrammaticalAnomaly,
  getCognates,
  getLoanwordInfo,

  // ★★ Enhanced analysis
  extractRootsEnhanced,
  analyzeBinyan,
  detectDialect,
  detectCitations,
  getSemanticField,
  getRootFamily,

  // ★ PREFERRED: Direct dictionary validation (no callbacks!)
  extractRootsWithDirectValidation,
  validateWithDirectDictionaries,

  // ★ Async validation (fixes race condition on initial load)
  extractRootsWithAsyncValidation,
  validateWithAsyncDictionaries,

  // Standard extraction (with optional callback)
  extractRoots,
  generateHypotheses,
  getBestRoot,
  getTopRoots,

  // Legacy compatibility (DEPRECATED - use extractRootsWithDirectValidation)
  extractRootsMultiHypothesis,
  extractAllPossibleRoots,

  // Comprehensive linguistic patterns
  // PREFIX_PATTERNS,
  // SUFFIX_PATTERNS,
  // NOUN_PATTERNS,
  getSourcesForContext,

  // Configuration
  // DICTIONARY_TIERS,
  // WEAK_VERB_TYPES,
  // BINYANIM,
  // ARAMAIC_PARTICLES,

  // Cache management
  clearCache,
  getCacheStats,

  // Telemetry for performance tracking
  getTelemetry,
  resetTelemetry,
};

export default UnifiedRootService;

