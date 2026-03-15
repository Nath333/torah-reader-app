import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSefarimCategories, getChapters, getVerses, getParshas, isTorahBook, isTalmudBook, isMishnahBook, getOnkelos } from '../services/sefariaApi';

const TorahContext = createContext(null);

export function TorahProvider({ children }) {
  const [categories] = useState(getSefarimCategories);
  const [category, setCategory] = useState('torah');
  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState('');
  const [chapters, setChapters] = useState([]);
  const [verses, setVerses] = useState([]);
  const [onkelos, setOnkelos] = useState([]);
  const [parshas, setParshas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);

  // Get current category books
  const currentBooks = useMemo(() => categories[category]?.books || [], [categories, category]);

  // Check book types
  const isCurrentTorahBook = useMemo(() => isTorahBook(book), [book]);
  const isCurrentTalmudBook = useMemo(() => isTalmudBook(book), [book]);
  const isCurrentMishnahBook = useMemo(() => isMishnahBook(book), [book]);

  // Fetch chapters when book changes
  useEffect(() => {
    if (!book) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [chapterList, parshaList] = await Promise.all([
          getChapters(book),
          isTorahBook(book) ? getParshas(book) : Promise.resolve([])
        ]);

        if (cancelled) return;

        setChapters(chapterList);
        setParshas(parshaList);
        setChapter(chapterList[0] || '');
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [book]);

  // Fetch verses and Onkelos when chapter changes
  useEffect(() => {
    if (!chapter || !book) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const isTorah = isTorahBook(book);
        const [verseList, onkelosList] = await Promise.all([
          getVerses(book, chapter),
          isTorah ? getOnkelos(book, chapter) : Promise.resolve([])
        ]);

        if (!cancelled) {
          setVerses(verseList);
          setOnkelos(onkelosList);
          setSelectedVerse(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
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
