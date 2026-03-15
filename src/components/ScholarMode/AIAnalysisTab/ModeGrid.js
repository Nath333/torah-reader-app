/**
 * ModeGrid - Analysis mode selection grid
 * Organizes 25+ analysis modes into categorized sections
 */
import React, { useState } from 'react';
import { ANALYSIS_MODES } from '../../../services/groqService';

// Core Study Methods - Always visible
export const PRIMARY_MODES = [
  { id: ANALYSIS_MODES.SUMMARY, icon: '📋', label: 'Summary', desc: 'Key points & overview', color: '#3b82f6' },
  { id: ANALYSIS_MODES.PARDES, icon: '🌳', label: 'PaRDeS', desc: 'Four levels of interpretation', color: '#10b981' },
  { id: ANALYSIS_MODES.DEEP_STUDY, icon: '📖', label: 'Deep Study', desc: 'In-depth analysis', color: '#8b5cf6' }
];

// Torah Learning Methods
export const STUDY_MODES = [
  { id: ANALYSIS_MODES.MUSSAR, icon: '💎', label: 'Mussar', desc: 'Ethical teachings', color: '#ec4899' },
  { id: ANALYSIS_MODES.STUDY_QUESTIONS, icon: '❓', label: 'Chavruta', desc: 'Discussion questions', color: '#f59e0b' },
  { id: ANALYSIS_MODES.KEY_TERMS, icon: '🔤', label: 'Shorashim', desc: 'Root words & terms', color: '#06b6d4' },
  { id: ANALYSIS_MODES.GEMATRIA, icon: '🔢', label: 'Gematria', desc: 'Numerical analysis', color: '#f97316' },
  { id: ANALYSIS_MODES.COMPARE, icon: '⚖️', label: 'Compare', desc: 'Multiple views', color: '#ef4444' }
];

// Textual Analysis
export const TEXTUAL_MODES = [
  { id: ANALYSIS_MODES.TREE_SUMMARY, icon: '🌲', label: 'Structure', desc: 'Conceptual outline', color: '#059669' },
  { id: ANALYSIS_MODES.NARRATIVE, icon: '📖', label: 'Narrative', desc: 'Story & characters', color: '#14b8a6' },
  { id: ANALYSIS_MODES.QUICK_INSIGHT, icon: '💡', label: 'Insights', desc: 'Quick observations', color: '#fbbf24' }
];

// Genesis-specific
export const GENESIS_ONLY_MODES = [
  { id: ANALYSIS_MODES.CREATION, icon: '✨', label: 'Bereishit', desc: 'Creation theology', color: '#a855f7' }
];

// Mefarshim & Sources
export const MEFARSHIM_MODES = [
  { id: ANALYSIS_MODES.MEFARSHIM, icon: '📚', label: 'Mefarshim', desc: 'Classical commentators', color: '#7c3aed' },
  { id: ANALYSIS_MODES.INTERTEXTUAL, icon: '🔗', label: 'Marei Mekomot', desc: 'Cross-references', color: '#059669' },
  { id: ANALYSIS_MODES.LEXICON, icon: '📖', label: 'Lexicon', desc: 'BDB, Jastrow, HALOT', color: '#0891b2' }
];

// Applied Learning
export const APPLIED_MODES = [
  { id: ANALYSIS_MODES.HALACHA, icon: '⚖️', label: 'Halacha', desc: 'Practical law', color: '#dc2626' },
  { id: ANALYSIS_MODES.HISTORICAL, icon: '🏛️', label: 'Historical', desc: 'Context & background', color: '#b45309' }
];

// Passage modes for multi-verse analysis
export const PASSAGE_MODES = [
  { id: ANALYSIS_MODES.PASSAGE, icon: '📜', label: 'Overview', desc: 'Unified analysis', color: '#6366f1' },
  { id: ANALYSIS_MODES.PASSAGE_NARRATIVE, icon: '📖', label: 'Story Arc', desc: 'Narrative flow', color: '#8b5cf6' },
  { id: ANALYSIS_MODES.PASSAGE_THEMATIC, icon: '🔮', label: 'Themes', desc: 'Key themes', color: '#a855f7' },
  { id: ANALYSIS_MODES.PASSAGE_CHIASM, icon: '🔄', label: 'Chiasm', desc: 'Literary structure', color: '#c084fc' }
];

