/**
 * useToggleSetting - Reusable hook for boolean settings with localStorage persistence
 *
 * Eliminates the repetitive pattern of:
 *   const [showFrench, setShowFrench] = useLocalStorage('showFrench', false);
 *   const toggleFrench = useCallback(() => setShowFrench(prev => !prev), [setShowFrench]);
 *
 * @example
 * // In SettingsContext or any component:
 * const [showFrench, toggleFrench, setShowFrench] = useToggleSetting('showFrench', false);
 *
 * // Use in JSX:
 * <button onClick={toggleFrench}>{showFrench ? 'Hide' : 'Show'} French</button>
 */

import { useState, useCallback, useMemo } from 'react';
import useLocalStorage from './useLocalStorage';
import { safeGet, safeSet } from '../utils/safeLocalStorage';

/**
 * Hook for managing boolean settings with toggle functionality
 *
 * @param {string} key - localStorage key for persistence
 * @param {boolean} defaultValue - Initial value if not in storage (default: false)
 * @returns {[boolean, Function, Function]} [value, toggle, setValue]
 */
export function useToggleSetting(key, defaultValue = false) {
  const [value, setValue] = useLocalStorage(key, defaultValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, [setValue]);

  return [value, toggle, setValue];
}

/**
 * useToggleState - Same as useToggleSetting but without localStorage persistence
 *
 * @example
 * const [isOpen, toggleOpen, setIsOpen] = useToggleState(false);
 */
export function useToggleState(defaultValue = false) {
  const [value, setValue] = useState(defaultValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  return [value, toggle, setValue];
}

/**
 * useToggleWithCallback - Toggle with an optional callback when value changes
 *
 * @param {string} key - localStorage key for persistence
 * @param {boolean} defaultValue - Initial value
 * @param {Function} onChange - Callback called with new value after toggle
 * @returns {[boolean, Function, Function]} [value, toggle, setValue]
 *
 * @example
 * const [darkMode, toggleDarkMode] = useToggleWithCallback('darkMode', false, (isDark) => {
 *   document.body.classList.toggle('dark', isDark);
 * });
 */
export function useToggleWithCallback(key, defaultValue = false, onChange) {
  const [value, setValue] = useLocalStorage(key, defaultValue);

  const toggle = useCallback(() => {
    setValue(prev => {
      const newValue = !prev;
      if (onChange) {
        setTimeout(() => onChange(newValue), 0);
      }
      return newValue;
    });
  }, [setValue, onChange]);

  return [value, toggle, setValue];
}

/**
 * useToggleGroup - Manage multiple related toggles with a single hook
 *
 * SAFE alternative to useMultipleToggleSettings - uses useMemo instead of
 * dynamic hook calls, avoiding Rules of Hooks violations.
 *
 * @param {Object} defaults - Object with key:defaultValue pairs
 * @returns {Object} { values, toggles, setters, toggleAll, setAll }
 *
 * @example
 * const commentary = useToggleGroup({
 *   showRashi: true,
 *   showTosafot: false,
 *   showRamban: false
 * });
 *
 * // Access:
 * commentary.values.showRashi // true/false
 * commentary.toggles.showRashi() // toggle function
 * commentary.setters.showRashi(true) // set function
 * commentary.toggleAll() // toggle all at once
 */
export function useToggleGroup(defaults) {
  // Get stable list of keys (must not change between renders)
  const keys = useMemo(() => Object.keys(defaults), [defaults]);

  // Single state object for all toggles (avoids dynamic hook calls)
  const [values, setValues] = useState(() => {
    // Initialize from localStorage or defaults using safeGet
    const initial = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      initial[key] = safeGet(key, defaultValue);
    }
    return initial;
  });

  // Create toggle/setter functions using useMemo (stable references, no hooks in loops)
  const toggles = useMemo(() => {
    const result = {};
    for (const key of keys) {
      result[key] = () => {
        setValues(prev => {
          const newValue = !prev[key];
          safeSet(key, newValue);
          return { ...prev, [key]: newValue };
        });
      };
    }
    return result;
  }, [keys]);

  const setters = useMemo(() => {
    const result = {};
    for (const key of keys) {
      result[key] = (newValue) => {
        setValues(prev => {
          const resolved = typeof newValue === 'function' ? newValue(prev[key]) : newValue;
          safeSet(key, resolved);
          return { ...prev, [key]: resolved };
        });
      };
    }
    return result;
  }, [keys]);

  const toggleAll = useCallback(() => {
    setValues(prev => {
      const newValues = {};
      for (const key of Object.keys(prev)) {
        newValues[key] = !prev[key];
        safeSet(key, newValues[key]);
      }
      return newValues;
    });
  }, []);

  const setAll = useCallback((value) => {
    setValues(prev => {
      const newValues = {};
      for (const key of Object.keys(prev)) {
        newValues[key] = value;
        safeSet(key, value);
      }
      return newValues;
    });
  }, []);

  return { values, toggles, setters, toggleAll, setAll };
}

export default useToggleSetting;
