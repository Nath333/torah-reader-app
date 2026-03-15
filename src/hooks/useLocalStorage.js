import { useState, useEffect, useCallback, useRef } from 'react';

// Storage quota error types
const QUOTA_EXCEEDED_ERRORS = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'];

/**
 * Check if error is a quota exceeded error
 */
const isQuotaExceeded = (error) => {
  return (
    error instanceof DOMException &&
    (QUOTA_EXCEEDED_ERRORS.includes(error.name) ||
      error.code === 22 ||
      error.code === 1014)
  );
};

/**
 * Custom hook for persisting state in localStorage
 * Features:
 * - Prevents unnecessary writes on initial render
 * - Handles quota exceeded errors gracefully
 * - SSR-safe
 * - Stable key reference to prevent infinite loops
 *
 * @param {string} key - localStorage key
 * @param {any} initialValue - default value if nothing in storage
 * @returns {[any, function, {error: Error|null, isQuotaExceeded: boolean}]}
 */
export const useLocalStorage = (key, initialValue) => {
  const isFirstRender = useRef(true);
  const keyRef = useRef(key);
  const [error, setError] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Update key ref if it changes (but don't trigger re-render)
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  const [storedValue, setStoredValue] = useState(() => {
    // SSR safety
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Error reading localStorage key "${key}":`, err);
      }
      return initialValue;
    }
  });

  // Only write to localStorage after initial render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // SSR safety
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(storedValue));
      setError(null);
      setQuotaExceeded(false);
    } catch (err) {
      setError(err);
      if (isQuotaExceeded(err)) {
        setQuotaExceeded(true);
        // Try to clear old data to make space
        try {
          // Remove oldest items strategy could be implemented here
          if (process.env.NODE_ENV === 'development') {
            console.warn(`localStorage quota exceeded for key "${keyRef.current}". Data was not saved.`);
          }
        } catch {
          // Ignore cleanup errors
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`Error setting localStorage key "${keyRef.current}":`, err);
      }
    }
  }, [storedValue]); // Only depend on storedValue, use ref for key

  const setValue = useCallback((value) => {
    setStoredValue(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  // Clear storage for this key
  const clearValue = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(keyRef.current);
      setStoredValue(initialValue);
      setError(null);
      setQuotaExceeded(false);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Error clearing localStorage key "${keyRef.current}":`, err);
      }
    }
  }, [initialValue]);

  return [storedValue, setValue, { error, isQuotaExceeded: quotaExceeded, clearValue }];
};

export default useLocalStorage;
