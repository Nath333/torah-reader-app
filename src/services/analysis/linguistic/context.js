// PRO SCHOLAR V6 — 2-7. Dialecte araméen, citations rabbiniques, famille de
// racines, champs sémantiques, boost contextuel, cross-références (split 03/10/2026)
import { stripVowels } from '../../../utils/hebrewUtils';
import { lookupJastrowSync, lookupBDBSync } from '../../dictionaries/dictionaryLoader';

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
export const ROOT_TRANSFORMATIONS = {
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
