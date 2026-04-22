/**
 * WordIntelligenceCard Sub-Components
 *
 * Extracted from WordIntelligenceCard.js for maintainability.
 * Contains all memoized display sub-components used by the main card.
 *
 * @module WordIntelligenceCard.sections
 */

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';

// Service imports needed by sub-components
import { SEMANTIC_DOMAINS } from '../../services/semanticFieldService';
import {
  getCard,
  createCard,
  getStats,
  getMasteryLevel
} from '../../services/srsService';
import {
  getConjugationPrefixLabel,
  getConjugationSuffixLabel
} from '../../constants/morphology';
import { getConfidenceDisplay } from '../../utils/morphology/confidence';
import { getSourceInfo, RELIABILITY_TIERS } from '../../constants/dictionarySources';
import {
  detectDialect,
  getSemanticField,
  getAllAlternativeRoots
} from '../../services/rootExtraction';
import { extractCantillation } from '../../services/cantillationService';
import { analyzeConstructChain, findConstructsWithWord } from '../../services/constructChainService';
import { getVariantsForVerse, MANUSCRIPT_SOURCES } from '../../services/manuscriptVariantsService';
import { QuickReviewButtons } from './ProScholarFeatures';

// Constants from extracted module
import {
  SEMANTIC_FIELD_DISPLAY,
  TIER_DISPLAY,
  SOURCE_CATEGORIES,
  REFERENCE_CATEGORIES,
  HEBREW_DIALECTS,
  getCachedCrossRefs,
  setCachedCrossRefs,
  getCardId
} from './WordIntelligenceCard.constants';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Displays the lookup path showing how the word was resolved
 * @param {Object} props
 * @param {string} props.lookupPath - Path description (e.g., "dictionary-hit" or "dictionary-miss -> pattern-analysis")
 * @param {string} props.sourceCategory - Category key from SOURCE_CATEGORIES
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
 * @param {Object} props
 * @param {string} props.source - Source name
 * @param {string} [props.year] - Publication year
 * @param {string} [props.reliability='gold'] - Reliability tier
 * @param {boolean} [props.compact=false] - Use compact styling
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
 * Displays confidence score with expandable factor breakdown
 * @param {Object} props
 * @param {Object} props.confidence - Confidence object with score and factors
 * @param {boolean} [props.showFactors=false] - Allow expanding to show factors
 */
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

/**
 * Displays frequency bar with percentile indicator
 * @param {Object} props
 * @param {Object} props.frequency - Frequency data object
 */
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

/**
 * Semantic domain badge
 * @param {Object} props
 * @param {string} props.domain - Domain key from SEMANTIC_DOMAINS
 */
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

/**
 * PRO SCHOLAR V6: Semantic Field Badge with enhanced display
 * @param {Object} props
 * @param {string} props.field - Semantic field key
 * @param {string} [props.root] - Root for semantic field lookup
 */
