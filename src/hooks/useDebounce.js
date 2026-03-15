/**
 * useDebounce - Custom debounce hook for delayed execution
 *
 * Delays invoking a callback until after a specified wait time has elapsed
 * since the last time the debounced function was invoked.
 *
 * @example
 * // Debounce a search callback
 * const debouncedSearch = useDebounce((query) => {
 *   fetchResults(query);
 * }, 300);
 *
 * // Use in input handler
 * const handleChange = (e) => {
 *   setQuery(e.target.value);
 *   debouncedSearch(e.target.value);
 * };
 *
 * @example
 * // Debounce a value (alternative pattern)
 * const debouncedValue = useDebouncedValue(searchQuery, 300);
 * useEffect(() => {
 *   if (debouncedValue) fetchResults(debouncedValue);
 * }, [debouncedValue]);
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a callback function
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced function
 */
export const useDebounce = (callback, delay = 300) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Debounce a value - returns the value after it stops changing
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {*} Debounced value
 */
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
