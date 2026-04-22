/**
 * PRO SCHOLAR V6: Advanced Linguistic Analysis Engine
 * =====================================================
 *
 * Building on V5's direct dictionary validation, V6 adds:
 *
 * 1. BINYAN CONFIDENCE SCORING - Scholarly verb pattern analysis
 * 2. ARAMAIC DIALECT DETECTION - Babylonian vs Palestinian markers
 * 3. CITATION PATTERN RECOGNITION - Rabbinic formula detection
 * 4. ROOT FAMILY EXPANSION - Related words from same shoresh
 * 5. SEMANTIC FIELD CLUSTERING - Conceptual groupings
 * 6. CONTEXTUAL CONFIDENCE BOOSTING - Use surrounding text
 * 7. CROSS-REFERENCE DETECTION - Scripture/Mishnah citations
 *
 * @module proScholarV6
 * @version 6.0.0
 */

import { createLogger } from '../../utils/debug';
import { stripVowels } from '../../utils/hebrewUtils';
import { ARAMAIC_PARTICLES } from './preClassificationService';
import { lookupJastrowSync, lookupBDBSync } from '../dictionaries/dictionaryLoader';

// eslint-disable-next-line no-unused-vars
const log = createLogger('ProScholarV6');

export const PRO_SCHOLAR_V6_VERSION = '6.0.0';

// =============================================================================
// 1. BINYAN CONFIDENCE SCORING
// Scholarly verb pattern analysis with morphological precision
// =============================================================================

/**
 * Complete Binyan definitions with diagnostic patterns
 */
export const BINYAN_ANALYSIS = {
  // Hebrew Binyanim
  QAL: {
    name: 'Qal',
    hebrew: 'קל',
    meaning: 'simple active',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^[א-ת]ו[א-ת][א-ת]$/, // CוCC
      infinitive: /^ל[א-ת]{3}$/, // לCCC
    },
    confidence: 85,
    frequency: 'very common'
  },
  NIFAL: {
    name: "Nif'al",
    hebrew: 'נפעל',
    meaning: 'passive/reflexive of Qal',
    diagnostics: {
      perfect3ms: /^נ[א-ת]{3}$/, // נCCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC (same as Qal but with dagesh)
      participle: /^נ[א-ת]{3}$/, // נCCC
      infinitive: /^ה[א-ת]{3}$/, // הCCC (infinitive construct)
    },
    prefixMarker: 'נ',
    confidence: 82,
    frequency: 'common'
  },
  PIEL: {
    name: "Pi'el",
    hebrew: 'פיעל',
    meaning: 'intensive active',
    diagnostics: {
      perfect3ms: /^[א-ת][א-ת][א-ת]$/, // CCC with dagesh in middle
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    middleDagesh: true,
    confidence: 80,
    frequency: 'common'
  },
  PUAL: {
    name: "Pu'al",
    hebrew: 'פועל',
    meaning: 'intensive passive',
    diagnostics: {
      perfect3ms: /^[א-ת]ו[א-ת][א-ת]$/, // CuCC
      participle: /^מ[א-ת]ו[א-ת][א-ת]$/, // מCוCC
    },
    qubbutzMarker: true,
    confidence: 78,
    frequency: 'less common'
  },
  HIFIL: {
    name: "Hif'il",
    hebrew: 'הפעיל',
    meaning: 'causative active',
    diagnostics: {
      perfect3ms: /^ה[א-ת]{4}$/, // הCCCC or הCCיC
      imperfect3ms: /^י[א-ת]{4}$/, // יCCיC
      participle: /^מ[א-ת]{4}$/, // מCCיC
      infinitive: /^לה[א-ת]{3}$/, // להCCC
    },
    prefixMarker: 'ה',
    yodInfix: true,
    confidence: 83,
    frequency: 'common'
  },
  HUFAL: {
    name: "Huf'al",
    hebrew: 'הופעל',
    meaning: 'causative passive',
    diagnostics: {
      perfect3ms: /^הו[א-ת]{3}$/, // הוCCC
      participle: /^מו[א-ת]{3}$/, // מוCCC
    },
    prefixMarker: 'הו',
    confidence: 75,
    frequency: 'rare'
  },
  HITPAEL: {
    name: "Hitpa'el",
    hebrew: 'התפעל',
    meaning: 'reflexive/reciprocal',
    diagnostics: {
      perfect3ms: /^הת[א-ת]{3}$/, // התCCC
      imperfect3ms: /^ית[א-ת]{3}$/, // יתCCC
      participle: /^מת[א-ת]{3}$/, // מתCCC
      infinitive: /^להת[א-ת]{3}$/, // להתCCC
    },
    prefixMarker: 'הת',
    confidence: 85,
    frequency: 'common'
  },

  // Aramaic Binyanim (Talmudic)
  PEAL: {
    name: "Pe'al",
    hebrew: 'פעל',
    meaning: 'Aramaic simple (= Qal)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC
      participle: /^[א-ת][א-ת]י[א-ת]$/, // CCיC (active)
    },
    confidence: 82,
    frequency: 'very common in Talmud'
  },
  PAEL: {
    name: "Pa'el",
    hebrew: 'פעל',
    meaning: 'Aramaic intensive (= Piel)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^[א-ת]{3}$/, // CCC with dagesh
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    confidence: 78,
    frequency: 'common in Talmud'
  },
  APHEL: {
    name: "Af'el",
    hebrew: 'אפעל',
    meaning: 'Aramaic causative (= Hifil)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^א[א-ת]{3}$/, // אCCC
      imperfect3ms: /^י[א-ת]{3}$/, // יCCC
      participle: /^מ[א-ת]{3}$/, // מCCC
    },
    prefixMarker: 'א',
    confidence: 80,
    frequency: 'common in Talmud'
  },
  ITHPEEL: {
    name: "Ithpe'el",
    hebrew: 'אתפעל',
    meaning: 'Aramaic reflexive (= Hitpael)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^את[א-ת]{3}$/, // אתCCC
      perfect3msAlt: /^אית[א-ת]{3}$/, // איתCCC
      participle: /^מת[א-ת]{3}$/, // מתCCC
    },
    prefixMarker: 'את',
    confidence: 82,
    frequency: 'common in Talmud'
  },
  ITHPAAL: {
    name: "Ithpa'al",
    hebrew: 'אתפעל',
    meaning: 'Aramaic intensive reflexive',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^את[א-ת]{3}$/, // אתCCC
    },
    prefixMarker: 'את',
    confidence: 75,
    frequency: 'less common'
  },
  SHAFEL: {
    name: "Shaf'el",
    hebrew: 'שפעל',
    meaning: 'Aramaic causative (alternative)',
    language: 'aramaic',
    diagnostics: {
      perfect3ms: /^ש[א-ת]{3}$/, // שCCC
    },
    prefixMarker: 'ש',
    confidence: 72,
    frequency: 'rare'
  }
};

/**
 * Analyze a word's binyan with scholarly confidence
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { language, context }
 * @returns {Object} - { binyan, confidence, analysis, alternatives }
 */
export function analyzeBinyan(word, options = {}) {
  // eslint-disable-next-line no-unused-vars
  const { language = 'unknown', context = null } = options; // context reserved for future use
  const cleaned = stripVowels(word);

  const matches = [];
  const binyanList = language === 'aramaic'
    ? ['PEAL', 'PAEL', 'APHEL', 'ITHPEEL', 'ITHPAAL', 'SHAFEL']
    : ['QAL', 'NIFAL', 'PIEL', 'PUAL', 'HIFIL', 'HUFAL', 'HITPAEL'];

  for (const binyanName of binyanList) {
    const binyan = BINYAN_ANALYSIS[binyanName];
    let matchScore = 0;
    let matchedPattern = null;

    // Check each diagnostic pattern
    for (const [patternName, regex] of Object.entries(binyan.diagnostics || {})) {
      if (regex.test(cleaned)) {
        matchScore += 20;
        matchedPattern = patternName;
      }
    }

    // Check prefix markers
    if (binyan.prefixMarker && cleaned.startsWith(binyan.prefixMarker)) {
      matchScore += 30;
    }

    if (matchScore > 0) {
      matches.push({
        binyan: binyanName,
        binyanInfo: binyan,
        score: matchScore,
        matchedPattern,
        confidence: Math.min(95, binyan.confidence + matchScore / 2)
      });
    }
  }

  // Sort by score
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return { binyan: null, confidence: 0, analysis: 'No binyan pattern detected' };
  }

  const best = matches[0];
  return {
    binyan: best.binyan,
    binyanInfo: best.binyanInfo,
    confidence: best.confidence,
    matchedPattern: best.matchedPattern,
    analysis: `${best.binyanInfo.name} (${best.binyanInfo.hebrew}): ${best.binyanInfo.meaning}`,
    alternatives: matches.slice(1, 3).map(m => ({
      binyan: m.binyan,
      confidence: m.confidence
    }))
  };
}

// =============================================================================
// 2. ARAMAIC DIALECT DETECTION
// Distinguish Babylonian (Bavli) from Palestinian (Yerushalmi) Aramaic
// =============================================================================

/**
 * Dialect markers for Babylonian vs Palestinian Aramaic
 */
export const DIALECT_MARKERS = {
  babylonian: {
    name: 'Babylonian Aramaic',
    hebrew: 'ארמית בבלית',
    markers: {
      // Phonological
      'א' : { position: 'final', replaces: 'ה', note: 'Final א instead of ה' },
      // Morphological
      'דידיה': { type: 'possessive', meaning: 'his (emphatic)', confidence: 95 },
      'דידהו': { type: 'possessive', meaning: 'their', confidence: 95 },
      'מר': { type: 'honorific', meaning: 'Master (title)', confidence: 90 },
      'רבנן': { type: 'title', meaning: 'the Rabbis', confidence: 90 },
      // Question forms
      'מאי': { type: 'interrogative', meaning: 'what', confidence: 95 },
      'היכי': { type: 'interrogative', meaning: 'how', confidence: 95 },
      // Verbal
      'קא': { type: 'progressive', meaning: 'is doing (progressive)', confidence: 95 },
      'הוה': { type: 'past', meaning: 'was', confidence: 85 },
    },
    suffixes: ['א', 'תא'], // Emphatic state endings
  },
  palestinian: {
    name: 'Palestinian Aramaic',
    hebrew: 'ארמית ארץ-ישראלית',
    markers: {
      // Morphological
      'דיליה': { type: 'possessive', meaning: 'his', confidence: 90 },
      'אינון': { type: 'pronoun', meaning: 'they', confidence: 90 },
      'הדין': { type: 'demonstrative', meaning: 'this', confidence: 88 },
      // Question forms
      'מה': { type: 'interrogative', meaning: 'what', confidence: 85 },
      'איך': { type: 'interrogative', meaning: 'how', confidence: 85 },
    },
    suffixes: ['ה', 'תה'], // Different emphatic state
  },
  targumic: {
    name: 'Targumic Aramaic',
    hebrew: 'ארמית תרגומית',
    markers: {
      'ית': { type: 'object marker', meaning: 'direct object', confidence: 90 },
      'קדם': { type: 'preposition', meaning: 'before (reverential)', confidence: 88 },
      'מימר': { type: 'noun', meaning: 'Word (divine)', confidence: 92 },
    }
  }
};

