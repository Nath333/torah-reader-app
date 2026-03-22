import React, { useState } from 'react';
import './NoteEditor.css';

/**
 * NoteEditor - Inline note editing component for verse annotations
 */
const NoteEditor = React.memo(({ note = '', onSave, onClose }) => {
  const [text, setText] = useState(note);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      onSave?.(text);
      onClose?.();
    }
  };

  const handleSave = () => {
    onSave?.(text);
    onClose?.();
  };

  return (
    <div className="note-editor" role="dialog" aria-label="Note editor">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add your note... (Ctrl+Enter to save, Escape to cancel)"
        rows={3}
        autoFocus
        aria-label="Note text"
      />
      <div className="note-editor-actions">
        <button
          className="note-editor-btn save"
          onClick={handleSave}
          aria-label="Save note"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Save
        </button>
        <button
          className="note-editor-btn cancel"
          onClick={onClose}
          aria-label="Cancel editing"
        >
          Cancel
        </button>
      </div>
      <p className="note-editor-hint">
        Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
      </p>
    </div>
  );
});

export default NoteEditor;
