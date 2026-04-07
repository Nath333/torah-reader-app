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
 */

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from './cacheOrchestrator';
import { fetchWithFallback } from '../utils/http';
import { cleanHtml } from '../utils/sanitize';
import { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse, getRashiForChapter } from './rashiService';
import { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable } from './tosafotService';
// PRO SCHOLAR V10.2: Use translationService for text translation (separated from word lookup)
import { translateCommentary } from './translationService';

// Import shared book constants
import {
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  TALMUD_BAVLI
} from '../constants/bookConstants';

// Use local proxy in development to avoid CORS issues
const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// PRO SCHOLAR V6.2: Create managed cache instances with CacheOrchestrator
const textCache = createManagedCache('api', { ttl: 10 * 60 * 1000, maxSize: 500 }); // 10 min
const commentaryCache = createManagedCache('commentary', { ttl: 60 * 60 * 1000, maxSize: 300 }); // 1 hour

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

const formatBookName = (name) => (name || '').replace(/ /g, '_');

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

    // Use max length to handle arrays of different sizes
    const maxLength = Math.max(hebrewVerses.length, englishVerses.length);
    for (let i = 0; i < maxLength; i++) {
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

      const hebrewTexts = data.he ? (Array.isArray(data.he) ? data.he : [data.he]).filter(t => t) : [];
      const englishTexts = data.text ? (Array.isArray(data.text) ? data.text : [data.text]).filter(t => t) : [];

      // Add Hebrew comments
      hebrewTexts.forEach(text => {
        results.push({ source: commentary, text, language: 'hebrew' });
      });

      // Add English comments - either from Sefaria or translated
      if (englishTexts.length > 0) {
        // Use Sefaria's English translation
        englishTexts.forEach(text => {
          results.push({ source: commentary, text, language: 'english', isTranslated: false });
        });
      } else if (hebrewTexts.length > 0) {
        // No English from Sefaria - translate Hebrew commentary
        for (const hebrewText of hebrewTexts) {
          try {
            const translated = await translateCommentary(hebrewText);
            if (translated) {
              results.push({
                source: commentary,
                text: translated,
                language: 'english',
                isTranslated: true
              });
            }
          } catch (translationError) {
            // Translation failed - skip English for this comment
            console.warn(`Translation failed for ${commentary}:`, translationError.message);
          }
        }
      }
      return results;
    } catch (error) {
      console.warn(`Failed to fetch ${commentary} commentary:`, error.message);
      return [];
    }
  };

  // Use Promise.allSettled to handle partial failures gracefully
  const allResults = await Promise.allSettled(commentaries.map(fetchSingle));
  const commentaryData = allResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .flat();

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
} from './commentaryServiceFactory';

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

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;

      // Translate if no English available
      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
          }
        } catch (err) {
          console.warn('Translation failed for Ibn Ezra:', err.message);
        }
      }

      comments.push({
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        dibbur: ''
      });
    }

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

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;

      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
          }
        } catch (err) {
          console.warn('Translation failed for Sforno:', err.message);
        }
      }

      comments.push({
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        dibbur: ''
      });
    }

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

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;

      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
          }
        } catch (err) {
          console.warn('Translation failed for Or HaChaim:', err.message);
        }
      }

      comments.push({
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        dibbur: ''
      });
    }

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

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;

      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
          }
        } catch (err) {
          console.warn('Translation failed for Bartenura:', err.message);
        }
      }

      comments.push({
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        dibbur: ''
      });
    }

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

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;

      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
          }
        } catch (err) {
          console.warn('Translation failed for Tosafot Yom Tov:', err.message);
        }
      }

      comments.push({
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        dibbur: ''
      });
    }

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    return [];
  }
};

// =============================================================================
// TALMUD BAVLI WITH ENGLISH TRANSLATION (William Davidson Edition)
// =============================================================================

/**
 * Fetch a Talmud daf (page) with full English translation
 * Uses the William Davidson Edition (Steinsaltz translation)
 * @async
 * @param {string} tractate - Name of tractate (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference (e.g., '2a', '15b')
 * @returns {Promise<Object>} Object with Hebrew/Aramaic and English text
 */
