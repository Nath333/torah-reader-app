/**
 * VerbGrammarSection Component
 * Displays verb grammar information in a grid (binyan, tense, person, number)
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
 * Displays verb grammar information in a grid
 * @param {Object} props
 * @param {Object} props.grammar - Verb grammar analysis result
 * @param {Object} props.rootAnalysis - Root analysis with pattern info
 */
function VerbGrammarSection({ grammar, rootAnalysis }) {
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
}

export default memo(VerbGrammarSection);
