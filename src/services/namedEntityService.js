// =============================================================================
// Named Entity Recognition Service for Jewish Texts
// Detects: Rabbis, Biblical figures, Places, Concepts, Biblical citations
// =============================================================================

// =============================================================================
// ENTITY TYPES
// =============================================================================

export const ENTITY_TYPES = {
  RABBI: 'rabbi',
  BIBLICAL_FIGURE: 'biblical_figure',
  PLACE: 'place',
  CONCEPT: 'concept',
  BIBLICAL_CITATION: 'biblical_citation',
  TALMUDIC_CITATION: 'talmudic_citation'
};

// =============================================================================
// RABBI DATABASE
// Organized by period: Tannaim, Amoraim, Savoraim, Geonim
// =============================================================================

export const RABBI_DATABASE = {
  // TANNAIM (Mishnaic Period, ~10 CE - 220 CE)
  tannaim: {
    // First Generation - Zugot (10-80 CE)
    'הלל': {
      name: 'Hillel',
      generation: 1,
      period: 'tanna',
      note: 'Hillel the Elder',
      fullName: 'Hillel HaZaken',
      origin: 'Babylonia',
      academy: 'Jerusalem',
      teachers: ['Shemaya', 'Avtalyon'],
      methodology: 'lenient',
      famousRulings: ['Prozbul', 'Hillel\'s 7 hermeneutical rules'],
      disputesWith: ['שמאי']
    },
    'שמאי': {
      name: 'Shammai',
      generation: 1,
      period: 'tanna',
      fullName: 'Shammai HaZaken',
      teachers: ['Shemaya', 'Avtalyon'],
      methodology: 'strict',
      disputesWith: ['הלל']
    },
    'בית הלל': { name: 'Beit Hillel', generation: 1, period: 'tanna', note: 'School of Hillel', isSchool: true },
    'בית שמאי': { name: 'Beit Shammai', generation: 1, period: 'tanna', note: 'School of Shammai', isSchool: true },
    'רבן גמליאל הזקן': {
      name: 'Rabban Gamliel the Elder',
      generation: 1,
      period: 'tanna',
      teachers: ['הלל'],
      note: 'Grandson of Hillel'
    },
    'רבן יוחנן בן זכאי': {
      name: 'Rabban Yochanan ben Zakkai',
      generation: 1,
      period: 'tanna',
      teachers: ['הלל'],
      academy: 'Yavneh',
      note: 'Saved Torah after Temple destruction',
      students: ['רבי אליעזר', 'רבי יהושע']
    },

    // Second Generation (80-120 CE)
    'רבן גמליאל': {
      name: 'Rabban Gamliel',
      generation: 2,
      period: 'tanna',
      note: 'of Yavneh (Gamliel II)',
      academy: 'Yavneh',
      teachers: ['רבן יוחנן בן זכאי']
    },
    'רבי אליעזר': {
      name: 'Rabbi Eliezer',
      generation: 2,
      period: 'tanna',
      note: 'ben Hyrcanus - HaGadol',
      teachers: ['רבן יוחנן בן זכאי'],
      methodology: 'strict, preserves tradition exactly',
      students: ['רבי עקיבא'],
      famousRulings: ['Tanur shel Akhnai']
    },
    'רבי יהושע': {
      name: 'Rabbi Yehoshua',
      generation: 2,
      period: 'tanna',
      note: 'ben Chananya',
      teachers: ['רבן יוחנן בן זכאי'],
      disputesWith: ['רבי אליעזר'],
      students: ['רבי עקיבא']
    },
    'רבי עקיבא': {
      name: 'Rabbi Akiva',
      generation: 2,
      period: 'tanna',
      fullName: 'Rabbi Akiva ben Yosef',
      teachers: ['רבי אליעזר', 'רבי יהושע', 'נחום איש גמזו'],
      methodology: 'derives laws from every letter',
      students: ['רבי מאיר', 'רבי יהודה', 'רבי יוסי', 'רבי שמעון', 'רבי אלעזר בן שמוע'],
      note: 'Greatest Tanna, systematized Torah',
      famousRulings: ['13 hermeneutical rules']
    },
    'רבי ישמעאל': {
      name: 'Rabbi Yishmael',
      generation: 2,
      period: 'tanna',
      fullName: 'Rabbi Yishmael ben Elisha',
      methodology: 'Torah speaks in human language',
      famousRulings: ['13 hermeneutical rules'],
      disputesWith: ['רבי עקיבא']
    },
    'רבי טרפון': {
      name: 'Rabbi Tarfon',
      generation: 2,
      period: 'tanna',
      teachers: ['saw Temple service'],
      academy: 'Lod'
    },

    // Third Generation (120-140 CE) - Students of Rabbi Akiva
    'רבי מאיר': {
      name: 'Rabbi Meir',
      generation: 3,
      period: 'tanna',
      teachers: ['רבי עקיבא', 'רבי ישמעאל', 'אלישע בן אבויה'],
      methodology: 'sharp mind, anonymous Mishnah follows his view',
      note: 'Baal HaNes, scribe',
      spouse: 'Beruriah'
    },
    'רבי יהודה': {
      name: 'Rabbi Yehuda',
      generation: 3,
      period: 'tanna',
      note: 'bar Ilai',
      teachers: ['רבי עקיבא'],
      methodology: 'stam Sifra follows his view'
    },
    'רבי יוסי': {
      name: 'Rabbi Yosi',
      generation: 3,
      period: 'tanna',
      note: 'ben Chalafta',
      teachers: ['רבי עקיבא'],
      methodology: 'halacha follows him in disputes with Rabbi Meir and Rabbi Yehuda'
    },
    'רבי שמעון': {
      name: 'Rabbi Shimon',
      generation: 3,
      period: 'tanna',
      fullName: 'Rabbi Shimon bar Yochai',
      teachers: ['רבי עקיבא'],
      methodology: 'seeks reasons for Torah laws',
      note: 'bar Yochai, Attributed author of Zohar'
    },
    'רשב"י': {
      name: 'Rabbi Shimon bar Yochai',
      generation: 3,
      period: 'tanna',
      abbrev: true,
      aliasOf: 'רבי שמעון'
    },
    'רבי נחמיה': { name: 'Rabbi Nechemiah', generation: 3, period: 'tanna' },
    'רבי אלעזר בן שמוע': {
      name: 'Rabbi Elazar ben Shamua',
      generation: 3,
      period: 'tanna',
      teachers: ['רבי עקיבא']
    },

    // Fourth Generation (140-165 CE)
    'רבי': {
      name: 'Rabbi Yehuda HaNasi',
      generation: 4,
      period: 'tanna',
      fullName: 'Rabbi Yehuda HaNasi',
      teachers: ['רבי שמעון', 'רבי מאיר', 'רבי יהודה'],
      famousRulings: ['Compiled the Mishnah'],
      note: 'Compiler of Mishnah, also called Rebbi or Rabbeinu HaKadosh'
    },
    'רבי יהודה הנשיא': { name: 'Rabbi Yehuda HaNasi', generation: 4, period: 'tanna', aliasOf: 'רבי' },
    'רבינו הקדוש': { name: 'Rabbeinu HaKadosh', generation: 4, period: 'tanna', aliasOf: 'רבי' },

    // Fifth Generation (165-200 CE) - Transitional
    'רבי חייא': {
      name: 'Rabbi Chiya',
      generation: 5,
      period: 'tanna',
      fullName: 'Rabbi Chiya Rabbah',
      teachers: ['רבי'],
      students: ['רב'],
      note: 'Compiled Tosefta/Baraitot'
    },
    'בר קפרא': {
      name: 'Bar Kappara',
      generation: 5,
      period: 'tanna',
      teachers: ['רבי']
    }
  },

  // AMORAIM (Talmudic Period, 220 CE - 500 CE)
  amoraim: {
    // First Generation Babylonian (220-250 CE)
    'רב': {
      name: 'Rav',
      generation: 1,
      period: 'amora',
      location: 'Babylonia',
      note: 'Abba Arikha',
      fullName: 'Abba Arikha (Rav)',
      teachers: ['רבי חייא', 'רבי'],
      academy: 'Sura',
      students: ['רב הונא', 'רב יהודה'],
      disputesWith: ['שמואל'],
      methodology: 'halacha follows Rav in ritual matters (איסורי)',
      famousRulings: ['Founded Sura academy']
    },
    'שמואל': {
      name: 'Shmuel',
      generation: 1,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Shmuel Yarchina\'ah',
      academy: 'Nehardea',
      disputesWith: ['רב'],
      methodology: 'halacha follows Shmuel in monetary matters (ממונות)',
      famousRulings: ['Dina deMalchuta Dina']
    },

    // First Generation Israel (220-250 CE)
    'רבי יוחנן': {
      name: 'Rabbi Yochanan',
      generation: 1,
      period: 'amora',
      location: 'Israel',
      fullName: 'Rabbi Yochanan bar Nafcha',
      academy: 'Tiberias',
      teachers: ['רבי', 'רבי חייא'],
      students: ['רבי אמי', 'רבי אסי', 'רבי אבהו'],
      chavruta: 'ריש לקיש',
      note: 'Primary compiler of Yerushalmi'
    },
    'ריש לקיש': {
      name: 'Reish Lakish',
      generation: 1,
      period: 'amora',
      location: 'Israel',
      fullName: 'Rabbi Shimon ben Lakish',
      chavruta: 'רבי יוחנן',
      note: 'Brother-in-law of R. Yochanan'
    },
    'רבי שמעון בן לקיש': { name: 'Rabbi Shimon ben Lakish', generation: 1, period: 'amora', aliasOf: 'ריש לקיש' },

    // Second Generation (250-290 CE)
    'רב הונא': {
      name: 'Rav Huna',
      generation: 2,
      period: 'amora',
      location: 'Babylonia',
      teachers: ['רב'],
      academy: 'Sura',
      students: ['רבה', 'רב חסדא']
    },
    'רב יהודה': {
      name: 'Rav Yehuda',
      generation: 2,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Rav Yehuda bar Yechezkel',
      teachers: ['רב', 'שמואל'],
      academy: 'Pumbedita',
      students: ['רבה', 'רב יוסף']
    },
    'רב נחמן': {
      name: 'Rav Nachman',
      generation: 2,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Rav Nachman bar Yaakov',
      teachers: ['שמואל'],
      methodology: 'expert in monetary law'
    },
    'רב ששת': {
      name: 'Rav Sheshet',
      generation: 2,
      period: 'amora',
      location: 'Babylonia',
      note: 'Was blind, sharp memory',
      disputesWith: ['רב נחמן']
    },
    'רב חסדא': {
      name: 'Rav Chisda',
      generation: 2,
      period: 'amora',
      location: 'Babylonia',
      teachers: ['רב', 'רב הונא'],
      academy: 'Sura',
      students: ['רבא']
    },

    // Third Generation (290-320 CE)
    'רבה': {
      name: 'Rabbah',
      generation: 3,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Rabbah bar Nachmani',
      teachers: ['רב הונא', 'רב יהודה'],
      academy: 'Pumbedita',
      students: ['אביי'],
      methodology: 'עוקר הרים - uproots mountains (sharp analysis)',
      chavruta: 'רב יוסף'
    },
    'רב יוסף': {
      name: 'Rav Yosef',
      generation: 3,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Rav Yosef bar Chiya',
      teachers: ['רב יהודה'],
      academy: 'Pumbedita',
      students: ['אביי', 'רבא'],
      methodology: 'סיני - vast knowledge of traditions',
      chavruta: 'רבה'
    },
    'רב נחמן בר יצחק': { name: 'Rav Nachman bar Yitzchak', generation: 3, period: 'amora' },

    // Fourth Generation (320-350 CE) - Most cited pair
    'אביי': {
      name: 'Abaye',
      generation: 4,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Abaye Nachmani',
      teachers: ['רבה', 'רב יוסף'],
      academy: 'Pumbedita',
      chavruta: 'רבא',
      disputesWith: ['רבא'],
      methodology: 'halacha follows Rava except יע"ל קג"ם',
      note: 'Raised by uncle Rabbah, orphan'
    },
    'רבא': {
      name: 'Rava',
      generation: 4,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Rava bar Yosef bar Chama',
      teachers: ['רב נחמן', 'רב יוסף', 'רב חסדא'],
      academy: 'Machoza',
      chavruta: 'אביי',
      disputesWith: ['אביי'],
      methodology: 'halacha follows Rava except יע"ל קג"ם',
      students: ['רב פפא', 'רב הונא בריה דרב יהושע']
    },

    // Fifth Generation (350-375 CE)
    'רב פפא': {
      name: 'Rav Pappa',
      generation: 5,
      period: 'amora',
      location: 'Babylonia',
      teachers: ['רבא', 'אביי'],
      academy: 'Naresh',
      note: 'Wealthy brewer'
    },
    'רב הונא בריה דרב יהושע': {
      name: 'Rav Huna brei deRav Yehoshua',
      generation: 5,
      period: 'amora',
      teachers: ['רבא'],
      chavruta: 'רב פפא'
    },

    // Sixth Generation (375-425 CE)
    'רב אשי': {
      name: 'Rav Ashi',
      generation: 6,
      period: 'amora',
      location: 'Babylonia',
      note: 'Primary compiler of Talmud Bavli',
      academy: 'Sura (rebuilt)',
      chavruta: 'רבינא',
      famousRulings: ['Compiled Talmud Bavli over 60 years']
    },
    'רבינא': {
      name: 'Ravina',
      generation: 6,
      period: 'amora',
      location: 'Babylonia',
      fullName: 'Ravina bar Huna',
      chavruta: 'רב אשי',
      note: 'Co-compiler of Bavli'
    },

    // Seventh Generation (425-475 CE)
    'מר בר רב אשי': {
      name: 'Mar bar Rav Ashi',
      generation: 7,
      period: 'amora',
      teachers: ['רב אשי'],
      note: 'Son of Rav Ashi'
    }
  }
};

