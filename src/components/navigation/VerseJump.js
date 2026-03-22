import React, { useState, useRef, useEffect } from 'react';
import './VerseJump.css';

function VerseJump({ verses, onJumpToVerse, currentBook, currentChapter }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard shortcut (g for go to verse)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const verseNum = parseInt(searchValue, 10);
    if (verseNum && verseNum >= 1 && verseNum <= verses.length) {
      onJumpToVerse(verseNum);
      setIsOpen(false);
      setSearchValue('');
    }
  };

  const handleQuickJump = (verseNum) => {
    onJumpToVerse(verseNum);
    setIsOpen(false);
    setSearchValue('');
  };

  // Generate milestone verse numbers (every 5th verse)
  const milestones = verses
    ?.filter((_, i) => (i + 1) % 5 === 0 || i === 0 || i === verses.length - 1)
    .map(v => v.verse) || [];

  return (
    <div className="verse-jump-container" ref={containerRef}>
      <button
        className={`verse-jump-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Jump to verse (G)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span className="trigger-label">Go to</span>
        <kbd className="shortcut-hint">G</kbd>
      </button>

      {isOpen && (
        <div className="verse-jump-dropdown">
          <div className="jump-header">
            <span className="jump-title">Jump to Verse</span>
            <span className="jump-context">{currentBook} {currentChapter}</span>
          </div>

          <form onSubmit={handleSubmit} className="jump-form">
            <div className="jump-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="number"
                min="1"
                max={verses?.length || 999}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={`1 - ${verses?.length || '...'}`}
                className="jump-input"
              />
              <button type="submit" className="jump-go-btn" disabled={!searchValue}>
                Go
              </button>
            </div>
          </form>

          <div className="quick-jumps">
            <span className="quick-label">Quick jump:</span>
            <div className="milestone-buttons">
              {milestones.map(num => (
                <button
                  key={num}
                  className="milestone-btn"
                  onClick={() => handleQuickJump(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="jump-hint">
            <kbd>Enter</kbd> to jump <kbd>Esc</kbd> to close
          </div>
        </div>
      )}
    </div>
  );
}

export default VerseJump;
