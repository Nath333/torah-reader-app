// =============================================================================
// CACHE ORCHESTRATOR - PRO SCHOLAR V6
// Unified cache management and telemetry for all services
// =============================================================================

/**
 * CacheOrchestrator provides centralized cache management across all services.
 *
 * Features:
 * - Register and track all cache instances
 * - Unified telemetry and performance metrics
 * - Global cache operations (clear, prune)
 * - Memory usage estimation
 * - Hit rate analytics across services
 * - LRU eviction policy support
 *
 * PRO SCHOLAR V8: Consolidated from wordLookupCache.js + cacheOrchestrator.js
 * This is now the single source of truth for all caching in the app.
 *
 * @module CacheOrchestrator
 */

import { createCache, CACHE_PRESETS } from '../utils/cache';

// =============================================================================
// CACHE REGISTRY
// =============================================================================

const registeredCaches = new Map();
const telemetryHistory = [];
const MAX_HISTORY = 100;

/**
 * Cache configuration for different service types
 */
export const CACHE_CONFIGS = {
  rootExtraction: {
    name: 'Root Extraction',
    category: 'linguistic',
    maxSize: 500,
    ttl: 60 * 60 * 1000, // 1 hour
    priority: 'high'
  },
  wordLookup: {
    name: 'Word Lookup',
    category: 'dictionary',
    maxSize: 500,
    ttl: 5 * 60 * 1000, // 5 minutes
    priority: 'high'
  },
  translation: {
    name: 'Translation',
    category: 'dictionary',
    maxSize: 5000,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    priority: 'medium'
  },
  commentary: {
    name: 'Commentary',
    category: 'content',
    maxSize: 200,
    ttl: 30 * 60 * 1000, // 30 minutes
    priority: 'medium'
  },
  verse: {
    name: 'Verse',
    category: 'content',
    maxSize: 300,
    ttl: 60 * 60 * 1000, // 1 hour
    priority: 'low'
  },
  api: {
    name: 'API Response',
    category: 'network',
    maxSize: 500,
    ttl: 10 * 60 * 1000, // 10 minutes
    priority: 'high'
  },
  semanticField: {
    name: 'Semantic Field',
    category: 'linguistic',
    maxSize: 300,
    ttl: 60 * 60 * 1000, // 1 hour
    priority: 'low'
  },
  binyanAnalysis: {
    name: 'Binyan Analysis',
    category: 'linguistic',
    maxSize: 300,
    ttl: 60 * 60 * 1000, // 1 hour
    priority: 'low'
  }
};

// =============================================================================
// CACHE REGISTRATION
// =============================================================================

/**
 * Register a cache instance with the orchestrator
 *
 * @param {string} id - Unique cache identifier
 * @param {Object} cacheInstance - Cache object with get, set, clear, stats methods
 * @param {Object} config - Optional configuration override
 * @returns {boolean} Success status
 *
 * @example
 * import { registerCache } from './cacheOrchestrator';
 * import { createCache } from '../utils/cache';
 *
 * const myCache = createCache({ maxSize: 100, ttl: 60000 });
 * registerCache('myService', myCache, { category: 'custom', name: 'My Service' });
 */
export function registerCache(id, cacheInstance, config = {}) {
  if (!id || !cacheInstance) {
    console.warn('[CacheOrchestrator] Invalid cache registration:', id);
    return false;
  }

  const defaultConfig = CACHE_CONFIGS[id] || {
    name: id,
    category: 'other',
    maxSize: 100,
    ttl: 300000,
    priority: 'low'
  };

  registeredCaches.set(id, {
    instance: cacheInstance,
    config: { ...defaultConfig, ...config },
    registeredAt: Date.now(),
    hits: 0,
    misses: 0
  });

  return true;
}

/**
 * Unregister a cache instance
 * @param {string} id - Cache identifier
 */
export function unregisterCache(id) {
  return registeredCaches.delete(id);
}

/**
 * Get a registered cache by ID
 * @param {string} id - Cache identifier
 * @returns {Object|null} Cache instance or null
 */
export function getCache(id) {
  const entry = registeredCaches.get(id);
  return entry?.instance || null;
}

// =============================================================================
// TELEMETRY
// =============================================================================

/**
 * Record a cache operation for telemetry
 * @param {string} cacheId - Cache identifier
 * @param {string} operation - 'hit' or 'miss'
 * @param {number} lookupTimeMs - Time taken for lookup
 */