// =============================================================================
// RABBI RELATIONSHIPS
// =============================================================================

export const RABBI_RELATIONSHIPS = {
  // Teacher-Student chains
  chains: {
    'HillelToRebbi': ['הלל', 'רבן גמליאל הזקן', 'רבן יוחנן בן זכאי', 'רבי אליעזר', 'רבי עקיבא', 'רבי יהודה', 'רבי'],
    'AkivaStudents': ['רבי עקיבא', ['רבי מאיר', 'רבי יהודה', 'רבי יוסי', 'רבי שמעון', 'רבי אלעזר בן שמוע']],
    'BabylonianChain': ['רבי', 'רב', 'רב הונא', 'רבה', 'אביי', 'רב פפא', 'רב אשי']
  },

  // Famous Chavrutot (study partners)
  chavrutot: [
    { pair: ['הלל', 'שמאי'], note: 'Founded opposing schools' },
    { pair: ['רבי עקיבא', 'רבי ישמעאל'], note: 'Two methodologies of interpretation' },
    { pair: ['רבי יוחנן', 'ריש לקיש'], note: 'Most famous chavruta' },
    { pair: ['רבה', 'רב יוסף'], note: 'עוקר הרים vs סיני' },
    { pair: ['אביי', 'רבא'], note: 'Most cited dispute pair' },
    { pair: ['רב אשי', 'רבינא'], note: 'Compiled the Bavli' }
  ],

  // Famous disputes
  famousDisputes: [
    { disputants: ['בית הלל', 'בית שמאי'], count: 316, halachaFollows: 'בית הלל' },
    { disputants: ['רבי עקיבא', 'רבי ישמעאל'], topic: 'Hermeneutical methodology' },
    { disputants: ['רב', 'שמואל'], halachaFollows: { איסורי: 'רב', ממונות: 'שמואל' } },
    { disputants: ['אביי', 'רבא'], halachaFollows: 'רבא', exceptions: 'יע"ל קג"ם' }
  ]
};

