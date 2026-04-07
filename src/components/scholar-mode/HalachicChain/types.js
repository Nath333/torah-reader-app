/**
 * HalachicChain Types
 * Type definitions for the halachic decision chain system
 */

/**
 * Authority types in chronological order
 */
export const AUTHORITY_TYPES = {
  TANNA: 'tanna',
  AMORA: 'amora', 
  RISHON: 'rishon',
  ACHRON: 'achron'
};

/**
 * Layer identifiers
 */
export const HALACHIC_LAYERS = {
  MISHNAH: 'mishnah',
  GEMARA: 'gemara',
  RISHONIM: 'rishonim',
  PSAK: 'psak'
};

/**
 * Color coding for authority types
 */
export const AUTHORITY_COLORS = {
  [AUTHORITY_TYPES.TANNA]: '#22c55e',    // Green
  [AUTHORITY_TYPES.AMORA]: '#3b82f6',    // Blue
  [AUTHORITY_TYPES.RISHON]: '#a855f7',   // Purple
  [AUTHORITY_TYPES.ACHRON]: '#eab308'    // Gold
};

/**
 * @typedef {Object} Opinion
 * @property {string} authority - Name of the authority (e.g., 'Tanna Kama', 'Rabbi Meir')
 * @property {string} authorityType - Type from AUTHORITY_TYPES
 * @property {string} ruling - The actual ruling/opinion
 * @property {string} text - Original text
 * @property {string} [reasoning] - Explanation/justification
 * @property {boolean} isAccepted - Whether this opinion was accepted in final psak
 * @property {string[]} [rejectedBy] - List of authorities who rejected this
 * @property {string[]} [supportedBy] - List of authorities who supported this
 */

/**
 * @typedef {Object} GemaraAnalysis
 * @property {string} question - The question posed
 * @property {string[]} rejections - Attempts/rejections
 * @property {string[]} resolutions - Successful resolutions
 * @property {string[]} survivingOpinions - Which opinions remain valid after analysis
 */

/**
 * @typedef {Object} RishonDecision
 * @property {string} authority - Rishon name (Rashi, Tosafot, Rif, Rambam, Rosh)
 * @property {string} ruling - Their decision
 * @property {string} reasoning - Their explanation
 * @property {string} sourceRef - Reference to their commentary
 * @property {string[]} basedOn - Which earlier opinions they followed
 */

/**
 * @typedef {Object} PsakResult
 * @property {string} ruling - Final halachic ruling
 * @property {Object} majorityCount - { for: number, against: number }
 * @property {string} source - Primary source (Shulchan Aruch, Rema)
 * @property {string} [location] - Specific location in source (e.g., "Orach Chaim 1:1")
 * @property {string} [minorityOpinion] - Valid minority view (e.g., Ashkenazi custom)
 * @property {boolean} isDisputed - Whether there's a valid machloket
 */

/**
 * @typedef {Object} HalachicLayer
 * @property {string} id - Layer identifier from HALACHIC_LAYERS
 * @property {string} hebrewName - Hebrew display name
 * @property {string} englishName - English display name
 * @property {Opinion[]} [opinions] - For Mishnah layer
 * @property {GemaraAnalysis[]} [analysis] - For Gemara layer
 * @property {RishonDecision[]} [decisions] - For Rishonim layer
 * @property {PsakResult} [psak] - For Psak layer
 * @property {boolean} isComplete - Whether this layer has been processed
 */

/**
 * @typedef {Object} HalachicChain
 * @property {string} reference - Sefaria reference (e.g., "Berakhot.2a")
 * @property {string} text - Full text being analyzed
 * @property {Object.<string, HalachicLayer>} layers - Map of layer ID to layer data
 * @property {string[]} visibleLayers - Which layers are currently visible
 * @property {string} [focusedOpinion] - Currently selected authority
 * @property {boolean} isLoading - Loading state
 * @property {string|null} error - Error message if any
 */

/**
 * @typedef {Object} CrossReference
 * @property {string} ref - Sefaria reference
 * @property {string} hebrewRef - Hebrew reference
 * @property {string} book - Book name
 * @property {string} snippet - Preview text
 * @property {string} topic - Related topic
 * @property {string} connectionType - Type of connection (parallel, contrast, source)
 */

/**
 * @typedef {Object} ChainBuildOptions
 * @property {boolean} includeMishnah - Whether to parse Mishnah layer
 * @property {boolean} includeGemara - Whether to parse Gemara layer
 * @property {boolean} includeRishonim - Whether to fetch Rishonim decisions
 * @property {boolean} includePsak - Whether to fetch final psak
 * @property {boolean} fetchCrossReferences - Whether to fetch related sugyot
 */

// Default options
export const DEFAULT_CHAIN_OPTIONS = {
  includeMishnah: true,
  includeGemara: true,
  includeRishonim: true,
  includePsak: true,
  fetchCrossReferences: true
};

// Authority display names
export const AUTHORITY_DISPLAY_NAMES = {
  // Tannaim
  'Tanna Kama': { hebrew: 'תנא קמא', type: AUTHORITY_TYPES.TANNA },
  'Abba Shaul': { hebrew: 'אבא שאול', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Meir': { hebrew: 'רבי מאיר', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Yehuda': { hebrew: 'רבי יהודה', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Yose': { hebrew: 'רבי יוסי', type: AUTHORITY_TYPES.TANNA },
  'Rabbi Shimon': { hebrew: 'רבי שמעון', type: AUTHORITY_TYPES.TANNA },
  
  // Rishonim
  'Rashi': { hebrew: 'רש"י', type: AUTHORITY_TYPES.RISHON },
  'Tosafot': { hebrew: 'תוספות', type: AUTHORITY_TYPES.RISHON },
  'Rif': { hebrew: 'רי"ף', type: AUTHORITY_TYPES.RISHON },
  'Rambam': { hebrew: 'רמב"ם', type: AUTHORITY_TYPES.RISHON },
  'Rosh': { hebrew: 'ר"ש', type: AUTHORITY_TYPES.RISHON },
  
  // Achronim
  'Shulchan Aruch': { hebrew: 'שולחן ערוך', type: AUTHORITY_TYPES.ACHRON },
  'Rema': { hebrew: 'רמ"א', type: AUTHORITY_TYPES.ACHRON }
};

export default {
  AUTHORITY_TYPES,
  HALACHIC_LAYERS,
  AUTHORITY_COLORS,
  DEFAULT_CHAIN_OPTIONS,
  AUTHORITY_DISPLAY_NAMES
};
