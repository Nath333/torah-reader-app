// =============================================================================
// Commentary Utilities - Shared functions for processing commentary text
// =============================================================================

import { cleanHtml } from './sanitize';
import { createLogger } from './debug';
import { pickBestDefinition } from './definitionCleaner';
import { normalizeArticles } from './articleUtils';
// Centralized Hebrew utilities
import { normalizeFinals } from './hebrewUtils';
// LOCAL dictionaries - use sync lookup functions (no deprecation warnings)
import { lookupJastrowSync, lookupBDBSync } from '../services/dictionaries/dictionaryLoader';
// Centralized morphology constants
import { getPrefixMeaning, SINGLE_PREFIXES } from '../constants/morphology';

// Create logger for this module
const log = createLogger('CommentaryUtils');

// Simple translation cache to avoid repeat requests
const translationCache = new Map();

// =============================================================================
// QUOTE NORMALIZATION - Handle gershayim (״) vs ASCII (") variants
// =============================================================================
// Hebrew uses two types of quotation marks for abbreviations:
// - Gershayim (״) U+05F4 - proper Hebrew double mark
// - Geresh (׳) U+05F3 - single mark
// - ASCII double quote (") U+0022
// - ASCII single quote (') U+0027
//
// This function normalizes all variants to ASCII for consistent lookups
// =============================================================================
export const normalizeQuotes = (text) => {
  if (!text) return text;
  return text
    .replace(/״/g, '"')   // Hebrew gershayim → ASCII double quote
    .replace(/׳/g, "'")   // Hebrew geresh → ASCII single quote
    .replace(/"/g, '"')   // Fancy left double quote
    .replace(/"/g, '"')   // Fancy right double quote
    .replace(/'/g, "'")   // Fancy left single quote
    .replace(/'/g, "'");  // Fancy right single quote
};

// Common Talmudic/Rabbinic abbreviations - ENGLISH translations for common ones
// to avoid dictionary disambiguation issues (e.g., משנה = "Mishnah" not "lieutenant")
// NOTE: Keys use ASCII quotes ("). The normalizeQuotes() function converts Hebrew
// gershayim (״) to ASCII before lookup, so both ד״ה and ד"ה will match.
const TALMUDIC_ABBREVIATIONS = {
  // === PROVIDE ENGLISH DIRECTLY for common terms (avoids wrong dictionary sense) ===
  "גמ'": '[Gemara]',
  "מתני'": '[Mishnah:]',
  "ר'": '[Rabbi]',
  "רש\"י": '[Rashi]',
  "ד\"ה": '[on the words:]',  // דיבור המתחיל - opening words of commentary
  "א\"כ": '[if so]',
  "כ\"ש": '[all the more so]',
  "מ\"מ": '[in any case]',
  "ה\"ה": '[the same law applies]',
  "וכו'": '[etc.]',
  "ת\"ל": '[the verse teaches]',

  // === DOMAIN ABBREVIATIONS (Shabbat context) ===
  "רה\"י": '[private domain]',  // רשות היחיד
  "רה\"ר": '[public domain]',   // רשות הרבים
  "ר\"ה": '[public domain]',    // Also רשות הרבים in Shabbat context
  "מרה\"י": '[from private domain]',
  "לרה\"י": '[to private domain]',
  "לר\"ה": '[to public domain]',
  "מר\"ה": '[from public domain]',

  // === SCHOOLS ===
  "ב\"ה": '[Beit Hillel]',
  "ב\"ש": '[Beit Shammai]',

  // === PEOPLE ===
  "בע\"ה": '[homeowner]',  // בעל הבית
  "דבע\"ה": '[of the homeowner]',

  // === WITH VAV PREFIX (ו) - common combinations ===
  "ובגמ'": '[and the Gemara]',
  "וגמ'": '[and Gemara]',
  "ומתני'": '[and Mishnah]',
  "ור'": '[and Rabbi]',
  "וד\"ה": '[and on the words:]',

  // === WITH DALET PREFIX (ד) - Aramaic relative ===
  "דר\"ה": '[that is public domain]',
  "דרה\"י": '[that is private domain]',

  // === Keep Hebrew expansion for honorifics/names ===
  "ע\"ה": 'עליו השלום',
  "ז\"ל": 'זכרונו לברכה',
  "וגו'": '[and so on]',
  "פ'": '[chapter]',
  "ובפ'": '[and in chapter]',
  "בפ'": '[in chapter]',
  "מה\"ת": '[from the Torah]',
  "דאורייתא": '[from the Torah]',
  "דרבנן": '[from the Rabbis]',

  // === NUMBERS ===
  "ד'": '[four]',  // ארבע
  "ג'": '[three]',
  "ב'": '[two]',

  // === TALMUD STRUCTURE ===
  "לקמן": '[below]',
  "לעיל": '[above]',
  "דף": '[page]',
};

// Dynamic glossary cache - stores API lookups for reuse
const glossaryCache = new Map();

// =============================================================================
// PROPER_NOUN_HINTS - MINIMAL overrides for proper nouns ONLY
// =============================================================================
// SCHOLARLY PRINCIPLE: Your dictionaries (Jastrow, BDB, Klein, Strong's) are
// the PRIMARY sources. We only add hints for PROPER NOUNS that are commonly
// used as text/day names rather than their dictionary meaning.
//
// For ALL other words: USE THE DICTIONARIES! No hardcoding needed.
// =============================================================================
const HALACHIC_OVERRIDE = {
  // ==========================================================================
  // PROPER NOUNS ONLY - Names of texts/days/concepts
  // These override dictionary because they're TITLES not vocabulary
  // ==========================================================================
  'משנה': 'Mishnah (tannaitic legal code)',
  'גמרא': 'Gemara (amoraic discussion)',
  'תורה': 'Torah',
  'שבת': 'Shabbat',

  // ==========================================================================
  // TECHNICAL HALACHIC TERMS - Only where dictionary sense is WRONG
  // Use these sparingly - prefer Jastrow/BDB for scholarly definitions
  // ==========================================================================
  // אב/תולדה: In melacha context, NOT "father/birth" - technical classification
  'אב': 'אב מלאכה (primary labor category)',
  'אבות': 'אבות מלאכות (primary labor categories)',
  'תולדה': 'תולדה (derivative labor)',
  'תולדות': 'תולדות (derivative labors)',
};

// =============================================================================
// NOTE: COMMON_WORD_FIXES has been REMOVED
// =============================================================================
// The systematic scoring system in definitionCleaner.js now handles common words
// without hardcoding. It uses:
// 1. scoreDefinition() - Ranks ALL definitions by quality
// 2. pickBestFromCandidates() - Selects the BEST definition
//
// This replaces hardcoding hundreds of words with a SYSTEMATIC approach:
// - Rejects proper noun entries (e.g., "Israelite" for יד)
// - Boosts common semantic patterns (hand, house, master, etc.)
// - Uses source reliability (Jastrow/BDB > Strong's)
// - Filters garbage/transliteration-only definitions
//
// If a word is still returning wrong definitions, improve the scoring
// patterns in definitionCleaner.js rather than adding hardcoded entries.
// =============================================================================

/**
 * DYNAMIC PREFIX-AWARE LOOKUP
 * Instead of hardcoding השבת, לשבת, בשבת, etc., we:
 * 1. Strip prefixes dynamically
 * 2. Look up the root in HALACHIC_OVERRIDE or RASHI_VOCABULARY
 * 3. Combine prefix meaning + root meaning
 *
 * This is the SINGLE function for halachic/Talmudic word lookup.
 * All consumers should use this instead of directly accessing HALACHIC_OVERRIDE.
 *
 * @param {string} word - Hebrew word (potentially with prefixes)
 * @param {Object} options - { includeRashi: true } to also check RASHI_VOCABULARY
 * @returns {object|null} - { definition, prefix, root, source } or null
 */
export const lookupHalachicWithPrefix = (word, options = {}) => {
  if (!word) return null;
  const { includeRashi = true } = options;

  // Helper to check dictionaries in priority order:
  // 1. HALACHIC_OVERRIDE (proper nouns and technical terms)
  // 2. RASHI_VOCABULARY (Talmudic vocabulary and compound phrases)
  //
  // NOTE: Common words (יד, של, בעל, etc.) are now handled by the
  // systematic scoring system in unifiedLookupService.js
  const checkDictionaries = (w) => {
    // FIRST: Check halachic overrides (proper nouns, titles)
    if (HALACHIC_OVERRIDE[w]) {
      return { def: HALACHIC_OVERRIDE[w], source: 'Halachic' };
    }
    // SECOND: Check Rashi vocabulary (compound phrases, Aramaic particles)
    if (includeRashi && typeof RASHI_VOCABULARY !== 'undefined' && RASHI_VOCABULARY[w]) {
      return { def: RASHI_VOCABULARY[w], source: 'Rabbinic' };
    }
    return null;
  };

  // Direct match first (includes multi-word phrases)
  const direct = checkDictionaries(word);
  if (direct) {
    return { definition: direct.def, prefix: '', root: word, source: direct.source };
  }

  // Try stripping single prefix
  if (word.length > 2 && SINGLE_PREFIXES.includes(word[0])) {
    const stripped = word.slice(1);
    const found = checkDictionaries(stripped);
    if (found) {
      const prefixMeaning = getPrefixMeaning(word[0]);
      // Return BASE definition separately from prefix - callers combine them
      // This prevents double-prefix bugs like "the the Shabbat"
      return {
        definition: found.def,  // BASE definition without prefix
        prefix: prefixMeaning,
        root: stripped,
        source: found.source
      };
    }
  }

  // Try stripping two prefixes (e.g., וה, של, etc.)
  if (word.length > 3 && SINGLE_PREFIXES.includes(word[0]) && SINGLE_PREFIXES.includes(word[1])) {
    const stripped = word.slice(2);
    const found = checkDictionaries(stripped);
    if (found) {
      const p1 = getPrefixMeaning(word[0]);
      const p2 = getPrefixMeaning(word[1]);
      const combinedPrefix = [p1, p2].filter(Boolean).join(' ');
      // Return BASE definition separately from prefix - callers combine them
      return {
        definition: found.def,  // BASE definition without prefix
        prefix: combinedPrefix,
        root: stripped,
        source: found.source
      };
    }
  }

  return null;
};

// =============================================================================
// TALMUDIC_ABBREVIATIONS_EXPANDED - Only for compound/abbreviated phrases
// =============================================================================
// SCHOLARLY PRINCIPLE: Jastrow, BDB, Klein cover single words excellently.
// Only hardcode COMPOUND PHRASES that dictionaries don't parse correctly.
// =============================================================================
const RASHI_VOCABULARY = {
  // === COMPOUND PHRASES (dictionaries can't parse these) ===
  'מנלן': 'from where do we know',
  'אף על פי': 'even though',
  'אע"פ': 'even though',
  'שמע מינה': 'we derive from this',
  'מרשות לרשות': 'from domain to domain',

  // === ABBREVIATED FORMS (not full words in dictionaries) ===
  'ובגמ': 'and in the Gemara',
  'דהכנסות': 'that bringing in',
  'דאורייתא': 'of the Torah',
  'דרבנן': 'of the Rabbis',

  // === COMMON ARAMAIC PARTICLES (dictionaries often miss these) ===
  'נמי': 'also, too',
  'הואיל': 'since, because',
  'קא': '(continuous action marker)',
  'קרי': 'calls, reads',
  'הכי': 'thus, so',
  'הכא': 'here',
  'התם': 'there',
  'מאי': 'what',
  'היינו': 'this is',
  'אלא': 'but, rather',
  'אמאי': 'why',
  'לאו': 'is it not, no',
  'הא': 'this, behold',
  'דאמר': 'who said, as said',
  'כגון': 'such as',
  'למימר': 'to say',
  'מיהא': 'however, but',
  'איכא': 'there is',
  'ליכא': 'there is not',
  'בעי': 'needs, asks',
  'אמרינן': 'we say',
  'סבר': 'holds, thinks',
  'מפרש': 'explains',
  'פירוש': 'meaning',
  'כלומר': 'that is to say',

  // === COMMON TALMUDIC TERMS (from Shabbat tractate) ===
  'יציאות': 'goings out, transfers',
  'הוצאות': 'carryings out, transfers',
  'הכנסות': 'bringings in, transfers',
  'האמורות': 'that are mentioned',
  'ומוציא': 'and one who carries out',
  'מתני': 'Mishnah teaches',
  'רשות': 'domain, authority',
  'רשויות': 'domains',
  'שתים': 'two',
  'ארבע': 'four',
  'פנים': 'inside',
  'חוץ': 'outside',

  // === LEGAL STATUS TERMS (critical for Talmud translation) ===
  'פטור': 'exempt',
  'חייב': 'liable, obligated',
  'מותר': 'permitted',
  'אסור': 'forbidden',
  'כשר': 'valid, kosher',
  'פסול': 'invalid, disqualified',
  'טמא': 'impure',
  'טהור': 'pure',
  'חולין': 'non-sacred',
  'קודש': 'sacred',
  'טרף': 'non-kosher',

  // === PUNISHMENT TERMS (Shabbat context) ===
  'כרת': 'excision (divine punishment)',
  'סקילה': 'stoning',
  'שריפה': 'burning',
  'הרג': 'execution by sword',
  'חנק': 'strangulation',
  'מלקות': 'lashes',
  'מיתה': 'death',
  'עונש': 'punishment',
  'התראה': 'warning',
  'זדון': 'intentional transgression',
  'שגגה': 'unintentional error',

  // === HALACHIC CATEGORIES ===
  'מלאכה': 'labor, work',
  'מלאכות': 'labors, works',
  'איסור': 'prohibition',
  'היתר': 'permission',
  'חטאת': 'sin offering',
  'עולה': 'burnt offering',
  'קרבן': 'sacrifice',
  'נדבה': 'voluntary offering',

  // === INFINITIVES (BDB often returns wrong homographs) ===
  'לאסור': 'to prohibit',
  'להתיר': 'to permit',
  'לחייב': 'to obligate',
  'לפטור': 'to exempt',
  'להביא': 'to bring',
  'להוציא': 'to take out',
  'להכניס': 'to bring in',
  'לעשות': 'to do, to make',
  'לתת': 'to give',
  'לקבל': 'to receive',
  'ללמוד': 'to learn',
  'ללמד': 'to teach',
  'לדרוש': 'to expound',
  'לכתחלה': 'ab initio, ideally',

  // === COMMON PRONOUNS/CONJUNCTIONS (Strong's gets these wrong) ===
  'שהן': 'that they (f)',
  'שהם': 'that they (m)',
  'שהיא': 'that she/it',
  'שהוא': 'that he/it',
  'וכן': 'and thus, so',
  'וכל': 'and all',
  'בכל': 'in all',

  // === BASIC HEBREW FUNCTION WORDS ===
  // Strong's returns wrong homographs for these EVERY time
  // These are grammar words, not content - essential for any translation
  'מן': 'from',
  'על': 'on, upon',
  'אל': 'to, toward',
  'את': '(object marker)',
  'כן': 'thus, so',
  'לא': 'not, no',
  'כי': 'because, that',
  'אשר': 'that, which',
  'זה': 'this',
  'הוא': 'he, it',
  'היא': 'she, it',
  'הם': 'they (m)',
  'הן': 'they (f)',
  'היה': 'was, existed',
  'יהיה': 'will be',
  'אותו': 'him, it',
  'אותה': 'her, it',
  'אותם': 'them (m)',
  'אותן': 'them (f)',
  'עליו': 'on him',
  'עליה': 'on her',
  'עליהם': 'on them',
  'אלו': 'these',
  'אלה': 'these',

  // === ADDITIONAL ARAMAIC PARTICLES (Talmud-specific) ===
  // These are CRITICAL for Talmud translation - Strong's doesn't handle Aramaic
  'דהוא': 'that is',
  'דהיא': 'that is (f)',
  'דהוי': 'that would be',
  'דהוה': 'that was',
  'דאיכא': 'that there is',
  'דליכא': 'that there is not',
  'דקאמר': 'who says',
  'דאמרי': 'that they say',
  'דתנן': 'that we learned (in Mishnah)',
  'דתניא': 'that it was taught (in Baraita)',
  'מתניתין': 'our Mishnah',
  'ברייתא': 'Baraita (external teaching)',
  'תנא': 'Tanna taught',
  'תנו': 'the Tannaim taught',
  'אמרי': 'they say',
  'אמרת': 'you said',
  'קאמר': 'he says',
  'קאמרת': 'you say',
  'למאי': 'for what',
  'היכי': 'how',
  'היכא': 'where',
  'אימת': 'when',
  'כמאן': 'like whom',
  'מאן': 'who',
  'ומאי': 'and what',
  'דמאי': 'of what',
  'לימא': 'let him say',
  'תימא': 'you might say',
  'אימא': 'say, perhaps',
  'שמא': 'perhaps, lest',
  'ודאי': 'certainly',
  'ספק': 'doubt, uncertain',

  // === TALMUDIC LOGICAL CONNECTORS ===
  'אלמא': 'therefore, hence',
  'משום': 'because of',
  'משמע': 'it implies',
  'מיהו': 'however, but',
  'מיהת': 'at any rate',
  'השתא': 'now',
  'אטו': 'is it that',
  'מהו': 'what is',
  'מהא': 'from this',
  'מנא': 'from where',
  // 'מנלן' already defined above in COMMON ARAMAIC PARTICLES
  'פשיטא': 'it is obvious',
  'קשיא': 'difficult, contradiction',
  'תיובתא': 'refutation',
  'שמע': 'hear, learn',
  'תנינא': 'we learned',
  'הדר': 'he returned, again',
  'אדרבה': 'on the contrary',
  'לעולם': 'always, in any case',
  'מכלל': 'from the principle',
  'דוקא': 'specifically',
  // 'לאו' already defined above in COMMON ARAMAIC PARTICLES
  'אין': 'yes, there is',
  'יש': 'there is',
  'אם': 'if',
  'כשהוא': 'when he',
  'כשהיא': 'when she/it',

  // === COMMON BODY PARTS (Strong's often wrong) ===
  'יד': 'hand',
  'רגל': 'foot, leg',
  'ראש': 'head',
  'עין': 'eye',
  'אזן': 'ear',
  'פה': 'mouth',
  'לב': 'heart',
  'נפש': 'soul',
  'גוף': 'body',
  'כף': 'palm, spoon',
  'אצבע': 'finger',
  'זרוע': 'arm',

  // === COMMON OBJECTS/PLACES ===
  'בית': 'house',
  'שדה': 'field',
  'דרך': 'way, road',
  'עיר': 'city',
  'מקום': 'place',
  'שער': 'gate',
  'חצר': 'courtyard',
  'גג': 'roof',
  'כותל': 'wall',
  'אמה': 'cubit',
  'טפח': 'handbreadth',

  // === TIME EXPRESSIONS ===
  'יום': 'day',
  'לילה': 'night',
  'בקר': 'morning',
  'ערב': 'evening',
  'שעה': 'hour',
  'עת': 'time',
  'זמן': 'time, season',
  'תמיד': 'always, continual',
  'לעתים': 'sometimes',
  'מיד': 'immediately',
  'תיכף': 'immediately',
  'אחר': 'after',
  'לפני': 'before',
  'עד': 'until',
  'מאז': 'since',

  // === PRO SCHOLAR V9: MISHKAN/TABERNACLE TERMS ===
  // Critical for Shabbat tractate (the 39 melachot derive from Mishkan work)
  'לויה': 'Levite',
  'לוי': 'Levite',
  'לויים': 'Levites',
  'מחנה': 'camp',
  'ישראל': 'Israel',
  'כהן': 'priest',
  'כהנים': 'priests',
  'משכן': 'Tabernacle',
  'אהל': 'tent',
  'מועד': 'meeting, appointed time',
  'קרש': 'board, plank',
  'קרשים': 'boards, planks',
  'יריעה': 'curtain',
  'יריעות': 'curtains',
  'אדן': 'socket, base',
  'אדנים': 'sockets, bases',
  'בריח': 'bar',
  'בריחים': 'bars',
  'עמוד': 'pillar',
  'עמודים': 'pillars',
  'וו': 'hook',
  'ווים': 'hooks',

  // === BIBLICAL COMMANDS/VERSES ===
  'ויצו': 'and He commanded',
  'ויעבירו': 'and they proclaimed',
  'תפיקו': 'you shall bring out',
  'תוציאו': 'you shall take out',
  'נדבות': 'voluntary offerings',
  'תרומה': 'contribution, offering',
  'תרומות': 'contributions, offerings',

  // === ADDITIONAL TALMUDIC TERMS ===
  'כדיליף': 'as is derived',
  'כדילפינן': 'as we derive',
  'נפקא לן': 'we derive',
  'שגגתו': 'his unintentional sin',
  'זדונו': 'his intentional sin',
  'התראתו': 'his warning',
};

// Hebrew prefixes - use centralized morphology constants (single source of truth)
// SINGLE_PREFIXES imported from '../constants/morphology'
// normalizeFinals imported from './hebrewUtils'

/**
 * Look up a word in a local dictionary with morphological variations
 * Tries: exact match → normalized → prefix stripped → suffix stripped
 * @param {string} word - Hebrew/Aramaic word
 * @param {Function} lookupFn - Sync lookup function (lookupJastrowSync or lookupBDBSync)
 * @returns {Object|null} Dictionary entry or null
 */
const lookupLocalWithMorphology = (word, lookupFn) => {
  if (!word || !lookupFn) return null;

  // Direct match
  const direct = lookupFn(word);
  if (direct) {
    return direct;
  }

  // Normalized match (final letters → regular)
  const normalized = normalizeFinals(word);
  if (normalized !== word) {
    const normalizedMatch = lookupFn(normalized);
    if (normalizedMatch) {
      return normalizedMatch;
    }
  }

  // Try stripping prefixes (using centralized SINGLE_PREFIXES)
  for (const prefix of SINGLE_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 1) {
      const stem = word.slice(prefix.length);
      const stemMatch = lookupFn(stem);
      if (stemMatch) {
        return stemMatch;
      }
      const normalizedStem = normalizeFinals(stem);
      if (normalizedStem !== stem) {
        const normalizedStemMatch = lookupFn(normalizedStem);
        if (normalizedStemMatch) {
          return normalizedStemMatch;
        }
      }
    }
  }

  // Try stripping common suffixes (ים, ות, ין, ה, י)
  const COMMON_SUFFIXES = ['ים', 'ות', 'ין', 'ן', 'ה', 'י', 'א'];
  for (const suffix of COMMON_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      const stemMatch = lookupFn(stem);
      if (stemMatch) {
        return stemMatch;
      }
      // For ות plural, try adding ה for feminine singular
      if (suffix === 'ות') {
        const femSingular = lookupFn(stem + 'ה');
        if (femSingular) {
          return femSingular;
        }
      }
    }
  }

  return null;
};

/**
 * Build a dynamic glossary for Aramaic/Hebrew words using LOCAL dictionaries
 * Uses Jastrow (25K entries) and BDB for comprehensive coverage
 * @param {string[]} words - Hebrew/Aramaic words to look up
 * @returns {Promise<Map<string, string>>} Map of word → English definition
 */
const buildDynamicGlossary = async (words) => {
  const glossary = new Map();
  const uniqueWords = [...new Set(words.filter(w => w && w.length >= 2))];

  // Helper to check HALACHIC_OVERRIDE and RASHI_VOCABULARY with prefix stripping
  const checkOverrideWithPrefixes = (word) => {
    // Direct match in HALACHIC_OVERRIDE
    if (HALACHIC_OVERRIDE[word]) {
      return { root: word, definition: HALACHIC_OVERRIDE[word], prefix: '' };
    }
    // Direct match in RASHI_VOCABULARY
    if (RASHI_VOCABULARY[word]) {
      return { root: word, definition: RASHI_VOCABULARY[word], prefix: '' };
    }
    // Try stripping one prefix
    if (word.length > 2 && SINGLE_PREFIXES.includes(word[0])) {
      const stripped = word.substring(1);
      if (HALACHIC_OVERRIDE[stripped]) {
        return { root: stripped, definition: HALACHIC_OVERRIDE[stripped], prefix: getPrefixMeaning(word[0]) || '' };
      }
      if (RASHI_VOCABULARY[stripped]) {
        return { root: stripped, definition: RASHI_VOCABULARY[stripped], prefix: getPrefixMeaning(word[0]) || '' };
      }
    }
    // Try stripping two prefixes
    if (word.length > 3 && SINGLE_PREFIXES.includes(word[0]) && SINGLE_PREFIXES.includes(word[1])) {
      const stripped = word.substring(2);
      if (HALACHIC_OVERRIDE[stripped]) {
        const p1 = getPrefixMeaning(word[0]) || '';
        const p2 = getPrefixMeaning(word[1]) || '';
        return { root: stripped, definition: HALACHIC_OVERRIDE[stripped], prefix: [p1, p2].filter(Boolean).join(' ') };
      }
      if (RASHI_VOCABULARY[stripped]) {
        const p1 = getPrefixMeaning(word[0]) || '';
        const p2 = getPrefixMeaning(word[1]) || '';
        return { root: stripped, definition: RASHI_VOCABULARY[stripped], prefix: [p1, p2].filter(Boolean).join(' ') };
      }
    }
    return null;
  };

  // Check halachic override and cache first
  const toFetch = [];
  for (const word of uniqueWords) {
    const cleanedWord = word.replace(/[^\u0590-\u05FF]/g, '');

    // FIRST: Check halachic override (with prefix stripping)
    const override = checkOverrideWithPrefixes(cleanedWord);
    if (override) {
      // Store with prefix in definition for full translation
      const fullDef = override.prefix ? `${override.prefix} ${override.definition}` : override.definition;
      glossary.set(cleanedWord, fullDef);
      continue;
    }

    // THEN: Check cache
    if (glossaryCache.has(cleanedWord)) {
      const cached = glossaryCache.get(cleanedWord);
      if (cached) glossary.set(cleanedWord, cached);
    } else {
      toFetch.push(cleanedWord);
    }
  }

  if (toFetch.length === 0) {
    log.verbose(`Glossary: Built ${glossary.size}/${uniqueWords.length} (override + cache)`);
    return glossary;
  }

  // Use LOCAL dictionaries instead of slow API calls
  // This uses the 25,224-entry Jastrow and BDB dictionaries
  let jastrowCount = 0, bdbCount = 0;

  for (const word of toFetch) {
    let definition = null;

    // Try Jastrow LOCAL first (best for Talmud/Rashi - 25K entries)
    const jastrowEntry = lookupLocalWithMorphology(word, lookupJastrowSync);
    if (jastrowEntry?.definition) {
      // Use pickBestDefinition to clean scholarly notation
      definition = pickBestDefinition(jastrowEntry.definition);
      jastrowCount++;
    }

    // Fallback to BDB LOCAL (Biblical Hebrew)
    if (!definition) {
      const bdbEntry = lookupLocalWithMorphology(word, lookupBDBSync);
      if (bdbEntry?.definition || bdbEntry?.fullDef) {
        definition = pickBestDefinition(bdbEntry.definition || bdbEntry.fullDef);
        bdbCount++;
      }
    }

    if (definition) {
      // Normalize articles (a/an) in definitions
      definition = normalizeArticles(definition);
      glossaryCache.set(word, definition);
      glossary.set(word, definition);
    } else {
      glossaryCache.set(word, null);
    }
  }

  log.verbose(`Glossary: Built ${glossary.size}/${uniqueWords.length} (Jastrow: ${jastrowCount}, BDB: ${bdbCount})`);
  return glossary;
};

/**
 * Extract the first/primary meaning from a scholarly definition
 * Jastrow definitions contain lots of notation we need to clean:
 * - "(רְשׁוּת) f. (b. h.; רשי) authority, dominion..."
 * - "v. דָּא, a. v. fr."
 * - "Targ. Ex. I, 16" (citations)
 * @param {string} definition - Full definition text
 * @returns {string} Primary meaning only
 */
const extractPrimaryMeaning = (definition) => {
  if (!definition) return '';

  let text = definition;

  // EARLY REJECTION: Detect garbled/notation-heavy text
  const garbledPatterns = [
    /\b(?:ace|Sifra|Thazr|Ḥevah|Tosef|Pesik|Baḥod)\b/i,  // Dictionary notation debris
    /(?:whatsoever|preced|foll|ib\.){2,}/i,               // Repeated notation
    /\.\.\.\s*\.\.\./,                                     // Multiple ellipses
    /^[^a-zA-Z]*$/,                                        // No English letters
  ];

  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) return '';
  }

  // Remove Hebrew/Aramaic text in parentheses
  text = text.replace(/\([^)]*[\u0590-\u05FF][^)]*\)/g, '');

  // Remove scholarly abbreviations and references - EXPANDED LIST
  text = text
    .replace(/\b[mfn]\.\s*/gi, '') // Gender markers
    .replace(/\bb\.\s*h\.\s*/gi, '') // "b. h." = Biblical Hebrew
    .replace(/\bch\.\s*/gi, '') // "ch." = Chaldean
    .replace(/\bcmp\.\s*/gi, '') // "cmp." = compare
    .replace(/\bcf\.\s*/gi, '') // "cf." = compare
    .replace(/\bv\.\s*[^\s,;]+/gi, '') // "v. word" = see word
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '') // "a. v. fr." = and very frequently
    .replace(/\bTarg\.[^,;]+/gi, '') // Targum references
    .replace(/\bGen\.\s*R\.[^,;]+/gi, '') // Genesis Rabbah
    .replace(/\bEx\.\s*R\.[^,;]+/gi, '') // Exodus Rabbah
    .replace(/\bY\.\s*[A-Za-z]+\.[^,;]+/gi, '') // Yerushalmi references
    .replace(/\bBer\.[^,;]+/gi, '') // Berakhot references
    .replace(/\bShab\.[^,;]+/gi, '') // Shabbat references
    .replace(/\bPes\.[^,;]+/gi, '') // Pesachim references
    .replace(/\bSifra[^,;]*/gi, '') // Sifra references
    .replace(/\bThazr[^,;]*/gi, '') // Thazria references
    .replace(/\bace\b/gi, '') // Common notation debris
    .replace(/\bwhatsoever\b/gi, '') // Common debris
    .replace(/\bpreced\.?\s*/gi, '') // "preced." = preceding
    .replace(/\bpreceding\s*/gi, '') // "preceding"
    .replace(/\bfoll\.?\s*/gi, '') // "foll." = following
    .replace(/\bfollowing\s*/gi, '') // "following"
    .replace(/\bib\.?\s*/gi, '') // "ib." = ibidem
    .replace(/\besp\.?\s*/gi, '') // "esp." = especially
    .replace(/\bfreq\.?\s*/gi, '') // "freq." = frequently
    .replace(/\bpart\.?\s*/gi, '') // "part." = participle
    .replace(/\bpl\.?\s*/gi, '') // "pl." = plural
    .replace(/\bsing\.?\s*/gi, '') // "sing." = singular
    .replace(/\blit\.?\s*/gi, '') // "lit." = literally
    .replace(/\bfig\.?\s*/gi, '') // "fig." = figuratively
    .replace(/\bconstr\.?\s*/gi, '') // "constr." = construct
    .replace(/\babs\.?\s*/gi, '') // "abs." = absolute
    .replace(/\bact\.?\s*/gi, '') // "act." = active
    .replace(/\bpass\.?\s*/gi, '') // "pass." = passive
    .replace(/\binf\.?\s*/gi, '') // "inf." = infinitive
    .replace(/\bimp\.?\s*/gi, '') // "imp." = imperative
    .replace(/\bperf\.?\s*/gi, '') // "perf." = perfect
    .replace(/\b[IVXLCDM]+[,\s]*\d*[a-d]?\b/g, '') // Roman numerals
    .replace(/\d+[a-d]?\s*(top|bot|mid)?/gi, '') // Page references like "37c top"
    .replace(/\([^)]*\)/g, ' ') // Remove remaining parentheses
    .replace(/\[[^\]]*\]/g, ' ') // Remove brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Skip if result is just notation remnants
  if (/^[\s.,;:_-]+$/.test(text)) return '';

  // Now extract the first meaningful English word(s)
  // Split on comma, semicolon, period (but not abbreviations)
  const parts = text.split(/[,;]|(?<![a-z])\./);

  for (const part of parts) {
    let cleaned = part
      .replace(/^\d+[.)]\s*/, '') // Remove leading numbers
      .replace(/^\s*-\s*/, '') // Remove leading dash
      .replace(/^\s*[.:;,]+\s*/, '') // Remove leading punctuation
      .trim();

    // Skip if empty, too short, has Hebrew, or looks like notation
    if (!cleaned || cleaned.length < 2) continue;
    if (/[\u0590-\u05FF]/.test(cleaned)) continue;
    if (/^[a-z]\.$/.test(cleaned)) continue; // Single letter abbreviation
    if (/^\d+$/.test(cleaned)) continue; // Just numbers
    if (/^(preced|foll|ib|esp|freq|part|pl|sing|lit|fig|ace|same)\.?$/i.test(cleaned)) continue;

    // Take first 3-4 words max
    const words = cleaned.split(/\s+/).filter(w => w.length > 1).slice(0, 4);
    const result = words.join(' ').trim();

    // Final quality check: must have at least 2 meaningful English words
    const meaningfulWords = result.split(/\s+/).filter(w =>
      /^[a-zA-Z]+$/.test(w) && w.length > 2 &&
      !['the', 'and', 'for', 'that', 'with', 'from', 'this', 'same', 'ace'].includes(w.toLowerCase())
    );

    if (meaningfulWords.length >= 1 && result.length >= 3 && result.length < 40) {
      return result;
    }
  }

  return '';
};