/**
 * Get teacher-student relationship info for a rabbi
 * @param {string} rabbiName - Hebrew name
 * @returns {Object|null}
 */
export function getRabbiRelationships(rabbiName) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
  const rabbi = allRabbis[rabbiName];

  if (!rabbi) return null;

  const relationships = {
    teachers: [],
    students: [],
    chavruta: null,
    disputesWith: []
  };

  // Get teachers
  if (rabbi.teachers) {
    relationships.teachers = rabbi.teachers.map(t => {
      const teacherInfo = allRabbis[t];
      return {
        hebrew: t,
        english: teacherInfo?.name || t,
        generation: teacherInfo?.generation
      };
    });
  }

  // Find students (search all rabbis for those who list this rabbi as teacher)
  for (const [hebrew, info] of Object.entries(allRabbis)) {
    if (info.teachers?.includes(rabbiName)) {
      relationships.students.push({
        hebrew,
        english: info.name,
        generation: info.generation
      });
    }
  }

  // Get chavruta
  if (rabbi.chavruta) {
    const chavrutaInfo = allRabbis[rabbi.chavruta];
    relationships.chavruta = {
      hebrew: rabbi.chavruta,
      english: chavrutaInfo?.name || rabbi.chavruta
    };
  }

  // Get dispute partners
  if (rabbi.disputesWith) {
    relationships.disputesWith = rabbi.disputesWith.map(d => {
      const disputeInfo = allRabbis[d];
      return {
        hebrew: d,
        english: disputeInfo?.name || d
      };
    });
  }

  return relationships;
}

