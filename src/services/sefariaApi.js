// =============================================================================
// Unified Sefaria API Service
// Consolidated from sefariaService, sefariaEnhancedService, and sefariaApiV3
// =============================================================================

/**
 * @module sefariaApi
 * @description Unified API service for fetching Jewish texts from the Sefaria Project.
 * Supports Torah, Tanach, Talmud Bavli, and Mishnah with integrated caching.
 *
 * @example
 * // Get all Torah books
 * const books = getTorahBooks();
 *
 * // Get verses for a chapter
 * const verses = await getVerses('Genesis', 1);
 *
 * // Get commentary on a verse
 * const commentary = await getCommentary('Genesis', 1, 1);
 *
 * // Search across texts
 * const results = await searchTorah('Abraham');
 */

import { createCache } from '../utils/cache';
import { fetchWithFallback } from '../utils/http';
import { cleanHtml } from '../utils/sanitize';
import { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse } from './rashiService';
import { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable } from './tosafotService';
import { getMaharshaHalachot, getMaharshaAggadot, getMaharshaForDaf, isMaharshaAvailable } from './maharshaService';
import { getRambanOnTorah, getRambanForVerse, isRambanAvailable } from './rambanService';

// Import shared book constants
import {
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  TALMUD_BAVLI
} from '../constants/bookConstants';

const BASE_URL = 'https://www.sefaria.org/api';

// Create cache instances
const textCache = createCache({ ttl: 10 * 60 * 1000, maxSize: 500 }); // 10 min
const commentaryCache = createCache({ ttl: 60 * 60 * 1000, maxSize: 300 }); // 1 hour

// =============================================================================
// BOOK DATA - Mishnah structure (Torah, Neviim, Ketuvim, Talmud from constants)
// =============================================================================

const MISHNAH_SEDARIM = {
  zeraim: {
    name: 'Zeraim', hebrewName: 'זרעים',
    tractates: ['Mishnah Berakhot', 'Mishnah Peah', 'Mishnah Demai', 'Mishnah Kilayim',
      'Mishnah Sheviit', 'Mishnah Terumot', 'Mishnah Maasrot', 'Mishnah Maaser Sheni',
      'Mishnah Challah', 'Mishnah Orlah', 'Mishnah Bikkurim']
  },
  moed: {
    name: 'Moed', hebrewName: 'מועד',
    tractates: ['Mishnah Shabbat', 'Mishnah Eruvin', 'Mishnah Pesachim', 'Mishnah Shekalim',
      'Mishnah Yoma', 'Mishnah Sukkah', 'Mishnah Beitzah', 'Mishnah Rosh Hashanah',
      'Mishnah Taanit', 'Mishnah Megillah', 'Mishnah Moed Katan', 'Mishnah Chagigah']
  },
  nashim: {
    name: 'Nashim', hebrewName: 'נשים',
    tractates: ['Mishnah Yevamot', 'Mishnah Ketubot', 'Mishnah Nedarim', 'Mishnah Nazir',
      'Mishnah Sotah', 'Mishnah Gittin', 'Mishnah Kiddushin']
  },
  nezikin: {
    name: 'Nezikin', hebrewName: 'נזיקין',
    tractates: ['Mishnah Bava Kamma', 'Mishnah Bava Metzia', 'Mishnah Bava Batra',
      'Mishnah Sanhedrin', 'Mishnah Makkot', 'Mishnah Shevuot', 'Mishnah Eduyot',
      'Mishnah Avodah Zarah', 'Mishnah Avot', 'Mishnah Horayot']
  },
  kodashim: {
    name: 'Kodashim', hebrewName: 'קדשים',
    tractates: ['Mishnah Zevachim', 'Mishnah Menachot', 'Mishnah Chullin', 'Mishnah Bekhorot',
      'Mishnah Arakhin', 'Mishnah Temurah', 'Mishnah Keritot', 'Mishnah Meilah',
      'Mishnah Tamid', 'Mishnah Middot', 'Mishnah Kinnim']
  },
  tahorot: {
    name: 'Tahorot', hebrewName: 'טהרות',
    tractates: ['Mishnah Kelim', 'Mishnah Oholot', 'Mishnah Negaim', 'Mishnah Parah',
      'Mishnah Tahorot', 'Mishnah Mikvaot', 'Mishnah Niddah', 'Mishnah Makhshirin',
      'Mishnah Zavim', 'Mishnah Tevul Yom', 'Mishnah Yadayim', 'Mishnah Oktzin']
  }
};

const MISHNAH_TRACTATES = Object.values(MISHNAH_SEDARIM).flatMap(seder => seder.tractates);

