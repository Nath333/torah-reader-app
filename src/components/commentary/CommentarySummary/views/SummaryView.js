/**
 * SummaryView Component
 * Default summary view with topics, key points, and concept flow
 */

import React, { useMemo, memo } from 'react';
import MermaidDiagram from '../MermaidDiagram';
import { InfoCard, TopicTag, ConceptFlow } from '../SharedComponents';

/**
 * Summary View (Default) - Enhanced
 */
function SummaryView({
  data,
  showDiagram,
  diagramId,
  onTopicClick,
  onConceptClick
}) {
  // Extract key concepts for visual flow if no diagram
  const keyConceptsFlow = useMemo(() => {
    if (data.relatedConcepts && data.relatedConcepts.length >= 2) {
      return data.relatedConcepts.slice(0, 4);
    }
    return null;
  }, [data.relatedConcepts]);

  const handleConceptClick = (concept) => {
    onConceptClick?.(concept);
  };

  const handleConceptKeyDown = (e, concept) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onConceptClick?.(concept);
    }
  };

  return (
    <div className="summary-view">
      {/* Topics Bar */}
      {data.topics && data.topics.length > 0 && (
        <div className="topics-bar">
          {data.topics.map((topic, i) => (
            <TopicTag key={i} topic={topic} onClick={onTopicClick} />
          ))}
        </div>
      )}

      {/* Main Summary Card */}
      {data.summary && (
        <InfoCard icon="📝" title="Summary" className="summary-main-card">
          <p className="summary-text">{data.summary}</p>
        </InfoCard>
      )}

      {/* Key Points - Visual List */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="key-points-section">
          <h4>🎯 Key Points</h4>
          <div className="key-points-visual">
            {data.keyPoints.map((point, i) => (
              <div key={i} className="key-point-card">
                <div className="point-number">{i + 1}</div>
                <div className="point-text">{point}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagram or Concept Flow */}
      {showDiagram && data.diagram && (
        <div className="diagram-section">
          <h4>🗺️ Concept Map</h4>
          <MermaidDiagram chart={data.diagram} id={diagramId} explanation={data.diagramExplanation} />
        </div>
      )}

      {/* Concept Flow as Alternative */}
      {(!data.diagram || !showDiagram) && keyConceptsFlow && (
        <div className="concept-flow-section">
          <h4>🔗 Concept Flow</h4>
          <ConceptFlow concepts={keyConceptsFlow} />
        </div>
      )}

      {/* Practical Lesson - Highlighted */}
      {data.practicalLesson && (
        <InfoCard icon="💡" title="Practical Takeaway" highlight>
          <p className="practical-text">{data.practicalLesson}</p>
        </InfoCard>
      )}

      {/* Related Concepts */}
      {data.relatedConcepts && data.relatedConcepts.length > 0 && (
        <div className="related-section">
          <h4>🔗 Related Concepts</h4>
          <div className="related-chips">
            {data.relatedConcepts.map((c, i) => (
              <span
                key={i}
                className={`related-chip ${onConceptClick ? 'clickable' : ''}`}
                onClick={() => handleConceptClick(c)}
                onKeyDown={(e) => handleConceptKeyDown(e, c)}
                role={onConceptClick ? 'button' : undefined}
                tabIndex={onConceptClick ? 0 : undefined}
                title={onConceptClick ? `Explore "${c}"` : undefined}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SummaryView);
