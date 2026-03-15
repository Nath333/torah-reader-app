/**
 * Dictionary and Lexicon Source Configuration
 *
 * Centralized configuration for all scholarly dictionary sources
 * used in word lookup features. Each source has display info and styling.
 */

/**
 * Dictionary source metadata with display names and colors
 * Used for source attribution badges in word tooltips and definitions
 */
export const DICTIONARY_SOURCES = {
  // Primary Academic Sources
  sefaria: { name: 'Sefaria', color: '#4f46e5' },
  jastrow: { name: 'Jastrow', color: '#059669', year: '1903', fullName: 'A Dictionary of the Targumim, Talmud Babli and Yerushalmi' },
  bdb: { name: 'BDB', color: '#dc2626', year: '1906', fullName: 'Brown-Driver-Briggs Hebrew Lexicon' },
  strong: { name: "Strong's", color: '#d97706', fullName: "Strong's Exhaustive Concordance" },
  "strong's": { name: "Strong's", color: '#d97706' },
  klein: { name: 'Klein', color: '#7c3aed', year: '1987', fullName: 'A Comprehensive Etymological Dictionary of the Hebrew Language' },
  steinsaltz: { name: 'Steinsaltz', color: '#0891b2', year: '1989', fullName: 'The Steinsaltz Talmud Dictionary' },
  gesenius: { name: 'Gesenius', color: '#be185d', year: '1910', fullName: "Gesenius' Hebrew Grammar" },
  halot: { name: 'HALOT', color: '#0d9488', year: '2000', fullName: 'Hebrew and Aramaic Lexicon of the Old Testament' },
  twot: { name: 'TWOT', color: '#ea580c', year: '1980', fullName: 'Theological Wordbook of the Old Testament' },
  'even-shoshan': { name: 'Even-Shoshan', color: '#f59e0b', year: '1969', fullName: 'Even-Shoshan Dictionary' },

  // Online API Sources
  bolls: { name: 'Bolls.life', color: '#8b5cf6', year: '2020' },
  'bolls.life': { name: 'Bolls.life', color: '#8b5cf6', year: '2020' },
  wiktionary: { name: 'Wiktionary', color: '#3b82f6', year: '2024' },
  'wiktionary (en)': { name: 'Wiktionary', color: '#3b82f6', year: '2024' },
  morfix: { name: 'Morfix', color: '#10b981', year: '2024' },
  pealim: { name: 'Pealim', color: '#f97316', year: '2024' },
  milog: { name: 'Milog', color: '#6366f1', year: '2024' },
  openscriptures: { name: 'OpenScriptures', color: '#14b8a6', year: '2020' },
  step: { name: 'STEP Bible', color: '#8b5cf6', year: '2021' },
  'step bible': { name: 'STEP Bible', color: '#8b5cf6', year: '2021' },

  // Fallback/Generic Sources
  babylonian: { name: 'Dictionary', color: '#6b7280' },
  local: { name: 'Dictionary', color: '#6b7280' },
  lexicon: { name: 'Lexicon', color: '#6366f1' }
};

/**
 * Get source display info by name (case-insensitive)
 * @param {string} sourceName - The source identifier
 * @returns {Object|null} Source info with name, color, year, fullName
 */
export const getSourceInfo = (sourceName) => {
  if (!sourceName) return null;
  const key = sourceName.toLowerCase();
  return DICTIONARY_SOURCES[key] || null;
};

/**
 * Get badge style for a source
 * @param {string} sourceName - The source identifier
 * @returns {Object} CSS style object with backgroundColor and color
 */
export const getSourceStyle = (sourceName) => {
  const info = getSourceInfo(sourceName);
  if (info?.color) {
    return {
      backgroundColor: info.color,
      color: '#fff'
    };
  }
  return {};
};

export default DICTIONARY_SOURCES;
