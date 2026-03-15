// Commentary Service Factory - Unified factory for all commentary services
// Consolidates Rashi, Ramban, Tosafot, and Maharsha into a single pattern

import { createCache } from '../utils/cache';
import { fetchWithFallback } from '../utils/http';
import { cleanHtml } from '../utils/sanitize';
import {
  processCommentArray,
  processTalmudComments,
  createErrorResponse
} from '../utils/commentaryUtils';
import {
  TORAH_BOOKS,
  TALMUD_BAVLI,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  BOOK_HEBREW_NAMES,
  formatBook,
  formatTractate
} from '../constants/bookConstants';

const BASE_URL = 'https://www.sefaria.org/api';

// Shared cache configuration
const DEFAULT_CACHE_CONFIG = { ttl: 30 * 60 * 1000, maxSize: 200 };

/**
 * Commentary configurations - defines behavior for each commentary type
 */
const COMMENTARY_CONFIGS = {
  rashi: {
    name: 'Rashi',
    nameHebrew: 'רש״י',
    sefariaPrefix: 'Rashi_on_',
    supportsTorah: true,
    supportsTalmud: true,
    supportsTanach: true
  },
  ramban: {
    name: 'Ramban',
    nameHebrew: 'רמב״ן',
    fullName: 'Rabbi Moshe ben Nachman',
    fullNameHebrew: 'רבי משה בן נחמן',
    sefariaPrefix: 'Ramban_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: false,
    hasIntroduction: true
  },
  tosafot: {
    name: 'Tosafot',
    nameHebrew: 'תוספות',
    sefariaPrefix: 'Tosafot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false
  },
  maharshaHalachot: {
    name: 'Maharsha',
    nameHebrew: 'מהרש״א',
    subSource: 'Chiddushei Halachot',
    subSourceHebrew: 'חידושי הלכות',
    sefariaPrefix: 'Chidushei_Halachot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false
  },
  maharshaAggadot: {
    name: 'Maharsha',
    nameHebrew: 'מהרש״א',
    subSource: 'Chiddushei Aggadot',
    subSourceHebrew: 'חידושי אגדות',
    sefariaPrefix: 'Chidushei_Aggadot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false
  }
};

// Create caches for each commentary type
const caches = {};
Object.keys(COMMENTARY_CONFIGS).forEach(key => {
  caches[key] = createCache(DEFAULT_CACHE_CONFIG);
});
// Shared maharsha cache
caches.maharsha = createCache(DEFAULT_CACHE_CONFIG);
// Ramban introduction cache
caches.rambanIntro = createCache(DEFAULT_CACHE_CONFIG);

/**
 * Get book type availability for a given book
 */
const getBookType = (bookName) => {
  if (TORAH_BOOKS.includes(bookName)) return 'torah';
  if (TALMUD_BAVLI.includes(bookName)) return 'talmud';
  if (NEVIIM_BOOKS.includes(bookName)) return 'neviim';
  if (KETUVIM_BOOKS.includes(bookName)) return 'ketuvim';
  return null;
};

/**
 * Generic fetch function for Torah/Tanach commentaries
 */
const fetchTorahCommentary = async (commentaryKey, bookName, chapter, verse = null) => {
  const config = COMMENTARY_CONFIGS[commentaryKey];
  const cache = caches[commentaryKey];
  const bookType = getBookType(bookName);

  if (!config.supportsTorah && bookType === 'torah') {
    return createErrorResponse(`${config.name} is not available for Torah`);
  }
  if (!config.supportsTanach && (bookType === 'neviim' || bookType === 'ketuvim')) {
    return createErrorResponse(`${config.name} is not available for Tanach`);
  }

  const ref = verse ? `${bookName}.${chapter}.${verse}` : `${bookName}.${chapter}`;
  const cacheKey = `${commentaryKey}-${bookType}:${ref}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedBook = formatBook(bookName);
    const sefariaRef = verse
      ? `${config.sefariaPrefix}${formattedBook}.${chapter}.${verse}`
      : `${config.sefariaPrefix}${formattedBook}.${chapter}`;

    const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
    const data = await fetchWithFallback(url);

    const comments = processCommentArray(data.he, data.text, { verse });

    const result = {
      source: config.name,
      sourceHebrew: config.nameHebrew,
      ...(config.fullName && { fullName: config.fullName }),
      ...(config.fullNameHebrew && { fullNameHebrew: config.fullNameHebrew }),
      bookType,
      book: bookName,
      bookHebrew: BOOK_HEBREW_NAMES[bookName] || bookName,
      chapter,
      verse,
      ref: data.ref || ref,
      heRef: data.heRef || ref,
      comments
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return createErrorResponse(error.message);
  }
};

/**
 * Generic fetch function for Talmud commentaries
 */
const fetchTalmudCommentary = async (commentaryKey, tractate, daf, options = {}) => {
  const config = COMMENTARY_CONFIGS[commentaryKey];
  const cache = caches[commentaryKey];

  if (!TALMUD_BAVLI.includes(tractate)) {
    return createErrorResponse(`${config.name} is only available for Talmud Bavli tractates`);
  }

  const ref = `${tractate}.${daf}`;
  const cacheKey = `${commentaryKey}-talmud:${ref}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedTractate = formatTractate(tractate);
    const sefariaRef = `${config.sefariaPrefix}${formattedTractate}.${daf}`;

    const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
    const data = await fetchWithFallback(url);

    const comments = processTalmudComments(data.he, data.text, options);

    const result = {
      source: config.name,
      sourceHebrew: config.nameHebrew,
      ...(config.subSource && { subSource: config.subSource }),
      ...(config.subSourceHebrew && { subSourceHebrew: config.subSourceHebrew }),
      bookType: 'talmud',
      ref: data.ref || ref,
      heRef: data.heRef || ref,
      comments
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return createErrorResponse(error.message);
  }
};

