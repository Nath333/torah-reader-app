/**
 * ModeGrid - Organized Analysis Mode Selection
 * Modes grouped into clear categories for better clarity
 */
import { useCallback, useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { ANALYSIS_MODES } from '../../../services/groqService';

// ============================================================================
// Mode Definitions - Organized into 3 Categories
// ============================================================================

// Category 1: Understanding - Core comprehension modes (blue tones)
const UNDERSTANDING_MODES = [
  { id: ANALYSIS_MODES.SUMMARY, icon: '📋', hebrew: 'סיכום', english: 'Summary', color: '#3b82f6', shortcut: '1' },
  { id: ANALYSIS_MODES.IYUN, icon: '🔍', hebrew: 'עיון', english: 'Deep Study', color: '#6366f1', shortcut: '2' },
  { id: ANALYSIS_MODES.MAREI_MEKOMOT, icon: '🔗', hebrew: 'מ״מ', english: 'Sources', color: '#0ea5e9', shortcut: '3' }
];

// Category 2: Application - Practical & ethical modes (green tones)
const APPLICATION_MODES = [
  { id: ANALYSIS_MODES.MUSSAR, icon: '💎', hebrew: 'מוסר', english: 'Ethics', color: '#10b981', shortcut: '4' },
  { id: ANALYSIS_MODES.MACHLOKET, icon: '⚔️', hebrew: 'מחלוקת', english: 'Disputes', color: '#059669', shortcut: '5' },
  { id: ANALYSIS_MODES.HALACHA, icon: '⚖️', hebrew: 'הלכה', english: 'Law', color: '#14b8a6', shortcut: '6' }
];

// Category 3: Advanced - Specialized study modes (purple/warm tones)
const ADVANCED_MODES = [
  { id: ANALYSIS_MODES.TAAMIM, icon: '🎵', hebrew: 'טעמים', english: 'Cantillation', color: '#8b5cf6', shortcut: '7' },
  { id: ANALYSIS_MODES.SHORESH, icon: '🌳', hebrew: 'שורש', english: 'Roots', color: '#a855f7', shortcut: '8' },
  { id: ANALYSIS_MODES.CHAVRUTA, icon: '🤝', hebrew: 'חברותא', english: 'Chavruta', color: '#f59e0b', shortcut: '9' },
  { id: ANALYSIS_MODES.SHIUR, icon: '👨‍🏫', hebrew: 'שיעור', english: 'Shiur Prep', color: '#ec4899', shortcut: '0' },
  { id: ANALYSIS_MODES.NAFKA_MINA, icon: '🎯', hebrew: 'נ״מ', english: 'Nafka Mina', color: '#ef4444', shortcut: '-' },
  { id: ANALYSIS_MODES.MEKABILOT, icon: '🔗', hebrew: 'מקבילות', english: 'Parallels', color: '#7c3aed', shortcut: '=' }
];

// For backward compatibility
const CORE_MODES = [...UNDERSTANDING_MODES, ...APPLICATION_MODES];
const ALL_MODES = [...CORE_MODES, ...ADVANCED_MODES];

// Category definitions for rendering
const MODE_CATEGORIES = [
  { id: 'understanding', title: 'הבנה Understanding', modes: UNDERSTANDING_MODES, color: '#3b82f6' },
  { id: 'application', title: 'יישום Application', modes: APPLICATION_MODES, color: '#10b981' },
  { id: 'advanced', title: 'מתקדם Advanced', modes: ADVANCED_MODES, color: '#8b5cf6' }
];

// ============================================================================
// ModeButton - Clean button with "Hebrew English" format
// ============================================================================

const ModeButton = memo(function ModeButton({ mode, isSelected, isCompleted, onClick, disabled }) {
  // Support both old (label/sublabel) and new (hebrew/english) formats
  const hebrewLabel = mode.hebrew || mode.label;
  const englishLabel = mode.english || mode.sublabel || '';

  return (
    <button
      type="button"
      className={`mode-btn ${isSelected ? 'active' : ''} ${isCompleted ? 'done' : ''}`}
      onClick={() => onClick(mode.id)}
      disabled={disabled}
      style={{ '--mode-color': mode.color }}
      title={`${hebrewLabel} ${englishLabel} (${mode.shortcut})`}
    >
      <span className="mode-icon">{mode.icon}</span>
      <span className="mode-label-combined">
        <span className="mode-hebrew">{hebrewLabel}</span>
        <span className="mode-english">{englishLabel}</span>
      </span>
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
// Main ModeGrid Component - Organized by Categories
// ============================================================================

const ModeGrid = ({
  selectedMode,
  onSelect,
  loading = false,
  isMultiVerse = false,
  completedModes = new Set(),
  textType = 'torah',
  // Keep these props for backward compatibility but don't use them
  favoriteModes = new Set(),
  onToggleFavorite,
  showGenesisMode = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState({
    understanding: true,
    application: true,
    advanced: false
  });

  const isTalmud = textType === 'talmud';
  const completedCount = completedModes.size;
  const totalModes = ALL_MODES.length;

  // Keyboard shortcuts for mode selection (1-9, 0, -, =)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      let index = -1;

      if (key >= '1' && key <= '9') {
        index = parseInt(key, 10) - 1;
      } else if (key === '0') {
        index = 9;
      } else if (key === '-') {
        index = 10;
      } else if (key === '=') {
        index = 11;
      }

      if (index >= 0 && index < ALL_MODES.length && !loading) {
        // Auto-expand advanced category if selecting an advanced mode
        if (index >= CORE_MODES.length && !expandedCategories.advanced) {
          setExpandedCategories(prev => ({ ...prev, advanced: true }));
        }
        onSelect(ALL_MODES[index].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onSelect, expandedCategories.advanced]);

  // Auto-expand advanced if an advanced mode is selected
  useEffect(() => {
    const isAdvancedSelected = ADVANCED_MODES.some(m => m.id === selectedMode);
    if (isAdvancedSelected && !expandedCategories.advanced) {
      setExpandedCategories(prev => ({ ...prev, advanced: true }));
    }
  }, [selectedMode, expandedCategories.advanced]);

  const handleSelect = useCallback((id) => {
    if (!loading) onSelect(id);
  }, [loading, onSelect]);

  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  return (
    <div className="mode-grid-categorized">
      {/* Header: context + progress */}
      {(isTalmud || isMultiVerse || completedCount > 0) && (
        <div className="mode-header">
          {(isTalmud || isMultiVerse) && (
            <span className={`mode-context ${isTalmud ? 'talmud' : ''}`}>
              {isTalmud ? '📜 Talmud' : '📄 Passage'}
            </span>
          )}
          {completedCount > 0 && (
            <span className="mode-progress">{completedCount}/{totalModes}</span>
          )}
        </div>
      )}

      {/* Render each category */}
      {MODE_CATEGORIES.map(category => (
        <div key={category.id} className={`mode-category mode-category-${category.id}`}>
          <button
            type="button"
            className={`category-header ${expandedCategories[category.id] ? 'expanded' : ''}`}
            onClick={() => toggleCategory(category.id)}
            style={{ '--category-color': category.color }}
          >
            <span className="category-title">{category.title}</span>
            <span className="category-toggle">{expandedCategories[category.id] ? '−' : '+'}</span>
          </button>

          {expandedCategories[category.id] && (
            <div className="category-modes">
              {category.modes.map(mode => (
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
          )}
        </div>
      ))}

      {/* Genesis hint */}
      {showGenesisMode && (
        <div className="genesis-hint">
          <span className="genesis-icon">🌍</span>
          <span>Genesis mode enabled</span>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mode-hint">Keys: 1-6, 7-0, -, =</div>
    </div>
  );
};

ModeGrid.propTypes = {
  selectedMode: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  isMultiVerse: PropTypes.bool,
  completedModes: PropTypes.instanceOf(Set),
  textType: PropTypes.oneOf(['torah', 'talmud']),
  favoriteModes: PropTypes.instanceOf(Set),
  onToggleFavorite: PropTypes.func,
  showGenesisMode: PropTypes.bool
};

export { ALL_MODES };
export default ModeGrid;
