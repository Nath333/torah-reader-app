// Utils Index - Clean exports for all utility functions
// Usage: import { removeHtmlTags, sanitizeHtml } from './utils';

// Sanitization utilities
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
export { fetchWithTimeout, fetchWithFallback, createApiFetcher } from './http';

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
