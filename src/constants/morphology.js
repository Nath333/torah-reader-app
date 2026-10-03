// =============================================================================
// Centralized Hebrew/Aramaic Morphology Constants
// Single source of truth for prefix/suffix handling across the app
// =============================================================================

// PRO SCHOLAR V12: Centralized Hebrew text utilities (DRY)
import { stripAllDiacritics } from '../utils/hebrewUtils';
import { STOP_WORDS, isStopWord, FUNCTION_WORDS, lookupFunctionWord } from './morphology/functionWords';

// Découpage 03/10/2026 : ces noms vivent dans ./morphology/functionWords
export { STOP_WORDS, isStopWord, FUNCTION_WORDS, lookupFunctionWord };

// Cycle ESM toléré : ROOT_MEANINGS n'est lu qu'à l'appel (jamais au chargement
// du module) — le require() CJS hérité de CRA plantait sous Vite/rollup.
import { ROOT_MEANINGS } from '../data/rootDatabase';
function _getRootMeanings() {
  return ROOT_MEANINGS || {};
}

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


// =============================================================================
// SMART PATTERN-BASED ROOT DETECTION
// Instead of hardcoding every word, detect patterns that indicate complete roots
// This is the PRO SCHOLAR approach - systematic, not hardcoded
// =============================================================================

/**
 * Hebrew verb patterns (binyanim) - these indicate the word is a complete verb
 * Pattern: X = any consonant, vowels vary by binyan
 */
const VERB_PATTERNS = [
  // HIFIL patterns (starts with ה but is a verb form, not prefix)
  /^ה[א-ת][א-ת][א-ת]$/,  // הגיד, הביא, הכניס (Hifil past 3ms)
  /^מ[א-ת][א-ת][א-ת]$/,  // מגיד, מביא (Hifil participle)
  /^ת[א-ת][א-ת][א-ת]$/,  // תגיד, תביא (Hifil future 2ms/3fs)
  // HITPAEL patterns (starts with הת)
  /^הת[א-ת][א-ת][א-ת]$/,  // התפלל, התקדש
  // NIFAL patterns (starts with נ)
  /^נ[א-ת][א-ת][א-ת]$/,  // נתן, נפל (Nifal/some Qal)
  // PIEL/PUAL patterns (middle letter doubled - approximation)
  /^[א-ת][א-ת][א-ת][א-ת]$/,  // 4-letter = likely intensive form
];

// =============================================================================
// ARAMAIC VERB PATTERNS (PRO SCHOLAR)
// =============================================================================
// CRITICAL: In Aramaic, ת/א/מ/נ at the start of verbs are CONJUGATION MARKERS,
// NOT Hebrew prefixes! This is why תפיק gets incorrectly parsed as ת+פיק.
//
// Aramaic verb conjugation uses these prefixes:
// - ת = 2nd person (you) / 3rd feminine / future
// - א = 1st person singular (I)
// - מ = participle (one who...)
// - נ = 1st person plural (we)
// - י = 3rd person masculine
//
// Example: תפיק (from root נפק "go out" in Aphel form)
// - NOT: ת (Hebrew "the") + פיק (trembling)
// - IS: Aramaic "you will bring out" (causative of "go out")
// =============================================================================

const ARAMAIC_VERB_PATTERNS = [
  // === APHEL/AFEL (Causative) - Most common Aramaic pattern ===
  // Like Hebrew Hifil. Pattern: *פע*יל or *פי*ק
  // These have vowel י in middle and start with conjugation prefix
  /^[תאמני][א-ת][יו][א-ת]$/,  // תפיק, אפיק, מפיק, נפיק, יפיק (4 letters with י)
  /^[תאמני][א-ת][א-ת][יו][א-ת]$/,  // תסליק, אסליק (5 letters with י)

  // === PEAL (Basic) ===
  // Like Hebrew Qal. Basic triliteral root.
  // In perfect: כתב, אמר. In imperfect: יכתוב, תכתוב, אכתוב
  /^[תאמני][א-ת][ו][א-ת]$/,  // תכתוב, אכתוב (imperfect with ו)

  // === PAEL (Intensive) ===
  // Like Hebrew Piel. Middle radical doubled (shown by dagesh, not visible)
  // Pattern: קט*ל or in imperfect: מקט*ל
  /^[מתא][א-ת][א-ת][א-ת][א-ת]$/,  // מקטרג, מפרנס (Pael participle)

  // === ITHPEEL (Reflexive) ===
  // Like Hebrew Hitpael. Starts with את/אית
  /^א[תי][א-ת][א-ת][א-ת]$/,  // אתפעל, אתקדש (5 letters starting with את)
  /^מ[תי][א-ת][א-ת][א-ת]$/,  // מתפעל (Ithpeel participle)

  // === ITHPAAL ===
  // Reflexive of Pael
  /^א[תי][א-ת][א-ת][א-ת][א-ת]$/,  // אתפרנס (6 letters)

  // === SHAPHEL (Causative variant) ===
  // Starts with ש
  /^ש[א-ת][א-ת][א-ת]$/,  // שעבד, שלים (Shaphel)

  // === Common Aramaic perfect endings ===
  // Past tense 3rd person masculine with ת ending
  /^[א-ת][א-ת][א-ת]ת$/,  // אמרת, כתבת (he said/wrote - perfect with ת)
];

/**
 * Noun patterns that look prefixed but are complete words
 * These are morphological patterns (mishkal/mishkalim)
 */
const NOUN_PATTERNS = [
  // מקטל pattern - Nouns starting with מ (place/instrument)
  // מזבח (altar), משכן (tabernacle), מקדש (sanctuary), מלאכה (work)
  /^מ[א-ת][א-ת][א-ת]ה?$/,
  // הקטלה pattern - Abstract nouns starting with ה
  // הלכה, הכנסה, הוצאה, הגדה
  /^ה[א-ת][א-ת][א-ת]ה$/,
  // שקטל pattern - Nouns starting with ש (not relative pronoun)
  // שבת, שלום, שמים - when followed by certain patterns
  /^ש[מנלרבכ][א-ת][א-ת]$/,  // Common shin-root nouns
];

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
function getCommonTalmudicRoots() {
  if (!_COMMON_TALMUDIC_ROOTS) {
    _COMMON_TALMUDIC_ROOTS = new Set(Object.keys(_getRootMeanings()));
  }
  return _COMMON_TALMUDIC_ROOTS;
}

// =============================================================================
// CONJUGATION RULES - Maps prefixes/suffixes to person/number
// Used to COMPUTE translations systematically
// =============================================================================
// SINGLE SOURCE OF TRUTH for conjugation display labels
// =============================================================================

// IMPERFECT (prefix) conjugations - ת/א/נ/י/מ
export const CONJUGATION_PREFIXES = {
  // Imperfect tense prefixes
  'ת': { person: '2nd', label: 'you', meaning: 'you', tense: 'imperfect' },
  'א': { person: '1st', label: 'I', meaning: 'I', tense: 'imperfect' },
  'נ': { person: '1st-pl', label: 'we', meaning: 'we', tense: 'imperfect' },
  'י': { person: '3rd-m', label: 'he/they', meaning: 'he', tense: 'imperfect' },
  // Participle prefix
  'מ': { person: 'participle', label: 'participle', meaning: 'one who', tense: 'participle' },
  // Infinitive prefix
  'ל': { person: 'infinitive', label: 'infinitive', meaning: 'to', tense: 'infinitive' },
  // Ithpeel/Ithpaal reflexive prefix
  'את': { person: 'reflexive', label: 'reflexive', meaning: 'oneself', tense: 'reflexive' },
};

