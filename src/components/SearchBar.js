import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDebounce } from '../hooks/useDebounce';
import './SearchBar.css';

// Search configuration
const MAX_QUERY_LENGTH = 200;
const DEBOUNCE_MS = 300;

/**
 * Sanitize search input to prevent XSS
 */
const sanitizeQuery = (input) => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .slice(0, MAX_QUERY_LENGTH); // Enforce max length
};

const SearchBar = forwardRef(({ onSearch, loading, enableDebounce = false }, ref) => {
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef(null);

  // Debounced search for auto-search mode
  const debouncedSearch = useDebounce((searchQuery) => {
    if (searchQuery.trim().length >= 2) {
      onSearch(searchQuery.trim());
    }
  }, DEBOUNCE_MS);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setQuery('');
      setValidationError('');
    }
  }));

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validateQuery = (input) => {
    if (input.length > MAX_QUERY_LENGTH) {
      return `Maximum ${MAX_QUERY_LENGTH} characters allowed`;
    }
    if (input.trim().length > 0 && input.trim().length < 2) {
      return 'Enter at least 2 characters';
    }
    return '';
  };

  const handleChange = (e) => {
    const rawValue = e.target.value;
    const sanitized = sanitizeQuery(rawValue);
    setQuery(sanitized);

    const error = validateQuery(sanitized);
    setValidationError(error);

    // Auto-search with debouncing if enabled
    if (enableDebounce && !error && sanitized.trim().length >= 2) {
      debouncedSearch(sanitized);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) return;

    const error = validateQuery(trimmed);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError('');
    onSearch(trimmed);
  };

  const handleClear = () => {
    setQuery('');
    setValidationError('');
    inputRef.current?.focus();
  };

  const isValid = query.trim().length >= 2 && !validationError;

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form" role="search">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search Torah texts... (Ctrl+K)"
            className={`search-input ${validationError ? 'has-error' : ''}`}
            disabled={loading}
            maxLength={MAX_QUERY_LENGTH}
            aria-label="Search Torah, Tanach, Talmud, and Mishnah texts"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'search-error' : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="search-button"
          disabled={loading || !isValid}
          aria-label={loading ? 'Searching...' : 'Submit search'}
        >
          {loading ? (
            <>
              <svg
                className="spinner"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              Searching...
            </>
          ) : (
            'Search'
          )}
        </button>
      </form>
      {validationError && (
        <div id="search-error" className="search-error" role="alert">
          {validationError}
        </div>
      )}
      <div className="search-hint">
        Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to focus search
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

SearchBar.propTypes = {
  /** Callback function called with the search query when user submits */
  onSearch: PropTypes.func.isRequired,
  /** Whether a search is currently in progress */
  loading: PropTypes.bool,
  /** Enable auto-search with debouncing as user types */
  enableDebounce: PropTypes.bool
};

SearchBar.defaultProps = {
  loading: false,
  enableDebounce: false
};

export default React.memo(SearchBar);
