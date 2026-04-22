// =============================================================================
// Book Data Constants and Metadata
// =============================================================================

import {
  TORAH_BOOKS,
  NEVIIM_BOOKS,
  KETUVIM_BOOKS,
  TALMUD_BAVLI
} from '../../constants/bookConstants';

// =============================================================================
// MISHNAH STRUCTURE
// =============================================================================

export const MISHNAH_SEDARIM = {
  zeraim: {
    name: 'Zeraim', hebrewName: 'זרעים',
    tractates: ['Mishnah Berakhot', 'Mishnah Peah', 'Mishnah Demai', 'Mishnah Kilayim',
      'Mishnah Sheviit', 'Mishnah Terumot', 'Mishnah Maasrot', 'Mishnah Maaser Sheni',
      'Mishnah Challah', 'Mishnah Orlah', 'Mishnah Bikkurim']
  },
  moed: {
    name: 'Moed', hebrewName: 'מועד',
    tractates: ['Mishnah Shabbat', 'Mishnah Eruvin', 'Mishnah Pesachim', 'Mishnah Shekalim',
      'Mishnah Yoma', 'Mishnah Sukkah', 'Mishnah Beitzah', 'Mishnah Rosh Hashanah',
      'Mishnah Taanit', 'Mishnah Megillah', 'Mishnah Moed Katan', 'Mishnah Chagigah']
  },
  nashim: {
    name: 'Nashim', hebrewName: 'נשים',
    tractates: ['Mishnah Yevamot', 'Mishnah Ketubot', 'Mishnah Nedarim', 'Mishnah Nazir',
      'Mishnah Sotah', 'Mishnah Gittin', 'Mishnah Kiddushin']
  },
  nezikin: {
    name: 'Nezikin', hebrewName: 'נזיקין',
    tractates: ['Mishnah Bava Kamma', 'Mishnah Bava Metzia', 'Mishnah Bava Batra',
      'Mishnah Sanhedrin', 'Mishnah Makkot', 'Mishnah Shevuot', 'Mishnah Eduyot',
      'Mishnah Avodah Zarah', 'Mishnah Avot', 'Mishnah Horayot']
  },
  kodashim: {
    name: 'Kodashim', hebrewName: 'קדשים',
    tractates: ['Mishnah Zevachim', 'Mishnah Menachot', 'Mishnah Chullin', 'Mishnah Bekhorot',
      'Mishnah Arakhin', 'Mishnah Temurah', 'Mishnah Keritot', 'Mishnah Meilah',
      'Mishnah Tamid', 'Mishnah Middot', 'Mishnah Kinnim']
  },
  tahorot: {
    name: 'Tahorot', hebrewName: 'טהרות',
    tractates: ['Mishnah Kelim', 'Mishnah Oholot', 'Mishnah Negaim', 'Mishnah Parah',
      'Mishnah Tahorot', 'Mishnah Mikvaot', 'Mishnah Niddah', 'Mishnah Makhshirin',
      'Mishnah Zavim', 'Mishnah Tevul Yom', 'Mishnah Yadayim', 'Mishnah Oktzin']
  }
};

export const MISHNAH_TRACTATES = Object.values(MISHNAH_SEDARIM).flatMap(seder => seder.tractates);

// =============================================================================
// CHAPTER AND DAF COUNTS
// =============================================================================

export const CHAPTER_COUNTS = {
  // Torah
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  // Nevi'im
  'Joshua': 24, 'Judges': 21, 'I Samuel': 31, 'II Samuel': 24, 'I Kings': 22, 'II Kings': 25,
  'Isaiah': 66, 'Jeremiah': 52, 'Ezekiel': 48, 'Hosea': 14, 'Joel': 4, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3,
  'Haggai': 2, 'Zechariah': 14, 'Malachi': 3,
  // Ketuvim
  'Psalms': 150, 'Proverbs': 31, 'Job': 42, 'Song of Songs': 8, 'Ruth': 4,
  'Lamentations': 5, 'Ecclesiastes': 12, 'Esther': 10, 'Daniel': 12, 'Ezra': 10,
  'Nehemiah': 13, 'I Chronicles': 29, 'II Chronicles': 36
};

