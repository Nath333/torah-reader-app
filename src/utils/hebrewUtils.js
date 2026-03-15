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

const hebrewUtils = {
  stripCantillation,
  stripVowels,
  stripAllDiacritics,
  processHebrewText,
  hasVowels,
  hasCantillation,
  getDisplayModeLabel
};

export default hebrewUtils;
