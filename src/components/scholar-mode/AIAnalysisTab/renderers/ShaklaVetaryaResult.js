/**
 * ShaklaVetaryaResult - Talmudic dialectic analysis visualization
 * Shows question-answer exchanges in the Gemara's back-and-forth style
 */
import React, { memo } from 'react';

const moveTypeIcons = {
  kushya: '❓',
  tiruts: '💡',
  pirka: '⚡',
  raaya: '📜',
  svara: '🧠',
  hava_amina: '💭',
  maskana: '✓'
};

export const ShaklaVetaryaResult = memo(({ data }) => {
  const { dialecticOverview, exchanges, methodology, conclusion } = data;

  return (
    <div className="shakla-vetarya-result">
      {/* Overview */}
      {dialecticOverview && (
        <div className="dialectic-overview">
          <div className="dialectic-header">
            <span className="dialectic-badge">⚔️ שקלא וטריא</span>
            <span className="exchange-count">{dialecticOverview.numberOfExchanges} exchanges</span>
          </div>
          <h3 className="main-question">{dialecticOverview.mainQuestion}</h3>
          {dialecticOverview.finalOutcome && (
            <p className="final-outcome">
              <strong>Resolution:</strong> {dialecticOverview.finalOutcome}
            </p>
          )}
        </div>
      )}

      {/* Exchanges */}
      {exchanges && exchanges.length > 0 && (
        <div className="dialectic-exchanges">
          <h4>💬 The Exchange</h4>
          {exchanges.map((exchange, i) => (
            <div key={i} className="exchange-pair">
              {/* Challenge */}
              {exchange.challenge && (
                <div className="challenge-box">
                  <div className="move-header">
                    <span className="move-icon">{moveTypeIcons[exchange.challenge.type?.toLowerCase()] || '❓'}</span>
                    <span className="move-type">קושיא ({exchange.challenge.type})</span>
                    {exchange.challenge.source && (
                      <span className="move-source">{exchange.challenge.source}</span>
                    )}
                  </div>
                  <p className="move-content">{exchange.challenge.content}</p>
                  {exchange.challenge.hebrewQuote && (
                    <blockquote className="hebrew-quote" dir="rtl">{exchange.challenge.hebrewQuote}</blockquote>
                  )}
                </div>
              )}

              {/* Response */}
              {exchange.response && (
                <div className="response-box">
                  <div className="move-header">
                    <span className="move-icon">{moveTypeIcons[exchange.response.type?.toLowerCase()] || '💡'}</span>
                    <span className="move-type">תירוץ ({exchange.response.type})</span>
                    {exchange.response.source && (
                      <span className="move-source">{exchange.response.source}</span>
                    )}
                  </div>
                  <p className="move-content">{exchange.response.content}</p>
                  {exchange.response.hebrewQuote && (
                    <blockquote className="hebrew-quote" dir="rtl">{exchange.response.hebrewQuote}</blockquote>
                  )}
                </div>
              )}

              {/* Outcome */}
              {exchange.outcome && (
                <div className="exchange-outcome">
                  <span className="outcome-label">Outcome:</span> {exchange.outcome}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Methodology */}
      {methodology && methodology.length > 0 && (
        <div className="talmudic-methods">
          <h4>🔧 Talmudic Methods Used</h4>
          <div className="methods-list">
            {methodology.map((method, i) => (
              <span key={i} className="method-tag">{method}</span>
            ))}
          </div>
        </div>
      )}

      {/* Conclusion */}
      {conclusion && (
        <div className="dialectic-conclusion">
          <h4>📋 Conclusion</h4>
          <p>{conclusion}</p>
        </div>
      )}
    </div>
  );
});

ShaklaVetaryaResult.displayName = 'ShaklaVetaryaResult';

export default ShaklaVetaryaResult;