// PERFECT (suffix) conjugations + number/gender suffixes
export const CONJUGATION_SUFFIXES = {
  // Number/gender suffixes (imperfect)
  'ו': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp' },
  'ון': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp/2mp' },
  'ין': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp' },
  'י': { number: 'feminine', label: 'feminine', shortLabel: '(f)', person: '2fs' },
  'ת': { number: 'feminine', label: 'feminine', shortLabel: '(f)', person: '3fs' },
  'ה': { number: 'feminine/3fs', label: 'feminine/3fs', shortLabel: '(f/3fs)', person: '3fs' },
  'נא': { number: 'emphatic', label: 'emphatic', shortLabel: '', person: '' },
  '': { number: 'singular', label: 'singular', shortLabel: '', person: '3ms' },
  // Perfect tense suffixes (use suffix + _perf to avoid duplicate keys)
  'ית': { number: 'perfect-1s', label: 'I (perf)', shortLabel: '(1s)', person: '1s', tense: 'perfect' },
  'ת_perf': { number: 'perfect-2ms', label: 'you (perf)', shortLabel: '(2ms)', person: '2ms', tense: 'perfect', suffix: 'ת' },
  'תון': { number: 'perfect-2mp', label: 'you (perf)', shortLabel: '(2mp)', person: '2mp', tense: 'perfect' },
  'נן': { number: 'perfect-1p', label: 'we (perf)', shortLabel: '(1p)', person: '1p', tense: 'perfect' },
  // Object suffixes (pronominal) - use suffix + _obj to avoid duplicate keys
  'ני': { number: 'object', label: 'me', shortLabel: '+me', person: 'object-1s' },
  'ך': { number: 'object', label: 'you', shortLabel: '+you', person: 'object-2ms' },
  'יה': { number: 'object', label: 'him', shortLabel: '+him', person: 'object-3ms' },
  'ה_obj': { number: 'object', label: 'her', shortLabel: '+her', person: 'object-3fs', suffix: 'ה' },
  'נא_obj': { number: 'object', label: 'us', shortLabel: '+us', person: 'object-1p', suffix: 'נא' },
  'כון': { number: 'object', label: 'you(pl)', shortLabel: '+you', person: 'object-2mp' },
  'הון': { number: 'object', label: 'them', shortLabel: '+them', person: 'object-3mp' },
};

// =============================================================================
// ARAMAIC BINYANIM (verb stems/patterns)
// =============================================================================
export const ARAMAIC_BINYANIM = {
  // Active stems
  'peal': {
    name: 'Peal',
    hebrewName: 'פְּעַל',
    type: 'basic',
    meaning: 'simple active',
    hebrewEquivalent: 'Qal',
    markers: [],
    description: 'Basic active stem (like Hebrew Qal)'
  },
  'pael': {
    name: 'Pael',
    hebrewName: 'פַּעֵל',
    type: 'intensive',
    meaning: 'intensive active',
    hebrewEquivalent: "Piel",
    markers: ['doubled middle letter'],
    description: 'Intensive stem with doubled middle radical'
  },
  'aphel': {
    name: 'Aphel',
    hebrewName: 'אַפְעֵל',
    type: 'causative',
    meaning: 'causative',
    hebrewEquivalent: "Hiphil",
    markers: ['א prefix', 'הi vowel pattern'],
    description: 'Causative stem (like Hebrew Hiphil)'
  },
  'shafel': {
    name: 'Shafel',
    hebrewName: 'שַׁפְעֵל',
    type: 'causative',
    meaning: 'causative (rare)',
    hebrewEquivalent: 'Hiphil',
    markers: ['שׁ prefix'],
    description: 'Rare causative form with shin prefix'
  },
  // Passive/reflexive stems
  'ithpeel': {
    name: 'Ithpeel',
    hebrewName: 'אִתְפְּעֵל',
    type: 'reflexive',
    meaning: 'reflexive of Peal',
    hebrewEquivalent: 'Niphal/Hitpael',
    markers: ['אית/את prefix'],
    description: 'Reflexive/passive of Peal'
  },
  'ithpaal': {
    name: 'Ithpaal',
    hebrewName: 'אִתְפַּעַל',
    type: 'reflexive-intensive',
    meaning: 'reflexive of Pael',
    hebrewEquivalent: 'Hitpael',
    markers: ['אית/את prefix', 'doubled middle'],
    description: 'Reflexive of Pael (intensive)'
  },
  'ittaphal': {
    name: 'Ittaphal',
    hebrewName: 'אִתַּפְעַל',
    type: 'passive-causative',
    meaning: 'passive of Aphel',
    hebrewEquivalent: 'Hophal',
    markers: ['אית prefix with t'],
    description: 'Passive of Aphel (causative passive)'
  }
};

// =============================================================================
// WEAK VERB CLASSIFICATIONS
// =============================================================================
export const WEAK_VERB_TYPES = {
  'pe-nun': {
    name: 'Pe-Nun',
    hebrewName: 'פ״נ',
    description: 'First root letter is נ (assimilates)',
    examples: ['נפק', 'נתן', 'נפל', 'נגע', 'נטל'],
    behavior: 'נ assimilates into following letter with dagesh'
  },
  'pe-aleph': {
    name: 'Pe-Aleph',
    hebrewName: 'פ״א',
    description: 'First root letter is א',
    examples: ['אמר', 'אכל', 'אבד', 'אחז', 'אסר'],
    behavior: 'א may quiesce or cause vowel changes'
  },
  'pe-yod': {
    name: 'Pe-Yod',
    hebrewName: 'פ״י',
    description: 'First root letter is י (often from original ו)',
    examples: ['ידע', 'ילד', 'ישב', 'יצא', 'ירד'],
    behavior: 'י may drop or shift to ו'
  },
  'hollow': {
    name: 'Hollow/Ayin-Vav-Yod',
    hebrewName: 'ע״ו / ע״י',
    description: 'Middle root letter is ו or י',
    examples: ['קום', 'שים', 'בוא', 'שוב', 'דין'],
    behavior: 'Middle letter contracts or lengthens'
  },
  'geminate': {
    name: 'Geminate/Double-Ayin',
    hebrewName: 'ע״ע',
    description: 'Second and third root letters are identical',
    examples: ['סבב', 'חלל', 'קלל', 'גלל', 'רנן'],
    behavior: 'Doubled letter may simplify or assimilate'
  },
  'lamed-he': {
    name: 'Lamed-He',
    hebrewName: 'ל״ה',
    description: 'Third root letter is ה (often from original ו/י)',
    examples: ['עשה', 'ראה', 'בנה', 'קנה', 'גלה'],
    behavior: 'Final ה alternates with ת/י in conjugation'
  },
  'lamed-aleph': {
    name: 'Lamed-Aleph',
    hebrewName: 'ל״א',
    description: 'Third root letter is א',
    examples: ['קרא', 'מצא', 'ברא', 'נשא', 'מלא'],
    behavior: 'א often quiesces, affects vowel pattern'
  }
};

/**
 * Get display label for conjugation prefix
 * @param {string} prefix - Hebrew prefix character
 * @returns {string} Display label (e.g., 'you', 'I', 'we')
 */
