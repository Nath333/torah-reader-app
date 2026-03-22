// =============================================================================
// Morphology Breakdown Component - PRO SCHOLAR v3
// Displays Hebrew word structure: prefix + root + suffix
// With verb grammar, confidence indicators, and pattern recognition
// =============================================================================

import React, { useState, useCallback } from 'react';
import { analyzeWordMorphology, getSimpleBreakdown } from '../../utils/morphologyAnalyzer';
import { analyzeVerbGrammar, formatVerbGrammar } from '../../utils/morphology/verbGrammar';
import { calculateConfidence, getConfidenceDisplay } from '../../utils/morphology/confidence';
import { computeVerbTranslation, extractAramaicRoot, detectHebrewBinyan } from '../../constants/morphology';
import { getRootInfo, getRelatedRoots } from '../../data/rootDatabase';
import { createCard, getCard } from '../../services/srsService';
import ConjugationTable from './ConjugationTable';
import './MorphologyBreakdown.css';

/**
 * Confidence indicator badge
 */
const ConfidenceBadge = ({ score, factors }) => {
  const display = getConfidenceDisplay(score);
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="confidence-badge-container">
      <button
        className={`confidence-badge confidence-${display.level}`}
        onClick={() => setShowDetails(!showDetails)}
        title={`${display.label} (${score}%)`}
        style={{ '--confidence-color': display.color }}
      >
        <span className="confidence-score">{score}%</span>
        <span className="confidence-label">{display.level}</span>
      </button>
      {showDetails && factors?.length > 0 && (
        <div className="confidence-details">
          {factors.map((f, i) => (
            <div key={i} className="confidence-factor">{f}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Verb grammar display section
 */
const VerbGrammarSection = ({ grammar }) => {
  if (!grammar?.parts?.length) return null;

  return (
    <div className="verb-grammar-section">
      <div className="grammar-header">
        <span className="grammar-icon">פ</span>
        <span className="grammar-title">Verb Grammar</span>
        {grammar.confidence && (
          <span className="grammar-confidence" title={`${grammar.confidence}% confidence`}>
            {grammar.confidence}%
          </span>
        )}
      </div>
      <div className="grammar-parts">
        {grammar.parts.map((part, i) => (
          <div key={i} className="grammar-part">
            <span className="part-label">{part.label}</span>
            <span className="part-value">
              {part.hebrew && <span className="part-hebrew">{part.hebrew}</span>}
              {part.value}
            </span>
            {part.description && (
              <span className="part-desc">{part.description}</span>
            )}
            {part.meaning && (
              <span className="part-meaning">{part.meaning}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * PRO SCHOLAR: Weak Verb Type Badge (פ"נ, ע"ו, ל"ה)
 * Displays weak verb classification with color coding
 */
const WeakVerbBadge = ({ weakType, explanation }) => {
  if (!weakType) return null;

  const weakTypeStyles = {
    'פ"נ': { bg: '#fef3c7', border: '#f59e0b', label: 'Pe-Nun', icon: '🔸' },
    'פ"א': { bg: '#fee2e2', border: '#ef4444', label: 'Pe-Aleph', icon: '🔺' },
    'פ"י': { bg: '#dbeafe', border: '#3b82f6', label: 'Pe-Yod', icon: '🔹' },
    'ע"ו': { bg: '#d1fae5', border: '#10b981', label: 'Hollow-Vav', icon: '⭕' },
    'ע"י': { bg: '#e0e7ff', border: '#6366f1', label: 'Hollow-Yod', icon: '⚪' },
    'ע"ע': { bg: '#fce7f3', border: '#ec4899', label: 'Geminate', icon: '⊛' },
    'ל"ה': { bg: '#f3e8ff', border: '#a855f7', label: 'Lamed-He', icon: '◈' },
    'ל"א': { bg: '#fef3c7', border: '#eab308', label: 'Lamed-Aleph', icon: '◇' },
  };

  // Extract the base type (e.g., "פ"נ" from "פ"נ (Pe-Nun)")
  const baseType = weakType.split(' ')[0].replace(/[()]/g, '');
  const style = weakTypeStyles[baseType] || { bg: '#f3f4f6', border: '#9ca3af', label: weakType, icon: '◎' };

  return (
    <span
      className="weak-verb-badge"
      style={{ background: style.bg, borderColor: style.border }}
      title={explanation || `Weak verb type: ${style.label}`}
    >
      <span className="weak-icon">{style.icon}</span>
      <span className="weak-hebrew">{baseType}</span>
      <span className="weak-label">{style.label}</span>
    </span>
  );
};

/**
 * PRO SCHOLAR: Related Words from Same Root Section
 * Shows cognates, semantic field relatives, and words from the same root
 */
const RelatedWordsSection = ({ root, rootInfo }) => {
  const [expanded, setExpanded] = useState(false);

  if (!root || !rootInfo) return null;

  const cognates = rootInfo.cognates || {};
  const semanticField = rootInfo.semanticField;
  const relatedRoots = semanticField ? getRelatedRoots?.(semanticField) : [];
  const hasCognates = Object.keys(cognates).length > 0;
  const hasRelated = relatedRoots && relatedRoots.length > 1;

  if (!hasCognates && !hasRelated) return null;

  return (
    <div className="related-words-section">
      <button
        className="related-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="related-icon">🔗</span>
        <span className="related-title">Related Words</span>
        <span className="related-count">
          {Object.keys(cognates).length + (relatedRoots?.length || 0) - 1}
        </span>
        <span className={`related-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="related-content">
          {/* Cognates from other Semitic languages */}
          {hasCognates && (
            <div className="cognates-group">
              <span className="group-label">Semitic Cognates:</span>
              <div className="cognate-list">
                {Object.entries(cognates).map(([lang, word]) => (
                  <span key={lang} className={`cognate-badge cognate-${lang}`}>
                    <span className="cognate-lang">{lang}</span>
                    <span className="cognate-word">{word}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Words from the same semantic field */}
          {hasRelated && (
            <div className="semantic-group">
              <span className="group-label">
                Same Field ({semanticField}):
              </span>
              <div className="semantic-list">
                {relatedRoots
                  .filter(r => r.root !== root)
                  .slice(0, 6)
                  .map(r => (
                    <span key={r.root} className="semantic-badge">
                      <span className="semantic-root">{r.root}</span>
                      <span className="semantic-meaning">{r.base}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Root notes if available */}
          {rootInfo.notes && (
            <div className="root-notes">
              <span className="notes-icon">📝</span>
              <span className="notes-text">{rootInfo.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * PRO SCHOLAR: Add to SRS Vocabulary Button
 * Quick action to add word to spaced repetition system
 */
// eslint-disable-next-line no-unused-vars
const AddToSRSButton = ({ word, definition, root, pattern, language }) => {
  const [added, setAdded] = useState(false);
  const [exists, setExists] = useState(false);

  // Check if card already exists
  React.useEffect(() => {
    const cardId = `word-${word}`;
    const existing = getCard(cardId);
    setExists(!!existing);
  }, [word]);

  const handleAdd = useCallback(() => {
    if (added || exists) return;

    const cardId = `word-${word}`;
    const front = word;
    const back = definition || `${pattern ? `[${pattern}] ` : ''}${root ? `Root: ${root}` : ''}`;

    createCard(cardId, front, back, {
      type: 'vocabulary',
      source: 'morphology-breakdown',
      hebrewRoot: root,
      metadata: {
        language: language || 'Hebrew',
        pattern,
        addedFrom: 'PRO_SCHOLAR'
      }
    });

    setAdded(true);
  }, [word, definition, root, pattern, language, added, exists]);

  if (exists) {
    return (
      <span className="srs-badge srs-exists" title="Already in vocabulary">
        <span className="srs-icon">✓</span>
        <span className="srs-text">In SRS</span>
      </span>
    );
  }

  return (
    <button
      className={`srs-add-btn ${added ? 'srs-added' : ''}`}
      onClick={handleAdd}
      disabled={added}
      title={added ? 'Added to vocabulary!' : 'Add to SRS vocabulary'}
    >
      <span className="srs-icon">{added ? '✓' : '+'}</span>
      <span className="srs-text">{added ? 'Added!' : 'Add to SRS'}</span>
    </button>
  );
};

/**
 * Pattern recognition display (Hebrew Binyanim + Aramaic patterns)
 * PRO SCHOLAR: Comprehensive verb pattern display
 */
const PatternBadge = ({ pattern, language }) => {
  if (!pattern) return null;

  const patternStyles = {
    // ARAMAIC BINYANIM
    'Aphel': { bg: '#fef3c7', border: '#f59e0b', label: 'Causative', hebrew: 'אַפְעֵל' },
    'Peal': { bg: '#dbeafe', border: '#3b82f6', label: 'Simple', hebrew: 'פְּעַל' },
    'Pael': { bg: '#fce7f3', border: '#ec4899', label: 'Intensive', hebrew: 'פַּעֵל' },
    'Itpeel': { bg: '#e0e7ff', border: '#6366f1', label: 'Reflexive', hebrew: 'אִתְפְּעֵל' },
    'Shafel': { bg: '#d1fae5', border: '#10b981', label: 'Causative', hebrew: 'שַׁפְעֵל' },
    // HEBREW BINYANIM (7 main patterns)
    'Qal': { bg: '#dbeafe', border: '#1d4ed8', label: 'Simple active', hebrew: 'קַל' },
    'Nifal': { bg: '#fce7f3', border: '#be185d', label: 'Passive/Reflexive', hebrew: 'נִפְעַל' },
    'Piel': { bg: '#fef3c7', border: '#b45309', label: 'Intensive active', hebrew: 'פִּעֵל' },
    'Pual': { bg: '#e0e7ff', border: '#4338ca', label: 'Intensive passive', hebrew: 'פֻּעַל' },
    'Hifil': { bg: '#d1fae5', border: '#047857', label: 'Causative active', hebrew: 'הִפְעִיל' },
    'Hufal': { bg: '#f3e8ff', border: '#7e22ce', label: 'Causative passive', hebrew: 'הֻפְעַל' },
    'Hitpael': { bg: '#fef2f2', border: '#b91c1c', label: 'Reflexive', hebrew: 'הִתְפַּעֵל' },
  };

  const style = patternStyles[pattern] || { bg: '#f3f4f6', border: '#9ca3af', label: '' };
  const isAramaic = language === 'Aramaic' || ['Aphel', 'Peal', 'Pael', 'Itpeel', 'Shafel'].includes(pattern);

  return (
    <span
      className={`pattern-badge binyan-${pattern.toLowerCase()}`}
      style={{ background: style.bg, borderColor: style.border }}
    >
      <span className="pattern-name">{pattern}</span>
      {style.hebrew && <span className="pattern-hebrew">{style.hebrew}</span>}
      {style.label && <span className="pattern-type">{style.label}</span>}
      {isAramaic && <span className="pattern-lang">ארמית</span>}
    </span>
  );
};

/**
 * Display a morphological breakdown of a Hebrew/Aramaic word
 * Shows prefix, root, and suffix with their meanings
 * PRO SCHOLAR: Also shows verb grammar, confidence, and computed translation
 */
const MorphologyBreakdown = ({
  word,
  lookupResult,
  compact = false,
  showGrammar = true,
  showConfidence = true
}) => {
  if (!word) return null;

  const analysis = analyzeWordMorphology(word, lookupResult);
  const breakdown = getSimpleBreakdown(analysis);

  // PRO SCHOLAR: Verb grammar analysis
  const verbGrammar = showGrammar ? analyzeVerbGrammar(word, lookupResult) : null;
  const formattedGrammar = verbGrammar ? formatVerbGrammar(verbGrammar) : null;

  // PRO SCHOLAR: Confidence calculation
  const confidence = showConfidence && lookupResult ? calculateConfidence(lookupResult) : null;

  // PRO SCHOLAR: Pattern-based translation for Aramaic verbs
  const rootAnalysis = extractAramaicRoot?.(word);
  const computedTranslation = rootAnalysis ? computeVerbTranslation?.(rootAnalysis) : null;

  // PRO SCHOLAR: Try Hebrew binyan detection if no Aramaic pattern
  const hebrewBinyan = !rootAnalysis?.pattern ? detectHebrewBinyan?.(word) : null;
  const detectedPattern = rootAnalysis?.pattern ||
                          hebrewBinyan?.bestMatch?.binyan?.name ||
                          verbGrammar?.binyan?.name;

  // PRO SCHOLAR: Root info lookup for related words
  const extractedRoot = rootAnalysis?.root || breakdown?.root?.text;
  const rootInfo = extractedRoot ? getRootInfo?.(extractedRoot) : null;

  if (!breakdown?.hasBreakdown) {
    // No breakdown available - just show the word
    return compact ? null : (
      <div className="morphology-breakdown morphology-simple">
        <span className="morphology-word">{word}</span>
        {breakdown?.root?.meaning && (
          <span className="morphology-meaning">{breakdown.root.meaning}</span>
        )}
      </div>
    );
  }

  if (compact) {
    // Compact inline view
    return (
      <span className="morphology-inline">
        {breakdown.prefix && (
          <span className="morph-prefix" title={breakdown.prefix.meaning}>
            {breakdown.prefix.text}
          </span>
        )}
        <span className="morph-root" title={breakdown.root?.meaning}>
          {breakdown.root?.text}
        </span>
        {breakdown.suffix && (
          <span className="morph-suffix" title={breakdown.suffix.meaning}>
            {breakdown.suffix.text}
          </span>
        )}
      </span>
    );
  }

  // Full breakdown view
  return (
    <div className="morphology-breakdown morphology-pro">
      {/* PRO SCHOLAR: Header with confidence badge and SRS button */}
      <div className="morphology-header">
        <span className="morphology-word" dir="rtl">{word}</span>
        <span className="morphology-arrow">→</span>
        {confidence && (
          <ConfidenceBadge score={confidence.score} factors={confidence.factors} />
        )}
        <AddToSRSButton
          word={word}
          definition={computedTranslation || breakdown?.root?.meaning}
          root={extractedRoot}
          pattern={detectedPattern}
          language={analysis?.language}
        />
      </div>

      {/* PRO SCHOLAR: Pattern and language badges */}
      <div className="morphology-badges">
        {detectedPattern && (
          <PatternBadge pattern={detectedPattern} language={analysis.language} />
        )}
        {rootAnalysis?.weakType && (
          <WeakVerbBadge
            weakType={rootAnalysis.weakType}
            explanation={rootAnalysis.explanation}
          />
        )}
        {analysis.language === 'Aramaic' && !detectedPattern && (
          <span className="morphology-language-tag">Aramaic</span>
        )}
        {rootAnalysis?.root && (
          <span className="root-badge" title="Reconstructed 3-letter root">
            שׁוֹרֶשׁ: {rootAnalysis.root}
          </span>
        )}
      </div>

      {/* Word component breakdown */}
      <div className="morphology-components">
        {breakdown.prefix && (
          <div className="morph-component morph-prefix-box">
            <span className="morph-text" dir="rtl">{breakdown.prefix.text}</span>
            <span className="morph-label">{breakdown.prefix.meaning}</span>
            <span className="morph-type">prefix</span>
          </div>
        )}

        {breakdown.prefix && <span className="morph-plus">+</span>}

        <div className="morph-component morph-root-box">
          <span className="morph-text" dir="rtl">{breakdown.root?.text}</span>
          <span className="morph-label">{breakdown.root?.meaning || 'root'}</span>
          <span className="morph-type">
            root
            {breakdown.root?.strongNumber && (
              <span className="morph-strong">{breakdown.root.strongNumber}</span>
            )}
          </span>
        </div>

        {breakdown.suffix && <span className="morph-plus">+</span>}

        {breakdown.suffix && (
          <div className="morph-component morph-suffix-box">
            <span className="morph-text" dir="rtl">{breakdown.suffix.text}</span>
            <span className="morph-label">{breakdown.suffix.meaning}</span>
            <span className="morph-type">suffix</span>
          </div>
        )}
      </div>

      {/* PRO SCHOLAR: Computed translation from pattern analysis */}
      {computedTranslation && (
        <div className="computed-translation">
          <span className="computed-label">Pattern Analysis:</span>
          <span className="computed-value">{computedTranslation}</span>
          <span className="computed-source">(computed from root + conjugation rules)</span>
        </div>
      )}

      {/* PRO SCHOLAR: Verb grammar section */}
      {formattedGrammar && <VerbGrammarSection grammar={formattedGrammar} />}

      {/* PRO SCHOLAR: Conjugation paradigm table */}
      {detectedPattern && (
        <ConjugationTable
          binyan={detectedPattern}
          root={rootAnalysis?.root || breakdown.root?.text}
          language={analysis.language}
        />
      )}

      {/* PRO SCHOLAR: Related words from same root */}
      <RelatedWordsSection root={extractedRoot} rootInfo={rootInfo} />
    </div>
  );
};

export default MorphologyBreakdown;
