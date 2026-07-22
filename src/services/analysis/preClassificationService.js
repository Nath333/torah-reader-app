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

// =============================================================================
// BIBLICAL PROPER NAMES
// These should NEVER be looked up as regular words
// =============================================================================

export const BIBLICAL_NAMES = {
  // Patriarchs & Matriarchs
  'אברהם': { name: 'Abraham', type: 'patriarch', note: 'First patriarch' },
  'אברם': { name: 'Abram', type: 'patriarch', note: 'Original name of Abraham' },
  'יצחק': { name: 'Isaac', type: 'patriarch', note: 'Second patriarch' },
  'יעקב': { name: 'Jacob', type: 'patriarch', note: 'Third patriarch, also called Israel' },
  'ישראל': { name: 'Israel', type: 'patriarch', note: 'Name given to Jacob' },
  'שרה': { name: 'Sarah', type: 'matriarch', note: 'Wife of Abraham' },
  'שרי': { name: 'Sarai', type: 'matriarch', note: 'Original name of Sarah' },
  'רבקה': { name: 'Rebecca', type: 'matriarch', note: 'Wife of Isaac' },
  'רחל': { name: 'Rachel', type: 'matriarch', note: 'Wife of Jacob' },
  'לאה': { name: 'Leah', type: 'matriarch', note: 'Wife of Jacob' },

  // Moses & Exodus figures
  'משה': { name: 'Moses', type: 'prophet', note: 'Greatest prophet, received Torah at Sinai' },
  'אהרן': { name: 'Aaron', type: 'priest', note: 'First High Priest, brother of Moses' },
  'מרים': { name: 'Miriam', type: 'prophetess', note: 'Sister of Moses and Aaron' },
  'פרעה': { name: 'Pharaoh', type: 'title', note: 'King of Egypt' },

  // Judges & Kings
  'דוד': { name: 'David', type: 'king', note: 'King of Israel, author of Psalms' },
  'שלמה': { name: 'Solomon', type: 'king', note: 'King of Israel, son of David' },
  'שאול': { name: 'Saul', type: 'king', note: 'First king of Israel' },
  'שמואל': { name: 'Samuel', type: 'prophet', note: 'Prophet and judge' },

  // Tribes (as proper names)
  'יהודה': { name: 'Judah', type: 'tribe', note: 'Tribe of Judah / Son of Jacob' },
  'לוי': { name: 'Levi', type: 'tribe', note: 'Tribe of Levi / Son of Jacob' },
  'בנימין': { name: 'Benjamin', type: 'tribe', note: 'Tribe of Benjamin / Son of Jacob' },
  'בנימן': { name: 'Benjamin', type: 'tribe', note: 'Alternate spelling' },
  'יוסף': { name: 'Joseph', type: 'tribe', note: 'Son of Jacob' },
  'ראובן': { name: 'Reuben', type: 'tribe', note: 'Firstborn of Jacob' },
  'שמעון': { name: 'Simeon', type: 'tribe', note: 'Son of Jacob' },

  // Prophets
  'ישעיהו': { name: 'Isaiah', type: 'prophet', note: 'Major prophet' },
  'ישעיה': { name: 'Isaiah', type: 'prophet', note: 'Alternate spelling' },
  'ירמיהו': { name: 'Jeremiah', type: 'prophet', note: 'Major prophet' },
  'ירמיה': { name: 'Jeremiah', type: 'prophet', note: 'Alternate spelling' },
  'יחזקאל': { name: 'Ezekiel', type: 'prophet', note: 'Major prophet' },
  'אליהו': { name: 'Elijah', type: 'prophet', note: 'Prophet who ascended to heaven' },
  'אלישע': { name: 'Elisha', type: 'prophet', note: 'Disciple of Elijah' },

  // Divine names (handled specially)
  'אלהים': { name: 'God', type: 'divine', note: 'Name of God' },
  'אלקים': { name: 'God', type: 'divine', note: 'Respectful spelling' },

  // PRO SCHOLAR V6.2: Additional tribal/family names
  'גד': { name: 'Gad', type: 'tribe', note: 'Son of Jacob' },
  'אשר': { name: 'Asher', type: 'tribe', note: 'Son of Jacob' },
  'נפתלי': { name: 'Naphtali', type: 'tribe', note: 'Son of Jacob' },
  'דן': { name: 'Dan', type: 'tribe', note: 'Son of Jacob' },
  'זבולון': { name: 'Zebulun', type: 'tribe', note: 'Son of Jacob' },
  'יששכר': { name: 'Issachar', type: 'tribe', note: 'Son of Jacob' },
  'מנשה': { name: 'Manasseh', type: 'tribe', note: 'Son of Joseph' },
  'אפרים': { name: 'Ephraim', type: 'tribe', note: 'Son of Joseph' },

  // Additional Prophets
  'הושע': { name: 'Hosea', type: 'prophet', note: 'Minor prophet' },
  'עמוס': { name: 'Amos', type: 'prophet', note: 'Minor prophet' },
  'יונה': { name: 'Jonah', type: 'prophet', note: 'Minor prophet' },
  'מיכה': { name: 'Micah', type: 'prophet', note: 'Minor prophet' },
  'נחום': { name: 'Nahum', type: 'prophet', note: 'Minor prophet' },
  'חבקוק': { name: 'Habakkuk', type: 'prophet', note: 'Minor prophet' },
  'צפניה': { name: 'Zephaniah', type: 'prophet', note: 'Minor prophet' },
  'חגי': { name: 'Haggai', type: 'prophet', note: 'Minor prophet' },
  'זכריה': { name: 'Zechariah', type: 'prophet', note: 'Minor prophet' },
  'מלאכי': { name: 'Malachi', type: 'prophet', note: 'Minor prophet' },

  // Additional Biblical figures
  'נח': { name: 'Noah', type: 'patriarch', note: 'Builder of the ark' },
  'יהושע': { name: 'Joshua', type: 'prophet', note: 'Led Israel into Canaan' },
  'גדעון': { name: 'Gideon', type: 'judge', note: 'Judge of Israel' },
  'שמשון': { name: 'Samson', type: 'judge', note: 'Judge of Israel' },
  'רות': { name: 'Ruth', type: 'matriarch', note: 'Great-grandmother of David' },
  'אסתר': { name: 'Esther', type: 'queen', note: 'Queen of Persia' },
  'דניאל': { name: 'Daniel', type: 'prophet', note: 'Prophet in Babylon' },
  'עזרא': { name: 'Ezra', type: 'scribe', note: 'Scribe and priest' },
  'נחמיה': { name: 'Nehemiah', type: 'leader', note: 'Rebuilt Jerusalem walls' },
  'מרדכי': { name: 'Mordecai', type: 'leader', note: 'Uncle of Esther' },
  'איוב': { name: 'Job', type: 'figure', note: 'Subject of Book of Job' },

  // PRO SCHOLAR V6.2: Biblical Places
  'ירושלים': { name: 'Jerusalem', type: 'place', note: 'Holy city' },
  'ירושלם': { name: 'Jerusalem', type: 'place', note: 'Alternate spelling' },
  'ציון': { name: 'Zion', type: 'place', note: 'Mountain of Jerusalem' },
  'מצרים': { name: 'Egypt', type: 'place', note: 'Land of bondage' },
  'בבל': { name: 'Babylon', type: 'place', note: 'Place of exile' },
  'סיני': { name: 'Sinai', type: 'place', note: 'Mountain of Torah giving' },
  'כנען': { name: 'Canaan', type: 'place', note: 'Promised land' },
  'גלות': { name: 'exile/diaspora', type: 'concept', note: 'The exile' },
};

// =============================================================================
// TALMUDIC SAGES (Amoraim & Tannaim)
// =============================================================================

export const TALMUDIC_SAGES = {
  // Major Tannaim
  'רבי': { name: 'Rabbi', type: 'title', note: 'Title for Tannaim/Amoraim' },
  'רב': { name: 'Rav', type: 'title', note: 'Title for Babylonian Amoraim' },
  'רבן': { name: 'Rabban', type: 'title', note: 'Higher title than Rabbi' },
  'עקיבא': { name: 'Akiva', type: 'tanna', note: 'Rabbi Akiva, major Tanna' },
  'הלל': { name: 'Hillel', type: 'tanna', note: 'Hillel the Elder' },
  'שמאי': { name: 'Shammai', type: 'tanna', note: 'Contemporary of Hillel' },
  'יהודה': { name: 'Yehuda', type: 'tanna', note: 'Rabbi Yehuda HaNasi (compiler of Mishnah)' },
  'מאיר': { name: 'Meir', type: 'tanna', note: 'Rabbi Meir' },
  'שמעון': { name: 'Shimon', type: 'tanna', note: 'Rabbi Shimon bar Yochai' },

  // Major Amoraim
  'אביי': { name: 'Abaye', type: 'amora', note: 'Babylonian Amora, 4th generation' },
  'רבא': { name: 'Rava', type: 'amora', note: 'Babylonian Amora, 4th generation' },
  'רבה': { name: 'Rabbah', type: 'amora', note: 'Babylonian Amora' },
  'הונא': { name: 'Huna', type: 'amora', note: 'Rav Huna' },
  'נחמן': { name: 'Nachman', type: 'amora', note: 'Rav Nachman' },
  'ששת': { name: 'Sheshet', type: 'amora', note: 'Rav Sheshet' },
  'יוחנן': { name: 'Yochanan', type: 'amora', note: 'Rabbi Yochanan' },
  'לקיש': { name: 'Lakish', type: 'amora', note: 'Reish Lakish' },
  'אשי': { name: 'Ashi', type: 'amora', note: 'Rav Ashi, compiler of Talmud' },
  'רבינא': { name: 'Ravina', type: 'amora', note: 'Final editor of Talmud' },
};

