/**
 * MekabilotResult - Related Passages & Intertextual Connections
 */
import React from 'react';

export const MekabilotResult = ({ data }) => {
  const {
    summary,
    keyTermsAndConcepts,
    parallelNarratives,
    talmudDiscussions,
    midrashicExpansions,
    halachicApplications,
    suggestedStudyPath,
    thematicWeb
  } = data;

  return (
    <div className="mekabilot-result">
      <div className="mekabilot-header">
        <span className="mekabilot-icon">🔗</span>
        <h3>מקבילות — Related Passages</h3>
      </div>

      {summary && (
        <div className="mekabilot-summary">
          <p>{summary}</p>
        </div>
      )}

      {keyTermsAndConcepts && keyTermsAndConcepts.length > 0 && (
        <div className="key-terms-section">
          <h4>🔤 Key Terms & Concepts</h4>
          {keyTermsAndConcepts.map((item, idx) => (
            <div key={idx} className="term-card">
              <div className="term-header">
                <span className="term-name" dir="auto">{item.term}</span>
              </div>
              {item.whereElse && item.whereElse.length > 0 && (
                <div className="term-occurrences">
                  {item.whereElse.map((occ, i) => (
                    <div key={i} className="occurrence-item">
                      <span className="occ-ref">📖 {occ.reference}</span>
                      {occ.context && <p className="occ-context">{occ.context}</p>}
                      {occ.connection && <p className="occ-connection"><em>Connection:</em> {occ.connection}</p>}
                      {occ.insight && <p className="occ-insight">💡 {occ.insight}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {parallelNarratives && parallelNarratives.length > 0 && (
        <div className="parallels-section">
          <h4>📜 Parallel Narratives</h4>
          <div className="parallels-grid">
            {parallelNarratives.map((parallel, idx) => (
              <div key={idx} className="parallel-card">
                <div className="parallel-ref">
                  <span className="ref-icon">📖</span>
                  <span>{parallel.reference}</span>
                </div>
                {parallel.similarity && (
                  <div className="parallel-row same">
                    <span className="row-label">✓ Same:</span>
                    <span>{parallel.similarity}</span>
                  </div>
                )}
                {parallel.difference && (
                  <div className="parallel-row diff">
                    <span className="row-label">✗ Different:</span>
                    <span>{parallel.difference}</span>
                  </div>
                )}
                {parallel.lesson && (
                  <div className="parallel-lesson">
                    <span className="lesson-icon">💡</span>
                    <span>{parallel.lesson}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {talmudDiscussions && talmudDiscussions.length > 0 && (
        <div className="talmud-section">
          <h4>📚 Talmud Discussions</h4>
          <div className="talmud-list">
            {talmudDiscussions.map((discussion, idx) => (
              <div key={idx} className="talmud-item">
                <div className="talmud-ref">
                  <span className="tractate">{discussion.tractate}</span>
                  <span className="daf">{discussion.daf}</span>
                </div>
                <p className="talmud-topic">{discussion.topic}</p>
                {discussion.relevance && (
                  <p className="talmud-relevance"><em>Relevance:</em> {discussion.relevance}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {midrashicExpansions && midrashicExpansions.length > 0 && (
        <div className="midrash-section">
          <h4>📖 Midrashic Expansions</h4>
          {midrashicExpansions.map((midrash, idx) => (
            <div key={idx} className="midrash-item">
              <span className="midrash-source">{midrash.source}</span>
              <p className="midrash-teaching">{midrash.teaching}</p>
              {midrash.insight && (
                <p className="midrash-insight">💡 {midrash.insight}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {halachicApplications && halachicApplications.length > 0 && (
        <div className="halachic-section">
          <h4>⚖️ Halachic Applications</h4>
          <div className="halachic-list">
            {halachicApplications.map((app, idx) => (
              <div key={idx} className="halachic-item">
                <span className="halachic-topic">{app.topic}</span>
                <span className="halachic-source">{app.source}</span>
                {app.connection && <p className="halachic-connection">{app.connection}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestedStudyPath && suggestedStudyPath.length > 0 && (
        <div className="study-path-section">
          <h4>📚 Suggested Study Path</h4>
          <div className="study-path">
            {suggestedStudyPath.map((step, idx) => (
              <div key={idx} className="path-step">
                <span className="step-number">{step.order || idx + 1}</span>
                <div className="step-content">
                  <span className="step-source">{step.source}</span>
                  {step.reason && <span className="step-reason">{step.reason}</span>}
                </div>
                {idx < suggestedStudyPath.length - 1 && <div className="path-connector">→</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {thematicWeb && (
        <div className="thematic-web-section">
          <h4>🕸️ Thematic Web</h4>
          {thematicWeb.centralTheme && (
            <div className="central-theme">
              <span className="theme-icon">🎯</span>
              <strong>Central Theme:</strong> {thematicWeb.centralTheme}
            </div>
          )}
          {thematicWeb.relatedThemes && thematicWeb.relatedThemes.length > 0 && (
            <div className="related-themes">
              {thematicWeb.relatedThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
          {thematicWeb.bigPicture && (
            <div className="big-picture">
              <span className="big-icon">🌐</span>
              <p>{thematicWeb.bigPicture}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