/**
 * Detect Aramaic dialect from a word or phrase
 * @param {string} text - Aramaic text
 * @returns {Object} - { dialect, confidence, markers }
 */
export function detectAramaicDialect(text) {
  const cleaned = stripVowels(text);
  const words = cleaned.split(/\s+/);

  const scores = {
    babylonian: 0,
    palestinian: 0,
    targumic: 0
  };

  const foundMarkers = [];

  for (const word of words) {
    for (const [dialectName, dialect] of Object.entries(DIALECT_MARKERS)) {
      for (const [marker, info] of Object.entries(dialect.markers)) {
        if (word === marker || word.includes(marker)) {
          scores[dialectName] += info.confidence / 10;
          foundMarkers.push({
            word,
            marker,
            dialect: dialectName,
            ...info
          });
        }
      }

      // Check suffix patterns
      if (dialect.suffixes) {
        for (const suffix of dialect.suffixes) {
          if (word.endsWith(suffix)) {
            scores[dialectName] += 5;
          }
        }
      }
    }
  }

  // Find highest scoring dialect
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { dialect: 'unknown', confidence: 0, markers: [] };
  }

  const [dialectName, score] = sorted[0];
  const dialect = DIALECT_MARKERS[dialectName];

  return {
    dialect: dialectName,
    dialectInfo: dialect,
    confidence: Math.min(95, score * 5),
    markers: foundMarkers,
    analysis: `${dialect.name} (${dialect.hebrew})`
  };
}

// =============================================================================
// 3. CITATION PATTERN RECOGNITION
// Detect rabbinic citation formulas
// =============================================================================

/**
 * Rabbinic citation patterns
 */
export const CITATION_PATTERNS = {
  // Scripture citations
  'כדכתיב': { type: 'scripture', meaning: 'as it is written', introduces: 'biblical verse', confidence: 98 },
  'דכתיב': { type: 'scripture', meaning: 'that it is written', introduces: 'biblical verse', confidence: 98 },
  'שנאמר': { type: 'scripture', meaning: 'as it says', introduces: 'biblical verse', confidence: 98 },
  'מנלן': { type: 'scripture', meaning: 'from where do we know', introduces: 'question about source', confidence: 95 },
  'מנא הני מילי': { type: 'scripture', meaning: 'from where are these words', introduces: 'source query', confidence: 95 },

  // Mishnah citations
  'תנן': { type: 'mishnah', meaning: 'we learned', introduces: 'Mishnah quote', confidence: 95 },
  'מתניתין': { type: 'mishnah', meaning: 'our Mishnah', introduces: 'Mishnah reference', confidence: 95 },
  'תנא': { type: 'mishnah', meaning: 'it was taught', introduces: 'Tannaitic teaching', confidence: 92 },

  // Baraita citations
  'תניא': { type: 'baraita', meaning: 'it was taught', introduces: 'Baraita quote', confidence: 95 },
  'תנו רבנן': { type: 'baraita', meaning: 'our Rabbis taught', introduces: 'Baraita', confidence: 98 },
  'ת"ר': { type: 'baraita', meaning: 'our Rabbis taught', introduces: 'Baraita (abbrev)', confidence: 98 },

  // Amoraic citations
  'אמר רב': { type: 'amora', meaning: 'Rav said', introduces: 'Amoraic statement', confidence: 95 },
  'אמר רבי': { type: 'amora', meaning: 'Rabbi said', introduces: 'Amoraic statement', confidence: 95 },
  'א"ר': { type: 'amora', meaning: 'Rabbi said (abbrev)', introduces: 'Amoraic statement', confidence: 95 },
  'אמר מר': { type: 'amora', meaning: 'the Master said', introduces: 'Amoraic statement', confidence: 92 },
  'איתמר': { type: 'amora', meaning: 'it was stated', introduces: 'Amoraic dispute', confidence: 95 },

  // Cross-references
  'כדאמרן': { type: 'reference', meaning: 'as we said', introduces: 'internal reference', confidence: 90 },
  'לקמן': { type: 'reference', meaning: 'below', introduces: 'forward reference', confidence: 88 },
  'לעיל': { type: 'reference', meaning: 'above', introduces: 'back reference', confidence: 88 },

  // Logical formulas
  'מה נפשך': { type: 'logic', meaning: 'whichever way you look at it', introduces: 'dilemma', confidence: 95 },
  'אי הכי': { type: 'logic', meaning: 'if so', introduces: 'objection', confidence: 92 },
  'אלא': { type: 'logic', meaning: 'rather', introduces: 'correction', confidence: 85 },
  'ש"מ': { type: 'logic', meaning: 'we learn from this', introduces: 'conclusion', confidence: 95 },
  'שמע מינה': { type: 'logic', meaning: 'we learn from this', introduces: 'conclusion', confidence: 95 },
};

/**
 * Detect citation patterns in text
 * @param {string} text - Talmudic text
 * @returns {Array} - Array of detected citations
 */
export function detectCitationPatterns(text) {
  const cleaned = stripVowels(text);
  const detected = [];

  for (const [pattern, info] of Object.entries(CITATION_PATTERNS)) {
    if (cleaned.includes(pattern)) {
      const index = cleaned.indexOf(pattern);
      detected.push({
        pattern,
        position: index,
        ...info,
        context: cleaned.slice(Math.max(0, index - 10), index + pattern.length + 20)
      });
    }
  }

  // Sort by position in text
  detected.sort((a, b) => a.position - b.position);

  return detected;
}

// =============================================================================
// 4. ROOT FAMILY EXPANSION
// Show related words from the same shoresh
// =============================================================================

/**
 * Common root transformations for family expansion
 */
const ROOT_TRANSFORMATIONS = {
  // Noun patterns from roots
  nounPatterns: [
    { pattern: 'מ_ְ__', name: 'mishkal', example: 'מלך (king)' },
    { pattern: '_ַ__ָן', name: 'qatlan', example: 'רעבתן (glutton)' },
    { pattern: '__וּ_ָה', name: 'qetulah', example: 'גדולה (greatness)' },
    { pattern: '_ִ__ָה', name: 'qitlah', example: 'בינה (understanding)' },
    { pattern: '_ֻ__ָן', name: 'qutlan', example: 'חולשן (weakness)' },
  ],

  // Common semantic extensions
  semanticExtensions: {
    'action': ['doing', 'the act of'],
    'agent': ['one who does', 'doer'],
    'instrument': ['tool for', 'means of'],
    'place': ['place of', 'location'],
    'abstract': ['the quality of', 'state of'],
    'result': ['the result of', 'outcome'],
  }
};

/**
 * Expand a root to find related words
 * @param {string} root - Three-letter Hebrew root
 * @param {Object} options - { includeBiblical, includeTalmudic }
 * @returns {Object} - { root, family, patterns }
 */
export function expandRootFamily(root, options = {}) {
  const { includeBiblical = true, includeTalmudic = true } = options;

  if (!root || root.length < 2 || root.length > 4) {
    return { root, family: [], error: 'Invalid root length' };
  }

  const cleaned = stripVowels(root);
  const family = [];

  // Check Jastrow for Talmudic usage
  if (includeTalmudic) {
    const jastrow = lookupJastrowSync(cleaned);
    if (jastrow) {
      family.push({
        word: jastrow.headword || cleaned,
        source: 'Jastrow',
        definition: jastrow.definition || jastrow.gloss,
        type: 'talmudic',
        confidence: 95
      });
    }
  }

  // Check BDB for Biblical usage
  if (includeBiblical) {
    const bdb = lookupBDBSync(cleaned);
    if (bdb) {
      family.push({
        word: bdb.headword || cleaned,
        source: 'BDB',
        definition: bdb.definition || bdb.gloss,
        type: 'biblical',
        confidence: 95
      });
    }
  }

  // Generate theoretical forms (common patterns)
  const r1 = cleaned[0], r2 = cleaned[1], r3 = cleaned[2] || '';

  const theoreticalForms = [
    // Verbal forms
    { form: `${r1}${r2}${r3}`, type: 'Qal perfect 3ms', confidence: 80 },
    { form: `י${r1}${r2}${r3}`, type: 'Qal imperfect 3ms', confidence: 75 },
    { form: `${r1}ו${r2}${r3}`, type: 'Qal participle', confidence: 75 },
    { form: `ה${r1}${r2}י${r3}`, type: 'Hifil perfect 3ms', confidence: 70 },
    { form: `הת${r1}${r2}${r3}`, type: 'Hitpael perfect 3ms', confidence: 70 },
    // Nominal forms
    { form: `מ${r1}${r2}${r3}`, type: 'maqtal (place/instrument)', confidence: 70 },
    { form: `${r1}${r2}${r3}ה`, type: 'feminine noun', confidence: 65 },
    { form: `${r1}${r2}${r3}ים`, type: 'masculine plural', confidence: 65 },
    { form: `${r1}${r2}${r3}ות`, type: 'feminine plural', confidence: 65 },
  ];

  // Check each theoretical form against dictionaries
  for (const theoretical of theoreticalForms) {
    const jResult = lookupJastrowSync(theoretical.form);
    const bResult = lookupBDBSync(theoretical.form);

    if (jResult || bResult) {
      const entry = jResult || bResult;
      family.push({
        word: theoretical.form,
        source: jResult ? 'Jastrow' : 'BDB',
        definition: entry.definition || entry.gloss,
        type: theoretical.type,
        confidence: theoretical.confidence + 10,
        verified: true
      });
    }
  }

  // Deduplicate by word
  const seen = new Set();
  const uniqueFamily = family.filter(item => {
    if (seen.has(item.word)) return false;
    seen.add(item.word);
    return true;
  });

  return {
    root: cleaned,
    family: uniqueFamily,
    patterns: ROOT_TRANSFORMATIONS.nounPatterns,
    semanticFields: ROOT_TRANSFORMATIONS.semanticExtensions
  };
}

// =============================================================================
// 5. SEMANTIC FIELD CLUSTERING
// Group words by conceptual categories
// =============================================================================

/**
 * Semantic field definitions for Talmudic concepts
 */
