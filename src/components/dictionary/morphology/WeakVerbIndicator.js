// =============================================================================
// WEAK VERB INDICATOR - PRO SCHOLAR V6
// Visual explanations of Hebrew/Aramaic weak verb patterns
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './WeakVerbIndicator.css';

// =============================================================================
// SINGLE SOURCE OF TRUTH IMPORT
// =============================================================================

// Import from centralized constants (morphologyPatterns.js)
import { WEAK_VERB_RULES } from '../../../constants/morphologyPatterns';

/**
 * Transform WEAK_VERB_RULES into the component's expected format
 * Maps the unified definition to the pattern structure used by this component
 */
const WEAK_VERB_PATTERNS = Object.fromEntries(
  Object.entries(WEAK_VERB_RULES).map(([key, rule]) => [
    key,
    {
      code: rule.code,
      name: rule.name,
      hebrewName: rule.hebrewName,
      description: rule.description,
      example: rule.exampleForms,
      color: rule.color,
      icon: rule.icon,
      explanation: rule.explanation,
      commonVerbs: rule.commonVerbs
    }
  ])
);

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Pattern Badge - Compact indicator for weak verb type
 */
const PatternBadge = ({ patternKey, onClick, showTooltip = true }) => {
  const pattern = WEAK_VERB_PATTERNS[patternKey];
  if (!pattern) return null;

  return (
    <button
      className="weak-verb-badge"
      style={{ '--pattern-color': pattern.color }}
      onClick={() => onClick?.(patternKey)}
      title={showTooltip ? `${pattern.name}: ${pattern.description}` : undefined}
    >
      <span className="badge-icon">{pattern.icon}</span>
      <span className="badge-code">{pattern.code}</span>
    </button>
  );
};

/**
 * Pattern Detail Card - Full explanation of a weak verb pattern
 */
const PatternDetailCard = ({ patternKey, isExpanded, onToggle }) => {
  const pattern = WEAK_VERB_PATTERNS[patternKey];
  if (!pattern) return null;

  return (
    <div
      className={`pattern-detail-card ${isExpanded ? 'expanded' : ''}`}
      style={{ '--pattern-color': pattern.color }}
    >
      <button className="card-header" onClick={() => onToggle?.(patternKey)}>
        <div className="header-left">
          <span className="pattern-icon">{pattern.icon}</span>
          <div className="pattern-titles">
            <span className="pattern-name">{pattern.name}</span>
            <span className="pattern-hebrew">{pattern.hebrewName}</span>
          </div>
        </div>
        <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="card-content">
          <p className="pattern-description">{pattern.description}</p>

          <div className="pattern-explanation">
            <span className="explanation-label">What happens:</span>
            <span className="explanation-text">{pattern.explanation}</span>
          </div>

          <div className="pattern-example">
            <div className="example-header">
              <span className="example-root">{pattern.example.root}</span>
              <span className="example-meaning">"{pattern.example.meaning}"</span>
            </div>
            <div className="example-forms">
              {pattern.example.forms.map((form, i) => (
                <span key={i} className="example-form">{form}</span>
              ))}
            </div>
          </div>

          <div className="common-verbs">
            <span className="common-label">Common examples:</span>
            <div className="common-list">
              {pattern.commonVerbs.map((verb, i) => (
                <span key={i} className="common-verb">{verb}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Transformation Diagram - Shows how the verb changes
 */
const TransformationDiagram = ({ originalRoot, transformedForm, patternKey }) => {
  const pattern = WEAK_VERB_PATTERNS[patternKey];
  if (!pattern) return null;

  return (
    <div
      className="transformation-diagram"
      style={{ '--pattern-color': pattern.color }}
    >
      <div className="transform-step original">
        <span className="step-label">Root</span>
        <span className="step-form">{originalRoot}</span>
      </div>
      <div className="transform-arrow">
        <span className="arrow-icon">→</span>
        <span className="arrow-label">{pattern.code}</span>
      </div>
      <div className="transform-step result">
        <span className="step-label">Form</span>
        <span className="step-form">{transformedForm}</span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * WeakVerbIndicator - Shows weak verb analysis with visual explanations
 */
const WeakVerbIndicator = ({
  patterns = [],
  root = '',
  word = '',
  showDiagram = true,
  expandedByDefault = false,
  compact = false,
  onPatternClick,
  className = ''
}) => {
  const [expandedPattern, setExpandedPattern] = useState(
    expandedByDefault && patterns.length === 1 ? patterns[0] : null
  );

  const handleToggle = useCallback((patternKey) => {
    setExpandedPattern(prev => prev === patternKey ? null : patternKey);
    onPatternClick?.(patternKey);
  }, [onPatternClick]);

  // Validate patterns
  const validPatterns = useMemo(() => {
    return patterns.filter(p => WEAK_VERB_PATTERNS[p]);
  }, [patterns]);

  if (validPatterns.length === 0) {
    return null;
  }

  // Compact mode - just badges
  if (compact) {
    return (
      <div className={`weak-verb-indicator compact ${className}`}>
        <span className="indicator-label">Weak:</span>
        <div className="pattern-badges">
          {validPatterns.map(patternKey => (
            <PatternBadge
              key={patternKey}
              patternKey={patternKey}
              onClick={handleToggle}
            />
          ))}
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div className={`weak-verb-indicator ${className}`}>
      <div className="indicator-header">
        <span className="header-icon">🔀</span>
        <span className="header-title">Weak Verb Analysis</span>
        <span className="pattern-count">{validPatterns.length} pattern{validPatterns.length > 1 ? 's' : ''}</span>
      </div>

      {showDiagram && root && word && validPatterns.length === 1 && (
        <TransformationDiagram
          originalRoot={root}
          transformedForm={word}
          patternKey={validPatterns[0]}
        />
      )}

      <div className="pattern-cards">
        {validPatterns.map(patternKey => (
          <PatternDetailCard
            key={patternKey}
            patternKey={patternKey}
            isExpanded={expandedPattern === patternKey}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};

WeakVerbIndicator.propTypes = {
  patterns: PropTypes.arrayOf(PropTypes.string),
  root: PropTypes.string,
  word: PropTypes.string,
  showDiagram: PropTypes.bool,
  expandedByDefault: PropTypes.bool,
  compact: PropTypes.bool,
  onPatternClick: PropTypes.func,
  className: PropTypes.string
};

// Export sub-components and constants
export {
  PatternBadge,
  PatternDetailCard,
  TransformationDiagram,
  WEAK_VERB_PATTERNS
};

export default React.memo(WeakVerbIndicator);
