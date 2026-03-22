/**
 * MorphologySection Component
 * Visual morphology breakdown showing prefix + root + suffix
 */

import React, { memo } from 'react';

// Import conjugation label functions
let getConjugationPrefixLabel, getConjugationSuffixLabel;
try {
  const morphology = require('../../../constants/morphology');
  getConjugationPrefixLabel = morphology.getConjugationPrefixLabel;
  getConjugationSuffixLabel = morphology.getConjugationSuffixLabel;
} catch (e) {
  // Fallback label functions
  getConjugationPrefixLabel = (prefix) => {
    const map = { 'ת': 'you', 'א': 'I', 'נ': 'we', 'י': 'he/they', 'מ': 'participle' };
    return map[prefix] || 'prefix';
  };
  getConjugationSuffixLabel = (suffix) => {
    const map = { 'ו': 'plural', 'ין': 'plural', 'י': 'feminine', 'ה': 'feminine/3fs' };
    return map[suffix] || 'suffix';
  };
}

/**
 * Visual morphology breakdown showing prefix + root + suffix
 * @param {Object} props
 * @param {string} props.word - Original word
 * @param {Object} props.rootAnalysis - Extracted root analysis
 * @param {string} [props.computedTranslation] - Pattern-computed translation
 */
function MorphologySection({ word, rootAnalysis, computedTranslation }) {
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
}

export default memo(MorphologySection);