export const SEMANTIC_FIELDS = {
  // Halakhic categories
  tumah_taharah: {
    name: 'Purity & Impurity',
    hebrew: 'טומאה וטהרה',
    keywords: ['טמא', 'טהר', 'נדה', 'זב', 'מצורע', 'טבילה', 'מקוה'],
    relatedTractates: ['Kelim', 'Ohalot', 'Negaim', 'Parah', 'Tahorot', 'Mikvaot', 'Niddah']
  },
  kodashim: {
    name: 'Sacrifices',
    hebrew: 'קדשים',
    keywords: ['קרבן', 'עולה', 'חטאת', 'אשם', 'שלמים', 'מנחה', 'זבח', 'מזבח'],
    relatedTractates: ['Zevachim', 'Menachot', 'Chullin', 'Bekhorot', 'Arakhin', 'Temurah']
  },
  shabbat: {
    name: 'Shabbat Laws',
    hebrew: 'שבת',
    keywords: ['מלאכה', 'אב', 'תולדה', 'הוצאה', 'עירוב', 'מוקצה', 'שביתה'],
    relatedTractates: ['Shabbat', 'Eruvin', 'Beitzah']
  },
  nezikin: {
    name: 'Damages',
    hebrew: 'נזיקין',
    keywords: ['נזק', 'חבל', 'גנב', 'גזל', 'שומר', 'פקדון', 'שכירות'],
    relatedTractates: ['Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin']
  },
  nashim: {
    name: 'Family Law',
    hebrew: 'נשים',
    keywords: ['קידושין', 'כתובה', 'גט', 'יבום', 'חליצה', 'סוטה', 'נזיר'],
    relatedTractates: ['Yevamot', 'Ketubot', 'Nedarim', 'Nazir', 'Sotah', 'Gittin', 'Kiddushin']
  },
  berakhot: {
    name: 'Blessings & Prayer',
    hebrew: 'ברכות ותפילה',
    keywords: ['ברכה', 'תפילה', 'שמע', 'עמידה', 'קריאת', 'הלל'],
    relatedTractates: ['Berakhot', 'Megillah', 'Taanit']
  },
  moadim: {
    name: 'Festivals',
    hebrew: 'מועדים',
    keywords: ['חג', 'פסח', 'סוכה', 'לולב', 'שופר', 'יום הכיפורים', 'ראש השנה'],
    relatedTractates: ['Pesachim', 'Shekalim', 'Yoma', 'Sukkah', 'Rosh Hashanah', 'Megillah']
  }
};

/**
 * Identify semantic field for a word
 * @param {string} word - Hebrew word
 * @returns {Object} - { field, confidence, relatedConcepts }
 */
export function identifySemanticField(word) {
  const cleaned = stripVowels(word);
  const matches = [];

  for (const [fieldId, field] of Object.entries(SEMANTIC_FIELDS)) {
    for (const keyword of field.keywords) {
      if (cleaned === keyword || cleaned.includes(keyword) || keyword.includes(cleaned)) {
        matches.push({
          field: fieldId,
          fieldInfo: field,
          keyword,
          confidence: cleaned === keyword ? 95 : 75
        });
      }
    }
  }

  if (matches.length === 0) {
    return { field: null, confidence: 0 };
  }

  // Return best match
  matches.sort((a, b) => b.confidence - a.confidence);
  const best = matches[0];

  return {
    field: best.field,
    fieldName: best.fieldInfo.name,
    hebrew: best.fieldInfo.hebrew,
    confidence: best.confidence,
    matchedKeyword: best.keyword,
    relatedConcepts: best.fieldInfo.keywords,
    relatedTractates: best.fieldInfo.relatedTractates,
    alternatives: matches.slice(1).map(m => ({ field: m.field, confidence: m.confidence }))
  };
}

// =============================================================================
// 6. CONTEXTUAL CONFIDENCE BOOSTING
// Adjust word confidence based on surrounding context
// =============================================================================

/**
 * Boost confidence based on contextual clues
 * @param {Object} lookupResult - Result from word lookup
 * @param {Object} context - { previousWord, nextWord, reference, textType }
 * @returns {Object} - Enhanced result with adjusted confidence
 */
export function applyContextualBoost(lookupResult, context = {}) {
  // eslint-disable-next-line no-unused-vars
  const { previousWord, nextWord, reference, textType } = context; // nextWord reserved for future use

  let confidenceBoost = 0;
  const boostReasons = [];

  // Boost if text type matches source
  if (textType === 'talmudic' && lookupResult.source?.includes('Jastrow')) {
    confidenceBoost += 10;
    boostReasons.push('Jastrow matches Talmudic context');
  }
  if (textType === 'biblical' && lookupResult.source?.includes('BDB')) {
    confidenceBoost += 10;
    boostReasons.push('BDB matches Biblical context');
  }

  // Boost if previous word suggests specific grammatical context
  if (previousWord) {
    const prevCleaned = stripVowels(previousWord);

    // After "אמר" (said) - likely a statement
    if (prevCleaned === 'אמר' || prevCleaned === 'אמרי') {
      confidenceBoost += 5;
      boostReasons.push('Follows citation verb');
    }

    // After definite article - likely a noun
    if (prevCleaned === 'ה' || prevCleaned.endsWith('ה')) {
      confidenceBoost += 3;
      boostReasons.push('Follows definite article');
    }
  }

  // Boost if reference is specific tractate
  if (reference) {
    const tractateMatch = reference.match(/(Shabbat|Berakhot|Pesachim|Yoma|Sukkah|Beitzah|Rosh Hashanah|Taanit|Megillah|Moed Katan|Chagigah|Yevamot|Ketubot|Nedarim|Nazir|Sotah|Gittin|Kiddushin|Bava Kamma|Bava Metzia|Bava Batra|Sanhedrin|Makkot|Shevuot|Avodah Zarah|Horayot|Zevachim|Menachot|Chullin|Bekhorot|Arakhin|Temurah|Keritot|Meilah|Tamid|Middot|Kinnim|Kelim|Ohalot|Negaim|Parah|Tahorot|Mikvaot|Niddah|Makhshirin|Zavim|Tevul Yom|Yadayim|Uktzin)/i);

    if (tractateMatch) {
      const tractate = tractateMatch[1];
      const semanticField = identifySemanticField(lookupResult.cleanedWord || lookupResult.word);

      if (semanticField.relatedTractates?.includes(tractate)) {
        confidenceBoost += 8;
        boostReasons.push(`Word matches ${tractate} semantic field`);
      }
    }
  }

  // Apply boost
  const boostedConfidence = Math.min(100, (lookupResult.confidence || 70) + confidenceBoost);

  return {
    ...lookupResult,
    confidence: boostedConfidence,
    originalConfidence: lookupResult.confidence,
    confidenceBoost,
    boostReasons,
    _contextuallyBoosted: true
  };
}

// =============================================================================
// 7. CROSS-REFERENCE DETECTION
// Identify scripture, Mishnah, and other citations
// =============================================================================

/**
 * Biblical book abbreviations
 */
export const BIBLICAL_BOOKS = {
  // Torah
  'בר\'': 'Genesis', 'בראשית': 'Genesis',
  'שמ\'': 'Exodus', 'שמות': 'Exodus',
  'ויק\'': 'Leviticus', 'ויקרא': 'Leviticus',
  'במד\'': 'Numbers', 'במדבר': 'Numbers',
  'דב\'': 'Deuteronomy', 'דברים': 'Deuteronomy',

  // Prophets
  'יהו\'': 'Joshua', 'יהושע': 'Joshua',
  'שופ\'': 'Judges', 'שופטים': 'Judges',
  'שמו\'': 'Samuel', 'שמואל': 'Samuel', // Using שמו' to avoid conflict with שמ' (Exodus)
  'מל\'': 'Kings', 'מלכים': 'Kings',
  'יש\'': 'Isaiah', 'ישעיה': 'Isaiah',
  'יר\'': 'Jeremiah', 'ירמיה': 'Jeremiah',
  'יחז\'': 'Ezekiel', 'יחזקאל': 'Ezekiel',

  // Writings
  'תה\'': 'Psalms', 'תהלים': 'Psalms',
  'מש\'': 'Proverbs', 'משלי': 'Proverbs',
  'איוב': 'Job',
  'קהל\'': 'Ecclesiastes', 'קהלת': 'Ecclesiastes',
};

/**
 * Detect cross-references in text
 * @param {string} text - Talmudic text
 * @returns {Array} - Detected references with parsed information
 */
export function detectCrossReferences(text) {
  const references = [];

  // Check for book abbreviations
  for (const [abbrev, book] of Object.entries(BIBLICAL_BOOKS)) {
    const regex = new RegExp(`${abbrev}[\\s,]*(\\d+)[:\\s,]*(\\d+)?`, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      references.push({
        type: 'scripture',
        book,
        chapter: parseInt(match[1]),
        verse: match[2] ? parseInt(match[2]) : null,
        raw: match[0],
        position: match.index
      });
    }
  }

  // Check for Mishnah references (e.g., "משנה ברכות")
  const mishnahRegex = /משנה\s+([א-ת]+)/g;
  let mishnahMatch;
  while ((mishnahMatch = mishnahRegex.exec(text)) !== null) {
    references.push({
      type: 'mishnah',
      tractate: mishnahMatch[1],
      raw: mishnahMatch[0],
      position: mishnahMatch.index
    });
  }

  return references;
}

// =============================================================================
// 8. UNIFIED ENHANCED LOOKUP
// Combine all V6 features into one comprehensive lookup
// =============================================================================

/**
 * PRO SCHOLAR V6: Enhanced word analysis
 * Combines all advanced features into comprehensive analysis
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { context, reference, textType, expandFamily }
 * @returns {Object} - Comprehensive analysis result
 */
export function analyzeWordV6(word, options = {}) {
  const {
    context = {},
    reference = null,
    textType = 'unknown',
    expandFamily = false,
    detectDialect = true
  } = options;

  const cleaned = stripVowels(word);
  const result = {
    word,
    cleanedWord: cleaned,
    version: 'ProScholarV6',
    timestamp: Date.now()
  };

  // 1. Check Aramaic particles first (instant lookup)
  const particle = ARAMAIC_PARTICLES[cleaned];
  if (particle) {
    result.type = 'aramaic_particle';
    result.english = particle.meaning;
    result.root = particle.root;
    result.source = 'Aramaic Particles';
    result.confidence = particle.confidence || 95;
    result.isInstantMatch = true;
  }

  // 2. Binyan analysis (for verbs)
  result.binyanAnalysis = analyzeBinyan(cleaned, {
    language: textType === 'talmudic' ? 'aramaic' : 'hebrew'
  });

  // 3. Aramaic dialect detection
  if (detectDialect && (textType === 'talmudic' || textType === 'aramaic')) {
    result.dialectAnalysis = detectAramaicDialect(cleaned);
  }

  // 4. Semantic field identification
  result.semanticField = identifySemanticField(cleaned);

  // 5. Root family expansion (if requested)
  if (expandFamily && cleaned.length >= 2 && cleaned.length <= 4) {
    result.rootFamily = expandRootFamily(cleaned);
  }

  // 6. Apply contextual boosting
  if (context.previousWord || context.nextWord || reference) {
    const boosted = applyContextualBoost(result, {
      ...context,
      reference,
      textType
    });
    result.confidence = boosted.confidence;
    result.boostReasons = boosted.boostReasons;
  }

  return result;
}

