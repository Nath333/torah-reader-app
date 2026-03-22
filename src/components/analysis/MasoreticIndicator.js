/**
 * MasoreticIndicator - Shows textual variant indicators for verses
 *
 * Displays compact badges when a verse has:
 * - Ketiv/Qere variants
 * - Tiqqune Soferim (scribal corrections)
 * - Dead Sea Scrolls variants
 */
import React, { useState, useMemo, useCallback } from 'react';
import { getMasoreticNotes, KETIV_QERE_TYPE_LABELS } from '../../services/masoreticService';
import { getVariantsForVerse, SIGNIFICANCE_LEVELS } from '../../services/manuscriptVariantsService';
import './MasoreticIndicator.css';

const MasoreticIndicator = ({ book, chapter, verse, compact = true }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Build reference string
  const reference = useMemo(() => {
    return `${book}.${chapter}.${verse}`;
  }, [book, chapter, verse]);

  // Get Masoretic notes
  const masoreticData = useMemo(() => {
    return getMasoreticNotes(reference);
  }, [reference]);

  // Get manuscript variants
  const variantData = useMemo(() => {
    return getVariantsForVerse(reference);
  }, [reference]);

  // Check if we have any data to show
  const hasData = masoreticData?.hasVariants || variantData?.hasSignificantVariants;

  const toggleTooltip = useCallback((e) => {
    e.stopPropagation();
    setShowTooltip(prev => !prev);
  }, []);

  const closeTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  if (!hasData) return null;

  // Count indicators
  const kqCount = masoreticData?.ketivQere?.length || 0;
  const hasTiqqun = !!masoreticData?.tiqqunSoferim;
  const msCount = variantData?.variants?.length || 0;

  return (
    <div className="masoretic-indicator" onMouseLeave={closeTooltip}>
      <button
        className={`masoretic-badge ${compact ? 'compact' : ''}`}
        onClick={toggleTooltip}
        title="Click for textual variants"
      >
        {kqCount > 0 && <span className="badge-kq">כ״ק</span>}
        {hasTiqqun && <span className="badge-tiqqun">תק״ס</span>}
        {msCount > 0 && <span className="badge-ms">📜</span>}
      </button>

      {showTooltip && (
        <div className="masoretic-tooltip" onClick={e => e.stopPropagation()}>
          <div className="tooltip-header">
            <span className="tooltip-title">Textual Notes</span>
            <button className="tooltip-close" onClick={closeTooltip}>×</button>
          </div>

          {/* Ketiv/Qere Section */}
          {kqCount > 0 && (
            <div className="tooltip-section">
              <div className="section-header">
                <span className="section-icon">📝</span>
                <span className="section-title">Ketiv/Qere ({kqCount})</span>
              </div>
              {masoreticData.ketivQere.map((kq, i) => (
                <div key={i} className="variant-item kq-item">
                  <div className="variant-row">
                    <span className="variant-label">Written (כתיב):</span>
                    <span className="variant-hebrew" dir="rtl">{kq.ketiv}</span>
                  </div>
                  <div className="variant-row">
                    <span className="variant-label">Read (קרי):</span>
                    <span className="variant-hebrew" dir="rtl">{kq.qere}</span>
                  </div>
                  <div className="variant-type">
                    {KETIV_QERE_TYPE_LABELS[kq.type] || kq.type}
                  </div>
                  {kq.notes && <div className="variant-notes">{kq.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Tiqqun Soferim Section */}
          {hasTiqqun && (
            <div className="tooltip-section">
              <div className="section-header">
                <span className="section-icon">✍️</span>
                <span className="section-title">Tiqqun Soferim</span>
              </div>
              <div className="variant-item tiqqun-item">
                <div className="variant-row">
                  <span className="variant-label">Original:</span>
                  <span className="variant-hebrew" dir="rtl">{masoreticData.tiqqunSoferim.original}</span>
                </div>
                <div className="variant-row">
                  <span className="variant-label">Emended:</span>
                  <span className="variant-hebrew" dir="rtl">{masoreticData.tiqqunSoferim.emended}</span>
                </div>
                <div className="variant-notes">{masoreticData.tiqqunSoferim.reason}</div>
              </div>
            </div>
          )}

          {/* Manuscript Variants Section */}
          {variantData?.variants?.length > 0 && (
            <div className="tooltip-section">
              <div className="section-header">
                <span className="section-icon">📜</span>
                <span className="section-title">Manuscript Variants</span>
              </div>
              <div className="mt-text">
                <span className="mt-label">MT:</span>
                <span className="variant-hebrew" dir="rtl">{variantData.masoreticText}</span>
              </div>
              {variantData.variants.map((v, i) => (
                <div key={i} className={`variant-item ms-item ${v.significance}`}>
                  <div className="variant-source">
                    <span className="source-abbrev">{v.sourceInfo?.abbreviation || v.source}</span>
                    <span className="source-name">{v.sourceInfo?.name}</span>
                  </div>
                  <div className="variant-reading">{v.reading}</div>
                  <div className="variant-significance">
                    {SIGNIFICANCE_LEVELS[v.significance] || v.significance}
                  </div>
                  {v.notes && <div className="variant-notes">{v.notes}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="tooltip-footer">
            <span className="footer-note">Click verse to study in Scholar Mode</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasoreticIndicator;
