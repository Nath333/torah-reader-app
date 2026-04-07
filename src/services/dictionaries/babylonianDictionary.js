// =============================================================================
// Babylonian (Aramaic) Dictionary Service
// Scholarly Hebrew/Aramaic Language Detection & Analysis
//
// Based on:
// - M. Jastrow, Dictionary of Targumim, Talmud & Midrashic Literature (1903)
// - M. Sokoloff, Dictionary of Jewish Palestinian Aramaic (2002)
// - M. Sokoloff, Dictionary of Jewish Babylonian Aramaic (2002)
// - F. Rosenthal, A Grammar of Biblical Aramaic (1961)
// - HALOT Hebrew & Aramaic Lexicon of the Old Testament
// =============================================================================

import { cleanHebrewWordStrict } from '../../utils/hebrewUtils';

/**
 * Clean an Aramaic/Hebrew word by removing cantillation marks and vowels
 * @param {string} word - The word to clean
 * @returns {string} - The cleaned word with only Hebrew/Aramaic letters
 */
export const cleanAramaicWord = (word) => {
  if (!word || typeof word !== 'string') return '';
  return cleanHebrewWordStrict(word); // Remove diacritics and keep only Hebrew letters
};

// =============================================================================
// SCHOLARLY ARAMAIC MORPHOLOGY
// Based on Rosenthal's Grammar and Sokoloff's Lexicons
// =============================================================================

/**
 * Aramaic morphological patterns with linguistic basis
 * Each pattern includes scholarly reference and confidence weight
 */