export const getTalmudDaf = async (tractate, daf) => {
  const cacheKey = `talmud:${tractate}:${daf}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  const formattedTractate = formatBookName(tractate);
  const logPrefix = `[Talmud:${tractate}.${daf}]`;

  // PRO SCHOLAR V11.2: Optimized helpers
  const flattenText = (arr) => {
    if (!arr) return [];
    if (typeof arr === 'string') return [arr];
    return Array.isArray(arr) ? arr.flatMap(flattenText) : [];
  };

  const buildSegments = (heTexts, enTexts) => {
    const segments = [];
    const hebrew = [];
    const english = [];
    const maxLen = Math.max(heTexts.length, enTexts.length);

    for (let i = 0; i < maxLen; i++) {
      const he = cleanHtml(heTexts[i] || '');
      const en = cleanHtml(enTexts[i] || '');
      if (he || en) {
        hebrew.push(he);
        english.push(en);
        segments.push({ index: i + 1, hebrew: he, english: en });
      }
    }
    return { segments, hebrew, english };
  };

  const createResult = (ref, heRef, segmentData) => ({
    ref: ref || `${tractate}.${daf}`,
    heRef: heRef || `${tractate} ${daf}`,
    tractate,
    daf,
    ...segmentData
  });

  // Strategy 1: Try v2 API (simpler, more reliable)
  try {
    const v2Data = await fetchWithFallback(
      `${BASE_URL}/texts/${formattedTractate}.${daf}?context=0`,
      { timeout: 15000 }
    );

    const heTexts = flattenText(v2Data.he);
    const enTexts = flattenText(v2Data.text);

    if (heTexts.length > 0 || enTexts.length > 0) {
      const segmentData = buildSegments(heTexts, enTexts);
      if (segmentData.segments.length > 0) {
        console.log(`${logPrefix} v2 API: ${segmentData.segments.length} segments`);
        const result = createResult(v2Data.ref, v2Data.heRef, segmentData);
        textCache.set(cacheKey, result);
        return result;
      }
    }
    console.log(`${logPrefix} v2 empty, trying v3...`);
  } catch (v2Err) {
    console.warn(`${logPrefix} v2 failed:`, v2Err.message);
  }

  // Strategy 2: Try v3 API with versions structure
  try {
    const v3Data = await fetchWithFallback(
      `${BASE_URL}/v3/texts/${formattedTractate}.${daf}`,
      { timeout: 15000 }
    );

    let heTexts = [];
    let enTexts = [];

    // v3 format: versions array OR direct he/text
    if (v3Data.versions?.length > 0) {
      const heVer = v3Data.versions.find(v => v.language === 'he');
      const enVer = v3Data.versions.find(v => v.language === 'en');
      heTexts = flattenText(heVer?.text || v3Data.he);
      enTexts = flattenText(enVer?.text || v3Data.text);
    } else {
      heTexts = flattenText(v3Data.he);
      enTexts = flattenText(v3Data.text);
    }

    if (heTexts.length > 0 || enTexts.length > 0) {
      const segmentData = buildSegments(heTexts, enTexts);
      if (segmentData.segments.length > 0) {
        console.log(`${logPrefix} v3 API: ${segmentData.segments.length} segments`);
        const result = createResult(v3Data.ref, v3Data.heRef, segmentData);
        textCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (v3Err) {
    console.warn(`${logPrefix} v3 failed:`, v3Err.message);
  }

  // Strategy 3: Direct Sefaria fetch (bypass proxy issues)
  try {
    const directUrl = `https://www.sefaria.org/api/texts/${formattedTractate}.${daf}?context=0`;

    // Use AbortController for timeout (compatible with older browsers)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(directUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const heTexts = flattenText(data.he);
      const enTexts = flattenText(data.text);

      if (heTexts.length > 0 || enTexts.length > 0) {
        const segmentData = buildSegments(heTexts, enTexts);
        if (segmentData.segments.length > 0) {
          console.log(`${logPrefix} Direct fetch: ${segmentData.segments.length} segments`);
          const result = createResult(data.ref, data.heRef, segmentData);
          textCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (directErr) {
    console.warn(`${logPrefix} Direct fetch failed:`, directErr.message);
  }

  console.error(`${logPrefix} All strategies failed - no content available`);
  throw new Error(`לא ניתן לטעון ${tractate} ${daf} - בדוק חיבור לאינטרנט`);
};

/**
 * Fetch Tractate Shabbat with English translation
 * Convenience function for Shabbat tractate
 * @async
 * @param {string} daf - Daf reference (e.g., '2a', '73a')
 * @returns {Promise<Object>} Shabbat daf with Hebrew and English
 */
export const getShabbatDaf = async (daf) => {
  return getTalmudDaf('Shabbat', daf);
};

/**
 * PRO SCHOLAR V19: Fetch full Sugya (multiple consecutive pages)
 * Loads extended content for comprehensive scholarly display
 * @async
 * @param {string} tractate - Name of tractate (e.g., 'Shabbat')
 * @param {string} startDaf - Starting daf reference (e.g., '2a')
 * @param {number} pageCount - Number of pages to fetch (default: 4 = 2 full leaves)
 * @returns {Promise<Object>} Combined sugya with all pages
 */
export const getFullSugya = async (tractate, startDaf, pageCount = 4) => {
  const cacheKey = `sugya:${tractate}:${startDaf}:${pageCount}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  // Parse starting daf
  const dafMatch = startDaf.match(/^(\d+)([ab])$/);
  if (!dafMatch) {
    throw new Error(`Invalid daf format: ${startDaf}`);
  }

  let dafNum = parseInt(dafMatch[1], 10);
  let side = dafMatch[2]; // 'a' or 'b'

  // Generate list of pages to fetch
  const pagesToFetch = [];
  for (let i = 0; i < pageCount; i++) {
    pagesToFetch.push(`${dafNum}${side}`);
    // Advance to next page
    if (side === 'a') {
      side = 'b';
    } else {
      side = 'a';
      dafNum++;
    }
  }

  console.log(`[Sugya] Fetching ${tractate} pages: ${pagesToFetch.join(', ')}`);

  // Fetch all pages in parallel
  const pagePromises = pagesToFetch.map(daf =>
    getTalmudDaf(tractate, daf).catch(err => {
      console.warn(`[Sugya] Failed to fetch ${tractate}.${daf}:`, err.message);
      return null;
    })
  );

  const pages = await Promise.all(pagePromises);
  const validPages = pages.filter(p => p !== null);

  if (validPages.length === 0) {
    throw new Error(`לא ניתן לטעון סוגיה מ-${tractate} ${startDaf}`);
  }

  // Combine all pages into one result
  const combinedHebrew = [];
  const combinedEnglish = [];
  const combinedSegments = [];
  const pageMarkers = [];

  validPages.forEach((page, idx) => {
    const pageNum = pagesToFetch[idx];
    pageMarkers.push({
      daf: pageNum,
      startIndex: combinedSegments.length,
      segmentCount: page.segments?.length || 0
    });

    // Add page marker to text
    combinedHebrew.push(`\n═══ ${tractate} ${pageNum} ═══\n`);
    combinedEnglish.push(`\n═══ ${tractate} ${pageNum} ═══\n`);

    // Add segments
    if (page.segments) {
      page.segments.forEach((seg, segIdx) => {
        combinedHebrew.push(seg.hebrew || '');
        combinedEnglish.push(seg.english || '');
        combinedSegments.push({
          ...seg,
          daf: pageNum,
          globalIndex: combinedSegments.length + 1
        });
      });
    } else if (page.hebrew) {
      page.hebrew.forEach((he, i) => {
        combinedHebrew.push(he);
        combinedEnglish.push(page.english?.[i] || '');
        combinedSegments.push({
          index: i + 1,
          hebrew: he,
          english: page.english?.[i] || '',
          daf: pageNum,
          globalIndex: combinedSegments.length + 1
        });
      });
    }
  });

  const result = {
    ref: `${tractate}.${startDaf}-${pagesToFetch[pagesToFetch.length - 1]}`,
    heRef: `${tractate} ${startDaf}-${pagesToFetch[pagesToFetch.length - 1]}`,
    tractate,
    startDaf,
    endDaf: pagesToFetch[pagesToFetch.length - 1],
    pageCount: validPages.length,
    pageMarkers,
    segments: combinedSegments,
    hebrew: combinedHebrew,
    english: combinedEnglish,
    fullHebrewText: combinedHebrew.join(' '),
    fullEnglishText: combinedEnglish.join(' '),
    isSugya: true
  };

  textCache.set(cacheKey, result);
  console.log(`[Sugya] Loaded ${validPages.length} pages, ${combinedSegments.length} total segments`);
  return result;
};

// =============================================================================
// PRO SCHOLAR V22: Smart Sugya Loading - Loads until Gemara resolves the Mishna
// =============================================================================

/**
 * Patterns that indicate a new Mishna is starting (end of current sugya)
 */
const NEW_MISHNA_PATTERNS = [
  /^מתני[׳']?\.?\s/,           // מתני׳ at start of segment
  /^מתניתין\.?\s/,            // מתניתין at start
  /^הדרן\s+עלך/,              // הדרן עלך (end of chapter)
  /^פרק\s+[א-ת]/,             // New chapter marker
];

/**
 * Patterns that indicate the Gemara has reached a conclusion/resolution
 */
const RESOLUTION_PATTERNS = [
  /הלכה\s+כ[א-ת]/,            // הלכה כ... (the halacha follows...)
  /הלכתא\s+כ/,                // הלכתא כ...
  /שמע\s+מינה\s+תלת/,         // שמע מינה תלת (we derive three things)
  /שמע\s+מינה$/,              // שמע מינה at end (conclusion)
  /תיקו$/,                    // תיקו (stands unresolved)
  /קשיא$/,                    // קשיא (remains difficult)
  /ולא\s+היא/,                // ולא היא (rejection of premise - often conclusive)
];

/**
 * Patterns that indicate strong discussion continuation (don't stop here)
 */
const CONTINUATION_PATTERNS = [
  /^גמ[׳']?\.?\s/,            // גמ׳ - Gemara marker (just starting!)
  /איבעיא\s+להו/,            // Question to resolve
  /בעי\s+[א-ת]/,              // Asks...
  /תא\s+שמע/,                 // Come and hear (bringing proof)
  /מיתיבי/,                   // Objection from Braita
  /ורמינהו/,                  // Contradiction
  /והתניא/,                   // But it was taught
  /מנא\s+הני\s+מילי/,         // Source question
  /מנלן/,                     // From where do we know
];

/**
 * Check if a segment marks the start of a new Mishna
 */
const isNewMishna = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return NEW_MISHNA_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Check if text contains a resolution marker
 */
const hasResolution = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return RESOLUTION_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Check if text indicates strong continuation (shouldn't stop)
 */
const hasContinuation = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return CONTINUATION_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Analyzes sugya content to determine sugya boundaries and extract full discussion
 * @param {Array} segments - Array of text segments
 * @returns {Object} Analysis with boundary info and full text
 */
const analyzeSugyaBoundaries = (segments) => {
  let mishnaEndIndex = -1;
  let gemaraStartIndex = -1;
  let resolutionIndex = -1;
  let nextMishnaIndex = -1;

  // Track whether we've passed the initial Mishna
  let passedInitialMishna = false;
  let segmentsAfterGemara = 0;
  const MIN_SEGMENTS_BEFORE_RESOLUTION = 5; // Don't accept resolution too early

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].hebrew || segments[i];
    const cleanText = typeof text === 'string' ? text.replace(/<[^>]*>/g, '').trim() : '';

    // Detect Gemara start
    if (gemaraStartIndex === -1 && /^גמ[׳']?\.?\s/.test(cleanText)) {
      gemaraStartIndex = i;
      mishnaEndIndex = i - 1;
      passedInitialMishna = true;
    }

    // If we have Gemara discourse patterns but no explicit גמ׳, detect transition
    if (gemaraStartIndex === -1 && passedInitialMishna === false) {
      const hasGemaraPattern = /תנן\s+התם|אמר\s+רב|תנו\s+רבנן|תניא|מאי\s+|פשיטא|איבעיא/.test(cleanText);
      if (hasGemaraPattern && i > 0) {
        gemaraStartIndex = i;
        mishnaEndIndex = i - 1;
        passedInitialMishna = true;
      }
    }

    // Count segments after Gemara starts
    if (gemaraStartIndex !== -1) {
      segmentsAfterGemara++;
    }

    // Detect new Mishna (only after we've had some Gemara)
    if (passedInitialMishna && segmentsAfterGemara > MIN_SEGMENTS_BEFORE_RESOLUTION && isNewMishna(cleanText)) {
      nextMishnaIndex = i;
      break; // Stop at next Mishna
    }

    // Detect resolution (only if we've had enough discussion)
    if (passedInitialMishna && segmentsAfterGemara > MIN_SEGMENTS_BEFORE_RESOLUTION) {
      if (hasResolution(cleanText) && !hasContinuation(cleanText)) {
        resolutionIndex = i;
        // Don't break immediately - continue a few more segments to include follow-up
      }
    }
  }

  return {
    mishnaEndIndex,
    gemaraStartIndex,
    resolutionIndex,
    nextMishnaIndex,
    suggestedEndIndex: nextMishnaIndex !== -1 ? nextMishnaIndex - 1 :
                       resolutionIndex !== -1 ? Math.min(resolutionIndex + 3, segments.length - 1) :
                       segments.length - 1
  };
};

/**
 * Load the complete Gemara discussion until it resolves the Mishna
 * PRO SCHOLAR V22: Smart sugya loading with boundary detection
 *
 * @param {string} tractate - Tractate name (e.g., 'Shabbat')
 * @param {string} startDaf - Starting daf (e.g., '2a')
 * @param {number} maxPages - Maximum pages to load (default: 8, safety limit)
 * @returns {Promise<Object>} Full sugya data with boundary analysis
 */
export const getFullSugyaUntilResolution = async (tractate, startDaf, maxPages = 8) => {
  const cacheKey = `sugya-full:${tractate}:${startDaf}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  console.log(`[Sugya V22] Loading ${tractate} ${startDaf} until resolution (max ${maxPages} pages)`);

  // Parse starting daf
  const dafMatch = startDaf.match(/^(\d+)([ab])$/);
  if (!dafMatch) {
    throw new Error(`Invalid daf format: ${startDaf}`);
  }

  let dafNum = parseInt(dafMatch[1], 10);
  let side = dafMatch[2];

  const combinedSegments = [];
  const combinedHebrew = [];
  const combinedEnglish = [];
  const pageMarkers = [];
  let foundResolution = false;
  let foundNextMishna = false;
  let pagesLoaded = 0;
  let lastEndDaf = startDaf;

  // Load pages until we find resolution or hit max
  while (pagesLoaded < maxPages && !foundResolution && !foundNextMishna) {
    const currentDaf = `${dafNum}${side}`;

    try {
      const page = await getTalmudDaf(tractate, currentDaf);

      if (!page) {
        console.warn(`[Sugya V22] Failed to load ${tractate}.${currentDaf}`);
        break;
      }

      pagesLoaded++;
      lastEndDaf = currentDaf;

      pageMarkers.push({
        daf: currentDaf,
        startIndex: combinedSegments.length,
        segmentCount: page.segments?.length || page.hebrew?.length || 0
      });

      // Add page marker
      combinedHebrew.push(`\n═══ ${tractate} ${currentDaf} ═══\n`);
      combinedEnglish.push(`\n═══ ${tractate} ${currentDaf} ═══\n`);

      // Process segments
      const segments = page.segments || page.hebrew?.map((h, i) => ({
        hebrew: h,
        english: page.english?.[i] || ''
      })) || [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const hebrew = seg.hebrew || seg;
        const english = seg.english || '';

        combinedHebrew.push(hebrew);
        combinedEnglish.push(english);
        combinedSegments.push({
          index: combinedSegments.length + 1,
          hebrew,
          english,
          daf: currentDaf,
          globalIndex: combinedSegments.length + 1
        });

        // Check for new Mishna or resolution (after first page)
        if (pagesLoaded > 1 || i > 5) {
          const cleanText = hebrew.replace(/<[^>]*>/g, '').trim();

          if (isNewMishna(cleanText)) {
            console.log(`[Sugya V22] Found new Mishna at ${currentDaf} segment ${i}`);
            foundNextMishna = true;
            // Remove this segment and any after it (it's the new Mishna)
            combinedSegments.pop();
            combinedHebrew.pop();
            combinedEnglish.pop();
            break;
          }

          if (hasResolution(cleanText) && combinedSegments.length > 10) {
            console.log(`[Sugya V22] Found resolution at ${currentDaf} segment ${i}: ${cleanText.slice(0, 50)}`);
            foundResolution = true;
            // Continue a few more segments for follow-up, then stop
            const remainingInPage = Math.min(3, segments.length - i - 1);
            for (let j = 1; j <= remainingInPage; j++) {
              const nextSeg = segments[i + j];
              if (nextSeg) {
                const nextHebrew = nextSeg.hebrew || nextSeg;
                const nextEnglish = nextSeg.english || '';
                if (!isNewMishna(nextHebrew)) {
                  combinedHebrew.push(nextHebrew);
                  combinedEnglish.push(nextEnglish);
                  combinedSegments.push({
                    index: combinedSegments.length + 1,
                    hebrew: nextHebrew,
                    english: nextEnglish,
                    daf: currentDaf,
                    globalIndex: combinedSegments.length + 1
                  });
                }
              }
            }
            break;
          }
        }
      }

      // Advance to next page
      if (side === 'a') {
        side = 'b';
      } else {
        side = 'a';
        dafNum++;
      }

    } catch (err) {
      console.error(`[Sugya V22] Error loading ${currentDaf}:`, err.message);
      break;
    }
  }

  // Analyze boundaries of the loaded content
  const boundaries = analyzeSugyaBoundaries(combinedSegments);

  const result = {
    ref: `${tractate}.${startDaf}-${lastEndDaf}`,
    heRef: `${tractate} ${startDaf}${pagesLoaded > 1 ? `-${lastEndDaf}` : ''}`,
    tractate,
    startDaf,
    endDaf: lastEndDaf,
    pageCount: pagesLoaded,
    pageMarkers,
    segments: combinedSegments,
    hebrew: combinedHebrew,
    english: combinedEnglish,
    fullHebrewText: combinedHebrew.join(' '),
    fullEnglishText: combinedEnglish.join(' '),
    isSugya: true,
    // V22 boundary analysis
    boundaries,
    foundResolution,
    foundNextMishna,
    status: foundResolution ? 'resolved' :
            foundNextMishna ? 'next_mishna' :
            pagesLoaded >= maxPages ? 'max_pages' : 'incomplete'
  };

  textCache.set(cacheKey, result);
  console.log(`[Sugya V22] Loaded ${pagesLoaded} pages, ${combinedSegments.length} segments, status: ${result.status}`);
  return result;
};

/**
 * Get Rashi on Talmud Shabbat with English translation
 * Uses Sefaria Community Translation when available, falls back to AI translation
 * @async
 * @param {string} daf - Daf reference (e.g., '2a', '5b')
 * @returns {Promise<Array>} Array of Rashi comments with Hebrew and English
 */
export const getRashiOnShabbat = async (daf) => {
  const cacheKey = `rashi-shabbat:${daf}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  const flattenText = (arr) => {
    if (!arr) return [];
    if (typeof arr === 'string') return [arr];
    if (Array.isArray(arr)) {
      return arr.flatMap(item => flattenText(item));
    }
    return [];
  };

  try {
    // Try to fetch with English version (Sefaria Community Translation)
    let data;
    let hasEnglishVersion = false;

    try {
      // First try v3 API with specific English version
      data = await fetchWithFallback(
        `${BASE_URL}/v3/texts/Rashi_on_Shabbat.${daf}?version=english|Sefaria%20Community%20Translation`
      );
      hasEnglishVersion = true;
    } catch {
      // Fall back to regular API (Hebrew only)
      data = await fetchWithFallback(
        `${BASE_URL}/texts/Rashi_on_Shabbat.${daf}?context=0`
      );
    }

    // Extract texts from v3 or v2 response format
    let hebrewTexts, englishTexts;

    if (data.versions) {
      // v3 format
      const heVersion = data.versions?.find(v => v.language === 'he');
      const enVersion = data.versions?.find(v => v.language === 'en');
      hebrewTexts = flattenText(heVersion?.text || data.he);
      englishTexts = flattenText(enVersion?.text || data.text);
    } else {
      // v2 format
      hebrewTexts = flattenText(data.he);
      englishTexts = flattenText(data.text);
    }

    const comments = [];
    for (let i = 0; i < hebrewTexts.length; i++) {
      const he = hebrewTexts[i];
      if (!he) continue;

      const hebrewText = cleanHtml(he);
      let englishText = cleanHtml(englishTexts[i] || '');
      let isTranslated = false;
      let translationSource = hasEnglishVersion && englishText ? 'Sefaria Community Translation' : null;

      // If no English from Sefaria, try AI translation
      if (!englishText && hebrewText) {
        try {
          const translated = await translateCommentary(hebrewText);
          if (translated) {
            englishText = translated;
            isTranslated = true;
            translationSource = 'AI Translation';
          }
        } catch (err) {
          console.warn('Translation failed for Rashi on Shabbat:', err.message);
        }
      }

      comments.push({
        index: i + 1,
        hebrew: hebrewText,
        english: englishText,
        isTranslated,
        translationSource,
        source: 'Rashi on Shabbat',
        ref: `Rashi on Shabbat ${daf}:${i + 1}`
      });
    }

    commentaryCache.set(cacheKey, comments);
    return comments;
  } catch (error) {
    console.warn(`Failed to fetch Rashi on Shabbat ${daf}:`, error.message);
    return [];
  }
};

/**
 * Get all commentaries for a Shabbat daf
 * Includes Rashi, Tosafot, and Soncino footnotes for comparison
 * @async
 * @param {string} daf - Daf reference (e.g., '2a')
 * @returns {Promise<Object>} Object with different commentaries from multiple sources
 */
export const getShabbatCommentaries = async (daf) => {
  // Import Soncino service dynamically to avoid circular deps
  const { getSoncinoFootnotes } = await import('./soncinoService');

  const [rashi, tosafot, soncinoFootnotes] = await Promise.all([
    getRashiOnShabbat(daf),
    getTosafotForDaf('Shabbat', daf).catch(() => []),
    getSoncinoFootnotes(daf).catch(() => [])
  ]);

  return {
    // Sefaria sources
    rashi,           // Hebrew Rashi (partial English from 5b:9)
    tosafot,         // Hebrew Tosafot

    // Soncino source (English footnotes with Rashi explanations)
    soncino: {
      footnotes: soncinoFootnotes,
      source: 'Soncino Talmud (halakhah.com)',
      note: 'English explanations based on Rashi, Tosafot, and scholarly commentary'
    },

    daf,

    // Comparison helper
    sources: {
      sefaria: { rashi, tosafot },
      soncino: soncinoFootnotes
    }
  };
};

/**
 * Get list of all Shabbat dapim (pages)
 * Shabbat has 157 dapim (2a to 157b)
 * @returns {string[]} Array of daf references
 */
export const getShabbatDafList = () => {
  return generateDafList('Shabbat');
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
