// =============================================================================
// PRO SCHOLAR V10: WORD PREFETCH SERVICE
// Intelligent word prefetching for faster lookup experience
// =============================================================================

import { cleanHebrewWord } from './dictionaries/hebrewDictionary';
import { createLogger } from '../utils/debug';
import { stripAllDiacritics } from '../utils/hebrewUtils';

const log = createLogger('Prefetch');
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// PREFETCH CONFIGURATION
// =============================================================================

const PREFETCH_CONFIG = {
  // Maximum words to prefetch per verse
  maxWordsPerVerse: 15,

  // Minimum word length to prefetch (skip particles)
  minWordLength: 2,

  // Delay before starting prefetch (ms) - let main content load first
  initialDelay: 500,

  // Delay between prefetch batches (ms)
  batchDelay: 100,

  // Batch size for prefetching
  batchSize: 3,

  // Priority levels
  PRIORITY: {
    HIGH: 1,    // User is hovering/about to click
    MEDIUM: 2,  // Current verse words
    LOW: 3      // Adjacent verses
  }
};

// =============================================================================
// PREFETCH QUEUE
// =============================================================================

/**
 * Priority queue for prefetch requests
 */
class PrefetchQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.abortController = null;
  }

  /**
   * Add words to prefetch queue
   * @param {Array<string>} words - Words to prefetch
   * @param {number} priority - Priority level (lower = higher priority)
   * @param {Function} lookupFn - Lookup function to use
   */
  add(words, priority, lookupFn) {
    for (const word of words) {
      const cleaned = cleanHebrewWord(word);
      if (!cleaned || cleaned.length < PREFETCH_CONFIG.minWordLength) continue;

      // Skip if already in queue
      const existing = this.queue.find(item => item.word === cleaned);
      if (existing) {
        // Update priority if higher
        if (priority < existing.priority) {
          existing.priority = priority;
        }
        continue;
      }

      this.queue.push({
        word: cleaned,
        priority,
        lookupFn,
        addedAt: Date.now()
      });
    }

    // Sort by priority
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Clear all pending prefetch requests
   */
  clear() {
    this.queue = [];
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Process the queue
   */
  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    this.abortController = new AbortController();

    try {
      while (this.queue.length > 0) {
        // Check if aborted
        if (this.abortController.signal.aborted) break;

        // Take a batch
        const batch = this.queue.splice(0, PREFETCH_CONFIG.batchSize);

        // Process batch in parallel
        await Promise.all(
          batch.map(async (item) => {
            try {
              await item.lookupFn(item.word);
              if (DEBUG) {
                log.debug(`[Prefetch] Cached: ${item.word}`);
              }
            } catch (err) {
              // Silently ignore prefetch errors
            }
          })
        );

        // Delay between batches
        if (this.queue.length > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, PREFETCH_CONFIG.batchDelay)
          );
        }
      }
    } finally {
      this.processing = false;
      this.abortController = null;
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing
    };
  }
}

// Singleton queue instance
const prefetchQueue = new PrefetchQueue();

// =============================================================================
// VERSE PREFETCH
// =============================================================================

/**
 * Extract Hebrew words from a verse
 * @param {string} verseText - Hebrew verse text
 * @returns {Array<string>} - Array of Hebrew words
 */
const extractHebrewWords = (verseText) => {
  if (!verseText) return [];

  // Remove nikud/cantillation and split by whitespace
  const cleanText = stripAllDiacritics(verseText)
    .replace(/[^\u05D0-\u05EA\s]/g, ' '); // Keep only Hebrew letters

  return cleanText
    .split(/\s+/)
    .filter(word => word.length >= PREFETCH_CONFIG.minWordLength);
};

/**
 * Prefetch words from a verse for faster lookup
 * @param {string} verseText - Hebrew verse text
 * @param {Function} lookupFn - Word lookup function
 * @param {Object} options - Options
 */
export const prefetchVerse = (verseText, lookupFn, options = {}) => {
  const {
    priority = PREFETCH_CONFIG.PRIORITY.MEDIUM,
    immediate = false
  } = options;

  const words = extractHebrewWords(verseText);

  // Limit words per verse
  const wordsToFetch = words.slice(0, PREFETCH_CONFIG.maxWordsPerVerse);

  if (DEBUG) {
    log.debug(`[Prefetch] Queuing ${wordsToFetch.length} words from verse`);
  }

  prefetchQueue.add(wordsToFetch, priority, lookupFn);

  // Start processing after delay (or immediately for high priority)
  if (immediate) {
    prefetchQueue.process();
  } else {
    setTimeout(() => prefetchQueue.process(), PREFETCH_CONFIG.initialDelay);
  }
};

