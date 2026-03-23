/**
 * SmartSearch Component - 2026 AI-Powered Search Interface
 *
 * Features:
 * - Natural language search ("find verses about forgiveness")
 * - Semantic similarity matching
 * - AI interpretation with concept expansion
 * - Search history with quick access
 * - Keyboard navigation
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { safeGet, safeSet } from '../../utils/safeLocalStorage';
import {
  semanticSearch,
  hybridSearch
} from '../../services/semanticSearchService';

const SEARCH_HISTORY_KEY = 'smart-search-history';

// CSS styles
const styles = {
  container: {
    position: 'relative',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-secondary, #f5f5f5)',
    borderRadius: '12px',
    padding: '8px 16px',
    border: '2px solid transparent',
    transition: 'all 0.2s ease'
  },
  searchBoxFocused: {
    borderColor: 'var(--primary-color, #1976d2)',
    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)'
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '16px',
    padding: '8px',
    outline: 'none',
    color: 'var(--text-primary, #212121)'
  },
  searchIcon: {
    fontSize: '20px',
    color: 'var(--text-secondary, #757575)',
    marginRight: '8px'
  },
  aiToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  aiToggleActive: {
    backgroundColor: 'var(--primary-color, #1976d2)',
    color: 'white'
  },
  aiToggleInactive: {
    backgroundColor: 'var(--bg-tertiary, #e0e0e0)',
    color: 'var(--text-secondary, #757575)'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-primary, white)',
    borderRadius: '12px',
    marginTop: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 1000
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color, #e0e0e0)'
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary, #757575)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  },
  conceptChip: {
    display: 'inline-block',
    padding: '4px 10px',
    margin: '2px 4px 2px 0',
    borderRadius: '12px',
    fontSize: '12px',
    backgroundColor: 'var(--bg-tertiary, #e8e8e8)',
    color: 'var(--text-primary, #212121)',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  resultItem: {
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  resultRef: {
    fontWeight: 600,
    color: 'var(--primary-color, #1976d2)',
    marginBottom: '4px'
  },
  resultHebrew: {
    direction: 'rtl',
    fontSize: '15px',
    color: 'var(--text-primary, #212121)',
    marginBottom: '4px'
  },
  resultEnglish: {
    fontSize: '13px',
    color: 'var(--text-secondary, #616161)'
  },
  resultScore: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'var(--success-bg, #e8f5e9)',
    color: 'var(--success-color, #2e7d32)',
    marginLeft: '8px'
  },
  matchedConcepts: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '6px'
  },
  conceptTag: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--info-bg, #e3f2fd)',
    color: 'var(--info-color, #1565c0)'
  },
  aiInterpretation: {
    padding: '12px',
    backgroundColor: 'var(--ai-bg, #fff3e0)',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--ai-color, #e65100)',
    marginBottom: '8px'
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    color: 'var(--text-secondary, #757575)'
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-secondary, #757575)'
  },
  kbd: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '11px',
    fontFamily: 'monospace',
    backgroundColor: 'var(--bg-tertiary, #e0e0e0)',
    borderRadius: '4px',
    marginLeft: '8px'
  }
};

// Quick concept suggestions
const QUICK_CONCEPTS = [
  'covenant', 'blessing', 'forgiveness', 'creation', 'exodus',
  'prayer', 'sacrifice', 'redemption', 'faith', 'love'
];

const SmartSearch = ({
  onSelectVerse,
  onClose,
  placeholder = 'Search verses naturally...',
  showHistory = true
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [results, setResults] = useState(null);
  const [aiInterpretation, setAiInterpretation] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  // Load search history using safeLocalStorage
  useEffect(() => {
    const stored = safeGet(SEARCH_HISTORY_KEY, []);
    setHistory(stored.slice(0, 10));
  }, []);

  // Save search to history using safeLocalStorage
  const saveToHistory = useCallback((searchQuery) => {
    const updated = [
      searchQuery,
      ...history.filter(h => h !== searchQuery)
    ].slice(0, 10);
    setHistory(updated);
    safeSet(SEARCH_HISTORY_KEY, updated);
  }, [history]);

  // Perform search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setAiInterpretation(null);
      return;
    }

    setLoading(true);
    setSelectedIndex(-1);

    try {
      if (useAI) {
        // Use AI-powered hybrid search
        const { results: searchResults, aiInterpretation: ai } = await hybridSearch(
          searchQuery,
          { limit: 15, useAI: true }
        );
        setResults(searchResults);
        setAiInterpretation(ai);
      } else {
        // Use basic semantic search
        const searchResults = await semanticSearch(searchQuery, 15);
        setResults(searchResults);
        setAiInterpretation(null);
      }

      saveToHistory(searchQuery);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }

    setLoading(false);
  }, [useAI, saveToHistory]);

  // Handle input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults(null);
        setAiInterpretation(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, (results?.length || 0) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results?.[selectedIndex]) {
      e.preventDefault();
      onSelectVerse?.(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  }, [results, selectedIndex, onSelectVerse, onClose]);

  // Handle concept click
  const handleConceptClick = (concept) => {
    setQuery(concept);
    inputRef.current?.focus();
  };

  // Handle result selection
  const handleResultClick = (result) => {
    onSelectVerse?.(result);
  };

  const showDropdown = focused && (query.length > 0 || showHistory);

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.searchBox,
        ...(focused ? styles.searchBoxFocused : {})
      }}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          autoComplete="off"
        />
        <button
          style={{
            ...styles.aiToggle,
            ...(useAI ? styles.aiToggleActive : styles.aiToggleInactive)
          }}
          onClick={() => setUseAI(!useAI)}
          title={useAI ? 'AI search enabled' : 'AI search disabled'}
        >
          <span>🤖</span>
          <span>AI</span>
        </button>
      </div>

      {showDropdown && (
        <div style={styles.dropdown}>
          {/* Quick concepts */}
          {!query && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Quick Search</div>
              <div>
                {QUICK_CONCEPTS.map(concept => (
                  <span
                    key={concept}
                    style={styles.conceptChip}
                    onClick={() => handleConceptClick(concept)}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-light, #bbdefb)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary, #e8e8e8)'}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search history */}
          {!query && showHistory && history.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Recent Searches</div>
              {history.slice(0, 5).map((item, i) => (
                <div
                  key={i}
                  style={{ ...styles.resultItem, display: 'flex', alignItems: 'center' }}
                  onClick={() => setQuery(item)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-secondary, #f5f5f5)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span style={{ marginRight: '8px', color: 'var(--text-tertiary, #9e9e9e)' }}>🕐</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={styles.loadingSpinner}>
              <span>Searching...</span>
            </div>
          )}

          {/* AI Interpretation */}
          {!loading && aiInterpretation && (
            <div style={styles.section}>
              <div style={styles.aiInterpretation}>
                <div style={styles.aiHeader}>
                  <span>🤖</span>
                  <span>AI Interpretation</span>
                </div>
                {aiInterpretation.concepts?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Concepts:
                    </span>
                    <div style={styles.matchedConcepts}>
                      {aiInterpretation.concepts.map((c, i) => (
                        <span key={i} style={styles.conceptTag}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {aiInterpretation.hebrewTerms?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Hebrew terms:
                    </span>
                    <div style={styles.matchedConcepts}>
                      {aiInterpretation.hebrewTerms.map((t, i) => (
                        <span key={i} style={{ ...styles.conceptTag, direction: 'rtl' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && results && results.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                Found {results.length} verses
              </div>
              {results.map((result, i) => (
                <div
                  key={result.ref || i}
                  style={{
                    ...styles.resultItem,
                    backgroundColor: selectedIndex === i ? 'var(--bg-secondary, #f5f5f5)' : 'transparent'
                  }}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #f5f5f5)';
                    setSelectedIndex(i);
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIndex !== i) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={styles.resultRef}>
                    {result.ref}
                    <span style={styles.resultScore}>
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  {result.hebrew && (
                    <div style={styles.resultHebrew}>
                      {result.hebrew.length > 100 ? result.hebrew.substring(0, 100) + '...' : result.hebrew}
                    </div>
                  )}
                  {result.english && (
                    <div style={styles.resultEnglish}>
                      {result.english.length > 150 ? result.english.substring(0, 150) + '...' : result.english}
                    </div>
                  )}
                  {result.matchedConcepts?.length > 0 && (
                    <div style={styles.matchedConcepts}>
                      {result.matchedConcepts.map((c, j) => (
                        <span key={j} style={styles.conceptTag}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && results && results.length === 0 && query && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              <div>No verses found for "{query}"</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                Try different keywords or enable AI search
              </div>
            </div>
          )}

          {/* Keyboard hints */}
          <div style={{
            ...styles.section,
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-tertiary, #fafafa)'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #9e9e9e)' }}>
              <kbd style={styles.kbd}>↑↓</kbd> Navigate
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #9e9e9e)' }}>
              <kbd style={styles.kbd}>Enter</kbd> Select
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #9e9e9e)' }}>
              <kbd style={styles.kbd}>Esc</kbd> Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

SmartSearch.propTypes = {
  onSelectVerse: PropTypes.func,
  onClose: PropTypes.func,
  placeholder: PropTypes.string,
  showHistory: PropTypes.bool
};

export default SmartSearch;
