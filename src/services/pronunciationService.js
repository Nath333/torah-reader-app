// Pronunciation Service - Sephardic vs Ashkenazic transliteration
// Provides transliteration rules and conversions for both traditions

// Pronunciation tradition types
export const TRADITIONS = {
  SEPHARDIC: 'sephardic',
  ASHKENAZIC: 'ashkenazic',
  MODERN_ISRAELI: 'israeli'
};

// Letter mappings for different traditions
const LETTER_MAPPINGS = {
  // Hebrew letter: { sephardic, ashkenazic, israeli }
  'א': { sephardic: '', ashkenazic: '', israeli: '' }, // Silent or glottal
  'ב': { sephardic: 'b/v', ashkenazic: 'b/v', israeli: 'b/v' },
  'ג': { sephardic: 'g', ashkenazic: 'g', israeli: 'g' },
  'ד': { sephardic: 'd', ashkenazic: 'd', israeli: 'd' },
  'ה': { sephardic: 'h', ashkenazic: 'h', israeli: 'h' },
  'ו': { sephardic: 'v', ashkenazic: 'v', israeli: 'v' },
  'ז': { sephardic: 'z', ashkenazic: 'z', israeli: 'z' },
  'ח': { sephardic: 'ḥ', ashkenazic: 'ch', israeli: 'ch' },
  'ט': { sephardic: 'ṭ', ashkenazic: 't', israeli: 't' },
  'י': { sephardic: 'y', ashkenazic: 'y', israeli: 'y' },
  'כ': { sephardic: 'k/kh', ashkenazic: 'k/ch', israeli: 'k/ch' },
  'ל': { sephardic: 'l', ashkenazic: 'l', israeli: 'l' },
  'מ': { sephardic: 'm', ashkenazic: 'm', israeli: 'm' },
  'נ': { sephardic: 'n', ashkenazic: 'n', israeli: 'n' },
  'ס': { sephardic: 's', ashkenazic: 's', israeli: 's' },
  'ע': { sephardic: 'ʿ', ashkenazic: '', israeli: '' }, // Ayin - guttural in Sephardic
  'פ': { sephardic: 'p/f', ashkenazic: 'p/f', israeli: 'p/f' },
  'צ': { sephardic: 'ṣ', ashkenazic: 'tz', israeli: 'tz' },
  'ק': { sephardic: 'q', ashkenazic: 'k', israeli: 'k' },
  'ר': { sephardic: 'r', ashkenazic: 'r', israeli: 'r' },
  'ש': { sephardic: 'sh/s', ashkenazic: 'sh/s', israeli: 'sh/s' },
  'ת': { sephardic: 't', ashkenazic: 's', israeli: 't' } // Key difference!
};

// Vowel mappings (nikkud)
const VOWEL_MAPPINGS = {
  // Kamatz
  'ָ': { sephardic: 'a', ashkenazic: 'o', israeli: 'a' }, // Key difference!
  // Patach
  'ַ': { sephardic: 'a', ashkenazic: 'a', israeli: 'a' },
  // Tzere
  'ֵ': { sephardic: 'e', ashkenazic: 'ei', israeli: 'e' },
  // Segol
  'ֶ': { sephardic: 'e', ashkenazic: 'e', israeli: 'e' },
  // Chirik
  'ִ': { sephardic: 'i', ashkenazic: 'i', israeli: 'i' },
  // Cholam
  'ֹ': { sephardic: 'o', ashkenazic: 'oi', israeli: 'o' },
  // Kubutz
  'ֻ': { sephardic: 'u', ashkenazic: 'u', israeli: 'u' },
  // Shuruk
  'וּ': { sephardic: 'u', ashkenazic: 'u', israeli: 'u' },
  // Shva
  'ְ': { sephardic: 'e', ashkenazic: '', israeli: 'e' },
  // Chataf Patach
  'ֲ': { sephardic: 'a', ashkenazic: 'a', israeli: 'a' },
  // Chataf Segol
  'ֱ': { sephardic: 'e', ashkenazic: 'e', israeli: 'e' },
  // Chataf Kamatz
  'ֳ': { sephardic: 'o', ashkenazic: 'o', israeli: 'o' }
};

