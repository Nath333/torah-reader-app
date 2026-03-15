// =============================================================================
// Hebrew Dictionary Service
// Utility functions for Hebrew word processing
// NOTE: Dictionary lookups are handled by Sefaria API (scholarlyLexiconService)
// and scholarlyLexiconService for BDB, Jastrow, Strong's, Klein sources
// =============================================================================

/**
 * Clean a Hebrew word by removing cantillation marks and vowels
 * @param {string} word - The Hebrew word to clean
 * @returns {string} - The cleaned word with only Hebrew letters
 */
export const cleanHebrewWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
};

// Common Hebrew prefixes that attach to words
const HEBREW_PREFIXES = [
  'וה', 'ול', 'וב', 'ומ', 'וכ', 'וש', // Vav + other prefix
  'שה', 'של', 'שב', 'שמ', 'שכ', // Shin + other prefix
  'מה', 'מל', 'מב', // Mem + other prefix
  'כש', 'כה', 'כל', 'כב', // Kaf + other
  'בה', 'לה', // Bet/Lamed + Heh
  'ה', // The (definite article)
  'ו', // And
  'ב', // In/with
  'ל', // To/for
  'מ', // From
  'כ', // Like/as
  'ש', // That/which
];

// Common Hebrew suffixes
const HEBREW_SUFFIXES = [
  'ים', 'ות', 'ין', // Plural endings
  'יה', 'הו', 'הם', 'הן', // Possessive endings
  'י', 'ך', 'כם', 'כן', // More possessive
  'נו', // Our
  'ה', // Her (can also be directional)
];

// Common Hebrew verb prefixes for conjugations
const VERB_PREFIXES = [
  'וי', // Vav-conversive + yod (ויאמר)
  'ות', // Vav-conversive + tav
  'וא', // Vav-conversive + alef
  'ונ', // Vav-conversive + nun
  'י', // Future 3rd masc sing (יעשה)
  'ת', // Future 2nd/3rd fem sing
  'א', // Future 1st sing (אעשה)
  'נ', // Future 1st plural (נעשה)
];

// Common Hebrew verb suffixes for conjugations
const VERB_SUFFIXES = [
  'תי', // Past 1st sing (עשיתי)
  'ת', // Past 2nd masc sing
  'תם', // Past 2nd masc plural
  'תן', // Past 2nd fem plural
  'נו', // Past 1st plural (עשינו)
  'ו', // Past 3rd plural or future plural
  'ה', // Past 3rd fem sing (עשתה)
  'י', // Imperative fem sing
];

/**
 * Extract the likely 3-letter root (shoresh) from a Hebrew word
 * Hebrew verbs are based on trilateral roots
 * @param {string} word - The Hebrew word
 * @returns {string|null} - The extracted root or null
 */
export const extractRoot = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 3) return null;

  // If word is already 3 letters, it might be the root
  if (cleaned.length === 3) {
    return cleaned;
  }

  let candidate = cleaned;

  // Remove verb prefixes (vav-conversive patterns first)
  for (const prefix of VERB_PREFIXES) {
    if (candidate.startsWith(prefix) && candidate.length > prefix.length + 2) {
      candidate = candidate.slice(prefix.length);
      break;
    }
  }

  // Remove verb suffixes
  for (const suffix of VERB_SUFFIXES) {
    if (candidate.endsWith(suffix) && candidate.length > suffix.length + 2) {
      candidate = candidate.slice(0, -suffix.length);
      break;
    }
  }

  // Handle common binyan (verb form) patterns
  // Nif'al: starts with נ (e.g., נשמר from שמר)
  if (candidate.length === 4 && candidate.startsWith('נ')) {
    return candidate.slice(1);
  }

  // Hif'il: starts with ה (e.g., הגדיל from גדל)
  if (candidate.length >= 4 && candidate.startsWith('ה')) {
    const withoutHeh = candidate.slice(1);
    // Remove the yod in middle if present (הגדיל -> גדל)
    if (withoutHeh.length === 4 && withoutHeh[1] === 'י') {
      return withoutHeh[0] + withoutHeh.slice(2);
    }
    if (withoutHeh.length === 3) {
      return withoutHeh;
    }
  }

  // Hitpa'el: starts with הת (e.g., התגדל from גדל)
  if (candidate.length >= 5 && candidate.startsWith('הת')) {
    return candidate.slice(2, 5);
  }

  // If still longer than 3, try getting first 3 letters as potential root
  if (candidate.length === 3) {
    return candidate;
  }

  // For 4-letter words, common pattern is the root is letters 1,2,4 (middle letter doubled)
  if (candidate.length === 4) {
    // Check if middle letters are same (doubled - Pi'el pattern)
    if (candidate[1] === candidate[2]) {
      return candidate[0] + candidate[1] + candidate[3];
    }
    // Otherwise try positions 0,1,2 or 1,2,3
    return candidate.slice(0, 3);
  }

  // For longer words, try extracting first 3 consonants
  if (candidate.length > 4) {
    return candidate.slice(0, 3);
  }

  return null;
};

