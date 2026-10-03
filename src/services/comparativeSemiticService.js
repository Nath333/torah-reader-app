// =============================================================================
// PRO SCHOLAR V12: COMPARATIVE SEMITIC SERVICE
// Academic cognate database for Hebrew/Aramaic with sister Semitic languages
// =============================================================================
//
// Provides etymological and comparative data from:
// - Proto-Semitic reconstructions
// - Akkadian (Babylonian/Assyrian)
// - Ugaritic
// - Phoenician
// - Aramaic (Official, Syriac, Mandaic)
// - Arabic (Classical)
// - Ethiopic (Ge'ez)
// - South Arabian (Sabaean)
//
// ACADEMIC SOURCES:
// - Koehler-Baumgartner, HALOT (cognate sections)
// - Sokoloff, DJBA/DJPA
// - CAD (Chicago Assyrian Dictionary)
// - DUL (Dictionary of Ugaritic Language)
// - Lane's Arabic-English Lexicon
// - Leslau, Comparative Dictionary of Ge'ez
// =============================================================================

import { createLogger } from '../utils/debug';
import { lookupCAL, lookupCALSync } from './calService';
// PRO SCHOLAR V12: Use centralized dictionaryLoader to prevent duplicate fetches
import { getEtymologyJastrow } from './dictionaries/dictionaryLoader';
import { stripAllDiacritics, normalizeFinals } from '../utils/hebrewUtils';

const log = createLogger('ComparativeSemitic');

// =============================================================================
// COGNATE DATABASE - Core Semitic Roots
// =============================================================================

import { COGNATE_DATABASE, COGNATE_LANGUAGE_PATTERNS } from './comparativeSemitic/cognateDatabase';

// ré-export : l'original exposait la base (consumée par les panneaux dictionnaire)
export { COGNATE_DATABASE };



// =============================================================================
// DYNAMIC DATA LOADING - Integrate with extracted etymology
// =============================================================================

// Cache for loaded extracted data
let unifiedEtymologyData = null;
let extractedBDBData = null;
let extractedJastrowData = null;
let enrichedRootData = null;

/**
 * Load unified etymology PRO data (primary source)
 * Uses root_meanings_pro.json (consolidated etymology)
 */
const loadUnifiedEtymology = async () => {
  if (unifiedEtymologyData) return unifiedEtymologyData;
  try {
    const response = await fetch('/data/root_meanings_pro.json');
    if (response.ok) {
      const data = await response.json();
      unifiedEtymologyData = data.entries || {};
      log.debug(`Loaded ${Object.keys(unifiedEtymologyData).length} unified etymology entries`);
    }
  } catch (err) {
    log.warn('Could not load unified etymology data:', err.message);
    unifiedEtymologyData = {};
  }
  return unifiedEtymologyData;
};

/**
 * Load extracted BDB etymology data
 * DEPRECATED: etymology_bdb_extracted.json removed - data consolidated into root_meanings_pro
 * Returns empty object for backward compatibility
 */
const loadExtractedBDB = async () => {
  if (extractedBDBData) return extractedBDBData;
  extractedBDBData = {};
  return extractedBDBData;
};

/**
 * Load extracted Jastrow cross-reference data (via centralized dictionaryLoader)
 * PRO SCHOLAR V12: Uses shared cache to prevent duplicate network fetches
 */
const loadExtractedJastrow = async () => {
  if (extractedJastrowData) return extractedJastrowData;
  try {
    // Use centralized loader (shares cache with etymologyEnrichmentService)
    const data = await getEtymologyJastrow();
    extractedJastrowData = data?.entries || data || {};
    log.debug(`Loaded ${Object.keys(extractedJastrowData).length} Jastrow etymology entries (via dictionaryLoader)`);
  } catch (err) {
    log.warn('Could not load Jastrow etymology data:', err.message);
    extractedJastrowData = {};
  }
  return extractedJastrowData;
};

/**
 * Load enriched root meanings data
 */
const loadEnrichedRoots = async () => {
  if (enrichedRootData) return enrichedRootData;
  try {
    // PRO SCHOLAR V14: Use consolidated root_meanings_pro.json (merged from enriched)
    const response = await fetch('/data/root_meanings_pro.json');
    if (response.ok) {
      const data = await response.json();
      enrichedRootData = data.entries || {};
      log.debug(`Loaded ${Object.keys(enrichedRootData).length} enriched root entries`);
    }
  } catch (err) {
    log.warn('Could not load enriched root data:', err.message);
    enrichedRootData = {};
  }
  return enrichedRootData;
};

/**
 * Normalize a root string for lookup
 */
const normalizeRoot = (root) => {
  if (!root) return null;
  return normalizeFinals(stripAllDiacritics(root));
};

/**
 * Convert unified etymology PRO data to standard cognate format
 */
