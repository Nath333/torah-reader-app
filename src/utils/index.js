/**
 * Utils Index - Clean exports for all utility functions
 * Usage: import { removeHtmlTags, sanitizeHtml } from './utils';
 */

// =============================================================================
// Sanitization Utilities
// =============================================================================
export { removeHtmlTags, sanitizeHtml, cleanHtml } from './sanitize';

// Cache utilities
export {
  createCache,
  createCachedFetcher,
  withCache,
  CACHE_PRESETS,
  apiCache,
  translationCache,
  verseCache
} from './cache';

// HTTP utilities
export {
  fetchWithTimeout,
  fetchWithFallback,
  createApiFetcher,
  getRateLimitStatus,
  clearPendingRequests,
  getPendingRequestCount
} from './http';

// Data export/import utilities
export {
  exportBookmarksJSON,
  exportBookmarksText,
  exportNotesJSON,
  exportNotesText,
  importBookmarks,
  importNotes
} from './exportData';

// Service worker utilities
export { register as registerServiceWorker, unregister as unregisterServiceWorker } from './serviceWorker';

// Debug utilities
export {
  logVerbose,
  logDebug,
  logInfo,
  logWarn,
  logError,
  createLogger,
  enableVerboseLogging,
  disableVerboseLogging
} from './debug';

// Definition cleaner utilities
export {
  cleanDefinition,
  pickBestDefinition,
  formatForTooltip
} from './definitionCleaner';

// Morphology analyzer utilities
export {
  analyzeWordMorphology,
  formatMorphologyBreakdown,
  getSimpleBreakdown
} from './morphologyAnalyzer';

// Unified error handling
export {
  ERROR_TYPES,
  AppError,
  AIError,
  NetworkError,
  ValidationError,
  isRetryable,
  isNetworkError,
  isAuthError,
  isRateLimitError,
  getErrorMessage,
  createHttpError,
  withErrorHandling
} from './errors';

// Word lookup helpers
export {
  SOURCE_CONFIG,
  enhanceResult,
  processSource,
  processScholarlyResult,
  createBaseResult,
  createFunctionWordResult,
  createAbbreviationResult,
  createCachedResult
} from './wordLookupHelpers';

// =============================================================================
// Memoization Utilities
// =============================================================================
export {
  withDeepMemo,
  withPropCheck,
  withStableChildren,
  useMemoCompare,
  useDeepMemo,
  useStableCallback,
  useShallowMemo,
  useSelector,
  useLRUCache,
  createSelector,
  deepEqual,
  shallowEqual,
  createLRUCache,
  memoize
} from './memoization';

// =============================================================================
// Hebrew Text Utilities
// =============================================================================
export {
  stripCantillation,
  stripVowels,
  stripAllDiacritics,
  stripNiqqud,
  cleanHebrewWord,
  processHebrewText,
  hasVowels,
  hasCantillation,
  getDisplayModeLabel
} from './hebrewUtils';
export { default as hebrewUtils } from './hebrewUtils';

// =============================================================================
// Text Enhancement Utilities
// =============================================================================
export {
  isRabbiName,
  isMeasure,
  parseTextForEnhancements,
  RabbiInlineTooltip,
  MeasureInlineTooltip,
  EnhancedText
} from './textEnhancer';

// =============================================================================
// Reference Utilities
// =============================================================================
export {
  normalizeReference,
  normalizeBookName,
  parseReference,
  formatReference,
  referencesMatch,
  getBookFromReference
} from './referenceUtils';
export { default as referenceUtils } from './referenceUtils';

// =============================================================================
// Logger Utility
// =============================================================================
export { createLogger as createSimpleLogger } from './logger';
export { default as logger } from './logger';
