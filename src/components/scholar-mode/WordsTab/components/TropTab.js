/**
 * TropTab Component
 *
 * Wrapper for CantillationAnalysis component.
 * Displays ta'amim (cantillation marks) with audio and educational content.
 */

import React from 'react';
import PropTypes from 'prop-types';
import CantillationAnalysis from '../../../analysis/CantillationAnalysis';
import './TropTab.css';

const TropTab = React.memo(function TropTab({ verseText, verseRef }) {
  if (!verseText && !verseRef) {
    return (
      <div className="trop-tab empty">
        <span className="empty-icon">🎵</span>
        <h5>No Text Selected</h5>
        <p>Select a verse to analyze its cantillation marks (טעמי המקרא).</p>
      </div>
    );
  }

  return (
    <div className="trop-tab">
      <CantillationAnalysis verseText={verseText} verseRef={verseRef} />
    </div>
  );
});

TropTab.propTypes = {
  verseText: PropTypes.string,
  verseRef: PropTypes.string
};

export default TropTab;
