// =============================================================================
// Endpoints commentaires — vus par verset/chapitre (Rashi, Onkelos), fonctions
// dédiées (Ibn Ezra, Sforno, Or HaChaim, Bartenura, Tosafot Yom Tov) et daf de
// Shabbat. (extrait de sefariaApi.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { fetchWithFallback } from '../../utils/http';
import { cleanHtml } from '../../utils/sanitize';
import { getChapter as kitChapter } from '../sefariaOfflineKit';
import { translateCommentary } from '../translationService';
import { getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashiForVerse, getRashiForChapter } from '../commentary/rashiService';
import { getTosafotOnTalmud, getTosafotForDaf, isTosafotAvailable } from '../commentary/tosafotService';
import { BASE_URL, textCache, commentaryCache } from './state';
import { toSefariaRef, formatBookName, generateDafList } from './refHelpers';
import { MISHNAH_TRACTATES } from './bookData';
import { TORAH_BOOKS, TALMUD_BAVLI } from '../../constants/bookConstants';

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
    // Hors-ligne : repli kit (Onkelos_{Book} est dans le kit Torah)
    try {
      const offline = await kitChapter(`Onkelos_${bookName}`, chapterNumber);
      if (offline) {
        const aramaic = Array.isArray(offline.he) ? offline.he : [offline.he];
        const english = Array.isArray(offline.text) ? offline.text : [offline.text];
        const result = aramaic.map((ar, i) => ({
          verse: i + 1,
          aramaic: cleanHtml(ar || ''),
          english: cleanHtml(english[i] || '')
        }));
        textCache.set(cacheKey, result);
        return result;
      }
    } catch (kitErr) {
      console.debug('[OfflineKit] onkelos unavailable:', kitErr?.message);
    }
    console.warn('Failed to fetch Onkelos:', error.message);
    return [];
  }
};


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
  const { getSoncinoFootnotes } = await import('../commentary/soncinoService');

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

