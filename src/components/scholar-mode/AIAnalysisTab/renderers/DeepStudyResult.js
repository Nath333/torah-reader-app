/**
 * DeepStudyResult - Standard IYUN deep study analysis
 * Shows methodology, structure, historical context, and insights
 */
import React, { memo } from 'react';
import { ResultSection, KeyPointsList } from './SharedComponents';

export const DeepStudyResult = memo(({ data }) => {
  const {
    summary,
    methodology,
    structure,
    historicalContext,
    creationThemes,
    textualBasis,
    keyPoints,
    novelInsight,
    connections
  } = data;

  return (
    <div className="deep-study-result">
      {/* Summary */}
      {summary && (
        <ResultSection title="Summary" icon="📋" color="#6366f1">
          <p className="result-text">{summary}</p>
        </ResultSection>
      )}

      {/* Methodology */}
      {methodology && (
        <ResultSection title="Methodology" icon="🔧" color="#8b5cf6">
          <p>{methodology}</p>
        </ResultSection>
      )}

      {/* Structure */}
      {structure && (structure.outline?.length > 0 || structure.keyThemes?.length > 0) && (
        <ResultSection title="Structure" icon="🏗️" color="#10b981">
          {structure.outline && structure.outline.length > 0 && (
            <div className="outline-list">
              {structure.outline.map((item, i) => (
                <div key={i} className="outline-item">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
              ))}
            </div>
          )}
          {structure.keyThemes && structure.keyThemes.length > 0 && (
            <div className="key-themes">
              {structure.keyThemes.map((theme, i) => (
                <span key={i} className="theme-tag">{theme}</span>
              ))}
            </div>
          )}
        </ResultSection>
      )}

      {/* Historical Context */}
      {historicalContext && (
        <ResultSection title="Historical Context" icon="🏛️" color="#b45309">
          <p>{historicalContext}</p>
        </ResultSection>
      )}

      {/* Creation Themes (Genesis) */}
      {creationThemes && creationThemes.length > 0 && (
        <ResultSection title="Creation Themes" icon="🌅" color="#059669">
          <div className="creation-themes">
            {creationThemes.map((theme, i) => (
              <div key={i} className="creation-theme">{typeof theme === 'string' ? theme : JSON.stringify(theme)}</div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Textual Basis */}
      {textualBasis && textualBasis.length > 0 && (
        <ResultSection title="Textual Basis" icon="📖" color="#6366f1">
          <div className="textual-basis">
            {textualBasis.map((item, i) => (
              <div key={i} className="basis-item">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Key Points */}
      {keyPoints && keyPoints.length > 0 && (
        <ResultSection title="Key Points" icon="📝" color="#3b82f6">
          <KeyPointsList points={keyPoints} />
        </ResultSection>
      )}

      {/* Novel Insight */}
      {novelInsight && (
        <ResultSection title="Novel Insight" icon="💡" color="#fbbf24">
          <p>{novelInsight}</p>
        </ResultSection>
      )}

      {/* Connections */}
      {connections && connections.length > 0 && (
        <ResultSection title="Connections" icon="🔗" color="#059669">
          <div className="connections-list">
            {connections.map((conn, i) => (
              <div key={i} className="connection-item">{typeof conn === 'string' ? conn : JSON.stringify(conn)}</div>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
});

DeepStudyResult.displayName = 'DeepStudyResult';

export default DeepStudyResult;
