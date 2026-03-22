/**
 * StudyModeSelector - Switch between Iyun/Bekiut/Chazara modes
 *
 * Visual selector that shows current mode and allows switching
 * with clear indication of what each mode enables/disables.
 */

import React, { useState } from 'react';
import { useStudyMode, STUDY_MODE_CONFIG } from '../../context/StudyModeContext';
import './StudyModeSelector.css';

const StudyModeSelector = ({ compact = false, showDescription = true }) => {
  const { currentMode, switchMode, features, currentSession } = useStudyMode();
  const [expanded, setExpanded] = useState(false);

  const currentConfig = STUDY_MODE_CONFIG[currentMode];

  if (compact) {
    return (
      <div className="study-mode-compact">
        <button
          className={`mode-chip mode-${currentMode}`}
          onClick={() => setExpanded(!expanded)}
          title={currentConfig.englishName}
        >
          <span className="mode-icon">{currentConfig.icon}</span>
          <span className="mode-name">{currentConfig.name}</span>
        </button>

        {expanded && (
          <div className="mode-dropdown">
            {Object.entries(STUDY_MODE_CONFIG).map(([mode, config]) => (
              <button
                key={mode}
                className={`mode-option ${mode === currentMode ? 'active' : ''}`}
                onClick={() => {
                  switchMode(mode);
                  setExpanded(false);
                }}
              >
                <span className="mode-icon">{config.icon}</span>
                <div className="mode-info">
                  <span className="mode-name">{config.name}</span>
                  <span className="mode-english">{config.englishName}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="study-mode-selector">
      <div className="mode-header">
        <h3>לימוד Mode</h3>
        {currentSession && (
          <span className="session-active">Session Active</span>
        )}
      </div>

      <div className="mode-buttons">
        {Object.entries(STUDY_MODE_CONFIG).map(([mode, config]) => (
          <button
            key={mode}
            className={`mode-button ${mode === currentMode ? 'active' : ''}`}
            onClick={() => switchMode(mode)}
          >
            <span className="mode-icon">{config.icon}</span>
            <span className="mode-name-hebrew">{config.name}</span>
            <span className="mode-name-english">{config.englishName.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {showDescription && (
        <div className="mode-description">
          <p>{currentConfig.description}</p>

          <div className="mode-features">
            <FeatureIndicator
              label="Commentaries"
              enabled={features.showAllCommentaries}
            />
            <FeatureIndicator
              label="AI Analysis"
              enabled={features.enableAI}
            />
            <FeatureIndicator
              label="Cross-refs"
              enabled={features.showCrossRefs}
            />
            <FeatureIndicator
              label="Grammar"
              enabled={features.showGrammar}
            />
            {features.enableSRS && (
              <FeatureIndicator
                label="SRS Active"
                enabled={true}
                highlight
              />
            )}
            {features.enableTesting && (
              <FeatureIndicator
                label="Test Mode"
                enabled={true}
                highlight
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureIndicator = ({ label, enabled, highlight = false }) => (
  <span className={`feature-indicator ${enabled ? 'enabled' : 'disabled'} ${highlight ? 'highlight' : ''}`}>
    <span className="feature-dot">{enabled ? '●' : '○'}</span>
    <span className="feature-label">{label}</span>
  </span>
);

export default StudyModeSelector;
