/**
 * ScholarlyWorkflow - PRO SCHOLAR V7
 *
 * Displays step-by-step morphological analysis workflow
 * Shows how a word was analyzed: Surface → Root → Translation
 *
 * Features:
 * - Visual step-by-step breakdown
 * - Source reliability indicators
 * - Match type explanations
 * - Confidence scoring visualization
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MATCH_TYPES, RELIABILITY_TIERS } from '../../constants/dictionarySources';
import './ScholarlyWorkflow.css';

/**
 * Single workflow step component
 */
const WorkflowStep = ({ step, isLast, isExpanded }) => {
  const getStepColor = () => {
    switch (step.type) {
      case 'input': return '#64748b';
      case 'transform': return '#0891b2';
      case 'morphology': return '#8b5cf6';
      case 'root': return '#3b82f6';
      case 'binyan': return '#6366f1';
      case 'lookup': return '#059669';
      case 'result': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div className={`workflow-step ${step.final ? 'final' : ''}`}>
      <div className="step-connector">
        <div
          className="step-icon"
          style={{ backgroundColor: getStepColor() }}
        >
          {step.icon || step.num}
        </div>
        {!isLast && <div className="step-line" />}
      </div>

      <div className="step-content">
        <div className="step-header">
          <span className="step-label">{step.label}</span>
          {step.hebrew && (
            <span className="step-hebrew" dir="rtl">{step.hebrew}</span>
          )}
        </div>

        {step.value && (
          <div className={`step-value ${step.type === 'input' || step.type === 'root' ? 'hebrew' : ''}`}>
            {step.value}
          </div>
        )}

        {step.description && isExpanded && (
          <div className="step-description">{step.description}</div>
        )}

        {step.source && isExpanded && (
          <div className="step-source">
            <span className="source-icon">{step.reliability?.badgeIcon || '📖'}</span>
            <span className="source-name">{step.source.name || step.source.fullName}</span>
            {step.source.year && <span className="source-year">({step.source.year})</span>}
          </div>
        )}
      </div>
    </div>
  );
};

WorkflowStep.propTypes = {
  step: PropTypes.shape({
    num: PropTypes.number,
    label: PropTypes.string.isRequired,
    hebrew: PropTypes.string,
    value: PropTypes.string,
    description: PropTypes.string,
    type: PropTypes.string,
    icon: PropTypes.string,
    final: PropTypes.bool,
    source: PropTypes.object,
    reliability: PropTypes.object
  }).isRequired,
  isLast: PropTypes.bool,
  isExpanded: PropTypes.bool
};

/**
 * Confidence visualization component
 */
const ConfidenceMeter = ({ score, level, explanation }) => {
  const getConfidenceColor = () => {
    if (score >= 90) return '#059669';
    if (score >= 80) return '#0891b2';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="confidence-meter">
      <div className="confidence-header">
        <span className="confidence-label">Confidence</span>
        <span className="confidence-score" style={{ color: getConfidenceColor() }}>
          {score}%
        </span>
      </div>
      <div className="confidence-bar">
        <div
          className="confidence-fill"
          style={{
            width: `${score}%`,
            backgroundColor: getConfidenceColor()
          }}
        />
      </div>
      {explanation && (
        <div className="confidence-explanation">{explanation}</div>
      )}
    </div>
  );
};

ConfidenceMeter.propTypes = {
  score: PropTypes.number.isRequired,
  level: PropTypes.string,
  explanation: PropTypes.string
};

/**
 * Source attribution component
 */
const SourceAttribution = ({ attribution }) => {
  if (!attribution) return null;

  return (
    <div className="source-attribution">
      <div className="attribution-header">
        <span className="attribution-icon">📚</span>
        <span className="attribution-label">Source Attribution</span>
      </div>
      <div className="attribution-content">
        <div className="attribution-name">{attribution.source}</div>
        {attribution.year && (
          <div className="attribution-year">Published: {attribution.year}</div>
        )}
        {attribution.author && (
          <div className="attribution-author">Author: {attribution.author}</div>
        )}
        {attribution.specialization && (
          <div className="attribution-spec">{attribution.specialization}</div>
        )}
        {attribution.isLocal && (
          <div className="attribution-local">
            <span className="local-badge">Local Vocabulary</span>
          </div>
        )}
      </div>
    </div>
  );
};

SourceAttribution.propTypes = {
  attribution: PropTypes.shape({
    source: PropTypes.string,
    year: PropTypes.number,
    author: PropTypes.string,
    specialization: PropTypes.string,
    isLocal: PropTypes.bool
  })
};

/**
 * Match type badge component
 */
const MatchTypeBadge = ({ matchType, matchInfo }) => {
  const info = matchInfo || MATCH_TYPES[matchType] || MATCH_TYPES.EXACT;

  return (
    <div
      className="match-type-badge"
      style={{ backgroundColor: info.color || '#64748b' }}
      title={info.description || info.scholarly}
    >
      <span className="match-icon">{info.icon}</span>
      <span className="match-label">{info.displayLabel || info.label}</span>
    </div>
  );
};

MatchTypeBadge.propTypes = {
  matchType: PropTypes.string,
  matchInfo: PropTypes.object
};

/**
 * Main ScholarlyWorkflow component
 */
const ScholarlyWorkflow = ({
  workflow,
  word,
  expanded = false,
  showAttribution = true,
  showConfidence = true,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  if (!workflow) {
    return null;
  }

  const { steps, summary, attribution } = workflow;

  return (
    <div className={`scholarly-workflow ${compact ? 'compact' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div
        className="workflow-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
      >
        <div className="workflow-title">
          <span className="workflow-icon">🔬</span>
          <span className="workflow-label">Morphological Analysis</span>
        </div>

        {summary && (
          <div className="workflow-summary">
            {summary.matchType && (
              <MatchTypeBadge matchType={summary.matchType} />
            )}
            {summary.isAcademic && (
              <span className="academic-badge" title="Academic lexicon source">📚</span>
            )}
            {summary.isLocal && (
              <span className="local-indicator" title="Local vocabulary">[local]</span>
            )}
          </div>
        )}

        <button
          className="workflow-toggle"
          aria-label={isExpanded ? 'Collapse workflow' : 'Expand workflow'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Workflow Steps */}
      {isExpanded && steps && steps.length > 0 && (
        <div className="workflow-steps">
          {steps.map((step, index) => (
            <WorkflowStep
              key={`step-${index}`}
              step={step}
              isLast={index === steps.length - 1}
              isExpanded={isExpanded}
            />
          ))}
        </div>
      )}

      {/* Confidence Meter */}
      {isExpanded && showConfidence && summary?.confidence && (
        <ConfidenceMeter
          score={summary.confidence}
          level={summary.confidenceLevel}
          explanation={workflow.confidenceExplanation}
        />
      )}

      {/* Source Attribution */}
      {isExpanded && showAttribution && attribution && (
        <SourceAttribution attribution={attribution} />
      )}

      {/* Footer with reliability info */}
      {isExpanded && summary && (
        <div className="workflow-footer">
          <div className="reliability-info">
            <span className="reliability-tier">
              {RELIABILITY_TIERS[summary.reliability?.toLowerCase()]?.icon || '📑'}
              {' '}
              {summary.reliability}
            </span>
            {summary.matchDescription && (
              <span className="match-description">{summary.matchDescription}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

ScholarlyWorkflow.propTypes = {
  /** Workflow data from generateScholarlyExplanation */
  workflow: PropTypes.shape({
    word: PropTypes.string,
    steps: PropTypes.arrayOf(PropTypes.object),
    summary: PropTypes.object,
    attribution: PropTypes.object,
    confidenceExplanation: PropTypes.string
  }),
  /** Original word being analyzed */
  word: PropTypes.string,
  /** Start expanded */
  expanded: PropTypes.bool,
  /** Show source attribution */
  showAttribution: PropTypes.bool,
  /** Show confidence meter */
  showConfidence: PropTypes.bool,
  /** Compact mode */
  compact: PropTypes.bool
};

export default ScholarlyWorkflow;
