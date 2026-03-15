import React from 'react';
import PropTypes from 'prop-types';
import './Breadcrumb.css';

/**
 * Breadcrumb - Shows current location in the text hierarchy
 * Helps users understand where they are and navigate back
 */
const Breadcrumb = ({
  category,
  book,
  chapter,
  onNavigateHome,
  onNavigateCategory,
  onNavigateBook,
  isTalmud,
}) => {
  // Format chapter for display (Talmud uses different notation)
  const formatChapter = (ch) => {
    if (isTalmud && typeof ch === 'string') {
      return ch; // e.g., "2a", "2b"
    }
    return `Chapter ${ch}`;
  };

  // Get Hebrew name for category
  const getCategoryHebrew = (cat) => {
    const hebrewNames = {
      'Torah': 'תורה',
      'Prophets': 'נביאים',
      'Writings': 'כתובים',
      'Talmud': 'תלמוד',
      'Mishnah': 'משנה',
    };
    return hebrewNames[cat] || '';
  };

  return (
    <nav className="breadcrumb" aria-label="Text navigation">
      <ol className="breadcrumb-list">
        {/* Home */}
        <li className="breadcrumb-item">
          <button
            className="breadcrumb-link home"
            onClick={onNavigateHome}
            title="Go to home"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
        </li>

        {/* Category */}
        {category && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </li>
            <li className="breadcrumb-item">
              <button
                className="breadcrumb-link"
                onClick={onNavigateCategory}
                title={`View all ${category} books`}
              >
                <span className="breadcrumb-text">{category}</span>
                <span className="breadcrumb-hebrew">{getCategoryHebrew(category)}</span>
              </button>
            </li>
          </>
        )}

        {/* Book */}
        {book && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </li>
            <li className="breadcrumb-item">
              <button
                className="breadcrumb-link"
                onClick={onNavigateBook}
                title={`View chapters of ${book}`}
              >
                <span className="breadcrumb-text">{book}</span>
              </button>
            </li>
          </>
        )}

        {/* Chapter (current - not clickable) */}
        {chapter && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </li>
            <li className="breadcrumb-item current" aria-current="page">
              <span className="breadcrumb-current">
                {formatChapter(chapter)}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};

Breadcrumb.propTypes = {
  category: PropTypes.string,
  book: PropTypes.string,
  chapter: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onNavigateHome: PropTypes.func,
  onNavigateCategory: PropTypes.func,
  onNavigateBook: PropTypes.func,
  isTalmud: PropTypes.bool,
};

Breadcrumb.defaultProps = {
  category: null,
  book: null,
  chapter: null,
  onNavigateHome: () => {},
  onNavigateCategory: () => {},
  onNavigateBook: () => {},
  isTalmud: false,
};

export default React.memo(Breadcrumb);