const CHAPTER_COUNTS = {
  // Torah
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  // Nevi'im
  'Joshua': 24, 'Judges': 21, 'I Samuel': 31, 'II Samuel': 24, 'I Kings': 22, 'II Kings': 25,
  'Isaiah': 66, 'Jeremiah': 52, 'Ezekiel': 48, 'Hosea': 14, 'Joel': 4, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3,
  'Haggai': 2, 'Zechariah': 14, 'Malachi': 3,
  // Ketuvim
  'Psalms': 150, 'Proverbs': 31, 'Job': 42, 'Song of Songs': 8, 'Ruth': 4,
  'Lamentations': 5, 'Ecclesiastes': 12, 'Esther': 10, 'Daniel': 12, 'Ezra': 10,
  'Nehemiah': 13, 'I Chronicles': 29, 'II Chronicles': 36
};

const TALMUD_DAF_COUNTS = {
  'Berakhot': 64, 'Shabbat': 157, 'Eruvin': 105, 'Pesachim': 121, 'Shekalim': 22,
  'Yoma': 88, 'Sukkah': 56, 'Beitzah': 40, 'Rosh Hashanah': 35, 'Taanit': 31,
  'Megillah': 32, 'Moed Katan': 29, 'Chagigah': 27, 'Yevamot': 122, 'Ketubot': 112,
  'Nedarim': 91, 'Nazir': 66, 'Sotah': 49, 'Gittin': 90, 'Kiddushin': 82,
  'Bava Kamma': 119, 'Bava Metzia': 119, 'Bava Batra': 176, 'Sanhedrin': 113,
  'Makkot': 24, 'Shevuot': 49, 'Avodah Zarah': 76, 'Horayot': 14, 'Zevachim': 120,
  'Menachot': 110, 'Chullin': 142, 'Bekhorot': 61, 'Arakhin': 34, 'Temurah': 34,
  'Keritot': 28, 'Meilah': 22, 'Tamid': 33, 'Niddah': 73
};

const MISHNAH_CHAPTER_COUNTS = {
  'Mishnah Berakhot': 9, 'Mishnah Peah': 8, 'Mishnah Demai': 7, 'Mishnah Kilayim': 9,
  'Mishnah Sheviit': 10, 'Mishnah Terumot': 11, 'Mishnah Maasrot': 5, 'Mishnah Maaser Sheni': 5,
  'Mishnah Challah': 4, 'Mishnah Orlah': 3, 'Mishnah Bikkurim': 4, 'Mishnah Shabbat': 24,
  'Mishnah Eruvin': 10, 'Mishnah Pesachim': 10, 'Mishnah Shekalim': 8, 'Mishnah Yoma': 8,
  'Mishnah Sukkah': 5, 'Mishnah Beitzah': 5, 'Mishnah Rosh Hashanah': 4, 'Mishnah Taanit': 4,
  'Mishnah Megillah': 4, 'Mishnah Moed Katan': 3, 'Mishnah Chagigah': 3, 'Mishnah Yevamot': 16,
  'Mishnah Ketubot': 13, 'Mishnah Nedarim': 11, 'Mishnah Nazir': 9, 'Mishnah Sotah': 9,
  'Mishnah Gittin': 9, 'Mishnah Kiddushin': 4, 'Mishnah Bava Kamma': 10, 'Mishnah Bava Metzia': 10,
  'Mishnah Bava Batra': 10, 'Mishnah Sanhedrin': 11, 'Mishnah Makkot': 3, 'Mishnah Shevuot': 8,
  'Mishnah Eduyot': 8, 'Mishnah Avodah Zarah': 5, 'Mishnah Avot': 6, 'Mishnah Horayot': 3,
  'Mishnah Zevachim': 14, 'Mishnah Menachot': 13, 'Mishnah Chullin': 12, 'Mishnah Bekhorot': 9,
  'Mishnah Arakhin': 9, 'Mishnah Temurah': 7, 'Mishnah Keritot': 6, 'Mishnah Meilah': 6,
  'Mishnah Tamid': 7, 'Mishnah Middot': 5, 'Mishnah Kinnim': 3, 'Mishnah Kelim': 30,
  'Mishnah Oholot': 18, 'Mishnah Negaim': 14, 'Mishnah Parah': 12, 'Mishnah Tahorot': 10,
  'Mishnah Mikvaot': 10, 'Mishnah Niddah': 10, 'Mishnah Makhshirin': 6, 'Mishnah Zavim': 5,
  'Mishnah Tevul Yom': 4, 'Mishnah Yadayim': 4, 'Mishnah Oktzin': 3
};

