/**
 * RootMeaningPanel Root (Shoresh) Translation Display
 *
 * Shows the meaning of the 3-letter Hebrew/Aramaic root from multiple sources:
 * - Root Meanings Pro (22,049 entries - unified database)
 * - BDB (Brown-Driver-Briggs - Biblical Hebrew)
 * - Jastrow (Talmudic/Aramaic)
 * - Klein (Etymology-focused)
 * - Strong's (Concordance)
 *
 * @module RootMeaningPanel
 */

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  usePanelData,
  useSetToggle,
  buildPanelClassName,
  renderPanelLoading,
  renderPanelError
} from '../../../hooks/usePanelData';
import './RootMeaningPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

let getRootMeaningAsync;
try {
  const dictionaryLoader = require('../../../services/dictionaries/dictionaryLoader');
  getRootMeaningAsync = dictionaryLoader.getRootMeaningAsync;
} catch (e) {
  console.debug('[RootMeaningPanel] dictionaryLoader not available:', e.message);
  getRootMeaningAsync = async () => null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SOURCE_CONFIG = {
  'Root Meanings Pro': { icon: '📚', color: '#8b5cf6', tier: 1 },
  'BDB': { icon: '📜', color: '#2563eb', tier: 1 },
  'Jastrow': { icon: '📖', color: '#059669', tier: 1 },
  'Gesenius': { icon: '🏛️', color: '#1e40af', tier: 1 },
  'CAL': { icon: '📜', color: '#7c3aed', tier: 1 },
  'Klein': { icon: '🔤', color: '#d97706', tier: 2 },
  "Strong's": { icon: '🔢', color: '#6b7280', tier: 3 }
};

const SEMANTIC_FIELD_ICONS = {
  divine: '✡️',
  religious: '🕯️',
  kinship: '👨‍👩‍👧‍👦',
  nature: '🌳',
  body: '🫀',
  emotion: '💭',
  motion: '🚶',
  speech: '💬',
  time: '⏰',
  legal: '⚖️',
  warfare: '⚔️',
  agriculture: '🌾',
  building: '🏗️',
  commerce: '💰',
  default: '📝'
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Single definition item from a source
 */
const DefinitionItem = memo(function DefinitionItem({ def, expanded, onToggle }) {
  const config = SOURCE_CONFIG[def.source] || { icon: '📖', color: '#6b7280', tier: 3 };
  const hasLongDef = def.definition && def.definition.length > 100;

  return (
    <div
      className="rmp-definition"
      style={{ '--source-color': config.color }}
    >
      <div className="rmp-def-header">
        <span className="rmp-def-icon">{config.icon}</span>
        <span className="rmp-def-source">{def.source}</span>
        {def.pos && <span className="rmp-def-pos">{def.pos}</span>}
        {def.strongNumber && (
          <span className="rmp-def-strong">H{def.strongNumber}</span>
        )}
      </div>
      <div className="rmp-def-text">
        {expanded || !hasLongDef ? def.definition : def.shortDef}
        {hasLongDef && (
          <button className="rmp-expand-btn" onClick={onToggle}>
            {expanded ? 'less' : 'more...'}
          </button>
        )}
      </div>
    </div>
  );
});

DefinitionItem.propTypes = {
  def: PropTypes.shape({
    source: PropTypes.string.isRequired,
    definition: PropTypes.string,
    shortDef: PropTypes.string,
    pos: PropTypes.string,
    strongNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RootMeaningPanel - Shows the meaning of a Hebrew/Aramaic root
 *
 * @param {Object} props
 * @param {string} props.root - The 3-letter root to look up
 * @param {string} [props.word] - The original word (for context)
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function RootMeaningPanel({
  root,
  word,
  compact = false,
  dark = false,
  className = ''
}) {
  const [expandedDefs, setExpandedDefs] = useState(new Set());
  const toggleDef = useSetToggle(setExpandedDefs);

  // Use shared hook for data loading
  const { data: rootData, loading, error } = usePanelData(
    getRootMeaningAsync,
    root,
    { validate: (r) => r && r.length >= 2, panelName: 'RootMeaningPanel' }
  );

  // Build panel className
  const panelClassName = buildPanelClassName('root-meaning-panel', { compact, dark, className });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return renderPanelLoading(panelClassName, 'rmp', 'Looking up root meaning...');
  }

  if (error) {
    return renderPanelError(panelClassName, 'rmp', 'Could not load root meaning');
  }

  if (!rootData || rootData.definitions.length === 0) {
    return null;
  }

  const semanticIcon = SEMANTIC_FIELD_ICONS[rootData.semanticField] || SEMANTIC_FIELD_ICONS.default;

  return (
    <div className={panelClassName}>
      {/* Header */}
      <div className="rmp-header">
        <div className="rmp-title">
          <span className="rmp-icon">📖</span>
          <span className="rmp-title-text">Root Meaning</span>
        </div>
        <div className="rmp-root-display" dir="rtl">
          <span className="rmp-root-letters">{rootData.root}</span>
          {rootData.isAramaic && <span className="rmp-aramaic-badge">ארמית</span>}
        </div>
      </div>

      {/* Primary Definition (quick glance) */}
      {rootData.primaryDefinition && (
        <div className="rmp-primary">
          <span className="rmp-primary-def">"{rootData.primaryDefinition}"</span>
          {rootData.semanticField && (
            <span className="rmp-semantic" title={`Semantic field: ${rootData.semanticField}`}>
              {semanticIcon} {rootData.semanticField}
            </span>
          )}
        </div>
      )}

      {/* All Definitions by Source */}
      <div className="rmp-definitions">
        {rootData.definitions.map((def) => (
          <DefinitionItem
            key={def.source}
            def={def}
            expanded={expandedDefs.has(def.source)}
            onToggle={() => toggleDef(def.source)}
          />
        ))}
      </div>

      {/* Usage Eras & Source Count */}
      {(rootData.eras?.length > 0 || rootData.frequency) && (
        <div className="rmp-frequency">
          <div className="rmp-freq-header">
            <span className="rmp-freq-icon">📊</span>
            <span>Usage</span>
          </div>
          <div className="rmp-freq-stats">
            {/* Show source count */}
            {rootData.frequency?.sourceCount && (
              <div className="rmp-freq-stat">
                <span className="rmp-freq-label">Sources:</span>
                <span className="rmp-freq-value">{rootData.frequency.sourceCount}</span>
              </div>
            )}
            {/* Show attestation status */}
            {rootData.frequency?.biblical && (
              <div className="rmp-freq-stat">
                <span className="rmp-freq-label">Biblical:</span>
                <span className="rmp-freq-value">{rootData.frequency.biblical}</span>
              </div>
            )}
            {rootData.frequency?.talmudic && (
              <div className="rmp-freq-stat">
                <span className="rmp-freq-label">Talmudic:</span>
                <span className="rmp-freq-value">{rootData.frequency.talmudic}</span>
              </div>
            )}
          </div>
          {/* Era badges */}
          {rootData.eras && rootData.eras.length > 0 && (
            <div className="rmp-era-badges">
              {rootData.eras.includes('biblical') && (
                <span className="rmp-era-badge biblical">Biblical</span>
              )}
              {rootData.eras.includes('mishnaic') && (
                <span className="rmp-era-badge mishnaic">Mishnaic</span>
              )}
              {rootData.eras.includes('talmudic') && (
                <span className="rmp-era-badge talmudic">Talmudic</span>
              )}
              {rootData.eras.includes('modern') && (
                <span className="rmp-era-badge modern">Modern</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources summary */}
      {rootData.sources.length > 0 && (
        <div className="rmp-sources">
          <span className="rmp-sources-label">Sources:</span>
          <span className="rmp-sources-list">
            {rootData.sources.slice(0, 5).join(' • ')}
            {rootData.sources.length > 5 && ` +${rootData.sources.length - 5}`}
          </span>
        </div>
      )}
    </div>
  );
}

RootMeaningPanel.propTypes = {
  root: PropTypes.string,
  word: PropTypes.string,
  compact: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

export default memo(RootMeaningPanel);
