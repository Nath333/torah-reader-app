/**
 * usePanelData - Reusable hook for PRO SCHOLAR V20 panels
 *
 * Provides standardized async data loading with dependency tracking,
 * eliminating repetitive loading/error/data state patterns across panels.
 *
 * @module usePanelData
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Build panel className from base class and modifiers
 * @param {string} baseClass - Base CSS class name
 * @param {Object} modifiers - Object with boolean modifiers
 * @returns {string} Combined class string
 */
export function buildPanelClassName(baseClass, { compact, dark, className }) {
  return [
    baseClass,
    compact ? 'compact' : '',
    dark ? 'dark' : '',
    className || ''
  ].filter(Boolean).join(' ');
}

/**
 * Toggle an item in a Set (add if absent, remove if present)
 * @param {Set} set - The set to modify
 * @param {*} item - The item to toggle
 * @returns {Set} New set with item toggled
 */
export function toggleSetItem(set, item) {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

/**
 * Hook to create a stable toggle function for Set state
 * @param {Function} setStateFunc - The setState function for the Set
 * @returns {Function} Toggle callback
 */
export function useSetToggle(setStateFunc) {
  return useCallback((item) => {
    setStateFunc(prev => toggleSetItem(prev, item));
  }, [setStateFunc]);
}

/**
 * Hook for panel data loading with automatic dependency tracking
 *
 * @param {Function} asyncFn - Async function to fetch data
 * @param {*} dependency - Value that triggers re-fetch when changed
 * @param {Object} options - Configuration options
 * @param {Function} options.validate - Function to validate dependency (returns false to skip fetch)
 * @param {string} options.panelName - Name for logging
 * @returns {Object} { data, loading, error }
 *
 * @example
 * const { data, loading, error } = usePanelData(
 *   getRootMeaningAsync,
 *   root,
 *   { validate: (r) => r && r.length >= 2, panelName: 'RootMeaning' }
 * );
 */
export function usePanelData(asyncFn, dependency, options = {}) {
  const { validate, panelName = 'Panel' } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Store validate in ref to avoid dependency issues with inline functions
  const validateRef = useRef(validate);
  validateRef.current = validate;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Validate dependency using ref (avoids re-render on inline function change)
    if (validateRef.current && !validateRef.current(dependency)) {
      setData(null);
      return;
    }

    if (!dependency) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    asyncFn(dependency)
      .then(result => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mountedRef.current) {
          console.warn(`[${panelName}] Error:`, err.message);
          setError(err.message);
          setLoading(false);
        }
      });
  }, [dependency, asyncFn, panelName]);

  return { data, loading, error };
}

/**
 * Render loading state for panels
 * @param {string} className - Panel className
 * @param {string} prefix - CSS prefix (e.g., 'rmp', 'tap')
 * @param {string} message - Loading message
 * @returns {JSX.Element}
 */
export function renderPanelLoading(className, prefix, message = 'Loading...') {
  return (
    <div className={className}>
      <div className={`${prefix}-loading`}>
        <span className={`${prefix}-loading-icon`}>⏳</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

/**
 * Render error state for panels
 * @param {string} className - Panel className
 * @param {string} prefix - CSS prefix (e.g., 'rmp', 'tap')
 * @param {string} message - Error message
 * @returns {JSX.Element}
 */
export function renderPanelError(className, prefix, message = 'Could not load data') {
  return (
    <div className={className}>
      <div className={`${prefix}-error`}>
        <span className={`${prefix}-error-icon`}>⚠️</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

export default usePanelData;
