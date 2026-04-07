/**
 * HalachicChain Types
 * Complete type definitions for the 7-layer halachic decision chain:
 * משנה → גמרא → ראשונים → טור/בית יוסף → אחרונים → פוסקים → פסק
 */

/**
 * Authority types in chronological order
 */
export const AUTHORITY_TYPES = {
  TANNA: 'tanna',
  AMORA: 'amora',
  RISHON: 'rishon',
  MECHABER: 'mechaber',   // Tur / Beit Yosef / Shulchan Aruch author
  ACHRON: 'achron',
  POSEK: 'posek'          // Modern poskim
};

/**
 * Layer identifiers — the full שושלת הוראה
 */
export const HALACHIC_LAYERS = {
  MISHNAH: 'mishnah',
  GEMARA: 'gemara',
  RISHONIM: 'rishonim',
  TUR: 'tur',             // Tur + Beit Yosef bridge
  ACHARONIM: 'acharonim', // Shulchan Aruch + Rema + commentators
  POSKIM: 'poskim',       // Modern authorities
  PSAK: 'psak'            // Final ruling with Ashkenazi/Sephardic comparison
};

/**
 * Color coding for authority types
 */
export const AUTHORITY_COLORS = {
  [AUTHORITY_TYPES.TANNA]: '#22c55e',      // Green
  [AUTHORITY_TYPES.AMORA]: '#3b82f6',      // Blue
  [AUTHORITY_TYPES.RISHON]: '#a855f7',     // Purple
  [AUTHORITY_TYPES.MECHABER]: '#06b6d4',   // Cyan — bridge between Rishonim and Acharonim
  [AUTHORITY_TYPES.ACHRON]: '#eab308',     // Gold
  [AUTHORITY_TYPES.POSEK]: '#059669'       // Emerald — modern
};

/**
 * Tradition types for Ashkenazi/Sephardic tracking
 */
export const TRADITIONS = {
  ASHKENAZI: 'ashkenazi',
  SEPHARDIC: 'sephardic',
  BOTH: 'both'
};

/**
 * @typedef {Object} Opinion
 * @property {string} authority - Name of the authority
 * @property {string} authorityType - Type from AUTHORITY_TYPES
 * @property {string} ruling - The actual ruling/opinion
 * @property {string} text - Original text
 * @property {string} [reasoning] - Explanation/justification
 * @property {boolean} isAccepted - Whether accepted in final psak
 * @property {string[]} [rejectedBy] - Authorities who rejected this
 * @property {string[]} [supportedBy] - Authorities who supported this
 */

/**
 * @typedef {Object} GemaraAnalysis
 * @property {string} question - The question posed
 * @property {string[]} rejections - Attempts/rejections
 * @property {string[]} resolutions - Successful resolutions
 * @property {string[]} survivingOpinions - Which opinions remain valid
 */

/**
 * @typedef {Object} RishonDecision
 * @property {string} authority - Rishon name
 * @property {string} ruling - Their decision
 * @property {string} reasoning - Their explanation
 * @property {string} sourceRef - Reference to commentary
 * @property {string[]} basedOn - Which earlier opinions they followed
 */

/**
 * @typedef {Object} TurAnalysis
 * @property {string} turOrganization - How the Tur categorizes this sugya
 * @property {string} turRef - Reference to Tur text
 * @property {string} turText - Tur text content
 * @property {Array<{authority: string, position: string}>} turSummary - Rishonim positions as Tur cites them
 * @property {string} beitYosefAnalysis - Beit Yosef's analysis of why SA rules as it does
 * @property {string} beitYosefRef - Reference to Beit Yosef text
 * @property {string} beitYosefText - Beit Yosef text content
 * @property {string} saSection - Which chelek of SA this maps to
 */

/**
 * @typedef {Object} AcharonDecision
 * @property {string} authority - Acharon name
 * @property {string} ruling - Their decision or clarification
 * @property {string} reasoning - Their explanation
 * @property {string} sourceRef - Reference to commentary
 * @property {string} saSection - Which SA section they comment on
 * @property {string} tradition - 'ashkenazi' | 'sephardic' | 'both'
 */

/**
 * @typedef {Object} PosekDecision
 * @property {string} authority - Posek name
 * @property {string} ruling - Their ruling
 * @property {string} reasoning - Brief explanation
 * @property {string} sourceRef - Reference
 * @property {string} tradition - 'ashkenazi' | 'sephardic' | 'both'
 * @property {string} era - 'pre-modern' | 'modern' | 'contemporary'
 */

