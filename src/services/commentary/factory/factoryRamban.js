// Ramban — famille Sépharade, Torah + introduction (split 03/10/2026)
import { fetchWithFallback } from '../../../utils/http';
import { cleanHtml } from '../../../utils/sanitize';
import { createErrorResponse } from '../../../utils/commentaryUtils';
import { TORAH_BOOKS, BOOK_HEBREW_NAMES } from '../../../constants/bookConstants';
import {
  caches,
  BASE_URL,
  fetchTorahCommentary,
  pendingChapterRequests,
  log
} from './factoryCore';

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