// =============================================================================
// Utilitaires racine/mot du lexique savant — fonctions pures
// (extrait de scholarlyLexiconService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { cleanHebrewWord } from '../../../utils/hebrewUtils';
import { extractRoot as extractGrammarRoot } from '../../analysis/grammarAnalysisService';

// cleanWordForLookup - use cleanHebrewWord from ../utils/hebrewUtils
export const cleanWordForLookup = cleanHebrewWord;

// =============================================================================
// WORD CLEANING UTILITIES
// =============================================================================

// cleanWord - use cleanHebrewWord from ../utils/hebrewUtils
export const cleanWord = cleanHebrewWord;

/**
 * Extract root using the enhanced grammar analysis service
 * Falls back to simple extraction if grammar service returns uncertain result
 */
// Common Hebrew/Aramaic 3-letter roots that should NOT have their first letter stripped
// Even though the first letter matches a common prefix (ש, ב, ל, מ, כ, etc.)
export const PROTECTED_ROOTS = new Set([
  'שבת', // Sabbath/rest - ש is NOT a prefix
  'שמר', // guard
  'שמע', // hear
  'שלח', // send
  'שאל', // ask
  'שכב', // lie down
  'שכח', // forget
  'שפט', // judge
  'שבר', // break
  'שוב', // return
  'שים', // put/place
  'שיר', // sing
  'שנא', // hate
  'שקל', // weigh
  'בטח', // trust - ב is NOT a prefix
  'בין', // understand
  'בנה', // build
  'בקש', // seek
  'ברא', // create
  'ברך', // bless
  'לקח', // take - ל is NOT a prefix
  'למד', // learn
  'לבש', // wear
  'מלך', // reign - מ is NOT a prefix
  'מצא', // find
  'מות', // die
  'מלא', // fill
  'כתב', // write - כ is NOT a prefix
  'כרת', // cut
  'דבר', // speak - ד is NOT a prefix
  'הלך', // walk - ה is NOT a prefix (in this root)
]);

export const extractRoot = (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return cleaned;

  // Use the improved grammar service for root extraction
  const grammarResult = extractGrammarRoot(word);
  if (grammarResult?.root && !grammarResult.uncertain) {
    return grammarResult.root;
  }

  // Fallback: simple heuristic if grammar service returns uncertain
  if (cleaned.length <= 3) return cleaned;

  // Check if this is a protected root (don't strip prefixes from these)
  if (PROTECTED_ROOTS.has(cleaned)) return cleaned;

  let root = cleaned;

  // Remove common prefixes
  const prefixes = ['וי', 'הת', 'ה', 'ו', 'ל', 'ב', 'מ', 'כ', 'ש', 'ד'];
  for (const prefix of prefixes) {
    if (root.startsWith(prefix) && root.length > prefix.length + 2) {
      const potentialRoot = root.slice(prefix.length);
      // Don't strip if the result is a protected root
      if (!PROTECTED_ROOTS.has(potentialRoot)) {
        root = potentialRoot;
        break;
      }
    }
  }

  // Remove common suffixes (including Aramaic)
  const suffixes = ['ים', 'ות', 'ין', 'יא', 'תא', 'תי', 'נו', 'תם', 'ה', 'ו'];
  for (const suffix of suffixes) {
    if (root.endsWith(suffix) && root.length > suffix.length + 2) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }

  return root.length >= 2 && root.length <= 4 ? root : cleaned.slice(0, 3);
};

/**
 * Transliterate Hebrew to scholarly Latin script
 * Uses standard academic transliteration (SBL/ALA-LC style)
 */
export const transliterateHebrew = (word) => {
  if (!word || typeof word !== 'string') return '';

  // Hebrew consonant to Latin transliteration map (SBL academic style)
  const consonantMap = {
    'א': 'ʾ', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
    'ו': 'w', 'ז': 'z', 'ח': 'ḥ', 'ט': 'ṭ', 'י': 'y',
    'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
    'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'ʿ', 'פ': 'p',
    'ף': 'p', 'צ': 'ṣ', 'ץ': 'ṣ', 'ק': 'q', 'ר': 'r',
    'שׁ': 'š', 'שׂ': 'ś', 'ש': 'š', 'ת': 't'
  };

  // Vowel points (nikud) to vowel transliteration
  const vowelMap = {
    '\u05B0': 'ə',  // sheva
    '\u05B1': 'ĕ',  // hataf segol
    '\u05B2': 'ă',  // hataf patah
    '\u05B3': 'ŏ',  // hataf qamats
    '\u05B4': 'i',  // hiriq
    '\u05B5': 'ē',  // tsere
    '\u05B6': 'e',  // segol
    '\u05B7': 'a',  // patah
    '\u05B8': 'ā',  // qamats
    '\u05B9': 'ō',  // holam
    '\u05BA': 'ō',  // holam haser
    '\u05BB': 'u',  // qubuts
    '\u05BC': '',   // dagesh (handled separately)
  };

  let result = '';
  const chars = [...word];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Check for shin/sin dots
    if (char === 'ש') {
      const next = chars[i + 1];
      if (next === '\u05C1') { // shin dot
        result += 'š';
        i++;
        continue;
      } else if (next === '\u05C2') { // sin dot
        result += 'ś';
        i++;
        continue;
      }
    }

    // Consonant
    if (consonantMap[char]) {
      result += consonantMap[char];
    }
    // Vowel
    else if (vowelMap[char] !== undefined) {
      result += vowelMap[char];
    }
    // Skip cantillation marks
    else if (char.charCodeAt(0) >= 0x0591 && char.charCodeAt(0) <= 0x05AF) {
      continue;
    }
  }

  return result || cleanWord(word).split('').map(c => consonantMap[c] || c).join('');
};
