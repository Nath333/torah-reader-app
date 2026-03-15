import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './FocusMode.css';

// Theme options - including Jewish scholarly themes
const THEMES = {
  dark: { name: 'Dark', icon: '🌙' },
  light: { name: 'Light', icon: '☀️' },
  sepia: { name: 'Sepia', icon: '📜' },
  parchment: { name: 'Klaf', icon: '📖' },
  midnight: { name: 'Midnight', icon: '🌌' }
};

// Auto-scroll speed options (in seconds)
const SCROLL_SPEEDS = [3, 5, 8, 12, 20];

// Study view modes
const STUDY_MODES = {
  single: { name: 'Single Verse', icon: '1️⃣' },
  context: { name: 'With Context', icon: '📖' },
  learning: { name: 'Learning Mode', icon: '🎓' }
};

// Meforshim (Commentators) information
const MEFORSHIM = {
  rashi: {
    name: 'רש"י',
    fullName: 'Rabbi Shlomo Yitzchaki',
    era: 'Rishonim (1040-1105)',
    style: 'Peshat - Plain meaning',
    description: 'The foundational commentary, essential for understanding Torah'
  },
  onkelos: {
    name: 'אונקלוס',
    fullName: 'Targum Onkelos',
    era: 'Tannaim (c. 35-120 CE)',
    style: 'Aramaic Translation',
    description: 'Authoritative Aramaic translation of the Torah'
  },
  ramban: {
    name: 'רמב"ן',
    fullName: 'Nachmanides',
    era: 'Rishonim (1194-1270)',
    style: 'Philosophical & Kabbalistic',
    description: 'Deep mystical and philosophical insights'
  },
  ibn_ezra: {
    name: 'אבן עזרא',
    fullName: 'Abraham ibn Ezra',
    era: 'Rishonim (1089-1167)',
    style: 'Grammatical & Scientific',
    description: 'Linguistic analysis and rational interpretation'
  },
  sforno: {
    name: 'ספורנו',
    fullName: 'Ovadiah Sforno',
    era: 'Rishonim (1475-1550)',
    style: 'Moral & Philosophical',
    description: 'Ethical and philosophical commentary'
  },
  rashbam: {
    name: 'רשב"ם',
    fullName: 'Samuel ben Meir',
    era: 'Rishonim (1085-1158)',
    style: 'Strict Peshat',
    description: 'Grandson of Rashi, focuses on literal meaning'
  },
  ohr_hachaim: {
    name: 'אור החיים',
    fullName: 'Chaim ibn Attar',
    era: 'Acharonim (1696-1743)',
    style: 'Kabbalistic & Ethical',
    description: 'Mystical interpretations with ethical guidance'
  }
};

// Gematria calculation
const GEMATRIA_VALUES = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
  'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
  'ש': 300, 'ת': 400
};

// Calculate gematria for a word or phrase
const calculateGematria = (text) => {
  if (!text) return 0;
  return text.split('').reduce((sum, char) => sum + (GEMATRIA_VALUES[char] || 0), 0);
};

// Get gematria for each word
const getWordGematria = (text) => {
  if (!text) return [];
  return text.split(/\s+/).filter(w => w.length > 0).map(word => ({
    word,
    value: calculateGematria(word)
  }));
};

// Parsha data (sample - in production would come from API)
const PARSHA_INFO = {
  'Genesis': {
    1: { parsha: 'בראשית', english: 'Bereishit', aliyah: 1 },
    2: { parsha: 'בראשית', english: 'Bereishit', aliyah: 1 },
    3: { parsha: 'בראשית', english: 'Bereishit', aliyah: 2 },
    6: { parsha: 'נח', english: 'Noach', aliyah: 1 },
    12: { parsha: 'לך לך', english: 'Lech Lecha', aliyah: 1 }
  },
  'Exodus': {
    1: { parsha: 'שמות', english: 'Shemot', aliyah: 1 },
    13: { parsha: 'בשלח', english: 'Beshalach', aliyah: 1 },
    20: { parsha: 'יתרו', english: 'Yitro', aliyah: 3 }
  }
};

