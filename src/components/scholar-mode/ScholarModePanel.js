/**
 * ScholarModePanel - Clean Study Center
 *
 * Simplified 4-tab interface:
 * - לימוד Learn: AI analysis modes (12 modes in 3 categories)
 * - מילים Words: Dictionary lookup
 * - פירושים Commentary: Sefaria commentaries
 * - מחברת Notebook: Personal notes & progress
 *
 * Talmud: Adds צורת הדף toggle for traditional page view
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { MiniFlowBar } from '../visualization/SugyaFlowVisualization';
import { getFlowDiagram } from '../../services/discoursePatternService';
import { getCompleteScholarlyAnalysis, addVocalization } from '../../services/scholarlyApiService';
// Entity detection removed - entities tab consolidated into other features
import { isTalmudBook, getSefarimCategories, getChapters, getVerses } from '../../services/sefariaApi';
import './ScholarModePanel.css';

// Import extracted components - 5 TAB STRUCTURE (with Talmud tools for Talmud mode)
import {
  TabButton,
  LoadingState,
  AIAnalysisTab,      // LEARN - AI analysis modes (includes Chavruta)
  WordsTab,           // WORDS - Dictionary lookup
  CommentaryTab,      // COMMENTARY - Commentaries view
  NotebookTab,        // NOTEBOOK - Personal journal
  TzuratHaDafTab,     // TZURAT HADAF - Traditional layout (toggle view for Talmud)
  TalmudToolsTab      // TALMUD - Iyun/Bekius/Chazara modes, abbreviations, sages (Talmud only)
} from '.';

// Connectivity indicator for online/offline status
import ConnectivityIndicator from '../shared/ConnectivityIndicator';
import GlossedText from '../dictionary/GlossedText';
import { useSettings } from '../../context/SettingsContext';

/**
 * ScholarModePanel - Unified Study Center Component
 *
 * Simplified 4 Tab Structure:
 * - LEARN: AI analysis (12 modes in 3 categories)
 * - WORDS: Dictionary lookup
 * - COMMENTARY: Sefaria commentaries
 * - NOTEBOOK: Personal notes & progress
 */