// =============================================================================
// 9. HISTORICAL LAYERS - Track word evolution through periods
// =============================================================================

/**
 * Historical period definitions for Hebrew/Aramaic vocabulary
 */
export const HISTORICAL_LAYERS = {
  biblical: {
    name: 'Biblical Hebrew',
    hebrew: 'עברית מקראית',
    period: 'c. 1200-200 BCE',
    sources: ['Torah', 'Prophets', 'Writings'],
    characteristics: ['archaic forms', 'poetic vocabulary', 'limited Aramaic influence']
  },
  latebiblical: {
    name: 'Late Biblical Hebrew',
    hebrew: 'עברית מקראית מאוחרת',
    period: 'c. 500-200 BCE',
    sources: ['Daniel', 'Ezra', 'Nehemiah', 'Chronicles', 'Esther'],
    characteristics: ['Persian loanwords', 'increased Aramaisms', 'new verb forms']
  },
  mishnaic: {
    name: 'Mishnaic Hebrew',
    hebrew: 'עברית משנאית',
    period: 'c. 70-200 CE',
    sources: ['Mishnah', 'Tosefta', 'Tannaitic Midrash'],
    characteristics: ['Greek/Latin loanwords', 'simplified syntax', 'new noun patterns']
  },
  amoraic: {
    name: 'Amoraic Period',
    hebrew: 'תקופת האמוראים',
    period: 'c. 200-500 CE',
    sources: ['Babylonian Talmud', 'Jerusalem Talmud', 'Amoraic Midrash'],
    characteristics: ['extensive Aramaic', 'technical halakhic terms', 'dialectal variation']
  },
  geonic: {
    name: 'Geonic Period',
    hebrew: 'תקופת הגאונים',
    period: 'c. 600-1000 CE',
    sources: ['Geonic Responsa', 'Halakhot Gedolot'],
    characteristics: ['Arabic influence', 'standardization', 'new technical terms']
  }
};

/**
 * Words with documented historical development - PRO SCHOLAR V6.2
 * Tracks semantic evolution through Biblical → Mishnaic → Talmudic → Geonic periods
 */
export const HISTORICAL_EVOLUTION = {
  // ============ CORE RELIGIOUS/LEGAL TERMS ============
  'תורה': {
    biblical: { meaning: 'instruction, teaching', context: 'general guidance from priest or sage' },
    mishnaic: { meaning: 'the Torah (Pentateuch)', context: 'specific reference to Five Books of Moses' },
    talmudic: { meaning: 'Torah study, halakhic tradition', context: 'entire body of Jewish law and learning' }
  },
  'הלכה': {
    biblical: { meaning: 'walking, way of life', context: 'from הלך (to walk)' },
    mishnaic: { meaning: 'legal ruling, accepted practice', context: 'technical halakhic term' },
    talmudic: { meaning: 'Jewish law as a system', context: 'comprehensive legal framework' }
  },
  'מדרש': {
    biblical: { meaning: 'inquiry, seeking', context: 'from דרש (to seek)' },
    mishnaic: { meaning: 'scriptural interpretation', context: 'method of exegesis' },
    talmudic: { meaning: 'collection of interpretations', context: 'genre of rabbinic literature' }
  },
  'משנה': {
    biblical: { meaning: 'repetition, second', context: 'from שנה (to repeat)' },
    mishnaic: { meaning: 'the Mishnah', context: 'Rabbi Judah HaNasi\'s legal compilation (~200 CE)' },
    talmudic: { meaning: 'a single teaching unit', context: 'paragraph of Mishnah = baraita contrast' }
  },
  'גמרא': {
    talmudic: { meaning: 'completion, study', context: 'Aramaic from גמר (to complete)' },
    geonic: { meaning: 'the Talmud itself', context: 'term for the entire work' }
  },
  'ברייתא': {
    mishnaic: { meaning: 'external teaching', context: 'Tannaitic material outside Mishnah' },
    talmudic: { meaning: 'authoritative source for argumentation', context: 'introduced by תניא or תנו רבנן' }
  },
  'אגדה': {
    biblical: { meaning: 'telling, narrative', context: 'from נגד (to tell)' },
    mishnaic: { meaning: 'non-legal teaching', context: 'ethical, homiletical material' },
    talmudic: { meaning: 'narrative/ethical sections', context: 'contrast with הלכה' }
  },

  // ============ INSTITUTIONAL TERMS ============
  'סנהדרין': {
    latebiblical: { meaning: 'council (Greek loan)', context: 'from Greek synedrion' },
    mishnaic: { meaning: 'Supreme Court of 71', context: 'specific halakhic institution' }
  },
  'בית דין': {
    biblical: { meaning: 'house of judgment', context: 'general court' },
    mishnaic: { meaning: 'rabbinic court', context: 'three judges for monetary, 23 for capital' },
    talmudic: { meaning: 'local rabbinic court', context: 'communal religious authority' }
  },
  'סנגור': {
    mishnaic: { meaning: 'defense attorney (Greek loan)', context: 'from Greek synegoros' }
  },
  'קטגור': {
    mishnaic: { meaning: 'prosecutor (Greek loan)', context: 'from Greek kategoros' }
  },

  // ============ LITURGICAL TERMS ============
  'תפילה': {
    biblical: { meaning: 'prayer, intercession', context: 'from פלל (to judge/intercede)' },
    mishnaic: { meaning: 'the Amidah (Shemoneh Esrei)', context: 'specific statutory prayer' },
    talmudic: { meaning: 'prayer generally', context: 'תפילת שחרית/מנחה/ערבית' }
  },
  'ברכה': {
    biblical: { meaning: 'blessing, gift', context: 'verbal blessing or material gift' },
    mishnaic: { meaning: 'liturgical formula', context: 'ברוך אתה ה\' format' },
    talmudic: { meaning: 'specific blessing types', context: 'ברכות הנהנין/המצוות/הודאה' }
  },
  'קדושה': {
    biblical: { meaning: 'holiness, sanctity', context: 'divine attribute' },
    mishnaic: { meaning: 'sanctification prayer', context: 'קדוש קדוש קדוש recitation' },
    talmudic: { meaning: 'liturgical section', context: 'part of Amidah repetition' }
  },

  // ============ LEGAL DOCUMENT TERMS ============
  'פרוזבול': {
    mishnaic: { meaning: 'legal document (Greek loan)', context: 'Hillel\'s enactment for debt collection' }
  },
  'גט': {
    biblical: { meaning: 'document', context: 'general written document' },
    mishnaic: { meaning: 'divorce document', context: 'specific halakhic instrument' },
    talmudic: { meaning: 'technical term for divorce', context: 'סדר גיטין' }
  },
  'כתובה': {
    biblical: { meaning: 'that which is written', context: 'from כתב (to write)' },
    mishnaic: { meaning: 'marriage contract', context: 'financial obligations document' },
    talmudic: { meaning: 'bride\'s financial rights', context: 'מנה מאתים or תוספת' }
  },
  'שטר': {
    biblical: { meaning: 'writing, document', context: 'general legal document' },
    mishnaic: { meaning: 'promissory note', context: 'legally binding financial instrument' },
    talmudic: { meaning: 'various legal documents', context: 'שטר חוב, שטר מכירה' }
  },

  // ============ PURITY TERMS ============
  'טמא': {
    biblical: { meaning: 'ritually impure', context: 'contact with death, bodily emissions' },
    mishnaic: { meaning: 'impurity status', context: 'detailed halakhic categories' },
    talmudic: { meaning: 'theoretical impurity', context: 'academic study after Temple destruction' }
  },
  'טהור': {
    biblical: { meaning: 'ritually pure', context: 'fit for sacred service' },
    mishnaic: { meaning: 'purity status', context: 'achieved through immersion/time' },
    talmudic: { meaning: 'theoretical category', context: 'applied to vessels, foods, persons' }
  },
  'מקוה': {
    biblical: { meaning: 'gathering (of water)', context: 'from קוה (to gather)' },
    mishnaic: { meaning: 'ritual bath', context: 'specific requirements: 40 seah, etc.' },
    talmudic: { meaning: 'purification facility', context: 'detailed halakhot in Miqvaot' }
  },

  // ============ SABBATH/FESTIVAL TERMS ============
  'מלאכה': {
    biblical: { meaning: 'work, craft', context: 'general labor or skilled work' },
    mishnaic: { meaning: '39 categories of work', context: 'prohibited Shabbat activities' },
    talmudic: { meaning: 'primary categories (אבות)', context: 'derivatives (תולדות) derived' }
  },
  'עירוב': {
    biblical: { meaning: 'mixing', context: 'from ערב (to mix)' },
    mishnaic: { meaning: 'Shabbat boundary merger', context: 'עירובי חצרות, תחומין' },
    talmudic: { meaning: 'legal fiction for Shabbat', context: 'detailed in Eruvin tractate' }
  },
  'מוקצה': {
    biblical: { meaning: 'set aside', context: 'from קצה (to cut off)' },
    mishnaic: { meaning: 'Shabbat-forbidden handling', context: 'items set aside from use' },
    talmudic: { meaning: 'categories of muktzeh', context: 'מחמת גופו, מחמת חסרון כיס' }
  },

  // ============ SACRIFICE TERMS ============
  'קרבן': {
    biblical: { meaning: 'offering, sacrifice', context: 'from קרב (to approach)' },
    mishnaic: { meaning: 'Temple sacrifice', context: 'detailed halakhic categories' },
    talmudic: { meaning: 'theoretical study', context: 'post-Temple academic discussion' }
  },
  'עולה': {
    biblical: { meaning: 'that which ascends', context: 'wholly burnt offering' },
    mishnaic: { meaning: 'whole burnt offering', context: 'completely consumed on altar' },
    talmudic: { meaning: 'atoning sacrifice type', context: 'voluntary or obligatory' }
  },
  'חטאת': {
    biblical: { meaning: 'sin offering', context: 'from חטא (to sin)' },
    mishnaic: { meaning: 'purification offering', context: 'for unintentional sins' },
    talmudic: { meaning: 'specific sacrifice category', context: 'blood applied differently from עולה' }
  },

  // ============ GREEK/LATIN LOANWORDS (additional) ============
  'פרקליט': {
    mishnaic: { meaning: 'advocate', context: 'Greek parakletos → Hebrew' }
  },
  'אפיקורס': {
    mishnaic: { meaning: 'heretic', context: 'from Greek Epikouros (Epicurus)' },
    talmudic: { meaning: 'disrespectful of Torah scholars', context: 'expanded meaning' }
  },
  'פרגוד': {
    talmudic: { meaning: 'curtain', context: 'Latin/Greek paragaudion; heavenly curtain' }
  },
  'טרקלין': {
    mishnaic: { meaning: 'dining hall', context: 'Latin triclinium → Hebrew' }
  },
  'פלטין': {
    mishnaic: { meaning: 'palace', context: 'Latin palatium → Hebrew' }
  },

  // ============ PERSIAN LOANWORDS (Late Biblical) ============
  'פרדס': {
    latebiblical: { meaning: 'orchard, park', context: 'Persian pairidaeza → Hebrew (→ English "paradise")' },
    talmudic: { meaning: 'mystical realm', context: 'ארבעה נכנסו לפרדס (mystical ascent)' }
  },
  'דת': {
    latebiblical: { meaning: 'law, decree', context: 'Persian dāta → Hebrew (Esther, Daniel)' },
    mishnaic: { meaning: 'religion', context: 'דת יהודית = Jewish law' }
  },
  'פתגם': {
    latebiblical: { meaning: 'decree, word', context: 'Persian patigāma → Hebrew (Esther)' }
  },
  'גנז': {
    latebiblical: { meaning: 'treasury', context: 'Persian ganza → Hebrew' },
    talmudic: { meaning: 'to store away', context: 'ספרים שנגנזו = hidden books' }
  },

  // ============ RABBINIC TECHNICAL TERMS ============
  'סברא': {
    talmudic: { meaning: 'logical reasoning', context: 'independent of textual source' }
  },
  'סוגיא': {
    talmudic: { meaning: 'Talmudic discussion unit', context: 'literary/thematic unit' }
  },
  'שקלא וטריא': {
    talmudic: { meaning: 'dialectical argumentation', context: 'give and take of debate' }
  },
  'הוה אמינא': {
    talmudic: { meaning: 'I would have said', context: 'rejected preliminary reasoning' }
  },
  'קא משמע לן': {
    talmudic: { meaning: 'it teaches us', context: 'lesson derived from statement' }
  }
};