/**
 * Try to match a word, stripping Hebrew prefixes if needed
 * @param {string} word - Hebrew word (possibly with prefix)
 * @param {Map<string, string>} glossary - Word → Definition map
 * @returns {{prefix: string, root: string, definition: string}|null}
 */
const matchWithPrefixes = (word, glossary) => {
  // First try exact match
  if (glossary.has(word)) {
    return { prefix: '', root: word, definition: glossary.get(word) };
  }

  // Try stripping one prefix
  if (word.length > 2) {
    const firstChar = word[0];
    if (SINGLE_PREFIXES.includes(firstChar)) {
      const stripped = word.substring(1);
      if (glossary.has(stripped)) {
        return {
          prefix: getPrefixMeaning(firstChar) || '',
          root: stripped,
          definition: glossary.get(stripped)
        };
      }
    }
  }

  // Try stripping two prefixes (e.g., "ומ" = "and from")
  if (word.length > 3) {
    const first = word[0];
    const second = word[1];
    if (SINGLE_PREFIXES.includes(first) && SINGLE_PREFIXES.includes(second)) {
      const stripped = word.substring(2);
      if (glossary.has(stripped)) {
        const p1 = getPrefixMeaning(first) || '';
        const p2 = getPrefixMeaning(second) || '';
        return {
          prefix: [p1, p2].filter(Boolean).join(' '),
          root: stripped,
          definition: glossary.get(stripped)
        };
      }
    }
  }

  return null;
};