export const getConjugationPrefixLabel = (prefix) => {
  return CONJUGATION_PREFIXES[prefix]?.label || 'prefix';
};

/**
 * Get display label for conjugation suffix
 * @param {string} suffix - Hebrew suffix character(s)
 * @returns {string} Display label (e.g., 'plural', 'feminine')
 */
export const getConjugationSuffixLabel = (suffix) => {
  return CONJUGATION_SUFFIXES[suffix]?.label || 'suffix';
};

/**
 * COMPUTE translation from pattern analysis (NOT hardcoded!)
 * @param {Object} rootAnalysis - Result from extractAramaicRoot
 * @returns {string} - Computed translation like "you (pl) bring out"
 */
export const computeVerbTranslation = (rootAnalysis) => {
  if (!rootAnalysis || !rootAnalysis.root) return null;

  const rootMeaning = _getRootMeanings()[rootAnalysis.root];
  if (!rootMeaning) return null;

  // Get base or causative meaning based on pattern
  // PRO SCHOLAR V6.2: Check both Aramaic (Aphel) and Hebrew (Hifil) causatives
  const isCausative = rootAnalysis.pattern?.includes('Aphel') ||
                      rootAnalysis.pattern?.includes('causative') ||
                      rootAnalysis.pattern?.includes('Hifil') ||
                      rootAnalysis.pattern?.includes('HIFIL') ||
                      rootAnalysis.binyan === 'HIFIL' ||
                      rootAnalysis.binyan === 'Hifil';
  const verbMeaning = isCausative
    ? (rootMeaning.causative || rootMeaning.base)
    : rootMeaning.base;

  // Get person from conjugation prefix
  const conjPrefix = CONJUGATION_PREFIXES[rootAnalysis.conjugationPrefix];
  const personLabel = conjPrefix?.label || '';

  // Get number from suffix (use shortLabel for compact display in translations)
  const conjSuffix = CONJUGATION_SUFFIXES[rootAnalysis.suffix] ||
                     CONJUGATION_SUFFIXES[''];
  const numberLabel = conjSuffix?.shortLabel || '';

  // Build translation: "you (pl) bring out"
  const parts = [personLabel, numberLabel, verbMeaning].filter(Boolean);
  return parts.join(' ').trim();
};

/**
 * Extract TRUE ROOT from Aramaic verb with weak verb reconstruction
 *
 * Key insight: Pe-Nun verbs (פ"נ) lose their first letter in conjugation
 * Example: נפק → Aphel imperfect: תפיק (the נ disappears!)
 *
 * @param {string} word - The verb form (e.g., תפיקו)
 * @returns {Object} - { root, pattern, confidence, conjugation }
 */
/**
 * ENHANCED Aramaic Root Extraction - PRO SCHOLAR Edition
 *
 * Handles ALL 7 weak verb types:
 * - Pe-Nun (פ"נ): first נ assimilates
 * - Pe-Aleph (פ"א): first א quiesces
 * - Pe-Yod (פ"י): first י drops/shifts
 * - Hollow (ע"ו/ע"י): middle letter contracts
 * - Geminate (ע"ע): doubled letter simplifies
 * - Lamed-He (ל"ה): final ה alternates
 * - Lamed-Aleph (ל"א): final א quiesces
 *
 * Detects Aramaic binyanim:
 * - Peal, Pael, Aphel, Ithpeel, Ithpaal, Ittaphal, Shafel
 *
 * @param {string} word - Word to analyze
 * @returns {Object|null} Root analysis with confidence
 */
