// =============================================================================
// Unified Cache Utility
// Provides consistent caching across all services
// =============================================================================

/**
 * Create a cache instance with configurable TTL and size limit
 * @param {Object} options - Cache configuration
 * @param {number} options.ttl - Time to live in milliseconds (default: 5 minutes)
 * @param {number} options.maxSize - Maximum number of entries (default: 500)
 * @returns {Object} Cache instance with get, set, has, delete, clear methods
 */
export const createCache = (options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    maxSize = 500
  } = options;

  const cache = new Map();

  /**
   * Get cached data if it exists and hasn't expired
   * @param {string} key - Cache key
   * @returns {*} Cached data or null if not found/expired
   */
  const get = (key) => {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttl) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  };

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  const set = (key, data) => {
    // Enforce size limit by removing oldest entry
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  };

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  const has = (key) => {
    return get(key) !== null;
  };

  /**
   * Delete a specific key
   * @param {string} key - Cache key
   */
  const remove = (key) => {
    cache.delete(key);
  };

  /**
   * Clear all cached data
   */
  const clear = () => {
    cache.clear();
  };

  /**
   * Get cache statistics
   * @returns {Object} Stats including size and hit rate
   */
  const stats = () => ({
    size: cache.size,
    maxSize,
    ttl
  });

  return {
    get,
    set,
    has,
    delete: remove,
    clear,
    stats
  };
};

// =============================================================================
// Higher-Order Function: Cached Fetcher
// Wraps any async function with automatic caching
// =============================================================================

/**
 * Cache presets for common use cases
 */
export const CACHE_PRESETS = {
  // Fast-changing data (API responses, live data)
  fast: { ttl: 10 * 60 * 1000, maxSize: 500 },      // 10 minutes
  // Standard data (commentary, translations)
  standard: { ttl: 30 * 60 * 1000, maxSize: 200 },  // 30 minutes
  // Stable data (reference data, metadata)
  stable: { ttl: 60 * 60 * 1000, maxSize: 300 },    // 1 hour
  // Long-lived data (dictionary, scholarly)
  persistent: { ttl: 24 * 60 * 60 * 1000, maxSize: 1000 }, // 24 hours
  // Translations (very long-lived)
  translations: { ttl: 7 * 24 * 60 * 60 * 1000, maxSize: 5000 } // 7 days
};

/**
 * Create a cached version of an async function
 * Eliminates boilerplate cache checking in every service
 *
 * @param {Function} fetcher - Async function to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.prefix - Cache key prefix (e.g., 'rashi', 'translation')
 * @param {Function} options.keyGenerator - Custom key generator (args) => string
 * @param {number} options.ttl - Time to live in milliseconds
 * @param {number} options.maxSize - Maximum cache entries
 * @param {string} options.preset - Use a preset ('fast', 'standard', 'stable', 'persistent')
 * @returns {Object} { fetch, clear, stats, cache }
 *
 * @example
 * // Simple usage with prefix
 * const { fetch: getRashi } = createCachedFetcher(
 *   async (book, chapter, verse) => fetchFromApi(book, chapter, verse),
 *   { prefix: 'rashi', preset: 'standard' }
 * );
 *
 * @example
 * // Custom key generator
 * const { fetch, clear } = createCachedFetcher(
 *   async (params) => api.fetch(params),
 *   {
 *     keyGenerator: (params) => `${params.book}:${params.chapter}`,
 *     ttl: 60000
 *   }
 * );
 */
export const createCachedFetcher = (fetcher, options = {}) => {
  const {
    prefix = 'cache',
    keyGenerator,
    preset,
    ...cacheOptions
  } = options;

  // Use preset if specified, otherwise use provided options
  const finalOptions = preset && CACHE_PRESETS[preset]
    ? { ...CACHE_PRESETS[preset], ...cacheOptions }
    : cacheOptions;

  const cache = createCache(finalOptions);

  // Track stats
  let hits = 0;
  let misses = 0;

  /**
   * Generate cache key from arguments
   */
  const generateKey = (...args) => {
    if (keyGenerator) {
      return keyGenerator(...args);
    }
    // Default: serialize args to JSON with prefix
    const argsKey = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(':');
    return `${prefix}:${argsKey}`;
  };

  /**
   * Cached fetch function
   */
  const fetch = async (...args) => {
    const key = generateKey(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      hits++;
      return cached;
    }

    misses++;
    const result = await fetcher(...args);
    cache.set(key, result);
    return result;
  };

  /**
   * Get cache statistics
   */
  const stats = () => ({
    ...cache.stats(),
    hits,
    misses,
    hitRate: hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(1) + '%' : 'N/A'
  });

  /**
   * Clear cache and reset stats
   */
  const clear = () => {
    cache.clear();
    hits = 0;
    misses = 0;
  };

  return {
    fetch,
    clear,
    stats,
    cache // Expose raw cache for advanced usage
  };
};

/**
 * Decorator version for class methods or object methods
 *
 * @example
 * const cachedApi = withCache(api, ['getText', 'getCommentary'], { preset: 'standard' });
 */
export const withCache = (target, methodNames, options = {}) => {
  const cached = { ...target };
  const caches = {};

  methodNames.forEach(methodName => {
    if (typeof target[methodName] === 'function') {
      const { fetch, clear, stats, cache } = createCachedFetcher(
        target[methodName].bind(target),
        { prefix: methodName, ...options }
      );
      cached[methodName] = fetch;
      caches[methodName] = { clear, stats, cache };
    }
  });

  // Add utility methods
  cached._clearAllCaches = () => Object.values(caches).forEach(c => c.clear());
  cached._getStats = () => Object.fromEntries(
    Object.entries(caches).map(([name, c]) => [name, c.stats()])
  );

  return cached;
};

// Pre-configured cache instances for common use cases
export const apiCache = createCache(CACHE_PRESETS.fast);
export const translationCache = createCache(CACHE_PRESETS.translations);
export const verseCache = createCache(CACHE_PRESETS.stable);

const cacheUtils = {
  createCache,
  createCachedFetcher,
  withCache,
  CACHE_PRESETS,
  apiCache,
  translationCache,
  verseCache
};
export default cacheUtils;
