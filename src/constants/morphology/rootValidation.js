// =============================================================================
// Validation de racine — isLikelyCompleteRoot, smartPrefixAnalysis,
// getCommonTalmudicRoots (ROOT_MEANINGS via ../data/rootDatabase).
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { ROOT_MEANINGS } from '../../data/rootDatabase';
// Cycle ESM toléré : ROOT_MEANINGS n'est lu qu'à l'appel (jamais au chargement
// du module) — l'import statique est l'état courant hérité du monolithe.
import { STOP_WORDS } from './functionWords';
import { VERB_PATTERNS, ARAMAIC_VERB_PATTERNS, NOUN_PATTERNS } from './patternsData';
import { HEBREW_PREFIX_MEANINGS } from './prefixSuffixData';

export function _getRootMeanings() {
  return ROOT_MEANINGS || {};
}

/**
 * SMART: Check if a word is likely a complete root (not prefix + stem)
 * Uses PATTERN detection instead of hardcoding every word
 *
 * Returns: true if word should NOT be prefix-stripped (it's a complete root)
 *
 * @param {string} word - Hebrew word to check
 * @returns {boolean}
 */
export const isLikelyCompleteRoot = (word) => {
  if (!word || word.length < 3) return false;

  // 1. Check explicit STOP_WORDS first (known exceptions)
  if (STOP_WORDS.has(word)) return true;

  // 2. Check Hebrew verb patterns - these are complete verbs, not prefixed
  for (const pattern of VERB_PATTERNS) {
    if (pattern.test(word)) return true;
  }

  // 2.5 PRO SCHOLAR: Check ARAMAIC verb patterns
  // CRITICAL: In Aramaic, ת/א/מ/נ at the start are conjugation markers, NOT prefixes!
  // Example: תפיק = "you will bring out" (Aphel of נפק), NOT ת + פיק (trembling)
  for (const pattern of ARAMAIC_VERB_PATTERNS) {
    if (pattern.test(word)) return true;
  }

  // ==========================================================================
  // 2.6 PRO SCHOLAR: Check verbs WITH SUFFIXES (THE KEY FIX!)
  // ==========================================================================
  // This solves the תפיקו problem SYSTEMATICALLY:
  //   תפיקו = תפיק + ו (plural suffix)
  //   Without this fix: strips ת → looks up פיקו → finds פיק = "trembling" ❌
  //   With this fix: strips ו → תפיק matches Aramaic pattern → KEEP the ת! ✓
  //
  // This works for ALL suffixed verbs, not just תפיקו:
  //   תסליקו, יפיקו, מפיקין, etc.
  // ==========================================================================
  const VERB_SUFFIXES = ['ו', 'ון', 'ין', 'ן', 'נא', 'נן', 'י', 'ית', 'ת'];
  for (const suffix of VERB_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 3) {
      const stem = word.slice(0, -suffix.length);
      // Check if stem matches Aramaic verb pattern
      for (const pattern of ARAMAIC_VERB_PATTERNS) {
        if (pattern.test(stem)) {
          return true; // Suffixed Aramaic verb - DON'T strip prefix!
        }
      }
      // Also check Hebrew verb patterns
      for (const pattern of VERB_PATTERNS) {
        if (pattern.test(stem)) {
          return true; // Suffixed Hebrew verb
        }
      }
    }
  }

  // 3. Check noun patterns
  for (const pattern of NOUN_PATTERNS) {
    if (pattern.test(word)) return true;
  }

  // 4. SMART HEURISTIC: Words with doubled consonants are often complete
  // Hebrew roots often have gemination (שבת, כבד, etc.)
  const consonants = word.replace(/[אהוי]/g, ''); // Remove matres lectionis
  if (consonants.length >= 3) {
    // Check for repeated consonant (sign of complete root)
    for (let i = 0; i < consonants.length - 1; i++) {
      if (consonants[i] === consonants[i + 1]) {
        return true; // Doubled consonant = likely complete root
      }
    }
  }

  // 5. MINIMUM STEM LENGTH: After stripping one prefix, stem must have 3+ consonants
  // This prevents "שבת" → "בת" (2 consonants = too short)
  if (word.length === 3) {
    const firstLetter = word[0];
    if (['ה', 'ו', 'ב', 'ל', 'מ', 'כ', 'ש', 'ד'].includes(firstLetter)) {
      const stem = word.slice(1);
      // If stem is only 2 letters, the original is likely a complete root
      if (stem.length === 2) {
        return true;
      }
    }
  }

  // 6. PRO SCHOLAR: ARAMAIC EMPHATIC STATE DETECTION
  // Aramaic nouns in the "emphatic state" (definite form) end with א (aleph)
  // These are COMPLETE words and should NOT be prefix-stripped!
  // Examples: מילתא (the thing), גברא (the man), ביתא (the house), עלמא (the world)
  // This pattern catches HUNDREDS of Aramaic nouns automatically
  if (word.length >= 4 && word.endsWith('א')) {
    // Check if it looks like an Aramaic emphatic noun
    // Pattern: At least 4 letters, ending in א, and has a consonant before the א
    const beforeAleph = word[word.length - 2];
    // If the letter before א is a consonant (not a vowel letter), it's likely emphatic
    if (!['א', 'ו', 'י'].includes(beforeAleph)) {
      return true;
    }
  }

  // 6.5 PRO SCHOLAR: ARAMAIC PLURAL DETECTION
  // Aramaic masculine plurals end with ין or י
  // Examples: רבנן (rabbis), תלמידין (students), גברין (men)
  if (word.length >= 4 && (word.endsWith('ין') || word.endsWith('יא'))) {
    return true; // Aramaic plural - complete word
  }

  return false;
};

