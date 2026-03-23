/**
 * SourceBadge - Professional source attribution with hover cards
 *
 * Enhanced with sourceCredibilityService for academic trust indicators
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getSourceCredibility,
  getCredibilityBadge,
  SOURCE_CATEGORIES
} from '../../services/sourceCredibilityService';
import { COMMENTARY_SOURCE_META } from '../../constants/commentatorRegistry';
import './SourceBadge.css';

// Source metadata (non-commentary sources)
const SOURCE_META = {
  'Sefaria.org': { icon: '📜', color: '#059669', url: 'https://www.sefaria.org', verified: true },
  'Sefaria': { icon: '📜', color: '#059669', url: 'https://www.sefaria.org', verified: true },
  'Dictionary': { icon: '📖', color: '#6366f1', verified: true },
  'AI': { icon: '⚡', color: '#8b5cf6', label: 'AI Generated' },
  'Groq': { icon: '⚡', color: '#8b5cf6', label: 'AI via Groq' },
  'Mechon-Mamre': { icon: '📚', color: '#dc2626', url: 'https://mechon-mamre.org', verified: true },
  'Chabad.org': { icon: '✡️', color: '#2563eb', url: 'https://chabad.org', verified: true },
  'BDB': { icon: '📕', color: '#92400e', label: 'Brown-Driver-Briggs', verified: true },
  'Jastrow': { icon: '📗', color: '#166534', label: 'Jastrow Dictionary', verified: true },
  'Strong': { icon: '🔢', color: '#7c3aed', label: "Strong's Concordance", verified: true },
  'Google Translate': { icon: '🌐', color: '#4285f4', label: 'Google Translate' }
};

// Re-export for backward compatibility (commentary metadata now from registry)

// Era colors and labels
const ERA_CONFIG = {
  'Targum': { color: '#059669', label: 'Targum', shortLabel: 'T' },
  'Rishonim': { color: '#4f46e5', label: 'Rishonim', shortLabel: 'R' },
  'Acharonim': { color: '#d97706', label: 'Acharonim', shortLabel: 'A' }
};

// Accuracy styles
const ACCURACY_STYLES = {
  high: { icon: '✓', label: 'Verified', color: '#059669' },
  medium: { icon: '~', label: 'Moderate', color: '#d97706' },
  auto: { icon: '⚡', label: 'Auto-generated', color: '#8b5cf6' },
  partial: { icon: '○', label: 'Partial', color: '#9ca3af' }
};

/**
 * Minimal inline source indicator
 */
const SourceBadge = React.memo(({ source, method, accuracy, compact = false }) => {
  const meta = SOURCE_META[source] || { icon: '📄', color: '#6b7280' };
  const acc = accuracy ? ACCURACY_STYLES[accuracy] : null;

  const handleClick = () => {
    if (meta.url) window.open(meta.url, '_blank', 'noopener');
  };

  return (
    <span
      className={`src-badge ${compact ? 'compact' : ''} ${meta.url ? 'link' : ''}`}
      style={{ '--src-color': meta.color }}
      onClick={meta.url ? handleClick : undefined}
      title={`Source: ${source}${method ? ` (${method})` : ''}`}
      role={meta.url ? 'link' : undefined}
      tabIndex={meta.url ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && meta.url && handleClick()}
    >
      <span className="src-icon">{meta.icon}</span>
      {!compact && <span className="src-name">{source}</span>}
      {method && <span className="src-method">{method.replace(' → ', '→')}</span>}
      {acc && (
        <span className="src-acc" style={{ color: acc.color }} title={acc.label}>
          {acc.icon}
        </span>
      )}
    </span>
  );
});
SourceBadge.displayName = 'SourceBadge';

/**
 * Translation header with language + source
 */
