// =============================================================================
// Commentary Service - Commentary fetching functions
// =============================================================================

import { createManagedCache } from '../cacheOrchestrator';
import { fetchWithFallback } from '../../utils/http';
import { cleanHtml } from '../../utils/sanitize';
import { translateCommentary } from '../translationService';
import { formatBookName, toSefariaRef, TALMUD_BAVLI, MISHNAH_TRACTATES } from './bookData';

const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// Commentary cache
const commentaryCache = createManagedCache('commentary', { ttl: 60 * 60 * 1000, maxSize: 300 });

// =============================================================================
// CORE COMMENTARY FETCHING
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

/**
 * Fetch Rashi commentary
 * @async
 * @param {string} ref - Verse reference
 * @returns {Promise<Object|null>} Rashi commentary object or null
 */
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
// INDIVIDUAL COMMENTARY FUNCTIONS
// =============================================================================

/**
 * Generic function to fetch commentary for a verse
 * @param {string} commentator - Name of commentator
 * @param {string} bookName - Book name
 * @param {string|number} chapter - Chapter number
 * @param {string|number} verse - Verse number
 * @returns {Promise<Array>} Array of commentary entries
 */
const fetchCommentaryForVerse = async (commentator, bookName, chapter, verse) => {
  const cacheKey = `${commentator.toLowerCase()}:${bookName}:${chapter}:${verse}`;
  const cached = commentaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const formattedName = formatBookName(bookName);
    const data = await fetchWithFallback(
      `${BASE_URL}/texts/${commentator} on ${formattedName}.${chapter}.${verse}?context=0`
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
          console.warn(`Translation failed for ${commentator}:`, err.message);
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
    console.warn(`Failed to fetch ${commentator}:`, error.message);
    return [];
  }
};

export const getIbnEzraForVerse = (bookName, chapter, verse) => 
  fetchCommentaryForVerse('Ibn Ezra', bookName, chapter, verse);

export const getSfornoForVerse = (bookName, chapter, verse) => 
  fetchCommentaryForVerse('Sforno', bookName, chapter, verse);

export const getOrHaChaimForVerse = (bookName, chapter, verse) => 
  fetchCommentaryForVerse('Or HaChaim', bookName, chapter, verse);

// =============================================================================
// MISHNAH COMMENTARIES
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