const ARAMAIC_MORPHOLOGY = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EMPHATIC STATE (Determinative) - The defining feature of Aramaic
  // Hebrew uses ה prefix for definite article; Aramaic uses א suffix
  // Reference: Rosenthal §27-29, Sokoloff Introduction
  // ═══════════════════════════════════════════════════════════════════════════
  emphaticState: {
    patterns: [
      { regex: /[^ה]א$/, weight: 0.85, desc: 'masc. emphatic -א (not הא)' },
      { regex: /תא$/, weight: 0.9, desc: 'fem. emphatic -תא' },
      { regex: /יתא$/, weight: 0.95, desc: 'abstract noun -יתא' },
      { regex: /ותא$/, weight: 0.9, desc: 'abstract -ותא' },
      { regex: /נא$/, weight: 0.7, desc: 'emphatic variant -נא' },
    ],
    // Exclusions: Hebrew words ending in א that are NOT Aramaic emphatic
    exclude: new Set([
      'הוא', 'היא', 'אלא', 'נא', 'בא', 'רא', 'שא', 'לא', 'מא', 'כא',
      'קרא', 'ברא', 'ירא', 'נשא', 'מלא', 'טמא', 'רפא', 'גלא',
    ])
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARAMAIC VERB CONJUGATIONS
  // Reference: Rosenthal §42-58
  // ═══════════════════════════════════════════════════════════════════════════
  verbPatterns: {
    // Ithpeel (אתפעל) - Aramaic reflexive/passive (Hebrew Nifal/Hitpael equivalent)
    ithpeel: [
      { regex: /^א[תי]/, weight: 0.8, desc: 'Ithpeel prefix את-/אי-' },
      { regex: /^מ[תי]/, weight: 0.75, desc: 'Ithpeel participle מת-' },
    ],
    // Aphel (אפעל) - Aramaic causative (Hebrew Hifil equivalent)
    aphel: [
      { regex: /^א[^תילמנ]/, weight: 0.6, desc: 'Aphel prefix א-' },
    ],
    // Shafel (שפעל) - Causative variant
    shafel: [
      { regex: /^אשת/, weight: 0.9, desc: 'Ishtaphal אשת-' },
      { regex: /^שת/, weight: 0.85, desc: 'Shafel/Ishtaphal שת-' },
    ],
    // Talmudic verb endings
    endings: [
      { regex: /ינן$/, weight: 0.95, desc: '1pl suffix -ינן (אמרינן)' },
      { regex: /יתו$/, weight: 0.9, desc: '2pl suffix -יתו' },
      { regex: /ינהו$/, weight: 0.95, desc: '3pl suffix -ינהו' },
      { regex: /תון$/, weight: 0.85, desc: '2pl suffix -תון' },
      { regex: /ית$/, weight: 0.7, desc: 'perfect 1sg/2ms -ית' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARAMAIC NOUN/ADJECTIVE PLURALS
  // Hebrew: ים- (masc), ות- (fem)  |  Aramaic: ין- (masc), ן- (fem)
  // Reference: Rosenthal §30-32
  // ═══════════════════════════════════════════════════════════════════════════
  plurals: {
    patterns: [
      { regex: /[^ו]ין$/, weight: 0.8, desc: 'masc. plural -ין (not וין)' },
      { regex: /יין$/, weight: 0.85, desc: 'emphatic plural -יין' },
      { regex: /וון$/, weight: 0.9, desc: 'emphatic plural -וון' },
      { regex: /אין$/, weight: 0.85, desc: 'plural -אין' },
      { regex: /תין$/, weight: 0.9, desc: 'fem. plural -תין' },
    ],
    // Hebrew plurals to exclude
    exclude: new Set(['מים', 'שמים', 'חיים', 'פנים', 'ירושלים'])
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARAMAIC PARTICLES & FUNCTION WORDS
  // These are definitively Aramaic - high confidence markers
  // Reference: Jastrow, Sokoloff lexicons
  // ═══════════════════════════════════════════════════════════════════════════
  particles: {
    relative: [
      { regex: /^ד[א-ת]/, weight: 0.75, desc: 'relative ד- (= Hebrew אשר/ש)' },
      { regex: /^די$/, weight: 0.95, desc: 'relative די' },
    ],
    prepositions: [
      { regex: /^ל[^א].*א$/, weight: 0.7, desc: 'ל- + emphatic noun' },
      { regex: /^ב[^א].*א$/, weight: 0.7, desc: 'ב- + emphatic noun' },
      { regex: /^מן$/, weight: 0.6, desc: 'preposition מן' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRONOMINAL SUFFIXES (Aramaic forms)
  // Reference: Rosenthal §33-35
  // ═══════════════════════════════════════════════════════════════════════════
  pronounSuffixes: [
    { regex: /יה$/, weight: 0.65, desc: '3ms suffix -יה (Aramaic variant)' },
    { regex: /הון$/, weight: 0.9, desc: '3pl suffix -הון' },
    { regex: /כון$/, weight: 0.9, desc: '2pl suffix -כון' },
    { regex: /נן$/, weight: 0.8, desc: '1pl suffix -נן' },
    { regex: /הי$/, weight: 0.75, desc: '3fs suffix -הי' },
  ],
};

// =============================================================================
// TALMUDIC ARAMAIC LEXICON
// Definitive Aramaic vocabulary from Jastrow & Sokoloff
// Organized by semantic category for scholarly reference
// =============================================================================

const ARAMAIC_LEXICON = {
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERROGATIVES & DEMONSTRATIVES
  // These have distinct Aramaic forms vs Hebrew equivalents
  // ═══════════════════════════════════════════════════════════════════════════
  interrogatives: new Map([
    ['מאי', { hebrew: 'מה', meaning: 'what', confidence: 0.98 }],
    ['היכי', { hebrew: 'איך', meaning: 'how', confidence: 0.98 }],
    ['אמאי', { hebrew: 'למה', meaning: 'why', confidence: 0.98 }],
    ['היכא', { hebrew: 'איפה', meaning: 'where', confidence: 0.95 }],
    ['מאן', { hebrew: 'מי', meaning: 'who', confidence: 0.95 }],
    ['כמה', { hebrew: 'כמה', meaning: 'how much', confidence: 0.5 }], // Shared
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMONSTRATIVES & ADVERBS OF PLACE/TIME
  // ═══════════════════════════════════════════════════════════════════════════
  demonstratives: new Map([
    ['הכי', { hebrew: 'כך', meaning: 'thus/so', confidence: 0.95 }],
    ['הכא', { hebrew: 'פה/כאן', meaning: 'here', confidence: 0.98 }],
    ['התם', { hebrew: 'שם', meaning: 'there', confidence: 0.98 }],
    ['השתא', { hebrew: 'עכשיו', meaning: 'now', confidence: 0.98 }],
    ['כען', { hebrew: 'עתה', meaning: 'now (Biblical)', confidence: 0.95 }],
    ['הדין', { hebrew: 'זה', meaning: 'this', confidence: 0.9 }],
    ['ההוא', { hebrew: 'ההוא', meaning: 'that one', confidence: 0.7 }],
    ['הני', { hebrew: 'אלה', meaning: 'these', confidence: 0.95 }],
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTENTIAL PARTICLES
  // Aramaic איכא/ליכא vs Hebrew יש/אין
  // ═══════════════════════════════════════════════════════════════════════════
  existentials: new Map([
    ['איכא', { hebrew: 'יש', meaning: 'there is', confidence: 0.99 }],
    ['ליכא', { hebrew: 'אין', meaning: 'there is not', confidence: 0.99 }],
    ['איתא', { hebrew: 'ישנו', meaning: 'it exists', confidence: 0.95 }],
    ['לית', { hebrew: 'אין', meaning: 'there is not', confidence: 0.98 }],
    ['אית', { hebrew: 'יש', meaning: 'there is', confidence: 0.95 }],
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TALMUDIC DISCOURSE MARKERS
  // Technical vocabulary unique to rabbinic dialectic
  // ═══════════════════════════════════════════════════════════════════════════
  discourse: new Map([
    ['דאמר', { meaning: 'who said (relative+verb)', confidence: 0.95 }],
    ['דתני', { meaning: 'who taught', confidence: 0.95 }],
    ['דתנן', { meaning: 'that we learned (Mishnah)', confidence: 0.95 }],
    ['דתנא', { meaning: 'that the Tanna taught', confidence: 0.95 }],
    ['קאמר', { meaning: 'is saying', confidence: 0.98 }],
    ['קתני', { meaning: 'is teaching', confidence: 0.98 }],
    ['קאי', { meaning: 'is standing/referring', confidence: 0.95 }],
    ['לימא', { meaning: 'let us say', confidence: 0.98 }],
    ['נימא', { meaning: 'shall we say', confidence: 0.98 }],
    ['תיקו', { meaning: 'let it stand (unresolved)', confidence: 0.99 }],
    ['פשיטא', { meaning: 'it is obvious', confidence: 0.99 }],
    ['מנלן', { meaning: 'from where [do we know]', confidence: 0.98 }],
    ['שמעינן', { meaning: 'we hear/derive', confidence: 0.95 }],
    ['משמע', { meaning: 'it implies', confidence: 0.8 }],
    ['תנינא', { meaning: 'we have learned', confidence: 0.95 }],
    ['גמירי', { meaning: 'we have learned (tradition)', confidence: 0.95 }],
    ['סברא', { meaning: 'logical reasoning', confidence: 0.9 }],
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON ARAMAIC VERBS (Talmudic forms)
  // ═══════════════════════════════════════════════════════════════════════════
  verbs: new Map([
    ['אמר', { meaning: 'said', confidence: 0.5 }], // Shared with Hebrew
    ['אמרי', { meaning: 'they say', confidence: 0.85 }],
    ['אמרינן', { meaning: 'we say', confidence: 0.98 }],
    ['הוה', { hebrew: 'היה', meaning: 'was', confidence: 0.9 }],
    ['הוי', { meaning: 'be!/was', confidence: 0.85 }],
    ['סבר', { meaning: 'thinks/holds', confidence: 0.85 }],
    ['קסבר', { meaning: 'he holds (the opinion)', confidence: 0.98 }],
    ['בעי', { meaning: 'wants/asks', confidence: 0.9 }],
    ['בעינן', { meaning: 'we want/need', confidence: 0.98 }],
    ['ידע', { meaning: 'knows', confidence: 0.5 }], // Shared
    ['חזי', { meaning: 'see!', confidence: 0.85 }],
    ['חזינן', { meaning: 'we see', confidence: 0.98 }],
    ['קרי', { meaning: 'he calls/reads', confidence: 0.8 }],
    ['אתי', { meaning: 'comes', confidence: 0.85 }],
    ['אתא', { meaning: 'came', confidence: 0.9 }],
    ['עביד', { meaning: 'does/makes', confidence: 0.9 }],
    ['נפק', { meaning: 'goes out', confidence: 0.85 }],
    ['נפקא', { meaning: 'it goes out/derives', confidence: 0.95 }],
    ['יתיב', { meaning: 'sits/dwells', confidence: 0.9 }],
    ['תנא', { meaning: 'taught', confidence: 0.85 }],
    ['תנן', { meaning: 'we learned', confidence: 0.9 }],
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONJUNCTIONS & PARTICLES
  // ═══════════════════════════════════════════════════════════════════════════
  conjunctions: new Map([
    ['דהא', { meaning: 'because/since', confidence: 0.95 }],
    ['דילמא', { meaning: 'perhaps/lest', confidence: 0.98 }],
    ['אלא', { meaning: 'but/rather', confidence: 0.6 }], // Also Hebrew
    ['והא', { meaning: 'and behold', confidence: 0.85 }],
    ['ואי', { meaning: 'and if', confidence: 0.8 }],
    ['אי', { meaning: 'if', confidence: 0.7 }],
    ['כי', { meaning: 'when/that', confidence: 0.4 }], // Very common in Hebrew too
    ['דכי', { meaning: 'that when', confidence: 0.9 }],
    ['כגון', { meaning: 'such as/like', confidence: 0.85 }],
    ['אף', { meaning: 'also/even', confidence: 0.4 }], // Shared
    ['כד', { meaning: 'when', confidence: 0.9 }],
    ['בגין', { meaning: 'because of', confidence: 0.95 }],
  ]),

  // ═══════════════════════════════════════════════════════════════════════════
  // RABBINIC TITLES & PROPER NOUNS
  // ═══════════════════════════════════════════════════════════════════════════
  names: new Map([
    ['רבא', { meaning: 'Rava (Amora)', confidence: 0.95 }],
    ['אביי', { meaning: 'Abaye (Amora)', confidence: 0.98 }],
    ['רבה', { meaning: 'Rabba', confidence: 0.7 }], // Could be Hebrew "great"
    ['רבינא', { meaning: 'Ravina', confidence: 0.95 }],
    ['מר', { meaning: 'Master (title)', confidence: 0.8 }],
  ]),
};

// =============================================================================
// HEBREW EXCLUSION PATTERNS
// Words that look Aramaic but are actually Hebrew
// Prevents false positives in language detection
// =============================================================================

const HEBREW_MARKERS = {
  // Biblical Hebrew definite article (ה prefix + dagesh)
  definitePrefixes: /^ה[א-ת]/,

  // Hebrew relative particle
  relativeAshur: /^אשר/,

  // Common Hebrew words ending in א that are NOT Aramaic emphatic
  hebrewAlephWords: new Set([
    'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'את', 'אנחנו', 'אתם', 'אתן',
    'אלא', 'אלה', 'זאת', 'נא', 'בא', 'יצא', 'קרא', 'ברא', 'מצא', 'נשא',
    'מלא', 'טמא', 'רפא', 'חטא', 'ירא', 'שנא', 'כלא', 'פלא',
    'תורה', 'מצוה', 'ברכה', 'תפלה', 'עבודה', // Common nouns
  ]),

  // Hebrew plural endings
  hebrewPlurals: /(?:ים|ות)$/,

  // Hebrew construct state patterns
  constructState: /[^א]ת$/,

  // Common biblical Hebrew vocabulary
  biblicalHebrew: new Set([
    'אלהים', 'יהוה', 'אדני', 'ישראל', 'משה', 'אברהם', 'יצחק', 'יעקב',
    'ויאמר', 'ויהי', 'אשר', 'כי', 'את', 'אל', 'על', 'עם', 'כל',
    'לא', 'זה', 'מה', 'מי', 'אם', 'או', 'גם', 'רק', 'אך', 'עד',
  ]),
};

// =============================================================================
// WORD-LEVEL ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze a single word for Aramaic characteristics
 * Returns detailed analysis with confidence scoring
 * @param {string} word - Word to analyze
 * @returns {{ isAramaic: boolean, confidence: number, features: string[], hebrewEquivalent?: string }}
 */
export const analyzeWord = (word) => {
  const clean = cleanAramaicWord(word);
  if (!clean || clean.length < 2) {
    return { isAramaic: false, confidence: 0, features: [] };
  }

  const features = [];
  let maxConfidence = 0;
  let hebrewEquivalent = null;

  // Check Hebrew exclusions first (to avoid false positives)
  if (HEBREW_MARKERS.hebrewAlephWords.has(clean)) {
    return { isAramaic: false, confidence: 0.95, features: ['Hebrew common word'] };
  }
  if (HEBREW_MARKERS.biblicalHebrew.has(clean)) {
    return { isAramaic: false, confidence: 0.9, features: ['Biblical Hebrew'] };
  }

  // Check lexicon entries (highest confidence)
  for (const [category, lexicon] of Object.entries(ARAMAIC_LEXICON)) {
    if (lexicon.has(clean)) {
      const entry = lexicon.get(clean);
      features.push(`${category}: ${entry.meaning || clean}`);
      if (entry.hebrew) hebrewEquivalent = entry.hebrew;
      maxConfidence = Math.max(maxConfidence, entry.confidence);
    }
  }

  // Check emphatic state (signature Aramaic feature)
  if (!ARAMAIC_MORPHOLOGY.emphaticState.exclude.has(clean)) {
    for (const pattern of ARAMAIC_MORPHOLOGY.emphaticState.patterns) {
      if (pattern.regex.test(clean)) {
        features.push(`Emphatic: ${pattern.desc}`);
        maxConfidence = Math.max(maxConfidence, pattern.weight);
      }
    }
  }

  // Check verb patterns
  for (const [type, patterns] of Object.entries(ARAMAIC_MORPHOLOGY.verbPatterns)) {
    for (const pattern of patterns) {
      if (pattern.regex.test(clean)) {
        features.push(`Verb (${type}): ${pattern.desc}`);
        maxConfidence = Math.max(maxConfidence, pattern.weight);
      }
    }
  }

  // Check plural patterns
  if (!ARAMAIC_MORPHOLOGY.plurals.exclude.has(clean)) {
    for (const pattern of ARAMAIC_MORPHOLOGY.plurals.patterns) {
      if (pattern.regex.test(clean)) {
        features.push(`Plural: ${pattern.desc}`);
        maxConfidence = Math.max(maxConfidence, pattern.weight);
      }
    }
  }

  // Check particles
  for (const [type, patterns] of Object.entries(ARAMAIC_MORPHOLOGY.particles)) {
    for (const pattern of patterns) {
      if (pattern.regex.test(clean)) {
        features.push(`Particle (${type}): ${pattern.desc}`);
        maxConfidence = Math.max(maxConfidence, pattern.weight);
      }
    }
  }

  // Check pronominal suffixes
  for (const pattern of ARAMAIC_MORPHOLOGY.pronounSuffixes) {
    if (pattern.regex.test(clean)) {
      features.push(`Suffix: ${pattern.desc}`);
      maxConfidence = Math.max(maxConfidence, pattern.weight);
    }
  }

  return {
    isAramaic: maxConfidence >= 0.6,
    confidence: maxConfidence,
    features,
    hebrewEquivalent,
  };
};

/**
 * Check if a word is likely Aramaic (simple boolean check)
 * Optimized for performance in text scanning
 * @param {string} word - The word to check
 * @returns {boolean} - True if word appears to be Aramaic
 */
export const isLikelyAramaic = (word) => {
  const analysis = analyzeWord(word);
  return analysis.isAramaic;
};

// =============================================================================
// TEXT-LEVEL ANALYSIS
// =============================================================================

/**
 * Analyze full text to determine language distribution
 * Uses statistical analysis with scholarly weighting
 * @param {string} text - Text to analyze
 * @returns {{
 *   language: 'hebrew' | 'aramaic' | 'mixed',
 *   confidence: number,
 *   statistics: { total: number, aramaic: number, hebrew: number, mixed: number },
 *   aramaicRatio: number,
 *   sampleAnalysis: Array
 * }}
 */
export const analyzeTextLanguage = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      language: 'hebrew',
      confidence: 0.5,
      statistics: { total: 0, aramaic: 0, hebrew: 0, mixed: 0 },
      aramaicRatio: 0,
      sampleAnalysis: [],
    };
  }

  const words = text.split(/\s+/).filter(w => {
    const clean = cleanAramaicWord(w);
    return clean && clean.length >= 2;
  });

  if (words.length === 0) {
    return {
      language: 'hebrew',
      confidence: 0.5,
      statistics: { total: 0, aramaic: 0, hebrew: 0, mixed: 0 },
      aramaicRatio: 0,
      sampleAnalysis: [],
    };
  }

  let aramaicScore = 0;
  let hebrewScore = 0;
  const sampleAnalysis = [];

  for (const word of words) {
    const analysis = analyzeWord(word);

    // Collect sample for debugging (first 5 significant words)
    if (sampleAnalysis.length < 5 && analysis.features.length > 0) {
      sampleAnalysis.push({
        word: cleanAramaicWord(word),
        isAramaic: analysis.isAramaic,
        confidence: analysis.confidence,
        features: analysis.features,
      });
    }

    if (analysis.isAramaic) {
      // Weight by confidence
      aramaicScore += analysis.confidence;
    } else if (analysis.confidence > 0.5) {
      // Identified as Hebrew
      hebrewScore += analysis.confidence;
    } else {
      // Unknown/neutral - slight Hebrew bias (Torah default)
      hebrewScore += 0.3;
    }
  }

  const totalScore = aramaicScore + hebrewScore;
  const aramaicRatio = totalScore > 0 ? aramaicScore / totalScore : 0;

  // Decision logic with scholarly thresholds
  // Gemara: typically 30%+ Aramaic markers
  // Mishnah: mostly Hebrew with occasional Aramaic (<10%)
  // Targum: 90%+ Aramaic
  // Mixed texts: 10-30%
  let language, confidence;

  if (aramaicRatio >= 0.5) {
    language = 'aramaic';
    confidence = Math.min(0.95, 0.6 + aramaicRatio * 0.4);
  } else if (aramaicRatio >= 0.2) {
    // Talmudic Hebrew/Aramaic mix - lean Aramaic for better dictionary coverage
    language = 'aramaic';
    confidence = 0.65 + aramaicRatio * 0.5;
  } else if (aramaicRatio >= 0.08) {
    // Mixed text (like Mishnah with occasional Aramaic)
    language = 'hebrew';
    confidence = 0.6;
  } else {
    // Pure Hebrew (Torah, Prophets, etc.)
    language = 'hebrew';
    confidence = 0.85 + (0.08 - aramaicRatio) * 2;
  }

  return {
    language,
    confidence: Math.min(confidence, 0.98),
    statistics: {
      total: words.length,
      aramaic: Math.round(aramaicScore),
      hebrew: Math.round(hebrewScore),
      ratio: aramaicRatio,
    },
    aramaicRatio,
    sampleAnalysis,
  };
};

// =============================================================================
// LEGACY API COMPATIBILITY
// =============================================================================

// =============================================================================
// EXPORTS
// NOTE: For actual Aramaic word lookups, use:
// - scholarlyLookup() from scholarlyLexiconService (Jastrow via API)
// - lookupWord() from unifiedLookupService (unified lookup)
// This module provides LANGUAGE DETECTION only (isLikelyAramaic, analyzeWord)
// =============================================================================

const babylonianDictionaryService = {
  // Word analysis (ACTIVE - use these)
  analyzeWord,
  isLikelyAramaic,
  cleanAramaicWord,

  // Text analysis (ACTIVE - use these)
  analyzeTextLanguage,

  // Expose lexicon for advanced analysis
  ARAMAIC_LEXICON,
  ARAMAIC_MORPHOLOGY,
  HEBREW_MARKERS,
};

export default babylonianDictionaryService;