const TranslationSourceHeader = React.memo(({ language, source, method, accuracy, isLoading }) => {
  const langs = {
    en: { code: 'EN', name: 'English', color: '#059669' },
    fr: { code: 'FR', name: 'French', color: '#2563eb' },
    he: { code: 'עב', name: 'Hebrew', color: '#d97706' },
    arc: { code: 'ארמ', name: 'Aramaic', color: '#7c3aed' }
  };
  const lang = langs[language] || { code: language?.toUpperCase() || '?', color: '#6b7280' };

  return (
    <div className="trans-header">
      <span
        className="lang-tag"
        style={{ '--lang-color': lang.color }}
        title={lang.name}
      >
        {lang.code}
      </span>
      {isLoading ? (
        <span className="src-loading" aria-label="Loading translation">
          <span className="dot" /><span className="dot" /><span className="dot" />
        </span>
      ) : (
        <SourceBadge source={source} method={method} accuracy={accuracy} />
      )}
    </div>
  );
});
TranslationSourceHeader.displayName = 'TranslationSourceHeader';

/**
 * Multiple sources inline
 */
const SourceBadgeGroup = React.memo(({ sources }) => (
  <span className="src-group">
    {sources.map((s, i) => (
      <SourceBadge key={i} source={s.source} method={s.method} accuracy={s.accuracy} compact />
    ))}
  </span>
));
SourceBadgeGroup.displayName = 'SourceBadgeGroup';

/**
 * Era badge pill
 */
const EraBadge = React.memo(({ era, compact = false }) => {
  const config = ERA_CONFIG[era] || { color: '#6b7280', label: era, shortLabel: era?.[0] };

  return (
    <span
      className={`era-badge ${compact ? 'compact' : ''}`}
      style={{ '--era-color': config.color }}
      title={config.label}
    >
      {compact ? config.shortLabel : config.label}
    </span>
  );
});
EraBadge.displayName = 'EraBadge';

/**
 * Credibility badge - shows academic trust indicator
 */
const CredibilityBadge = React.memo(({ sourceName, compact = false, showScore = false }) => {
  const credibility = getSourceCredibility(sourceName);
  const badge = getCredibilityBadge(credibility.overallScore);
  const categoryInfo = credibility.categoryInfo || SOURCE_CATEGORIES[credibility.category];

  return (
    <span
      className={`credibility-badge tier-${badge.tier} ${compact ? 'compact' : ''}`}
      style={{ '--cred-color': badge.color }}
      title={`${badge.label} (${credibility.overallScore}/100) - ${categoryInfo?.label || credibility.category}`}
    >
      <span className="cred-icon">{badge.icon}</span>
      {!compact && (
        <>
          <span className="cred-label">{badge.label}</span>
          {showScore && <span className="cred-score">{credibility.overallScore}</span>}
        </>
      )}
    </span>
  );
});
CredibilityBadge.displayName = 'CredibilityBadge';

/**
 * Hover card for commentary details - enhanced with credibility info
 */
