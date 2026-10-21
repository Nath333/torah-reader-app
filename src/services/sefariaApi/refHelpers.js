// =============================================================================
// Helpers de références Sefaria — toSefariaRef, formatBookName, generateDafList
// (extrait de sefariaApi.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { TALMUD_DAF_COUNTS, HEBREW_BOOK_NAMES } from './bookData';

export const toSefariaRef = (book, chapter, verse = null) => {
  const englishBook = HEBREW_BOOK_NAMES[book] || book;
  return verse ? `${englishBook}.${chapter}.${verse}` : `${englishBook}.${chapter}`;
};

export const formatBookName = (name) => (name || '').replace(/ /g, '_');

export const generateDafList = (tractate) => {
  const dafCount = TALMUD_DAF_COUNTS[tractate] || 30;
  const dafList = [];
  for (let i = 2; i <= dafCount; i++) {
    dafList.push(`${i}a`, `${i}b`);
  }
  return dafList;
};
