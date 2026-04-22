/**
 * InitializationContext - PRO SCHOLAR V8
 *
 * Tracks app initialization state including dictionary loading, cache warming,
 * and service readiness. Components can use this to show loading states or
 * defer operations until the app is fully initialized.
 *
 * Usage:
 * import { useInitialization } from './context';
 *
 * function MyComponent() {
 *   const { isReady, progress, error, dictionaryStatus } = useInitialization();
 *   if (!isReady) return <LoadingSpinner />;
 *   // ... render component
 * }
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeDictionaries, getCacheStatus } from '../services/dictionaries/dictionaryLoader';

const InitializationContext = createContext(null);

// Initialization states
export const INIT_STATES = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
};

export function InitializationProvider({ children }) {
  const [state, setState] = useState(INIT_STATES.UNINITIALIZED);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dictionaryStatus, setDictionaryStatus] = useState({
    bdb: false,
    jastrow: false,
    strongs: false
  });
  const [initDuration, setInitDuration] = useState(null);

  // Initialize the app
  const initialize = useCallback(async () => {
    if (state === INIT_STATES.LOADING || state === INIT_STATES.READY) return;

    setState(INIT_STATES.LOADING);
    setProgress(10);
    setError(null);

    try {
      // Phase 1: Load dictionaries (main initialization)
      setProgress(30);
      const result = await initializeDictionaries();
      setDictionaryStatus(result.status);
      setInitDuration(result.duration);
      setProgress(100);

      setState(INIT_STATES.READY);
    } catch (err) {
      console.error('[Initialization] Failed:', err);
      setError(err.message || 'Initialization failed');
      setState(INIT_STATES.ERROR);
    }
  }, [state]);

  // Run initialization on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Refresh dictionary status
  const refreshStatus = useCallback(() => {
    const status = getCacheStatus();
    setDictionaryStatus(status);
    return status;
  }, []);

  // Retry initialization after error
  const retry = useCallback(() => {
    setState(INIT_STATES.UNINITIALIZED);
    setError(null);
    setProgress(0);
    // Will trigger useEffect to run initialize again
  }, []);

  const value = {
    // State
    state,
    isReady: state === INIT_STATES.READY,
    isLoading: state === INIT_STATES.LOADING,
    hasError: state === INIT_STATES.ERROR,

    // Progress and status
    progress,
    error,
    dictionaryStatus,
    initDuration,

    // Actions
    retry,
    refreshStatus
  };

  return (
    <InitializationContext.Provider value={value}>
      {children}
    </InitializationContext.Provider>
  );
}

/**
 * Hook to access initialization state
 */
export function useInitialization() {
  const context = useContext(InitializationContext);
  if (!context) {
    // Return a safe default if used outside provider (for backwards compatibility)
    return {
      state: INIT_STATES.READY,
      isReady: true,
      isLoading: false,
      hasError: false,
      progress: 100,
      error: null,
      dictionaryStatus: { bdb: true, jastrow: true, strongs: true },
      initDuration: null,
      retry: () => {},
      refreshStatus: () => ({})
    };
  }
  return context;
}

/**
 * Hook that waits for initialization to complete
 * Returns a promise that resolves when ready
 */
export function useWaitForInit() {
  const { isReady, hasError, error } = useInitialization();

  return useCallback(() => {
    return new Promise((resolve, reject) => {
      if (isReady) {
        resolve();
      } else if (hasError) {
        reject(new Error(error));
      }
      // If loading, the component will re-render when state changes
    });
  }, [isReady, hasError, error]);
}

export default InitializationContext;
