// =============================================================================
// Processing des commentaires — extraction du dibbour, appariement he/en
// (paire simple, Talmud, parallèle), réponses d'erreur, nettoyage.
// (extrait de commentaryUtils.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { cleanHtml } from '../sanitize';
import { createLogger } from '../debug';
import { normalizeFinals } from '../hebrewUtils';
import { translateHebrewText } from './translation';

const log = createLogger('CommentaryUtils');

export const extractDibbur = (text, options = {}) => {
  const { maxLength = 50, wordCount = 4 } = options;

  if (!text) return '';

  // Look for bold tags which often mark the dibbur
  const boldMatch = text.match(/<b>(.*?)<\/b>/);
  if (boldMatch) {
    return cleanHtml(boldMatch[1]);
  }

  // Look for text before a dash or period/colon
  const dashMatch = text.match(/^([^-–—.:]+)[-–—.:]/);
  if (dashMatch) {
    const dibbur = cleanHtml(dashMatch[1]).trim();
    return dibbur.length > maxLength ? dibbur.substring(0, maxLength) + '...' : dibbur;
  }

  // Just return first few words as fallback
  const firstWords = cleanHtml(text).split(' ').slice(0, wordCount).join(' ');
  return firstWords.length > maxLength ? firstWords.substring(0, maxLength) + '...' : firstWords;
};

/**
 * Process comment array for Torah/Tanach style commentary
 * Handles nested array structures for verse-based comments
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {number} options.verse - Specific verse number (if single verse)
 * @returns {Array} Processed comments array
 */
export const processCommentArray = (hebrewData, englishData, options = {}) => {
  const { verse = null } = options;
  const comments = [];

  const heArray = Array.isArray(hebrewData) ? hebrewData : [hebrewData];
  const enArray = Array.isArray(englishData) ? englishData : [englishData];

  if (verse) {
    // Single verse - hebrewData is the comments for that verse
    heArray.forEach((entry, idx) => {
      if (entry) {
        const cleanedEn = cleanHtml(enArray[idx] || '');
        comments.push({
          verse,
          commentIndex: idx + 1,
          hebrew: cleanHtml(entry),
          english: cleanedEn,
          dibbur: extractDibbur(entry),
          translationSource: cleanedEn ? 'Sefaria' : null
        });
      }
    });
  } else {
    // Whole chapter - nested by verse
    heArray.forEach((verseComments, verseIdx) => {
      const enVerseComments = enArray[verseIdx];
      if (Array.isArray(verseComments)) {
        verseComments.forEach((comment, idx) => {
          if (comment) {
            const enComment = Array.isArray(enVerseComments) ? enVerseComments[idx] : '';
            const cleanedEn = cleanHtml(enComment || '');
            comments.push({
              verse: verseIdx + 1,
              commentIndex: idx + 1,
              hebrew: cleanHtml(comment),
              english: cleanedEn,
              dibbur: extractDibbur(comment),
              translationSource: cleanedEn ? 'Sefaria' : null
            });
          }
        });
      } else if (verseComments) {
        const cleanedEn = cleanHtml(enVerseComments || '');
        comments.push({
          verse: verseIdx + 1,
          commentIndex: 1,
          hebrew: cleanHtml(verseComments),
          english: cleanedEn,
          dibbur: extractDibbur(verseComments),
          translationSource: cleanedEn ? 'Sefaria' : null
        });
      }
    });
  }

  return comments;
};

/**
 * Process Talmud-style comments (section-based rather than verse-based)
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {string} options.type - Comment type (e.g., 'halachot', 'aggadot')
 * @returns {Array} Processed comments array
 */
/**
 * Recursively extract paired strings from Hebrew and English nested arrays
 * Maintains correspondence between Hebrew and English at each level
 * @param {*} heData - Hebrew data (nested array or string)
 * @param {*} enData - English data (nested array or string)
 * @returns {Array<{hebrew: string, english: string}>} - Paired strings
 */
const flattenPairedStrings = (heData, enData) => {
  const pairs = [];

  const traverse = (he, en) => {
    if (!he) return;

    if (typeof he === 'string') {
      pairs.push({
        hebrew: he,
        english: typeof en === 'string' ? en : ''
      });
      return;
    }

    if (Array.isArray(he)) {
      he.forEach((item, idx) => {
        const enItem = Array.isArray(en) ? en[idx] : undefined;
        traverse(item, enItem);
      });
    }
  };

  traverse(heData, enData);
  return pairs;
};