// =============================================================================
// TALMUDIC ABBREVIATIONS
// Common abbreviations that should be expanded
// =============================================================================

export const TALMUDIC_ABBREVIATIONS = {
  // Domain abbreviations (Shabbat-specific) - with ALL quote character variants
  'רה"י': { expansion: 'רשות היחיד', meaning: 'private domain' },
  'רה״י': { expansion: 'רשות היחיד', meaning: 'private domain' },
  'רה"ר': { expansion: 'רשות הרבים', meaning: 'public domain' },
  'רה״ר': { expansion: 'רשות הרבים', meaning: 'public domain' },
  // ר"ה for public domain (Shabbat context) - distinct from tractate/rabbi names
  'ר"ה': { expansion: 'רשות הרבים', meaning: 'public domain', context: 'shabbat' },
  'ר״ה': { expansion: 'רשות הרבים', meaning: 'public domain', context: 'shabbat' },
  // Prefixed domain abbreviations (ASCII quote variants)
  'מרה"י': { expansion: 'מרשות היחיד', meaning: 'from private domain' },
  'לרה"י': { expansion: 'לרשות היחיד', meaning: 'to private domain' },
  'לר"ה': { expansion: 'לרשות הרבים', meaning: 'to public domain' },
  'מר"ה': { expansion: 'מרשות הרבים', meaning: 'from public domain' },
  // Prefixed domain abbreviations (Hebrew gershayim variants)
  'מרה״י': { expansion: 'מרשות היחיד', meaning: 'from private domain' },
  'לרה״י': { expansion: 'לרשות היחיד', meaning: 'to private domain' },
  'לר״ה': { expansion: 'לרשות הרבים', meaning: 'to public domain' },
  'מר״ה': { expansion: 'מרשות הרבים', meaning: 'from public domain' },

  // Common honorifics/titles (with Unicode variants)
  "ע\"ה": { expansion: 'עליו השלום', meaning: 'peace be upon him' },
  'ע״ה': { expansion: 'עליו השלום', meaning: 'peace be upon him' },
  "ע\"ש": { expansion: 'על שם', meaning: 'named after / because of' },
  'ע״ש': { expansion: 'על שם', meaning: 'named after / because of' },
  "ז\"ל": { expansion: 'זכרונו לברכה', meaning: 'of blessed memory' },
  'ז״ל': { expansion: 'זכרונו לברכה', meaning: 'of blessed memory' },
  "זצ\"ל": { expansion: 'זכר צדיק לברכה', meaning: 'may the memory of the righteous be a blessing' },
  'זצ״ל': { expansion: 'זכר צדיק לברכה', meaning: 'may the memory of the righteous be a blessing' },
  "שליט\"א": { expansion: 'שיחיה לאורך ימים טובים אמן', meaning: 'may he live long' },
  'שליט״א': { expansion: 'שיחיה לאורך ימים טובים אמן', meaning: 'may he live long' },

  // Talmudic citation abbreviations (with all Unicode variants)
  "וגו'": { expansion: 'וגומר', meaning: 'etc. (and so on)' },
  "וגו׳": { expansion: 'וגומר', meaning: 'etc. (and so on)' },
  'וגו': { expansion: 'וגומר', meaning: 'etc. (and so on)' }, // Without marker
  "וכו'": { expansion: 'וכולי', meaning: 'etc.' },
  "וכו׳": { expansion: 'וכולי', meaning: 'etc.' },
  'וכו': { expansion: 'וכולי', meaning: 'etc.' }, // Without marker
  "ובפ'": { expansion: 'ובפרק', meaning: 'and in chapter' },
  'ובפ׳': { expansion: 'ובפרק', meaning: 'and in chapter' },
  "בפ'": { expansion: 'בפרק', meaning: 'in chapter' },
  'בפ׳': { expansion: 'בפרק', meaning: 'in chapter' },
  "דב'": { expansion: 'דברים', meaning: 'Deuteronomy' },
  'דב׳': { expansion: 'דברים', meaning: 'Deuteronomy' },
  "בע\"ה": { expansion: 'בעל הבית', meaning: 'homeowner / master of the house' },
  'בע״ה': { expansion: 'בעל הבית', meaning: 'homeowner / master of the house' },
  "דבע\"ה": { expansion: 'דבעל הבית', meaning: 'of the homeowner' },
  'דבע״ה': { expansion: 'דבעל הבית', meaning: 'of the homeowner' },

  // Halachic abbreviations
  "מדאו'": { expansion: 'מדאורייתא', meaning: 'by Torah law' },
  "מדאו׳": { expansion: 'מדאורייתא', meaning: 'by Torah law' },
  "מדרבנן": { expansion: 'מדרבנן', meaning: 'by rabbinic law' },
  "לכתח'": { expansion: 'לכתחילה', meaning: 'ideally / ab initio' },
  "בדיעב'": { expansion: 'בדיעבד', meaning: 'post facto' },
};

// =============================================================================
// TECHNICAL TERMS (Context-Specific)
// Terms that have specialized meanings in Talmudic context
// =============================================================================

export const TALMUDIC_TECHNICAL_TERMS = {
  // Shabbat Melachot (39 forbidden labors) - with prefix variants
  'הוצאה': { meaning: 'carrying out', context: 'Shabbat melakha', note: 'Transferring from private to public domain' },
  'והוצאה': { meaning: 'and carrying out', context: 'Shabbat melakha', note: 'Transferring from private to public domain' },
  'הכנסה': { meaning: 'bringing in', context: 'Shabbat melakha', note: 'Transferring from public to private domain' },
  'והכנסה': { meaning: 'and bringing in', context: 'Shabbat melakha', note: 'Transferring from public to private domain' },
  'מלאכה': { meaning: 'creative labor', context: 'Shabbat', note: 'One of 39 categories of forbidden work' },
  'מלאכות': { meaning: 'creative labors', context: 'Shabbat', note: 'Plural of melakha' },
  'עקירה': { meaning: 'lifting', context: 'Shabbat', note: 'Initial lifting of object' },
  'הנחה': { meaning: 'placing down', context: 'Shabbat', note: 'Final placement of object' },
  'תפיקו': { meaning: 'you shall bring out', context: 'Shabbat', note: 'Hiphil of יצא' },
  'לויה': { meaning: 'Levite (adj.)', context: 'Mishkan', note: 'As in מחנה לויה - Levite camp' },
  'מחנה': { meaning: 'camp', context: 'Mishkan', note: 'Encampment' },
  'נדבה': { meaning: 'voluntary offering', context: 'korban', note: 'Free-will gift' },
  'מדבריהם': { meaning: 'from their words', context: 'halacha', note: 'Rabbinic enactment' },
  'לכתחלה': { meaning: 'from the outset', context: 'halacha', note: 'Ideally' },
  'בדיעבד': { meaning: 'after the fact', context: 'halacha', note: 'Post facto' },

  // Punishments
  'כרת': { meaning: 'excision', context: 'punishment', note: 'Divine punishment, cutting off from people' },
  'סקילה': { meaning: 'stoning', context: 'punishment', note: 'Capital punishment by court' },
  'חטאת': { meaning: 'sin offering', context: 'korban', note: 'Sacrifice for unintentional sin' },
  'שגגה': { meaning: 'unintentional sin', context: 'halacha', note: 'Violation without knowledge' },
  'זדון': { meaning: 'intentional sin', context: 'halacha', note: 'Willful violation' },

  // Legal terms
  'חייב': { meaning: 'liable', context: 'halacha', note: 'Obligated or guilty' },
  'פטור': { meaning: 'exempt', context: 'halacha', note: 'Free from obligation' },
  'מותר': { meaning: 'permitted', context: 'halacha', note: 'Allowed by law' },
  'אסור': { meaning: 'forbidden', context: 'halacha', note: 'Prohibited by law' },
  'התראה': { meaning: 'warning', context: 'legal', note: 'Required warning before punishment' },

  // Talmudic structure
  'מתני\'': { meaning: 'Mishnah', context: 'structure', note: 'Mishnaic teaching' },
  'גמ\'': { meaning: 'Gemara', context: 'structure', note: 'Talmudic discussion' },
  'תנא': { meaning: 'Tanna taught', context: 'structure', note: 'Mishnaic-era teaching' },
  'אמר': { meaning: 'said', context: 'structure', note: 'Statement by an Amora' },

  // Aramaic logical terms
  'נפקא': { meaning: 'derives', context: 'logic', note: 'Aramaic: we derive from this' },
  'מנלן': { meaning: 'from where do we know', context: 'logic', note: 'Aramaic question formula' },
  'תנינא': { meaning: 'we learned', context: 'logic', note: 'Reference to Mishnah' },

  // PRO SCHOLAR V4.2: Aramaic positional terms
  'ברישא': { meaning: 'at the beginning', context: 'structure', note: 'Aramaic: at the head/start' },
  'ברישיה': { meaning: 'at its beginning', context: 'structure', note: 'Aramaic: at its head (with suffix)' },
  'בסיפא': { meaning: 'at the end', context: 'structure', note: 'Aramaic: at the conclusion' },
  'בסיפיה': { meaning: 'at its end', context: 'structure', note: 'Aramaic: at its conclusion (with suffix)' },
  'רישא': { meaning: 'the beginning', context: 'structure', note: 'Aramaic: head, beginning' },
  'סיפא': { meaning: 'the end', context: 'structure', note: 'Aramaic: conclusion' },
  'בתרא': { meaning: 'final/latter', context: 'structure', note: 'Aramaic: the final one' },
  'קמא': { meaning: 'first/former', context: 'structure', note: 'Aramaic: the first one' },
};

