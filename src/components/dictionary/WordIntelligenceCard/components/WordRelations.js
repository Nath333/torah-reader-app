/**
 * WordIntelligenceCard - Word Relations
 * Etymology, related words (synonyms/antonyms), alternative roots
 */

import React, { memo, useState, useMemo } from 'react';
import { getAllAlternativeRoots } from '../../../../services/analysis/rootExtraction';

// =============================================================================
// ETYMOLOGY SECTION
// =============================================================================

export const EtymologySection = memo(function EtymologySection({ rootData, root }) {
  if (!rootData) return null;

  const { etymology, cognates, notes, semanticField, frequency } = rootData;

  return (
    <div className="wic-etymology">
      <div className="ety-header">
        <span className="ety-icon">*</span>
        <span className="ety-title">Etymology</span>
        {semanticField && <span className="ety-field">{semanticField}</span>}
      </div>

      {etymology && (
        <div className="ety-proto">
          <span className="ety-label">Proto-Semitic:</span>
          <span className="ety-value">{etymology}</span>
        </div>
      )}

      {cognates && Object.keys(cognates).length > 0 && (
        <div className="ety-cognates">
          <span className="ety-label">Cognates:</span>
          <div className="cognate-list">
            {Object.entries(cognates).map(([lang, word]) => (
              <span key={lang} className="cognate-item">
                <span className="cognate-lang">{lang}:</span>
                <span className="cognate-word">{word}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {frequency && (
        <div className="ety-frequency">
          <div className="freq-item">
            <span className="freq-icon">📜</span>
            <span className="freq-number">{frequency.tanakh || 0}</span>
            <span className="freq-desc">Tanakh</span>
          </div>
          <div className="freq-item">
            <span className="freq-icon">📚</span>
            <span className="freq-number">{frequency.talmud || 0}</span>
            <span className="freq-desc">Talmud</span>
          </div>
        </div>
      )}

      {notes && <div className="ety-notes">{notes}</div>}
    </div>
  );
});

// =============================================================================
// RELATED WORD LIST
// =============================================================================

export const RelatedWordList = memo(function RelatedWordList({ words, type, onWordClick }) {
  if (!words || words.length === 0) return null;

  return (
    <div className="related-words">
      {words.slice(0, 5).map((item, i) => (
        <button
          key={i}
          className={`related-word ${type}`}
          onClick={() => onWordClick?.(item.word || item)}
          dir="rtl"
        >
          {item.word || item}
        </button>
      ))}
    </div>
  );
});

// =============================================================================
// RELATED WORDS SECTION
// =============================================================================

export const RelatedWordsSection = memo(function RelatedWordsSection({ semantics, onWordClick }) {
  const { synonyms = [], antonyms = [] } = semantics || {};

  if (synonyms.length === 0 && antonyms.length === 0) return null;

  return (
    <div className="wic-related">
      {synonyms.length > 0 && (
        <div className="related-group synonyms">
          <span className="related-label">Synonyms:</span>
          <RelatedWordList words={synonyms} type="synonym" onWordClick={onWordClick} />
        </div>
      )}
      {antonyms.length > 0 && (
        <div className="related-group antonyms">
          <span className="related-label">Antonyms:</span>
          <RelatedWordList words={antonyms} type="antonym" onWordClick={onWordClick} />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// ALTERNATIVE ROOTS SECTION
// =============================================================================

export const AlternativeRootsSection = memo(function AlternativeRootsSection({ word, onRootClick }) {
  const [expanded, setExpanded] = useState(false);

  const altRoots = useMemo(() => {
    try {
      return getAllAlternativeRoots?.(word);
    } catch {
      return null;
    }
  }, [word]);

  if (!altRoots?.hasMultiple) return null;

  const typeLabels = {
    comparison: { label: 'Compare', icon: '↔️', color: '#6366f1' },
    uncertain: { label: 'Perhaps', icon: '❓', color: '#f59e0b' },
    cognate: { label: 'Cognate', icon: '🔗', color: '#10b981' },
    related: { label: 'Related', icon: '≈', color: '#8b5cf6' },
    denominative: { label: 'Denom.', icon: '📝', color: '#0891b2' },
    derivation: { label: 'From', icon: '←', color: '#059669' },
    root_symbol: { label: 'Root', icon: '√', color: '#2563eb' },
    cross_reference: { label: 'See', icon: '→', color: '#64748b' }
  };

  return (
    <div className="wic-alternative-roots">
      <button
        className="alt-roots-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="alt-roots-icon">🌿</span>
        <span className="alt-roots-title">Alternative Roots</span>
        <span className="alt-roots-count">{altRoots.alternatives.length}</span>
        <span className={`alt-roots-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {altRoots.scholarlyNote && (
        <div className="alt-roots-note">
          <span className="note-icon">📚</span>
          <span className="note-text">{altRoots.scholarlyNote}</span>
        </div>
      )}

      {expanded && (
        <div className="alt-roots-content">
          {altRoots.alternatives.map((alt, i) => {
            const typeInfo = typeLabels[alt.type] || { label: alt.type, icon: '•', color: '#6b7280' };
            return (
              <div key={i} className="alt-root-item">
                <div className="alt-root-header">
                  <button
                    className="alt-root-word"
                    onClick={() => onRootClick?.(alt.root)}
                    dir="rtl"
                    style={{ borderColor: typeInfo.color }}
                  >
                    {alt.root}
                  </button>
                  <span
                    className="alt-root-type"
                    style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span className="alt-root-confidence">{alt.confidence}%</span>
                </div>
                {alt.context && (
                  <div className="alt-root-context">
                    <span className="context-source">{alt.source}:</span>
                    <span className="context-text">{alt.context}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