const CommentaryHoverCard = React.memo(({ meta, isVisible, sourceName }) => {
  if (!isVisible || !meta) return null;

  // Get credibility info from service
  const credibility = sourceName ? getSourceCredibility(sourceName) : null;
  const badge = credibility ? getCredibilityBadge(credibility.overallScore) : null;

  return (
    <div className="commentary-hover-card" role="tooltip">
      <div className="hover-card-header">
        <span className="hover-card-icon">{meta.icon}</span>
        <div className="hover-card-titles">
          <span className="hover-card-hebrew">{meta.hebrewName}</span>
          <span className="hover-card-name">{meta.fullName}</span>
        </div>
        {meta.era && <EraBadge era={meta.era} compact />}
      </div>

      {/* Credibility indicator */}
      {credibility && badge && (
        <div className="hover-card-credibility" style={{ '--cred-color': badge.color }}>
          <span className="cred-stars">{badge.icon}</span>
          <span className="cred-label">{badge.label}</span>
          <span className="cred-score">({credibility.overallScore}/100)</span>
          {credibility.categoryInfo && (
            <span
              className="cred-category"
              style={{ background: credibility.categoryInfo.color }}
            >
              {credibility.categoryInfo.hebrewLabel || credibility.categoryInfo.label}
            </span>
          )}
        </div>
      )}

      {meta.shortDesc && (
        <p className="hover-card-desc">{meta.shortDesc}</p>
      )}

      <div className="hover-card-details">
        {meta.dates && (
          <div className="hover-card-detail">
            <span className="detail-icon">📅</span>
            <span>{meta.dates}</span>
          </div>
        )}
        {meta.location && (
          <div className="hover-card-detail">
            <span className="detail-icon">📍</span>
            <span>{meta.location}</span>
          </div>
        )}
        {meta.methodology && (
          <div className="hover-card-detail">
            <span className="detail-icon">📝</span>
            <span>{meta.methodology}</span>
          </div>
        )}
        {credibility?.consensus && (
          <div className="hover-card-detail">
            <span className="detail-icon">👥</span>
            <span>Consensus: {credibility.consensus}</span>
          </div>
        )}
      </div>

      <div className="hover-card-footer">
        <span className="hover-card-source">
          <span className="sefaria-icon">📜</span>
          via Sefaria.org
        </span>
        <span className="hover-card-verified">✓ Verified</span>
      </div>
    </div>
  );
});
CommentaryHoverCard.displayName = 'CommentaryHoverCard';

/**
 * Enhanced Commentary source badge with hover card and credibility indicators
 */
const CommentarySourceBadge = React.memo(({
  source,
  accuracy = 'high',
  showLink = true,
  showEra = true,
  showCredibility = true,
  variant = 'default' // 'default' | 'compact' | 'detailed'
}) => {
  const [showHoverCard, setShowHoverCard] = useState(false);
  const hoverTimeoutRef = useRef(null); // Use ref instead of state to avoid re-render loops
  const badgeRef = useRef(null);

  const meta = COMMENTARY_SOURCE_META[source] || {
    icon: '📖',
    color: '#6b7280',
    fullName: source,
    hebrewName: source,
    url: 'https://www.sefaria.org'
  };
  const acc = ACCURACY_STYLES[accuracy];

  // Get credibility from service (memoized to avoid recalculation)
  const credibility = showCredibility ? getSourceCredibility(source) : null;
  const credBadge = credibility ? getCredibilityBadge(credibility.overallScore) : null;

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setShowHoverCard(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverCard(false);
  }, []);

  const handleClick = useCallback((e) => {
    if (showLink && meta.url) {
      e.stopPropagation();
      try {
        window.open(meta.url, '_blank', 'noopener');
      } catch (err) {
        console.warn('Failed to open link:', err);
      }
    }
  }, [showLink, meta.url]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && showLink && meta.url) {
      handleClick(e);
    }
  }, [showLink, meta.url, handleClick]);

  // Cleanup timeout on unmount (no dependency on timeout value)
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (variant === 'compact') {
    return (
      <span
        className="src-badge commentary-src compact"
        style={{ '--src-color': meta.color }}
        title={`${meta.fullName}${credBadge ? ` - ${credBadge.label}` : ''} - via Sefaria.org`}
      >
        <span className="src-icon">{meta.icon}</span>
        {credBadge && <span className="cred-stars-compact">{credBadge.icon}</span>}
        {acc && <span className="src-acc" style={{ color: acc.color }}>{acc.icon}</span>}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className="commentary-badge-detailed"
        style={{ '--src-color': meta.color }}
      >
        <div className="detailed-header">
          <span className="detailed-icon">{meta.icon}</span>
          <div className="detailed-info">
            <span className="detailed-hebrew">{meta.hebrewName}</span>
            <span className="detailed-name">{meta.fullName}</span>
          </div>
          {meta.era && <EraBadge era={meta.era} />}
        </div>
        {/* Credibility indicator in detailed view */}
        {credBadge && (
          <div className="detailed-credibility" style={{ '--cred-color': credBadge.color }}>
            <span className="cred-stars">{credBadge.icon}</span>
            <span className="cred-label">{credBadge.label}</span>
            {credibility?.categoryInfo && (
              <span
                className="cred-category-tag"
                style={{ background: credibility.categoryInfo.color }}
              >
                {credibility.categoryInfo.hebrewLabel}
              </span>
            )}
          </div>
        )}
        {meta.shortDesc && <p className="detailed-desc">{meta.shortDesc}</p>}
        <div className="detailed-footer">
          <span className="sefaria-link" onClick={handleClick}>
            📜 Sefaria.org {acc && <span style={{ color: acc.color }}>{acc.icon}</span>} ↗
          </span>
        </div>
      </div>
    );
  }

  return (
    <span
      ref={badgeRef}
      className={`src-badge commentary-src ${showLink && meta.url ? 'link' : ''} ${credBadge ? `tier-${credBadge.tier}` : ''}`}
      style={{ '--src-color': meta.color }}
      onClick={showLink ? handleClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role={showLink ? 'link' : undefined}
      tabIndex={showLink ? 0 : undefined}
      aria-label={`${meta.fullName} commentary from Sefaria${credBadge ? ` - ${credBadge.label}` : ''}`}
    >
      <span className="src-icon">{meta.icon}</span>
      <span className="src-name">Sefaria.org</span>
      {credBadge && <span className="cred-stars-inline" title={credBadge.label}>{credBadge.icon}</span>}
      {showEra && meta.era && <EraBadge era={meta.era} compact />}
      {acc && <span className="src-acc" style={{ color: acc.color }} title={acc.label}>{acc.icon}</span>}
      {showLink && <span className="src-link-icon" aria-hidden="true">↗</span>}

      <CommentaryHoverCard meta={meta} isVisible={showHoverCard} sourceName={source} />
    </span>
  );
});
CommentarySourceBadge.displayName = 'CommentarySourceBadge';

