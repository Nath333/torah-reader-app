/**
 * InteractiveWord + InteractiveText - Renders Hebrew/Aramaic words as clickable
 * spans. Click shows the word-preview popup, double-click triggers full lookup,
 * hover displays grammar info in a tooltip. InteractiveText splits a line and
 * delegates each segment to InteractiveWord.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { analyzeWord, getGrammarSummary } from '../../../../services/analysis/grammarAnalysisService';
import { hasHebrewLetters } from '../../../../utils/hebrewUtils';
import { cleanHebrewWord } from '../helpers/dafNavigation';

const InteractiveWord = React.memo(({ word, onWordClick, onWordHover, onShowPreview }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [grammarInfo, setGrammarInfo] = useState(null);
  const wordRef = useRef(null);

  const cleanedWord = useMemo(() => cleanHebrewWord(word), [word]);
  const isValidWord = useMemo(() => hasHebrewLetters(cleanedWord), [cleanedWord]);

  const handleMouseEnter = useCallback(() => {
    if (!isValidWord) return;
    setIsHovered(true);
    const analysis = analyzeWord(cleanedWord);
    if (analysis) {
      setGrammarInfo(getGrammarSummary(analysis));
    }
    onWordHover?.(cleanedWord, analysis);
  }, [cleanedWord, isValidWord, onWordHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setGrammarInfo(null);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isValidWord || !cleanedWord) return;

    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);

    const rect = wordRef.current?.getBoundingClientRect();
    const position = rect ? {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5
    } : null;

    onShowPreview?.(cleanedWord, position);
  }, [cleanedWord, isValidWord, onShowPreview]);

  // Double-click for immediate full lookup
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isValidWord || !cleanedWord) return;
    onWordClick?.(cleanedWord);
  }, [cleanedWord, isValidWord, onWordClick]);

  if (!isValidWord) {
    return <span className="non-interactive-word">{word}</span>;
  }

  return (
    <span
      ref={wordRef}
      className={`interactive-word ${isHovered ? 'hovered' : ''} ${isClicked ? 'clicked' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={grammarInfo || `לחץ לתצוגה מקדימה • לחץ פעמיים לחיפוש מלא`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick(e);
        if (e.key === ' ') handleDoubleClick(e);
      }}
    >
      {word}
    </span>
  );
});

export const InteractiveText = React.memo(({ text, onWordClick, onWordHover, onShowPreview }) => {
  const words = useMemo(() => {
    if (!text) return [];
    // Split by spaces but keep punctuation attached
    return text.split(/(\s+)/).filter(Boolean);
  }, [text]);

  return (
    <>
      {words.map((segment, idx) => {
        if (/^\s+$/.test(segment)) {
          return <span key={idx}>{segment}</span>;
        }
        return (
          <InteractiveWord
            key={idx}
            word={segment}
            onWordClick={onWordClick}
            onWordHover={onWordHover}
            onShowPreview={onShowPreview}
          />
        );
      })}
    </>
  );
});

export default InteractiveWord;
