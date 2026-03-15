// Targum Service - Fetches Aramaic translations (Targumim) from Sefaria
// Supports Onkelos, Targum Jonathan, and Targum Yerushalmi

import { createCache } from '../utils/cache';
import { fetchWithFallback } from '../utils/http';
import { cleanTextArray } from '../utils/commentaryUtils';
import { TORAH_BOOKS, NEVIIM_BOOKS, formatBook } from '../constants/bookConstants';

const BASE_URL = 'https://www.sefaria.org/api';

// Use shared cache utility
const targumCache = createCache({ ttl: 10 * 60 * 1000, maxSize: 200 });

// Available Targumim by book type
const TARGUMIM = {
  torah: ['Onkelos', 'Targum Jonathan', 'Targum Jerusalem'],
  neviim: ['Targum Jonathan'],
  ketuvim: []
};

/**
 * Determine which Targumim are available for a book
 */
export const getAvailableTargumim = (bookName) => {
  if (TORAH_BOOKS.includes(bookName)) return TARGUMIM.torah;
  if (NEVIIM_BOOKS.includes(bookName)) return TARGUMIM.neviim;
  return TARGUMIM.ketuvim;
};

/**
 * Fetch Targum Onkelos for a verse
 */
export const getOnkelos = async (bookName, chapter, verse = null) => {
  if (!TORAH_BOOKS.includes(bookName)) {
    return { error: 'Onkelos is only available for Torah books', aramaic: [], english: [] };
  }

  const ref = verse ? `${bookName}.${chapter}.${verse}` : `${bookName}.${chapter}`;
  const cacheKey = `onkelos:${ref}`;
  const cached = targumCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedBook = formatBook(bookName);
    const formats = [
      `Onkelos ${bookName}.${chapter}${verse ? '.' + verse : ''}`,
      `Onkelos_${formattedBook}.${chapter}${verse ? '.' + verse : ''}`
    ];

    let data = null;
    let lastError = null;

    for (const sefariaRef of formats) {
      try {
        const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
        data = await fetchWithFallback(url);
        if (data) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!data) {
      throw lastError || new Error('Failed to fetch Onkelos');
    }

    const result = {
      source: 'Onkelos',
      sourceHebrew: 'אונקלוס',
      aramaic: cleanTextArray(data.he),
      english: cleanTextArray(data.text),
      ref: data.ref || ref
    };

    targumCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching Onkelos:', error);
    return { error: error.message, aramaic: [], english: [] };
  }
};

/**
 * Fetch Targum Jonathan (Yonatan) for a verse
 */
export const getTargumJonathan = async (bookName, chapter, verse = null) => {
  const ref = verse ? `${bookName}.${chapter}.${verse}` : `${bookName}.${chapter}`;
  const cacheKey = `jonathan:${ref}`;
  const cached = targumCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedBook = formatBook(bookName);
    const formats = [
      `Targum Jonathan on ${bookName}.${chapter}${verse ? '.' + verse : ''}`,
      `Targum_Jonathan_on_${formattedBook}.${chapter}${verse ? '.' + verse : ''}`
    ];

    let data = null;

    for (const sefariaRef of formats) {
      try {
        const url = `${BASE_URL}/texts/${encodeURIComponent(sefariaRef)}?context=0`;
        data = await fetchWithFallback(url);
        if (data) break;
      } catch {
        // Continue to try next format
      }
    }

    if (!data) {
      return { error: 'Targum Jonathan not available', aramaic: [], english: [] };
    }

    const result = {
      source: 'Targum Jonathan',
      sourceHebrew: 'תרגום יונתן',
      aramaic: cleanTextArray(data.he),
      english: cleanTextArray(data.text),
      ref: data.ref || ref
    };

    targumCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching Targum Jonathan:', error);
    return { error: error.message, aramaic: [], english: [] };
  }
};

/**
 * Fetch all available Targumim for a chapter
 */
export const getAllTargumim = async (bookName, chapter) => {
  const cacheKey = `alltargum:${bookName}:${chapter}`;
  const cached = targumCache.get(cacheKey);
  if (cached) return cached;

  const available = getAvailableTargumim(bookName);
  const results = {};

  const promises = available.map(async (targum) => {
    if (targum === 'Onkelos') {
      results.onkelos = await getOnkelos(bookName, chapter);
    } else if (targum === 'Targum Jonathan') {
      results.jonathan = await getTargumJonathan(bookName, chapter);
    }
  });

  await Promise.all(promises);

  targumCache.set(cacheKey, results);
  return results;
};

/**
 * Get verse-aligned Targum for parallel display
 */
export const getVersesWithTargum = async (bookName, chapter, verses) => {
  try {
    const onkelos = await getOnkelos(bookName, chapter);
    const jonathan = await getTargumJonathan(bookName, chapter);

    return verses.map((verse, index) => ({
      ...verse,
      targumOnkelos: onkelos.aramaic?.[index] || null,
      targumOnkelosEnglish: onkelos.english?.[index] || null,
      targumJonathan: jonathan.aramaic?.[index] || null,
      targumJonathanEnglish: jonathan.english?.[index] || null
    }));
  } catch (error) {
    console.error('Error aligning Targum with verses:', error);
    return verses;
  }
};

/**
 * Clean Aramaic text (remove HTML tags, normalize)
 */
export const cleanAramaicText = (text) => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

/**
 * Clear the Targum cache
 */
export const clearTargumCache = () => {
  targumCache.clear();
};

const targumService = {
  getAvailableTargumim,
  getOnkelos,
  getTargumJonathan,
  getAllTargumim,
  getVersesWithTargum,
  cleanAramaicText,
  clearTargumCache
};

export default targumService;
