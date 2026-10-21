// =============================================================================
// Unified Sefaria API Service — FAÇADE
// Consolidated from sefariaService, sefariaEnhancedService, and sefariaApiV3
// Split docs/DECOUPE-MONOLITHES.md (20/10) — modules sous ./sefariaApi/ :
//   state.js              ÉTAT : BASE_URL + caches gérés
//   bookData.js           données pures des livres (+ parashiot)
//   refHelpers.js         toSefariaRef / formatBookName / generateDafList
//   textEndpoints.js      versets, liés, cross-refs, sujets, calendriers…
//   commentaryEndpoints.js commentaires généraux, dédiés, Shabbat
//   talmudEndpoints.js    daf Davidson + analyse de sugya
// La façade garde les métadonnées de livres, clearCaches, sefariaApiRequest et
// l'intégralité de la surface publique (nommée + default).
// =============================================================================

/**
 * @module sefariaApi
 * @description Unified API service for fetching Jewish texts from the Sefaria Project.
 * Supports Torah, Tanach, Talmud Bavli, and Mishnah with integrated caching.
 */

import { fetchWithFallback } from '../utils/http';
// Les ré-exports ci-dessous (blocs historiques) référencent ces imports locaux
import { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse, getRashiForChapter } from './commentary/rashiService';
import { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable } from './commentary/tosafotService';
import {
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  TALMUD_BAVLI
} from '../constants/bookConstants';

import {
  MISHNAH_SEDARIM,
  MISHNAH_TRACTATES,
  CHAPTER_COUNTS,
  MISHNAH_CHAPTER_COUNTS,
  ALL_TANACH_BOOKS,
  SEFARIM_CATEGORIES,
  getParshas
} from './sefariaApi/bookData';
import { toSefariaRef, generateDafList } from './sefariaApi/refHelpers';
import { textCache, commentaryCache, BASE_URL } from './sefariaApi/state';
import {
  getVerses, getVerse,
  getRelatedTexts, getRandomText,
  getCrossReferences, getCrossRefPreview,
  getTopics, getTopic, getTopicsForRef, getCalendars,
  getTextVersions, getTextWithVersion, getBookIndex,
  getPopularSheets, getWordDefinitions
} from './sefariaApi/textEndpoints';
import {
  getCommentary, getRashi, getOnkelos,
  getIbnEzraForVerse, getSfornoForVerse, getOrHaChaimForVerse,
  getBartenuraForMishnah, getTosafotYomTovForMishnah,
  getRashiOnShabbat, getShabbatCommentaries, getShabbatDafList
} from './sefariaApi/commentaryEndpoints';
import { getTalmudDaf, getShabbatDaf, getFullSugya, getFullSugyaUntilResolution } from './sefariaApi/talmudEndpoints';

// Surface publique historique — ré-export des modules extraits
export {
  // Texte
  getVerses, getVerse,
  getRelatedTexts, getRandomText,
  getCrossReferences, getCrossRefPreview,
  getTopics, getTopic, getTopicsForRef, getCalendars,
  getTextVersions, getTextWithVersion, getBookIndex,
  getPopularSheets, getWordDefinitions,
  // Commentaires
  getCommentary, getRashi, getOnkelos,
  getIbnEzraForVerse, getSfornoForVerse, getOrHaChaimForVerse,
  getBartenuraForMishnah, getTosafotYomTovForMishnah,
  getRashiOnShabbat, getShabbatCommentaries, getShabbatDafList,
  // Talmud / sugya
  getTalmudDaf, getShabbatDaf, getFullSugya, getFullSugyaUntilResolution,
  // Parashiot
  getParshas
};

// Ré-exports des services de commentaires (contrat historique de la façade)
// =============================================================================
// RE-EXPORT RASHI SERVICE FUNCTIONS
// =============================================================================

export { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse, getRashiForChapter };

// =============================================================================
// RE-EXPORT TOSAFOT SERVICE FUNCTIONS
// =============================================================================

export { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable };

// =============================================================================
// RE-EXPORT COMMENTARY FACTORY FUNCTIONS (Ramban, Maharsha)
// =============================================================================

export {
  getRambanForVerse,
  getRambanForChapter,
  getMaharshaForDaf,
  getIbnEzraForChapter,
  getSfornoForChapter
} from './commentary/commentaryServiceFactory';

// =============================================================================
// BOOK METADATA FUNCTIONS
// =============================================================================