/**
 * Apply multi-word phrases from HALACHIC_OVERRIDE first, then single words
 * This produces better translations for common expressions
 * @param {string} text - Hebrew text
 * @returns {string} Text with phrases replaced
 */
const applyMultiWordPhrases = (text) => {
  if (!text) return text;

  let result = text;

  // Get multi-word phrases (2+ words) sorted by length (longest first)
  const multiWordPhrases = Object.entries(HALACHIC_OVERRIDE)
    .filter(([key]) => key.includes(' '))
    .sort((a, b) => b[0].length - a[0].length);

  // Replace multi-word phrases first
  for (const [phrase, translation] of multiWordPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `[${translation}]`);
  }

  return result;
};

/**
 * Apply glossary to replace Hebrew technical terms with English
 * Handles Hebrew prefixes (ו, ה, ש, מ, ל, ב, כ, ד)
 * @param {string} text - Hebrew text
 * @param {Map<string, string>} glossary - Word → Definition map
 * @returns {string} Text with technical terms replaced
 */
const applyGlossaryToText = (text, glossary) => {
  if (!text || glossary.size === 0) return text;

  // FIRST: Apply multi-word phrases from HALACHIC_OVERRIDE
  let processedText = applyMultiWordPhrases(text);

  // Split into words, process each, rejoin
  const words = processedText.split(/(\s+)/); // Keep whitespace
  const result = words.map(word => {
    // Skip whitespace, punctuation, and already-translated brackets
    if (!word.trim() || !/[\u0590-\u05FF]/.test(word)) {
      return word;
    }

    // Skip if already translated (contains brackets)
    if (word.includes('[') || word.includes(']')) {
      return word;
    }

    // Extract Hebrew part (may have punctuation)
    const hebrewMatch = word.match(/^([^\u0590-\u05FF]*)([\u0590-\u05FF]+)([^\u0590-\u05FF]*)$/);
    if (!hebrewMatch) return word;

    const [, before, hebrew, after] = hebrewMatch;

    // Try to match with glossary (with prefix handling)
    const match = matchWithPrefixes(hebrew, glossary);
    if (match) {
      const english = extractPrimaryMeaning(match.definition);
      if (english && english.length >= 1 && english.length < 30) {
        // Combine prefix translation with word translation
        const fullTranslation = match.prefix
          ? `${match.prefix} ${english}`
          : english;
        return `${before}[${fullTranslation}]${after}`;
      }
    }

    return word;
  });

  return result.join('');
};

