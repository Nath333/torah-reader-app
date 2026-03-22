// =============================================================================
// Hebrew/Aramaic Verb Patterns - PRO SCHOLAR V5.1
//
// RE-EXPORTS from morphologyPatterns.js (SINGLE SOURCE OF TRUTH)
// Used by: verbGrammarAnalyzer, morphologyAnalyzer, rootFormsService
//
// MIGRATION: This file now re-exports from ../morphologyPatterns.js
// All definitions have been consolidated there to eliminate duplication.
// =============================================================================

// Re-export everything from the single source of truth
export {
  // Binyanim (verb patterns)
  BINYANIM,
  ARAMAIC_BINYANIM,

  // Tense patterns
  TENSE_PATTERNS,
  ARAMAIC_TENSE,

  // Conjugation markers
  CONJUGATION_PREFIXES,
  CONJUGATION_SUFFIXES,

  // Weak verb definitions
  WEAK_VERB_RULES,
  WEAK_VERB_LETTERS,
  WEAK_VERB_BY_CODE,

  // Regex patterns for verb detection
  HEBREW_VERB_REGEX,
  ARAMAIC_VERB_REGEX,

  // Helper functions
  detectWeakVerbType,
  reconstructWeakRoots,
  getBinyanInfo,
  detectBinyan,
} from '../morphologyPatterns';

// =============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// =============================================================================

// Some consumers may expect these specific names
export { WEAK_VERB_RULES as WEAK_VERB_TYPES } from '../morphologyPatterns';
