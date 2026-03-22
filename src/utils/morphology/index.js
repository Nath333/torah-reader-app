// =============================================================================
// Morphology Utils - Central Index
// Analysis functions for Hebrew/Aramaic morphology
// =============================================================================

// Confidence scoring
export {
  calculateConfidence,
  getConfidenceDisplay,
  CONFIDENCE_FACTORS,
} from './confidence';

// Verb grammar analysis
export {
  analyzeVerbGrammar,
  formatVerbGrammar,
  getBinyanInfo,
} from './verbGrammar';

// Re-export from parent morphologyAnalyzer.js for backward compatibility
// These will be migrated in future refactoring
export {
  analyzeWordMorphology,
  formatMorphologyBreakdown,
  getSimpleBreakdown,
} from '../morphologyAnalyzer';
