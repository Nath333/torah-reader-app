/**
 * Hebrew Text Utilities
 * Single source of truth for Hebrew text manipulation.
 * Based on Unicode ranges for Hebrew diacritics.
 *
 * Unicode ranges:
 *   Cantillation marks (taamei hamikra / trope): U+0591–U+05AF
 *   Vowels (nikud): U+05B0–U+05BD, U+05BF, U+05C1–U+05C2, U+05C4–U+05C5, U+05C7
 *   Maqaf (Hebrew hyphen): U+05BE
 *   Hebrew letters (consonants): U+05D0–U+05EA
 */

// Pre-compiled regexes (avoid re-creation per call)
const RE_CANTILLATION = /[\u0591-\u05AF]/g;
const RE_VOWELS = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const RE_ALL_DIACRITICS = /[\u0591-\u05C7]/g;
const RE_DIACRITICS_AND_MAQAF = /[\u0591-\u05C7\u05BE]/g;
const RE_MAQAF = /\u05BE/g;
const RE_NON_HEBREW = /[^\u05D0-\u05EA]/g;
const RE_NON_HEBREW_KEEP_ABBREV = /[^\u05D0-\u05EA\u05F3\u05F4'"]/g;
const RE_HAS_HEBREW = /[\u05D0-\u05EA]/;
const RE_HAS_VOWELS = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/;
const RE_HAS_CANTILLATION = /[\u0591-\u05AF]/;

// Final-letter mappings
const FINAL_TO_MEDIAL = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };
const MEDIAL_TO_FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
const RE_FINALS = /[םןץףך]/g;

/**
 * Remove cantillation marks (טעמי המקרא) from Hebrew text
 * Keeps vowels intact
 * @param {string} text - Hebrew text with cantillation
 * @returns {string} - Text without cantillation marks
 */
export const stripCantillation = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(RE_CANTILLATION, '');
};

/**
 * Remove vowels (נקודות) from Hebrew text
 * Keeps cantillation marks intact
 * @param {string} text - Hebrew text with vowels
 * @returns {string} - Text without vowels (consonants only)
 */
export const stripVowels = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(RE_VOWELS, '');
};

/**
 * Remove both vowels and cantillation marks
 * Returns consonants only (כתיב חסר)
 * @param {string} text - Hebrew text with diacritics
 * @returns {string} - Consonants only
 */
export const stripAllDiacritics = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(RE_ALL_DIACRITICS, '');
};

/**
 * Normalize final letters (sofit → regular form)
 * Converts ם ן ץ ף ך to מ נ צ פ כ
 * Used for dictionary lookup where entries use medial forms
 * @param {string} word - Hebrew word
 * @returns {string} - Word with normalized finals
 */
export const normalizeFinals = (word) => {
  if (!word || typeof word !== 'string') return word;
  return word.replace(RE_FINALS, ch => FINAL_TO_MEDIAL[ch]);
};

/**
 * Restore final letter form at end of word (regular → sofit)
 * Converts trailing כ מ נ פ צ to ך ם ן ף ץ
 * Used after suffix stripping to restore proper Hebrew spelling
 * @param {string} word - Hebrew word
 * @returns {string} - Word with final letter restored
 */
export const restoreFinals = (word) => {
  if (!word || typeof word !== 'string' || word.length === 0) return word;
  const lastChar = word[word.length - 1];
  if (MEDIAL_TO_FINAL[lastChar]) {
    return word.slice(0, -1) + MEDIAL_TO_FINAL[lastChar];
  }
  return word;
};

/**
 * Check if two Hebrew words are similar (share consonants)
 * @param {string} word1 - First Hebrew word
 * @param {string} word2 - Second Hebrew word
 * @returns {boolean} - True if words share enough consonants
 */
export const areSimilarWords = (word1, word2) => {
  if (!word1 || !word2) return false;
  const clean1 = stripAllDiacritics(word1);
  const clean2 = stripAllDiacritics(word2);
  const minLen = Math.min(clean1.length, clean2.length);
  if (minLen < 2) return clean1 === clean2;
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (clean1[i] === clean2[i]) matches++;
  }
  return matches >= Math.min(2, minLen - 1);
};

/**
 * Calculate similarity between two Hebrew words using LCS (Longest Common Subsequence)
 * PRO SCHOLAR V9: Single source of truth for headword validation
 *
 * @param {string} query - The search query
 * @param {string} headword - The dictionary headword
 * @returns {number} Similarity score 0-1
 */
