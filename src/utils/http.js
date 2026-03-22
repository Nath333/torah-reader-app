// =============================================================================
// HTTP Utility
// Provides fetch with timeout, proxy fallback, and request deduplication
// =============================================================================

const PROXY_URL = 'https://api.allorigins.win/get?url=';

// Request deduplication - prevents duplicate concurrent requests to the same URL
const pendingRequests = new Map();

// =============================================================================
// Rate Limit Handling
// =============================================================================

// Track rate limit status per domain
const rateLimitState = new Map();

/**
 * Check if a domain is currently rate limited
 * @param {string} url - URL to check
 * @returns {boolean} - True if rate limited
 */
const isRateLimited = (url) => {
  try {
    const domain = new URL(url).hostname;
    const state = rateLimitState.get(domain);
    if (!state) return false;

    // Check if rate limit has expired
    if (Date.now() > state.resetTime) {
      rateLimitState.delete(domain);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Mark a domain as rate limited
 * @param {string} url - URL that was rate limited
 * @param {number} retryAfter - Seconds to wait (from Retry-After header)
 */
const markRateLimited = (url, retryAfter = 60) => {
  try {
    const domain = new URL(url).hostname;
    const resetTime = Date.now() + (retryAfter * 1000);
    rateLimitState.set(domain, {
      resetTime,
      hitCount: (rateLimitState.get(domain)?.hitCount || 0) + 1
    });
    console.warn(`[HTTP] Rate limited by ${domain}, waiting ${retryAfter}s`);
  } catch {
    // Ignore URL parsing errors
  }
};

/**
 * Get rate limit status for monitoring
 * @returns {Object} - Map of domain -> rate limit info
 */
export const getRateLimitStatus = () => {
  const status = {};
  const now = Date.now();
  for (const [domain, state] of rateLimitState.entries()) {
    if (now < state.resetTime) {
      status[domain] = {
        limited: true,
        resetIn: Math.ceil((state.resetTime - now) / 1000),
        hitCount: state.hitCount
      };
    }
  }
  return status;
};

/**
 * Fetch with configurable timeout using AbortController
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @param {AbortSignal} externalSignal - External abort signal for cancellation
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000, externalSignal = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link external signal to our controller
  const abortHandler = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', abortHandler);
  }

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
      // Re-throw as AbortError if externally aborted
      if (externalSignal?.aborted) {
        throw error;
      }
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortHandler);
    }
  }
};

/**
 * Internal fetch implementation with proxy fallback and rate limit handling
 */
const fetchWithFallbackInternal = async (url, options = {}) => {
  const {
    timeout = 10000,
    proxyTimeout = 15000,
    headers = {},
    signal = null,
    responseType = 'json' // 'json' or 'text'
  } = options;

  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Check if domain is rate limited - return null to trigger fallback to local
  if (isRateLimited(url)) {
    const err = new Error('Rate limited - using local fallback');
    err.isRateLimited = true;
    throw err;
  }

  // Try direct fetch first
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': responseType === 'text' ? 'text/html, text/plain' : 'application/json',
        ...headers
      }
    }, timeout, signal);

    // Handle rate limiting (429 Too Many Requests)
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      markRateLimited(url, retryAfter);
      const err = new Error(`Rate limited (429) - retry after ${retryAfter}s`);
      err.isRateLimited = true;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return responseType === 'text' ? await response.text() : await response.json();
  } catch (directError) {
    // Don't fall back to proxy if request was aborted
    if (directError.name === 'AbortError') {
      throw directError;
    }

    // Don't fall back to proxy if rate limited
    if (directError.isRateLimited) {
      throw directError;
    }

    // Fall back to proxy (only for JSON - proxy doesn't work well with HTML)
    if (responseType === 'text') {
      throw directError;
    }

    // Don't use external proxy for local paths (they're already proxied)
    if (url.startsWith('/')) {
      throw directError;
    }

    try {
      const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
      const response = await fetchWithTimeout(proxyUrl, {}, proxyTimeout, signal);

      // Handle rate limiting from proxy too
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        markRateLimited(url, retryAfter);
        const err = new Error(`Proxy rate limited (429)`);
        err.isRateLimited = true;
        throw err;
      }

      if (!response.ok) {
        throw new Error(`Proxy HTTP ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.contents);
    } catch (proxyError) {
      // If proxy was aborted, throw abort error
      if (proxyError.name === 'AbortError') {
        throw proxyError;
      }
      // If rate limited, propagate that error
      if (proxyError.isRateLimited) {
        throw proxyError;
      }
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
 * @param {AbortSignal} options.signal - AbortSignal for cancellation
 * @param {string} options.responseType - Response type: 'json' or 'text' (default: 'json')
 * @returns {Promise<Object|string>} Parsed JSON or text response
 * @throws {DOMException} AbortError if request is cancelled via signal
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