export const SemanticFieldBadgeV6 = memo(function SemanticFieldBadgeV6({ field, root }) {
  // If no field provided, try to detect from root
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

/**
 * PRO SCHOLAR V6: Dictionary Tier Badge
 * @param {Object} props
 * @param {string} props.source - Source name
 */
// eslint-disable-next-line no-unused-vars
export const DictionaryTierBadge = memo(function DictionaryTierBadge({ source }) {
  if (!source) return null;

  // Determine tier from source name
  const sourceKey = source.toLowerCase().replace(/[^a-z]/g, '');
  let tierKey = 'silver'; // default

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

/**
 * PRO SCHOLAR V6: Dialect Detection Display
 * @param {Object} props
 * @param {string} props.word - Word to analyze for dialect
 */
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

/**
 * Displays Pe-Nun weak verb reconstruction process
 * @param {Object} props
 * @param {Object} props.rootAnalysis - Root analysis with weakType
 */
export const WeakVerbReconstruction = memo(function WeakVerbReconstruction({ rootAnalysis }) {
  if (!rootAnalysis?.weakType) return null;

  const { root, weakType, verbStem } = rootAnalysis;
  const stem = verbStem || '';

  return (
    <div className="wic-weak-verb">
      <div className="weak-verb-header">
        <span className="weak-verb-icon">⚡</span>
        <span className="weak-verb-title">Weak Verb</span>
        <span className="weak-verb-type">{weakType}</span>
      </div>
      <p className="weak-verb-explanation">
        The initial נ (nun) assimilates into the following consonant,
        producing a doubled letter. This is reconstructed from the stem.
      </p>
      <div className="weak-verb-reconstruction">
        <div className="reconstruction-form">
          <span className="reconstruction-hebrew" dir="rtl">{stem || '??'}</span>
          <span className="reconstruction-label">Stem Form</span>
        </div>
        <span className="reconstruction-arrow">→</span>
        <div className="reconstruction-form">
          <span className="reconstruction-hebrew" dir="rtl">{root}</span>
          <span className="reconstruction-label">Root (נ restored)</span>
        </div>
      </div>
    </div>
  );
});

/**
 * PRO SCHOLAR V20: Alternative Roots Display
 * Shows scholarly alternative root suggestions when etymology is uncertain
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {Function} [props.onRootClick] - Callback when clicking alternative root
 */
export const AlternativeRootsSection = memo(function AlternativeRootsSection({ word, onRootClick }) {
  const [expanded, setExpanded] = useState(false);

  const altRoots = useMemo(() => {
    try {
      return getAllAlternativeRoots?.(word);
    } catch {
      return null;
    }
  }, [word]);

  if (!altRoots?.hasMultiple) return null;

  const typeLabels = {
    comparison: { label: 'Compare', icon: '↔️', color: '#6366f1' },
    uncertain: { label: 'Perhaps', icon: '❓', color: '#f59e0b' },
    cognate: { label: 'Cognate', icon: '🔗', color: '#10b981' },
    related: { label: 'Related', icon: '≈', color: '#8b5cf6' },
    denominative: { label: 'Denom.', icon: '📝', color: '#0891b2' },
    derivation: { label: 'From', icon: '←', color: '#059669' },
    root_symbol: { label: 'Root', icon: '√', color: '#2563eb' },
    cross_reference: { label: 'See', icon: '→', color: '#64748b' }
  };

  return (
    <div className="wic-alternative-roots">
      <button
        className="alt-roots-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="alt-roots-icon">🌿</span>
        <span className="alt-roots-title">Alternative Roots</span>
        <span className="alt-roots-count">{altRoots.alternatives.length}</span>
        <span className={`alt-roots-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {altRoots.scholarlyNote && (
        <div className="alt-roots-note">
          <span className="note-icon">📚</span>
          <span className="note-text">{altRoots.scholarlyNote}</span>
        </div>
      )}

      {expanded && (
        <div className="alt-roots-content">
          {altRoots.alternatives.map((alt, i) => {
            const typeInfo = typeLabels[alt.type] || { label: alt.type, icon: '•', color: '#6b7280' };
            return (
              <div key={i} className="alt-root-item">
                <div className="alt-root-header">
                  <button
                    className="alt-root-word"
                    onClick={() => onRootClick?.(alt.root)}
                    dir="rtl"
                    style={{ borderColor: typeInfo.color }}
                  >
                    {alt.root}
                  </button>
                  <span
                    className="alt-root-type"
                    style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span className="alt-root-confidence">{alt.confidence}%</span>
                </div>
                {alt.context && (
                  <div className="alt-root-context">
                    <span className="context-source">{alt.source}:</span>
                    <span className="context-text">{alt.context}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/**
 * Displays verb grammar information in a grid
 * @param {Object} props
 * @param {Object} props.grammar - Verb grammar analysis result
 * @param {Object} props.rootAnalysis - Root analysis with pattern info
 */
export const VerbGrammarSection = memo(function VerbGrammarSection({ grammar, rootAnalysis }) {
  if (!grammar && !rootAnalysis?.pattern) return null;

  const binyan = grammar?.binyan || (rootAnalysis?.pattern ? { name: rootAnalysis.pattern } : null);
  const tense = grammar?.tense;
  const conjPrefix = rootAnalysis?.conjPrefix;
  const suffix = rootAnalysis?.suffix;

  const person = grammar?.person || (conjPrefix ? {
    label: getConjugationPrefixLabel(conjPrefix),
  } : null);

  const number = suffix ? {
    label: getConjugationSuffixLabel(suffix),
  } : null;

  const grammarConfidence = grammar?.confidence || rootAnalysis?.confidence;

  return (
    <div className="wic-verb-grammar">
      <div className="grammar-header">
        <span className="grammar-icon">פ</span>
        <span className="grammar-title">Verb Grammar</span>
        {grammarConfidence && (
          <span className="grammar-confidence">{grammarConfidence}%</span>
        )}
      </div>
      <div className="grammar-grid">
        {binyan && (
          <div className="grammar-item binyan">
            <span className="grammar-item-label">Binyan</span>
            <span className="grammar-item-value">
              {binyan.name}
              {binyan.hebrew && (
                <span className="grammar-item-hebrew">{binyan.hebrew}</span>
              )}
            </span>
            {binyan.meaning && (
              <span className="grammar-item-desc">{binyan.meaning}</span>
            )}
          </div>
        )}
        {tense && (
          <div className="grammar-item tense">
            <span className="grammar-item-label">Tense</span>
            <span className="grammar-item-value">
              {tense.name}
              {tense.hebrew && (
                <span className="grammar-item-hebrew">{tense.hebrew}</span>
              )}
            </span>
            {tense.englishTense && (
              <span className="grammar-item-desc">{tense.englishTense}</span>
            )}
          </div>
        )}
        {person && (
          <div className="grammar-item person">
            <span className="grammar-item-label">Person</span>
            <span className="grammar-item-value">{person.label}</span>
          </div>
        )}
        {number && (
          <div className="grammar-item number">
            <span className="grammar-item-label">Number</span>
            <span className="grammar-item-value">{number.label}</span>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Visual morphology breakdown showing prefix + root + suffix
 * @param {Object} props
 * @param {string} props.word - Original word
 * @param {Object} props.rootAnalysis - Extracted root analysis
 * @param {string} [props.computedTranslation] - Pattern-computed translation
 */
export const MorphologySection = memo(function MorphologySection({ word, rootAnalysis, computedTranslation }) {
  if (!rootAnalysis?.root) return null;

  const { root, pattern, conjPrefix, suffix, confidence } = rootAnalysis;

  const prefixLabel = getConjugationPrefixLabel(conjPrefix);
  const suffixLabel = getConjugationSuffixLabel(suffix);

  return (
    <div className="wic-morphology">
      <div className="morph-header">
        <span className="morph-title">Morphology</span>
        {confidence && <span className="morph-confidence">{confidence}%</span>}
      </div>

      {/* Visual component breakdown */}
      <div className="morph-breakdown" dir="rtl">
        {conjPrefix && (
          <>
            <div className="morph-part prefix">
              <span className="part-text">{conjPrefix}</span>
              <span className="part-label">{prefixLabel}</span>
            </div>
            <span className="morph-plus">+</span>
          </>
        )}

        <div className="morph-part root">
          <span className="part-text">{root}</span>
          <span className="part-label">root</span>
        </div>

        {suffix && (
          <>
            <span className="morph-plus">+</span>
            <div className="morph-part suffix">
              <span className="part-text">{suffix}</span>
              <span className="part-label">{suffixLabel}</span>
            </div>
          </>
        )}
      </div>

      {/* Verb pattern badge */}
      {pattern && (
        <div className="morph-pattern-row">
          <span className="morph-pattern-badge verb-pattern">
            <span className="pattern-badge-name">{pattern}</span>
          </span>
        </div>
      )}

      {/* Computed translation from pattern analysis */}
      {computedTranslation && (
        <div className="morph-computed">
          <span className="computed-label">Pattern Translation:</span>
          <span className="computed-value">"{computedTranslation}"</span>
          <span className="computed-source">(computed from root + conjugation)</span>
        </div>
      )}
    </div>
  );
});

/**
 * Etymology section with cognates and proto-semitic info
 * @param {Object} props
 * @param {Object} props.rootData - Root data from ROOT_MEANINGS
 * @param {string} props.root - Root string
 */
export const EtymologySection = memo(function EtymologySection({ rootData, root }) {
  if (!rootData) return null;

  const { etymology, cognates, notes, semanticField, frequency } = rootData;

  return (
    <div className="wic-etymology">
      <div className="ety-header">
        <span className="ety-icon">*</span>
        <span className="ety-title">Etymology</span>
        {semanticField && <span className="ety-field">{semanticField}</span>}
      </div>

      {etymology && (
        <div className="ety-proto">
          <span className="ety-label">Proto-Semitic:</span>
          <span className="ety-value">{etymology}</span>
        </div>
      )}

      {cognates && Object.keys(cognates).length > 0 && (
        <div className="ety-cognates">
          <span className="ety-label">Cognates:</span>
          <div className="cognate-list">
            {Object.entries(cognates).map(([lang, word]) => (
              <span key={lang} className="cognate-item">
                <span className="cognate-lang">{lang}:</span>
                <span className="cognate-word">{word}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {frequency && (
        <div className="ety-frequency">
          <div className="freq-item">
            <span className="freq-icon">📜</span>
            <span className="freq-number">{frequency.tanakh || 0}</span>
            <span className="freq-desc">Tanakh</span>
          </div>
          <div className="freq-item">
            <span className="freq-icon">📚</span>
            <span className="freq-number">{frequency.talmud || 0}</span>
            <span className="freq-desc">Talmud</span>
          </div>
        </div>
      )}

      {notes && <div className="ety-notes">{notes}</div>}
    </div>
  );
});

/**
 * Reusable word list for synonyms/antonyms - DRY extraction
 * @param {Object} props
 * @param {Array} props.words - Array of word objects or strings
 * @param {string} props.type - 'synonym' or 'antonym' for styling
 * @param {Function} [props.onWordClick] - Click handler
 */
export const RelatedWordList = memo(function RelatedWordList({ words, type, onWordClick }) {
  if (!words || words.length === 0) return null;

  return (
    <div className="related-words">
      {words.slice(0, 5).map((item, i) => (
        <button
          key={i}
          className={`related-word ${type}`}
          onClick={() => onWordClick?.(item.word || item)}
          dir="rtl"
        >
          {item.word || item}
        </button>
      ))}
    </div>
  );
});

/**
 * Related words section with synonyms and antonyms
 * @param {Object} props
 * @param {Object} props.semantics - Object with synonyms and antonyms arrays
 * @param {Function} [props.onWordClick] - Callback when clicking a related word
 */
export const RelatedWordsSection = memo(function RelatedWordsSection({ semantics, onWordClick }) {
  const { synonyms = [], antonyms = [] } = semantics || {};

  if (synonyms.length === 0 && antonyms.length === 0) return null;

  return (
    <div className="wic-related">
      {synonyms.length > 0 && (
        <div className="related-group synonyms">
          <span className="related-label">Synonyms:</span>
          <RelatedWordList words={synonyms} type="synonym" onWordClick={onWordClick} />
        </div>
      )}
      {antonyms.length > 0 && (
        <div className="related-group antonyms">
          <span className="related-label">Antonyms:</span>
          <RelatedWordList words={antonyms} type="antonym" onWordClick={onWordClick} />
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PRO SCHOLAR v3 NEW FEATURES
// =============================================================================

/**
 * Cross-References Section - Shows where the word appears in other texts
 * NOW WITH CACHING for better performance
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {string} props.root - Root string
 * @param {Function} [props.onReferenceClick] - Callback when clicking a reference
 */
export const CrossReferencesSection = memo(function CrossReferencesSection({ word, root, onReferenceClick }) {
  const [references, setReferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const abortControllerRef = useRef(null);

  const cacheKey = root || word;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch cross-references on demand WITH CACHING
  const fetchReferences = useCallback(async () => {
    if (references || loading) return;

    // Check cache first
    const cached = getCachedCrossRefs(cacheKey);
    if (cached) {
      setReferences(cached);
      setFromCache(true);
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    setFromCache(false);

    try {
      // Try to fetch from Sefaria API
      const response = await fetch(
        `https://www.sefaria.org/api/words/${encodeURIComponent(cacheKey)}`,
        { signal: abortController.signal }
      );
      if (response.ok) {
        const data = await response.json();
        if (!abortController.signal.aborted) {
          const refs = {
            tanakh: data.tanakh_refs?.slice(0, 5) || [],
            talmud: data.talmud_refs?.slice(0, 5) || [],
            midrash: data.midrash_refs?.slice(0, 3) || [],
          };
          setReferences(refs);
          // Cache the result
          setCachedCrossRefs(cacheKey, refs);
        }
      }
    } catch (e) {
      // Don't update state if aborted
      if (abortController.signal.aborted) return;
      // Fallback: show placeholder
      const emptyRefs = { tanakh: [], talmud: [], midrash: [] };
      setReferences(emptyRefs);
      setCachedCrossRefs(cacheKey, emptyRefs);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cacheKey, references, loading]);

  const handleExpand = () => {
    if (!expanded && !references) {
      fetchReferences();
    }
    setExpanded(!expanded);
  };

  const totalRefs = references
    ? references.tanakh.length + references.talmud.length + references.midrash.length
    : 0;

  return (
    <div className="wic-cross-refs">
      <button className="cross-refs-toggle" onClick={handleExpand}>
        <span className="cross-refs-icon">📜</span>
        <span className="cross-refs-title">Cross-References</span>
        {loading && <span className="cross-refs-loading">...</span>}
        {!loading && references && (
          <span className="cross-refs-count">
            {totalRefs} refs{fromCache && ' ⚡'}
          </span>
        )}
        <span className={`cross-refs-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && references && (
        <div className="cross-refs-content">
          {/* DRY: Use REFERENCE_CATEGORIES constant */}
          {REFERENCE_CATEGORIES.map(({ key, label }) => {
            const refs = references[key] || [];
            if (refs.length === 0) return null;
            return (
              <div key={key} className="refs-group">
                <span className="refs-group-label">{label}</span>
                <div className="refs-list">
                  {refs.map((ref, i) => (
                    <button
                      key={i}
                      className="ref-item"
                      onClick={() => onReferenceClick?.(ref)}
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {totalRefs === 0 && (
            <div className="refs-empty">No cross-references found</div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Audio Pronunciation - Hebrew TTS with dialect toggle
 * FIXED: Dialect now affects speech rate and provides transliteration hint
 * @param {Object} props
 * @param {string} props.word - Hebrew word to pronounce
 */
export const AudioPronunciation = memo(function AudioPronunciation({ word }) {
  const [playing, setPlaying] = useState(false);
  const [dialect, setDialect] = useState(HEBREW_DIALECTS[0].key);
  const [showHint, setShowHint] = useState(false);

  // Dialect-specific settings (Web Speech API has limited dialect support)
  const dialectSettings = useMemo(() => ({
    modern: { rate: 0.85, pitch: 1.0, hint: 'Modern Israeli pronunciation' },
    sephardi: { rate: 0.75, pitch: 0.95, hint: 'Sephardi: Emphasize gutturals (ח, ע)' },
    ashkenazi: { rate: 0.7, pitch: 1.05, hint: 'Ashkenazi: "ת" as "s", "ע" silent' },
  }), []);

  const handlePlay = useCallback(() => {
    if (playing || !word) return;

    // Use Web Speech API for Hebrew
    if ('speechSynthesis' in window) {
      setPlaying(true);
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'he-IL';

      // Apply dialect-specific settings
      const settings = dialectSettings[dialect] || dialectSettings.modern;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      // Try to find Hebrew voice
      const voices = speechSynthesis.getVoices();
      const hebrewVoice = voices.find(v => v.lang.startsWith('he'));
      if (hebrewVoice) {
        utterance.voice = hebrewVoice;
      }

      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);

      speechSynthesis.speak(utterance);
    }
  }, [word, playing, dialect, dialectSettings]);

  const currentDialect = HEBREW_DIALECTS.find(d => d.key === dialect);
  const currentHint = dialectSettings[dialect]?.hint;

  return (
    <div className="wic-audio">
      <button
        className={`audio-play-btn ${playing ? 'playing' : ''}`}
        onClick={handlePlay}
        disabled={playing}
        title={`Hear pronunciation (${currentDialect?.label || 'Modern'})`}
      >
        <span className="audio-icon">{playing ? '🔊' : '🔈'}</span>
        <span className="audio-text">{playing ? 'Playing...' : 'Listen'}</span>
      </button>
      <div className="dialect-selector">
        {HEBREW_DIALECTS.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`dialect-btn ${dialect === key ? 'active' : ''}`}
            onClick={() => {
              setDialect(key);
              setShowHint(true);
              setTimeout(() => setShowHint(false), 2000);
            }}
            title={`${label} pronunciation`}
          >
            {icon}
          </button>
        ))}
      </div>
      {showHint && currentHint && (
        <div className="dialect-hint">{currentHint}</div>
      )}
    </div>
  );
});

/**
 * Knowledge Graph Mini Preview - Shows connected words visually
 * @param {Object} props
 * @param {string} props.word - Center word
 * @param {string} props.root - Root string
 * @param {Array} props.synonyms - Related synonyms
 * @param {Array} props.antonyms - Related antonyms
 * @param {Function} [props.onShowFullGraph] - Callback to open full graph
 */
export const KnowledgeGraphMini = memo(function KnowledgeGraphMini({ word, root, synonyms = [], antonyms = [], onShowFullGraph }) {
  // Combine related words for mini graph
  const connections = [
    ...synonyms.slice(0, 2).map(s => ({ word: s.word || s, type: 'synonym' })),
    ...antonyms.slice(0, 2).map(a => ({ word: a.word || a, type: 'antonym' })),
  ];

  if (connections.length === 0) return null;

  return (
    <div className="wic-graph-mini">
      <div className="graph-mini-header">
        <span className="graph-mini-icon">🕸️</span>
        <span className="graph-mini-title">Word Connections</span>
        {onShowFullGraph && (
          <button className="graph-expand-btn" onClick={() => onShowFullGraph(word, root)}>
            Expand
          </button>
        )}
      </div>
      <div className="graph-mini-visual">
        <div className="graph-center">
          <span className="graph-center-word" dir="rtl">{word}</span>
          {root && <span className="graph-center-root" dir="rtl">{root}</span>}
        </div>
        <div className="graph-connections">
          {connections.map((conn, i) => (
            <div
              key={i}
              className={`graph-connection ${conn.type}`}
              style={{ '--angle': `${(i * 360) / connections.length}deg` }}
            >
              <div className="connection-line" />
              <span className="connection-word" dir="rtl">{conn.word}</span>
              <span className="connection-type">
                {conn.type === 'synonym' ? '≈' : '↔'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Quick Export - Copy word card as markdown
 * @param {Object} props
 * @param {Object} props.data - Full word data object
 */
export const QuickExport = memo(function QuickExport({ data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!data) return;

    const markdown = `## ${data.word}
**Root:** ${data.root || 'Unknown'}
**Language:** ${data.language || 'Hebrew'}

### Definition
${data.primaryDefinition || 'No definition'}

${data.rootAnalysis?.pattern ? `### Grammar
- **Pattern:** ${data.rootAnalysis.pattern}
- **Confidence:** ${data.rootAnalysis.confidence || '?'}%
` : ''}
${data.rootData?.etymology ? `### Etymology
- **Proto-Semitic:** ${data.rootData.etymology}
${data.rootData.cognates ? Object.entries(data.rootData.cognates).map(([lang, word]) => `- **${lang}:** ${word}`).join('\n') : ''}
` : ''}
---
*Exported from Torah Reader Pro Scholar*`;

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  return (
    <button
      className={`wic-export-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title="Copy as markdown"
    >
      <span className="export-icon">{copied ? '✓' : '📋'}</span>
      <span className="export-text">{copied ? 'Copied!' : 'Export'}</span>
    </button>
  );
});

// =============================================================================
// PRO SCHOLAR v4: NEW ADVANCED COMPONENTS
// =============================================================================

/**
 * Cantillation Marks Display - Shows trop analysis for the word
 * @param {Object} props
 * @param {string} props.word - Hebrew word with potential cantillation marks
 */
export const CantillationDisplay = memo(function CantillationDisplay({ word }) {
  const marks = useMemo(() => {
    try {
      return extractCantillation?.(word) || [];
    } catch {
      return [];
    }
  }, [word]);

  if (marks.length === 0) return null;

  return (
    <div className="wic-cantillation">
      <div className="cant-header">
        <span className="cant-icon">🎵</span>
        <span className="cant-title">Cantillation</span>
        <span className="cant-count">{marks.length} mark{marks.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="cant-marks">
        {marks.slice(0, 3).map((mark, i) => (
          <div key={i} className={`cant-mark ${mark.type || 'unknown'}`}>
            <span className="mark-symbol">{mark.symbol}</span>
            <div className="mark-info">
              <span className="mark-name">{mark.name || 'Unknown'}</span>
              <span className="mark-hebrew">{mark.hebrewName || ''}</span>
            </div>
            {mark.type && (
              <span className={`mark-type-badge ${mark.type}`}>
                {mark.type === 'disjunctive' ? '⬢ pause' : '◆ connect'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Construct Chain Analysis - Detects and displays סמיכות patterns
 * @param {Object} props
 * @param {string} props.word - Hebrew word or phrase
 * @param {Function} [props.onWordClick] - Click handler for related constructs
 */
export const ConstructChainDisplay = memo(function ConstructChainDisplay({ word, onWordClick }) {
  const analysis = useMemo(() => {
    try {
      return analyzeConstructChain?.(word);
    } catch {
      return null;
    }
  }, [word]);

  const relatedConstructs = useMemo(() => {
    if (!analysis?.isConstruct) return [];
    try {
      return findConstructsWithWord?.(word)?.slice(0, 3) || [];
    } catch {
      return [];
    }
  }, [word, analysis]);

  if (!analysis?.isConstruct) return null;

  return (
    <div className="wic-construct-chain">
      <div className="construct-header">
        <span className="construct-icon">🔗</span>
        <span className="construct-title">Construct Chain (סמיכות)</span>
        {analysis.confidence && (
          <span className="construct-confidence">{analysis.confidence}%</span>
        )}
      </div>

      {analysis.known ? (
        <div className="construct-known">
          <div className="construct-parsed">
            <span className="parsed-hebrew" dir="rtl">{analysis.phrase}</span>
            <span className="parsed-arrow">→</span>
            <span className="parsed-english">{analysis.parsed}</span>
          </div>
          <div className="construct-parts">
            <span className="part-label">Nomen Regens:</span>
            <span className="part-value" dir="rtl">{analysis.nomen_regens}</span>
            <span className="part-label">Nomen Rectum:</span>
            <span className="part-value" dir="rtl">{analysis.nomen_rectum}</span>
          </div>
          <div className="construct-type">
            <span className="type-badge">{analysis.type}</span>
            {analysis.semanticFunction && (
              <span className="semantic-function">{analysis.semanticFunction}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="construct-detected">
          <span className="detected-text">Possible construct pattern detected</span>
          {analysis.possibleType && (
            <span className="possible-type">Type: {analysis.possibleType}</span>
          )}
          {analysis.explanation && (
            <span className="detection-reason">{analysis.explanation}</span>
          )}
        </div>
      )}

      {relatedConstructs.length > 0 && (
        <div className="construct-related">
          <span className="related-label">Related constructs:</span>
          <div className="related-list">
            {relatedConstructs.map((c, i) => (
              <button
                key={i}
                className="related-construct"
                onClick={() => onWordClick?.(c.phrase)}
                dir="rtl"
              >
                {c.phrase}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Manuscript Variants Indicator - Shows if word has DSS/LXX variants
 * @param {Object} props
 * @param {string} props.verseRef - Verse reference (Book.Chapter.Verse)
 */
export const ManuscriptVariantsIndicator = memo(function ManuscriptVariantsIndicator({ verseRef }) {
  const [expanded, setExpanded] = useState(false);

  const variantData = useMemo(() => {
    if (!verseRef) return null;
    try {
      return getVariantsForVerse?.(verseRef);
    } catch {
      return null;
    }
  }, [verseRef]);

  if (!variantData || !variantData.variants?.length) return null;

  const hasSignificant = variantData.hasSignificantVariants;
  const variantCount = variantData.variants.length;

  return (
    <div className={`wic-variants ${hasSignificant ? 'significant' : ''}`}>
      <button
        className="variants-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={`Manuscript variants: ${variantCount} variant${variantCount !== 1 ? 's' : ''}${hasSignificant ? ' with significant differences' : ''}`}
      >
        <span className="variants-icon" aria-hidden="true">📜</span>
        <span className="variants-title">Manuscript Variants</span>
        <span className={`variants-count ${hasSignificant ? 'significant' : ''}`}>
          {variantCount} variant{variantCount !== 1 ? 's' : ''}
          {hasSignificant && <span aria-hidden="true"> ⚠️</span>}
        </span>
        <span className={`variants-arrow ${expanded ? 'expanded' : ''}`} aria-hidden="true">▼</span>
      </button>

      {expanded && (
        <div className="variants-content">
          <div className="variants-mt">
            <span className="mt-label">Masoretic Text:</span>
            <span className="mt-text" dir="rtl">{variantData.masoreticText}</span>
          </div>

          <div className="variants-list">
            {variantData.variants.map((variant, i) => {
              const sourceInfo = variant.sourceInfo || MANUSCRIPT_SOURCES[variant.source?.toUpperCase()] || {};
              return (
                <div key={i} className={`variant-item ${variant.significance}`}>
                  <div className="variant-source">
                    <span className="source-abbrev">{sourceInfo.abbreviation || variant.source}</span>
                    <span className="source-name">{sourceInfo.name || variant.source}</span>
                    {sourceInfo.date && (
                      <span className="source-date">{sourceInfo.date}</span>
                    )}
                  </div>
                  <div className="variant-reading">
                    <span className="reading-text">{variant.reading}</span>
                  </div>
                  <div className="variant-meta">
                    <span className={`significance-badge ${variant.significance}`}>
                      {variant.significance}
                    </span>
                    {variant.notes && (
                      <span className="variant-notes">{variant.notes}</span>
                    )}
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

/**
 * SRS (Spaced Repetition System) section with Quick Review
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {string} props.definition - Primary definition
 * @param {string} [props.root] - Root string
 * @param {Function} [props.onUpdate] - Callback when SRS card is updated
 */
export const SRSSection = memo(function SRSSection({ word, definition, root, onUpdate }) {
  const [srsCard, setSrsCard] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const existing = getCard?.(getCardId(word));
    setSrsCard(existing);
    setShowRatings(false);
    setFeedback(null);
  }, [word]);

  const handleAddToSRS = useCallback(() => {
    if (isAdding || !createCard) return;
    setIsAdding(true);

    const newCard = createCard(getCardId(word), word, definition || 'Unknown', {
      type: 'vocabulary',
      hebrewRoot: root,
      source: 'WordIntelligenceCard'
    });

    setSrsCard(newCard);
    setIsAdding(false);
    onUpdate?.();
  }, [word, definition, root, isAdding, onUpdate]);

  // Quick review handler - process SRS review with quality rating
  const handleQuickReview = useCallback((quality) => {
    if (!srsCard) return;
    try {
      const srsService = require('../../services/srsService');
      const updated = srsService.processReview?.(getCardId(word), quality);
      if (updated) {
        setSrsCard(updated);
        setShowRatings(false);
        setFeedback(`✓ Next in ${updated.interval}d`);
        setTimeout(() => setFeedback(null), 2500);
        onUpdate?.();
      }
    } catch (e) {
      console.debug('[SRSSection] Review failed:', e);
    }
  }, [word, srsCard, onUpdate]);

  const stats = getStats?.() || { total: 0, retention: 0 };

  if (srsCard) {
    const mastery = getMasteryLevel(srsCard);
    const nextReviewDate = srsCard.nextReview
      ? new Date(srsCard.nextReview).toLocaleDateString()
      : 'Now';
    const isDue = !srsCard.nextReview || new Date(srsCard.nextReview) <= new Date();

    return (
      <div className={`wic-srs in-srs ${mastery.level}`}>
        <div className="srs-header">
          <div className="srs-status">
            <span className="srs-icon">{mastery.icon}</span>
            <span className="srs-level">{mastery.level}</span>
          </div>
          {isDue && !feedback && (
            <button className="srs-review-btn" onClick={() => setShowRatings(!showRatings)}>
              {showRatings ? '✕' : '📝'}
            </button>
          )}
        </div>
        {showRatings && (
          <QuickReviewButtons
            onReview={handleQuickReview}
            compact={true}
            showLabels={false}
          />
        )}
        {feedback && <div className="srs-feedback">{feedback}</div>}
        <div className="srs-meta">
          <span>Interval: {srsCard.interval}d</span>
          <span>Next: {nextReviewDate}</span>
        </div>
        <div className="srs-stats">
          <span>{srsCard.repetitions} reviews</span>
          <span>Ease: {Math.round(srsCard.easeFactor * 100)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wic-srs not-in-srs">
      <button className="srs-add-btn" onClick={handleAddToSRS} disabled={isAdding}>
        <span className="srs-icon">➕</span>
        <span className="srs-text">Add to SRS</span>
      </button>
      <span className="srs-hint">{stats.total} words • {stats.retention}% retention</span>
    </div>
  );
});

/**
 * Definitions display with source badges
 * @param {Object} props
 * @param {Array} props.definitions - Array of definition objects
 * @param {boolean} props.expanded - Whether to show all definitions
 * @param {Function} props.onToggle - Toggle expanded state
 */
export const DefinitionsSection = memo(function DefinitionsSection({ definitions, expanded, onToggle }) {
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
});