const ScholarModePanel = ({
  text,
  reference,
  isOpen,
  onClose,
  onTextChange,
  // New props for unified study
  textType = null,        // 'torah' | 'talmud' | 'mishnah' | null (auto-detect)
  selectedBook,           // Book name for Genesis detection
  selectedChapter,        // Current chapter number
  selectedVerse,          // Single verse object
  selectedVerses,         // Multi-verse array (from external selection)
  // eslint-disable-next-line no-unused-vars
  isMultiVerse = false,   // Passage mode flag (computed internally as effectiveIsMultiVerse)
  allVerses = [],         // All verses on the page for internal selection
  // Commentary data for AI analysis
  rashiText,
  onkelosText,
  rambanText,
  // Multi-verse commentary data maps (for fetching all verse commentaries)
  rashiDataMap = null,    // Map: "book:chapter:verse" -> rashi comments array
  onkelosDataMap = null,  // Map: verseNumber -> onkelos object
  rambanDataMap = null    // Map: "book:chapter:verse" -> ramban comments array
}) => {
  // Settings for inline glossing
  const { showInlineGlosses, toggleInlineGlosses } = useSettings();

  // Internal verse selection state (for selecting within the panel)
  const [internalSelectedVerses, setInternalSelectedVerses] = useState([]);
  const [showVerseSelector, setShowVerseSelector] = useState(false);

  // Navigation state for browsing other pages
  const [browseMode, setBrowseMode] = useState(false);
  const [browseBook, setBrowseBook] = useState(null);
  const [browseChapter, setBrowseChapter] = useState(null);
  const [browseVerses, setBrowseVerses] = useState([]);
  const [loadingBrowseVerses, setLoadingBrowseVerses] = useState(false);

  // Get available categories and books
  const sefarimCategories = useMemo(() => getSefarimCategories(), []);

  // Get chapters for currently browsing book
  const availableChapters = useMemo(() => {
    if (!browseBook) return [];
    return getChapters(browseBook);
  }, [browseBook]);

  // Load verses when browse chapter changes
  useEffect(() => {
    const loadBrowseVerses = async () => {
      if (!browseBook || !browseChapter) {
        setBrowseVerses([]);
        return;
      }

      setLoadingBrowseVerses(true);
      try {
        const verses = await getVerses(browseBook, browseChapter);
        setBrowseVerses(verses || []);
      } catch (error) {
        console.error('Failed to load verses:', error);
        setBrowseVerses([]);
      } finally {
        setLoadingBrowseVerses(false);
      }
    };

    loadBrowseVerses();
  }, [browseBook, browseChapter]);

  // Toggle browse mode and initialize with current book/chapter
  const toggleBrowseMode = useCallback(() => {
    if (!browseMode) {
      setBrowseBook(selectedBook);
      setBrowseChapter(selectedChapter);
    }
    setBrowseMode(!browseMode);
  }, [browseMode, selectedBook, selectedChapter]);

  // Handle book selection in browse mode
  const handleBrowseBookChange = useCallback((book) => {
    setBrowseBook(book);
    setBrowseChapter(null);
    setBrowseVerses([]);
  }, []);

  // Handle chapter selection in browse mode
  const handleBrowseChapterChange = useCallback((chapter) => {
    setBrowseChapter(chapter);
  }, []);

  // Toggle verse from browse mode (adds to selection with full context)
  const toggleBrowseVerseSelection = useCallback((verse) => {
    const verseId = `${browseBook}:${browseChapter}:${verse.verse}`;
    setInternalSelectedVerses(prev => {
      const isSelected = prev.some(v => v.id === verseId);
      if (isSelected) {
        return prev.filter(v => v.id !== verseId);
      } else {
        return [...prev, {
          ...verse,
          book: browseBook,
          chapter: parseInt(browseChapter, 10),
          id: verseId
        }];
      }
    });
  }, [browseBook, browseChapter]);

  // Check if a browse verse is selected
  const isBrowseVerseSelected = useCallback((verseNum) => {
    return internalSelectedVerses.some(
      v => v.verse === verseNum && v.book === browseBook && v.chapter === parseInt(browseChapter, 10)
    );
  }, [internalSelectedVerses, browseBook, browseChapter]);

  // Select all browse verses
  const selectAllBrowseVerses = useCallback(() => {
    const chapter = parseInt(browseChapter, 10);
    const newVerses = browseVerses.map(v => ({
      ...v,
      book: browseBook,
      chapter: chapter,
      id: `${browseBook}:${chapter}:${v.verse}`
    }));
    setInternalSelectedVerses(prev => {
      // Filter out any existing verses from this book:chapter, then add all
      const filtered = prev.filter(v => !(v.book === browseBook && v.chapter === chapter));
      return [...filtered, ...newVerses];
    });
  }, [browseVerses, browseBook, browseChapter]);

  // Clear browse verses from selection
  const clearBrowseVerses = useCallback(() => {
    const chapter = parseInt(browseChapter, 10);
    setInternalSelectedVerses(prev =>
      prev.filter(v => !(v.book === browseBook && v.chapter === chapter))
    );
  }, [browseBook, browseChapter]);

  // Get count of selected verses from current browse page
  const browseSelectedCount = useMemo(() => {
    if (!browseBook || !browseChapter) return 0;
    const chapter = parseInt(browseChapter, 10);
    return internalSelectedVerses.filter(
      v => v.book === browseBook && v.chapter === chapter
    ).length;
  }, [internalSelectedVerses, browseBook, browseChapter]);

  // Group selected verses by book:chapter for summary display
  const groupedSelections = useMemo(() => {
    const groups = {};
    internalSelectedVerses.forEach(v => {
      const key = `${v.book}.${v.chapter}`;
      if (!groups[key]) {
        groups[key] = { book: v.book, chapter: v.chapter, verses: [] };
      }
      groups[key].verses.push(v.verse);
    });
    // Sort verses within each group
    Object.values(groups).forEach(g => g.verses.sort((a, b) => a - b));
    return Object.entries(groups);
  }, [internalSelectedVerses]);

  // Clear all selections across all pages
  const clearAllSelections = useCallback(() => {
    setInternalSelectedVerses([]);
  }, []);

  // Initialize internal selection from external selectedVerses or all verses
  useEffect(() => {
    if (selectedVerses && selectedVerses.length > 0) {
      setInternalSelectedVerses(selectedVerses);
    } else if (allVerses.length > 0) {
      // Default: select all verses
      setInternalSelectedVerses(allVerses.map(v => ({
        ...v,
        book: selectedBook,
        chapter: selectedChapter,
        id: `${selectedBook}:${selectedChapter}:${v.verse}`
      })));
    }
  }, [selectedVerses, allVerses, selectedBook, selectedChapter]);

  // Toggle verse selection
  const toggleVerseSelection = useCallback((verse) => {
    const verseId = `${selectedBook}:${selectedChapter}:${verse.verse}`;
    setInternalSelectedVerses(prev => {
      const isSelected = prev.some(v => v.id === verseId || (v.book === selectedBook && v.chapter === selectedChapter && v.verse === verse.verse));
      if (isSelected) {
        return prev.filter(v => !(v.id === verseId || (v.book === selectedBook && v.chapter === selectedChapter && v.verse === verse.verse)));
      } else {
        return [...prev, { ...verse, book: selectedBook, chapter: selectedChapter, id: verseId }];
      }
    });
  }, [selectedBook, selectedChapter]);

  // Select all verses
  const selectAllVerses = useCallback(() => {
    setInternalSelectedVerses(allVerses.map(v => ({
      ...v,
      book: selectedBook,
      chapter: selectedChapter,
      id: `${selectedBook}:${selectedChapter}:${v.verse}`
    })));
  }, [allVerses, selectedBook, selectedChapter]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setInternalSelectedVerses([]);
  }, []);

  // Check if a verse is selected
  const isVerseSelected = useCallback((verseNum) => {
    return internalSelectedVerses.some(v => v.verse === verseNum && v.book === selectedBook && v.chapter === selectedChapter);
  }, [internalSelectedVerses, selectedBook, selectedChapter]);

  // Use internal selection for analysis
  const effectiveSelectedVerses = internalSelectedVerses;
  const effectiveIsMultiVerse = effectiveSelectedVerses.length > 0;
  // Auto-detect text type if not provided
  const detectedTextType = useMemo(() => {
    if (textType) return textType;
    if (selectedBook && isTalmudBook(selectedBook)) return 'talmud';
    return 'torah';
  }, [textType, selectedBook]);

  const isTalmud = detectedTextType === 'talmud';

  // Format multi-verse text with verse references for better AI context
  const formattedMultiVerseText = useMemo(() => {
    if (!effectiveIsMultiVerse || effectiveSelectedVerses.length === 0) {
      return text;
    }

    // Sort verses by book, chapter, and verse number (supports multi-page)
    const sortedVerses = [...effectiveSelectedVerses].sort((a, b) => {
      if (a.book !== b.book) return a.book.localeCompare(b.book);
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    // Group by book/chapter for better context
    let lastBook = null;
    let lastChapter = null;

    // Format each verse with its reference for AI context
    return sortedVerses.map(v => {
      let prefix = '';
      // Add book/chapter header when it changes (multi-page support)
      if (v.book !== lastBook || v.chapter !== lastChapter) {
        if (lastBook !== null) prefix = '\n'; // Add spacing between sections
        prefix += `--- ${v.book} ${v.chapter} ---\n`;
        lastBook = v.book;
        lastChapter = v.chapter;
      }
      return `${prefix}[${v.chapter}:${v.verse}] ${v.hebrewText}`;
    }).join('\n');
  }, [effectiveIsMultiVerse, effectiveSelectedVerses, text]);

  // Generate proper multi-verse reference string (e.g., "Genesis.1:1-5" or "Genesis.1:1,3,5")
  const multiVerseReference = useMemo(() => {
    if (!effectiveIsMultiVerse || effectiveSelectedVerses.length === 0) {
      return reference;
    }

    // Group by book and chapter
    const groups = {};
    effectiveSelectedVerses.forEach(v => {
      const key = `${v.book}.${v.chapter}`;
      if (!groups[key]) {
        groups[key] = { book: v.book, chapter: v.chapter, verses: [] };
      }
      groups[key].verses.push(v.verse);
    });

    // Format each group with verse ranges
    const parts = Object.values(groups).map(g => {
      const sortedVerses = g.verses.sort((a, b) => a - b);

      // Build ranges for consecutive verses
      const ranges = [];
      let start = sortedVerses[0];
      let end = start;

      for (let i = 1; i <= sortedVerses.length; i++) {
        if (i < sortedVerses.length && sortedVerses[i] === end + 1) {
          end = sortedVerses[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          if (i < sortedVerses.length) {
            start = sortedVerses[i];
            end = start;
          }
        }
      }

      return `${g.book}.${g.chapter}:${ranges.join(',')}`;
    });

    return parts.join('; ');
  }, [effectiveIsMultiVerse, effectiveSelectedVerses, reference]);

  // Aggregate Rashi commentary for multi-verse mode (supports multi-page)
  const aggregatedRashiText = useMemo(() => {
    if (!effectiveIsMultiVerse) return rashiText;
    if (!rashiDataMap || effectiveSelectedVerses.length === 0) return rashiText;

    const parts = [];
    const sortedVerses = [...effectiveSelectedVerses].sort((a, b) => {
      if (a.book !== b.book) return a.book.localeCompare(b.book);
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    sortedVerses.forEach(v => {
      const key = `${v.book}:${v.chapter}:${v.verse}`;
      const rashiComments = rashiDataMap[key];
      if (rashiComments) {
        if (Array.isArray(rashiComments)) {
          rashiComments.forEach(comment => {
            if (comment?.hebrew) {
              parts.push(`[${v.book} ${v.chapter}:${v.verse}] ${comment.hebrew}`);
            }
          });
        } else if (rashiComments.hebrew) {
          parts.push(`[${v.book} ${v.chapter}:${v.verse}] ${rashiComments.hebrew}`);
        }
      }
    });

    return parts.length > 0 ? parts.join('\n\n') : rashiText;
  }, [effectiveIsMultiVerse, effectiveSelectedVerses, rashiDataMap, rashiText]);

  // Aggregate Onkelos for multi-verse mode (note: Onkelos map is per-chapter, keyed by verse number)
  const aggregatedOnkelosText = useMemo(() => {
    if (!effectiveIsMultiVerse) return onkelosText;
    if (!onkelosDataMap || effectiveSelectedVerses.length === 0) return onkelosText;

    const parts = [];
    const sortedVerses = [...effectiveSelectedVerses].sort((a, b) => {
      if (a.book !== b.book) return a.book.localeCompare(b.book);
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    // Note: Onkelos data is currently loaded per-chapter, so multi-chapter selection
    // will only have Onkelos for the currently displayed chapter
    sortedVerses.forEach(v => {
      const onkelos = onkelosDataMap[v.verse];
      if (onkelos?.targetText) {
        parts.push(`[${v.book} ${v.chapter}:${v.verse}] ${onkelos.targetText}`);
      }
    });

    return parts.length > 0 ? parts.join('\n') : onkelosText;
  }, [effectiveIsMultiVerse, effectiveSelectedVerses, onkelosDataMap, onkelosText]);

  // Aggregate Ramban for multi-verse mode (supports multi-page)
  const aggregatedRambanText = useMemo(() => {
    if (!effectiveIsMultiVerse) return rambanText;
    if (!rambanDataMap || effectiveSelectedVerses.length === 0) return rambanText;

    const parts = [];
    const sortedVerses = [...effectiveSelectedVerses].sort((a, b) => {
      if (a.book !== b.book) return a.book.localeCompare(b.book);
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    sortedVerses.forEach(v => {
      const key = `${v.book}:${v.chapter}:${v.verse}`;
      const rambanComments = rambanDataMap[key];
      if (rambanComments) {
        if (Array.isArray(rambanComments)) {
          rambanComments.forEach(comment => {
            if (comment?.hebrew) {
              parts.push(`[${v.book} ${v.chapter}:${v.verse}] ${comment.hebrew}`);
            }
          });
        } else if (rambanComments.hebrew) {
          parts.push(`[${v.book} ${v.chapter}:${v.verse}] ${rambanComments.hebrew}`);
        }
      }
    });

    return parts.length > 0 ? parts.join('\n\n') : rambanText;
  }, [effectiveIsMultiVerse, effectiveSelectedVerses, rambanDataMap, rambanText]);

  // Default tab is always 'learn' now
  const [activeTab, setActiveTab] = useState('learn');

  // Word lookup state - for passing word from TzuratHaDaf to Words tab
  const [wordForLookup, setWordForLookup] = useState(null);

  // Handler for word clicks in TzuratHaDafTab
  const handleTzuratWordLookup = useCallback((word) => {
    // Use timestamp to force re-lookup even for same word
    setWordForLookup(`${word}|${Date.now()}`);
    setActiveTab('words'); // Switch to Words tab
  }, []);
  const [scholarlyData, setScholarlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isVocalized, setIsVocalized] = useState(false);
  const [originalText, setOriginalText] = useState(text);

  // Reset tab when text type changes (in case old tab IDs were stored)
  useEffect(() => {
    const validTabs = isTalmud
      ? ['learn', 'talmud', 'words', 'commentary', 'notebook']
      : ['learn', 'words', 'commentary', 'notebook'];
    if (!validTabs.includes(activeTab)) {
      setActiveTab('learn');
    }
  }, [activeTab, isTalmud]);

  // Local analysis (no API needed) - only for Talmud flow visualization
  const flowData = useMemo(() => {
    return isTalmud && text ? getFlowDiagram(text) : null;
  }, [text, isTalmud]);

  // Fetch scholarly data when reference changes
  useEffect(() => {
    if (!reference || !isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getCompleteScholarlyAnalysis(reference, text);
        setScholarlyData(data);
      } catch (error) {
        console.error('Failed to fetch scholarly data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reference, isOpen, text]);

  // Handle vocalization toggle
  const handleVocalizationToggle = useCallback(async () => {
    if (!text) return;

    if (isVocalized) {
      onTextChange?.(originalText);
      setIsVocalized(false);
    } else {
      try {
        setOriginalText(text);
        const vocalized = await addVocalization(text, 'rabbinic');
        onTextChange?.(vocalized);
        setIsVocalized(true);
      } catch (error) {
        console.error('Vocalization failed:', error);
      }
    }
  }, [text, isVocalized, originalText, onTextChange]);

  // Dynamic tab configuration based on text type
  // 5 tabs for Talmud, 4 for Torah/other
  const tabs = useMemo(() => {
    // Core 4 tabs - cleaner interface with Hebrew + English format
    const coreTabs = [
      { id: 'learn', label: 'לימוד Learn', icon: '📚', badge: 0 },
      { id: 'words', label: 'מילים Words', icon: '📖', badge: 0 },
      { id: 'commentary', label: 'פירושים Commentary', icon: '💬', badge: scholarlyData?.summary?.commentaryCount || 0 },
      { id: 'notebook', label: 'מחברת Notebook', icon: '📝', badge: 0 }
    ];

    // Add Talmud tools tab for Talmud texts (Iyun/Bekius/Chazara modes)
    if (isTalmud) {
      coreTabs.splice(1, 0, { id: 'talmud', label: 'גמרא Talmud', icon: '📜', badge: 0 });
    }

    return coreTabs;
  }, [scholarlyData, isTalmud]);

  // Track Talmud view mode (for toggling between normal and tzurat hadaf)
  const [showTzuratHaDaf, setShowTzuratHaDaf] = useState(false);

  // Text layer selection for glossed text (main text, rashi, onkelos, etc.)
  const [glossedTextLayer, setGlossedTextLayer] = useState('main');

  // Auto-reset layer to 'main' if the selected layer text becomes unavailable
  useEffect(() => {
    const layerTextMap = {
      rashi: aggregatedRashiText,
      onkelos: aggregatedOnkelosText,
      ramban: aggregatedRambanText
    };
    // If current layer (not main) has no text, reset to main
    if (glossedTextLayer !== 'main' && !layerTextMap[glossedTextLayer]) {
      setGlossedTextLayer('main');
    }
  }, [glossedTextLayer, aggregatedRashiText, aggregatedOnkelosText, aggregatedRambanText]);

  // Simple panel title - just show reference
  const panelTitle = isTalmud ? 'Scholar Mode' : '';

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <div className={`scholar-mode-panel ${isTalmud ? 'talmud-mode' : 'torah-mode'}`}>
      {/* Header - Clean and minimal */}
      <div className="panel-header">
        <div className="header-left">
          {panelTitle && <h2 className="panel-title">{panelTitle}</h2>}
          <span className="panel-reference">
            {effectiveSelectedVerses.length > 0 ? (
              <>
                <span className="studying-badge">Studying {effectiveSelectedVerses.length} {effectiveSelectedVerses.length === 1 ? 'verse' : 'verses'}</span>
                <span className="reference-detail">{multiVerseReference || reference}</span>
              </>
            ) : (
              'Click verses to select, then analyze'
            )}
          </span>
        </div>
        <div className="header-right">
          {/* Verse Selector Toggle */}
          <button
            className={`verse-selector-toggle ${showVerseSelector ? 'active' : ''}`}
            onClick={() => setShowVerseSelector(!showVerseSelector)}
            title="Select verses from current or other pages"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="selector-count">
              {effectiveSelectedVerses.length > 0 ? effectiveSelectedVerses.length : '—'}
            </span>
          </button>

          {/* Tzurat HaDaf Toggle (Talmud only) */}
          {isTalmud && (
            <button
              className={`tzurat-toggle ${showTzuratHaDaf ? 'active' : ''}`}
              onClick={() => setShowTzuratHaDaf(!showTzuratHaDaf)}
              title="Toggle traditional page layout (צורת הדף)"
            >
              <span className="toggle-icon">📜</span>
            </button>
          )}

          {/* Vocalization Toggle (Talmud only) */}
          {isTalmud && (
            <button
              className={`vocalization-toggle ${isVocalized ? 'active' : ''}`}
              onClick={handleVocalizationToggle}
              title="Toggle nikud (vocalization)"
            >
              <span className="toggle-icon">ניקוד</span>
            </button>
          )}

          {/* Inline Glossing Toggle */}
          <button
            className={`gloss-toggle ${showInlineGlosses ? 'active' : ''}`}
            onClick={toggleInlineGlosses}
            title="Toggle inline word glossing"
          >
            <span className="toggle-icon">תרגום</span>
          </button>

          {/* Connectivity Status */}
          <ConnectivityIndicator compact />

          {/* Close Button */}
          <button className="close-button" onClick={onClose} title="Close (ESC)">
            ×
          </button>
        </div>
      </div>

      {/* Verse Selector Panel */}
      {showVerseSelector && (
        <div className="verse-selector-panel">
          {/* Mode Toggle: Current Page vs Browse Other Pages */}
          <div className="verse-selector-mode-tabs">
            <button
              className={`mode-tab ${!browseMode ? 'active' : ''}`}
              onClick={() => setBrowseMode(false)}
            >
              <span className="mode-tab-icon">📄</span>
              Current Page
              <span className="mode-tab-count">{allVerses.length}</span>
            </button>
            <button
              className={`mode-tab ${browseMode ? 'active' : ''}`}
              onClick={toggleBrowseMode}
            >
              <span className="mode-tab-icon">📚</span>
              Browse Other Pages
            </button>
          </div>

          {/* Current Page Mode */}
          {!browseMode && (
            <>
              {allVerses.length > 0 ? (
                <>
                  <div className="verse-selector-header">
                    <span className="selector-label">
                      {selectedBook} {selectedChapter}
                    </span>
                    <div className="selector-actions">
                      <button
                        className="selector-btn select-all"
                        onClick={selectAllVerses}
                        disabled={effectiveSelectedVerses.filter(v =>
                          v.book === selectedBook && v.chapter === selectedChapter
                        ).length === allVerses.length}
                      >
                        Select All
                      </button>
                      <button
                        className="selector-btn clear-all"
                        onClick={clearSelection}
                        disabled={effectiveSelectedVerses.filter(v =>
                          v.book === selectedBook && v.chapter === selectedChapter
                        ).length === 0}
                      >
                        Clear Page
                      </button>
                    </div>
                  </div>
                  <div className="verse-selector-list">
                    {allVerses.map(verse => (
                      <button
                        key={verse.verse}
                        className={`verse-chip ${isVerseSelected(verse.verse) ? 'selected' : ''}`}
                        onClick={() => toggleVerseSelection(verse)}
                        title={verse.hebrewText?.substring(0, 50) + '...'}
                      >
                        <span className="verse-num">{verse.verse}</span>
                        {isVerseSelected(verse.verse) && (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" className="check-icon">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="browse-hint">
                  No verses on current page. Use "Browse Other Pages" to select verses.
                </div>
              )}
            </>
          )}

          {/* Browse Other Pages Mode */}
          {browseMode && (
            <div className="browse-mode-content">
              {/* Book/Chapter Navigation */}
              <div className="browse-navigation">
                <div className="browse-nav-row">
                  <label className="browse-label">Book:</label>
                  <select
                    className="browse-select"
                    value={browseBook || ''}
                    onChange={(e) => handleBrowseBookChange(e.target.value)}
                  >
                    <option value="">Select a book...</option>
                    {Object.entries(sefarimCategories).map(([key, category]) => (
                      <optgroup key={key} label={`${category.hebrewName} - ${category.name}`}>
                        {category.books.map(book => (
                          <option key={book} value={book}>{book}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {browseBook && (
                  <div className="browse-nav-row">
                    <label className="browse-label">Chapter:</label>
                    <select
                      className="browse-select"
                      value={browseChapter || ''}
                      onChange={(e) => handleBrowseChapterChange(e.target.value)}
                    >
                      <option value="">Select chapter...</option>
                      {availableChapters.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Browse Verses */}
              {browseChapter && (
                <>
                  <div className="verse-selector-header">
                    <span className="selector-label">
                      {browseBook} {browseChapter} - Select verses to add:
                    </span>
                    <div className="selector-actions">
                      <button
                        className="selector-btn select-all"
                        onClick={selectAllBrowseVerses}
                        disabled={browseSelectedCount === browseVerses.length}
                      >
                        Select All
                      </button>
                      <button
                        className="selector-btn clear-all"
                        onClick={clearBrowseVerses}
                        disabled={browseSelectedCount === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {loadingBrowseVerses ? (
                    <div className="browse-loading">
                      <div className="loading-spinner" />
                      <span>Loading verses...</span>
                    </div>
                  ) : browseVerses.length > 0 ? (
                    <div className="verse-selector-list">
                      {browseVerses.map(verse => (
                        <button
                          key={verse.verse}
                          className={`verse-chip ${isBrowseVerseSelected(verse.verse) ? 'selected' : ''}`}
                          onClick={() => toggleBrowseVerseSelection(verse)}
                          title={verse.hebrewText?.substring(0, 50) + '...'}
                        >
                          <span className="verse-num">{verse.verse}</span>
                          {isBrowseVerseSelected(verse.verse) && (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" className="check-icon">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="browse-empty">No verses found</div>
                  )}
                </>
              )}

              {!browseChapter && browseBook && (
                <div className="browse-hint">Select a chapter to view verses</div>
              )}

              {!browseBook && (
                <div className="browse-hint">Select a book to start browsing</div>
              )}
            </div>
          )}

          {/* Selection Summary */}
          {effectiveSelectedVerses.length > 0 && (
            <div className="selection-summary">
              <div className="summary-header">
                <span className="summary-label">Selected:</span>
                <span className="summary-count">{effectiveSelectedVerses.length} verse(s)</span>
                <button
                  className="selector-btn clear-all-btn"
                  onClick={clearAllSelections}
                  title="Clear all selections"
                >
                  Clear All
                </button>
              </div>
              <div className="summary-refs">
                {groupedSelections.map(([key, group]) => (
                  <span key={key} className="summary-ref-chip">
                    {group.book} {group.chapter}:{group.verses.join(',')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline Glossed Text Section */}
      {showInlineGlosses && effectiveSelectedVerses.length > 0 && (() => {
        // Compute current layer text and metadata
        const layerConfig = {
          main: {
            text: effectiveSelectedVerses.map(v => v.hebrewText).join(' '),
            icon: isTalmud ? '📜' : '📖',
            label: isTalmud ? 'Gemara' : 'Torah',
            language: isTalmud ? 'aramaic' : 'hebrew',
            textSource: isTalmud ? 'gemara' : 'torah',
            color: 'main'
          },
          rashi: {
            text: aggregatedRashiText,
            icon: '🔍',
            label: 'Rashi',
            language: 'hebrew',
            textSource: 'rashi',
            color: 'rashi'
          },
          onkelos: {
            text: aggregatedOnkelosText,
            icon: '🏛️',
            label: 'Onkelos',
            language: 'aramaic',
            textSource: 'targum',
            color: 'onkelos'
          },
          ramban: {
            text: aggregatedRambanText,
            icon: '📚',
            label: 'Ramban',
            language: 'hebrew',
            textSource: 'rashi',
            color: 'ramban'
          }
        };

        const currentLayer = layerConfig[glossedTextLayer] || layerConfig.main;
        const hasText = currentLayer.text && currentLayer.text.trim().length > 0;

        return (
          <div className={`glossed-text-section layer-${currentLayer.color}`}>
            <div className="glossed-text-header">
              <div className="glossed-header-top">
                <span className="glossed-label">
                  <span className="layer-icon">{currentLayer.icon}</span>
                  {currentLayer.label}
                </span>
                <span className="glossed-ref">{multiVerseReference || reference}</span>
              </div>

              {/* Quick Layer Toggle Buttons */}
              <div className="layer-quick-toggles">
                <button
                  className={`layer-toggle-btn ${glossedTextLayer === 'main' ? 'active' : ''}`}
                  onClick={() => setGlossedTextLayer('main')}
                  title={isTalmud ? 'Gemara text' : 'Torah text'}
                >
                  {isTalmud ? '📜' : '📖'}
                  <span className="toggle-label">{isTalmud ? 'גמרא' : 'תורה'}</span>
                </button>
                {aggregatedRashiText && (
                  <button
                    className={`layer-toggle-btn rashi ${glossedTextLayer === 'rashi' ? 'active' : ''}`}
                    onClick={() => setGlossedTextLayer('rashi')}
                    title="Rashi commentary"
                  >
                    🔍
                    <span className="toggle-label">רש״י</span>
                  </button>
                )}
                {aggregatedOnkelosText && (
                  <button
                    className={`layer-toggle-btn onkelos ${glossedTextLayer === 'onkelos' ? 'active' : ''}`}
                    onClick={() => setGlossedTextLayer('onkelos')}
                    title="Targum Onkelos"
                  >
                    🏛️
                    <span className="toggle-label">תרגום</span>
                  </button>
                )}
                {aggregatedRambanText && (
                  <button
                    className={`layer-toggle-btn ramban ${glossedTextLayer === 'ramban' ? 'active' : ''}`}
                    onClick={() => setGlossedTextLayer('ramban')}
                    title="Ramban commentary"
                  >
                    📚
                    <span className="toggle-label">רמב״ן</span>
                  </button>
                )}

                <span className="glossed-hint">👆 Click word to lookup</span>
              </div>
            </div>

            {hasText ? (
              <GlossedText
                text={currentLayer.text}
                language={currentLayer.language}
                textSource={currentLayer.textSource}
                showGlosses={true}
                onWordClick={(word) => {
                  // Use timestamp to force re-lookup even for same word
                  setWordForLookup(`${word}|${Date.now()}`);
                  setActiveTab('words');
                }}
              />
            ) : (
              <div className="glossed-empty-state">
                <span className="empty-icon">📭</span>
                <span className="empty-message">
                  No {currentLayer.label} text available for this selection
                </span>
                <button
                  className="empty-action"
                  onClick={() => setGlossedTextLayer('main')}
                >
                  Show main text
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Mini Flow Bar (Talmud only) */}
      {isTalmud && flowData && flowData.nodes?.length > 0 && (
        <div className="mini-flow-container">
          <MiniFlowBar flowData={flowData} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            {...tab}
            isActive={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Tab Content - SIMPLIFIED 4 TABS */}
      <div className="tab-content">
        {loading && !['learn', 'words', 'notebook'].includes(activeTab) ? (
          <LoadingState
            message="Loading scholarly data..."
            subMessage="Fetching commentaries and references from Sefaria"
          />
        ) : (
          <>
            {/* LEARN Tab - AI Analysis modes (includes Chavruta features) */}
            {activeTab === 'learn' && !showTzuratHaDaf && (
              <AIAnalysisTab
                text={effectiveIsMultiVerse ? formattedMultiVerseText : text}
                reference={multiVerseReference || reference}
                textType={detectedTextType}
                selectedBook={selectedBook}
                selectedVerse={selectedVerse}
                selectedVerses={effectiveSelectedVerses}
                isMultiVerse={effectiveIsMultiVerse}
                rashiText={aggregatedRashiText}
                onkelosText={aggregatedOnkelosText}
                rambanText={aggregatedRambanText}
              />
            )}

            {/* Tzurat HaDaf view - Talmud only, toggleable */}
            {activeTab === 'learn' && showTzuratHaDaf && isTalmud && (
              <TzuratHaDafTab
                text={text}
                reference={reference}
                onWordLookup={handleTzuratWordLookup}
              />
            )}

            {/* TALMUD Tab - Iyun/Bekius/Chazara study modes (Talmud only) */}
            {activeTab === 'talmud' && isTalmud && (
              <TalmudToolsTab
                text={text}
                reference={reference}
              />
            )}

            {/* WORDS Tab - Dictionary lookup */}
            {activeTab === 'words' && (
              <WordsTab
                verseText={selectedVerse?.hebrewText || effectiveSelectedVerses[0]?.hebrewText || ''}
                verseRef={multiVerseReference || reference}
                initialWord={wordForLookup}
                onWordLookupComplete={() => setWordForLookup(null)}
              />
            )}

            {/* COMMENTARY Tab - Sefaria commentaries */}
            {activeTab === 'commentary' && (
              <CommentaryTab
                commentaries={scholarlyData?.commentaries}
                reference={multiVerseReference || reference}
                book={selectedBook}
                chapter={selectedChapter || effectiveSelectedVerses[0]?.chapter}
                verse={selectedVerse?.verse || effectiveSelectedVerses[0]?.verse}
              />
            )}

            {/* NOTEBOOK Tab - Personal journal (Questions, Insights, Progress, Today) */}
            {activeTab === 'notebook' && (
              <NotebookTab
                selectedBook={selectedBook}
                selectedChapter={selectedChapter || effectiveSelectedVerses[0]?.chapter}
                selectedVerse={selectedVerse || effectiveSelectedVerses[0]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when relevant props change
export default memo(ScholarModePanel, (prevProps, nextProps) => {
  // Custom comparison - only re-render when these key props change
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.text === nextProps.text &&
    prevProps.reference === nextProps.reference &&
    prevProps.selectedBook === nextProps.selectedBook &&
    prevProps.selectedChapter === nextProps.selectedChapter &&
    prevProps.selectedVerse?.verse === nextProps.selectedVerse?.verse &&
    prevProps.rashiText === nextProps.rashiText &&
    prevProps.onkelosText === nextProps.onkelosText
  );
});
