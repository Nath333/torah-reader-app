/**
 * Masoretic Text Service - Ketiv/Qere variants and Masoretic notes
 *
 * This service provides scholarly access to Masoretic textual variants,
 * including Ketiv (written form) vs Qere (read form) variations,
 * and other Masoretic apparatus notes.
 */

import { normalizeReference, normalizeBookName } from '../utils/referenceUtils';

// Known Ketiv/Qere pairs in the Hebrew Bible
// Format: { ref: "Book.Chapter.Verse", ketiv: "written", qere: "read", type, notes }
const KETIV_QERE_DATABASE = [
  // Genesis examples
  { ref: "Genesis.8.17", ketiv: "הוצא", qere: "היצא", type: "vowel", notes: "Hiphil imperative variation" },
  { ref: "Genesis.24.33", ketiv: "ויישם", qere: "ויושם", type: "vowel", notes: "Hophal vs Qal passive" },
  { ref: "Genesis.30.11", ketiv: "בגד", qere: "בא גד", type: "word-division", notes: "One word vs two words" },
  { ref: "Genesis.43.28", ketiv: "ויקדו", qere: "ויקד", type: "consonant", notes: "Plural vs singular suffix" },

  // Exodus examples
  { ref: "Exodus.4.2", ketiv: "מזה", qere: "מה זה", type: "word-division", notes: "Interrogative phrase" },
  { ref: "Exodus.21.8", ketiv: "לו", qere: "לא", type: "consonant", notes: "לא perpetuum - always read לא" },

  // Leviticus examples
  { ref: "Leviticus.11.21", ketiv: "לא", qere: "לו", type: "consonant", notes: "Negation vs preposition" },
  { ref: "Leviticus.23.17", ketiv: "תבואינה", qere: "תביאנה", type: "vowel", notes: "Verbal form variation" },

  // Numbers examples
  { ref: "Numbers.11.15", ketiv: "בראתי", qere: "ברעתי", type: "consonant", notes: "Aleph vs Ayin - 'my evil'" },
  { ref: "Numbers.32.7", ketiv: "תנואון", qere: "תניאון", type: "consonant", notes: "Verbal root variation" },

  // Deuteronomy examples
  { ref: "Deuteronomy.2.33", ketiv: "ובנו", qere: "ובניו", type: "consonant", notes: "His son vs his sons" },
  { ref: "Deuteronomy.33.2", ketiv: "אשדת", qere: "אש דת", type: "word-division", notes: "Fire of law" },

  // Samuel examples (many instances)
  { ref: "1 Samuel.2.3", ketiv: "תדברו", qere: "תדבר", type: "consonant", notes: "Plural vs singular" },
  { ref: "2 Samuel.5.2", ketiv: "הייתה", qere: "היית", type: "consonant", notes: "2ms vs 3fs" },
  { ref: "2 Samuel.12.9", ketiv: "הכיתו", qere: "הכית", type: "consonant", notes: "Verbal ending" },
  { ref: "2 Samuel.16.23", ketiv: "בדבר", qere: "כדבר", type: "consonant", notes: "Preposition variation" },
  { ref: "2 Samuel.22.51", ketiv: "מגדיל", qere: "מגדול", type: "vowel", notes: "Hiphil participle variation" },

  // Kings examples
  { ref: "1 Kings.17.12", ketiv: "כאתי", qere: "כבאתי", type: "consonant", notes: "Missing Beth" },
  { ref: "2 Kings.4.3", ketiv: "כלים", qere: "כלי", type: "consonant", notes: "Plural vs singular" },
  { ref: "2 Kings.20.4", ketiv: "העיר", qere: "החצר", type: "word", notes: "City vs court - different word entirely" },

  // Isaiah examples
  { ref: "Isaiah.9.2", ketiv: "לוא", qere: "לו", type: "consonant", notes: "Negative vs possessive" },
  { ref: "Isaiah.49.5", ketiv: "לו", qere: "לא", type: "consonant", notes: "Possessive vs negative" },
  { ref: "Isaiah.63.9", ketiv: "לו", qere: "לא", type: "consonant", notes: "Major theological variant" },

  // Jeremiah examples
  { ref: "Jeremiah.31.38", ketiv: "בניני", qere: "ונבנתה", type: "word", notes: "Major verbal form change" },
  { ref: "Jeremiah.42.6", ketiv: "אנו", qere: "אנחנו", type: "consonant", notes: "Short vs full pronoun" },
  { ref: "Jeremiah.51.3", ketiv: "אל ידרך", qere: "ידרך", type: "word-division", notes: "Negation removal" },

  // Ezekiel examples
  { ref: "Ezekiel.8.16", ketiv: "משתחויתם", qere: "משתחוים", type: "consonant", notes: "Verbal ending" },
  { ref: "Ezekiel.24.7", ketiv: "שפכה", qere: "שפכתה", type: "consonant", notes: "3fs suffix addition" },
  { ref: "Ezekiel.46.22", ketiv: "קטורות", qere: "קטרות", type: "vowel", notes: "Passive participle variation" },

  // Psalms examples
  { ref: "Psalms.100.3", ketiv: "ולא", qere: "ולו", type: "consonant", notes: "Not his vs and to him - theological" },
  { ref: "Psalms.139.16", ketiv: "ולא", qere: "ולו", type: "consonant", notes: "Similar theological variant" },

  // Proverbs examples
  { ref: "Proverbs.19.19", ketiv: "גדל", qere: "גדול", type: "defective", notes: "Defective spelling" },
  { ref: "Proverbs.20.16", ketiv: "נכרים", qere: "נכריה", type: "consonant", notes: "Masculine vs feminine" },

  // Job examples
  { ref: "Job.6.21", ketiv: "לו", qere: "לא", type: "consonant", notes: "Possessive vs negative" },
  { ref: "Job.13.15", ketiv: "לו", qere: "לא", type: "consonant", notes: "Major theological - hope vs no hope" },

  // Ruth examples
  { ref: "Ruth.3.3", ketiv: "וירדתי", qere: "וירדת", type: "consonant", notes: "1cs vs 2fs" },
  { ref: "Ruth.3.4", ketiv: "ושכבתי", qere: "ושכבת", type: "consonant", notes: "1cs vs 2fs" },
  { ref: "Ruth.3.12", ketiv: "אם", qere: "אמנם", type: "consonant", notes: "Short vs emphatic form" },

  // Ecclesiastes examples
  { ref: "Ecclesiastes.9.4", ketiv: "יבחר", qere: "יחבר", type: "consonant", notes: "Choose vs join - metathesis" },
  { ref: "Ecclesiastes.12.6", ketiv: "ירוץ", qere: "ירתק", type: "consonant", notes: "Run vs be joined - different root" },

  // Esther examples
  { ref: "Esther.1.6", ketiv: "בהט", qere: "ובהט", type: "consonant", notes: "Conjunction addition" },
  { ref: "Esther.8.11", ketiv: "להשמיד", qere: "להקהל", type: "word", notes: "Destroy vs assemble - major variant" },

  // Daniel examples
  { ref: "Daniel.3.3", ketiv: "איתיא", qere: "אתיא", type: "consonant", notes: "Aramaic spelling variant" },
  { ref: "Daniel.5.10", ketiv: "מלכתא", qere: "מלכא", type: "consonant", notes: "Queen vs King" },

  // Chronicles examples
  { ref: "1 Chronicles.11.20", ketiv: "הכי", qere: "הלא", type: "word", notes: "Interrogative variation" },
  { ref: "2 Chronicles.34.6", ketiv: "בחרבתיהם", qere: "בתרביתיהם", type: "consonant", notes: "Swords vs surroundings" }
];