/**
 * Get the likely root after smart prefix analysis
 * Returns { root, prefix, confidence } or null if no prefix detected
 *
 * @param {string} word - Hebrew word
 * @returns {object|null}
 */
export const smartPrefixAnalysis = (word) => {
  if (!word || word.length < 3) return null;

  // If word is a complete root, don't strip
  if (isLikelyCompleteRoot(word)) {
    return null;
  }

  // Try single prefix
  const firstLetter = word[0];
  if (HEBREW_PREFIX_MEANINGS[firstLetter]) {
    const stem = word.slice(1);

    // Stem must be at least 3 characters for high confidence
    if (stem.length >= 3) {
      // Check if stem itself is a stop word (valid root)
      if (STOP_WORDS.has(stem) || isLikelyCompleteRoot(stem)) {
        return {
          root: stem,
          prefix: firstLetter,
          prefixMeaning: HEBREW_PREFIX_MEANINGS[firstLetter].short,
          confidence: 'high'
        };
      }

      // Stem exists but isn't a known root - lower confidence
      return {
        root: stem,
        prefix: firstLetter,
        prefixMeaning: HEBREW_PREFIX_MEANINGS[firstLetter].short,
        confidence: 'medium'
      };
    }
  }

  return null;
};

// =============================================================================
// PRO SCHOLAR: SMART ROOT EXTRACTION WITH WEAK VERB RECONSTRUCTION
// =============================================================================
// This solves the תפיקו problem WITHOUT hardcoding:
//   1. תפיקו → strip ו suffix → תפיק
//   2. Match Aramaic Aphel pattern → stem is פיק (NOT a valid root alone)
//   3. Reconstruct weak root: Try נ + פק = נפק ← THIS IS THE KEY!
//   4. Validate: נפק exists as common Talmudic root ("go out")
//   5. Result: root is נפק, conjugation is Aphel 2nd plural
// =============================================================================

/**
 * Common Talmudic 3-letter ROOTS (not words!)
 * These are the building blocks - verbs derive from these roots.
 * Used for validation and weak verb reconstruction.
 *
 * ROOT_MEANINGS is now imported from ../data/rootDatabase.js
 * which contains 200+ roots with:
 * - Etymology (Proto-Semitic origins)
 * - Cognates (Arabic, Akkadian, Syriac, Ugaritic)
 * - Frequency data (Tanakh vs Talmud occurrences)
 * - Semantic field classifications
 */

// Set of valid roots (for quick validation) - lazily initialized
let _COMMON_TALMUDIC_ROOTS = null;
export function getCommonTalmudicRoots() {
  if (!_COMMON_TALMUDIC_ROOTS) {
    _COMMON_TALMUDIC_ROOTS = new Set(Object.keys(_getRootMeanings()));
  }
  return _COMMON_TALMUDIC_ROOTS;
}
