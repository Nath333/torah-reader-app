/**
 * V6AnalysisBadge - Compact PRO SCHOLAR V6 Analysis Indicator
 *
 * A compact badge showing V6 analysis results:
 * - Confidence level (high/medium/low)
 * - Root extraction status
 * - Binyan detection
 * - Weak verb type
 *
 * Can be used inline anywhere to indicate V6 analysis availability.
 *
 * @module V6AnalysisBadge
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import './V6AnalysisBadge.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

// PRO SCHOLAR V8: Renamed from unifiedRootService to rootExtraction
let extractRootsEnhanced, analyzeBinyan;
try {
  const rootExtraction = require('../../../services/analysis/rootExtraction');
  extractRootsEnhanced = rootExtraction.extractRootsEnhanced;
  analyzeBinyan = rootExtraction.analyzeBinyan;
} catch (e) {
  extractRootsEnhanced = () => null;
  analyzeBinyan = () => null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIDENCE_LEVELS = {
  high: { label: 'High', color: '#16a34a', bg: '#dcfce7', icon: '✓' },
  medium: { label: 'Medium', color: '#ca8a04', bg: '#fef9c3', icon: '~' },
  low: { label: 'Low', color: '#dc2626', bg: '#fee2e2', icon: '?' }
};

const WEAK_VERB_ICONS = {
  'PE_NUN': '🔸',
  'PE_YOD': '🔹',
  'PE_ALEPH': '🔺',
  'AYIN_VAV': '⭕',
  'AYIN_YOD': '⚪',
  'GEMINATE': '⊛',
  'LAMED_HE': '◈',
  'LAMED_ALEPH': '◇'
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * V6AnalysisBadge - Compact analysis indicator
 *
 * @param {Object} props
 * @param {string} props.word - Word to analyze
 * @param {string} [props.size='medium'] - Badge size (small, medium, large)
 * @param {boolean} [props.showRoot=true] - Show detected root
 * @param {boolean} [props.showBinyan=false] - Show binyan detection
 * @param {boolean} [props.showWeakType=true] - Show weak verb indicator
 * @param {Function} [props.onClick] - Click handler for full analysis
 * @param {string} [props.className=''] - Additional CSS classes
 */
function V6AnalysisBadge({
  word,
  size = 'medium',
  showRoot = true,
  showBinyan = false,
  showWeakType = true,
  onClick,
  className = ''
}) {
  // Analyze word with V6
  const analysis = useMemo(() => {
    if (!word) return null;

    try {
      const rootResult = extractRootsEnhanced?.(word);
      const binyanResult = showBinyan ? analyzeBinyan?.(word) : null;

      if (!rootResult || !rootResult.roots || rootResult.roots.length === 0) {
        return null;
      }

      const topRoot = rootResult.roots[0];
      const confidence = topRoot.confidence || rootResult.confidence || 0;
      const level = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';

      return {
        root: topRoot.root,
        confidence,
        level,
        levelConfig: CONFIDENCE_LEVELS[level],
        weakType: rootResult.weakType || topRoot.weakType,
        hypothesisCount: rootResult.roots.length,
        binyan: binyanResult
      };
    } catch (e) {
      console.debug('[V6AnalysisBadge] Analysis failed:', e.message);
      return null;
    }
  }, [word, showBinyan]);

  // Badge class names
  const badgeClassName = useMemo(
    () => `v6-analysis-badge size-${size} ${analysis ? `level-${analysis.level}` : 'no-analysis'} ${onClick ? 'clickable' : ''} ${className}`.trim(),
    [size, analysis, onClick, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!word) return null;

  // No analysis available
  if (!analysis) {
    return (
      <span className={`${badgeClassName} no-data`} title="V6 analysis not available">
        <span className="badge-label">V6</span>
        <span className="badge-status">-</span>
      </span>
    );
  }

  const { root, confidence, levelConfig, weakType, hypothesisCount, binyan } = analysis;

  return (
    <button
      className={badgeClassName}
      onClick={onClick ? () => onClick(word, analysis) : undefined}
      style={{
        '--badge-color': levelConfig.color,
        '--badge-bg': levelConfig.bg
      }}
      title={`V6 Analysis: ${confidence}% confidence, ${hypothesisCount} hypothesis${hypothesisCount > 1 ? 'es' : ''}`}
    >
      {/* V6 Label */}
      <span className="badge-label">V6</span>

      {/* Confidence indicator */}
      <span className="badge-confidence">
        <span className="confidence-icon">{levelConfig.icon}</span>
        <span className="confidence-value">{confidence}%</span>
      </span>

      {/* Root display */}
      {showRoot && root && (
        <span className="badge-root" dir="rtl" title={`Root: ${root}`}>
          {root}
        </span>
      )}

      {/* Weak verb indicator */}
      {showWeakType && weakType && (
        <span className="badge-weak" title={`Weak verb: ${weakType}`}>
          {WEAK_VERB_ICONS[weakType] || '◎'}
        </span>
      )}

      {/* Binyan indicator */}
      {showBinyan && binyan && (
        <span className="badge-binyan" title={`Binyan: ${binyan.name}`}>
          {binyan.hebrew || binyan.name}
        </span>
      )}

      {/* Multiple hypotheses indicator */}
      {hypothesisCount > 1 && (
        <span className="badge-hypotheses" title={`${hypothesisCount} possible roots`}>
          +{hypothesisCount - 1}
        </span>
      )}
    </button>
  );
}

V6AnalysisBadge.propTypes = {
  word: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showRoot: PropTypes.bool,
  showBinyan: PropTypes.bool,
  showWeakType: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

// Note: Default values are set in function parameters (modern React pattern)

export default memo(V6AnalysisBadge);