// =============================================================================
// PLACE NAMES
// =============================================================================

export const PLACE_NAMES = {
  'ירושלים': { name: 'Jerusalem', type: 'city' },
  'בבל': { name: 'Babylon', type: 'region' },
  'ארץ ישראל': { name: 'Land of Israel', type: 'region' },
  'מצרים': { name: 'Egypt', type: 'country' },
  'סיני': { name: 'Sinai', type: 'mountain' },
  'ציון': { name: 'Zion', type: 'place' },
};

// =============================================================================
// ARAMAIC PARTICLES - PRO SCHOLAR V4.2
// High-frequency Talmudic words with instant definitions (no dictionary lookup needed)
// Extracted from multiHypothesisEngine.js
// =============================================================================

export const ARAMAIC_PARTICLES = {
  // === COMMON VERBAL FORMS ===
  'נפקא': { meaning: 'it derives/goes out', root: 'נפק', form: '3fs', confidence: 95 },
  'נפקי': { meaning: 'they go out', root: 'נפק', form: '3mp', confidence: 95 },
  'נפקינן': { meaning: 'we derive', root: 'נפק', form: '1p', confidence: 95 },
  // PRO SCHOLAR V8: Aphel forms of נפק (Pe-Nun verb where נ assimilates)
  'תפיקו': { meaning: 'you shall bring out', root: 'נפק', form: 'Aphel 2mp', confidence: 95, weakVerb: 'פ״נ', note: 'Aphel imperative: תפיקו from נפק (נ assimilated)' },
  'תפיק': { meaning: 'it shall bring out / you shall bring out', root: 'נפק', form: 'Aphel 3fs/2ms', confidence: 95, weakVerb: 'פ״נ' },
  'מפיק': { meaning: 'bringing out / one who brings out', root: 'נפק', form: 'Aphel participle', confidence: 95, weakVerb: 'פ״נ' },
  'אפיק': { meaning: 'I shall bring out / he brought out', root: 'נפק', form: 'Aphel 1cs/3ms', confidence: 95, weakVerb: 'פ״נ' },
  'מפקינן': { meaning: 'we bring out', root: 'נפק', form: 'Aphel 1p', confidence: 95, weakVerb: 'פ״נ' },
  // Common Aphel forms of other Pe-Nun verbs
  'אתינן': { meaning: 'we brought', root: 'נתן', form: 'Aphel 1p', confidence: 90, weakVerb: 'פ״נ' },
  'מתרמי': { meaning: 'it occurs', root: 'נרם', form: 'Ithpaal 3ms', confidence: 90 },
  'אמרי': { meaning: 'they say', root: 'אמר', form: '3mp', confidence: 95 },
  'אמרינן': { meaning: 'we say', root: 'אמר', form: '1p', confidence: 95 },
  'תנא': { meaning: 'he taught / a Tanna', root: 'תני', confidence: 95 },
  'תנן': { meaning: 'we learned (Mishnah)', root: 'תני', form: '1p', confidence: 95 },
  'תניא': { meaning: 'it was taught (Baraita)', root: 'תני', confidence: 95 },
  'בעי': { meaning: 'he asks / wants', root: 'בעי', form: '3ms', confidence: 95 },
  'בעינן': { meaning: 'we need', root: 'בעי', form: '1p', confidence: 95 },
  'סבר': { meaning: 'he thinks/holds', root: 'סבר', form: '3ms', confidence: 95 },
  'סברי': { meaning: 'they think', root: 'סבר', form: '3mp', confidence: 95 },
  'קסבר': { meaning: 'he holds', root: 'סבר', confidence: 95 },
  'אזיל': { meaning: 'he goes', root: 'אזל', form: '3ms', confidence: 95 },
  'ואזיל': { meaning: 'and goes on', root: 'אזל', confidence: 95 },
  'אתי': { meaning: 'he comes', root: 'אתי', form: '3ms', confidence: 95 },
  'אתא': { meaning: 'he came', root: 'אתי', confidence: 95 },
  'יתיב': { meaning: 'he sits', root: 'יתב', form: '3ms', confidence: 95 },
  'קאי': { meaning: 'he stands', root: 'קום', confidence: 95 },
  'קיימא': { meaning: 'it stands', root: 'קום', confidence: 95 },
  'חזי': { meaning: 'look! / sees', root: 'חזי', confidence: 95 },
  'חזינן': { meaning: 'we see', root: 'חזי', form: '1p', confidence: 95 },
  'יליף': { meaning: 'he learns/derives', root: 'ילף', form: '3ms', confidence: 95 },
  'ילפינן': { meaning: 'we learn/derive', root: 'ילף', form: '1p', confidence: 95 },
  'דיליף': { meaning: 'that he learns', root: 'ילף', confidence: 95 },
  'כדיליף': { meaning: 'as he derives', root: 'ילף', confidence: 95 },

  // === PRONOMINAL PARTICLES ===
  'לן': { meaning: 'to us', type: 'particle', confidence: 95 },
  'להו': { meaning: 'to them', type: 'particle', confidence: 95 },
  'ליה': { meaning: 'to him', type: 'particle', confidence: 95 },
  'לה': { meaning: 'to her/it', type: 'particle', confidence: 95 },
  'מינה': { meaning: 'from it (f)', type: 'particle', confidence: 95 },
  'מיניה': { meaning: 'from him/it', type: 'particle', confidence: 95 },
  'ביה': { meaning: 'in him/it', type: 'particle', confidence: 95 },
  'בה': { meaning: 'in her/it', type: 'particle', confidence: 95 },
  'עלה': { meaning: 'on it (f)', type: 'particle', confidence: 95 },
  'עליה': { meaning: 'on him/it', type: 'particle', confidence: 95 },

  // === EXISTENTIALS ===
  'אית': { meaning: 'there is', type: 'existential', confidence: 95 },
  'לית': { meaning: 'there is not', type: 'existential', confidence: 95 },
  'איכא': { meaning: 'there is', type: 'existential', confidence: 95 },
  'ליכא': { meaning: 'there is not', type: 'existential', confidence: 95 },

  // === QUESTION WORDS ===
  'מאי': { meaning: 'what', type: 'interrogative', confidence: 95 },
  'מאן': { meaning: 'who', type: 'interrogative', confidence: 95 },
  'היכי': { meaning: 'how', type: 'interrogative', confidence: 95 },
  'אמאי': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מנא': { meaning: 'from where', type: 'interrogative', confidence: 95 },

  // === ADVERBS/CONNECTORS ===
  'השתא': { meaning: 'now', type: 'adverb', confidence: 95 },
  'לקמן': { meaning: 'below, further on', type: 'adverb', confidence: 95 },
  'לעיל': { meaning: 'above', type: 'adverb', confidence: 95 },
  'התם': { meaning: 'there', type: 'adverb', confidence: 95 },
  'הכא': { meaning: 'here', type: 'adverb', confidence: 95 },
  'אלא': { meaning: 'but, rather', type: 'conjunction', confidence: 95 },
  'אלמא': { meaning: 'therefore', type: 'conjunction', confidence: 95 },
  'הלכך': { meaning: 'therefore', type: 'conjunction', confidence: 95 },

  // === COMMON PHRASES ===
  'פשיטא': { meaning: 'it is obvious', type: 'phrase', confidence: 95 },
  'קשיא': { meaning: 'difficulty', type: 'phrase', confidence: 95 },
  'תיובתא': { meaning: 'refutation', type: 'phrase', confidence: 95 },
  'לימא': { meaning: 'let us say', type: 'phrase', confidence: 95 },

  // === DEMONSTRATIVES ===
  'האי': { meaning: 'this', type: 'demonstrative', confidence: 95 },
  'ההוא': { meaning: 'that', type: 'demonstrative', confidence: 95 },
  'הני': { meaning: 'these', type: 'demonstrative', confidence: 95 },
  'הנהו': { meaning: 'those', type: 'demonstrative', confidence: 95 },

  // === PRO SCHOLAR V5: ADDITIONAL TALMUDIC EXPRESSIONS ===
  // Legal/Halachic terminology
  'מותר': { meaning: 'permitted', root: 'נתר', type: 'halachic', confidence: 95 },
  'אסור': { meaning: 'forbidden', root: 'אסר', type: 'halachic', confidence: 95 },
  'פטור': { meaning: 'exempt', root: 'פטר', type: 'halachic', confidence: 95 },
  'חייב': { meaning: 'obligated/liable', root: 'חוב', type: 'halachic', confidence: 95 },
  'טמא': { meaning: 'ritually impure', root: 'טמא', type: 'halachic', confidence: 95 },
  'טהור': { meaning: 'ritually pure', root: 'טהר', type: 'halachic', confidence: 95 },
  'כשר': { meaning: 'valid/fit', root: 'כשר', type: 'halachic', confidence: 95 },
  'פסול': { meaning: 'invalid/disqualified', root: 'פסל', type: 'halachic', confidence: 95 },

  // Dialectical terminology
  'מיתיבי': { meaning: 'they objected (from Baraita)', root: 'תוב', type: 'dialectic', confidence: 95 },
  'תיקו': { meaning: 'unresolved question', type: 'dialectic', confidence: 95 },
  'שמע מינה': { meaning: 'conclude from this', type: 'dialectic', confidence: 95 },
  'מנלן': { meaning: 'from where do we know', type: 'dialectic', confidence: 95 },
  'דתנן': { meaning: 'as we learned (Mishnah)', root: 'תני', type: 'dialectic', confidence: 95 },
  'דתניא': { meaning: 'as it was taught (Baraita)', root: 'תני', type: 'dialectic', confidence: 95 },
  'אמר ליה': { meaning: 'he said to him', root: 'אמר', type: 'narrative', confidence: 95 },
  'אמר לו': { meaning: 'he said to him', root: 'אמר', type: 'narrative', confidence: 95 },

  // Temporal/conditional
  'אי': { meaning: 'if', type: 'conditional', confidence: 95 },
  'אילו': { meaning: 'if (contrary to fact)', type: 'conditional', confidence: 95 },
  'כי': { meaning: 'when/because', type: 'conjunction', confidence: 90 },
  'דהא': { meaning: 'for behold', type: 'conjunction', confidence: 95 },
  'דהכי': { meaning: 'that thus', type: 'conjunction', confidence: 95 },

  // PRO SCHOLAR V6.2: Aramaic positional/structural terms
  'ברישא': { meaning: 'at the beginning', type: 'structural', confidence: 95 },
  'ברישיה': { meaning: 'at its beginning', type: 'structural', confidence: 95 },
  'בסיפא': { meaning: 'at the end', type: 'structural', confidence: 95 },
  'בסיפיה': { meaning: 'at its end', type: 'structural', confidence: 95 },
  'רישא': { meaning: 'the beginning', root: 'ריש', type: 'structural', confidence: 95 },
  'סיפא': { meaning: 'the end', root: 'סיף', type: 'structural', confidence: 95 },
  'בתרא': { meaning: 'final/latter', type: 'structural', confidence: 95 },
  'קמא': { meaning: 'first/former', type: 'structural', confidence: 95 },
};