// Hebrew to English book name mapping
const HEBREW_BOOK_NAMES = {
  'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus',
  'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'יהושע': 'Joshua',
  'שופטים': 'Judges', 'שמואל א': 'I Samuel', 'שמואל ב': 'II Samuel',
  'מלכים א': 'I Kings', 'מלכים ב': 'II Kings', 'ישעיהו': 'Isaiah',
  'ירמיהו': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'תהלים': 'Psalms',
  'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs',
  'רות': 'Ruth', 'איכה': 'Lamentations', 'קהלת': 'Ecclesiastes',
  'אסתר': 'Esther', 'דניאל': 'Daniel', 'עזרא': 'Ezra',
  'נחמיה': 'Nehemiah', 'דברי הימים א': 'I Chronicles', 'דברי הימים ב': 'II Chronicles'
};

const ALL_TANACH_BOOKS = [...TORAH_BOOKS, ...NEVIIM_BOOKS, ...KETUVIM_BOOKS];

const SEFARIM_CATEGORIES = {
  torah: { name: 'Torah', hebrewName: 'תורה', books: TORAH_BOOKS },
  neviim: { name: "Nevi'im", hebrewName: 'נביאים', books: NEVIIM_BOOKS },
  ketuvim: { name: 'Ketuvim', hebrewName: 'כתובים', books: KETUVIM_BOOKS },
  mishnah: { name: 'Mishnah', hebrewName: 'משנה', books: MISHNAH_TRACTATES, sedarim: MISHNAH_SEDARIM },
  gemara: { name: 'Gemara', hebrewName: 'גמרא', books: TALMUD_BAVLI }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const toSefariaRef = (book, chapter, verse = null) => {
  const englishBook = HEBREW_BOOK_NAMES[book] || book;
  return verse ? `${englishBook}.${chapter}.${verse}` : `${englishBook}.${chapter}`;
};

const formatBookName = (name) => name.replace(/ /g, '_');

const generateDafList = (tractate) => {
  const dafCount = TALMUD_DAF_COUNTS[tractate] || 30;
  const dafList = [];
  for (let i = 2; i <= dafCount; i++) {
    dafList.push(`${i}a`, `${i}b`);
  }
  return dafList;
};

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
// TEXT FETCHING FUNCTIONS
// =============================================================================

/**
 * Fetch all verses for a chapter
 * @async
 * @param {string} bookName - Name of the book (e.g., 'Genesis', 'Berakhot')
 * @param {string|number} chapterNumber - Chapter number or daf reference (e.g., '2a')
 * @returns {Promise<Array<{verse: number, hebrewText: string, englishText: string, rawEnglishHtml: string}>>}
 *          Array of verse objects with Hebrew and English text
 * @throws {Error} If the text cannot be loaded
 */
export const getVerses = async (bookName, chapterNumber) => {
  const cacheKey = `verses:${bookName}:${chapterNumber}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/${formattedName}.${chapterNumber}?context=0`
    );

    const verses = [];
    const hebrewVerses = Array.isArray(data.he) ? data.he : [data.he];
    const englishVerses = Array.isArray(data.text) ? data.text : [data.text];

    for (let i = 0; i < hebrewVerses.length; i++) {
      const rawEnglish = englishVerses[i] || '';
      verses.push({
        verse: i + 1,
        hebrewText: hebrewVerses[i] || '',
        englishText: cleanHtml(rawEnglish),
        // Raw HTML with b/strong tags for annotated translation display
        // Sefaria uses <b>/<strong> to mark direct translations vs explanatory text
        rawEnglishHtml: rawEnglish
      });
    }

    textCache.set(cacheKey, verses);
    return verses;
  } catch (error) {
    console.error('Error fetching verses:', error);
    throw new Error(`Failed to load ${bookName} ${chapterNumber}`);
  }
};

/**
 * Fetch a single verse by reference
 * @async
 * @param {string} ref - Verse reference (e.g., 'Genesis.1.1' or 'בראשית.1.1')
 * @returns {Promise<{ref: string, heRef: string, hebrew: string, english: string}|null>}
 *          Verse object or null if not found
 */
export const getVerse = async (ref) => {
  const parts = ref.split('.');
  const normalizedRef = parts.length >= 2
    ? toSefariaRef(parts[0], parts[1], parts[2])
    : ref;

  const cacheKey = `verse:${normalizedRef}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/${encodeURIComponent(normalizedRef)}?context=0`
    );

    const result = {
      ref: data.ref,
      heRef: data.heRef,
      hebrew: cleanHtml(Array.isArray(data.he) ? data.he.join(' ') : data.he),
      english: cleanHtml(Array.isArray(data.text) ? data.text.join(' ') : data.text)
    };

    textCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching verse:', error);
    return null;
  }
};

