// Commentateurs sépharades & universels (Ibn Ezra, Ohr HaChaim, Sforno, Radak,
// Kli Yakar, Rabbeinu Bahya, Abarbanel) — split 03/10/2026
import { TORAH_BOOKS, NEVIIM_BOOKS, KETUVIM_BOOKS } from '../../../constants/bookConstants';
import {
  caches,
  fetchTorahCommentary,
  pendingChapterRequests,
  log
} from './factoryCore';

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