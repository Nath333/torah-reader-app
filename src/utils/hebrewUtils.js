/**
 * Hebrew Text Utilities
 * Functions for manipulating Hebrew text display options
 * Based on Unicode ranges for Hebrew diacritics
 */

// Unicode ranges for Hebrew marks
// Cantillation marks (taamei hamikra / trope): U+0591 to U+05AF
// Vowels (nikud): U+05B0 to U+05BD, U+05BF, U+05C1-U+05C2, U+05C4-U+05C5, U+05C7

/**
 * Remove cantillation marks (טעמי המקרא) from Hebrew text
 * Keeps vowels intact
 * @param {string} text - Hebrew text with cantillation
 * @returns {string} - Text without cantillation marks
 */
export const stripCantillation = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Remove cantillation marks (U+0591 to U+05AF)
  return text.replace(/[\u0591-\u05AF]/g, '');
};

/**
 * Remove vowels (נקודות) from Hebrew text
 * Keeps cantillation marks intact
 * @param {string} text - Hebrew text with vowels
 * @returns {string} - Text without vowels (consonants only)
 */
export const stripVowels = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Remove vowels/nikud (U+05B0-U+05BD, U+05BF, U+05C1-U+05C2, U+05C4-U+05C5, U+05C7)
  return text.replace(/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '');
};

/**
 * Remove both vowels and cantillation marks
 * Returns consonants only (כתיב חסר)
 * @param {string} text - Hebrew text with diacritics
 * @returns {string} - Consonants only
 */
export const stripAllDiacritics = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Remove all Hebrew diacritics (U+0591 to U+05C7)
  return text.replace(/[\u0591-\u05C7]/g, '');
};

/**
 * Clean a Hebrew word for dictionary lookup
 * Removes diacritics but PRESERVES gershayim (' ״) for abbreviation detection
 * @param {string} word - Hebrew word to clean
 * @returns {string} - Consonants + gershayim (Hebrew letters + abbreviation marks)
 */
export const cleanHebrewWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    // Keep Hebrew letters + gershayim (״ U+05F4, ' U+0027, " U+0022, ׳ U+05F3)
    .replace(/[^\u05D0-\u05EA\u05F3\u05F4'"]/g, '');
};

/**
 * Clean a Hebrew word STRICTLY (for root matching)
 * Removes ALL non-Hebrew letters including gershayim
 * @param {string} word - Hebrew word to clean
 * @returns {string} - Hebrew consonants ONLY
 */
export const cleanHebrewWordStrict = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep ONLY Hebrew letters
};

// Alias used by some services
export const stripNiqqud = stripVowels;

/**
 * Process Hebrew text based on display options
 * @param {string} text - Hebrew text
 * @param {Object} options - Display options
 * @param {boolean} options.showVowels - Show vowels (default: true)
 * @param {boolean} options.showCantillation - Show cantillation marks (default: true)
 * @returns {string} - Processed text
 */
export const processHebrewText = (text, options = {}) => {
  const { showVowels = true, showCantillation = true } = options;

  if (!text || typeof text !== 'string') return text;

  let result = text;

  if (!showCantillation) {
    result = stripCantillation(result);
  }

  if (!showVowels) {
    result = stripVowels(result);
  }

  return result;
};

/**
 * Check if text contains vowels
 * @param {string} text - Hebrew text
 * @returns {boolean} - True if contains vowels
 */
export const hasVowels = (text) => {
  if (!text) return false;
  return /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/.test(text);
};

/**
 * Check if text contains cantillation marks
 * @param {string} text - Hebrew text
 * @returns {boolean} - True if contains cantillation
 */
export const hasCantillation = (text) => {
  if (!text) return false;
  return /[\u0591-\u05AF]/.test(text);
};

/**
 * Get text display mode description
 * @param {boolean} showVowels
 * @param {boolean} showCantillation
 * @returns {string} - Description in Hebrew
 */
export const getDisplayModeLabel = (showVowels, showCantillation) => {
  if (showVowels && showCantillation) return 'מלא'; // Full
  if (showVowels && !showCantillation) return 'עם נקודות'; // With vowels
  if (!showVowels && showCantillation) return 'עם טעמים'; // With cantillation
  return 'כתיב חסר'; // Consonants only
};

// =============================================================================
// Verse Statistics Functions
// =============================================================================

/**
 * Count words in Hebrew text
 * @param {string} text - Hebrew text
 * @returns {number} - Word count
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  // Remove HTML tags and split by whitespace
  const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
  if (!cleanText) return 0;
  return cleanText.split(/\s+/).filter(w => w.length > 0).length;
};

/**
 * Count Hebrew letters (consonants only)
 * @param {string} text - Hebrew text
 * @returns {number} - Letter count (consonants)
 */
export const countLetters = (text) => {
  if (!text || typeof text !== 'string') return 0;
  // Keep only Hebrew consonants (U+05D0 to U+05EA)
  const consonants = text.replace(/[^\u05D0-\u05EA]/g, '');
  return consonants.length;
};

/**
 * Count unique words in text
 * @param {string} text - Hebrew text
 * @returns {number} - Unique word count
 */
export const countUniqueWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
  if (!cleanText) return 0;
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  // Clean each word and get unique consonant forms
  const uniqueWords = new Set(words.map(w => cleanHebrewWord(w)).filter(w => w.length > 0));
  return uniqueWords.size;
};

/**
 * Get comprehensive verse statistics
 * @param {string} text - Hebrew verse text
 * @returns {Object} - Statistics object
 */
export const getVerseStats = (text) => {
  if (!text || typeof text !== 'string') {
    return { words: 0, letters: 0, uniqueWords: 0, hasVowels: false, hasCantillation: false };
  }

  return {
    words: countWords(text),
    letters: countLetters(text),
    uniqueWords: countUniqueWords(text),
    hasVowels: hasVowels(text),
    hasCantillation: hasCantillation(text)
  };
};

/**
 * Get chapter statistics (aggregate of verses)
 * @param {Array} verses - Array of verse objects with hebrew property
 * @returns {Object} - Chapter statistics
 */
export const getChapterStats = (verses) => {
  if (!verses || !Array.isArray(verses)) {
    return { totalWords: 0, totalLetters: 0, verseCount: 0, avgWordsPerVerse: 0 };
  }

  let totalWords = 0;
  let totalLetters = 0;
  const allWords = new Set();

  verses.forEach(verse => {
    const text = verse?.hebrew || verse?.he || '';
    totalWords += countWords(text);
    totalLetters += countLetters(text);

    // Collect unique words
    const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
    cleanText.split(/\s+/).forEach(w => {
      const cleaned = cleanHebrewWord(w);
      if (cleaned.length > 0) allWords.add(cleaned);
    });
  });

  return {
    verseCount: verses.length,
    totalWords,
    totalLetters,
    uniqueWords: allWords.size,
    avgWordsPerVerse: verses.length > 0 ? Math.round(totalWords / verses.length * 10) / 10 : 0,
    avgLettersPerVerse: verses.length > 0 ? Math.round(totalLetters / verses.length * 10) / 10 : 0
  };
};

const hebrewUtils = {
  stripCantillation,
  stripVowels,
  stripAllDiacritics,
  stripNiqqud,
  cleanHebrewWord,
  processHebrewText,
  hasVowels,
  hasCantillation,
  getDisplayModeLabel,
  // Verse statistics
  countWords,
  countLetters,
  countUniqueWords,
  getVerseStats,
  getChapterStats
};

export default hebrewUtils;
