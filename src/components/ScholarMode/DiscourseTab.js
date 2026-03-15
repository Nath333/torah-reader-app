/**
 * DiscourseTab - Talmudic discourse flow analysis
 */
import React from 'react';
import SugyaFlowVisualization from '../SugyaFlowVisualization';

const DiscourseTab = React.memo(({ text, flowData, discourseAnalysis }) => {
  if (!text) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📊</span>
        <span className="empty-text">No text to analyze</span>
      </div>
    );
  }

  return (
    <div className="discourse-tab">
      {/* Flow Visualization */}
      <SugyaFlowVisualization
        flowData={flowData}
        variant="full"
        showLegend={true}
        showStats={true}
      />

      {/* Pattern Details */}
      {discourseAnalysis?.allPatterns?.length > 0 && (
        <div className="pattern-details">
          <h4 className="section-title">Detected Patterns</h4>
          <div className="pattern-list">
            {discourseAnalysis.allPatterns.slice(0, 15).map((pattern, index) => (
              <div key={index} className="pattern-item" style={{ '--pattern-color': pattern.color }}>
                <span className="pattern-icon">{pattern.icon}</span>
                <span className="pattern-marker" dir="rtl">{pattern.marker}</span>
                <span className="pattern-label">{pattern.label}</span>
              </div>
            ))}
            {discourseAnalysis.allPatterns.length > 15 && (
              <div className="pattern-more">
                +{discourseAnalysis.allPatterns.length - 15} more patterns
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default DiscourseTab;