// ============================================================================
// RASHI EXPORTS (backwards compatible)
// ============================================================================

export const getRashiAvailability = (bookName) => {
  if (TORAH_BOOKS.includes(bookName)) return 'torah';
  if (TALMUD_BAVLI.includes(bookName)) return 'talmud';
  if (NEVIIM_BOOKS.includes(bookName) || KETUVIM_BOOKS.includes(bookName)) return 'tanach';
  return null;
};

export const getRashiOnTorah = (bookName, chapter, verse = null) => {
  if (!TORAH_BOOKS.includes(bookName)) {
    return Promise.resolve(createErrorResponse('Rashi on Torah is only available for Torah books'));
  }
  return fetchTorahCommentary('rashi', bookName, chapter, verse);
};

export const getRashiOnTalmud = (tractate, daf) => {
  return fetchTalmudCommentary('rashi', tractate, daf);
};

export const getRashiOnTanach = (bookName, chapter, verse = null) => {
  const isNeviim = NEVIIM_BOOKS.includes(bookName);
  const isKetuvim = KETUVIM_BOOKS.includes(bookName);

  if (!isNeviim && !isKetuvim) {
    return Promise.resolve(createErrorResponse('Rashi on Tanach is only available for Nevi\'im and Ketuvim'));
  }
  return fetchTorahCommentary('rashi', bookName, chapter, verse);
};

export const getRashi = async (bookName, chapter, verse = null) => {
  const availability = getRashiAvailability(bookName);

  switch (availability) {
    case 'torah':
      return getRashiOnTorah(bookName, chapter, verse);
    case 'talmud':
      return getRashiOnTalmud(bookName, chapter);
    case 'tanach':
      return getRashiOnTanach(bookName, chapter, verse);
    default:
      return createErrorResponse('Rashi is not available for this text');
  }
};

export const getRashiForVerse = async (bookName, chapter, verse) => {
  const availability = getRashiAvailability(bookName);

  if (availability === 'talmud') {
    const result = await getRashiOnTalmud(bookName, chapter);
    return result.comments || [];
  }
  if (availability === 'torah') {
    const result = await getRashiOnTorah(bookName, chapter, verse);
    return result.comments || [];
  }
  if (availability === 'tanach') {
    const result = await getRashiOnTanach(bookName, chapter, verse);
    return result.comments || [];
  }
  return [];
};

export const clearRashiCache = () => caches.rashi.clear();

// ============================================================================
// RAMBAN EXPORTS (backwards compatible)
// ============================================================================

export const isRambanAvailable = (book) => TORAH_BOOKS.includes(book);

export const getRambanOnTorah = (book, chapter, verse = null) => {
  if (!TORAH_BOOKS.includes(book)) {
    return Promise.resolve(createErrorResponse('Ramban commentary is only available for Torah books'));
  }
  return fetchTorahCommentary('ramban', book, chapter, verse);
};

export const getRambanForVerse = (book, chapter, verse) => {
  return getRambanOnTorah(book, chapter, verse);
};

export const getRambanIntroduction = async (book) => {
  if (!TORAH_BOOKS.includes(book)) {
    return createErrorResponse('Ramban commentary is only available for Torah books');
  }

  const cacheKey = `ramban-intro:${book}`;
  const cached = caches.rambanIntro.get(cacheKey);
  if (cached) return cached;

  try {
    const sefariaRef = `Ramban_on_${book},_Introduction`;
    const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
    const data = await fetchWithFallback(url);

    const comments = [];
    const hebrewData = Array.isArray(data.he) ? data.he : [data.he];
    const englishData = Array.isArray(data.text) ? data.text : [data.text];

    hebrewData.forEach((he, idx) => {
      if (he) {
        comments.push({
          section: idx + 1,
          hebrew: cleanHtml(he),
          english: cleanHtml(englishData[idx] || '')
        });
      }
    });

    const result = {
      source: 'Ramban',
      sourceHebrew: 'רמב״ן',
      type: 'introduction',
      book,
      bookHebrew: BOOK_HEBREW_NAMES[book] || book,
      ref: data.ref || `Ramban Introduction to ${book}`,
      heRef: data.heRef,
      comments
    };

    caches.rambanIntro.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching Ramban introduction:', error);
    return createErrorResponse(error.message);
  }
};