// Common word pronunciations
const WORD_PRONUNCIATIONS = {
  // Shabbat vs Shabbos
  'שַׁבָּת': { sephardic: 'Shabbat', ashkenazic: 'Shabbos', israeli: 'Shabbat' },
  'שבת': { sephardic: 'Shabbat', ashkenazic: 'Shabbos', israeli: 'Shabbat' },

  // Torah vs Toirah
  'תּוֹרָה': { sephardic: 'Torah', ashkenazic: 'Toirah', israeli: 'Torah' },
  'תורה': { sephardic: 'Torah', ashkenazic: 'Toirah', israeli: 'Torah' },

  // Mitzvah vs Mitzvoh
  'מִצְוָה': { sephardic: 'Mitzvah', ashkenazic: 'Mitzvoh', israeli: 'Mitzvah' },
  'מצוה': { sephardic: 'Mitzvah', ashkenazic: 'Mitzvoh', israeli: 'Mitzvah' },

  // Bereshit vs Bereishis
  'בְּרֵאשִׁית': { sephardic: 'Bereshit', ashkenazic: 'Bereishis', israeli: 'Bereshit' },
  'בראשית': { sephardic: 'Bereshit', ashkenazic: 'Bereishis', israeli: 'Bereshit' },

  // Emet vs Emes
  'אֱמֶת': { sephardic: 'Emet', ashkenazic: 'Emes', israeli: 'Emet' },
  'אמת': { sephardic: 'Emet', ashkenazic: 'Emes', israeli: 'Emet' },

  // Brit vs Bris
  'בְּרִית': { sephardic: 'Brit', ashkenazic: 'Bris', israeli: 'Brit' },
  'ברית': { sephardic: 'Brit', ashkenazic: 'Bris', israeli: 'Brit' },

  // Sukkot vs Sukkos
  'סֻכּוֹת': { sephardic: 'Sukkot', ashkenazic: 'Sukkos', israeli: 'Sukkot' },
  'סוכות': { sephardic: 'Sukkot', ashkenazic: 'Sukkos', israeli: 'Sukkot' },

  // Shavuot vs Shavuos
  'שָׁבֻעוֹת': { sephardic: 'Shavuot', ashkenazic: 'Shavuos', israeli: 'Shavuot' },
  'שבועות': { sephardic: 'Shavuot', ashkenazic: 'Shavuos', israeli: 'Shavuot' },

  // Rosh Hashanah
  'רֹאשׁ הַשָּׁנָה': { sephardic: 'Rosh HaShanah', ashkenazic: 'Rosh HaShonoh', israeli: 'Rosh HaShanah' },

  // Yom Kippur
  'יוֹם כִּפּוּר': { sephardic: 'Yom Kippur', ashkenazic: 'Yom Kippur', israeli: 'Yom Kippur' },

  // Pesach vs Peisach
  'פֶּסַח': { sephardic: 'Pesach', ashkenazic: 'Peisach', israeli: 'Pesach' },
  'פסח': { sephardic: 'Pesach', ashkenazic: 'Peisach', israeli: 'Pesach' },

  // Baruch vs Boruch
  'בָּרוּךְ': { sephardic: 'Barukh', ashkenazic: 'Boruch', israeli: 'Baruch' },
  'ברוך': { sephardic: 'Barukh', ashkenazic: 'Boruch', israeli: 'Baruch' },

  // Amen vs Omein
  'אָמֵן': { sephardic: 'Amen', ashkenazic: 'Omein', israeli: 'Amen' },
  'אמן': { sephardic: 'Amen', ashkenazic: 'Omein', israeli: 'Amen' },

  // HaShem
  'הַשֵּׁם': { sephardic: 'HaShem', ashkenazic: 'HaSheim', israeli: 'HaShem' },
  'השם': { sephardic: 'HaShem', ashkenazic: 'HaSheim', israeli: 'HaShem' },

  // Adonai
  'אֲדֹנָי': { sephardic: 'Adonai', ashkenazic: 'Adonoi', israeli: 'Adonai' },

  // Common liturgical words
  'הַלְלוּיָהּ': { sephardic: 'Halleluyah', ashkenazic: 'Halleluyoh', israeli: 'Halleluyah' },
  'הללויה': { sephardic: 'Halleluyah', ashkenazic: 'Halleluyoh', israeli: 'Halleluyah' },

  // Tefillah vs Tefilloh
  'תְּפִלָּה': { sephardic: 'Tefillah', ashkenazic: 'Tefilloh', israeli: 'Tefilla' },
  'תפילה': { sephardic: 'Tefillah', ashkenazic: 'Tefilloh', israeli: 'Tefilla' }
};

