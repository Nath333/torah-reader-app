import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getSefarimCategories, getChapters, getVerses, getParshas, isTorahBook, isTalmudBook, isMishnahBook, getOnkelos } from '../services/sefariaApi';

const TorahContext = createContext(null);

// Storage key for reading position persistence
const POSITION_STORAGE_KEY = 'torah-reader-position';

/**
 * Check if a chapter reference is valid for a book type
 * Talmud uses daf refs like "2a", "73b"; Torah/Tanach use numbers like "1", "2"
 */
const isChapterValidForBook = (book, chapter) => {
  if (!chapter) return true; // Empty chapter will be fetched fresh
  const isTalmud = isTalmudBook(book);
  const isDafRef = /^\d+[ab]$/.test(chapter); // Matches "2a", "73b", etc.
  // Daf refs are only valid for Talmud, numeric chapters for non-Talmud
  return isTalmud ? isDafRef : !isDafRef;
};

/**
 * Load saved reading position from localStorage
 */
const loadSavedPosition = () => {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const book = parsed.book || 'Genesis';
      let chapter = parsed.chapter || '';

      // Validate chapter is compatible with book type
      // If not, reset chapter to be fetched fresh
      if (chapter && !isChapterValidForBook(book, chapter)) {
        console.warn(`Saved chapter "${chapter}" is incompatible with book "${book}", resetting`);
        chapter = '';
      }

      return {
        category: parsed.category || 'torah',
        book,
        chapter,
        selectedVerse: parsed.selectedVerse || null
      };
    }
  } catch (e) {
    console.warn('Failed to load saved position:', e);
  }
  return { category: 'torah', book: 'Genesis', chapter: '', selectedVerse: null };
};

/**
 * Save reading position to localStorage
 */
const savePosition = (category, book, chapter, selectedVerse) => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({
      category,
      book,
      chapter,
      selectedVerse,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save position:', e);
  }
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @param {AbortSignal} options.signal - AbortSignal to cancel retries
 * @returns {Promise} Result of successful function call
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = () => true,
    signal = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check if cancelled
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if cancelled or not retryable
      if (error.name === 'AbortError' || !shouldRetry(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, delay);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          }
        });
      }
    }
  }

  throw lastError;
};

