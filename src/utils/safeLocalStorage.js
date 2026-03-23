/**
 * Safe LocalStorage Wrapper
 *
 * Provides error-safe localStorage operations with:
 * - Automatic JSON parsing/stringifying
 * - Quota exceeded handling
 * - Parse error fallbacks
 * - SSR/Node.js compatibility
 */

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
export const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safely get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or parse fails
 * @returns {*} Parsed value or default
 */
export const safeGet = (key, defaultValue = null) => {
  try {
    if (!isLocalStorageAvailable()) return defaultValue;

    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;

    // Try to parse as JSON, fall back to raw string
    try {
      return JSON.parse(item);
    } catch {
      // Not JSON, return as-is
      return item;
    }
  } catch (error) {
    console.warn(`[SafeLocalStorage] Get failed for "${key}":`, error.message);
    return defaultValue;
  }
};

/**
 * Safely set item in localStorage with JSON stringifying
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified if object)
 * @returns {boolean} Success status
 */
export const safeSet = (key, value) => {
  try {
    if (!isLocalStorageAvailable()) return false;

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn(`[SafeLocalStorage] Quota exceeded when setting "${key}". Attempting cleanup...`);
      // Try to clear old/expired items and retry
      cleanupExpiredItems();
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
      } catch {
        console.error(`[SafeLocalStorage] Still failed after cleanup for "${key}"`);
        return false;
      }
    }
    console.error(`[SafeLocalStorage] Set failed for "${key}":`, error.message);
    return false;
  }
};

/**
 * Safely remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export const safeRemove = (key) => {
  try {
    if (!isLocalStorageAvailable()) return false;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[SafeLocalStorage] Remove failed for "${key}":`, error.message);
    return false;
  }
};

/**
 * Safely clear all localStorage
 * @returns {boolean} Success status
 */
export const safeClear = () => {
  try {
    if (!isLocalStorageAvailable()) return false;
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('[SafeLocalStorage] Clear failed:', error.message);
    return false;
  }
};

/**
 * Get storage usage statistics
 * @returns {{ used: number, total: number, percentage: number } | null}
 */
export const getStorageStats = () => {
  try {
    if (!isLocalStorageAvailable()) return null;

    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      used += (key.length + value.length) * 2; // UTF-16 = 2 bytes per char
    }

    // Most browsers have 5MB limit
    const total = 5 * 1024 * 1024;
    return {
      used,
      total,
      percentage: Math.round((used / total) * 100),
      usedMB: (used / (1024 * 1024)).toFixed(2),
    };
  } catch {
    return null;
  }
};

/**
 * Clean up expired items (items with _expires suffix)
 * Convention: Store expiry as key_expires with timestamp
 */
export const cleanupExpiredItems = () => {
  try {
    if (!isLocalStorageAvailable()) return;

    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.endsWith('_expires')) {
        const expiry = parseInt(localStorage.getItem(key), 10);
        if (expiry && expiry < now) {
          const dataKey = key.replace('_expires', '');
          keysToRemove.push(key, dataKey);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.debug(`[SafeLocalStorage] Cleaned up ${keysToRemove.length / 2} expired items`);
    }
  } catch (error) {
    console.warn('[SafeLocalStorage] Cleanup failed:', error.message);
  }
};

/**
 * Set item with expiration
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean} Success status
 */
export const safeSetWithExpiry = (key, value, ttlMs) => {
  const success = safeSet(key, value);
  if (success) {
    safeSet(`${key}_expires`, Date.now() + ttlMs);
  }
  return success;
};

/**
 * Get item with expiration check
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if expired or not found
 * @returns {*} Value or default
 */
export const safeGetWithExpiry = (key, defaultValue = null) => {
  const expiry = safeGet(`${key}_expires`);
  if (expiry && Date.now() > expiry) {
    safeRemove(key);
    safeRemove(`${key}_expires`);
    return defaultValue;
  }
  return safeGet(key, defaultValue);
};

const safeLocalStorage = {
  get: safeGet,
  set: safeSet,
  remove: safeRemove,
  clear: safeClear,
  getWithExpiry: safeGetWithExpiry,
  setWithExpiry: safeSetWithExpiry,
  getStats: getStorageStats,
  cleanup: cleanupExpiredItems,
  isAvailable: isLocalStorageAvailable,
};

export default safeLocalStorage;