export const clearRambanCache = () => {
  caches.ramban.clear();
  caches.rambanIntro.clear();
};

export const getBooksWithRamban = () => [...TORAH_BOOKS];

// ============================================================================
// TOSAFOT EXPORTS (backwards compatible)
// ============================================================================

export const isTosafotAvailable = (tractate) => TALMUD_BAVLI.includes(tractate);

export const getTosafotOnTalmud = (tractate, daf) => {
  return fetchTalmudCommentary('tosafot', tractate, daf);
};

export const getTosafotForDaf = async (tractate, daf) => {
  const result = await getTosafotOnTalmud(tractate, daf);
  return result.comments || [];
};

export const clearTosafotCache = () => caches.tosafot.clear();

export const getTractatesWithTosafot = () => [...TALMUD_BAVLI];

// ============================================================================
// MAHARSHA EXPORTS (backwards compatible)
// ============================================================================

export const isMaharshaAvailable = (tractate) => TALMUD_BAVLI.includes(tractate);

export const getMaharshaHalachot = (tractate, daf) => {
  return fetchTalmudCommentary('maharshaHalachot', tractate, daf, { type: 'halachot' });
};

export const getMaharshaAggadot = (tractate, daf) => {
  return fetchTalmudCommentary('maharshaAggadot', tractate, daf, { type: 'aggadot' });
};

export const getMaharshaForDaf = async (tractate, daf) => {
  const [halachot, aggadot] = await Promise.all([
    getMaharshaHalachot(tractate, daf),
    getMaharshaAggadot(tractate, daf)
  ]);

  return {
    source: 'Maharsha',
    sourceHebrew: 'מהרש״א',
    halachot: halachot.comments || [],
    aggadot: aggadot.comments || [],
    comments: [...(halachot.comments || []), ...(aggadot.comments || [])]
  };
};

export const clearMaharshaCache = () => {
  caches.maharshaHalachot.clear();
  caches.maharshaAggadot.clear();
};

export const getTractatesWithMaharsha = () => [...TALMUD_BAVLI];

// ============================================================================
// UNIFIED SERVICE OBJECTS (backwards compatible)
// ============================================================================

export const rashiService = {
  getRashiAvailability,
  getRashiOnTorah,
  getRashiOnTalmud,
  getRashiOnTanach,
  getRashi,
  getRashiForVerse,
  clearRashiCache
};

export const rambanService = {
  isRambanAvailable,
  getRambanOnTorah,
  getRambanForVerse,
  getRambanIntroduction,
  clearRambanCache,
  getBooksWithRamban
};

export const tosafotService = {
  isTosafotAvailable,
  getTosafotOnTalmud,
  getTosafotForDaf,
  clearTosafotCache,
  getTractatesWithTosafot
};

export const maharshaService = {
  isMaharshaAvailable,
  getMaharshaHalachot,
  getMaharshaAggadot,
  getMaharshaForDaf,
  clearMaharshaCache,
  getTractatesWithMaharsha
};

// ============================================================================
// GENERIC API (for new code)
// ============================================================================

/**
 * Get commentary for any text type (auto-detect)
 * @param {string} commentaryType - 'rashi' | 'ramban' | 'tosafot' | 'maharsha'
 * @param {string} bookName - Book or tractate name
 * @param {number|string} chapter - Chapter number or daf
 * @param {number|null} verse - Verse number (optional)
 */
export const getCommentary = async (commentaryType, bookName, chapter, verse = null) => {
  const bookType = getBookType(bookName);

  switch (commentaryType) {
    case 'rashi':
      return getRashi(bookName, chapter, verse);
    case 'ramban':
      return getRambanOnTorah(bookName, chapter, verse);
    case 'tosafot':
      if (bookType === 'talmud') return getTosafotOnTalmud(bookName, chapter);
      return createErrorResponse('Tosafot is only available for Talmud');
    case 'maharsha':
      if (bookType === 'talmud') return getMaharshaForDaf(bookName, chapter);
      return createErrorResponse('Maharsha is only available for Talmud');
    default:
      return createErrorResponse(`Unknown commentary type: ${commentaryType}`);
  }
};

/**
 * Check if commentary is available for a book
 */
export const checkCommentaryAvailability = (commentaryType, bookName) => {
  switch (commentaryType) {
    case 'rashi':
      return getRashiAvailability(bookName) !== null;
    case 'ramban':
      return isRambanAvailable(bookName);
    case 'tosafot':
      return isTosafotAvailable(bookName);
    case 'maharsha':
      return isMaharshaAvailable(bookName);
    default:
      return false;
  }
};

/**
 * Clear all commentary caches
 */
export const clearAllCommentaryCaches = () => {
  Object.values(caches).forEach(cache => cache.clear());
};

const commentaryServiceFactory = {
  // Generic API
  getCommentary,
  checkCommentaryAvailability,
  clearAllCommentaryCaches,
  // Individual services
  rashiService,
  rambanService,
  tosafotService,
  maharshaService
};

export default commentaryServiceFactory;