/**
 * Get list of all Torah (Pentateuch) books
 * @returns {string[]} Array of Torah book names
 */
export const getTorahBooks = () => TORAH_BOOKS;

/**
 * Get all sefarim (book) categories with metadata
 * @returns {Object} Categories object with torah, neviim, ketuvim, mishnah, gemara
 */
export const getSefarimCategories = () => SEFARIM_CATEGORIES;

/**
 * Get list of books for a specific category
 * @param {string} category - Category name (torah, neviim, ketuvim, mishnah, gemara)
 * @returns {string[]} Array of book names in that category
 */
export const getBooksByCategory = (category) => SEFARIM_CATEGORIES[category]?.books || [];

/**
 * Check if a book is part of the Torah
 * @param {string} bookName - Name of the book
 * @returns {boolean} True if book is in Torah
 */
export const isTorahBook = (bookName) => TORAH_BOOKS.includes(bookName);

/**
 * Check if a book is a Talmud tractate
 * @param {string} bookName - Name of the tractate
 * @returns {boolean} True if book is in Talmud Bavli
 */
export const isTalmudBook = (bookName) => TALMUD_BAVLI.includes(bookName);

/**
 * Check if a book is a Mishnah tractate
 * @param {string} bookName - Name of the tractate
 * @returns {boolean} True if book is in Mishnah
 */
export const isMishnahBook = (bookName) => MISHNAH_TRACTATES.includes(bookName);

/**
 * Get Mishnah sedarim (orders) with their tractates
 * @returns {Object} Sedarim object with tractate lists
 */
export const getMishnahSedarim = () => MISHNAH_SEDARIM;

/**
 * Get list of chapters/dapim for a book
 * @param {string} bookName - Name of the book or tractate
 * @returns {string[]} Array of chapter numbers or daf references (e.g., ['2a', '2b', '3a'])
 */
export const getChapters = (bookName) => {
  if (TALMUD_BAVLI.includes(bookName)) {
    return generateDafList(bookName);
  }
  if (MISHNAH_TRACTATES.includes(bookName)) {
    const count = MISHNAH_CHAPTER_COUNTS[bookName] || 10;
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  if (ALL_TANACH_BOOKS.includes(bookName)) {
    const count = CHAPTER_COUNTS[bookName] || 1;
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  return [];
};


// =============================================================================
// CLEAR CACHES
// =============================================================================

export const clearCaches = () => {
  textCache.clear();
  commentaryCache.clear();
};


// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const sefariaApi = {
  // Book metadata
  getTorahBooks,
  getSefarimCategories,
  getBooksByCategory,
  isTorahBook,
  isTalmudBook,
  isMishnahBook,
  getMishnahSedarim,
  getChapters,
  getParshas,
  // Text fetching
  getVerses,
  getVerse,
  getOnkelos,
  // Commentary
  getCommentary,
  getRashi,
  // Dedicated Rashi functions
  getRashiOnTorah,
  getRashiOnTalmud,
  getRashiOnTanach,
  getRashiForVerse,
  // Dedicated Tosafot functions
  getTosafotOnTalmud,
  getTosafotForDaf,
  isTosafotAvailable,
  // Additional commentary functions
  getIbnEzraForVerse,
  getSfornoForVerse,
  getOrHaChaimForVerse,
  getBartenuraForMishnah,
  getTosafotYomTovForMishnah,
  // Related & cross references
  getRelatedTexts,
  getCrossReferences,
  getCrossRefPreview,
  // Random
  getRandomText,
  // Topics
  getTopics,
  getTopic,
  getTopicsForRef,
  // Calendars
  getCalendars,
  // Versions
  getTextVersions,
  getTextWithVersion,
  // Book info
  getBookIndex,
  // Sheets
  getPopularSheets,
  // Lexicon
  getWordDefinitions,
  // Talmud with English (William Davidson Edition)
  getTalmudDaf,
  getShabbatDaf,
  getRashiOnShabbat,
  getShabbatCommentaries,
  getShabbatDafList,
  // Utilities
  clearCaches,
  toSefariaRef
};

/**
 * Generic Sefaria API request wrapper for direct endpoint access
 * @param {string} endpoint - API path (e.g., '/api/links/Genesis.1')
 * @param {Object} options - Fetch options (signal, timeout, etc.)
 * @returns {Promise<Object>} API response data
 */
export const sefariaApiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.replace(/^\/api/, '')}`;
  return fetchWithFallback(url, { timeout: 15000, ...options });
};

export default sefariaApi;
