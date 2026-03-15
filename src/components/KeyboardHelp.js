import React from 'react';
import './KeyboardHelp.css';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Focus search' },
  { keys: ['Ctrl', 'B'], description: 'Toggle bookmarks' },
  { keys: ['Ctrl', 'H'], description: 'Toggle history' },
  { keys: ['Ctrl', 'C'], description: 'Toggle compare mode' },
  { keys: ['Ctrl', 'D'], description: 'Toggle dark mode' },
  { keys: ['Ctrl', '←'], description: 'Previous chapter' },
  { keys: ['Ctrl', '→'], description: 'Next chapter' },
  { keys: ['Esc'], description: 'Return to reader' }
];

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
          {shortcuts.map(({ keys, description }, index) => (
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

        <div className="keyboard-help-footer">
          <span>Press <kbd>?</kbd> to toggle this help</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelp;
