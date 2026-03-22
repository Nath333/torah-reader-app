/**
 * useReducerWithMiddleware - Enhanced useReducer with middleware support
 *
 * Provides Redux-like middleware patterns for complex state management.
 * Use this instead of 10+ useState calls when state is interrelated.
 *
 * @example
 * // Define reducer
 * const searchReducer = (state, action) => {
 *   switch (action.type) {
 *     case 'SEARCH_START':
 *       return { ...state, loading: true, query: action.query };
 *     case 'SEARCH_SUCCESS':
 *       return { ...state, loading: false, results: action.results };
 *     case 'SEARCH_ERROR':
 *       return { ...state, loading: false, error: action.error };
 *     default:
 *       return state;
 *   }
 * };
 *
 * // Define middleware for logging
 * const loggerMiddleware = (state, action, next) => {
 *   console.log('Dispatching:', action);
 *   const result = next(action);
 *   console.log('New state:', result);
 *   return result;
 * };
 *
 * // Use in component
 * const [state, dispatch] = useReducerWithMiddleware(
 *   searchReducer,
 *   initialState,
 *   [loggerMiddleware]
 * );
 */

import { useReducer, useCallback, useRef, useMemo } from 'react';

/**
 * useReducerWithMiddleware - useReducer with middleware chain support
 *
 * @param {Function} reducer - The reducer function
 * @param {*} initialState - Initial state value
 * @param {Array<Function>} middlewares - Array of middleware functions
 * @returns {[*, Function]} [state, dispatch]
 */
export function useReducerWithMiddleware(reducer, initialState, middlewares = []) {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);

  // Keep state ref updated
  stateRef.current = state;

  const dispatch = useCallback((action) => {
    // Build middleware chain
    const chain = middlewares.map(middleware => next => act =>
      middleware(stateRef.current, act, next)
    );

    // Compose middleware
    const composedDispatch = chain.reduceRight(
      (next, middleware) => middleware(next),
      baseDispatch
    );

    return composedDispatch(action);
  }, [middlewares, baseDispatch]);

  return [state, dispatch];
}

/**
 * Common reducer patterns for reuse
 */

/**
 * Create a loading reducer for async operations
 */
export function createAsyncReducer(actionPrefix) {
  const initialState = {
    data: null,
    loading: false,
    error: null
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case `${actionPrefix}_START`:
        return { ...state, loading: true, error: null };
      case `${actionPrefix}_SUCCESS`:
        return { ...state, loading: false, data: action.payload, error: null };
      case `${actionPrefix}_ERROR`:
        return { ...state, loading: false, error: action.payload };
      case `${actionPrefix}_RESET`:
        return initialState;
      default:
        return state;
    }
  };

  return { initialState, reducer };
}

/**
 * Create a list reducer with common CRUD operations
 */
export function createListReducer(actionPrefix) {
  const initialState = {
    items: [],
    loading: false,
    error: null,
    selectedId: null
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case `${actionPrefix}_LOAD_START`:
        return { ...state, loading: true };
      case `${actionPrefix}_LOAD_SUCCESS`:
        return { ...state, loading: false, items: action.payload };
      case `${actionPrefix}_ADD`:
        return { ...state, items: [...state.items, action.payload] };
      case `${actionPrefix}_UPDATE`:
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id ? { ...item, ...action.payload } : item
          )
        };
      case `${actionPrefix}_REMOVE`:
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload)
        };
      case `${actionPrefix}_SELECT`:
        return { ...state, selectedId: action.payload };
      case `${actionPrefix}_CLEAR`:
        return initialState;
      default:
        return state;
    }
  };

  return { initialState, reducer };
}

/**
 * Create a form reducer for form state management
 */
export function createFormReducer(initialValues = {}) {
  const initialState = {
    values: initialValues,
    touched: {},
    errors: {},
    isSubmitting: false,
    isValid: true
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case 'SET_FIELD':
        return {
          ...state,
          values: { ...state.values, [action.field]: action.value },
          touched: { ...state.touched, [action.field]: true }
        };
      case 'SET_ERROR':
        return {
          ...state,
          errors: { ...state.errors, [action.field]: action.error },
          isValid: Object.keys({ ...state.errors, [action.field]: action.error })
            .filter(k => state.errors[k]).length === 0
        };
      case 'SET_ERRORS':
        return {
          ...state,
          errors: action.errors,
          isValid: Object.keys(action.errors).length === 0
        };
      case 'SUBMIT_START':
        return { ...state, isSubmitting: true };
      case 'SUBMIT_END':
        return { ...state, isSubmitting: false };
      case 'RESET':
        return { ...initialState, values: action.values || initialValues };
      default:
        return state;
    }
  };

  return { initialState, reducer };
}

/**
 * Common middleware implementations
 */

/**
 * Logger middleware - logs all actions and state changes
 */
export const loggerMiddleware = (state, action, next) => {
  console.group(`Action: ${action.type}`);
  console.log('Prev state:', state);
  console.log('Action:', action);
  const result = next(action);
  console.log('Next state:', result);
  console.groupEnd();
  return result;
};

/**
 * Persistence middleware - saves state to localStorage
 */
export const createPersistMiddleware = (key, selector = state => state) => {
  return (state, action, next) => {
    const result = next(action);
    try {
      const toPersist = selector(result);
      localStorage.setItem(key, JSON.stringify(toPersist));
    } catch (e) {
      console.warn('Failed to persist state:', e);
    }
    return result;
  };
};

/**
 * Thunk middleware - allows dispatching functions
 */
export const thunkMiddleware = (state, action, next) => {
  if (typeof action === 'function') {
    return action(next, () => state);
  }
  return next(action);
};

/**
 * useFormReducer - Convenience hook for form state
 */
export function useFormReducer(initialValues = {}) {
  const { initialState, reducer } = useMemo(
    () => createFormReducer(initialValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  const setField = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setError = useCallback((field, error) => {
    dispatch({ type: 'SET_ERROR', field, error });
  }, []);

  const reset = useCallback((values) => {
    dispatch({ type: 'RESET', values });
  }, []);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    e?.preventDefault();
    dispatch({ type: 'SUBMIT_START' });
    try {
      await onSubmit(state.values);
    } finally {
      dispatch({ type: 'SUBMIT_END' });
    }
  }, [state.values]);

  return {
    ...state,
    setField,
    setError,
    reset,
    handleSubmit,
    getFieldProps: (field) => ({
      value: state.values[field] || '',
      onChange: (e) => setField(field, e.target.value),
      onBlur: () => dispatch({ type: 'SET_FIELD', field, value: state.values[field] })
    })
  };
}

export default useReducerWithMiddleware;