// =============================================================================
// COMMENTARY FUNCTIONS
// =============================================================================

/**
 * Fetch commentaries for a specific verse
 * @async
 * @param {string} bookName - Name of the book
 * @param {string|number} chapterNumber - Chapter number or daf reference
 * @param {string|number} verseNumber - Verse number or Mishna number
 * @returns {Promise<Array<{source: string, text: string, language: string}>>}
 *          Array of commentary objects with source, text, and language
 */
export const getCommentary = async (bookName, chapterNumber, verseNumber) => {
  const cacheKey = `commentary:${bookName}:${chapterNumber}:${verseNumber}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  const isTalmud = TALMUD_BAVLI.includes(bookName);
  const isMishnah = MISHNAH_TRACTATES.includes(bookName);

  const commentaries = isTalmud
    ? ['Rashi', 'Tosafot', 'Rashbam', 'Maharsha', 'Ritva']
    : isMishnah
      ? ['Bartenura', 'Tosafot Yom Tov', 'Ikar Tosafot Yom Tov', 'Rambam']
      : ['Rashi', 'Onkelos', 'Sforno', 'Ibn Ezra', 'Ramban', 'Targum Jonathan'];

  const formattedName = formatBookName(bookName);

  const fetchSingle = async (commentary) => {
    try {
      const url = `${BASE_URL}/texts/${commentary} on ${formattedName}.${chapterNumber}.${verseNumber}?context=0`;
      const data = await fetchWithFallback(url, { timeout: 10000 });
      const results = [];

      if (data.he) {
        const texts = Array.isArray(data.he) ? data.he : [data.he];
        texts.filter(t => t).forEach(text => {
          results.push({ source: commentary, text, language: 'hebrew' });
        });
      }
      if (data.text) {
        const texts = Array.isArray(data.text) ? data.text : [data.text];
        texts.filter(t => t).forEach(text => {
          results.push({ source: commentary, text, language: 'english' });
        });
      }
      return results;
    } catch (error) {
      console.warn(`Failed to fetch ${commentary} commentary:`, error.message);
      return [];
    }
  };

  const allResults = await Promise.all(commentaries.map(fetchSingle));
  const commentaryData = allResults.flat();

  commentaryCache.set(cacheKey, commentaryData);
  return commentaryData;
};

export const getRashi = async (ref) => {
  const parts = ref.split('.');
  const normalizedRef = parts.length >= 2
    ? toSefariaRef(parts[0], parts[1], parts[2])
    : ref;

  try {
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Rashi on ${encodeURIComponent(normalizedRef)}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    return {
      ref: data.ref,
      heRef: data.heRef,
      comments: hebrewTexts.map((he, i) => ({
        hebrew: cleanHtml(he),
        english: cleanHtml(englishTexts[i])
      })).filter(c => c.hebrew || c.english)
    };
  } catch (error) {
    console.warn('Failed to fetch Rashi:', error.message);
    return null;
  }
};

// =============================================================================
// ONKELOS / TARGUM
// =============================================================================

export const getOnkelos = async (bookName, chapterNumber) => {
  if (!TORAH_BOOKS.includes(bookName)) return [];

  const cacheKey = `onkelos:${bookName}:${chapterNumber}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Onkelos_${formattedName}.${chapterNumber}?context=0`
    );

    const aramaic = Array.isArray(data.he) ? data.he : [data.he];
    const english = Array.isArray(data.text) ? data.text : [data.text];

    const result = aramaic.map((ar, i) => ({
      verse: i + 1,
      aramaic: cleanHtml(ar || ''),
      english: cleanHtml(english[i] || '')
    }));

    textCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Failed to fetch Onkelos:', error.message);
    return [];
  }
};

// =============================================================================
// SEARCH
// =============================================================================

export const searchTorah = async (query) => {
  if (!query) return [];

  const cacheKey = `search:${query}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchWithFallback(`${BASE_URL}/search/${encodeURIComponent(query)}`);

    const results = (data.hits || []).slice(0, 30).map(hit => ({
      text: cleanHtml(hit.text || ''),
      book: hit.book || 'Unknown',
      chapter: hit.chapter || '',
      verse: hit.verse || '',
      score: hit.score || 0
    })).filter(r => r.text?.trim());

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    textCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// =============================================================================
// RELATED TEXTS
// =============================================================================

export const getRelatedTexts = async (ref) => {
  try {
    const formattedRef = formatBookName(ref);
    const data = await fetchWithFallback(`${BASE_URL}/related/${formattedRef}`);

    const related = {
      commentary: [], targum: [], midrash: [], halacha: [], parallels: [], connections: []
    };

    if (data?.links && Array.isArray(data.links)) {
      data.links.forEach(link => {
        const category = (link.category || link.type || '').toLowerCase();
        const item = {
          ref: link.ref,
          heRef: link.heRef || link.ref,
          text: cleanHtml(link.text || ''),
          he: cleanHtml(link.he || ''),
          category: link.category,
          sourceRef: link.sourceRef || link.anchorRef
        };

        if (category.includes('commentary') || category.includes('rashi') || category.includes('tosafot')) {
          related.commentary.push(item);
        } else if (category.includes('targum')) {
          related.targum.push(item);
        } else if (category.includes('midrash')) {
          related.midrash.push(item);
        } else if (category.includes('halakh') || category.includes('halacha')) {
          related.halacha.push(item);
        } else if (category.includes('parallel')) {
          related.parallels.push(item);
        } else {
          related.connections.push(item);
        }
      });
    }

    return related;
  } catch (error) {
    console.warn('Failed to fetch related texts:', error.message);
    return { commentary: [], targum: [], midrash: [], halacha: [], parallels: [], connections: [] };
  }
};

// =============================================================================
// RANDOM TEXT
// =============================================================================

export const getRandomText = async (categories = []) => {
  try {
    let endpoint = '/texts/random';
    if (categories.length > 0) {
      endpoint += `?categories=${categories.map(c => encodeURIComponent(c)).join(',')}`;
    }

    // Don't cache random text - it should be different each time
    const data = await fetchWithFallback(`${BASE_URL}${endpoint}`);

    return {
      ref: data.ref || '',
      heRef: data.heRef || data.ref || '',
      he: cleanHtml(Array.isArray(data.he) ? data.he.join(' ') : (data.he || '')),
      text: cleanHtml(Array.isArray(data.text) ? data.text.join(' ') : (data.text || '')),
      categories: data.categories || [],
      book: data.book || (data.ref ? data.ref.split('.')[0].replace(/_/g, ' ') : ''),
      chapter: data.ref ? data.ref.match(/[.\s](\d+[ab]?)(?:[.:\s]|$)/)?.[1] || '' : ''
    };
  } catch (error) {
    console.warn('Failed to fetch random text:', error.message);
    return null;
  }
};

// =============================================================================
// CROSS REFERENCES
// =============================================================================

export const getCrossReferences = async (bookName, chapterNumber) => {
  const cacheKey = `links:${bookName}:${chapterNumber}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(`${BASE_URL}/links/${formattedName}.${chapterNumber}`);

    const crossRefs = (data || [])
      .filter(link => {
        const category = (link.category || '').toLowerCase();
        return ['talmud', 'bavli', 'tanakh', 'torah', 'mishnah', 'halakhah', 'midrash']
          .some(c => category.includes(c));
      })
      .map(link => ({
        ref: link.ref,
        category: link.category || link.type || 'Other',
        heRef: link.heRef || link.ref,
        text: cleanHtml(link.text || ''),
        heText: cleanHtml(link.he || '')
      }));

    textCache.set(cacheKey, crossRefs);
    return crossRefs;
  } catch {
    return [];
  }
};

export const getCrossRefPreview = async (ref) => {
  const cacheKey = `preview:${ref}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedRef = formatBookName(ref);
    const data = await fetchWithFallback(`${BASE_URL}/texts/${formattedRef}?context=0`);

    const result = {
      he: cleanHtml(Array.isArray(data.he) ? data.he.join(' ') : (data.he || '')),
      text: cleanHtml(Array.isArray(data.text) ? data.text.join(' ') : (data.text || '')),
      ref: ref,
      heRef: data.heRef || ref
    };

    textCache.set(cacheKey, result);
    return result;
  } catch {
    return { he: '', text: '', ref: ref };
  }
};

