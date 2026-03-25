/**
 * Dictionary and Lexicon Source Configuration
 * PRO SCHOLAR: Scholarly Source Classification System
 *
 * CLEAR DISTINCTION:
 * - LEXICON: Published academic dictionaries (Jastrow, BDB, CAL, Strong's)
 * - CURATED: App's local vocabulary lists (function words, particles, terms)
 * - DERIVED: Definition obtained via morphological analysis (root extraction)
 *
 * Each source includes:
 * - type: 'lexicon' | 'curated' | 'derived'
 * - reliability tier with confidence weighting
 * - display info for scholarly attribution
 */

// =============================================================================
// PRO SCHOLAR VERSION - Single source of truth for version tracking
// =============================================================================

export const PRO_SCHOLAR_VERSION = '12.0';
export const PRO_SCHOLAR_CODENAME = 'Unified Lookup';

// =============================================================================
// SOURCE TYPES - Clear categorization
// =============================================================================

export const SOURCE_TYPES = {
  LEXICON: 'lexicon',   // Published academic dictionary
  CURATED: 'curated',   // App's local vocabulary list
  DERIVED: 'derived',   // Computed from root/morphology
  CONTEXT: 'context',   // Context-based override (Halachic terms)
  API: 'api'            // External API lookup
};

// =============================================================================
// RELIABILITY TIERS - Academic credibility levels
// =============================================================================

export const RELIABILITY_TIERS = {
  academic: {
    level: 1,
    label: 'Academic Lexicon',
    shortLabel: 'Academic',
    icon: '🥇',
    badgeIcon: '📚',
    color: '#059669',      // Emerald green
    borderColor: '#047857',
    bgColor: 'rgba(5, 150, 105, 0.08)',
    description: 'Published scholarly dictionary, peer-reviewed',
    explanation: 'Primary research sources cited in academic papers',
    examples: ['Jastrow', 'BDB', 'CAL', 'HALOT', 'DJBA', 'DJPA'],
    baseConfidence: 95
  },
  scholarly: {
    level: 2,
    label: 'Scholarly Reference',
    shortLabel: 'Reference',
    icon: '🥈',
    badgeIcon: '📖',
    color: '#0891b2',      // Cyan
    borderColor: '#0e7490',
    bgColor: 'rgba(8, 145, 178, 0.08)',
    description: 'Academic concordance or reference work',
    explanation: 'Widely used in academic and religious study',
    examples: ["Strong's", 'Klein', 'Steinsaltz', 'TWOT', 'Targum'],
    baseConfidence: 85
  },
  curated: {
    level: 3,
    label: 'Curated Vocabulary',
    shortLabel: 'Curated',
    icon: '🥉',
    badgeIcon: '📝',
    color: '#6366f1',      // Indigo
    borderColor: '#4f46e5',
    bgColor: 'rgba(99, 102, 241, 0.08)',
    description: 'Manually curated common terms (local)',
    explanation: 'Hand-verified vocabulary lists for common words',
    examples: ['Function words', 'Technical terms', 'Particles'],
    baseConfidence: 90     // High confidence - manually verified
  },
  derived: {
    level: 4,
    label: 'Morphological Derivation',
    shortLabel: 'Derived',
    icon: '⚙️',
    badgeIcon: '🔤',
    color: '#8b5cf6',      // Violet
    borderColor: '#7c3aed',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    description: 'Derived from root via morphological analysis',
    explanation: 'Computed by extracting root (שורש) and applying pattern rules',
    examples: ['Root extraction', 'Binyan analysis', 'Prefix stripping'],
    baseConfidence: 75
  },
  reference: {
    level: 5,
    label: 'General Reference',
    shortLabel: 'General',
    icon: '📑',
    badgeIcon: '📑',
    color: '#64748b',      // Slate
    borderColor: '#475569',
    bgColor: 'rgba(100, 116, 139, 0.08)',
    description: 'General reference or community source',
    explanation: 'Community-maintained or general purpose sources',
    examples: ['Wiktionary', 'OpenScriptures'],
    baseConfidence: 70
  }
};

// =============================================================================
// MATCH TYPES - How the definition was found
// =============================================================================

