/**
 * SourceDefinitionItem - Single source definition display with French translation
 * Extracted from ClickableText.js for reusability
 *
 * Features:
 * - Numbered sense display for scholarly BDB-style definitions
 * - CAL links for Aramaic sources
 * - Dialect badges (JBA, JPA, Syriac)
 * - French translation with caching
 * - Different/related headword indicators
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { translateEnglishToFrench, quickTranslate } from '../../services/englishToFrenchService';
import { getSourceStyle } from '../../constants/dictionarySources';

// =============================================================================
// PRO SCHOLAR V6: Dictionary Tier Display
// =============================================================================

/** Dictionary source tier configuration - derived from unifiedRootService */
const DICTIONARY_TIERS = {
  jastrow: { tier: 'gold', fullName: "Jastrow's Dictionary (1903)", bonus: 5 },
  bdb: { tier: 'gold', fullName: 'Brown-Driver-Briggs (1906)', bonus: 5 },
  strongs: { tier: 'silver', fullName: "Strong's Concordance", bonus: 0 },
  cal: { tier: 'gold', fullName: 'Comprehensive Aramaic Lexicon', bonus: 5 },
  sefaria: { tier: 'silver', fullName: 'Sefaria Lexicon', bonus: 0 },
  klein: { tier: 'gold', fullName: 'Klein Dictionary', bonus: 5 }
};

/** Tier display styling */
const TIER_DISPLAY = {
  gold: {
    icon: '🥇',
    label: 'Gold Standard',
    className: 'tier-gold',
    color: '#b8860b',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    tooltip: 'Highly authoritative academic source'
  },
  silver: {
    icon: '🥈',
    label: 'Standard',
    className: 'tier-silver',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    borderColor: '#d1d5db',
    tooltip: 'Reliable reference source'
  },
  bronze: {
    icon: '🥉',
    label: 'Supplementary',
    className: 'tier-bronze',
    color: '#b45309',
    bgColor: '#fef3c7',
    borderColor: '#d97706',
    tooltip: 'Supplementary reference'
  }
};

/**
 * Get tier info for a source
 */
const getSourceTier = (sourceName) => {
  if (!sourceName) return null;
  const key = sourceName.toLowerCase().replace(/[^a-z]/g, '');
  // Check direct match
  if (DICTIONARY_TIERS[key]) {
    return { ...DICTIONARY_TIERS[key], display: TIER_DISPLAY[DICTIONARY_TIERS[key].tier] };
  }
  // Check partial matches
  for (const [dictKey, tierInfo] of Object.entries(DICTIONARY_TIERS)) {
    if (key.includes(dictKey) || dictKey.includes(key)) {
      return { ...tierInfo, display: TIER_DISPLAY[tierInfo.tier] };
    }
  }
  // Default to silver
  return { tier: 'silver', display: TIER_DISPLAY.silver };
};

/**
 * Dictionary Tier Badge Component
 */
const TierBadge = React.memo(function TierBadge({ source, compact = false }) {
  const tierInfo = useMemo(() => getSourceTier(source), [source]);

  if (!tierInfo?.display) return null;

  const { display } = tierInfo;

  if (compact) {
    return (
      <span
        className={`tier-badge-compact ${display.className}`}
        title={`${display.label}: ${display.tooltip}`}
        style={{
          color: display.color,
          fontSize: '0.75rem'
        }}
      >
        {display.icon}
      </span>
    );
  }

  return (
    <span
      className={`tier-badge ${display.className}`}
      title={display.tooltip}
      style={{
        background: display.bgColor,
        borderColor: display.borderColor,
        color: display.color
      }}
    >
      <span className="tier-icon">{display.icon}</span>
      <span className="tier-label">{display.label}</span>
    </span>
  );
});

/**
 * Single Source Definition Item with French translation
 * Enhanced with numbered sense display for scholarly BDB-style definitions
 */