export function recordOperation(cacheId, operation, lookupTimeMs = 0) {
  const entry = registeredCaches.get(cacheId);
  if (!entry) return;

  if (operation === 'hit') {
    entry.hits++;
  } else if (operation === 'miss') {
    entry.misses++;
  }

  // Record in history
  telemetryHistory.push({
    cacheId,
    operation,
    lookupTimeMs,
    timestamp: Date.now()
  });

  // Prune history if too large
  if (telemetryHistory.length > MAX_HISTORY) {
    telemetryHistory.shift();
  }
}

/**
 * Get global telemetry data
 * @returns {Object} Aggregated telemetry metrics
 */
export function getGlobalTelemetry() {
  let totalHits = 0;
  let totalMisses = 0;
  let totalSize = 0;
  let totalMaxSize = 0;

  const byCache = {};
  const byCategory = {};

  registeredCaches.forEach((entry, id) => {
    const stats = entry.instance.stats?.() || {};
    const hits = entry.hits;
    const misses = entry.misses;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : 'N/A';

    totalHits += hits;
    totalMisses += misses;
    totalSize += stats.size || 0;
    totalMaxSize += stats.maxSize || entry.config.maxSize || 0;

    byCache[id] = {
      name: entry.config.name,
      category: entry.config.category,
      hits,
      misses,
      hitRate,
      size: stats.size || 0,
      maxSize: stats.maxSize || entry.config.maxSize,
      utilization: stats.size && stats.maxSize
        ? ((stats.size / stats.maxSize) * 100).toFixed(1) + '%'
        : 'N/A',
      priority: entry.config.priority
    };

    // Aggregate by category
    const cat = entry.config.category;
    if (!byCategory[cat]) {
      byCategory[cat] = { hits: 0, misses: 0, size: 0, caches: [] };
    }
    byCategory[cat].hits += hits;
    byCategory[cat].misses += misses;
    byCategory[cat].size += stats.size || 0;
    byCategory[cat].caches.push(id);
  });

  // Calculate category hit rates
  Object.keys(byCategory).forEach(cat => {
    const { hits, misses } = byCategory[cat];
    const total = hits + misses;
    byCategory[cat].hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : 'N/A';
  });

  const globalTotal = totalHits + totalMisses;

  return {
    global: {
      totalCaches: registeredCaches.size,
      totalHits,
      totalMisses,
      hitRate: globalTotal > 0 ? ((totalHits / globalTotal) * 100).toFixed(1) + '%' : 'N/A',
      totalSize,
      totalMaxSize,
      utilization: totalMaxSize > 0
        ? ((totalSize / totalMaxSize) * 100).toFixed(1) + '%'
        : 'N/A',
      estimatedMemoryMB: (totalSize * 0.5 / 1024).toFixed(2) // Rough estimate: 500 bytes per entry
    },
    byCache,
    byCategory,
    recentOps: telemetryHistory.slice(-20),
    timestamp: Date.now()
  };
}

/**
 * Get performance metrics for a specific time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Performance metrics
 */
export function getPerformanceMetrics(windowMs = 60000) {
  const cutoff = Date.now() - windowMs;
  const recentOps = telemetryHistory.filter(op => op.timestamp >= cutoff);

  const hits = recentOps.filter(op => op.operation === 'hit').length;
  const misses = recentOps.filter(op => op.operation === 'miss').length;
  const total = hits + misses;

  const avgLookupMs = recentOps.length > 0
    ? (recentOps.reduce((sum, op) => sum + (op.lookupTimeMs || 0), 0) / recentOps.length).toFixed(2)
    : 0;

  return {
    windowMs,
    operations: total,
    hits,
    misses,
    hitRate: total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : 'N/A',
    avgLookupMs,
    opsPerSecond: total > 0 ? (total / (windowMs / 1000)).toFixed(2) : 0
  };
}

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Clear all registered caches
 * @param {Object} options - Clear options
 * @param {string[]} options.categories - Only clear specific categories
 * @param {string[]} options.ids - Only clear specific cache IDs
 */
export function clearAllCaches(options = {}) {
  const { categories, ids } = options;

  registeredCaches.forEach((entry, id) => {
    const shouldClear =
      (!categories || categories.includes(entry.config.category)) &&
      (!ids || ids.includes(id));

    if (shouldClear && entry.instance.clear) {
      entry.instance.clear();
      entry.hits = 0;
      entry.misses = 0;
    }
  });

  // Clear telemetry history
  telemetryHistory.length = 0;
}

/**
 * Prune expired entries from all caches
 * Note: This only works for caches that implement a prune method
 */
export function pruneExpiredEntries() {
  let prunedCount = 0;

  registeredCaches.forEach((entry) => {
    if (entry.instance.prune) {
      prunedCount += entry.instance.prune();
    }
  });

  return prunedCount;
}

/**
 * Get memory pressure status
 * @returns {Object} Memory pressure info
 */
