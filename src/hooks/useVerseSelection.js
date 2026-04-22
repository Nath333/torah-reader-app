/**
 * useVerseSelection - Custom hook for managing verse selection state
 *
 * Handles single-verse, multi-verse, and drag-to-select functionality.
 * Extracted from TorahReader to reduce component complexity.
 *
 * Features:
 * - Single click selection
 * - Shift+click range selection
 * - Drag-to-select multiple verses
 * - Cross-chapter selection support
 * - Selection ripple effect tracking
 */

import { useState, useCallback, useRef, useMemo } from 'react';

/**
 * useVerseSelection - Hook for verse selection management
 *
 * @param {Object} options
 * @param {string} options.selectedBook - Current book
 * @param {string|number} options.selectedChapter - Current chapter
 * @param {Array} options.verses - Array of verse objects with { verse, hebrewText, englishText }
 * @returns {Object} Selection state and handlers
 */
export function useVerseSelection({
  selectedBook,
  selectedChapter,
  verses = []
} = {}) {
  // Selected verses with full reference info
  // Each: { book, chapter, verse, hebrewText, englishText, id }
  const [selectedVerses, setSelectedVerses] = useState([]);

  // Drag-to-select state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartVerse, setDragStartVerse] = useState(null);
  const [dragCurrentVerse, setDragCurrentVerse] = useState(null);

  // Visual feedback
  const [rippleVerse, setRippleVerse] = useState(null);
  const [highlightedVerse, setHighlightedVerse] = useState(null);

  // For shift-click range selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  // Ref for ripple timeout
  const rippleTimeoutRef = useRef(null);

  /**
   * Create a verse reference object
   */
  const createVerseRef = useCallback((verseData) => {
    return {
      book: selectedBook,
      chapter: selectedChapter,
      verse: verseData.verse,
      hebrewText: verseData.hebrewText,
      englishText: verseData.englishText,
      id: `${selectedBook}:${selectedChapter}:${verseData.verse}`
    };
  }, [selectedBook, selectedChapter]);

  /**
   * Check if a verse is selected
   */
  const isVerseSelected = useCallback((verseNumber) => {
    const id = `${selectedBook}:${selectedChapter}:${verseNumber}`;
    return selectedVerses.some(v => v.id === id);
  }, [selectedBook, selectedChapter, selectedVerses]);

  /**
   * Toggle single verse selection
   */
  const toggleVerseSelection = useCallback((verseData, event) => {
    const verseRef = createVerseRef(verseData);
    const isShiftClick = event?.shiftKey;
    const verseIndex = verses.findIndex(v => v.verse === verseData.verse);

    // Show ripple effect
    setRippleVerse(verseData.verse);
    if (rippleTimeoutRef.current) {
      clearTimeout(rippleTimeoutRef.current);
    }
    rippleTimeoutRef.current = setTimeout(() => {
      setRippleVerse(null);
    }, 300);

    if (isShiftClick && lastSelectedIndex !== null) {
      // Range selection with shift+click
      const start = Math.min(lastSelectedIndex, verseIndex);
      const end = Math.max(lastSelectedIndex, verseIndex);
      const rangeVerses = verses.slice(start, end + 1).map(createVerseRef);

      setSelectedVerses(prev => {
        // Add range verses, avoiding duplicates
        const newSelection = [...prev];
        rangeVerses.forEach(rv => {
          if (!newSelection.some(v => v.id === rv.id)) {
            newSelection.push(rv);
          }
        });
        return newSelection;
      });
    } else {
      // Single selection toggle
      setSelectedVerses(prev => {
        const exists = prev.some(v => v.id === verseRef.id);
        if (exists) {
          return prev.filter(v => v.id !== verseRef.id);
        }
        return [...prev, verseRef];
      });
      setLastSelectedIndex(verseIndex);
    }
  }, [createVerseRef, verses, lastSelectedIndex]);

  /**
   * Select a single verse (replace selection)
   */
  const selectVerse = useCallback((verseData) => {
    const verseRef = createVerseRef(verseData);
    setSelectedVerses([verseRef]);
    setLastSelectedIndex(verses.findIndex(v => v.verse === verseData.verse));
  }, [createVerseRef, verses]);

  /**
   * Add verse to selection
   */
  const addToSelection = useCallback((verseData) => {
    const verseRef = createVerseRef(verseData);
    setSelectedVerses(prev => {
      if (prev.some(v => v.id === verseRef.id)) {
        return prev;
      }
      return [...prev, verseRef];
    });
  }, [createVerseRef]);

  /**
   * Remove verse from selection
   */
  const removeFromSelection = useCallback((verseData) => {
    const id = `${selectedBook}:${selectedChapter}:${verseData.verse}`;
    setSelectedVerses(prev => prev.filter(v => v.id !== id));
  }, [selectedBook, selectedChapter]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
    setLastSelectedIndex(null);
  }, []);

  /**
   * Select a range of verses
   */
  const selectRange = useCallback((startVerse, endVerse) => {
    const startIndex = verses.findIndex(v => v.verse === startVerse);
    const endIndex = verses.findIndex(v => v.verse === endVerse);

    if (startIndex === -1 || endIndex === -1) return;

    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeVerses = verses.slice(start, end + 1).map(createVerseRef);

    setSelectedVerses(rangeVerses);
  }, [verses, createVerseRef]);

  /**
   * Select all verses on current page
   */
  const selectAll = useCallback(() => {
    setSelectedVerses(verses.map(createVerseRef));
  }, [verses, createVerseRef]);

  // ============================================================================
  // Drag-to-select handlers
  // ============================================================================

  /**
   * Start drag selection
   */
  const handleDragStart = useCallback((verseData, event) => {
    if (event.button !== 0) return; // Only left click

    setIsDragging(true);
    setDragStartVerse(verseData.verse);
    setDragCurrentVerse(verseData.verse);

    // Clear existing selection on new drag
    setSelectedVerses([createVerseRef(verseData)]);
  }, [createVerseRef]);

  /**
   * Update drag selection
   */
  const handleDragMove = useCallback((verseData) => {
    if (!isDragging || !dragStartVerse) return;

    setDragCurrentVerse(verseData.verse);

    // Select range from start to current
    const startIndex = verses.findIndex(v => v.verse === dragStartVerse);
    const currentIndex = verses.findIndex(v => v.verse === verseData.verse);

    if (startIndex === -1 || currentIndex === -1) return;

    const start = Math.min(startIndex, currentIndex);
    const end = Math.max(startIndex, currentIndex);
    const rangeVerses = verses.slice(start, end + 1).map(createVerseRef);

    setSelectedVerses(rangeVerses);
  }, [isDragging, dragStartVerse, verses, createVerseRef]);

  /**
   * End drag selection
   */
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStartVerse(null);
    setDragCurrentVerse(null);
  }, []);

  // ============================================================================
  // Highlight handlers
  // ============================================================================

  /**
   * Highlight a verse temporarily (e.g., after scrolling to it)
   */
  const highlightVerseTemporarily = useCallback((verseNumber, duration = 2000) => {
    setHighlightedVerse(verseNumber);
    setTimeout(() => setHighlightedVerse(null), duration);
  }, []);

  /**
   * Check if verse is in drag range (for visual feedback)
   */
  const isInDragRange = useCallback((verseNumber) => {
    if (!isDragging || !dragStartVerse || !dragCurrentVerse) return false;

    const startIndex = verses.findIndex(v => v.verse === dragStartVerse);
    const currentIndex = verses.findIndex(v => v.verse === dragCurrentVerse);
    const verseIndex = verses.findIndex(v => v.verse === verseNumber);

    if (startIndex === -1 || currentIndex === -1 || verseIndex === -1) return false;

    const start = Math.min(startIndex, currentIndex);
    const end = Math.max(startIndex, currentIndex);

    return verseIndex >= start && verseIndex <= end;
  }, [isDragging, dragStartVerse, dragCurrentVerse, verses]);

  // Memoize computed values
  const computedValues = useMemo(() => ({
    hasSelection: selectedVerses.length > 0,
    selectionCount: selectedVerses.length,
    isSingleSelection: selectedVerses.length === 1,
    isMultiSelection: selectedVerses.length > 1
  }), [selectedVerses.length]);

  return {
    // State
    selectedVerses,
    isDragging,
    dragStartVerse,
    dragCurrentVerse,
    rippleVerse,
    highlightedVerse,
    lastSelectedIndex,

    // Setters (for external control)
    setSelectedVerses,
    setHighlightedVerse,

    // Selection actions
    toggleVerseSelection,
    selectVerse,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectRange,
    selectAll,
    isVerseSelected,

    // Drag handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isInDragRange,

    // Highlight actions
    highlightVerseTemporarily,

    // Computed values
    ...computedValues
  };
}

export default useVerseSelection;