/**
 * Expand Talmudic abbreviations to help translation
 * Sorted by length (longest first) to match multi-char abbreviations before shorter ones
 * @param {string} text - Text with abbreviations
 * @returns {string} Text with expanded abbreviations
 */
const expandAbbreviations = (text) => {
  if (!text) return text;
  let expanded = text;

  // Sort by length (longest first) so "ובגמ'" matches before "גמ'"
  const sortedAbbrevs = Object.entries(TALMUDIC_ABBREVIATIONS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [abbr, full] of sortedAbbrevs) {
    expanded = expanded.replace(new RegExp(abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), full);
  }
  return expanded;
};

/**
 * Translate Hebrew/Aramaic text to English using SCHOLARLY DICTIONARIES ONLY.
 * NO AI/Machine translation (Lingva, MyMemory, Google Translate).
 *
 * Approach:
 * 1. Use HALACHIC_OVERRIDE for common Talmudic terms (100+ terms)
 * 2. Use Jastrow/BDB via Sefaria API for remaining words
 * 3. If coverage is too low, return null (better than bad AI translation)
 *
 * @param {string} hebrewText - Hebrew/Aramaic text to translate
 * @returns {Promise<{text: string, isScholarly: boolean}|null>} Translation result or null
 */
const translateHebrewText = async (hebrewText) => {
  if (!hebrewText || hebrewText.length < 5) return null;

  // Check cache first
  const cacheKey = hebrewText.substring(0, 100);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Step 1: Expand abbreviations
  let textToTranslate = expandAbbreviations(hebrewText);

  // Step 2: Build dynamic glossary from HALACHIC_OVERRIDE + Jastrow/BDB
  const words = textToTranslate.split(/\s+/).filter(w => w.length >= 2);
  let glossary = new Map();

  try {
    glossary = await buildDynamicGlossary(words);
  } catch (err) {
    log.warn('Translation: Glossary build failed:', err.message);
  }

  // Step 3: Apply glossary - replace Hebrew terms with English
  const textWithGlossary = applyGlossaryToText(textToTranslate, glossary);

  // Count how many words we translated
  const bracketCount = (textWithGlossary.match(/\[/g) || []).length;
  const coverage = words.length > 0 ? bracketCount / words.length : 0;

  log.verbose(`Translation: Glossary coverage ${bracketCount}/${words.length} (${Math.round(coverage * 100)}%)`);

  // If we have at least 30% coverage, create a scholarly translation
  // Raised threshold to reduce garbled output
  if (coverage >= 0.30 || bracketCount >= 4) {
    // Clean up: remove brackets, keep English words, remove untranslated Hebrew
    const cleanedResult = textWithGlossary
      .replace(/\[([^\]]+)\]/g, '$1') // Remove brackets, keep content
      .replace(/[\u0590-\u05FF]+/g, '...') // Replace Hebrew with ellipsis
      .replace(/\.{3,}/g, '...') // Normalize multiple dots
      .replace(/\s+/g, ' ')
      .replace(/^\.\.\.\s*/, '') // Remove leading ellipsis
      .replace(/\s*\.\.\.$/g, '') // Remove trailing ellipsis
      .trim();

    // QUALITY CHECK: Reject garbled translations
    const garbledPatterns = [
      /\b(?:ace|Sifra|Thazr|whatsoever|preced|foll|ib)\b/i,
      /(?:in the same|traditional law)/i,  // Common garbled phrases
      /\.{2,}\s*\.{2,}/,  // Multiple ellipsis groups
    ];

    const isGarbled = garbledPatterns.some(p => p.test(cleanedResult));
    const englishWords = cleanedResult.split(/\s+/).filter(w =>
      /^[a-zA-Z]+$/.test(w) && w.length > 2
    );

    // Normalize articles (a/an) in the final translation
    const normalizedResult = normalizeArticles(cleanedResult);

    // Must have meaningful English content and not be garbled
    if (!isGarbled && normalizedResult && normalizedResult.length > 5 && englishWords.length >= 3) {
      const result = {
        text: normalizedResult,
        isScholarly: true,
        coverage: Math.round(coverage * 100)
      };
      translationCache.set(cacheKey, result);
      log.verbose(`Translation: Scholarly translation: "${cleanedResult.substring(0, 60)}..."`);
      return result;
    } else {
      log.verbose('Translation: Rejected garbled translation:', cleanedResult?.substring(0, 50));
    }
  }

  // Not enough coverage - return null rather than use AI
  // The UI should display Hebrew with "No translation available"
  log.verbose('Translation: Insufficient coverage, skipping AI');
  return null;
};

