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

// =============================================================================
// PARSHA DATA - Weekly Torah portions with chapter ranges
// =============================================================================

export const PARSHIOT = {
  Genesis: [
    { name: 'Bereshit', hebrew: 'בראשית', chapters: [1, 6], icon: '🌍' },
    { name: 'Noach', hebrew: 'נח', chapters: [6, 11], icon: '🌊' },
    { name: 'Lech Lecha', hebrew: 'לך לך', chapters: [12, 17], icon: '🚶' },
    { name: 'Vayera', hebrew: 'וירא', chapters: [18, 22], icon: '👁️' },
    { name: 'Chayei Sarah', hebrew: 'חיי שרה', chapters: [23, 25], icon: '💒' },
    { name: 'Toldot', hebrew: 'תולדות', chapters: [25, 28], icon: '👨‍👦‍👦' },
    { name: 'Vayetze', hebrew: 'ויצא', chapters: [28, 32], icon: '🪜' },
    { name: 'Vayishlach', hebrew: 'וישלח', chapters: [32, 36], icon: '💪' },
    { name: 'Vayeshev', hebrew: 'וישב', chapters: [37, 40], icon: '👔' },
    { name: 'Miketz', hebrew: 'מקץ', chapters: [41, 44], icon: '👑' },
    { name: 'Vayigash', hebrew: 'ויגש', chapters: [44, 47], icon: '🤝' },
    { name: 'Vayechi', hebrew: 'ויחי', chapters: [47, 50], icon: '🙏' }
  ],
  Exodus: [
    { name: 'Shemot', hebrew: 'שמות', chapters: [1, 6], icon: '🔥' },
    { name: 'Vaera', hebrew: 'וארא', chapters: [6, 9], icon: '🐸' },
    { name: 'Bo', hebrew: 'בא', chapters: [10, 13], icon: '🦗' },
    { name: 'Beshalach', hebrew: 'בשלח', chapters: [13, 17], icon: '🌊' },
    { name: 'Yitro', hebrew: 'יתרו', chapters: [18, 20], icon: '⛰️' },
    { name: 'Mishpatim', hebrew: 'משפטים', chapters: [21, 24], icon: '⚖️' },
    { name: 'Terumah', hebrew: 'תרומה', chapters: [25, 27], icon: '🎁' },
    { name: 'Tetzaveh', hebrew: 'תצוה', chapters: [27, 30], icon: '👗' },
    { name: 'Ki Tisa', hebrew: 'כי תשא', chapters: [30, 34], icon: '💰' },
    { name: 'Vayakhel', hebrew: 'ויקהל', chapters: [35, 38], icon: '🏗️' },
    { name: 'Pekudei', hebrew: 'פקודי', chapters: [38, 40], icon: '📋' }
  ],
  Leviticus: [
    { name: 'Vayikra', hebrew: 'ויקרא', chapters: [1, 5], icon: '🐑' },
    { name: 'Tzav', hebrew: 'צו', chapters: [6, 8], icon: '🔥' },
    { name: 'Shemini', hebrew: 'שמיני', chapters: [9, 11], icon: '8️⃣' },
    { name: 'Tazria', hebrew: 'תזריע', chapters: [12, 13], icon: '👶' },
    { name: 'Metzora', hebrew: 'מצורע', chapters: [14, 15], icon: '🩺' },
    { name: 'Acharei Mot', hebrew: 'אחרי מות', chapters: [16, 18], icon: '⛪' },
    { name: 'Kedoshim', hebrew: 'קדושים', chapters: [19, 20], icon: '✨' },
    { name: 'Emor', hebrew: 'אמור', chapters: [21, 24], icon: '👨‍⚖️' },
    { name: 'Behar', hebrew: 'בהר', chapters: [25, 25], icon: '🏔️' },
    { name: 'Bechukotai', hebrew: 'בחוקותי', chapters: [26, 27], icon: '📜' }
  ],
  Numbers: [
    { name: 'Bamidbar', hebrew: 'במדבר', chapters: [1, 4], icon: '🏜️' },
    { name: 'Naso', hebrew: 'נשא', chapters: [4, 7], icon: '🙌' },
    { name: 'Behaalotecha', hebrew: 'בהעלותך', chapters: [8, 12], icon: '🕯️' },
    { name: 'Shelach', hebrew: 'שלח', chapters: [13, 15], icon: '🍇' },
    { name: 'Korach', hebrew: 'קורח', chapters: [16, 18], icon: '🕳️' },
    { name: 'Chukat', hebrew: 'חוקת', chapters: [19, 22], icon: '🐄' },
    { name: 'Balak', hebrew: 'בלק', chapters: [22, 25], icon: '🐴' },
    { name: 'Pinchas', hebrew: 'פנחס', chapters: [25, 30], icon: '🗡️' },
    { name: 'Matot', hebrew: 'מטות', chapters: [30, 32], icon: '⚔️' },
    { name: 'Masei', hebrew: 'מסעי', chapters: [33, 36], icon: '🗺️' }
  ],
  Deuteronomy: [
    { name: 'Devarim', hebrew: 'דברים', chapters: [1, 3], icon: '📖' },
    { name: 'Vaetchanan', hebrew: 'ואתחנן', chapters: [3, 7], icon: '🙏' },
    { name: 'Eikev', hebrew: 'עקב', chapters: [7, 11], icon: '👟' },
    { name: 'Re\'eh', hebrew: 'ראה', chapters: [11, 16], icon: '👀' },
    { name: 'Shoftim', hebrew: 'שופטים', chapters: [16, 21], icon: '⚖️' },
    { name: 'Ki Teitzei', hebrew: 'כי תצא', chapters: [21, 25], icon: '⚔️' },
    { name: 'Ki Tavo', hebrew: 'כי תבוא', chapters: [26, 29], icon: '🍎' },
    { name: 'Nitzavim', hebrew: 'נצבים', chapters: [29, 30], icon: '🧍' },
    { name: 'Vayelech', hebrew: 'וילך', chapters: [31, 31], icon: '🚶' },
    { name: 'Haazinu', hebrew: 'האזינו', chapters: [32, 32], icon: '🎵' },
    { name: 'V\'Zot HaBerachah', hebrew: 'וזאת הברכה', chapters: [33, 34], icon: '🙌' }
  ]
};