export const calculateSimilarity = (query, headword) => {
  if (!query || !headword) return 1; // No data to validate

  const q = stripAllDiacritics(query);
  const h = stripAllDiacritics(headword);

  // Fast path: exact match
  if (q === h) return 1;

  // Fast path: containment (prefix/suffix)
  if (q.includes(h) || h.includes(q)) {
    return Math.min(q.length, h.length) / Math.max(q.length, h.length);
  }

  // LCS algorithm for thorough comparison
  const lcs = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[j][i] = a[i - 1] === b[j - 1] ? m[j - 1][i - 1] + 1 : Math.max(m[j][i - 1], m[j - 1][i]);
      }
    }
    return m[b.length][a.length];
  };

  return lcs(q, h) / Math.max(q.length, h.length);
};

/** Default threshold for headword matching */
export const SIMILARITY_THRESHOLD = 0.65;

/**
 * Validate that a headword matches a query word
 * PRO SCHOLAR V9: Prevents returning wrong dictionary entries
 *
 * @param {string} headword - Dictionary entry's headword
 * @param {string} query - Search query
 * @param {number} threshold - Minimum similarity (default 0.65)
 * @returns {boolean} True if match is valid
 */
export const isValidHeadwordMatch = (headword, query, threshold = SIMILARITY_THRESHOLD) => {
  if (!headword || !query || query.length < 3) return true;
  return calculateSimilarity(query, headword) >= threshold;
};

/**
 * Clean a Hebrew word for dictionary lookup
 * Removes diacritics but PRESERVES gershayim (' ״) for abbreviation detection
 * @param {string} word - Hebrew word to clean
 * @returns {string} - Consonants + gershayim (Hebrew letters + abbreviation marks)
 */
export const cleanHebrewWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return stripAllDiacritics(word)
    .replace(RE_NON_HEBREW_KEEP_ABBREV, '');
};

/**
 * Clean a Hebrew word STRICTLY (for root matching)
 * Removes ALL non-Hebrew letters including gershayim
 * @param {string} word - Hebrew word to clean
 * @returns {string} - Hebrew consonants ONLY
 */
export const cleanHebrewWordStrict = (word) => {
  if (!word || typeof word !== 'string') return '';
  return stripAllDiacritics(word)
    .replace(RE_NON_HEBREW, '');
};

/**
 * Remove diacritics AND maqaf (Hebrew hyphen U+05BE)
 * Useful for normalization where maqaf-joined words should merge
 * @param {string} text - Hebrew text
 * @returns {string} - Text without diacritics or maqaf
 */
export const stripDiacriticsAndMaqaf = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(RE_DIACRITICS_AND_MAQAF, '');
};

/**
 * Remove maqaf (Hebrew hyphen U+05BE) only
 * @param {string} text - Hebrew text
 * @returns {string} - Text without maqaf
 */
export const removeMaqaf = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(RE_MAQAF, '');
};

/**
 * Check if string contains Hebrew letters (consonants U+05D0-U+05EA)
 * @param {string} text
 * @returns {boolean}
 */
export const hasHebrewLetters = (text) => {
  if (!text) return false;
  return RE_HAS_HEBREW.test(text);
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
  return RE_HAS_VOWELS.test(text);
};

/**
 * Check if text contains cantillation marks
 * @param {string} text - Hebrew text
 * @returns {boolean} - True if contains cantillation
 */
export const hasCantillation = (text) => {
  if (!text) return false;
  return RE_HAS_CANTILLATION.test(text);
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
  const consonants = text.replace(RE_NON_HEBREW, '');
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

// =============================================================================
// GEMATRIA - Standard Hebrew letter values (Single Source of Truth)
// =============================================================================

export const GEMATRIA_VALUES = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
  'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200,
  'ש': 300, 'ת': 400
};

export const calculateGematria = (text) => {
  if (!text) return 0;
  return text.split('').reduce((sum, char) => sum + (GEMATRIA_VALUES[char] || 0), 0);
};

const hebrewUtils = {
  stripCantillation,
  stripVowels,
  stripAllDiacritics,
  stripDiacriticsAndMaqaf,
  removeMaqaf,
  stripNiqqud,
  cleanHebrewWord,
  cleanHebrewWordStrict,
  normalizeFinals,
  restoreFinals,
  hasHebrewLetters,
  areSimilarWords,
  // PRO SCHOLAR V9: Unified similarity functions
  calculateSimilarity,
  isValidHeadwordMatch,
  SIMILARITY_THRESHOLD,
  processHebrewText,
  hasVowels,
  hasCantillation,
  getDisplayModeLabel,
  // Verse statistics
  countWords,
  countLetters,
  countUniqueWords,
  getVerseStats,
  getChapterStats,
  // Gematria
  GEMATRIA_VALUES,
  calculateGematria
};

export default hebrewUtils;
