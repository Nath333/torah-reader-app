/**
 * WordDefinitionCard - Scholarly Dictionary Card Component
 *
 * A clean, professional dictionary-style card for displaying Hebrew/Aramaic
 * word definitions with multi-source support.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { translateEnglishToFrench, quickTranslate } from '../services/englishToFrenchService';
import { getSourceStyle } from '../constants/dictionarySources';
import './WordDefinitionCard.css';

// =============================================================================
// Constants
// =============================================================================

const MAX_DEFINITION_LENGTH = 120;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clean and truncate definition text for display
 */
const cleanDefinition = (text) => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/<[^>]+>/g, '') // Remove HTML
    .replace(/\(a hapax legomenon[^)]*\)/gi, '')
    .replace(/\(occurring[^)]*\)/gi, '')
    .replace(/\(in the c\. st\.[^)]*\)/gi, '')
    .replace(/\s*,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > MAX_DEFINITION_LENGTH) {
    const cutPoint = cleaned.substring(0, MAX_DEFINITION_LENGTH).lastIndexOf(',');
    cleaned = cutPoint > 60
      ? cleaned.substring(0, cutPoint) + '...'
      : cleaned.substring(0, MAX_DEFINITION_LENGTH - 3) + '...';
  }

  return cleaned;
};

/**
 * Process sources into unique definitions
 */