// =============================================================================
// GEMARA SEDARIM - Talmud organized by Order
// =============================================================================

export const GEMARA_SEDARIM = {
  zeraim: {
    name: 'Zeraim',
    hebrew: 'זרעים',
    icon: '🌱',
    description: 'Seeds - Agricultural laws',
    tractates: ['Berakhot'] // Only Berakhot has Gemara in Bavli
  },
  moed: {
    name: 'Moed',
    hebrew: 'מועד',
    icon: '📅',
    description: 'Festivals - Shabbat & Holidays',
    tractates: ['Shabbat', 'Eruvin', 'Pesachim', 'Shekalim', 'Yoma', 'Sukkah',
      'Beitzah', 'Rosh Hashanah', 'Taanit', 'Megillah', 'Moed Katan', 'Chagigah']
  },
  nashim: {
    name: 'Nashim',
    hebrew: 'נשים',
    icon: '💍',
    description: 'Women - Marriage & Family',
    tractates: ['Yevamot', 'Ketubot', 'Nedarim', 'Nazir', 'Sotah', 'Gittin', 'Kiddushin']
  },
  nezikin: {
    name: 'Nezikin',
    hebrew: 'נזיקין',
    icon: '⚖️',
    description: 'Damages - Civil & Criminal law',
    tractates: ['Bava Kamma', 'Bava Metzia', 'Bava Batra', 'Sanhedrin', 'Makkot',
      'Shevuot', 'Avodah Zarah', 'Horayot']
  },
  kodashim: {
    name: 'Kodashim',
    hebrew: 'קדשים',
    icon: '🔥',
    description: 'Holy Things - Temple & Sacrifices',
    tractates: ['Zevachim', 'Menachot', 'Chullin', 'Bekhorot', 'Arakhin',
      'Temurah', 'Keritot', 'Meilah', 'Tamid']
  },
  tahorot: {
    name: 'Tahorot',
    hebrew: 'טהרות',
    icon: '💧',
    description: 'Purities - Ritual purity',
    tractates: ['Niddah'] // Only Niddah has Gemara in Bavli
  }
};

