/**
 * Application Configuration Constants
 *
 * Centralized configuration values, magic numbers, and thresholds.
 * Makes the codebase self-documenting and easier to maintain.
 */

// =============================================================================
// Talmud Page Reference Configuration
// =============================================================================

/**
 * Valid range for Talmudic page (daf) numbers
 * - MIN: First daf in tractates (daf 2, since daf 1 is the title page)
 * - MAX: Largest tractate is Bava Batra with 176 pages, add buffer
 */
export const TALMUD_DAF_RANGE = {
  MIN: 2,
  MAX: 200,
};

/**
 * Hebrew letter to number conversion (gematria)
 * Used for parsing daf references like "צו:" (96b)
 */
export const HEBREW_GEMATRIA = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
  'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
  'ש': 300, 'ת': 400,
};

// =============================================================================
// Word Analysis Thresholds
// =============================================================================

/**
 * Minimum word length for analysis
 * Words shorter than this are often particles or single letters
 */
export const WORD_ANALYSIS = {
  MIN_LENGTH_FOR_STRUCTURE: 3,  // Min length to analyze prefix structure
  MIN_LENGTH_FOR_STRIPPING: 2,  // Min remaining chars after stripping prefix
  MAX_PREFIXES: 2,              // Max prefixes to strip from a word
};

// =============================================================================
// UI Thresholds
// =============================================================================

export const UI_THRESHOLDS = {
  DEBOUNCE_MS: 300,              // Default debounce for user input
  CLICK_DEBOUNCE_MS: 150,        // Debounce for rapid clicks
  ANIMATION_DURATION_MS: 200,    // Standard transition duration
  TOOLTIP_DELAY_MS: 500,         // Delay before showing tooltips
  MAX_RESULTS_DISPLAY: 50,       // Max items to show in lists
};

// =============================================================================
// Dictionary Configuration
// =============================================================================

export const DICTIONARY_CONFIG = {
  MAX_DEFINITION_LENGTH: 500,    // Truncate definitions longer than this
  MAX_EXAMPLES: 3,               // Max example sentences to show
  CONFIDENCE_THRESHOLD: 0.7,     // Min confidence for auto-suggestions
};

// =============================================================================
// Performance Thresholds
// =============================================================================

export const PERFORMANCE = {
  MAX_CONCURRENT_LOOKUPS: 10,    // Max parallel dictionary lookups
  BATCH_SIZE: 20,                // Batch size for bulk operations
  LAZY_LOAD_THRESHOLD: 100,      // Items before enabling lazy loading
};

// =============================================================================
// Feature Flags (can be overridden via localStorage for testing)
// =============================================================================

export const FEATURE_FLAGS = {
  ENABLE_TELEMETRY: false,
  ENABLE_EXPERIMENTAL_UI: false,
  DEBUG_MORPHOLOGY: false,
};

/**
 * Get feature flag value (checks localStorage override first)
 * @param {string} flag - Flag name from FEATURE_FLAGS
 * @returns {boolean}
 */
export const getFeatureFlag = (flag) => {
  try {
    const override = localStorage.getItem(`feature_${flag}`);
    if (override !== null) return override === 'true';
  } catch {
    // localStorage not available
  }
  return FEATURE_FLAGS[flag] ?? false;
};

const appConfig = {
  TALMUD_DAF_RANGE,
  HEBREW_GEMATRIA,
  WORD_ANALYSIS,
  UI_THRESHOLDS,
  DICTIONARY_CONFIG,
  PERFORMANCE,
  FEATURE_FLAGS,
  getFeatureFlag,
};

export default appConfig;
