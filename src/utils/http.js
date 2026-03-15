// =============================================================================
// HTTP Utility
// Provides fetch with timeout and proxy fallback
// =============================================================================

const PROXY_URL = 'https://api.allorigins.win/get?url=';

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
 * Fetch with automatic proxy fallback for CORS issues
 * Tries direct fetch first, falls back to proxy if it fails
 * @param {string} url - URL to fetch
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @param {number} options.proxyTimeout - Proxy timeout in ms (default: 15000)
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Object>} Parsed JSON response
 */
export const fetchWithFallback = async (url, options = {}) => {
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

const httpUtils = { fetchWithTimeout, fetchWithFallback, createApiFetcher };
export default httpUtils;