// =============================================================================
// MISHNAH SEDARIM - Full Mishnah orders
// =============================================================================

export const MISHNAH_SEDARIM = {
  zeraim: {
    name: 'Zeraim',
    hebrew: 'זרעים',
    icon: '🌱',
    description: 'Seeds - Agricultural laws',
    tractates: ['Mishnah Berakhot', 'Mishnah Peah', 'Mishnah Demai', 'Mishnah Kilayim',
      'Mishnah Sheviit', 'Mishnah Terumot', 'Mishnah Maasrot', 'Mishnah Maaser Sheni',
      'Mishnah Challah', 'Mishnah Orlah', 'Mishnah Bikkurim']
  },
  moed: {
    name: 'Moed',
    hebrew: 'מועד',
    icon: '📅',
    description: 'Festivals - Shabbat & Holidays',
    tractates: ['Mishnah Shabbat', 'Mishnah Eruvin', 'Mishnah Pesachim', 'Mishnah Shekalim',
      'Mishnah Yoma', 'Mishnah Sukkah', 'Mishnah Beitzah', 'Mishnah Rosh Hashanah',
      'Mishnah Taanit', 'Mishnah Megillah', 'Mishnah Moed Katan', 'Mishnah Chagigah']
  },
  nashim: {
    name: 'Nashim',
    hebrew: 'נשים',
    icon: '💍',
    description: 'Women - Marriage & Family',
    tractates: ['Mishnah Yevamot', 'Mishnah Ketubot', 'Mishnah Nedarim', 'Mishnah Nazir',
      'Mishnah Sotah', 'Mishnah Gittin', 'Mishnah Kiddushin']
  },
  nezikin: {
    name: 'Nezikin',
    hebrew: 'נזיקין',
    icon: '⚖️',
    description: 'Damages - Civil & Criminal law',
    tractates: ['Mishnah Bava Kamma', 'Mishnah Bava Metzia', 'Mishnah Bava Batra',
      'Mishnah Sanhedrin', 'Mishnah Makkot', 'Mishnah Shevuot', 'Mishnah Eduyot',
      'Mishnah Avodah Zarah', 'Mishnah Avot', 'Mishnah Horayot']
  },
  kodashim: {
    name: 'Kodashim',
    hebrew: 'קדשים',
    icon: '🔥',
    description: 'Holy Things - Temple & Sacrifices',
    tractates: ['Mishnah Zevachim', 'Mishnah Menachot', 'Mishnah Chullin', 'Mishnah Bekhorot',
      'Mishnah Arakhin', 'Mishnah Temurah', 'Mishnah Keritot', 'Mishnah Meilah',
      'Mishnah Tamid', 'Mishnah Middot', 'Mishnah Kinnim']
  },
  tahorot: {
    name: 'Tahorot',
    hebrew: 'טהרות',
    icon: '💧',
    description: 'Purities - Ritual purity',
    tractates: ['Mishnah Kelim', 'Mishnah Oholot', 'Mishnah Negaim', 'Mishnah Parah',
      'Mishnah Tahorot', 'Mishnah Mikvaot', 'Mishnah Niddah', 'Mishnah Makhshirin',
      'Mishnah Zavim', 'Mishnah Tevul Yom', 'Mishnah Yadayim', 'Mishnah Oktzin']
  }
};