// =============================================================================
// TOPICS API (from sefariaApiV3)
// =============================================================================

export const getTopics = async () => {
  try {
    return await fetchWithFallback(`${BASE_URL}/topics`) || [];
  } catch {
    return [];
  }
};

export const getTopic = async (slug) => {
  try {
    return await fetchWithFallback(`${BASE_URL}/topics/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
};

export const getTopicsForRef = async (ref) => {
  try {
    const formattedRef = formatBookName(ref);
    const data = await fetchWithFallback(`${BASE_URL}/ref-topic-links/${formattedRef}`);

    if (Array.isArray(data)) {
      return data.map(item => ({
        slug: item.topic || item.slug,
        title: item.topic ? { en: item.topic, he: item.he || item.topic } : item.title,
        description: cleanHtml(item.description || ''),
        category: item.toTopic || item.category || 'General'
      }));
    }
    return [];
  } catch {
    return [];
  }
};

// =============================================================================
// CALENDARS API
// =============================================================================

export const getCalendars = async (timezone = 'America/New_York') => {
  try {
    const data = await fetchWithFallback(
      `${BASE_URL}/calendars?timezone=${encodeURIComponent(timezone)}`
    );

    const calendars = {
      parashat: null, haftarah: [], dafYomi: null, mishnahYomit: null,
      dailyRambam: null, other: []
    };

    (data?.calendar_items || []).forEach(item => {
      const title = (item.title?.en || '').toLowerCase();
      const calItem = {
        title: item.title,
        displayValue: item.displayValue,
        ref: item.ref || item.url || '',
        url: item.url || `https://www.sefaria.org/${(item.ref || '').replace(/ /g, '_')}`
      };

      if (title.includes('parashat')) calendars.parashat = calItem;
      else if (title.includes('haftara')) calendars.haftarah.push(calItem);
      else if (title.includes('daf yomi')) calendars.dafYomi = calItem;
      else if (title.includes('mishnah')) calendars.mishnahYomit = calItem;
      else if (title.includes('rambam')) calendars.dailyRambam = calItem;
      else calendars.other.push(calItem);
    });

    return calendars;
  } catch {
    return null;
  }
};

