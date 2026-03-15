import React, { useState, useCallback } from 'react';
import { getRandomText } from '../services/sefariaApi';
import './DiscoverPanel.css';

const CATEGORIES = [
  { value: [], label: 'Any Text', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { value: ['Tanakh'], label: 'Tanakh', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { value: ['Talmud'], label: 'Talmud', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { value: ['Midrash'], label: 'Midrash', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { value: ['Halakhah'], label: 'Halacha', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { value: ['Kabbalah'], label: 'Kabbalah', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
];

function DiscoverPanel({ onNavigateToRef, onClose }) {
  const [randomText, setRandomText] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Fetch a random text
  const fetchRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await getRandomText(selectedCategory.value);
      if (text) {
        setRandomText(text);
        setHistory(prev => [text, ...prev].slice(0, 10)); // Keep last 10
      } else {
        setError('No text found');
      }
    } catch (err) {
      setError('Failed to fetch random text');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Navigate to the current text
  const handleNavigate = useCallback(() => {
    if (randomText && onNavigateToRef) {
      onNavigateToRef(randomText.book, randomText.chapter || '1');
    }
  }, [randomText, onNavigateToRef]);

  // Navigate to a history item
  const handleHistoryClick = useCallback((item) => {
    if (onNavigateToRef) {
      onNavigateToRef(item.book, item.chapter || '1');
    }
  }, [onNavigateToRef]);

  return (
    <div className="discover-panel">
      <div className="discover-header">
        <h3>Discover</h3>
        <span className="discover-subtitle">Explore random texts from the library</span>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="discover-content">
        {/* Category Selector */}
        <div className="category-selector">
          {CATEGORIES.map((cat, idx) => (
            <button
              key={idx}
              className={`category-btn ${selectedCategory.value.join() === cat.value.join() ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={cat.icon} />
              </svg>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Discover Button */}
        <button
          className="discover-btn"
          onClick={fetchRandom}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner small" />
              <span>Finding...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Discover Random Text</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="discover-error">
            <p>{error}</p>
          </div>
        )}

        {/* Random Text Display */}
        {randomText && !loading && (
          <div className="random-text-card">
            <div className="text-card-header">
              <span className="text-ref">{randomText.heRef || randomText.ref}</span>
              {randomText.categories && randomText.categories.length > 0 && (
                <span className="text-category">{randomText.categories[0]}</span>
              )}
            </div>

            {randomText.he && (
              <p className="text-hebrew" dir="rtl">{truncateText(randomText.he, 300)}</p>
            )}

            {randomText.text && (
              <p className="text-english">{truncateText(randomText.text, 300)}</p>
            )}

            <div className="text-card-actions">
              <button className="navigate-btn" onClick={handleNavigate}>
                Read Full Text
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <a
                href={`https://www.sefaria.org/${randomText.ref?.replace(/ /g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sefaria-link"
              >
                View on Sefaria
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="discover-history">
            <h4>Recent Discoveries</h4>
            <div className="history-list">
              {history.slice(1).map((item, idx) => (
                <button
                  key={idx}
                  className="history-item"
                  onClick={() => handleHistoryClick(item)}
                >
                  <span className="history-ref">{item.heRef || item.ref}</span>
                  {item.categories && item.categories.length > 0 && (
                    <span className="history-category">{item.categories[0]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default DiscoverPanel;