export const MATCH_TYPES = {
  EXACT: {
    label: 'exact',
    displayLabel: 'Exact Match',
    confidence: 100,
    icon: '✓',
    color: '#059669',
    description: 'Word found exactly as written in dictionary',
    scholarly: 'Direct lexical entry lookup'
  },
  NORMALIZED: {
    label: 'normalized',
    displayLabel: 'Normalized',
    confidence: 98,
    icon: '≈',
    color: '#0891b2',
    description: 'Final letters converted (ם→מ, ן→נ, ך→כ, ף→פ, ץ→צ)',
    scholarly: 'Orthographic normalization applied'
  },
  PREFIX_STRIPPED: {
    label: 'prefix',
    displayLabel: 'Prefix Analysis',
    confidence: 90,
    icon: 'P',
    color: '#8b5cf6',
    description: 'Grammatical prefix removed (ו, ה, ב, ל, מ, כ, ש, ד)',
    scholarly: 'Morphological prefix stripping'
  },
  SUFFIX_STRIPPED: {
    label: 'suffix',
    displayLabel: 'Suffix Analysis',
    confidence: 88,
    icon: 'S',
    color: '#a855f7',
    description: 'Grammatical suffix removed (ים, ות, ה, etc.)',
    scholarly: 'Morphological suffix stripping'
  },
  ROOT_DERIVED: {
    label: 'root',
    displayLabel: 'Root Derivation',
    confidence: 80,
    icon: 'R',
    color: '#3b82f6',
    description: 'Definition from 3-letter root (שורש) extraction',
    scholarly: 'Semitic trilateral root analysis'
  },
  CONSTRUCT: {
    label: 'construct',
    displayLabel: 'Construct State',
    confidence: 85,
    icon: 'C',
    color: '#14b8a6',
    description: 'Identified as סמיכות (construct/genitive)',
    scholarly: 'Status constructus identification'
  },
  CROSSREF: {
    label: 'cross-ref',
    displayLabel: 'Cross-Reference',
    confidence: 82,
    icon: '→',
    color: '#f59e0b',
    description: 'Linked from related entry',
    scholarly: 'Lexical cross-reference'
  },
  MORPHOLOGICAL: {
    label: 'morphology',
    displayLabel: 'Full Morphology',
    confidence: 75,
    icon: 'M',
    color: '#ec4899',
    description: 'Complete grammatical parsing applied',
    scholarly: 'Full morphological decomposition'
  },
  BINYAN: {
    label: 'binyan',
    displayLabel: 'Binyan Pattern',
    confidence: 78,
    icon: 'B',
    color: '#6366f1',
    description: 'Verb pattern (בניין) identified',
    scholarly: 'Hebrew verbal stem analysis'
  },
  INFERRED: {
    label: 'inferred',
    displayLabel: 'Algorithmically Inferred',
    confidence: 65,
    icon: '?',
    color: '#64748b',
    description: 'Best guess based on patterns',
    scholarly: 'Heuristic inference'
  }
};

// =============================================================================
// DICTIONARY SOURCES - Complete scholarly attribution
// =============================================================================

