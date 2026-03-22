// Commentary Service Factory - Unified factory for all commentary services
// Consolidates Rashi, Ramban, Tosafot, and Maharsha into a single pattern

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from './cacheOrchestrator';
import { fetchWithFallback } from '../utils/http';
import { cleanHtml } from '../utils/sanitize';
import {
  processCommentArrayWithTranslation,
  processTalmudCommentsParallel,
  createErrorResponse
} from '../utils/commentaryUtils';
import { getSoncinoFootnotes } from './soncinoService';
import {
  TORAH_BOOKS,
  TALMUD_BAVLI,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  BOOK_HEBREW_NAMES,
  formatBook,
  formatTractate
} from '../constants/bookConstants';
import { createLogger } from '../utils/debug';

// Create logger for this module
const log = createLogger('CommentaryService');

// Use local proxy in development to avoid CORS issues
const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// Shared cache configuration
const DEFAULT_CACHE_CONFIG = { ttl: 30 * 60 * 1000, maxSize: 200 };

/**
 * Commentary configurations - defines behavior for each commentary type
 */
const COMMENTARY_CONFIGS = {
  // ============================================================================
  // ASHKENAZI / UNIVERSAL RISHONIM
  // ============================================================================
  rashi: {
    name: 'Rashi',
    nameHebrew: 'רש״י',
    sefariaPrefix: 'Rashi_on_',
    supportsTorah: true,
    supportsTalmud: true,
    supportsTanach: true,
    tradition: 'ashkenazi',
    era: 'rishon'
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
    hasIntroduction: true,
    tradition: 'sephardi',
    era: 'rishon'
  },
  tosafot: {
    name: 'Tosafot',
    nameHebrew: 'תוספות',
    sefariaPrefix: 'Tosafot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false,
    tradition: 'ashkenazi',
    era: 'rishon'
  },
  maharshaHalachot: {
    name: 'Maharsha',
    nameHebrew: 'מהרש״א',
    subSource: 'Chiddushei Halachot',
    subSourceHebrew: 'חידושי הלכות',
    sefariaPrefix: 'Chidushei_Halachot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false,
    tradition: 'ashkenazi',
    era: 'acharon'
  },
  maharshaAggadot: {
    name: 'Maharsha',
    nameHebrew: 'מהרש״א',
    subSource: 'Chiddushei Aggadot',
    subSourceHebrew: 'חידושי אגדות',
    sefariaPrefix: 'Chidushei_Aggadot_on_',
    supportsTorah: false,
    supportsTalmud: true,
    supportsTanach: false,
    tradition: 'ashkenazi',
    era: 'acharon'
  },

  // ============================================================================
  // SEPHARDI COMMENTATORS (PRIMARY)
  // ============================================================================
  ibnEzra: {
    name: 'Ibn Ezra',
    nameHebrew: 'אבן עזרא',
    fullName: 'Rabbi Avraham ibn Ezra',
    fullNameHebrew: 'רבי אברהם אבן עזרא',
    sefariaPrefix: 'Ibn_Ezra_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: true,
    tradition: 'sephardi',
    era: 'rishon',
    methodology: 'grammatical'
  },
  ohrHachaim: {
    name: 'Ohr HaChaim',
    nameHebrew: 'אור החיים',
    fullName: 'Rabbi Chaim ibn Attar',
    fullNameHebrew: 'רבי חיים בן עטר',
    sefariaPrefix: 'Or_HaChaim_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: false,
    tradition: 'sephardi',
    era: 'acharon',
    methodology: 'kabbalistic'
  },
  sforno: {
    name: 'Sforno',
    nameHebrew: 'ספורנו',
    fullName: 'Rabbi Ovadia Sforno',
    fullNameHebrew: 'רבי עובדיה ספורנו',
    sefariaPrefix: 'Sforno_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: false,
    tradition: 'sephardi',
    era: 'acharon',
    methodology: 'philosophical'
  },
  radak: {
    name: 'Radak',
    nameHebrew: 'רד״ק',
    fullName: 'Rabbi David Kimchi',
    fullNameHebrew: 'רבי דוד קמחי',
    sefariaPrefix: 'Radak_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: true,
    tradition: 'sephardi',
    era: 'rishon',
    methodology: 'grammatical'
  },
  kliYakar: {
    name: 'Kli Yakar',
    nameHebrew: 'כלי יקר',
    fullName: 'Rabbi Shlomo Ephraim Luntschitz',
    fullNameHebrew: 'רבי שלמה אפרים לונטשיץ',
    sefariaPrefix: 'Kli_Yakar_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: false,
    tradition: 'universal',
    era: 'acharon',
    methodology: 'homiletical'
  },
  rabbeinu_bahya: {
    name: 'Rabbeinu Bahya',
    nameHebrew: 'רבינו בחיי',
    fullName: 'Rabbeinu Bahya ben Asher',
    fullNameHebrew: 'רבינו בחיי בן אשר',
    sefariaPrefix: 'Rabbeinu_Bahya,_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: false,
    tradition: 'sephardi',
    era: 'rishon',
    methodology: 'four-fold'
  },
  abarbanel: {
    name: 'Abarbanel',
    nameHebrew: 'אברבנאל',
    fullName: 'Don Isaac Abarbanel',
    fullNameHebrew: 'דון יצחק אברבנאל',
    sefariaPrefix: 'Abarbanel_on_',
    supportsTorah: true,
    supportsTalmud: false,
    supportsTanach: true,
    tradition: 'sephardi',
    era: 'rishon',
    methodology: 'philosophical'
  }
};

