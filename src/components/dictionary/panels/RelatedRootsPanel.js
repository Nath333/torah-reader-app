/**
 * RelatedRootsPanel - PRO SCHOLAR V13 Related Roots Display
 *
 * Shows roots that are:
 * - Semantically related (synonyms, antonyms)
 * - Phonetically similar (share 2+ letters)
 * - Scholarly compared (academic connections)
 *
 * @module RelatedRootsPanel
 */

import React, { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getComprehensiveRootAnalysis } from '../../../services/scholarly/wordRelationshipService';
import { buildPanelClassName } from '../../../hooks/usePanelData';
import './RelatedRootsPanel.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const RELATION_CONFIG = {
  synonym: { icon: '≈', label: 'Synonym', hebrew: 'נרדף', color: '#22c55e' },
  antonym: { icon: '↔', label: 'Antonym', hebrew: 'הפוך', color: '#ef4444' },
  semantic: { icon: '◈', label: 'Related', hebrew: 'קשור', color: '#3b82f6' },
  phonetic: { icon: '🔤', label: 'Similar', hebrew: 'דומה', color: '#8b5cf6' },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single related root item
 */
const RelatedRootItem = memo(function RelatedRootItem({
  rootData,
  onRootClick,
  showDefinition = true
}) {
  const { root, meaning, relation, note } = rootData;
  const config = RELATION_CONFIG[relation] || RELATION_CONFIG.semantic;

  return (
    <button
      className="related-root-item"
      onClick={() => onRootClick?.(root)}
      style={{ '--relation-color': config.color }}
      title={note || `${config.label}: ${meaning}`}
    >
      <span className="rri-relation-badge">
        <span className="rri-icon">{config.icon}</span>
        <span className="rri-label">{config.hebrew}</span>
      </span>
      <span className="rri-root" dir="rtl">{root}</span>
      {showDefinition && meaning && (
        <span className="rri-meaning">{meaning}</span>
      )}
      {note && (
        <span className="rri-note">{note}</span>
      )}
    </button>
  );
});

