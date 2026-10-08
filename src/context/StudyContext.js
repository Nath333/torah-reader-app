import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import useReadingHistory from '../hooks/useReadingHistory';
import useVerseNotes from '../hooks/useVerseNotes';
import useVocabulary from '../hooks/useVocabulary';
import useStudyStreak from '../hooks/useStudyStreak';
import { registerWordLearned } from '../services/studyTracker';
import { useToast } from './ToastContext';

export const StudyContext = createContext(null);

export function StudyProvider({ children, book, chapter }) {
  // Toast notifications
  const toast = useToast();
  const previousStreakRef = useRef(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useLocalStorage('torahBookmarks', []);

  // Reading history
  const { history, addToHistory, clearHistory } = useReadingHistory();

  // Verse notes
  const verseNotes = useVerseNotes();

  // Vocabulary
  const vocabulary = useVocabulary();

  // Study streak tracking
  const studyStreak = useStudyStreak();

  // Track reading history when book/chapter changes
  // Use refs to avoid infinite loops with streak updates
  const lastRecordedRef = useRef(null);
  const recordStudyRef = useRef(studyStreak.recordStudy);

  // Update the ref when recordStudy changes (it's memoized, so this is stable)
  useEffect(() => {
    recordStudyRef.current = studyStreak.recordStudy;
  }, [studyStreak.recordStudy]);

  // Ref to hold latest streak value (avoids stale closure in setTimeout)
  const currentStreakRef = useRef(studyStreak.currentStreak);
  useEffect(() => {
    currentStreakRef.current = studyStreak.currentStreak;
  }, [studyStreak.currentStreak]);

  // Track mounted state to prevent operations after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let timeoutId = null;

    if (book && chapter) {
      addToHistory(book, chapter);

      // Only record study once per book/chapter combination
      const key = `${book}-${chapter}`;
      if (lastRecordedRef.current !== key) {
        lastRecordedRef.current = key;

        // Store previous streak before recording
        const prevStreak = currentStreakRef.current;

        // Record study activity for streak tracking
        recordStudyRef.current();

        // Check for streak milestones after recording (use setTimeout to get updated value)
        // Using ref to get fresh value and cleanup to prevent memory leak
        timeoutId = setTimeout(() => {
          // Check if still mounted before accessing state or calling toast
          if (!mountedRef.current) return;
          
          const newStreak = currentStreakRef.current;

          // Only show milestone notification once per milestone
          if (previousStreakRef.current !== newStreak) {
            previousStreakRef.current = newStreak;

            // Streak milestone achievements
            const milestones = [3, 7, 14, 30, 50, 100];
            if (milestones.includes(newStreak) && newStreak > prevStreak) {
              const messages = {
                3: 'Série de 3 jours ! L\'habitude s\'installe !',
                7: 'Une semaine d\'affilée ! Quelle assiduité !',
                14: 'Deux semaines de suite ! Tu es en feu !',
                30: '30 jours de suite ! Un mois d\'étude !',
                50: '50 jours de suite ! Champion de la demi-année !',
                100: '100 jours de suite ! Maître érudit !'
              };
              toast?.achievement(messages[newStreak]);
            } else if (newStreak === 1 && prevStreak === 0) {
              // First study day
              toast?.streak('Bienvenue ! Ton parcours d\'étude commence !');
            }
          }
        }, 100);
      }
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [book, chapter, addToHistory, toast]);

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
      toast?.bookmark(`Favori ajouté — ${currentBook} ${currentChapter}:${verse.verse}`);
    }
  }, [bookmarks, setBookmarks, toast]);

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
    // Alimente l'anneau « Mots » du dashboard (l'ancien compteur de session
    // n'était JAMAIS incrémenté : anneau à 0 à vie).
    registerWordLearned(word);
    toast?.vocabulary(`« ${word} » ajouté au carnet`);
  }, [vocabulary, toast]);

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
    saveWord,

    // Study Streak
    studyStreak: {
      currentStreak: studyStreak.currentStreak,
      longestStreak: studyStreak.longestStreak,
      totalDays: studyStreak.totalDays,
      lastStudyDate: studyStreak.lastStudyDate,
      todayMinutes: studyStreak.todayMinutes,
      isStreakAtRisk: studyStreak.isStreakAtRisk,
      recordStudy: studyStreak.recordStudy,
      updateStudyTime: studyStreak.updateStudyTime,
      getStreakMessage: studyStreak.getStreakMessage,
      getWeeklyProgress: studyStreak.getWeeklyProgress,
      getStats: studyStreak.getStats,
      setWeeklyGoal: studyStreak.setWeeklyGoal,
      setDailyGoal: studyStreak.setDailyGoal
    }
  }), [
    bookmarks, addBookmark, removeBookmark, importBookmarks, isBookmarked,
    history, addToHistory, clearHistory,
    verseNotes,
    vocabulary, saveWord,
    studyStreak
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
