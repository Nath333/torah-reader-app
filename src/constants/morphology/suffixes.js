// =============================================================================
// Hebrew/Aramaic Suffix Constants - SINGLE SOURCE OF TRUTH
// Used by: morphologyAnalyzer, combinedTranslationService
// =============================================================================

/**
 * Hebrew suffix meanings with grammatical info
 * @type {Object.<string, {meaning: string, type: string}>}
 */
export const HEBREW_SUFFIX_MEANINGS = {
  // Plural endings
  'ים': { meaning: 'plural (m.)', type: 'number' },
  'ות': { meaning: 'plural (f.)', type: 'number' },
  'ין': { meaning: 'plural (Aram.)', type: 'number' },
  'ן': { meaning: 'plural (Aram.)', type: 'number' },

  // Possessive suffixes
  'י': { meaning: 'my', type: 'possessive' },
  'ך': { meaning: 'your (m.s.)', type: 'possessive' },
  'ו': { meaning: 'his', type: 'possessive' },
  'ה': { meaning: 'her/toward', type: 'possessive/directional' },
  'נו': { meaning: 'our/us', type: 'possessive' },
  'כם': { meaning: 'your (m.pl.)', type: 'possessive' },
  'כן': { meaning: 'your (f.pl.)', type: 'possessive' },
  'הם': { meaning: 'their (m.)', type: 'possessive' },
  'הן': { meaning: 'their (f.)', type: 'possessive' },

  // Combined possessive plurals
  'יו': { meaning: 'his (pl.)', type: 'possessive' },
  'יה': { meaning: 'her (pl.)', type: 'possessive' },
  'יהם': { meaning: 'their (m.pl.)', type: 'possessive' },
  'יהן': { meaning: 'their (f.pl.)', type: 'possessive' },
  'ותיהם': { meaning: 'their (f.pl. noun)', type: 'possessive' },
  'ותיהן': { meaning: 'their (f.pl. noun f.)', type: 'possessive' },

  // Verb endings
  'תי': { meaning: 'I (past)', type: 'verb' },
  'תם': { meaning: 'you (m.pl. past)', type: 'verb' },
  'תן': { meaning: 'you (f.pl. past)', type: 'verb' },

  // Aramaic emphatic state
  'א': { meaning: 'the (emphatic)', type: 'aramaic-state' },
  'תא': { meaning: 'the (f. emphatic)', type: 'aramaic-state' },
  'יא': { meaning: 'the (emphatic)', type: 'aramaic-state' },
  'ותא': { meaning: 'abstract (Aram.)', type: 'aramaic-abstract' },
};

/**
 * Suffixes ordered by length (try longer first)
 */
export const HEBREW_SUFFIXES_ORDERED = [
  // Long possessive plurals
  'ותיהם', 'ותיהן', 'יהם', 'יהן',
  // Aramaic feminine abstract endings
  'ותא', 'ותי', 'יתא',
  // Plural endings
  'ות', 'ים', 'ין', 'ן',
  // Aramaic emphatic state endings
  'אי', 'יא', 'איא',
  // Aramaic determinative suffixes
  'נא', 'תא',
  // Verb conjugation endings
  'תי', 'תם', 'תן', 'נו',
  // Possessive suffixes
  'יו', 'יה', 'הו', 'הם', 'הן',
  // "Your" suffixes
  'ך', 'כם', 'כן',
  // Single suffixes
  'י', 'ה', 'א',
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get suffix meaning
 * @param {string} suffix - Hebrew suffix
 * @returns {string}
 */
export const getSuffixMeaning = (suffix) => {
  return HEBREW_SUFFIX_MEANINGS[suffix]?.meaning || '';
};

/**
 * Get full suffix info
 * @param {string} suffix - Hebrew suffix
 * @returns {{meaning: string, type: string}|null}
 */
export const getSuffixInfo = (suffix) => {
  return HEBREW_SUFFIX_MEANINGS[suffix] || null;
};