export const extractAramaicRoot = (word) => {
  if (!word || word.length < 2) return null;

  // Comprehensive suffix list (ordered by length for greedy matching)
  const ARAMAIC_SUFFIXES = [
    'תון', 'הון', 'כון',  // 3-letter
    'ון', 'ין', 'נא', 'נן', 'ית', 'יה',  // 2-letter
    'ו', 'ן', 'י', 'ת', 'ה', 'ך'  // 1-letter
  ];

  const ARAMAIC_CONJ_PREFIXES = ['ת', 'א', 'מ', 'נ', 'י', 'ל'];

  // Reflexive prefixes (Ithpeel/Ithpaal)
  const REFLEXIVE_PREFIXES = ['את', 'אית', 'אש', 'אשת'];

  // Step 1: Check for reflexive prefix (Ithpeel/Ithpaal/Ittaphal)
  let binyan = null;
  let reflexivePrefix = '';
  let workingWord = word;

  for (const refPre of REFLEXIVE_PREFIXES) {
    if (word.startsWith(refPre) && word.length > refPre.length + 2) {
      reflexivePrefix = refPre;
      workingWord = word.slice(refPre.length);
      binyan = refPre.includes('ש') ? 'ittaphal' : 'ithpeel';
      break;
    }
  }

  // Step 2: Strip suffix
  let stem = workingWord;
  let suffix = '';
  for (const suf of ARAMAIC_SUFFIXES) {
    if (workingWord.endsWith(suf) && workingWord.length > suf.length + 2) {
      stem = workingWord.slice(0, -suf.length);
      suffix = suf;
      break;
    }
  }

  // Step 3: Strip conjugation prefix
  let conjPrefix = '';
  let verbStem = stem;

  if (ARAMAIC_CONJ_PREFIXES.includes(stem[0]) && stem.length >= 3) {
    conjPrefix = stem[0];
    verbStem = stem.slice(1);
  }

  // Step 4: Detect doubled middle letter (Pael pattern)
  if (verbStem.length >= 3 && verbStem[1] === verbStem[2]) {
    // Pael: doubled middle = intensive
    binyan = binyan || 'pael';
  }

  // Step 5: Try to reconstruct root from various weak verb patterns

  // Helper to enhance result with ROOT_MEANINGS data
  const enhanceWithRootData = (result) => {
    const rootInfo = _getRootMeanings()[result.root];
    if (rootInfo) {
      result.rootMeaning = rootInfo.base;
      result.causativeMeaning = rootInfo.causative;
      result.etymology = rootInfo.etymology;
      result.cognates = rootInfo.cognates;
      result.frequency = rootInfo.frequency;
      result.semanticField = rootInfo.semanticField;
      // Boost confidence if root has high Talmud frequency
      if (rootInfo.frequency?.talmud > 500) {
        result.confidence = Math.min(95, result.confidence + 5);
      }
      // Use weakType from ROOT_MEANINGS if available
      if (rootInfo.weakType && !result.weakType) {
        result.weakType = WEAK_VERB_TYPES[rootInfo.weakType]?.hebrewName || rootInfo.weakType;
      }
    }
    // Add binyan info
    if (result.binyan && ARAMAIC_BINYANIM[result.binyan]) {
      result.binyanInfo = ARAMAIC_BINYANIM[result.binyan];
    }
    return result;
  };

  // ==========================================================================
  // WEAK VERB RECONSTRUCTION STRATEGIES
  // ==========================================================================

  // Strategy A: Pe-Nun (פ"נ) - first נ assimilates
  // Pattern: CיC or CוC where first radical dropped
  if (verbStem.length === 3 && ['י', 'ו'].includes(verbStem[1])) {
    const c1 = verbStem[0];
    const c3 = verbStem[2];
    const reconstructedNun = 'נ' + c1 + c3;

    if (getCommonTalmudicRoots().has(reconstructedNun)) {
      return enhanceWithRootData({
        root: reconstructedNun,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Aphel (causative)',
        binyan: binyan || 'aphel',
        weakType: 'פ"נ (Pe-Nun)',
        confidence: 85,
        explanation: `Root ${reconstructedNun} - first נ assimilated`
      });
    }
  }

  // Strategy B: Pe-Yod (פ"י) - first י drops
  if (verbStem.length === 3 && ['י', 'ו'].includes(verbStem[1])) {
    const c1 = verbStem[0];
    const c3 = verbStem[2];
    const reconstructedYod = 'י' + c1 + c3;

    if (getCommonTalmudicRoots().has(reconstructedYod)) {
      return enhanceWithRootData({
        root: reconstructedYod,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Aphel (causative)',
        binyan: binyan || 'aphel',
        weakType: 'פ"י (Pe-Yod)',
        confidence: 80,
        explanation: `Root ${reconstructedYod} - first י dropped`
      });
    }
  }

  // Strategy C: Pe-Aleph (פ"א) - first א quiesces
  if (verbStem.length >= 2) {
    // Try adding א at beginning
    const reconstructedAleph = 'א' + verbStem.slice(0, 2);

    if (getCommonTalmudicRoots().has(reconstructedAleph)) {
      return enhanceWithRootData({
        root: reconstructedAleph,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: conjPrefix ? 'conjugated' : 'Peal',
        binyan: binyan || 'peal',
        weakType: 'פ"א (Pe-Aleph)',
        confidence: 75,
        explanation: `Root ${reconstructedAleph} - first א quiesced`
      });
    }
  }

  // Strategy D: Hollow verbs (ע"ו / ע"י) - middle letter contracts
  if (verbStem.length === 2) {
    const c1 = verbStem[0];
    const c2 = verbStem[1];

    // Try ו middle
    const hollowVav = c1 + 'ו' + c2;
    if (getCommonTalmudicRoots().has(hollowVav)) {
      return enhanceWithRootData({
        root: hollowVav,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'hollow verb',
        binyan: binyan || 'peal',
        weakType: 'ע"ו (Hollow-Vav)',
        confidence: 78,
        explanation: `Root ${hollowVav} - middle ו contracted`
      });
    }

    // Try י middle
    const hollowYod = c1 + 'י' + c2;
    if (getCommonTalmudicRoots().has(hollowYod)) {
      return enhanceWithRootData({
        root: hollowYod,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'hollow verb',
        binyan: binyan || 'peal',
        weakType: 'ע"י (Hollow-Yod)',
        confidence: 75,
        explanation: `Root ${hollowYod} - middle י contracted`
      });
    }
  }

  // Strategy E: Geminate verbs (ע"ע) - doubled letter simplifies
  if (verbStem.length === 2) {
    // The doubled letter might have simplified to single
    const geminate = verbStem[0] + verbStem[1] + verbStem[1];
    if (getCommonTalmudicRoots().has(geminate)) {
      return enhanceWithRootData({
        root: geminate,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'geminate verb',
        binyan: binyan || 'peal',
        weakType: 'ע"ע (Geminate)',
        confidence: 72,
        explanation: `Root ${geminate} - doubled letter simplified`
      });
    }
  }

  // Strategy F: Lamed-He (ל"ה) - final ה alternates with ת/י
  if (verbStem.length >= 2 && ['ת', 'י', 'ה'].includes(verbStem[verbStem.length - 1])) {
    const lamedHe = verbStem.slice(0, -1) + 'ה';
    if (lamedHe.length === 3 && getCommonTalmudicRoots().has(lamedHe)) {
      return enhanceWithRootData({
        root: lamedHe,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Lamed-He verb',
        binyan: binyan || 'peal',
        weakType: 'ל"ה (Lamed-He)',
        confidence: 76,
        explanation: `Root ${lamedHe} - final ה alternated`
      });
    }
  }

  // Strategy G: Lamed-Aleph (ל"א) - final א quiesces
  if (verbStem.length >= 2) {
    const lamedAleph = verbStem.slice(0, 2) + 'א';
    if (getCommonTalmudicRoots().has(lamedAleph)) {
      return enhanceWithRootData({
        root: lamedAleph,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Lamed-Aleph verb',
        binyan: binyan || 'peal',
        weakType: 'ל"א (Lamed-Aleph)',
        confidence: 74,
        explanation: `Root ${lamedAleph} - final א quiesced`
      });
    }
  }

  // Strategy H: Direct match (strong verb or already 3-letter root)
  if (verbStem.length === 3 && getCommonTalmudicRoots().has(verbStem)) {
    // Determine binyan from context
    const detectedBinyan = binyan ||
      (conjPrefix === 'מ' ? 'peal' : // participle
       conjPrefix === 'א' && verbStem[0] === verbStem[1] ? 'pael' : // doubled = Pael
       conjPrefix ? 'peal' : 'peal');

    return enhanceWithRootData({
      root: verbStem,
      conjugationPrefix: conjPrefix,
      reflexivePrefix,
      suffix,
      pattern: reflexivePrefix ? 'reflexive' : (conjPrefix ? 'conjugated' : 'root form'),
      binyan: detectedBinyan,
      confidence: 80
    });
  }

  // Strategy I: Try the original word without stripping (it might be the root)
  if (word.length === 3 && getCommonTalmudicRoots().has(word)) {
    return enhanceWithRootData({
      root: word,
      pattern: 'root form',
      binyan: 'peal',
      confidence: 90
    });
  }

  // No match found
  return null;
};

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

// =============================================================================
// PRO SCHOLAR: CONFIDENCE-BASED MORPHOLOGY ANALYSIS
// =============================================================================
// Instead of binary yes/no decisions, this system returns:
// - Multiple interpretations with confidence scores (0-100)
// - Pattern-based detection (not just hardcoded lists)
// - Weak verb detection (א, ה, ו, י, נ roots)
// - Abbreviation detection
// - Ambiguity handling (all possibilities ranked)
// =============================================================================

/**
 * Weak verb root letters - these can drop/change in conjugations
 * This is crucial for accurate morphology analysis
 */
const WEAK_VERB_LETTERS = {
  'א': 'guttural',   // Aleph - often quiesces (becomes silent)
  'ה': 'guttural',   // He - often drops, especially in Hifil
  'ח': 'guttural',   // Chet - affects vowel patterns
  'ע': 'guttural',   // Ayin - affects vowel patterns
  'ו': 'hollow',     // Vav - middle weak (קום, שים, בוא)
  'י': 'hollow',     // Yod - middle weak, initial weak (ישב, ילד)
  'נ': 'assimilating', // Nun - assimilates into following letter (נתן → תן)
};

/**
 * Detect if a word might be from a weak verb root
 * Returns { isWeak, type, possibleRoots }
 */
