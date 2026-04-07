/**
 * IyunDeepAnalysisPanel - Deep analysis panel for עיון (iyun) study mode
 *
 * Extracted from TalmudToolsTab.js (PRO SCHOLAR V31)
 * Extracts and displays:
 * - סברא (sevara): Logical reasoning patterns
 * - חילוקים (distinctions): Key differentiations
 * - הנחות (assumptions): Underlying premises
 * - נקודות מפתח (key points): Critical concepts
 *
 * @module IyunAnalysisPanel
 */
import React, { useState, useMemo } from 'react';
import { IYUN_ANALYSIS_PATTERNS } from '../../../constants/talmudStudy';

const IyunDeepAnalysisPanel = React.memo(function IyunDeepAnalysisPanel({ text, qaFlow, patterns }) {
  const [expandedSection, setExpandedSection] = useState('sevara');

  // Extract sevara and logical elements
  const analysis = useMemo(() => {
    if (!text) return { sevara: [], distinctions: [], assumptions: [], keyPoints: [] };

    const result = {
      sevara: [],
      distinctions: [],
      assumptions: [],
      keyPoints: []
    };

    // Find sevara patterns
    IYUN_ANALYSIS_PATTERNS.sevara.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const idx = text.indexOf(m);
          const context = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + 80));
          result.sevara.push({ marker: m, label, type, context: context.trim() });
        });
      }
    });

    // Find distinctions
    IYUN_ANALYSIS_PATTERNS.distinction.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const idx = text.indexOf(m);
          const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + 60));
          result.distinctions.push({ marker: m, label, type, context: context.trim() });
        });
      }
    });

    // Find assumptions
    IYUN_ANALYSIS_PATTERNS.assumption.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          result.assumptions.push({ marker: m, label, type });
        });
      }
    });

    // Extract key points from Q&A flow
    if (qaFlow?.flow) {
      qaFlow.flow.forEach((unit, i) => {
        if (unit.question) {
          result.keyPoints.push({
            type: 'question',
            text: unit.question.marker?.substring(0, 60),
            resolved: !!unit.resolution
          });
        }
      });
    }

    return result;
  }, [text, qaFlow]);

  const totalInsights = analysis.sevara.length + analysis.distinctions.length + analysis.assumptions.length;

  if (totalInsights === 0 && analysis.keyPoints.length === 0) {
    return null;
  }

  return (
    <div className="iyun-deep-panel-compact" dir="rtl">
      <div className="iyun-header-compact">
        <span>🔬</span>
        <span>עיון מעמיק</span>
        <span className="insights-count">{totalInsights}</span>
      </div>

      {/* Analysis sections */}
      <div className="iyun-sections">
        {/* Sevara - Logical Reasoning */}
        {analysis.sevara.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'sevara' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'sevara' ? null : 'sevara')}
              type="button"
            >
              <span className="section-icon">💡</span>
              <span className="section-title">סברות וטעמים</span>
              <span className="section-count">{analysis.sevara.length}</span>
              <span className="section-chevron">{expandedSection === 'sevara' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'sevara' && (
              <div className="section-content">
                {analysis.sevara.map((item, i) => (
                  <div key={i} className="insight-item sevara">
                    <span className="insight-label">{item.label}</span>
                    <span className="insight-context">{item.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Distinctions */}
        {analysis.distinctions.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'distinctions' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'distinctions' ? null : 'distinctions')}
              type="button"
            >
              <span className="section-icon">⚖️</span>
              <span className="section-title">הבחנות ותירוצים</span>
              <span className="section-count">{analysis.distinctions.length}</span>
              <span className="section-chevron">{expandedSection === 'distinctions' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'distinctions' && (
              <div className="section-content">
                {analysis.distinctions.map((item, i) => (
                  <div key={i} className="insight-item distinction">
                    <span className="insight-label">{item.label}</span>
                    <span className="insight-context">{item.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Key Q&A Points */}
        {analysis.keyPoints.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'keypoints' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'keypoints' ? null : 'keypoints')}
              type="button"
            >
              <span className="section-icon">❓</span>
              <span className="section-title">שאלות מפתח</span>
              <span className="section-count">{analysis.keyPoints.length}</span>
              <span className="section-chevron">{expandedSection === 'keypoints' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'keypoints' && (
              <div className="section-content">
                {analysis.keyPoints.map((point, i) => (
                  <div key={i} className={`insight-item keypoint ${point.resolved ? 'resolved' : 'open'}`}>
                    <span className="keypoint-status">{point.resolved ? '✅' : '❓'}</span>
                    <span className="keypoint-text">{point.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assumptions */}
        {analysis.assumptions.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'assumptions' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'assumptions' ? null : 'assumptions')}
              type="button"
            >
              <span className="section-icon">🎯</span>
              <span className="section-title">הנחות וחידושים</span>
              <span className="section-count">{analysis.assumptions.length}</span>
              <span className="section-chevron">{expandedSection === 'assumptions' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'assumptions' && (
              <div className="section-content">
                {analysis.assumptions.map((item, i) => (
                  <div key={i} className="insight-item assumption">
                    <span className="insight-marker">{item.marker}</span>
                    <span className="insight-label">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
});

export default IyunDeepAnalysisPanel;