// =============================================================================
// 9b. LOANWORD DATABASE - PRO SCHOLAR V6.2
// Comprehensive database of Greek, Latin, Persian, Arabic loanwords
// =============================================================================

/**
 * Loanword database with etymology and historical period
 */
export const LOANWORD_DATABASE = {
  // ============ GREEK LOANWORDS ============
  'סנהדרין': { origin: 'Greek', source: 'synedrion', meaning: 'council, assembly', period: 'mishnaic', confidence: 98 },
  'סנגור': { origin: 'Greek', source: 'synegoros', meaning: 'advocate, defender', period: 'mishnaic', confidence: 98 },
  'קטגור': { origin: 'Greek', source: 'kategoros', meaning: 'accuser, prosecutor', period: 'mishnaic', confidence: 98 },
  'פרקליט': { origin: 'Greek', source: 'parakletos', meaning: 'advocate, helper', period: 'mishnaic', confidence: 98 },
  'אפיקורס': { origin: 'Greek', source: 'Epikouros', meaning: 'Epicurean, heretic', period: 'mishnaic', confidence: 98 },
  'פרוזבול': { origin: 'Greek', source: 'pros boulē', meaning: 'before the council', period: 'mishnaic', confidence: 95 },
  'אכסניא': { origin: 'Greek', source: 'xenia', meaning: 'hospitality, inn', period: 'mishnaic', confidence: 95 },
  'אפותיקי': { origin: 'Greek', source: 'apothēkē', meaning: 'storehouse, pledge', period: 'mishnaic', confidence: 95 },
  'בימה': { origin: 'Greek', source: 'bēma', meaning: 'platform, pulpit', period: 'mishnaic', confidence: 95 },
  'גימטריא': { origin: 'Greek', source: 'geometria', meaning: 'numerology', period: 'mishnaic', confidence: 90 },
  'דיפתרא': { origin: 'Greek', source: 'diphthera', meaning: 'leather document', period: 'mishnaic', confidence: 90 },
  'נומוס': { origin: 'Greek', source: 'nomos', meaning: 'law, custom', period: 'mishnaic', confidence: 95 },
  'סנדל': { origin: 'Greek', source: 'sandalion', meaning: 'sandal', period: 'mishnaic', confidence: 95 },
  'פרגוד': { origin: 'Greek', source: 'paragaudion', meaning: 'curtain', period: 'talmudic', confidence: 90 },
  'פתק': { origin: 'Greek', source: 'pittakion', meaning: 'note, ticket', period: 'mishnaic', confidence: 90 },

  // ============ LATIN LOANWORDS ============
  'לגיון': { origin: 'Latin', source: 'legio', meaning: 'legion', period: 'mishnaic', confidence: 98 },
  'פלטין': { origin: 'Latin', source: 'palatium', meaning: 'palace', period: 'mishnaic', confidence: 95 },
  'טרקלין': { origin: 'Latin', source: 'triclinium', meaning: 'dining room', period: 'mishnaic', confidence: 95 },
  'קיסר': { origin: 'Latin', source: 'Caesar', meaning: 'emperor', period: 'mishnaic', confidence: 98 },
  'מטרונה': { origin: 'Latin', source: 'matrona', meaning: 'noble woman', period: 'mishnaic', confidence: 95 },
  'ליטרא': { origin: 'Latin', source: 'libra', meaning: 'pound (weight)', period: 'mishnaic', confidence: 95 },
  'מיל': { origin: 'Latin', source: 'mille', meaning: 'mile', period: 'mishnaic', confidence: 95 },
  'קנס': { origin: 'Latin', source: 'census', meaning: 'fine, tax', period: 'mishnaic', confidence: 90 },
  'ספסל': { origin: 'Latin', source: 'subsellium', meaning: 'bench', period: 'mishnaic', confidence: 90 },

  // ============ PERSIAN LOANWORDS ============
  'פרדס': { origin: 'Persian', source: 'pairidaeza', meaning: 'enclosed garden, paradise', period: 'latebiblical', confidence: 98 },
  'דת': { origin: 'Persian', source: 'dāta', meaning: 'law, decree', period: 'latebiblical', confidence: 98 },
  'פתגם': { origin: 'Persian', source: 'patigāma', meaning: 'decree, word', period: 'latebiblical', confidence: 95 },
  'גנז': { origin: 'Persian', source: 'ganza', meaning: 'treasury', period: 'latebiblical', confidence: 95 },
  'גזבר': { origin: 'Persian', source: 'ganzabara', meaning: 'treasurer', period: 'latebiblical', confidence: 95 },
  'רז': { origin: 'Persian', source: 'rāz', meaning: 'secret, mystery', period: 'latebiblical', confidence: 95 },
  'נשתון': { origin: 'Persian', source: 'ništevan', meaning: 'letter, decree', period: 'latebiblical', confidence: 90 },

  // ============ ARABIC LOANWORDS ============
  'אלגברא': { origin: 'Arabic', source: 'al-jabr', meaning: 'algebra', period: 'geonic', confidence: 95 },
  'סוק': { origin: 'Arabic', source: 'sūq', meaning: 'market', period: 'geonic', confidence: 90 },
  'מחסן': { origin: 'Arabic', source: 'makhzan', meaning: 'storehouse', period: 'geonic', confidence: 90 },
};

/**
 * Detect historical layer of a word
 * @param {string} word - Hebrew word
 * @param {Object} options - { checkEvolution: boolean }
 * @returns {Object} - Historical layer analysis
 */
export function detectHistoricalLayer(word, options = {}) {
  const { checkEvolution = true } = options;
  const cleaned = stripVowels(word);

  const result = {
    word: cleaned,
    primaryLayer: null,
    evolution: null,
    loanwordOrigin: null,
    loanwordDetails: null,
    confidence: 0
  };

  // Check historical evolution database
  if (checkEvolution && HISTORICAL_EVOLUTION[cleaned]) {
    const evolution = HISTORICAL_EVOLUTION[cleaned];
    const periods = Object.keys(evolution);

    result.evolution = evolution;
    result.primaryLayer = periods[0]; // Earliest attested
    result.confidence = 90;

    return result;
  }

  // Check loanword database (high confidence)
  if (LOANWORD_DATABASE[cleaned]) {
    const loanword = LOANWORD_DATABASE[cleaned];
    result.primaryLayer = loanword.period;
    result.loanwordOrigin = loanword.origin;
    result.loanwordDetails = {
      source: loanword.source,
      meaning: loanword.meaning
    };
    result.confidence = loanword.confidence;
    return result;
  }

  // Pattern-based loanword detection (lower confidence)
  // Greek/Latin patterns → Mishnaic or later
  const greekLatinPatterns = /^(פרו|סנ|אפ[יו]|פרק|דיק|נומ|קט[גר]|טרק|לג[יו]|פלט|קיס)/;
  if (greekLatinPatterns.test(cleaned)) {
    result.primaryLayer = 'mishnaic';
    result.loanwordOrigin = 'Greek/Latin';
    result.confidence = 70;
    return result;
  }

  // Persian patterns → Late Biblical
  const persianPatterns = /^(פרד|גנז|דת|פת[גם]|רז|נשת)/;
  if (persianPatterns.test(cleaned)) {
    result.primaryLayer = 'latebiblical';
    result.loanwordOrigin = 'Persian';
    result.confidence = 65;
    return result;
  }

  // Arabic patterns → Geonic
  const arabicPatterns = /^(אל[גא]|מח[סז]|סוק)/;
  if (arabicPatterns.test(cleaned)) {
    result.primaryLayer = 'geonic';
    result.loanwordOrigin = 'Arabic';
    result.confidence = 60;
    return result;
  }

  return result;
}

// =============================================================================
// 10. GRAMMATICAL ANOMALIES - Special forms that scholars discuss
// =============================================================================

/**
 * Database of grammatical anomalies and irregular forms - PRO SCHOLAR V6.2
 * Based on Gesenius-Kautzsch-Cowley, Joüon-Muraoka, and HALOT
 */