/**
 * Get the transmission chain from a rabbi back to earliest teacher
 * @param {string} rabbiName - Hebrew name
 * @returns {Array}
 */
export function getTeacherChain(rabbiName) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
  const chain = [];
  let current = rabbiName;
  const visited = new Set();

  while (current && !visited.has(current)) {
    visited.add(current);
    const rabbi = allRabbis[current];

    if (rabbi) {
      chain.push({
        hebrew: current,
        english: rabbi.name,
        generation: rabbi.generation,
        period: rabbi.period
      });

      // Follow first teacher
      current = rabbi.teachers?.[0] || null;
    } else {
      break;
    }
  }

  return chain.reverse(); // Earliest first
}

// =============================================================================
// BIBLICAL FIGURES DATABASE
// =============================================================================

export const BIBLICAL_FIGURES = {
  // Patriarchs and Matriarchs
  'אברהם': { name: 'Abraham', category: 'patriarch' },
  'יצחק': { name: 'Isaac', category: 'patriarch' },
  'יעקב': { name: 'Jacob', category: 'patriarch' },
  'שרה': { name: 'Sarah', category: 'matriarch' },
  'רבקה': { name: 'Rebecca', category: 'matriarch' },
  'רחל': { name: 'Rachel', category: 'matriarch' },
  'לאה': { name: 'Leah', category: 'matriarch' },

  // Moses and Siblings
  'משה': { name: 'Moses', category: 'prophet' },
  'משה רבינו': { name: 'Moses our Teacher', category: 'prophet' },
  'אהרן': { name: 'Aaron', category: 'priest' },
  'מרים': { name: 'Miriam', category: 'prophet' },

  // Judges and Kings
  'דוד': { name: 'David', category: 'king' },
  'דוד המלך': { name: 'King David', category: 'king' },
  'שלמה': { name: 'Solomon', category: 'king' },
  'שלמה המלך': { name: 'King Solomon', category: 'king' },
  'שאול': { name: 'Saul', category: 'king' },
  'שמואל': { name: 'Samuel', category: 'prophet' },
  'שמואל הנביא': { name: 'Samuel the Prophet', category: 'prophet' },

  // Prophets
  'אליהו': { name: 'Elijah', category: 'prophet' },
  'אלישע': { name: 'Elisha', category: 'prophet' },
  'ישעיהו': { name: 'Isaiah', category: 'prophet' },
  'ירמיהו': { name: 'Jeremiah', category: 'prophet' },
  'יחזקאל': { name: 'Ezekiel', category: 'prophet' },

  // Other Notable Figures
  'אדם': { name: 'Adam', category: 'primordial' },
  'חוה': { name: 'Eve', category: 'primordial' },
  'נח': { name: 'Noah', category: 'primordial' },
  'יוסף': { name: 'Joseph', category: 'patriarch' },
  'יהושע': { name: 'Joshua', category: 'leader' }
};