// Parsha names in different pronunciations
export const PARSHA_PRONUNCIATIONS = {
  'Bereshit': { sephardic: 'Bereshit', ashkenazic: 'Bereishis' },
  'Noach': { sephardic: 'Noach', ashkenazic: 'Noiach' },
  'Lech-Lecha': { sephardic: 'Lekh Lekha', ashkenazic: 'Lech Lecho' },
  'Vayera': { sephardic: 'Vayera', ashkenazic: 'Vayeiro' },
  'Chayei Sara': { sephardic: 'Chayei Sarah', ashkenazic: 'Chayei Soroh' },
  'Toldot': { sephardic: 'Toldot', ashkenazic: 'Toldos' },
  'Vayetzei': { sephardic: 'Vayetze', ashkenazic: 'Vayeitzei' },
  'Vayishlach': { sephardic: 'Vayishlach', ashkenazic: 'Vayishlach' },
  'Vayeshev': { sephardic: 'Vayeshev', ashkenazic: 'Vayeishev' },
  'Miketz': { sephardic: 'Miketz', ashkenazic: 'Mikeitz' },
  'Vayigash': { sephardic: 'Vayigash', ashkenazic: 'Vayigash' },
  'Vayechi': { sephardic: 'Vayechi', ashkenazic: 'Vayechi' },
  'Shemot': { sephardic: 'Shemot', ashkenazic: 'Shemos' },
  'Vaera': { sephardic: "Va'era", ashkenazic: "Vo'eiro" },
  'Bo': { sephardic: 'Bo', ashkenazic: 'Boi' },
  'Beshalach': { sephardic: 'Beshalach', ashkenazic: 'Beshalach' },
  'Yitro': { sephardic: 'Yitro', ashkenazic: 'Yisroi' },
  'Mishpatim': { sephardic: 'Mishpatim', ashkenazic: 'Mishpotim' },
  'Terumah': { sephardic: 'Terumah', ashkenazic: 'Terumoh' },
  'Tetzaveh': { sephardic: 'Tetzaveh', ashkenazic: 'Tetzaveh' },
  'Ki Tisa': { sephardic: 'Ki Tisa', ashkenazic: 'Ki Siso' },
  'Vayakhel': { sephardic: 'Vayakhel', ashkenazic: 'Vayakheil' },
  'Pekudei': { sephardic: 'Pekudei', ashkenazic: 'Pekudei' },
  'Vayikra': { sephardic: 'Vayikra', ashkenazic: 'Vayikro' },
  'Tzav': { sephardic: 'Tzav', ashkenazic: 'Tzav' },
  'Shemini': { sephardic: 'Shemini', ashkenazic: 'Shemini' },
  'Tazria': { sephardic: 'Tazria', ashkenazic: 'Tazria' },
  'Metzora': { sephardic: 'Metzora', ashkenazic: 'Metzora' },
  'Acharei Mot': { sephardic: 'Acharei Mot', ashkenazic: 'Acharei Mos' },
  'Kedoshim': { sephardic: 'Kedoshim', ashkenazic: 'Kedoishim' },
  'Emor': { sephardic: 'Emor', ashkenazic: 'Emoir' },
  'Behar': { sephardic: 'Behar', ashkenazic: 'Behar' },
  'Bechukotai': { sephardic: 'Bechukotai', ashkenazic: 'Bechukosai' },
  'Bamidbar': { sephardic: 'Bamidbar', ashkenazic: 'Bamidbar' },
  'Nasso': { sephardic: 'Nasso', ashkenazic: 'Nossoi' },
  'Behaalotecha': { sephardic: "Beha'alotekha", ashkenazic: "Beha'aloscho" },
  'Shelach': { sephardic: 'Shelach', ashkenazic: 'Shelach' },
  'Korach': { sephardic: 'Korach', ashkenazic: 'Koirach' },
  'Chukat': { sephardic: 'Chukat', ashkenazic: 'Chukas' },
  'Balak': { sephardic: 'Balak', ashkenazic: 'Bolok' },
  'Pinchas': { sephardic: 'Pinchas', ashkenazic: 'Pinchos' },
  'Matot': { sephardic: 'Matot', ashkenazic: 'Matos' },
  'Masei': { sephardic: 'Masei', ashkenazic: 'Masei' },
  'Devarim': { sephardic: 'Devarim', ashkenazic: 'Devorim' },
  'Vaetchanan': { sephardic: "Va'etchanan", ashkenazic: "Vo'eschanan" },
  'Eikev': { sephardic: 'Ekev', ashkenazic: 'Eikev' },
  'Reeh': { sephardic: "Re'eh", ashkenazic: "Re'ei" },
  'Shoftim': { sephardic: 'Shoftim', ashkenazic: 'Shoiftim' },
  'Ki Teitzei': { sephardic: 'Ki Tetze', ashkenazic: 'Ki Seitzei' },
  'Ki Tavo': { sephardic: 'Ki Tavo', ashkenazic: 'Ki Sovoi' },
  'Nitzavim': { sephardic: 'Nitzavim', ashkenazic: 'Nitzovim' },
  'Vayelech': { sephardic: 'Vayelekh', ashkenazic: 'Vayeilech' },
  'Haazinu': { sephardic: "Ha'azinu", ashkenazic: "Ha'azinu" },
  'Vezot Habracha': { sephardic: "Vezot HaBerakhah", ashkenazic: "Vezois HaBrochoh" }
};