export function TorahProvider({ children }) {
  // Load saved position on mount
  const savedPosition = useMemo(() => loadSavedPosition(), []);

  const [categories] = useState(getSefarimCategories);
  const [category, setCategory] = useState(savedPosition.category);
  const [book, setBook] = useState(savedPosition.book);
  const [chapter, setChapter] = useState(savedPosition.chapter);
  const [chapters, setChapters] = useState([]);
  const [verses, setVerses] = useState([]);
  const [onkelos, setOnkelos] = useState([]);
  const [parshas, setParshas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(savedPosition.selectedVerse);

  // Save position whenever it changes
  useEffect(() => {
    if (book && chapter) {
      savePosition(category, book, chapter, selectedVerse);
    }
  }, [category, book, chapter, selectedVerse]);

  // Get current category books
  const currentBooks = useMemo(() => categories[category]?.books || [], [categories, category]);

  // Check book types
  const isCurrentTorahBook = useMemo(() => isTorahBook(book), [book]);
  const isCurrentTalmudBook = useMemo(() => isTalmudBook(book), [book]);
  const isCurrentMishnahBook = useMemo(() => isMishnahBook(book), [book]);

  // Abort controller refs for cleanup
  const chapterAbortRef = useRef(null);
  const verseAbortRef = useRef(null);

  // Fetch chapters when book changes (with retry)
  useEffect(() => {
    if (!book) return;

    // Cancel any pending request
    if (chapterAbortRef.current) {
      chapterAbortRef.current.abort();
    }

    const abortController = new AbortController();
    chapterAbortRef.current = abortController;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [chapterList, parshaList] = await retryWithBackoff(
          () => Promise.all([
            getChapters(book),
            isTorahBook(book) ? getParshas(book) : Promise.resolve([])
          ]),
          {
            maxRetries: 3,
            baseDelay: 1000,
            signal: abortController.signal,
            shouldRetry: (err) => {
              // Retry network errors but not 4xx errors
              const msg = err.message?.toLowerCase() || '';
              return msg.includes('network') || msg.includes('timeout') || msg.includes('fetch');
            }
          }
        );

        if (!abortController.signal.aborted) {
          setChapters(chapterList);
          setParshas(parshaList);
          setChapter(chapterList[0] || '');
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !abortController.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [book]);

  // Fetch verses and Onkelos when chapter changes (with retry)
  useEffect(() => {
    if (!chapter || !book) return;

    // Cancel any pending request
    if (verseAbortRef.current) {
      verseAbortRef.current.abort();
    }

    const abortController = new AbortController();
    verseAbortRef.current = abortController;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const isTorah = isTorahBook(book);
        const [verseList, onkelosList] = await retryWithBackoff(
          () => Promise.all([
            getVerses(book, chapter),
            isTorah ? getOnkelos(book, chapter) : Promise.resolve([])
          ]),
          {
            maxRetries: 3,
            baseDelay: 1000,
            signal: abortController.signal,
            shouldRetry: (err) => {
              // Retry network errors but not 4xx errors
              const msg = err.message?.toLowerCase() || '';
              return msg.includes('network') || msg.includes('timeout') || msg.includes('fetch');
            }
          }
        );

        if (!abortController.signal.aborted) {
          setVerses(verseList);
          setOnkelos(onkelosList);
          setSelectedVerse(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && !abortController.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [book, chapter]);

  // Change category and reset to first book
  const changeCategory = useCallback((newCategory) => {
    setCategory(newCategory);
    const books = categories[newCategory]?.books || [];
    setBook(books[0] || '');
    setChapter('');
    setChapters([]);
    setVerses([]);
    setOnkelos([]);
  }, [categories]);

  // Change book
  const changeBook = useCallback((newBook) => {
    setBook(newBook);
    setChapter('');
    setChapters([]);
    setVerses([]);
    setOnkelos([]);
  }, []);

  // Navigate to specific reference with validation
  const goTo = useCallback((targetBook, targetChapter, targetVerse = null) => {
    // Validate that the book exists in our categories
    let foundCategory = null;
    for (const [cat, data] of Object.entries(categories)) {
      if (data.books.includes(targetBook)) {
        foundCategory = cat;
        break;
      }
    }

    // If book not found, log warning and return false
    if (!foundCategory) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`goTo: Book "${targetBook}" not found in any category`);
      }
      return false;
    }

    // Validate chapter (basic check)
    const chapterStr = String(targetChapter);
    if (!chapterStr || chapterStr === 'undefined' || chapterStr === 'null') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`goTo: Invalid chapter "${targetChapter}" for book "${targetBook}"`);
      }
      return false;
    }

    // All validations passed, perform navigation
    setCategory(foundCategory);
    setBook(targetBook);
    setChapter(chapterStr);
    if (targetVerse !== null && targetVerse !== undefined) {
      setSelectedVerse(targetVerse);
    }
    return true;
  }, [categories]);

  // Navigate to previous chapter
  const prevChapter = useCallback(() => {
    if (!chapters.length) return;
    const currentIndex = chapters.indexOf(chapter);
    if (currentIndex > 0) {
      setChapter(chapters[currentIndex - 1]);
    }
  }, [chapter, chapters]);

  // Navigate to next chapter
  const nextChapter = useCallback(() => {
    if (!chapters.length) return;
    const currentIndex = chapters.indexOf(chapter);
    if (currentIndex < chapters.length - 1) {
      setChapter(chapters[currentIndex + 1]);
    }
  }, [chapter, chapters]);

  const value = useMemo(() => ({
    // State
    categories,
    category,
    book,
    chapter,
    chapters,
    verses,
    onkelos,
    parshas,
    loading,
    error,
    currentBooks,
    isTorahBook: isCurrentTorahBook,
    isTalmudBook: isCurrentTalmudBook,
    isMishnahBook: isCurrentMishnahBook,
    selectedVerse,

    // Actions
    setCategory: changeCategory,
    setBook: changeBook,
    setChapter,
    goTo,
    prevChapter,
    nextChapter,
    setSelectedVerse
  }), [
    categories, category, book, chapter, chapters, verses, onkelos, parshas,
    loading, error, currentBooks, isCurrentTorahBook, isCurrentTalmudBook, isCurrentMishnahBook,
    selectedVerse, changeCategory, changeBook, goTo, prevChapter, nextChapter
  ]);

  return (
    <TorahContext.Provider value={value}>
      {children}
    </TorahContext.Provider>
  );
}

export function useTorah() {
  const context = useContext(TorahContext);
  if (!context) {
    throw new Error('useTorah must be used within a TorahProvider');
  }
  return context;
}

export default TorahContext;