// =============================================================================
// BIBLICAL PARTICLES - PRO SCHOLAR V5
// High-frequency Biblical Hebrew words with instant definitions
// =============================================================================

export const BIBLICAL_PARTICLES = {
  // === DIVINE NAMES (handle with care) ===
  'יהוה': { meaning: 'LORD (Tetragrammaton)', type: 'divine_name', confidence: 100, note: 'The ineffable Name' },
  'אלהים': { meaning: 'God', root: 'אלה', type: 'divine_name', confidence: 100 },
  'אדני': { meaning: 'Lord/my Lord', root: 'אדן', type: 'divine_name', confidence: 100 },
  'שדי': { meaning: 'Almighty', type: 'divine_name', confidence: 100 },

  // === COMMON PREPOSITIONS ===
  'אל': { meaning: 'to, toward', type: 'preposition', confidence: 95 },
  'על': { meaning: 'on, upon, concerning', type: 'preposition', confidence: 95 },
  'את': { meaning: 'with / [accusative marker]', type: 'preposition', confidence: 95 },
  'עם': { meaning: 'with, together with', type: 'preposition', confidence: 95 },
  'מן': { meaning: 'from, out of', type: 'preposition', confidence: 95 },
  'תחת': { meaning: 'under, instead of', type: 'preposition', confidence: 95 },
  'בין': { meaning: 'between, among', type: 'preposition', confidence: 95 },
  'אחר': { meaning: 'after, behind', type: 'preposition', confidence: 95 },
  'לפני': { meaning: 'before, in front of', type: 'preposition', confidence: 95 },
  'אצל': { meaning: 'beside, near', type: 'preposition', confidence: 95 },

  // === CONJUNCTIONS ===
  'כי': { meaning: 'that, because, when, if', type: 'conjunction', confidence: 90 },
  'אשר': { meaning: 'who, which, that', type: 'conjunction', confidence: 95 },
  'פן': { meaning: 'lest', type: 'conjunction', confidence: 95 },
  'למען': { meaning: 'in order that, for the sake of', type: 'conjunction', confidence: 95 },
  'אם': { meaning: 'if', type: 'conjunction', confidence: 95 },
  'גם': { meaning: 'also, even', type: 'conjunction', confidence: 95 },
  'רק': { meaning: 'only, but', type: 'conjunction', confidence: 95 },
  'אך': { meaning: 'surely, but, only', type: 'conjunction', confidence: 95 },

  // === ADVERBS ===
  'מאד': { meaning: 'very, exceedingly', type: 'adverb', confidence: 95 },
  'עוד': { meaning: 'still, yet, again', type: 'adverb', confidence: 95 },
  'כן': { meaning: 'thus, so', type: 'adverb', confidence: 95 },
  'לא': { meaning: 'not, no', type: 'adverb', confidence: 95 },
  'אין': { meaning: 'there is not, nothing', type: 'adverb', confidence: 95 },
  'יש': { meaning: 'there is, there are', type: 'adverb', confidence: 95 },
  'הנה': { meaning: 'behold, here', type: 'adverb', confidence: 95 },
  'שם': { meaning: 'there', type: 'adverb', confidence: 95 },
  'פה': { meaning: 'here', type: 'adverb', confidence: 95 },
  'עתה': { meaning: 'now', type: 'adverb', confidence: 95 },

  // === INTERROGATIVES ===
  'מה': { meaning: 'what', type: 'interrogative', confidence: 95 },
  'מי': { meaning: 'who', type: 'interrogative', confidence: 95 },
  'איך': { meaning: 'how', type: 'interrogative', confidence: 95 },
  'איה': { meaning: 'where', type: 'interrogative', confidence: 95 },
  'למה': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מדוע': { meaning: 'why', type: 'interrogative', confidence: 95 },
  'מתי': { meaning: 'when', type: 'interrogative', confidence: 95 },

  // === DEMONSTRATIVES ===
  'זה': { meaning: 'this (m)', type: 'demonstrative', confidence: 95 },
  'זאת': { meaning: 'this (f)', type: 'demonstrative', confidence: 95 },
  'אלה': { meaning: 'these', type: 'demonstrative', confidence: 95 },
  'ההוא': { meaning: 'that (m)', type: 'demonstrative', confidence: 95 },
  'ההיא': { meaning: 'that (f)', type: 'demonstrative', confidence: 95 },

  // === NUMERALS ===
  'אחד': { meaning: 'one', type: 'numeral', confidence: 95 },
  'שנים': { meaning: 'two (m)', type: 'numeral', confidence: 95 },
  'שתים': { meaning: 'two (f)', type: 'numeral', confidence: 95 },
  'שלש': { meaning: 'three', type: 'numeral', confidence: 95 },
  'ארבע': { meaning: 'four', type: 'numeral', confidence: 95 },
  'חמש': { meaning: 'five', type: 'numeral', confidence: 95 },
  'שש': { meaning: 'six', type: 'numeral', confidence: 95 },
  'שבע': { meaning: 'seven', type: 'numeral', confidence: 95 },
  'שמנה': { meaning: 'eight', type: 'numeral', confidence: 95 },
  'תשע': { meaning: 'nine', type: 'numeral', confidence: 95 },
  'עשר': { meaning: 'ten', type: 'numeral', confidence: 95 },
  'מאה': { meaning: 'hundred', type: 'numeral', confidence: 95 },
  'אלף': { meaning: 'thousand', type: 'numeral', confidence: 95 },

  // === HIGH-FREQUENCY VERBS (common forms) ===
  'ויאמר': { meaning: 'and he said', root: 'אמר', form: 'wayyiqtol', confidence: 95 },
  'ויהי': { meaning: 'and it was/came to pass', root: 'היה', form: 'wayyiqtol', confidence: 95 },
  'וידבר': { meaning: 'and he spoke', root: 'דבר', form: 'wayyiqtol', confidence: 95 },
  'ויעש': { meaning: 'and he did/made', root: 'עשה', form: 'wayyiqtol', confidence: 95 },
  'וילך': { meaning: 'and he went', root: 'הלך', form: 'wayyiqtol', confidence: 95 },
  'ויבא': { meaning: 'and he came', root: 'בוא', form: 'wayyiqtol', confidence: 95 },
  'ויקח': { meaning: 'and he took', root: 'לקח', form: 'wayyiqtol', confidence: 95 },
  'וירא': { meaning: 'and he saw', root: 'ראה', form: 'wayyiqtol', confidence: 95 },
  'ויקרא': { meaning: 'and he called', root: 'קרא', form: 'wayyiqtol', confidence: 95 },
  'ויתן': { meaning: 'and he gave', root: 'נתן', form: 'wayyiqtol', confidence: 95 },
};

