/**
 * Article Normalization Utility
 * Fixes incorrect indefinite article usage (a/an) in dictionary definitions and translations
 */

// Words that start with vowel letters but have consonant sounds
const CONSONANT_SOUND_EXCEPTIONS = [
  'unit', 'unicorn', 'uniform', 'unify', 'unilateral', 'unison', 'unique',
  'university', 'universal', 'eunuch', 'eulogy', 'euphemism', 'eureka',
  'euro', 'European', 'one', 'once', 'oneness', 'one-',
  'use', 'useful', 'useless', 'user', 'usual', 'usurper', 'utilize',
  'ukelele', 'ubiquitous', 'utopia', 'uterine', 'urinal', 'urine', 'uro-'
];

// Words that start with consonant letters but have vowel sounds
const VOWEL_SOUND_EXCEPTIONS = [
  'hour', 'honest', 'honor', 'honorable', 'honorary', 'heir', 'heiress',
  'herb', 'honest', 'honour', 'honourable'
];

/**
 * Check if a word should use "an" (vowel sound)
 * @param {string} word - Word to check
 * @returns {boolean} - True if should use "an"
 */
function shouldUseAn(word) {
  if (!word || typeof word !== 'string') return false;
  const lower = word.toLowerCase().trim();
  const firstWord = lower.split(/[\s\-]/)[0]; // Get first word only
  
  // Handle abbreviations (e.g., "an API", "a URL")
  if (/^[A-Z]{2,}$/.test(word.trim())) {
    const firstLetter = word.trim()[0].toLowerCase();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    return vowels.includes(firstLetter);
  }
  
  // Check consonant sound exceptions (use "a", not "an")
  for (const exception of CONSONANT_SOUND_EXCEPTIONS) {
    if (firstWord.startsWith(exception.toLowerCase())) {
      return false;
    }
  }
  
  // Check vowel sound exceptions (use "an", not "a")
  for (const exception of VOWEL_SOUND_EXCEPTIONS) {
    if (firstWord.startsWith(exception.toLowerCase())) {
      return true;
    }
  }
  
  // Standard rule: check first letter
  const firstChar = firstWord[0];
  if (!firstChar) return false;
  
  return /^[aeiou]$/i.test(firstChar);
}

/**
 * Fix article in a phrase "a/an something"
 * @param {string} text - Text containing article
 * @returns {string} - Text with corrected article
 */
function fixArticleInPhrase(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Match "a " or "an " followed by a word
  return text.replace(/\b(a|an)\s+(\S+)/gi, (match, article, word) => {
    const needsAn = shouldUseAn(word);
    const currentIsAn = article.toLowerCase() === 'an';
    
    if (needsAn === currentIsAn) {
      return match; // Already correct
    }
    
    return needsAn ? `an ${word}` : `a ${word}`;
  });
}

/**
 * Normalize all article usage in a definition text
 * Fixes both incorrect "a" and incorrect "an" usages
 * @param {string} text - Dictionary definition or translation text
 * @returns {string} - Normalized text with correct articles
 */
export function normalizeArticles(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  // Fix "a/an X" patterns
  result = fixArticleInPhrase(result);
  
  return result;
}

/**
 * Quick check: is this word correctly preceded by "an"?
 * @param {string} word - Word following article
 * @returns {boolean} - True if should use "an"
 */
export function requiresAn(word) {
  return shouldUseAn(word);
}

/**
 * Get the correct article for a word
 * @param {string} word - Word to get article for
 * @param {boolean} capitalize - Whether to capitalize the article
 * @returns {string} - "a" or "an"
 */
export function getCorrectArticle(word, capitalize = false) {
  const article = shouldUseAn(word) ? 'an' : 'a';
  return capitalize ? article.charAt(0).toUpperCase() + article.slice(1) : article;
}

export default normalizeArticles;
