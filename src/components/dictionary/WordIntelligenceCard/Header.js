/**
 * WordIntelligenceCard Header Component
 * Displays the word, root, language badge, confidence, and close button
 */

import React, { useState, memo } from 'react';

// =============================================================================
// CONFIDENCE DISPLAY - Imported/self-contained
// =============================================================================

// Confidence display helper
const getConfidenceDisplay = (score) => ({
  level: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
  color: score >= 80 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626'
});

/**
 * Displays confidence score with expandable factor breakdown
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
// HEADER COMPONENT
// =============================================================================

/**
 * Header section for WordIntelligenceCard
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {string} [props.root] - Root string
 * @param {string} [props.language] - Language identifier
 * @param {Object} [props.confidence] - Confidence data
 * @param {Function} [props.onClose] - Close button callback
 */
function Header({ word, root, language, confidence, onClose }) {
  return (
    <div className="wic-header">
      <div className="wic-word-section">
        <span className="wic-word" dir="rtl">{word}</span>
        <div className="wic-meta">
          {root && <span className="wic-root" dir="rtl">שׁוֹרֶשׁ: {root}</span>}
          {language && (
            <span className={`wic-lang ${language.toLowerCase()}`}>
              {language}
            </span>
          )}
        </div>
      </div>
      <div className="wic-header-right">
        <ConfidenceDisplay confidence={confidence} showFactors />
        {onClose && (
          <button className="wic-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(Header);