/**
 * Extract the dibbur haMatchil (opening words) from a commentary comment
 * This is typically bold or appears before a dash/colon
 * @param {string} text - Full comment text
 * @param {Object} options - Configuration options
 * @param {number} options.maxLength - Maximum length for the dibbur (default: 50)
 * @param {number} options.wordCount - Number of words for fallback (default: 4)
 * @returns {string} The dibbur haMatchil or empty string
 */
export const extractDibbur = (text, options = {}) => {
  const { maxLength = 50, wordCount = 4 } = options;

  if (!text) return '';

  // Look for bold tags which often mark the dibbur
  const boldMatch = text.match(/<b>(.*?)<\/b>/);
  if (boldMatch) {
    return cleanHtml(boldMatch[1]);
  }

  // Look for text before a dash or period/colon
  const dashMatch = text.match(/^([^-–—.:]+)[-–—.:]/);
  if (dashMatch) {
    const dibbur = cleanHtml(dashMatch[1]).trim();
    return dibbur.length > maxLength ? dibbur.substring(0, maxLength) + '...' : dibbur;
  }

  // Just return first few words as fallback
  const firstWords = cleanHtml(text).split(' ').slice(0, wordCount).join(' ');
  return firstWords.length > maxLength ? firstWords.substring(0, maxLength) + '...' : firstWords;
};