const FocusMode = React.memo(function FocusMode({
  verses,
  onkelos,
  selectedBook,
  selectedChapter,
  showOnkelos,
  isActive,
  onClose,
  onPrevChapter,
  onNextChapter,
  onBookmarkVerse,
  verseNotes
}) {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [fontSize, setFontSize] = useState('large');
  const [showTranslation, setShowTranslation] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(5);
  const [theme, setTheme] = useState('dark');
  const [zenMode, setZenMode] = useState(false);
  const [showVerseJump, setShowVerseJump] = useState(false);
  const [verseJumpValue, setVerseJumpValue] = useState('');
  const [wordHighlightMode, setWordHighlightMode] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Professional study features
  const [studyMode, setStudyMode] = useState('single'); // single, context, learning
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [highlightedVerses, setHighlightedVerses] = useState(new Set());
  const [revealTranslation, setRevealTranslation] = useState(false);
  const [versesStudied, setVersesStudied] = useState(new Set());
  const [showStats, setShowStats] = useState(false);

  // Jewish scholarly study features
  const [showMeforshimPanel, setShowMeforshimPanel] = useState(false);
  const [selectedMeforshim, setSelectedMeforshim] = useState(['rashi', 'onkelos']);
  const [showGematria, setShowGematria] = useState(false);
  const [showParsha, setShowParsha] = useState(true);
  const [useRashiScript, setUseRashiScript] = useState(false);
  const [showCrossRefs, setShowCrossRefs] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  const containerRef = useRef(null);
  const verseJumpInputRef = useRef(null);
  const notesInputRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });

  const currentVerse = verses?.[currentVerseIndex];
  const currentOnkelos = onkelos?.find(o => o.verse === currentVerse?.verse);

  // Get context verses (previous and next)
  const contextVerses = useMemo(() => {
    if (!verses || studyMode !== 'context') return null;
    const prev = currentVerseIndex > 0 ? verses[currentVerseIndex - 1] : null;
    const next = currentVerseIndex < verses.length - 1 ? verses[currentVerseIndex + 1] : null;
    return { prev, current: currentVerse, next };
  }, [verses, currentVerseIndex, studyMode, currentVerse]);

  // Track studied verses
  useEffect(() => {
    if (currentVerse) {
      setVersesStudied(prev => new Set([...prev, currentVerse.verse]));
    }
  }, [currentVerse]);

  // Load existing note for current verse
  useEffect(() => {
    if (verseNotes && currentVerse) {
      const existingNote = verseNotes.getNote?.(selectedBook, selectedChapter, currentVerse.verse);
      setCurrentNote(existingNote || '');
    }
  }, [currentVerse, verseNotes, selectedBook, selectedChapter]);

  // Save note function
  const saveNote = useCallback(() => {
    if (verseNotes?.setNote && currentVerse) {
      verseNotes.setNote(selectedBook, selectedChapter, currentVerse.verse, currentNote);
    }
  }, [verseNotes, selectedBook, selectedChapter, currentVerse, currentNote]);

  // Toggle verse highlight
  const toggleHighlight = useCallback((verseNum) => {
    setHighlightedVerses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(verseNum)) {
        newSet.delete(verseNum);
      } else {
        newSet.add(verseNum);
      }
      return newSet;
    });
  }, []);

  // Calculate study stats
  const studyStats = useMemo(() => ({
    versesStudied: versesStudied.size,
    totalVerses: verses?.length || 0,
    percentComplete: verses?.length ? Math.round((versesStudied.size / verses.length) * 100) : 0,
    highlightedCount: highlightedVerses.size,
    readingTimeFormatted: `${Math.floor(readingTime / 60)}:${(readingTime % 60).toString().padStart(2, '0')}`
  }), [versesStudied, verses?.length, highlightedVerses.size, readingTime]);

  // Split Hebrew text into words for word-by-word highlighting
  const hebrewWords = useMemo(() => {
    if (!currentVerse?.hebrew) return [];
    return currentVerse.hebrew.split(/\s+/).filter(w => w.length > 0);
  }, [currentVerse?.hebrew]);

  // Gematria calculations for current verse
  const verseGematria = useMemo(() => {
    if (!currentVerse?.hebrew) return { total: 0, words: [] };
    const words = getWordGematria(currentVerse.hebrew);
    const total = calculateGematria(currentVerse.hebrew);
    return { total, words };
  }, [currentVerse?.hebrew]);

  // Get current parsha info
  const currentParsha = useMemo(() => {
    const bookInfo = PARSHA_INFO[selectedBook];
    if (!bookInfo) return null;
    // Find the parsha for current chapter
    const chapters = Object.keys(bookInfo).map(Number).sort((a, b) => b - a);
    const relevantChapter = chapters.find(ch => ch <= selectedChapter);
    return relevantChapter ? bookInfo[relevantChapter] : null;
  }, [selectedBook, selectedChapter]);

  // Smooth verse transition
  const navigateToVerse = useCallback((newIndex) => {
    if (newIndex < 0 || newIndex >= verses?.length) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentVerseIndex(newIndex);
      setCurrentWordIndex(0);
      setIsTransitioning(false);
    }, 150);
  }, [verses?.length]);

  // Jump to specific verse
  const handleVerseJump = useCallback((verseNum) => {
    const index = verses?.findIndex(v => v.verse === parseInt(verseNum));
    if (index !== -1) {
      navigateToVerse(index);
      setShowVerseJump(false);
      setVerseJumpValue('');
    }
  }, [verses, navigateToVerse]);

  // Touch/Swipe handlers
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    touchEndRef.current = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const minSwipeDistance = 50;

    // Horizontal swipe (navigate verses)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe right - previous verse (RTL reading)
        if (currentVerseIndex < verses.length - 1) {
          navigateToVerse(currentVerseIndex + 1);
        }
      } else {
        // Swipe left - next verse
        if (currentVerseIndex > 0) {
          navigateToVerse(currentVerseIndex - 1);
        }
      }
    }
  }, [currentVerseIndex, verses?.length, navigateToVerse]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      // If verse jump is open, handle input
      if (showVerseJump) {
        if (e.key === 'Escape') {
          setShowVerseJump(false);
          setVerseJumpValue('');
        } else if (e.key === 'Enter' && verseJumpValue) {
          handleVerseJump(verseJumpValue);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          if (wordHighlightMode && currentWordIndex > 0) {
            setCurrentWordIndex(prev => prev - 1);
          } else {
            navigateToVerse(currentVerseIndex - 1);
          }
          break;
        case 'ArrowDown':
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          if (wordHighlightMode && currentWordIndex < hebrewWords.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
          } else if (currentVerseIndex < verses.length - 1) {
            navigateToVerse(currentVerseIndex + 1);
          }
          break;
        case 'Home':
          e.preventDefault();
          navigateToVerse(0);
          break;
        case 'End':
          e.preventDefault();
          navigateToVerse(verses.length - 1);
          break;
        case 'Escape':
          if (zenMode) {
            setZenMode(false);
          } else {
            onClose();
          }
          break;
        case 't':
        case 'T':
          setShowTranslation(prev => !prev);
          break;
        case 'z':
        case 'Z':
          setZenMode(prev => !prev);
          break;
        case 'g':
        case 'G':
          setShowVerseJump(true);
          break;
        case 'w':
        case 'W':
          setWordHighlightMode(prev => !prev);
          setCurrentWordIndex(0);
          break;
        case 'b':
        case 'B':
          if (onBookmarkVerse && currentVerse) {
            onBookmarkVerse(currentVerse);
          }
          break;
        case 'c':
        case 'C':
          setShowTimer(prev => !prev);
          break;
        case 'n':
        case 'N':
          setShowNotesPanel(prev => !prev);
          break;
        case 's':
        case 'S':
          setShowStats(prev => !prev);
          break;
        case 'h':
        case 'H':
          if (currentVerse) {
            toggleHighlight(currentVerse.verse);
          }
          break;
        case 'm':
        case 'M':
          // Cycle through study modes
          setStudyMode(prev => {
            if (prev === 'single') return 'context';
            if (prev === 'context') return 'learning';
            return 'single';
          });
          break;
        case 'r':
        case 'R':
          if (studyMode === 'learning') {
            setRevealTranslation(prev => !prev);
          } else {
            setUseRashiScript(prev => !prev);
          }
          break;
        case 'p':
        case 'P':
          setShowMeforshimPanel(prev => !prev);
          break;
        case 'x':
        case 'X':
          setShowGematria(prev => !prev);
          break;
        case 'i':
        case 'I':
          setShowParsha(prev => !prev);
          break;
        case 'o':
        case 'O':
          setShowCrossRefs(prev => !prev);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setFontSize(prev => {
            if (prev === 'medium') return 'large';
            if (prev === 'large') return 'xlarge';
            return 'xlarge';
          });
          break;
        case '-':
          e.preventDefault();
          setFontSize(prev => {
            if (prev === 'xlarge') return 'large';
            if (prev === 'large') return 'medium';
            return 'medium';
          });
          break;
        case '[':
          e.preventDefault();
          setAutoScrollSpeed(prev => {
            const idx = SCROLL_SPEEDS.indexOf(prev);
            return SCROLL_SPEEDS[Math.max(0, idx - 1)];
          });
          break;
        case ']':
          e.preventDefault();
          setAutoScrollSpeed(prev => {
            const idx = SCROLL_SPEEDS.indexOf(prev);
            return SCROLL_SPEEDS[Math.min(SCROLL_SPEEDS.length - 1, idx + 1)];
          });
          break;
        default:
          // Number keys for quick theme switch
          if (e.key >= '1' && e.key <= '4') {
            const themes = Object.keys(THEMES);
            setTheme(themes[parseInt(e.key) - 1] || 'dark');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentVerseIndex, verses?.length, onClose, showVerseJump, verseJumpValue, handleVerseJump, zenMode, wordHighlightMode, currentWordIndex, hebrewWords.length, navigateToVerse, onBookmarkVerse, currentVerse, toggleHighlight, studyMode]);

  // Auto scroll timer with adjustable speed
  useEffect(() => {
    if (!autoScroll || !isActive) return;

    const interval = setInterval(() => {
      if (wordHighlightMode) {
        // In word mode, advance words then verses
        if (currentWordIndex < hebrewWords.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
        } else if (currentVerseIndex < verses.length - 1) {
          navigateToVerse(currentVerseIndex + 1);
        } else {
          setAutoScroll(false);
        }
      } else {
        if (currentVerseIndex < verses.length - 1) {
          navigateToVerse(currentVerseIndex + 1);
        } else {
          setAutoScroll(false);
        }
      }
    }, wordHighlightMode ? autoScrollSpeed * 200 : autoScrollSpeed * 1000);

    return () => clearInterval(interval);
  }, [autoScroll, isActive, currentVerseIndex, verses?.length, autoScrollSpeed, wordHighlightMode, currentWordIndex, hebrewWords.length, navigateToVerse]);

  // Reading timer
  useEffect(() => {
    if (!isActive || !showTimer) return;

    const interval = setInterval(() => {
      setReadingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, showTimer]);

  // Reset verse index when chapter changes
  useEffect(() => {
    setCurrentVerseIndex(0);
    setCurrentWordIndex(0);
    setReadingTime(0);
  }, [selectedBook, selectedChapter]);

  // Focus verse jump input when shown
  useEffect(() => {
    if (showVerseJump && verseJumpInputRef.current) {
      verseJumpInputRef.current.focus();
    }
  }, [showVerseJump]);

  const goToVerse = useCallback((index) => {
    navigateToVerse(index);
  }, [navigateToVerse]);

  // Format reading time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cycle through themes
  const cycleTheme = () => {
    const themes = Object.keys(THEMES);
    const currentIdx = themes.indexOf(theme);
    setTheme(themes[(currentIdx + 1) % themes.length]);
  };

  if (!isActive || !verses?.length) return null;

  return (
    <div
      className={`focus-mode ${fontSize} theme-${theme} ${zenMode ? 'zen-mode' : ''} ${isTransitioning ? 'transitioning' : ''} study-mode-${studyMode}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Verse Jump Modal */}
      {showVerseJump && (
        <div className="verse-jump-modal" onClick={() => setShowVerseJump(false)}>
          <div className="verse-jump-content" onClick={e => e.stopPropagation()}>
            <label>Jump to verse:</label>
            <input
              ref={verseJumpInputRef}
              type="number"
              min="1"
              max={verses.length}
              value={verseJumpValue}
              onChange={(e) => setVerseJumpValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerseJump(verseJumpValue);
                if (e.key === 'Escape') setShowVerseJump(false);
              }}
              placeholder={`1-${verses.length}`}
            />
            <div className="verse-jump-actions">
              <button onClick={() => handleVerseJump(verseJumpValue)}>Go</button>
              <button onClick={() => setShowVerseJump(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Study Statistics Panel */}
      {showStats && (
        <div className="study-stats-panel">
          <div className="stats-header">
            <h4>📊 Study Statistics</h4>
            <button className="close-stats" onClick={() => setShowStats(false)}>×</button>
          </div>
          <div className="stats-content">
            <div className="stat-item">
              <span className="stat-label">Verses Studied</span>
              <span className="stat-value">{studyStats.versesStudied} / {studyStats.totalVerses}</span>
            </div>
            <div className="stat-progress">
              <div className="stat-progress-fill" style={{ width: `${studyStats.percentComplete}%` }} />
            </div>
            <div className="stat-item">
              <span className="stat-label">Progress</span>
              <span className="stat-value">{studyStats.percentComplete}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Highlighted</span>
              <span className="stat-value">{studyStats.highlightedCount} verses</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Study Time</span>
              <span className="stat-value">{studyStats.readingTimeFormatted}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes Panel */}
      {showNotesPanel && (
        <div className="notes-panel">
          <div className="notes-header">
            <h4>📝 Notes - Verse {currentVerse?.verse}</h4>
            <button className="close-notes" onClick={() => setShowNotesPanel(false)}>×</button>
          </div>
          <textarea
            ref={notesInputRef}
            className="notes-textarea"
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Add your study notes here... (auto-saves)"
          />
          <div className="notes-footer">
            <span className="notes-hint">Notes auto-save when you leave this field</span>
            <button className="save-notes-btn" onClick={saveNote}>Save</button>
          </div>
        </div>
      )}

      {/* Meforshim (Commentary) Panel */}
      {showMeforshimPanel && (
        <div className="meforshim-panel">
          <div className="meforshim-header">
            <h4>📚 מפרשים - Meforshim</h4>
            <button className="close-meforshim" onClick={() => setShowMeforshimPanel(false)}>×</button>
          </div>
          <div className="meforshim-selector">
            {Object.entries(MEFORSHIM).map(([key, info]) => (
              <button
                key={key}
                className={`mefaresh-btn ${selectedMeforshim.includes(key) ? 'active' : ''}`}
                onClick={() => {
                  setSelectedMeforshim(prev =>
                    prev.includes(key)
                      ? prev.filter(m => m !== key)
                      : [...prev, key]
                  );
                }}
                title={info.description}
              >
                <span className="mefaresh-name">{info.name}</span>
                <span className="mefaresh-era">{info.era.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <div className="meforshim-content">
            {selectedMeforshim.map(key => {
              const info = MEFORSHIM[key];
              return (
                <div key={key} className="mefaresh-section">
                  <div className="mefaresh-title">
                    <span className="mefaresh-hebrew">{info.name}</span>
                    <span className="mefaresh-english">{info.fullName}</span>
                    <span className="mefaresh-style">{info.style}</span>
                  </div>
                  <div className="mefaresh-text" dir="rtl">
                    {key === 'onkelos' && currentOnkelos ? (
                      <p>{currentOnkelos.aramaic}</p>
                    ) : (
                      <p className="mefaresh-placeholder">
                        {info.description}
                        <br />
                        <span className="mefaresh-note">
                          Commentary text for {selectedBook} {selectedChapter}:{currentVerse?.verse}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gematria Panel */}
      {showGematria && (
        <div className="gematria-panel">
          <div className="gematria-header">
            <h4>🔢 גימטריא - Gematria</h4>
            <button className="close-gematria" onClick={() => setShowGematria(false)}>×</button>
          </div>
          <div className="gematria-content">
            <div className="gematria-total">
              <span className="gematria-label">סה"כ פסוק</span>
              <span className="gematria-value">{verseGematria.total}</span>
            </div>
            <div className="gematria-words">
              {verseGematria.words.map((item, idx) => (
                <div
                  key={idx}
                  className={`gematria-word ${selectedWord === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedWord(selectedWord === idx ? null : idx)}
                >
                  <span className="gematria-word-text">{item.word}</span>
                  <span className="gematria-word-value">{item.value}</span>
                </div>
              ))}
            </div>
            {selectedWord !== null && verseGematria.words[selectedWord] && (
              <div className="gematria-breakdown">
                <span className="breakdown-title">Letter breakdown:</span>
                <div className="breakdown-letters">
                  {verseGematria.words[selectedWord].word.split('').map((char, i) => (
                    <span key={i} className="breakdown-letter">
                      <span className="letter">{char}</span>
                      <span className="letter-value">{GEMATRIA_VALUES[char] || 0}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cross References Panel */}
      {showCrossRefs && (
        <div className="crossrefs-panel">
          <div className="crossrefs-header">
            <h4>🔗 הפניות - Cross References</h4>
            <button className="close-crossrefs" onClick={() => setShowCrossRefs(false)}>×</button>
          </div>
          <div className="crossrefs-content">
            <div className="crossref-category">
              <h5>📖 תורה - Torah</h5>
              <div className="crossref-items">
                <span className="crossref-item">See also: Deut. 5:6-21 (Ten Commandments)</span>
                <span className="crossref-item">Related: Lev. 19:18 (Love your neighbor)</span>
              </div>
            </div>
            <div className="crossref-category">
              <h5>📜 נביאים - Prophets</h5>
              <div className="crossref-items">
                <span className="crossref-item">Isaiah 1:2 - Heaven and Earth witnesses</span>
              </div>
            </div>
            <div className="crossref-category">
              <h5>📚 תלמוד - Talmud</h5>
              <div className="crossref-items">
                <span className="crossref-item">Berakhot 12a - This verse discussed</span>
                <span className="crossref-item">Shabbat 88b - Related teaching</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reading Timer Display */}
      {showTimer && (
        <div className="reading-timer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>{formatTime(readingTime)}</span>
        </div>
      )}

      {/* Top bar - hidden in zen mode */}
      {!zenMode && (
        <div className="focus-header">
          <div className="focus-location">
            <span className="book-name">{selectedBook}</span>
            <span className="chapter-verse">{selectedChapter}:{currentVerse?.verse}</span>
            {/* Parsha Info */}
            {showParsha && currentParsha && (
              <div className="parsha-badge">
                <span className="parsha-hebrew">{currentParsha.parsha}</span>
                <span className="parsha-english">{currentParsha.english}</span>
                <span className="aliyah-marker">עליה {currentParsha.aliyah}</span>
              </div>
            )}
          </div>

          <div className="focus-controls">
            {/* Theme toggle */}
            <button
              className="control-btn theme-btn"
              onClick={cycleTheme}
              title={`Theme: ${THEMES[theme].name} (1-4)`}
            >
              <span className="theme-icon">{THEMES[theme].icon}</span>
            </button>

            {/* Auto-scroll with speed */}
            <div className="auto-scroll-controls">
              <button
                className={`control-btn ${autoScroll ? 'active' : ''}`}
                onClick={() => setAutoScroll(!autoScroll)}
                title={autoScroll ? 'Stop auto-scroll' : 'Start auto-scroll'}
              >
                {autoScroll ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
              {autoScroll && (
                <span className="speed-indicator">{autoScrollSpeed}s</span>
              )}
            </div>

            {/* Word highlight mode */}
            <button
              className={`control-btn ${wordHighlightMode ? 'active' : ''}`}
              onClick={() => { setWordHighlightMode(!wordHighlightMode); setCurrentWordIndex(0); }}
              title="Word-by-word mode (W)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h10M4 17h12" />
              </svg>
            </button>

            {/* Translation toggle */}
            <button
              className={`control-btn ${showTranslation ? 'active' : ''}`}
              onClick={() => setShowTranslation(!showTranslation)}
              title="Toggle translation (T)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 8l6 6m-6 0l6-6m5 0v12m4-8h-4m0 0h-4m4 0v8" />
              </svg>
            </button>

            {/* Timer toggle */}
            <button
              className={`control-btn ${showTimer ? 'active' : ''}`}
              onClick={() => setShowTimer(!showTimer)}
              title="Show reading timer (C)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </button>

            {/* Study mode toggle */}
            <button
              className={`control-btn study-mode-btn ${studyMode !== 'single' ? 'active' : ''}`}
              onClick={() => setStudyMode(prev => prev === 'single' ? 'context' : prev === 'context' ? 'learning' : 'single')}
              title={`Study Mode: ${STUDY_MODES[studyMode].name} (M)`}
            >
              <span className="study-mode-icon">{STUDY_MODES[studyMode].icon}</span>
            </button>

            {/* Notes toggle */}
            <button
              className={`control-btn ${showNotesPanel ? 'active' : ''}`}
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              title="Study notes (N)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </button>

            {/* Stats toggle */}
            <button
              className={`control-btn ${showStats ? 'active' : ''}`}
              onClick={() => setShowStats(!showStats)}
              title="Study statistics (S)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </button>

            {/* Highlight toggle */}
            <button
              className={`control-btn ${highlightedVerses.has(currentVerse?.verse) ? 'active highlighted' : ''}`}
              onClick={() => currentVerse && toggleHighlight(currentVerse.verse)}
              title="Highlight verse (H)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>

            {/* Zen mode */}
            <button
              className="control-btn zen-btn"
              onClick={() => setZenMode(true)}
              title="Zen mode - hide UI (Z)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {/* Font size controls */}
            <div className="font-size-controls">
              <button
                className="control-btn"
                onClick={() => setFontSize(prev => prev === 'xlarge' ? 'large' : prev === 'large' ? 'medium' : 'medium')}
                title="Decrease font size (-)"
                aria-label="Decrease font size"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="size-label">{fontSize}</span>
              <button
                className="control-btn"
                onClick={() => setFontSize(prev => prev === 'medium' ? 'large' : prev === 'large' ? 'xlarge' : 'xlarge')}
                title="Increase font size (+)"
                aria-label="Increase font size"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Meforshim Panel */}
            <button
              className={`control-btn meforshim-btn ${showMeforshimPanel ? 'active' : ''}`}
              onClick={() => setShowMeforshimPanel(!showMeforshimPanel)}
              title="Meforshim / Commentaries (P)"
            >
              <span className="btn-hebrew">פ</span>
            </button>

            {/* Gematria */}
            <button
              className={`control-btn gematria-btn ${showGematria ? 'active' : ''}`}
              onClick={() => setShowGematria(!showGematria)}
              title="Gematria (X)"
            >
              <span className="btn-hebrew">ג</span>
            </button>

            {/* Cross References */}
            <button
              className={`control-btn crossrefs-btn ${showCrossRefs ? 'active' : ''}`}
              onClick={() => setShowCrossRefs(!showCrossRefs)}
              title="Cross References (O)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>

            {/* Rashi Script Toggle */}
            <button
              className={`control-btn rashi-script-btn ${useRashiScript ? 'active' : ''}`}
              onClick={() => setUseRashiScript(!useRashiScript)}
              title="Rashi Script (R)"
            >
              <span className="btn-hebrew rashi-font">א</span>
            </button>

            {/* Bookmark */}
            {onBookmarkVerse && (
              <button
                className="control-btn bookmark-btn"
                onClick={() => onBookmarkVerse(currentVerse)}
                title="Bookmark verse (B)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                </svg>
              </button>
            )}

            {/* Verse jump */}
            <button
              className="control-btn"
              onClick={() => setShowVerseJump(true)}
              title="Jump to verse (G)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Close */}
            <button className="control-btn close-btn" onClick={onClose} title="Exit focus mode (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Zen mode exit hint */}
      {zenMode && (
        <div className="zen-exit-hint">
          Press <kbd>Z</kbd> or <kbd>Esc</kbd> to exit zen mode
        </div>
      )}

      {/* Main content */}
      <div className="focus-content" onClick={zenMode ? () => setZenMode(false) : undefined}>
        {/* Context mode - show previous verse */}
        {studyMode === 'context' && contextVerses?.prev && (
          <div className="context-verse context-prev">
            <span className="context-verse-num">{contextVerses.prev.verse}</span>
            <p className="context-hebrew" dir="rtl" lang="he">{contextVerses.prev.hebrew}</p>
          </div>
        )}

        <div className={`verse-spotlight ${isTransitioning ? 'fade-out' : 'fade-in'} ${highlightedVerses.has(currentVerse?.verse) ? 'verse-highlighted' : ''}`}>
          {/* Highlight indicator */}
          {highlightedVerses.has(currentVerse?.verse) && (
            <div className="highlight-badge">⭐ Highlighted</div>
          )}

          <div className="verse-number-large">{currentVerse?.verse}</div>

          {/* Hebrew text with optional word highlighting and dual script */}
          <div className={`hebrew-text-container ${useRashiScript ? 'dual-script' : ''}`}>
            <p className={`hebrew-text-focus ${useRashiScript ? 'block-script' : ''}`} dir="rtl" lang="he">
              {wordHighlightMode ? (
                hebrewWords.map((word, idx) => (
                  <span
                    key={idx}
                    className={`word ${idx === currentWordIndex ? 'highlighted-word' : ''}`}
                    onClick={() => setCurrentWordIndex(idx)}
                  >
                    {word}{' '}
                  </span>
                ))
              ) : (
                currentVerse?.hebrew
              )}
            </p>
            {/* Secondary Rashi script display */}
            {useRashiScript && (
              <p className="hebrew-text-focus rashi-script" dir="rtl" lang="he">
                {currentVerse?.hebrew}
              </p>
            )}
          </div>

          {/* Word progress indicator */}
          {wordHighlightMode && hebrewWords.length > 0 && (
            <div className="word-progress">
              <div
                className="word-progress-fill"
                style={{ width: `${((currentWordIndex + 1) / hebrewWords.length) * 100}%` }}
              />
              <span className="word-count">{currentWordIndex + 1}/{hebrewWords.length}</span>
            </div>
          )}

          {/* Learning mode - click to reveal translation */}
          {studyMode === 'learning' ? (
            <div
              className={`learning-translation ${revealTranslation ? 'revealed' : 'hidden'}`}
              onClick={() => setRevealTranslation(!revealTranslation)}
            >
              {revealTranslation ? (
                <>
                  <p className="english-text-focus">{currentVerse?.english}</p>
                  <span className="reveal-hint">Click to hide translation</span>
                </>
              ) : (
                <div className="reveal-prompt">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Click to reveal translation (R)</span>
                </div>
              )}
            </div>
          ) : showTranslation && (
            <>
              <p className="english-text-focus">
                {currentVerse?.english}
              </p>

              {showOnkelos && currentOnkelos && (
                <p className="onkelos-text-focus" dir="rtl" lang="arc">
                  <span className="onkelos-label">Targum:</span>
                  {currentOnkelos.aramaic}
                </p>
              )}
            </>
          )}

          {/* Study mode indicator */}
          {studyMode !== 'single' && (
            <div className="study-mode-indicator">
              {STUDY_MODES[studyMode].icon} {STUDY_MODES[studyMode].name}
            </div>
          )}
        </div>

        {/* Context mode - show next verse */}
        {studyMode === 'context' && contextVerses?.next && (
          <div className="context-verse context-next">
            <span className="context-verse-num">{contextVerses.next.verse}</span>
            <p className="context-hebrew" dir="rtl" lang="he">{contextVerses.next.hebrew}</p>
          </div>
        )}
      </div>

      {/* Bottom navigation - hidden in zen mode */}
      {!zenMode && (
        <div className="focus-footer">
          <button
            className="nav-btn prev"
            onClick={() => currentVerseIndex > 0 ? navigateToVerse(currentVerseIndex - 1) : onPrevChapter?.()}
            disabled={currentVerseIndex === 0 && !onPrevChapter}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="nav-label">
              {currentVerseIndex === 0 ? 'Prev Chapter' : `Verse ${currentVerse?.verse - 1}`}
            </span>
          </button>

          <div className="verse-dots">
            {verses.slice(Math.max(0, currentVerseIndex - 4), Math.min(verses.length, currentVerseIndex + 5)).map((v, idx) => {
              const actualIndex = Math.max(0, currentVerseIndex - 4) + idx;
              return (
                <button
                  key={v.verse}
                  className={`verse-dot ${actualIndex === currentVerseIndex ? 'active' : ''}`}
                  onClick={() => goToVerse(actualIndex)}
                  title={`Verse ${v.verse}`}
                >
                  {v.verse}
                </button>
              );
            })}
          </div>

          <button
            className="nav-btn next"
            onClick={() => currentVerseIndex < verses.length - 1 ? navigateToVerse(currentVerseIndex + 1) : onNextChapter?.()}
            disabled={currentVerseIndex === verses.length - 1 && !onNextChapter}
          >
            <span className="nav-label">
              {currentVerseIndex === verses.length - 1 ? 'Next Chapter' : `Verse ${currentVerse?.verse + 1}`}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className={`focus-progress ${zenMode ? 'zen-progress' : ''}`}>
        <div
          className="progress-fill"
          style={{ width: `${((currentVerseIndex + 1) / verses.length) * 100}%` }}
        />
      </div>

      {/* Keyboard hints - hidden in zen mode */}
      {!zenMode && (
        <div className="keyboard-hints jewish-hints">
          <span><kbd>←</kbd><kbd>→</kbd> Navigate</span>
          <span><kbd>P</kbd> מפרשים</span>
          <span><kbd>X</kbd> גימטריא</span>
          <span><kbd>O</kbd> הפניות</span>
          <span><kbd>R</kbd> רש"י</span>
          <span><kbd>N</kbd> Notes</span>
          <span><kbd>W</kbd> Words</span>
          <span><kbd>Esc</kbd> Exit</span>
        </div>
      )}

      {/* Swipe hint for mobile */}
      <div className="swipe-hint">
        Swipe left/right to navigate
      </div>
    </div>
  );
});

export default FocusMode;
