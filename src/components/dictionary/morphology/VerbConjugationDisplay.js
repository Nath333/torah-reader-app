/**
 * VerbConjugationDisplay - Compact verb analysis showing binyan and key info
 * Extracted from ClickableText.js for reusability
 *
 * Features:
 * - Binyan display (Hebrew/Aramaic)
 * - Tense detection
 * - Root with meaning
 * - Prefix analysis
 */

import React from 'react';
import PropTypes from 'prop-types';
import { GRAMMAR_CONSTANTS } from '../../../services/analysis/grammarAnalysisService';

/**
 * VerbConjugationDisplay - Compact verb analysis showing binyan and key info
 * Streamlined design - removes redundant binyanim grid
 */
const VerbConjugationDisplay = React.memo(function VerbConjugationDisplay({ verbAnalysis }) {
  if (!verbAnalysis || !verbAnalysis.binyan) return null;

  const { binyanKey, tenseKey, root, rootInfo, prefixes, isAramaic } = verbAnalysis;
  const { BINYANIM, ARAMAIC_BINYANIM, TENSES } = GRAMMAR_CONSTANTS;

  const binyanData = isAramaic ? ARAMAIC_BINYANIM[binyanKey] : BINYANIM[binyanKey];
  const tenseData = tenseKey ? TENSES[tenseKey] : null;

  if (!binyanData) return null;

  return (
    <div className="verb-display-compact">
      {/* Single-line binyan display */}
      <div className="verb-binyan-row">
        <span className="binyan-badge" dir="rtl">{binyanData.hebrew}</span>
        <span className="binyan-latin">{binyanData.name}</span>
        {isAramaic && <span className="lang-tag aramaic">ארמית</span>}
      </div>

      {/* Meaning on its own line */}
      <div className="binyan-meaning-text">{binyanData.meaning}</div>

      {/* Optional: tense if detected */}
      {tenseData && (
        <div className="verb-tense-row">
          <span className="tense-tag" dir="rtl">{tenseData.hebrew}</span>
          <span className="tense-desc">{tenseData.meaning}</span>
        </div>
      )}

      {/* Root with meaning inline */}
      {root && (
        <div className="verb-root-row">
          <span className="root-tag">שורש</span>
          <span className="root-val" dir="rtl">{root}</span>
          {rootInfo?.meaning && <span className="root-gloss">({rootInfo.meaning})</span>}
        </div>
      )}

      {/* Prefixes compact */}
      {prefixes && prefixes.length > 0 && (
        <div className="verb-prefix-row">
          {prefixes.map((p, i) => (
            <span key={i} className="prefix-chip">
              <span dir="rtl">{p.letter}</span> = {p.meaning}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

VerbConjugationDisplay.propTypes = {
  verbAnalysis: PropTypes.shape({
    binyan: PropTypes.string,
    binyanKey: PropTypes.string,
    tenseKey: PropTypes.string,
    root: PropTypes.string,
    rootInfo: PropTypes.shape({
      meaning: PropTypes.string
    }),
    prefixes: PropTypes.arrayOf(PropTypes.shape({
      letter: PropTypes.string,
      meaning: PropTypes.string
    })),
    isAramaic: PropTypes.bool,
    binyanConfidence: PropTypes.string
  })
};

VerbConjugationDisplay.defaultProps = {
  verbAnalysis: null
};

export default VerbConjugationDisplay;