/**
 * Process comment array for Torah/Tanach style commentary
 * Handles nested array structures for verse-based comments
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {number} options.verse - Specific verse number (if single verse)
 * @returns {Array} Processed comments array
 */
export const processCommentArray = (hebrewData, englishData, options = {}) => {
  const { verse = null } = options;
  const comments = [];

  const heArray = Array.isArray(hebrewData) ? hebrewData : [hebrewData];
  const enArray = Array.isArray(englishData) ? englishData : [englishData];

  if (verse) {
    // Single verse - hebrewData is the comments for that verse
    heArray.forEach((entry, idx) => {
      if (entry) {
        const cleanedEn = cleanHtml(enArray[idx] || '');
        comments.push({
          verse,
          commentIndex: idx + 1,
          hebrew: cleanHtml(entry),
          english: cleanedEn,
          dibbur: extractDibbur(entry),
          translationSource: cleanedEn ? 'Sefaria' : null
        });
      }
    });
  } else {
    // Whole chapter - nested by verse
    heArray.forEach((verseComments, verseIdx) => {
      const enVerseComments = enArray[verseIdx];
      if (Array.isArray(verseComments)) {
        verseComments.forEach((comment, idx) => {
          if (comment) {
            const enComment = Array.isArray(enVerseComments) ? enVerseComments[idx] : '';
            const cleanedEn = cleanHtml(enComment || '');
            comments.push({
              verse: verseIdx + 1,
              commentIndex: idx + 1,
              hebrew: cleanHtml(comment),
              english: cleanedEn,
              dibbur: extractDibbur(comment),
              translationSource: cleanedEn ? 'Sefaria' : null
            });
          }
        });
      } else if (verseComments) {
        const cleanedEn = cleanHtml(enVerseComments || '');
        comments.push({
          verse: verseIdx + 1,
          commentIndex: 1,
          hebrew: cleanHtml(verseComments),
          english: cleanedEn,
          dibbur: extractDibbur(verseComments),
          translationSource: cleanedEn ? 'Sefaria' : null
        });
      }
    });
  }

  return comments;
};