// =============================================================================
// TEXT VERSIONS
// =============================================================================

export const getTextVersions = async (title) => {
  try {
    const formattedTitle = formatBookName(title);
    const data = await fetchWithFallback(`${BASE_URL}/texts/versions/${formattedTitle}`);

    if (Array.isArray(data)) {
      return data.map(v => ({
        versionTitle: v.versionTitle,
        language: v.language,
        versionSource: v.versionSource,
        status: v.status
      }));
    }
    return [];
  } catch {
    return [];
  }
};

export const getTextWithVersion = async (ref, version = 'english') => {
  try {
    const formattedRef = formatBookName(ref);
    const data = await fetchWithFallback(
      `${BASE_URL}/v3/texts/${formattedRef}?version=${encodeURIComponent(version)}`
    );

    // Clean HTML from text arrays
    const cleanTextArray = (arr) => {
      if (!arr) return [];
      if (Array.isArray(arr)) return arr.map(t => cleanHtml(t || ''));
      return [cleanHtml(arr || '')];
    };

    return {
      ref: data.ref || ref,
      heRef: data.heRef || data.ref || ref,
      versions: data.versions || [],
      he: cleanTextArray(data.he),
      text: cleanTextArray(data.text)
    };
  } catch {
    return null;
  }
};

// =============================================================================
// BOOK INDEX
// =============================================================================

export const getBookIndex = async (title) => {
  try {
    const formattedTitle = formatBookName(title);
    const data = await fetchWithFallback(`${BASE_URL}/v2/index/${formattedTitle}`);

    return {
      title: data.title,
      heTitle: data.heTitle,
      categories: data.categories,
      authors: data.authors,
      enDesc: cleanHtml(data.enDesc || ''),
      heDesc: cleanHtml(data.heDesc || '')
    };
  } catch {
    return null;
  }
};

// =============================================================================
// SHEETS
// =============================================================================

export const getPopularSheets = async (limit = 10) => {
  try {
    const data = await fetchWithFallback(`${BASE_URL}/sheets/?limit=${limit}`);

    if (Array.isArray(data)) {
      return data.map(sheet => ({
        id: sheet.id,
        title: cleanHtml(sheet.title || ''),
        summary: cleanHtml(sheet.summary || ''),
        author: sheet.owner_name || sheet.author,
        views: sheet.views || 0,
        url: `https://www.sefaria.org/sheets/${sheet.id}`
      }));
    }
    return [];
  } catch {
    return [];
  }
};

// =============================================================================
// LEXICON / WORD DEFINITIONS
// =============================================================================

export const getWordDefinitions = async (word) => {
  try {
    const data = await fetchWithFallback(`${BASE_URL}/words/${encodeURIComponent(word)}`);

    if (Array.isArray(data)) {
      return data.map(entry => ({
        headword: entry.headword,
        parent_lexicon: entry.parent_lexicon,
        content: entry.content,
        definition: cleanHtml(entry.content)
      }));
    }
    return [];
  } catch {
    return [];
  }
};

// =============================================================================
// PARSHA DATA
// =============================================================================

