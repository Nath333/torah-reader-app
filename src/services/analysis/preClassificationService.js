// =============================================================================
// PRO SCHOLAR V3: Pre-Classification Service
// Identifies proper nouns, abbreviations, and technical terms BEFORE dictionary lookup
// This prevents wrong homograph matches like משה="to pull" instead of "Moses"
// =============================================================================

import { createLogger, IS_DEV as DEBUG } from '../../utils/debug';
import { stripVowels, stripDiacriticsAndMaqaf, stripAllDiacritics } from '../../utils/hebrewUtils';
// PRO SCHOLAR V5: Frequency analysis (single source of truth)
import {

  getWordFrequency as _getWordFrequency,
  FREQUENCY_BANDS,
} from '../wordFrequencyService';

import {
  BIBLICAL_NAMES,
  TALMUDIC_SAGES,
  TALMUDIC_ABBREVIATIONS,
  TALMUDIC_TECHNICAL_TERMS,
  PLACE_NAMES,
  ARAMAIC_PARTICLES,
  BIBLICAL_PARTICLES,
  SEMANTIC_FIELDS,
  ROOT_FAMILIES,
  HISTORICAL_PERIODS,
  COMMON_VERB_FORMS,
  BINYAN_PARADIGMS,
  HOMOGRAPHS,
  SOURCE_TIERS
} from './preClassificationData';


// Split 03/10/2026 : ces bases vivent dans ./preClassificationData
export {
  BIBLICAL_NAMES,
  TALMUDIC_SAGES,
  TALMUDIC_ABBREVIATIONS,
  TALMUDIC_TECHNICAL_TERMS,
  PLACE_NAMES,
  ARAMAIC_PARTICLES,
  BIBLICAL_PARTICLES,
  SEMANTIC_FIELDS,
  ROOT_FAMILIES,
  HISTORICAL_PERIODS,
  COMMON_VERB_FORMS,
  BINYAN_PARADIGMS,
  HOMOGRAPHS,
  SOURCE_TIERS
};
const log = createLogger('PreClassification');

// =============================================================================
// ABBREVIATION CHARACTER NORMALIZATION
// Handles Unicode variations: geresh (׳/'/') and gershayim (״/"/")
// =============================================================================

/**
 * Normalize abbreviation markers to standard Hebrew characters
 * Converts various apostrophe/quote variants to standard geresh (׳) and gershayim (״)
 * @param {string} word - Word with potential abbreviation markers
 * @returns {string} - Normalized word
 */
