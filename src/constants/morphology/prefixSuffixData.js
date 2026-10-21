// =============================================================================
// Préfixes et suffixes hébreux/araméens — données pures + getters
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

/**
 * Hebrew prefixes with their meanings and grammatical information
 * Used by: grammarAnalysisService, unifiedLookupService, commentaryUtils, etc.
 */
export const HEBREW_PREFIX_MEANINGS = {
  'ו': { short: 'and', full: 'and/but (conjunction)', type: 'conjunction' },
  'ה': { short: 'the', full: 'the (definite article)', type: 'article' },
  'ב': { short: 'in', full: 'in/with (preposition)', type: 'preposition' },
  'ל': { short: 'to', full: 'to/for (preposition)', type: 'preposition' },
  'מ': { short: 'from', full: 'from/than (preposition)', type: 'preposition' },
  'כ': { short: 'like', full: 'like/as (preposition)', type: 'preposition' },
  'ש': { short: 'that', full: 'that/which/who (relative)', type: 'relative' },
  'ד': { short: 'of', full: 'of/that (Aramaic relative)', type: 'relative' },
};

/**
 * Get short prefix meaning (for display)
 * @param {string} prefix - Single Hebrew letter
 * @returns {string} - Short meaning like "the", "and", etc.
 */
export const getPrefixMeaning = (prefix) => {
  return HEBREW_PREFIX_MEANINGS[prefix]?.short || '';
};

/**
 * Get full prefix meaning with grammatical info
 * @param {string} prefix - Single Hebrew letter
 * @returns {object|null} - { short, full, type }
 */
export const getPrefixInfo = (prefix) => {
  return HEBREW_PREFIX_MEANINGS[prefix] || null;
};

/**
 * Hebrew prefixes ordered by length (longer first for correct stripping)
 * Used for morphological analysis - try longer combinations first
 */
export const HEBREW_PREFIXES_ORDERED = [
  // 4-letter combinations (Hebrew) - vav + 3-prefix
  'וכשה', 'ומשה', 'וכבה', 'ולכה', 'ובשה', 'ולשה', 'ומכה',
  // 4-letter combinations (Aramaic with ד relative)
  'דכשה', 'דמשה', 'דכבה', 'דלכה', 'דבשה', 'דלשה',
  // 3-letter combinations: כשה (when the), משה (from the), בשה (in that the), etc.
  // CRITICAL: These are כ/מ/ב/ל + ש (that) + ה (the) = "when/from/in/to that the"
  'כשה', 'משה', 'בשה', 'לשה',  // prefix + ש + ה (e.g., כשהמלאכה = "when the work")
  'כמה', 'במה', 'למה',          // prefix + מ + ה (from the)
  'כבה', 'לבה', 'מבה',          // prefix + ב + ה (in the)
  // 3-letter combinations (Hebrew) - vav + 2-prefix
  'וכש', 'ושה', 'ומה', 'וכה', 'ובה', 'ולה', 'ומש', 'וכב', 'ובש', 'ולש',
  // 3-letter combinations (Aramaic ד prefix)
  'דכש', 'דבש', 'דלש', 'דמש', 'דכה', 'דבה', 'דלה', 'דמה',
  // 2-letter: vav + prefix (Hebrew)
  'וה', 'וב', 'ול', 'ומ', 'וכ', 'וש',
  // 2-letter: dalet + prefix (Aramaic relative)
  'דה', 'דב', 'דל', 'דמ', 'דכ', 'דש',
  // 2-letter: shin (relative) + prefix (Hebrew)
  'שה', 'שב', 'של', 'שמ', 'שכ',
  // 2-letter: prefix + definite article
  'מה', 'בה', 'לה', 'כה',
  // 2-letter: when (kaf + shin)
  'כש',
  // Single prefixes (Hebrew + Aramaic ד)
  'ה', 'ו', 'ב', 'ל', 'מ', 'כ', 'ש', 'ד',
];

/**
 * Simple single-letter prefix list
 */
export const SINGLE_PREFIXES = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'ד'];

/**
 * Hebrew suffixes ordered by length (longer first)
 */
export const HEBREW_SUFFIXES_ORDERED = [
  // Long possessive plurals (Hebrew)
  'ותיהם', 'ותיהן', 'יהם', 'יהן',
  // Aramaic feminine abstract endings
  'ותא', 'ותי', 'יתא',
  // Plural endings (Hebrew fem, masc; Aramaic)
  'ות', 'ים', 'ין', 'ן',
  // Aramaic emphatic state endings
  'אי', 'יא', 'איא',
  // Aramaic determinative suffixes
  'נא', 'תא',
  // Verb conjugation endings (Hebrew)
  'תי', 'תם', 'תן', 'נו',
  // CONSTRUCT + POSSESSIVE compound suffixes (שגגתו = שגגה + ת + ו)
  // These must come BEFORE single possessives for greedy matching
  'תו', 'תי', 'תך', 'תם', 'תן', 'תנו',  // construct ת + possessive
  // Possessive suffixes (2-letter)
  'יו', 'יה', 'הו', 'הם', 'הן',
  // "Your" suffixes
  'ך', 'כם', 'כן',
  // Single possessive suffixes: "his", "my", "her" / directional heh
  'ו', 'י', 'ה', 'א',  // ו = his/him (was missing!), א for Aramaic emphatic
];

/**
 * Hebrew verb prefixes for root extraction (verb conjugation patterns)
 * Used to strip verb conjugation markers before finding the root
 */
export const HEBREW_VERB_PREFIXES = [
  'וי', // Vav-conversive + yod (ויאמר)
  'ות', // Vav-conversive + tav
  'וא', // Vav-conversive + alef
  'ונ', // Vav-conversive + nun
  'י', // Future 3rd masc sing (יעשה)
  'ת', // Future 2nd/3rd fem sing
  'א', // Future 1st sing (אעשה)
  'נ', // Future 1st plural (נעשה)
];

/**
 * Hebrew verb suffixes for root extraction (verb conjugation patterns)
 * Used to strip verb conjugation markers before finding the root
 */
export const HEBREW_VERB_SUFFIXES = [
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
 * Common Hebrew/Aramaic words that should NOT be prefix-stripped
 * These look like they have prefixes but are actually complete words
 * This is DYNAMIC - we check dictionaries, not hardcode everything
 */


/**
 * Aramaic-specific prefixes (for Talmud/Targum)
 */
export const ARAMAIC_PREFIXES = [
  { pattern: 'דקא', meaning: 'that [is]' },
  { pattern: 'דהא', meaning: 'for behold' },
  { pattern: 'דלא', meaning: 'that not' },
  { pattern: 'דמא', meaning: 'of what' },
  { pattern: 'דכד', meaning: 'that when' },
  { pattern: 'וקא', meaning: 'and [is]' },
  { pattern: 'בדין', meaning: 'with judgment' },
  { pattern: 'מדין', meaning: 'from judgment' },
  { pattern: 'קא', meaning: '[is] (progressive)' },
  { pattern: 'דא', meaning: 'this (demonstrative)' },
  { pattern: 'הא', meaning: 'behold/this' },
];

/**
 * Get combined prefix meaning from a multi-letter prefix
 * @param {string} prefix - Multi-letter prefix like "וה" or "בש"
 * @returns {string} - Combined meaning like "and the" or "in that"
 */
export const getCombinedPrefixMeaning = (prefix) => {
  if (!prefix) return '';

  const meanings = [];
  for (const char of prefix) {
    const meaning = getPrefixMeaning(char);
    if (meaning) meanings.push(meaning);
  }
  return meanings.join(' ');
};