const convertUnifiedToStandard = (entry) => {
  if (!entry) return null;

  const result = {
    meaning: entry.meaning || entry.briefDefinition || null,
    protoSemitic: entry.protoSemitic || null,
    source: entry.sources?.join(' + ') || 'unified',
    confidence: entry.confidence || 'medium',
    qualityScore: entry.qualityScore || 50,
    scholarlyNotes: entry.scholarlyNotes || null,
    isTheologicallySignificant: entry.isTheological || false
  };

  // Handle cognates object
  const cognates = entry.cognates || {};

  if (cognates.akkadian) {
    result.akkadian = typeof cognates.akkadian === 'string'
      ? { word: cognates.akkadian, meaning: '(cognate)' }
      : cognates.akkadian;
  }

  if (cognates.ugaritic) {
    result.ugaritic = typeof cognates.ugaritic === 'string'
      ? { word: cognates.ugaritic, meaning: '(cognate)' }
      : cognates.ugaritic;
  }

  if (cognates.aramaic) {
    result.aramaic = typeof cognates.aramaic === 'string'
      ? { official: { word: cognates.aramaic, meaning: '(cognate)' } }
      : cognates.aramaic;
  }

  if (cognates.syriac) {
    result.aramaic = result.aramaic || {};
    result.aramaic.syriac = typeof cognates.syriac === 'string'
      ? { word: cognates.syriac, meaning: '(cognate)' }
      : cognates.syriac;
  }

  if (cognates.arabic) {
    result.arabic = typeof cognates.arabic === 'string'
      ? { word: cognates.arabic, meaning: '(cognate)' }
      : cognates.arabic;
  }

  if (cognates.ethiopic || cognates.geez) {
    result.ethiopic = typeof (cognates.ethiopic || cognates.geez) === 'string'
      ? { word: cognates.ethiopic || cognates.geez, meaning: '(cognate)' }
      : (cognates.ethiopic || cognates.geez);
  }

  if (cognates.phoenician) {
    result.phoenician = typeof cognates.phoenician === 'string'
      ? { word: cognates.phoenician, meaning: '(cognate)' }
      : cognates.phoenician;
  }

  if (cognates.moabite) {
    result.moabite = typeof cognates.moabite === 'string'
      ? { word: cognates.moabite, meaning: '(cognate)' }
      : cognates.moabite;
  }

  if (cognates.southArabian || cognates.sabaean) {
    result.southArabian = typeof (cognates.southArabian || cognates.sabaean) === 'string'
      ? { word: cognates.southArabian || cognates.sabaean, meaning: '(cognate)' }
      : (cognates.southArabian || cognates.sabaean);
  }

  // Semantic development
  if (entry.semanticDevelopment) {
    result.semanticDevelopment = entry.semanticDevelopment;
  }

  return result;
};

/**
 * Convert CAL data to standard cognate format
 */
const convertCALToStandard = (calEntry) => {
  if (!calEntry) return null;

  const result = {
    meaning: calEntry.definition || null,
    source: 'CAL',
    confidence: 'high',
    isAramaic: true,
    aramaic: {}
  };

  // Map CAL dialects to our structure
  if (calEntry.dialects?.length > 0) {
    for (const dialect of calEntry.dialects) {
      if (dialect.code === 'JBA') {
        result.aramaic.babylonian = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'JPA') {
        result.aramaic.palestinian = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'Syr') {
        result.aramaic.syriac = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'Tg') {
        result.aramaic.targumic = { word: calEntry.lemma, meaning: calEntry.definition };
      }
    }
  }

  if (calEntry.etymology) {
    result.scholarlyNotes = calEntry.etymology;
  }

  if (calEntry.attestations?.length > 0) {
    result.attestations = calEntry.attestations;
  }

  return result;
};

/**
 * Convert extracted BDB cognates to standard format
 */