const detectWeakVerb = (word) => {
  if (!word || word.length < 2) return { isWeak: false };

  const results = [];

  // Check if word contains weak letters (for metadata)
  const weakLettersInWord = [...word].filter(c => WEAK_VERB_LETTERS[c]);
  const hasGuttural = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'guttural');
  const hasHollow = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'hollow');
  const hasAssimilating = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'assimilating');

  // Check for nun-assimilation (initial nun dropped)
  // Pattern: If word starts with doubled consonant, original might have נ
  // Example: תן (give!) from נתן, גש (approach!) from נגש
  if (word.length >= 2) {
    const possibleNunRoot = 'נ' + word;
    results.push({
      type: 'nun-assimilating',
      originalRoot: possibleNunRoot,
      confidence: 40, // Low confidence - needs dictionary verification
      reason: 'Possible נ assimilation'
    });
  }

  // Check for hollow verbs (middle ו/י dropped)
  // Pattern: 2-letter stem might be from 3-letter hollow root
  // Example: קם (stood) from קום, שם (put) from שים
  if (word.length === 2) {
    results.push({
      type: 'hollow-vav',
      originalRoot: word[0] + 'ו' + word[1],
      confidence: 50,
      reason: 'Possible hollow verb (middle ו)'
    });
    results.push({
      type: 'hollow-yod',
      originalRoot: word[0] + 'י' + word[1],
      confidence: 45,
      reason: 'Possible hollow verb (middle י)'
    });
  }

  // Check for initial yod verbs (yod might have dropped)
  // Pattern: Forms that start with conjugation prefix + 2 letters
  // Example: תשב (you sit) from ישב - yod dropped
  const conjPrefixes = ['א', 'ת', 'י', 'נ', 'מ'];
  if (word.length >= 3 && conjPrefixes.includes(word[0])) {
    const stem = word.slice(1);
    if (stem.length === 2) {
      results.push({
        type: 'initial-yod',
        originalRoot: 'י' + stem,
        confidence: 55,
        reason: 'Possible initial י verb'
      });
    }
  }

  // Check for he-ending verbs (lamed-he verbs)
  // Pattern: Root ends with ה which changes to י/ת in conjugations
  // Example: בנה (build), עשה (do), ראה (see)
  if (word.endsWith('ה') && word.length >= 3) {
    results.push({
      type: 'lamed-he',
      originalRoot: word,
      confidence: 60,
      reason: 'Lamed-ה verb (ה as third radical)'
    });
  }

  // Check if word ends with ית/ות (feminine/abstract from lamed-he)
  if (word.endsWith('ית') || word.endsWith('ות')) {
    const stem = word.slice(0, -2);
    if (stem.length >= 2) {
      results.push({
        type: 'lamed-he-derived',
        originalRoot: stem + 'ה',
        confidence: 55,
        reason: 'Derived from lamed-ה verb'
      });
    }
  }

  return {
    isWeak: results.length > 0 || weakLettersInWord.length > 0,
    possibilities: results,
    metadata: {
      weakLettersFound: weakLettersInWord,
      hasGuttural,
      hasHollow,
      hasAssimilating
    }
  };
};

/**
 * Detect if a word is an abbreviation
 * Returns { isAbbreviation, expansion, confidence }
 */