const PARSHA_DATA = {
  'Genesis': [
    { name: 'Bereshit', startChapter: 1, endChapter: 6 },
    { name: 'Noach', startChapter: 7, endChapter: 11 },
    { name: 'Lech-Lecha', startChapter: 12, endChapter: 17 },
    { name: 'Vayera', startChapter: 18, endChapter: 22 },
    { name: 'Chayei Sara', startChapter: 23, endChapter: 25 },
    { name: 'Toldot', startChapter: 26, endChapter: 28 },
    { name: 'Vayetzei', startChapter: 29, endChapter: 32 },
    { name: 'Vayishlach', startChapter: 33, endChapter: 36 },
    { name: 'Vayeshev', startChapter: 37, endChapter: 40 },
    { name: 'Miketz', startChapter: 41, endChapter: 44 },
    { name: 'Vayigash', startChapter: 45, endChapter: 47 },
    { name: 'Vayechi', startChapter: 48, endChapter: 50 }
  ],
  'Exodus': [
    { name: 'Shemot', startChapter: 1, endChapter: 6 },
    { name: 'Vaera', startChapter: 7, endChapter: 10 },
    { name: 'Bo', startChapter: 11, endChapter: 13 },
    { name: 'Beshalach', startChapter: 14, endChapter: 17 },
    { name: 'Yitro', startChapter: 18, endChapter: 20 },
    { name: 'Mishpatim', startChapter: 21, endChapter: 24 },
    { name: 'Terumah', startChapter: 25, endChapter: 27 },
    { name: 'Tetzaveh', startChapter: 28, endChapter: 30 },
    { name: 'Ki Tisa', startChapter: 31, endChapter: 34 },
    { name: 'Vayakhel', startChapter: 35, endChapter: 38 },
    { name: 'Pekudei', startChapter: 39, endChapter: 40 }
  ],
  'Leviticus': [
    { name: 'Vayikra', startChapter: 1, endChapter: 5 },
    { name: 'Tzav', startChapter: 6, endChapter: 8 },
    { name: 'Shmini', startChapter: 9, endChapter: 11 },
    { name: 'Tazria', startChapter: 12, endChapter: 13 },
    { name: 'Metzora', startChapter: 14, endChapter: 15 },
    { name: 'Achrei Mot', startChapter: 16, endChapter: 18 },
    { name: 'Kedoshim', startChapter: 19, endChapter: 20 },
    { name: 'Emor', startChapter: 21, endChapter: 22 },
    { name: 'Behar', startChapter: 23, endChapter: 25 },
    { name: 'Bechukotai', startChapter: 26, endChapter: 27 }
  ],
  'Numbers': [
    { name: 'Bamidbar', startChapter: 1, endChapter: 4 },
    { name: 'Nasso', startChapter: 5, endChapter: 7 },
    { name: 'Behaalotecha', startChapter: 8, endChapter: 10 },
    { name: 'Shelach', startChapter: 11, endChapter: 15 },
    { name: 'Korach', startChapter: 16, endChapter: 18 },
    { name: 'Chukat', startChapter: 19, endChapter: 22 },
    { name: 'Balak', startChapter: 23, endChapter: 25 },
    { name: 'Pinchas', startChapter: 26, endChapter: 31 },
    { name: 'Matot', startChapter: 32, endChapter: 32 },
    { name: 'Masei', startChapter: 33, endChapter: 36 }
  ],
  'Deuteronomy': [
    { name: 'Devarim', startChapter: 1, endChapter: 3 },
    { name: 'Vaetchanan', startChapter: 4, endChapter: 7 },
    { name: 'Eikev', startChapter: 8, endChapter: 11 },
    { name: 'Reeh', startChapter: 12, endChapter: 16 },
    { name: 'Shoftim', startChapter: 17, endChapter: 21 },
    { name: 'Ki Teitzei', startChapter: 22, endChapter: 25 },
    { name: 'Ki Tavo', startChapter: 26, endChapter: 29 },
    { name: 'Nitzavim', startChapter: 30, endChapter: 30 },
    { name: 'Vayelech', startChapter: 31, endChapter: 31 },
    { name: 'Haazinu', startChapter: 32, endChapter: 32 },
    { name: 'Vezot Habracha', startChapter: 33, endChapter: 34 }
  ]
};

export const getParshas = (bookName) => {
  if (!TORAH_BOOKS.includes(bookName)) return [];
  return PARSHA_DATA[bookName] || [];
};

// =============================================================================
// CLEAR CACHES
// =============================================================================

export const clearCaches = () => {
  textCache.clear();
  commentaryCache.clear();
};