/**
 * @typedef {Object} TraditionRuling
 * @property {string} ruling - The ruling text
 * @property {string} primarySource - Main authority (Mechaber or Rema)
 * @property {string} sourceRef - Location reference
 * @property {string[]} supportedBy - Acharonim/Poskim who agree
 * @property {string} practicalNote - How this is practiced today
 */

/**
 * @typedef {Object} PsakResult
 * @property {string} ruling - Overall ruling summary
 * @property {Object} majorityCount - { for: number, against: number }
 * @property {string} source - Primary source
 * @property {string} [location] - Specific location
 * @property {boolean} isDisputed - Whether there's valid machloket
 * @property {string} text - Source text
 * @property {TraditionRuling} mechaber - Sephardic ruling (Shulchan Aruch)
 * @property {TraditionRuling} rema - Ashkenazi ruling (Rema)
 * @property {boolean} traditionsAgree - Whether Mechaber and Rema agree
 * @property {Array<{authority: string, ruling: string, tradition: string}>} minorityPositions - Named minority opinions
 * @property {string} [halachaLemaaseh] - Practical halacha summary
 */

/**
 * @typedef {Object} HalachicLayer
 * @property {string} id - Layer identifier
 * @property {string} hebrewName - Hebrew display name
 * @property {string} englishName - English display name
 * @property {Opinion[]} [opinions] - For Mishnah layer
 * @property {GemaraAnalysis[]} [analysis] - For Gemara layer
 * @property {RishonDecision[]} [decisions] - For Rishonim/Acharonim layers
 * @property {TurAnalysis} [turAnalysis] - For Tur layer
 * @property {PosekDecision[]} [poskimDecisions] - For Poskim layer
 * @property {PsakResult} [psak] - For Psak layer
 * @property {boolean} isComplete - Whether processed
 */

/**
 * @typedef {Object} HalachicChain
 * @property {string} reference - Sefaria reference
 * @property {string} text - Full text being analyzed
 * @property {Object.<string, HalachicLayer>} layers - Layer map
 * @property {string[]} visibleLayers - Currently visible layers
 * @property {string} [focusedOpinion] - Selected authority
 * @property {boolean} isLoading
 * @property {string|null} error
 */

/**
 * @typedef {Object} CrossReference
 * @property {string} ref - Sefaria reference
 * @property {string} hebrewRef - Hebrew reference
 * @property {string} book - Book name
 * @property {string} snippet - Preview text
 * @property {string} topic - Related topic
 * @property {string} connectionType - parallel | contrast | source
 */

/**
 * @typedef {Object} ChainBuildOptions
 * @property {boolean} includeMishnah
 * @property {boolean} includeGemara
 * @property {boolean} includeRishonim
 * @property {boolean} includeTur - Whether to fetch Tur/Beit Yosef
 * @property {boolean} includeAcharonim
 * @property {boolean} includePoskim - Whether to fetch modern poskim
 * @property {boolean} includePsak
 * @property {boolean} fetchCrossReferences
 */

// Default options
export const DEFAULT_CHAIN_OPTIONS = {
  includeMishnah: true,
  includeGemara: true,
  includeRishonim: true,
  includeTur: true,
  includeAcharonim: true,
  includePoskim: true,
  includePsak: true,
  fetchCrossReferences: true
};

