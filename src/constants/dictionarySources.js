/**
 * Dictionary and Lexicon Source Configuration
 *
 * Centralized configuration for all scholarly dictionary sources
 * used in word lookup features. Each source has display info, styling,
 * and reliability ratings.
 */

/**
 * Reliability tiers for dictionary sources
 * - gold: Academic standard, peer-reviewed, universally cited
 * - silver: Scholarly quality, widely used in academia
 * - bronze: Useful reference, community or modern compilation
 * - basic: General reference or fallback source
 */
export const RELIABILITY_TIERS = {
  gold: {
    level: 1,
    label: 'Academic Standard',
    icon: '🥇',
    color: '#fbbf24',
    borderColor: '#d97706',
    description: 'Peer-reviewed, universally cited in academic literature'
  },
  silver: {
    level: 2,
    label: 'Scholarly Quality',
    icon: '🥈',
    color: '#9ca3af',
    borderColor: '#6b7280',
    description: 'Widely used in academic and rabbinical study'
  },
  bronze: {
    level: 3,
    label: 'Reference Quality',
    icon: '🥉',
    color: '#cd7f32',
    borderColor: '#a16207',
    description: 'Useful reference, modern or community-maintained'
  },
  basic: {
    level: 4,
    label: 'General Reference',
    icon: '📖',
    color: '#6b7280',
    borderColor: '#4b5563',
    description: 'General dictionary or fallback source'
  }
};

/**
 * Dictionary source metadata with display names, colors, and reliability
 * Used for source attribution badges in word tooltips and definitions
 */
export const DICTIONARY_SOURCES = {
  // Gold Tier - Academic Standard Sources
  bdb: {
    name: 'BDB',
    color: '#dc2626',
    year: '1906',
    fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
    reliability: 'gold',
    specialization: 'Biblical Hebrew',
    citations: 'Standard academic reference for Biblical Hebrew'
  },
  halot: {
    name: 'HALOT',
    color: '#0d9488',
    year: '2000',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    reliability: 'gold',
    specialization: 'Biblical Hebrew & Aramaic',
    citations: 'Modern academic standard, supersedes BDB for some scholars'
  },
  jastrow: {
    name: 'Jastrow',
    color: '#059669',
    year: '1903',
    fullName: 'A Dictionary of the Targumim, Talmud Babli and Yerushalmi',
    reliability: 'gold',
    specialization: 'Rabbinic Hebrew & Aramaic',
    citations: 'Definitive reference for Talmudic Aramaic',
    isAramaic: true
  },
  cal: {
    name: 'CAL',
    color: '#0ea5e9',
    year: '1986',
    fullName: 'Comprehensive Aramaic Lexicon (Hebrew Union College)',
    reliability: 'gold',
    specialization: 'All Aramaic dialects',
    citations: 'Most comprehensive Aramaic database, ongoing scholarly project',
    isAramaic: true
  },
  gesenius: {
    name: 'Gesenius',
    color: '#be185d',
    year: '1910',
    fullName: "Gesenius' Hebrew Grammar & Lexicon",
    reliability: 'gold',
    specialization: 'Biblical Hebrew grammar',
    citations: 'Foundational Hebrew grammar reference'
  },

  // Silver Tier - Scholarly Quality Sources
  klein: {
    name: 'Klein',
    color: '#7c3aed',
    year: '1987',
    fullName: 'A Comprehensive Etymological Dictionary of the Hebrew Language',
    reliability: 'silver',
    specialization: 'Etymology & word origins',
    citations: 'Best etymological reference for Hebrew'
  },
  steinsaltz: {
    name: 'Steinsaltz',
    color: '#0891b2',
    year: '1989',
    fullName: 'The Steinsaltz Talmud Dictionary',
    reliability: 'silver',
    specialization: 'Talmudic terminology',
    citations: 'Modern Talmud study standard'
  },
  twot: {
    name: 'TWOT',
    color: '#ea580c',
    year: '1980',
    fullName: 'Theological Wordbook of the Old Testament',
    reliability: 'silver',
    specialization: 'Theological word studies',
    citations: 'Evangelical scholarship standard'
  },
  strong: {
    name: "Strong's",
    color: '#d97706',
    fullName: "Strong's Exhaustive Concordance",
    year: '1890',
    reliability: 'silver',
    specialization: 'Word numbering & basic definitions',
    citations: 'Universal cross-reference system'
  },
  "strong's": {
    name: "Strong's",
    color: '#d97706',
    year: '1890',
    reliability: 'silver',
    specialization: 'Word numbering & basic definitions'
  },
  'even-shoshan': {
    name: 'Even-Shoshan',
    color: '#f59e0b',
    year: '1969',
    fullName: 'Even-Shoshan Dictionary',
    reliability: 'silver',
    specialization: 'Modern Hebrew',
    citations: 'Standard Modern Hebrew dictionary in Israel'
  },
  sefaria: {
    name: 'Sefaria',
    color: '#4f46e5',
    reliability: 'silver',
    specialization: 'Aggregated scholarly sources',
    citations: 'Curated from multiple academic lexicons'
  },

  // Bronze Tier - Reference Quality Sources
  bolls: {
    name: 'Bolls.life',
    color: '#8b5cf6',
    year: '2020',
    reliability: 'bronze',
    specialization: 'Bible study tools'
  },
  'bolls.life': {
    name: 'Bolls.life',
    color: '#8b5cf6',
    year: '2020',
    reliability: 'bronze'
  },
  openscriptures: {
    name: 'OpenScriptures',
    color: '#14b8a6',
    year: '2020',
    reliability: 'bronze',
    specialization: 'Open-source Hebrew morphology'
  },
  step: {
    name: 'STEP Bible',
    color: '#8b5cf6',
    year: '2021',
    reliability: 'bronze',
    specialization: 'Tyndale House Cambridge'
  },
  'step bible': {
    name: 'STEP Bible',
    color: '#8b5cf6',
    year: '2021',
    reliability: 'bronze'
  },
  wiktionary: {
    name: 'Wiktionary',
    color: '#3b82f6',
    year: '2024',
    reliability: 'bronze',
    specialization: 'Community-edited definitions'
  },
  'wiktionary (en)': {
    name: 'Wiktionary',
    color: '#3b82f6',
    year: '2024',
    reliability: 'bronze'
  },
  morfix: {
    name: 'Morfix',
    color: '#10b981',
    year: '2024',
    reliability: 'bronze',
    specialization: 'Modern Hebrew-English'
  },
  pealim: {
    name: 'Pealim',
    color: '#f97316',
    year: '2024',
    reliability: 'bronze',
    specialization: 'Hebrew verb conjugations'
  },
  milog: {
    name: 'Milog',
    color: '#6366f1',
    year: '2024',
    reliability: 'bronze',
    specialization: 'Hebrew slang & modern usage'
  },

  // Contextual Override Sources - Special handling for ambiguous terms
  halachic: {
    name: 'Halachic',
    color: '#d97706',
    fullName: 'Halachic Context Override',
    reliability: 'silver',
    specialization: 'Talmudic terminology disambiguation',
    citations: 'Prevents dictionary ambiguity for common terms (שבת, משנה, etc.)'
  },
  talmudic: {
    name: 'Talmudic',
    color: '#d97706',
    fullName: 'Talmudic Context',
    reliability: 'silver',
    specialization: 'Talmudic terminology'
  },

  // Basic Tier - Fallback/Generic Sources
  babylonian: {
    name: 'Dictionary',
    color: '#6b7280',
    reliability: 'basic'
  },
  local: {
    name: 'Dictionary',
    color: '#6b7280',
    reliability: 'basic'
  },
  lexicon: {
    name: 'Lexicon',
    color: '#6366f1',
    reliability: 'basic'
  },
  cache: {
    name: 'Cached',
    color: '#6b7280',
    reliability: 'basic',
    specialization: 'Offline cached result'
  },
  analyzing: {
    name: 'Analyzing...',
    color: '#6b7280',
    reliability: 'basic',
    specialization: 'Loading results'
  },
  none: {
    name: 'Unknown',
    color: '#9ca3af',
    reliability: 'basic',
    specialization: 'No source found'
  },
  aramaic: {
    name: 'Aramaic',
    color: '#059669',
    reliability: 'basic',
    specialization: 'Generic Aramaic lookup'
  },
  crossref: {
    name: 'Cross-Reference',
    color: '#8b5cf6',
    reliability: 'silver',
    specialization: 'Definition from Strong\'s cross-reference'
  }
};