// Masoretic note types
const MASORAH_TYPES = {
  KETIV_QERE: 'ketiv_qere',
  KETIV_VELO_QERE: 'ketiv_velo_qere', // Written but not read
  QERE_VELO_KETIV: 'qere_velo_ketiv', // Read but not written
  SEBIRIN: 'sebirin', // One might think
  TIQQUNE_SOFERIM: 'tiqqune_soferim', // Scribal corrections
  ITTUR_SOFERIM: 'ittur_soferim', // Scribal omissions
  MASORAH_PARVA: 'masorah_parva', // Side margin notes
  MASORAH_MAGNA: 'masorah_magna' // Top/bottom margin notes
};

// Tiqqune Soferim - Traditional 18 scribal corrections
const TIQQUNE_SOFERIM = [
  { ref: "Genesis.18.22", original: "וה׳ עודנו עומד לפני אברהם", emended: "ואברהם עודנו עומד לפני ה׳", reason: "Reverence for divine presence" },
  { ref: "Numbers.11.15", original: "בראתך", emended: "בראתי", reason: "Grammatical correction" },
  { ref: "Numbers.12.12", original: "אמו", emended: "אמנו", reason: "Reverence - our mother" },
  { ref: "1 Samuel.3.13", original: "לו", emended: "להם", reason: "Euphemism for cursing God" },
  { ref: "2 Samuel.16.12", original: "בקללתו", emended: "בעיני", reason: "Divine name protection" },
  { ref: "2 Samuel.20.1", original: "באלהיו", emended: "באהליו", reason: "Idolatry reference removed" },
  { ref: "1 Kings.12.16", original: "באלהיו", emended: "באהליו", reason: "Same as above" },
  { ref: "Jeremiah.2.11", original: "כבודי", emended: "כבודו", reason: "Divine glory reference" },
  { ref: "Ezekiel.8.17", original: "אפי", emended: "אפם", reason: "Anthropomorphism removed" },
  { ref: "Hosea.4.7", original: "כבודי", emended: "כבודם", reason: "Divine glory reference" },
  { ref: "Habakkuk.1.12", original: "תמות", emended: "נמות", reason: "Divine mortality denial" },
  { ref: "Zechariah.2.12", original: "עינו", emended: "עיני", reason: "Divine eye reference" },
  { ref: "Malachi.1.12", original: "שלחני", emended: "שלחנו", reason: "Divine table reference" },
  { ref: "Psalms.106.20", original: "כבודי", emended: "כבודם", reason: "Divine glory reference" },
  { ref: "Job.7.20", original: "עליך", emended: "עלי", reason: "Divine burden reference" },
  { ref: "Job.32.3", original: "את ה׳", emended: "את איוב", reason: "Divine condemnation avoided" },
  { ref: "Lamentations.3.20", original: "עלי", emended: "עליה", reason: "Soul reference" }
];