export function getMemoryPressure() {
  const telemetry = getGlobalTelemetry();
  const utilization = parseFloat(telemetry.global.utilization) || 0;

  return {
    level: utilization > 90 ? 'critical' : utilization > 75 ? 'high' : utilization > 50 ? 'moderate' : 'low',
    utilization: telemetry.global.utilization,
    recommendation: utilization > 75
      ? 'Consider clearing low-priority caches'
      : 'Cache utilization is healthy',
    lowPriorityCaches: Object.entries(telemetry.byCache)
      .filter(([_, cache]) => cache.priority === 'low' && parseFloat(cache.utilization) > 50)
      .map(([id]) => id)
  };
}

/**
 * Auto-manage caches based on memory pressure
 * Clears low-priority caches when utilization is high
 */
export function autoManageCaches() {
  const pressure = getMemoryPressure();

  if (pressure.level === 'critical' || pressure.level === 'high') {
    // Clear low-priority caches first
    clearAllCaches({
      ids: pressure.lowPriorityCaches
    });

    return {
      action: 'cleared',
      clearedCaches: pressure.lowPriorityCaches,
      newPressure: getMemoryPressure()
    };
  }

  return {
    action: 'none',
    reason: 'Memory pressure is acceptable'
  };
}

// =============================================================================
// HOOK HELPER
// =============================================================================

/**
 * Create a cache with automatic orchestrator registration
 *
 * @param {string} id - Cache identifier
 * @param {Object} options - Cache options (ttl, maxSize)
 * @returns {Object} Cache instance
 */
export function createManagedCache(id, options = {}) {
  const config = CACHE_CONFIGS[id] || {};
  const finalOptions = {
    maxSize: options.maxSize || config.maxSize || 100,
    ttl: options.ttl || config.ttl || 300000
  };

  const cache = createCache(finalOptions);

  // Wrap methods to record telemetry
  const originalGet = cache.get;
  const originalSet = cache.set;

  cache.get = (...args) => {
    const start = performance.now();
    const result = originalGet.apply(cache, args);
    const elapsed = performance.now() - start;

    recordOperation(id, result !== null ? 'hit' : 'miss', elapsed);
    return result;
  };

  cache.set = (...args) => {
    return originalSet.apply(cache, args);
  };

  // Register with orchestrator
  registerCache(id, cache, options);

  return cache;
}

// =============================================================================
// ADVANCED LRU CACHE CLASS (Consolidated from wordLookupCache.js)
// =============================================================================

/**
 * Cache entry with access tracking for LRU eviction
 */
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

/**
 * Advanced cache with LRU eviction, TTL, and metrics
 * Use this for high-performance caching needs
 */
export class WordLookupCache {
  constructor(config = {}) {
    this.config = {
      maxSize: 500,
      ttl: 5 * 60 * 1000, // 5 minutes
      evictionPolicy: 'lru',
      ...config
    };
    this.cache = new Map();
    this.metrics = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    if (entry.isExpired(this.config.ttl)) {
      this.cache.delete(key);
      this.metrics.expirations++;
      this.metrics.misses++;
      return null;
    }
    entry.touch();
    this.metrics.hits++;
    return entry.value;
  }

  set(key, value) {
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this._evict();
    }
    this.cache.set(key, new CacheEntry(key, value));
    return true;
  }

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

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  stats() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      ...this.metrics,
      hitRate: total > 0 ? `${(this.metrics.hits / total * 100).toFixed(1)}%` : 'N/A'
    };
  }

  _evict() {
    if (this.config.evictionPolicy === 'lru') {
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
    } else {
      // FIFO eviction
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.metrics.evictions++;
      }
    }
  }

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
    return removed;
  }
}

// Singleton instance for word lookups (backwards compatibility)
const wordLookupCache = new WordLookupCache({
  maxSize: 500,
  ttl: 5 * 60 * 1000,
  evictionPolicy: 'lru'
});

// Periodic cleanup (every 2 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => wordLookupCache.cleanup(), 2 * 60 * 1000);
}

// =============================================================================
// EXPORTS
// =============================================================================

const CacheOrchestrator = {
  // Registration
  registerCache,
  unregisterCache,
  getCache,

  // Telemetry
  recordOperation,
  getGlobalTelemetry,
  getPerformanceMetrics,

  // Operations
  clearAllCaches,
  pruneExpiredEntries,
  getMemoryPressure,
  autoManageCaches,

  // Factory
  createManagedCache,

  // Constants
  CACHE_CONFIGS,
  CACHE_PRESETS,

  // Advanced LRU cache
  WordLookupCache,
  wordLookupCache
};

export { wordLookupCache };
export default CacheOrchestrator;
