// =============================================================================
// Morphology Constants - Central Index
// Single source of truth for all Hebrew/Aramaic morphology data
// =============================================================================

// Prefix constants and helpers (from main morphology.js)
export {
  HEBREW_PREFIX_MEANINGS,
  SINGLE_PREFIXES,
  HEBREW_PREFIXES_ORDERED,
  ARAMAIC_PREFIXES,
  getPrefixMeaning,
  getPrefixInfo,
  getCombinedPrefixMeaning,
} from './prefixes';

// Suffix constants and helpers (unique to this module)
export {
  HEBREW_SUFFIX_MEANINGS,
  HEBREW_SUFFIXES_ORDERED,
  getSuffixMeaning,
  getSuffixInfo,
} from './suffixes';

// Verb patterns - binyanim, tenses (re-exports from morphologyPatterns.js)
export {
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS,
  ARAMAIC_TENSE,
  HEBREW_VERB_REGEX,
  ARAMAIC_VERB_REGEX,
  WEAK_VERB_LETTERS,
  WEAK_VERB_RULES,
  WEAK_VERB_BY_CODE,
  CONJUGATION_PREFIXES,
  CONJUGATION_SUFFIXES,
  detectWeakVerbType,
  reconstructWeakRoots,
  getBinyanInfo,
  detectBinyan,
} from './verbPatterns';

// Analysis functions and stop words (from main morphology.js)
export {
  STOP_WORDS,
  FUNCTION_WORDS,
  isStopWord,
  isLikelyCompleteRoot,
  smartPrefixAnalysis,
  lookupFunctionWord,
  analyzeWordWithConfidence,
  getAramaicConfidence,
} from '../morphology';