export const DICTIONARY_SOURCES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ACADEMIC LEXICONS - Published, peer-reviewed dictionaries
  // ═══════════════════════════════════════════════════════════════════════════

  jastrow: {
    name: 'Jastrow',
    fullName: 'A Dictionary of the Targumim, Talmud Babli and Yerushalmi, and Midrashic Literature',
    shortName: 'Jastrow',
    author: 'Marcus Jastrow',
    year: 1903,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#059669',
    specialization: 'Talmudic Aramaic & Rabbinic Hebrew',
    entries: '~25,000',
    citations: 'Definitive reference for Talmudic studies',
    isAramaic: true,
    language: ['aramaic', 'hebrew']
  },

  bdb: {
    name: 'BDB',
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    shortName: 'BDB',
    author: 'Brown, Driver, Briggs',
    year: 1906,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#dc2626',
    specialization: 'Biblical Hebrew',
    entries: '~8,000',
    citations: 'Standard academic reference for Biblical Hebrew',
    language: ['hebrew']
  },

  cal: {
    name: 'CAL',
    fullName: 'Comprehensive Aramaic Lexicon',
    shortName: 'CAL',
    author: 'Hebrew Union College',
    year: 1986,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#0ea5e9',
    specialization: 'All Aramaic dialects',
    entries: '~50,000',
    citations: 'Most comprehensive Aramaic database',
    isAramaic: true,
    language: ['aramaic']
  },

  halot: {
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    shortName: 'HALOT',
    author: 'Koehler-Baumgartner',
    year: 2000,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#0d9488',
    specialization: 'Biblical Hebrew & Aramaic',
    citations: 'Modern academic standard',
    language: ['hebrew', 'aramaic']
  },

  gesenius: {
    name: 'Gesenius',
    fullName: "Gesenius' Hebrew Grammar and Lexicon",
    shortName: 'Gesenius',
    author: 'Wilhelm Gesenius',
    year: 1910,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#be185d',
    specialization: 'Biblical Hebrew grammar',
    citations: 'Foundational Hebrew grammar reference',
    language: ['hebrew']
  },

  // PRO SCHOLAR V11: New Tier 1 Academic Sources (Sokoloff)
  djba: {
    name: 'DJBA',
    fullName: 'Dictionary of Jewish Babylonian Aramaic',
    shortName: 'DJBA',
    author: 'Michael Sokoloff',
    year: 2002,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#7c3aed',
    specialization: 'Babylonian Talmud Aramaic',
    entries: '~15,000',
    citations: 'Definitive modern Babylonian Aramaic dictionary',
    isAramaic: true,
    language: ['aramaic']
  },

  djpa: {
    name: 'DJPA',
    fullName: 'Dictionary of Jewish Palestinian Aramaic',
    shortName: 'DJPA',
    author: 'Michael Sokoloff',
    year: 2002,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'academic',
    color: '#0891b2',
    specialization: 'Jerusalem Talmud & Midrash Aramaic',
    entries: '~12,000',
    citations: 'Definitive modern Palestinian Aramaic dictionary',
    isAramaic: true,
    language: ['aramaic']
  },

  // PRO SCHOLAR V11: New Tier 2 Scholarly Sources
  twot: {
    name: 'TWOT',
    fullName: 'Theological Wordbook of the Old Testament',
    shortName: 'TWOT',
    author: 'Harris, Archer, Waltke',
    year: 1980,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'scholarly',
    color: '#059669',
    specialization: 'Theological word studies',
    entries: '~2,000',
    citations: 'Standard for theological word analysis',
    language: ['hebrew']
  },

  targum: {
    name: 'Targum',
    fullName: 'Targum Lexicon',
    shortName: 'Targum',
    year: 2024,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'scholarly',
    color: '#ea580c',
    specialization: 'Targumic Aramaic vocabulary',
    citations: 'Vocabulary from Aramaic Bible translations',
    isAramaic: true,
    language: ['aramaic']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHOLARLY REFERENCES - Concordances and reference works
  // ═══════════════════════════════════════════════════════════════════════════

  strong: {
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance of the Bible",
    shortName: "Strong's",
    author: 'James Strong',
    year: 1890,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'scholarly',
    color: '#d97706',
    specialization: 'Biblical word numbering & definitions',
    entries: '~8,600',
    citations: 'Universal cross-reference system',
    language: ['hebrew', 'greek']
  },
  "strong's": { /* alias */ },

  klein: {
    name: 'Klein',
    fullName: 'A Comprehensive Etymological Dictionary of the Hebrew Language',
    shortName: 'Klein',
    author: 'Ernest Klein',
    year: 1987,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'scholarly',
    color: '#7c3aed',
    specialization: 'Etymology & word origins',
    citations: 'Best etymological reference for Hebrew',
    language: ['hebrew']
  },

  steinsaltz: {
    name: 'Steinsaltz',
    fullName: 'The Steinsaltz Talmud Dictionary',
    shortName: 'Steinsaltz',
    author: 'Adin Steinsaltz',
    year: 1989,
    type: SOURCE_TYPES.LEXICON,
    reliability: 'scholarly',
    color: '#0891b2',
    specialization: 'Talmudic terminology',
    citations: 'Modern Talmud study standard',
    language: ['aramaic', 'hebrew']
  },

  sefaria: {
    name: 'Sefaria',
    fullName: 'Sefaria Lexicon (aggregated)',
    shortName: 'Sefaria',
    year: 2024,
    type: SOURCE_TYPES.API,
    reliability: 'scholarly',
    color: '#4f46e5',
    specialization: 'Aggregated scholarly sources',
    citations: 'Curated from multiple academic lexicons',
    language: ['hebrew', 'aramaic']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURATED VOCABULARY - App's local term lists (NOT published dictionaries)
  // ═══════════════════════════════════════════════════════════════════════════

  // Rabbinic vocabulary - common Talmud/Rashi terms
  'rabbinic-vocab': {
    name: 'Rabbinic',
    fullName: 'Common Rabbinic Vocabulary (local)',
    shortName: 'Rabbinic',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    tier: 3, // Bronze tier - explicit to avoid inconsistent display
    color: '#6366f1',
    specialization: 'Common Talmudic & Rashi terms',
    description: 'Curated list of frequent rabbinic vocabulary',
    isLocal: true
  },

  // Technical Talmudic terms (halachic concepts)
  'technical-terms': {
    name: 'Technical',
    fullName: 'Talmudic Technical Terms (local)',
    shortName: 'Technical',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    tier: 3, // Bronze tier
    color: '#8b5cf6',
    specialization: 'Legal & technical terminology',
    description: 'כרת, חטאת, סקילה, פטור, חייב, etc.',
    isLocal: true
  },

  // Biblical particles and grammar words
  'particles': {
    name: 'Particles',
    fullName: 'Hebrew/Aramaic Particles (local)',
    shortName: 'Particles',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    tier: 3, // Bronze tier
    color: '#64748b',
    specialization: 'Function words & particles',
    description: 'על, אל, מן, כי, אשר, etc.',
    isLocal: true
  },

  // Common verb conjugations
  'verb-forms': {
    name: 'Verbs',
    fullName: 'Common Verb Forms (local)',
    shortName: 'Verbs',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    tier: 3, // Bronze tier
    color: '#f59e0b',
    specialization: 'Frequent verb conjugations',
    description: 'היה, אמר, עשה, etc.',
    isLocal: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT OVERRIDES - Domain-specific disambiguation
  // ═══════════════════════════════════════════════════════════════════════════

  halachic: {
    name: 'Halachic',
    fullName: 'Halachic Context Override',
    shortName: 'Halachic',
    type: SOURCE_TYPES.CONTEXT,
    reliability: 'curated',
    color: '#ea580c',
    specialization: 'Talmudic term disambiguation',
    description: 'שבת→Shabbat (not "rest"), תורה→Torah (not "teaching")',
    isLocal: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED SOURCES - Morphological analysis results
  // ═══════════════════════════════════════════════════════════════════════════

  'root-derived': {
    name: 'Root',
    fullName: 'Root Derivation',
    shortName: 'via Root',
    type: SOURCE_TYPES.DERIVED,
    reliability: 'derived',
    color: '#8b5cf6',
    specialization: 'Morphological root extraction',
    description: 'Definition from שורש (root) analysis',
    isLocal: true
  },

  morphological: {
    name: 'Morphology',
    fullName: 'Morphological Analysis',
    shortName: 'Morphology',
    type: SOURCE_TYPES.DERIVED,
    reliability: 'derived',
    color: '#a855f7',
    specialization: 'Prefix/suffix analysis',
    description: 'Derived via grammatical parsing',
    isLocal: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE SOURCES - Community/modern compilations
  // ═══════════════════════════════════════════════════════════════════════════

  openscriptures: {
    name: 'OpenScriptures',
    fullName: 'OpenScriptures Hebrew Morphology',
    year: 2020,
    type: SOURCE_TYPES.API,
    reliability: 'reference',
    color: '#14b8a6',
    specialization: 'Open-source Hebrew morphology'
  },

  wiktionary: {
    name: 'Wiktionary',
    fullName: 'Wiktionary (English Edition)',
    shortName: 'Wiki',
    author: 'Wikimedia Foundation',
    year: 2024,
    type: SOURCE_TYPES.API,
    reliability: 'reference',
    color: '#3b82f6',
    borderColor: '#2563eb',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    icon: '📖',
    badgeIcon: '📖',
    specialization: 'Community-edited definitions',
    language: ['Hebrew', 'Aramaic', 'Modern Hebrew'],
    description: 'Free multilingual dictionary with Hebrew entries',
    isOptional: true,
    isCommunitySource: true,
    citationFormat: 'Wiktionary, s.v. "{headword}", accessed {date}',
    url: 'https://en.wiktionary.org/'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY MAPPINGS - For backward compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  // Map old "Talmudic" to new "Rabbinic" (local curated)
  talmudic: {
    name: 'Rabbinic',
    fullName: 'Common Rabbinic Vocabulary (local)',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    tier: 3, // Bronze tier
    color: '#6366f1',
    isLocal: true,
    _deprecated: 'Use rabbinic-vocab instead'
  },

  // Map old names
  'Talmudic Technical Terms': {
    name: 'Technical',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    color: '#8b5cf6',
    isLocal: true,
    _deprecated: 'Use technical-terms instead'
  },

  'Biblical Particles': {
    name: 'Particles',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    color: '#64748b',
    isLocal: true,
    _deprecated: 'Use particles instead'
  },

  'Common Verb Forms': {
    name: 'Verbs',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    color: '#f59e0b',
    isLocal: true,
    _deprecated: 'Use verb-forms instead'
  },

  Core: {
    name: 'Core',
    type: SOURCE_TYPES.CURATED,
    reliability: 'curated',
    color: '#64748b',
    isLocal: true,
    _deprecated: 'Use particles instead'
  },

  // Fallbacks
  local: { name: 'Local', type: SOURCE_TYPES.CURATED, reliability: 'curated', color: '#6b7280', isLocal: true },
  cache: { name: 'Cached', type: SOURCE_TYPES.CURATED, reliability: 'curated', color: '#6b7280', isLocal: true },
  none: { name: 'Unknown', type: SOURCE_TYPES.CURATED, reliability: 'reference', color: '#9ca3af' }
};

// Initialize alias
DICTIONARY_SOURCES["strong's"] = DICTIONARY_SOURCES.strong;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get source display info by name (case-insensitive)
 * Handles variations like "Jastrow (1903)", "Jastrow (1903) (root)", "BDB", etc.
 * @param {string} sourceName - The source identifier
 * @returns {Object|null} Source info
 */
export const getSourceInfo = (sourceName) => {
  if (!sourceName) return null;

  // Direct key lookup first
  const directKey = sourceName.toLowerCase().replace(/\s+/g, '-');
  if (DICTIONARY_SOURCES[directKey]) return DICTIONARY_SOURCES[directKey];
  if (DICTIONARY_SOURCES[sourceName]) return DICTIONARY_SOURCES[sourceName];

  // Extract base name before any parentheses: "Jastrow (1903) (root)" → "Jastrow"
  const baseName = sourceName.split(/\s*\(/)[0].trim().toLowerCase();
  if (DICTIONARY_SOURCES[baseName]) return DICTIONARY_SOURCES[baseName];

  // Handle specific variations and aliases
  const aliases = {
    'rabbinic': 'rabbinic-vocab',
    'talmudic': 'rabbinic-vocab',
    'technical': 'technical-terms',
    'particles': 'particles',
    'verbs': 'verb-forms',
    'root': 'root-derived',
    'strongs': 'strong',
    "strong's": 'strong',
    'jastrow': 'jastrow',
    'bdb': 'bdb',
    'cal': 'cal',
    'halot': 'halot',
    'gesenius': 'gesenius',
    'djba': 'djba',
    'djpa': 'djpa',
    'twot': 'twot',
    'targum': 'targum',
    'klein': 'klein',
    'steinsaltz': 'steinsaltz',
    'sefaria': 'sefaria',
    'openscriptures': 'openscriptures',
    'wiktionary': 'wiktionary',
    'halachic': 'halachic',
    'morphology': 'morphological',
    'morphological': 'morphological',
    'local': 'local',
    'cache': 'cache',
    'cached': 'cache',
    'core': 'particles'
  };

  const aliasKey = aliases[baseName];
  if (aliasKey && DICTIONARY_SOURCES[aliasKey]) {
    return DICTIONARY_SOURCES[aliasKey];
  }

  // Try with dashes
  const dashedKey = baseName.replace(/\s+/g, '-');
  if (DICTIONARY_SOURCES[dashedKey]) return DICTIONARY_SOURCES[dashedKey];

  return null;
};

/**
 * Get reliability tier info for a source
 * @param {string} sourceName - The source identifier
 * @returns {Object} Reliability tier info
 */
export const getSourceReliability = (sourceName) => {
  const info = getSourceInfo(sourceName);
  if (!info?.reliability) return RELIABILITY_TIERS.reference;
  return RELIABILITY_TIERS[info.reliability] || RELIABILITY_TIERS.reference;
};

/**
 * Check if source is a published academic lexicon (not local/curated)
 * @param {string} sourceName - The source identifier
 * @returns {boolean} True if academic lexicon
 */
export const isAcademicLexicon = (sourceName) => {
  const info = getSourceInfo(sourceName);
  return info?.type === SOURCE_TYPES.LEXICON &&
         (info?.reliability === 'academic' || info?.reliability === 'scholarly');
};

// Alias for backwards compatibility
export const isAcademicSource = isAcademicLexicon;

/**
 * Check if source is local/curated (not a published dictionary)
 * @param {string} sourceName - The source identifier
 * @returns {boolean} True if local/curated
 */
export const isLocalSource = (sourceName) => {
  const info = getSourceInfo(sourceName);
  return info?.isLocal === true ||
         info?.type === SOURCE_TYPES.CURATED ||
         info?.type === SOURCE_TYPES.DERIVED;
};

/**
 * Calculate confidence score based on source and match type
 * @param {string} sourceName - The source identifier
 * @param {string} matchType - How the match was found (exact, root, prefix, etc.)
 * @returns {Object} Confidence info with score, level, and display
 */
export const calculateSourceConfidence = (sourceName, matchType = 'EXACT') => {
  const sourceInfo = getSourceInfo(sourceName);
  const reliability = getSourceReliability(sourceName);
  const matchInfo = MATCH_TYPES[matchType] || MATCH_TYPES.EXACT;

  // Base confidence from source reliability
  const baseConfidence = reliability.baseConfidence || 70;

  // Adjust by match type
  const matchMultiplier = matchInfo.confidence / 100;
  const score = Math.round(baseConfidence * matchMultiplier);

  // Determine confidence level
  let level, emoji;
  if (score >= 90) { level = 'high'; emoji = '✓'; }
  else if (score >= 75) { level = 'medium'; emoji = '≈'; }
  else if (score >= 60) { level = 'low'; emoji = '?'; }
  else { level = 'uncertain'; emoji = '⚠'; }

  return {
    score,
    level,
    emoji,
    matchType: matchInfo.label,
    matchIcon: matchInfo.icon,
    sourceType: sourceInfo?.type || 'unknown',
    isLocal: sourceInfo?.isLocal || false
  };
};

/**
 * Format source for scholarly display
 * @param {string} sourceName - The source identifier
 * @param {Object} options - Display options
 * @returns {Object} Formatted display data
 */
export const formatSourceDisplay = (sourceName, options = {}) => {
  const { matchType, root, confidence } = options;
  const info = getSourceInfo(sourceName);
  const reliability = getSourceReliability(sourceName);

  if (!info) {
    return {
      name: sourceName || 'Unknown',
      icon: '📑',
      color: '#6b7280',
      isLocal: false,
      display: sourceName || 'Unknown'
    };
  }

  // Build display string
  let display = info.shortName || info.name;
  if (info.year && !info.isLocal) {
    display += ` (${info.year})`;
  }
  if (info.isLocal) {
    display += ' [local]';
  }

  // Add root info if derived
  let derivation = null;
  if (root && matchType && matchType !== 'EXACT') {
    const matchInfo = MATCH_TYPES[matchType];
    derivation = {
      root,
      matchType: matchInfo?.label || matchType,
      icon: matchInfo?.icon || '→'
    };
  }

  return {
    name: info.name,
    fullName: info.fullName,
    shortName: info.shortName,
    year: info.year,
    icon: reliability.icon,
    color: info.color,
    borderColor: reliability.borderColor,
    isLocal: info.isLocal || false,
    isAcademic: isAcademicLexicon(sourceName),
    type: info.type,
    reliability: reliability.label,
    display,
    derivation,
    confidence: confidence || null
  };
};

/**
 * Get badge style for a source
 * @param {string} sourceName - The source identifier
 * @returns {Object} CSS style object
 */
export const getSourceStyle = (sourceName) => {
  const info = getSourceInfo(sourceName);
  const reliability = getSourceReliability(sourceName);

  if (!info?.color) {
    return { backgroundColor: '#6b7280', color: '#fff' };
  }

  return {
    backgroundColor: info.color,
    color: '#fff',
    borderLeft: info.isLocal ? `3px dashed ${reliability.borderColor}` : `3px solid ${reliability.borderColor}`
  };
};

/**
 * Get source badge data for UI display
 * @param {string} sourceName - The source identifier
 * @returns {Object} Complete badge display data
 */
export const getSourceBadgeData = (sourceName) => {
  const info = getSourceInfo(sourceName);
  const reliability = getSourceReliability(sourceName);

  if (!info) {
    return {
      name: sourceName || 'Unknown',
      color: '#6b7280',
      reliability: RELIABILITY_TIERS.reference,
      style: { backgroundColor: '#6b7280', color: '#fff' },
      isLocal: false
    };
  }

  return {
    name: info.name,
    fullName: info.fullName,
    shortName: info.shortName,
    color: info.color,
    year: info.year,
    type: info.type,
    reliability,
    specialization: info.specialization,
    description: info.description,
    isLocal: info.isLocal || false,
    isAramaic: info.isAramaic,
    style: getSourceStyle(sourceName)
  };
};

/**
 * Sort sources by reliability and type (academic first, then curated, then derived)
 * @param {Array} sources - Array of source objects with name property
 * @returns {Array} Sorted sources array
 */
export const sortSourcesByReliability = (sources) => {
  if (!Array.isArray(sources)) return [];

  return [...sources].sort((a, b) => {
    const aInfo = getSourceInfo(a.name || a);
    const bInfo = getSourceInfo(b.name || b);

    // First sort by type (lexicon > curated > derived > reference)
    const typeOrder = { lexicon: 0, api: 1, curated: 2, context: 3, derived: 4 };
    const aType = typeOrder[aInfo?.type] ?? 5;
    const bType = typeOrder[bInfo?.type] ?? 5;
    if (aType !== bType) return aType - bType;

    // Then by reliability level
    const aLevel = RELIABILITY_TIERS[aInfo?.reliability]?.level || 5;
    const bLevel = RELIABILITY_TIERS[bInfo?.reliability]?.level || 5;
    return aLevel - bLevel;
  });
};

/**
 * Get all sources of a specific type
 * @param {string} type - 'lexicon', 'curated', 'derived', 'context', 'api'
 * @returns {Array} Array of source keys matching the type
 */
export const getSourcesByType = (type) => {
  return Object.entries(DICTIONARY_SOURCES)
    .filter(([, info]) => info.type === type)
    .map(([key]) => key);
};

// =============================================================================
// PRO SCHOLAR V7: SCHOLARLY ANALYSIS EXPLANATION GENERATOR
// =============================================================================

/**
 * Generate a complete scholarly explanation of how a word was analyzed
 * @param {Object} analysisData - The word analysis data
 * @returns {Object} Scholarly explanation with workflow steps
 */
export const generateScholarlyExplanation = (analysisData) => {
  const {
    word,
    root,
    definition,
    source,
    matchType = 'EXACT',
    prefixes = [],
    // suffixes reserved for future use (suffix stripping display)
    binyan,
    confidence
  } = analysisData;

  const sourceInfo = getSourceInfo(source);
  const reliability = getSourceReliability(source);
  const matchInfo = MATCH_TYPES[matchType] || MATCH_TYPES.EXACT;

  // Build workflow steps
  const steps = [];

  // Step 1: Input
  steps.push({
    num: 1,
    label: 'Input Form',
    hebrew: 'צורה מקורית',
    value: word,
    type: 'input',
    icon: '📝'
  });

  // Step 2: Normalization (if applicable)
  if (matchType === 'NORMALIZED') {
    steps.push({
      num: 2,
      label: 'Normalization',
      hebrew: 'נרמול',
      description: 'Final letters converted to medial form',
      type: 'transform',
      icon: '≈'
    });
  }

  // Step 3: Prefix stripping (if applicable)
  if (prefixes.length > 0) {
    steps.push({
      num: steps.length + 1,
      label: 'Prefix Removal',
      hebrew: 'הסרת תחיליות',
      value: prefixes.map(p => `${p.letter} (${p.meaning})`).join(', '),
      type: 'morphology',
      icon: 'P'
    });
  }

  // Step 4: Root extraction (if applicable)
  if (root && matchType === 'ROOT_DERIVED') {
    steps.push({
      num: steps.length + 1,
      label: 'Root Extraction',
      hebrew: 'שורש',
      value: root,
      description: 'Trilateral root identified',
      type: 'root',
      icon: '√'
    });
  }

  // Step 5: Binyan analysis (if applicable)
  if (binyan) {
    steps.push({
      num: steps.length + 1,
      label: 'Verbal Pattern',
      hebrew: 'בניין',
      value: binyan.name || binyan,
      description: binyan.meaning || 'Verb stem identified',
      type: 'binyan',
      icon: 'B'
    });
  }

  // Step 6: Dictionary lookup
  steps.push({
    num: steps.length + 1,
    label: 'Dictionary Lookup',
    hebrew: 'חיפוש במילון',
    value: sourceInfo?.fullName || source,
    source: sourceInfo,
    reliability,
    type: 'lookup',
    icon: reliability.badgeIcon
  });

  // Step 7: Result
  steps.push({
    num: steps.length + 1,
    label: 'Translation',
    hebrew: 'תרגום',
    value: definition,
    type: 'result',
    icon: '✓',
    final: true
  });

  // Calculate final confidence
  const baseConfidence = reliability.baseConfidence;
  const matchConfidence = matchInfo.confidence;
  const finalConfidence = confidence || Math.round((baseConfidence * matchConfidence) / 100);

  return {
    word,
    steps,
    summary: {
      source: sourceInfo?.name || source,
      sourceType: sourceInfo?.type || 'unknown',
      reliability: reliability.label,
      reliabilityLevel: reliability.level,
      matchType: matchInfo.displayLabel,
      matchDescription: matchInfo.scholarly,
      confidence: finalConfidence,
      confidenceLevel: finalConfidence >= 90 ? 'high' : finalConfidence >= 75 ? 'medium' : 'low',
      isLocal: sourceInfo?.isLocal || false,
      isAcademic: isAcademicLexicon(source)
    },
    attribution: {
      source: sourceInfo?.fullName || source,
      year: sourceInfo?.year,
      author: sourceInfo?.author,
      specialization: sourceInfo?.specialization,
      isLocal: sourceInfo?.isLocal || false
    }
  };
};

/**
 * Get match type info by label (case-insensitive)
 * @param {string} matchTypeLabel - The match type label
 * @returns {Object} Match type info
 */
export const getMatchTypeInfo = (matchTypeLabel) => {
  if (!matchTypeLabel) return MATCH_TYPES.EXACT;

  const normalized = matchTypeLabel.toUpperCase().replace(/[- ]/g, '_');
  return MATCH_TYPES[normalized] || MATCH_TYPES.EXACT;
};

/**
 * Generate confidence explanation text
 * @param {number} confidence - Confidence score (0-100)
 * @param {string} source - Source name
 * @param {string} matchType - Match type
 * @returns {string} Human-readable confidence explanation
 */
export const explainConfidence = (confidence, source, matchType) => {
  const sourceInfo = getSourceInfo(source);
  const reliability = getSourceReliability(source);
  const matchInfo = getMatchTypeInfo(matchType);

  const parts = [];

  // Explain source contribution
  if (reliability.level === 1) {
    parts.push(`Academic lexicon (${sourceInfo?.name || source})`);
  } else if (reliability.level === 2) {
    parts.push(`Scholarly reference (${sourceInfo?.name || source})`);
  } else if (sourceInfo?.isLocal) {
    parts.push(`Curated vocabulary (local)`);
  } else {
    parts.push(`Reference source`);
  }

  // Explain match type contribution
  if (matchInfo.label !== 'exact') {
    parts.push(matchInfo.description.toLowerCase());
  }

  // Confidence level
  let levelText;
  if (confidence >= 90) {
    levelText = 'Very high confidence';
  } else if (confidence >= 80) {
    levelText = 'High confidence';
  } else if (confidence >= 70) {
    levelText = 'Moderate confidence';
  } else {
    levelText = 'Lower confidence';
  }

  return `${levelText}: ${parts.join(', ')}`;
};

export default DICTIONARY_SOURCES;
