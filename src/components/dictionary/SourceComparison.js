/**
 * SourceComparison - Displays multiple dictionary sources side-by-side
 *
 * PRO SCHOLAR V12: Enhanced with citation copy, uncertainty badges,
 * and hapax legomena detection.
 *
 * Shows all available definitions from different scholarly sources
 * with confidence scoring and tier badges for transparency.
 */

import React, { memo, useState, useCallback } from 'react';
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
 * PRO SCHOLAR V12: Generate academic citation for a source
 */
const generateCitation = (source, word, format = 'chicago') => {
  const info = getSourceInfo(source.name);
  if (!info) return `${source.name}, s.v. "${word}"`;

  const author = info.author || source.name;
  const title = info.fullName || source.name;
  const year = info.year || source.year || '';
  const headword = source.headword || word;

  switch (format) {
    case 'chicago':
      return `${author}, *${title}* (${year}), s.v. "${headword}"`;
    case 'apa':
      return `${author} (${year}). *${title}*. s.v. "${headword}"`;
    case 'mla':
      return `${author}. *${title}*. ${year}. s.v. "${headword}"`;
    case 'bibtex':
      const key = source.name.toLowerCase().replace(/[^a-z]/g, '');
      return `@book{${key},\n  author = {${author}},\n  title = {${title}},\n  year = {${year}},\n  note = {s.v. "${headword}"}\n}`;
    default:
      return `${author}, *${title}* (${year}), s.v. "${headword}"`;
  }
};

/**
 * PRO SCHOLAR V12: Get uncertainty level based on source agreement
 */
const getUncertaintyLevel = (sources, confidence) => {
  if (!sources || sources.length === 0) return null;

  // Check if definitions significantly differ
  const definitions = sources.map(s => (s.definition || '').toLowerCase().trim()).filter(Boolean);
  const uniqueDefs = [...new Set(definitions)];

  // High uncertainty indicators
  if (confidence?.score < 60) {
    return { level: 'high', label: 'Uncertain', icon: '⚠️', description: 'Low scholarly consensus' };
  }

  if (sources.length >= 3 && uniqueDefs.length >= 3) {
    return { level: 'medium', label: 'Contested', icon: '⚡', description: 'Multiple interpretations exist' };
  }

  if (sources.length === 1) {
    return { level: 'low', label: 'Single Source', icon: '📌', description: 'Only one source found' };
  }

  return null;
};

/**
 * PRO SCHOLAR V12: Check if word is hapax legomenon (appears only once)
 */
const getHapaxInfo = (source) => {
  // Check if source metadata indicates hapax
  if (source.frequency === '1x' || source.frequency === 'hapax') {
    return { isHapax: true, note: 'Appears only once in the Bible' };
  }
  if (source.note?.toLowerCase().includes('hapax')) {
    return { isHapax: true, note: source.note };
  }
  return { isHapax: false };
};

/**
 * Single source card component
 * PRO SCHOLAR V12: Enhanced with hapax detection and citation copy
 */