// =============================================================================
// PLACES DATABASE
// =============================================================================

export const PLACES = {
  'ירושלים': { name: 'Jerusalem', type: 'city', significance: 'holy' },
  'ציון': { name: 'Zion', type: 'place', significance: 'holy' },
  'בית המקדש': { name: 'Temple', type: 'building', significance: 'holy' },
  'מקדש': { name: 'Temple', type: 'building', significance: 'holy' },

  'בבל': { name: 'Babylonia', type: 'region' },
  'ארץ ישראל': { name: 'Land of Israel', type: 'country' },
  'מצרים': { name: 'Egypt', type: 'country' },

  // Talmudic Academies
  'פומבדיתא': { name: 'Pumbedita', type: 'academy', significance: 'talmudic' },
  'סורא': { name: 'Sura', type: 'academy', significance: 'talmudic' },
  'נהרדעא': { name: 'Nehardea', type: 'academy', significance: 'talmudic' },
  'יבנה': { name: 'Yavneh', type: 'academy', significance: 'mishnaic' },
  'טבריה': { name: 'Tiberias', type: 'city' },
  'צפורי': { name: 'Tzippori', type: 'city' }
};

// =============================================================================
// DETECTION PATTERNS
// =============================================================================

// Rabbi attribution patterns
const RABBI_PATTERNS = [
  // אמר רבי X - Rabbi X said
  { pattern: /(?:אמר|א"ר|א״ר)\s*(רב(?:י|ן|א)?|ר׳)\s+(\p{Script=Hebrew}+(?:\s+(?:בן|בר|ב"ר|ב״ר)\s+\p{Script=Hebrew}+)?)/gu, type: 'statement' },
  // רבי X אמר - Rabbi X says
  { pattern: /(רב(?:י|ן|א)?|ר׳)\s+(\p{Script=Hebrew}+(?:\s+(?:בן|בר)\s+\p{Script=Hebrew}+)?)\s+(?:אמר|אומר)/gu, type: 'statement' },
  // Standalone rabbi mentions
  { pattern: /(רב(?:י|ן|א)?)\s+(\p{Script=Hebrew}+)/gu, type: 'mention' },
  // Abbreviated forms
  { pattern: /(רשב"י|רשב"ג|ר"י|ר"מ|ר"ע)/gu, type: 'abbreviation' }
];

// Biblical citation patterns
const BIBLICAL_CITATION_PATTERNS = [
  // שנאמר "..." - As it says...
  { pattern: /(?:שנאמר|שנא׳|דכתיב|דכתי׳|כדכתיב|ככתוב)\s*[:"״]?([^"״\n]+)["״]?/gu, type: 'citation' },
  // מנין? שנאמר - From where? As it says...
  { pattern: /מנ(?:ין|לן)\s*[?؟]?\s*(?:שנאמר|דכתיב)\s*[:"״]?([^"״\n]+)["״]?/gu, type: 'source_proof' }
];

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect all named entities in text
 * @param {string} text - Hebrew/Aramaic text
 * @returns {Object} Detected entities by type
 */
export function detectEntities(text) {
  if (!text || typeof text !== 'string') {
    return { rabbis: [], biblicalFigures: [], places: [], citations: [] };
  }

  return {
    rabbis: detectRabbis(text),
    biblicalFigures: detectBiblicalFigures(text),
    places: detectPlaces(text),
    citations: detectBiblicalCitations(text)
  };
}

/**
 * Detect rabbi mentions in text
 * @param {string} text
 * @returns {Array}
 */
export function detectRabbis(text) {
  const results = [];
  const seen = new Set();

  // Check for known rabbis from database
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };

  for (const [hebrew, info] of Object.entries(allRabbis)) {
    const regex = new RegExp(hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.RABBI,
        hebrew,
        english: info.name,
        position: match.index,
        endPosition: match.index + match[0].length,
        period: info.period,
        generation: info.generation,
        location: info.location,
        note: info.note
      });
    }
  }

  // Additional pattern-based detection
  for (const { pattern, type } of RABBI_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const key = `${match.index}-pattern`;

      if (!seen.has(key)) {
        seen.add(key);

        // Try to identify from database
        const title = match[1];
        const name = match[2];
        const fullName = `${title} ${name}`;

        // Look up in database
        const dbEntry = allRabbis[fullName] || allRabbis[name];

        results.push({
          type: ENTITY_TYPES.RABBI,
          hebrew: fullMatch,
          english: dbEntry?.name || name,
          position: match.index,
          endPosition: match.index + fullMatch.length,
          period: dbEntry?.period || 'unknown',
          generation: dbEntry?.generation,
          statementType: type
        });
      }
    }
    pattern.lastIndex = 0;
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect biblical figure mentions
 * @param {string} text
 * @returns {Array}
 */
export function detectBiblicalFigures(text) {
  const results = [];
  const seen = new Set();

  for (const [hebrew, info] of Object.entries(BIBLICAL_FIGURES)) {
    const regex = new RegExp(hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.BIBLICAL_FIGURE,
        hebrew,
        english: info.name,
        category: info.category,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect place mentions
 * @param {string} text
 * @returns {Array}
 */
export function detectPlaces(text) {
  const results = [];
  const seen = new Set();

  for (const [hebrew, info] of Object.entries(PLACES)) {
    const regex = new RegExp(hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${hebrew}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        type: ENTITY_TYPES.PLACE,
        hebrew,
        english: info.name,
        placeType: info.type,
        significance: info.significance,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect biblical citations
 * @param {string} text
 * @returns {Array}
 */
export function detectBiblicalCitations(text) {
  const results = [];

  for (const { pattern, type } of BIBLICAL_CITATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const citedText = match[1]?.trim();
      if (!citedText || citedText.length < 3) continue;

      results.push({
        type: ENTITY_TYPES.BIBLICAL_CITATION,
        fullMatch: match[0],
        citedText: citedText,
        citationType: type,
        position: match.index,
        endPosition: match.index + match[0].length
      });
    }
    pattern.lastIndex = 0;
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Get entity statistics for a text
 * @param {string} text
 * @returns {Object}
 */
export function getEntityStatistics(text) {
  const entities = detectEntities(text);

  // Count unique rabbis
  const uniqueRabbis = new Set(entities.rabbis.map(r => r.english || r.hebrew));
  const uniquePlaces = new Set(entities.places.map(p => p.english || p.hebrew));
  const uniqueFigures = new Set(entities.biblicalFigures.map(f => f.english || f.hebrew));

  // Group rabbis by period
  const rabbisByPeriod = {};
  for (const rabbi of entities.rabbis) {
    const period = rabbi.period || 'unknown';
    if (!rabbisByPeriod[period]) rabbisByPeriod[period] = new Set();
    rabbisByPeriod[period].add(rabbi.english || rabbi.hebrew);
  }

  return {
    totalEntities: entities.rabbis.length + entities.biblicalFigures.length + entities.places.length + entities.citations.length,
    rabbis: {
      total: entities.rabbis.length,
      unique: uniqueRabbis.size,
      byPeriod: Object.fromEntries(
        Object.entries(rabbisByPeriod).map(([k, v]) => [k, v.size])
      )
    },
    biblicalFigures: {
      total: entities.biblicalFigures.length,
      unique: uniqueFigures.size
    },
    places: {
      total: entities.places.length,
      unique: uniquePlaces.size
    },
    citations: {
      total: entities.citations.length
    }
  };
}

/**
 * Get highlighted text with entity markers
 * @param {string} text
 * @param {Object} options
 * @returns {string} HTML with entity spans
 */
export function getHighlightedEntities(text, options = {}) {
  const { includeRabbis = true, includeFigures = true, includePlaces = true, includeCitations = true } = options;

  const entities = detectEntities(text);
  const allEntities = [];

  if (includeRabbis) allEntities.push(...entities.rabbis);
  if (includeFigures) allEntities.push(...entities.biblicalFigures);
  if (includePlaces) allEntities.push(...entities.places);
  if (includeCitations) allEntities.push(...entities.citations);

  if (allEntities.length === 0) return text;

  // Sort by position descending to insert from end
  allEntities.sort((a, b) => b.position - a.position);

  let result = text;
  for (const entity of allEntities) {
    const before = result.slice(0, entity.position);
    const match = result.slice(entity.position, entity.endPosition);
    const after = result.slice(entity.endPosition);

    const cssClass = `entity-${entity.type}`;
    const title = entity.english || entity.hebrew;

    result = `${before}<span class="${cssClass}" data-type="${entity.type}" title="${title}">${match}</span>${after}`;
  }

  return result;
}

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up rabbi information by name
 * @param {string} name - Hebrew or English name
 * @returns {Object|null}
 */
export function lookupRabbi(name) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };

  // Direct lookup
  if (allRabbis[name]) {
    return { hebrew: name, ...allRabbis[name] };
  }

  // Reverse lookup by English name
  for (const [hebrew, info] of Object.entries(allRabbis)) {
    if (info.name.toLowerCase() === name.toLowerCase()) {
      return { hebrew, ...info };
    }
  }

  return null;
}

/**
 * Get all rabbis of a specific period/generation
 * @param {string} period - 'tanna' or 'amora'
 * @param {number} generation - Generation number
 * @returns {Array}
 */
export function getRabbisByGeneration(period, generation = null) {
  const source = period === 'tanna' ? RABBI_DATABASE.tannaim : RABBI_DATABASE.amoraim;

  const results = [];
  for (const [hebrew, info] of Object.entries(source)) {
    if (generation === null || info.generation === generation) {
      results.push({ hebrew, ...info });
    }
  }

  return results.sort((a, b) => (a.generation || 0) - (b.generation || 0));
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const namedEntityService = {
  ENTITY_TYPES,
  RABBI_DATABASE,
  RABBI_RELATIONSHIPS,
  BIBLICAL_FIGURES,
  PLACES,

  // Detection
  detectEntities,
  detectRabbis,
  detectBiblicalFigures,
  detectPlaces,
  detectBiblicalCitations,

  // Analysis
  getEntityStatistics,
  getHighlightedEntities,

  // Lookup
  lookupRabbi,
  getRabbisByGeneration,

  // Relationships
  getRabbiRelationships,
  getTeacherChain
};

export default namedEntityService;