RelatedRootItem.propTypes = {
  rootData: PropTypes.shape({
    root: PropTypes.string.isRequired,
    meaning: PropTypes.string,
    relation: PropTypes.string,
    note: PropTypes.string
  }).isRequired,
  onRootClick: PropTypes.func,
  showDefinition: PropTypes.bool
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RelatedRootsPanel - Shows roots related to the current word's root
 *
 * @param {Object} props
 * @param {string} props.root - The 3-letter root to find relations for
 * @param {string} [props.word] - The original word (for context)
 * @param {Function} [props.onRootClick] - Callback when a root is clicked
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function RelatedRootsPanel({
  root,
  word,
  onRootClick,
  compact = false,
  dark = false,
  className = ''
}) {
  const [expanded, setExpanded] = useState(false);

  // Get related roots data
  const analysisData = useMemo(() => {
    if (!root) return null;
    return getComprehensiveRootAnalysis(root);
  }, [root]);

  // Early return if no data
  if (!analysisData || !analysisData.hasData) {
    return null;
  }

  const { relatedRoots, synonymConnections, antonymConnections, parallelRoots, stats } = analysisData;
  const totalRelations = stats.relatedRootsCount + stats.synonymsCount + stats.antonymsCount + (stats.parallelRootsCount || 0);

  if (totalRelations === 0) {
    return null;
  }

  const panelClassName = buildPanelClassName('related-roots-panel', { compact, dark, className });

  return (
    <details
      className={panelClassName}
      open={expanded}
      onToggle={(e) => setExpanded(e.target.open)}
    >
      <summary className="rrp-header">
        <span className="rrp-icon">🔗</span>
        <span className="rrp-title">Related Roots</span>
        <span className="rrp-hebrew">שרשים קרובים</span>
        <span className="rrp-count">{totalRelations}</span>
      </summary>

      <div className="rrp-content">
        {/* Related roots from database */}
        {relatedRoots && relatedRoots.length > 0 && (
          <div className="rrp-section">
            <div className="rrp-section-header">
              <span className="rrp-section-icon">🌳</span>
              <span className="rrp-section-title">Scholarly Connections</span>
            </div>
            <div className="rrp-items">
              {relatedRoots.map((rel, idx) => (
                <RelatedRootItem
                  key={`${rel.root}-${idx}`}
                  rootData={rel}
                  onRootClick={onRootClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Synonym connections */}
        {synonymConnections && synonymConnections.length > 0 && (
          <div className="rrp-section">
            <div className="rrp-section-header">
              <span className="rrp-section-icon">≈</span>
              <span className="rrp-section-title">Synonyms</span>
            </div>
            <div className="rrp-items">
              {synonymConnections.map((conn, idx) => (
                <div key={idx} className="rrp-connection">
                  <span className="rrp-source-word" dir="rtl">{conn.word}</span>
                  <span className="rrp-arrow">→</span>
                  {conn.synonyms.map((syn, sIdx) => (
                    <button
                      key={sIdx}
                      className="rrp-synonym"
                      onClick={() => onRootClick?.(syn)}
                      dir="rtl"
                    >
                      {syn}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Antonym connections */}
        {antonymConnections && antonymConnections.length > 0 && (
          <div className="rrp-section">
            <div className="rrp-section-header">
              <span className="rrp-section-icon">↔</span>
              <span className="rrp-section-title">Antonyms</span>
            </div>
            <div className="rrp-items">
              {antonymConnections.map((conn, idx) => (
                <div key={idx} className="rrp-connection">
                  <span className="rrp-source-word" dir="rtl">{conn.word}</span>
                  <span className="rrp-arrow">⇄</span>
                  {conn.antonyms.map((ant, aIdx) => (
                    <button
                      key={aIdx}
                      className="rrp-antonym"
                      onClick={() => onRootClick?.(ant)}
                      dir="rtl"
                    >
                      {ant}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRO SCHOLAR V17: Parallel roots with definitions */}
        {parallelRoots && parallelRoots.length > 0 && (
          <div className="rrp-section rrp-parallel">
            <div className="rrp-section-header">
              <span className="rrp-section-icon">⚖️</span>
              <span className="rrp-section-title">Parallel Roots</span>
              <span className="rrp-section-count">{parallelRoots.length}</span>
            </div>
            <div className="rrp-parallel-list">
              {parallelRoots.slice(0, expanded ? parallelRoots.length : 5).map((pr, idx) => (
                <button
                  key={idx}
                  className={`rrp-parallel-item ${pr.relation}`}
                  onClick={() => onRootClick?.(pr.word)}
                  title={`${pr.relation === 'synonym' ? '≈' : '↔'} ${pr.sourceWord}: ${pr.sourceMeaning || ''}`}
                >
                  <span className="rrp-parallel-rel">
                    {pr.relation === 'synonym' ? '≈' : '↔'}
                  </span>
                  <span className="rrp-parallel-word" dir="rtl">{pr.word}</span>
                  {pr.sourceMeaning && (
                    <span className="rrp-parallel-def">
                      ({pr.sourceWord}: {pr.sourceMeaning})
                    </span>
                  )}
                </button>
              ))}
              {parallelRoots.length > 5 && !expanded && (
                <button className="rrp-show-more" onClick={() => setExpanded(true)}>
                  +{parallelRoots.length - 5} more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scholarly note */}
        <div className="rrp-footer">
          <span className="rrp-note-icon">📖</span>
          <span className="rrp-note-text">
            // Comparing related roots helps understand semantic nuances
          </span>
        </div>
      </div>
    </details>
  );
}

RelatedRootsPanel.propTypes = {
  root: PropTypes.string,
  word: PropTypes.string,
  onRootClick: PropTypes.func,
  compact: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

export default memo(RelatedRootsPanel);
