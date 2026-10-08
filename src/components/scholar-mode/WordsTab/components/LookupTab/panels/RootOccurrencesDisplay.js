import React, { memo } from 'react';

export const RootOccurrencesDisplay = memo(function RootOccurrencesDisplay({ rootData, derivedWords, loading }) {
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);

  // Memoize sliced arrays to prevent recalculation on every render
  const displayedDerivedWords = useMemo(() =>
    derivedWords?.slice(0, 8) || [], [derivedWords]);

  const displayedOccurrences = useMemo(() =>
    showAllOccurrences ? rootData?.occurrences : rootData?.occurrences?.slice(0, 10),
    [showAllOccurrences, rootData?.occurrences]);

  const displayedBooks = useMemo(() =>
    rootData?.books?.slice(0, 8) || [], [rootData?.books]);

  if (loading) {
    return (
      <div className="root-occurrences-section loading">
        <div className="skeleton-bar" style={{ width: '60%', height: '20px' }}></div>
        <div className="skeleton-bar" style={{ width: '80%', height: '16px', marginTop: '8px' }}></div>
        <div className="skeleton-bar" style={{ width: '40%', height: '16px', marginTop: '8px' }}></div>
      </div>
    );
  }

  if (!rootData && !derivedWords?.length) return null;

  return (
    <div className="root-occurrences-section">
      {/* Root Header */}
      <div className="root-header">
        <span className="root-icon">🌳</span>
        <span className="root-title">שורש (Root)</span>
        {rootData?.root && (
          <span className="root-letters" dir="rtl">{rootData.root}</span>
        )}
        {rootData?.totalCount && (
          <span className="root-count">{rootData.totalCount}× in Tanakh</span>
        )}
      </div>

      {/* Theological Note */}
      {rootData?.patterns?.theologicalNote && (
        <div className="root-theological-note">
          <span className="note-icon">💡</span>
          <span className="note-text">{rootData.patterns.theologicalNote}</span>
        </div>
      )}

      {/* Derived Words */}
      {displayedDerivedWords.length > 0 && (
        <div className="derived-words-section">
          <div className="section-subheader">
            <span className="subheader-icon">📚</span>
            <span className="subheader-title">Words from this root</span>
          </div>
          <div className="derived-words-grid">
            {displayedDerivedWords.map((word, i) => (
              <div key={i} className="derived-word-card">
                <span className="dw-hebrew" dir="rtl">{word.word}</span>
                <span className="dw-gloss">{word.gloss}</span>
                <span className="dw-count" style={{ color: word.band?.color }}>
                  {word.count?.toLocaleString()}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Occurrences in Tanakh */}
      {rootData?.occurrences?.length > 0 && (
        <div className="occurrences-section">
          <div className="section-subheader">
            <span className="subheader-icon">📖</span>
            <span className="subheader-title">
              Occurrences in Tanakh
              {rootData.books?.length > 0 && (
                <span className="books-count">({rootData.books.length} books)</span>
              )}
            </span>
          </div>

          {/* First occurrence highlight */}
          {rootData.patterns?.firstOccurrence && (
            <div className="first-occurrence">
              <span className="first-label">First:</span>
              <a
                href={rootData.patterns.firstOccurrence.sefariaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="occurrence-link first"
              >
                {rootData.patterns.firstOccurrence.ref}
              </a>
            </div>
          )}

          {/* Occurrences list */}
          <div className="occurrences-list">
            {displayedOccurrences?.map((occ, i) => (
              <a
                key={i}
                href={occ.sefariaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="occurrence-link"
              >
                <span className="occ-ref">{occ.ref}</span>
                {occ.heRef && <span className="occ-he-ref" dir="rtl">{occ.heRef}</span>}
              </a>
            ))}
          </div>

          {rootData.occurrences.length > 10 && (
            <button
              type="button"
              className="show-more-occurrences"
              onClick={() => setShowAllOccurrences(!showAllOccurrences)}
            >
              {showAllOccurrences
                ? 'Show less'
                : `Show ${rootData.occurrences.length - 10} more...`}
            </button>
          )}

          {/* Books distribution */}
          {rootData.books?.length > 0 && (
            <div className="books-distribution">
              <span className="dist-label">Found in:</span>
              <div className="books-chips">
                {displayedBooks.map((book, i) => (
                  <span key={i} className="book-chip">{book}</span>
                ))}
                {rootData.books.length > 8 && (
                  <span className="more-books">+{rootData.books.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
RootOccurrencesDisplay.displayName = 'RootOccurrencesDisplay';

/**
 * PRO SCHOLAR: Root Family Display Component
 * Shows related words from the same shoresh with etymology and cognates
 */
