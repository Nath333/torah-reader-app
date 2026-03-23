/**
 * SourceComparison - Displays multiple dictionary sources side-by-side
 *
 * Shows all available definitions from different scholarly sources
 * with confidence scoring and tier badges for transparency.
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { getSourceInfo, RELIABILITY_TIERS } from '../../constants/dictionarySources';
import './SourceComparison.css';

/**
 * Get tier badge emoji based on tier level
 */
const getTierBadge = (tier) => {
  switch (tier) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '📖';
  }
};

/**
 * Get tier color class
 */
const getTierClass = (tier) => {
  switch (tier) {
    case 1: return 'tier-gold';
    case 2: return 'tier-silver';
    case 3: return 'tier-bronze';
    default: return 'tier-default';
  }
};

/**
 * Single source card component
 */
const SourceCard = memo(function SourceCard({ source, isMain }) {
  const info = getSourceInfo(source.name);
  const tierLevel = source.tier?.level || info?.tier || 3;
  const tierBadge = getTierBadge(tierLevel);
  const tierClass = getTierClass(tierLevel);

  return (
    <div className={`source-card ${tierClass} ${isMain ? 'main-source' : ''}`}>
      <div className="source-header">
        <span className="source-badge">{tierBadge}</span>
        <span className="source-name">{source.name || info?.name || 'Unknown'}</span>
        {source.year && <span className="source-year">({source.year})</span>}
        {isMain && <span className="main-badge">Primary</span>}
      </div>

      {source.headword && (
        <div className="source-headword" dir="rtl" lang="he">
          {source.headword}
        </div>
      )}

      <div className="source-definition">
        {source.definition || source.definitions?.[0]?.text || 'No definition available'}
      </div>

      {source.strongNumber && (
        <div className="source-meta">
          <span className="meta-label">Strong's:</span>
          <span className="meta-value">{source.strongNumber}</span>
        </div>
      )}

      {source.language && source.language !== 'Hebrew' && (
        <div className="source-language">
          <span className="language-badge">{source.language}</span>
        </div>
      )}
    </div>
  );
});

SourceCard.propTypes = {
  source: PropTypes.shape({
    name: PropTypes.string,
    definition: PropTypes.string,
    definitions: PropTypes.array,
    headword: PropTypes.string,
    strongNumber: PropTypes.string,
    language: PropTypes.string,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    tier: PropTypes.shape({
      level: PropTypes.number
    })
  }).isRequired,
  isMain: PropTypes.bool
};

/**
 * SourceComparison Component
 */
const SourceComparison = memo(function SourceComparison({
  word,
  sources,
  primarySource,
  onClose,
  confidence
}) {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Sort sources by tier (gold first)
  const sortedSources = [...sources].sort((a, b) => {
    const tierA = a.tier?.level || getSourceInfo(a.name)?.tier || 4;
    const tierB = b.tier?.level || getSourceInfo(b.name)?.tier || 4;
    return tierA - tierB;
  });

  const goldSources = sortedSources.filter(s => (s.tier?.level || getSourceInfo(s.name)?.tier) === 1);
  const silverSources = sortedSources.filter(s => (s.tier?.level || getSourceInfo(s.name)?.tier) === 2);
  const bronzeSources = sortedSources.filter(s => (s.tier?.level || getSourceInfo(s.name)?.tier) >= 3);

  return (
    <div className="source-comparison" role="dialog" aria-label="Source comparison">
      <div className="comparison-header">
        <div className="comparison-title">
          <span className="word-display" dir="rtl" lang="he">{word}</span>
          <span className="source-count">{sources.length} sources</span>
        </div>

        {confidence && (
          <div className="confidence-display">
            <span className="confidence-label">Confidence:</span>
            <span className={`confidence-value ${confidence.level}`}>
              {confidence.score}%
            </span>
          </div>
        )}

        {onClose && (
          <button
            className="comparison-close"
            onClick={onClose}
            aria-label="Close comparison"
          >
            ×
          </button>
        )}
      </div>

      <div className="comparison-content">
        {/* Tier Legend */}
        <div className="tier-legend">
          <span className="legend-item">🥇 Academic Standard</span>
          <span className="legend-item">🥈 Reliable Reference</span>
          <span className="legend-item">🥉 Supplementary</span>
        </div>

        {/* Gold Tier Sources */}
        {goldSources.length > 0 && (
          <div className="tier-section tier-gold-section">
            <h4 className="tier-heading">🥇 Academic Sources</h4>
            <div className="sources-grid">
              {goldSources.map((src, idx) => (
                <SourceCard
                  key={`gold-${idx}`}
                  source={src}
                  isMain={src.name === primarySource}
                />
              ))}
            </div>
          </div>
        )}

        {/* Silver Tier Sources */}
        {silverSources.length > 0 && (
          <div className="tier-section tier-silver-section">
            <h4 className="tier-heading">🥈 Reference Sources</h4>
            <div className="sources-grid">
              {silverSources.map((src, idx) => (
                <SourceCard
                  key={`silver-${idx}`}
                  source={src}
                  isMain={src.name === primarySource}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bronze Tier Sources */}
        {bronzeSources.length > 0 && (
          <div className="tier-section tier-bronze-section">
            <h4 className="tier-heading">🥉 Supplementary Sources</h4>
            <div className="sources-grid">
              {bronzeSources.map((src, idx) => (
                <SourceCard
                  key={`bronze-${idx}`}
                  source={src}
                  isMain={src.name === primarySource}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SourceComparison.propTypes = {
  /** The Hebrew/Aramaic word being compared */
  word: PropTypes.string.isRequired,
  /** Array of source objects with definitions */
  sources: PropTypes.arrayOf(PropTypes.object).isRequired,
  /** Name of the primary/recommended source */
  primarySource: PropTypes.string,
  /** Callback to close the comparison panel */
  onClose: PropTypes.func,
  /** Confidence score object */
  confidence: PropTypes.shape({
    score: PropTypes.number,
    level: PropTypes.string
  })
};

export default SourceComparison;