/**
 * Get source display info by name (case-insensitive)
 * @param {string} sourceName - The source identifier
 * @returns {Object|null} Source info with name, color, year, fullName, reliability
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

/**
 * Get reliability info for a source
 * @param {string} sourceName - The source identifier
 * @returns {Object|null} Reliability tier info with level, label, icon, description
 */
export const getSourceReliability = (sourceName) => {
  const info = getSourceInfo(sourceName);
  if (!info?.reliability) return RELIABILITY_TIERS.basic;
  return RELIABILITY_TIERS[info.reliability] || RELIABILITY_TIERS.basic;
};

/**
 * Get full source display data including reliability badge
 * @param {string} sourceName - The source identifier
 * @returns {Object} Complete display data for source badge
 */
export const getSourceBadgeData = (sourceName) => {
  const info = getSourceInfo(sourceName);
  if (!info) {
    return {
      name: sourceName || 'Unknown',
      color: '#6b7280',
      reliability: RELIABILITY_TIERS.basic,
      style: { backgroundColor: '#6b7280', color: '#fff' }
    };
  }

  const reliability = RELIABILITY_TIERS[info.reliability] || RELIABILITY_TIERS.basic;

  return {
    name: info.name,
    fullName: info.fullName,
    color: info.color,
    year: info.year,
    reliability,
    specialization: info.specialization,
    citations: info.citations,
    isAramaic: info.isAramaic,
    style: {
      backgroundColor: info.color,
      color: '#fff',
      borderLeft: `3px solid ${reliability.borderColor}`
    }
  };
};

/**
 * Sort sources by reliability (gold first, then silver, bronze, basic)
 * @param {Array} sources - Array of source objects with name property
 * @returns {Array} Sorted sources array
 */
export const sortSourcesByReliability = (sources) => {
  if (!Array.isArray(sources)) return [];

  return [...sources].sort((a, b) => {
    const aInfo = getSourceInfo(a.name || a);
    const bInfo = getSourceInfo(b.name || b);
    const aLevel = RELIABILITY_TIERS[aInfo?.reliability]?.level || 4;
    const bLevel = RELIABILITY_TIERS[bInfo?.reliability]?.level || 4;
    return aLevel - bLevel;
  });
};

/**
 * Get all sources of a specific reliability tier
 * @param {string} tier - 'gold', 'silver', 'bronze', or 'basic'
 * @returns {Array} Array of source keys matching the tier
 */
export const getSourcesByTier = (tier) => {
  return Object.entries(DICTIONARY_SOURCES)
    .filter(([, info]) => info.reliability === tier)
    .map(([key]) => key);
};

/**
 * Check if a source is considered academic/scholarly (gold or silver tier)
 * @param {string} sourceName - The source identifier
 * @returns {boolean} True if source is academic quality
 */
export const isAcademicSource = (sourceName) => {
  const info = getSourceInfo(sourceName);
  return info?.reliability === 'gold' || info?.reliability === 'silver';
};

export default DICTIONARY_SOURCES;
