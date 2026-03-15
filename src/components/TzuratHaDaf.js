import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TzuratHaDaf.css';
import '../styles/OzVeHadar.css';
import { ClickableHebrewText } from './ClickableText';
import { getRashiForVerse, getTosafotForDaf, getMaharshaForDaf } from '../services/sefariaApi';
import { removeHtmlTags } from '../utils/sanitize';
import { detectStructuralMarkers, TALMUDIC_PATTERNS } from '../services/discoursePatternService';
import { processHebrewText, getDisplayModeLabel } from '../utils/hebrewUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { findAbbreviations } from '../services/talmudicAbbreviationsService';

// Layout style options
const LAYOUT_STYLES = {
  simple: {
    id: 'simple',
    name: 'Simple',
    hebrewName: 'פשוט',
    icon: '📄',
    description: 'Clean minimal layout - Gemara only',
    showRashi: false,
    showTosafot: false,
    className: 'layout-simple'
  },
  vilna: {
    id: 'vilna',
    name: 'Classic Vilna',
    hebrewName: 'וילנא',
    icon: '📜',
    description: 'Traditional Vilna Shas layout',
    showRashi: true,
    showTosafot: true,
    className: 'layout-vilna'
  },
  ozvehadar: {
    id: 'ozvehadar',
    name: 'Oz VeHadar',
    hebrewName: 'עוז והדר',
    icon: '✨',
    description: 'Premium enhanced typography',
    showRashi: true,
    showTosafot: true,
    className: 'oz-vehadar-theme'
  },
  steinsaltz: {
    id: 'steinsaltz',
    name: 'Steinsaltz',
    hebrewName: 'שטיינזלץ',
    icon: '📖',
    description: 'Modern with translation focus',
    showRashi: true,
    showTosafot: false,
    className: 'layout-steinsaltz'
  },
  artscroll: {
    id: 'artscroll',
    name: 'ArtScroll',
    hebrewName: 'ארטסקרול',
    icon: '📚',
    description: 'Elucidated English style',
    showRashi: true,
    showTosafot: true,
    className: 'layout-artscroll'
  }
};

// Hebrew tractate names mapping - Complete Babylonian Talmud
const HEBREW_MASECHET = {
  // Seder Zeraim
  'Berakhot': 'ברכות',
  // Seder Moed
  'Shabbat': 'שבת',
  'Eruvin': 'עירובין',
  'Pesachim': 'פסחים',
  'Shekalim': 'שקלים',  // Jerusalem Talmud included in Vilna Shas
  'Yoma': 'יומא',
  'Sukkah': 'סוכה',
  'Beitzah': 'ביצה',
  'Rosh Hashanah': 'ראש השנה',
  'Taanit': 'תענית',
  'Megillah': 'מגילה',
  'Moed Katan': 'מועד קטן',
  'Chagigah': 'חגיגה',
  // Seder Nashim
  'Yevamot': 'יבמות',
  'Ketubot': 'כתובות',
  'Nedarim': 'נדרים',
  'Nazir': 'נזיר',
  'Sotah': 'סוטה',
  'Gittin': 'גיטין',
  'Kiddushin': 'קידושין',
  // Seder Nezikin
  'Bava Kamma': 'בבא קמא',
  'Bava Metzia': 'בבא מציעא',
  'Bava Batra': 'בבא בתרא',
  'Sanhedrin': 'סנהדרין',
  'Makkot': 'מכות',
  'Shevuot': 'שבועות',
  'Eduyot': 'עדיות',      // No Gemara, but included for reference
  'Avodah Zarah': 'עבודה זרה',
  'Avot': 'אבות',          // Pirkei Avot
  'Horayot': 'הוריות',
  // Seder Kodshim
  'Zevachim': 'זבחים',
  'Menachot': 'מנחות',
  'Chullin': 'חולין',
  'Bekhorot': 'בכורות',
  'Arakhin': 'ערכין',
  'Temurah': 'תמורה',
  'Keritot': 'כריתות',
  'Meilah': 'מעילה',
  'Kinnim': 'קנים',        // Short tractate
  'Tamid': 'תמיד',
  'Middot': 'מדות',        // No Gemara, architectural
  // Seder Tohorot
  'Niddah': 'נדה'
};

