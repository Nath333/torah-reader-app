// =============================================================================
// Cache LRU des diagrammes — ÉTAT partagé du service (TTL 5 min, 150 entrées)
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// PRO SCHOLAR CACHING - LRU Cache with TTL for optimal performance
// =============================================================================

/**
 * LRU Cache with TTL support for diagram caching
 * @class LRUCache
 */
class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key, data) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

const diagramCache = new LRUCache(150, 5 * 60 * 1000);

export function getCachedDiagram(key) {
  return diagramCache.get(key);
}

export function setCachedDiagram(key, data) {
  diagramCache.set(key, data);
}

/**
 * Clear the diagram cache
 * @returns {void}
 */
export function clearDiagramCache() {
  diagramCache.clear();
}

/**
 * Get cache statistics for monitoring
 * @returns {{ size: number, maxSize: number, hits: number, misses: number, hitRate: string }}
 */
export function getCacheStats() {
  return diagramCache.getStats();
}
