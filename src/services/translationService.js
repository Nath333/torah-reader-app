// =============================================================================
// TRANSLATION SERVICE
// Pure text translation (Hebrew → English sentences/commentary)
// Separated from word lookup concerns for cleaner architecture
// =============================================================================
//
// PRO SCHOLAR V10.2: Extracted from combinedTranslationService
//
// This service handles TEXT TRANSLATION (sentences, paragraphs, commentary)
// For WORD LOOKUP, use unifiedLookupService instead:
//
//   import { quickLookup, lookupWord } from './unifiedLookupService';
//
// =============================================================================

import { scholarlyLookup } from './scholarlyLexiconService';
import { cleanHebrewWord } from './hebrewDictionary';
import { createLogger } from '../utils/debug';

const log = createLogger('TranslationService');

// =============================================================================
// SINGLE WORD TRANSLATION
// =============================================================================

/**
 * Translate a single Hebrew word to English
 * Uses Sefaria scholarly lexicons for accurate translation
 *
 * @param {string} word - Hebrew word to translate
 * @returns {Promise<string|null>} - English translation or null
 */
export const translateWord = async (word) => {
  if (!word || typeof word !== 'string') return null;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const result = await scholarlyLookup(cleaned);
    if (result?.primaryDefinition) {
      return result.primaryDefinition;
    }
    return null;
  } catch (error) {
    log.warn('Translation lookup failed:', error.message);
    return null;
  }
};

// =============================================================================
// TEXT TRANSLATION
// =============================================================================

/**
 * Translate Hebrew text to English using Sefaria scholarly lexicons
 * Processes text word-by-word with context awareness
 *
 * @param {string} hebrewText - The Hebrew text to translate
 * @returns {Promise<string|null>} - The translated English text or null
 */
export const translateHebrewToEnglish = async (hebrewText) => {
  if (!hebrewText || typeof hebrewText !== 'string') {
    return null;
  }

  const cleanText = hebrewText.replace(/<[^>]*>/g, '').trim();
  if (!cleanText || cleanText.length === 0) {
    return null;
  }

  // Split into words (Hebrew text handling)
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;

  const translatedWords = [];
  let hasTranslationResult = false;

  for (const word of words) {
    const cleaned = cleanHebrewWord(word);

    // Skip very short words
    if (!cleaned || cleaned.length < 2) {
      translatedWords.push(word);
      continue;
    }

    try {
      const result = await scholarlyLookup(cleaned);

      if (result?.primaryDefinition) {
        translatedWords.push(result.primaryDefinition);
        hasTranslationResult = true;
      } else {
        translatedWords.push(word);
      }
    } catch (error) {
      translatedWords.push(word);
    }
  }

  if (!hasTranslationResult) {
    return null;
  }

  const result = translatedWords.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Translate Hebrew commentary with context-aware processing
 * Alias for translateHebrewToEnglish for semantic clarity
 *
 * @param {string} hebrewText - The Hebrew commentary text
 * @returns {Promise<string|null>} - The translated English text or null
 */
export const translateCommentary = async (hebrewText) => {
  return translateHebrewToEnglish(hebrewText);
};

// =============================================================================
// TRANSLATION UTILITIES
// =============================================================================

/**
 * Quick synchronous check if word might be translatable
 * Does not perform actual translation - use translateWord for that
 *
 * @param {string} word - Hebrew word
 * @returns {boolean} - True if word appears to be translatable
 */
export const isTranslatable = (word) => {
  const cleaned = cleanHebrewWord(word);
  return cleaned && cleaned.length >= 2;
};

/**
 * Get translation with source information
 *
 * @param {string} word - Hebrew word
 * @returns {Promise<object>} - Translation result with source info
 */
export const translateWithSource = async (word) => {
  if (!word || typeof word !== 'string') {
    return { translation: null, source: null, word };
  }

  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: null, word };
  }

  try {
    const result = await scholarlyLookup(cleaned);

    if (result?.primaryDefinition) {
      let source = 'Sefaria';
      if (result.sources?.bdb) source = 'BDB';
      else if (result.sources?.jastrow) source = 'Jastrow';
      else if (result.sources?.strong) source = "Strong's";
      else if (result.sources?.klein) source = 'Klein';
      else if (result.sources?.bolls) source = 'Bolls.life';

      return {
        translation: result.primaryDefinition,
        source: source,
        word: cleaned,
        root: result.root,
        language: result.language,
        grammar: result.grammar,
        cognates: result.cognates
      };
    }

    return { translation: null, source: null, word: cleaned };
  } catch (error) {
    log.warn('Translation with source failed:', error.message);
    return { translation: null, source: null, word: cleaned, error: error.message };
  }
};

// =============================================================================
// BATCH TRANSLATION
// =============================================================================

/**
 * Batch translate multiple words efficiently
 * Processes in batches to avoid overwhelming the API
 *
 * @param {string[]} words - Array of Hebrew words
 * @returns {Promise<Map<string, string>>} - Map of word to translation
 */
export const batchTranslate = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.filter(w => w && cleanHebrewWord(w)?.length >= 2))];

  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);

    const batchPromises = batch.map(async (word) => {
      const translation = await translateWord(word);
      return { word, translation };
    });

    const batchResults = await Promise.all(batchPromises);
    for (const { word, translation } of batchResults) {
      if (translation) {
        results.set(word, translation);
      }
    }

    // Small delay between batches
    if (i + batchSize < uniqueWords.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const translationService = {
  // Single word
  translateWord,
  translateWithSource,

  // Text/commentary
  translateHebrewToEnglish,
  translateCommentary,

  // Batch
  batchTranslate,

  // Utilities
  isTranslatable
};

export default translationService;