// Helper to get parsha for a chapter
export const getParshaForChapter = (book, chapter) => {
  const parshiot = PARSHIOT[book];
  if (!parshiot) return null;
  return parshiot.find(p => chapter >= p.chapters[0] && chapter <= p.chapters[1]);
};

// Helper to get seder for a tractate
export const getSederForTractate = (tractate, isGemara = true) => {
  const sedarim = isGemara ? GEMARA_SEDARIM : MISHNAH_SEDARIM;
  const cleanName = tractate.replace(/^Mishnah\s+/, '');
  for (const [key, seder] of Object.entries(sedarim)) {
    const found = seder.tractates.find(t =>
      t === tractate || t === cleanName || t === `Mishnah ${cleanName}`
    );
    if (found) return { key, ...seder };
  }
  return null;
};

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
  if (!tractate) return '';
  return TRACTATE_ALIASES[tractate] || tractate.replace(/ /g, '_');
};

/**
 * Format book name for Sefaria API
 * @param {string} bookName - Book name
 * @returns {string} Formatted book name
 */
export const formatBookName = (bookName) => {
  if (!bookName) return '';
  return bookName.replace(/ /g, '_');
};

// Alias for shorter import
export const formatBook = formatBookName;

// =============================================================================
// CONTEXT DETECTION - Auto-detect TALMUDIC vs BIBLICAL context from references
// PRO SCHOLAR v2: Critical for using the RIGHT dictionary sources
// =============================================================================

/**
 * Context modes for dictionary lookup prioritization
 * Used by definitionCleaner.js to select correct sources
 */
export const CONTEXT_MODES = {
  TALMUDIC: 'talmudic',   // Gemara, Mishnah, Rashi on Talmud, Tosafot
  BIBLICAL: 'biblical',   // Torah, Tanakh, Rashi on Torah
  MIXED: 'mixed',         // Unknown or mixed context (default)
};

/**
 * Midrash collections - These use MIXED context (both Hebrew/Aramaic vocabulary)
 */
export const MIDRASH_COLLECTIONS = [
  'Midrash Rabbah', 'Bereishit Rabbah', 'Shemot Rabbah', 'Vayikra Rabbah',
  'Bamidbar Rabbah', 'Devarim Rabbah', 'Midrash Tanchuma', 'Pesikta',
  'Yalkut Shimoni', 'Pirkei de Rabbi Eliezer', 'Sifra', 'Sifre',
];

/**
 * Targum texts - Aramaic translations of Torah
 */
export const TARGUM_TEXTS = [
  'Targum Onkelos', 'Targum Jonathan', 'Targum Yerushalmi', 'Targum Neofiti',
];

/**
 * Commentary categories by base text type
 * Rashi ON Genesis = BIBLICAL context
 * Rashi ON Shabbat = TALMUDIC context
 */
export const COMMENTARY_NAMES = [
  'Rashi', 'Tosafot', 'Ramban', 'Ibn Ezra', 'Rashbam', 'Sforno', 'Or HaChaim',
  'Kli Yakar', 'Siftei Chakhamim', 'Baal HaTurim', 'Chizkuni', 'Rabbeinu Bachya',
  'Malbim', 'Radak', 'Metzudat David', 'Metzudat Zion',
  // Talmud-specific commentaries
  'Maharsha', 'Maharam', 'Rosh', 'Ran', 'Ritva', 'Rashba', 'Meiri',
  'Chidushei HaRim', 'Chidushei HaRan', 'Pnei Yehoshua',
];

/**
 * Parse a Sefaria-style reference to extract base text and determine context
 *
 * Examples:
 * - "Genesis 1:1" → { book: "Genesis", type: "tanakh", context: "biblical" }
 * - "Shabbat 2a" → { book: "Shabbat", type: "talmud", context: "talmudic" }
 * - "Rashi on Genesis 1:1" → { book: "Genesis", type: "commentary", baseType: "tanakh", context: "biblical" }
 * - "Rashi on Shabbat 2a" → { book: "Shabbat", type: "commentary", baseType: "talmud", context: "talmudic" }
 * - "Mishnah Berakhot 1:1" → { book: "Berakhot", type: "mishnah", context: "talmudic" }
 *
 * @param {string} reference - Sefaria-style reference string
 * @returns {{ book: string, type: string, context: string, baseType?: string }}
 */
