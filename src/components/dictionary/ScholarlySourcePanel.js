// =============================================================================
// PRO SCHOLAR V10: SCHOLARLY SOURCE PANEL
// Displays all dictionary sources with consensus analysis for scholarly comparison
// =============================================================================

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { formatConsensusForUI } from '../../services/scholarSourceAggregator';
import './ScholarlySourcePanel.css';

// =============================================================================
// TIER BADGES
// =============================================================================

const TIER_BADGES = {
  1: { label: 'Academic', color: '#059669', icon: '📚' },
  2: { label: 'Scholarly', color: '#0891b2', icon: '📖' },
  3: { label: 'Reference', color: '#d97706', icon: '📋' },
  4: { label: 'Modern', color: '#6b7280', icon: '📱' }
};

/**
 * Badge component for source tier
 */
const TierBadge = ({ tier }) => {
  const badge = TIER_BADGES[tier] || TIER_BADGES[4];
  return (
    <span
      className="tier-badge"
      style={{ backgroundColor: badge.color }}
      title={`${badge.label} Source`}
    >
      {badge.icon} {badge.label}
    </span>
  );
};

TierBadge.propTypes = {
  tier: PropTypes.number
};

// =============================================================================
// CONSENSUS BADGE
// =============================================================================

/**
 * Badge component for consensus level
 */
const ConsensusBadge = ({ consensus }) => {
  const ui = useMemo(() => formatConsensusForUI(consensus), [consensus]);

  if (!ui || !ui.badge) return null;

  return (
    <div className="consensus-badge-container">
      <span
        className="consensus-badge"
        style={{ backgroundColor: ui.badge.color }}
      >
        {ui.badge.icon} {ui.badge.text}
      </span>
      <span className="consensus-summary">{ui.summary}</span>
    </div>
  );
};

ConsensusBadge.propTypes = {
  consensus: PropTypes.object
};

// =============================================================================
// SOURCE CARD
// =============================================================================

/**
 * Individual source card with definition
 */
const SourceCard = ({ source, isPrimary, onSelect }) => {
  const tier = source.tier?.level || source.tier || 4;

  return (
    <div
      className={`source-card ${isPrimary ? 'primary' : ''}`}
      onClick={() => onSelect?.(source)}
      role="button"
      tabIndex={0}
    >
      <div className="source-header">
        <span className="source-name">{source.name}</span>
        <TierBadge tier={tier} />
        {isPrimary && <span className="primary-badge">Primary</span>}
      </div>

      <div className="source-definition">
        {source.definition || source.english || 'No definition available'}
      </div>

      {source.fullDefinition && source.fullDefinition !== source.definition && (
        <details className="source-full">
          <summary>Full definition</summary>
          <p>{source.fullDefinition}</p>
        </details>
      )}

      {source.headword && (
        <div className="source-meta">
          <span className="meta-label">Headword:</span>
          <span className="meta-value hebrew">{source.headword}</span>
        </div>
      )}
    </div>
  );
};

SourceCard.propTypes = {
  source: PropTypes.shape({
    name: PropTypes.string,
    definition: PropTypes.string,
    english: PropTypes.string,
    fullDefinition: PropTypes.string,
    headword: PropTypes.string,
    tier: PropTypes.oneOfType([PropTypes.number, PropTypes.object])
  }).isRequired,
  isPrimary: PropTypes.bool,
  onSelect: PropTypes.func
};

// =============================================================================
// DIVERGENT OPINIONS SECTION
// =============================================================================

/**
 * Shows divergent scholarly opinions
 */
const DivergentOpinions = ({ opinions }) => {
  if (!opinions || opinions.length === 0) return null;

  return (
    <div className="divergent-opinions">
      <h4 className="divergent-header">
        <span className="divergent-icon">⚡</span>
        Alternative Interpretations
      </h4>
      {opinions.map((opinion, idx) => (
        <div key={idx} className="divergent-item">
          <div className="divergent-sources">
            {opinion.sources.join(', ')}
          </div>
          <div className="divergent-definition">
            {opinion.definition}
          </div>
        </div>
      ))}
    </div>
  );
};

