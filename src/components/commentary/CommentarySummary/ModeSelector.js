/**
 * ModeSelector Component
 * Professional Jewish Study Modes selector
 */

import React, { memo } from 'react';
import { ANALYSIS_MODES } from '../../../services/groqService';

// Mode definitions with Hebrew labels and descriptions
const MODES = [
  { id: ANALYSIS_MODES.SUMMARY, label: 'סיכום', icon: '📋', desc: 'Quick overview' },
  { id: ANALYSIS_MODES.IYUN, label: 'עיון', icon: '🔍', desc: 'Chavrusa study' },
  { id: ANALYSIS_MODES.MUSSAR, label: 'מוסר', icon: '💎', desc: 'Ethics' },
  { id: ANALYSIS_MODES.MACHLOKET, label: 'מחלוקת', icon: '⚔️', desc: 'Disputes' },
  { id: ANALYSIS_MODES.MAREI_MEKOMOT, label: 'מ״מ', icon: '🔗', desc: 'Sources' },
  { id: ANALYSIS_MODES.HALACHA, label: 'הלכה', icon: '⚖️', desc: 'Practical law' }
];

/**
 * Mode selector for different analysis types
 * @param {Object} props
 * @param {string} props.currentMode - Currently selected mode
 * @param {Function} props.onModeChange - Callback when mode changes
 * @param {boolean} props.loading - Whether analysis is in progress
 */
function ModeSelector({ currentMode, onModeChange, loading }) {
  return (
    <div className="mode-selector">
      {MODES.map(mode => (
        <button
          key={mode.id}
          className={`mode-btn ${currentMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          disabled={loading}
          title={mode.desc}
        >
          <span className="mode-icon">{mode.icon}</span>
          <span className="mode-label">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

export { MODES };
export default memo(ModeSelector);
