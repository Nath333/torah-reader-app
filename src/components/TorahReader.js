import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './TorahReader.css';
import { isTalmudBook, isMishnahBook, getRashiForVerse, getTosafotForDaf, getMaharshaForDaf, getRambanForVerse } from '../services/sefariaApi';
import { translateWithSource, translateEnglishToFrench, translateWithBoldPreservation, clearCache } from '../services/englishToFrenchService';
import LoadingSkeleton from './LoadingSkeleton';
import useSpeech from '../hooks/useSpeech';
import ClickableText from './ClickableText';
import VerseJump from './VerseJump';
import CommentaryViewer from './CommentaryViewer';
import { getStoredApiKey } from '../services/groqService';
import ScholarModeButton from './ScholarModeButton';
import ScholarModePanel from './ScholarModePanel';
// Extracted subcomponents
import SafeText from './SafeText';
import DiburTranslation from './DiburTranslation';
import RashiFrenchTranslation from './RashiFrenchTranslation';
import NoteEditor from './NoteEditor';
import { CommentaryContent } from './CommentaryBlock';
import { AnnotatedTranslationInline } from './AnnotatedTranslation';
import { hasAnnotationMarkup } from '../utils/sanitize';
import { processHebrewText } from '../utils/hebrewUtils';

// Import CSS for extracted components
import './CommentaryBlock.css';

