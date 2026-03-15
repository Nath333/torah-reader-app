/**
 * TzuratHaDafTab - Traditional Talmud page layout
 */
import React, { useState, useEffect, useMemo } from 'react';
import { generateTzuratHaDaf, segmentIntoSugyaUnits } from '../../services/discoursePatternService';
import { getRashiOnTalmud } from '../../services/rashiService';
import { getTosafotOnTalmud } from '../../services/tosafotService';

const TzuratHaDafTab = React.memo(({ text, reference, rashiText, tosafotText }) => {
  const [loading, setLoading] = useState(false);
  const [rashiData, setRashiData] = useState(rashiText || '');
  const [tosafotData, setTosafotData] = useState(tosafotText || '');

  // Parse reference for tractate and daf
  const parsedRef = useMemo(() => {
    if (!reference) return { masechet: '', dafNumber: '' };
    const parts = reference.split(/[._]/);
    return {
      masechet: parts[0] || '',
      dafNumber: parts[1] || ''
    };
  }, [reference]);

  // Fetch commentaries if not provided
  useEffect(() => {
    if (!reference || rashiText || tosafotText) return;

    const fetchCommentaries = async () => {
      setLoading(true);
      try {
        const [rashi, tosafot] = await Promise.all([
          getRashiOnTalmud(reference).catch(() => null),
          getTosafotOnTalmud(reference).catch(() => null)
        ]);

        if (rashi?.he) {
          setRashiData(Array.isArray(rashi.he) ? rashi.he.join(' ') : rashi.he);
        }
        if (tosafot?.he) {
          setTosafotData(Array.isArray(tosafot.he) ? tosafot.he.join(' ') : tosafot.he);
        }
      } catch (error) {
        console.error('Failed to fetch commentaries for Tzurat HaDaf:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentaries();
  }, [reference, rashiText, tosafotText]);

  // Generate layout data
  const layoutData = useMemo(() => {
    return generateTzuratHaDaf({
      mainText: text || '',
      rashiText: rashiData,
      tosafotText: tosafotData,
      dafNumber: parsedRef.dafNumber,
      masechet: parsedRef.masechet
    });
  }, [text, rashiData, tosafotData, parsedRef]);

  // Get segments for display
  const segments = useMemo(() => {
    return text ? segmentIntoSugyaUnits(text) : [];
  }, [text]);

  if (!text) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📜</span>
        <span className="empty-text">No text available for Tzurat HaDaf</span>
      </div>
    );
  }

  return (
    <div className="tzurat-hadaf-tab">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading commentaries...</span>
        </div>
      )}

      {/* Traditional Page Layout */}
      <div className="tzurat-hadaf-container">
        {/* Header */}
        <div className="tzurat-hadaf-header">
          <span className="masechet-name">{layoutData.header.masechet}</span>
          {layoutData.header.dafNumber && (
            <span className="daf-number">דף {layoutData.header.dafNumber}</span>
          )}
          {layoutData.header.amud && (
            <span className="amud-indicator">עמוד {layoutData.header.amud}</span>
          )}
        </div>

        {/* Three-Column Layout */}
        <div className="tzurat-hadaf-columns">
          {/* Rashi Column (Inner/Right in RTL) */}
          <div className="tzurat-column rashi-column">
            <div className="column-header">
              <span className="commentator-name">רש״י</span>
              <span className="commentator-name-en">Rashi</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {rashiData || <em className="no-commentary">אין רש״י</em>}
            </div>
          </div>

          {/* Main Gemara Column (Center) */}
          <div className="tzurat-column main-column">
            <div className="column-header">
              <span className="section-label">גמרא</span>
            </div>
            <div className="column-content main-text" dir="rtl" lang="he">
              {segments.map((seg, index) => (
                <div
                  key={index}
                  className={`text-segment segment-${seg.type}`}
                  style={{
                    borderRightColor: seg.color || 'transparent',
                    backgroundColor: seg.color ? `${seg.color}10` : 'transparent'
                  }}
                >
                  {seg.icon && <span className="segment-icon">{seg.icon}</span>}
                  {seg.marker && (
                    <span
                      className="segment-marker"
                      style={{ color: seg.color }}
                    >
                      {seg.marker}
                    </span>
                  )}
                  <span className="segment-content">{seg.content}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tosafot Column (Outer/Left in RTL) */}
          <div className="tzurat-column tosafot-column">
            <div className="column-header">
              <span className="commentator-name">תוספות</span>
              <span className="commentator-name-en">Tosafot</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {tosafotData || <em className="no-commentary">אין תוספות</em>}
            </div>
          </div>
        </div>

        {/* Legend for Discourse Markers */}
        {layoutData.discourseIndicators?.length > 0 && (
          <div className="tzurat-legend">
            <span className="legend-title">Discourse Markers:</span>
            <div className="legend-items">
              {[...new Map(layoutData.discourseIndicators.map(d => [d.type, d])).values()]
                .slice(0, 6)
                .map((indicator, i) => (
                  <span
                    key={i}
                    className="legend-item"
                    style={{ '--marker-color': indicator.color }}
                  >
                    <span className="legend-icon">{indicator.icon}</span>
                    <span className="legend-label">{indicator.label}</span>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Structure Summary */}
      {layoutData.mainColumn.analysis && (
        <div className="tzurat-summary">
          <div className="summary-item">
            <span className="summary-label">Structure:</span>
            <span className="summary-value">{layoutData.mainColumn.analysis.structure}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Complexity:</span>
            <span className={`summary-value complexity-${layoutData.mainColumn.analysis.complexityLevel}`}>
              {layoutData.mainColumn.analysis.complexityLevel}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Patterns:</span>
            <span className="summary-value">{layoutData.mainColumn.analysis.statistics?.totalPatterns || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default TzuratHaDafTab;
