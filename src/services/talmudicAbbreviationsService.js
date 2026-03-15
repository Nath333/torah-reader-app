// =============================================================================
// Talmudic Abbreviations Service
// Expands Hebrew abbreviations (ראשי תיבות) commonly found in Talmud
// =============================================================================

/**
 * Common Talmudic Abbreviations Database
 * Organized by category for easy maintenance
 */
export const ABBREVIATIONS = {
  // ==========================================================================
  // TANNAITIC SOURCES - ת"ר, תנו רבנן
  // ==========================================================================
  sources: {
    'ת"ר': { expansion: 'תנו רבנן', english: 'Our Rabbis taught', type: 'source' },
    'ת״ר': { expansion: 'תנו רבנן', english: 'Our Rabbis taught', type: 'source' },
    'ת"ש': { expansion: 'תא שמע', english: 'Come and hear', type: 'proof' },
    'ת״ש': { expansion: 'תא שמע', english: 'Come and hear', type: 'proof' },
    'ש"מ': { expansion: 'שמע מינה', english: 'Infer from this', type: 'inference' },
    'ש״מ': { expansion: 'שמע מינה', english: 'Infer from this', type: 'inference' },
    'מתני\'': { expansion: 'מתניתין', english: 'Mishnah', type: 'structure' },
    'גמ\'': { expansion: 'גמרא', english: 'Gemara', type: 'structure' }
  },

  // ==========================================================================
  // RABBI TITLES & NAMES
  // ==========================================================================
  rabbis: {
    'א"ר': { expansion: 'אמר רבי', english: 'Rabbi said', type: 'attribution' },
    'א״ר': { expansion: 'אמר רבי', english: 'Rabbi said', type: 'attribution' },
    'רשב"י': { expansion: 'רבי שמעון בר יוחאי', english: 'Rabbi Shimon bar Yochai', type: 'name' },
    'רשב״י': { expansion: 'רבי שמעון בר יוחאי', english: 'Rabbi Shimon bar Yochai', type: 'name' },
    'רשב"ג': { expansion: 'רבן שמעון בן גמליאל', english: 'Rabban Shimon ben Gamliel', type: 'name' },
    'רשב״ג': { expansion: 'רבן שמעון בן גמליאל', english: 'Rabban Shimon ben Gamliel', type: 'name' },
    'ר"י': { expansion: 'רבי יוחנן', english: 'Rabbi Yochanan', type: 'name' },
    'ר״י': { expansion: 'רבי יוחנן', english: 'Rabbi Yochanan', type: 'name' },
    'ר"מ': { expansion: 'רבי מאיר', english: 'Rabbi Meir', type: 'name' },
    'ר״מ': { expansion: 'רבי מאיר', english: 'Rabbi Meir', type: 'name' },
    'ר"ע': { expansion: 'רבי עקיבא', english: 'Rabbi Akiva', type: 'name' },
    'ר״ע': { expansion: 'רבי עקיבא', english: 'Rabbi Akiva', type: 'name' },
    'ר"ל': { expansion: 'ריש לקיש', english: 'Reish Lakish', type: 'name' },
    'ר״ל': { expansion: 'ריש לקיש', english: 'Reish Lakish', type: 'name' },
    'רב"ה': { expansion: 'רבה בר הונא', english: 'Rabbah bar Huna', type: 'name' },
    'רנב"י': { expansion: 'רבי נחמן בר יצחק', english: 'Rav Nachman bar Yitzchak', type: 'name' },
    'ר"ה': { expansion: 'רב הונא', english: 'Rav Huna', type: 'name' },
    'ר"נ': { expansion: 'רב נחמן', english: 'Rav Nachman', type: 'name' },
    'ר"פ': { expansion: 'רב פפא', english: 'Rav Pappa', type: 'name' },
    'ר"א': { expansion: 'רבי אליעזר', english: 'Rabbi Eliezer', type: 'name' },
    'ר"ש': { expansion: 'רבי שמעון', english: 'Rabbi Shimon', type: 'name' },
    'ריב"ל': { expansion: 'רבי יהושע בן לוי', english: 'Rabbi Yehoshua ben Levi', type: 'name' }
  },

  // ==========================================================================
  // DISCOURSE MARKERS
  // ==========================================================================
  discourse: {
    'מ"ט': { expansion: 'מאי טעמא', english: 'What is the reason?', type: 'question' },
    'מ״ט': { expansion: 'מאי טעמא', english: 'What is the reason?', type: 'question' },
    'מנה"מ': { expansion: 'מנא הני מילי', english: 'From where do we derive?', type: 'question' },
    'ב"ש': { expansion: 'בית שמאי', english: 'House of Shammai', type: 'school' },
    'ב״ש': { expansion: 'בית שמאי', english: 'House of Shammai', type: 'school' },
    'ב"ה': { expansion: 'בית הלל', english: 'House of Hillel', type: 'school' },
    'ב״ה': { expansion: 'בית הלל', english: 'House of Hillel', type: 'school' },
    'איב"ל': { expansion: 'איבעיא להו', english: 'They asked', type: 'question' },
    'וכו\'': { expansion: 'וכולי', english: 'etc.', type: 'continuation' },
    'וגו\'': { expansion: 'וגומר', english: 'and so on (verse continues)', type: 'continuation' },
    'ה"נ': { expansion: 'הכי נמי', english: 'So too here', type: 'analogy' },
    'ה״נ': { expansion: 'הכי נמי', english: 'So too here', type: 'analogy' },
    'הה"ד': { expansion: 'הדא הוא דכתיב', english: 'This is what is written', type: 'citation' },
    'אה"נ': { expansion: 'אין הכי נמי', english: 'Indeed so', type: 'affirmation' }
  },

  // ==========================================================================
  // LEGAL TERMS
  // ==========================================================================
  legal: {
    'ק"ו': { expansion: 'קל וחומר', english: 'a fortiori argument', type: 'hermeneutic' },
    'ק״ו': { expansion: 'קל וחומר', english: 'a fortiori argument', type: 'hermeneutic' },
    'ג"ש': { expansion: 'גזירה שוה', english: 'verbal analogy', type: 'hermeneutic' },
    'ג״ש': { expansion: 'גזירה שוה', english: 'verbal analogy', type: 'hermeneutic' },
    'ה"א': { expansion: 'הוה אמינא', english: 'I might have thought', type: 'argument' },
    'ה״א': { expansion: 'הוה אמינא', english: 'I might have thought', type: 'argument' },
    'קמ"ל': { expansion: 'קא משמע לן', english: 'It teaches us', type: 'teaching' },
    'קמ״ל': { expansion: 'קא משמע לן', english: 'It teaches us', type: 'teaching' },
    'מ"ד': { expansion: 'מאן דאמר', english: 'The one who says', type: 'opinion' },
    'מ״ד': { expansion: 'מאן דאמר', english: 'The one who says', type: 'opinion' },
    'נפ"מ': { expansion: 'נפקא מינה', english: 'Practical difference', type: 'application' },
    'נפ״מ': { expansion: 'נפקא מינה', english: 'Practical difference', type: 'application' },
    'לה"ק': { expansion: 'לישנא קמא', english: 'First version', type: 'version' },
    'ל"א': { expansion: 'לישנא אחרינא', english: 'Another version', type: 'version' },
    'ל״א': { expansion: 'לישנא אחרינא', english: 'Another version', type: 'version' },
    'ב"מ': { expansion: 'במאי מיפלגי', english: 'In what do they disagree?', type: 'question' }
  },

  // ==========================================================================
  // HALACHIC RULINGS
  // ==========================================================================
  halachic: {
    'מדאו\'': { expansion: 'מדאורייתא', english: 'Biblical law', type: 'ruling' },
    'מדרב\'': { expansion: 'מדרבנן', english: 'Rabbinic law', type: 'ruling' },
    'פטו"ר': { expansion: 'פטור', english: 'Exempt', type: 'ruling' },
    'חיו"ב': { expansion: 'חייב', english: 'Obligated', type: 'ruling' },
    'מו"מ': { expansion: 'משא ומתן', english: 'Negotiation/discussion', type: 'process' },
    'ס"ד': { expansion: 'סלקא דעתך', english: 'You might think', type: 'argument' },
    'ס״ד': { expansion: 'סלקא דעתך', english: 'You might think', type: 'argument' },
    'מ"מ': { expansion: 'מכל מקום', english: 'Nevertheless', type: 'concession' },
    'מ״מ': { expansion: 'מכל מקום', english: 'Nevertheless', type: 'concession' }
  },

  // ==========================================================================
  // TRACTATE NAMES
  // ==========================================================================
  tractates: {
    'ב"ק': { expansion: 'בבא קמא', english: 'Bava Kamma', type: 'tractate' },
    'ב״ק': { expansion: 'בבא קמא', english: 'Bava Kamma', type: 'tractate' },
    'ב"מ': { expansion: 'בבא מציעא', english: 'Bava Metzia', type: 'tractate' },
    'ב״מ': { expansion: 'בבא מציעא', english: 'Bava Metzia', type: 'tractate' },
    'ב"ב': { expansion: 'בבא בתרא', english: 'Bava Batra', type: 'tractate' },
    'ב״ב': { expansion: 'בבא בתרא', english: 'Bava Batra', type: 'tractate' },
    'ע"ז': { expansion: 'עבודה זרה', english: 'Avodah Zarah', type: 'tractate' },
    'ע״ז': { expansion: 'עבודה זרה', english: 'Avodah Zarah', type: 'tractate' },
    'ר"ה': { expansion: 'ראש השנה', english: 'Rosh Hashanah', type: 'tractate' },
    'ר״ה': { expansion: 'ראש השנה', english: 'Rosh Hashanah', type: 'tractate' },
    'מ"ק': { expansion: 'מועד קטן', english: 'Moed Katan', type: 'tractate' },
    'מ״ק': { expansion: 'מועד קטן', english: 'Moed Katan', type: 'tractate' },
    'יו"ט': { expansion: 'יום טוב', english: 'Holiday', type: 'term' }
  },

  // ==========================================================================
  // COMMENTARY & BOOKS
  // ==========================================================================
  books: {
    'רש"י': { expansion: 'רבי שלמה יצחקי', english: 'Rashi', type: 'commentator' },
    'רש״י': { expansion: 'רבי שלמה יצחקי', english: 'Rashi', type: 'commentator' },
    'תוס\'': { expansion: 'תוספות', english: 'Tosafot', type: 'commentary' },
    'ריטב"א': { expansion: 'רבי יום טוב אשבילי', english: 'Ritva', type: 'commentator' },
    'רשב"א': { expansion: 'רבי שלמה בן אדרת', english: 'Rashba', type: 'commentator' },
    'רמב"ם': { expansion: 'רבי משה בן מימון', english: 'Rambam (Maimonides)', type: 'commentator' },
    'רמב״ם': { expansion: 'רבי משה בן מימון', english: 'Rambam (Maimonides)', type: 'commentator' },
    'רמב"ן': { expansion: 'רבי משה בן נחמן', english: 'Ramban (Nachmanides)', type: 'commentator' },
    'רמב״ן': { expansion: 'רבי משה בן נחמן', english: 'Ramban (Nachmanides)', type: 'commentator' },
    'ראב"ד': { expansion: 'רבי אברהם בן דוד', english: 'Raavad', type: 'commentator' },
    'מהרש"א': { expansion: 'מורנו הרב שמואל אידלש', english: 'Maharsha', type: 'commentator' },
    'מהרש״א': { expansion: 'מורנו הרב שמואל אידלש', english: 'Maharsha', type: 'commentator' },
    'שו"ע': { expansion: 'שולחן ערוך', english: 'Shulchan Aruch', type: 'book' },
    'שו״ע': { expansion: 'שולחן ערוך', english: 'Shulchan Aruch', type: 'book' },
    'מ"ב': { expansion: 'משנה ברורה', english: 'Mishnah Berurah', type: 'book' },
    'מ״ב': { expansion: 'משנה ברורה', english: 'Mishnah Berurah', type: 'book' }
  }
};