/**
 * Get pronunciation for a word based on tradition
 * @param {string} word - Hebrew word
 * @param {string} tradition - Pronunciation tradition
 * @returns {string} Transliterated word
 */
export const getPronunciation = (word, tradition = TRADITIONS.SEPHARDIC) => {
  // Check if we have a pre-defined pronunciation
  const cleanWord = word.trim();
  if (WORD_PRONUNCIATIONS[cleanWord]) {
    return WORD_PRONUNCIATIONS[cleanWord][tradition] || WORD_PRONUNCIATIONS[cleanWord].sephardic;
  }
  return null;
};

/**
 * Get parsha name in specified tradition
 * @param {string} parshaName - Standard parsha name
 * @param {string} tradition - Pronunciation tradition
 * @returns {string} Parsha name in tradition
 */
export const getParshaName = (parshaName, tradition = TRADITIONS.SEPHARDIC) => {
  const parsha = PARSHA_PRONUNCIATIONS[parshaName];
  if (parsha) {
    return tradition === TRADITIONS.ASHKENAZIC ? parsha.ashkenazic : parsha.sephardic;
  }
  return parshaName;
};

/**
 * Convert text ending with Tav/Sav based on tradition
 * @param {string} text - Text to convert
 * @param {string} tradition - Pronunciation tradition
 * @returns {string} Converted text
 */
export const convertTavSav = (text, tradition) => {
  if (tradition === TRADITIONS.ASHKENAZIC) {
    // In Ashkenazic, tav without dagesh is pronounced 's'
    return text.replace(/th$/i, 's').replace(/t$/i, 's');
  }
  return text;
};

/**
 * Get all pronunciation differences for display
 * @returns {Array} List of pronunciation differences
 */
export const getPronunciationDifferences = () => {
  return [
    {
      feature: 'Kamatz (ָ)',
      sephardic: 'a (as in "father")',
      ashkenazic: 'o (as in "more")',
      example: 'שָׁלוֹם → Shalom / Sholom'
    },
    {
      feature: 'Tav without dagesh (ת)',
      sephardic: 't',
      ashkenazic: 's',
      example: 'שַׁבָּת → Shabbat / Shabbos'
    },
    {
      feature: 'Tzere (ֵ)',
      sephardic: 'e (as in "bed")',
      ashkenazic: 'ei (as in "day")',
      example: 'אֵל → El / Eil'
    },
    {
      feature: 'Cholam (ֹ)',
      sephardic: 'o (as in "more")',
      ashkenazic: 'oi (as in "boy")',
      example: 'תּוֹרָה → Torah / Toirah'
    },
    {
      feature: 'Ayin (ע)',
      sephardic: 'Guttural sound',
      ashkenazic: 'Silent',
      example: 'עֵץ → ʿEtz / Etz'
    },
    {
      feature: 'Chet (ח)',
      sephardic: 'ḥ (guttural)',
      ashkenazic: 'ch (as in Bach)',
      example: 'חַג → Ḥag / Chag'
    }
  ];
};

const pronunciationService = {
  TRADITIONS,
  LETTER_MAPPINGS,
  VOWEL_MAPPINGS,
  WORD_PRONUNCIATIONS,
  PARSHA_PRONUNCIATIONS,
  getPronunciation,
  getParshaName,
  convertTavSav,
  getPronunciationDifferences
};

export default pronunciationService;