// PRO SCHOLAR V6.2: Create managed caches for each commentary type (unified telemetry)
const caches = {};
Object.keys(COMMENTARY_CONFIGS).forEach(key => {
  caches[key] = createManagedCache(`commentary_${key}`, DEFAULT_CACHE_CONFIG);
});
// Shared maharsha cache
caches.maharsha = createManagedCache('commentary_maharsha', DEFAULT_CACHE_CONFIG);
// Ramban introduction cache
caches.rambanIntro = createManagedCache('commentary_rambanIntro', DEFAULT_CACHE_CONFIG);

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

    // Use translation-enabled version for English fallback
    const comments = await processCommentArrayWithTranslation(data.he, data.text, { verse });

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
    log.error(`Error fetching ${config.name}:`, error);
    return createErrorResponse(error.message);
  }
};

// Pending requests map - prevents duplicate concurrent requests (race condition fix)
const pendingTalmudRequests = new Map();

/**
 * Generic fetch function for Talmud commentaries
 * Uses range request (1-99) to fetch ALL sections for a daf
 * DEDUPLICATES concurrent requests to same daf
 */
const fetchTalmudCommentary = async (commentaryKey, tractate, daf, options = {}) => {
  const config = COMMENTARY_CONFIGS[commentaryKey];
  const cache = caches[commentaryKey];

  if (!TALMUD_BAVLI.includes(tractate)) {
    return createErrorResponse(`${config.name} is only available for Talmud Bavli tractates`);
  }

  const ref = `${tractate}.${daf}`;
  const cacheKey = `${commentaryKey}-talmud:${ref}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check if request is already in progress (deduplication)
  if (pendingTalmudRequests.has(cacheKey)) {
    log.verbose(`${config.name}: Reusing pending request for ${ref}`);
    return pendingTalmudRequests.get(cacheKey);
  }

  // Create the fetch promise and track it
  const fetchPromise = (async () => {
    try {
      const formattedTractate = formatTractate(tractate);
      // Fetch the entire daf - Sefaria returns all commentary sections
      const sefariaRef = `${config.sefariaPrefix}${formattedTractate}.${daf}`;

      // Request Hebrew and ANY available English (don't specify version to get whatever exists)
      const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
      log.verbose(`${config.name}: Fetching Talmud commentary from ${url}`);
      const data = await fetchWithFallback(url);
      log.verbose(`${config.name}: Raw response`, {
        heLength: Array.isArray(data?.he) ? data.he.length : 'N/A',
        textLength: Array.isArray(data?.text) ? data.text.length : 'N/A',
        ref: data?.ref
      });

      // Process with parallel translation for all commentaries (fast!)
      const comments = await processTalmudCommentsParallel(data.he, data.text, options);
      log.verbose(`${config.name}: Processed ${comments.length} comments`);

      // For Shabbat: Also fetch Soncino footnotes (professional English translation)
      let soncinoFootnotes = [];
      if (tractate.toLowerCase() === 'shabbat' && commentaryKey === 'rashi') {
        try {
          soncinoFootnotes = await getSoncinoFootnotes(daf);
          log.verbose(`Soncino: Fetched ${soncinoFootnotes.length} footnotes for Shabbat ${daf}`);
        } catch (err) {
          log.warn(`Soncino: Failed to fetch footnotes: ${err.message}`);
        }
      }

      const result = {
        source: config.name,
        sourceHebrew: config.nameHebrew,
        ...(config.subSource && { subSource: config.subSource }),
        ...(config.subSourceHebrew && { subSourceHebrew: config.subSourceHebrew }),
        bookType: 'talmud',
        ref: data.ref || ref,
        heRef: data.heRef || ref,
        comments,
        // Include Soncino footnotes as supplementary English (professional translation)
        ...(soncinoFootnotes.length > 0 && {
          soncinoFootnotes,
          soncinoSource: 'Soncino Talmud (halakhah.com)'
        })
      };

      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      log.error(`Error fetching ${config.name}:`, error);
      return createErrorResponse(error.message);
    } finally {
      // Remove from pending requests when done
      pendingTalmudRequests.delete(cacheKey);
    }
  })();

  // Track the pending request
  pendingTalmudRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
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
  log.verbose(`getRashiForVerse: ${bookName}:${chapter}:${verse} (${availability})`);

  if (availability === 'talmud') {
    const result = await getRashiOnTalmud(bookName, chapter);
    log.verbose(`getRashiForVerse: Got ${result?.comments?.length || 0} comments`);
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

// Pending chapter requests map - prevents duplicate concurrent requests
const pendingChapterRequests = new Map();

/**
 * Batch fetch ALL Rashi comments for an entire chapter (Torah/Tanach)
 * Returns a Map of verse number -> comments array
 * ONE API call instead of 31 individual calls!
 *
 * @param {string} bookName - Book name (e.g., 'Genesis')
 * @param {number|string} chapter - Chapter number
 * @returns {Promise<Map<number, Array>>} Map of verse -> comments
 */
export const getRashiForChapter = async (bookName, chapter) => {
  const availability = getRashiAvailability(bookName);

  // Talmud already loads by daf, not by verse - use existing function
  if (availability === 'talmud') {
    const result = await getRashiOnTalmud(bookName, chapter);
    // Return as Map with single entry (all comments for the daf)
    const verseMap = new Map();
    verseMap.set('all', result.comments || []);
    return verseMap;
  }

  if (!availability) {
    return new Map();
  }

  const cacheKey = `rashi-chapter:${bookName}:${chapter}`;

  // Check if request is already in progress (deduplication)
  if (pendingChapterRequests.has(cacheKey)) {
    log.verbose(`Rashi: Reusing pending chapter request for ${bookName} ${chapter}`);
    return pendingChapterRequests.get(cacheKey);
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      log.verbose(`Rashi: Batch loading chapter ${bookName} ${chapter}`);

      // Fetch entire chapter at once (no verse parameter)
      let result;
      if (availability === 'torah') {
        result = await getRashiOnTorah(bookName, chapter, null);
      } else if (availability === 'tanach') {
        result = await getRashiOnTanach(bookName, chapter, null);
      }

      // Organize comments by verse number
      const verseMap = new Map();
      if (result?.comments) {
        for (const comment of result.comments) {
          const verseNum = comment.verse || 1;
          if (!verseMap.has(verseNum)) {
            verseMap.set(verseNum, []);
          }
          verseMap.get(verseNum).push(comment);
        }
      }

      log.verbose(`Rashi: Loaded ${result?.comments?.length || 0} comments for ${verseMap.size} verses`);
      return verseMap;
    } catch (error) {
      log.error(`Rashi: Failed to batch load chapter ${bookName} ${chapter}:`, error);
      return new Map();
    } finally {
      pendingChapterRequests.delete(cacheKey);
    }
  })();

  pendingChapterRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

/**
 * Batch fetch ALL Ramban comments for an entire chapter
 * @param {string} bookName - Book name
 * @param {number|string} chapter - Chapter number
 * @returns {Promise<Map<number, Array>>} Map of verse -> comments
 */
export const getRambanForChapter = async (bookName, chapter) => {
  if (!isRambanAvailable(bookName)) {
    return new Map();
  }

  const cacheKey = `ramban-chapter:${bookName}:${chapter}`;

  if (pendingChapterRequests.has(cacheKey)) {
    return pendingChapterRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      log.verbose(`Ramban: Batch loading chapter ${bookName} ${chapter}`);
      const result = await getRambanOnTorah(bookName, chapter, null);

      const verseMap = new Map();
      if (result?.comments) {
        for (const comment of result.comments) {
          const verseNum = comment.verse || 1;
          if (!verseMap.has(verseNum)) {
            verseMap.set(verseNum, []);
          }
          verseMap.get(verseNum).push(comment);
        }
      }

      log.verbose(`Ramban: Loaded ${result?.comments?.length || 0} comments for ${verseMap.size} verses`);
      return verseMap;
    } catch (error) {
      log.error(`Ramban: Failed to batch load chapter:`, error);
      return new Map();
    } finally {
      pendingChapterRequests.delete(cacheKey);
    }
  })();

  pendingChapterRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

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
    log.error('Error fetching Ramban introduction:', error);
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
// SEPHARDI COMMENTATOR EXPORTS
// ============================================================================

// Ibn Ezra
export const isIbnEzraAvailable = (book) =>
  TORAH_BOOKS.includes(book) || NEVIIM_BOOKS.includes(book) || KETUVIM_BOOKS.includes(book);

export const getIbnEzra = (book, chapter, verse = null) =>
  fetchTorahCommentary('ibnEzra', book, chapter, verse);

export const getIbnEzraForVerse = async (book, chapter, verse) => {
  const result = await getIbnEzra(book, chapter, verse);
  return result.comments || [];
};

export const clearIbnEzraCache = () => caches.ibnEzra.clear();

/**
 * Batch fetch ALL Ibn Ezra comments for an entire chapter
 * @param {string} book - Book name
 * @param {number|string} chapter - Chapter number
 * @returns {Promise<Map<number, Array>>} Map of verse -> comments
 */
export const getIbnEzraForChapter = async (book, chapter) => {
  if (!isIbnEzraAvailable(book)) {
    return new Map();
  }

  const cacheKey = `ibnezra-chapter:${book}:${chapter}`;

  // Check if request is already in progress (deduplication)
  if (pendingChapterRequests.has(cacheKey)) {
    log.verbose(`Ibn Ezra: Reusing pending chapter request for ${book} ${chapter}`);
    return pendingChapterRequests.get(cacheKey);
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      log.verbose(`Ibn Ezra: Batch loading chapter ${book} ${chapter}`);

      // Fetch entire chapter at once (no verse parameter)
      const result = await getIbnEzra(book, chapter, null);

      // Organize comments by verse number
      const verseMap = new Map();
      if (result?.comments) {
        for (const comment of result.comments) {
          const verseNum = comment.verse || 1;
          if (!verseMap.has(verseNum)) {
            verseMap.set(verseNum, []);
          }
          verseMap.get(verseNum).push(comment);
        }
      }

      log.verbose(`Ibn Ezra: Loaded ${result?.comments?.length || 0} comments for ${verseMap.size} verses`);
      return verseMap;
    } catch (error) {
      log.error(`Ibn Ezra: Failed to batch load chapter ${book} ${chapter}:`, error);
      return new Map();
    } finally {
      pendingChapterRequests.delete(cacheKey);
    }
  })();

  pendingChapterRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

// Ohr HaChaim
export const isOhrHachaimAvailable = (book) => TORAH_BOOKS.includes(book);

export const getOhrHachaim = (book, chapter, verse = null) =>
  fetchTorahCommentary('ohrHachaim', book, chapter, verse);

export const getOhrHachaimForVerse = async (book, chapter, verse) => {
  const result = await getOhrHachaim(book, chapter, verse);
  return result.comments || [];
};

export const clearOhrHachaimCache = () => caches.ohrHachaim.clear();

// Sforno
export const isSfornoAvailable = (book) => TORAH_BOOKS.includes(book);

export const getSforno = (book, chapter, verse = null) =>
  fetchTorahCommentary('sforno', book, chapter, verse);

export const getSfornoForVerse = async (book, chapter, verse) => {
  const result = await getSforno(book, chapter, verse);
  return result.comments || [];
};

export const clearSfornoCache = () => caches.sforno.clear();

/**
 * Batch fetch ALL Sforno comments for an entire chapter
 * @param {string} book - Book name
 * @param {number|string} chapter - Chapter number
 * @returns {Promise<Map<number, Array>>} Map of verse -> comments
 */
export const getSfornoForChapter = async (book, chapter) => {
  if (!isSfornoAvailable(book)) {
    return new Map();
  }

  const cacheKey = `sforno-chapter:${book}:${chapter}`;

  // Check if request is already in progress (deduplication)
  if (pendingChapterRequests.has(cacheKey)) {
    log.verbose(`Sforno: Reusing pending chapter request for ${book} ${chapter}`);
    return pendingChapterRequests.get(cacheKey);
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      log.verbose(`Sforno: Batch loading chapter ${book} ${chapter}`);

      // Fetch entire chapter at once (no verse parameter)
      const result = await getSforno(book, chapter, null);

      // Organize comments by verse number
      const verseMap = new Map();
      if (result?.comments) {
        for (const comment of result.comments) {
          const verseNum = comment.verse || 1;
          if (!verseMap.has(verseNum)) {
            verseMap.set(verseNum, []);
          }
          verseMap.get(verseNum).push(comment);
        }
      }

      log.verbose(`Sforno: Loaded ${result?.comments?.length || 0} comments for ${verseMap.size} verses`);
      return verseMap;
    } catch (error) {
      log.error(`Sforno: Failed to batch load chapter ${book} ${chapter}:`, error);
      return new Map();
    } finally {
      pendingChapterRequests.delete(cacheKey);
    }
  })();

  pendingChapterRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
};

// Radak
export const isRadakAvailable = (book) =>
  TORAH_BOOKS.includes(book) || NEVIIM_BOOKS.includes(book) || KETUVIM_BOOKS.includes(book);

export const getRadak = (book, chapter, verse = null) =>
  fetchTorahCommentary('radak', book, chapter, verse);

export const getRadakForVerse = async (book, chapter, verse) => {
  const result = await getRadak(book, chapter, verse);
  return result.comments || [];
};

export const clearRadakCache = () => caches.radak.clear();

// Kli Yakar
export const isKliYakarAvailable = (book) => TORAH_BOOKS.includes(book);

export const getKliYakar = (book, chapter, verse = null) =>
  fetchTorahCommentary('kliYakar', book, chapter, verse);

export const getKliYakarForVerse = async (book, chapter, verse) => {
  const result = await getKliYakar(book, chapter, verse);
  return result.comments || [];
};

export const clearKliYakarCache = () => caches.kliYakar.clear();

// Rabbeinu Bahya
export const isRabbeinuBahyaAvailable = (book) => TORAH_BOOKS.includes(book);

export const getRabbeinuBahya = (book, chapter, verse = null) =>
  fetchTorahCommentary('rabbeinu_bahya', book, chapter, verse);

export const getRabbeinuBahyaForVerse = async (book, chapter, verse) => {
  const result = await getRabbeinuBahya(book, chapter, verse);
  return result.comments || [];
};

export const clearRabbeinuBahyaCache = () => caches.rabbeinu_bahya.clear();

// Abarbanel
export const isAbarbanelAvailable = (book) =>
  TORAH_BOOKS.includes(book) || NEVIIM_BOOKS.includes(book);

export const getAbarbanel = (book, chapter, verse = null) =>
  fetchTorahCommentary('abarbanel', book, chapter, verse);

export const getAbarbanelForVerse = async (book, chapter, verse) => {
  const result = await getAbarbanel(book, chapter, verse);
  return result.comments || [];
};

export const clearAbarbanelCache = () => caches.abarbanel.clear();

// ============================================================================
// SEPHARDI SERVICE OBJECTS
// ============================================================================

export const ibnEzraService = {
  isIbnEzraAvailable,
  getIbnEzra,
  getIbnEzraForVerse,
  clearIbnEzraCache
};

export const ohrHachaimService = {
  isOhrHachaimAvailable,
  getOhrHachaim,
  getOhrHachaimForVerse,
  clearOhrHachaimCache
};

export const sfornoService = {
  isSfornoAvailable,
  getSforno,
  getSfornoForVerse,
  clearSfornoCache
};

export const radakService = {
  isRadakAvailable,
  getRadak,
  getRadakForVerse,
  clearRadakCache
};

export const kliYakarService = {
  isKliYakarAvailable,
  getKliYakar,
  getKliYakarForVerse,
  clearKliYakarCache
};

export const rabbeinuBahyaService = {
  isRabbeinuBahyaAvailable,
  getRabbeinuBahya,
  getRabbeinuBahyaForVerse,
  clearRabbeinuBahyaCache
};

export const abarbanelService = {
  isAbarbanelAvailable,
  getAbarbanel,
  getAbarbanelForVerse,
  clearAbarbanelCache
};

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
  getRashiForChapter,  // Batch loading
  clearRashiCache
};

export const rambanService = {
  isRambanAvailable,
  getRambanOnTorah,
  getRambanForVerse,
  getRambanForChapter,  // Batch loading
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
 * Supports all commentators including Sephardi mefarshim
 * @param {string} commentaryType - Commentary identifier (rashi, ibn_ezra, ohr_hachaim, etc.)
 * @param {string} bookName - Book or tractate name
 * @param {number|string} chapter - Chapter number or daf
 * @param {number|null} verse - Verse number (optional)
 */
export const getCommentary = async (commentaryType, bookName, chapter, verse = null) => {
  const bookType = getBookType(bookName);
  const normalizedType = commentaryType.toLowerCase().replace(/[- ]/g, '_');

  switch (normalizedType) {
    // Core commentators
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
    // Sephardi commentators
    case 'ibn_ezra':
    case 'ibnezra':
      return getIbnEzra(bookName, chapter, verse);
    case 'ohr_hachaim':
    case 'ohrhachaim':
    case 'or_hachaim':
      return getOhrHachaim(bookName, chapter, verse);
    case 'sforno':
      return getSforno(bookName, chapter, verse);
    case 'radak':
      return getRadak(bookName, chapter, verse);
    case 'kli_yakar':
    case 'kliyakar':
      return getKliYakar(bookName, chapter, verse);
    case 'rabbeinu_bahya':
    case 'rabbeinubahya':
    case 'bahya':
      return getRabbeinuBahya(bookName, chapter, verse);
    case 'abarbanel':
      return getAbarbanel(bookName, chapter, verse);
    default:
      return createErrorResponse(`Unknown commentary type: ${commentaryType}`);
  }
};

/**
 * Check if commentary is available for a book
 */
export const checkCommentaryAvailability = (commentaryType, bookName) => {
  const normalizedType = commentaryType.toLowerCase().replace(/[- ]/g, '_');

  switch (normalizedType) {
    // Core commentators
    case 'rashi':
      return getRashiAvailability(bookName) !== null;
    case 'ramban':
      return isRambanAvailable(bookName);
    case 'tosafot':
      return isTosafotAvailable(bookName);
    case 'maharsha':
      return isMaharshaAvailable(bookName);
    // Sephardi commentators
    case 'ibn_ezra':
    case 'ibnezra':
      return isIbnEzraAvailable(bookName);
    case 'ohr_hachaim':
    case 'ohrhachaim':
    case 'or_hachaim':
      return isOhrHachaimAvailable(bookName);
    case 'sforno':
      return isSfornoAvailable(bookName);
    case 'radak':
      return isRadakAvailable(bookName);
    case 'kli_yakar':
    case 'kliyakar':
      return isKliYakarAvailable(bookName);
    case 'rabbeinu_bahya':
    case 'rabbeinubahya':
    case 'bahya':
      return isRabbeinuBahyaAvailable(bookName);
    case 'abarbanel':
      return isAbarbanelAvailable(bookName);
    default:
      return false;
  }
};

/**
 * Get all available commentators for a given book
 */
export const getAvailableCommentators = (bookName) => {
  const all = Object.entries(COMMENTARY_CONFIGS);
  return all.filter(([key, config]) => {
    const bookType = getBookType(bookName);
    if (bookType === 'torah' && config.supportsTorah) return true;
    if (bookType === 'talmud' && config.supportsTalmud) return true;
    if ((bookType === 'neviim' || bookType === 'ketuvim') && config.supportsTanach) return true;
    return false;
  }).map(([key, config]) => ({
    id: key,
    name: config.name,
    nameHebrew: config.nameHebrew,
    tradition: config.tradition || 'universal',
    era: config.era || 'unknown',
    methodology: config.methodology || null
  }));
};

/**
 * Get commentators by tradition (sephardi, ashkenazi, universal)
 */
export const getCommentatorsByTradition = (tradition) => {
  return Object.entries(COMMENTARY_CONFIGS)
    .filter(([_, config]) => config.tradition === tradition || tradition === 'all')
    .map(([key, config]) => ({
      id: key,
      name: config.name,
      nameHebrew: config.nameHebrew,
      tradition: config.tradition,
      era: config.era,
      supportsTorah: config.supportsTorah,
      supportsTalmud: config.supportsTalmud,
      supportsTanach: config.supportsTanach
    }));
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
  getAvailableCommentators,
  getCommentatorsByTradition,
  clearAllCommentaryCaches,
  // Core services
  rashiService,
  rambanService,
  tosafotService,
  maharshaService,
  // Sephardi services
  ibnEzraService,
  ohrHachaimService,
  sfornoService,
  radakService,
  kliYakarService,
  rabbeinuBahyaService,
  abarbanelService,
  // Configuration
  COMMENTARY_CONFIGS
};

export default commentaryServiceFactory;

// Also export COMMENTARY_CONFIGS for components that need metadata
export { COMMENTARY_CONFIGS };
