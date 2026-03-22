/**
 * Memoization Utilities
 *
 * Provides reusable memoization patterns for React components and hooks.
 * Helps prevent unnecessary re-renders and expensive computations.
 *
 * Usage patterns:
 * 1. Component wrapping with custom comparison
 * 2. Selector memoization for derived state
 * 3. Expensive computation caching
 */

import { memo, useMemo, useCallback, useRef } from 'react';

// =============================================================================
// Component Memoization Helpers
// =============================================================================

/**
 * Create a memoized component with deep comparison
 *
 * @example
 * const MemoizedVerseList = withDeepMemo(VerseList, ['verses', 'selectedVerse']);
 */
export function withDeepMemo(Component, propsToCompare = []) {
  return memo(Component, (prevProps, nextProps) => {
    if (propsToCompare.length === 0) {
      // Compare all props deeply
      return deepEqual(prevProps, nextProps);
    }

    // Compare only specified props
    return propsToCompare.every(prop =>
      deepEqual(prevProps[prop], nextProps[prop])
    );
  });
}

/**
 * Create a memoized component that only updates when specific props change
 *
 * @example
 * const MemoizedVerse = withPropCheck(Verse, (prev, next) =>
 *   prev.verse === next.verse && prev.isSelected === next.isSelected
 * );
 */
export function withPropCheck(Component, areEqual) {
  return memo(Component, areEqual);
}

/**
 * HOC that prevents re-render if children content is unchanged
 *
 * Useful for container components that receive children as props.
 */
export function withStableChildren(Component) {
  return memo(Component, (prevProps, nextProps) => {
    // Compare all props except children by reference
    const { children: prevChildren, ...prevRest } = prevProps;
    const { children: nextChildren, ...nextRest } = nextProps;

    // Check if non-children props changed
    const propsEqual = Object.keys(prevRest).every(
      key => prevRest[key] === nextRest[key]
    );

    // For children, compare by type and key only (not by reference)
    const childrenEqual = compareChildren(prevChildren, nextChildren);

    return propsEqual && childrenEqual;
  });
}

// =============================================================================
// Hook-based Memoization
// =============================================================================

/**
 * useMemoCompare - Like useMemo but with custom comparison
 *
 * @example
 * const processedData = useMemoCompare(
 *   () => expensiveComputation(data),
 *   [data],
 *   (prev, next) => prev.id === next.id
 * );
 */
export function useMemoCompare(factory, deps, compare) {
  const ref = useRef();

  const depsMemoized = useMemo(() => {
    if (ref.current === undefined || !compare(ref.current, deps)) {
      ref.current = deps;
    }
    return ref.current;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(factory, [depsMemoized]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useDeepMemo - Memoize based on deep equality
 *
 * @example
 * const config = useDeepMemo(() => ({ ...complexConfig }), [settings]);
 */
export function useDeepMemo(factory, deps) {
  const ref = useRef();

  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

/**
 * useStableCallback - Returns a stable callback that always calls the latest version
 *
 * Unlike useCallback, this doesn't require dependency tracking.
 * Useful when you need a stable reference but the callback logic may change.
 *
 * @example
 * const handleClick = useStableCallback((id) => {
 *   // This can reference current state without deps
 *   doSomething(currentState, id);
 * });
 */
export function useStableCallback(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []);
}

/**
 * useShallowMemo - Memoize based on shallow object comparison
 *
 * @example
 * const options = useShallowMemo(() => ({ page, limit, sort }), [page, limit, sort]);
 */
export function useShallowMemo(factory, deps) {
  const ref = useRef();

  if (!ref.current || !shallowEqual(deps, ref.current.deps)) {
    ref.current = { value: factory(), deps };
  }

  return ref.current.value;
}

// =============================================================================
// Selector Memoization (Redux-style)
// =============================================================================

/**
 * createSelector - Create a memoized selector function
 *
 * @example
 * const selectFilteredVerses = createSelector(
 *   [state => state.verses, state => state.filter],
 *   (verses, filter) => verses.filter(v => v.includes(filter))
 * );
 */
export function createSelector(inputSelectors, resultFn) {
  let lastInputs = null;
  let lastResult = null;

  return (...args) => {
    const inputs = inputSelectors.map(selector => selector(...args));

    if (lastInputs && inputs.every((input, i) => input === lastInputs[i])) {
      return lastResult;
    }

    lastInputs = inputs;
    lastResult = resultFn(...inputs);
    return lastResult;
  };
}

/**
 * useSelector - Hook version of createSelector for use in components
 *
 * @example
 * const filteredVerses = useSelector(
 *   [verses, filter],
 *   (verses, filter) => verses.filter(v => v.includes(filter))
 * );
 */
export function useSelector(inputs, computeFn) {
  const lastInputsRef = useRef(null);
  const lastResultRef = useRef(null);

  return useMemo(() => {
    if (lastInputsRef.current && inputs.every((input, i) => input === lastInputsRef.current[i])) {
      return lastResultRef.current;
    }

    lastInputsRef.current = inputs;
    lastResultRef.current = computeFn(...inputs);
    return lastResultRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, inputs);
}

// =============================================================================
// Comparison Utilities
// =============================================================================

/**
 * Deep equality comparison
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Shallow equality comparison
 */
export function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => a[key] === b[key]);
}

/**
 * Compare React children for equality (by type and key)
 */
function compareChildren(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((child, i) => compareChildren(child, b[i]));
  }

  // Handle React elements
  if (typeof a === 'object' && typeof b === 'object') {
    if (a.type !== b.type) return false;
    if (a.key !== b.key) return false;
    return true;
  }

  return a === b;
}

// =============================================================================
// LRU Cache for Expensive Computations
// =============================================================================

/**
 * Create an LRU (Least Recently Used) cache
 *
 * @example
 * const cache = createLRUCache(100);
 * const result = cache.get('key') || cache.set('key', expensiveComputation());
 */
export function createLRUCache(maxSize = 100) {
  const cache = new Map();

  return {
    get(key) {
      if (!cache.has(key)) return undefined;

      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    },

    set(key, value) {
      // Remove oldest if at capacity
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, value);
      return value;
    },

    has(key) {
      return cache.has(key);
    },

    delete(key) {
      return cache.delete(key);
    },

    clear() {
      cache.clear();
    },

    get size() {
      return cache.size;
    }
  };
}

/**
 * useLRUCache - Hook for component-local LRU cache
 *
 * @example
 * const cache = useLRUCache(50);
 * const result = cache.get(key) || cache.set(key, compute(key));
 */
export function useLRUCache(maxSize = 100) {
  const cacheRef = useRef(null);

  if (!cacheRef.current) {
    cacheRef.current = createLRUCache(maxSize);
  }

  return cacheRef.current;
}

// =============================================================================
// Function Memoization
// =============================================================================

/**
 * memoize - Classic function memoization with customizable cache key
 *
 * @example
 * const expensiveFn = memoize((a, b) => heavyComputation(a, b));
 * const expensiveFn = memoize(fn, { maxSize: 100, keyFn: args => args[0].id });
 */
export function memoize(fn, options = {}) {
  const { maxSize = 100, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = createLRUCache(maxSize);

  return (...args) => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

export default {
  // Component helpers
  withDeepMemo,
  withPropCheck,
  withStableChildren,

  // Hook helpers
  useMemoCompare,
  useDeepMemo,
  useStableCallback,
  useShallowMemo,
  useSelector,
  useLRUCache,

  // Selectors
  createSelector,

  // Utilities
  deepEqual,
  shallowEqual,
  createLRUCache,
  memoize
};
