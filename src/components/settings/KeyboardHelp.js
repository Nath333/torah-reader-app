import React from 'react';
import './KeyboardHelp.css';

const shortcuts = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Focus search', category: 'Navigation' },
  { keys: ['Ctrl', '←'], description: 'Previous chapter', category: 'Navigation' },
  { keys: ['Ctrl', '→'], description: 'Next chapter', category: 'Navigation' },
  { keys: ['Esc'], description: 'Return to reader / Clear selection', category: 'Navigation' },

  // Study Tools
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle Scholar Mode', category: 'Study' },
  { keys: ['Ctrl', 'B'], description: 'Toggle bookmarks', category: 'Study' },
  { keys: ['Ctrl', 'H'], description: 'Toggle history', category: 'Study' },
  { keys: ['Ctrl', 'V'], description: 'Open vocabulary', category: 'Study' },

  // Selection Mode
  { keys: ['Enter'], description: 'Open Scholar Mode', category: 'Selection' },
  { keys: ['Ctrl', 'A'], description: 'Select all verses', category: 'Selection' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected verses', category: 'Selection' },
  { keys: ['Shift', 'Click'], description: 'Range select verses', category: 'Selection' },

  // Display
  { keys: ['Ctrl', 'D'], description: 'Toggle dark mode', category: 'Display' },
  { keys: ['Ctrl', 'F'], description: 'Toggle focus mode', category: 'Display' },

  // AI Analysis
  { keys: ['Ctrl', 'Enter'], description: 'Run analysis (in Scholar Mode)', category: 'Analysis' }
];

// Group shortcuts by category
const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  const category = shortcut.category || 'General';
  if (!acc[category]) acc[category] = [];
  acc[category].push(shortcut);
  return acc;
}, {});

const categoryIcons = {
  Navigation: '🧭',
  Study: '📚',
  Selection: '✓',
  Display: '🎨',
  Analysis: '🧠'
};

const KeyboardHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="keyboard-help-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="keyboard-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-help-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shortcuts-list">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="shortcut-category">
              <h4 className="category-title">
                <span className="category-icon">{categoryIcons[category] || '⌨️'}</span>
                {category}
              </h4>
              {categoryShortcuts.map(({ keys, description }, index) => (
                <div key={index} className="shortcut-item">
                  <div className="shortcut-keys">
                    {keys.map((key, i) => (
                      <React.Fragment key={i}>
                        <kbd>{key}</kbd>
                        {i < keys.length - 1 && <span className="key-separator">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="shortcut-description">{description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="keyboard-help-footer">
          <span>Press <kbd>?</kbd> to toggle this help</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;