DivergentOpinions.propTypes = {
  opinions: PropTypes.arrayOf(PropTypes.shape({
    sources: PropTypes.arrayOf(PropTypes.string),
    definition: PropTypes.string
  }))
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ScholarlySourcePanel - Displays all dictionary sources for a word
 *
 * @param {Object} props
 * @param {string} props.word - The Hebrew word being looked up
 * @param {Array} props.allSources - All sources found (sorted by tier)
 * @param {Object} props.primary - Primary (best) source
 * @param {Array} props.alternatives - Alternative sources
 * @param {Object} props.consensus - Consensus analysis object
 * @param {Function} props.onSourceSelect - Callback when a source is selected
 * @param {boolean} props.showConsensus - Whether to show consensus badge
 * @param {boolean} props.expanded - Whether to show all sources or just primary
 */
const ScholarlySourcePanel = ({
  word,
  allSources = [],
  primary,
  alternatives = [],
  consensus,
  onSourceSelect,
  showConsensus = true,
  expanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  // Memoize source counts
  const sourceStats = useMemo(() => {
    const tier1 = allSources.filter(s => (s.tier?.level || s.tier) === 1).length;
    const tier2 = allSources.filter(s => (s.tier?.level || s.tier) === 2).length;
    return { total: allSources.length, tier1, tier2, academic: tier1 + tier2 };
  }, [allSources]);

  if (!allSources || allSources.length === 0) {
    return (
      <div className={`scholarly-source-panel empty ${className}`}>
        <p className="no-sources">No dictionary sources found for "{word}"</p>
      </div>
    );
  }

  return (
    <div className={`scholarly-source-panel ${className}`}>
      {/* Header with consensus badge */}
      <div className="panel-header">
        <h3 className="panel-title">
          <span className="hebrew">{word}</span>
          <span className="source-count">
            {sourceStats.total} source{sourceStats.total !== 1 ? 's' : ''}
            {sourceStats.academic > 0 && ` (${sourceStats.academic} academic)`}
          </span>
        </h3>
        {showConsensus && consensus && (
          <ConsensusBadge consensus={consensus} />
        )}
      </div>

      {/* Primary source */}
      {primary && (
        <div className="primary-source-section">
          <SourceCard
            source={primary}
            isPrimary={true}
            onSelect={onSourceSelect}
          />
        </div>
      )}

      {/* Expand/collapse for alternatives */}
      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <button
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'} {alternatives.length} alternative source{alternatives.length !== 1 ? 's' : ''}
          </button>

          {isExpanded && (
            <div className="alternatives-list">
              {alternatives.map((source, idx) => (
                <SourceCard
                  key={source.name + idx}
                  source={source}
                  isPrimary={false}
                  onSelect={onSourceSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divergent opinions from consensus */}
      {showConsensus && consensus?.divergentOpinions?.length > 0 && (
        <DivergentOpinions opinions={consensus.divergentOpinions} />
      )}

      {/* Analysis notes */}
      {showConsensus && consensus?.analysisNotes?.length > 0 && (
        <div className="analysis-notes">
          {consensus.analysisNotes.map((note, idx) => (
            <span key={idx} className="analysis-note">• {note}</span>
          ))}
        </div>
      )}
    </div>
  );
};

ScholarlySourcePanel.propTypes = {
  word: PropTypes.string.isRequired,
  allSources: PropTypes.array,
  primary: PropTypes.object,
  alternatives: PropTypes.array,
  consensus: PropTypes.object,
  onSourceSelect: PropTypes.func,
  showConsensus: PropTypes.bool,
  expanded: PropTypes.bool,
  className: PropTypes.string
};

export default ScholarlySourcePanel;
