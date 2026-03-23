/**
 * SugyaSummaryResult - Quick overview of a Talmudic sugya
 * Compact summary with key information
 */
import React, { memo } from 'react';

export const SugyaSummaryResult = memo(({ data }) => {
  const { title, oneLineSummary, background, structure, keyQuestion, mainPositions, resolution, bottomLine, keyTerms } = data;

  return (
    <div className="sugya-summary-result">
      {/* Header */}
      <div className="summary-header">
        <span className="summary-badge">📋 Sugya Summary</span>
        {title && <h3 className="summary-title">{title}</h3>}
      </div>

      {/* One Line */}
      {oneLineSummary && (
        <div className="one-line-box">
          <p>{oneLineSummary}</p>
        </div>
      )}

      {/* Background */}
      {background && (
        <div className="summary-section background-section">
          <h4>📚 Background</h4>
          <p>{background}</p>
        </div>
      )}

      {/* Structure */}
      {structure && (
        <div className="summary-section structure-section">
          <h4>🏗️ Structure</h4>
          {structure.mishna && (
            <div className="structure-item">
              <strong>Mishna:</strong> {structure.mishna}
            </div>
          )}
          {structure.gemara && (
            <div className="structure-item">
              <strong>Gemara:</strong> {structure.gemara}
            </div>
          )}
        </div>
      )}

      {/* Key Question */}
      {keyQuestion && (
        <div className="summary-section question-section">
          <h4>❓ Key Question</h4>
          <p className="key-question-text">{keyQuestion}</p>
        </div>
      )}

      {/* Main Positions */}
      {mainPositions && mainPositions.length > 0 && (
        <div className="summary-section positions-section">
          <h4>⚖️ Main Positions</h4>
          <div className="positions-list">
            {mainPositions.map((pos, i) => (
              <div key={i} className="position-card">
                <div className="position-header">
                  <span className="position-holder">{pos.holder}</span>
                </div>
                <p className="position-view">{pos.position}</p>
                {pos.reasoning && (
                  <p className="position-reasoning">
                    <em>Reasoning:</em> {pos.reasoning}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution */}
      {resolution && (
        <div className="summary-section resolution-section">
          <h4>✓ Resolution</h4>
          <p>{resolution}</p>
        </div>
      )}

      {/* Bottom Line */}
      {bottomLine && (
        <div className="bottom-line-box">
          <span className="bottom-line-icon">🎯</span>
          <p>{bottomLine}</p>
        </div>
      )}

      {/* Key Terms */}
      {keyTerms && keyTerms.length > 0 && (
        <div className="summary-section terms-section">
          <h4>🔤 Key Terms</h4>
          <div className="key-terms-grid">
            {keyTerms.map((term, i) => (
              <div key={i} className="key-term-item">
                <span className="term-word" dir="rtl">{term.term}</span>
                <span className="term-meaning">{term.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SugyaSummaryResult.displayName = 'SugyaSummaryResult';

export default SugyaSummaryResult;
