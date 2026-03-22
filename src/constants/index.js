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
  getSourcesByTier,
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
