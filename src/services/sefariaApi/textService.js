// =============================================================================
// Text Service - Core text fetching functions
// =============================================================================

import { createManagedCache } from '../cacheOrchestrator';
import { fetchWithFallback } from '../../utils/http';
import { cleanHtml } from '../../utils/sanitize';
import { formatBookName, toSefariaRef, ALL_TANACH_BOOKS, TALMUD_BAVLI, MISHNAH_TRACTATES } from './bookData';

// Use local proxy in development to avoid CORS issues
const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// Cache instances
const textCache = createManagedCache('api', { ttl: 10 * 60 * 1000, maxSize: 500 });

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

/**
 * Fetch Onkelos translation for Torah books
 * @async
 * @param {string} bookName - Name of the book
 * @param {string|number} chapterNumber - Chapter number
 * @returns {Promise<Array<{verse: number, aramaic: string, english: string}>>}
 *          Array of Onkelos translations
 */
export const getOnkelos = async (bookName, chapterNumber) => {
  if (!ALL_TANACH_BOOKS.slice(0, 5).includes(bookName)) return [];

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
// TOPICS API
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
// CLEAR CACHES
// =============================================================================

export const clearCaches = () => {
  textCache.clear();
};