const SourceDefinitionItem = React.memo(function SourceDefinitionItem({
  def,
  showFrench,
  frenchTranslation,
  allSenses
}) {
  const [french, setFrench] = useState(frenchTranslation || null);
  const [loadingFr, setLoadingFr] = useState(false);

  // Fetch French translation for this definition
  useEffect(() => {
    if (!showFrench || french || !def.text) return;

    // Try cached first
    const cached = quickTranslate(def.text);
    if (cached) {
      setFrench(cached);
      return;
    }

    // Fetch from API
    setLoadingFr(true);
    translateEnglishToFrench(def.text).then(result => {
      if (result) setFrench(result);
      setLoadingFr(false);
    }).catch((err) => {
      console.warn('French translation failed for definition:', err.message || err);
      setLoadingFr(false);
    });
  }, [showFrench, def.text, french]);

  // Determine CSS classes based on entry type
  const itemClasses = [
    'word-def-source-item',
    def.isDifferentWord ? 'different-headword' : '',
    def.isRelatedWord ? 'related-word-entry' : '',
    def.recommended ? 'recommended-source' : ''
  ].filter(Boolean).join(' ');

  // Check if we have multiple senses to display
  const hasSenses = allSenses && allSenses.length > 1;
  const senseNum = def.senseNum;
  const subSense = def.subSense;
  const semanticField = def.semanticField;

  // Render sense number display
  const renderSenseLabel = () => {
    if (senseNum === 0) return null; // Summary sense - no number
    if (!senseNum) return null;

    const label = subSense ? `${senseNum}${subSense}` : senseNum;
    return (
      <span className="sense-number" title={`Sense ${label}`}>
        {label}
      </span>
    );
  };

  return (
    <div className={itemClasses} data-source={def.source} title={def.fullName || def.source}>
      <div className="source-header">
        {/* Source badge - with CAL link if available */}
        {def.calUrl ? (
          <a
            href={def.calUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-badge source-badge-link"
            style={getSourceStyle(def.source)}
            title="Open in CAL"
          >
            {def.source}
            {def.year && <span className="source-year">({def.year})</span>}
          </a>
        ) : (
          <span className="source-badge" style={getSourceStyle(def.source)}>
            {def.source}
            {def.year && <span className="source-year">({def.year})</span>}
          </span>
        )}
        {/* PRO SCHOLAR V6: Dictionary Tier Badge */}
        <TierBadge source={def.source} compact />
        {/* Credibility badge - 2026 Smart Feature */}
        {def.credibilityBadge && (
          <span
            className="credibility-badge"
            style={{ color: def.credibility?.category?.color }}
            title={`Authority: ${def.credibility?.authorityScore || 'N/A'}/100 - ${def.credibility?.category?.label || ''}`}
          >
            {def.credibilityBadge.emoji} {def.credibilityBadge.label}
          </span>
        )}
        {/* Recommended badge for halachic/contextual overrides */}
        {def.recommended && (
          <span className="recommended-badge" title="Recommended for Talmud study context">
            ⭐ Recommended
          </span>
        )}
        {/* CAL dialect badge (JBA, CPA, Syriac, etc.) */}
        {def.dialect && (
          <span className="dialect-badge" title={def.dialect}>
            {def.dialect.includes('Babylonian') ? 'JBA' :
             def.dialect.includes('Palestinian') ? 'JPA' :
             def.dialect.includes('Syriac') ? 'Syr' :
             def.dialect.split(' ')[0]}
          </span>
        )}
        {/* Show headword if different from searched word - scholarly clarity */}
        {def.isDifferentWord && def.headword && (
          <span
            className={`headword-indicator ${def.isRelatedWord ? 'related-word' : ''}`}
            dir="rtl"
            title={def.isRelatedWord
              ? `Related word: ${def.headword} (you searched: ${def.searchedWord})`
              : `Dictionary entry: ${def.headword} (searched: ${def.searchedWord})`}
          >
            {def.isRelatedWord ? `שורש קרוב: ${def.headword}` : `→ ${def.headword}`}
          </span>
        )}
      </div>

      {/* Single sense display or multi-sense list */}
      {hasSenses ? (
        <ul className="sense-list">
          {allSenses.map((sense, idx) => (
            <li
              key={idx}
              className={[
                'sense-item',
                sense.isSubsense ? 'subsense' : '',
                sense.senseNum === 0 ? 'summary' : ''
              ].filter(Boolean).join(' ')}
            >
              {sense.senseNum !== 0 && (
                <span className="sense-number">
                  {sense.subSense ? `${sense.senseNum}${sense.subSense}` : sense.senseNum}
                </span>
              )}
              <span className="sense-text">
                {sense.text}
                {sense.semanticField && (
                  <span className="sense-semantic">{sense.semanticField}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={senseNum ? 'sense-item' : ''}>
          {senseNum && senseNum !== 0 && renderSenseLabel()}
          <p className={senseNum ? 'sense-text' : 'source-text'}>
            {def.text}
            {semanticField && <span className="sense-semantic">{semanticField}</span>}
          </p>
        </div>
      )}

      {showFrench && (
        <div className="source-french">
          {loadingFr ? (
            <span className="french-loading">Translating...</span>
          ) : french ? (
            <span className="french-text">{french}</span>
          ) : null}
        </div>
      )}
    </div>
  );
});

SourceDefinitionItem.propTypes = {
  def: PropTypes.shape({
    source: PropTypes.string.isRequired,
    text: PropTypes.string,
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fullName: PropTypes.string,
    calUrl: PropTypes.string,
    dialect: PropTypes.string,
    recommended: PropTypes.bool,
    isDifferentWord: PropTypes.bool,
    isRelatedWord: PropTypes.bool,
    headword: PropTypes.string,
    searchedWord: PropTypes.string,
    senseNum: PropTypes.number,
    subSense: PropTypes.string,
    semanticField: PropTypes.string,
    // 2026: Source credibility data
    credibility: PropTypes.shape({
      authorityScore: PropTypes.number,
      category: PropTypes.shape({
        label: PropTypes.string,
        color: PropTypes.string
      })
    }),
    credibilityBadge: PropTypes.shape({
      emoji: PropTypes.string,
      label: PropTypes.string
    })
  }).isRequired,
  showFrench: PropTypes.bool,
  frenchTranslation: PropTypes.string,
  allSenses: PropTypes.arrayOf(PropTypes.shape({
    senseNum: PropTypes.number,
    subSense: PropTypes.string,
    text: PropTypes.string,
    semanticField: PropTypes.string,
    isSubsense: PropTypes.bool
  }))
};

SourceDefinitionItem.defaultProps = {
  showFrench: false,
  frenchTranslation: null,
  allSenses: null
};

export default SourceDefinitionItem;
