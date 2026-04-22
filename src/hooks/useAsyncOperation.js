/**
 * useAsyncOperation - Reusable hook for async operations with loading/error states
 *
 * Eliminates the repetitive pattern of:
 *   const [data, setData] = useState(null);
 *   const [isLoading, setIsLoading] = useState(false);
 *   const [error, setError] = useState(null);
 *
 * @example
 * const { data, isLoading, error, execute, reset } = useAsyncOperation(fetchUser);
 *
 * // Execute the operation
 * await execute(userId);
 *
 * // Or with immediate execution
 * const { data, isLoading } = useAsyncOperation(fetchUser, { immediate: true, args: [userId] });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * @typedef {Object} AsyncOperationState
 * @property {*} data - The result data from the async operation
 * @property {boolean} isLoading - Whether the operation is in progress
 * @property {Error|null} error - Any error that occurred
 * @property {boolean} isSuccess - Whether the last operation succeeded
 * @property {boolean} isError - Whether the last operation failed
 * @property {Function} execute - Function to execute the async operation
 * @property {Function} reset - Function to reset state to initial values
 * @property {Function} setData - Function to manually set data
 */

/**
 * Hook for managing async operations with loading, error, and success states
 *
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Execute immediately on mount
 * @param {Array} options.args - Arguments to pass when immediate is true
 * @param {*} options.initialData - Initial data value
 * @param {Function} options.onSuccess - Callback when operation succeeds
 * @param {Function} options.onError - Callback when operation fails
 * @param {boolean} options.resetOnExecute - Reset state before each execution (default: true)
 * @returns {AsyncOperationState}
 */
export function useAsyncOperation(asyncFn, options = {}) {
  const {
    immediate = false,
    args = [],
    initialData = null,
    onSuccess,
    onError,
    resetOnExecute = true
  } = options;

  const [state, setState] = useState({
    data: initialData,
    isLoading: immediate,
    error: null,
    isSuccess: false,
    isError: false
  });

  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const immediateExecutedRef = useRef(false);
  const argsRef = useRef(args);
  
  // Keep args ref up to date
  argsRef.current = args;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Execute the async operation
   */
  const execute = useCallback(async (...executeArgs) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Reset state if configured
    if (resetOnExecute) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isSuccess: false,
        isError: false
      }));
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const result = await asyncFn(...executeArgs, { signal: abortController.signal });

      // Only update if not aborted and still mounted
      if (!abortController.signal.aborted && mountedRef.current) {
        setState({
          data: result,
          isLoading: false,
          error: null,
          isSuccess: true,
          isError: false
        });

        onSuccess?.(result);
        return result;
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err,
          isSuccess: false,
          isError: true
        }));

        onError?.(err);
      }
    }
  }, [asyncFn, onSuccess, onError, resetOnExecute]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    immediateExecutedRef.current = false;
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false
    });
  }, [initialData]);

  /**
   * Manually set data
   */
  const setData = useCallback((data) => {
    setState(prev => ({
      ...prev,
      data: typeof data === 'function' ? data(prev.data) : data
    }));
  }, []);

  // Execute immediately if configured - runs only once
  useEffect(() => {
    if (immediate && !immediateExecutedRef.current) {
      immediateExecutedRef.current = true;
      execute(...argsRef.current);
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    setData
  };
}

/**
 * useAsyncCallback - Simpler version that just wraps a callback with loading state
 *
 * @example
 * const [save, { isLoading, error }] = useAsyncCallback(async (data) => {
 *   await api.save(data);
 * });
 */
export function useAsyncCallback(asyncFn, deps = []) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const callback = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn(...args);
      if (mountedRef.current) {
        setIsLoading(false);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setIsLoading(false);
      }
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [callback, { isLoading, error }];
}

export default useAsyncOperation;