const detectAbbreviation = (word) => {
  if (!word) return { isAbbreviation: false };

  const results = [];

  // Check for geresh (') - common abbreviation marker
  // Example: ר' = רבי (Rabbi), ה' = השם (God's name)
  if (word.includes("'") || word.includes('׳')) {
    const parts = word.split(/[׳']/);
    results.push({
      type: 'geresh-abbreviation',
      confidence: 85,
      reason: 'Contains geresh (abbreviation marker)',
      letters: parts[0]
    });
  }

  // Check for gershayim (") - acronym marker
  // Example: רש"י = רבי שלמה יצחקי, ב"ה = בית הלל
  if (word.includes('"') || word.includes('״')) {
    results.push({
      type: 'acronym',
      confidence: 90,
      reason: 'Contains gershayim (acronym marker)',
      letters: word.replace(/[״"]/g, '')
    });
  }

  // Common single-letter abbreviations in context
  const singleLetterAbbrevs = {
    'ר': { expansion: 'רבי', meaning: 'Rabbi' },
    'ד': { expansion: 'דף', meaning: 'page' },
    'פ': { expansion: 'פרק', meaning: 'chapter' },
    'ע': { expansion: 'עמוד', meaning: 'column/page' },
    'ג': { expansion: 'גמרא', meaning: 'Gemara' },
    'מ': { expansion: 'משנה', meaning: 'Mishnah' },
  };

  if (word.length === 1 && singleLetterAbbrevs[word]) {
    const abbrev = singleLetterAbbrevs[word];
    results.push({
      type: 'single-letter',
      expansion: abbrev.expansion,
      meaning: abbrev.meaning,
      confidence: 70, // Medium - depends on context
      reason: 'Single letter (common abbreviation)'
    });
  }

  return {
    isAbbreviation: results.length > 0,
    possibilities: results
  };
};

/**
 * PRO SCHOLAR: Comprehensive word analysis with confidence scores
 * Returns ALL possible interpretations ranked by confidence
 *
 * @param {string} word - Hebrew/Aramaic word to analyze
 * @param {object} options - { context: 'talmudic'|'biblical'|'mixed' }
 * @returns {object} - { interpretations: [...], bestGuess: {...}, metadata: {...} }
 */
export const analyzeWordWithConfidence = (word, options = {}) => {
  if (!word || word.length === 0) {
    return { interpretations: [], bestGuess: null, metadata: { error: 'Empty word' } };
  }

  const context = options.context || 'mixed';
  const interpretations = [];

  // Clean word (remove nikud for analysis) - use hebrewUtils (DRY)
  const cleanWord = stripAllDiacritics(word);

  // =========================================================================
  // LAYER 1: Check for abbreviations FIRST
  // =========================================================================
  const abbrevResult = detectAbbreviation(cleanWord);
  if (abbrevResult.isAbbreviation) {
    for (const poss of abbrevResult.possibilities) {
      interpretations.push({
        type: 'abbreviation',
        word: cleanWord,
        interpretation: poss.expansion || 'abbreviated form',
        confidence: poss.confidence,
        reason: poss.reason,
        source: 'pattern-detection'
      });
    }
  }

  // =========================================================================
  // LAYER 2: Check FUNCTION_WORDS (known common words)
  // =========================================================================
  if (FUNCTION_WORDS[cleanWord]) {
    interpretations.push({
      type: 'function-word',
      word: cleanWord,
      interpretation: FUNCTION_WORDS[cleanWord],
      confidence: 95,
      reason: 'Known function word',
      source: 'curated-list'
    });
  }

  // =========================================================================
  // LAYER 3: Check STOP_WORDS (complete words that shouldn't be parsed)
  // =========================================================================
  if (STOP_WORDS.has(cleanWord)) {
    interpretations.push({
      type: 'complete-word',
      word: cleanWord,
      interpretation: cleanWord,
      confidence: 90,
      reason: 'Known complete word (stop word)',
      source: 'curated-list'
    });
  }

  // =========================================================================
  // LAYER 4: Pattern-based detection (SYSTEMATIC - replaces hardcoding)
  // =========================================================================

  // 4a. Aramaic emphatic state (ends with א)
  if (cleanWord.length >= 4 && cleanWord.endsWith('א')) {
    const beforeAleph = cleanWord[cleanWord.length - 2];
    if (!['א', 'ו', 'י'].includes(beforeAleph)) {
      interpretations.push({
        type: 'aramaic-emphatic',
        word: cleanWord,
        interpretation: cleanWord + ' (definite)',
        confidence: 75,
        reason: 'Aramaic emphatic state (ends with א)',
        source: 'pattern-detection'
      });
    }
  }

  // 4b. Aramaic plural (ends with ין, יא, ן)
  if (cleanWord.length >= 4) {
    if (cleanWord.endsWith('ין')) {
      interpretations.push({
        type: 'aramaic-plural',
        word: cleanWord,
        interpretation: cleanWord.slice(0, -2) + ' (plural)',
        confidence: 70,
        reason: 'Aramaic masculine plural ending',
        source: 'pattern-detection'
      });
    }
    if (cleanWord.endsWith('ן') && !cleanWord.endsWith('ין')) {
      interpretations.push({
        type: 'aramaic-plural-short',
        word: cleanWord,
        interpretation: cleanWord.slice(0, -1) + ' (plural)',
        confidence: 60,
        reason: 'Aramaic plural (short form)',
        source: 'pattern-detection'
      });
    }
  }

  // 4c. Hebrew verb patterns
  for (const pattern of VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'hebrew-verb',
        word: cleanWord,
        interpretation: cleanWord + ' (verb form)',
        confidence: 70,
        reason: 'Matches Hebrew verb pattern',
        source: 'pattern-detection'
      });
      break; // Only add once
    }
  }

  // 4d. Aramaic verb patterns
  for (const pattern of ARAMAIC_VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'aramaic-verb',
        word: cleanWord,
        interpretation: cleanWord + ' (Aramaic verb)',
        confidence: context === 'talmudic' ? 80 : 65,
        reason: 'Matches Aramaic verb pattern',
        source: 'pattern-detection'
      });
      break;
    }
  }

  // 4e. Noun patterns (mishkalim)
  for (const pattern of NOUN_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'hebrew-noun',
        word: cleanWord,
        interpretation: cleanWord + ' (noun form)',
        confidence: 65,
        reason: 'Matches Hebrew noun pattern',
        source: 'pattern-detection'
      });
      break;
    }
  }

  // =========================================================================
  // 4f. PRO SCHOLAR: SMART ROOT EXTRACTION (THE KEY FIX!)
  // =========================================================================
  // This is the SYSTEMATIC solution for verbs like תפיקו:
  // - Strips suffix (ו) → תפיק
  // - Identifies conjugation prefix (ת) → stem is פיק
  // - Reconstructs weak root: נ + פק = נפק ← VALIDATED against common roots
  // - Returns high confidence because נפק is a known Talmudic root
  // =========================================================================
  const aramaicRoot = extractAramaicRoot(cleanWord);
  if (aramaicRoot && aramaicRoot.confidence >= 70) {
    interpretations.push({
      type: 'aramaic-verb-reconstructed',
      word: cleanWord,
      root: aramaicRoot.root,
      interpretation: `from root ${aramaicRoot.root}`,
      confidence: aramaicRoot.confidence,
      reason: aramaicRoot.explanation || `${aramaicRoot.pattern}`,
      weakType: aramaicRoot.weakType,
      conjugation: aramaicRoot.conjugationPrefix ? {
        prefix: aramaicRoot.conjugationPrefix,
        suffix: aramaicRoot.suffix
      } : null,
      source: 'smart-root-extraction'
    });
  }

  // =========================================================================
  // LAYER 5: Weak verb analysis
  // =========================================================================
  const weakResult = detectWeakVerb(cleanWord);
  if (weakResult.isWeak) {
    for (const poss of weakResult.possibilities) {
      interpretations.push({
        type: 'weak-verb-root',
        word: cleanWord,
        interpretation: poss.originalRoot,
        confidence: poss.confidence,
        reason: poss.reason,
        source: 'pattern-detection'
      });
    }
  }

  // =========================================================================
  // LAYER 6: Prefix analysis (if no high-confidence match yet)
  // =========================================================================
  const highConfidenceExists = interpretations.some(i => i.confidence >= 80);

  if (!highConfidenceExists && cleanWord.length >= 3) {
    // Try prefix stripping
    const firstLetter = cleanWord[0];
    if (HEBREW_PREFIX_MEANINGS[firstLetter]) {
      const stem = cleanWord.slice(1);
      const prefixInfo = HEBREW_PREFIX_MEANINGS[firstLetter];

      // Calculate confidence based on stem quality
      let confidence = 50;

      // Boost if stem is a known word
      if (STOP_WORDS.has(stem) || FUNCTION_WORDS[stem]) {
        confidence = 75;
      }
      // Boost if stem is long enough
      else if (stem.length >= 3) {
        confidence = 60;
      }
      // Penalty if stem is too short
      else if (stem.length <= 2) {
        confidence = 35;
      }

      interpretations.push({
        type: 'prefixed-word',
        word: cleanWord,
        prefix: firstLetter,
        prefixMeaning: prefixInfo.short,
        stem: stem,
        interpretation: `${prefixInfo.short} + ${stem}`,
        confidence: confidence,
        reason: `Prefix ${firstLetter} (${prefixInfo.short}) + stem`,
        source: 'morphology-analysis'
      });
    }

    // Try 2-letter prefix combinations
    if (cleanWord.length >= 4) {
      const first2 = cleanWord.slice(0, 2);
      const stem2 = cleanWord.slice(2);

      if (HEBREW_PREFIX_MEANINGS[first2[0]] && HEBREW_PREFIX_MEANINGS[first2[1]]) {
        const meaning = getCombinedPrefixMeaning(first2);
        let confidence = 45;

        if (STOP_WORDS.has(stem2) || FUNCTION_WORDS[stem2]) {
          confidence = 70;
        } else if (stem2.length >= 3) {
          confidence = 55;
        }

        interpretations.push({
          type: 'double-prefixed-word',
          word: cleanWord,
          prefix: first2,
          prefixMeaning: meaning,
          stem: stem2,
          interpretation: `${meaning} + ${stem2}`,
          confidence: confidence,
          reason: `Double prefix ${first2} (${meaning}) + stem`,
          source: 'morphology-analysis'
        });
      }
    }
  }

  // =========================================================================
  // LAYER 7: If no interpretations found, return low-confidence guess
  // =========================================================================
  if (interpretations.length === 0) {
    interpretations.push({
      type: 'unknown',
      word: cleanWord,
      interpretation: cleanWord,
      confidence: 20,
      reason: 'No pattern matched - raw word',
      source: 'fallback'
    });
  }

  // =========================================================================
  // SORT by confidence and return
  // =========================================================================
  interpretations.sort((a, b) => b.confidence - a.confidence);

  return {
    interpretations,
    bestGuess: interpretations[0],
    metadata: {
      wordLength: cleanWord.length,
      context,
      totalInterpretations: interpretations.length,
      highConfidenceCount: interpretations.filter(i => i.confidence >= 70).length
    }
  };
};

/**
 * Quick check: Is this word likely Aramaic based on patterns?
 * Returns confidence score 0-100
 */
export const getAramaicConfidence = (word) => {
  if (!word) return 0;

  const cleanWord = stripAllDiacritics(word);
  let score = 0;

  // Emphatic state ending (א)
  if (cleanWord.length >= 4 && cleanWord.endsWith('א')) {
    const beforeAleph = cleanWord[cleanWord.length - 2];
    if (!['א', 'ו', 'י'].includes(beforeAleph)) {
      score += 30;
    }
  }

  // Aramaic plural endings
  if (cleanWord.endsWith('ין') || cleanWord.endsWith('יא')) {
    score += 25;
  }

  // Known Aramaic markers
  const aramaicMarkers = ['קא', 'דא', 'הא', 'דק', 'דמ', 'דכ'];
  for (const marker of aramaicMarkers) {
    if (cleanWord.startsWith(marker)) {
      score += 20;
      break;
    }
  }

  // Check Aramaic verb patterns
  for (const pattern of ARAMAIC_VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      score += 25;
      break;
    }
  }

  // In FUNCTION_WORDS as Aramaic term
  if (FUNCTION_WORDS[cleanWord] && STOP_WORDS.has(cleanWord)) {
    score += 15;
  }

  return Math.min(score, 100);
};

