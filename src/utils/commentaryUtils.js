// =============================================================================
// Commentary Utilities - Shared functions for processing commentary text
// =============================================================================

import { cleanHtml } from './sanitize';

/**
 * Extract the dibbur haMatchil (opening words) from a commentary comment
 * This is typically bold or appears before a dash/colon
 * @param {string} text - Full comment text
 * @param {Object} options - Configuration options
 * @param {number} options.maxLength - Maximum length for the dibbur (default: 50)
 * @param {number} options.wordCount - Number of words for fallback (default: 4)
 * @returns {string} The dibbur haMatchil or empty string
 */
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
        comments.push({
          verse,
          commentIndex: idx + 1,
          hebrew: cleanHtml(entry),
          english: cleanHtml(enArray[idx] || ''),
          dibbur: extractDibbur(entry)
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
            comments.push({
              verse: verseIdx + 1,
              commentIndex: idx + 1,
              hebrew: cleanHtml(comment),
              english: cleanHtml(enComment || ''),
              dibbur: extractDibbur(comment)
            });
          }
        });
      } else if (verseComments) {
        comments.push({
          verse: verseIdx + 1,
          commentIndex: 1,
          hebrew: cleanHtml(verseComments),
          english: cleanHtml(enVerseComments || ''),
          dibbur: extractDibbur(verseComments)
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
export const processTalmudComments = (hebrewData, englishData, options = {}) => {
  const { type = null } = options;
  const comments = [];

  const heArray = Array.isArray(hebrewData) ? hebrewData : [hebrewData];
  const enArray = Array.isArray(englishData) ? englishData : [englishData];

  heArray.forEach((entry, idx) => {
    const enEntry = enArray[idx];

    if (Array.isArray(entry)) {
      entry.forEach((subComment, subIdx) => {
        if (subComment) {
          const subEn = Array.isArray(enEntry) ? enEntry[subIdx] : '';
          const comment = {
            section: idx + 1,
            commentIndex: subIdx + 1,
            hebrew: cleanHtml(subComment),
            english: cleanHtml(subEn || ''),
            dibbur: extractDibbur(subComment)
          };
          if (type) comment.type = type;
          comments.push(comment);
        }
      });
    } else if (entry) {
      const comment = {
        section: idx + 1,
        commentIndex: 1,
        hebrew: cleanHtml(entry),
        english: cleanHtml(enEntry || ''),
        dibbur: extractDibbur(entry)
      };
      if (type) comment.type = type;
      comments.push(comment);
    }
  });

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
