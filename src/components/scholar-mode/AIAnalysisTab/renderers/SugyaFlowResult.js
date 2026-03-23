/**
 * SugyaFlowResult - Talmudic discourse flow visualization
 * Handles both legacy format and new groqService schema
 */
import React, { memo } from 'react';
import { KeyPointsList } from './SharedComponents';

const stepTypeColors = {
  mishna: '#10b981',
  question: '#f59e0b',
  statement: '#3b82f6',
  objection: '#ef4444',
  proof: '#8b5cf6',
  resolution: '#06b6d4',
  conclusion: '#ec4899',
  source: '#10b981',
  answer: '#3b82f6'
};

export const SugyaFlowResult = memo(({ data }) => {
  const {
    sugyaOverview,
    structuralAnalysis,
    discourseFlow,
    halachicImplications,
    // New schema fields from groqService
    summary,
    exchanges,
    methodology,
    resolution,
    practicalHalacha,
    keyPoints,
    novelInsight
  } = data;

  // Handle sugyaOverview as string or object
  const overviewText = typeof sugyaOverview === 'string' ? sugyaOverview : sugyaOverview?.mainTopic;
  const overviewType = typeof sugyaOverview === 'object' ? sugyaOverview?.type : null;

  return (
    <div className="sugya-flow-result">
      {/* Summary (new schema) */}
      {summary && (
        <div className="sugya-summary">
          <p className="result-text">{summary}</p>
        </div>
      )}

      {/* Overview */}
      {(sugyaOverview || overviewText) && (
        <div className="sugya-overview">
          <div className="sugya-overview-header">
            <span className="sugya-badge">🌊 Sugya Flow</span>
            {overviewType && <span className="sugya-type">{overviewType}</span>}
          </div>
          {overviewText && <h3 className="sugya-topic">{overviewText}</h3>}
        </div>
      )}

      {/* Structural Analysis (legacy) */}
      {structuralAnalysis && (
        <div className="structural-analysis">
          {structuralAnalysis.hasMishna && structuralAnalysis.mishnaContent && (
            <div className="mishna-box">
              <span className="mishna-label">📜 מתני׳ (Mishna)</span>
              <p>{structuralAnalysis.mishnaContent}</p>
            </div>
          )}
          <div className="structure-meta">
            <span>Total Steps: {structuralAnalysis.totalSteps || discourseFlow?.length || '?'}</span>
          </div>
        </div>
      )}

      {/* Discourse Flow - handles both content and summary fields */}
      {discourseFlow && discourseFlow.length > 0 && (
        <div className="discourse-flow">
          <h4>📊 Discourse Flow</h4>
          <div className="flow-timeline">
            {discourseFlow.map((step, i) => (
              <div
                key={i}
                className={`flow-step ${step.type?.toLowerCase().replace(/[^a-z]/g, '') || 'statement'}`}
                style={{ '--step-color': stepTypeColors[step.type?.toLowerCase().split('/')[0]] || '#6b7280' }}
              >
                <div className="step-marker">
                  <span className="step-num">{step.step || i + 1}</span>
                  <span className="step-type">{step.type}</span>
                </div>
                <div className="step-content">
                  {step.marker && (
                    <span className="discourse-marker" dir="rtl">{step.marker}</span>
                  )}
                  {step.speaker && (
                    <span className="step-speaker">{step.speaker}</span>
                  )}
                  {/* Handle both content (new) and summary (legacy) */}
                  <p className="step-summary">{step.content || step.summary}</p>
                  {step.hebrewKey && (
                    <span className="step-hebrew" dir="rtl">{step.hebrewKey}</span>
                  )}
                </div>
                {i < discourseFlow.length - 1 && <div className="flow-connector" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchanges (new schema) */}
      {exchanges && exchanges.length > 0 && (
        <div className="talmud-exchanges">
          <h4>💬 Dialectic Exchanges</h4>
          {exchanges.map((ex, i) => (
            <div key={i} className="exchange-item">
              {ex.question && (
                <div className="exchange-question">
                  <span className="ex-label">❓ Question:</span>
                  <p>{ex.question}</p>
                </div>
              )}
              {ex.answer && (
                <div className="exchange-answer">
                  <span className="ex-label">💡 Answer:</span>
                  <p>{ex.answer}</p>
                </div>
              )}
              {ex.refutation && (
                <div className="exchange-refutation">
                  <span className="ex-label">⚡ Refutation:</span>
                  <p>{ex.refutation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Methodology (new schema) */}
      {methodology && (
        <div className="sugya-methodology">
          <h4>🔧 Methodology</h4>
          <p>{methodology}</p>
        </div>
      )}

      {/* Resolution (new schema) */}
      {resolution && (
        <div className="sugya-resolution">
          <h4>✓ Resolution</h4>
          <p>{resolution}</p>
        </div>
      )}

      {/* Practical Halacha (new schema) */}
      {practicalHalacha && (
        <div className="sugya-halacha">
          <h4>⚖️ Practical Halacha</h4>
          <p>{practicalHalacha}</p>
        </div>
      )}

      {/* Halachic Implications (legacy) */}
      {halachicImplications && (
        <div className="sugya-halacha">
          <h4>⚖️ Halachic Implications</h4>
          {halachicImplications.mainRuling && (
            <div className="main-ruling">
              <strong>Main Ruling:</strong> {halachicImplications.mainRuling}
            </div>
          )}
          {halachicImplications.practicalApplication && (
            <p className="practical-app">{halachicImplications.practicalApplication}</p>
          )}
        </div>
      )}

      {/* Key Points (new schema) */}
      {keyPoints && keyPoints.length > 0 && (
        <div className="sugya-keypoints">
          <h4>📝 Key Points</h4>
          <KeyPointsList points={keyPoints} />
        </div>
      )}

      {/* Novel Insight (new schema) */}
      {novelInsight && (
        <div className="sugya-insight">
          <h4>💡 Novel Insight</h4>
          <p>{novelInsight}</p>
        </div>
      )}
    </div>
  );
});

SugyaFlowResult.displayName = 'SugyaFlowResult';

export default SugyaFlowResult;