/**
 * Process Talmud-style comments (section-based rather than verse-based)
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {string} options.type - Comment type (e.g., 'halachot', 'aggadot')
 * @returns {Array} Processed comments array
 */
/**
 * Recursively extract paired strings from Hebrew and English nested arrays
 * Maintains correspondence between Hebrew and English at each level
 * @param {*} heData - Hebrew data (nested array or string)
 * @param {*} enData - English data (nested array or string)
 * @returns {Array<{hebrew: string, english: string}>} - Paired strings
 */
const flattenPairedStrings = (heData, enData) => {
  const pairs = [];

  const traverse = (he, en) => {
    if (!he) return;

    if (typeof he === 'string') {
      pairs.push({
        hebrew: he,
        english: typeof en === 'string' ? en : ''
      });
      return;
    }

    if (Array.isArray(he)) {
      he.forEach((item, idx) => {
        const enItem = Array.isArray(en) ? en[idx] : undefined;
        traverse(item, enItem);
      });
    }
  };

  traverse(heData, enData);
  return pairs;
};

export const processTalmudComments = (hebrewData, englishData, options = {}) => {
  const { type = null } = options;
  const comments = [];

  // Debug: Log what we received
  log.verbose('processTalmudComments Input:', {
    hebrewLength: Array.isArray(hebrewData) ? hebrewData.length : 'N/A',
    hebrewType: typeof hebrewData,
    isNested: Array.isArray(hebrewData) && hebrewData.length > 0 && Array.isArray(hebrewData[0])
  });

  const heArray = Array.isArray(hebrewData) ? hebrewData : [hebrewData];
  const enArray = Array.isArray(englishData) ? englishData : [englishData];

  heArray.forEach((entry, idx) => {
    const enEntry = enArray[idx];

    if (Array.isArray(entry)) {
      // Use recursive flattening to handle deeply nested structures (Rashi on Talmud)
      const pairs = flattenPairedStrings(entry, enEntry);

      pairs.forEach((pair, subIdx) => {
        if (pair.hebrew) {
          const cleanedHe = cleanHtml(pair.hebrew);
          const cleanedEn = cleanHtml(pair.english || '');

          if (cleanedHe) { // Only add if we have actual Hebrew text
            const comment = {
              section: idx + 1,
              commentIndex: subIdx + 1,
              hebrew: cleanedHe,
              english: cleanedEn,
              dibbur: extractDibbur(pair.hebrew),
              // Source marker: Sefaria if English exists, otherwise null (needs translation)
              translationSource: cleanedEn ? 'Sefaria' : null
            };
            if (type) comment.type = type;
            comments.push(comment);
          }
        }
      });
    } else if (entry) {
      const cleanedHe = cleanHtml(entry);
      const cleanedEn = cleanHtml(enEntry || '');
      if (cleanedHe) { // Only add if we have actual Hebrew text
        const comment = {
          section: idx + 1,
          commentIndex: 1,
          hebrew: cleanedHe,
          english: cleanedEn,
          dibbur: extractDibbur(entry),
          // Source marker: Sefaria if English exists, otherwise null (needs translation)
          translationSource: cleanedEn ? 'Sefaria' : null
        };
        if (type) comment.type = type;
        comments.push(comment);
      }
    }
  });

  log.verbose(`processTalmudComments: Output ${comments.length} comments`);

  return comments;
};

