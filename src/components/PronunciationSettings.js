import React, { useState, useCallback } from 'react';
import {
  TRADITIONS,
  getPronunciationDifferences,
  PARSHA_PRONUNCIATIONS
} from '../services/pronunciationService';
import './PronunciationSettings.css';

const PronunciationSettings = ({
  currentTradition,
  onTraditionChange,
  isOpen,
  onClose
}) => {
  const [showDifferences, setShowDifferences] = useState(false);
  const differences = getPronunciationDifferences();

  const handleTraditionSelect = useCallback((tradition) => {
    onTraditionChange(tradition);
  }, [onTraditionChange]);

  if (!isOpen) return null;

  return (
    <div className="pronunciation-modal-overlay" onClick={onClose}>
      <div className="pronunciation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pronunciation Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="tradition-section">
            <h3>Select Pronunciation Tradition</h3>
            <p className="section-description">
              Choose how Hebrew words should be transliterated and pronounced throughout the app.
            </p>

            <div className="tradition-options">
              <button
                className={`tradition-card ${currentTradition === TRADITIONS.SEPHARDIC ? 'selected' : ''}`}
                onClick={() => handleTraditionSelect(TRADITIONS.SEPHARDIC)}
              >
                <div className="tradition-icon">🇮🇱</div>
                <div className="tradition-info">
                  <span className="tradition-name">Sephardic</span>
                  <span className="tradition-hebrew">ספרדי</span>
                  <span className="tradition-example">Shabbat, Torah, Bereshit</span>
                </div>
                {currentTradition === TRADITIONS.SEPHARDIC && (
                  <div className="check-mark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                className={`tradition-card ${currentTradition === TRADITIONS.ASHKENAZIC ? 'selected' : ''}`}
                onClick={() => handleTraditionSelect(TRADITIONS.ASHKENAZIC)}
              >
                <div className="tradition-icon">🕍</div>
                <div className="tradition-info">
                  <span className="tradition-name">Ashkenazic</span>
                  <span className="tradition-hebrew">אשכנזי</span>
                  <span className="tradition-example">Shabbos, Toirah, Bereishis</span>
                </div>
                {currentTradition === TRADITIONS.ASHKENAZIC && (
                  <div className="check-mark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                className={`tradition-card ${currentTradition === TRADITIONS.MODERN_ISRAELI ? 'selected' : ''}`}
                onClick={() => handleTraditionSelect(TRADITIONS.MODERN_ISRAELI)}
              >
                <div className="tradition-icon">🌍</div>
                <div className="tradition-info">
                  <span className="tradition-name">Modern Israeli</span>
                  <span className="tradition-hebrew">עברית מודרנית</span>
                  <span className="tradition-example">Shabbat, Torah, Bereshit</span>
                </div>
                {currentTradition === TRADITIONS.MODERN_ISRAELI && (
                  <div className="check-mark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="differences-section">
            <button
              className="differences-toggle"
              onClick={() => setShowDifferences(!showDifferences)}
            >
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Learn About Pronunciation Differences
              </span>
              <svg
                className={`chevron ${showDifferences ? 'open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showDifferences && (
              <div className="differences-table-container">
                <table className="differences-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th>Sephardic</th>
                      <th>Ashkenazic</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {differences.map((diff, index) => (
                      <tr key={index}>
                        <td className="feature-name">{diff.feature}</td>
                        <td>{diff.sephardic}</td>
                        <td>{diff.ashkenazic}</td>
                        <td className="example">{diff.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="parsha-preview">
            <h3>Parsha Name Preview</h3>
            <div className="parsha-grid">
              {Object.entries(PARSHA_PRONUNCIATIONS).slice(0, 6).map(([key, value]) => (
                <div key={key} className="parsha-item">
                  <span className="parsha-current">
                    {currentTradition === TRADITIONS.ASHKENAZIC ? value.ashkenazic : value.sephardic}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <p className="footer-note">
            Your pronunciation preference will be applied to parsha names, transliterations,
            and text-to-speech throughout the app.
          </p>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PronunciationSettings);