const TorahReader = ({
  verses,
  onkelos = [],
  onBookmarkVerse,
  selectedBook,
  selectedChapter,
  isTorahBook = false,
  loading,
  getShareLink,
  verseNotes,
  // Vocabulary props
  onSaveWord,
  hasWord,
  // French translation
  showFrench = false,
  onToggleFrench,
  // Onkelos translation
  showOnkelos = true,
  onToggleOnkelos,
  // Rashi translation
  showRashi = false,
  onToggleRashi,
  // Tosafot commentary (Gemara only)
  showTosafot = false,
  onToggleTosafot,
  // Maharsha commentary (Gemara only)
  showMaharsha = false,
  onToggleMaharsha,
  // Ramban commentary (Torah only)
  showRamban = false,
  onToggleRamban,
  // Navigation for cross-references
  onNavigateToRef
}) => {
  const [showTranslation, setShowTranslation] = useState(true);
  const [enableClickableText, setEnableClickableText] = useState(true);
  // Hebrew text display options
  const [showVowels, setShowVowels] = useState(true);
  const [showCantillation, setShowCantillation] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [highlightedVerse, setHighlightedVerse] = useState(null);
  const [expandedCommentaries, setExpandedCommentaries] = useState({});
  const [commentaryData, setCommentaryData] = useState({});
  const [copiedVerse, setCopiedVerse] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [speakingVerse, setSpeakingVerse] = useState(null);
  const [rashiData, setRashiData] = useState({});
  const [rashiLoading, setRashiLoading] = useState({});
  const [tosafotData, setTosafotData] = useState({});
  const [tosafotLoading, setTosafotLoading] = useState(false);
  const [maharshaData, setMaharshaData] = useState({});
  const [maharshaLoading, setMaharshaLoading] = useState(false);
  const [rambanData, setRambanData] = useState({});
  const [rambanLoading, setRambanLoading] = useState({});
  const [onkelosFrench, setOnkelosFrench] = useState({}); // French translations for Onkelos
  const [verseFrench, setVerseFrench] = useState({}); // French translations for main verse text
  // Side-panel commentary state
  const [commentaryPanelVerse, setCommentaryPanelVerse] = useState(null);
  // Unified Study Center state (replaces AIStudyPanel)
  const [studyPanelState, setStudyPanelState] = useState({
    isOpen: false,
    verse: null,          // Single verse object
    verses: null,         // Multi-verse array for passage analysis
    isMultiVerse: false
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  // Multi-verse/multi-page selection state
  // Each selected verse stores: { book, chapter, verse, hebrewText, englishText, id }
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState([]); // Now stores full references across pages
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null); // For shift-click range selection
  const [copiedSelection, setCopiedSelection] = useState(false); // For copy feedback
  const [rippleVerse, setRippleVerse] = useState(null); // For ripple animation
  const [showSelectionPreview, setShowSelectionPreview] = useState(false); // For selection preview panel
  const [cacheCleared, setCacheCleared] = useState(false); // For cache clear feedback
  // Scholar Mode state - discourse analysis, NER, citations
  const [scholarModeText, setScholarModeText] = useState('');
  const { speak, stop, speaking, supported: speechSupported, hebrewVoiceAvailable, voicesLoaded } = useSpeech();

  // Clear French translation cache and reload
  const handleClearCache = useCallback(() => {
    clearCache();
    setVerseFrench({});
    setOnkelosFrench({});
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }, []);

  // Check for API key on mount and when study panel is opened
  useEffect(() => {
    setHasApiKey(!!getStoredApiKey());
  }, [studyPanelState.isOpen]);

  // Ref for scrolling to specific verses
  const versesContainerRef = useRef(null);

  // Scroll to a specific verse number
  const scrollToVerse = useCallback((verseNumber) => {
    const container = versesContainerRef.current;
    if (!container) return;

    const verseElement = container.querySelector(`[data-verse="${verseNumber}"]`);
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedVerse(verseNumber);
      // Remove highlight after a moment
      setTimeout(() => setHighlightedVerse(null), 2000);
    }
  }, []);

  // Check if current book is Talmud
  const isTalmud = useMemo(() => isTalmudBook(selectedBook), [selectedBook]);

  // Create Onkelos lookup map for quick access
  const onkelosMap = useMemo(() => {
    const map = {};
    onkelos.forEach(item => {
      map[item.verse] = item;
    });
    return map;
  }, [onkelos]);

  // Load Rashi for a specific verse
  const loadRashiForVerse = useCallback(async (verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    if (rashiData[cacheKey] || rashiLoading[cacheKey]) return;

    setRashiLoading(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const comments = await getRashiForVerse(selectedBook, selectedChapter, verseNumber);
      setRashiData(prev => ({ ...prev, [cacheKey]: comments }));
    } catch (error) {
      console.error('Failed to fetch Rashi:', error);
      setRashiData(prev => ({ ...prev, [cacheKey]: [] }));
    }
    setRashiLoading(prev => ({ ...prev, [cacheKey]: false }));
  }, [selectedBook, selectedChapter, rashiData, rashiLoading]);

  // Load Rashi when showRashi is enabled
  useEffect(() => {
    if (showRashi && verses.length > 0) {
      verses.forEach(verse => {
        loadRashiForVerse(verse.verse);
      });
    }
  }, [showRashi, verses, loadRashiForVerse]);

  // Load Tosafot for Talmud (loads once per daf)
  const loadTosafot = useCallback(async () => {
    if (!isTalmud || tosafotLoading || tosafotData[`${selectedBook}:${selectedChapter}`]) return;

    setTosafotLoading(true);
    try {
      const comments = await getTosafotForDaf(selectedBook, selectedChapter);
      setTosafotData(prev => ({ ...prev, [`${selectedBook}:${selectedChapter}`]: comments }));
    } catch (error) {
      console.error('Failed to fetch Tosafot:', error);
      setTosafotData(prev => ({ ...prev, [`${selectedBook}:${selectedChapter}`]: [] }));
    }
    setTosafotLoading(false);
  }, [selectedBook, selectedChapter, isTalmud, tosafotLoading, tosafotData]);

  // Load Tosafot when showTosafot is enabled (Talmud only)
  useEffect(() => {
    if (showTosafot && isTalmud) {
      loadTosafot();
    }
  }, [showTosafot, isTalmud, loadTosafot]);

  // Load Maharsha for Talmud (loads once per daf)
  const loadMaharsha = useCallback(async () => {
    if (!isTalmud || maharshaLoading || maharshaData[`${selectedBook}:${selectedChapter}`]) return;

    setMaharshaLoading(true);
    try {
      const data = await getMaharshaForDaf(selectedBook, selectedChapter);
      setMaharshaData(prev => ({ ...prev, [`${selectedBook}:${selectedChapter}`]: data }));
    } catch (error) {
      console.error('Failed to fetch Maharsha:', error);
      setMaharshaData(prev => ({ ...prev, [`${selectedBook}:${selectedChapter}`]: { comments: [] } }));
    }
    setMaharshaLoading(false);
  }, [selectedBook, selectedChapter, isTalmud, maharshaLoading, maharshaData]);

  // Load Maharsha when showMaharsha is enabled (Talmud only)
  useEffect(() => {
    if (showMaharsha && isTalmud) {
      loadMaharsha();
    }
  }, [showMaharsha, isTalmud, loadMaharsha]);

  // Load Ramban for a specific verse
  const loadRambanForVerse = useCallback(async (verseNumber) => {
    const cacheKey = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    if (rambanData[cacheKey] || rambanLoading[cacheKey]) return;

    setRambanLoading(prev => ({ ...prev, [cacheKey]: true }));
    try {
      const comments = await getRambanForVerse(selectedBook, selectedChapter, verseNumber);
      setRambanData(prev => ({ ...prev, [cacheKey]: comments }));
    } catch (error) {
      console.error('Failed to fetch Ramban:', error);
      setRambanData(prev => ({ ...prev, [cacheKey]: { comments: [] } }));
    }
    setRambanLoading(prev => ({ ...prev, [cacheKey]: false }));
  }, [selectedBook, selectedChapter, rambanData, rambanLoading]);

  // Load Ramban when showRamban is enabled (Torah only)
  useEffect(() => {
    if (showRamban && isTorahBook && verses.length > 0) {
      verses.forEach(verse => {
        loadRambanForVerse(verse.verse);
      });
    }
  }, [showRamban, isTorahBook, verses, loadRambanForVerse]);

  // Load French translations for Onkelos when showFrench is enabled
  useEffect(() => {
    if (showFrench && showOnkelos && onkelos.length > 0) {
      const translateOnkelos = async () => {
        const frenchTranslations = {};
        for (const item of onkelos) {
          if (item.english && !onkelosFrench[item.verse]) {
            try {
              const french = await translateEnglishToFrench(item.english);
              if (french) {
                frenchTranslations[item.verse] = french;
              }
            } catch (error) {
              console.warn('Failed to translate Onkelos to French:', error);
            }
          }
        }
        if (Object.keys(frenchTranslations).length > 0) {
          setOnkelosFrench(prev => ({ ...prev, ...frenchTranslations }));
        }
      };
      translateOnkelos();
    }
  }, [showFrench, showOnkelos, onkelos, onkelosFrench]);

  // Load French translations for main verses when showFrench is enabled
  // Uses bold-preserving translation when rawEnglishHtml is available
  useEffect(() => {
    if (showFrench && verses.length > 0) {
      const translateVerses = async () => {
        const frenchTranslations = {};
        for (const verse of verses) {
          const cacheKey = `${selectedBook}:${selectedChapter}:${verse.verse}`;
          if (verse.englishText && !verseFrench[cacheKey]) {
            try {
              // Use bold-preserving translation if HTML markup available
              if (verse.rawEnglishHtml && hasAnnotationMarkup(verse.rawEnglishHtml)) {
                const result = await translateWithBoldPreservation(verse.rawEnglishHtml);
                if (result && result.translation) {
                  frenchTranslations[cacheKey] = result;
                }
              } else {
                // Fallback to regular translation
                const result = await translateWithSource(verse.englishText);
                if (result && result.translation) {
                  frenchTranslations[cacheKey] = result;
                }
              }
            } catch (error) {
              console.warn('Failed to translate verse to French:', error);
            }
          }
        }
        if (Object.keys(frenchTranslations).length > 0) {
          setVerseFrench(prev => ({ ...prev, ...frenchTranslations }));
        }
      };
      translateVerses();
    }
  }, [showFrench, verses, selectedBook, selectedChapter, verseFrench]);

  const speakVerse = useCallback((verse) => {
    if (speakingVerse === verse.verse && speaking) {
      stop();
      setSpeakingVerse(null);
    } else {
      setSpeakingVerse(verse.verse);
      speak(verse.hebrewText, 'he-IL');
    }
  }, [speakingVerse, speaking, speak, stop]);

  // Stop speaking when verse changes
  useEffect(() => {
    if (speaking) {
      stop();
      setSpeakingVerse(null);
    }
  }, [selectedBook, selectedChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerseClick = useCallback((verseNumber) => {
    setHighlightedVerse(prev => prev === verseNumber ? null : verseNumber);
  }, []);

  // Create a unique ID for a verse (for multi-page selection)
  const getVerseId = useCallback((book, chapter, verseNum) => {
    return `${book}:${chapter}:${verseNum}`;
  }, []);

  // Multi-verse selection handlers with shift-click support (MULTI-PAGE)
  const toggleVerseSelection = useCallback((verse, event) => {
    if (!selectionMode) return;

    const verseIndex = verses.findIndex(v => v.verse === verse.verse);
    const verseId = getVerseId(selectedBook, selectedChapter, verse.verse);

    // Trigger ripple effect
    setRippleVerse(verse.verse);
    setTimeout(() => setRippleVerse(null), 500);

    // Shift-click for range selection (only within current page)
    if (event?.shiftKey && lastSelectedIndex !== null && verseIndex !== -1) {
      const start = Math.min(lastSelectedIndex, verseIndex);
      const end = Math.max(lastSelectedIndex, verseIndex);
      const rangeVerses = verses.slice(start, end + 1);

      setSelectedVerses(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const newVerses = rangeVerses
          .filter(v => !existingIds.has(getVerseId(selectedBook, selectedChapter, v.verse)))
          .map(v => ({
            ...v,
            id: getVerseId(selectedBook, selectedChapter, v.verse),
            book: selectedBook,
            chapter: selectedChapter
          }));
        return [...prev, ...newVerses];
      });
      return;
    }

    setSelectedVerses(prev => {
      const isSelected = prev.some(v => v.id === verseId);
      if (isSelected) {
        return prev.filter(v => v.id !== verseId);
      } else {
        // Add with full reference info
        const newVerse = {
          ...verse,
          id: verseId,
          book: selectedBook,
          chapter: selectedChapter
        };
        return [...prev, newVerse];
      }
    });

    setLastSelectedIndex(verseIndex);
  }, [selectionMode, verses, lastSelectedIndex, selectedBook, selectedChapter, getVerseId]);

  // Check if a verse on current page is selected
  const isVerseSelected = useCallback((verseNum) => {
    const verseId = getVerseId(selectedBook, selectedChapter, verseNum);
    return selectedVerses.some(v => v.id === verseId);
  }, [selectedVerses, selectedBook, selectedChapter, getVerseId]);

  // Get unique pages/chapters in selection
  const getSelectedPages = useCallback(() => {
    const pages = new Map();
    selectedVerses.forEach(v => {
      const pageKey = `${v.book}:${v.chapter}`;
      if (!pages.has(pageKey)) {
        pages.set(pageKey, { book: v.book, chapter: v.chapter, count: 0 });
      }
      pages.get(pageKey).count++;
    });
    return Array.from(pages.values());
  }, [selectedVerses]);

  // Clear selection for a specific page
  const clearPageSelection = useCallback((book, chapter) => {
    setSelectedVerses(prev => prev.filter(v => !(v.book === book && v.chapter === chapter)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
    setLastSelectedIndex(null);
  }, []);

  // Copy selected verses to clipboard (multi-page aware)
  const copySelectedVerses = useCallback(async () => {
    if (selectedVerses.length === 0) return;

    // Group by page for better formatting
    const grouped = {};
    selectedVerses.forEach(verse => {
      const key = `${verse.book} ${verse.chapter}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(verse);
    });

    const text = Object.entries(grouped).map(([ref, verses]) => {
      const versesText = verses.map(v =>
        `  ${v.verse}. ${v.hebrewText}\n     ${v.englishText || ''}`
      ).join('\n\n');
      return `📖 ${ref}\n${versesText}`;
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSelection(true);
      setTimeout(() => setCopiedSelection(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedVerses]);

  // Get selection order for a verse on current page (1-indexed)
  const getSelectionOrder = useCallback((verseNumber) => {
    const verseId = getVerseId(selectedBook, selectedChapter, verseNumber);
    const index = selectedVerses.findIndex(v => v.id === verseId);
    return index >= 0 ? index + 1 : null;
  }, [selectedVerses, selectedBook, selectedChapter, getVerseId]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Turning off selection mode - clear selection
        setSelectedVerses([]);
        setLastSelectedIndex(null);
      }
      return !prev;
    });
  }, []);

  // Open Study Center with multiple selected verses (passage analysis)
  const openMultiVerseStudy = useCallback(() => {
    if (selectedVerses.length > 0) {
      setStudyPanelState({
        isOpen: true,
        verse: null,
        verses: selectedVerses,
        isMultiVerse: true
      });
    }
  }, [selectedVerses]);

  // Toggle Study Center - unified study panel (Scholar Mode for Talmud, Study Center for Torah)
  const toggleScholarMode = useCallback(() => {
    // Combine all visible Hebrew text for analysis
    const allText = verses.map(v => v.hebrewText).join(' ');
    setScholarModeText(allText);
    setStudyPanelState(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
      verse: null,
      verses: null,
      isMultiVerse: false
    }));
  }, [verses]);

  // Get multi-page reference summary
  const getMultiPageReference = useCallback(() => {
    const pages = getSelectedPages();
    if (pages.length === 0) return '';
    if (pages.length === 1) {
      const p = pages[0];
      const versesOnPage = selectedVerses.filter(v => v.book === p.book && v.chapter === p.chapter);
      const verseNums = versesOnPage.map(v => v.verse).sort((a, b) => a - b);
      const rangeStr = verseNums.length === 1 ? verseNums[0] :
        (verseNums.every((n, i) => i === 0 || n === verseNums[i-1] + 1)
          ? `${verseNums[0]}-${verseNums[verseNums.length-1]}`
          : verseNums.join(','));
      return `${p.book} ${p.chapter}:${rangeStr}`;
    }
    // Multiple pages
    return pages.map(p => `${p.chapter} (${p.count})`).join(' + ');
  }, [selectedVerses, getSelectedPages]);

  // Get full Jewish reference string
  const getJewishReference = useCallback(() => {
    if (selectedVerses.length === 0) return '';
    return getMultiPageReference();
  }, [selectedVerses, getMultiPageReference]);

  // Select all verses on current page (adds to existing selection)
  const selectAllVerses = useCallback(() => {
    const newVerses = verses.map(v => ({
      ...v,
      id: getVerseId(selectedBook, selectedChapter, v.verse),
      book: selectedBook,
      chapter: selectedChapter
    }));

    setSelectedVerses(prev => {
      const existingIds = new Set(prev.map(v => v.id));
      const toAdd = newVerses.filter(v => !existingIds.has(v.id));
      return [...prev, ...toAdd];
    });
  }, [verses, selectedBook, selectedChapter, getVerseId]);

  // Get count of selected verses on current page (used for Select All button text)
  const currentPageSelectionCount = useMemo(() => {
    return selectedVerses.filter(v => v.book === selectedBook && v.chapter === selectedChapter).length;
  }, [selectedVerses, selectedBook, selectedChapter]);

  // Check if all verses on current page are selected
  const allCurrentPageSelected = useMemo(() => {
    return verses.length > 0 && currentPageSelectionCount === verses.length;
  }, [verses.length, currentPageSelectionCount]);

  // Keyboard shortcuts for selection mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when in selection mode
      if (!selectionMode) return;

      // Escape: Clear selection or exit selection mode
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedVerses.length > 0) {
          // First press: clear selection
          clearSelection();
        } else {
          // Second press (when already empty): exit selection mode
          setSelectionMode(false);
        }
      }

      // Ctrl+A / Cmd+A: Select all verses on current page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only capture if we're in selection mode and not in an input field
        const target = e.target;
        const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isEditable) {
          e.preventDefault();
          selectAllVerses();
        }
      }

      // Ctrl+C / Cmd+C: Copy selected verses
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedVerses.length > 0) {
        const target = e.target;
        const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        const hasTextSelection = window.getSelection()?.toString().length > 0;
        if (!isEditable && !hasTextSelection) {
          e.preventDefault();
          copySelectedVerses();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode, selectedVerses, clearSelection, selectAllVerses, copySelectedVerses]);

  // Open commentary panel for a verse (side-by-side view)
  const openCommentaryPanel = useCallback((verse) => {
    setCommentaryPanelVerse(verse);
  }, []);

  // Close commentary panel
  const closeCommentaryPanel = useCallback(() => {
    setCommentaryPanelVerse(null);
  }, []);

  // Legacy toggle commentary (for backwards compatibility)
  const toggleCommentary = useCallback(async (verseNumber, verse) => {
    // Use new side panel instead of inline expansion
    if (commentaryPanelVerse?.verse === verseNumber) {
      closeCommentaryPanel();
    } else {
      openCommentaryPanel(verse || { verse: verseNumber });
    }
  }, [commentaryPanelVerse, openCommentaryPanel, closeCommentaryPanel]);

  const copyVerse = useCallback(async (verse) => {
    const text = `${selectedBook} ${selectedChapter}:${verse.verse}\n${verse.hebrewText}\n${verse.englishText || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVerse(verse.verse);
      setTimeout(() => setCopiedVerse(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedBook, selectedChapter]);

  const shareVerse = useCallback(async (verse) => {
    const url = getShareLink?.(verse.verse) || '';
    const shareData = {
      title: `${selectedBook} ${selectedChapter}:${verse.verse}`,
      text: `${verse.hebrewText}\n\n${verse.englishText || ''}\n\n- ${selectedBook} ${selectedChapter}:${verse.verse}`,
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') copyVerse(verse);
      }
    } else {
      copyVerse(verse);
    }
  }, [selectedBook, selectedChapter, copyVerse, getShareLink]);

  const saveNote = useCallback((verseNumber, text) => {
    verseNotes?.setNote(selectedBook, selectedChapter, verseNumber, text);
  }, [verseNotes, selectedBook, selectedChapter]);

  useEffect(() => {
    setCommentaryData({});
    setExpandedCommentaries({});
    setEditingNote(null);
    setRashiData({});
    setRashiLoading({});
    setTosafotData({});
    setTosafotLoading(false);
    setMaharshaData({});
    setMaharshaLoading(false);
    setRambanData({});
    setRambanLoading({});
    setOnkelosFrench({}); // Clear French translations when chapter changes
    setVerseFrench({}); // Clear verse French translations when chapter changes
    setCommentaryPanelVerse(null); // Close commentary panel when chapter changes
    // Reset page-specific selection state (but KEEP selection for multi-page support)
    setLastSelectedIndex(null);
    // Note: We don't clear selectedVerses here to allow multi-page selection!
  }, [selectedBook, selectedChapter]);

  if (loading) {
    return (
      <div className="torah-reader">
        <div className="reader-controls">
          <div className="skeleton-button" style={{ width: 140, height: 38 }} />
          <div className="font-controls">
            <div className="skeleton-button" style={{ width: 38, height: 38 }} />
            <div className="skeleton-button" style={{ width: 50, height: 38 }} />
            <div className="skeleton-button" style={{ width: 38, height: 38 }} />
          </div>
        </div>
        <LoadingSkeleton count={5} type="verse" />
      </div>
    );
  }

  if (!verses || verses.length === 0) {
    return (
      <div className="torah-reader empty-state">
        <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>Select a book and chapter to view verses</p>
      </div>
    );
  }

  const isMishnah = isMishnahBook(selectedBook);

  return (
    <div className={`torah-reader-wrapper ${commentaryPanelVerse ? 'with-panel' : ''}`}>
      <div className={`torah-reader ${isTalmud ? 'talmud-mode' : ''}`}>
      {/* Reference Header for Talmud */}
      {isTalmud && (
        <div className="talmud-header">
          <div className="talmud-ref">
            <span className="tractate-name">{selectedBook}</span>
            <span className="daf-ref">{selectedChapter}</span>
          </div>
          <div className="talmud-tip">
            Click on Hebrew words to see definitions
          </div>
        </div>
      )}

      <div className="reader-controls" role="toolbar" aria-label="Reading controls">
        <div className="control-group">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="control-button"
            aria-pressed={showTranslation}
            aria-label={showTranslation ? 'Hide English translation' : 'Show English translation'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
              {showTranslation ? (
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              ) : (
                <><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
              )}
            </svg>
            {showTranslation ? 'Hide' : 'Show'} Translation
          </button>

          <button
            onClick={() => setEnableClickableText(!enableClickableText)}
            className={`control-button ${enableClickableText ? 'active' : ''}`}
            aria-pressed={enableClickableText}
            aria-label={enableClickableText ? 'Disable word lookup' : 'Enable word lookup'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
              <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Word Lookup
          </button>

          {/* Hebrew text display options - Vowels (נקודות) */}
          <button
            onClick={() => setShowVowels(!showVowels)}
            className={`control-button ${showVowels ? 'active' : ''}`}
            aria-pressed={showVowels}
            aria-label={showVowels ? 'Hide vowels' : 'Show vowels'}
            title={showVowels ? 'Hide vowels (נקודות)' : 'Show vowels (נקודות)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon">
              <circle cx="12" cy="18" r="2" fill="currentColor" />
              <path d="M8 6h8M12 6v8" />
            </svg>
            {showVowels ? 'Vowels ✓' : 'Vowels'}
          </button>

          {/* Hebrew text display options - Trope/Cantillation (טעמים) */}
          <button
            onClick={() => setShowCantillation(!showCantillation)}
            className={`control-button ${showCantillation ? 'active' : ''}`}
            aria-pressed={showCantillation}
            aria-label={showCantillation ? 'Hide trope marks' : 'Show trope marks'}
            title={showCantillation ? 'Hide cantillation (טעמים)' : 'Show cantillation (טעמים)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon">
              <path d="M3 12h4l3-6 4 12 3-6h4" />
            </svg>
            {showCantillation ? 'Trope ✓' : 'Trope'}
          </button>

          {onToggleFrench && (
            <button
              onClick={onToggleFrench}
              className={`control-button ${showFrench ? 'active' : ''}`}
              aria-pressed={showFrench}
              aria-label={showFrench ? 'Hide French translations' : 'Show French translations'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              {showFrench ? 'FR' : 'FR'}
            </button>
          )}

          {/* Clear French cache button - fixes bold markers issue */}
          {showFrench && (
            <button
              onClick={handleClearCache}
              className={`control-button clear-cache-btn ${cacheCleared ? 'success' : ''}`}
              aria-label="Clear French translation cache and reload"
              title="Clear cache to fix translation display issues"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                {cacheCleared ? (
                  <path d="M5 13l4 4L19 7" />
                ) : (
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                )}
              </svg>
              {cacheCleared ? '✓' : '↻'}
            </button>
          )}

          {/* Onkelos translation toggle - only for Torah books */}
          {isTorahBook && onToggleOnkelos && (
            <button
              onClick={onToggleOnkelos}
              className={`control-button onkelos-btn ${showOnkelos ? 'active' : ''}`}
              aria-pressed={showOnkelos}
              aria-label={showOnkelos ? 'Hide Onkelos translation' : 'Show Onkelos translation'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              Onkelos
            </button>
          )}

          {/* Rashi commentary toggle - available for Torah and Gemara */}
          {onToggleRashi && (
            <button
              onClick={onToggleRashi}
              className={`control-button rashi-btn ${showRashi ? 'active' : ''}`}
              aria-pressed={showRashi}
              aria-label={showRashi ? 'Hide Rashi commentary' : 'Show Rashi commentary'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {isTalmud ? 'רש״י' : 'Rashi'}
            </button>
          )}

          {/* Tosafot commentary toggle - Gemara only */}
          {isTalmud && onToggleTosafot && (
            <button
              onClick={onToggleTosafot}
              className={`control-button tosafot-btn ${showTosafot ? 'active' : ''}`}
              aria-pressed={showTosafot}
              aria-label={showTosafot ? 'Hide Tosafot commentary' : 'Show Tosafot commentary'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              תוספות
            </button>
          )}

          {/* Maharsha commentary toggle - Gemara only */}
          {isTalmud && onToggleMaharsha && (
            <button
              onClick={onToggleMaharsha}
              className={`control-button maharsha-btn ${showMaharsha ? 'active' : ''}`}
              aria-pressed={showMaharsha}
              aria-label={showMaharsha ? 'Hide Maharsha commentary' : 'Show Maharsha commentary'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              מהרש״א
            </button>
          )}

          {/* Ramban commentary toggle - Torah only */}
          {isTorahBook && onToggleRamban && (
            <button
              onClick={onToggleRamban}
              className={`control-button ramban-btn ${showRamban ? 'active' : ''}`}
              aria-pressed={showRamban}
              aria-label={showRamban ? 'Hide Ramban commentary' : 'Show Ramban commentary'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
                <path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
              רמב״ן
            </button>
          )}

          {/* Multi-verse selection mode toggle */}
          <button
            onClick={toggleSelectionMode}
            className={`control-button select-mode-btn ${selectionMode ? 'active' : ''}`}
            aria-pressed={selectionMode}
            aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode to select multiple verses'}
            title="Select multiple verses for combined analysis"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {selectionMode ? 'Exit Select' : 'Select Verses'}
          </button>

          {/* Scholar Mode - Study Center for Torah, Discourse Analysis for Talmud */}
          <ScholarModeButton
            text={scholarModeText || verses.map(v => v.hebrewText).join(' ')}
            isActive={studyPanelState.isOpen}
            onClick={toggleScholarMode}
          />
        </div>

        <div className="font-controls" role="group" aria-label="Font size controls">
          <button onClick={() => setFontSize(s => Math.max(s - 2, 12))} className="control-button font-btn" aria-label="Decrease font size">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 12H4" /></svg>
          </button>
          <span className="font-size-display" aria-live="polite">{fontSize}px</span>
          <button onClick={() => setFontSize(s => Math.min(s + 2, 28))} className="control-button font-btn" aria-label="Increase font size">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <VerseJump
          verses={verses}
          onJumpToVerse={scrollToVerse}
          currentBook={selectedBook}
          currentChapter={selectedChapter}
        />
      </div>

      {/* Multi-verse selection toolbar - Jewish Style UI */}
      {selectionMode && (
        <div className="selection-toolbar">
          {/* Left side: Reference display */}
          <div className="selection-indicator">
            <div className={`selection-badge ${selectedVerses.length > 0 ? 'has-selection' : ''}`}>
              {selectedVerses.length}
            </div>
            <div className="selection-info">
              {selectedVerses.length > 0 ? (
                <>
                  <span className="selection-ref-label">
                    {isTalmud ? 'גמרא' : isMishnah ? 'משנה' : 'תנ״ך'}
                  </span>
                  <span className="selection-reference">
                    {getJewishReference()}
                  </span>
                </>
              ) : (
                <>
                  <span className="selection-title">
                    {isTalmud ? 'בחר קטעים מהדף' : isMishnah ? 'בחר משניות' : 'בחר פסוקים'}
                  </span>
                  <span className="selection-hint">
                    {isTalmud ? 'Select passages from daf' : isMishnah ? 'Select mishnas' : 'Select verses'} • <kbd>Shift</kbd> range • <kbd>Ctrl+A</kbd> all
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Center: Page chips showing multi-page selection - clickable to navigate */}
          {selectedVerses.length > 0 && (
            <div className="selection-pages">
              {getSelectedPages().map((page) => {
                const isCurrentPage = page.book === selectedBook && page.chapter === selectedChapter;
                const pageIsTalmud = isTalmudBook(page.book);
                const pageIsMishnah = isMishnahBook(page.book);
                const unitLabel = pageIsTalmud ? 'passages' : pageIsMishnah ? 'mishnas' : 'verses';
                const locationLabel = pageIsTalmud ? 'daf' : pageIsMishnah ? 'chapter' : 'chapter';
                return (
                  <button
                    key={`${page.book}:${page.chapter}`}
                    className={`page-chip ${isCurrentPage ? 'current' : ''} ${pageIsTalmud ? 'talmud' : pageIsMishnah ? 'mishnah' : 'tanakh'}`}
                    title={isCurrentPage
                      ? `${page.book} ${page.chapter}: ${page.count} ${unitLabel} (current ${locationLabel})`
                      : `Navigate to ${page.book} ${page.chapter} (${page.count} ${unitLabel})`}
                    onClick={() => {
                      if (!isCurrentPage && onNavigateToRef) {
                        onNavigateToRef(page.book, page.chapter);
                      }
                    }}
                  >
                    {pageIsTalmud && <span className="page-type-badge">דף</span>}
                    {pageIsMishnah && <span className="page-type-badge">פרק</span>}
                    <span className="page-name">{page.chapter}</span>
                    <span className="page-count">{page.count}</span>
                    <span
                      className="page-clear"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPageSelection(page.book, page.chapter);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          clearPageSelection(page.book, page.chapter);
                        }
                      }}
                      title={`Clear ${page.chapter} selection`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  </button>
                );
              })}
              {getSelectedPages().length > 1 && (
                <span className="pages-summary">
                  = {selectedVerses.length} {isTalmud ? 'passages' : isMishnah ? 'mishnas' : 'verses'}
                </span>
              )}
            </div>
          )}

          {/* Right side: Actions */}
          <div className="selection-actions">
            {/* Quick select buttons */}
            {selectedVerses.length === 0 && (
              <button
                className="selection-action-btn select-all-btn"
                onClick={selectAllVerses}
                title={`Select all ${verses.length} ${isTalmud ? 'passages on this daf' : isMishnah ? 'mishnas in this chapter' : 'verses in this chapter'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <path d="M7 7L17 17M17 7L7 17" strokeOpacity="0" />
                </svg>
                {isTalmud ? `כל הדף (${verses.length})` : isMishnah ? `כל הפרק (${verses.length})` : `Select All (${verses.length})`}
              </button>
            )}

            {selectedVerses.length > 0 && (
              <>
                <button
                  className={`selection-action-btn preview-btn ${showSelectionPreview ? 'active' : ''}`}
                  onClick={() => setShowSelectionPreview(!showSelectionPreview)}
                  title={showSelectionPreview ? 'Hide preview' : 'Preview selected verses'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showSelectionPreview ? (
                      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    )}
                  </svg>
                  {showSelectionPreview ? 'Hide' : 'Preview'}
                </button>
                <button
                  className={`selection-action-btn copy-btn ${copiedSelection ? 'copied' : ''}`}
                  onClick={copySelectedVerses}
                  title="Copy selected verses (Ctrl+C)"
                >
                  {copiedSelection ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <div className="selection-divider" />
              </>
            )}

            {selectedVerses.length >= 1 && (
              <button
                className="selection-action-btn analyze-btn"
                onClick={openMultiVerseStudy}
                disabled={!hasApiKey}
                title={hasApiKey ? 'Analyze selected verses with AI' : 'Configure API key in settings'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {selectedVerses.length === 1 ? (isTalmud ? 'לימוד' : 'Study') : (isTalmud ? 'לימוד קטע' : 'Analyze')}
              </button>
            )}

            {selectedVerses.length > 0 && !allCurrentPageSelected && (
              <button
                className="selection-action-btn select-all-btn small"
                onClick={selectAllVerses}
                title={`Select all ${verses.length - currentPageSelectionCount} remaining on this page`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                +{verses.length - currentPageSelectionCount}
              </button>
            )}

            {selectedVerses.length > 0 && (
              <button
                className="selection-action-btn clear-btn"
                onClick={clearSelection}
                title="Clear selection"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Preview Panel - expandable summary of selected verses */}
      {selectionMode && showSelectionPreview && selectedVerses.length > 0 && (
        <div className={`selection-preview-panel ${isTalmud ? 'talmud' : isMishnah ? 'mishnah' : 'tanakh'}`}>
          <div className="preview-header">
            <h4 className="preview-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {isTalmud ? 'תצוגה מקדימה' : isMishnah ? 'תצוגה מקדימה' : 'Selection Preview'}
              <span className="preview-count">
                {selectedVerses.length} {isTalmud ? 'קטעים' : isMishnah ? 'משניות' : 'verses'}
              </span>
            </h4>
            <button
              className="preview-close"
              onClick={() => setShowSelectionPreview(false)}
              title="Close preview"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="preview-content">
            {getSelectedPages().map((page) => {
              const pageIsTalmud = isTalmudBook(page.book);
              const pageIsMishnah = isMishnahBook(page.book);
              const unitSingular = pageIsTalmud ? 'passage' : pageIsMishnah ? 'mishna' : 'verse';
              const unitPlural = pageIsTalmud ? 'passages' : pageIsMishnah ? 'mishnas' : 'verses';
              const locationPrefix = pageIsTalmud ? 'דף' : pageIsMishnah ? 'פרק' : '';
              return (
              <div key={`${page.book}:${page.chapter}`} className={`preview-page-group ${pageIsTalmud ? 'talmud' : pageIsMishnah ? 'mishnah' : 'tanakh'}`}>
                <div className="preview-page-header">
                  <span className="preview-page-name">
                    {locationPrefix && <span className="preview-type-prefix">{locationPrefix}</span>}
                    {page.book} {page.chapter}
                  </span>
                  <span className="preview-page-count">{page.count} {page.count === 1 ? unitSingular : unitPlural}</span>
                </div>
                <div className="preview-verses">
                  {selectedVerses
                    .filter(v => v.book === page.book && v.chapter === page.chapter)
                    .sort((a, b) => a.verse - b.verse)
                    .map((verse) => (
                      <div key={verse.id} className="preview-verse">
                        <span className="preview-verse-num">{verse.verse}</span>
                        <div className="preview-verse-text">
                          <div className="preview-hebrew" dir="rtl" lang="he">
                            {verse.hebrewText?.substring(0, 100)}{verse.hebrewText?.length > 100 ? '...' : ''}
                          </div>
                          {verse.englishText && (
                            <div className="preview-english" lang="en">
                              {verse.englishText.substring(0, 80)}{verse.englishText.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </div>
                        <button
                          className="preview-verse-remove"
                          onClick={() => {
                            setSelectedVerses(prev => prev.filter(v => v.id !== verse.id));
                          }}
                          title="Remove from selection"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      <div className={`verses-container ${selectionMode ? 'selection-mode' : ''}`} ref={versesContainerRef} style={{ fontSize: `${fontSize}px` }}>
        {verses.map((verse) => {
          const hasNote = verseNotes?.hasNote(selectedBook, selectedChapter, verse.verse);
          const noteText = verseNotes?.getNote(selectedBook, selectedChapter, verse.verse);
          const isSelected = isVerseSelected(verse.verse);
          const selectionOrder = getSelectionOrder(verse.verse);
          const hasRipple = rippleVerse === verse.verse;

          return (
            <article
              key={verse.verse}
              data-verse={verse.verse}
              className={`verse ${highlightedVerse === verse.verse ? 'highlighted' : ''} ${hasNote ? 'has-note' : ''} ${isSelected ? 'verse-selected' : ''} ${selectionMode ? 'selectable' : ''} ${hasRipple ? 'ripple' : ''} fade-in`}
              aria-label={`${selectedBook} ${selectedChapter}:${verse.verse}`}
              onClick={selectionMode ? (e) => toggleVerseSelection(verse, e) : undefined}
            >
              {/* Selection order badge */}
              {isSelected && selectionOrder && selectedVerses.length > 1 && (
                <span className="selection-order">{selectionOrder}</span>
              )}
              <div className="verse-header">
                {/* Selection checkbox in selection mode */}
                {selectionMode && (
                  <span className={`verse-checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    )}
                  </span>
                )}
                <button
                  className="verse-number"
                  onClick={(e) => {
                    if (selectionMode) {
                      e.stopPropagation();
                      toggleVerseSelection(verse, e);
                    } else {
                      handleVerseClick(verse.verse);
                    }
                  }}
                  aria-label={selectionMode
                    ? `Verse ${verse.verse}, click to ${isSelected ? 'deselect' : 'select'}`
                    : `Verse ${verse.verse}, click to ${highlightedVerse === verse.verse ? 'unhighlight' : 'highlight'}`}
                  aria-pressed={selectionMode ? isSelected : highlightedVerse === verse.verse}
                >
                  {verse.verse}
                </button>
                <div className="verse-actions" role="toolbar" aria-label="Verse actions">
                  <button
                    className="action-button"
                    onClick={() => copyVerse(verse)}
                    aria-label={copiedVerse === verse.verse ? 'Copied!' : 'Copy verse'}
                  >
                    {copiedVerse === verse.verse ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    )}
                  </button>
                  <button className="action-button" onClick={() => shareVerse(verse)} aria-label="Share verse">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>
                  </button>
                  {speechSupported && (
                    <button
                      className={`action-button ${speakingVerse === verse.verse && speaking ? 'active' : ''} ${voicesLoaded && !hebrewVoiceAvailable ? 'no-hebrew-voice' : ''}`}
                      onClick={() => speakVerse(verse)}
                      aria-label={speakingVerse === verse.verse && speaking ? 'Stop reading' : 'Read verse aloud in Hebrew'}
                      aria-pressed={speakingVerse === verse.verse && speaking}
                      title={!voicesLoaded ? 'Loading voices...' : hebrewVoiceAvailable ? 'Read verse aloud in Hebrew' : 'Read verse (using fallback voice)'}
                    >
                      {speakingVerse === verse.verse && speaking ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" /></svg>
                      )}
                    </button>
                  )}
                  <button
                    className={`action-button ${hasNote ? 'active' : ''}`}
                    onClick={() => setEditingNote(editingNote === verse.verse ? null : verse.verse)}
                    aria-label={hasNote ? 'Edit note' : 'Add note'}
                    aria-expanded={editingNote === verse.verse}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    className={`commentary-toggle ${commentaryPanelVerse?.verse === verse.verse ? 'active' : ''}`}
                    onClick={() => toggleCommentary(verse.verse, verse)}
                    aria-label={commentaryPanelVerse?.verse === verse.verse ? 'Hide commentary' : 'Show commentary'}
                    aria-expanded={commentaryPanelVerse?.verse === verse.verse}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    {commentaryPanelVerse?.verse === verse.verse ? 'Hide' : 'Commentary'}
                  </button>
                  <button
                    className={`action-button study-button ${studyPanelState.verse?.verse === verse.verse ? 'active' : ''}`}
                    onClick={() => setStudyPanelState({
                      isOpen: true,
                      verse: verse,
                      verses: null,
                      isMultiVerse: false
                    })}
                    title={hasApiKey ? 'AI Study' : 'Configure API key for AI features'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Study
                  </button>
                  {onBookmarkVerse && (
                    <button className="bookmark-button" onClick={() => onBookmarkVerse(verse)} aria-label="Bookmark this verse">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="button-icon"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      Bookmark
                    </button>
                  )}
                </div>
              </div>

              <div className={`verse-content ${isTalmud ? 'talmud-content' : ''} ${showOnkelos && onkelosMap[verse.verse] ? 'with-onkelos' : ''}`} onClick={() => handleVerseClick(verse.verse)}>
                {enableClickableText ? (
                  <ClickableText language="hebrew"
                    text={processHebrewText(verse.hebrewText, { showVowels, showCantillation }) || 'טעות בטעינת הפסוק'}
                    className="hebrew-text"
                    onSaveWord={onSaveWord}
                    hasWord={hasWord}
                    showFrench={showFrench}
                  />
                ) : (
                  <div className="hebrew-text" lang="he" dir="rtl">{processHebrewText(verse.hebrewText, { showVowels, showCantillation }) || 'טעות בטעינת הפסוק'}</div>
                )}
                {/* English Translation with Source - bold = direct translation */}
                {showTranslation && (
                  <div className="english-translation" lang="en">
                    <div className="translation-header">
                      <span className="translation-lang-badge en">EN</span>
                      <span className="translation-source">Source: Sefaria.org (HE → EN)</span>
                    </div>
                    <div className="translation-text">
                      {verse.rawEnglishHtml && hasAnnotationMarkup(verse.rawEnglishHtml) ? (
                        <AnnotatedTranslationInline text={verse.rawEnglishHtml} language="en" />
                      ) : (
                        <SafeText text={verse.englishText || 'Error loading translation'} lang="en" />
                      )}
                    </div>
                  </div>
                )}

                {/* French Translation with Source */}
                {showFrench && showTranslation && (
                  <div className="french-translation" lang="fr">
                    <div className="translation-header">
                      <span className="translation-lang-badge fr">FR</span>
                      {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`] ? (
                        <span className="translation-source">
                          Source: {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].source || 'Dictionary'}
                          ({verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].method || 'EN → FR'})
                          {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].accuracy &&
                            <span className={`accuracy-badge ${verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].accuracy}`}>
                              {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].accuracy === 'high' ? '✓ Précis' :
                               verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].accuracy === 'medium' ? '~ Moyen' :
                               verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].accuracy === 'auto' ? '⚡ Auto' : '○ Partiel'}
                            </span>
                          }
                        </span>
                      ) : (
                        <span className="translation-source loading">Traduction en cours...</span>
                      )}
                    </div>
                    {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`] && (
                      <div className="translation-text">
                        {verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].rawHtml &&
                         hasAnnotationMarkup(verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].rawHtml) ? (
                          <AnnotatedTranslationInline
                            text={verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].rawHtml}
                            language="fr"
                          />
                        ) : (
                          <SafeText
                            text={verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`].translation}
                            lang="fr"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Onkelos Translation - Aramaic Targum */}
                {showOnkelos && isTorahBook && onkelosMap[verse.verse] && (
                  <div className="onkelos-section">
                    <div className="onkelos-header">
                      <div className="onkelos-label">
                        <span className="onkelos-badge">תרגום</span>
                        <span className="onkelos-title">Targum Onkelos</span>
                      </div>
                    </div>
                    <div className="onkelos-content">
                      {onkelosMap[verse.verse].aramaic && (
                        <div className="onkelos-aramaic" lang="arc" dir="rtl">
                          {processHebrewText(onkelosMap[verse.verse].aramaic, { showVowels, showCantillation })}
                        </div>
                      )}
                      {onkelosMap[verse.verse].english ? (
                        <div className="onkelos-english" lang="en">
                          <span className="translation-label">EN:</span> {onkelosMap[verse.verse].english}
                        </div>
                      ) : (
                        <div className="onkelos-english onkelos-no-translation" lang="en">
                          <span className="translation-label">Translation not available</span>
                        </div>
                      )}
                      {/* French translation for Onkelos */}
                      {showFrench && onkelosFrench[verse.verse] && (
                        <div className="onkelos-french" lang="fr">
                          <span className="translation-label">FR:</span> {onkelosFrench[verse.verse]}
                        </div>
                      )}
                      {showFrench && !onkelosFrench[verse.verse] && onkelosMap[verse.verse].english && (
                        <div className="onkelos-french onkelos-loading-french" lang="fr">
                          <span className="translation-label">FR:</span> <span className="loading-text">Chargement...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rashi Commentary Section */}
                {showRashi && (
                  <div className="rashi-section">
                    <div className="rashi-header">
                      <div className="rashi-label">
                        <span className="rashi-badge">רש״י</span>
                        <span className="rashi-title">{isTalmud ? 'Rashi on Gemara' : 'Rashi on Torah'}</span>
                      </div>
                    </div>
                    <div className="rashi-content">
                      {rashiLoading[`${selectedBook}:${selectedChapter}:${verse.verse}`] ? (
                        <div className="rashi-loading">
                          <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                          </svg>
                          Loading Rashi...
                        </div>
                      ) : rashiData[`${selectedBook}:${selectedChapter}:${verse.verse}`]?.length > 0 ? (
                        rashiData[`${selectedBook}:${selectedChapter}:${verse.verse}`].map((comment, idx) => (
                          <div key={idx} className="rashi-comment">
                            {comment.dibbur && (
                              <div className="rashi-dibbur-section">
                                <div className="dibbur-header">
                                  <span className="dibbur-label">דיבור המתחיל</span>
                                  <span className="dibbur-label-en">Opening Words</span>
                                </div>
                                {/* Dibbur in Rashi Script */}
                                <div className="rashi-dibbur rashi-dibbur-script" dir="rtl" lang="he">
                                  <span className="dibbur-script-badge">כתב רש״י</span>
                                  <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                                </div>
                                {/* Dibbur in Standard Hebrew */}
                                <div className="rashi-dibbur rashi-dibbur-standard" dir="rtl" lang="he">
                                  <span className="dibbur-script-badge standard">כתב מרובע</span>
                                  <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                                </div>
                                {/* Dibbur Translation - Dynamic EN/FR */}
                                <DiburTranslation englishText={comment.english} hebrewDibbur={comment.dibbur} />
                              </div>
                            )}
                            {/* Rashi Script (כתב רש"י) */}
                            <div className="rashi-hebrew rashi-script" dir="rtl" lang="he">
                              <span className="rashi-script-label">כתב רש״י</span>
                              {enableClickableText ? (
                                <ClickableText language="hebrew"
                                  text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                  className="rashi-text"
                                />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {/* Regular Hebrew (כתב מרובע) */}
                            <div className="rashi-hebrew-standard" dir="rtl" lang="he">
                              <span className="rashi-standard-label">כתב מרובע</span>
                              {enableClickableText ? (
                                <ClickableText language="hebrew"
                                  text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                  className="rashi-text-standard"
                                />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {comment.english && (
                              <div className="rashi-english" lang="en">
                                <span className="translation-label">EN:</span> {comment.english}
                              </div>
                            )}
                            {/* French translation for Rashi */}
                            {showFrench && comment.english && (
                              <RashiFrenchTranslation englishText={comment.english} />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="rashi-empty">
                          No Rashi commentary available for this verse
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tosafot Commentary Section - Gemara only */}
                {showTosafot && isTalmud && (
                  <div className="tosafot-section">
                    <div className="tosafot-header">
                      <div className="tosafot-label">
                        <span className="tosafot-badge">תוספות</span>
                        <span className="tosafot-title">Tosafot on Gemara</span>
                      </div>
                    </div>
                    <div className="tosafot-content">
                      {tosafotLoading ? (
                        <div className="tosafot-loading">
                          <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                          </svg>
                          Loading Tosafot...
                        </div>
                      ) : tosafotData[`${selectedBook}:${selectedChapter}`]?.length > 0 ? (
                        tosafotData[`${selectedBook}:${selectedChapter}`].map((comment, idx) => (
                          <div key={idx} className="tosafot-comment">
                            {comment.dibbur && (
                              <div className="tosafot-dibbur" dir="rtl" lang="he">
                                <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                              </div>
                            )}
                            <div className="tosafot-hebrew" dir="rtl" lang="he">
                              {enableClickableText ? (
                                <ClickableText language="hebrew"
                                  text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                  className="tosafot-text"
                                />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {comment.english && (
                              <div className="tosafot-english" lang="en">
                                <span className="translation-label">EN:</span> {comment.english}
                              </div>
                            )}
                            {/* French translation for Tosafot */}
                            {showFrench && comment.english && (
                              <RashiFrenchTranslation englishText={comment.english} />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="tosafot-empty">
                          No Tosafot commentary available for this daf
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Maharsha Commentary Section - Gemara only */}
                {showMaharsha && isTalmud && (
                  <div className="maharsha-section">
                    <div className="maharsha-header">
                      <div className="maharsha-label">
                        <span className="maharsha-badge">מהרש״א</span>
                        <span className="maharsha-title">Maharsha on Gemara</span>
                      </div>
                    </div>
                    <div className="maharsha-content">
                      {maharshaLoading ? (
                        <div className="maharsha-loading">
                          <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                          </svg>
                          Loading Maharsha...
                        </div>
                      ) : maharshaData[`${selectedBook}:${selectedChapter}`]?.comments?.length > 0 ? (
                        <>
                          {maharshaData[`${selectedBook}:${selectedChapter}`].halachot?.length > 0 && (
                            <div className="maharsha-subsection">
                              <div className="maharsha-subsection-title">חידושי הלכות</div>
                              {maharshaData[`${selectedBook}:${selectedChapter}`].halachot.map((comment, idx) => (
                                <div key={`halachot-${idx}`} className="maharsha-comment">
                                  {comment.dibbur && (
                                    <div className="maharsha-dibbur" dir="rtl" lang="he">
                                      <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                                    </div>
                                  )}
                                  <div className="maharsha-hebrew" dir="rtl" lang="he">
                                    {enableClickableText ? (
                                      <ClickableText language="hebrew"
                                        text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                        className="maharsha-text"
                                      />
                                    ) : (
                                      processHebrewText(comment.hebrew, { showVowels, showCantillation })
                                    )}
                                  </div>
                                  {comment.english && (
                                    <div className="maharsha-english" lang="en">
                                      <span className="translation-label">EN:</span> {comment.english}
                                    </div>
                                  )}
                                  {showFrench && comment.english && (
                                    <RashiFrenchTranslation englishText={comment.english} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {maharshaData[`${selectedBook}:${selectedChapter}`].aggadot?.length > 0 && (
                            <div className="maharsha-subsection">
                              <div className="maharsha-subsection-title">חידושי אגדות</div>
                              {maharshaData[`${selectedBook}:${selectedChapter}`].aggadot.map((comment, idx) => (
                                <div key={`aggadot-${idx}`} className="maharsha-comment">
                                  {comment.dibbur && (
                                    <div className="maharsha-dibbur" dir="rtl" lang="he">
                                      <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                                    </div>
                                  )}
                                  <div className="maharsha-hebrew" dir="rtl" lang="he">
                                    {enableClickableText ? (
                                      <ClickableText language="hebrew"
                                        text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                        className="maharsha-text"
                                      />
                                    ) : (
                                      processHebrewText(comment.hebrew, { showVowels, showCantillation })
                                    )}
                                  </div>
                                  {comment.english && (
                                    <div className="maharsha-english" lang="en">
                                      <span className="translation-label">EN:</span> {comment.english}
                                    </div>
                                  )}
                                  {showFrench && comment.english && (
                                    <RashiFrenchTranslation englishText={comment.english} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="maharsha-empty">
                          No Maharsha commentary available for this daf
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ramban Commentary Section - Torah only */}
                {showRamban && isTorahBook && (
                  <div className="ramban-section">
                    <div className="ramban-header">
                      <div className="ramban-label">
                        <span className="ramban-badge">רמב״ן</span>
                        <span className="ramban-title">Ramban on Torah</span>
                      </div>
                    </div>
                    <div className="ramban-content">
                      {rambanLoading[`${selectedBook}:${selectedChapter}:${verse.verse}`] ? (
                        <div className="ramban-loading">
                          <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                          </svg>
                          Loading Ramban...
                        </div>
                      ) : rambanData[`${selectedBook}:${selectedChapter}:${verse.verse}`]?.comments?.length > 0 ? (
                        rambanData[`${selectedBook}:${selectedChapter}:${verse.verse}`].comments.map((comment, idx) => (
                          <div key={idx} className="ramban-comment">
                            {comment.dibbur && (
                              <div className="ramban-dibbur" dir="rtl" lang="he">
                                <strong>{processHebrewText(comment.dibbur, { showVowels, showCantillation })}</strong>
                              </div>
                            )}
                            <div className="ramban-hebrew" dir="rtl" lang="he">
                              {enableClickableText ? (
                                <ClickableText language="hebrew"
                                  text={processHebrewText(comment.hebrew, { showVowels, showCantillation })}
                                  className="ramban-text"
                                />
                              ) : (
                                processHebrewText(comment.hebrew, { showVowels, showCantillation })
                              )}
                            </div>
                            {comment.english && (
                              <div className="ramban-english" lang="en">
                                <span className="translation-label">EN:</span> {comment.english}
                              </div>
                            )}
                            {showFrench && comment.english && (
                              <RashiFrenchTranslation englishText={comment.english} />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="ramban-empty">
                          No Ramban commentary available for this verse
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {hasNote && editingNote !== verse.verse && (
                <div className="verse-note">
                  <strong>Note:</strong> {noteText}
                </div>
              )}

              {editingNote === verse.verse && (
                <NoteEditor
                  note={noteText || ''}
                  onSave={(text) => saveNote(verse.verse, text)}
                  onClose={() => setEditingNote(null)}
                />
              )}

              {expandedCommentaries[verse.verse] && (
                <div className="commentary-section slide-down">
                  {commentaryData[`${selectedBook}:${selectedChapter}:${verse.verse}`] ? (
                    commentaryData[`${selectedBook}:${selectedChapter}:${verse.verse}`].length > 0 ? (
                      <CommentaryContent commentaries={commentaryData[`${selectedBook}:${selectedChapter}:${verse.verse}`]} verse={`${selectedBook} ${selectedChapter}:${verse.verse}`} />
                    ) : (
                      <div className="commentary-none">No commentary available.</div>
                    )
                  ) : (
                    <div className="commentary-loading">
                      <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" /></svg>
                      Loading...
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
        </div>
      </div>

      {/* Commentary Viewer - Unified UI for selecting and viewing commentaries */}
      {commentaryPanelVerse && (
        <CommentaryViewer
          isOpen={true}
          onClose={closeCommentaryPanel}
          verse={commentaryPanelVerse}
          verseText={verses.find(v => v.verse === commentaryPanelVerse?.verse)?.hebrewText}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          isTalmud={isTalmud}
          isMishnah={isMishnah}
          enableClickableText={enableClickableText}
        />
      )}

      {/* Unified Study Center - Works for both Torah and Talmud */}
      {studyPanelState.isOpen && (
        <ScholarModePanel
          text={studyPanelState.verse?.hebrewText || studyPanelState.verses?.map(v => v.hebrewText).join(' ') || scholarModeText || verses.map(v => v.hebrewText).join(' ')}
          reference={`${selectedBook}.${selectedChapter}`}
          isOpen={studyPanelState.isOpen}
          onClose={() => setStudyPanelState({ isOpen: false, verse: null, verses: null, isMultiVerse: false })}
          textType={isTalmud ? 'talmud' : 'torah'}
          selectedBook={selectedBook}
          selectedVerse={studyPanelState.verse}
          selectedVerses={studyPanelState.verses}
          isMultiVerse={studyPanelState.isMultiVerse}
          rashiText={studyPanelState.verse ? rashiData[`${selectedBook}:${selectedChapter}:${studyPanelState.verse.verse}`] : null}
          onkelosText={studyPanelState.verse ? onkelosMap[studyPanelState.verse.verse]?.targetText : null}
          rambanText={studyPanelState.verse ? rambanData[`${selectedBook}:${selectedChapter}:${studyPanelState.verse.verse}`] : null}
          rashiDataMap={rashiData}
          onkelosDataMap={onkelosMap}
          rambanDataMap={rambanData}
        />
      )}
    </div>
  );
};

export default React.memo(TorahReader);