// All modes combined
export const ALL_MODES = [
  ...PRIMARY_MODES,
  ...STUDY_MODES,
  ...TEXTUAL_MODES,
  ...GENESIS_ONLY_MODES,
  ...MEFARSHIM_MODES,
  ...APPLIED_MODES,
  ...PASSAGE_MODES
];

// Mode Button Component
const ModeButton = ({ mode, isSelected, isCompleted, onClick, disabled }) => (
  <button
    className={`mode-btn ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
    onClick={() => onClick(mode.id)}
    disabled={disabled}
    style={{ '--mode-color': mode.color }}
    title={mode.desc}
  >
    <span className="mode-icon">{mode.icon}</span>
    <span className="mode-label">{mode.label}</span>
    {isCompleted && <span className="completed-check">✓</span>}
  </button>
);

/**
 * ModeGrid Component
 * Displays categorized analysis modes with expandable sections
 */
const ModeGrid = ({
  selectedMode,
  onSelect,
  loading,
  showGenesisMode = false,
  isMultiVerse = false,
  completedModes = new Set(),
  textType = 'torah' // 'torah' | 'talmud'
}) => {
  const [showLimud, setShowLimud] = useState(false);
  const [showMefarshim, setShowMefarshim] = useState(false);

  // Calculate counts for each section
  const limudCount = STUDY_MODES.length + TEXTUAL_MODES.length + (showGenesisMode ? GENESIS_ONLY_MODES.length : 0);
  const mefarshimCount = MEFARSHIM_MODES.length + APPLIED_MODES.length;

  return (
    <div className="ai-mode-selector">
      {/* Passage Analysis - for multi-verse */}
      {isMultiVerse && (
        <div className="passage-modes-section">
          <div className="section-label">📜 Passage Analysis</div>
          <div className="mode-row">
            {PASSAGE_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Core Study Methods - always visible for single verse */}
      {!isMultiVerse && (
        <div className="primary-modes">
          {PRIMARY_MODES.map(mode => (
            <ModeButton
              key={mode.id}
              mode={mode}
              isSelected={selectedMode === mode.id}
              isCompleted={completedModes.has(mode.id)}
              onClick={onSelect}
              disabled={loading}
            />
          ))}
        </div>
      )}

      {/* Study Methods (expandable) */}
      <div className={`expandable-section ${showLimud ? 'expanded' : ''}`}>
        <button
          className="expand-toggle"
          onClick={() => setShowLimud(!showLimud)}
        >
          <span className="toggle-arrow">{showLimud ? '▼' : '▶'}</span>
          <span className="section-title-heb">לימוד</span>
          <span className="section-title-eng">Study Methods</span>
          <span className="mode-count">{limudCount}</span>
        </button>
        {showLimud && (
          <div className="expanded-modes">
            {STUDY_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
            {TEXTUAL_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
            {showGenesisMode && GENESIS_ONLY_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mefarshim & Sources (expandable) */}
      <div className={`expandable-section ${showMefarshim ? 'expanded' : ''}`}>
        <button
          className="expand-toggle scholarly"
          onClick={() => setShowMefarshim(!showMefarshim)}
        >
          <span className="toggle-arrow">{showMefarshim ? '▼' : '▶'}</span>
          <span className="section-title-heb">מפרשים</span>
          <span className="section-title-eng">Sources</span>
          <span className="mode-count">{mefarshimCount}</span>
        </button>
        {showMefarshim && (
          <div className="expanded-modes">
            {MEFARSHIM_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
            {APPLIED_MODES.map(mode => (
              <ModeButton
                key={mode.id}
                mode={mode}
                isSelected={selectedMode === mode.id}
                isCompleted={completedModes.has(mode.id)}
                onClick={onSelect}
                disabled={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeGrid;
