/**
 * PRO SCHOLAR V5: Unified Word Lookup Cache Service
 *
 * Consolidates the multiple cache implementations into a single service:
 * - useWordLookup.js: resultCache (100 entries, no TTL)
 * - wordLookupOrchestrator.js: _lookupCache (500 entries, 5-min TTL)
 * - smartDataService.js: IndexedDB cache
 *
 * Features:
 * - Configurable max size with FIFO eviction
 * - TTL (time-to-live) for entries
 * - Access tracking for LRU eviction option
 * - Cache statistics and monitoring
 * - Singleton pattern for app-wide consistency
 */

import { createLogger } from '../utils/debug';

const log = createLogger('WordLookupCache');

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  maxSize: 500,           // Maximum number of entries
  ttl: 5 * 60 * 1000,     // 5 minutes TTL
  evictionPolicy: 'lru',  // 'fifo' or 'lru'
  enableMetrics: process.env.NODE_ENV === 'development'
};

// =============================================================================
// CACHE ENTRY
// =============================================================================

class CacheEntry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.timestamp = Date.now();
    this.lastAccess = Date.now();
    this.accessCount = 1;
  }

  isExpired(ttl) {
    return Date.now() - this.timestamp > ttl;
  }

  touch() {
    this.lastAccess = Date.now();
    this.accessCount++;
  }
}

// =============================================================================
// UNIFIED CACHE SERVICE
// =============================================================================

class WordLookupCache {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key (usually the word)
   * @returns {*} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check TTL
    if (entry.isExpired(this.config.ttl)) {
      this.cache.delete(key);
      this.metrics.expirations++;
      this.metrics.misses++;
      return null;
    }

    // Update access tracking
    entry.touch();
    this.metrics.hits++;

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @returns {boolean} - True if successful
   */
  set(key, value) {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this._evict();
    }

    const entry = new CacheEntry(key, value);
    this.cache.set(key, entry);

    return true;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.isExpired(this.config.ttl)) {
      this.cache.delete(key);
      this.metrics.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete a specific entry
   * @param {string} key - Cache key
   * @returns {boolean} - True if deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    log.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total * 100).toFixed(1) : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: `${hitRate}%`,
      evictions: this.metrics.evictions,
      expirations: this.metrics.expirations
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * Evict entries based on policy
   * @private
   */
  _evict() {
    if (this.config.evictionPolicy === 'lru') {
      this._evictLRU();
    } else {
      this._evictFIFO();
    }
  }

  /**
   * FIFO eviction - remove oldest entry
   * @private
   */
  _evictFIFO() {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.metrics.evictions++;
    }
  }

  /**
   * LRU eviction - remove least recently accessed
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Clean up expired entries (can be called periodically)
   * @returns {number} - Number of entries removed
   */
  cleanup() {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
        this.metrics.expirations++;
        removed++;
      }
    }

    if (removed > 0) {
      log.debug(`Cleanup removed ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Get all cached keys (for debugging)
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entry metadata (for debugging)
   * @param {string} key
   * @returns {Object|null}
   */
  getEntryMeta(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      key: entry.key,
      timestamp: entry.timestamp,
      lastAccess: entry.lastAccess,
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp,
      isExpired: entry.isExpired(this.config.ttl)
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

// Global cache instance for word lookups
const wordLookupCache = new WordLookupCache({
  maxSize: 500,
  ttl: 5 * 60 * 1000, // 5 minutes
  evictionPolicy: 'lru'
});

// Periodic cleanup (every 2 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    wordLookupCache.cleanup();
  }, 2 * 60 * 1000);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  WordLookupCache,
  wordLookupCache
};

export default wordLookupCache;
