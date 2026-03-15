/**
 * Unified Analysis Service
 *
 * Routes analysis requests to either:
 * - Scholarly (rule-based) - Uses Sefaria data, no AI
 * - AI-powered - Uses Groq/LLM for insights and conversations
 *
 * Use scholarly modes when you want deterministic, source-based analysis.
 * Use AI modes when you want insights, summaries, or interactive features.
 */

import scholarlyAnalysisModes, { SCHOLARLY_MODES, analyzeScholarly } from './scholarlyAnalysisModes';
import groqService, { ANALYSIS_MODES } from './groqService';
import aiService from './aiService';

// =============================================================================
// MODE CLASSIFICATION
// =============================================================================

// Modes that can be handled by rule-based scholarly analysis
const SCHOLARLY_CAPABLE_MODES = [
  ANALYSIS_MODES.PARDES,
  ANALYSIS_MODES.MEFARSHIM,
  ANALYSIS_MODES.HALACHA,
  ANALYSIS_MODES.LEXICON,
  ANALYSIS_MODES.INTERTEXTUAL,
  ANALYSIS_MODES.SUMMARY,
  ANALYSIS_MODES.KEY_TERMS
];

// Modes that require AI for meaningful output
const AI_REQUIRED_MODES = [
  ANALYSIS_MODES.DEEP_STUDY,
  ANALYSIS_MODES.STUDY_QUESTIONS,
  ANALYSIS_MODES.QUICK_INSIGHT,
  ANALYSIS_MODES.MUSSAR,
  ANALYSIS_MODES.CREATION,
  ANALYSIS_MODES.NARRATIVE,
  ANALYSIS_MODES.GEMATRIA,
  ANALYSIS_MODES.HISTORICAL,
  ANALYSIS_MODES.COMPARE,
  ANALYSIS_MODES.TREE_SUMMARY,
  ANALYSIS_MODES.PASSAGE,
  ANALYSIS_MODES.PASSAGE_NARRATIVE,
  ANALYSIS_MODES.PASSAGE_THEMATIC,
  ANALYSIS_MODES.PASSAGE_CHIASM,
  ANALYSIS_MODES.SUGYA_FLOW,
  ANALYSIS_MODES.SHAKLA_VETARYA,
  ANALYSIS_MODES.SUGYA_SUMMARY
];

// =============================================================================
// ANALYSIS ROUTER
// =============================================================================

/**
 * Analyze text using the appropriate service
 *
 * @param {string} text - Text to analyze
 * @param {string} source - Commentary source (e.g., "Rashi")
 * @param {string} verse - Verse reference (e.g., "Genesis.1.1")
 * @param {string} mode - Analysis mode from ANALYSIS_MODES
 * @param {Object} options - Additional options
 * @param {boolean} options.preferScholarly - Prefer rule-based analysis when available
 * @param {boolean} options.forceAI - Force AI analysis even for scholarly-capable modes
 * @returns {Promise<Object>} Analysis result
 */
export async function analyze(text, source, verse, mode, options = {}) {
  const { preferScholarly = true, forceAI = false } = options;

  // Map groqService modes to scholarly modes
  const scholarlyModeMap = {
    [ANALYSIS_MODES.PARDES]: SCHOLARLY_MODES.PARDES,
    [ANALYSIS_MODES.MEFARSHIM]: SCHOLARLY_MODES.MEFARSHIM,
    [ANALYSIS_MODES.HALACHA]: SCHOLARLY_MODES.HALACHA,
    [ANALYSIS_MODES.LEXICON]: SCHOLARLY_MODES.LEXICON,
    [ANALYSIS_MODES.INTERTEXTUAL]: SCHOLARLY_MODES.INTERTEXTUAL,
    [ANALYSIS_MODES.SUMMARY]: SCHOLARLY_MODES.SUMMARY,
    [ANALYSIS_MODES.KEY_TERMS]: SCHOLARLY_MODES.SUMMARY // Map to summary
  };

  // Determine which service to use
  const canUseScholarly = SCHOLARLY_CAPABLE_MODES.includes(mode);
  const useScholarly = canUseScholarly && preferScholarly && !forceAI;

  if (useScholarly) {
    const scholarlyMode = scholarlyModeMap[mode];
    const result = await analyzeScholarly(verse, scholarlyMode, { hebrewText: text });
    return {
      ...result,
      analysisType: 'scholarly',
      originalMode: mode
    };
  }

  // Use AI service
  const result = await groqService.analyzeCommentary(text, source, verse, mode);
  return {
    ...result,
    analysisType: 'ai',
    originalMode: mode
  };
}

/**
 * Check if a mode can be handled by scholarly analysis
 */
export function canUseScholarlyMode(mode) {
  return SCHOLARLY_CAPABLE_MODES.includes(mode);
}

/**
 * Check if a mode requires AI
 */
export function requiresAI(mode) {
  return AI_REQUIRED_MODES.includes(mode);
}

/**
 * Get recommended analysis type for a mode
 */
export function getRecommendedType(mode) {
  if (AI_REQUIRED_MODES.includes(mode)) return 'ai';
  if (SCHOLARLY_CAPABLE_MODES.includes(mode)) return 'scholarly';
  return 'ai'; // Default to AI for unknown modes
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick scholarly analysis (no AI)
 */
export async function analyzeScholaryOnly(verse, mode, options = {}) {
  return analyzeScholarly(verse, mode, options);
}

/**
 * Quick AI analysis
 */
export async function analyzeWithAI(text, source, verse, mode) {
  return groqService.analyzeCommentary(text, source, verse, mode);
}

/**
 * Streaming AI analysis
 */
export async function analyzeWithStreaming(text, source, verse, mode, onChunk, options = {}) {
  return aiService.analyzeWithStreaming(text, source, verse, mode, onChunk, options);
}

/**
 * Ask a follow-up question (AI only)
 */
export async function askFollowUp(question, onChunk = null) {
  return aiService.askFollowUp(question, onChunk);
}

/**
 * Ask a specific question (AI only)
 */
export async function askQuestion(text, question, source = 'Torah', onChunk = null) {
  return aiService.askQuestion(text, question, source, onChunk);
}

// =============================================================================
// EXPORT
// =============================================================================

export { ANALYSIS_MODES, SCHOLARLY_MODES };

const analysisService = {
  // Main router
  analyze,

  // Type checking
  canUseScholarlyMode,
  requiresAI,
  getRecommendedType,

  // Direct access
  analyzeScholaryOnly,
  analyzeWithAI,
  analyzeWithStreaming,
  askFollowUp,
  askQuestion,

  // Mode constants
  ANALYSIS_MODES,
  SCHOLARLY_MODES,

  // Underlying services
  scholarlyAnalysisModes,
  groqService,
  aiService
};

export default analysisService;
