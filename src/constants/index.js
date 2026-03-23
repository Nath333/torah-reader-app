/**
 * Constants Index - Clean exports for all constants
 * Usage: import { TORAH_BOOKS, DICTIONARY_SOURCES } from './constants';
 */

// =============================================================================
// Book & Text Reference Constants
// =============================================================================
export {
  // Book lists
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  TALMUD_BAVLI,
  TANACH_BOOKS,
  GEMARA_SEDARIM,
  MISHNAH_SEDARIM,
  BOOK_HEBREW_NAMES,

  // Formatting functions
  formatBook,
  formatTractate,

  // Context detection (PRO SCHOLAR v2)
  CONTEXT_MODES,
  MIDRASH_COLLECTIONS,
  TARGUM_TEXTS,
  COMMENTARY_NAMES,
  parseReference,
  getContextFromReference,
  getContextFromTextSource,
  isTalmudicReference,
  isBiblicalReference,

  // Helper functions
  isTorah,
  isTalmud,
  isTanach
} from './bookConstants';

// =============================================================================
// Dictionary & Lexicon Source Configuration
// =============================================================================
export {
  DICTIONARY_SOURCES,
  RELIABILITY_TIERS,
  getSourceInfo,
  getSourceStyle,
  getSourceReliability,
  getSourceBadgeData,
  sortSourcesByReliability,
  getSourcesByType,
  isAcademicSource
} from './dictionarySources';

// =============================================================================
// Hebrew/Aramaic Morphology Constants
// =============================================================================
export {
  HEBREW_PREFIX_MEANINGS,
  HEBREW_PREFIXES_ORDERED,
  HEBREW_SUFFIXES_ORDERED,
  SINGLE_PREFIXES,
  STOP_WORDS,
  ARAMAIC_PREFIXES,
  getPrefixMeaning,
  getPrefixInfo,
  getCombinedPrefixMeaning,
  isStopWord
} from './morphology';

// =============================================================================
// Commentator Registry
// =============================================================================
export {
  COMMENTATORS,
  ERAS,
  COMMENTARY_SOURCE_META,
  getCommentator,
  getCommentatorColor,
  getCommentatorIcon,
  getDisplayName,
  getEra,
  getByEra,
  getSorted
} from './commentatorRegistry';

// =============================================================================
// Word Lookup Constants
// =============================================================================
export {
  SOURCES,
  MIN_WORD_LENGTH,
  MAX_DEFINITION_LENGTH,
  CLICK_DEBOUNCE_MS,
  HEBREW_SOURCE_PRIORITY,
  ARAMAIC_SOURCE_PRIORITY,
  SCHOLARLY_PATTERNS,
  EMPTY_SOURCES,
  EMPTY_OBJECT
} from './clickableTextConstants';

// =============================================================================
// PRO SCHOLAR V6: Morphology Patterns - SINGLE SOURCE OF TRUTH
// =============================================================================
export {
  // Weak verb definitions (comprehensive with display config)
  WEAK_VERB_RULES,
  WEAK_VERB_DISPLAY,
  WEAK_VERB_BY_CODE,
  WEAK_VERB_LETTERS,
  getWeakVerbDisplay,

  // Binyanim (verb patterns)
  BINYANIM,
  ARAMAIC_BINYANIM,

  // Tense patterns
  TENSE_PATTERNS,
  ARAMAIC_TENSE,

  // Conjugation markers
  CONJUGATION_PREFIXES,
  CONJUGATION_SUFFIXES,

  // Helper functions
  detectWeakVerbType,
  reconstructWeakRoots,
  getBinyanInfo,
  detectBinyan
} from './morphologyPatterns';

// =============================================================================
// Critical Words & Fallback Translations
// =============================================================================
export {
  CRITICAL_WORDS,
  BIBLICAL_NAMES,
  SHABBAT_WORDS,
  COMMON_ABBREVIATIONS,
  DOMAIN_ABBREVIATIONS,
  ARAMAIC_TERMS,
  VERB_FORMS,
  PREFIXED_WORDS,
  lookupCriticalWord,
  isBiblicalName
} from './criticalWords';

// =============================================================================
// Application Configuration
// =============================================================================
export {
  TALMUD_DAF_RANGE,
  HEBREW_GEMATRIA,
  WORD_ANALYSIS,
  UI_THRESHOLDS,
  DICTIONARY_CONFIG,
  PERFORMANCE,
  FEATURE_FLAGS,
  getFeatureFlag
} from './appConfig';
