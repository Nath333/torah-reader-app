/**
 * DeepStudyView Component
 * In-depth iyun (study) analysis view
 */

import React, { memo } from 'react';
import MermaidDiagram from '../MermaidDiagram';
import { InfoCard, ClickableElement, SefariaLink, KeywordChips } from '../SharedComponents';

/**
 * Deep Study View - For iyun analysis
 */
function DeepStudyView({
  data,
  showDiagram,
  diagramId,
  onSourceClick,
  onWordLookup
}) {
  return (
    <div className="deep-study-view">
      {data.summary && (
        <InfoCard icon="📜" title="Main Thesis" className="thesis-card">
          <p className="thesis-text">{data.summary}</p>
        </InfoCard>
      )}

      <div className="deep-study-grid">
        {data.methodology && (
          <InfoCard icon="🔍" title="Methodology">
            <p>{data.methodology}</p>
          </InfoCard>
        )}

        {data.novelInsight && (
          <InfoCard icon="✨" title="חידוש (Novel Insight)" highlight>
            <p>{data.novelInsight}</p>
          </InfoCard>
        )}
      </div>

      {/* Key Hebrew Terms - clickable for word lookup */}
      {data.keyTerms && data.keyTerms.length > 0 && (
        <InfoCard icon="🔤" title="Key Terms">
          <KeywordChips keywords={data.keyTerms} onWordLookup={onWordLookup} />
        </InfoCard>
      )}

      {data.difficulties && data.difficulties.length > 0 && (
        <InfoCard icon="❓" title="Questions Addressed">
          <ul className="bullet-list">
            {data.difficulties.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.keyPoints && data.keyPoints.length > 0 && (
        <InfoCard icon="🎯" title="Key Points">
          <div className="key-points-grid">
            {data.keyPoints.map((p, i) => (
              <div key={i} className="key-point-item">
                <span className="point-num">{i + 1}</span>
                <span className="point-content">{p}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {data.textualBasis && data.textualBasis.length > 0 && (
        <InfoCard icon="📚" title="Textual Sources">
          <div className="sources-list">
            {data.textualBasis.map((s, i) => (
              <ClickableElement
                key={i}
                className="source-chip"
                onClick={() => onSourceClick?.(s)}
                title={`View ${s}`}
              >
                <SefariaLink reference={s}>
                  {s}
                </SefariaLink>
              </ClickableElement>
            ))}
          </div>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Analysis Flow</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}

      {data.furtherStudy && data.furtherStudy.length > 0 && (
        <InfoCard icon="📖" title="Further Study">
          <ul className="further-study-list">
            {data.furtherStudy.map((s, i) => (
              <li key={i}>
                <SefariaLink reference={s} className="further-study-link">
                  {s}
                </SefariaLink>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
}

export default memo(DeepStudyView);
