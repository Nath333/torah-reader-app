// =============================================================================
// API principale — extractRoots (consolidé), getBestRoot, getTopRoots,
// extractRootsEnhanced et délégations linguistiques (dialecte, cognats…).
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripVowels } from '../../../utils/hebrewUtils';
import * as _linguisticModule from '../linguisticAnalysis';
import { extractRootsWithDirectValidation } from './validation';
import { generateHypotheses } from './hypotheses';

// =============================================================================
// MAIN EXPORT: extractRoots (replaces both multiHypothesis and proScholarV4)
// =============================================================================

/**
 * Extract possible roots from a word
 * This is the main function that consolidates both services
 * NOTE: For new code, prefer extractRootsWithDirectValidation()
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Function|Object} lookupFnOrOptions - Either a lookup callback or options object
 * @returns {Array|Object} - Array of hypotheses or { primary, alternatives }
 */
export function extractRoots(word, lookupFnOrOptions = {}) {
  let validateFn = null;
  let options = {};

  // Handle both calling conventions for backwards compatibility
  if (typeof lookupFnOrOptions === 'function') {
    validateFn = lookupFnOrOptions;
  } else {
    options = lookupFnOrOptions;
    validateFn = options.validateFn || options.lookupFn;
  }

  const hypotheses = generateHypotheses(word, { ...options, validateFn });

  // Return format compatible with both services
  if (options.returnFormat === 'proScholar') {
    // proScholarV4 format: { primary, alternatives, all }
    const validated = hypotheses.filter(h => h.validated);
    const primary = validated[0] || hypotheses[0];
    return {
      primary: primary ? {
        root: primary.root,
        confidence: primary.confidence,
        morphology: primary.morphology,
        weakVerb: primary.weakVerb,
        validated: primary.validated,
        source: primary.dictionaryEntry?.source
      } : null,
      alternatives: hypotheses.slice(1, 5),
      all: hypotheses
    };
  }

  // Default: multiHypothesisService format (array)
  return hypotheses;
}

/**
 * Get the best root (highest confidence, validated if possible)
 */
export function getBestRoot(word, lookupFn) {
  const results = extractRoots(word, { validateFn: lookupFn, returnFormat: 'proScholar' });
  return results.primary;
}

/**
 * Get top N roots
 */
export function getTopRoots(word, n = 3, lookupFn) {
  const results = extractRoots(word, { validateFn: lookupFn });
  return results.slice(0, n);
}

// =============================================================================
//  INTEGRATION
// Advanced linguistic analysis with binyan detection, dialect markers, etc.
// =============================================================================

// Lazy-load V6 to avoid circular dependencies
// Renamed from proScholarV6 to linguisticAnalysis
// (split 03/10 : require CJS paresseux → import statique ; sens unique, pas de cycle)
const getV6 = () => {
  return _linguisticModule;
};

/**
 * ★ Enhanced extraction with advanced analysis ★
 * Combines direct dictionary validation + binyan + dialect + semantic fields
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { contextType, expandFamily, detectDialect, context }
 * @returns {Object} - Comprehensive analysis with V5 + V6 features
 */
export function extractRootsEnhanced(word, options = {}) {
  const {
    contextType = 'unknown',
    expandFamily = false,
    detectDialect = true,
    context = {}
  } = options;

  // Get V5 direct validation result first
  const v5Result = extractRootsWithDirectValidation(word, options);

  // Try to enhance with V6 features
  const v6 = getV6();
  if (!v6) {
    return { ...v5Result, enhanced: false, version: 'V5' };
  }

  // Run V6 analysis
  const v6Analysis = v6.analyzeWordV6 ? v6.analyzeWordV6(word, {
    context,
    reference: options.reference,
    textType: contextType,
    expandFamily,
    detectDialect
  }) : null;

  // Merge results
  const enhanced = {
    ...v5Result,
    enhanced: true,
    version: 'V6',

    // V6 Binyan analysis
    binyanAnalysis: v6Analysis?.binyanAnalysis || null,

    // V6 Dialect detection (for Aramaic)
    dialectAnalysis: v6Analysis?.dialectAnalysis || null,

    // V6 Semantic field
    semanticField: v6Analysis?.semanticField || null,

    // V6 Root family expansion
    rootFamily: v6Analysis?.rootFamily || null,

    // V6 Contextual boosting
    boostReasons: v6Analysis?.boostReasons || [],

    // Update confidence with V6 boost
    confidence: v6Analysis?.confidence || v5Result.bestMatch?.confidence || 0
  };

  // If V6 identified binyan, add to best match morphology
  if (enhanced.bestMatch && enhanced.binyanAnalysis?.binyan) {
    enhanced.bestMatch.morphology = {
      ...enhanced.bestMatch.morphology,
      binyan: enhanced.binyanAnalysis.binyanInfo,
      binyanConfidence: enhanced.binyanAnalysis.confidence
    };
  }

  return enhanced;
}