// =============================================================================
// SEMANTIC FIELDS - PRO SCHOLAR V5
// Categorize words by meaning domain for enhanced understanding
// =============================================================================

export const SEMANTIC_FIELDS = {
  LEGAL: {
    name: 'Legal/Halachic',
    description: 'Terms relating to Jewish law',
    words: ['מותר', 'אסור', 'פטור', 'חייב', 'כשר', 'פסול', 'טמא', 'טהור']
  },
  DIALECTIC: {
    name: 'Dialectical',
    description: 'Terms used in Talmudic argumentation',
    words: ['מיתיבי', 'תיקו', 'קשיא', 'פשיטא', 'תיובתא', 'אלא']
  },
  TEMPORAL: {
    name: 'Time/Sequence',
    description: 'Words indicating time or sequence',
    words: ['השתא', 'עתה', 'אז', 'עוד', 'מתי']
  },
  SPATIAL: {
    name: 'Location/Direction',
    description: 'Words indicating place or direction',
    words: ['הכא', 'התם', 'שם', 'פה', 'לקמן', 'לעיל']
  },
  CITATION: {
    name: 'Citation/Source',
    description: 'Terms for citing sources',
    words: ['תנא', 'תנן', 'תניא', 'דתנן', 'דתניא', 'אמר']
  }
};

// =============================================================================
// ROOT FAMILIES - PRO SCHOLAR V5
// Cross-reference related Hebrew roots by semantic domain
// =============================================================================