// Flatten all abbreviations for quick lookup
const ALL_ABBREVIATIONS = Object.values(ABBREVIATIONS).reduce((acc, category) => {
  return { ...acc, ...category };
}, {});

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Expand a single abbreviation
 * @param {string} abbrev - The abbreviation to expand
 * @returns {Object|null} - Expansion info or null if not found
 */
export function expandAbbreviation(abbrev) {
  if (!abbrev) return null;
  return ALL_ABBREVIATIONS[abbrev] || null;
}

/**
 * Find and expand all abbreviations in text
 * @param {string} text - Hebrew text
 * @returns {Array} - Array of found abbreviations with positions
 */
export function findAbbreviations(text) {
  if (!text) return [];

  const results = [];
  const abbrevKeys = Object.keys(ALL_ABBREVIATIONS);

  for (const abbrev of abbrevKeys) {
    // Escape special regex characters
    const escaped = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');

    let match;
    while ((match = regex.exec(text)) !== null) {
      const info = ALL_ABBREVIATIONS[abbrev];
      results.push({
        abbreviation: abbrev,
        expansion: info.expansion,
        english: info.english,
        type: info.type,
        position: match.index,
        endPosition: match.index + abbrev.length
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Replace all abbreviations in text with their expansions
 * @param {string} text - Hebrew text
 * @param {Object} options - Options
 * @param {boolean} options.showOriginal - Keep original in parentheses
 * @returns {string} - Expanded text
 */
export function expandAllAbbreviations(text, options = {}) {
  if (!text) return text;

  const { showOriginal = false } = options;
  const abbreviations = findAbbreviations(text);

  // Sort by position descending to replace from end to start
  abbreviations.sort((a, b) => b.position - a.position);

  let result = text;
  for (const abbrev of abbreviations) {
    const replacement = showOriginal
      ? `${abbrev.expansion} (${abbrev.abbreviation})`
      : abbrev.expansion;

    result = result.slice(0, abbrev.position) + replacement + result.slice(abbrev.endPosition);
  }

  return result;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const talmudicAbbreviationsService = {
  ABBREVIATIONS,
  expandAbbreviation,
  findAbbreviations,
  expandAllAbbreviations
};

export default talmudicAbbreviationsService;
