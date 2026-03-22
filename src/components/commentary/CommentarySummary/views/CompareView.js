/**
 * CompareView Component
 * Machloket (dispute) analysis view - comparing different approaches
 */

import React, { memo } from 'react';
import MermaidDiagram from '../MermaidDiagram';
import { InfoCard } from '../SharedComponents';

const APPROACH_COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Compare View - For machloket analysis
 */
function CompareView({
  data,
  showDiagram,
  diagramId,
  onSourceClick
}) {
  const handleRepresentativeClick = (representative) => {
    onSourceClick?.(representative);
  };

  const handleRepresentativeKeyDown = (e, representative) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSourceClick?.(representative);
    }
  };

  return (
    <div className="compare-view">
      {data.summary && (
        <div className="context-banner">
          <p>{data.summary}</p>
        </div>
      )}

      {data.approaches && data.approaches.length > 0 && (
        <div className="approaches-section">
          <h4>📊 Interpretive Approaches</h4>
          <div className="approaches-grid">
            {data.approaches.map((approach, i) => (
              <div
                key={i}
                className="approach-card"
                style={{ borderLeftColor: APPROACH_COLORS[i % APPROACH_COLORS.length] }}
              >
                <h5 style={{ color: APPROACH_COLORS[i % APPROACH_COLORS.length] }}>{approach.school}</h5>
                <p>{approach.interpretation}</p>
                {approach.representative && (
                  <span
                    className={`representative ${onSourceClick ? 'clickable' : ''}`}
                    onClick={() => handleRepresentativeClick(approach.representative)}
                    onKeyDown={(e) => handleRepresentativeKeyDown(e, approach.representative)}
                    role={onSourceClick ? 'button' : undefined}
                    tabIndex={onSourceClick ? 0 : undefined}
                    title={onSourceClick ? `Learn about ${approach.representative}` : undefined}
                  >
                    — {approach.representative}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.tensions && data.tensions.length > 0 && (
        <InfoCard icon="⚡" title="Points of Tension">
          <ul className="tension-list">
            {data.tensions.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </InfoCard>
      )}

      {data.synthesis && (
        <InfoCard icon="🤝" title="Synthesis" highlight>
          <p>{data.synthesis}</p>
        </InfoCard>
      )}

      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Approaches Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}
    </div>
  );
}

export default memo(CompareView);