/**
 * Process Talmud-style comments with parallel translation for missing English
 * Uses fast MyMemory API for full-text translation when Sefaria has no English
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {string} options.type - Comment type (e.g., 'halachot', 'aggadot')
 * @param {boolean} options.skipTranslation - Skip translation entirely (faster)
 * @returns {Promise<Array>} Processed comments array with translations
 */
export const processTalmudCommentsParallel = async (hebrewData, englishData, options = {}) => {
  const { skipTranslation = false } = options;

  // First, build all comments without translation
  const comments = processTalmudComments(hebrewData, englishData, options);

  // If translation is disabled, return immediately
  if (skipTranslation) {
    return comments;
  }

  // Find comments that need translation (have Hebrew but no English from Sefaria)
  const needsTranslation = comments.filter(c => !c.english && c.hebrew);

  if (needsTranslation.length === 0) {
    log.verbose('processTalmudComments: All comments have Sefaria English');
    return comments;
  }

  log.verbose(`processTalmudComments: Translating ${needsTranslation.length} comments via Jastrow/BDB`);

  // Translate all missing in parallel using CAL/Jastrow (scholarly dictionaries)
  const translationPromises = needsTranslation.map(async (comment) => {
    try {
      const result = await translateHebrewText(comment.hebrew);
      if (result && result.text) {
        comment.english = result.text;
        comment.translationSource = 'CAL/Jastrow'; // Mark source as scholarly dictionary
        comment.coverage = result.coverage; // How much was translated
      }
    } catch {
      // Silent fail - translation not critical
    }
  });

  await Promise.all(translationPromises);

  const translatedCount = needsTranslation.filter(c => c.translationSource === 'CAL/Jastrow').length;
  log.verbose(`processTalmudComments: Translated ${translatedCount}/${needsTranslation.length} via CAL/Jastrow`);

  return comments;
};

/**
 * Create a standardized error response for commentary services
 * @param {string} message - Error message
 * @returns {Object} Error response object
 */
export const createErrorResponse = (message) => ({
  error: message,
  comments: []
});

/**
 * Clean and normalize an array of text entries
 * @param {*} arr - Input data (string or array)
 * @returns {Array} Cleaned array of strings
 */
export const cleanTextArray = (arr) => {
  if (!arr) return [];
  if (Array.isArray(arr)) return arr.map(t => cleanHtml(t || ''));
  return [cleanHtml(arr || '')];
};

/**
 * Process comment array with translation fallback (async version)
 * Uses Sefaria English directly - no slow word-by-word translation
 * @param {*} hebrewData - Hebrew text data
 * @param {*} englishData - English text data
 * @param {Object} options - Processing options
 * @param {number} options.verse - Specific verse number (if single verse)
 * @returns {Promise<Array>} Processed comments array
 */
export const processCommentArrayWithTranslation = async (hebrewData, englishData, options = {}) => {
  // Just use the sync version - Sefaria provides English for most Torah commentary
  // Slow word-by-word translation was causing hangs
  return processCommentArray(hebrewData, englishData, options);
};

// =============================================================================
// Exported Constants for shared use
// =============================================================================
export {
  TALMUDIC_ABBREVIATIONS,
  HALACHIC_OVERRIDE,
  RASHI_VOCABULARY
};
