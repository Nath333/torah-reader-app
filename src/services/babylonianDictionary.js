// =============================================================================
// Babylonian (Aramaic) Dictionary Service
// Uses Sefaria Jastrow API for Aramaic/Talmudic translations
// =============================================================================

/**
 * Clean an Aramaic/Hebrew word by removing cantillation marks and vowels
 * @param {string} word - The word to clean
 * @returns {string} - The cleaned word with only Hebrew/Aramaic letters
 */
export const cleanAramaicWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
};

/**
 * Check if a word is likely Aramaic based on common patterns
 * @param {string} word - The word to check
 * @returns {boolean} - True if word appears to be Aramaic
 */
export const isLikelyAramaic = (word) => {
  const cleanWord = cleanAramaicWord(word);
  if (!cleanWord || cleanWord.length < 2) return false;

  // Common Aramaic word endings
  const aramaicPatterns = [
    /א$/, // emphatic state ending
    /תא$/, // feminine emphatic
    /ין$/, // plural
    /ינן$/, // "we" verb ending
    /נא$/, // first person
  ];

  // Common Aramaic-only words
  const aramaicOnlyWords = [
    'מאי', 'היכי', 'אמאי', 'הכי', 'דילמא', 'איכא', 'ליכא',
    'הוה', 'הוי', 'קא', 'לא', 'דא', 'הדא', 'ההוא', 'ההיא'
  ];

  if (aramaicOnlyWords.includes(cleanWord)) {
    return true;
  }

  return aramaicPatterns.some(pattern => pattern.test(cleanWord));
};

/**
 * Look up an Aramaic word - returns null (API lookup should be used)
 * This is a placeholder for backwards compatibility
 * Use scholarlyLookup or lookupJastrow from scholarlyLexiconService instead
 * @param {string} word - The Aramaic word to look up
 * @returns {null} - Always returns null, use API instead
 */
export const lookupAramaicWord = (word) => {
  // No hardcoded dictionary - use Sefaria Jastrow API
  return null;
};

/**
 * Check if a word has a translation - always returns false (use API)
 * @param {string} word - The Aramaic word to check
 * @returns {boolean} - Always false, use API instead
 */
export const hasAramaicTranslation = (word) => {
  return false;
};

const babylonianDictionaryService = {
  lookupAramaicWord,
  hasAramaicTranslation,
  cleanAramaicWord,
  isLikelyAramaic,
};

export default babylonianDictionaryService;
