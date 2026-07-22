/**
 * EnhancedVerseDisplay - Enhanced Verse Presentation
 *
 * A premium verse display component that integrates:
 * - Clickable word lookup
 * - Quick mastery tracking
 * - Commentary preview
 * - Beautiful typography
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { QuickMasterySelector } from '../study/MasteryTracker';
import useMastery, { MASTERY_LEVELS } from '../../hooks/useMastery';
import ClickableText from './ClickableText';
import { prefetchVerse } from '../../services/wordPrefetchService';
import { lookupParallel } from '../../services/unifiedLookupService';
import { FEATURES } from '../../services/featureFlags';
import './EnhancedVerseDisplay.css';

// =============================================================================
// Verse Number Badge with Mastery Indicator
// =============================================================================

const VerseNumber = React.memo(function VerseNumber({ number, isSelected, masteryLevel = 0 }) {
  const config = MASTERY_LEVELS[masteryLevel];

  return (
    <span className={`verse-number-badge ${isSelected ? 'selected' : ''}`}>
      {number}
      {masteryLevel > 0 && (
        <span
          className="mastery-dot"
          style={{ background: config.color }}
          title={`${config.name}: ${config.description}`}
        />
      )}
    </span>
  );
});

// =============================================================================
// Inline Mastery Rating (Always Visible)
// =============================================================================

const InlineMasteryRating = React.memo(function InlineMasteryRating({
  book,
  chapter,
  verse
}) {
  return (
    <div className="inline-mastery-rating">
      <QuickMasterySelector
        book={book}
        chapter={chapter}
        verse={verse}
        compact
      />
    </div>
  );
});

// =============================================================================
// Verse Actions Bar (Hover actions - bookmark, study)
// =============================================================================

const VerseActions = React.memo(function VerseActions({
  isBookmarked,
  onBookmark,
  onStudy
}) {
  return (
    <div className="verse-actions">
      <button
        className={`action-btn bookmark ${isBookmarked ? 'active' : ''}`}
        onClick={onBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
      >
        {isBookmarked ? '★' : '☆'}
      </button>
      <button
        className="action-btn study"
        onClick={onStudy}
        title="Open in Study Center"
      >
        📖
      </button>
    </div>
  );
});

// =============================================================================
// Translation Display
// =============================================================================

const TranslationBlock = React.memo(function TranslationBlock({
  english,
  french,
  onkelos,
  showFrench,
  showOnkelos
}) {
  if (!english && !french && !onkelos) return null;

  return (
    <div className="translation-block">
      {english && (
        <div className="translation english">
          <span className="translation-flag">EN</span>
          <p className="translation-text">{english}</p>
        </div>
      )}
      {showFrench && french && (
        <div className="translation french">
          <span className="translation-flag">FR</span>
          <p className="translation-text">{french}</p>
        </div>
      )}
      {showOnkelos && onkelos && (
        <div className="translation onkelos">
          <span className="translation-flag">תרגום</span>
          <p className="translation-text" dir="rtl">{onkelos}</p>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Commentary Preview
// =============================================================================

const CommentaryPreview = React.memo(function CommentaryPreview({
  rashi,
  ramban,
  onExpand
}) {
  const hasCommentary = rashi || ramban;

  if (!hasCommentary) return null;

  return (
    <div className="commentary-preview">
      <div className="preview-header">
        <span className="preview-title">Commentary</span>
        <button className="preview-expand" onClick={onExpand}>
          View All →
        </button>
      </div>
      {rashi && (
        <div className="preview-item rashi">
          <span className="commentator-name">רש״י</span>
          <p className="preview-text" dir="rtl">
            {rashi.substring(0, 150)}
            {rashi.length > 150 && '...'}
          </p>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

const EnhancedVerseDisplay = ({
  // Verse data
  hebrewText,
  englishText,
  frenchText,
  onkelosText,
  // Context
  book,
  chapter,
  verseNumber,
  // Commentary
  rashiText,
  rambanText,
  // State
  isSelected = false,
  isBookmarked = false,
  // Display options
  displayMode = 'enhanced', // 'enhanced' | 'simple'
  showTranslations = true,
  showFrench = false,
  showOnkelos = false,
  showCommentary = true,
  showMastery = true,
  enlargeFirstLetter = true,
  prefetchEnabled = true, // PRO SCHOLAR V10: Enable prefetching
  // Vocabulary
  onSaveWord,
  hasWord,
  // Callbacks
  onSelect,
  onBookmark,
  onStudy,
  onCommentaryExpand
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const verseRef = useRef(null);
  const prefetchedRef = useRef(false);

  // PRO SCHOLAR V10: Prefetch verse words when it enters viewport
  useEffect(() => {
    if (!prefetchEnabled || !hebrewText || prefetchedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetchedRef.current) {
            prefetchedRef.current = true;
            // Prefetch with low priority (background)
            prefetchVerse(hebrewText, lookupParallel, 'low');
          }
        });
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    if (verseRef.current) {
      observer.observe(verseRef.current);
    }

    return () => observer.disconnect();
  }, [prefetchEnabled, hebrewText]);

  // Get mastery level for this verse
  const { getVerseMastery } = useMastery();
  const masteryLevel = getVerseMastery(book, chapter, verseNumber);

  const handleSelect = useCallback(() => {
    onSelect?.({ book, chapter, verse: verseNumber, hebrewText });
  }, [onSelect, book, chapter, verseNumber, hebrewText]);

  const handleBookmark = useCallback((e) => {
    e.stopPropagation();
    onBookmark?.({ book, chapter, verse: verseNumber });
  }, [onBookmark, book, chapter, verseNumber]);

  const handleStudy = useCallback((e) => {
    e.stopPropagation();
    onStudy?.({ book, chapter, verse: verseNumber, hebrewText });
  }, [onStudy, book, chapter, verseNumber, hebrewText]);

  // Render Hebrew text
  const renderHebrewText = useMemo(() => {
    if (!hebrewText) return null;

    return (
      <ClickableText
        text={hebrewText}
        language="hebrew"
        className="verse-hebrew"
        showFrench={showFrench}
        onSaveWord={onSaveWord}
        hasWord={hasWord}
        enlargeFirstLetter={enlargeFirstLetter && verseNumber === 1}
      />
    );
  }, [hebrewText, showFrench, onSaveWord, hasWord, enlargeFirstLetter, verseNumber]);

  const containerClass = [
    'enhanced-verse',
    displayMode,
    isSelected && 'selected',
    isHovered && 'hovered',
    isBookmarked && 'bookmarked'
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={verseRef}
      className={containerClass}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Verse Number with Mastery Indicator */}
      <VerseNumber number={verseNumber} isSelected={isSelected} masteryLevel={masteryLevel} />

      {/* Main Content */}
      <div className="verse-content">
        {/* Hebrew Text */}
        <div className="hebrew-section">
          {renderHebrewText}
        </div>

        {/* Translations */}
        {showTranslations && (
          <TranslationBlock
            english={englishText}
            french={frenchText}
            onkelos={onkelosText}
            showFrench={showFrench}
            showOnkelos={showOnkelos}
          />
        )}

        {/* Commentary Preview */}
        {showCommentary && (rashiText || rambanText) && (
          <CommentaryPreview
            rashi={rashiText}
            ramban={rambanText}
            onExpand={onCommentaryExpand}
          />
        )}
      </div>

      {/* Mastery Rating - ALWAYS VISIBLE for easy self-assessment */}
      {showMastery && FEATURES.MASTERY_TRACKING && (
        <InlineMasteryRating
          book={book}
          chapter={chapter}
          verse={verseNumber}
        />
      )}

      {/* Other Actions (visible on hover or when selected) */}
      {(isHovered || isSelected) && (
        <VerseActions
          isBookmarked={isBookmarked}
          onBookmark={handleBookmark}
          onStudy={handleStudy}
        />
      )}
    </div>
  );
};

EnhancedVerseDisplay.propTypes = {
  hebrewText: PropTypes.string.isRequired,
  englishText: PropTypes.string,
  frenchText: PropTypes.string,
  onkelosText: PropTypes.string,
  book: PropTypes.string.isRequired,
  chapter: PropTypes.number.isRequired,
  verseNumber: PropTypes.number.isRequired,
  rashiText: PropTypes.string,
  rambanText: PropTypes.string,
  isSelected: PropTypes.bool,
  isBookmarked: PropTypes.bool,
  displayMode: PropTypes.oneOf(['enhanced', 'simple']),
  showTranslations: PropTypes.bool,
  showFrench: PropTypes.bool,
  showOnkelos: PropTypes.bool,
  showCommentary: PropTypes.bool,
  showMastery: PropTypes.bool,
  enlargeFirstLetter: PropTypes.bool,
  prefetchEnabled: PropTypes.bool, // PRO SCHOLAR V10
  onSaveWord: PropTypes.func,
  hasWord: PropTypes.func,
  onSelect: PropTypes.func,
  onBookmark: PropTypes.func,
  onStudy: PropTypes.func,
  onCommentaryExpand: PropTypes.func
};

export default React.memo(EnhancedVerseDisplay);
