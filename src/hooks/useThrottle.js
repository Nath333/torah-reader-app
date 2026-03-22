/**
 * useThrottle - Custom throttle hook for rate-limiting function calls
 *
 * Unlike debounce (which delays until activity stops), throttle ensures
 * a function is called at most once per specified time period.
 *
 * Use cases:
 * - Scroll event handlers
 * - Window resize handlers
 * - Mouse move handlers
 * - API calls that should be rate-limited
 *
 * @example
 * // Throttle a scroll handler
 * const throttledScroll = useThrottle((scrollPos) => {
 *   updateProgress(scrollPos);
 * }, 100);
 *
 * useEffect(() => {
 *   const handleScroll = () => throttledScroll(window.scrollY);
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, [throttledScroll]);
 *
 * @example
 * // Throttle a value
 * const throttledValue = useThrottledValue(scrollPosition, 100);
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Throttle a callback function
 * @param {Function} callback - The function to throttle
 * @param {number} limit - Time limit in milliseconds (default: 100)
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Call on the leading edge (default: true)
 * @param {boolean} options.trailing - Call on the trailing edge (default: true)
 * @returns {Function} Throttled function
 */
export function useThrottle(callback, limit = 100, options = {}) {
  const { leading = true, trailing = true } = options;

  const timeoutRef = useRef(null);
  const lastCallRef = useRef(0);
  const lastArgsRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    // Store latest args for trailing call
    lastArgsRef.current = args;

    // Leading edge call
    if (timeSinceLastCall >= limit && leading) {
      lastCallRef.current = now;
      callbackRef.current(...args);
      return;
    }

    // Schedule trailing edge call
    if (trailing && !timeoutRef.current) {
      const remaining = limit - timeSinceLastCall;
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        timeoutRef.current = null;
        if (lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
        }
      }, remaining);
    }
  }, [limit, leading, trailing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Cancel pending calls
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Force immediate call
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (lastArgsRef.current) {
        lastCallRef.current = Date.now();
        callbackRef.current(...lastArgsRef.current);
      }
    }
  }, []);

  return Object.assign(throttledCallback, { cancel, flush });
}

/**
 * Throttle a value - returns the value at most once per time period
 * @param {*} value - The value to throttle
 * @param {number} limit - Time limit in milliseconds (default: 100)
 * @returns {*} Throttled value
 */
export function useThrottledValue(value, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= limit) {
      // Enough time has passed, update immediately
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      // Schedule update for remaining time
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(value);
      }, limit - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, limit]);

  return throttledValue;
}

export default useThrottle;