// =============================================================================
// FUNCTION WORDS - Common particles that need priority lookup
// These often get wrong matches from dictionary morphology
// Used by GlossedText for instant inline translations
// =============================================================================


// =============================================================================
// COMMON ABBREVIATION EXPANSIONS
// Used by abbreviation detection for accurate glossing
// =============================================================================

export const ABBREVIATION_EXPANSIONS = {
  // Single letter with geresh
  "ר'": { expansion: 'רבי', meaning: 'Rabbi' },
  "ה'": { expansion: 'השם', meaning: 'God' },
  "ד'": { expansion: 'דף', meaning: 'page' },
  "פ'": { expansion: 'פרק', meaning: 'chapter' },

  // Common acronyms (ASCII quotes)
  'רש"י': { expansion: 'רבי שלמה יצחקי', meaning: 'Rashi' },
  'רמב"ם': { expansion: 'רבי משה בן מימון', meaning: 'Maimonides' },
  'רמב"ן': { expansion: 'רבי משה בן נחמן', meaning: 'Nachmanides' },
  'ב"ה': { expansion: 'בית הלל', meaning: 'Beit Hillel' },
  'ב"ש': { expansion: 'בית שמאי', meaning: 'Beit Shammai' },
  'ר"ה': { expansion: 'ראש השנה / רשות הרבים', meaning: 'Rosh Hashanah / Public domain' },
  'רה"י': { expansion: 'רשות היחיד', meaning: 'Private domain' },
  'רה"ר': { expansion: 'רשות הרבים', meaning: 'Public domain' },
  'בע"ה': { expansion: 'בעל הבית', meaning: 'homeowner' },
  'דבע"ה': { expansion: 'דבעל הבית', meaning: 'of homeowner' },
  "וגו'": { expansion: 'וגומר', meaning: 'etc.' },
  "וכו'": { expansion: 'וכולי', meaning: 'etc.' },

  // Hebrew gershayim (״) variants - same acronyms with proper Hebrew quotation mark
  'רש״י': { expansion: 'רבי שלמה יצחקי', meaning: 'Rashi' },
  'רמב״ם': { expansion: 'רבי משה בן מימון', meaning: 'Maimonides' },
  'רמב״ן': { expansion: 'רבי משה בן נחמן', meaning: 'Nachmanides' },
  'ב״ה': { expansion: 'בית הלל', meaning: 'Beit Hillel' },
  'ב״ש': { expansion: 'בית שמאי', meaning: 'Beit Shammai' },
  'ר״ה': { expansion: 'ראש השנה / רשות הרבים', meaning: 'Rosh Hashanah / Public domain' },
  'רה״י': { expansion: 'רשות היחיד', meaning: 'Private domain' },
  'רה״ר': { expansion: 'רשות הרבים', meaning: 'Public domain' },
  'בע״ה': { expansion: 'בעל הבית', meaning: 'homeowner' },
  'דבע״ה': { expansion: 'דבעל הבית', meaning: 'of homeowner' },
};


// =============================================================================
// PRO SCHOLAR: HEBREW BINYANIM DETECTION
// =============================================================================
// Detects the 7 Hebrew binyanim (verb patterns) from word morphology:
// - Qal (פָּעַל) - Simple active
// - Nifal (נִפְעַל) - Simple passive/reflexive
// - Piel (פִּעֵל) - Intensive active
// - Pual (פֻּעַל) - Intensive passive
// - Hifil (הִפְעִיל) - Causative active
// - Hufal (הֻפְעַל) - Causative passive
// - Hitpael (הִתְפַּעֵל) - Reflexive/intensive
// =============================================================================

/**
 * Hebrew Binyanim patterns with their markers
 */
export const HEBREW_BINYANIM = {
  qal: {
    name: 'Qal',
    hebrew: 'קַל',
    meaning: 'Simple active',
    example: { word: 'שָׁמַר', translation: 'he guarded' },
    markers: {
      perfect: { prefix: '', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', doubling: false },
      participle: { prefix: '', doubling: false },
    }
  },
  nifal: {
    name: 'Nifal',
    hebrew: 'נִפְעַל',
    meaning: 'Simple passive/reflexive',
    example: { word: 'נִשְׁמַר', translation: 'he was guarded' },
    markers: {
      perfect: { prefix: 'נ', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'נ', doubling: false },
      participle: { prefix: 'נ', doubling: false },
    }
  },
  piel: {
    name: 'Piel',
    hebrew: 'פִּעֵל',
    meaning: 'Intensive active',
    example: { word: 'שִׁמֵּר', translation: 'he guarded intensively' },
    markers: {
      perfect: { prefix: '', doubling: true }, // middle radical doubled
      imperfect: { prefix: 'י/ת/א/נ', doubling: true },
      participle: { prefix: 'מ', doubling: true },
    }
  },
  pual: {
    name: 'Pual',
    hebrew: 'פֻּעַל',
    meaning: 'Intensive passive',
    example: { word: 'שֻׁמַּר', translation: 'was guarded intensively' },
    markers: {
      perfect: { prefix: '', doubling: true, qubbutz: true },
      imperfect: { prefix: 'י/ת/א/נ', doubling: true, qubbutz: true },
      participle: { prefix: 'מ', doubling: true, qubbutz: true },
    }
  },
  hifil: {
    name: 'Hifil',
    hebrew: 'הִפְעִיל',
    meaning: 'Causative active',
    example: { word: 'הִשְׁמִיר', translation: 'he caused to guard' },
    markers: {
      perfect: { prefix: 'ה', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'הי', doubling: false },
      participle: { prefix: 'מ', doubling: false },
    }
  },
  hufal: {
    name: 'Hufal',
    hebrew: 'הֻפְעַל',
    meaning: 'Causative passive',
    example: { word: 'הֻשְׁמַר', translation: 'was caused to guard' },
    markers: {
      perfect: { prefix: 'ה', doubling: false, qubbutz: true },
      imperfect: { prefix: 'י/ת/א/נ', doubling: false, qubbutz: true },
      participle: { prefix: 'מ', doubling: false, qubbutz: true },
    }
  },
  hitpael: {
    name: 'Hitpael',
    hebrew: 'הִתְפַּעֵל',
    meaning: 'Reflexive/intensive',
    example: { word: 'הִשְׁתַּמֵּר', translation: 'he guarded himself' },
    markers: {
      perfect: { prefix: 'הת', doubling: true },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'ת', doubling: true },
      participle: { prefix: 'מת', doubling: true },
    }
  },
};

/**
 * Detect Hebrew Binyan from a verb form
 * @param {string} word - Hebrew verb form
 * @returns {Object} - { binyan, confidence, tense, markers }
 */