export const processTalmudComments = (hebrewData, englishData, options = {}) => {
  const { type = null } = options;
  const comments = [];

  // Debug: Log what we received
  log.verbose('processTalmudComments Input:', {
    hebrewLength: Array.isArray(hebrewData) ? hebrewData.length : 'N/A',
    hebrewType: typeof hebrewData,
    isNested: Array.isArray(hebrewData) && hebrewData.length > 0 && Array.isArray(hebrewData[0])
  });

  const heArray = Array.isArray(hebrewData) ? hebrewData : [hebrewData];
  const enArray = Array.isArray(englishData) ? englishData : [englishData];

  heArray.forEach((entry, idx) => {
    const enEntry = enArray[idx];

    if (Array.isArray(entry)) {
      // Use recursive flattening to handle deeply nested structures (Rashi on Talmud)
      const pairs = flattenPairedStrings(entry, enEntry);

      pairs.forEach((pair, subIdx) => {
        if (pair.hebrew) {
          const cleanedHe = cleanHtml(pair.hebrew);
          const cleanedEn = cleanHtml(pair.english || '');

          if (cleanedHe) { // Only add if we have actual Hebrew text
            const comment = {
              section: idx + 1,
              commentIndex: subIdx + 1,
              hebrew: cleanedHe,
              english: cleanedEn,
              dibbur: extractDibbur(pair.hebrew),
              // Source marker: Sefaria if English exists, otherwise null (needs translation)
              translationSource: cleanedEn ? 'Sefaria' : null
            };
            if (type) comment.type = type;
            comments.push(comment);
          }
        }
      });
    } else if (entry) {
      const cleanedHe = cleanHtml(entry);
      const cleanedEn = cleanHtml(enEntry || '');
      if (cleanedHe) { // Only add if we have actual Hebrew text
        const comment = {
          section: idx + 1,
          commentIndex: 1,
          hebrew: cleanedHe,
          english: cleanedEn,
          dibbur: extractDibbur(entry),
          // Source marker: Sefaria if English exists, otherwise null (needs translation)
          translationSource: cleanedEn ? 'Sefaria' : null
        };
        if (type) comment.type = type;
        comments.push(comment);
      }
    }
  });

  log.verbose(`processTalmudComments: Output ${comments.length} comments`);

  return comments;
};

/**
 * Process Talmud-style comments with parallel translation for missing English
 * Uses fast MyMemory API for full-text translation when Sefaria has no English
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {string} options.type - Comment type (e.g., 'halachot', 'aggadot')
 * @param {boolean} options.skipTranslation - Skip translation entirely (faster)
 * @returns {Promise<Array>} Processed comments array with translations
 */
export const processTalmudCommentsParallel = async (hebrewData, englishData, options = {}) => {
  const { skipTranslation = false } = options;

  // First, build all comments without translation
  const comments = processTalmudComments(hebrewData, englishData, options);

  // If translation is disabled, return immediately
  if (skipTranslation) {
    return comments;
  }

  // Find comments that need translation (have Hebrew but no English from Sefaria)
  const needsTranslation = comments.filter(c => !c.english && c.hebrew);

  if (needsTranslation.length === 0) {
    log.verbose('processTalmudComments: All comments have Sefaria English');
    return comments;
  }

  log.verbose(`processTalmudComments: Translating ${needsTranslation.length} comments via Jastrow/BDB`);

  // Translate all missing in parallel using CAL/Jastrow (scholarly dictionaries)
  const translationPromises = needsTranslation.map(async (comment) => {
    try {
      const result = await translateHebrewText(comment.hebrew);
      if (result && result.text) {
        comment.english = result.text;
        comment.translationSource = 'CAL/Jastrow'; // Mark source as scholarly dictionary
        comment.coverage = result.coverage; // How much was translated
      }
    } catch {
      // Silent fail - translation not critical
    }
  });

  await Promise.all(translationPromises);

  const translatedCount = needsTranslation.filter(c => c.translationSource === 'CAL/Jastrow').length;
  log.verbose(`processTalmudComments: Translated ${translatedCount}/${needsTranslation.length} via CAL/Jastrow`);

  return comments;
};

/**
 * Create a standardized error response for commentary services
 * @param {string} message - Error message
 * @returns {Object} Error response object
 */
export const createErrorResponse = (message) => ({
  error: message,
  comments: []
});

/**
 * Clean and normalize an array of text entries
 * @param {*} arr - Input data (string or array)
 * @returns {Array} Cleaned array of strings
 */
export const cleanTextArray = (arr) => {
  if (!arr) return [];
  if (Array.isArray(arr)) return arr.map(t => cleanHtml(t || ''));
  return [cleanHtml(arr || '')];
};

/**
 * Process comment array with translation fallback (async version)
 * Uses Sefaria English directly - no slow word-by-word translation
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {number} options.verse - Specific verse number (if single verse)
 * @returns {Promise<Array>} Processed comments array
 */
export const processCommentArrayWithTranslation = async (hebrewData, englishData, options = {}) => {
  // Just use the sync version - Sefaria provides English for most Torah commentary
  // Slow word-by-word translation was causing hangs
  return processCommentArray(hebrewData, englishData, options);
};