export const TALMUD_DAF_COUNTS = {
  'Berakhot': 64, 'Shabbat': 157, 'Eruvin': 105, 'Pesachim': 121, 'Shekalim': 22,
  'Yoma': 88, 'Sukkah': 56, 'Beitzah': 40, 'Rosh Hashanah': 35, 'Taanit': 31,
  'Megillah': 32, 'Moed Katan': 29, 'Chagigah': 27, 'Yevamot': 122, 'Ketubot': 112,
  'Nedarim': 91, 'Nazir': 66, 'Sotah': 49, 'Gittin': 90, 'Kiddushin': 82,
  'Bava Kamma': 119, 'Bava Metzia': 119, 'Bava Batra': 176, 'Sanhedrin': 113,
  'Makkot': 24, 'Shevuot': 49, 'Avodah Zarah': 76, 'Horayot': 14, 'Zevachim': 120,
  'Menachot': 110, 'Chullin': 142, 'Bekhorot': 61, 'Arakhin': 34, 'Temurah': 34,
  'Keritot': 28, 'Meilah': 22, 'Tamid': 33, 'Niddah': 73
};

export const MISHNAH_CHAPTER_COUNTS = {
  'Mishnah Berakhot': 9, 'Mishnah Peah': 8, 'Mishnah Demai': 7, 'Mishnah Kilayim': 9,
  'Mishnah Sheviit': 10, 'Mishnah Terumot': 11, 'Mishnah Maasrot': 5, 'Mishnah Maaser Sheni': 5,
  'Mishnah Challah': 4, 'Mishnah Orlah': 3, 'Mishnah Bikkurim': 4, 'Mishnah Shabbat': 24,
  'Mishnah Eruvin': 10, 'Mishnah Pesachim': 10, 'Mishnah Shekalim': 8, 'Mishnah Yoma': 8,
  'Mishnah Sukkah': 5, 'Mishnah Beitzah': 5, 'Mishnah Rosh Hashanah': 4, 'Mishnah Taanit': 4,
  'Mishnah Megillah': 4, 'Mishnah Moed Katan': 3, 'Mishnah Chagigah': 3, 'Mishnah Yevamot': 16,
  'Mishnah Ketubot': 13, 'Mishnah Nedarim': 11, 'Mishnah Nazir': 9, 'Mishnah Sotah': 9,
  'Mishnah Gittin': 9, 'Mishnah Kiddushin': 4, 'Mishnah Bava Kamma': 10, 'Mishnah Bava Metzia': 10,
  'Mishnah Bava Batra': 10, 'Mishnah Sanhedrin': 11, 'Mishnah Makkot': 3, 'Mishnah Shevuot': 8,
  'Mishnah Eduyot': 8, 'Mishnah Avodah Zarah': 5, 'Mishnah Avot': 6, 'Mishnah Horayot': 3,
  'Mishnah Zevachim': 14, 'Mishnah Menachot': 13, 'Mishnah Chullin': 12, 'Mishnah Bekhorot': 9,
  'Mishnah Arakhin': 9, 'Mishnah Temurah': 7, 'Mishnah Keritot': 6, 'Mishnah Meilah': 6,
  'Mishnah Tamid': 7, 'Mishnah Middot': 5, 'Mishnah Kinnim': 3, 'Mishnah Kelim': 30,
  'Mishnah Oholot': 18, 'Mishnah Negaim': 14, 'Mishnah Parah': 12, 'Mishnah Tahorot': 10,
  'Mishnah Mikvaot': 10, 'Mishnah Niddah': 10, 'Mishnah Makhshirin': 6, 'Mishnah Zavim': 5,
  'Mishnah Tevul Yom': 4, 'Mishnah Yadayim': 4, 'Mishnah Oktzin': 3
};