// Qere velo Ketiv - Read but not written (4 instances)
const QERE_VELO_KETIV = [
  { ref: "2 Samuel.8.3", qere: "נהר", notes: "River (Euphrates) understood" },
  { ref: "2 Samuel.16.23", qere: "ההוא", notes: "That (demonstrative) understood" },
  { ref: "2 Kings.19.31", qere: "מן", notes: "From understood" },
  { ref: "2 Kings.19.37", qere: "בניו", notes: "His sons understood" },
  { ref: "Jeremiah.31.38", qere: "יומים", notes: "Days understood" },
  { ref: "Jeremiah.50.29", qere: "אליה", notes: "To her understood" },
  { ref: "Ruth.3.5", qere: "אלי", notes: "To me understood" },
  { ref: "Ruth.3.17", qere: "אלי", notes: "To me understood" }
];

// Ketiv velo Qere - Written but not read (5 instances)
const KETIV_VELO_QERE = [
  { ref: "2 Kings.5.18", ketiv: "בבית", notes: "In the house - not read" },
  { ref: "Jeremiah.51.3", ketiv: "אל", notes: "Negative particle - not read" },
  { ref: "Ezekiel.48.16", ketiv: "חמש", notes: "Five - not read" },
  { ref: "Ruth.3.12", ketiv: "כי", notes: "That - not read" },
  { ref: "Daniel.9.18", ketiv: "שוממות", notes: "Desolations - not read (Aramaic)" }
];

/**
 * Get Ketiv/Qere variants for a specific verse
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object[]} Array of Ketiv/Qere pairs for the verse
 */
export const getKetivQere = (reference) => {
  // Normalize the reference
  const normalizedRef = normalizeReference(reference);

  return KETIV_QERE_DATABASE.filter(kq =>
    normalizeReference(kq.ref) === normalizedRef
  );
};

/**
 * Get all Ketiv/Qere in a chapter
 * @param {string} book - Book name
 * @param {number} chapter - Chapter number
 * @returns {Object[]} Array of Ketiv/Qere pairs
 */
export const getKetivQereForChapter = (book, chapter) => {
  const bookNorm = normalizeBookName(book);
  return KETIV_QERE_DATABASE.filter(kq => {
    const [refBook, refChapter] = kq.ref.split('.');
    return normalizeBookName(refBook) === bookNorm && parseInt(refChapter) === chapter;
  });
};

/**
 * Get Tiqqune Soferim for a reference
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object|null} Tiqqun entry or null
 */
export const getTiqqunSoferim = (reference) => {
  const normalizedRef = normalizeReference(reference);
  return TIQQUNE_SOFERIM.find(t =>
    normalizeReference(t.ref) === normalizedRef
  ) || null;
};

