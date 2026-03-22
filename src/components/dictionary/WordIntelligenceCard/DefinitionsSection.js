/**
 * DefinitionsSection Component
 * Displays definitions with source badges and expandable list
 */

import React, { memo } from 'react';

// Try to import source info
let getSourceInfo, RELIABILITY_TIERS;
try {
  const sources = require('../../../constants/dictionarySources');
  getSourceInfo = sources.getSourceInfo || (() => null);
  RELIABILITY_TIERS = sources.RELIABILITY_TIERS || {};
} catch (e) {
  getSourceInfo = () => null;
  RELIABILITY_TIERS = {};
}

/**
 * Source badge showing dictionary reliability tier
 */
const SourceBadge = memo(function SourceBadge({ source, year, reliability = 'gold', compact = false }) {
  const info = getSourceInfo?.(source);
  const tier = RELIABILITY_TIERS[info?.reliability || reliability] || {};

  return (
    <span
      className={`wic-source-badge ${compact ? 'compact' : ''} tier-${info?.reliability || reliability}`}
      title={`${info?.fullName || source}${year ? ` (${year})` : ''}\n${info?.specialization || ''}`}
    >
      {tier.icon && <span className="badge-icon">{tier.icon}</span>}
      <span className="badge-name">{info?.name || source}</span>
      {year && !compact && <span className="badge-year">({year})</span>}
    </span>
  );
});

/**
 * Definitions display with source badges
 * @param {Object} props
 * @param {Array} props.definitions - Array of definition objects
 * @param {boolean} props.expanded - Whether to show all definitions
 * @param {Function} props.onToggle - Toggle expanded state
 */
function DefinitionsSection({ definitions, expanded, onToggle }) {
  if (!definitions || definitions.length === 0) {
    return (
      <div className="wic-definitions empty">
        <span className="no-def">No dictionary entries found</span>
      </div>
    );
  }

  const primary = definitions[0];
  const hasMore = definitions.length > 1;

  return (
    <div className="wic-definitions">
      <div className="def-primary">
        <div className="def-content">
          <span className="def-text">{primary.definition}</span>
        </div>
        <SourceBadge source={primary.source} year={primary.year} />
      </div>

      {hasMore && (
        <>
          <button className="def-toggle" onClick={onToggle}>
            {expanded ? 'Show less' : `Show ${definitions.length - 1} more sources`}
          </button>

          {expanded && (
            <div className="def-alternatives">
              {definitions.slice(1).map((def, i) => (
                <div key={i} className="def-alt">
                  <span className="def-text">{def.definition}</span>
                  <SourceBadge source={def.source} year={def.year} compact />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { SourceBadge };
export default memo(DefinitionsSection);
