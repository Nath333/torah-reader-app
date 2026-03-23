/**
 * Source display components for WordIntelligenceCard
 * Shows lookup paths, source badges, and dictionary tier indicators
 */
import React, { memo } from 'react';
import { SOURCE_CATEGORIES, TIER_DISPLAY } from './constants';

// Safe imports for external services
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
 * Shows the lookup path taken to find a word definition
 */
export const LookupPathDisplay = memo(function LookupPathDisplay({ lookupPath, sourceCategory }) {
  if (!lookupPath) return null;

  const category = SOURCE_CATEGORIES[sourceCategory] || SOURCE_CATEGORIES.dictionary;
  const isDictionaryHit = lookupPath.includes('dictionary-hit');

  return (
    <div className={`wic-lookup-path ${isDictionaryHit ? 'dictionary-hit' : 'pattern-analysis'}`}>
      <div className="lookup-path-header">
        <span className="lookup-path-icon">{category.icon}</span>
        <span className="lookup-path-title">Source: {category.label}</span>
      </div>
      <div className="lookup-path-steps">
        {isDictionaryHit ? (
          <span className="path-step success">
            <span className="path-step-icon">✓</span>
            Dictionary Hit
          </span>
        ) : (
          <>
            <span className="path-step">Dictionary</span>
            <span className="path-arrow">→</span>
            <span className="path-step fallback">
              <span className="path-step-icon">🔬</span>
              Pattern Analysis
            </span>
          </>
        )}
      </div>
    </div>
  );
});

/**
 * Source badge showing dictionary reliability tier
 */
export const SourceBadge = memo(function SourceBadge({ source, year, reliability = 'gold', compact = false }) {
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
 * Dictionary tier badge showing gold/silver/bronze classification
 */
export const DictionaryTierBadge = memo(function DictionaryTierBadge({ source }) {
  const info = getSourceInfo?.(source);
  const tierKey = info?.reliability || 'silver';
  const tier = TIER_DISPLAY[tierKey];

  if (!tier) return null;

  return (
    <span
      className={`wic-tier-badge tier-${tierKey}`}
      style={{ backgroundColor: tier.bg, color: tier.color }}
      title={`${tier.label}: ${info?.specialization || 'Academic source'}`}
    >
      <span className="tier-icon">{tier.icon}</span>
      <span className="tier-label">{tier.label}</span>
    </span>
  );
});

const SourceBadges = { LookupPathDisplay, SourceBadge, DictionaryTierBadge };
export default SourceBadges;