export const detectHebrewBinyan = (word) => {
  if (!word || word.length < 3) return null;

  // Strip nikud for pattern matching - use hebrewUtils (DRY)
  const cleanWord = stripAllDiacritics(word);
  const results = [];

  // Hitpael detection: הת prefix or internal ת after prefix
  if (cleanWord.startsWith('הת') || cleanWord.startsWith('מת')) {
    results.push({
      binyan: HEBREW_BINYANIM.hitpael,
      confidence: 90,
      tense: cleanWord.startsWith('מת') ? 'participle' : 'perfect',
      markers: ['הת/מת prefix'],
    });
  } else if (['י', 'ת', 'א', 'נ'].includes(cleanWord[0]) && cleanWord[1] === 'ת') {
    // Imperfect hitpael: יתשמר, תתשמר
    results.push({
      binyan: HEBREW_BINYANIM.hitpael,
      confidence: 85,
      tense: 'imperfect',
      markers: ['infix ת after conjugation prefix'],
    });
  }

  // Nifal detection: נ prefix
  if (cleanWord.startsWith('נ') && cleanWord.length >= 4) {
    results.push({
      binyan: HEBREW_BINYANIM.nifal,
      confidence: 80,
      tense: 'perfect/participle',
      markers: ['נ prefix'],
    });
  } else if (['י', 'ת', 'א'].includes(cleanWord[0]) && cleanWord.length >= 4) {
    // Check for Nifal imperfect (internal נ after prefix)
    if (cleanWord[1] === 'נ' || (cleanWord[1] === 'י' && cleanWord[2] === 'נ')) {
      results.push({
        binyan: HEBREW_BINYANIM.nifal,
        confidence: 75,
        tense: 'imperfect',
        markers: ['infix נ'],
      });
    }
  }

  // Hifil detection: ה prefix (perfect) or hirik pattern
  if (cleanWord.startsWith('ה') && cleanWord.length >= 4) {
    // Check for Hifil vs Hufal (Hufal has qubbutz/shureq)
    if (word.includes('\u05BB') || word.includes('\u05BC')) { // qubbutz or shureq in original
      results.push({
        binyan: HEBREW_BINYANIM.hufal,
        confidence: 85,
        tense: 'perfect',
        markers: ['ה prefix with qubbutz'],
      });
    } else {
      results.push({
        binyan: HEBREW_BINYANIM.hifil,
        confidence: 80,
        tense: 'perfect',
        markers: ['ה prefix'],
      });
    }
  }

  // Piel/Pual detection: Middle letter doubling (dagesh hazak)
  // Look for dagesh in second position of root
  const hasDageshHazak = word.length >= 3 && word.includes('\u05BC');
  if (hasDageshHazak && !cleanWord.startsWith('ה') && !cleanWord.startsWith('נ')) {
    // Check for Pual vowel pattern (qubbutz under first radical)
    if (word.includes('\u05BB')) { // qubbutz
      results.push({
        binyan: HEBREW_BINYANIM.pual,
        confidence: 75,
        tense: 'perfect/participle',
        markers: ['middle doubling with qubbutz'],
      });
    } else {
      results.push({
        binyan: HEBREW_BINYANIM.piel,
        confidence: 75,
        tense: 'perfect/participle',
        markers: ['middle doubling'],
      });
    }
  }

  // Qal: Default if no other pattern detected and word looks verbal
  if (results.length === 0 && cleanWord.length >= 3) {
    results.push({
      binyan: HEBREW_BINYANIM.qal,
      confidence: 50,
      tense: 'unknown',
      markers: ['default - no special markers'],
    });
  }

  // Sort by confidence and return best match
  results.sort((a, b) => b.confidence - a.confidence);

  return {
    bestMatch: results[0] || null,
    allMatches: results,
    word: cleanWord,
  };
};

/**
 * Get binyan info for display
 * @param {string} binyanName - Name like 'Hifil', 'Piel', etc.
 * @returns {Object} - Binyan information
 */
export const getBinyanInfo = (binyanName) => {
  const key = binyanName?.toLowerCase();
  return HEBREW_BINYANIM[key] || null;
};

/**
 * Extract Hebrew root from conjugated verb using binyan patterns
 * @param {string} word - Hebrew verb
 * @returns {Object} - { root, binyan, confidence }
 */
export const extractHebrewRoot = (word) => {
  if (!word || word.length < 3) return null;

  const cleanWord = stripAllDiacritics(word);
  const binyanResult = detectHebrewBinyan(word);

  if (!binyanResult?.bestMatch) {
    // Try simple 3-letter extraction
    if (cleanWord.length === 3 && getCommonTalmudicRoots().has(cleanWord)) {
      return {
        root: cleanWord,
        binyan: HEBREW_BINYANIM.qal,
        confidence: 70,
      };
    }
    return null;
  }

  const binyan = binyanResult.bestMatch.binyan;
  let possibleRoot = cleanWord;

  // Strip binyan prefixes to get root
  if (binyan.name === 'Hitpael') {
    // Remove הת/מת prefix
    if (cleanWord.startsWith('הת') || cleanWord.startsWith('מת')) {
      possibleRoot = cleanWord.slice(2);
    } else if (['י', 'ת', 'א', 'נ'].includes(cleanWord[0]) && cleanWord[1] === 'ת') {
      possibleRoot = cleanWord[0] + cleanWord.slice(2);
    }
  } else if (binyan.name === 'Nifal') {
    if (cleanWord.startsWith('נ')) {
      possibleRoot = cleanWord.slice(1);
    }
  } else if (binyan.name === 'Hifil' || binyan.name === 'Hufal') {
    if (cleanWord.startsWith('ה')) {
      possibleRoot = cleanWord.slice(1);
    }
  }

  // Validate against known roots
  if (possibleRoot.length === 3 && getCommonTalmudicRoots().has(possibleRoot)) {
    return {
      root: possibleRoot,
      binyan: binyan,
      confidence: binyanResult.bestMatch.confidence,
      tense: binyanResult.bestMatch.tense,
    };
  }

  // Try stripping common suffixes
  const VERB_SUFFIXES = ['ה', 'ו', 'ת', 'י', 'נו', 'תם', 'תן'];
  for (const suffix of VERB_SUFFIXES) {
    if (possibleRoot.endsWith(suffix) && possibleRoot.length > suffix.length + 2) {
      const stripped = possibleRoot.slice(0, -suffix.length);
      if (stripped.length === 3 && getCommonTalmudicRoots().has(stripped)) {
        return {
          root: stripped,
          binyan: binyan,
          confidence: binyanResult.bestMatch.confidence - 5,
          tense: binyanResult.bestMatch.tense,
          suffix: suffix,
        };
      }
    }
  }

  return {
    root: possibleRoot.slice(0, 3),
    binyan: binyan,
    confidence: Math.max(binyanResult.bestMatch.confidence - 20, 30),
    tense: binyanResult.bestMatch.tense,
    uncertain: true,
  };
};

const morphology = {
  HEBREW_PREFIX_MEANINGS,
  HEBREW_PREFIXES_ORDERED,
  HEBREW_SUFFIXES_ORDERED,
  SINGLE_PREFIXES,
  STOP_WORDS,
  ARAMAIC_PREFIXES,
  FUNCTION_WORDS,
  getPrefixMeaning,
  getPrefixInfo,
  getCombinedPrefixMeaning,
  isStopWord,
  isLikelyCompleteRoot,
  smartPrefixAnalysis,
  lookupFunctionWord,
  // PRO SCHOLAR: Smart root extraction with weak verb reconstruction
  extractAramaicRoot,
  // PRO SCHOLAR: Systematic translation from pattern analysis
  computeVerbTranslation,
  // PRO SCHOLAR: Confidence-based analysis
  analyzeWordWithConfidence,
  getAramaicConfidence,
  // PRO SCHOLAR: Hebrew Binyanim detection
  HEBREW_BINYANIM,
  detectHebrewBinyan,
  getBinyanInfo,
  extractHebrewRoot,
};

export default morphology;