export const ROOT_FAMILIES = {
  // === SPEECH/COMMUNICATION ===
  SPEECH: {
    name: 'Speech & Communication',
    roots: {
      'אמר': { meaning: 'say', related: ['דבר', 'שיח', 'ענה'], notes: 'General speaking' },
      'דבר': { meaning: 'speak, word', related: ['אמר', 'מלל'], notes: 'Formal speech, matter' },
      'קרא': { meaning: 'call, read', related: ['זעק', 'שוע'], notes: 'Calling out, proclamation' },
      'ענה': { meaning: 'answer', related: ['אמר', 'שוב'], notes: 'Response' },
      'שאל': { meaning: 'ask', related: ['דרש', 'בקש'], notes: 'Inquiry' },
      'מלל': { meaning: 'speak (Aramaic)', related: ['דבר', 'אמר'], notes: 'Aramaic speech verb' },
    }
  },

  // === MOTION/MOVEMENT ===
  MOTION: {
    name: 'Motion & Movement',
    roots: {
      'הלך': { meaning: 'go, walk', related: ['בוא', 'יצא', 'שוב'], notes: 'General motion' },
      'בוא': { meaning: 'come, enter', related: ['הלך', 'יצא'], notes: 'Entering' },
      'יצא': { meaning: 'go out', related: ['בוא', 'נפק'], notes: 'Exiting' },
      'שוב': { meaning: 'return', related: ['הלך', 'פנה'], notes: 'Returning, repentance' },
      'עלה': { meaning: 'go up', related: ['ירד', 'סלק'], notes: 'Ascending' },
      'ירד': { meaning: 'go down', related: ['עלה', 'נחת'], notes: 'Descending' },
      'נפק': { meaning: 'go out (Aramaic)', related: ['יצא', 'עאל'], notes: 'Aramaic exit' },
      'עאל': { meaning: 'enter (Aramaic)', related: ['בוא', 'נפק'], notes: 'Aramaic enter' },
      'אזל': { meaning: 'go (Aramaic)', related: ['הלך', 'אתי'], notes: 'Aramaic go' },
      'אתי': { meaning: 'come (Aramaic)', related: ['בוא', 'אזל'], notes: 'Aramaic come' },
    }
  },

  // === COGNITION/KNOWLEDGE ===
  COGNITION: {
    name: 'Knowledge & Understanding',
    roots: {
      'ידע': { meaning: 'know', related: ['בין', 'שכל', 'חכם'], notes: 'Knowledge' },
      'בין': { meaning: 'understand', related: ['ידע', 'שכל'], notes: 'Discernment' },
      'שכל': { meaning: 'be wise', related: ['חכם', 'בין'], notes: 'Intelligence' },
      'חכם': { meaning: 'be wise', related: ['שכל', 'בין'], notes: 'Wisdom' },
      'למד': { meaning: 'learn, teach', related: ['ידע', 'שנה'], notes: 'Study' },
      'שמע': { meaning: 'hear, understand', related: ['ידע', 'אזן'], notes: 'Hearing/obeying' },
      'סבר': { meaning: 'think (Aramaic)', related: ['חשב', 'ידע'], notes: 'Aramaic reasoning' },
    }
  },

  // === GIVING/TAKING ===
  TRANSFER: {
    name: 'Giving & Taking',
    roots: {
      'נתן': { meaning: 'give', related: ['לקח', 'שים'], notes: 'General giving' },
      'לקח': { meaning: 'take', related: ['נתן', 'אחז'], notes: 'Taking, receiving' },
      'שים': { meaning: 'put, place', related: ['נתן', 'הנח'], notes: 'Placing' },
      'שלח': { meaning: 'send', related: ['נתן', 'בוא'], notes: 'Sending away' },
      'קבל': { meaning: 'receive', related: ['לקח', 'נתן'], notes: 'Accepting' },
      'יהב': { meaning: 'give (Aramaic)', related: ['נתן', 'קבל'], notes: 'Aramaic give' },
    }
  },

  // === SEEING/PERCEPTION ===
  PERCEPTION: {
    name: 'Seeing & Perception',
    roots: {
      'ראה': { meaning: 'see', related: ['חזה', 'נבט', 'שקף'], notes: 'Vision' },
      'חזה': { meaning: 'see, behold', related: ['ראה', 'נבט'], notes: 'Prophetic vision' },
      'נבט': { meaning: 'look at', related: ['ראה', 'שקף'], notes: 'Gazing' },
      'חזי': { meaning: 'see (Aramaic)', related: ['ראה', 'חזה'], notes: 'Aramaic see' },
    }
  },

  // === DOING/MAKING ===
  ACTION: {
    name: 'Doing & Making',
    roots: {
      'עשה': { meaning: 'do, make', related: ['פעל', 'יצר', 'ברא'], notes: 'General action' },
      'פעל': { meaning: 'work, do', related: ['עשה', 'עבד'], notes: 'Working' },
      'עבד': { meaning: 'work, serve (Heb/Aram)', related: ['פעל', 'שרת', 'עשה'], notes: 'Service, labor - same root in Hebrew and Aramaic' },
      'יצר': { meaning: 'form, create', related: ['עשה', 'ברא'], notes: 'Forming' },
      'ברא': { meaning: 'create', related: ['יצר', 'עשה'], notes: 'Divine creation' },
    }
  },

  // === LIFE/DEATH ===
  EXISTENCE: {
    name: 'Life & Death',
    roots: {
      'חיה': { meaning: 'live', related: ['מות', 'היה'], notes: 'Life' },
      'מות': { meaning: 'die', related: ['חיה', 'הרג'], notes: 'Death' },
      'היה': { meaning: 'be, become', related: ['חיה', 'הוה'], notes: 'Existence' },
      'הוה': { meaning: 'be (Aramaic)', related: ['היה', 'איתא'], notes: 'Aramaic be' },
    }
  },

  // === LEGAL/HALACHIC ===
  LEGAL: {
    name: 'Legal Terms',
    roots: {
      'דין': { meaning: 'judge', related: ['שפט', 'פסק'], notes: 'Judging' },
      'שפט': { meaning: 'judge', related: ['דין', 'משפט'], notes: 'Biblical judging' },
      'חוב': { meaning: 'be liable', related: ['זכה', 'פטר'], notes: 'Obligation' },
      'זכה': { meaning: 'merit, acquit', related: ['חוב', 'פטר'], notes: 'Acquittal, merit' },
      'פטר': { meaning: 'exempt', related: ['חוב', 'זכה'], notes: 'Exemption' },
      'אסר': { meaning: 'forbid', related: ['התר', 'נתר'], notes: 'Prohibition' },
      'התר': { meaning: 'permit', related: ['אסר', 'נתר'], notes: 'Permission' },
    }
  },
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

// =============================================================================
// HISTORICAL PERIODS - PRO SCHOLAR V5
// Date words by linguistic era
// =============================================================================

export const HISTORICAL_PERIODS = {
  BIBLICAL: {
    name: 'Biblical Hebrew',
    range: '1200-200 BCE',
    characteristics: ['Classical syntax', 'Pausal forms', 'Waw-consecutive'],
    indicators: ['ויהי', 'ויאמר', 'הנה', 'לאמר'],
    dictionaries: ['BDB', 'HALOT', "Strong's"]
  },
  MISHNAIC: {
    name: 'Mishnaic Hebrew',
    range: '200 BCE - 200 CE',
    characteristics: ['Simplified syntax', 'Loss of waw-consecutive', 'Greek/Latin loanwords'],
    indicators: ['הרי', 'כיצד', 'לפיכך', 'אף על פי'],
    dictionaries: ['Jastrow', 'Even-Shoshan']
  },
  TALMUDIC_ARAMAIC: {
    name: 'Talmudic Aramaic',
    range: '200-600 CE',
    characteristics: ['Eastern Aramaic', 'Legal terminology', 'Dialectical structure'],
    indicators: ['מאי', 'היכי', 'פשיטא', 'תיקו', 'איכא', 'ליכא'],
    dictionaries: ['Jastrow', 'CAL', 'Sokoloff']
  },
  GEONIC: {
    name: 'Geonic Period',
    range: '600-1000 CE',
    characteristics: ['Arabic influence', 'Legal responsa style'],
    indicators: [],
    dictionaries: ['Jastrow']
  },
  MEDIEVAL: {
    name: 'Medieval Hebrew',
    range: '1000-1500 CE',
    characteristics: ['Arabic philosophical terms', 'Poetry conventions'],
    indicators: [],
    dictionaries: ['Even-Shoshan', 'Alcalay']
  }
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

// =============================================================================
// COMMON VERB FORMS - PRO SCHOLAR V5
// Instant lookup for high-frequency conjugated verbs
// =============================================================================

export const COMMON_VERB_FORMS = {
  // === היה (to be) - most common verb ===
  'היה': { root: 'היה', meaning: 'was/became', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'היתה': { root: 'היה', meaning: 'was/became', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'היו': { root: 'היה', meaning: 'were/became', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יהיה': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'תהיה': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3fs/2ms' },
  'יהיו': { root: 'היה', meaning: 'will be', binyan: 'Qal', tense: 'imperfect', person: '3mp' },
  'הייתי': { root: 'היה', meaning: 'I was', binyan: 'Qal', tense: 'perfect', person: '1s' },
  'היינו': { root: 'היה', meaning: 'we were', binyan: 'Qal', tense: 'perfect', person: '1p' },
  'ויהי': { root: 'היה', meaning: 'and it was', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ותהי': { root: 'היה', meaning: 'and she was', binyan: 'Qal', tense: 'wayyiqtol', person: '3fs' },
  'והיה': { root: 'היה', meaning: 'and it will be', binyan: 'Qal', tense: 'weqatal', person: '3ms' },

  // === אמר (to say) ===
  'אמר': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'אמרה': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'אמרו': { root: 'אמר', meaning: 'said', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יאמר': { root: 'אמר', meaning: 'will say', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'תאמר': { root: 'אמר', meaning: 'will say', binyan: 'Qal', tense: 'imperfect', person: '3fs/2ms' },
  'ויאמר': { root: 'אמר', meaning: 'and he said', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ותאמר': { root: 'אמר', meaning: 'and she said', binyan: 'Qal', tense: 'wayyiqtol', person: '3fs' },
  'לאמר': { root: 'אמר', meaning: 'saying', binyan: 'Qal', tense: 'infinitive' },
  'אומר': { root: 'אמר', meaning: 'saying/says', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'אומרת': { root: 'אמר', meaning: 'saying/says', binyan: 'Qal', tense: 'participle', person: 'fs' },
  'אומרים': { root: 'אמר', meaning: 'saying/say', binyan: 'Qal', tense: 'participle', person: 'mp' },

  // === עשה (to do/make) ===
  'עשה': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'עשתה': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'עשו': { root: 'עשה', meaning: 'did/made', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יעשה': { root: 'עשה', meaning: 'will do/make', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויעש': { root: 'עשה', meaning: 'and he did', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'עושה': { root: 'עשה', meaning: 'doing/makes', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לעשות': { root: 'עשה', meaning: 'to do/make', binyan: 'Qal', tense: 'infinitive' },

  // === נתן (to give) - Pe-Nun verb ===
  'נתן': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'נתנה': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'נתנו': { root: 'נתן', meaning: 'gave', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יתן': { root: 'נתן', meaning: 'will give', binyan: 'Qal', tense: 'imperfect', person: '3ms', note: 'Pe-Nun assimilation' },
  'ויתן': { root: 'נתן', meaning: 'and he gave', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'תן': { root: 'נתן', meaning: 'give!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'נותן': { root: 'נתן', meaning: 'giving/gives', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לתת': { root: 'נתן', meaning: 'to give', binyan: 'Qal', tense: 'infinitive', note: 'Pe-Nun assimilation' },

  // === בוא (to come) - Ayin-Vav verb ===
  'בא': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'באה': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'באו': { root: 'בוא', meaning: 'came', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יבוא': { root: 'בוא', meaning: 'will come', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויבא': { root: 'בוא', meaning: 'and he came', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'בוא': { root: 'בוא', meaning: 'come!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'לבוא': { root: 'בוא', meaning: 'to come', binyan: 'Qal', tense: 'infinitive' },

  // === הלך (to go) - Pe-He verb ===
  'הלך': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'הלכה': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'הלכו': { root: 'הלך', meaning: 'went', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ילך': { root: 'הלך', meaning: 'will go', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וילך': { root: 'הלך', meaning: 'and he went', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'לך': { root: 'הלך', meaning: 'go!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'הולך': { root: 'הלך', meaning: 'going/goes', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'ללכת': { root: 'הלך', meaning: 'to go', binyan: 'Qal', tense: 'infinitive' },

  // === ראה (to see) - Lamed-He verb ===
  'ראה': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'ראתה': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'ראו': { root: 'ראה', meaning: 'saw', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יראה': { root: 'ראה', meaning: 'will see', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וירא': { root: 'ראה', meaning: 'and he saw', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'רואה': { root: 'ראה', meaning: 'seeing/sees', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לראות': { root: 'ראה', meaning: 'to see', binyan: 'Qal', tense: 'infinitive' },

  // === ידע (to know) - Pe-Yod verb ===
  'ידע': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'ידעה': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'ידעו': { root: 'ידע', meaning: 'knew', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ידעתי': { root: 'ידע', meaning: 'I knew', binyan: 'Qal', tense: 'perfect', person: '1s' },
  'יידע': { root: 'ידע', meaning: 'will know', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'יודע': { root: 'ידע', meaning: 'knowing/knows', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'יודעת': { root: 'ידע', meaning: 'knowing/knows', binyan: 'Qal', tense: 'participle', person: 'fs' },
  'לדעת': { root: 'ידע', meaning: 'to know', binyan: 'Qal', tense: 'infinitive' },

  // === לקח (to take) - Pe-Lamed verb ===
  'לקח': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'לקחה': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'לקחו': { root: 'לקח', meaning: 'took', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יקח': { root: 'לקח', meaning: 'will take', binyan: 'Qal', tense: 'imperfect', person: '3ms', note: 'Pe-Lamed drops' },
  'ויקח': { root: 'לקח', meaning: 'and he took', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'קח': { root: 'לקח', meaning: 'take!', binyan: 'Qal', tense: 'imperative', person: '2ms' },
  'לקחת': { root: 'לקח', meaning: 'to take', binyan: 'Qal', tense: 'infinitive' },

  // === שמע (to hear) ===
  'שמע': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'שמעה': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'שמעו': { root: 'שמע', meaning: 'heard', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ישמע': { root: 'שמע', meaning: 'will hear', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'וישמע': { root: 'שמע', meaning: 'and he heard', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'שומע': { root: 'שמע', meaning: 'hearing/hears', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לשמוע': { root: 'שמע', meaning: 'to hear', binyan: 'Qal', tense: 'infinitive' },

  // === קרא (to call/read) ===
  'קרא': { root: 'קרא', meaning: 'called/read', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'קראה': { root: 'קרא', meaning: 'called/read', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'יקרא': { root: 'קרא', meaning: 'will call', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'ויקרא': { root: 'קרא', meaning: 'and he called', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'קורא': { root: 'קרא', meaning: 'calling/reads', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לקרוא': { root: 'קרא', meaning: 'to call/read', binyan: 'Qal', tense: 'infinitive' },

  // === עבר (to pass/cross) - includes Hiphil forms ===
  // Qal forms (to pass, cross over)
  'עבר': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'עברה': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'עברו': { root: 'עבר', meaning: 'passed/crossed', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'יעבור': { root: 'עבר', meaning: 'will pass', binyan: 'Qal', tense: 'imperfect', person: '3ms' },
  'יעברו': { root: 'עבר', meaning: 'will pass', binyan: 'Qal', tense: 'imperfect', person: '3mp' },
  'ויעבור': { root: 'עבר', meaning: 'and he passed', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'ויעברו': { root: 'עבר', meaning: 'and they passed', binyan: 'Qal', tense: 'wayyiqtol', person: '3mp' },
  'עובר': { root: 'עבר', meaning: 'passing/crosses', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לעבור': { root: 'עבר', meaning: 'to pass', binyan: 'Qal', tense: 'infinitive' },

  // Hiphil forms (to cause to pass, proclaim, transfer)
  'העביר': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'העבירה': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3fs' },
  'העבירו': { root: 'עבר', meaning: 'caused to pass/proclaimed', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יעביר': { root: 'עבר', meaning: 'will cause to pass/proclaim', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'יעבירו': { root: 'עבר', meaning: 'will cause to pass/proclaim', binyan: 'Hiphil', tense: 'imperfect', person: '3mp' },
  'ויעבר': { root: 'עבר', meaning: 'and he caused to pass', binyan: 'Hiphil', tense: 'wayyiqtol', person: '3ms' },
  'ויעבירו': { root: 'עבר', meaning: 'and they caused to pass/proclaimed', binyan: 'Hiphil', tense: 'wayyiqtol', person: '3mp' },
  'מעביר': { root: 'עבר', meaning: 'causing to pass/proclaiming', binyan: 'Hiphil', tense: 'participle', person: 'ms' },
  'להעביר': { root: 'עבר', meaning: 'to cause to pass/proclaim', binyan: 'Hiphil', tense: 'infinitive' },

  // === יצא (to go out) - includes Hiphil (to bring out) ===
  'יצא': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3ms' },
  'יצאה': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3fs' },
  'יצאו': { root: 'יצא', meaning: 'went out', binyan: 'Qal', tense: 'perfect', person: '3p' },
  'ויצא': { root: 'יצא', meaning: 'and he went out', binyan: 'Qal', tense: 'wayyiqtol', person: '3ms' },
  'יוצא': { root: 'יצא', meaning: 'going out', binyan: 'Qal', tense: 'participle', person: 'ms' },
  'לצאת': { root: 'יצא', meaning: 'to go out', binyan: 'Qal', tense: 'infinitive' },
  'הוציא': { root: 'יצא', meaning: 'brought out', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'הוציאו': { root: 'יצא', meaning: 'brought out', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יוציא': { root: 'יצא', meaning: 'will bring out', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'להוציא': { root: 'יצא', meaning: 'to bring out', binyan: 'Hiphil', tense: 'infinitive' },
  'מוציא': { root: 'יצא', meaning: 'bringing out', binyan: 'Hiphil', tense: 'participle', person: 'ms' },

  // === כנס (to enter/gather) - Hiphil: to bring in ===
  'נכנס': { root: 'כנס', meaning: 'entered', binyan: 'Nifal', tense: 'perfect', person: '3ms' },
  'נכנסו': { root: 'כנס', meaning: 'entered', binyan: 'Nifal', tense: 'perfect', person: '3p' },
  'הכניס': { root: 'כנס', meaning: 'brought in', binyan: 'Hiphil', tense: 'perfect', person: '3ms' },
  'הכניסו': { root: 'כנס', meaning: 'brought in', binyan: 'Hiphil', tense: 'perfect', person: '3p' },
  'יכניס': { root: 'כנס', meaning: 'will bring in', binyan: 'Hiphil', tense: 'imperfect', person: '3ms' },
  'להכניס': { root: 'כנס', meaning: 'to bring in', binyan: 'Hiphil', tense: 'infinitive' },
  'מכניס': { root: 'כנס', meaning: 'bringing in', binyan: 'Hiphil', tense: 'participle', person: 'ms' },
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

// =============================================================================
// BINYAN PARADIGMS - PRO SCHOLAR V5
// Complete verb pattern information for scholarly analysis
// =============================================================================

export const BINYAN_PARADIGMS = {
  QAL: {
    name: 'Qal (קל)',
    hebrewName: 'קל',
    meaning: 'Simple active',
    description: 'Basic form of the verb, active voice',
    characteristics: ['No prefix pattern', 'Basic meaning of root'],
    examples: {
      'כתב': { perfect: 'כָּתַב', imperfect: 'יִכְתֹּב', participle: 'כֹּתֵב', infinitive: 'כְּתֹב' },
      'שמר': { perfect: 'שָׁמַר', imperfect: 'יִשְׁמֹר', participle: 'שֹׁמֵר', infinitive: 'שְׁמֹר' }
    },
    frequencyRank: 1
  },
  NIPHAL: {
    name: "Nif'al (נפעל)",
    hebrewName: 'נפעל',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal',
    characteristics: ['נ prefix in perfect', 'Doubled middle letter feeling'],
    examples: {
      'כתב': { perfect: 'נִכְתַּב', imperfect: 'יִכָּתֵב', participle: 'נִכְתָּב' },
      'שמר': { perfect: 'נִשְׁמַר', imperfect: 'יִשָּׁמֵר', participle: 'נִשְׁמָר' }
    },
    frequencyRank: 4
  },
  PIEL: {
    name: "Pi'el (פיעל)",
    hebrewName: 'פיעל',
    meaning: 'Intensive active',
    description: 'Intensified or causative action',
    characteristics: ['Doubled middle root letter', 'Often denominative'],
    examples: {
      'דבר': { perfect: 'דִּבֵּר', imperfect: 'יְדַבֵּר', participle: 'מְדַבֵּר', meaning: 'spoke (intensive)' },
      'קדש': { perfect: 'קִדֵּשׁ', imperfect: 'יְקַדֵּשׁ', participle: 'מְקַדֵּשׁ', meaning: 'sanctified' }
    },
    frequencyRank: 2
  },
  PUAL: {
    name: "Pu'al (פועל)",
    hebrewName: 'פועל',
    meaning: 'Intensive passive',
    description: 'Passive of Piel',
    characteristics: ['Doubled middle letter', 'Qibbuts under first letter'],
    examples: {
      'דבר': { perfect: 'דֻּבַּר', imperfect: 'יְדֻבַּר', participle: 'מְדֻבָּר' },
      'קדש': { perfect: 'קֻדַּשׁ', imperfect: 'יְקֻדַּשׁ', participle: 'מְקֻדָּשׁ' }
    },
    frequencyRank: 6
  },
  HIPHIL: {
    name: "Hif'il (הפעיל)",
    hebrewName: 'הפעיל',
    meaning: 'Causative active',
    description: 'Causes someone to do the action',
    characteristics: ['ה prefix in perfect', 'Causative meaning'],
    examples: {
      'מלך': { perfect: 'הִמְלִיךְ', imperfect: 'יַמְלִיךְ', participle: 'מַמְלִיךְ', meaning: 'made king' },
      'גדל': { perfect: 'הִגְדִּיל', imperfect: 'יַגְדִּיל', participle: 'מַגְדִּיל', meaning: 'made great' }
    },
    frequencyRank: 3
  },
  HOPHAL: {
    name: "Hof'al (הופעל)",
    hebrewName: 'הופעל',
    meaning: 'Causative passive',
    description: 'Passive of Hiphil',
    characteristics: ['הֻ/הָ prefix', 'Passive causative'],
    examples: {
      'מלך': { perfect: 'הָמְלַךְ', imperfect: 'יָמְלַךְ', meaning: 'was made king' },
      'גדל': { perfect: 'הָגְדַּל', imperfect: 'יָגְדַּל', meaning: 'was made great' }
    },
    frequencyRank: 7
  },
  HITPAEL: {
    name: "Hitpa'el (התפעל)",
    hebrewName: 'התפעל',
    meaning: 'Reflexive/reciprocal',
    description: 'Action done to oneself or mutually',
    characteristics: ['הת prefix', 'Reflexive action'],
    examples: {
      'קדש': { perfect: 'הִתְקַדֵּשׁ', imperfect: 'יִתְקַדֵּשׁ', participle: 'מִתְקַדֵּשׁ', meaning: 'sanctified oneself' },
      'פלל': { perfect: 'הִתְפַּלֵּל', imperfect: 'יִתְפַּלֵּל', participle: 'מִתְפַּלֵּל', meaning: 'prayed' }
    },
    frequencyRank: 5
  }
};

// Helper: Get binyan info
export const getBinyanInfo = (binyanName) => {
  const normalized = binyanName.toUpperCase().replace(/[^A-Z]/g, '');
  return BINYAN_PARADIGMS[normalized] || null;
};

// =============================================================================
// HOMOGRAPH DISAMBIGUATION - PRO SCHOLAR V5
// Context-aware disambiguation for words with multiple meanings
// =============================================================================

export const HOMOGRAPHS = {
  // === CRITICAL HOMOGRAPHS (high-impact disambiguation) ===
  'עבד': {
    meanings: [
      { meaning: 'servant, slave', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'he served/worked', pos: 'verb', root: 'עבד', binyan: 'Qal', tense: 'perfect', contexts: ['all'] },
      { meaning: 'to serve (Aramaic)', pos: 'verb', contexts: ['talmudic'], note: 'Aramaic equivalent' }
    ],
    disambiguationHints: ['Check for verbal prefixes/suffixes', 'Context: ritual vs labor']
  },
  'דבר': {
    meanings: [
      { meaning: 'word, thing, matter', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he spoke', pos: 'verb', root: 'דבר', binyan: 'Piel', tense: 'perfect', contexts: ['all'] },
      { meaning: 'plague, pestilence', pos: 'noun', contexts: ['biblical'], note: 'Different vocalization' }
    ],
    disambiguationHints: ['Piel = spoke', 'With article = the word/thing']
  },
  'מלך': {
    meanings: [
      { meaning: 'king', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he reigned', pos: 'verb', root: 'מלך', binyan: 'Qal', tense: 'perfect', contexts: ['all'] },
      { meaning: 'counsel (Aramaic)', pos: 'noun', contexts: ['talmudic'], note: 'Aramaic meaning' }
    ],
    disambiguationHints: ['With ה prefix = the king', 'After subject = verb']
  },
  'בית': {
    meanings: [
      { meaning: 'house, household', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'temple (בית המקדש)', pos: 'noun', contexts: ['all'], note: 'When referring to Temple' },
      { meaning: 'school (בית מדרש)', pos: 'noun', contexts: ['talmudic'], note: 'Study hall' }
    ],
    disambiguationHints: ['Check construct chain', 'בית + noun often = institution']
  },
  'אב': {
    meanings: [
      { meaning: 'father', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'Av (month)', pos: 'noun', contexts: ['all'], note: 'Fifth month' },
      { meaning: 'archetype, prototype', pos: 'noun', contexts: ['talmudic'], note: 'אב מלאכה = prototype labor' }
    ],
    disambiguationHints: ['With possessive suffix = father', 'In date context = month']
  },
  'שם': {
    meanings: [
      { meaning: 'name', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'there', pos: 'adverb', contexts: ['all'], frequency: 'very high' },
      { meaning: 'he placed', pos: 'verb', root: 'שים', binyan: 'Qal', tense: 'perfect', contexts: ['all'] }
    ],
    disambiguationHints: ['With לְ prefix = name (לשם)', 'Location context = there']
  },
  'כל': {
    meanings: [
      { meaning: 'all, every', pos: 'noun', contexts: ['all'], frequency: 'extremely high' },
      { meaning: 'vessel (archaic)', pos: 'noun', contexts: ['biblical'], note: 'Rare usage' }
    ],
    disambiguationHints: ['Almost always = all/every']
  },
  'עד': {
    meanings: [
      { meaning: 'until, up to', pos: 'preposition', contexts: ['all'], frequency: 'very high' },
      { meaning: 'witness', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'forever (עַד עוֹלָם)', pos: 'noun', contexts: ['biblical'], note: 'In construct' },
      { meaning: 'prey, booty', pos: 'noun', contexts: ['biblical'], note: 'Rare' }
    ],
    disambiguationHints: ['Before place/time = until', 'Legal context = witness']
  },
  'פה': {
    meanings: [
      { meaning: 'here', pos: 'adverb', contexts: ['all'], frequency: 'high' },
      { meaning: 'mouth', pos: 'noun', contexts: ['all'], frequency: 'high' }
    ],
    disambiguationHints: ['With על = oral (על פה)', 'Location context = here']
  },
  'יד': {
    meanings: [
      { meaning: 'hand', pos: 'noun', contexts: ['all'], frequency: 'very high' },
      { meaning: 'power, authority', pos: 'noun', contexts: ['all'], note: 'Figurative' },
      { meaning: 'portion, share', pos: 'noun', contexts: ['talmudic'], note: 'יד = handle/portion' },
      { meaning: 'memorial, monument', pos: 'noun', contexts: ['biblical'], note: 'Rare (יָד)' }
    ],
    disambiguationHints: ['Literal = hand', 'ביד = by means of/through']
  },

  // === TALMUDIC-SPECIFIC HOMOGRAPHS ===
  'אמר': {
    meanings: [
      { meaning: 'he said', pos: 'verb', root: 'אמר', tense: 'perfect', contexts: ['all'], frequency: 'extremely high' },
      { meaning: 'word, statement', pos: 'noun', contexts: ['talmudic'], note: 'מאמר = statement' },
      { meaning: 'lamb (Aramaic)', pos: 'noun', contexts: ['talmudic'], note: 'אִמְּרָא' }
    ],
    disambiguationHints: ['Usually = said', 'With דְּ prefix (דאמר) = who said']
  },
  'דין': {
    meanings: [
      { meaning: 'law, judgment', pos: 'noun', contexts: ['all'], frequency: 'high' },
      { meaning: 'this (Aramaic)', pos: 'demonstrative', contexts: ['talmudic'], frequency: 'high' },
      { meaning: 'he judged', pos: 'verb', root: 'דין', tense: 'perfect', contexts: ['all'] }
    ],
    disambiguationHints: ['Aramaic דין = this', 'Hebrew דין = judgment']
  },
  'מר': {
    meanings: [
      { meaning: 'master, sir (Aramaic)', pos: 'noun', contexts: ['talmudic'], frequency: 'high', note: 'Title' },
      { meaning: 'bitter', pos: 'adjective', contexts: ['all'], frequency: 'medium' },
      { meaning: 'myrrh', pos: 'noun', contexts: ['biblical'], note: 'Spice' }
    ],
    disambiguationHints: ['Before name = master', 'Taste context = bitter']
  }
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
      console.log('[PreClassify ENTRY] Input word:', JSON.stringify(word), 'length:', word.length);
      console.log('[PreClassify ENTRY] Normalized:', JSON.stringify(normalized), 'length:', normalized.length);
      console.log('[PreClassify ENTRY] Cleaned:', JSON.stringify(cleaned), 'length:', cleaned.length);
      console.log('[PreClassify ENTRY] Word codepoints:', [...word].map(c => c.charCodeAt(0).toString(16)).join(' '));
      console.log('[PreClassify ENTRY] Cleaned codepoints:', [...cleaned].map(c => c.charCodeAt(0).toString(16)).join(' '));
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
        console.log(`[PreClassify] DAF DETECTED: ${word} → page ${pageNum}${isAmudBet ? 'b' : 'a'}`);
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
    console.log('[PreClassify DEBUG] Checking משה - cleaned:', cleaned, 'word:', word);
    console.log('[PreClassify DEBUG] coreNames[cleaned]:', coreNames[cleaned]);
    console.log('[PreClassify DEBUG] normalizedLookup result:', normalizedLookup(coreNames, word));
    console.log('[PreClassify DEBUG] coreNames keys:', Object.keys(coreNames));
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

// =============================================================================
// SOURCE CONFIDENCE SCORING - PRO SCHOLAR V3
// =============================================================================

/**
 * Source reliability tiers
 */
export const SOURCE_TIERS = {
  gold: {
    sources: ['jastrow', 'bdb', 'halot', 'cal'],
    reliability: 0.95,
    description: 'Academic standard dictionaries'
  },
  silver: {
    sources: ['strongs', 'klein', 'gesenius'],
    reliability: 0.85,
    description: 'Established reference works'
  },
  bronze: {
    sources: ['sefaria', 'local', 'pattern', 'talmudic'],
    reliability: 0.70,
    description: 'Algorithmic or general'
  }
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