/**
 * TzuratHaDaf - Premium Traditional Talmud Page Layout
 *
 * Multiple style options:
 * - Simple: Gemara only, clean layout
 * - Classic Vilna: Traditional 3-column Vilna Shas
 * - Oz VeHadar: Premium enhanced typography
 * - Steinsaltz: Modern with translation focus
 * - ArtScroll: Elucidated English style
 */
const TzuratHaDaf = ({
  verses = [],
  selectedBook,
  selectedChapter,
  enableClickableText = true,
  showTranslation = false,
  onSaveWord,
  hasWord,
  onClose,
  initialStyle = 'ozvehadar', // Default style
  onPrevChapter, // Navigation callback
  onNextChapter, // Navigation callback
  hasPrevChapter = true,
  hasNextChapter = true,
}) => {
  const [rashiData, setRashiData] = useState([]);
  const [tosafotData, setTosafotData] = useState([]);
  const [maharshaData, setMaharshaData] = useState({ halachot: [], aggadot: [] });
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get Hebrew tractate name
  const masechetHebrew = HEBREW_MASECHET[selectedBook] || selectedBook;
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Persisted settings (saved to localStorage)
  const [zoom, setZoom] = useLocalStorage('daf-zoom', 100);
  const [layoutStyle, setLayoutStyle] = useLocalStorage('daf-layout-style', initialStyle);
  const [showDiscourseMarkers, setShowDiscourseMarkers] = useLocalStorage('daf-discourse-markers', true);
  const [displayTranslation, setDisplayTranslation] = useLocalStorage('daf-translation', showTranslation);
  const [showVowels, setShowVowels] = useLocalStorage('daf-vowels', true);
  const [showCantillation, setShowCantillation] = useLocalStorage('daf-cantillation', true);
  const [showAbbreviations, setShowAbbreviations] = useLocalStorage('daf-abbreviations', true);
  const [hoveredAbbrev, setHoveredAbbrev] = useState(null);

  // Get display mode label
  const diacriticMode = useMemo(() =>
    getDisplayModeLabel(showVowels, showCantillation),
    [showVowels, showCantillation]
  );

  // Column visibility overrides - persisted (can be toggled independently)
  const [columnOverrides, setColumnOverrides] = useLocalStorage('daf-column-overrides', {
    rashi: null, // null = use style default
    tosafot: null,
    translation: null
  });

  // Get current style config
  const currentStyle = LAYOUT_STYLES[layoutStyle] || LAYOUT_STYLES.vilna;

  // Determine what columns to show based on style + overrides
  const showRashi = columnOverrides.rashi !== null ? columnOverrides.rashi : currentStyle.showRashi;
  const showTosafot = columnOverrides.tosafot !== null ? columnOverrides.tosafot : currentStyle.showTosafot;

  // Toggle column visibility
  const toggleColumn = useCallback((column) => {
    setColumnOverrides(prev => ({
      ...prev,
      [column]: prev[column] === null
        ? !currentStyle[`show${column.charAt(0).toUpperCase() + column.slice(1)}`]
        : !prev[column]
    }));
  }, [currentStyle, setColumnOverrides]);

  // Toggle English translation
  const toggleTranslation = useCallback(() => {
    setDisplayTranslation(prev => !prev);
  }, [setDisplayTranslation]);

  // Detect and highlight discourse markers in the Gemara text
  const renderWithDiscourseMarkers = useCallback((text) => {
    if (!showDiscourseMarkers || !text) return null;

    const markers = detectStructuralMarkers(text);
    if (markers.length === 0) {
      return null; // No markers found, use regular rendering
    }

    // Sort markers by position
    const sortedMarkers = [...markers].sort((a, b) => a.position - b.position);

    // Build the highlighted text
    const segments = [];
    let lastIndex = 0;

    sortedMarkers.forEach((marker, idx) => {
      // Add text before this marker
      if (marker.position > lastIndex) {
        const beforeText = text.substring(lastIndex, marker.position);
        segments.push(
          <span key={`text-${idx}`} className="daf-discourse-plain">{beforeText}</span>
        );
      }

      // Add the marker itself with highlighting
      segments.push(
        <span
          key={`marker-${idx}`}
          className="daf-discourse-marker"
          style={{
            backgroundColor: `${marker.color}22`,
            borderBottom: `2px solid ${marker.color}`,
            padding: '0 4px',
            borderRadius: '3px',
          }}
          title={`${marker.label} (${marker.type})`}
        >
          <span className="daf-discourse-icon" style={{ marginLeft: '4px' }}>
            {TALMUDIC_PATTERNS[marker.type]?.icon || '📌'}
          </span>
          {marker.marker}
        </span>
      );

      lastIndex = marker.position + marker.marker.length;
    });

    // Add remaining text after last marker
    if (lastIndex < text.length) {
      segments.push(
        <span key="text-end" className="daf-discourse-plain">{text.substring(lastIndex)}</span>
      );
    }

    return segments;
  }, [showDiscourseMarkers]);

  // Render text with abbreviation tooltips
  const renderWithAbbreviations = useCallback((text) => {
    if (!showAbbreviations || !text) return null;

    const abbreviations = findAbbreviations(text);
    if (abbreviations.length === 0) return null;

    // Build segments with abbreviation highlights
    const segments = [];
    let lastIndex = 0;

    abbreviations.forEach((abbrev, idx) => {
      // Text before this abbreviation
      if (abbrev.position > lastIndex) {
        segments.push(
          <span key={`text-${idx}`}>{text.substring(lastIndex, abbrev.position)}</span>
        );
      }

      // The abbreviation with tooltip
      segments.push(
        <span
          key={`abbrev-${idx}`}
          className="daf-abbreviation"
          onMouseEnter={() => setHoveredAbbrev(abbrev)}
          onMouseLeave={() => setHoveredAbbrev(null)}
          title={`${abbrev.expansion} - ${abbrev.english}`}
          style={{
            borderBottom: '1px dotted #8b6914',
            cursor: 'help',
            position: 'relative',
          }}
        >
          {abbrev.abbreviation}
        </span>
      );

      lastIndex = abbrev.endPosition;
    });

    // Remaining text
    if (lastIndex < text.length) {
      segments.push(
        <span key="text-end">{text.substring(lastIndex)}</span>
      );
    }

    return segments;
  }, [showAbbreviations]);

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

  // Load ALL Rashi, Tosafot, and Maharsha data with progress
  useEffect(() => {
    const loadCommentaries = async () => {
      setLoading(true);
      setLoadingProgress(0);
      try {
        // Load Rashi for all verses in parallel
        setLoadingProgress(10);
        const rashiPromises = verses.map(verse =>
          getRashiForVerse(selectedBook, selectedChapter, verse.verse)
            .then(data => ({ verse: verse.verse, data: data || [] }))
            .catch(() => ({ verse: verse.verse, data: [] }))
        );
        const rashiResults = await Promise.all(rashiPromises);
        setLoadingProgress(40);

        // Flatten all Rashi
        const allRashi = [];
        rashiResults.forEach(r => {
          r.data.forEach(comment => {
            allRashi.push({ ...comment, verseNum: r.verse });
          });
        });
        setRashiData(allRashi);

        // Load Tosafot for the daf
        setLoadingProgress(60);
        const tosafot = await getTosafotForDaf(selectedBook, selectedChapter);
        setTosafotData(tosafot || []);

        // Load Maharsha for the daf
        setLoadingProgress(80);
        const maharsha = await getMaharshaForDaf(selectedBook, selectedChapter);
        setMaharshaData(maharsha || { halachot: [], aggadot: [] });
        setLoadingProgress(100);
      } catch (error) {
        console.error('Failed to load commentaries:', error);
      }
      setLoading(false);
    };

    if (verses.length > 0) {
      loadCommentaries();
    }
  }, [verses, selectedBook, selectedChapter]);

  // Combine all Gemara text and process diacritics
  const gemaraTextRaw = verses.map(v => v.hebrewText).join(' ');
  const gemaraText = useMemo(() =>
    processHebrewText(gemaraTextRaw, { showVowels, showCantillation }),
    [gemaraTextRaw, showVowels, showCantillation]
  );
  const gemaraEnglish = verses.map(v => v.englishText).filter(Boolean).join(' ');

  // Handle keyboard shortcuts
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
        setShowStyleMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevChapter, onNextChapter, hasPrevChapter, hasNextChapter, setShowVowels, setShowCantillation]);

  // Memoized discourse-highlighted Gemara
  const highlightedGemara = useMemo(() => {
    if (!showDiscourseMarkers || !gemaraText) return null;
    return renderWithDiscourseMarkers(gemaraText);
  }, [gemaraText, showDiscourseMarkers, renderWithDiscourseMarkers]);

  // Memoized abbreviation-highlighted Gemara
  const abbreviatedGemara = useMemo(() => {
    if (!showAbbreviations || !gemaraText) return null;
    return renderWithAbbreviations(gemaraText);
  }, [gemaraText, showAbbreviations, renderWithAbbreviations]);

  if (loading) {
    return (
      <div className="tzurat-hadaf loading">
        <div className="daf-loading-spinner">
          <div className="daf-loading-header">
            <span className="daf-loading-icon">📚</span>
            <span className="daf-loading-title">תלמוד בבלי</span>
          </div>
          <div className="daf-loading-masechet">{masechetHebrew}</div>
          <div className="daf-loading-daf">דף {selectedChapter}</div>
          <div className="daf-loading-bar">
            <div className="daf-loading-progress" style={{ width: `${loadingProgress}%` }} />
          </div>
          <div className="daf-loading-text">
            טוען את הדף... {loadingProgress}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tzurat-hadaf full-page ${isFullscreen ? 'fullscreen' : ''} ${currentStyle.className}`}
      style={{ fontSize: `${zoom}%` }}
    >
      {/* Paper texture overlay */}
      <div className="paper-texture" aria-hidden="true" />

      {/* Abbreviation popup tooltip */}
      {hoveredAbbrev && (
        <div
          className="daf-abbrev-popup"
          style={{
            left: '50%',
            top: '30%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="daf-abbrev-header">
            <span className="daf-abbrev-original">{hoveredAbbrev.abbreviation}</span>
            <span className="daf-abbrev-type">{hoveredAbbrev.type}</span>
          </div>
          <div className="daf-abbrev-expansion">{hoveredAbbrev.expansion}</div>
          <div className="daf-abbrev-english">{hoveredAbbrev.english}</div>
        </div>
      )}

      {/* Page Controls */}
      <div className="daf-page-controls">
        {/* Style Selector Dropdown */}
        <div className="daf-style-selector">
          <button
            className="daf-control-btn style-btn"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            title="Change layout style"
            aria-label="Change layout style"
          >
            <span className="style-icon">{currentStyle.icon}</span>
            <span className="style-name">{currentStyle.hebrewName}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showStyleMenu && (
            <div className="daf-style-menu">
              {Object.values(LAYOUT_STYLES).map(style => (
                <button
                  key={style.id}
                  className={`style-option ${layoutStyle === style.id ? 'active' : ''}`}
                  onClick={() => {
                    setLayoutStyle(style.id);
                    setShowStyleMenu(false);
                    // Reset column overrides when changing style
                    setColumnOverrides({ rashi: null, tosafot: null, translation: null });
                  }}
                >
                  <span className="option-icon">{style.icon}</span>
                  <span className="option-content">
                    <span className="option-name">{style.hebrewName}</span>
                    <span className="option-desc">{style.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column Filters */}
        <div className="daf-column-filters">
          <button
            className={`daf-control-btn filter-btn ${showRashi ? 'active' : ''}`}
            onClick={() => toggleColumn('rashi')}
            title={showRashi ? "Hide Rashi" : "Show Rashi"}
          >
            <span>רש״י</span>
          </button>
          <button
            className={`daf-control-btn filter-btn ${showTosafot ? 'active' : ''}`}
            onClick={() => toggleColumn('tosafot')}
            title={showTosafot ? "Hide Tosafot" : "Show Tosafot"}
          >
            <span>תוס׳</span>
          </button>
        </div>

        <div className="daf-controls-divider"></div>

        {/* Settings button */}
        <button
          className={`daf-control-btn ${showSettingsPanel ? 'active' : ''}`}
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
          className={`daf-control-btn ${displayTranslation ? 'active' : ''}`}
          onClick={toggleTranslation}
          title={displayTranslation ? "Hide English translation" : "Show English translation"}
          aria-label={displayTranslation ? "Hide English translation" : "Show English translation"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </button>
        <button
          className="daf-control-btn"
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
          className="daf-control-btn"
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
          className="daf-control-btn"
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
            className="daf-control-btn"
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

      {/* DAF HEADER - Like top of a real Gemara page */}
      <div className="daf-page-header">
        {/* Navigation buttons */}
        {onPrevChapter && (
          <button
            className="daf-nav-btn daf-nav-prev"
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

        <div className="daf-header-content">
          <div className="daf-header-top">תלמוד בבלי</div>
          <div className="daf-masechet" dir="rtl">{masechetHebrew}</div>
          <div className="daf-number">
            <span className="daf-label">דף</span>
            <span className="daf-value">{selectedChapter}</span>
          </div>
        </div>

        {/* Navigation buttons */}
        {onNextChapter && (
          <button
            className="daf-nav-btn daf-nav-next"
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

      {/* Settings Panel (overlay) */}
      {showSettingsPanel && (
        <div className="daf-settings-panel">
          <div className="daf-settings-header">
            <h3>הגדרות תצוגה</h3>
            <button
              className="daf-settings-close"
              onClick={() => setShowSettingsPanel(false)}
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          <div className="daf-settings-section">
            <h4>ניקוד וטעמים</h4>
            <div className="daf-diacritic-mode">
              <span className="daf-mode-label">{diacriticMode}</span>
            </div>
            <div className="daf-settings-row">
              <label className="daf-toggle-switch">
                <input
                  type="checkbox"
                  checked={showVowels}
                  onChange={() => setShowVowels(!showVowels)}
                />
                <span className="daf-switch-slider"></span>
                <span className="daf-switch-label">נקודות (Alt+V)</span>
              </label>
            </div>
            <div className="daf-settings-row">
              <label className="daf-toggle-switch">
                <input
                  type="checkbox"
                  checked={showCantillation}
                  onChange={() => setShowCantillation(!showCantillation)}
                />
                <span className="daf-switch-slider"></span>
                <span className="daf-switch-label">טעמים (Alt+T)</span>
              </label>
            </div>
          </div>

          <div className="daf-settings-section">
            <h4>גודל תצוגה</h4>
            <div className="daf-zoom-control">
              <button onClick={handleZoomOut} disabled={zoom <= 70}>−</button>
              <span className="daf-zoom-value">{zoom}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 150}>+</button>
            </div>
          </div>

          <div className="daf-settings-section">
            <h4>תצוגה</h4>
            <div className="daf-settings-row">
              <label className="daf-toggle-switch">
                <input
                  type="checkbox"
                  checked={displayTranslation}
                  onChange={toggleTranslation}
                />
                <span className="daf-switch-slider"></span>
                <span className="daf-switch-label">תרגום לאנגלית</span>
              </label>
            </div>
            <div className="daf-settings-row">
              <label className="daf-toggle-switch">
                <input
                  type="checkbox"
                  checked={showDiscourseMarkers}
                  onChange={() => setShowDiscourseMarkers(!showDiscourseMarkers)}
                />
                <span className="daf-switch-slider"></span>
                <span className="daf-switch-label">סימני שיח</span>
              </label>
            </div>
            <div className="daf-settings-row">
              <label className="daf-toggle-switch">
                <input
                  type="checkbox"
                  checked={showAbbreviations}
                  onChange={() => setShowAbbreviations(!showAbbreviations)}
                />
                <span className="daf-switch-slider"></span>
                <span className="daf-switch-label">ראשי תיבות (קיצורים)</span>
              </label>
            </div>
          </div>

          <div className="daf-settings-shortcuts">
            <h4>קיצורי מקלדת</h4>
            <div className="daf-shortcut-list">
              <div className="daf-shortcut"><kbd>S</kbd> הגדרות</div>
              <div className="daf-shortcut"><kbd>Ctrl</kbd>+<kbd>←</kbd> דף קודם</div>
              <div className="daf-shortcut"><kbd>Ctrl</kbd>+<kbd>→</kbd> דף הבא</div>
              <div className="daf-shortcut"><kbd>Alt</kbd>+<kbd>V</kbd> נקודות</div>
              <div className="daf-shortcut"><kbd>Alt</kbd>+<kbd>T</kbd> טעמים</div>
              <div className="daf-shortcut"><kbd>Esc</kbd> סגור</div>
            </div>
          </div>
        </div>
      )}

      {/* THREE COLUMN LAYOUT - Configurable based on style */}
      <div className={`daf-three-columns ${!showRashi && !showTosafot ? 'gemara-only' : ''} ${!showRashi ? 'no-rashi' : ''} ${!showTosafot ? 'no-tosafot' : ''}`}>
        {/* LEFT COLUMN - TOSAFOT (conditionally rendered) */}
        {showTosafot && (
          <div className="daf-column daf-tosafot-col">
            <div className="daf-col-header">
              <span className="daf-col-title">תוספות</span>
            </div>
            <div className="daf-col-content" dir="rtl" lang="he">
              {tosafotData.length > 0 ? (
                tosafotData.map((t, idx) => (
                  <div key={idx} className="daf-tosafot-entry">
                    {t.dibbur && (
                      <span className="daf-dibbur"><strong>{t.dibbur}</strong> - </span>
                    )}
                    {enableClickableText ? (
                      <ClickableHebrewText
                        text={removeHtmlTags(t.hebrew)}
                        className="daf-tosafot-text"
                        onSaveWord={onSaveWord}
                        hasWord={hasWord}
                      />
                    ) : (
                      <span className="daf-tosafot-text">{removeHtmlTags(t.hebrew)}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="daf-empty">אין תוספות לדף זה</div>
              )}
            </div>
          </div>
        )}

        {/* CENTER COLUMN - GEMARA */}
        <div className="daf-column daf-gemara-col">
          <div className="daf-col-header daf-gemara-header">
            <span className="daf-col-title">גמרא</span>
            {/* Discourse marker toggle */}
            <button
              className={`daf-discourse-toggle ${showDiscourseMarkers ? 'active' : ''}`}
              onClick={() => setShowDiscourseMarkers(!showDiscourseMarkers)}
              title={showDiscourseMarkers ? 'הסתר סימנים' : 'הצג סימנים'}
            >
              <span className="daf-toggle-icon">🔍</span>
              <span className="daf-toggle-label">סימנים</span>
            </button>
          </div>
          <div className="daf-col-content daf-gemara-content" dir="rtl" lang="he">
            {/* Discourse Legend when markers are shown */}
            {showDiscourseMarkers && highlightedGemara && (
              <div className="daf-discourse-legend">
                {Object.entries(TALMUDIC_PATTERNS).slice(0, 6).map(([key, pattern]) => (
                  <span key={key} className="daf-legend-item" style={{ borderColor: pattern.color }}>
                    <span className="daf-legend-icon">{pattern.icon}</span>
                    <span className="daf-legend-label">{pattern.label}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Gemara text with discourse markers, abbreviations, or plain */}
            {showDiscourseMarkers && highlightedGemara ? (
              <div className="daf-gemara-text daf-gemara-with-markers">
                {highlightedGemara}
              </div>
            ) : showAbbreviations && abbreviatedGemara ? (
              <div className="daf-gemara-text daf-gemara-with-abbreviations">
                {abbreviatedGemara}
              </div>
            ) : enableClickableText ? (
              <ClickableHebrewText
                text={gemaraText}
                className="daf-gemara-text"
                onSaveWord={onSaveWord}
                hasWord={hasWord}
              />
            ) : (
              <span className="daf-gemara-text">{gemaraText}</span>
            )}
            {displayTranslation && gemaraEnglish && (
              <div className="daf-gemara-english">
                {gemaraEnglish}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - RASHI (conditionally rendered) */}
        {showRashi && (
          <div className="daf-column daf-rashi-col">
            <div className="daf-col-header">
              <span className="daf-col-title">רש״י</span>
            </div>
            <div className="daf-col-content" dir="rtl" lang="he">
              {rashiData.length > 0 ? (
                rashiData.map((r, idx) => (
                  <div key={idx} className="daf-rashi-entry">
                    {r.dibbur && (
                      <span className="daf-dibbur"><strong>{r.dibbur}</strong> - </span>
                    )}
                    {enableClickableText ? (
                      <ClickableHebrewText
                        text={removeHtmlTags(r.hebrew)}
                        className="daf-rashi-text rashi-script"
                        onSaveWord={onSaveWord}
                        hasWord={hasWord}
                      />
                    ) : (
                      <span className="daf-rashi-text rashi-script">{removeHtmlTags(r.hebrew)}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="daf-empty">אין רש״י לדף זה</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MAHARSHA SECTION - Lower commentaries */}
      {(maharshaData.halachot?.length > 0 || maharshaData.aggadot?.length > 0) && (
        <div className="daf-maharsha-section">
          <div className="daf-maharsha-column">
            <div className="daf-maharsha-header">
              <span className="daf-maharsha-title">מהרש״א חדושי הלכות</span>
            </div>
            <div className="daf-maharsha-content" dir="rtl">
              {maharshaData.halachot?.length > 0 ? (
                maharshaData.halachot.map((item, idx) => (
                  <div key={idx} className="daf-maharsha-entry">
                    {item.dibbur && <span className="daf-dibbur"><strong>{item.dibbur}</strong> - </span>}
                    <span>{removeHtmlTags(item.hebrew)}</span>
                  </div>
                ))
              ) : (
                <div className="daf-empty-small">אין חדושי הלכות לדף זה</div>
              )}
            </div>
          </div>
          <div className="daf-maharsha-column">
            <div className="daf-maharsha-header">
              <span className="daf-maharsha-title">מהרש״א חדושי אגדות</span>
            </div>
            <div className="daf-maharsha-content" dir="rtl">
              {maharshaData.aggadot?.length > 0 ? (
                maharshaData.aggadot.map((item, idx) => (
                  <div key={idx} className="daf-maharsha-entry">
                    {item.dibbur && <span className="daf-dibbur"><strong>{item.dibbur}</strong> - </span>}
                    <span>{removeHtmlTags(item.hebrew)}</span>
                  </div>
                ))
              ) : (
                <div className="daf-empty-small">אין חדושי אגדות לדף זה</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAF FOOTER */}
      <div className="daf-page-footer">
        <span>{masechetHebrew} • דף {selectedChapter}</span>
        <span className="daf-style-badge">
          {currentStyle.icon} {currentStyle.hebrewName}
        </span>
      </div>
    </div>
  );
};

export default React.memo(TzuratHaDaf);
