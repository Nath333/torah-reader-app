/**
 * ShoreshResult - Hebrew root analysis visualization
 * Shows root meanings, occurrences, word families, and patterns
 */
import React, { memo } from 'react';

export const ShoreshResult = memo(({ data }) => {
  const { summary, rootAnalysis, thematicInsights, studyNote } = data;

  return (
    <div className="shoresh-result">
      <div className="shoresh-header">
        <span className="shoresh-icon">🌳</span>
        <h3>שורש - Root Analysis</h3>
      </div>

      {summary && (
        <div className="shoresh-summary">
          <p>{summary}</p>
        </div>
      )}

      {rootAnalysis && rootAnalysis.length > 0 && (
        <div className="roots-grid">
          {rootAnalysis.map((root, idx) => (
            <div key={idx} className="root-card">
              <div className="root-header">
                <span className="root-letters" dir="rtl">{root.root}</span>
                <span className="root-transliteration">({root.transliteration})</span>
              </div>
              <div className="root-meaning">{root.coreMeaning}</div>

              {root.wordInVerse && (
                <div className="word-in-verse">
                  <span className="label">In verse:</span>
                  <span className="word" dir="rtl">{root.wordInVerse}</span>
                  {root.binyan && <span className="binyan">{root.binyan}</span>}
                </div>
              )}

              {root.morphology && (
                <div className="morphology">
                  {root.morphology.tense && <span className="morph-tag">{root.morphology.tense}</span>}
                  {root.morphology.person && <span className="morph-tag">{root.morphology.person}</span>}
                  {root.morphology.gender && <span className="morph-tag">{root.morphology.gender}</span>}
                  {root.morphology.number && <span className="morph-tag">{root.morphology.number}</span>}
                </div>
              )}

              {root.occurrences && (
                <div className="occurrences">
                  <div className="occ-header">
                    <span className="occ-total">{root.occurrences.total}× in Tanakh</span>
                  </div>
                  {root.occurrences.firstOccurrence && (
                    <div className="first-occ">
                      First: <span className="ref">{root.occurrences.firstOccurrence}</span>
                    </div>
                  )}
                  {root.occurrences.keyOccurrences && root.occurrences.keyOccurrences.length > 0 && (
                    <div className="key-occs">
                      {root.occurrences.keyOccurrences.slice(0, 3).map((occ, i) => (
                        <div key={i} className="key-occ">
                          <span className="ref">{occ.reference}</span>
                          <span className="context">{occ.context}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {root.usagePatterns && root.usagePatterns.length > 0 && (
                <div className="usage-patterns">
                  <h5>📊 Usage Patterns</h5>
                  {root.usagePatterns.map((pattern, i) => (
                    <div key={i} className="pattern">
                      <span className="pattern-name">{pattern.pattern}</span>
                      <p className="pattern-desc">{pattern.description}</p>
                      {pattern.theologicalImplication && (
                        <p className="pattern-implication">💡 {pattern.theologicalImplication}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {root.wordFamily && root.wordFamily.length > 0 && (
                <div className="word-family">
                  <h5>👨‍👩‍👧‍👦 Word Family</h5>
                  <div className="family-chips">
                    {root.wordFamily.map((w, i) => (
                      <span key={i} className="family-chip" dir="rtl" title={w.meaning}>
                        {w.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {root.cognates && (
                <div className="cognates">
                  <span className="label">Cognates:</span>
                  <span className="cognate-text">{root.cognates}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {thematicInsights && thematicInsights.length > 0 && (
        <div className="thematic-insights">
          <h4>🎯 Thematic Insights</h4>
          {thematicInsights.map((insight, idx) => (
            <div key={idx} className="thematic-card">
              <span className="theme-name">{insight.theme}</span>
              <p className="theme-insight">{insight.insight}</p>
            </div>
          ))}
        </div>
      )}

      {studyNote && (
        <div className="study-note">
          <h4>📝 Study Note</h4>
          <p>{studyNote}</p>
        </div>
      )}
    </div>
  );
});

ShoreshResult.displayName = 'ShoreshResult';

export default ShoreshResult;