const processDefinitions = (sources, fallbackTranslation) => {
  const defs = [];
  const seen = new Set();

  if (sources?.length > 0) {
    for (const src of sources) {
      if (!src.definition) continue;

      const text = cleanDefinition(src.definition);
      if (!text) continue;

      const normalized = text.toLowerCase().slice(0, 40);
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      defs.push({
        text,
        source: src.name,
        year: src.year,
        fullName: src.fullName
      });
    }
  }

  // Fallback to primary definition
  if (defs.length === 0 && fallbackTranslation) {
    defs.push({
      text: cleanDefinition(fallbackTranslation),
      source: 'Dictionary',
      year: null
    });
  }

  return defs;
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Source Definition Item with optional French translation
 */
const SourceItem = React.memo(({ def, showFrench, initialFrench }) => {
  const [french, setFrench] = useState(initialFrench);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showFrench || french || !def.text) return;

    // Try cache first
    const cached = quickTranslate(def.text);
    if (cached) {
      setFrench(cached);
      return;
    }

    // Fetch translation
    setLoading(true);
    translateEnglishToFrench(def.text)
      .then(result => result && setFrench(result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showFrench, def.text, french]);

  const sourceStyle = getSourceStyle(def.source);

  return (
    <div className="wdc-source-item" title={def.fullName || def.source}>
      <div className="wdc-source-header">
        <span className="wdc-source-badge" style={sourceStyle}>
          {def.source}
        </span>
        {def.year && <span className="wdc-source-year">{def.year}</span>}
      </div>
      <p className="wdc-source-text">{def.text}</p>
      {showFrench && (
        <div className="wdc-french">
          {loading ? (
            <span className="wdc-french-loading">Traduction...</span>
          ) : french && (
            <span className="wdc-french-text">{french}</span>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Morphology Tags Display
 */
const MorphologyTags = React.memo(({ morphology }) => {
  if (!morphology) return null;

  const { partOfSpeech, binyan, tense, gender, number } = morphology;
  if (!partOfSpeech && !binyan) return null;

  return (
    <div className="wdc-morphology">
      {partOfSpeech && <span className="wdc-tag wdc-tag-pos">{partOfSpeech}</span>}
      {binyan && <span className="wdc-tag wdc-tag-binyan">{binyan}</span>}
      {tense && <span className="wdc-tag">{tense}</span>}
      {gender && <span className="wdc-tag">{gender === 'masculine' ? '♂' : gender === 'feminine' ? '♀' : gender}</span>}
      {number && <span className="wdc-tag">{number}</span>}
    </div>
  );
});

/**
 * Loading Skeleton
 */
const LoadingSkeleton = () => (
  <div className="wdc-skeleton">
    <div className="wdc-skeleton-bar wdc-skeleton-wide" />
    <div className="wdc-skeleton-bar wdc-skeleton-medium" />
    <div className="wdc-skeleton-bar wdc-skeleton-narrow" />
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

const WordDefinitionCard = ({
  word,
  translationData,
  isLoading,
  isAramaic: isAramaicProp,
  showFrench,
  isInVocabulary,
  onSave,
  onClose
}) => {
  // Extract data
  const translation = translationData?.english || translationData?.translation;
  const french = translationData?.french;
  const root = translationData?.root;
  const headword = translationData?.headword;
  const morphology = translationData?.morphology;
  const sources = translationData?.sources || [];
  const strongNumber = sources.find(s => s.strongNumber)?.strongNumber || translationData?.strongNumber;

  // Detect language
  const detectedLanguage = translationData?.language;
  const isAramaic = detectedLanguage
    ? detectedLanguage.toLowerCase() === 'aramaic'
    : isAramaicProp;

  // Process definitions
  const definitions = useMemo(
    () => processDefinitions(sources, translation),
    [sources, translation]
  );

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (!translation || !word) return;
    onSave?.(word, translation, french || '');
  }, [word, translation, french, onSave]);

  const cardClass = `word-definition-card ${isAramaic ? 'aramaic' : 'hebrew'}`;

  return (
    <article className={cardClass} role="dialog" aria-label={`Definition for ${word}`}>
      {/* Header */}
      <header className="wdc-header">
        <div className="wdc-header-left">
          <span className="wdc-word" dir="rtl" lang={isAramaic ? 'arc' : 'he'}>
            {word}
          </span>
          <span className={`wdc-lang ${isAramaic ? 'aramaic' : 'hebrew'}`}>
            {isAramaic ? 'ארמית' : 'עברית'}
          </span>
          {strongNumber && (
            <span className="wdc-strong">H{strongNumber}</span>
          )}
        </div>
        <button
          className="wdc-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
      </header>

      {/* Root/Headword Info */}
      {(root || (headword && headword !== word)) && (
        <div className="wdc-etymology">
          {root && (
            <div className="wdc-root">
              <span className="wdc-label">שורש</span>
              <span className="wdc-value">{root}</span>
            </div>
          )}
          {headword && headword !== word && headword !== root && (
            <div className="wdc-headword">
              <span className="wdc-label">צורה</span>
              <span className="wdc-value">{headword}</span>
            </div>
          )}
        </div>
      )}

      {/* Morphology */}
      <MorphologyTags morphology={morphology} />

      {/* Loading State */}
      {isLoading && !translation && <LoadingSkeleton />}

      {/* Definitions */}
      {definitions.length > 0 && (
        <section className="wdc-definitions">
          <div className="wdc-def-header">
            <span className="wdc-flag">EN</span>
            {showFrench && <span className="wdc-flag wdc-flag-fr">FR</span>}
            <span className="wdc-source-count">
              {definitions.length} source{definitions.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="wdc-sources">
            {definitions.map((def, idx) => (
              <SourceItem
                key={`${def.source}-${idx}`}
                def={def}
                showFrench={showFrench}
                initialFrench={idx === 0 ? french : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!translation && !isLoading && (
        <div className="wdc-empty">
          <span className="wdc-empty-icon">📖</span>
          <span>No definition found</span>
        </div>
      )}

      {/* Footer */}
      {translation && (
        <footer className="wdc-footer">
          {isInVocabulary ? (
            <span className="wdc-saved">✓ Saved</span>
          ) : onSave && (
            <button
              className="wdc-save-btn"
              onClick={handleSave}
              type="button"
            >
              + Save Word
            </button>
          )}
        </footer>
      )}
    </article>
  );
};

export default React.memo(WordDefinitionCard);