const convertBDBToStandard = (bdbEntry) => {
  if (!bdbEntry?.etymology?.cognates) return null;

  const cognates = bdbEntry.etymology.cognates;
  const result = {
    meaning: bdbEntry.briefDefinition || null,
    source: 'BDB (extracted)',
    confidence: bdbEntry.etymology.confidence || 'medium',
    qualityScore: bdbEntry.etymology.qualityScore || 30,
  };

  // Map extracted cognates to standard structure
  if (cognates.akkadian?.length > 0) {
    result.akkadian = {
      word: cognates.akkadian.map(c => c.word).join(', '),
      meaning: '(see BDB)',
      source: 'BDB extraction'
    };
  }

  if (cognates.aramaic?.length > 0) {
    result.aramaic = {
      official: {
        word: cognates.aramaic.map(c => c.word).join(', '),
        meaning: '(cognate)'
      }
    };
  }

  if (cognates.arabic?.length > 0) {
    result.arabic = {
      word: cognates.arabic.map(c => c.word).join(', '),
      meaning: '(cognate)',
      source: 'BDB'
    };
  }

  if (cognates.phoenician?.length > 0) {
    result.phoenician = {
      word: cognates.phoenician.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.ethiopic?.length > 0) {
    result.ethiopic = {
      word: cognates.ethiopic.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.sabean?.length > 0) {
    result.southArabian = {
      word: cognates.sabean.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.moabite?.length > 0) {
    result.moabite = {
      word: cognates.moabite.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.egyptian?.length > 0) {
    result.egyptian = {
      word: cognates.egyptian.map(c => c.word).join(', '),
      meaning: '(cognate)',
      note: 'Possible loanword connection'
    };
  }

  return result;
};

// =============================================================================
// DYNAMIC COGNATE EXTRACTION FROM DICTIONARY DEFINITIONS
// =============================================================================

// Cache for loaded dictionaries
let bdbDictionary = null;
let jastrowDictionary = null;

// =============================================================================
// PRO SCHOLAR V19: PARSE PRE-EXTRACTED COGNATE ARRAYS FROM DICTIONARIES
// =============================================================================

/**
 * Language name normalization map
 * Maps various spellings to our standard language keys
 */
const LANGUAGE_NAME_MAP = {
  'akkadian': 'akkadian',
  'assyrian': 'akkadian',
  'babylonian': 'akkadian',
  'akk': 'akkadian',
  'ugaritic': 'ugaritic',
  'ug': 'ugaritic',
  'phoenician': 'phoenician',
  'phoen': 'phoenician',
  'aramaic': 'aramaic',
  'aram': 'aramaic',
  'targumic': 'aramaic',
  'syriac': 'syriac',
  'syr': 'syriac',
  'arabic': 'arabic',
  'ar': 'arabic',
  'ethiopic': 'ethiopic',
  'geez': 'ethiopic',
  "ge'ez": 'ethiopic',
  'eth': 'ethiopic',
  'sabaean': 'southArabian',
  'sabean': 'southArabian',
  'south arabian': 'southArabian',
  'southarabian': 'southArabian',
  'moabite': 'moabite',
  'egyptian': 'egyptian',
  'greek': 'greek',
  'persian': 'persian',
};

/**
 * Parse a single cognate string like "Akkadian: abu" or "Arabic: أَب"
 * @param {string} cognateStr - The cognate string
 * @returns {{ language: string, word: string } | null}
 */
const parseCognateString = (cognateStr) => {
  if (!cognateStr || typeof cognateStr !== 'string') return null;

  // Pattern: "Language: word" or "Language word" or just "Language: text"
  const colonMatch = cognateStr.match(/^([A-Za-z\s']+):\s*(.+)$/);
  if (colonMatch) {
    const langRaw = colonMatch[1].trim().toLowerCase();
    const word = colonMatch[2].trim();
    const language = LANGUAGE_NAME_MAP[langRaw];

    if (language && word && word.length > 0) {
      // Skip garbage words
      if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return null;
      // Skip very short non-Hebrew words (likely abbreviations)
      if (word.length < 2 && !/[א-ת]/.test(word)) return null;
      // Skip if it's just "Aramaic" or similar without actual word
      if (word.toLowerCase() === langRaw) return null;

      return { language, word };
    }
  }

  // Pattern: "Language word" (space-separated)
  const spaceMatch = cognateStr.match(/^([A-Za-z]+)\s+([א-תa-zA-Z\u0600-\u06FF\u1200-\u137F]+.*)$/);
  if (spaceMatch) {
    const langRaw = spaceMatch[1].trim().toLowerCase();
    const word = spaceMatch[2].trim();
    const language = LANGUAGE_NAME_MAP[langRaw];

    if (language && word && word.length > 1) {
      if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return null;
      return { language, word };
    }
  }

  return null;
};

/**
 * Parse pre-extracted cognate arrays from BDB/Jastrow dictionary entries
 * These are stored as arrays like ["Akkadian: abu", "Arabic: أَب"]
 * @param {string[]} cognatesArray - Array of cognate strings
 * @returns {Object} Structured cognate data
 */
const parseCognateArray = (cognatesArray) => {
  if (!Array.isArray(cognatesArray) || cognatesArray.length === 0) return null;

  const result = {};
  const languageWords = {};

  for (const cognateStr of cognatesArray) {
    const parsed = parseCognateString(cognateStr);
    if (parsed) {
      // Collect words per language
      if (!languageWords[parsed.language]) {
        languageWords[parsed.language] = [];
      }
      // Avoid duplicates
      if (!languageWords[parsed.language].includes(parsed.word)) {
        languageWords[parsed.language].push(parsed.word);
      }
    }
  }

  // Convert to standard structure
  for (const [lang, words] of Object.entries(languageWords)) {
    if (words.length === 0) continue;

    const wordStr = words.slice(0, 3).join(', '); // Max 3 per language

    switch (lang) {
      case 'akkadian':
        result.akkadian = { word: wordStr, meaning: '(cognate)', source: 'dictionary' };
        break;
      case 'ugaritic':
        result.ugaritic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'phoenician':
        result.phoenician = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'aramaic':
        result.aramaic = result.aramaic || {};
        result.aramaic.official = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'syriac':
        result.aramaic = result.aramaic || {};
        result.aramaic.syriac = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'arabic':
        result.arabic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'ethiopic':
        result.ethiopic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'southArabian':
        result.southArabian = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'moabite':
        result.moabite = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'egyptian':
        result.egyptian = { word: wordStr, meaning: '(cognate)', note: 'Possible loanword' };
        break;
      case 'greek':
        result.greek = { word: wordStr, meaning: '(loanword)' };
        break;
      case 'persian':
        result.persian = { word: wordStr, meaning: '(loanword)' };
        break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};

// Words to exclude from cognate extraction (garbage/noise)
const EXCLUDED_COGNATE_WORDS = new Set([
  'compare', 'see', 'cf', 'etc', 'id', 'ib', 'ibid', 'perhaps', 'probably',
  'similar', 'related', 'cognate', 'synonym', 'loan', 'borrowed',
  'verb', 'noun', 'adj', 'adv', 'prep', 'conj', 'interj',
  'the', 'and', 'or', 'but', 'for', 'from', 'with', 'to', 'of', 'in', 'on',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'which', 'who', 'whom',
  'also', 'only', 'even', 'just', 'still', 'yet', 'already',
  'may', 'might', 'can', 'could', 'shall', 'should', 'will', 'would',
  // Short garbage
  'ab', 'ba', 'id', 'aq', 'dl', 'w', 'dw', 'hw',
  // Language names that appear as "word" but shouldn't
  'akkadian', 'assyrian', 'arabic', 'aramaic', 'syriac', 'hebrew',
  'phoenician', 'ugaritic', 'ethiopic', 'geez', 'moabite', 'egyptian',
]);

/**
 * Load BDB dictionary for dynamic cognate extraction
 */
const loadBDBDictionary = async () => {
  if (bdbDictionary) return bdbDictionary;
  try {
    const response = await fetch('/data/bdbComplete.json');
    if (response.ok) {
      const data = await response.json();
      bdbDictionary = data.byWord || data;
      log.debug(`Loaded BDB dictionary: ${Object.keys(bdbDictionary).length} entries`);
    }
  } catch (err) {
    log.warn('Could not load BDB dictionary:', err.message);
    bdbDictionary = {};
  }
  return bdbDictionary;
};

/**
 * Load Jastrow dictionary for dynamic cognate extraction
 */
const loadJastrowDictionary = async () => {
  if (jastrowDictionary) return jastrowDictionary;
  try {
    const response = await fetch('/data/jastrowComplete.json');
    if (response.ok) {
      const data = await response.json();
      jastrowDictionary = data.byWord || data;
      log.debug(`Loaded Jastrow dictionary: ${Object.keys(jastrowDictionary).length} entries`);
    }
  } catch (err) {
    log.warn('Could not load Jastrow dictionary:', err.message);
    jastrowDictionary = {};
  }
  return jastrowDictionary;
};


/**
 * Check if extracted word is a valid cognate (not noise/garbage)
 */
const isValidExtractedCognate = (word) => {
  if (!word || word.length < 2) return false;
  if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return false;
  // Skip if it's just uppercase letters (likely abbreviation)
  if (/^[A-Z]{2,}$/.test(word)) return false;
  // Skip if starts with capital (likely proper name or reference)
  if (/^[A-Z][a-z]/.test(word) && word.length < 4) return false;
  return true;
};

/**
 * Extract cognates dynamically from BDB fullDef text
 * @param {string} fullDef - The full definition text from BDB
 * @returns {Object} Cognate data in standard format
 */
const extractCognatesFromFullDef = (fullDef) => {
  if (!fullDef || fullDef.length < 20) return null;

  const result = {};
  let foundAny = false;

  for (const [lang, patterns] of Object.entries(COGNATE_LANGUAGE_PATTERNS)) {
    const words = new Set();

    for (const pattern of patterns) {
      const matches = fullDef.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const word = match[1]?.trim();
        if (word && isValidExtractedCognate(word)) {
          words.add(word);
        }
      }
    }

    if (words.size > 0) {
      const wordList = Array.from(words).slice(0, 3); // Max 3 per language
      foundAny = true;

      // Map to standard structure
      switch (lang) {
        case 'akkadian':
          result.akkadian = { word: wordList.join(', '), meaning: '(cognate)', source: 'BDB' };
          break;
        case 'ugaritic':
          result.ugaritic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'phoenician':
          result.phoenician = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'aramaic':
          result.aramaic = result.aramaic || {};
          result.aramaic.official = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'syriac':
          result.aramaic = result.aramaic || {};
          result.aramaic.syriac = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'arabic':
          result.arabic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'ethiopic':
          result.ethiopic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'sabaean':
          result.southArabian = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'moabite':
          result.moabite = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'egyptian':
          result.egyptian = { word: wordList.join(', '), meaning: '(cognate)', note: 'Possible loanword' };
          break;
      }
    }
  }

  return foundAny ? result : null;
};

/**
 * PRO SCHOLAR V19: Get cognates from dictionary with enhanced fallback chain
 *
 * Extraction priority:
 * 1. Pre-extracted cognates array (already parsed from definition)
 * 2. Dynamic extraction from fullDef text (regex-based)
 *
 * @param {string} root - The Hebrew/Aramaic root
 * @returns {Promise<Object|null>} Cognate data
 */
const getCognatesFromDictionary = async (root) => {
  const normalized = normalizeRoot(root);
  let combinedCognates = {};
  let foundAny = false;
  let primarySource = null;
  let meaning = null;
  let isAramaic = false;

  // Try BDB first
  const bdb = await loadBDBDictionary();
  const bdbEntry = bdb[normalized];

  if (bdbEntry) {
    meaning = bdbEntry.definition || bdbEntry.gloss;

    // Priority 1: Try pre-extracted cognates array
    if (bdbEntry.cognates && Array.isArray(bdbEntry.cognates)) {
      const parsed = parseCognateArray(bdbEntry.cognates);
      if (parsed && Object.keys(parsed).length > 0) {
        combinedCognates = { ...combinedCognates, ...parsed };
        foundAny = true;
        primarySource = 'BDB';
        log.debug(`Found ${Object.keys(parsed).length} cognates from BDB cognates array for ${normalized}`);
      }
    }

    // Priority 2: Dynamic extraction from fullDef
    if (bdbEntry.fullDef) {
      const extracted = extractCognatesFromFullDef(bdbEntry.fullDef);
      if (extracted && Object.keys(extracted).length > 0) {
        // Merge (don't overwrite existing)
        for (const [lang, data] of Object.entries(extracted)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'BDB';
      }
    }
  }

  // Try Jastrow as additional source
  const jastrow = await loadJastrowDictionary();
  const jastrowEntry = jastrow[normalized];

  if (jastrowEntry) {
    if (!meaning) meaning = jastrowEntry.definition?.slice(0, 100);
    isAramaic = jastrowEntry.isAramaic || false;

    // Priority 1: Try pre-extracted cognates array
    if (jastrowEntry.cognates && Array.isArray(jastrowEntry.cognates)) {
      const parsed = parseCognateArray(jastrowEntry.cognates);
      if (parsed && Object.keys(parsed).length > 0) {
        // Merge (don't overwrite existing)
        for (const [lang, data] of Object.entries(parsed)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'Jastrow';
        log.debug(`Found ${Object.keys(parsed).length} cognates from Jastrow cognates array for ${normalized}`);
      }
    }

    // Priority 2: Dynamic extraction from definition
    if (jastrowEntry.definition) {
      const extracted = extractCognatesFromFullDef(jastrowEntry.definition);
      if (extracted && Object.keys(extracted).length > 0) {
        for (const [lang, data] of Object.entries(extracted)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'Jastrow';
      }
    }
  }

  if (!foundAny) return null;

  return {
    meaning,
    source: `${primarySource} (dynamic)`,
    tier: 3,
    tierName: `Silver (${primarySource})`,
    confidence: 'medium',
    isAramaic,
    ...combinedCognates
  };
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get comparative Semitic data for a root
 * Uses a fallback chain: curated database → extracted BDB → extracted Jastrow → enriched
 * @param {string} root - Hebrew/Aramaic root (3-4 letters)
 * @returns {Object|null} Cognate data with all Semitic attestations
 */
export const getCognates = (root) => {
  if (!root) return null;

  const normalized = normalizeRoot(root);

  // Priority 1: Curated high-quality database
  if (COGNATE_DATABASE[normalized]) {
    return { ...COGNATE_DATABASE[normalized], source: 'curated' };
  }

  // For sync access, return null (use getCognatesAsync for full lookup)
  return null;
};

/**
 * Get comparative Semitic data asynchronously (with multi-source fallback chain)
 *
 * Lookup priority:
 * 1. Curated high-quality database (handcrafted scholarly data)
 * 2. Unified PRO etymology data (merged BDB + Jastrow + curated)
 * 3. CAL Database (for Aramaic terms)
 * 4. Extracted BDB data
 * 5. Extracted Jastrow data
 * 6. Enriched root data
 * 7. Dynamic extraction from BDB/Jastrow fullDef text (NEW - parses definitions for cognates)
 *
 * @param {string} root - Hebrew/Aramaic root (3-4 letters)
 * @param {Object} options - Lookup options
 * @param {boolean} options.includeCAL - Include CAL lookup (slower, async)
 * @returns {Promise<Object|null>} Cognate data
 */
export const getCognatesAsync = async (root, options = {}) => {
  if (!root) return null;

  const normalized = normalizeRoot(root);
  const { includeCAL = true } = options;

  // Priority 1: Curated high-quality database (best quality)
  if (COGNATE_DATABASE[normalized]) {
    log.debug(`Found curated data for ${normalized}`);
    return { ...COGNATE_DATABASE[normalized], source: 'curated', tier: 1, tierName: 'Gold (Academic)' };
  }

  // Priority 2: Unified PRO etymology data
  const unifiedData = await loadUnifiedEtymology();
  if (unifiedData[normalized]) {
    const converted = convertUnifiedToStandard(unifiedData[normalized]);
    if (converted && (converted.protoSemitic || Object.keys(converted).length > 3)) {
      log.debug(`Found unified PRO data for ${normalized}`);
      return { ...converted, tier: 1, tierName: 'Gold (Academic)' };
    }
  }

  // Priority 3: CAL Database (excellent for Aramaic)
  if (includeCAL) {
    try {
      const calData = await lookupCAL(normalized);
      if (calData) {
        const converted = convertCALToStandard(calData);
        if (converted) {
          log.debug(`Found CAL data for ${normalized}`);
          return { ...converted, tier: 1, tierName: 'Gold (CAL)' };
        }
      }
    } catch (err) {
      log.debug(`CAL lookup failed for ${normalized}:`, err.message);
    }
  }

  // Priority 4: Extracted BDB data
  const bdbData = await loadExtractedBDB();
  if (bdbData[normalized]) {
    const converted = convertBDBToStandard(bdbData[normalized]);
    if (converted && Object.keys(converted).length > 2) {
      log.debug(`Found BDB extracted data for ${normalized}`);
      return { ...converted, source: 'BDB-extracted', tier: 2, tierName: 'Silver (BDB)' };
    }
  }

  // Priority 5: Extracted Jastrow data (for Aramaic/Talmudic)
  const jastrowData = await loadExtractedJastrow();
  if (jastrowData[normalized]) {
    const entry = jastrowData[normalized];
    const converted = convertBDBToStandard({
      etymology: entry.etymology,
      briefDefinition: entry.definition
    });
    if (converted) {
      log.debug(`Found Jastrow data for ${normalized}`);
      return { ...converted, source: 'Jastrow-extracted', tier: 2, tierName: 'Silver (Jastrow)' };
    }
  }

  // Priority 6: Enriched root data
  const enrichedData = await loadEnrichedRoots();
  if (enrichedData[normalized]?.etymology?.cognates) {
    const entry = enrichedData[normalized];
    const converted = convertBDBToStandard({ etymology: entry.etymology });
    if (converted) {
      log.debug(`Found enriched data for ${normalized}`);
      return { ...converted, source: 'enriched', tier: 3, tierName: 'Bronze (Enriched)' };
    }
  }

  // Priority 7: Dynamic extraction from dictionary fullDef (NEW!)
  // This parses BDB/Jastrow definitions to find cognate references
  const dynamicData = await getCognatesFromDictionary(normalized);
  if (dynamicData && Object.keys(dynamicData).length > 2) {
    log.debug(`Found dynamic cognate data for ${normalized}`);
    return { ...dynamicData, tier: 3, tierName: 'Bronze (Dictionary)' };
  }

  log.debug(`No cognate data found for ${normalized}`);
  return null;
};

/**
 * Get cognates with sync CAL fallback (for when you already have sync CAL data)
 */
export const getCognatesWithCALSync = (root) => {
  if (!root) return null;
  const normalized = normalizeRoot(root);

  // Check curated first
  if (COGNATE_DATABASE[normalized]) {
    return { ...COGNATE_DATABASE[normalized], source: 'curated', tier: 1 };
  }

  // Check CAL sync cache
  const calData = lookupCALSync(normalized);
  if (calData) {
    const converted = convertCALToStandard(calData);
    if (converted) {
      return { ...converted, tier: 1, tierName: 'Gold (CAL)' };
    }
  }

  return null;
};

/**
 * Check if we have cognate data for a root (sync - curated only)
 */
export const hasCognates = (root) => {
  return getCognates(root) !== null;
};

/**
 * Check if we have any cognate data (async - includes extracted)
 */
export const hasCognatesAsync = async (root) => {
  return (await getCognatesAsync(root)) !== null;
};

/**
 * Get total number of roots with cognate data (multi-source)
 */
export const getCognateStats = async () => {
  const unifiedData = await loadUnifiedEtymology();
  const bdbData = await loadExtractedBDB();
  const jastrowData = await loadExtractedJastrow();
  const enrichedData = await loadEnrichedRoots();

  const curatedCount = Object.keys(COGNATE_DATABASE).length;

  // Count unified entries with actual cognate data
  const unifiedCount = Object.keys(unifiedData).filter(k => {
    const entry = unifiedData[k];
    return entry?.cognates && Object.keys(entry.cognates).length > 0;
  }).length;

  const bdbCount = Object.keys(bdbData).filter(k =>
    bdbData[k]?.etymology?.cognates &&
    Object.keys(bdbData[k].etymology.cognates).length > 0
  ).length;

  const jastrowCount = Object.keys(jastrowData).filter(k =>
    jastrowData[k]?.etymology?.cognates
  ).length;

  const enrichedCount = Object.keys(enrichedData).filter(k =>
    enrichedData[k]?.etymology?.cognates
  ).length;

  // Calculate unique roots across all sources
  const allRoots = new Set([
    ...Object.keys(COGNATE_DATABASE),
    ...Object.keys(unifiedData).filter(k => unifiedData[k]?.cognates),
    ...Object.keys(bdbData).filter(k => bdbData[k]?.etymology?.cognates),
    ...Object.keys(jastrowData).filter(k => jastrowData[k]?.etymology),
    ...Object.keys(enrichedData).filter(k => enrichedData[k]?.etymology?.cognates)
  ]);

  return {
    curated: curatedCount,
    unified: unifiedCount,
    bdbExtracted: bdbCount,
    jastrowExtracted: jastrowCount,
    enriched: enrichedCount,
    totalUnique: allRoots.size,
    coverage: {
      tier1_gold: curatedCount + unifiedCount, // Academic quality
      tier2_silver: bdbCount + jastrowCount,   // Dictionary extracted
      tier3_bronze: enrichedCount               // Enriched/reference
    },
    sources: {
      curated: curatedCount,
      unified: unifiedCount,
      bdb: bdbCount,
      jastrow: jastrowCount,
      enriched: enrichedCount
    }
  };
};

/**
 * Get all roots in a specific semantic category
 * @param {string} category - 'theological', 'verbs', 'bodyParts', etc.
 * @returns {string[]} List of roots
 */
export const getRootsByCategory = (category) => {
  const categories = {
    theological: ['אל', 'ברא', 'קדש', 'שמע'],
    verbs: ['נפק', 'אמר', 'עבד', 'יצא', 'מלך', 'כתב', 'שמע'],
    bodyParts: ['יד', 'לב'],
    nature: ['שמש'],
    kinship: ['אב', 'אם', 'בן']
  };

  return categories[category] || [];
};

/**
 * Format cognate data for display
 * @param {Object} cognateData - Data from getCognates()
 * @returns {Object} Formatted for UI display
 */
export const formatCognatesForDisplay = (cognateData) => {
  if (!cognateData) return null;

  const languages = [];

  // Akkadian - East Semitic
  if (cognateData.akkadian) {
    languages.push({
      language: 'Akkadian',
      script: 'Cuneiform',
      branch: 'East Semitic',
      word: cognateData.akkadian.word,
      meaning: cognateData.akkadian.meaning,
      period: cognateData.akkadian.period,
      note: cognateData.akkadian.note,
      flag: '🏛️'
    });
  }

  // Ugaritic - Northwest Semitic
  if (cognateData.ugaritic) {
    languages.push({
      language: 'Ugaritic',
      script: 'Cuneiform Alphabet',
      branch: 'Northwest Semitic',
      word: cognateData.ugaritic.word,
      meaning: cognateData.ugaritic.meaning,
      flag: '📜'
    });
  }

  // Phoenician - Northwest Semitic
  if (cognateData.phoenician) {
    languages.push({
      language: 'Phoenician',
      script: 'Phoenician Alphabet',
      branch: 'Northwest Semitic (Canaanite)',
      word: cognateData.phoenician.word,
      meaning: cognateData.phoenician.meaning,
      flag: '⚓'
    });
  }

  // Moabite - Northwest Semitic (Canaanite)
  if (cognateData.moabite) {
    languages.push({
      language: 'Moabite',
      script: 'Phoenician Alphabet',
      branch: 'Northwest Semitic (Canaanite)',
      word: cognateData.moabite.word,
      meaning: cognateData.moabite.meaning,
      note: 'Mesha Stele',
      flag: '🪨'
    });
  }

  // Aramaic dialects
  if (cognateData.aramaic) {
    // Official/Imperial Aramaic
    if (cognateData.aramaic.official) {
      languages.push({
        language: 'Imperial Aramaic',
        script: 'Aramaic',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.official.word,
        meaning: cognateData.aramaic.official.meaning,
        period: 'Persian Period',
        flag: '🏺'
      });
    }

    // Syriac
    if (cognateData.aramaic.syriac) {
      languages.push({
        language: 'Syriac',
        script: 'Syriac',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.syriac.word,
        meaning: cognateData.aramaic.syriac.meaning,
        flag: '✝️'
      });
    }

    // Jewish Babylonian Aramaic
    if (cognateData.aramaic.babylonian) {
      languages.push({
        language: 'Jewish Babylonian Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.babylonian.word,
        meaning: cognateData.aramaic.babylonian.meaning,
        period: 'Talmudic',
        flag: '📚'
      });
    }

    // Jewish Palestinian Aramaic
    if (cognateData.aramaic.palestinian) {
      languages.push({
        language: 'Jewish Palestinian Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.palestinian.word,
        meaning: cognateData.aramaic.palestinian.meaning,
        period: 'Talmudic',
        flag: '🏛️'
      });
    }

    // Targumic
    if (cognateData.aramaic.targumic) {
      languages.push({
        language: 'Targumic Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.targumic.word,
        meaning: cognateData.aramaic.targumic.meaning,
        flag: '📖'
      });
    }

    // Mandaic
    if (cognateData.aramaic.mandaic) {
      languages.push({
        language: 'Mandaic',
        script: 'Mandaic',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.mandaic.word,
        meaning: cognateData.aramaic.mandaic.meaning,
        flag: '☀️'
      });
    }
  }

  // Arabic - Central Semitic
  if (cognateData.arabic) {
    languages.push({
      language: 'Arabic',
      script: 'Arabic',
      branch: 'Central Semitic',
      word: cognateData.arabic.word,
      meaning: cognateData.arabic.meaning,
      root: cognateData.arabic.root,
      note: cognateData.arabic.note,
      flag: '🕌'
    });
  }

  // Ethiopic/Ge'ez - South Semitic
  if (cognateData.ethiopic) {
    languages.push({
      language: "Ge'ez (Ethiopic)",
      script: 'Ethiopic',
      branch: 'South Semitic',
      word: cognateData.ethiopic.word,
      meaning: cognateData.ethiopic.meaning,
      flag: '⛪'
    });
  }

  // South Arabian - South Semitic
  if (cognateData.southArabian) {
    languages.push({
      language: 'Old South Arabian',
      script: 'South Arabian',
      branch: 'South Semitic',
      word: cognateData.southArabian.word,
      meaning: cognateData.southArabian.meaning,
      note: 'Sabaean, Minaic',
      flag: '🏜️'
    });
  }

  // Egyptian (loanword connection)
  if (cognateData.egyptian) {
    languages.push({
      language: 'Egyptian',
      script: 'Hieroglyphic/Demotic',
      branch: 'Afroasiatic (non-Semitic)',
      word: cognateData.egyptian.word,
      meaning: cognateData.egyptian.meaning,
      note: cognateData.egyptian.note || 'Possible loanword',
      flag: '🏺',
      isLoanword: true
    });
  }

  return {
    protoSemitic: cognateData.protoSemitic,
    coreMeaning: cognateData.meaning,
    languages,
    semanticDevelopment: cognateData.semanticDevelopment || [],
    scholarlyNotes: cognateData.scholarlyNotes,
    isTheologicallySignificant: cognateData.isTheologicallySignificant || false,
    isAramaic: cognateData.isAramaic || false,
    source: cognateData.source,
    tier: cognateData.tier,
    tierName: cognateData.tierName
  };
};

/**
 * Get a brief cognate summary for inline display
 * @param {string} root - Root to summarize
 * @returns {string|null} Brief summary
 */
export const getCognateSummary = (root) => {
  const data = getCognates(root);
  if (!data) return null;

  const parts = [`PS *${data.protoSemitic?.replace('*', '') || '?'}`];

  if (data.akkadian) parts.push(`Akk. ${data.akkadian.word}`);
  if (data.arabic) parts.push(`Ar. ${data.arabic.word}`);
  if (data.aramaic?.syriac) parts.push(`Syr. ${data.aramaic.syriac.word}`);

  return parts.join('; ');
};

// =============================================================================
// EXPORTS
// =============================================================================

const comparativeSemiticService = {
  COGNATE_DATABASE,
  getCognates,
  getCognatesAsync,
  getCognatesWithCALSync,
  hasCognates,
  hasCognatesAsync,
  getCognateStats,
  getRootsByCategory,
  formatCognatesForDisplay,
  getCognateSummary,
  // Data loaders for direct access
  loadUnifiedEtymology,
  loadExtractedBDB,
  loadExtractedJastrow,
  loadEnrichedRoots
};

export default comparativeSemiticService;
