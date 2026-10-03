// Rashi — famille Ashkénaze/Universelle (split 03/10/2026)
import { createErrorResponse } from '../../../utils/commentaryUtils';
import { TORAH_BOOKS, TALMUD_BAVLI, NEVIIM_BOOKS, KETUVIM_BOOKS } from '../../../constants/bookConstants';
import {
  caches,
  fetchTorahCommentary,
  fetchTalmudCommentary,
  pendingChapterRequests,
  log
} from './factoryCore';

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