/**
 * Inline verified badge
 */
const VerifiedBadge = React.memo(({ label = 'Verified' }) => (
  <span className="verified-badge" title={label}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
    <span>{label}</span>
  </span>
));
VerifiedBadge.displayName = 'VerifiedBadge';

// PropTypes definitions
SourceBadge.propTypes = {
  source: PropTypes.string.isRequired,
  method: PropTypes.string,
  accuracy: PropTypes.oneOf(['high', 'medium', 'auto', 'partial']),
  compact: PropTypes.bool
};

TranslationSourceHeader.propTypes = {
  language: PropTypes.string.isRequired,
  source: PropTypes.string,
  method: PropTypes.string,
  accuracy: PropTypes.oneOf(['high', 'medium', 'auto', 'partial']),
  isLoading: PropTypes.bool
};

SourceBadgeGroup.propTypes = {
  sources: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string.isRequired,
    method: PropTypes.string,
    accuracy: PropTypes.string
  })).isRequired
};

EraBadge.propTypes = {
  era: PropTypes.string.isRequired,
  compact: PropTypes.bool
};

CredibilityBadge.propTypes = {
  sourceName: PropTypes.string.isRequired,
  compact: PropTypes.bool,
  showScore: PropTypes.bool
};

CommentarySourceBadge.propTypes = {
  source: PropTypes.string.isRequired,
  accuracy: PropTypes.oneOf(['high', 'medium', 'auto', 'partial']),
  showLink: PropTypes.bool,
  showEra: PropTypes.bool,
  showCredibility: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'detailed'])
};

VerifiedBadge.propTypes = {
  label: PropTypes.string
};

export default SourceBadge;
export {
  SourceBadge,
  SourceBadgeGroup,
  TranslationSourceHeader,
  CommentarySourceBadge,
  CommentaryHoverCard,
  EraBadge,
  CredibilityBadge,
  VerifiedBadge,
  SOURCE_META,
  COMMENTARY_SOURCE_META,
  ERA_CONFIG,
  ACCURACY_STYLES
};
