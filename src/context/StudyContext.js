import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import useReadingHistory from '../hooks/useReadingHistory';
import useVerseNotes from '../hooks/useVerseNotes';
import useVocabulary from '../hooks/useVocabulary';

export const StudyContext = createContext(null);

export function StudyProvider({ children, book, chapter }) {
  // Bookmarks
  const [bookmarks, setBookmarks] = useLocalStorage('torahBookmarks', []);

  // Reading history
  const { history, addToHistory, clearHistory } = useReadingHistory();

  // Verse notes
  const verseNotes = useVerseNotes();

  // Vocabulary
  const vocabulary = useVocabulary();

  // Track reading history when book/chapter changes
  useEffect(() => {
    if (book && chapter) {
      addToHistory(book, chapter);
    }
  }, [book, chapter, addToHistory]);

  // Bookmark functions
  const addBookmark = useCallback((verse, currentBook, currentChapter) => {
    const bookmark = {
      ...verse,
      book: currentBook,
      chapter: currentChapter,
      timestamp: new Date().toISOString()
    };

    const exists = bookmarks.some(b =>
      b.book === bookmark.book &&
      b.chapter === bookmark.chapter &&
      b.verse === bookmark.verse
    );

    if (!exists) {
      setBookmarks(prev => [...prev, bookmark]);
    }
  }, [bookmarks, setBookmarks]);

  const removeBookmark = useCallback((index) => {
    setBookmarks(prev => prev.filter((_, i) => i !== index));
  }, [setBookmarks]);

  const importBookmarks = useCallback((importedBookmarks) => {
    setBookmarks(prev => {
      const newBookmarks = importedBookmarks.filter(imported =>
        !prev.some(existing =>
          existing.book === imported.book &&
          existing.chapter === imported.chapter &&
          existing.verse === imported.verse
        )
      );
      return [...prev, ...newBookmarks];
    });
  }, [setBookmarks]);

  const isBookmarked = useCallback((bookName, chapterNum, verseNum) => {
    return bookmarks.some(b =>
      b.book === bookName &&
      b.chapter === chapterNum &&
      b.verse === verseNum
    );
  }, [bookmarks]);

  // Save word to vocabulary with context
  const saveWord = useCallback((word, english, french, currentBook, currentChapter) => {
    const context = `${currentBook} ${currentChapter}`;
    vocabulary.addWord(word, english, french, context);
  }, [vocabulary]);

  const value = useMemo(() => ({
    // Bookmarks
    bookmarks,
    addBookmark,
    removeBookmark,
    importBookmarks,
    isBookmarked,

    // History
    history,
    addToHistory,
    clearHistory,

    // Notes
    verseNotes,

    // Vocabulary
    vocabulary: vocabulary.vocabulary,
    addWord: vocabulary.addWord,
    removeWord: vocabulary.removeWord,
    updateWord: vocabulary.updateWord,
    markReviewed: vocabulary.markReviewed,
    clearVocabulary: vocabulary.clearVocabulary,
    exportVocabulary: vocabulary.exportVocabulary,
    importVocabulary: vocabulary.importVocabulary,
    getWordsForReview: vocabulary.getWordsForReview,
    getStats: vocabulary.getStats,
    hasWord: vocabulary.hasWord,
    saveWord
  }), [
    bookmarks, addBookmark, removeBookmark, importBookmarks, isBookmarked,
    history, addToHistory, clearHistory,
    verseNotes,
    vocabulary, saveWord
  ]);

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}

export default StudyContext;
