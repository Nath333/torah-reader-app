/**
 * ReadingProgressBar - Visual indicator of reading progress
 * Shows a thin progress bar at the top of the content area
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useScrollProgress } from '../../hooks';
import './ReadingProgressBar.css';

const ReadingProgressBar = ({
  currentVerse,
  totalVerses,
  book,
  chapter
}) => {
  const { progress, showScrollTop, scrollToTop } = useScrollProgress();

  // Calculate verse-based progress if available
  const verseProgress = totalVerses > 0
    ? Math.round((currentVerse / totalVerses) * 100)
    : null;

  return (
    <div className="reading-progress-container">
      {/* Progress Bar */}
      <div className="reading-progress-bar">
        <div
          className="reading-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress Info */}
      <div className={`reading-progress-info ${progress > 5 ? 'visible' : ''}`}>
        <span className="progress-text">
          {Math.round(progress)}% read
        </span>
        {verseProgress !== null && currentVerse > 0 && (
          <span className="verse-progress">
            Verse {currentVerse}/{totalVerses}
          </span>
        )}
        <span className="chapter-info">
          {book} {chapter}
        </span>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Back to top"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
};

ReadingProgressBar.propTypes = {
  currentVerse: PropTypes.number,
  totalVerses: PropTypes.number,
  book: PropTypes.string,
  chapter: PropTypes.string
};

ReadingProgressBar.defaultProps = {
  currentVerse: 0,
  totalVerses: 0,
  book: '',
  chapter: ''
};

export default ReadingProgressBar;
