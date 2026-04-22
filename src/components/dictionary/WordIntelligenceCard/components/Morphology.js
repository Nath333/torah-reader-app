/**
 * WordIntelligenceCard - Morphology & Grammar
 * Weak verb reconstruction, verb grammar section, morphology breakdown
 */

import React, { memo } from 'react';
import {
  getConjugationPrefixLabel,
  getConjugationSuffixLabel
} from '../../../../constants/morphology';

// =============================================================================
// WEAK VERB RECONSTRUCTION
// =============================================================================

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

// =============================================================================
// VERB GRAMMAR SECTION
// =============================================================================

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

// =============================================================================
// MORPHOLOGY SECTION
// =============================================================================

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

      {pattern && (
        <div className="morph-pattern-row">
          <span className="morph-pattern-badge verb-pattern">
            <span className="pattern-badge-name">{pattern}</span>
          </span>
        </div>
      )}

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