const SourceCard = memo(function SourceCard({ source, isMain, word, onCopyCitation }) {
  const info = getSourceInfo(source.name);
  const tierLevel = source.tier?.level || info?.tier || 3;
  const tierBadge = getTierBadge(tierLevel);
  const tierClass = getTierClass(tierLevel);
  const hapaxInfo = getHapaxInfo(source);

  const handleCopyCitation = useCallback((format) => {
    const citation = generateCitation(source, word, format);
    navigator.clipboard.writeText(citation).then(() => {
      onCopyCitation?.(citation, format);
    }).catch(console.error);
  }, [source, word, onCopyCitation]);

  return (
    <div className={`source-card ${tierClass} ${isMain ? 'main-source' : ''} ${hapaxInfo.isHapax ? 'hapax' : ''}`}>
      <div className="source-header">
        <span className="source-badge">{tierBadge}</span>
        <span className="source-name">{source.name || info?.name || 'Unknown'}</span>
        {source.year && <span className="source-year">({source.year})</span>}
        {isMain && <span className="main-badge">Primary</span>}
        {hapaxInfo.isHapax && (
          <span className="hapax-badge" title={hapaxInfo.note}>
            📜 Hapax
          </span>
        )}
      </div>

      {source.headword && (
        <div className="source-headword" dir="rtl" lang="he">
          {source.headword}
          {/* PRO SCHOLAR V13: Show match type for morphological lookups */}
          {source._matchType && source._matchType !== 'exact' && (
            <span className="match-type-badge" title={`Found via ${source._matchType}`}>
              {source._matchType.includes('prefix') ? '🔗 ' + source._matchType.replace('prefix-', '').replace('-', '→') : '↔️ ' + source._matchType}
            </span>
          )}
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

      {/* PRO SCHOLAR V14: TWOT theological data */}
      {source.twotNumber && (
        <div className="source-meta twot-meta">
          <span className="meta-label">TWOT#:</span>
          <span className="meta-value">{source.twotNumber}</span>
        </div>
      )}
      {source.theologicalMeaning && (
        <div className="source-theological">
          <span className="meta-label">📖 Theological:</span>
          <span className="meta-value theological-text">{source.theologicalMeaning}</span>
        </div>
      )}
      {source.semanticRange && (
        <div className="source-semantic">
          <span className="meta-label">Semantic Range:</span>
          <span className="meta-value">{source.semanticRange}</span>
        </div>
      )}
      {source.derivatives && (
        <div className="source-derivatives">
          <span className="meta-label">Derivatives:</span>
          <span className="meta-value" dir="rtl">{source.derivatives}</span>
        </div>
      )}
      {source.frequency && (
        <div className="source-frequency">
          <span className="meta-label">Frequency:</span>
          <span className="meta-value">{source.frequency}</span>
        </div>
      )}

      {/* PRO SCHOLAR V14: Gesenius grammar data */}
      {source.grammar && (
        <div className="source-grammar">
          <span className="meta-label">📚 Grammar:</span>
          <span className="meta-value grammar-text">{source.grammar}</span>
        </div>
      )}
      {source.pattern && (
        <div className="source-pattern">
          <span className="meta-label">Pattern:</span>
          <span className="meta-value" dir="rtl">{source.pattern}</span>
        </div>
      )}
      {source.usage && (
        <div className="source-usage">
          <span className="meta-label">Usage:</span>
          <span className="meta-value" dir="rtl">{source.usage}</span>
        </div>
      )}

      {source.language && source.language !== 'Hebrew' && (
        <div className="source-language">
          <span className="language-badge">{source.language}</span>
        </div>
      )}

      {/* PRO SCHOLAR: Wiktionary etymology data (Proto-Semitic, cognates) */}
      {source.etymology && (
        <div className="source-etymology">
          {source.etymology.protoSemitic && (
            <div className="etymology-proto">
              <span className="meta-label">Proto-Semitic:</span>
              <span className="meta-value proto-semitic">*{source.etymology.protoSemitic}</span>
            </div>
          )}
          {source.etymology.root && (
            <div className="etymology-root">
              <span className="meta-label">Root:</span>
              <span className="meta-value" dir="rtl">{source.etymology.root}</span>
            </div>
          )}
          {source.etymology.cognates && Object.keys(source.etymology.cognates).length > 0 && (
            <div className="etymology-cognates">
              <span className="meta-label">Cognates:</span>
              <span className="cognate-list">
                {Object.entries(source.etymology.cognates).slice(0, 3).map(([lang, words]) => (
                  <span key={lang} className="cognate-item" title={words.join(', ')}>
                    {lang}: {words[0]}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* PRO SCHOLAR V12: Citation copy buttons */}
      <div className="source-citation-actions">
        <button
          className="citation-copy-btn"
          onClick={() => handleCopyCitation('chicago')}
          title="Copy Chicago citation"
        >
          📋 Cite
        </button>
      </div>
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
    }),
    frequency: PropTypes.string,
    note: PropTypes.string
  }).isRequired,
  isMain: PropTypes.bool,
  word: PropTypes.string,
  onCopyCitation: PropTypes.func
};

/**
 * SourceComparison Component
 * PRO SCHOLAR V12: Enhanced with uncertainty badges, citation export, and hapax detection
 */
const SourceComparison = memo(function SourceComparison({
  word,
  sources,
  primarySource,
  onClose,
  confidence
}) {
  const [copiedCitation, setCopiedCitation] = useState(null);
  const [citationFormat, setCitationFormat] = useState('chicago');

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

  // PRO SCHOLAR V12: Get uncertainty level
  const uncertainty = getUncertaintyLevel(sources, confidence);

  // PRO SCHOLAR V12: Handle citation copy
  const handleCopyCitation = useCallback((citation, format) => {
    setCopiedCitation(format);
    setTimeout(() => setCopiedCitation(null), 2000);
  }, []);

  // PRO SCHOLAR V12: Copy all citations at once
  const handleCopyAllCitations = useCallback(() => {
    const allCitations = sources
      .map(src => generateCitation(src, word, citationFormat))
      .join('\n\n');
    navigator.clipboard.writeText(allCitations).then(() => {
      setCopiedCitation('all');
      setTimeout(() => setCopiedCitation(null), 2000);
    }).catch(console.error);
  }, [sources, word, citationFormat]);

  return (
    <div className="source-comparison" role="dialog" aria-label="Source comparison">
      <div className="comparison-header">
        <div className="comparison-title">
          <span className="word-display" dir="rtl" lang="he">{word}</span>
          <span className="source-count">{sources.length} sources</span>
        </div>

        {/* PRO SCHOLAR V12: Uncertainty badge */}
        {uncertainty && (
          <div className={`uncertainty-badge uncertainty-${uncertainty.level}`} title={uncertainty.description}>
            <span className="uncertainty-icon">{uncertainty.icon}</span>
            <span className="uncertainty-label">{uncertainty.label}</span>
          </div>
        )}

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

      {/* PRO SCHOLAR V12: Citation toolbar */}
      <div className="citation-toolbar">
        <span className="citation-label">Citation Format:</span>
        <select
          className="citation-format-select"
          value={citationFormat}
          onChange={(e) => setCitationFormat(e.target.value)}
        >
          <option value="chicago">Chicago</option>
          <option value="apa">APA</option>
          <option value="mla">MLA</option>
          <option value="bibtex">BibTeX</option>
        </select>
        <button
          className="copy-all-citations-btn"
          onClick={handleCopyAllCitations}
          title="Copy all citations"
        >
          {copiedCitation === 'all' ? '✓ Copied!' : '📋 Copy All Citations'}
        </button>
      </div>

      <div className="comparison-content">
        {/* Tier Legend */}
        <div className="tier-legend">
          <span className="legend-item">🥇 Academic Standard</span>
          <span className="legend-item">🥈 Reliable Reference</span>
          <span className="legend-item">🥉 Supplementary</span>
          <span className="legend-item">📜 Hapax (rare word)</span>
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
                  word={word}
                  onCopyCitation={handleCopyCitation}
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
                  word={word}
                  onCopyCitation={handleCopyCitation}
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
                  word={word}
                  onCopyCitation={handleCopyCitation}
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
