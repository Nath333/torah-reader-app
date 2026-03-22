/**
 * ClickableText Constants
 *
 * Constants specific to word lookup and text processing.
 * NOTE: Dictionary source metadata (names, colors, reliability) is in dictionarySources.js
 */

// =============================================================================
// Source Key Constants (enum-style for type safety)
// =============================================================================

/** Source key constants to avoid magic strings in lookup services */
export const SOURCES = {
  BDB: 'bdb',
  STRONG: 'strong',
  JASTROW: 'jastrow',
  KLEIN: 'klein',
  STEINSALTZ: 'steinsaltz',
  SEFARIA: 'sefaria',
  BOLLS: 'bolls',
  HALOT: 'halot',
  GESENIUS: 'gesenius',
  TWOT: 'twot',
  CAL: 'cal',
  HALACHIC: 'halachic',
  BABYLONIAN: 'babylonian',
  LOCAL: 'local',
  CACHE: 'cache',
  NONE: 'none'
};

// =============================================================================
// Lookup Configuration
// =============================================================================

/** Minimum word length for lookup (skip single letters) */
export const MIN_WORD_LENGTH = 2;

/** Maximum definition length before truncation in tooltips */
export const MAX_DEFINITION_LENGTH = 120;

/** Debounce delay for word clicks (ms) */
export const CLICK_DEBOUNCE_MS = 150;

// =============================================================================
// Source Priority Order
// =============================================================================

/** Hebrew source priority order - BDB first for Biblical Hebrew */
export const HEBREW_SOURCE_PRIORITY = [
  SOURCES.BDB,
  SOURCES.STRONG,
  SOURCES.HALOT,
  SOURCES.GESENIUS,
  SOURCES.JASTROW,
  SOURCES.KLEIN,
  SOURCES.STEINSALTZ,
  SOURCES.SEFARIA,
  SOURCES.BOLLS,
  SOURCES.TWOT
];

/** Aramaic source priority order - Jastrow first for Talmudic Aramaic */
export const ARAMAIC_SOURCE_PRIORITY = [
  SOURCES.JASTROW,
  SOURCES.CAL,
  SOURCES.STEINSALTZ,
  SOURCES.BDB,
  SOURCES.STRONG,
  SOURCES.KLEIN,
  SOURCES.HALOT,
  SOURCES.SEFARIA
];

// =============================================================================
// Text Cleaning Patterns
// =============================================================================

/** Scholarly notation patterns to remove from definitions for cleaner display */
export const SCHOLARLY_PATTERNS = [
  /\(a hapax legomenon[^)]*\)/gi,
  /\(occurring[^)]*\)/gi,
  /\(in the c\. st\.[^)]*\)/gi,
  /\(only in[^)]*\)/gi,
  /\(see[^)]*\)/gi
];

// =============================================================================
// Utility Constants
// =============================================================================

/** Stable empty array to prevent React useMemo dependency issues */
export const EMPTY_SOURCES = Object.freeze([]);

/** Stable empty object for default props */
export const EMPTY_OBJECT = Object.freeze({});
