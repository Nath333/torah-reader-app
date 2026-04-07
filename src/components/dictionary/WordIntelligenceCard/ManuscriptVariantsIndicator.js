/**
 * ManuscriptVariantsIndicator Component
 * Shows if word has DSS/LXX manuscript variants
 */

import React, { useState, useMemo, memo } from 'react';

// Manuscript variants service
import { getVariantsForVerse, MANUSCRIPT_SOURCES } from '../../../services/textual/manuscriptVariantsService';

/**
 * Manuscript Variants Indicator - Shows if word has DSS/LXX variants
 * @param {Object} props
 * @param {string} props.verseRef - Verse reference (Book.Chapter.Verse)
 */
const ManuscriptVariantsIndicator = memo(function ManuscriptVariantsIndicator({ verseRef }) {
  const [expanded, setExpanded] = useState(false);

  const variantData = useMemo(() => {
    if (!verseRef) return null;
    try {
      return getVariantsForVerse?.(verseRef);
    } catch {
      return null;
    }
  }, [verseRef]);

  if (!variantData || !variantData.variants?.length) return null;

  const hasSignificant = variantData.hasSignificantVariants;
  const variantCount = variantData.variants.length;

  return (
    <div className={`wic-variants ${hasSignificant ? 'significant' : ''}`}>
      <button
        className="variants-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Manuscript variants: ${variantCount} variant${variantCount !== 1 ? 's' : ''}${hasSignificant ? ' with significant differences' : ''}`}
      >
        <span className="variants-icon" aria-hidden="true">📜</span>
        <span className="variants-title">Manuscript Variants</span>
        <span className={`variants-count ${hasSignificant ? 'significant' : ''}`}>
          {variantCount} variant{variantCount !== 1 ? 's' : ''}
          {hasSignificant && <span aria-hidden="true"> ⚠️</span>}
        </span>
        <span className={`variants-arrow ${expanded ? 'expanded' : ''}`} aria-hidden="true">▼</span>
      </button>

      {expanded && (
        <div className="variants-content">
          <div className="variants-mt">
            <span className="mt-label">Masoretic Text:</span>
            <span className="mt-text" dir="rtl">{variantData.masoreticText}</span>
          </div>

          <div className="variants-list">
            {variantData.variants.map((variant, i) => {
              const sourceInfo = variant.sourceInfo || MANUSCRIPT_SOURCES[variant.source?.toUpperCase()] || {};
              return (
                <div key={i} className={`variant-item ${variant.significance}`}>
                  <div className="variant-source">
                    <span className="source-abbrev">{sourceInfo.abbreviation || variant.source}</span>
                    <span className="source-name">{sourceInfo.name || variant.source}</span>
                    {sourceInfo.date && (
                      <span className="source-date">{sourceInfo.date}</span>
                    )}
                  </div>
                  <div className="variant-reading">
                    <span className="reading-text">{variant.reading}</span>
                  </div>
                  <div className="variant-meta">
                    <span className={`significance-badge ${variant.significance}`}>
                      {variant.significance}
                    </span>
                    {variant.notes && (
                      <span className="variant-notes">{variant.notes}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default ManuscriptVariantsIndicator;