export const GRAMMATICAL_ANOMALIES = {
  // ============ IRREGULAR PLURALS ============
  'אשה': {
    type: 'irregular_plural',
    singular: 'אשה',
    plural: 'נשים',
    note: 'Suppletive plural from different root (possibly *ʾnš)',
    scholarly: 'BDB notes this as one of few Hebrew suppletive plurals; cf. English woman/women'
  },
  'עיר': {
    type: 'irregular_plural',
    singular: 'עיר',
    plural: 'ערים',
    note: 'Feminine noun with apparent masculine plural ending',
    scholarly: 'Joüon-Muraoka §89c discusses dual gender nouns'
  },
  'אב': {
    type: 'irregular_plural',
    singular: 'אב',
    plural: 'אבות',
    note: 'Segholate noun with unique plural pattern',
    scholarly: 'Common Semitic pattern, cf. Akkadian abu/abbūtu'
  },
  'איש': {
    type: 'irregular_plural',
    singular: 'איש',
    plural: 'אנשים',
    note: 'Suppletive plural from root *ʾnš (same as אשה related)',
    scholarly: 'GKC §96 discusses irregular noun plurals'
  },
  'בת': {
    type: 'irregular_plural',
    singular: 'בת',
    plural: 'בנות',
    note: 'Plural adds נ from different base form',
    scholarly: 'Cf. construct בַּת vs. plural בָּנוֹת; related to בן family'
  },
  'יום': {
    type: 'irregular_plural',
    singular: 'יום',
    plural: 'ימים',
    note: 'Segholate with internal vowel change in plural',
    scholarly: 'Common pattern for monosyllabic nouns; cf. Akkadian ūmu/ūmū'
  },
  'מים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'מים',
    note: 'Always plural (plurale tantum); no attested singular form',
    scholarly: 'GKC §88d; cf. שמים (heavens), also always plural'
  },
  'שמים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'שמים',
    note: 'Always dual/plural form; cosmological significance',
    scholarly: 'Joüon-Muraoka §90f discusses pluralia tantum'
  },
  'פנים': {
    type: 'dual_only',
    singular: 'N/A',
    plural: 'פנים',
    note: 'Face (always plural); construct פְּנֵי',
    scholarly: 'Dual form for paired body parts; לִפְנֵי = "before, in front of"'
  },
  'ראש': {
    type: 'irregular_plural',
    singular: 'ראש',
    plural: 'ראשים/ראשות',
    note: 'Has both masculine and feminine plural forms',
    scholarly: 'GKC §87p; semantic distinction between the forms'
  },

  // ============ DEFECTIVE/WEAK VERBS ============
  'נתן': {
    type: 'assimilating_nun',
    root: 'נתן',
    phenomenon: 'PE-NUN assimilation',
    note: 'First נ assimilates in certain forms: יִתֵּן instead of יִנְתֵּן',
    scholarly: 'Gesenius §66b discusses PE-NUN weak verbs'
  },
  'לקח': {
    type: 'pseudo_pe_nun',
    root: 'לקח',
    phenomenon: 'Behaves like PE-NUN despite having ל',
    note: 'Imperfect יִקַּח shows assimilation pattern',
    scholarly: 'Listed as PE-NUN verb in most grammars despite etymology'
  },
  'הלך': {
    type: 'irregular_verb',
    root: 'הלך',
    phenomenon: 'Mixed PE-YOD/PE-WAW patterns',
    note: 'Shows both weak patterns: יֵלֵךְ (PE-YOD) but הָלַךְ (regular)',
    scholarly: 'Possibly originally PE-WAW root, cf. Akkadian alāku'
  },
  'נגש': {
    type: 'assimilating_nun',
    root: 'נגש',
    phenomenon: 'PE-NUN assimilation',
    note: 'Imperfect יִגַּשׁ shows nun assimilation',
    scholarly: 'Regular PE-NUN pattern; Hifil הִגִּישׁ'
  },
  'נפל': {
    type: 'assimilating_nun',
    root: 'נפל',
    phenomenon: 'PE-NUN assimilation',
    note: 'Imperfect יִפֹּל (not יִנְפֹּל)',
    scholarly: 'GKC §66b; common PE-NUN verb'
  },
  'נשא': {
    type: 'assimilating_nun',
    root: 'נשא',
    phenomenon: 'PE-NUN with final aleph',
    note: 'Combines PE-NUN and LAMED-ALEPH weaknesses',
    scholarly: 'Doubly weak verb; imperfect יִשָּׂא'
  },
  'ישב': {
    type: 'pe_yod',
    root: 'ישב',
    phenomenon: 'PE-YOD apocopation',
    note: 'Imperfect יֵשֵׁב (yod quiesces); Hifil הוֹשִׁיב',
    scholarly: 'GKC §69; original *wšb (PE-WAW)'
  },
  'ירד': {
    type: 'pe_yod',
    root: 'ירד',
    phenomenon: 'PE-YOD apocopation',
    note: 'Imperfect יֵרֵד; opposite of עלה semantically',
    scholarly: 'Original *wrd; cf. Arabic warada'
  },
  'יצא': {
    type: 'pe_yod',
    root: 'יצא',
    phenomenon: 'PE-YOD with LAMED-ALEPH',
    note: 'Doubly weak: imperfect יֵצֵא',
    scholarly: 'Important exodus verb; יְצִיאַת מִצְרַיִם'
  },
  'בוא': {
    type: 'hollow_verb',
    root: 'בוא',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Middle radical quiesces: perfect בָּא, imperfect יָבוֹא',
    scholarly: 'GKC §72; paired semantically with יצא'
  },
  'קום': {
    type: 'hollow_verb',
    root: 'קום',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Middle radical quiesces: perfect קָם, imperfect יָקוּם',
    scholarly: 'Hifil הֵקִים "to establish"; key covenantal verb'
  },
  'שים': {
    type: 'hollow_verb',
    root: 'שים',
    phenomenon: 'AYIN-YOD hollow verb',
    note: 'Alternative root שׂום; imperfect יָשִׂים',
    scholarly: 'Variant spellings in MT; semantic "to place, put"'
  },
  'מות': {
    type: 'hollow_verb',
    root: 'מות',
    phenomenon: 'AYIN-WAW hollow verb',
    note: 'Perfect מֵת, imperfect יָמוּת; Hifil הֵמִית "to kill"',
    scholarly: 'מָוֶת (death) is personified in Ugaritic as deity Mot'
  },
  'היה': {
    type: 'lamed_he',
    root: 'היה',
    phenomenon: 'LAMED-HE verb (to be)',
    note: 'Unique stative verb; imperfect יִהְיֶה',
    scholarly: 'Related to divine name יהוה (GKC §75)'
  },
  'ראה': {
    type: 'lamed_he',
    root: 'ראה',
    phenomenon: 'LAMED-HE verb',
    note: 'Final ה drops in certain forms; imperfect יִרְאֶה',
    scholarly: 'Nifal נִרְאָה "to appear"; important revelation term'
  },
  'עשה': {
    type: 'lamed_he',
    root: 'עשה',
    phenomenon: 'LAMED-HE verb',
    note: 'Most frequent LAMED-HE verb (~2,600 occurrences)',
    scholarly: 'Basic action verb; imperfect יַעֲשֶׂה'
  },
  'בנה': {
    type: 'lamed_he',
    root: 'בנה',
    phenomenon: 'LAMED-HE verb',
    note: 'Perfect בָּנָה, imperfect יִבְנֶה',
    scholarly: 'Related to בֵּן (son), בַּיִת (house); family terminology'
  },
  'ידה': {
    type: 'lamed_he',
    root: 'ידה',
    phenomenon: 'LAMED-HE verb (to praise/confess)',
    note: 'Hifil הוֹדָה "to give thanks"; תּוֹדָה = thanksgiving',
    scholarly: 'Liturgical importance; Hallel psalms'
  },

  // ============ UNUSUAL CONSTRUCTS ============
  'בן': {
    type: 'irregular_construct',
    absolute: 'בֵּן',
    construct: 'בֶּן/בִּן',
    note: 'Construct changes vowel pattern; plural construct בְּנֵי',
    scholarly: 'Part of broader pattern in family terms (GKC §96)'
  },
  'בית': {
    type: 'irregular_construct',
    absolute: 'בַּיִת',
    construct: 'בֵּית',
    note: 'Construct form used in place names: בֵּית לֶחֶם',
    scholarly: 'Segholate with special construct; cf. Akkadian bītu'
  },
  'אח': {
    type: 'irregular_construct',
    absolute: 'אָח',
    construct: 'אֲחִי (with suffix)',
    note: 'Family term with irregular suffixed forms',
    scholarly: 'GKC §96; cf. אָחוֹת (sister)'
  },

  // ============ UNIQUE GRAMMATICAL FORMS ============
  'אין': {
    type: 'negative_particle',
    phenomenon: 'Negative existential',
    note: 'Takes pronominal suffixes: אֵינֶנִּי "I am not"',
    scholarly: 'Opposite of יֵשׁ; unique in Semitic (GKC §152)'
  },
  'יש': {
    type: 'existential_particle',
    phenomenon: 'Positive existential',
    note: 'Takes pronominal suffixes: יֶשְׁנוֹ "there is"',
    scholarly: 'Not found in other Semitic languages; cf. Aramaic אִית'
  },
  'את': {
    type: 'object_marker',
    phenomenon: 'Definite direct object marker',
    note: 'Precedes definite nouns as direct objects',
    scholarly: 'Unique to Hebrew and some Aramaic dialects; cf. Aramaic יָת'
  }
};

/**
 * Check if a word has known grammatical anomalies
 * @param {string} word - Hebrew word
 * @returns {Object|null} - Anomaly information if found
 */
export function checkGrammaticalAnomaly(word) {
  const cleaned = stripVowels(word);

  if (GRAMMATICAL_ANOMALIES[cleaned]) {
    return {
      word: cleaned,
      ...GRAMMATICAL_ANOMALIES[cleaned],
      hasAnomaly: true
    };
  }

  return null;
}

// =============================================================================
// 11. COGNATE LANGUAGES - Related words in sister languages
// =============================================================================

/**
 * Cognate data from related Semitic languages
 * Used for etymological analysis
 */
export const COGNATE_LANGUAGES = {
  akkadian: {
    name: 'Akkadian',
    native: '𒀝𒅗𒁺𒌑',
    period: 'c. 2500-500 BCE',
    relation: 'East Semitic sister language'
  },
  ugaritic: {
    name: 'Ugaritic',
    native: '𐎜𐎂𐎗𐎚',
    period: 'c. 1400-1200 BCE',
    relation: 'Northwest Semitic, closest to Hebrew'
  },
  phoenician: {
    name: 'Phoenician',
    period: 'c. 1050-150 BCE',
    relation: 'Canaanite, very close to Hebrew'
  },
  arabic: {
    name: 'Arabic',
    native: 'العربية',
    period: 'c. 300 CE-present',
    relation: 'Central Semitic, preserves older forms'
  },
  syriac: {
    name: 'Syriac',
    native: 'ܣܘܪܝܝܐ',
    period: 'c. 100 CE-present',
    relation: 'Aramaic dialect, Christian tradition'
  },
  ethiopic: {
    name: 'Ge\'ez (Ethiopic)',
    native: 'ግዕዝ',
    period: 'c. 400 BCE-present',
    relation: 'South Semitic, preserves archaic features'
  }
};

