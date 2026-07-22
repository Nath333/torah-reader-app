/**
 * WordPreviewPopup - Inline popup showing quick definition + grammar for a
 * clicked Hebrew/Aramaic word. Offers Full Lookup, Save, and Copy actions.
 */
import React, { useEffect, useRef, useState } from 'react';
import { analyzeWord, getGrammarSummary } from '../../../../services/analysis/grammarAnalysisService';
import { getQuickDefinition } from '../helpers/dafNavigation';

const WordPreviewPopup = React.memo(({ word, position, onClose, onFullLookup, onSaveWord, isSaved }) => {
  const popupRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [definition, setDefinition] = useState(null);
  const [grammar, setGrammar] = useState(null);

  // Keep onClose ref updated without re-adding listeners
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!word) return;

    const def = getQuickDefinition(word);
    setDefinition(def);

    const analysis = analyzeWord(word);
    if (analysis) {
      setGrammar(getGrammarSummary(analysis));
    }
  }, [word]);

  // Listeners added once, use ref for current callback
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onCloseRef.current();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!word) return null;

  return (
    <div
      ref={popupRef}
      className="word-preview-popup"
      style={{
        top: position?.y || 0,
        left: position?.x || 0
      }}
    >
      <div className="popup-header">
        <span className="popup-word" dir="rtl">{word}</span>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>

      {grammar && (
        <div className="popup-grammar">
          <span className="grammar-tag">{grammar}</span>
        </div>
      )}

      {definition ? (
        <div className="popup-definition">
          <span className="def-source">{definition.source}</span>
          {definition.pos && <span className="def-pos">{definition.pos}</span>}
          <p className="def-text">{definition.definition.substring(0, 120)}{definition.definition.length > 120 ? '...' : ''}</p>
        </div>
      ) : (
        <div className="popup-no-def">
          <span>Click "Full Lookup" for detailed search</span>
        </div>
      )}

      <div className="popup-actions">
        <button
          className="popup-btn primary"
          onClick={() => onFullLookup(word)}
        >
          🔍 Full Lookup
        </button>
        <button
          className="popup-btn"
          onClick={() => onSaveWord(word)}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : '💾 Save'}
        </button>
        <button
          className="popup-btn"
          onClick={() => {
            navigator.clipboard.writeText(word);
            onClose();
          }}
        >
          📋 Copy
        </button>
      </div>
    </div>
  );
});

export default WordPreviewPopup;
