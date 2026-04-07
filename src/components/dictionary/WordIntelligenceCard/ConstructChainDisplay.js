/**
 * ConstructChainDisplay Component
 * Detects and displays סמיכות (construct chain) patterns
 */

import React, { useMemo, memo } from 'react';

// Construct chain service
import { analyzeConstructChain, findConstructsWithWord } from '../../../services/constructChainService';

/**
 * Construct Chain Analysis - Detects and displays סמיכות patterns
 * @param {Object} props
 * @param {string} props.word - Hebrew word or phrase
 * @param {Function} [props.onWordClick] - Click handler for related constructs
 */
const ConstructChainDisplay = memo(function ConstructChainDisplay({ word, onWordClick }) {
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

export default ConstructChainDisplay;