// Hebrew to English book name mapping
export const HEBREW_BOOK_NAMES = {
  'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus',
  'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'יהושע': 'Joshua',
  'שופטים': 'Judges', 'שמואל א': 'I Samuel', 'שמואל ב': 'II Samuel',
  'מלכים א': 'I Kings', 'מלכים ב': 'II Kings', 'ישעיהו': 'Isaiah',
  'ירמיהו': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'תהלים': 'Psalms',
  'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs',
  'רות': 'Ruth', 'איכה': 'Lamentations', 'קהלת': 'Ecclesiastes',
  'אסתר': 'Esther', 'דניאל': 'Daniel', 'עזרא': 'Ezra',
  'נחמיה': 'Nehemiah', 'דברי הימים א': 'I Chronicles', 'דברי הימים ב': 'II Chronicles'
};

export const ALL_TANACH_BOOKS = [...TORAH_BOOKS, ...NEVIIM_BOOKS, ...KETUVIM_BOOKS];

export const SEFARIM_CATEGORIES = {
  torah: { name: 'Torah', hebrewName: 'תורה', books: TORAH_BOOKS },
  neviim: { name: "Nevi'im", hebrewName: 'נביאים', books: NEVIIM_BOOKS },
  ketuvim: { name: 'Ketuvim', hebrewName: 'כתובים', books: KETUVIM_BOOKS },
  mishnah: { name: 'Mishnah', hebrewName: 'משנה', books: MISHNAH_TRACTATES, sedarim: MISHNAH_SEDARIM },
  gemara: { name: 'Gemara', hebrewName: 'גמרא', books: TALMUD_BAVLI }
};

// =============================================================================
// PARSHA DATA
// =============================================================================

