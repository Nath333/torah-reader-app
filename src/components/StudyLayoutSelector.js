import React, { useState } from 'react';
import './StudyLayoutSelector.css';

/**
 * StudyLayoutSelector - Choose study layout mode
 *
 * Provides a professional selector to switch between different text display layouts:
 * - Standard Reader (modern scrollable)
 * - Mikraot Gedolot (traditional Torah with commentaries)
 * - Vilna Shas (authentic Talmud page)
 * - Mishnah Layout (traditional Mishnah with commentaries)
 * - Split Pane (text + selected commentary)
 * - Focus Mode (distraction-free reading)
 */

const LAYOUT_OPTIONS = {
  torah: [
    {
      id: 'reader',
      name: 'Standard Reader',
      hebrewName: 'קריאה רגילה',
      icon: '📖',
      description: 'Modern scrollable view with verse-by-verse display'
    },
    {
      id: 'mikraot-gedolot',
      name: 'Mikraot Gedolot',
      hebrewName: 'מקראות גדולות',
      icon: '📜',
      description: 'Traditional Torah page with Rashi, Ramban, Ibn Ezra, Sforno'
    },
    {
      id: 'split',
      name: 'Split View',
      hebrewName: 'תצוגה מפוצלת',
      icon: '📑',
      description: 'Text on one side, commentary on the other'
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      hebrewName: 'מצב מיקוד',
      icon: '🎯',
      description: 'Distraction-free reading, one verse at a time'
    }
  ],
  talmud: [
    {
      id: 'reader',
      name: 'Standard Reader',
      hebrewName: 'קריאה רגילה',
      icon: '📖',
      description: 'Modern scrollable view'
    },
    {
      id: 'vilna-shas',
      name: 'Vilna Shas',
      hebrewName: 'צורת הדף',
      icon: '📚',
      description: 'Authentic Vilna Talmud layout with Rashi, Tosafot, Maharsha'
    },
    {
      id: 'split',
      name: 'Split View',
      hebrewName: 'תצוגה מפוצלת',
      icon: '📑',
      description: 'Gemara on one side, commentary on the other'
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      hebrewName: 'מצב מיקוד',
      icon: '🎯',
      description: 'Distraction-free reading'
    }
  ],
  mishnah: [
    {
      id: 'reader',
      name: 'Standard Reader',
      hebrewName: 'קריאה רגילה',
      icon: '📖',
      description: 'Modern scrollable view'
    },
    {
      id: 'mishnah-layout',
      name: 'Traditional Layout',
      hebrewName: 'צורת המשנה',
      icon: '📜',
      description: 'Classic Mishnah page with Bartenura and Tosfot Yom Tov'
    },
    {
      id: 'split',
      name: 'Split View',
      hebrewName: 'תצוגה מפוצלת',
      icon: '📑',
      description: 'Mishnah on one side, commentary on the other'
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      hebrewName: 'מצב מיקוד',
      icon: '🎯',
      description: 'Distraction-free reading'
    }
  ],
  tanach: [
    {
      id: 'reader',
      name: 'Standard Reader',
      hebrewName: 'קריאה רגילה',
      icon: '📖',
      description: 'Modern scrollable view with translations'
    },
    {
      id: 'split',
      name: 'Split View',
      hebrewName: 'תצוגה מפוצלת',
      icon: '📑',
      description: 'Text on one side, commentary on the other'
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      hebrewName: 'מצב מיקוד',
      icon: '🎯',
      description: 'Distraction-free reading'
    }
  ]
};

const StudyLayoutSelector = ({
  textType = 'torah', // 'torah', 'talmud', 'mishnah', 'tanach'
  currentLayout = 'reader',
  onLayoutChange,
  isOpen,
  onClose,
  showTranslation = false,
  onToggleTranslation
}) => {
  const [hoveredOption, setHoveredOption] = useState(null);

  const options = LAYOUT_OPTIONS[textType] || LAYOUT_OPTIONS.torah;

  const handleLayoutSelect = (layoutId) => {
    onLayoutChange(layoutId);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="study-layout-selector-overlay" onClick={onClose}>
      <div className="study-layout-selector" onClick={(e) => e.stopPropagation()}>
        <div className="sls-header">
          <h2 className="sls-title">
            <span className="sls-title-icon">📚</span>
            <span>בחר תצוגה</span>
            <span className="sls-title-sub">Choose Layout</span>
          </h2>
          <button className="sls-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sls-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={`sls-option ${currentLayout === option.id ? 'active' : ''}`}
              onClick={() => handleLayoutSelect(option.id)}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div className="sls-option-icon">{option.icon}</div>
              <div className="sls-option-content">
                <div className="sls-option-name">{option.hebrewName}</div>
                <div className="sls-option-english">{option.name}</div>
                {(hoveredOption === option.id || currentLayout === option.id) && (
                  <div className="sls-option-desc">{option.description}</div>
                )}
              </div>
              {currentLayout === option.id && (
                <div className="sls-option-check">✓</div>
              )}
            </button>
          ))}
        </div>

        <div className="sls-settings">
          <label className="sls-toggle">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={(e) => onToggleTranslation?.(e.target.checked)}
            />
            <span className="sls-toggle-slider"></span>
            <span className="sls-toggle-label">הצג תרגום / Show Translation</span>
          </label>
        </div>

        <div className="sls-footer">
          <span className="sls-hint">
            Tip: Use <kbd>Ctrl</kbd>+<kbd>L</kbd> to quickly switch layouts
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudyLayoutSelector;
