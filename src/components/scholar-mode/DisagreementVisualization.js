/**
 * DisagreementVisualization - Visual display of commentator disputes
 *
 * Renders the machloket (dispute) analysis from AI in a visual format:
 * - Who agrees with whom
 * - Root causes of disagreement
 * - Visual grouping by position
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './DisagreementVisualization.css';

// Color palette for different positions
const POSITION_COLORS = [
  { bg: '#3b82f620', border: '#3b82f6', text: '#60a5fa' },  // Blue
  { bg: '#8b5cf620', border: '#8b5cf6', text: '#a78bfa' },  // Purple
  { bg: '#10b98120', border: '#10b981', text: '#34d399' },  // Green
  { bg: '#f59e0b20', border: '#f59e0b', text: '#fbbf24' },  // Amber
  { bg: '#ef444420', border: '#ef4444', text: '#f87171' },  // Red
];

// Commentator icons
const COMMENTATOR_ICONS = {
  'Rashi': '📖',
  'רש״י': '📖',
  'Ramban': '🏔️',
  'רמב״ן': '🏔️',
  'Ibn Ezra': '🔬',
  'אבן עזרא': '🔬',
  'Rashbam': '📝',
  'רשב״ם': '📝',
  'Sforno': '💡',
  'ספורנו': '💡',
  'Rambam': '⚖️',
  'רמב״ם': '⚖️',
  'Tosafot': '📚',
  'תוספות': '📚',
  'default': '👤'
};

const getCommentatorIcon = (name) => {
  for (const [key, icon] of Object.entries(COMMENTATOR_ICONS)) {
    if (name?.includes(key)) return icon;
  }
  return COMMENTATOR_ICONS.default;
};

// Position Card Component
const PositionCard = ({ position, colorScheme, index }) => {
  const icon = getCommentatorIcon(position.commentator || position.sage);

  return (
    <div
      className="position-card"
      style={{
        '--card-bg': colorScheme.bg,
        '--card-border': colorScheme.border,
        '--card-text': colorScheme.text
      }}
    >
      <div className="position-header">
        <span className="commentator-icon">{icon}</span>
        <div className="commentator-info">
          <span className="commentator-name">
            {position.commentator || position.sage}
          </span>
          {position.hebrewName && (
            <span className="commentator-hebrew">{position.hebrewName}</span>
          )}
        </div>
        <span className="position-number">#{index + 1}</span>
      </div>

      <div className="position-content">
        <p className="position-text">{position.position || position.view}</p>

        {position.methodology && (
          <div className="position-methodology">
            <span className="methodology-label">Approach:</span>
            <span className="methodology-text">{position.methodology}</span>
          </div>
        )}

        {position.textualBasis && (
          <div className="position-basis">
            <span className="basis-label">Based on:</span>
            <span className="basis-text">{position.textualBasis}</span>
          </div>
        )}

        {position.reasoning && (
          <div className="position-reasoning">
            <span className="reasoning-label">Reasoning:</span>
            <span className="reasoning-text">{position.reasoning}</span>
          </div>
        )}

        {position.critiqueOfRashi && (
          <div className="position-critique">
            <span className="critique-label">Disagrees with Rashi:</span>
            <span className="critique-text">{position.critiqueOfRashi}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Root Cause Display
const RootCauseSection = ({ rootCause, nafkaMina }) => {
  if (!rootCause && !nafkaMina) return null;

  return (
    <div className="root-cause-section">
      {rootCause && (
        <div className="root-cause-box">
          <div className="root-cause-header">
            <span className="root-icon">🔍</span>
            <span className="root-title">Root of Disagreement</span>
          </div>
          <p className="root-cause-text">{rootCause}</p>
        </div>
      )}

      {nafkaMina && (
        <div className="nafka-mina-box">
          <div className="nafka-mina-header">
            <span className="nafka-icon">⚡</span>
            <span className="nafka-title">נפקא מינה (Practical Difference)</span>
          </div>
          <p className="nafka-mina-text">{nafkaMina}</p>
        </div>
      )}
    </div>
  );
};

// Main Component
const DisagreementVisualization = ({ machloketData, compact = false }) => {
  // Parse the machloket data
  const parsedData = useMemo(() => {
    if (!machloketData) return null;

    // Handle both direct object and nested mainMachloket structure
    const main = machloketData.mainMachloket || machloketData;

    return {
      topic: main.topic || machloketData.summary,
      positions: main.positions || [],
      rootCause: main.rootCause,
      nafkaMina: main.nafkaMina,
      bothCanBeTrue: main.bothCanBeTrue,
      consensus: machloketData.consensus || [],
      lessonFromDispute: machloketData.lessonFromDispute,
      additionalDisputes: machloketData.additionalDisputes || []
    };
  }, [machloketData]);

  if (!parsedData || parsedData.positions.length === 0) {
    return (
      <div className="disagreement-empty">
        <span className="empty-icon">⚔️</span>
        <p>No disagreement data available</p>
      </div>
    );
  }

  return (
    <div className={`disagreement-visualization ${compact ? 'compact' : ''}`}>
      {/* Topic Header */}
      <div className="disagreement-header">
        <span className="header-icon">⚔️</span>
        <h3 className="header-title">מחלוקת - Commentator Dispute</h3>
      </div>

      {parsedData.topic && (
        <div className="topic-banner">
          <span className="topic-label">Topic:</span>
          <span className="topic-text">{parsedData.topic}</span>
        </div>
      )}

      {/* Positions Grid */}
      <div className="positions-grid">
        {parsedData.positions.map((position, idx) => (
          <PositionCard
            key={idx}
            position={position}
            colorScheme={POSITION_COLORS[idx % POSITION_COLORS.length]}
            index={idx}
          />
        ))}
      </div>

      {/* Root Cause & Nafka Mina */}
      <RootCauseSection
        rootCause={parsedData.rootCause}
        nafkaMina={parsedData.nafkaMina}
      />

      {/* Both Can Be True */}
      {parsedData.bothCanBeTrue && (
        <div className="both-true-section">
          <span className="both-icon">🤝</span>
          <p className="both-text">{parsedData.bothCanBeTrue}</p>
        </div>
      )}

      {/* Consensus Points */}
      {parsedData.consensus?.length > 0 && (
        <div className="consensus-section">
          <div className="consensus-header">
            <span className="consensus-icon">✓</span>
            <span className="consensus-title">Points of Agreement</span>
          </div>
          <ul className="consensus-list">
            {parsedData.consensus.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Lesson from Dispute */}
      {parsedData.lessonFromDispute && (
        <div className="lesson-section">
          <div className="lesson-header">
            <span className="lesson-icon">💡</span>
            <span className="lesson-title">Lesson from this Dispute</span>
          </div>
          <p className="lesson-text">{parsedData.lessonFromDispute}</p>
        </div>
      )}

      {/* Additional Disputes (collapsible) */}
      {parsedData.additionalDisputes?.length > 0 && !compact && (
        <details className="additional-disputes">
          <summary>
            <span className="additional-icon">📋</span>
            Additional Disputes ({parsedData.additionalDisputes.length})
          </summary>
          <div className="additional-content">
            {parsedData.additionalDisputes.map((dispute, idx) => (
              <div key={idx} className="additional-dispute-item">
                <strong>{dispute.topic}</strong>
                <div className="mini-positions">
                  {dispute.positions?.map((pos, pIdx) => (
                    <span key={pIdx} className="mini-position">
                      {pos.sage || pos.commentator}: {pos.view || pos.position}
                    </span>
                  ))}
                </div>
                {dispute.rootCause && (
                  <p className="mini-root-cause">Root: {dispute.rootCause}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

DisagreementVisualization.propTypes = {
  machloketData: PropTypes.object,
  compact: PropTypes.bool
};

export default DisagreementVisualization;
