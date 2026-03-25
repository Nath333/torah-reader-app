/**
 * ModeGrid - Study Mode Selection (Parallel to Talmud Tab)
 *
 * PRO SCHOLAR V32: 3 study modes matching the Talmud (גמרא) tab
 * Same modes, but with AI enhancement for richer output
 *
 * Modes:
 *   - עיון (Iyun) - Deep Analysis with AI
 *   - בקיאות (Bekius) - Overview/Summary with AI
 *   - חזרה (Chazara) - Review/Quiz with AI
 */
import { useCallback, useEffect, memo } from 'react';
import PropTypes from 'prop-types';

// =============================================================================
// SHARED CONSTANTS (Single Source of Truth - PRO SCHOLAR V32)
// =============================================================================
import { STUDY_MODE_KEYS } from '../../../constants/talmudStudy';
import { MODE_UI_CONFIG } from './shared';

// Export for backward compatibility
export const STUDY_MODES = STUDY_MODE_KEYS;

// Build MODES array from shared config (DRY - single source of truth)
const MODES = Object.entries(MODE_UI_CONFIG).map(([key, config]) => ({
  id: key,
  hebrew: config.hebrew,
  english: config.english,
  icon: config.icon,
  color: config.color,
  shortcut: config.shortcut,
  subtitle: config.subtitle.split(' - ')[1] || config.subtitle // Use short form
}));

// For backward compatibility
export const ALL_MODES = MODES;

// ============================================================================
// ModeButton - Large card-style button for study mode
// ============================================================================

const ModeButton = memo(function ModeButton({ mode, isSelected, isCompleted, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`study-mode-btn-compact ${isSelected ? 'active' : ''} ${isCompleted ? 'done' : ''}`}
      onClick={() => onClick(mode.id)}
      disabled={disabled}
      style={{ '--mode-color': mode.color }}
      title={`${mode.hebrew} (${mode.shortcut})`}
    >
      <span className="mode-icon">{mode.icon}</span>
      <div className="mode-info">
        <span className="mode-hebrew">{mode.hebrew}</span>
        <span className="mode-subtitle">{mode.subtitle}</span>
      </div>
      {isCompleted && !isSelected && <span className="mode-check">✓</span>}
      <span className="mode-key">{mode.shortcut}</span>
    </button>
  );
});

ModeButton.propTypes = {
  mode: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  isCompleted: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

// ============================================================================
// Main ModeGrid Component - 3 Study Modes
// ============================================================================

const ModeGrid = ({
  selectedMode,
  onSelect,
  loading = false,
  completedModes = new Set(),
  textType = 'torah'
}) => {
  const isTalmud = textType === 'talmud' || textType === 'gemara';
  const completedCount = completedModes.size;

  // Text type context for mode descriptions
  const contextLabel = isTalmud ? 'סוגיא' : 'פסוקים';

  // Keyboard shortcuts (1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      if (key >= '1' && key <= '3' && !loading) {
        const index = parseInt(key, 10) - 1;
        if (index < MODES.length) {
          onSelect(MODES[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onSelect]);

  const handleSelect = useCallback((id) => {
    if (!loading) onSelect(id);
  }, [loading, onSelect]);

  return (
    <div className={`study-mode-grid-compact ${isTalmud ? 'talmud-mode' : 'torah-mode'}`}>
      {/* Compact header */}
      <div className="mode-grid-header-compact">
        <div className="ai-badge-compact">
          <span>🤖</span>
          <span>AI</span>
          <span className="context-label">{contextLabel}</span>
        </div>
        {completedCount > 0 && (
          <span className="mode-progress-compact">{completedCount}/3 ✓</span>
        )}
      </div>

      {/* Mode buttons - horizontal row */}
      <div className="mode-buttons-row">
        {MODES.map(mode => (
          <ModeButton
            key={mode.id}
            mode={mode}
            isSelected={selectedMode === mode.id}
            isCompleted={completedModes.has(mode.id)}
            onClick={handleSelect}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
};

ModeGrid.propTypes = {
  selectedMode: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  completedModes: PropTypes.instanceOf(Set),
  textType: PropTypes.oneOf(['torah', 'talmud', 'gemara', 'mishna', 'mishnah', 'neviim', 'ketuvim'])
};

export { STUDY_MODES as ANALYSIS_MODES };
export default ModeGrid;