/**
 * Detect citation patterns in surrounding text
 * @param {string} text - Surrounding Talmudic text
 * @returns {Array} - Detected citation patterns
 */
export function detectCitations(text) {
  const v6 = getV6();
  if (!v6 || !v6.detectCitationPatterns) return [];
  return v6.detectCitationPatterns(text);
}

/**
 * Identify semantic field for a word
 * @param {string} word - Hebrew word
 * @returns {Object} - Semantic field info
 */
export function getSemanticField(word) {
  const v6 = getV6();
  if (!v6 || !v6.identifySemanticField) return { field: null };
  return v6.identifySemanticField(word);
}

/**
 * Expand a root to find related words
 * @param {string} root - Hebrew root
 * @returns {Object} - Root family expansion
 */
export function getRootFamily(root) {
  const v6 = getV6();
  if (!v6 || !v6.expandRootFamily) return { root, family: [] };
  return v6.expandRootFamily(root);
}

/**
 * Analyze binyan pattern for a verb
 * @param {string} word - Hebrew verb
 * @param {Object} options - { language }
 * @returns {Object} - Binyan analysis
 */
export function analyzeBinyan(word, options = {}) {
  const v6 = getV6();
  if (!v6 || !v6.analyzeBinyan) return { binyan: null };
  return v6.analyzeBinyan(word, options);
}

/**
 * Detect Aramaic dialect markers
 * @param {string} text - Aramaic text
 * @returns {Object} - Dialect analysis
 */
export function detectDialect(text) {
  const v6 = getV6();
  if (!v6 || !v6.detectAramaicDialect) return { dialect: 'unknown' };
  return v6.detectAramaicDialect(text);
}

// =============================================================================
// ADVANCED SCHOLARLY FEATURES
// Historical layers, grammatical anomalies, and cognate languages
// =============================================================================

/**
 * Detect historical layer of a word (Biblical, Mishnaic, Talmudic, etc.)
 * @param {string} word - Hebrew word
 * @param {Object} options - { checkEvolution: boolean }
 * @returns {Object} - Historical layer analysis
 */
export function getHistoricalLayer(word, options = {}) {
  const v6 = getV6();
  if (!v6 || !v6.detectHistoricalLayer) return { primaryLayer: null };
  return v6.detectHistoricalLayer(word, options);
}

/**
 * Check for grammatical anomalies (irregular plurals, defective verbs, etc.)
 * @param {string} word - Hebrew word
 * @returns {Object|null} - Anomaly information if found
 */
export function getGrammaticalAnomaly(word) {
  const v6 = getV6();
  if (!v6 || !v6.checkGrammaticalAnomaly) return null;
  return v6.checkGrammaticalAnomaly(word);
}

/**
 * Get cognate information from Semitic languages (Akkadian, Arabic, etc.)
 * @param {string} root - Hebrew root
 * @returns {Object|null} - Cognate information
 */
export function getCognates(root) {
  const v6 = getV6();
  if (!v6 || !v6.getCognates) return null;
  return v6.getCognates(root);
}

/**
 * ★ Get loanword etymology information ★
 * Returns source language, original word, and meaning for Greek/Latin/Persian/Arabic loanwords
 * @param {string} word - Hebrew word
 * @returns {Object|null} - Loanword information { origin, source, meaning, period, confidence }
 */
export function getLoanwordInfo(word) {
  const v6 = getV6();
  if (!v6 || !v6.LOANWORD_DATABASE) return null;
  const cleaned = stripVowels(word);
  return v6.LOANWORD_DATABASE[cleaned] || null;
}

/**
 * Get historical evolution data for a word
 * @param {string} word - Hebrew word
 * @returns {Object|null} - Evolution data across periods
 */
export function getHistoricalEvolution(word) {
  const v6 = getV6();
  if (!v6 || !v6.HISTORICAL_EVOLUTION) return null;
  const cleaned = stripVowels(word);
  return v6.HISTORICAL_EVOLUTION[cleaned] || null;
}

/**
 * ★ Complete enhanced word analysis ★
 * Combines all V6 features + historical layers + anomalies + cognates
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Analysis options
 * @returns {Object} - Comprehensive scholarly analysis
 */
export function analyzeWordComplete(word, options = {}) {
  const v6 = getV6();
  if (!v6 || !v6.analyzeWordV6Enhanced) {
    // Fallback to basic enhanced analysis
    return extractRootsEnhanced(word, options);
  }
  return v6.analyzeWordV6Enhanced(word, options);
}