/**
 * Get all Tiqqune Soferim
 * @returns {Object[]} All scribal corrections
 */
export const getAllTiqquneSoferim = () => {
  return [...TIQQUNE_SOFERIM];
};

/**
 * Get Qere velo Ketiv for a reference
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object|null} Entry or null
 */
export const getQereVeloKetiv = (reference) => {
  const normalizedRef = normalizeReference(reference);
  return QERE_VELO_KETIV.find(q =>
    normalizeReference(q.ref) === normalizedRef
  ) || null;
};

/**
 * Get Ketiv velo Qere for a reference
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object|null} Entry or null
 */
export const getKetivVeloQere = (reference) => {
  const normalizedRef = normalizeReference(reference);
  return KETIV_VELO_QERE.find(k =>
    normalizeReference(k.ref) === normalizedRef
  ) || null;
};

/**
 * Get all Masoretic notes for a verse
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object} Comprehensive Masoretic data
 */
export const getMasoreticNotes = (reference) => {
  const result = {
    reference,
    hasVariants: false,
    ketivQere: [],
    tiqqunSoferim: null,
    qereVeloKetiv: null,
    ketivVeloQere: null
  };

  result.ketivQere = getKetivQere(reference);
  result.tiqqunSoferim = getTiqqunSoferim(reference);
  result.qereVeloKetiv = getQereVeloKetiv(reference);
  result.ketivVeloQere = getKetivVeloQere(reference);

  result.hasVariants = (
    result.ketivQere.length > 0 ||
    result.tiqqunSoferim !== null ||
    result.qereVeloKetiv !== null ||
    result.ketivVeloQere !== null
  );

  return result;
};

/**
 * Get statistics about Ketiv/Qere types
 * @returns {Object} Statistics by type
 */
export const getKetivQereStats = () => {
  const stats = {
    total: KETIV_QERE_DATABASE.length,
    byType: {},
    byBook: {}
  };

  KETIV_QERE_DATABASE.forEach(kq => {
    // Count by type
    stats.byType[kq.type] = (stats.byType[kq.type] || 0) + 1;

    // Count by book
    const book = kq.ref.split('.')[0];
    stats.byBook[book] = (stats.byBook[book] || 0) + 1;
  });

  return stats;
};

/**
 * Search Ketiv/Qere by criteria
 * @param {Object} options - Search options
 * @returns {Object[]} Matching entries
 */
export const searchKetivQere = (options = {}) => {
  const { book, type, searchText } = options;

  return KETIV_QERE_DATABASE.filter(kq => {
    if (book && !kq.ref.startsWith(normalizeBookName(book))) {
      return false;
    }
    if (type && kq.type !== type) {
      return false;
    }
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        kq.ketiv.includes(searchText) ||
        kq.qere.includes(searchText) ||
        kq.notes.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
};

// Export types for external use
export const MASORAH_TYPE_LABELS = {
  [MASORAH_TYPES.KETIV_QERE]: 'Ketiv/Qere',
  [MASORAH_TYPES.KETIV_VELO_QERE]: 'Ketiv velo Qere (written, not read)',
  [MASORAH_TYPES.QERE_VELO_KETIV]: 'Qere velo Ketiv (read, not written)',
  [MASORAH_TYPES.SEBIRIN]: 'Sebirin (alternative reading)',
  [MASORAH_TYPES.TIQQUNE_SOFERIM]: 'Tiqqun Soferim (scribal correction)',
  [MASORAH_TYPES.ITTUR_SOFERIM]: 'Ittur Soferim (scribal omission)'
};

export const KETIV_QERE_TYPE_LABELS = {
  'vowel': 'Vowel variation',
  'consonant': 'Consonantal variant',
  'word-division': 'Word division',
  'word': 'Different word',
  'defective': 'Defective/Plene spelling'
};

export { MASORAH_TYPES };

// Default export
const masoreticService = {
  getKetivQere,
  getKetivQereForChapter,
  getTiqqunSoferim,
  getAllTiqquneSoferim,
  getQereVeloKetiv,
  getKetivVeloQere,
  getMasoreticNotes,
  getKetivQereStats,
  searchKetivQere,
  MASORAH_TYPES,
  MASORAH_TYPE_LABELS,
  KETIV_QERE_TYPE_LABELS
};

export default masoreticService;
