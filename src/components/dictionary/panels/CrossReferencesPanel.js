/**
 * CrossReferencesPanel - PRO SCHOLAR V14
 *
 * Displays cross-references parsed from BDB/Jastrow definitions
 * Shows "cf.", "see", "comp.", "opp." references with clickable links
 *
 * @module CrossReferencesPanel
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { extractCrossReferences } from '../../../services/scholarly/wordRelationshipService';
import { buildPanelClassName } from '../../../hooks/usePanelData';
import './CrossReferencesPanel.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const REF_TYPE_CONFIG = {
  compare: { icon: '≈', label: 'Compare', hebrew: 'השווה', color: '#3b82f6' },
  see: { icon: '→', label: 'See', hebrew: 'ראה', color: '#22c55e' },
  etymology: { icon: '🌱', label: 'From', hebrew: 'מן', color: '#8b5cf6' },
  synonym: { icon: '=', label: 'Synonym', hebrew: 'נרדף', color: '#14b8a6' },
  antonym: { icon: '↔', label: 'Opposite', hebrew: 'הפוך', color: '#ef4444' },
  derivative: { icon: '↳', label: 'Derived', hebrew: 'נגזר', color: '#f59e0b' }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single cross-reference item
 */
const CrossRefItem = memo(function CrossRefItem({ crossRef, onWordClick }) {
  const config = REF_TYPE_CONFIG[crossRef.type] || REF_TYPE_CONFIG.see;

  return (
    <button
      className="cross-ref-item"
      style={{ '--ref-color': config.color }}
      onClick={() => onWordClick?.(crossRef.word)}
      title={crossRef.context}
    >
      <span className="cri-type-badge">
        <span className="cri-icon">{config.icon}</span>
        <span className="cri-label">{config.hebrew}</span>
      </span>
      <span className="cri-word" dir="rtl">{crossRef.word}</span>
      <span className="cri-source">{crossRef.sourceDict}</span>
    </button>
  );
});

CrossRefItem.propTypes = {
  crossRef: PropTypes.shape({
    word: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    marker: PropTypes.string,
    sourceDict: PropTypes.string,
    context: PropTypes.string
  }).isRequired,
  onWordClick: PropTypes.func
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CrossReferencesPanel - Shows cross-references from dictionary definitions
 *
 * @param {Object} props
 * @param {Object} props.dictionaryData - Dictionary entries (bdb, jastrow, etc.)
 * @param {Function} [props.onWordClick] - Callback when a word is clicked
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function CrossReferencesPanel({
  dictionaryData,
  onWordClick,
  compact = false,
  dark = false,
  className = ''
}) {
  // Parse cross-references from all dictionary sources
  const crossRefs = useMemo(() => {
    if (!dictionaryData) return [];

    const allRefs = [];
    const seen = new Set();

    // Extract from each dictionary source
    const sources = [
      { data: dictionaryData.bdb, name: 'BDB' },
      { data: dictionaryData.jastrow, name: 'Jastrow' },
      { data: dictionaryData.klein, name: 'Klein' },
      { data: dictionaryData.gesenius, name: 'Gesenius' },
      { data: dictionaryData.strongs, name: "Strong's" }
    ];

    for (const { data, name } of sources) {
      if (!data) continue;

      const definition = data.definition || data.gloss || data.english || '';
      const refs = extractCrossReferences(definition, name);

      for (const ref of refs) {
        const key = `${ref.word}-${ref.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          allRefs.push(ref);
        }
      }
    }

    return allRefs;
  }, [dictionaryData]);

  // Group by type
  const groupedRefs = useMemo(() => {
    const groups = {};
    for (const ref of crossRefs) {
      if (!groups[ref.type]) {
        groups[ref.type] = [];
      }
      groups[ref.type].push(ref);
    }
    return groups;
  }, [crossRefs]);

  // Don't render if no cross-references
  if (crossRefs.length === 0) {
    return null;
  }

  const panelClassName = buildPanelClassName('cross-references-panel', { compact, dark, className });

  return (
    <div className={panelClassName}>
      <div className="crp-header">
        <span className="crp-icon">🔗</span>
        <span className="crp-title">Cross-References</span>
        <span className="crp-hebrew">הפניות</span>
        <span className="crp-count">{crossRefs.length}</span>
      </div>

      <div className="crp-content">
        {Object.entries(groupedRefs).map(([type, refs]) => {
          const config = REF_TYPE_CONFIG[type] || REF_TYPE_CONFIG.see;

          return (
            <div key={type} className="crp-group">
              <div className="crp-group-header">
                <span className="crp-group-icon">{config.icon}</span>
                <span className="crp-group-label">{config.label}</span>
              </div>
              <div className="crp-group-items">
                {refs.map((refItem, idx) => (
                  <CrossRefItem
                    key={`${refItem.word}-${idx}`}
                    crossRef={refItem}
                    onWordClick={onWordClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="crp-footer">
        <span className="crp-note-icon">📖</span>
        <span className="crp-note-text">
          // Parsed from BDB, Jastrow, and other scholarly dictionaries
        </span>
      </div>
    </div>
  );
}

CrossReferencesPanel.propTypes = {
  dictionaryData: PropTypes.object,
  onWordClick: PropTypes.func,
  compact: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

export default memo(CrossReferencesPanel);
