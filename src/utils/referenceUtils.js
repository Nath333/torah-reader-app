/**
 * Reference Utilities
 * Shared functions for normalizing and parsing biblical references
 * Used by: masoreticService, manuscriptVariantsService, sefariaApi, etc.
 */

/**
 * Normalize a reference string (e.g., "Genesis 1:1" -> "Genesis.1.1")
 * @param {string} ref - Reference string
 * @returns {string} - Normalized reference
 */
export const normalizeReference = (ref) => {
  if (!ref) return '';
  return ref.replace(/\s+/g, '.').replace(/:/g, '.');
};

/**
 * Parse a reference into components
 * @param {string} ref - Reference string (e.g., "Genesis.1.1" or "Genesis 1:1")
 * @returns {Object} - { book, chapter, verse }
 */
export const parseReference = (ref) => {
  if (!ref) return { book: '', chapter: 0, verse: 0 };

  const normalized = normalizeReference(ref);
  const parts = normalized.split('.');

  return {
    book: parts[0] || '',
    chapter: parseInt(parts[1]) || 0,
    verse: parseInt(parts[2]) || 0
  };
};

/**
 * Format a reference from components
 * @param {string} book - Book name
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number (optional)
 * @returns {string} - Formatted reference
 */
export const formatReference = (book, chapter, verse) => {
  if (verse) {
    return `${book}.${chapter}.${verse}`;
  }
  return `${book}.${chapter}`;
};

/**
 * Book name normalizations - maps abbreviations and variants to standard names
 */
const BOOK_NORMALIZATIONS = {
  // Torah
  'gen': 'Genesis', 'genesis': 'Genesis', 'bereshit': 'Genesis', 'bereishis': 'Genesis',
  'exod': 'Exodus', 'exodus': 'Exodus', 'ex': 'Exodus', 'shemot': 'Exodus', 'shemos': 'Exodus',
  'lev': 'Leviticus', 'leviticus': 'Leviticus', 'vayikra': 'Leviticus',
  'num': 'Numbers', 'numbers': 'Numbers', 'bamidbar': 'Numbers',
  'deut': 'Deuteronomy', 'deuteronomy': 'Deuteronomy', 'devarim': 'Deuteronomy',

  // Former Prophets
  'josh': 'Joshua', 'joshua': 'Joshua', 'yehoshua': 'Joshua',
  'judg': 'Judges', 'judges': 'Judges', 'shoftim': 'Judges',
  '1sam': '1 Samuel', '1 samuel': '1 Samuel', 'i samuel': '1 Samuel', 'shmuel a': '1 Samuel',
  '2sam': '2 Samuel', '2 samuel': '2 Samuel', 'ii samuel': '2 Samuel', 'shmuel b': '2 Samuel',
  '1kgs': '1 Kings', '1 kings': '1 Kings', 'i kings': '1 Kings', 'melachim a': '1 Kings',
  '2kgs': '2 Kings', '2 kings': '2 Kings', 'ii kings': '2 Kings', 'melachim b': '2 Kings',

  // Latter Prophets
  'isa': 'Isaiah', 'isaiah': 'Isaiah', 'yeshayahu': 'Isaiah',
  'jer': 'Jeremiah', 'jeremiah': 'Jeremiah', 'yirmiyahu': 'Jeremiah',
  'ezek': 'Ezekiel', 'ezekiel': 'Ezekiel', 'yechezkel': 'Ezekiel',
  'hos': 'Hosea', 'hosea': 'Hosea', 'hoshea': 'Hosea',
  'joel': 'Joel', 'yoel': 'Joel',
  'amos': 'Amos',
  'obad': 'Obadiah', 'obadiah': 'Obadiah', 'ovadiah': 'Obadiah',
  'jonah': 'Jonah', 'yonah': 'Jonah',
  'mic': 'Micah', 'micah': 'Micah', 'michah': 'Micah',
  'nah': 'Nahum', 'nahum': 'Nahum', 'nachum': 'Nahum',
  'hab': 'Habakkuk', 'habakkuk': 'Habakkuk', 'chavakuk': 'Habakkuk',
  'zeph': 'Zephaniah', 'zephaniah': 'Zephaniah', 'tzefaniah': 'Zephaniah',
  'hag': 'Haggai', 'haggai': 'Haggai', 'chaggai': 'Haggai',
  'zech': 'Zechariah', 'zechariah': 'Zechariah', 'zecharya': 'Zechariah',
  'mal': 'Malachi', 'malachi': 'Malachi',

  // Writings
  'ps': 'Psalms', 'psalms': 'Psalms', 'psalm': 'Psalms', 'tehillim': 'Psalms',
  'prov': 'Proverbs', 'proverbs': 'Proverbs', 'mishlei': 'Proverbs',
  'job': 'Job', 'iyov': 'Job',
  'song': 'Song of Songs', 'song of songs': 'Song of Songs', 'songs': 'Song of Songs', 'shir hashirim': 'Song of Songs',
  'ruth': 'Ruth', 'rus': 'Ruth',
  'lam': 'Lamentations', 'lamentations': 'Lamentations', 'eicha': 'Lamentations', 'eichah': 'Lamentations',
  'eccl': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes', 'qoh': 'Ecclesiastes', 'kohelet': 'Ecclesiastes',
  'esth': 'Esther', 'esther': 'Esther', 'ester': 'Esther',
  'dan': 'Daniel', 'daniel': 'Daniel',
  'ezra': 'Ezra',
  'neh': 'Nehemiah', 'nehemiah': 'Nehemiah', 'nechemiah': 'Nehemiah',
  '1chr': '1 Chronicles', '1 chronicles': '1 Chronicles', 'i chronicles': '1 Chronicles', 'divrei hayamim a': '1 Chronicles',
  '2chr': '2 Chronicles', '2 chronicles': '2 Chronicles', 'ii chronicles': '2 Chronicles', 'divrei hayamim b': '2 Chronicles'
};

/**
 * Normalize a book name to standard form
 * @param {string} book - Book name or abbreviation
 * @returns {string} - Standard book name
 */
export const normalizeBookName = (book) => {
  if (!book) return '';
  const lower = book.toLowerCase().trim();
  return BOOK_NORMALIZATIONS[lower] || book;
};

/**
 * Check if two references refer to the same verse
 * @param {string} ref1 - First reference
 * @param {string} ref2 - Second reference
 * @returns {boolean}
 */
export const referencesMatch = (ref1, ref2) => {
  const parsed1 = parseReference(ref1);
  const parsed2 = parseReference(ref2);

  return (
    normalizeBookName(parsed1.book) === normalizeBookName(parsed2.book) &&
    parsed1.chapter === parsed2.chapter &&
    parsed1.verse === parsed2.verse
  );
};

/**
 * Get the book from a reference
 * @param {string} ref - Reference string
 * @returns {string} - Book name
 */
export const getBookFromReference = (ref) => {
  const parsed = parseReference(ref);
  return normalizeBookName(parsed.book);
};

const referenceUtils = {
  normalizeReference,
  normalizeBookName,
  parseReference,
  formatReference,
  referencesMatch,
  getBookFromReference,
  BOOK_NORMALIZATIONS
};

export default referenceUtils;
