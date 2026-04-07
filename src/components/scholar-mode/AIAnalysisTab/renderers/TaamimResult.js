/**
 * TaamimResult - Cantillation marks (Taamei HaMikra) analysis
 * Shows verse structure, marks analysis, and interpretive insights
 */
import React, { memo } from 'react';

const typeColors = {
  'Disjunctive': '#ef4444',
  'Conjunctive': '#10b981'
};

export const TaamimResult = memo(({ data }) => {
  const { summary, verseStructure, cantillationAnalysis, interpretiveInsights, rareMarks, deeperMeaning } = data || {};

  return (
    <div className="taamim-result">
      <div className="taamim-header">
        <span className="taamim-icon">🎵</span>
        <h3>טעמי המקרא - Cantillation Analysis</h3>
      </div>

      {summary && (
        <div className="taamim-summary">
          <p>{summary}</p>
        </div>
      )}

      {verseStructure && (
        <div className="verse-structure">
          <h4>📖 Verse Structure</h4>
          {verseStructure.primaryDivision && (
            <div className="structure-item primary">
              <span className="label">Primary Division (Atnach):</span>
              <span className="value">{verseStructure.primaryDivision}</span>
            </div>
          )}
          {verseStructure.firstHalf && (
            <div className="structure-item">
              <span className="label">First Half:</span>
              <span className="value">{verseStructure.firstHalf}</span>
            </div>
          )}
          {verseStructure.secondHalf && (
            <div className="structure-item">
              <span className="label">Second Half:</span>
              <span className="value">{verseStructure.secondHalf}</span>
            </div>
          )}
        </div>
      )}

      {cantillationAnalysis && cantillationAnalysis.length > 0 && (
        <div className="cantillation-marks">
          <h4>🎼 Cantillation Marks</h4>
          <div className="marks-grid">
            {cantillationAnalysis.map((item, idx) => (
              <div key={idx} className="mark-card" style={{ '--type-color': typeColors[item.type] || '#888' }}>
                <div className="mark-header">
                  <span className="mark-word" dir="rtl">{item.word}</span>
                  <span className="mark-type">{item.type}</span>
                </div>
                <div className="mark-name">{item.mark}</div>
                {item.rank && <div className="mark-rank">Rank: {item.rank}</div>}
                {item.significance && <p className="mark-significance">{item.significance}</p>}
                {item.melodicCharacter && (
                  <div className="mark-melody">🎵 {item.melodicCharacter}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {interpretiveInsights && interpretiveInsights.length > 0 && (
        <div className="interpretive-insights">
          <h4>💡 Interpretive Insights</h4>
          {interpretiveInsights.map((insight, idx) => (
            <div key={idx} className="insight-card">
              <p className="observation">{insight.observation}</p>
              {insight.textualBasis && (
                <span className="textual-basis">Based on: {insight.textualBasis}</span>
              )}
              {insight.commentarySupport && (
                <span className="commentary-support">📚 {insight.commentarySupport}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {rareMarks && rareMarks.length > 0 && (
        <div className="rare-marks">
          <h4>✨ Rare Marks</h4>
          {rareMarks.map((mark, idx) => (
            <div key={idx} className="rare-mark-card">
              <span className="rare-mark-name">{mark.mark}</span>
              <p className="rare-mark-meaning">{mark.meaning}</p>
              {mark.emotionalSignificance && (
                <p className="emotional-sig">💭 {mark.emotionalSignificance}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {deeperMeaning && (
        <div className="deeper-meaning">
          <h4>🔮 Deeper Meaning</h4>
          <p>{deeperMeaning}</p>
        </div>
      )}
    </div>
  );
});

TaamimResult.displayName = 'TaamimResult';

export default TaamimResult;
