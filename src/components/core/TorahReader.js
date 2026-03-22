import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import './TorahReader.css';

// Hooks
import useSpeech from '../../hooks/useSpeech';
import useMastery from '../../hooks/useMastery';
import useCommentaryLoader from '../../hooks/useCommentaryLoader';
import useTranslationLoading from '../../hooks/useTranslationLoading';
import { useVerseSelection } from '../../hooks/useVerseSelection';
import { useSettings } from '../../context';

// Components
import LoadingSkeleton from '../shared/LoadingSkeleton';
import ScholarModePanel from '../scholar-mode/ScholarModePanel';
import ReaderControls from './ReaderControls';
import VerseRow from './VerseRow';
import EnhancedVerseDisplay from './EnhancedVerseDisplay';
import NoteEditor from '../shared/NoteEditor';

// Utils
import { processHebrewText } from '../../utils/hebrewUtils';
import { createLogger } from '../../utils/debug';

// Import CSS for extracted components
import '../commentary/CommentaryBlock.css';

const log = createLogger('TorahReader');

/**
 * TorahReader - Main text reader component for Torah, Talmud, and other texts
 *
 * Refactored to use extracted hooks and components:
 * - useCommentaryLoader: All commentary data loading
 * - useVerseSelection: Multi-verse selection and drag-to-select
 * - useTranslationLoading: French translation loading
 * - ReaderControls: Toolbar component
 * - VerseRow: Single verse rendering
 */
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
  onSaveWord,
  hasWord,
  onNavigateToRef,
  onPrevChapter,
  onNextChapter,
  totalChapters
}) => {
  // Get settings from context
  const settings = useSettings();
  const {
    showFrench,
    showOnkelos,
    showRashi,
    showTosafot,
    showMaharsha,
    showSoncino,
    showRamban,
    showIbnEzra,
    showSforno,
    toggleFrench: onToggleFrench,
    toggleOnkelos: onToggleOnkelos,
    toggleRashi: onToggleRashi,
    toggleTosafot: onToggleTosafot,
    toggleMaharsha: onToggleMaharsha,
    toggleSoncino: onToggleSoncino,
    toggleRamban: onToggleRamban,
    toggleIbnEzra: onToggleIbnEzra,
    toggleSforno: onToggleSforno,
    showVowels,
    showCantillation,
    toggleVowels,
    toggleCantillation
  } = settings;

  // Local UI state
  const [showTranslation, setShowTranslation] = useState(true);
  const [enableClickableText, setEnableClickableText] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [copiedVerse, setCopiedVerse] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [speakingVerse, setSpeakingVerse] = useState(null);

  // Rashi view controls
  const [showSquareScript, setShowSquareScript] = useState(false);
  const [showRashiEnglish, setShowRashiEnglish] = useState(true);

  // Word lookup card state
  const [selectedWordData, setSelectedWordData] = useState(null);

  // Study panel state
  const [studyPanelState, setStudyPanelState] = useState({
    isOpen: false,
    verse: null,
    verses: null,
    isMultiVerse: false
  });

  // Display mode (always simple for now)
  const displayMode = 'simple';

  // Refs
  const versesContainerRef = useRef(null);

  // Speech hook
  const { speak, stop, speaking, supported: speechSupported, hebrewVoiceAvailable } = useSpeech();

  // Mastery hook
  const { getVerseMastery, incrementMastery } = useMastery();

  // Verse selection hook
  const selection = useVerseSelection({
    selectedBook,
    selectedChapter,
    verses
  });

  // Commentary loading hook
  const commentaryData = useCommentaryLoader({
    selectedBook,
    selectedChapter,
    verses,
    isTorahBook,
    showFlags: {
      showRashi,
      showTosafot,
      showMaharsha,
      showSoncino,
      showRamban,
      showIbnEzra,
      showSforno
    }
  });

  // Translation loading hook
  const translationData = useTranslationLoading({
    verses,
    onkelos,
    selectedBook,
    selectedChapter,
    showFrench,
    showOnkelos
  });

  // Create Onkelos lookup map
  const onkelosMap = useMemo(() => {
    const map = {};
    onkelos.forEach(item => {
      map[item.verse] = item;
    });
    return map;
  }, [onkelos]);

  // Scroll to a specific verse
  const scrollToVerse = useCallback((verseNumber) => {
    const container = versesContainerRef.current;
    if (!container) return;

    const verseElement = container.querySelector(`[data-verse="${verseNumber}"]`);
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selection.highlightVerseTemporarily(verseNumber);
    }
  }, [selection]);

  // Speech handlers
  const speakVerse = useCallback((verse) => {
    if (speakingVerse === verse.verse && speaking) {
      stop();
      setSpeakingVerse(null);
    } else {
      setSpeakingVerse(verse.verse);
      speak(verse.hebrewText, 'he-IL');
    }
  }, [speakingVerse, speaking, speak, stop]);

  // Stop speaking when chapter changes
  useEffect(() => {
    if (speaking) {
      stop();
      setSpeakingVerse(null);
    }
  }, [selectedBook, selectedChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Study mode toggle
  const toggleStudyMode = useCallback(() => {
    if (studyPanelState.isOpen) {
      setStudyPanelState({ isOpen: false, verse: null, verses: null, isMultiVerse: false });
    } else {
      const versesToStudy = selection.selectedVerses.length > 0
        ? selection.selectedVerses
        : verses.map(v => ({
            ...v,
            id: `${selectedBook}:${selectedChapter}:${v.verse}`,
            book: selectedBook,
            chapter: selectedChapter
          }));

      if (selection.selectedVerses.length === 0) {
        selection.setSelectedVerses(versesToStudy);
      }

      setStudyPanelState({
        isOpen: true,
        verse: null,
        verses: versesToStudy,
        isMultiVerse: true
      });
    }
  }, [studyPanelState.isOpen, selection, verses, selectedBook, selectedChapter]);

  // Verse actions
  const copyVerse = useCallback(async (verse) => {
    const text = `${selectedBook} ${selectedChapter}:${verse.verse}\n${verse.hebrewText}\n${verse.englishText || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVerse(verse.verse);
      setTimeout(() => setCopiedVerse(null), 2000);
    } catch (err) {
      log.error('Failed to copy:', err);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+Shift+S: Toggle Scholar Mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        if (!isEditable) {
          e.preventDefault();
          toggleStudyMode();
        }
        return;
      }

      // Escape: Clear selection
      if (e.key === 'Escape' && selection.selectedVerses.length > 0) {
        e.preventDefault();
        selection.clearSelection();
      }

      // Enter: Open Scholar mode
      if (e.key === 'Enter' && selection.selectedVerses.length > 0 && !isEditable) {
        e.preventDefault();
        toggleStudyMode();
      }

      // Ctrl+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isEditable) {
        e.preventDefault();
        selection.selectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection, toggleStudyMode]);

  // Reset state on chapter change
  useEffect(() => {
    setEditingNote(null);
    selection.clearSelection();
  }, [selectedBook, selectedChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
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

  // Empty state
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

  const { isTalmud, hasSoncinoAvailable } = commentaryData;

  return (
    <div className={`torah-reader-wrapper ${studyPanelState.isOpen ? 'with-panel with-scholar-panel' : ''}`}>
      <div className={`torah-reader ${isTalmud ? 'talmud-mode' : ''}`}>
        {/* Talmud Header */}
        {isTalmud && (
          <div className="talmud-header">
            <div className="talmud-ref">
              <span className="tractate-name">{selectedBook}</span>
              <span className="daf-ref">{selectedChapter}</span>
            </div>
            <div className="talmud-tip">Click on Hebrew words to see definitions</div>
          </div>
        )}

        {/* Reader Controls */}
        <ReaderControls
          showTranslation={showTranslation}
          setShowTranslation={setShowTranslation}
          showFrench={showFrench}
          onToggleFrench={onToggleFrench}
          showVowels={showVowels}
          toggleVowels={toggleVowels}
          showCantillation={showCantillation}
          toggleCantillation={toggleCantillation}
          enableClickableText={enableClickableText}
          setEnableClickableText={setEnableClickableText}
          showOnkelos={showOnkelos}
          onToggleOnkelos={onToggleOnkelos}
          showRashi={showRashi}
          onToggleRashi={onToggleRashi}
          showRamban={showRamban}
          onToggleRamban={onToggleRamban}
          showIbnEzra={showIbnEzra}
          onToggleIbnEzra={onToggleIbnEzra}
          showSforno={showSforno}
          onToggleSforno={onToggleSforno}
          showTosafot={showTosafot}
          onToggleTosafot={onToggleTosafot}
          showMaharsha={showMaharsha}
          onToggleMaharsha={onToggleMaharsha}
          showSoncino={showSoncino}
          onToggleSoncino={onToggleSoncino}
          hasSoncinoAvailable={hasSoncinoAvailable}
          studyPanelIsOpen={studyPanelState.isOpen}
          onToggleStudyMode={toggleStudyMode}
          selectedVersesCount={selection.selectedVerses.length}
          fontSize={fontSize}
          setFontSize={setFontSize}
          verses={verses}
          onJumpToVerse={scrollToVerse}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          isTorahBook={isTorahBook}
          isTalmud={isTalmud}
        />

        {/* Verses Container */}
        <div
          className={`verses-container ${selection.isDragging ? 'is-dragging' : ''}`}
          ref={versesContainerRef}
          style={{ fontSize: `${fontSize}px` }}
          onMouseUp={selection.handleDragEnd}
          onMouseLeave={selection.handleDragEnd}
        >
          {verses.map((verse, index) => {
            const hasNote = verseNotes?.hasNote(selectedBook, selectedChapter, verse.verse);
            const noteText = verseNotes?.getNote(selectedBook, selectedChapter, verse.verse);
            const isSelected = selection.isVerseSelected(verse.verse);
            const selectionOrder = selection.selectedVerses.findIndex(v => v.id === `${selectedBook}:${selectedChapter}:${verse.verse}`) + 1;

            // Enhanced mode rendering
            if (displayMode !== 'simple') {
              return (
                <div
                  key={verse.verse}
                  data-verse={verse.verse}
                  className={`enhanced-verse-wrapper ${isSelected ? 'verse-selected' : ''} ${selection.rippleVerse === verse.verse ? 'ripple' : ''} ${selection.isInDragRange(verse.verse) ? 'in-drag-range' : ''} fade-in`}
                >
                  <EnhancedVerseDisplay
                    verse={verse}
                    hebrewText={processHebrewText(verse.hebrewText, { showVowels, showCantillation })}
                    englishText={verse.englishText}
                    frenchText={translationData.verseFrench[`${selectedBook}:${selectedChapter}:${verse.verse}`]?.translation}
                    onkelosText={onkelosMap[verse.verse]?.aramaic}
                    book={selectedBook}
                    chapter={selectedChapter}
                    verseNumber={verse.verse}
                    rashiText={commentaryData.rashiData[`${selectedBook}:${selectedChapter}:${verse.verse}`]?.[0]?.hebrew}
                    isSelected={false}
                    isBookmarked={false}
                    displayMode={displayMode}
                    showTranslations={showTranslation}
                    showFrench={showFrench}
                    showOnkelos={showOnkelos}
                    showCommentary={showRashi}
                    showMastery={true}
                    enlargeFirstLetter={verse.verse === 1}
                    onSaveWord={onSaveWord}
                    hasWord={hasWord}
                    onBookmark={() => onBookmarkVerse?.(verse)}
                  />
                  {hasNote && noteText && editingNote !== verse.verse && (
                    <div className="verse-note"><strong>Note:</strong> {noteText}</div>
                  )}
                  {editingNote === verse.verse && (
                    <NoteEditor
                      note={noteText || ''}
                      onSave={(text) => saveNote(verse.verse, text)}
                      onClose={() => setEditingNote(null)}
                    />
                  )}
                </div>
              );
            }

            // Simple mode - use VerseRow component
            return (
              <VerseRow
                key={verse.verse}
                verse={verse}
                index={index}
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                showTranslation={showTranslation}
                showFrench={showFrench}
                showVowels={showVowels}
                showCantillation={showCantillation}
                enableClickableText={enableClickableText}
                commentaryData={commentaryData}
                translationData={translationData}
                showOnkelos={showOnkelos}
                showRashi={showRashi}
                showTosafot={showTosafot}
                showMaharsha={showMaharsha}
                showSoncino={showSoncino}
                showRamban={showRamban}
                showIbnEzra={showIbnEzra}
                showSforno={showSforno}
                isTorahBook={isTorahBook}
                isTalmud={isTalmud}
                onkelosItem={onkelosMap[verse.verse]}
                isSelected={isSelected}
                selectionOrder={selectionOrder > 0 ? selectionOrder : null}
                selectionMode={false}
                hasRipple={selection.rippleVerse === verse.verse}
                inDragRange={selection.isInDragRange(verse.verse)}
                isHighlighted={selection.highlightedVerse === verse.verse}
                selectedVersesLength={selection.selectedVerses.length}
                onToggleSelection={selection.toggleVerseSelection}
                onDragStart={selection.handleDragStart}
                onDragMove={selection.handleDragMove}
                onCopy={copyVerse}
                onShare={shareVerse}
                onSpeak={speakVerse}
                onBookmark={onBookmarkVerse}
                copiedVerse={copiedVerse}
                speakingVerse={speakingVerse}
                speaking={speaking}
                speechSupported={speechSupported}
                hebrewVoiceAvailable={hebrewVoiceAvailable}
                hasNote={hasNote}
                noteText={noteText}
                editingNote={editingNote}
                setEditingNote={setEditingNote}
                onSaveNote={saveNote}
                getVerseMastery={getVerseMastery}
                incrementMastery={incrementMastery}
                onSaveWord={onSaveWord}
                hasWord={hasWord}
                onWordSelect={setSelectedWordData}
                selectedWordData={selectedWordData}
                onToggleSoncino={onToggleSoncino}
                showSquareScript={showSquareScript}
                setShowSquareScript={setShowSquareScript}
                showRashiEnglish={showRashiEnglish}
                setShowRashiEnglish={setShowRashiEnglish}
                hasSoncinoAvailable={hasSoncinoAvailable}
              />
            );
          })}
        </div>
      </div>

      {/* Study Panel */}
      {studyPanelState.isOpen && (
        <ScholarModePanel
          text={studyPanelState.verse?.hebrewText || studyPanelState.verses?.map(v => v.hebrewText).join(' ') || verses.map(v => v.hebrewText).join(' ')}
          reference={`${selectedBook}.${selectedChapter}`}
          isOpen={studyPanelState.isOpen}
          onClose={() => setStudyPanelState({ isOpen: false, verse: null, verses: null, isMultiVerse: false })}
          textType={isTalmud ? 'talmud' : 'torah'}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          selectedVerse={studyPanelState.verse}
          selectedVerses={studyPanelState.verses}
          isMultiVerse={studyPanelState.isMultiVerse}
          allVerses={verses}
          rashiText={studyPanelState.verse ? commentaryData.rashiData[`${selectedBook}:${selectedChapter}:${studyPanelState.verse.verse}`] : null}
          onkelosText={studyPanelState.verse ? onkelosMap[studyPanelState.verse.verse]?.targetText : null}
          rambanText={studyPanelState.verse ? commentaryData.rambanData[`${selectedBook}:${selectedChapter}:${studyPanelState.verse.verse}`] : null}
          rashiDataMap={commentaryData.rashiData}
          onkelosDataMap={onkelosMap}
          rambanDataMap={commentaryData.rambanData}
        />
      )}
    </div>
  );
};

TorahReader.propTypes = {
  verses: PropTypes.arrayOf(PropTypes.shape({
    verse: PropTypes.number.isRequired,
    hebrewText: PropTypes.string,
    englishText: PropTypes.string,
    rawEnglishHtml: PropTypes.string
  })).isRequired,
  onkelos: PropTypes.arrayOf(PropTypes.shape({
    verse: PropTypes.number,
    aramaic: PropTypes.string,
    english: PropTypes.string
  })),
  onBookmarkVerse: PropTypes.func,
  selectedBook: PropTypes.string.isRequired,
  selectedChapter: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  isTorahBook: PropTypes.bool,
  loading: PropTypes.bool,
  getShareLink: PropTypes.func,
  verseNotes: PropTypes.object,
  onSaveWord: PropTypes.func,
  hasWord: PropTypes.func,
  onNavigateToRef: PropTypes.func,
  onPrevChapter: PropTypes.func,
  onNextChapter: PropTypes.func,
  totalChapters: PropTypes.number
};

TorahReader.defaultProps = {
  onkelos: [],
  isTorahBook: false,
  loading: false,
  verseNotes: {}
};

export default React.memo(TorahReader);
