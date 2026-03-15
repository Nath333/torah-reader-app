// =============================================================================
// Translation Service
// Provides Hebrew to English translation functionality
// ALL TRANSLATIONS FROM API - NO HARDCODED DICTIONARIES
// Uses Sefaria API (BDB, Jastrow, Strong's, Klein) via scholarlyLexiconService
// =============================================================================

import { scholarlyLookup } from './scholarlyLexiconService';
import { cleanHebrewWord, splitIntoWords, getPrefixMeaning, getSuffixMeaning } from './hebrewDictionary';
import { cleanHtml } from '../utils/sanitize';

/**
 * Translate a single Hebrew word using scholarly lexicons (API)
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
    console.warn('Translation lookup failed:', error.message);
    return null;
  }
};

/**
 * Translate Hebrew text to English using Sefaria scholarly lexicons
 * @param {string} hebrewText - The Hebrew text to translate
 * @returns {Promise<string|null>} - The translated English text or null
 */
export const translateHebrewToEnglish = async (hebrewText) => {
  if (!hebrewText || typeof hebrewText !== 'string') {
    return null;
  }

  const cleanText = cleanHtml(hebrewText);
  if (!cleanText || cleanText.trim().length === 0) {
    return null;
  }

  // Split into words
  const words = splitIntoWords(cleanText);
  if (words.length === 0) return null;

  const translatedWords = [];
  let hasTranslation = false;

  for (const word of words) {
    const cleaned = cleanHebrewWord(word);

    // Skip very short words (likely particles handled by prefix meanings)
    if (!cleaned || cleaned.length < 2) {
      translatedWords.push(word);
      continue;
    }

    try {
      // Get translation from scholarly lexicon API
      const result = await scholarlyLookup(cleaned);

      if (result?.primaryDefinition) {
        // Add prefix meaning if word has prefix
        const prefixMeaning = getPrefixMeaning(word.slice(0, 2)) ||
                             getPrefixMeaning(word.slice(0, 1)) || '';

        // Add suffix meaning if word has suffix
        const suffixMeaning = getSuffixMeaning(word.slice(-2)) ||
                             getSuffixMeaning(word.slice(-1)) || '';

        translatedWords.push(prefixMeaning + result.primaryDefinition + suffixMeaning);
        hasTranslation = true;
      } else {
        // Keep original word if no translation found
        translatedWords.push(word);
      }
    } catch (error) {
      // Keep original word on error
      translatedWords.push(word);
    }
  }

  if (!hasTranslation) {
    return null; // No translation found for any word
  }

  // Join and capitalize
  const result = translatedWords.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Translate Hebrew commentary with context-aware processing (async API version)
 * @param {string} hebrewText - The Hebrew commentary text
 * @returns {Promise<string|null>} - The translated English text or null
 */
export const translateCommentary = async (hebrewText) => {
  // Commentary uses same translation logic
  return translateHebrewToEnglish(hebrewText);
};

/**
 * Quick synchronous check if word might be translatable
 * (Does not perform actual translation - use translateWord for that)
 * @param {string} word - Hebrew word
 * @returns {boolean} - True if word appears to be translatable
 */
export const isTranslatable = (word) => {
  const cleaned = cleanHebrewWord(word);
  return cleaned && cleaned.length >= 2;
};

/**
 * Get translation with source information
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
      // Determine which source provided the definition
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
    console.warn('Translation with source failed:', error.message);
    return { translation: null, source: null, word: cleaned, error: error.message };
  }
};

/**
 * Batch translate multiple words
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

const translationService = {
  translateWord,
  translateHebrewToEnglish,
  translateCommentary,
  translateWithSource,
  batchTranslate,
  isTranslatable,
};

export default translationService;
