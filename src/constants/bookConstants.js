// =============================================================================
// Book Constants - Shared book classifications for all services
// =============================================================================

// Torah books (Chumash)
export const TORAH_BOOKS = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy'
];

// Talmud Bavli tractates
export const TALMUD_BAVLI = [
  'Berakhot', 'Shabbat', 'Eruvin', 'Pesachim', 'Shekalim', 'Yoma', 'Sukkah',
  'Beitzah', 'Rosh Hashanah', 'Taanit', 'Megillah', 'Moed Katan', 'Chagigah',
  'Yevamot', 'Ketubot', 'Nedarim', 'Nazir', 'Sotah', 'Gittin', 'Kiddushin',
  'Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin', 'Makkot', 'Shevuot',
  'Avodah Zarah', 'Horayot', 'Zevachim', 'Menachot', 'Chullin', 'Bekhorot',
  'Arakhin', 'Temurah', 'Keritot', 'Meilah', 'Tamid', 'Niddah'
];

// Nevi'im (Prophets)
export const NEVIIM_BOOKS = [
  'Joshua', 'Judges', 'I Samuel', 'II Samuel', 'I Kings', 'II Kings',
  'Isaiah', 'Jeremiah', 'Ezekiel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];

// Ketuvim (Writings)
export const KETUVIM_BOOKS = [
  'Psalms', 'Proverbs', 'Job', 'Song of Songs', 'Ruth', 'Lamentations',
  'Ecclesiastes', 'Esther', 'Daniel', 'Ezra', 'Nehemiah', 'I Chronicles', 'II Chronicles'
];

// All Tanach books combined
export const TANACH_BOOKS = [...TORAH_BOOKS, ...NEVIIM_BOOKS, ...KETUVIM_BOOKS];

// Hebrew names for Torah books
export const BOOK_HEBREW_NAMES = {
  'Genesis': 'בראשית',
  'Exodus': 'שמות',
  'Leviticus': 'ויקרא',
  'Numbers': 'במדבר',
  'Deuteronomy': 'דברים'
};

// Tractate name aliases for Sefaria API formatting
export const TRACTATE_ALIASES = {
  'Bava Kamma': 'Bava_Kamma',
  'Bava Metzia': 'Bava_Metzia',
  'Bava Batra': 'Bava_Batra',
  'Avodah Zarah': 'Avodah_Zarah',
  'Moed Katan': 'Moed_Katan',
  'Rosh Hashanah': 'Rosh_Hashanah'
};

// Helper functions
export const isTorah = (book) => TORAH_BOOKS.includes(book);
export const isTalmud = (tractate) => TALMUD_BAVLI.includes(tractate);
export const isNeviim = (book) => NEVIIM_BOOKS.includes(book);
export const isKetuvim = (book) => KETUVIM_BOOKS.includes(book);
export const isTanach = (book) => TANACH_BOOKS.includes(book);

/**
 * Format tractate name for Sefaria API
 * @param {string} tractate - Tractate name
 * @returns {string} Formatted tractate name
 */
export const formatTractate = (tractate) => {
  return TRACTATE_ALIASES[tractate] || tractate.replace(/ /g, '_');
};

/**
 * Format book name for Sefaria API
 * @param {string} bookName - Book name
 * @returns {string} Formatted book name
 */
export const formatBookName = (bookName) => {
  return bookName.replace(/ /g, '_');
};

// Alias for shorter import
export const formatBook = formatBookName;
