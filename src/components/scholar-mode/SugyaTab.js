/**
 * SugyaTab Component
 * 
 * The main Talmud study tab that integrates the HalachicChain visualization.
 * Replaces the previous TalmudToolsTab with a cleaner, more focused interface.
 * 
 * Features:
 * - Halachic decision chain visualization
 * - Smart mode detection (Mishnah vs Gemara focus)
 * - Integration with existing PRO analysis components
 * - Educational/Practical toggle
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import HalachicChain from './HalachicChain';
import { isMishnaText, isGemaraText } from './HalachicChain/utils';
import './SugyaTab.css';

const SugyaTab = ({ text, reference, textType, onError }) => {
  const [focusedOpinion, setFocusedOpinion] = useState(null);
  
  // Detect what type of content we have
  const contentType = detectContentType(text);
  
  // Handle opinion focus
  const handleOpinionFocus = useCallback((opinion) => {
    setFocusedOpinion(opinion);
    console.log('Focused opinion:', opinion);
  }, []);

  // Get current book from reference
  const currentBook = reference?.split('.')[0] || '';

  return (
    <div className="sugya-tab">
      {/* Content Type Indicator */}
      <div className="content-indicator">
        <span className={`indicator-badge ${contentType}`}>
          {getContentTypeLabel(contentType)}
        </span>
        <span className="reference-display">{reference}</span>
      </div>

      {/* Main Halachic Chain */}
      <div className="sugya-main">
        <HalachicChain
          text={text}
          reference={reference}
          currentBook={currentBook}
          options={{
            includeMishnah: true,
            includeGemara: true,
            includeRishonim: true,
            includePsak: true,
            fetchCrossReferences: true
          }}
          onOpinionFocus={handleOpinionFocus}
          onError={onError}
        />
      </div>

      {/* Focused Opinion Detail (if any) */}
      {focusedOpinion && (
        <div className="opinion-detail-panel">
          <div className="detail-header">
            <h4>{focusedOpinion.authority}</h4>
            <button 
              className="close-detail"
              onClick={() => setFocusedOpinion(null)}
            >
              ×
            </button>
          </div>
          <div className="detail-content">
            {focusedOpinion.ruling && (
              <div className="detail-section">
                <label>Ruling:</label>
                <p>{focusedOpinion.ruling}</p>
              </div>
            )}
            {focusedOpinion.reasoning && (
              <div className="detail-section">
                <label>Reasoning:</label>
                <p>{focusedOpinion.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Detect the type of content in the text
 */
const detectContentType = (text) => {
  if (!text) return 'unknown';
  
  if (isMishnaText(text)) {
    return 'mishna';
  } else if (isGemaraText(text)) {
    return 'gemara';
  }
  
  return 'mixed';
};

/**
 * Get display label for content type
 */
const getContentTypeLabel = (type) => {
  const labels = {
    mishna: '📜 Mishnah',
    gemara: '📚 Gemara',
    mixed: '📖 Mixed',
    unknown: '❓ Unknown'
  };
  return labels[type] || labels.unknown;
};

SugyaTab.propTypes = {
  text: PropTypes.string.isRequired,
  reference: PropTypes.string.isRequired,
  textType: PropTypes.string,
  onError: PropTypes.func
};

export default SugyaTab;
