import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './MikraotGedolot.css';
import '../styles/OzVeHadar.css';
import { ClickableHebrewText } from './ClickableText';
import { getRashiForVerse, getRambanForVerse } from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';
import { processHebrewText, getDisplayModeLabel } from '../utils/hebrewUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * MikraotGedolot - Premium Traditional Torah Page Layout
 *
 * Shows the ENTIRE page like a real printed Mikraot Gedolot:
 * - Realistic paper texture and gilded edges
 * - Torah text at the top in traditional formatting
 * - Three columns below: Onkelos | Rashi | Ramban
 * - ALL content visible at once (like a real sefer)
 * - Professional animations and interactions
 * - Persistent settings via localStorage
 */
const MikraotGedolot = ({
  verses = [],
  onkelos = [],
  selectedBook,
  selectedChapter,
  enableClickableText = true,
  showTranslation = false,
  onSaveWord,
  hasWord,
  onClose,
  useOzVeHadar = true,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter = true,
  hasNextChapter = true,
}) => {
  const [rashiData, setRashiData] = useState([]);
  const [rambanData, setRambanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Persisted settings (saved to localStorage)
  const [zoom, setZoom] = useLocalStorage('mg-zoom', 100);
  const [ozVeHadarTheme, setOzVeHadarTheme] = useLocalStorage('mg-oz-vehadar', useOzVeHadar);
  const [displayTranslation, setDisplayTranslation] = useLocalStorage('mg-translation', showTranslation);
  const [showVowels, setShowVowels] = useLocalStorage('mg-vowels', true);
  const [showCantillation, setShowCantillation] = useLocalStorage('mg-cantillation', true);

  // Get display mode label
  const diacriticMode = useMemo(() =>
    getDisplayModeLabel(showVowels, showCantillation),
    [showVowels, showCantillation]
  );

  // Toggle Oz VeHadar theme
  const toggleOzVeHadar = useCallback(() => {
    setOzVeHadarTheme(prev => !prev);
  }, [setOzVeHadarTheme]);

  // Toggle English translation
  const toggleTranslation = useCallback(() => {
    setDisplayTranslation(prev => !prev);
  }, [setDisplayTranslation]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 150));
  }, [setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 70));
  }, [setZoom]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Navigation: Arrow keys with Ctrl
      if (e.ctrlKey && e.key === 'ArrowLeft' && onPrevChapter && hasPrevChapter) {
        e.preventDefault();
        onPrevChapter();
      }
      if (e.ctrlKey && e.key === 'ArrowRight' && onNextChapter && hasNextChapter) {
        e.preventDefault();
        onNextChapter();
      }

      // Diacritic toggles: Alt+V for vowels, Alt+T for cantillation
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setShowVowels(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowCantillation(prev => !prev);
      }

      // Settings panel: S key
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setShowSettingsPanel(prev => !prev);
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        setShowSettingsPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevChapter, onNextChapter, hasPrevChapter, hasNextChapter, setShowVowels, setShowCantillation]);

  // Create Onkelos lookup map
  const onkelosMap = useMemo(() => {
    const map = {};
    onkelos.forEach(item => {
      map[item.verse] = item;
    });
    return map;
  }, [onkelos]);

  // Load ALL Rashi and Ramban data for the entire chapter
  useEffect(() => {
    const loadCommentaries = async () => {
      setLoading(true);

      try {
        // Load all in parallel
        const rashiPromises = verses.map(verse =>
          getRashiForVerse(selectedBook, selectedChapter, verse.verse)
            .then(data => ({ verse: verse.verse, data: data || [] }))
            .catch(() => ({ verse: verse.verse, data: [] }))
        );

        const rambanPromises = verses.map(verse =>
          getRambanForVerse(selectedBook, selectedChapter, verse.verse)
            .then(data => ({ verse: verse.verse, data: data?.comments || [] }))
            .catch(() => ({ verse: verse.verse, data: [] }))
        );

        const [rashiResults, rambanResults] = await Promise.all([
          Promise.all(rashiPromises),
          Promise.all(rambanPromises)
        ]);

        // Flatten all commentaries with verse numbers
        const allRashi = [];
        const allRamban = [];

        rashiResults.forEach(r => {
          r.data.forEach(comment => {
            allRashi.push({ ...comment, verseNum: r.verse });
          });
        });

        rambanResults.forEach(r => {
          r.data.forEach(comment => {
            allRamban.push({ ...comment, verseNum: r.verse });
          });
        });

        setRashiData(allRashi);
        setRambanData(allRamban);
      } catch (error) {
        console.error('Failed to load commentaries:', error);
      }
      setLoading(false);
    };

    if (verses.length > 0) {
      loadCommentaries();
    }
  }, [verses, selectedBook, selectedChapter]);

  // Hebrew book names
  const hebrewBookNames = {
    'Genesis': 'בראשית',
    'Exodus': 'שמות',
    'Leviticus': 'ויקרא',
    'Numbers': 'במדבר',
    'Deuteronomy': 'דברים',
  };

  const hebrewBookName = hebrewBookNames[selectedBook] || selectedBook;

  // Combine all Torah text with diacritic processing
  const torahText = useMemo(() => verses.map(v => ({
    verse: v.verse,
    hebrew: processHebrewText(v.hebrewText, { showVowels, showCantillation }),
    english: v.englishText
  })), [verses, showVowels, showCantillation]);

  // Combine all Onkelos
  const allOnkelos = verses
    .filter(v => onkelosMap[v.verse])
    .map(v => ({
      verse: v.verse,
      aramaic: onkelosMap[v.verse].aramaic,
      english: onkelosMap[v.verse].english
    }));

  if (loading) {
    return (
      <div className="mikraot-gedolot loading">
        <div className="mg-loading-spinner">
          <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span>טוען מקראות גדולות...</span>
          <span className="mg-loading-sub">Loading full page...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mikraot-gedolot full-page ${isFullscreen ? 'fullscreen' : ''} ${ozVeHadarTheme ? 'oz-vehadar-theme' : ''}`}
      style={{ fontSize: `${zoom}%` }}
    >
      {/* Paper texture overlay */}
      <div className="paper-texture" aria-hidden="true" />

      {/* Page Controls */}
      <div className="mg-page-controls">
        <button
          className={`mg-control-btn ${ozVeHadarTheme ? 'active' : ''}`}
          onClick={toggleOzVeHadar}
          title={ozVeHadarTheme ? "Standard style" : "Oz VeHadar style"}
          aria-label={ozVeHadarTheme ? "Switch to standard style" : "Switch to Oz VeHadar style"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            <circle cx="12" cy="12" r="4" fill={ozVeHadarTheme ? "currentColor" : "none"} />
          </svg>
        </button>
        <button
          className={`mg-control-btn ${showSettingsPanel ? 'active' : ''}`}
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          title="Settings (S)"
          aria-label="Open settings panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <button
          className={`mg-control-btn ${displayTranslation ? 'active' : ''}`}
          onClick={toggleTranslation}
          title={displayTranslation ? "Hide English translation" : "Show English translation"}
          aria-label={displayTranslation ? "Hide English translation" : "Show English translation"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </button>
        <button
          className="mg-control-btn"
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M8 11h6" />
          </svg>
        </button>
        <button
          className="mg-control-btn"
          onClick={handleZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </button>
        <button
          className="mg-control-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isFullscreen ? (
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
            ) : (
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            )}
          </svg>
        </button>
        {onClose && (
          <button
            className="mg-control-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close traditional view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Settings Panel (overlay) */}
      {showSettingsPanel && (
        <div className="mg-settings-panel">
          <div className="mg-settings-header">
            <h3>הגדרות תצוגה</h3>
            <button
              className="mg-settings-close"
              onClick={() => setShowSettingsPanel(false)}
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="mg-settings-section">
            <h4>ניקוד וטעמים</h4>
            <div className="mg-diacritic-mode">
              <span className="mg-mode-label">{diacriticMode}</span>
            </div>
            <div className="mg-settings-row">
              <label className="mg-toggle-switch">
                <input
                  type="checkbox"
                  checked={showVowels}
                  onChange={() => setShowVowels(!showVowels)}
                />
                <span className="mg-switch-slider"></span>
                <span className="mg-switch-label">נקודות (Alt+V)</span>
              </label>
            </div>
            <div className="mg-settings-row">
              <label className="mg-toggle-switch">
                <input
                  type="checkbox"
                  checked={showCantillation}
                  onChange={() => setShowCantillation(!showCantillation)}
                />
                <span className="mg-switch-slider"></span>
                <span className="mg-switch-label">טעמים (Alt+T)</span>
              </label>
            </div>
          </div>

          <div className="mg-settings-section">
            <h4>גודל תצוגה</h4>
            <div className="mg-zoom-control">
              <button onClick={handleZoomOut} disabled={zoom <= 70}>−</button>
              <span className="mg-zoom-value">{zoom}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 150}>+</button>
            </div>
          </div>

          <div className="mg-settings-section">
            <h4>תצוגה</h4>
            <div className="mg-settings-row">
              <label className="mg-toggle-switch">
                <input
                  type="checkbox"
                  checked={displayTranslation}
                  onChange={toggleTranslation}
                />
                <span className="mg-switch-slider"></span>
                <span className="mg-switch-label">תרגום לאנגלית</span>
              </label>
            </div>
            <div className="mg-settings-row">
              <label className="mg-toggle-switch">
                <input
                  type="checkbox"
                  checked={ozVeHadarTheme}
                  onChange={toggleOzVeHadar}
                />
                <span className="mg-switch-slider"></span>
                <span className="mg-switch-label">סגנון עוז והדר</span>
              </label>
            </div>
          </div>

          <div className="mg-settings-shortcuts">
            <h4>קיצורי מקלדת</h4>
            <div className="mg-shortcut-list">
              <div className="mg-shortcut"><kbd>S</kbd> הגדרות</div>
              <div className="mg-shortcut"><kbd>Ctrl</kbd>+<kbd>←</kbd> פרק קודם</div>
              <div className="mg-shortcut"><kbd>Ctrl</kbd>+<kbd>→</kbd> פרק הבא</div>
              <div className="mg-shortcut"><kbd>Alt</kbd>+<kbd>V</kbd> נקודות</div>
              <div className="mg-shortcut"><kbd>Alt</kbd>+<kbd>T</kbd> טעמים</div>
              <div className="mg-shortcut"><kbd>Esc</kbd> סגור</div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header - Like a real book */}
      <div className="mg-page-header">
        {/* Navigation buttons */}
        {onPrevChapter && (
          <button
            className="mg-nav-btn mg-nav-prev"
            onClick={onPrevChapter}
            disabled={!hasPrevChapter}
            title="Previous (Ctrl+←)"
            aria-label="Previous chapter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <div className="mg-header-content">
          <div className="mg-page-title">
            <span className="mg-sefer" dir="rtl">{hebrewBookName}</span>
            <span className="mg-perek">פרק {selectedChapter}</span>
          </div>
          <div className="mg-page-label">מקראות גדולות</div>
        </div>

        {/* Navigation buttons */}
        {onNextChapter && (
          <button
            className="mg-nav-btn mg-nav-next"
            onClick={onNextChapter}
            disabled={!hasNextChapter}
            title="Next (Ctrl+→)"
            aria-label="Next chapter"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* TORAH TEXT - Top section like a real page */}
      <div className="mg-torah-box">
        <div className="mg-box-header">
          <span className="mg-box-title">פסוקי התורה</span>
        </div>
        <div className="mg-torah-text" dir="rtl" lang="he">
          {torahText.map((v, idx) => (
            <span key={v.verse} className="mg-pasuk">
              <span className="mg-pasuk-num">{v.verse}</span>
              {enableClickableText ? (
                <ClickableHebrewText
                  text={v.hebrew}
                  className="mg-pasuk-text"
                  onSaveWord={onSaveWord}
                  hasWord={hasWord}
                />
              ) : (
                <span className="mg-pasuk-text">{v.hebrew}</span>
              )}
              {idx < torahText.length - 1 && ' '}
            </span>
          ))}
        </div>
        {displayTranslation && (
          <div className="mg-torah-english">
            {torahText.map((v, idx) => (
              <span key={v.verse}>
                <sup>{v.verse}</sup>{v.english}{idx < torahText.length - 1 && ' '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* THREE COLUMN COMMENTARIES - Like a real Mikraot Gedolot */}
      <div className="mg-commentaries-row">
        {/* ONKELOS Column */}
        <div className="mg-column mg-onkelos-col">
          <div className="mg-col-header">
            <span className="mg-col-icon">🔤</span>
            <span className="mg-col-title">תרגום אונקלוס</span>
          </div>
          <div className="mg-col-content" dir="rtl" lang="arc">
            {allOnkelos.length > 0 ? (
              allOnkelos.map((o, idx) => (
                <div key={idx} className="mg-onk-entry">
                  <span className="mg-entry-verse">({o.verse})</span>
                  <span className="mg-onk-aramaic">{o.aramaic}</span>
                </div>
              ))
            ) : (
              <div className="mg-empty">אין תרגום</div>
            )}
          </div>
        </div>

        {/* RASHI Column */}
        <div className="mg-column mg-rashi-col">
          <div className="mg-col-header">
            <span className="mg-col-icon">📖</span>
            <span className="mg-col-title">רש״י</span>
          </div>
          <div className="mg-col-content" dir="rtl" lang="he">
            {rashiData.length > 0 ? (
              rashiData.map((r, idx) => (
                <div key={idx} className="mg-rashi-entry">
                  <span className="mg-entry-verse">({r.verseNum})</span>
                  {r.dibbur && (
                    <span className="mg-dibbur"><strong>{r.dibbur}</strong> - </span>
                  )}
                  {enableClickableText ? (
                    <ClickableHebrewText
                      text={removeHtmlTags(r.hebrew)}
                      className="mg-rashi-text"
                      onSaveWord={onSaveWord}
                      hasWord={hasWord}
                    />
                  ) : (
                    <span className="mg-rashi-text">{removeHtmlTags(r.hebrew)}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="mg-empty">אין רש״י לפרק זה</div>
            )}
          </div>
        </div>

        {/* RAMBAN Column */}
        <div className="mg-column mg-ramban-col">
          <div className="mg-col-header">
            <span className="mg-col-icon">📿</span>
            <span className="mg-col-title">רמב״ן</span>
          </div>
          <div className="mg-col-content" dir="rtl" lang="he">
            {rambanData.length > 0 ? (
              rambanData.map((r, idx) => (
                <div key={idx} className="mg-ramban-entry">
                  <span className="mg-entry-verse">({r.verseNum})</span>
                  {r.dibbur && (
                    <span className="mg-dibbur"><strong>{r.dibbur}</strong> - </span>
                  )}
                  {enableClickableText ? (
                    <ClickableHebrewText
                      text={removeHtmlTags(r.hebrew)}
                      className="mg-ramban-text"
                      onSaveWord={onSaveWord}
                      hasWord={hasWord}
                    />
                  ) : (
                    <span className="mg-ramban-text">{removeHtmlTags(r.hebrew)}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="mg-empty">אין רמב״ן לפרק זה</div>
            )}
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="mg-page-footer">
        <span>{hebrewBookName} • פרק {selectedChapter}</span>
        <span className="mg-style-badge">
          {ozVeHadarTheme ? '✨ עוז והדר' : '📜 מקראות גדולות'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(MikraotGedolot);
