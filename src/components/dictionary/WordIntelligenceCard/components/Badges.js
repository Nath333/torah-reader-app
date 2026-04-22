/**
 * WordIntelligenceCard - Badges & Indicators
 * Source badges, confidence, frequency, domain, semantic field, dialect
 */

import React, { useState, memo, useMemo } from 'react';
import {
  SEMANTIC_FIELD_DISPLAY,
  TIER_DISPLAY,
  SOURCE_CATEGORIES,
  getSourceInfo,
  RELIABILITY_TIERS
} from '../constants';
import { getConfidenceDisplay } from '../../../../utils/morphology/confidence';
import { detectDialect, getSemanticField } from '../../../../services/analysis/rootExtraction';
import { SEMANTIC_DOMAINS } from '../../../../services/scholarly/semanticFieldService';

// =============================================================================
// SOURCE BADGE
// =============================================================================

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

// =============================================================================
// CONFIDENCE DISPLAY
// =============================================================================

export const ConfidenceDisplay = memo(function ConfidenceDisplay({ confidence, showFactors = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!confidence?.score) return null;

  const display = getConfidenceDisplay(confidence.score);
  const level = display?.level || 'medium';

  return (
    <div className={`wic-confidence ${level}`}>
      <div
        className="confidence-header"
        onClick={() => showFactors && setExpanded(!expanded)}
        role={showFactors ? 'button' : undefined}
        tabIndex={showFactors ? 0 : undefined}
        aria-expanded={showFactors ? expanded : undefined}
        aria-label={showFactors ? `Confidence ${confidence.score}%, ${expanded ? 'collapse' : 'expand'} details` : undefined}
        onKeyDown={showFactors ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } } : undefined}
      >
        <div className="confidence-main">
          <span className="confidence-icon">
            {level === 'high' ? '✓' : level === 'medium' ? '~' : '?'}
          </span>
          <span className="confidence-score">{confidence.score}%</span>
          <span className="confidence-label">{level}</span>
        </div>
        {showFactors && confidence.factors?.length > 0 && (
          <span className={`confidence-toggle ${expanded ? 'expanded' : ''}`}>▼</span>
        )}
      </div>

      {expanded && confidence.factors?.length > 0 && (
        <div className="confidence-factors">
          <div className="confidence-factors-grid">
            {confidence.factors.map((factor, i) => {
              const isNegative = factor.toLowerCase().includes('penalty') ||
                                 factor.toLowerCase().includes('missing') ||
                                 factor.toLowerCase().includes('no ');
              return (
                <div key={i} className="confidence-factor">
                  <div className="factor-header">
                    <span className="factor-name">{factor.split(':')[0]}</span>
                    <span className={`factor-score ${isNegative ? 'negative' : 'positive'}`}>
                      {isNegative ? '−' : '+'}
                    </span>
                  </div>
                  <div className="factor-bar">
                    <div
                      className={`factor-bar-fill ${isNegative ? 'negative' : 'positive'}`}
                      style={{ width: isNegative ? '30%' : '70%' }}
                    />
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

// =============================================================================
// FREQUENCY BAR
// =============================================================================

export const FrequencyBar = memo(function FrequencyBar({ frequency }) {
  if (!frequency) return null;

  const { count, band, percentile } = frequency;
  const fillWidth = Math.min(100, percentile || 50);

  return (
    <div className="wic-frequency">
      <div className="freq-header">
        <span className="freq-label">Frequency</span>
        <span className="freq-count">{count?.toLocaleString() || '?'}×</span>
      </div>
      <div className="freq-bar-container">
        <div
          className="freq-bar-fill"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: band?.color || '#6b7280'
          }}
        />
      </div>
      <div className="freq-meta">
        <span className="freq-band" style={{ color: band?.color }}>{band?.label || 'Unknown'}</span>
        <span className="freq-percentile">Top {Math.round(100 - (percentile || 50))}%</span>
      </div>
    </div>
  );
});

// =============================================================================
// DOMAIN BADGE
// =============================================================================

export const DomainBadge = memo(function DomainBadge({ domain }) {
  const domainInfo = SEMANTIC_DOMAINS[domain];
  if (!domainInfo) return null;

  return (
    <span
      className="wic-domain-badge"
      style={{ '--domain-color': domainInfo.color }}
      title={domainInfo.description}
    >
      <span className="domain-hebrew">{domainInfo.hebrewName}</span>
      <span className="domain-name">{domainInfo.name}</span>
    </span>
  );
});

// =============================================================================
// SEMANTIC FIELD BADGE V6
// =============================================================================

export const SemanticFieldBadgeV6 = memo(function SemanticFieldBadgeV6({ field, root }) {
  const detectedField = field || (root ? getSemanticField?.(root) : null);
  if (!detectedField) return null;

  const display = SEMANTIC_FIELD_DISPLAY[detectedField];
  if (!display) return null;

  return (
    <div
      className="wic-semantic-field-v6"
      style={{ backgroundColor: display.bg, borderColor: display.color }}
    >
      <span className="semantic-icon">{display.icon}</span>
      <div className="semantic-content">
        <span className="semantic-name">{display.name}</span>
        <span className="semantic-hebrew" dir="rtl">{display.hebrew}</span>
      </div>
    </div>
  );
});

// =============================================================================
// DICTIONARY TIER BADGE
// =============================================================================

export const DictionaryTierBadge = memo(function DictionaryTierBadge({ source }) {
  if (!source) return null;

  const sourceKey = source.toLowerCase().replace(/[^a-z]/g, '');
  let tierKey = 'silver';

  if (sourceKey.includes('jastrow') || sourceKey.includes('bdb') || sourceKey.includes('cal') || sourceKey.includes('klein')) {
    tierKey = 'gold';
  }

  const tier = TIER_DISPLAY[tierKey];
  if (!tier) return null;

  return (
    <span
      className="wic-tier-badge"
      style={{ backgroundColor: tier.bg, color: tier.color }}
      title={tier.label}
    >
      {tier.icon}
    </span>
  );
});

// =============================================================================
// DIALECT INDICATOR V6
// =============================================================================

export const DialectIndicatorV6 = memo(function DialectIndicatorV6({ word }) {
  const dialectResult = useMemo(() => {
    try {
      return detectDialect?.(word);
    } catch {
      return null;
    }
  }, [word]);

  if (!dialectResult || dialectResult.dialect === 'unknown') return null;

  const dialectNames = {
    'biblical_hebrew': { name: 'Biblical Hebrew', hebrew: 'עברית מקראית', icon: '📜' },
    'mishnaic_hebrew': { name: 'Mishnaic Hebrew', hebrew: 'עברית משנאית', icon: '📚' },
    'talmudic_aramaic': { name: 'Talmudic Aramaic', hebrew: 'ארמית תלמודית', icon: '📖' },
    'targumic_aramaic': { name: 'Targumic Aramaic', hebrew: 'ארמית תרגומית', icon: '🎯' }
  };

  const dialectInfo = dialectNames[dialectResult.dialect];
  if (!dialectInfo) return null;

  return (
    <div className="wic-dialect-v6" title={`Detected: ${dialectInfo.name} (${dialectResult.confidence}% confidence)`}>
      <span className="dialect-icon">{dialectInfo.icon}</span>
      <span className="dialect-name">{dialectInfo.name}</span>
      {dialectResult.confidence >= 80 && (
        <span className="dialect-confidence">{dialectResult.confidence}%</span>
      )}
    </div>
  );
});