/**
 * Remove common prefixes from a word
 * @param {string} word - The Hebrew word
 * @returns {string} - Word without prefix
 */
export const removePrefix = (word) => {
  const cleaned = cleanHebrewWord(word);
  for (const prefix of HEBREW_PREFIXES) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length) {
      return cleaned.slice(prefix.length);
    }
  }
  return cleaned;
};

/**
 * Remove common suffixes from a word
 * @param {string} word - The Hebrew word
 * @returns {string} - Word without suffix
 */
export const removeSuffix = (word) => {
  const cleaned = cleanHebrewWord(word);
  for (const suffix of HEBREW_SUFFIXES) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length) {
      return cleaned.slice(0, -suffix.length);
    }
  }
  return cleaned;
};

/**
 * Get the meaning of a Hebrew prefix
 * @param {string} prefix - The prefix
 * @returns {string} - English meaning
 */
export const getPrefixMeaning = (prefix) => {
  const meanings = {
    'ה': 'the ',
    'ו': 'and ',
    'ב': 'in ',
    'ל': 'to ',
    'מ': 'from ',
    'כ': 'like ',
    'ש': 'that ',
    'וה': 'and the ',
    'ול': 'and to ',
    'וב': 'and in ',
    'ומ': 'and from ',
    'וכ': 'and like ',
    'וש': 'and that ',
    'שה': 'that the ',
    'של': 'that to ',
    'שב': 'that in ',
    'שמ': 'that from ',
    'שכ': 'that like ',
    'מה': 'from the ',
    'מל': 'from to ',
    'מב': 'from in ',
    'כש': 'when ',
    'כה': 'like the ',
    'כל': 'like to ',
    'כב': 'like in ',
    'בה': 'in the ',
    'לה': 'to the ',
  };
  return meanings[prefix] || '';
};

/**
 * Get the meaning of a Hebrew suffix
 * @param {string} suffix - The suffix
 * @returns {string} - English meaning
 */
export const getSuffixMeaning = (suffix) => {
  const meanings = {
    'ים': ' (pl.)',
    'ות': ' (pl.)',
    'ין': ' (pl.)',
    'יה': ' (her/its)',
    'הו': ' (his/its)',
    'הם': ' (their)',
    'הן': ' (their-f)',
    'י': ' (my)',
    'ך': ' (your)',
    'כם': ' (your-pl)',
    'כן': ' (your-f-pl)',
    'נו': ' (our)',
    'ה': '', // Could be directional or feminine - don't add meaning
  };
  return meanings[suffix] || '';
};

/**
 * Generate word form variants for API lookup
 * Handles plural forms, construct states, suffixes etc.
 * @param {string} word - The Hebrew word
 * @returns {string[]} - Array of possible base forms
 */
export const generateWordForms = (word) => {
  const cleaned = cleanHebrewWord(word);
  const forms = [cleaned];

  // Try removing prefixes
  for (const prefix of HEBREW_PREFIXES) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 2) {
      const withoutPrefix = cleaned.slice(prefix.length);
      if (!forms.includes(withoutPrefix)) {
        forms.push(withoutPrefix);
      }
    }
  }

  // Try removing suffixes
  for (const suffix of HEBREW_SUFFIXES) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      const withoutSuffix = cleaned.slice(0, -suffix.length);
      if (!forms.includes(withoutSuffix)) {
        forms.push(withoutSuffix);
      }
      // For plural feminine (ות), also try adding ה for singular form
      if (suffix === 'ות') {
        const femSingular = withoutSuffix + 'ה';
        if (!forms.includes(femSingular)) {
          forms.push(femSingular);
        }
      }
    }
  }

  // Try extracting root
  const root = extractRoot(cleaned);
  if (root && root.length >= 3 && !forms.includes(root)) {
    forms.push(root);
  }

  return forms;
};

/**
 * Check if a word has potential translation (based on structure)
 * @param {string} word - The Hebrew word to check
 * @returns {boolean} - True if word looks translatable
 */
export const hasTranslation = (word) => {
  const cleaned = cleanHebrewWord(word);
  // Word should have at least 2 Hebrew letters to be meaningful
  return cleaned && cleaned.length >= 2;
};

/**
 * Split Hebrew text into words while preserving punctuation
 * @param {string} text - The Hebrew text to split
 * @returns {string[]} - Array of words
 */
export const splitIntoWords = (text) => {
  if (!text) return [];
  // Remove HTML tags first
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  // Split by whitespace and filter empty strings
  return cleanText.split(/\s+/).filter(word => word.length > 0);
};

/**
 * @deprecated Use scholarlyLookup from scholarlyLexiconService instead
 * This is kept only for backwards compatibility
 */
export const lookupWord = () => {
  console.warn('hebrewDictionary.lookupWord is deprecated. Use scholarlyLookup from scholarlyLexiconService instead.');
  return null;
};

const hebrewDictionaryService = {
  lookupWord,
  hasTranslation,
  cleanHebrewWord,
  splitIntoWords,
  extractRoot,
  removePrefix,
  removeSuffix,
  getPrefixMeaning,
  getSuffixMeaning,
  generateWordForms,
};

export default hebrewDictionaryService;
