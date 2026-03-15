import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * Manage personal notes on verses
 */
const useVerseNotes = () => {
  const [notes, setNotes] = useLocalStorage('verseNotes', {});

  const getKey = (book, chapter, verse) => `${book}:${chapter}:${verse}`;

  const getNote = useCallback((book, chapter, verse) => {
    return notes[getKey(book, chapter, verse)] || '';
  }, [notes]);

  const setNote = useCallback((book, chapter, verse, text) => {
    const key = getKey(book, chapter, verse);
    setNotes(prev => {
      if (!text.trim()) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: text.trim() };
    });
  }, [setNotes]);

  const hasNote = useCallback((book, chapter, verse) => {
    return !!notes[getKey(book, chapter, verse)];
  }, [notes]);

  const getAllNotes = useCallback(() => {
    return Object.entries(notes).map(([key, text]) => {
      const [book, chapter, verse] = key.split(':');
      return { book, chapter, verse, text };
    });
  }, [notes]);

  return { getNote, setNote, hasNote, getAllNotes, notesCount: Object.keys(notes).length };
};

export default useVerseNotes;
