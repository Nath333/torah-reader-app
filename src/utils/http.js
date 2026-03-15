// =============================================================================
// HTTP Utility
// Provides fetch with timeout, proxy fallback, and request deduplication
// =============================================================================

const PROXY_URL = 'https://api.allorigins.win/get?url=';

// Request deduplication - prevents duplicate concurrent requests to the same URL
const pendingRequests = new Map();

/**
 * Fetch with configurable timeout using AbortController
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
};

/**
 * Internal fetch implementation with proxy fallback
 */
const fetchWithFallbackInternal = async (url, options = {}) => {
  const {
    timeout = 10000,
    proxyTimeout = 15000,
    headers = {}
  } = options;

  // Try direct fetch first
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    }, timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (directError) {
    // Fall back to proxy
    try {
      const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
      const response = await fetchWithTimeout(proxyUrl, {}, proxyTimeout);

      if (!response.ok) {
        throw new Error(`Proxy HTTP ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.contents);
    } catch (proxyError) {
      // Both failed - throw combined error
      throw new Error(
        `Direct: ${directError.message}, Proxy: ${proxyError.message}`
      );
    }
  }
};

/**
 * Fetch with automatic proxy fallback and request deduplication
 * Prevents duplicate concurrent requests to the same URL
 * @param {string} url - URL to fetch
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @param {number} options.proxyTimeout - Proxy timeout in ms (default: 15000)
 * @param {Object} options.headers - Additional headers
 * @param {boolean} options.dedupe - Enable request deduplication (default: true)
 * @returns {Promise<Object>} Parsed JSON response
 */
export const fetchWithFallback = async (url, options = {}) => {
  const { dedupe = true, ...restOptions } = options;

  // If deduplication is disabled, just fetch directly
  if (!dedupe) {
    return fetchWithFallbackInternal(url, restOptions);
  }

  // Check if there's already a pending request for this URL
  if (pendingRequests.has(url)) {
    // Return the existing promise - all callers will get the same result
    return pendingRequests.get(url);
  }

  // Create new request and store it
  const requestPromise = fetchWithFallbackInternal(url, restOptions)
    .finally(() => {
      // Clean up after request completes (success or failure)
      pendingRequests.delete(url);
    });

  pendingRequests.set(url, requestPromise);
  return requestPromise;
};

/**
 * Clear all pending requests (useful for cleanup)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
};

/**
 * Get count of pending requests (useful for debugging)
 */
export const getPendingRequestCount = () => pendingRequests.size;

/**
 * Create a configured API fetcher for a specific base URL
 * @param {string} baseUrl - Base URL for all requests
 * @param {Object} defaultOptions - Default options for all requests
 * @returns {Function} Configured fetch function
 */
export const createApiFetcher = (baseUrl, defaultOptions = {}) => {
  return async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint}`;
    return fetchWithFallback(url, { ...defaultOptions, ...options });
  };
};

const httpUtils = {
  fetchWithTimeout,
  fetchWithFallback,
  createApiFetcher,
  clearPendingRequests,
  getPendingRequestCount
};

export default httpUtils;