const normalizeAbbreviation = (word) => {
  if (!word) return word;
  return word
    // Normalize all single-quote variants to Hebrew geresh
    .replace(/['\u2019\u0027]/g, '׳')  // ' and ' to ׳
    // Normalize all double-quote variants to Hebrew gershayim
    .replace(/["\u201C\u201D\u0022]/g, '״');  // " and " and " to ״
};

/**
 * Normalize Hebrew word for dictionary lookup
 * Strips diacritics, normalizes Unicode, removes invisible characters
 * @param {string} word - Hebrew word to normalize
 * @returns {string} - Normalized word for comparison
 */
const normalizeHebrewWord = (word) => {
  if (!word) return '';
  return stripDiacriticsAndMaqaf(word.normalize('NFC'))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width characters
    .trim();
};

/**
 * Look up a word in a dictionary with normalized comparison
 * @param {object} dict - The dictionary object
 * @param {string} word - The word to look up
 * @returns {any} - The value if found, undefined otherwise
 */
const normalizedLookup = (dict, word) => {
  if (!dict || !word) return undefined;

  // Direct lookup first (fastest)
  if (dict[word]) return dict[word];

  // Normalized lookup
  const normalizedWord = normalizeHebrewWord(word);
  if (dict[normalizedWord]) return dict[normalizedWord];

  // Try finding with normalized keys (slower but handles Unicode edge cases)
  for (const key of Object.keys(dict)) {
    const normalizedKey = normalizeHebrewWord(key);
    if (normalizedKey === normalizedWord) {
      return dict[key];
    }
  }

  return undefined;
};

/**
 * Try to find abbreviation in dictionary with multiple character variants
 * @param {string} word - The abbreviation to look up
 * @returns {object|null} - Matching entry or null
 */
const findAbbreviation = (word) => {
  if (!word) return null;

  // Try original
  if (TALMUDIC_ABBREVIATIONS[word]) return TALMUDIC_ABBREVIATIONS[word];

  // Try normalized abbreviation (quote character normalization)
  const normalized = normalizeAbbreviation(word);
  if (TALMUDIC_ABBREVIATIONS[normalized]) return TALMUDIC_ABBREVIATIONS[normalized];

  // Try with alternate quote characters (for lookup table compatibility)
  const withAsciiQuotes = word
    .replace(/[׳\u05F3]/g, "'")  // geresh to ASCII apostrophe
    .replace(/[״\u05F4]/g, '"'); // gershayim to ASCII quote
  if (TALMUDIC_ABBREVIATIONS[withAsciiQuotes]) return TALMUDIC_ABBREVIATIONS[withAsciiQuotes];

  // Try escaped variants (for JSON compatibility)
  const variants = [
    word,
    normalized,
    withAsciiQuotes,
    word.replace(/'/g, "\\'"),
    word.replace(/"/g, '\\"')
  ];

  for (const variant of variants) {
    if (TALMUDIC_ABBREVIATIONS[variant]) return TALMUDIC_ABBREVIATIONS[variant];
  }

  // Try normalizedLookup as final fallback (handles Unicode edge cases)
  const fromNormalizedLookup = normalizedLookup(TALMUDIC_ABBREVIATIONS, word);
  if (fromNormalizedLookup) return fromNormalizedLookup;

  return null;
};

// =============================================================================
// CONTEXT DETECTION - PRO SCHOLAR V3
// Determines text type from reference string for source prioritization
// =============================================================================

/**
 * Talmud Bavli tractates (for reference detection)
 */
const BAVLI_TRACTATES = new Set([
  'berakhot', 'berachot', 'shabbat', 'shabbos', 'eruvin', 'pesachim', 'shekalim',
  'yoma', 'sukkah', 'beitzah', 'rosh hashanah', 'taanit', 'megillah',
  'moed katan', 'chagigah', 'yevamot', 'ketubot', 'nedarim', 'nazir',
  'sotah', 'gittin', 'kiddushin', 'bava kamma', 'bava metzia', 'bava batra',
  'sanhedrin', 'makkot', 'shevuot', 'avodah zarah', 'horayot', 'zevachim',
  'menachot', 'chullin', 'bekhorot', 'arakhin', 'temurah', 'keritot',
  'meilah', 'tamid', 'niddah'
]);

/**
 * Biblical books (for reference detection)
 */
const BIBLICAL_BOOKS = new Set([
  'genesis', 'bereshit', 'bereishit', 'exodus', 'shemot', 'shemos',
  'leviticus', 'vayikra', 'numbers', 'bamidbar', 'deuteronomy', 'devarim',
  'joshua', 'yehoshua', 'judges', 'shoftim', 'samuel', 'shmuel',
  'kings', 'melachim', 'isaiah', 'yeshayahu', 'jeremiah', 'yirmiyahu',
  'ezekiel', 'yechezkel', 'hosea', 'hoshea', 'joel', 'yoel',
  'amos', 'obadiah', 'ovadiah', 'jonah', 'yonah', 'micah', 'michah',
  'nahum', 'nachum', 'habakkuk', 'chavakuk', 'zephaniah', 'tzefaniah',
  'haggai', 'chaggai', 'zechariah', 'zecharya', 'malachi', 'malachi',
  'psalms', 'tehillim', 'proverbs', 'mishlei', 'job', 'iyov',
  'song of songs', 'shir hashirim', 'ruth', 'lamentations', 'eicha',
  'ecclesiastes', 'kohelet', 'esther', 'daniel', 'ezra', 'nehemiah',
  'chronicles', 'divrei hayamim'
]);

/**
 * Determine text type from reference string
 * @param {string} reference - e.g., "Shabbat 2a", "Genesis 1:1", "Rashi on Shabbat 2a"
 * @returns {string} - 'talmudic', 'biblical', 'mishnaic', 'midrashic', 'commentary', 'unknown'
 */
export const getContextFromReference = (reference) => {
  if (!reference) return 'unknown';

  const ref = reference.toLowerCase().trim();

  // Check for Talmud reference (tractate + daf notation like "2a", "15b")
  const dafPattern = /\d+[ab]/;
  for (const tractate of BAVLI_TRACTATES) {
    if (ref.includes(tractate) && dafPattern.test(ref)) {
      return 'talmudic';
    }
  }

  // Check for Biblical reference (book + chapter:verse notation)
  const chapterVersePattern = /\d+:\d+/;
  for (const book of BIBLICAL_BOOKS) {
    if (ref.includes(book) && chapterVersePattern.test(ref)) {
      // Check if it's commentary on Bible
      if (ref.includes('rashi') || ref.includes('ibn ezra') || ref.includes('ramban')) {
        return 'commentary';
      }
      return 'biblical';
    }
  }

  // Check for Mishnah reference
  if (ref.includes('mishnah') || ref.includes('mishna') || ref.includes('pirkei')) {
    return 'mishnaic';
  }

  // Check for Midrash
  if (ref.includes('midrash') || ref.includes('rabbah') || ref.includes('tanchuma') || ref.includes('sifra') || ref.includes('sifre')) {
    return 'midrashic';
  }

  // Check for commentaries
  if (ref.includes('rashi') || ref.includes('tosafot') || ref.includes('tosfot') || ref.includes('maharsha')) {
    // Commentary on Talmud
    for (const tractate of BAVLI_TRACTATES) {
      if (ref.includes(tractate)) {
        return 'talmudic'; // Rashi on Talmud uses Talmudic vocabulary
      }
    }
    return 'commentary';
  }

  return 'unknown';
};

/**
 * Get primary language for a text type
 * @param {string} textType - Context type from getContextFromReference
 * @returns {string} - 'hebrew', 'aramaic', or 'mixed'
 */
export const getLanguageForContext = (textType) => {
  switch (textType) {
    case 'talmudic':
      return 'aramaic'; // Gemara is primarily Aramaic
    case 'biblical':
      return 'hebrew';
    case 'mishnaic':
      return 'hebrew'; // Mishnah is Hebrew
    case 'midrashic':
      return 'hebrew'; // Mostly Hebrew with some Aramaic
    case 'commentary':
      return 'mixed'; // Varies by commentator
    default:
      return 'hebrew';
  }
};

/**
 * Get recommended dictionary sources for a context type
 * @param {string} textType - Context type
 * @returns {Object} - { primary: [], secondary: [], skip: [] }
 */
export const getSourcesForContext = (textType) => {
  switch (textType) {
    case 'talmudic':
      return {
        primary: ['jastrow', 'cal'],
        secondary: ['bdb'],
        skip: ['strongs'], // Strong's is Biblical Hebrew only
        reason: "Talmudic Aramaic - Strong's excluded"
      };
    case 'biblical':
      return {
        primary: ['bdb', 'strongs'],
        secondary: ['klein', 'halot'],
        skip: [],
        reason: 'Biblical Hebrew'
      };
    case 'mishnaic':
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein'],
        skip: ['strongs'],
        reason: "Mishnaic Hebrew - Strong's excluded"
      };
    case 'midrashic':
      return {
        primary: ['jastrow'],
        secondary: ['bdb', 'klein'],
        skip: ['strongs'],
        reason: "Midrashic text - Strong's excluded"
      };
    case 'commentary':
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein'],
        skip: [],
        reason: 'Commentary (mixed sources)'
      };
    default:
      return {
        primary: ['jastrow', 'bdb'],
        secondary: ['klein'],
        skip: [], // Don't skip anything when context unknown
        reason: 'Unknown context (all sources)'
      };
  }
};

/**
 * Check if a source should be skipped for this context
 * @param {string} sourceName - Source name (case-insensitive)
 * @param {string} textType - Context type
 * @returns {boolean}
 */
export const shouldSkipSource = (sourceName, textType) => {
  if (!sourceName || !textType) return false;
  const sources = getSourcesForContext(textType);
  return sources.skip.includes(sourceName.toLowerCase());
};










// Helper: Find related roots
export const findRelatedRoots = (root) => {
  for (const family of Object.values(ROOT_FAMILIES)) {
    if (family.roots[root]) {
      return {
        family: family.name,
        root: family.roots[root],
        allRelated: family.roots[root].related.map(r => ({
          root: r,
          meaning: family.roots[r]?.meaning || 'see dictionary'
        }))
      };
    }
  }
  return null;
};


// Helper: Detect period from word characteristics
export const detectWordPeriod = (word, context = {}) => {
  // Check indicator words
  for (const [period, data] of Object.entries(HISTORICAL_PERIODS)) {
    if (data.indicators.includes(word)) {
      return {
        period,
        name: data.name,
        range: data.range,
        confidence: 95,
        recommendedDictionaries: data.dictionaries
      };
    }
  }

  // Use context if available
  const textType = context.textType || context.contextType;
  if (textType === 'biblical') {
    return { period: 'BIBLICAL', name: 'Biblical Hebrew', confidence: 80 };
  }
  if (textType === 'talmudic') {
    return { period: 'TALMUDIC_ARAMAIC', name: 'Talmudic Aramaic', confidence: 80 };
  }
  if (textType === 'mishnaic') {
    return { period: 'MISHNAIC', name: 'Mishnaic Hebrew', confidence: 80 };
  }

  return null;
};


// Helper: Look up verb form
export const lookupVerbForm = (word) => {
  const cleaned = stripVowels(word);
  return normalizedLookup(COMMON_VERB_FORMS, cleaned) || normalizedLookup(COMMON_VERB_FORMS, word) || null;
};

// =============================================================================
// CONFIDENCE EXPLANATION GENERATOR - PRO SCHOLAR V5
// Human-readable explanations for confidence scores
// =============================================================================

export const generateConfidenceExplanation = (confidenceResult) => {
  if (!confidenceResult) return 'No confidence data available.';

  // eslint-disable-next-line no-unused-vars
  const { score, factors, tier, recommendation } = confidenceResult;

  const explanations = [];

  // Overall assessment
  if (score >= 90) {
    explanations.push(`High confidence (${score}%): This definition is well-supported.`);
  } else if (score >= 75) {
    explanations.push(`Good confidence (${score}%): This definition is likely accurate.`);
  } else if (score >= 50) {
    explanations.push(`Moderate confidence (${score}%): Consider verifying with additional sources.`);
  } else {
    explanations.push(`Low confidence (${score}%): This definition needs verification.`);
  }

  // Factor explanations
  if (factors && factors.length > 0) {
    const factorExplanations = factors.map(f => {
      switch (f.name) {
        case 'source_tier':
          return tier === 'gold'
            ? 'Found in academic-standard dictionary (Jastrow/BDB)'
            : tier === 'silver'
            ? 'Found in established reference work'
            : 'Based on algorithmic analysis';
        case 'source_count':
          return f.note === '1 sources'
            ? 'Single source - consider cross-referencing'
            : `Confirmed by ${f.note}`;
        case 'context_match':
          return f.note === 'ideal'
            ? 'Source matches text context perfectly'
            : f.note === 'wrong context'
            ? '⚠️ Source may not be ideal for this text type'
            : 'Source is acceptable for this context';
        case 'pre_class':
          return f.note === 'classified'
            ? 'Word was pre-classified (proper noun/technical term)'
            : 'Standard dictionary lookup';
        default:
          return null;
      }
    }).filter(Boolean);

    if (factorExplanations.length > 0) {
      explanations.push('Why: ' + factorExplanations.join('. '));
    }
  }

  return explanations.join(' ');
};


// Helper: Get binyan info
export const getBinyanInfo = (binyanName) => {
  const normalized = binyanName.toUpperCase().replace(/[^A-Z]/g, '');
  return BINYAN_PARADIGMS[normalized] || null;
};


// Helper: Get homograph info
export const getHomographInfo = (word) => {
  const cleaned = stripVowels(word);
  return HOMOGRAPHS[cleaned] || HOMOGRAPHS[word] || null;
};

// Helper: Disambiguate based on context
export const disambiguateHomograph = (word, context = {}) => {
  const info = getHomographInfo(word);
  if (!info) return null;

  const textType = context.textType || context.contextType || 'unknown';
  const previousWord = context.previousWord || '';

  // Filter by context
  let candidates = info.meanings.filter(m =>
    m.contexts.includes('all') || m.contexts.includes(textType)
  );

  // Apply heuristics
  if (candidates.length > 1) {
    // Check for verbal prefixes suggesting verb usage
    const hasVavPrefix = word.startsWith('ו');
    const hasYodPrefix = word.startsWith('י') || word.startsWith('ת');

    if (hasVavPrefix || hasYodPrefix) {
      const verbs = candidates.filter(m => m.pos === 'verb');
      if (verbs.length > 0) candidates = verbs;
    }

    // Check for title patterns (name following)
    if (['רבי', 'רב', 'מר'].includes(previousWord)) {
      const nouns = candidates.filter(m => m.pos === 'noun');
      if (nouns.length > 0) candidates = nouns;
    }
  }

  return {
    word,
    allMeanings: info.meanings,
    likelyMeanings: candidates,
    hints: info.disambiguationHints,
    needsContext: candidates.length > 1
  };
};

// =============================================================================
// TEXTUAL FREQUENCY DATA - PRO SCHOLAR V5
// Re-export from single source of truth: wordFrequencyService.js
// =============================================================================

// Note: Import moved to top of file for ESLint compliance

// Re-export with consistent naming
export const FREQUENCY_TIERS = FREQUENCY_BANDS;

// Wrapper that provides consistent interface
export const getWordFrequency = (word) => {
  const result = _getWordFrequency(word);
  if (!result) return null;
  // Map to expected format for backwards compatibility
  return {
    biblical: result.count,
    rank: result.percentile ? Math.round(100 - result.percentile) : null,
    tier: result.band?.label?.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
    gloss: result.gloss,
    pos: result.pos,
    domain: result.domain,
    root: result.root,
    // Include original data
    _original: result
  };
};

// Helper: Get frequency tier
export const getFrequencyTier = (word) => {
  const freq = getWordFrequency(word);
  if (!freq) return 'UNKNOWN';
  return freq.tier;
};

// =============================================================================
// PRO SCHOLAR V4: ALGORITHMIC PATTERN DETECTION
// No hardcoded lists - detect patterns dynamically!
// =============================================================================

/**
 * ALGORITHMIC abbreviation detection
 * Detects ANY word with ׳ or ״ as an abbreviation
 * Attempts to expand based on common patterns
 */
const detectAbbreviationPattern = (word) => {
  // Check for abbreviation markers: ׳ (geresh) or ״ (gershayim) or ' or "
  const hasAbbrevMarker = /[׳״'"]/.test(word);
  if (!hasAbbrevMarker) return null;

  // Extract the base letters (without markers)
  const letters = word.replace(/[׳״'"]/g, '');

  // Common single-letter abbreviations with geresh
  const singleLetterExpansions = {
    'ר': 'רבי',      // Rabbi
    'ד': 'דף',       // Page
    'פ': 'פרק',      // Chapter
    'ה': 'השם',      // God (HaShem)
    'ב': 'בן',       // Son of
    'מ': 'משנה',     // Mishnah
    'ג': 'גמרא',     // Gemara
  };

  // Two-letter abbreviation patterns
  const twoLetterPatterns = {
    'רה': 'רשות ה',  // Domain of...
    'בה': 'בית ה',   // House of...
    'עה': 'עליו השלום', // Peace upon him
    'זל': 'זכרונו לברכה', // Of blessed memory
  };

  // Try to expand
  if (letters.length === 1 && singleLetterExpansions[letters]) {
    return {
      type: 'abbreviation',
      original: word,
      expansion: singleLetterExpansions[letters],
      meaning: `abbrev. of ${singleLetterExpansions[letters]}`,
      source: 'Pattern Detection',
      skipDictionary: true,
      isPatternDetected: true
    };
  }

  if (letters.length === 2 && twoLetterPatterns[letters]) {
    return {
      type: 'abbreviation',
      original: word,
      expansion: twoLetterPatterns[letters],
      meaning: `abbrev.`,
      source: 'Pattern Detection',
      skipDictionary: true,
      isPatternDetected: true
    };
  }

  // Generic abbreviation - we detected it but can't expand
  return {
    type: 'abbreviation',
    original: word,
    expansion: null,
    meaning: 'abbreviation (unknown expansion)',
    source: 'Pattern Detection',
    skipDictionary: false, // Try dictionary anyway
    isPatternDetected: true
  };
};

/**
 * ALGORITHMIC proper noun detection
 * Detects names based on context patterns, not hardcoded lists
 */
const detectProperNounPattern = (word, previousWord, context) => {
  // Pattern 1: Word after רבי/רב/רבן/מר is likely a name
  const titlePatterns = ['רבי', 'רב', 'רבן', 'מר', 'רבנו', 'מרן'];
  if (previousWord && titlePatterns.some(t => previousWord.startsWith(t))) {
    return {
      type: 'proper_name',
      subtype: 'sage',
      original: word,
      english: word, // Keep Hebrew, it's a name
      note: `Name following ${previousWord}`,
      source: 'Pattern Detection',
      skipDictionary: true,
      isPatternDetected: true
    };
  }

  // Pattern 2: Word starting with capital in transliterated context
  // (Not applicable for Hebrew text)

  // Pattern 3: Known name suffixes (-יהו, -אל, -יה for theophoric names)
  const theophoricSuffixes = ['יהו', 'יה', 'אל'];
  for (const suffix of theophoricSuffixes) {
    if (word.endsWith(suffix) && word.length >= 4) {
      // Likely a Biblical name (Yeshayahu, Yirmiyahu, Gavriel, etc.)
      return {
        type: 'proper_name',
        subtype: 'biblical',
        original: word,
        english: word, // Keep Hebrew
        note: 'Theophoric name pattern (-יהו/-אל)',
        source: 'Pattern Detection',
        skipDictionary: false, // Still check dictionary for info
        isPatternDetected: true
      };
    }
  }

  return null;
};

/**
 * ALGORITHMIC verb pattern detection
 * Identifies verb conjugations by morphological patterns
 */
const detectVerbPattern = (word) => {
  const len = word.length;
  if (len < 3) return null;

  // Future tense prefixes: י, ת, א, נ (reserved for future use)
  // const futurePrefixes = ['י', 'ת', 'א', 'נ'];

  // Past tense suffixes: תי, ת, נו, תם, תן (reserved for future use)
  // const pastSuffixes = ['תי', 'נו', 'תם', 'תן'];

  // Imperative/cohortative: ה suffix on verb

  // Participle patterns
  // Qal active: CוCֵC (4 letters, ו in position 2)
  if (len === 4 && word[1] === 'ו') {
    return {
      pattern: 'Qal Participle',
      root: word[0] + word.slice(2),
      note: 'Active participle (בינוני פועל)'
    };
  }

  // Hiphil: ה prefix + internal י
  if (word.startsWith('ה') && len >= 5 && word.includes('י')) {
    return {
      pattern: 'Hiphil',
      root: word[1] + word.slice(3).replace('י', ''),
      note: 'Causative (הפעיל)'
    };
  }

  // Hitpael: הת prefix
  if (word.startsWith('הת') && len >= 5) {
    return {
      pattern: 'Hitpael',
      root: word.slice(2),
      note: 'Reflexive (התפעל)'
    };
  }

  // Piel: Doubled middle letter (hard to detect without vowels)

  // Nifal: נ prefix
  if (word.startsWith('נ') && len >= 4) {
    return {
      pattern: 'Nifal',
      root: word.slice(1),
      note: 'Passive/Reflexive (נפעל)'
    };
  }

  return null;
};

// =============================================================================
// PRE-CLASSIFICATION FUNCTION (ALGORITHMIC)
// =============================================================================

/**
 * Pre-classify a word using PATTERN DETECTION (not hardcoded lists)
 * Falls back to small reference lists only for very common items
 *
 * @param {string} word - The Hebrew/Aramaic word
 * @param {object} context - Context info { reference, textType, previousWord }
 * @returns {object|null} - Classification result or null if should continue to dictionary
 */
export const preClassify = (word, context = {}) => {
  if (!word || word.length < 2) return null;

  // Normalize Unicode and remove ALL Hebrew diacritics: cantillation marks (0591-05AF), vowels (05B0-05C7)
  // Also remove maqaf (Hebrew hyphen U+05BE) and other marks
  const normalized = word.normalize('NFC');
  // PRO SCHOLAR V8: Use pre-cleaned word from caller for dictionary lookups
  // but keep original word for daf reference detection
  const cleanedLocal = stripDiacriticsAndMaqaf(normalized)
    .replace(/\u200D/g, '');  // Remove zero-width joiner
  // Use caller's cleaned version for dictionary matching if available
  const cleaned = context.cleaned || cleanedLocal;

  // DEBUG: Extensive logging for problem words (only in development)
  if (DEBUG) {
    const debugTargets = ['והכנסה', 'ברישיה', 'משה', 'הכנסה', 'הוצאה', 'ויעבירו'];
    const isDebugTarget = debugTargets.some(t => normalized.includes(t) || cleaned.includes(t));
    if (isDebugTarget) {
      log.debug('[PreClassify ENTRY] Input word:', JSON.stringify(word), 'length:', word.length);
      log.debug('[PreClassify ENTRY] Normalized:', JSON.stringify(normalized), 'length:', normalized.length);
      log.debug('[PreClassify ENTRY] Cleaned:', JSON.stringify(cleaned), 'length:', cleaned.length);
      log.debug('[PreClassify ENTRY] Word codepoints:', [...word].map(c => c.charCodeAt(0).toString(16)).join(' '));
      log.debug('[PreClassify ENTRY] Cleaned codepoints:', [...cleaned].map(c => c.charCodeAt(0).toString(16)).join(' '));
    }
  }

  // === 0. DAF REFERENCES: Detect Hebrew page numbers like צו: (96b), ב. (2a) ===
  // PRO SCHOLAR V9: Enhanced pattern to handle various daf notation formats:
  // - צו: or צו. (basic)
  // - (צו:) or [צו.] (parenthesized)
  // - צו:) (half-parenthesized, common in some texts)
  // - With or without nikud/vowels
  // IMPORTANT: Use 'cleanedLocal' (keeps punctuation!) for daf detection, not 'cleaned' (from dictionary)
  //
  // Pattern: Short Hebrew gematria (1-3 letters) followed by : (amud bet) or . (amud alef)
  // Examples: ב. = 2a, ב: = 2b, צו: = 96b, קנג. = 153a
  const dafDetectionPattern = /^[([]?([א-ת]{1,3})[:.]/;
  // Use cleanedLocal (keeps punctuation) NOT cleaned (from context, may strip punctuation)
  const localNoBrackets = cleanedLocal.replace(/[()[\]]/g, '');
  const dafMatch = localNoBrackets.match(dafDetectionPattern);

  // Also try the original word with brackets/diacritics stripped
  const originalNoBrackets = stripAllDiacritics(word).replace(/[()[\]]/g, '');
  const originalDafMatch = originalNoBrackets.match(dafDetectionPattern);

  const actualDafMatch = dafMatch || originalDafMatch;

  if (actualDafMatch) {
    const hebrewNum = actualDafMatch[1];
    // Determine amud: : = amud bet (b), . = amud alef (a)
    const isAmudBet = word.includes(':') || cleanedLocal.includes(':');

    // PRO SCHOLAR V9: Enhanced gematria conversion
    // Handles standard numbers and special cases (ט״ו = 15, ט״ז = 16)
    const gematria = {
      'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
      'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
      'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
      'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
    };
    let pageNum = 0;
    for (const char of hebrewNum) {
      pageNum += gematria[char] || 0;
    }

    // Valid daf range (most tractates have 2-200 pages)
    // Also require the word to be SHORT (just the page reference, not a real word)
    const wordLen = localNoBrackets.replace(/[:.]/g, '').length;
    if (pageNum >= 2 && pageNum <= 200 && wordLen <= 3) {
      if (DEBUG) {
        log.debug(`[PreClassify] DAF DETECTED: ${word} → page ${pageNum}${isAmudBet ? 'b' : 'a'}`);
      }
      return {
        type: 'reference',
        subtype: 'daf',
        original: word,
        english: `daf ${pageNum}${isAmudBet ? 'b' : 'a'}`,
        meaning: `page ${pageNum}${isAmudBet ? 'b' : 'a'}`,
        pageNumber: pageNum,
        amud: isAmudBet ? 'b' : 'a',
        source: 'Daf Reference',
        skipDictionary: true
      };
    }
  }

  // === 1. ALGORITHMIC: Detect abbreviations by pattern ===
  const abbrevPattern = detectAbbreviationPattern(word);
  if (abbrevPattern) {
    // Check if we have a known expansion
    const knownAbbrev = findAbbreviation(word) || findAbbreviation(cleaned);
    if (knownAbbrev) {
      abbrevPattern.expansion = knownAbbrev.expansion;
      abbrevPattern.meaning = knownAbbrev.meaning;
    }
    if (DEBUG) log.debug(`[PreClassify] Abbreviation pattern: ${word}`);
    return abbrevPattern;
  }

  // === 1.5. Direct abbreviation lookup (for abbreviations without markers like וגו) ===
  const directAbbrev = findAbbreviation(word) || findAbbreviation(cleaned);
  if (directAbbrev) {
    if (DEBUG) log.debug(`[PreClassify] Direct abbreviation: ${word}`);
    return {
      type: 'abbreviation',
      original: word,
      expansion: directAbbrev.expansion,
      meaning: directAbbrev.meaning,
      source: 'Talmudic Abbreviations',
      skipDictionary: false // Let dictionary enrich via expansion
    };
  }

  // === 1.6. Abbreviations with prefixes (מרה"י = מ + רה"י) ===
  // Check if word has an abbreviation marker and try stripping prefixes
  const hasAbbrevMarker = /[׳״'"]/.test(word);
  if (hasAbbrevMarker && word.length > 3) {
    const prefixMeanings = {
      'מ': 'from',
      'ל': 'to',
      'ב': 'in',
      'ו': 'and',
      'כ': 'like',
      'ש': 'that',
      'ד': 'of (Aram.)',
    };

    // Try single prefix
    const firstLetter = word[0];
    if (prefixMeanings[firstLetter]) {
      const remainder = word.slice(1);
      const abbrevMatch = findAbbreviation(remainder);
      if (abbrevMatch) {
        if (DEBUG) log.debug(`[PreClassify] Prefixed abbreviation: ${firstLetter} + ${remainder}`);
        return {
          type: 'abbreviation',
          original: word,
          prefix: firstLetter,
          prefixMeaning: prefixMeanings[firstLetter],
          expansion: abbrevMatch.expansion,
          meaning: `${prefixMeanings[firstLetter]} ${abbrevMatch.meaning}`,
          english: `${prefixMeanings[firstLetter]} ${abbrevMatch.meaning}`,
          source: 'Talmudic Abbreviations',
          skipDictionary: false // Let dictionary enrich via expansion
        };
      }
    }

    // Try double prefix (like דב = of + in)
    if (word.length > 4) {
      const first = word[0];
      const second = word[1];
      if (prefixMeanings[first] && prefixMeanings[second]) {
        const remainder = word.slice(2);
        const abbrevMatch = findAbbreviation(remainder);
        if (abbrevMatch) {
          if (DEBUG) log.debug(`[PreClassify] Double-prefixed abbreviation: ${first}${second} + ${remainder}`);
          return {
            type: 'abbreviation',
            original: word,
            prefix: `${first}${second}`,
            prefixMeaning: `${prefixMeanings[first]} ${prefixMeanings[second]}`,
            expansion: abbrevMatch.expansion,
            meaning: `${prefixMeanings[first]} ${prefixMeanings[second]} ${abbrevMatch.meaning}`,
            english: `${prefixMeanings[first]} ${prefixMeanings[second]} ${abbrevMatch.meaning}`,
            source: 'Talmudic Abbreviations',
            skipDictionary: false // Let dictionary enrich via expansion
          };
        }
      }
    }
  }

  // === PRO SCHOLAR V9: Check TALMUDIC_TECHNICAL_TERMS EARLY (before pattern detection) ===
  // CRITICAL: Must check BEFORE detectProperNounPattern because words like לויה
  // end with יה which would incorrectly trigger theophoric name detection
  // Use normalizedLookup for robust Unicode handling
  const techTermEarly = normalizedLookup(TALMUDIC_TECHNICAL_TERMS, cleaned) || normalizedLookup(TALMUDIC_TECHNICAL_TERMS, word);
  if (techTermEarly) {
    return {
      type: 'technical_term',
      original: word,
      english: techTermEarly.meaning,
      context: techTermEarly.context,
      note: techTermEarly.note,
      source: 'Talmudic Technical Terms',
      confidence: 95,
      skipDictionary: false // Let full dictionary pipeline enrich the source panel
    };
  }

  // === 2. ALGORITHMIC: Detect proper noun patterns ===
  const namePattern = detectProperNounPattern(word, context.previousWord, context);
  if (namePattern) {
    if (DEBUG) log.debug(`[PreClassify] Name pattern: ${word}`);
    return namePattern;
  }

  // === 3. SMALL REFERENCE: Core Biblical names (unavoidable) ===
  // Only the most critical names that MUST not be parsed as verbs
  const coreNames = {
    'משה': 'Moses',
    'אהרן': 'Aaron',
    'אברהם': 'Abraham',
    'יצחק': 'Isaac',
    'יעקב': 'Jacob',
    'דוד': 'David',
    'שלמה': 'Solomon',
  };

  // DEBUG: Log lookups for משה (only in development)
  if (DEBUG && (cleaned === 'משה' || word === 'משה' || normalizeHebrewWord(word) === 'משה')) {
    log.debug('[PreClassify DEBUG] Checking משה - cleaned:', cleaned, 'word:', word);
    log.debug('[PreClassify DEBUG] coreNames[cleaned]:', coreNames[cleaned]);
    log.debug('[PreClassify DEBUG] normalizedLookup result:', normalizedLookup(coreNames, word));
    log.debug('[PreClassify DEBUG] coreNames keys:', Object.keys(coreNames));
  }

  // Use normalizedLookup for robust Unicode handling
  const coreName = normalizedLookup(coreNames, cleaned) || normalizedLookup(coreNames, word);
  if (coreName) {
    return {
      type: 'proper_name',
      subtype: 'biblical',
      original: word,
      english: coreName,
      source: 'Core Names',
      skipDictionary: true
    };
  }

  // === 3.1 PRO SCHOLAR V6.2: Extended proper nouns from BIBLICAL_NAMES dictionary ===
  const biblicalName = BIBLICAL_NAMES[cleaned] || BIBLICAL_NAMES[word];
  if (biblicalName) {
    return {
      type: 'proper_name',
      subtype: biblicalName.type,
      original: word,
      english: biblicalName.name,
      note: biblicalName.note,
      source: 'Biblical Names',
      skipDictionary: true
    };
  }

  // === 3.2 PRO SCHOLAR V6.2: Talmudic Sages (Rabbis) ===
  const sage = TALMUDIC_SAGES[cleaned] || TALMUDIC_SAGES[word];
  if (sage) {
    return {
      type: 'proper_name',
      subtype: sage.type,
      original: word,
      english: sage.name,
      note: sage.note,
      source: 'Talmudic Sages',
      skipDictionary: true
    };
  }

  // === 3.5 PRO SCHOLAR V5: PARTICLE LOOKUP (context-aware) ===
  // Check particles based on text context - Biblical first if biblical context
  const textType = context.textType || context.contextType || 'unknown';
  const isBiblicalContext = textType === 'biblical' || textType === 'tanakh';

  // Check Biblical particles first for Biblical context with normalized lookup
  if (isBiblicalContext) {
    const biblicalParticle = normalizedLookup(BIBLICAL_PARTICLES, cleaned) || normalizedLookup(BIBLICAL_PARTICLES, word);
    if (biblicalParticle) {
      return {
        type: 'biblical_particle',
        original: word,
        english: biblicalParticle.meaning,
        root: biblicalParticle.root,
        form: biblicalParticle.form,
        source: 'Biblical Particles',
        confidence: biblicalParticle.confidence,
        note: biblicalParticle.note,
        skipDictionary: false // Let full dictionary pipeline enrich the source panel
      };
    }
  }

  // Check Aramaic particles (for Talmudic/Midrashic context) with normalized lookup
  const particle = normalizedLookup(ARAMAIC_PARTICLES, cleaned) || normalizedLookup(ARAMAIC_PARTICLES, word);
  if (particle) {
    return {
      type: 'aramaic_particle',
      original: word,
      english: particle.meaning,
      root: particle.root,
      form: particle.form,
      source: 'Aramaic Particles',
      confidence: particle.confidence,
      skipDictionary: false // Let Jastrow/CAL enrich (they have entries for דְּ, כְּדִי, מַאי, etc.)
    };
  }

  // NOTE: TALMUDIC_TECHNICAL_TERMS is now checked early (PRO SCHOLAR V9)
  // at the start of preClassify, before pattern detection

  // For non-Biblical context, also check Biblical particles as fallback with normalized lookup
  if (!isBiblicalContext) {
    const biblicalParticle = normalizedLookup(BIBLICAL_PARTICLES, cleaned) || normalizedLookup(BIBLICAL_PARTICLES, word);
    if (biblicalParticle) {
      return {
        type: 'biblical_particle',
        original: word,
        english: biblicalParticle.meaning,
        root: biblicalParticle.root,
        form: biblicalParticle.form,
        source: 'Biblical Particles',
        confidence: biblicalParticle.confidence - 5, // Slightly lower in non-Biblical context
        note: biblicalParticle.note,
        skipDictionary: false // Let full dictionary pipeline enrich the source panel
      };
    }
  }

  // === 3.6 PRO SCHOLAR V5: COMMON VERB FORMS (instant lookup) with normalized lookup ===
  const verbForm = normalizedLookup(COMMON_VERB_FORMS, cleaned) || normalizedLookup(COMMON_VERB_FORMS, word);
  if (verbForm) {
    // Get related roots for enhanced scholarly info
    const relatedRoots = findRelatedRoots(verbForm.root);

    return {
      type: 'verb_form',
      original: word,
      english: verbForm.meaning,
      root: verbForm.root,
      binyan: verbForm.binyan,
      tense: verbForm.tense,
      person: verbForm.person,
      note: verbForm.note,
      source: 'Common Verb Forms',
      confidence: 95,
      // Enhanced scholarly data
      relatedRoots: relatedRoots ? relatedRoots.allRelated : null,
      rootFamily: relatedRoots ? relatedRoots.family : null,
      skipDictionary: false, // Let full dictionary pipeline enrich with BDB/Jastrow/etc.
      enhancedLookup: true // Signal to use root for deeper lookup
    };
  }

  // NOTE: TALMUDIC_TECHNICAL_TERMS check moved to early position (PRO SCHOLAR V9)

  // === 4. ALGORITHMIC: Detect verb patterns ===
  const verbPattern = detectVerbPattern(cleaned);
  if (verbPattern) {
    // Don't skip dictionary - use this info to ENHANCE lookup
    return {
      type: 'verb_pattern',
      original: word,
      pattern: verbPattern.pattern,
      extractedRoot: verbPattern.root,
      note: verbPattern.note,
      source: 'Morphological Analysis',
      skipDictionary: false, // Continue to dictionary with root info
      useRootLookup: true
    };
  }

  // No pre-classification - continue to dictionary lookup
  return null;
};

/**
 * Expand an abbreviation
 * @param {string} abbrev - The abbreviation
 * @returns {object|null} - Expansion or null
 */
export const expandAbbreviation = (abbrev) => {
  if (!abbrev) return null;
  return TALMUDIC_ABBREVIATIONS[abbrev] || null;
};

/**
 * Check if a word is a known proper name
 * @param {string} word - The word to check
 * @returns {boolean}
 */
export const isProperName = (word) => {
  if (!word) return false;
  const cleaned = stripVowels(word);
  return !!(BIBLICAL_NAMES[word] || BIBLICAL_NAMES[cleaned] ||
            TALMUDIC_SAGES[word] || TALMUDIC_SAGES[cleaned]);
};

/**
 * Check if a word is a technical term
 * @param {string} word - The word to check
 * @returns {boolean}
 */
export const isTechnicalTerm = (word) => {
  if (!word) return false;
  const cleaned = stripVowels(word);
  return !!(TALMUDIC_TECHNICAL_TERMS[word] || TALMUDIC_TECHNICAL_TERMS[cleaned]);
};


/**
 * Get source tier
 */
export const getSourceTier = (sourceName) => {
  if (!sourceName) return 'bronze';
  const name = sourceName.toLowerCase();
  if (SOURCE_TIERS.gold.sources.some(s => name.includes(s))) return 'gold';
  if (SOURCE_TIERS.silver.sources.some(s => name.includes(s))) return 'silver';
  return 'bronze';
};

/**
 * Compute confidence score for a lookup result
 */
export const computeConfidence = (result, textType) => {
  if (!result) return { score: 0, factors: [], recommendation: 'No result' };

  const factors = [];
  let totalScore = 0;

  // Factor 1: Source tier (40% weight)
  const sourceTier = getSourceTier(result.source);
  const tierScore = SOURCE_TIERS[sourceTier]?.reliability || 0.5;
  factors.push({ name: 'source_tier', score: tierScore, weight: 0.4, note: `${sourceTier} tier` });
  totalScore += tierScore * 0.4;

  // Factor 2: Source count (30% weight)
  const sourceCount = result.sources?.length || 1;
  const agreementScore = Math.min(sourceCount / 3, 1);
  factors.push({ name: 'source_count', score: agreementScore, weight: 0.3, note: `${sourceCount} sources` });
  totalScore += agreementScore * 0.3;

  // Factor 3: Context match (20% weight)
  const contextConfig = getSourcesForContext(textType);
  const isAppropriate = contextConfig.primary.some(p => result.source?.toLowerCase().includes(p));
  const isSkipped = contextConfig.skip.some(s => result.source?.toLowerCase().includes(s));
  const contextScore = isSkipped ? 0.2 : isAppropriate ? 1.0 : 0.5;
  factors.push({ name: 'context_match', score: contextScore, weight: 0.2, note: isSkipped ? 'wrong context' : isAppropriate ? 'ideal' : 'ok' });
  totalScore += contextScore * 0.2;

  // Factor 4: Pre-classification (10% weight)
  const isPreClass = result._preClassified || result.isProperNoun || result.isTechnicalTerm;
  const preClassScore = isPreClass ? 1.0 : 0.5;
  factors.push({ name: 'pre_class', score: preClassScore, weight: 0.1, note: isPreClass ? 'classified' : 'lookup' });
  totalScore += preClassScore * 0.1;

  const finalScore = Math.round(totalScore * 100);
  let recommendation = finalScore >= 90 ? 'High confidence' : finalScore >= 75 ? 'Good confidence' : finalScore >= 50 ? 'Moderate' : 'Verify';

  return { score: finalScore, factors, recommendation, tier: sourceTier };
};

// =============================================================================
// EXPORTS
// =============================================================================

const preClassificationService = {
  // Core classification
  preClassify,
  expandAbbreviation,
  isProperName,
  isTechnicalTerm,
  // Context detection
  getContextFromReference,
  getLanguageForContext,
  getSourcesForContext,
  shouldSkipSource,
  // Confidence scoring
  computeConfidence,
  getSourceTier,
  generateConfidenceExplanation,
  SOURCE_TIERS,
  // Reference data
  BIBLICAL_NAMES,
  TALMUDIC_SAGES,
  TALMUDIC_ABBREVIATIONS,
  TALMUDIC_TECHNICAL_TERMS,
  PLACE_NAMES,
  // PRO SCHOLAR V5: Particle tables
  ARAMAIC_PARTICLES,
  BIBLICAL_PARTICLES,
  // PRO SCHOLAR V5: Semantic analysis
  SEMANTIC_FIELDS,
  ROOT_FAMILIES,
  findRelatedRoots,
  // PRO SCHOLAR V5: Historical analysis
  HISTORICAL_PERIODS,
  detectWordPeriod,
  // PRO SCHOLAR V5: Verb analysis
  COMMON_VERB_FORMS,
  lookupVerbForm,
  BINYAN_PARADIGMS,
  getBinyanInfo,
  // PRO SCHOLAR V5: Homograph disambiguation
  HOMOGRAPHS,
  getHomographInfo,
  disambiguateHomograph,
  // PRO SCHOLAR V5: Frequency analysis (re-exported from wordFrequencyService)
  FREQUENCY_TIERS,
  getWordFrequency,
  getFrequencyTier,
};

export default preClassificationService;