/**
 * Known cognates for common roots - PRO SCHOLAR V6.2 Expanded Database
 * Based on BDB, HALOT, Jastrow, and comparative Semitic scholarship
 */
export const ROOT_COGNATES = {
  'מלך': {
    meaning: 'to rule, be king',
    cognates: [
      { language: 'akkadian', word: 'malāku', meaning: 'to advise, rule', form: 'verb' },
      { language: 'ugaritic', word: 'mlk', meaning: 'king', form: 'noun' },
      { language: 'arabic', word: 'malik', meaning: 'king, owner', form: 'noun' },
      { language: 'ethiopic', word: 'mal\'ak', meaning: 'messenger, angel', form: 'noun' }
    ],
    note: 'Common Semitic root *mlk with semantic range "to possess, rule, counsel"'
  },
  'שמע': {
    meaning: 'to hear',
    cognates: [
      { language: 'akkadian', word: 'šemû', meaning: 'to hear, obey', form: 'verb' },
      { language: 'arabic', word: 'samiʿa', meaning: 'to hear', form: 'verb' },
      { language: 'ethiopic', word: 'samʿa', meaning: 'to hear', form: 'verb' }
    ],
    note: 'Proto-Semitic *šmʿ preserved across all branches'
  },
  'קדש': {
    meaning: 'to be holy, set apart',
    cognates: [
      { language: 'akkadian', word: 'qadāšu', meaning: 'to be pure, clean', form: 'verb' },
      { language: 'ugaritic', word: 'qdš', meaning: 'holy', form: 'adjective' },
      { language: 'arabic', word: 'quds', meaning: 'holiness', form: 'noun' }
    ],
    note: 'Semantic development from "clean" to "holy" visible in cognates'
  },
  'ברא': {
    meaning: 'to create',
    cognates: [
      { language: 'arabic', word: 'baraʾa', meaning: 'to create, fashion', form: 'verb' },
      { language: 'ethiopic', word: 'baraya', meaning: 'to create', form: 'verb' }
    ],
    note: 'Theological term primarily Hebrew, cognates show broader "fashion" meaning'
  },
  'אמר': {
    meaning: 'to say',
    cognates: [
      { language: 'akkadian', word: 'amāru', meaning: 'to see', form: 'verb' },
      { language: 'arabic', word: 'ʾamara', meaning: 'to command', form: 'verb' },
      { language: 'ethiopic', word: 'ʾamara', meaning: 'to show, indicate', form: 'verb' }
    ],
    note: 'Semantic shift from "see/show" to "say" in Hebrew branch'
  },

  // ============ PRO SCHOLAR V6.2: EXPANDED COGNATE DATABASE ============

  'כתב': {
    meaning: 'to write',
    cognates: [
      { language: 'akkadian', word: 'katābu', meaning: 'to inscribe', form: 'verb' },
      { language: 'arabic', word: 'kataba', meaning: 'to write', form: 'verb' },
      { language: 'ethiopic', word: 'kataba', meaning: 'to write', form: 'verb' },
      { language: 'syriac', word: 'ktab', meaning: 'to write', form: 'verb' }
    ],
    note: 'Pan-Semitic *ktb root for writing, possibly from Proto-Semitic "to mark"'
  },
  'ספר': {
    meaning: 'to count, recount, write',
    cognates: [
      { language: 'akkadian', word: 'šapāru', meaning: 'to send, write', form: 'verb' },
      { language: 'arabic', word: 'safara', meaning: 'to travel, journey', form: 'verb' },
      { language: 'ethiopic', word: 'safara', meaning: 'to write', form: 'verb' }
    ],
    note: 'Semantic range includes "count" (Hebrew), "write" (Akkadian), "travel" (Arabic)'
  },
  'ידע': {
    meaning: 'to know',
    cognates: [
      { language: 'akkadian', word: 'idû', meaning: 'to know', form: 'verb' },
      { language: 'arabic', word: 'wadaʿa', meaning: 'to leave, deposit', form: 'verb' },
      { language: 'ethiopic', word: 'yedʿa', meaning: 'to know', form: 'verb' }
    ],
    note: 'Hebrew yādaʿ covers intellectual AND intimate knowledge (Gen 4:1)'
  },
  'עשה': {
    meaning: 'to do, make',
    cognates: [
      { language: 'akkadian', word: 'ešû', meaning: 'to go out', form: 'verb' },
      { language: 'arabic', word: 'ʿasā', meaning: 'perhaps (auxiliary)', form: 'particle' },
      { language: 'ethiopic', word: 'ʿasaya', meaning: 'to perform', form: 'verb' }
    ],
    note: 'Basic action verb, very frequent in Biblical Hebrew (~2,600 occurrences)'
  },
  'הלך': {
    meaning: 'to go, walk',
    cognates: [
      { language: 'akkadian', word: 'alāku', meaning: 'to go', form: 'verb' },
      { language: 'ugaritic', word: 'hlk', meaning: 'to go', form: 'verb' },
      { language: 'arabic', word: 'halaka', meaning: 'to perish', form: 'verb' }
    ],
    note: 'Akkadian alāku suggests original *wlk (PE-WAW), explaining weak verb behavior'
  },
  'בוא': {
    meaning: 'to come, enter',
    cognates: [
      { language: 'akkadian', word: 'bāʾu', meaning: 'to come', form: 'verb' },
      { language: 'arabic', word: 'bāʾa', meaning: 'to return', form: 'verb' },
      { language: 'ethiopic', word: 'boʾa', meaning: 'to enter', form: 'verb' }
    ],
    note: 'Hollow verb (AYIN-WAW), Proto-Semitic *bwʾ "to come, enter"'
  },
  'נתן': {
    meaning: 'to give',
    cognates: [
      { language: 'akkadian', word: 'nadānu', meaning: 'to give', form: 'verb' },
      { language: 'ugaritic', word: 'ytn', meaning: 'to give', form: 'verb' },
      { language: 'arabic', word: 'ʾaʿṭā', meaning: 'to give (different root)', form: 'verb' }
    ],
    note: 'PE-NUN verb showing nun assimilation; Ugaritic ytn shows YOD prefix'
  },
  'לקח': {
    meaning: 'to take',
    cognates: [
      { language: 'akkadian', word: 'leqû', meaning: 'to take', form: 'verb' },
      { language: 'arabic', word: 'laqiya', meaning: 'to meet, find', form: 'verb' }
    ],
    note: 'Behaves as PE-NUN verb despite initial lamed; paired with נתן conceptually'
  },
  'אכל': {
    meaning: 'to eat',
    cognates: [
      { language: 'akkadian', word: 'akālu', meaning: 'to eat', form: 'verb' },
      { language: 'ugaritic', word: 'ʾkl', meaning: 'to eat', form: 'verb' },
      { language: 'arabic', word: 'ʾakala', meaning: 'to eat', form: 'verb' },
      { language: 'ethiopic', word: 'ʾakala', meaning: 'to eat', form: 'verb' }
    ],
    note: 'Pan-Semitic *ʾkl root, one of most stable verbs across Semitic languages'
  },
  'שתה': {
    meaning: 'to drink',
    cognates: [
      { language: 'akkadian', word: 'šatû', meaning: 'to drink', form: 'verb' },
      { language: 'arabic', word: 'saqā', meaning: 'to water (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'sataya', meaning: 'to drink', form: 'verb' }
    ],
    note: 'LAMED-HE verb; basic sustenance verb paired with אכל'
  },
  'ישב': {
    meaning: 'to sit, dwell',
    cognates: [
      { language: 'akkadian', word: 'ašābu', meaning: 'to sit, dwell', form: 'verb' },
      { language: 'ugaritic', word: 'ythb', meaning: 'to sit', form: 'verb' },
      { language: 'arabic', word: 'waṯaba', meaning: 'to jump (semantic shift)', form: 'verb' }
    ],
    note: 'PE-YOD verb; semantic range includes "inhabit, remain, throne"'
  },
  'קום': {
    meaning: 'to rise, stand',
    cognates: [
      { language: 'akkadian', word: 'qâmu', meaning: 'to burn (different meaning)', form: 'verb' },
      { language: 'arabic', word: 'qāma', meaning: 'to rise, stand', form: 'verb' },
      { language: 'ethiopic', word: 'qoma', meaning: 'to stand', form: 'verb' }
    ],
    note: 'Hollow verb (AYIN-WAW); opposite of ישב in Biblical usage'
  },
  'עמד': {
    meaning: 'to stand',
    cognates: [
      { language: 'akkadian', word: 'emēdu', meaning: 'to lean on', form: 'verb' },
      { language: 'arabic', word: 'ʿamada', meaning: 'to intend, support', form: 'verb' },
      { language: 'syriac', word: 'ʿmed', meaning: 'to stand', form: 'verb' }
    ],
    note: 'Distinct from קום in aspect: עמד = stationary position, קום = rising motion'
  },
  'שמר': {
    meaning: 'to keep, guard',
    cognates: [
      { language: 'akkadian', word: 'naṣāru', meaning: 'to guard (different root)', form: 'verb' },
      { language: 'arabic', word: 'samara', meaning: 'to converse at night', form: 'verb' },
      { language: 'ethiopic', word: 'samara', meaning: 'to harvest', form: 'verb' }
    ],
    note: 'Hebrew semantic: "guard, observe, keep commandments"; key covenantal term'
  },
  'ברך': {
    meaning: 'to bless, kneel',
    cognates: [
      { language: 'akkadian', word: 'karābu', meaning: 'to bless, pray', form: 'verb' },
      { language: 'arabic', word: 'baraka', meaning: 'to kneel (camel)', form: 'verb' },
      { language: 'ethiopic', word: 'baraka', meaning: 'to bless', form: 'verb' }
    ],
    note: 'Related to בֶּרֶךְ (knee); blessing posture involved kneeling'
  },
  'חיה': {
    meaning: 'to live',
    cognates: [
      { language: 'akkadian', word: 'balāṭu', meaning: 'to live (different root)', form: 'verb' },
      { language: 'arabic', word: 'ḥayiya', meaning: 'to live', form: 'verb' },
      { language: 'ethiopic', word: 'ḥaywa', meaning: 'to live', form: 'verb' }
    ],
    note: 'LAMED-HE verb; forms noun חַיִּים (life, always plural in Hebrew)'
  },
  'מות': {
    meaning: 'to die',
    cognates: [
      { language: 'akkadian', word: 'mātu', meaning: 'to die', form: 'verb' },
      { language: 'ugaritic', word: 'mt', meaning: 'death, Mot (god)', form: 'noun' },
      { language: 'arabic', word: 'māta', meaning: 'to die', form: 'verb' }
    ],
    note: 'Hollow verb; מָוֶת personified as deity in Ugaritic mythology'
  },
  'דבר': {
    meaning: 'to speak, word',
    cognates: [
      { language: 'akkadian', word: 'dabābu', meaning: 'to speak, litigate', form: 'verb' },
      { language: 'arabic', word: 'dabbara', meaning: 'to manage, arrange', form: 'verb' },
      { language: 'ethiopic', word: 'dabara', meaning: 'to speak', form: 'verb' }
    ],
    note: 'Forms דָּבָר (word/thing) - Hebrew conflates "word" and "matter/thing"'
  },
  'עבד': {
    meaning: 'to serve, work',
    cognates: [
      { language: 'akkadian', word: 'abādu', meaning: 'to serve', form: 'verb' },
      { language: 'arabic', word: 'ʿabada', meaning: 'to worship', form: 'verb' },
      { language: 'ethiopic', word: 'ʿabada', meaning: 'to make, do', form: 'verb' }
    ],
    note: 'Semantic range: work, serve, worship; עֶבֶד = servant/slave'
  },
  'אהב': {
    meaning: 'to love',
    cognates: [
      { language: 'akkadian', word: 'râmu', meaning: 'to love (different root)', form: 'verb' },
      { language: 'arabic', word: 'ḥabba', meaning: 'to love (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'ʾafqara', meaning: 'to love (different root)', form: 'verb' }
    ],
    note: 'Hebrew אהב is unique; other Semitic languages use different roots for love'
  },
  'ירא': {
    meaning: 'to fear, revere',
    cognates: [
      { language: 'akkadian', word: 'warû', meaning: 'to lead (semantic drift)', form: 'verb' },
      { language: 'arabic', word: 'raʾā', meaning: 'to see (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'farha', meaning: 'to fear (different root)', form: 'verb' }
    ],
    note: 'PE-YOD verb; יִרְאַת ה\' = "fear of the LORD" = reverence/awe'
  },
  'צדק': {
    meaning: 'to be righteous',
    cognates: [
      { language: 'akkadian', word: 'ṣadāqu', meaning: 'to be straight, righteous', form: 'verb' },
      { language: 'arabic', word: 'ṣadaqa', meaning: 'to speak truth', form: 'verb' },
      { language: 'ethiopic', word: 'ṣadaqa', meaning: 'to be just', form: 'verb' }
    ],
    note: 'Core ethical term; צֶדֶק/צְדָקָה = righteousness/justice/charity'
  },
  'חטא': {
    meaning: 'to sin, miss the mark',
    cognates: [
      { language: 'akkadian', word: 'ḫaṭû', meaning: 'to sin, err', form: 'verb' },
      { language: 'arabic', word: 'ḫaṭiʾa', meaning: 'to err, sin', form: 'verb' }
    ],
    note: 'Original meaning "miss target" (cf. Judges 20:16); theological "sin" is derivative'
  },
  'גאל': {
    meaning: 'to redeem',
    cognates: [
      { language: 'akkadian', word: 'gamālu', meaning: 'to spare (semantic connection)', form: 'verb' },
      { language: 'arabic', word: 'jaʿala', meaning: 'to make (different root)', form: 'verb' }
    ],
    note: 'Technical term for kinsman-redeemer (גֹּאֵל); Exodus redemption theology'
  },
  'פדה': {
    meaning: 'to ransom, redeem',
    cognates: [
      { language: 'akkadian', word: 'padû', meaning: 'to spare, release', form: 'verb' },
      { language: 'arabic', word: 'fadā', meaning: 'to ransom', form: 'verb' }
    ],
    note: 'Distinct from גאל: פדה = transactional redemption, גאל = kinship obligation'
  },
  'כפר': {
    meaning: 'to cover, atone',
    cognates: [
      { language: 'akkadian', word: 'kapāru', meaning: 'to wipe, purge', form: 'verb' },
      { language: 'arabic', word: 'kafara', meaning: 'to cover, be ungrateful', form: 'verb' },
      { language: 'syriac', word: 'kpar', meaning: 'to deny, atone', form: 'verb' }
    ],
    note: 'Yom Kippur from this root; כַּפֹּרֶת = ark cover/mercy seat'
  },
  'זכר': {
    meaning: 'to remember',
    cognates: [
      { language: 'akkadian', word: 'zakāru', meaning: 'to speak, name', form: 'verb' },
      { language: 'arabic', word: 'ḏakara', meaning: 'to remember, mention', form: 'verb' },
      { language: 'ethiopic', word: 'zakara', meaning: 'to remember', form: 'verb' }
    ],
    note: 'Theological: God "remembering" means acting on behalf of (Gen 8:1, Ex 2:24)'
  },
  'שלם': {
    meaning: 'to be complete, at peace',
    cognates: [
      { language: 'akkadian', word: 'šalāmu', meaning: 'to be safe, complete', form: 'verb' },
      { language: 'ugaritic', word: 'šlm', meaning: 'peace, completeness', form: 'noun' },
      { language: 'arabic', word: 'salima', meaning: 'to be safe', form: 'verb' }
    ],
    note: 'Root of שָׁלוֹם; semantic: wholeness, completeness, peace, restitution'
  },
  'חכם': {
    meaning: 'to be wise',
    cognates: [
      { language: 'akkadian', word: 'emqu', meaning: 'wise (different root)', form: 'adjective' },
      { language: 'arabic', word: 'ḥakama', meaning: 'to judge, be wise', form: 'verb' },
      { language: 'syriac', word: 'ḥkam', meaning: 'to be wise', form: 'verb' }
    ],
    note: 'חָכְמָה = wisdom; practical skill + moral insight in Biblical conception'
  },
  'יצא': {
    meaning: 'to go out',
    cognates: [
      { language: 'akkadian', word: 'waṣû', meaning: 'to go out', form: 'verb' },
      { language: 'arabic', word: 'waza\'a', meaning: 'to distribute', form: 'verb' }
    ],
    note: 'PE-YOD verb; יְצִיאַת מִצְרַיִם = Exodus from Egypt'
  },
  'שוב': {
    meaning: 'to return, repent',
    cognates: [
      { language: 'akkadian', word: 'târu', meaning: 'to turn, return', form: 'verb' },
      { language: 'arabic', word: 'ṯāba', meaning: 'to return, repent', form: 'verb' }
    ],
    note: 'Hollow verb; תְּשׁוּבָה = repentance (literally "returning")'
  },
  'נשא': {
    meaning: 'to lift, carry',
    cognates: [
      { language: 'akkadian', word: 'našû', meaning: 'to lift, carry', form: 'verb' },
      { language: 'arabic', word: 'nasaʾa', meaning: 'to defer, postpone', form: 'verb' }
    ],
    note: 'PE-NUN with aleph; נָשָׂא פָנִים = "lift face" = show favor'
  },
  'רפא': {
    meaning: 'to heal',
    cognates: [
      { language: 'akkadian', word: 'rapādu', meaning: 'to run, hasten', form: 'verb' },
      { language: 'arabic', word: 'rafaʾa', meaning: 'to mend, patch', form: 'verb' }
    ],
    note: 'רְפוּאָה = healing; God as healer (Ex 15:26 אֲנִי ה\' רֹפְאֶךָ)'
  }
};

/**
 * Get cognate information for a root
 * @param {string} root - Hebrew root
 * @returns {Object|null} - Cognate information
 */
export function getCognates(root) {
  const cleaned = stripVowels(root);

  if (ROOT_COGNATES[cleaned]) {
    return {
      root: cleaned,
      ...ROOT_COGNATES[cleaned],
      hasCognates: true
    };
  }

  return null;
}

// =============================================================================
// 12. ENHANCED analyzeWordV6 - Include new features
// =============================================================================

/**
 * PRO SCHOLAR V6.1: Enhanced word analysis with historical and cognate data
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Analysis options
 * @returns {Object} - Comprehensive scholarly analysis
 */
export function analyzeWordV6Enhanced(word, options = {}) {
  // Get base V6 analysis
  const baseAnalysis = analyzeWordV6(word, options);

  // Add historical layer detection
  const historicalAnalysis = detectHistoricalLayer(word, {
    checkEvolution: options.includeHistory !== false
  });

  // Check for grammatical anomalies
  const anomaly = checkGrammaticalAnomaly(word);

  // Get cognate information (if root is known)
  const effectiveRoot = baseAnalysis.root || options.root;
  const cognateInfo = effectiveRoot ? getCognates(effectiveRoot) : null;

  return {
    ...baseAnalysis,
    version: '6.1.0',

    // Historical analysis
    historicalLayer: historicalAnalysis.primaryLayer,
    historicalEvolution: historicalAnalysis.evolution,
    loanwordOrigin: historicalAnalysis.loanwordOrigin,

    // Grammatical notes
    grammaticalAnomaly: anomaly,

    // Cognate languages
    cognates: cognateInfo,

    // Flag for enhanced analysis
    enhanced: true
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

const ProScholarV6 = {
  VERSION: '6.2.0', // PRO SCHOLAR V6.2 with expanded databases

  // Binyan analysis
  BINYAN_ANALYSIS,
  analyzeBinyan,

  // Dialect detection
  DIALECT_MARKERS,
  detectAramaicDialect,

  // Citation patterns
  CITATION_PATTERNS,
  detectCitationPatterns,

  // Root family
  expandRootFamily,

  // Semantic fields
  SEMANTIC_FIELDS,
  identifySemanticField,

  // Contextual analysis
  applyContextualBoost,

  // Cross-references
  BIBLICAL_BOOKS,
  detectCrossReferences,

  // ★ PRO SCHOLAR V6.1+: Scholarly features
  // Historical layers
  HISTORICAL_LAYERS,
  HISTORICAL_EVOLUTION,
  detectHistoricalLayer,

  // ★ PRO SCHOLAR V6.2: Loanword detection
  LOANWORD_DATABASE,

  // Grammatical anomalies (expanded V6.2)
  GRAMMATICAL_ANOMALIES,
  checkGrammaticalAnomaly,

  // Cognate languages (expanded V6.2)
  COGNATE_LANGUAGES,
  ROOT_COGNATES,
  getCognates,

  // Unified analysis
  analyzeWordV6,
  analyzeWordV6Enhanced  // V6.1+ enhanced version
};

export default ProScholarV6;