export const parseReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return { book: null, type: 'unknown', context: CONTEXT_MODES.MIXED };
  }

  const ref = reference.trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMMENTARY DETECTION - "Rashi on X", "Tosafot on X"
  // The base text determines the context, not the commentary itself
  // ═══════════════════════════════════════════════════════════════════════════
  const commentaryMatch = ref.match(/^(.+?)\s+on\s+(.+)$/i);
  if (commentaryMatch) {
    const commentaryName = commentaryMatch[1].trim();
    const baseRef = commentaryMatch[2].trim();

    // Recursively parse the base reference
    const baseResult = parseReference(baseRef);

    return {
      book: baseResult.book,
      commentary: commentaryName,
      type: 'commentary',
      baseType: baseResult.type,
      context: baseResult.context,  // Context comes from BASE text
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MISHNAH DETECTION - "Mishnah X" prefix
  // Always TALMUDIC context (Mishnaic Hebrew uses Jastrow/rabbinic vocabulary)
  // ═══════════════════════════════════════════════════════════════════════════
  if (ref.startsWith('Mishnah ') || ref.startsWith('Mishna ')) {
    const tractate = ref.replace(/^Mishnah?\s+/i, '').split(/\s+/)[0];
    return {
      book: tractate,
      type: 'mishnah',
      context: CONTEXT_MODES.TALMUDIC,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TALMUD BAVLI DETECTION - Tractate name + daf (e.g., "Shabbat 2a")
  // ═══════════════════════════════════════════════════════════════════════════
  // Check if reference starts with a known tractate name
  for (const tractate of TALMUD_BAVLI) {
    // Match "Shabbat", "Shabbat 2a", "Shabbat.2a", etc.
    const tractateRegex = new RegExp(`^${tractate.replace(/ /g, '[_ ]?')}(?:\\s|\\.|$)`, 'i');
    if (tractateRegex.test(ref)) {
      return {
        book: tractate,
        type: 'talmud',
        context: CONTEXT_MODES.TALMUDIC,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TORAH DETECTION - Five Books of Moses
  // Always BIBLICAL context
  // ═══════════════════════════════════════════════════════════════════════════
  for (const book of TORAH_BOOKS) {
    const bookRegex = new RegExp(`^${book}(?:\\s|\\.|:|$)`, 'i');
    if (bookRegex.test(ref)) {
      return {
        book,
        type: 'torah',
        context: CONTEXT_MODES.BIBLICAL,
      };
    }
  }

  // Also check Hebrew names
  for (const [englishName, hebrewName] of Object.entries(BOOK_HEBREW_NAMES)) {
    if (ref.startsWith(hebrewName)) {
      return {
        book: englishName,
        type: 'torah',
        context: CONTEXT_MODES.BIBLICAL,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. NEVIIM (Prophets) DETECTION
  // BIBLICAL context
  // ═══════════════════════════════════════════════════════════════════════════
  for (const book of NEVIIM_BOOKS) {
    const bookRegex = new RegExp(`^${book}(?:\\s|\\.|:|$)`, 'i');
    if (bookRegex.test(ref)) {
      return {
        book,
        type: 'neviim',
        context: CONTEXT_MODES.BIBLICAL,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. KETUVIM (Writings) DETECTION
  // BIBLICAL context
  // ═══════════════════════════════════════════════════════════════════════════
  for (const book of KETUVIM_BOOKS) {
    const bookRegex = new RegExp(`^${book}(?:\\s|\\.|:|$)`, 'i');
    if (bookRegex.test(ref)) {
      return {
        book,
        type: 'ketuvim',
        context: CONTEXT_MODES.BIBLICAL,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TARGUM DETECTION - Aramaic Torah translations
  // TALMUDIC context (Aramaic vocabulary)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const targum of TARGUM_TEXTS) {
    if (ref.toLowerCase().startsWith(targum.toLowerCase())) {
      return {
        book: targum,
        type: 'targum',
        context: CONTEXT_MODES.TALMUDIC,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. MIDRASH DETECTION - Mixed Hebrew/Aramaic
  // ═══════════════════════════════════════════════════════════════════════════
  for (const midrash of MIDRASH_COLLECTIONS) {
    if (ref.toLowerCase().startsWith(midrash.toLowerCase())) {
      return {
        book: midrash,
        type: 'midrash',
        context: CONTEXT_MODES.MIXED,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. TALMUD DAF PATTERN FALLBACK - "X 2a", "X 10b"
  // If reference ends with daf pattern, assume Talmud
  // ═══════════════════════════════════════════════════════════════════════════
  if (/\s+\d+[ab]$/i.test(ref) || /\.\d+[ab]$/i.test(ref)) {
    const bookName = ref.replace(/[\s.]\d+[ab]$/i, '').trim();
    return {
      book: bookName,
      type: 'talmud',
      context: CONTEXT_MODES.TALMUDIC,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CHAPTER:VERSE PATTERN FALLBACK - "X 1:1"
  // If reference has chapter:verse pattern, assume Tanakh
  // ═══════════════════════════════════════════════════════════════════════════
  if (/\s+\d+:\d+/.test(ref) || /\.\d+\.\d+/.test(ref)) {
    const bookName = ref.replace(/[\s.]\d+[:.]\d+.*$/, '').trim();
    return {
      book: bookName,
      type: 'tanakh',
      context: CONTEXT_MODES.BIBLICAL,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNKNOWN - Default to MIXED context
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    book: ref.split(/[\s.:]/)[0],
    type: 'unknown',
    context: CONTEXT_MODES.MIXED,
  };
};

/**
 * Get context mode from a reference string (shorthand)
 * @param {string} reference - Sefaria-style reference
 * @returns {string} - 'talmudic', 'biblical', or 'mixed'
 */
export const getContextFromReference = (reference) => {
  const parsed = parseReference(reference);
  return parsed.context;
};

/**
 * Detect context from text source type (used by GlossedText)
 * @param {string} textSource - 'gemara', 'rashi', 'torah', etc.
 * @returns {string} - 'talmudic', 'biblical', or 'mixed'
 */
export const getContextFromTextSource = (textSource) => {
  if (!textSource) return CONTEXT_MODES.MIXED;

  const source = textSource.toLowerCase();

  // Talmudic sources - use Jastrow/CAL, SKIP Strong's
  if (['gemara', 'talmud', 'mishnah', 'mishna', 'rashi_talmud', 'tosafot', 'targum'].includes(source)) {
    return CONTEXT_MODES.TALMUDIC;
  }

  // Biblical sources - use BDB/Strong's
  if (['torah', 'tanakh', 'neviim', 'ketuvim', 'prophets', 'writings', 'rashi_torah'].includes(source)) {
    return CONTEXT_MODES.BIBLICAL;
  }

  // Midrash - mixed
  if (['midrash'].includes(source)) {
    return CONTEXT_MODES.MIXED;
  }

  return CONTEXT_MODES.MIXED;
};

/**
 * Check if a reference points to Talmudic text (for quick checks)
 * @param {string} reference - Reference string
 * @returns {boolean}
 */
export const isTalmudicReference = (reference) => {
  const parsed = parseReference(reference);
  return parsed.context === CONTEXT_MODES.TALMUDIC;
};

/**
 * Check if a reference points to Biblical text (for quick checks)
 * @param {string} reference - Reference string
 * @returns {boolean}
 */
export const isBiblicalReference = (reference) => {
  const parsed = parseReference(reference);
  return parsed.context === CONTEXT_MODES.BIBLICAL;
};