/**
 * Prefetch words from multiple verses (e.g., surrounding context)
 * @param {Array<string>} verses - Array of verse texts
 * @param {Function} lookupFn - Word lookup function
 * @param {Object} options - Options
 */
export const prefetchVerses = (verses, lookupFn, options = {}) => {
  const { priorityDecay = true } = options;

  verses.forEach((verse, index) => {
    // Decay priority for further verses
    const priority = priorityDecay
      ? PREFETCH_CONFIG.PRIORITY.MEDIUM + index
      : PREFETCH_CONFIG.PRIORITY.MEDIUM;

    prefetchVerse(verse, lookupFn, { priority });
  });
};

/**
 * Prefetch a specific word with high priority (e.g., on hover)
 * @param {string} word - Word to prefetch
 * @param {Function} lookupFn - Word lookup function
 */
export const prefetchWord = (word, lookupFn) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < PREFETCH_CONFIG.minWordLength) return;

  prefetchQueue.add([cleaned], PREFETCH_CONFIG.PRIORITY.HIGH, lookupFn);
  prefetchQueue.process();
};

/**
 * Clear all pending prefetch requests
 * Call this when navigating away or changing context
 */
export const clearPrefetchQueue = () => {
  prefetchQueue.clear();
};

/**
 * Get prefetch queue status
 */
export const getPrefetchStatus = () => {
  return prefetchQueue.getStatus();
};

// =============================================================================
// COMMON WORDS WARMUP
// =============================================================================

/**
 * Most common Hebrew words to warm up cache on app start
 * These appear frequently and benefit from immediate caching
 */
const COMMON_WORDS = [
  // Definite article and prepositions
  'את', 'אל', 'על', 'מן', 'עם', 'כי', 'לא', 'גם',
  // Common verbs
  'אמר', 'היה', 'בוא', 'נתן', 'עשה', 'ראה', 'ידע', 'שמע',
  // Common nouns
  'איש', 'אשה', 'בן', 'אב', 'יד', 'עין', 'לב', 'בית',
  // Divine names
  'אלהים', 'יהוה', 'אדני',
  // Talmudic
  'תנא', 'אמר', 'מאי', 'דאמר', 'משום'
];

/**
 * Warm up cache with common words on app initialization
 * @param {Function} lookupFn - Word lookup function
 */
export const warmupCommonWords = (lookupFn) => {
  if (DEBUG) {
    log.debug(`[Prefetch] Warming up ${COMMON_WORDS.length} common words`);
  }

  prefetchQueue.add(COMMON_WORDS, PREFETCH_CONFIG.PRIORITY.LOW, lookupFn);

  // Start after a longer delay to not interfere with initial load
  setTimeout(() => prefetchQueue.process(), 2000);
};

// =============================================================================
// INTELLIGENT PREFETCH HOOKS
// =============================================================================

/**
 * Create a prefetch handler for React components
 * @param {Function} lookupFn - Word lookup function
 * @returns {Object} - Prefetch handlers
 */
export const createPrefetchHandlers = (lookupFn) => {
  return {
    /**
     * Call when verse content is loaded
     * @param {string} verseText - Hebrew verse text
     */
    onVerseLoad: (verseText) => {
      prefetchVerse(verseText, lookupFn);
    },

    /**
     * Call when user hovers over a word
     * @param {string} word - Hovered word
     */
    onWordHover: (word) => {
      prefetchWord(word, lookupFn);
    },

    /**
     * Call when navigating to a new chapter/passage
     * @param {Array<string>} verses - New verses
     */
    onNavigate: (verses) => {
      clearPrefetchQueue();
      prefetchVerses(verses, lookupFn);
    },

    /**
     * Call on component unmount
     */
    onCleanup: () => {
      clearPrefetchQueue();
    }
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

const wordPrefetchService = {
  prefetchVerse,
  prefetchVerses,
  prefetchWord,
  clearPrefetchQueue,
  getPrefetchStatus,
  warmupCommonWords,
  createPrefetchHandlers,
  PREFETCH_CONFIG
};

export default wordPrefetchService;