// Authority display names — complete database
export const AUTHORITY_DISPLAY_NAMES = {
  // ──── Tannaim ────
  'Tanna Kama': { hebrew: 'תנא קמא', type: AUTHORITY_TYPES.TANNA },
  'Abba Shaul': { hebrew: 'אבא שאול', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Meir': { hebrew: 'רבי מאיר', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Yehuda': { hebrew: 'רבי יהודה', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Yose': { hebrew: 'רבי יוסי', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Shimon': { hebrew: 'רבי שמעון', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Akiva': { hebrew: 'רבי עקיבא', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Eliezer': { hebrew: 'רבי אליעזר', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Yehoshua': { hebrew: 'רבי יהושע', type: AUTHORITY_TYPES.TANNA },
  'Beit Shammai': { hebrew: 'בית שמאי', type: AUTHORITY_TYPES.TANNA },
  'Beit Hillel': { hebrew: 'בית הלל', type: AUTHORITY_TYPES.TANNA },

  // ──── Rishonim (commentary & codification) ────
  'Rashi': { hebrew: 'רש"י', type: AUTHORITY_TYPES.RISHON },
  'Tosafot': { hebrew: 'תוספות', type: AUTHORITY_TYPES.RISHON },
  'Rif': { hebrew: 'רי"ף', type: AUTHORITY_TYPES.RISHON },
  'Rambam': { hebrew: 'רמב"ם', type: AUTHORITY_TYPES.RISHON },
  'Rosh': { hebrew: 'ר"אש', type: AUTHORITY_TYPES.RISHON },
  'Ran': { hebrew: 'ר"ן', type: AUTHORITY_TYPES.RISHON },
  'Rashba': { hebrew: 'רשב"א', type: AUTHORITY_TYPES.RISHON },
  'Ritva': { hebrew: 'ריטב"א', type: AUTHORITY_TYPES.RISHON },
  'Ramban': { hebrew: 'רמב"ן', type: AUTHORITY_TYPES.RISHON },
  'Meiri': { hebrew: 'מאירי', type: AUTHORITY_TYPES.RISHON },

  // ──── Tur / Beit Yosef (bridge layer) ────
  'Tur': { hebrew: 'טור', type: AUTHORITY_TYPES.MECHABER },
  'Beit Yosef': { hebrew: 'בית יוסף', type: AUTHORITY_TYPES.MECHABER },

  // ──── Acharonim — Mechaber & Rema ────
  'Shulchan Aruch': { hebrew: 'שולחן ערוך', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.SEPHARDIC },
  'Rema': { hebrew: 'רמ"א', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI },

  // ──── Acharonim — Key commentators by SA section ────
  'Shach': { hebrew: 'ש"ך', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.BOTH, sections: ['Yoreh Deah', 'Choshen Mishpat'] },
  'Taz': { hebrew: 'ט"ז', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.BOTH, sections: ['Orach Chaim', 'Yoreh Deah'] },
  'Magen Abraham': { hebrew: 'מגן אברהם', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI, sections: ['Orach Chaim'] },
  'Mishnah Berurah': { hebrew: 'משנה ברורה', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI, sections: ['Orach Chaim'] },
  'Beit Shmuel': { hebrew: 'בית שמואל', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI, sections: ['Even HaEzer'] },
  'Chelkat Mechokek': { hebrew: 'חלקת מחוקק', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI, sections: ['Even HaEzer'] },
  'Sma': { hebrew: 'סמ"ע', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.BOTH, sections: ['Choshen Mishpat'] },
  'Gra': { hebrew: 'הגר"א', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.ASHKENAZI, sections: ['Orach Chaim', 'Yoreh Deah', 'Even HaEzer', 'Choshen Mishpat'] },
  'Aruch HaShulchan': { hebrew: 'ערוך השולחן', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.BOTH, sections: ['Orach Chaim', 'Yoreh Deah', 'Even HaEzer', 'Choshen Mishpat'] },
  'Kaf HaChaim': { hebrew: 'כף החיים', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.SEPHARDIC, sections: ['Orach Chaim', 'Yoreh Deah'] },
  'Ben Ish Chai': { hebrew: 'בן איש חי', type: AUTHORITY_TYPES.ACHRON, tradition: TRADITIONS.SEPHARDIC, sections: ['Orach Chaim'] },

  // ──── Modern Poskim ────
  'Chazon Ish': { hebrew: 'חזון איש', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.ASHKENAZI, era: 'modern' },
  'Igrot Moshe': { hebrew: 'אגרות משה', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.ASHKENAZI, era: 'modern' },
  'Yalkut Yosef': { hebrew: 'ילקוט יוסף', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.SEPHARDIC, era: 'contemporary' },
  'Yabia Omer': { hebrew: 'יביע אומר', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.SEPHARDIC, era: 'modern' },
  'Tzitz Eliezer': { hebrew: 'ציץ אליעזר', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.BOTH, era: 'modern' },
  'Shemirat Shabbat': { hebrew: 'שמירת שבת כהלכתה', type: AUTHORITY_TYPES.POSEK, tradition: TRADITIONS.ASHKENAZI, era: 'contemporary' }
};

// ──── Tur section mapping (Sefaria references) ────
export const TUR_SECTION_MAP = {
  'Orach Chaim': { sefaria: 'Tur, Orach Chaim', hebrew: 'טור אורח חיים' },
  'Yoreh Deah': { sefaria: 'Tur, Yoreh Deah', hebrew: 'טור יורה דעה' },
  'Even HaEzer': { sefaria: 'Tur, Even HaEzer', hebrew: 'טור אבן העזר' },
  'Choshen Mishpat': { sefaria: 'Tur, Choshen Mishpat', hebrew: 'טור חושן משפט' }
};

export default {
  AUTHORITY_TYPES,
  HALACHIC_LAYERS,
  AUTHORITY_COLORS,
  TRADITIONS,
  DEFAULT_CHAIN_OPTIONS,
  AUTHORITY_DISPLAY_NAMES,
  TUR_SECTION_MAP
};
