// Commentary Service Factory — CŒUR PARTAGÉ (split 03/10/2026)
// Configs, caches managés, fetch génériques Torah/Talmud. Chaque famille de
// commentateurs vit dans son module (factoryRashi, factoryRamban…) ; la façade
// commentaryServiceFactory.js agrège et ré-exporte tout.

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from '../../cacheOrchestrator';
import { fetchWithFallback } from '../../../utils/http';
import { getChapter as kitChapter } from '../../sefariaOfflineKit';
import { cleanHtml } from '../../../utils/sanitize';
import {
  processCommentArrayWithTranslation,
  processTalmudCommentsParallel,
  createErrorResponse
} from '../../../utils/commentaryUtils';
import { getSoncinoFootnotes } from '../soncinoService';
import {
  TORAH_BOOKS,
  TALMUD_BAVLI,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  BOOK_HEBREW_NAMES,
  formatBook,
  formatTractate
} from '../../../constants/bookConstants';
import { createLogger } from '../../../utils/debug';

// Create logger for this module
export const log = createLogger('CommentaryService');

// Use local proxy in development to avoid CORS issues
export const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// Shared cache configuration
export const DEFAULT_CACHE_CONFIG = { ttl: 30 * 60 * 1000, maxSize: 200 };

/**
 * Commentary configurations - defines behavior for each commentary type
 */
export const COMMENTARY_CONFIGS = {
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
export const caches = {};
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
export const getBookType = (bookName) => {
  if (TORAH_BOOKS.includes(bookName)) return 'torah';
  if (TALMUD_BAVLI.includes(bookName)) return 'talmud';
  if (NEVIIM_BOOKS.includes(bookName)) return 'neviim';
  if (KETUVIM_BOOKS.includes(bookName)) return 'ketuvim';
  return null;
};

/**
 * Generic fetch function for Torah/Tanach commentaries
 */
export const fetchTorahCommentary = async (commentaryKey, bookName, chapter, verse = null) => {
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
    // Hors-ligne : repli sur le kit Torah embarqué (Rashi uniquement —
    // les chapitres du kit sont au format API [verses][commentaires])
    if (commentaryKey === 'rashi') {
      try {
        const offline = await kitChapter(`${config.sefariaPrefix}${bookName}`, chapter);
        if (offline) {
          let he = offline.he;
          let text = offline.text;
          if (verse) {
            he = he?.[verse - 1] !== undefined
              ? (Array.isArray(he[verse - 1]) ? he[verse - 1] : [he[verse - 1]])
              : [];
            text = text?.[verse - 1] !== undefined
              ? (Array.isArray(text[verse - 1]) ? text[verse - 1] : [text[verse - 1]])
              : [];
          }
          const comments = await processCommentArrayWithTranslation(he, text, { verse });
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
            ref: `${bookName}.${chapter}`,
            heRef: `${bookName}.${chapter}`,
            offline: true,
            comments
          };
          cache.set(cacheKey, result);
          return result;
        }
      } catch (kitErr) {
        log.debug(`[OfflineKit] Rashi unavailable: ${kitErr?.message}`);
      }
    }
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
export const fetchTalmudCommentary = async (commentaryKey, tractate, daf, options = {}) => {
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


// Pending chapter requests map - prevents duplicate concurrent requests
// (partagée par les batch loaders Rashi/Ramban/IbnEzra/Sforno — déplacée ici au split)
export const pendingChapterRequests = new Map();