// =============================================================================
// RE-EXPORT RASHI SERVICE FUNCTIONS
// =============================================================================

export { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse };

// =============================================================================
// RE-EXPORT TOSAFOT SERVICE FUNCTIONS
// =============================================================================

export { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable };

// =============================================================================
// RE-EXPORT MAHARSHA SERVICE FUNCTIONS
// =============================================================================

export { getMaharshaHalachot, getMaharshaAggadot, getMaharshaForDaf, isMaharshaAvailable };

// =============================================================================
// RE-EXPORT RAMBAN SERVICE FUNCTIONS
// =============================================================================

export { getRambanOnTorah, getRambanForVerse, isRambanAvailable };

// =============================================================================
// IBN EZRA COMMENTARY FUNCTIONS
// =============================================================================

export const getIbnEzraForVerse = async (bookName, chapter, verse) => {
  const cacheKey = `ibnezra:${bookName}:${chapter}:${verse}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Ibn Ezra on ${formattedName}.${chapter}.${verse}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    const comments = hebrewTexts
      .map((he, i) => ({
        hebrew: cleanHtml(he || ''),
        english: cleanHtml(englishTexts[i] || ''),
        dibbur: '' // Ibn Ezra doesn't always have distinct dibbur haMatchil
      }))
      .filter(c => c.hebrew || c.english);

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    console.warn('Failed to fetch Ibn Ezra:', error.message);
    return [];
  }
};

// =============================================================================
// SFORNO COMMENTARY FUNCTIONS
// =============================================================================

export const getSfornoForVerse = async (bookName, chapter, verse) => {
  const cacheKey = `sforno:${bookName}:${chapter}:${verse}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Sforno on ${formattedName}.${chapter}.${verse}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    const comments = hebrewTexts
      .map((he, i) => ({
        hebrew: cleanHtml(he || ''),
        english: cleanHtml(englishTexts[i] || ''),
        dibbur: ''
      }))
      .filter(c => c.hebrew || c.english);

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    console.warn('Failed to fetch Sforno:', error.message);
    return [];
  }
};

// =============================================================================
// OR HACHAIM COMMENTARY FUNCTIONS
// =============================================================================

export const getOrHaChaimForVerse = async (bookName, chapter, verse) => {
  const cacheKey = `orhachaim:${bookName}:${chapter}:${verse}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Or HaChaim on ${formattedName}.${chapter}.${verse}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    const comments = hebrewTexts
      .map((he, i) => ({
        hebrew: cleanHtml(he || ''),
        english: cleanHtml(englishTexts[i] || ''),
        dibbur: ''
      }))
      .filter(c => c.hebrew || c.english);

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    return [];
  }
};

// =============================================================================
// BARTENURA COMMENTARY FUNCTIONS (For Mishnah)
// =============================================================================

export const getBartenuraForMishnah = async (tractate, chapter, mishnah) => {
  const cacheKey = `bartenura:${tractate}:${chapter}:${mishnah}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(tractate);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Bartenura on ${formattedName}.${chapter}.${mishnah}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    const comments = hebrewTexts
      .map((he, i) => ({
        hebrew: cleanHtml(he || ''),
        english: cleanHtml(englishTexts[i] || ''),
        dibbur: ''
      }))
      .filter(c => c.hebrew || c.english);

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    return [];
  }
};

// =============================================================================
// TOSFOT YOM TOV COMMENTARY FUNCTIONS (For Mishnah)
// =============================================================================

export const getTosafotYomTovForMishnah = async (tractate, chapter, mishnah) => {
  const cacheKey = `tosfotyomtov:${tractate}:${chapter}:${mishnah}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(tractate);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/Tosafot Yom Tov on ${formattedName}.${chapter}.${mishnah}?context=0`
    );

    const hebrewTexts = Array.isArray(data.he) ? data.he : [data.he];
    const englishTexts = Array.isArray(data.text) ? data.text : [data.text];

    const comments = hebrewTexts
      .map((he, i) => ({
        hebrew: cleanHtml(he || ''),
        english: cleanHtml(englishTexts[i] || ''),
        dibbur: ''
      }))
      .filter(c => c.hebrew || c.english);

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    return [];
  }
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
  // Dedicated Maharsha functions
  getMaharshaHalachot,
  getMaharshaAggadot,
  getMaharshaForDaf,
  isMaharshaAvailable,
  // Dedicated Ramban functions
  getRambanOnTorah,
  getRambanForVerse,
  isRambanAvailable,
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
  // Search
  searchTorah,
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
  // Utilities
  clearCaches,
  toSefariaRef
};

export default sefariaApi;