export const PARSHA_DATA = {
  'Genesis': [
    { name: 'Bereshit', startChapter: 1, endChapter: 6 },
    { name: 'Noach', startChapter: 7, endChapter: 11 },
    { name: 'Lech-Lecha', startChapter: 12, endChapter: 17 },
    { name: 'Vayera', startChapter: 18, endChapter: 22 },
    { name: 'Chayei Sara', startChapter: 23, endChapter: 25 },
    { name: 'Toldot', startChapter: 26, endChapter: 28 },
    { name: 'Vayetzei', startChapter: 29, endChapter: 32 },
    { name: 'Vayishlach', startChapter: 33, endChapter: 36 },
    { name: 'Vayeshev', startChapter: 37, endChapter: 40 },
    { name: 'Miketz', startChapter: 41, endChapter: 44 },
    { name: 'Vayigash', startChapter: 45, endChapter: 47 },
    { name: 'Vayechi', startChapter: 48, endChapter: 50 }
  ],
  'Exodus': [
    { name: 'Shemot', startChapter: 1, endChapter: 6 },
    { name: 'Vaera', startChapter: 7, endChapter: 10 },
    { name: 'Bo', startChapter: 11, endChapter: 13 },
    { name: 'Beshalach', startChapter: 14, endChapter: 17 },
    { name: 'Yitro', startChapter: 18, endChapter: 20 },
    { name: 'Mishpatim', startChapter: 21, endChapter: 24 },
    { name: 'Terumah', startChapter: 25, endChapter: 27 },
    { name: 'Tetzaveh', startChapter: 28, endChapter: 30 },
    { name: 'Ki Tisa', startChapter: 31, endChapter: 34 },
    { name: 'Vayakhel', startChapter: 35, endChapter: 38 },
    { name: 'Pekudei', startChapter: 39, endChapter: 40 }
  ],
  'Leviticus': [
    { name: 'Vayikra', startChapter: 1, endChapter: 5 },
    { name: 'Tzav', startChapter: 6, endChapter: 8 },
    { name: 'Shmini', startChapter: 9, endChapter: 11 },
    { name: 'Tazria', startChapter: 12, endChapter: 13 },
    { name: 'Metzora', startChapter: 14, endChapter: 15 },
    { name: 'Achrei Mot', startChapter: 16, endChapter: 18 },
    { name: 'Kedoshim', startChapter: 19, endChapter: 20 },
    { name: 'Emor', startChapter: 21, endChapter: 22 },
    { name: 'Behar', startChapter: 23, endChapter: 25 },
    { name: 'Bechukotai', startChapter: 26, endChapter: 27 }
  ],
  'Numbers': [
    { name: 'Bamidbar', startChapter: 1, endChapter: 4 },
    { name: 'Nasso', startChapter: 5, endChapter: 7 },
    { name: 'Behaalotecha', startChapter: 8, endChapter: 10 },
    { name: 'Shelach', startChapter: 11, endChapter: 15 },
    { name: 'Korach', startChapter: 16, endChapter: 18 },
    { name: 'Chukat', startChapter: 19, endChapter: 22 },
    { name: 'Balak', startChapter: 23, endChapter: 25 },
    { name: 'Pinchas', startChapter: 26, endChapter: 31 },
    { name: 'Matot', startChapter: 32, endChapter: 32 },
    { name: 'Masei', startChapter: 33, endChapter: 36 }
  ],
  'Deuteronomy': [
    { name: 'Devarim', startChapter: 1, endChapter: 3 },
    { name: 'Vaetchanan', startChapter: 4, endChapter: 7 },
    { name: 'Eikev', startChapter: 8, endChapter: 11 },
    { name: 'Reeh', startChapter: 12, endChapter: 16 },
    { name: 'Shoftim', startChapter: 17, endChapter: 21 },
    { name: 'Ki Teitzei', startChapter: 22, endChapter: 25 },
    { name: 'Ki Tavo', startChapter: 26, endChapter: 29 },
    { name: 'Nitzavim', startChapter: 30, endChapter: 30 },
    { name: 'Vayelech', startChapter: 31, endChapter: 31 },
    { name: 'Haazinu', startChapter: 32, endChapter: 32 },
    { name: 'Vezot Habracha', startChapter: 33, endChapter: 34 }
  ]
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const toSefariaRef = (book, chapter, verse = null) => {
  const englishBook = HEBREW_BOOK_NAMES[book] || book;
  return verse ? `${englishBook}.${chapter}.${verse}` : `${englishBook}.${chapter}`;
};

export const formatBookName = (name) => (name || '').replace(/ /g, '_');

export const generateDafList = (tractate) => {
  const dafCount = TALMUD_DAF_COUNTS[tractate] || 30;
  const dafList = [];
  for (let i = 2; i <= dafCount; i++) {
    dafList.push(`${i}a`, `${i}b`);
  }
  return dafList;
};

// =============================================================================
// BOOK METADATA FUNCTIONS
// =============================================================================

export const getTorahBooks = () => TORAH_BOOKS;

export const getSefarimCategories = () => SEFARIM_CATEGORIES;

export const getBooksByCategory = (category) => SEFARIM_CATEGORIES[category]?.books || [];

export const isTorahBook = (bookName) => TORAH_BOOKS.includes(bookName);

export const isTalmudBook = (bookName) => TALMUD_BAVLI.includes(bookName);

export const isMishnahBook = (bookName) => MISHNAH_TRACTATES.includes(bookName);

export const getMishnahSedarim = () => MISHNAH_SEDARIM;

export const getChapters = (bookName) => {
  if (TALMUD_BAVLI.includes(bookName)) {
    return generateDafList(bookName);
  }
  if (MISHNAH_TRACTATES.includes(bookName)) {
    const count = MISHNAH_CHAPTER_COUNTS[bookName] || 10;
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  if (ALL_TANACH_BOOKS.includes(bookName)) {
    const count = CHAPTER_COUNTS[bookName] || 1;
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  return [];
};

export const getParshas = (bookName) => {
  if (!TORAH_BOOKS.includes(bookName)) return [];
  return PARSHA_DATA[bookName] || [];
};
