/**
 * Chain Cache Utility
 * 
 * Smart caching system for halachic chain data.
 * Uses localStorage with size limits and expiration.
 * Implements SWR (stale-while-revalidate) pattern.
 */

const CACHE_KEY_PREFIX = 'halachic_chain_';
const MAX_CACHE_SIZE = 50; // Maximum number of cached chains
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cache key from reference and options
 */
export const generateCacheKey = (reference, options) => {
  const optionsHash = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  return `${CACHE_KEY_PREFIX}${reference}_${optionsHash}`;
};

/**
 * Get cached chain data
 * @param {string} key - Cache key
 * @returns {Object|null} Cached data or null if expired/missing
 */
export const getCache = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { data, timestamp, version } = JSON.parse(item);
    
    // Check expiration
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }

    // Check version (for future migrations)
    if (version !== '1.0') {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
};

/**
 * Store chain data in cache
 * @param {string} key - Cache key
 * @param {Object} data - Chain data to cache
 */
export const setCache = (key, data) => {
  try {
    // Check cache size and clean if needed
    cleanupCacheIfNeeded();

    const cacheItem = {
      data,
      timestamp: Date.now(),
      version: '1.0'
    };

    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    // If quota exceeded, clear old entries and try again
    if (error.name === 'QuotaExceededError') {
      cleanupCacheIfNeeded(true);
      try {
        localStorage.setItem(key, JSON.stringify({
          data,
          timestamp: Date.now(),
          version: '1.0'
        }));
      } catch (retryError) {
        console.warn('Cache write failed after cleanup:', retryError);
      }
    } else {
      console.warn('Cache write error:', error);
    }
  }
};

/**
 * Remove cached item
 * @param {string} key - Cache key to remove
 */
export const removeCache = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Cache remove error:', error);
  }
};

/**
 * Clear all halachic chain caches
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
};

/**
 * Clean up old cache entries if size limit reached
 * @param {boolean} aggressive - If true, remove more entries
 */
const cleanupCacheIfNeeded = (aggressive = false) => {
  try {
    const cacheKeys = Object.keys(localStorage).filter(k => 
      k.startsWith(CACHE_KEY_PREFIX)
    );

    if (cacheKeys.length < MAX_CACHE_SIZE) return;

    // Get all cache items with timestamps
    const items = cacheKeys.map(key => {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        return { key, timestamp: item.timestamp };
      } catch {
        return { key, timestamp: 0 };
      }
    });

    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const removeCount = aggressive ? Math.ceil(items.length * 0.5) : items.length - MAX_CACHE_SIZE + 5;
    items.slice(0, removeCount).forEach(({ key }) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Cache cleanup error:', error);
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => {
  try {
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith(CACHE_KEY_PREFIX)
    );

    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      totalSize += item.length;
      try {
        const parsed = JSON.parse(item);
        oldestTimestamp = Math.min(oldestTimestamp, parsed.timestamp);
        newestTimestamp = Math.max(newestTimestamp, parsed.timestamp);
      } catch {}
    });

    return {
      entryCount: keys.length,
      totalSizeKB: Math.round(totalSize / 1024),
      oldestEntry: oldestTimestamp === Date.now() ? null : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp)
    };
  } catch (error) {
    return { error: error.message };
  }
};

export default {
  generateCacheKey,
  getCache,
  setCache,
  removeCache,
  clearAllCache,
  getCacheStats
};
