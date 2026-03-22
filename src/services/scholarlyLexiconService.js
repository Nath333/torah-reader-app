// =============================================================================
// Scholarly Lexicon Service
// Academic-grade Hebrew/Aramaic dictionary with multiple scholarly sources
// Integrates: BDB, Jastrow, Strong's, Klein Etymology, Gesenius, HALOT refs
// =============================================================================

import { createCache } from '../utils/cache';
import { cleanHtml } from '../utils/sanitize';
import { fetchWithFallback } from '../utils/http';
import { cleanHebrewWord } from '../utils/hebrewUtils';
import { analyzeWord as analyzeGrammar, extractRoot as extractGrammarRoot } from './grammarAnalysisService';
import { createLogger } from '../utils/debug';
// Import halachic overrides for context-specific translations
import { HALACHIC_OVERRIDE } from '../utils/commentaryUtils';
// Import shared morphology constants for prefix/suffix handling
import {
  HEBREW_PREFIXES_ORDERED,
  HEBREW_SUFFIXES_ORDERED
} from '../constants/morphology';

const log = createLogger('ScholarlyLexicon');

// =============================================================================
// LOCAL DICTIONARY DATA (Offline-First)
// Combined: ~42,000 entries for instant lookups without API calls
// - Jastrow: 25,224 entries (Aramaic/Rabbinic Hebrew - Talmud, Midrash)
// - BDB: 8,050 Strong's numbers / 6,000 unique words (Biblical Hebrew)
// - Strong's: 8,674 Strong's numbers / 6,242 unique words (Concordance)
// Sources: openscriptures/strongs (CC-BY-SA), eliranwong/unabridged-BDB (PD)
// =============================================================================

// Local dictionary state
const localDictionaries = {
  jastrow: { data: null, loading: false, promise: null, count: 0 },
  bdb: { data: null, loading: false, promise: null, count: 0 },
  strongs: { data: null, loading: false, promise: null, count: 0 }
};

// Track preload status
let preloadStarted = false;
let preloadComplete = false;

/**
 * Load a local dictionary file
 * @param {string} name - Dictionary name (jastrow, bdb, strongs)
 * @param {string} filename - JSON filename
 * @param {function} parser - Optional parser for data structure
 */
const loadLocalDictionary = async (name, filename, parser = null) => {
  const dict = localDictionaries[name];
  if (dict.data) return dict.data;
  if (dict.loading) return dict.promise;

  dict.loading = true;
  dict.promise = (async () => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL || ''}/data/${filename}`);
      if (response.ok) {
        const raw = await response.json();
        dict.data = parser ? parser(raw) : raw;
        dict.count = Object.keys(dict.data).length;
        log.debug(`${name}: Loaded ${dict.count} local entries`);
      }
    } catch (e) {
      log.warn(`${name}: Could not load local dictionary:`, e.message);
    }
    dict.loading = false;
    return dict.data;
  })();

  return dict.promise;
};

/**
 * Load local Jastrow dictionary (Aramaic/Rabbinic Hebrew)
 * 25,224 entries - best for Talmud, Midrash, Targumim
 */
const loadLocalJastrow = () => loadLocalDictionary('jastrow', 'jastrowComplete.json');

/**
 * Load local BDB dictionary (Brown-Driver-Briggs)
 * 8,050 Strong's numbers / 6,000 unique words - best for Biblical Hebrew
 * Source: eliranwong/unabridged-BDB-Hebrew-lexicon (Public Domain)
 */
const loadLocalBDB = () => loadLocalDictionary('bdb', 'bdbComplete.json',
  (raw) => raw.byWord || raw
);

/**
 * Load local Strong's dictionary
 * 8,674 Strong's numbers / 6,242 unique words - Strong's Concordance
 * Source: openscriptures/strongs (CC-BY-SA)
 */
const loadLocalStrongs = () => loadLocalDictionary('strongs', 'strongsComplete.json',
  (raw) => raw.byWord || raw
);

/**
 * Preload ALL local dictionaries at app startup
 * Call this early in app initialization for instant lookups
 * @returns {Promise<object>} Stats about loaded dictionaries
 */
export const preloadDictionaries = async () => {
  if (preloadComplete) {
    return getDictionaryStats();
  }

  if (preloadStarted) {
    // Wait for existing preload to complete
    await Promise.all([
      localDictionaries.jastrow.promise,
      localDictionaries.bdb.promise,
      localDictionaries.strongs.promise
    ].filter(Boolean));
    return getDictionaryStats();
  }

  preloadStarted = true;
  log.debug('Preloading local dictionaries...');

  const startTime = Date.now();

  // Load all dictionaries in parallel
  await Promise.all([
    loadLocalJastrow(),
    loadLocalBDB(),
    loadLocalStrongs()
  ]);

  preloadComplete = true;
  const loadTime = Date.now() - startTime;
  const stats = getDictionaryStats();

  log.debug(`Dictionaries preloaded in ${loadTime}ms: ${stats.totalEntries} total entries`);

  return stats;
};

/**
 * Get statistics about loaded dictionaries
 */
export const getDictionaryStats = () => ({
  jastrow: { loaded: !!localDictionaries.jastrow.data, entries: localDictionaries.jastrow.count },
  bdb: { loaded: !!localDictionaries.bdb.data, entries: localDictionaries.bdb.count },
  strongs: { loaded: !!localDictionaries.strongs.data, entries: localDictionaries.strongs.count },
  totalEntries: localDictionaries.jastrow.count + localDictionaries.bdb.count + localDictionaries.strongs.count,
  preloadComplete
});

// cleanWordForLookup - use cleanHebrewWord from ../utils/hebrewUtils
const cleanWordForLookup = cleanHebrewWord;

// Use shared morphology constants for prefix/suffix analysis
// HEBREW_PREFIXES_ORDERED and HEBREW_SUFFIXES_ORDERED imported from morphology.js

/**
 * Extract cross-reference target from Jastrow definition
 * Examples: "v. נוֹמִי" → "נומי", "= שַׁבָּת" → "שבת"
 * @param {string} definition - Raw Jastrow definition
 * @returns {string|null} - Target word (without vowels) or null
 */
const extractJastrowCrossRef = (definition) => {
  if (!definition || typeof definition !== 'string') return null;

  // Pattern: "v. [Hebrew word]" or "= [Hebrew word]" or ", v. [word]"
  // The Hebrew word may have vowel points
  const patterns = [
    /\bv\.\s*([\u0590-\u05FF\u05B0-\u05C7]+)/i,  // v. נוֹמִי
    /^=\s*([\u0590-\u05FF\u05B0-\u05C7]+)/,       // = שַׁבָּת
    /^same\s+as\s+([\u0590-\u05FF\u05B0-\u05C7]+)/i,
  ];

  for (const pattern of patterns) {
    const match = definition.match(pattern);
    if (match && match[1]) {
      // Strip vowel points (nikud) to get plain consonants
      return match[1].replace(/[\u05B0-\u05C7]/g, '');
    }
  }
  return null;
};

/**
 * Lookup word in local Jastrow dictionary with scholarly morphological analysis
 * Handles prefixes, suffixes, final letters, verb patterns (binyanim)
 * NOW FOLLOWS CROSS-REFERENCES: "v. נוֹמִי" → looks up נומי
 * @param {string} word - Hebrew/Aramaic word
 * @returns {object|null} - Local Jastrow entry with morphological match info
 */
const lookupLocalJastrow = async (word, _depth = 0) => {
  // Prevent infinite recursion on cross-references
  if (_depth > 3) return null;

  const data = await loadLocalJastrow();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Normalize final letters (sofit → regular form)
  const normalizeFinals = (w) => w
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ץ/g, 'צ')
    .replace(/ף/g, 'פ')
    .replace(/ך/g, 'כ');

  // Try to find entry in dictionary with normalization
  const tryLookup = (form) => {
    if (!form || form.length < 2) return null;
    if (data[form]) return { entry: data[form], matchedForm: form };
    const normalized = normalizeFinals(form);
    if (normalized !== form && data[normalized]) {
      return { entry: data[normalized], matchedForm: normalized };
    }
    return null;
  };

  // Helper: Check if entry is a cross-reference and follow it
  const followCrossRefIfNeeded = async (entry, matchedForm, matchType) => {
    if (!entry || !entry.definition) return null;

    // Check if definition is a cross-reference
    const targetWord = extractJastrowCrossRef(entry.definition);
    if (targetWord && targetWord !== cleaned && targetWord !== matchedForm) {
      // Recursively look up the target word
      const resolved = await lookupLocalJastrow(targetWord, _depth + 1);
      if (resolved && resolved.definition) {
        return {
          ...resolved,
          _originalWord: word,
          _crossRefFrom: matchedForm,
          _crossRefTo: targetWord,
          _matchType: matchType + '-crossref'
        };
      }
    }

    // Not a cross-reference, return original
    return { ...entry, _matchedForm: matchedForm, _matchType: matchType };
  };

  // 1. Direct lookup (exact match)
  let result = tryLookup(cleaned);
  if (result) {
    const resolved = await followCrossRefIfNeeded(result.entry, result.matchedForm, 'exact');
    if (resolved) return resolved;
  }

  // 2. Try stripping prefixes (ו, ה, ב, ל, מ, כ, ש, etc.)
  for (const prefix of HEBREW_PREFIXES_ORDERED) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 1) {
      const stem = cleaned.slice(prefix.length);
      result = tryLookup(stem);
      if (result) {
        return {
          ...result.entry,
          _matchedForm: result.matchedForm,
          _strippedPrefix: prefix,
          _matchType: 'prefix-stripped'
        };
      }
    }
  }

  // 3. Try stripping suffixes (ים, ות, ין, etc.)
  for (const suffix of HEBREW_SUFFIXES_ORDERED) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      const stem = cleaned.slice(0, -suffix.length);
      result = tryLookup(stem);
      if (result) {
        return {
          ...result.entry,
          _matchedForm: result.matchedForm,
          _strippedSuffix: suffix,
          _matchType: 'suffix-stripped'
        };
      }
      // For feminine plural (ות), try singular with ה
      if (suffix === 'ות') {
        result = tryLookup(stem + 'ה');
        if (result) {
          return {
            ...result.entry,
            _matchedForm: result.matchedForm,
            _strippedSuffix: suffix,
            _matchType: 'plural-to-singular'
          };
        }
      }
    }
  }

  // 4. Try stripping BOTH prefix AND suffix
  for (const prefix of HEBREW_PREFIXES_ORDERED) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 2) {
      const afterPrefix = cleaned.slice(prefix.length);
      for (const suffix of HEBREW_SUFFIXES_ORDERED) {
        if (afterPrefix.endsWith(suffix) && afterPrefix.length > suffix.length + 2) {
          const stem = afterPrefix.slice(0, -suffix.length);
          result = tryLookup(stem);
          if (result) {
            return {
              ...result.entry,
              _matchedForm: result.matchedForm,
              _strippedPrefix: prefix,
              _strippedSuffix: suffix,
              _matchType: 'prefix-suffix-stripped'
            };
          }
        }
      }
    }
  }

  // 5. Verb pattern (binyan) analysis
  // Nif'al pattern: נשמר → שמר (passive/reflexive)
  if (cleaned.startsWith('נ') && cleaned.length >= 4) {
    result = tryLookup(cleaned.slice(1));
    if (result) {
      return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'nifal-root' };
    }
  }

  // Hif'il pattern: הגדיל → גדל (causative)
  if (cleaned.startsWith('ה') && cleaned.length >= 4) {
    const withoutHeh = cleaned.slice(1);
    result = tryLookup(withoutHeh);
    if (result) {
      return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'hifil-stripped' };
    }
    // Remove internal yod: הגדיל → גדל
    if (withoutHeh.length >= 4 && withoutHeh[1] === 'י') {
      const root = withoutHeh[0] + withoutHeh.slice(2);
      result = tryLookup(root);
      if (result) {
        return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'hifil-root' };
      }
    }
  }

  // Hitpa'el pattern: התגדל → גדל (reflexive)
  if (cleaned.startsWith('הת') && cleaned.length >= 5) {
    result = tryLookup(cleaned.slice(2));
    if (result) {
      return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'hitpael-root' };
    }
  }

  // Pi'el doubled middle letter: גדל → גידל (intensive)
  if (cleaned.length >= 4 && cleaned[1] === 'י') {
    const root = cleaned[0] + cleaned.slice(2);
    result = tryLookup(root);
    if (result) {
      return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'piel-root' };
    }
  }

  return null;
};

/**
 * Lookup word in local BDB dictionary (Brown-Driver-Briggs)
 * Best for Biblical Hebrew - scholarly definitions with references
 * @param {string} word - Hebrew word
 * @returns {object|null} - BDB entry or null
 */
const lookupLocalBDB = async (word) => {
  const data = await loadLocalBDB();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Normalize final letters
  const normalizeFinals = (w) => w
    .replace(/ם/g, 'מ').replace(/ן/g, 'נ')
    .replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');

  const tryLookup = (form) => {
    if (!form || form.length < 2) return null;
    if (data[form]) return data[form];
    const normalized = normalizeFinals(form);
    if (normalized !== form && data[normalized]) return data[normalized];
    return null;
  };

  // Direct lookup
  let result = tryLookup(cleaned);
  if (result) {
    return {
      ...result,
      source: 'BDB',
      _matchType: 'exact'
    };
  }

  // Try stripping common prefixes
  for (const prefix of ['ו', 'ה', 'ב', 'ל', 'מ', 'כ']) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 1) {
      result = tryLookup(cleaned.slice(prefix.length));
      if (result) {
        return { ...result, source: 'BDB', _matchType: 'prefix-stripped', _strippedPrefix: prefix };
      }
    }
  }

  return null;
};

/**
 * Lookup word in local Strong's dictionary
 * Returns Strong's number and concise definition
 * @param {string} word - Hebrew word
 * @returns {object|null} - Strong's entry or null
 */
const lookupLocalStrongs = async (word) => {
  const data = await loadLocalStrongs();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Normalize final letters
  const normalizeFinals = (w) => w
    .replace(/ם/g, 'מ').replace(/ן/g, 'נ')
    .replace(/ץ/g, 'צ').replace(/ף/g, 'פ').replace(/ך/g, 'כ');

  const tryLookup = (form) => {
    if (!form || form.length < 2) return null;
    if (data[form]) return data[form];
    const normalized = normalizeFinals(form);
    if (normalized !== form && data[normalized]) return data[normalized];
    return null;
  };

  // Direct lookup
  let result = tryLookup(cleaned);
  if (result) {
    return {
      ...result,
      source: "Strong's",
      _matchType: 'exact'
    };
  }

  // Try stripping common prefixes
  for (const prefix of ['ו', 'ה', 'ב', 'ל', 'מ', 'כ']) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 1) {
      result = tryLookup(cleaned.slice(prefix.length));
      if (result) {
        return { ...result, source: "Strong's", _matchType: 'prefix-stripped', _strippedPrefix: prefix };
      }
    }
  }

  return null;
};

/**
 * UNIFIED LOCAL LOOKUP - Searches ALL local dictionaries
 * Priority: Jastrow (Aramaic) → BDB (Biblical) → Strong's (concordance)
 * Returns first match with source attribution
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object|null>} Combined result from best matching dictionary
 */
// Patterns for cross-reference-only definitions that aren't actual definitions
const CROSS_REF_PATTERNS = [
  /^\s*\(?preced\.?\)?\.?\s*$/i,             // "preced.)" = see preceding
  /^\s*\(?foll\.?\)?\.?\s*$/i,               // "foll.)" = see following
  /^\s*\(?see\s+preced\.?\)?\.?\s*$/i,       // "see preced."
  /^\s*\(?see\s+foll\.?\)?\.?\s*$/i,         // "see foll."
  /^\s*\(?v\.\s*\w+\.?\)?\.?\s*$/i,          // "v. word" = see word
  /^\s*\(?ib\.?\)?\.?\s*$/i,                 // "ib." = ibidem
  /^\s*\(?same\.?\)?\.?\s*$/i,               // "same."
  /^\s*\(?id\.?\)?\.?\s*$/i,                 // "id." = idem
  /^\s*\)?\s*$/,                              // Just orphan parenthesis
  /^\s*[[\]()]+\s*$/,                          // Just brackets/parens
];

/**
 * Check if a definition is just a cross-reference (not a real definition)
 */
const isCrossReferenceOnly = (text) => {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return CROSS_REF_PATTERNS.some(pattern => pattern.test(trimmed));
};

export const lookupLocalDictionaries = async (word) => {
  if (!word || word.length < 2) return null;

  // Ensure dictionaries are loaded (parallel load if not already)
  await Promise.all([loadLocalJastrow(), loadLocalBDB(), loadLocalStrongs()]);

  // Collect all results, then pick the best one
  const results = [];

  // Try Jastrow (good for Talmudic/Aramaic content)
  const jastrowResult = await lookupLocalJastrow(word);
  if (jastrowResult && jastrowResult.definition && !isCrossReferenceOnly(jastrowResult.definition)) {
    results.push({
      word,
      definition: jastrowResult.definition,
      lemma: jastrowResult.lemma || jastrowResult.key,
      pos: jastrowResult.pos,
      isAramaic: jastrowResult.isAramaic,
      source: 'Jastrow',
      sourceFullName: "Jastrow's Dictionary of Targumim, Talmud and Midrashic Literature",
      _matchType: jastrowResult._matchType,
      _matchedForm: jastrowResult._matchedForm,
      _local: true,
      _priority: jastrowResult._matchType === 'exact' ? 1 : 2
    });
  }

  // Try BDB (best for Biblical Hebrew)
  const bdbResult = await lookupLocalBDB(word);
  if (bdbResult && (bdbResult.definition || bdbResult.fullDef) && !isCrossReferenceOnly(bdbResult.definition || bdbResult.fullDef)) {
    results.push({
      word,
      definition: bdbResult.definition || bdbResult.fullDef,
      lemma: bdbResult.lemma || bdbResult.key,
      pos: bdbResult.pos,
      strongs: bdbResult.strongs,
      source: 'BDB',
      sourceFullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
      _matchType: bdbResult._matchType,
      _local: true,
      _priority: bdbResult._matchType === 'exact' ? 0 : 1 // BDB gets priority for Biblical Hebrew
    });
  }

  // Try Strong's (good for concordance lookups)
  const strongsResult = await lookupLocalStrongs(word);
  if (strongsResult && (strongsResult.definition || strongsResult.gloss) && !isCrossReferenceOnly(strongsResult.definition || strongsResult.gloss)) {
    results.push({
      word,
      definition: strongsResult.definition || strongsResult.gloss,
      lemma: strongsResult.lemma || strongsResult.key,
      pos: strongsResult.pos,
      strongs: strongsResult.strongs,
      transliteration: strongsResult.xlit,
      etymology: strongsResult.etymology,
      source: "Strong's",
      sourceFullName: "Strong's Exhaustive Concordance",
      _matchType: strongsResult._matchType,
      _local: true,
      _priority: strongsResult._matchType === 'exact' ? 1 : 2
    });
  }

  // Return the best result (lowest priority number = best)
  if (results.length === 0) return null;
  results.sort((a, b) => a._priority - b._priority);
  return results[0];
};

/**
 * Lookup ALL local dictionaries and return ALL results (not just the best)
 * Used to provide comprehensive multi-source data for scholarly apps
 * Enhanced: Also tries Aramaic variants for Talmudic context
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object>} Object with jastrow, bdb, strongs, jastrowAlt (Aramaic variant)
 */
const lookupAllLocalDictionaries = async (word) => {
  const results = { jastrow: null, bdb: null, strongs: null, jastrowAlt: null };

  // Common Aramaic suffixes to try for Hebrew words (Talmudic Aramaic forms)
  const ARAMAIC_SUFFIXES = ['א', 'תא', 'ותא', 'יא'];

  // Try Jastrow
  try {
    const jastrowResult = await lookupLocalJastrow(word);
    if (jastrowResult && jastrowResult.definition && !isCrossReferenceOnly(jastrowResult.definition)) {
      results.jastrow = {
        headword: jastrowResult.lemma || jastrowResult._matchedForm || word,
        parent_lexicon: 'Jastrow Dictionary',
        content: jastrowResult.definition,
        short_definition: jastrowResult.definition,
        _isLocal: true,
        _ref: jastrowResult.ref,
        _matchType: jastrowResult._matchType,
        // Copy morphological metadata for strictHeadwordFilter
        _strippedPrefix: jastrowResult._strippedPrefix,
        _strippedSuffix: jastrowResult._strippedSuffix,
        _matchedForm: jastrowResult._matchedForm
      };

      // If the Hebrew definition seems limited (e.g., "poverty" for רשות),
      // also try Aramaic variants which may have richer Talmudic meanings
      // Examples: רשות → רשותא (domain), מלאכה → מלאכתא (labor)
      for (const suffix of ARAMAIC_SUFFIXES) {
        const aramaicForm = word + suffix;
        const altResult = await lookupLocalJastrow(aramaicForm);
        if (altResult && altResult.definition &&
            altResult.definition !== jastrowResult.definition &&
            !isCrossReferenceOnly(altResult.definition)) {
          results.jastrowAlt = {
            headword: altResult.lemma || altResult._matchedForm || aramaicForm,
            parent_lexicon: 'Jastrow (Aramaic)',
            content: altResult.definition,
            short_definition: altResult.definition,
            _isLocal: true,
            _ref: altResult.ref,
            _matchType: 'aramaic-variant',
            _hebrewForm: word
          };
          break; // Found a good Aramaic variant
        }
      }
    }
  } catch (e) { /* silent */ }

  // Try BDB
  try {
    const bdbResult = await lookupLocalBDB(word);
    if (bdbResult && (bdbResult.definition || bdbResult.fullDef) && !isCrossReferenceOnly(bdbResult.definition || bdbResult.fullDef)) {
      results.bdb = {
        headword: bdbResult.lemma || word,
        parent_lexicon: 'BDB',
        content: bdbResult.definition || bdbResult.fullDef,
        short_definition: bdbResult.definition || bdbResult.fullDef,
        strong_number: bdbResult.strongs,
        _isLocal: true,
        _matchType: bdbResult._matchType
      };
    }
  } catch (e) { /* silent */ }

  // Try Strong's
  try {
    const strongsResult = await lookupLocalStrongs(word);
    if (strongsResult && (strongsResult.definition || strongsResult.gloss) && !isCrossReferenceOnly(strongsResult.definition || strongsResult.gloss)) {
      results.strongs = {
        headword: strongsResult.lemma || word,
        parent_lexicon: "Strong's",
        content: strongsResult.definition || strongsResult.gloss,
        short_definition: strongsResult.definition || strongsResult.gloss,
        strong_number: strongsResult.strongs,
        transliteration: strongsResult.xlit,
        _isLocal: true,
        _matchType: strongsResult._matchType
      };
    }
  } catch (e) { /* silent */ }

  return results;
};

// Environment check
const IS_DEV = process.env.NODE_ENV === 'development';

// Use local proxy in development to avoid CORS issues
const SEFARIA_BASE = IS_DEV
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// CAL (Comprehensive Aramaic Lexicon) configuration
// Development: local proxy | Production: CORS proxy via allorigins.win
const CAL_DIRECT_URL = 'https://cal.huc.edu';
const CAL_CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * Build CAL URL with CORS proxy support for production
 */
const buildCALUrl = (endpoint) => {
  if (IS_DEV) {
    return `/cal-api${endpoint}`;
  }
  return `${CAL_CORS_PROXY}${encodeURIComponent(`${CAL_DIRECT_URL}${endpoint}`)}`;
};

/**
 * Clean definition text - removes HTML, scholarly notation, and normalizes
 * Enhanced to handle Jastrow and other scholarly dictionary notation
 * @param {string} text - Raw definition text
 * @returns {string} - Cleaned text
 */
const cleanDefinitionText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // First strip HTML tags
  let cleaned = cleanHtml(text);

  // Remove Talmudic/Targum references (Jastrow-specific patterns)
  cleaned = cleaned
    // Remove Talmudic tractate references (Y. Shebi. VII, 37ᶜ top, Targ. Ex. I, 16, etc.)
    .replace(/\bY\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d]+,?\s*\d*[a-dᵃᵇᶜᵈ]?\s*(top|bot|mid)?/gi, '')
    .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bGen\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bEx\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bLev\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bNum\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bDeut\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bPes\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bBer\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bShab\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bSanh\.\s*[IVXLCDM\d,\s]+/gi, '')
    // Remove cross-references (v. דָּא, a. v. fr., etc.)
    .replace(/\bv\.\s*[\u0590-\u05FF]+/g, '')
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
    .replace(/\bch\.\s*same\.?/gi, '')
    .replace(/\bs\.\s*v\.?/gi, '')
    .replace(/\bib\.?/gi, '')
    .replace(/\bib\s*\d+/gi, '')
    // Remove manuscript references
    .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
    .replace(/\bVar\.\s*\w+/gi, '')
    .replace(/\bArukh\s*\w*/gi, '')
    // Remove "fr." and other frequency markers
    .replace(/\ba\.\s*fr\./gi, '')
    .replace(/\bfreq\./gi, '')
    .replace(/\b&c\.?/gi, '')
    // Remove em-dashes with Hebrew text after (cross-refs)
    .replace(/—[\u0590-\u05FF\s,]+/g, '')
    .replace(/—\s*v\.\s*[\u0590-\u05FF]+/g, '');

  // Remove common scholarly notation patterns
  cleaned = cleaned
    // Remove Jastrow language cross-reference notations (empty references to other dictionaries)
    .replace(/^\s*\(b\.?\s*h\.?\)\s*$/gi, '')  // Whole text is just "(b. h.)"
    .replace(/\(b\.?\s*h\.?\)/gi, '')           // (b. h.) or (b.h.) = biblical Hebrew reference
    .replace(/\(a\.?\s*h\.?\)/gi, '')           // (a. h.) = Aramaic/Hebrew
    .replace(/\(m\.?\s*h\.?\)/gi, '')           // (M. H.) = Mishnaic Hebrew
    .replace(/\(n\.?\s*h\.?\)/gi, '')           // (N. H.) = New Hebrew
    .replace(/\(nh\.?\)/gi, '')                 // (NH) = New Hebrew variant
    .replace(/\(bh\.?\)/gi, '')                 // (BH) = Biblical Hebrew variant
    .replace(/\(mh\.?\)/gi, '')                 // (MH) = Mishnaic Hebrew variant
    .replace(/\(ch\.?\)/gi, '')                 // (CH) = Chaldean/late Aramaic
    .replace(/\(a hapax legomenon[^)]*\)/gi, '')
    .replace(/\(occurring[^)]*\)/gi, '')
    .replace(/\(in the c\. st\.[^)]*\)/gi, '')
    .replace(/\(from[^)]*\)/gi, '')
    .replace(/\(cf\.[^)]*\)/gi, '')
    .replace(/\(see[^)]*\)/gi, '')
    .replace(/\(lit\.[^)]*\)/gi, '')
    .replace(/\(fig\.[^)]*\)/gi, '')
    .replace(/\(pl\.[^)]*\)/gi, '')
    .replace(/\(comp\.[^)]*\)/gi, '')
    .replace(/\(cmp\.[^)]*\)/gi, '')
    .replace(/\(v\.[^)]*\)/gi, '')              // (v. ...) = see/verse reference
    .replace(/\[[^\]]*\]/g, '') // Remove bracketed references
    // Clean up punctuation issues
    .replace(/,\s*,/g, ',')
    .replace(/;\s*;/g, ';')
    .replace(/^\s*[,;.—-]+\s*/g, '') // Remove leading punctuation
    .replace(/\s*[,;—-]+\s*$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();

  // If result is mostly Hebrew text or references, return empty
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const totalChars = cleaned.replace(/\s/g, '').length;
  if (totalChars > 0 && englishChars / totalChars < 0.3 && totalChars > 5) {
    // Mostly non-English, likely just references
    return '';
  }

  // Filter out non-definition metadata phrases
  const metadataPhrases = [
    'with more detail',
    'see entry',
    'see also',
    'compare',
    'note:',
    'note that',
    'for more',
    'details in',
    'fuller treatment',
    'see above',
    'see below',
    'cf. above',
    'cf. below',
    'as above',
    'as below',
  ];
  const lowerCleaned = cleaned.toLowerCase();
  for (const phrase of metadataPhrases) {
    if (lowerCleaned === phrase || lowerCleaned.startsWith(phrase + ' ') ||
        (lowerCleaned.length < 25 && lowerCleaned.includes(phrase))) {
      return '';
    }
  }

  return cleaned;
};

/**
 * Extract the actual English meaning from Jastrow/scholarly definition
 * IMPROVED: Properly extracts numbered senses and stops at examples
 *
 * Jastrow format example:
 *   "רָשׁוּת I  1 poverty. Midr. Till. to Ps. XXIV יש... 2 power, authority. Ned. X, 2..."
 *
 * We want: "poverty; power, authority; dominion; permission"
 * NOT example text like "but his reputation is not in harmony..."
 *
 * @param {string} text - Raw Jastrow definition text
 * @returns {string|null} - Extracted meaning or null
 */
const extractJastrowMeaning = (text) => {
  if (!text || typeof text !== 'string') return null;

  // First clean HTML
  let cleaned = cleanHtml(text);

  // === STEP 1: Remove Hebrew headword at start ===
  cleaned = cleaned.replace(/^[\u0590-\u05FF]+\s*[IVX]*\s*/, '');

  // === STEP 2: Extract NUMBERED SENSES (1, 2, 3...) ===
  // Jastrow uses "1 definition. Reference... 2 definition. Reference..."
  const numberedSensePattern = /\b(\d)\s+([a-zA-Z][a-zA-Z\s,;'()-]{2,}?)(?=\.\s*[A-Z]|\.\s*[\u0590-\u05FF]|\.\s*\d|\s*$)/g;
  const senses = [];
  let match;

  while ((match = numberedSensePattern.exec(cleaned)) !== null) {
    // match[1] is sense number, match[2] is the definition text
    let senseText = match[2].trim();

    // Stop at first Talmudic reference (indicates example, not definition)
    // Patterns: "Midr.", "Targ.", "Y. ", "B. ", tractate names, etc.
    const refPatterns = [
      /\b(?:Midr|Targ|Yalk|Tosef|Mekh|Sifr[ae]|Cant|Gen|Ex|Lev|Num|Deut|Pes|Ber|Shab|Sabb|Sanh|Ned|Yoma|Meg|Erub|Kidd|Ḥull?|Ḥag|Bets?|Makhsh|Mak)\.\s/i,
      /\b[YB]\.\s*[A-Z]/,           // Y. Ber., B. Kam., etc.
      /\bR\.\s+s\.\s/,              // R. s. = Midrash Rabbah section
      /\s+[IVXLCDM]+[,\s]/,         // Roman numerals (references)
      /\s+\d+[a-dᵃᵇᶜᵈ]/,             // Folio references (22a, 15b)
    ];

    for (const refPattern of refPatterns) {
      const refMatch = senseText.search(refPattern);
      if (refMatch > 3) {
        senseText = senseText.substring(0, refMatch).trim();
      }
    }

    // Clean trailing punctuation
    senseText = senseText.replace(/[,;.\s]+$/, '').trim();

    if (senseText && senseText.length >= 3 && /[a-zA-Z]{3,}/.test(senseText)) {
      senses.push(senseText);
    }
  }

  // If we found numbered senses, join them
  if (senses.length > 0) {
    return senses.slice(0, 4).join('; '); // Max 4 senses for brevity
  }

  // === STEP 3: Fallback - Extract definition before first reference ===
  // Remove grammatical markers first
  cleaned = cleaned
    .replace(/^[mfn]\.\s*/i, '')
    .replace(/^ch\.\s*/i, '')
    .replace(/^adj\.\s*/i, '')
    .replace(/^subst\.\s*/i, '')
    .replace(/^v\.\s*/i, '')
    .replace(/^\([^)]*\)\s*/, '');

  // Stop at first Talmudic reference
  const firstRefPatterns = [
    /\.\s*(?:Midr|Targ|Yalk|Tosef|Gen|Ex|Lev|Num|Deut|Ps|Isa|Jer|Cant|Koh)\.\s/i,
    /\.\s*[YB]\.\s*[A-Z]/,
    /\.\s*[\u0590-\u05FF]/,  // Hebrew text (examples)
    /\.\s*\d+[a-dᵃᵇᶜᵈ]/,     // Folio refs
  ];

  for (const refPat of firstRefPatterns) {
    const idx = cleaned.search(refPat);
    if (idx > 3) {
      cleaned = cleaned.substring(0, idx + 1); // Include the period
      break;
    }
  }

  // Extract English words
  const englishMatch = cleaned.match(/([a-zA-Z][a-zA-Z\s,;'()-]{3,})/);
  if (englishMatch) {
    const extracted = englishMatch[1].replace(/[,;.\s]+$/, '').trim();
    if (extracted.length >= 3 && !isGarbageText(extracted)) {
      return extracted;
    }
  }

  return null;
};

/**
 * Check if text is garbage/meaningless fragments
 * @param {string} text - Text to check
 * @returns {boolean} - True if text is garbage
 */
const isGarbageText = (text) => {
  if (!text) return true;

  const cleaned = text.trim().toLowerCase();

  // Too short
  if (cleaned.length < 3) return true;

  // Just punctuation or numbers
  if (/^[\d\s.,;:!?-]+$/.test(cleaned)) return true;

  // Just single letters or abbreviations repeated
  if (/^([a-z]\.?\s*)+$/i.test(cleaned)) return true;

  // Contains "..." suggesting incomplete/fragmented
  if (cleaned.includes('...')) return true;

  // Mostly Hebrew characters (shouldn't be in English definition)
  const hebrewChars = (cleaned.match(/[\u0590-\u05FF]/g) || []).length;
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  if (hebrewChars > englishChars && hebrewChars > 3) return true;

  // Reference-only text
  if (/^(see|cf\.|compare|v\.|note)/i.test(cleaned)) return true;

  return false;
};

// Cache for scholarly lookups (longer TTL for academic data)
const scholarlyCache = createCache({ ttl: 48 * 60 * 60 * 1000, maxSize: 1000 }); // 48 hours

// =============================================================================
// CACHE VERSIONING - Automatically invalidates old cached results
// =============================================================================
// In DEVELOPMENT: Auto-renews on every npm start (fresh lookups for testing)
// In PRODUCTION: Uses manual version (increment when logic changes)
//
// Version History:
// v7: Stronger prefix penalty (0.8), higher threshold (0.6), stricter matching
// v6: Pure algorithmic matching - LCS + edit distance + prefix penalty, no hardcoded rules
// v5: EXTRA strict Klein validation - explicit headword length check at result building
// v4: STRICT validation - reject entries without headword, extract from content
// v3: Strict trilateral root matching (בר vs ברא), isValidHeadwordMatch
// v2: Added headword filtering
// v1: Initial implementation
// =============================================================================
const CACHE_VERSION_MANUAL = 'v7';
const CACHE_VERSION = process.env.NODE_ENV === 'development'
  ? `dev-${Date.now()}` // Auto-renew on every app start in development
  : CACHE_VERSION_MANUAL;

// =============================================================================
// SCHOLARLY SOURCES CONFIGURATION
// =============================================================================

export const SCHOLARLY_SOURCES = {
  BDB: {
    id: 'bdb',
    name: 'Brown-Driver-Briggs',
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    abbreviation: 'BDB',
    year: 1906,
    description: 'Standard academic Hebrew lexicon for Biblical Hebrew',
    type: 'biblical',
    language: 'Hebrew'
  },
  JASTROW: {
    id: 'jastrow',
    name: 'Jastrow',
    fullName: "Jastrow's Dictionary of Targumim, Talmud and Midrashic Literature",
    abbreviation: 'Jastrow',
    year: 1903,
    description: 'Comprehensive Aramaic and Rabbinic Hebrew dictionary',
    type: 'rabbinic',
    language: 'Aramaic'
  },
  STRONG: {
    id: 'strong',
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    abbreviation: 'Strong',
    year: 1890,
    description: 'Biblical concordance with Hebrew/Greek numbering system',
    type: 'concordance',
    language: 'Hebrew'
  },
  KLEIN: {
    id: 'klein',
    name: 'Klein Etymology',
    fullName: "Klein's Comprehensive Etymological Dictionary of the Hebrew Language",
    abbreviation: 'Klein',
    year: 1987,
    description: 'Etymological roots and cognate language connections',
    type: 'etymology',
    language: 'Hebrew'
  },
  GESENIUS: {
    id: 'gesenius',
    name: 'Gesenius',
    fullName: "Gesenius' Hebrew Grammar",
    abbreviation: 'GKC',
    year: 1910,
    description: 'Classical Hebrew grammar reference',
    type: 'grammar',
    language: 'Hebrew'
  },
  HALOT: {
    id: 'halot',
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    abbreviation: 'HALOT',
    year: 2000,
    description: 'Modern scholarly lexicon with cognate analysis',
    type: 'biblical',
    language: 'Hebrew'
  },
  EVEN_SHOSHAN: {
    id: 'even_shoshan',
    name: 'Even-Shoshan',
    fullName: 'Even-Shoshan Dictionary',
    abbreviation: 'E-S',
    year: 1969,
    description: 'Comprehensive Modern Hebrew dictionary',
    type: 'modern',
    language: 'Hebrew'
  },
  SEFARIA: {
    id: 'sefaria',
    name: 'Sefaria',
    fullName: 'Sefaria.org Digital Library',
    abbreviation: 'Sefaria',
    year: 2011,
    description: 'Comprehensive Jewish text library and lexicon',
    type: 'digital',
    language: 'Hebrew'
  },
  STEINSALTZ: {
    id: 'steinsaltz',
    name: 'Steinsaltz',
    fullName: 'Steinsaltz Talmud Translation',
    abbreviation: 'Steinsaltz',
    year: 1989,
    description: 'Rabbi Adin Steinsaltz modern Talmud translation and commentary',
    type: 'translation',
    language: 'Aramaic'
  },
  TWOT: {
    id: 'twot',
    name: 'TWOT',
    fullName: 'Theological Wordbook of the Old Testament',
    abbreviation: 'TWOT',
    year: 1980,
    description: 'Theological analysis of Hebrew vocabulary with theological significance',
    type: 'theological',
    language: 'Hebrew'
  },
  BOLLS: {
    id: 'bolls',
    name: 'Bolls.life',
    fullName: 'Bolls.life Bible Dictionary (BDB/Thayer)',
    abbreviation: 'Bolls',
    year: 2020,
    description: 'Online BDB and Thayer\'s dictionary API',
    type: 'digital',
    language: 'Hebrew'
  },
  STEP: {
    id: 'step',
    name: 'STEP Bible',
    fullName: 'Scripture Tools for Every Person',
    abbreviation: 'STEP',
    year: 2021,
    description: 'Open source Bible study tools with Strong\'s definitions',
    type: 'digital',
    language: 'Hebrew'
  },
  CAL: {
    id: 'cal',
    name: 'CAL',
    fullName: 'Comprehensive Aramaic Lexicon',
    abbreviation: 'CAL',
    year: 1986,
    description: 'Premier academic Aramaic dictionary covering Targum, Talmud, and all Aramaic dialects',
    type: 'aramaic',
    language: 'Aramaic',
    url: 'https://cal.huc.edu'
  }
  // NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog, OpenScriptures) removed
  // Focus on scholarly Biblical/Talmudic sources only
};

// =============================================================================
// COGNATE LANGUAGES DATA
// =============================================================================

const COGNATE_LANGUAGES = {
  akkadian: { name: 'Akkadian', script: 'cuneiform', region: 'Mesopotamia' },
  ugaritic: { name: 'Ugaritic', script: 'cuneiform', region: 'Syria' },
  arabic: { name: 'Arabic', script: 'arabic', region: 'Arabia' },
  aramaic: { name: 'Aramaic', script: 'hebrew', region: 'Levant' },
  syriac: { name: 'Syriac', script: 'syriac', region: 'Mesopotamia' },
  ethiopic: { name: 'Ethiopic (Ge\'ez)', script: 'ethiopic', region: 'Ethiopia' },
  phoenician: { name: 'Phoenician', script: 'phoenician', region: 'Lebanon' }
};

// Common cognate patterns for etymological analysis - Enhanced Torah vocabulary
const COGNATE_PATTERNS = {
  // === Creation & Nature ===
  'ברא': { meaning: 'to create', cognates: ['Unique to Hebrew - divine creation', 'Arabic barāʾa (to create)'] },
  'אור': { arabic: 'nūr', meaning: 'light', cognates: ['Arabic nūr', 'Akkadian nūru', 'Aramaic נְהוֹר'] },
  'שמים': { arabic: 'samāʾ', meaning: 'sky/heaven', cognates: ['Arabic samāʾ', 'Akkadian šamû', 'Ugaritic šmm'] },
  'ארץ': { arabic: 'arḍ', meaning: 'earth/land', cognates: ['Arabic ʾarḍ', 'Akkadian erṣetu', 'Ugaritic ʾarṣ'] },
  'מים': { arabic: 'māʾ', meaning: 'water', cognates: ['Arabic māʾ', 'Akkadian mû', 'Ugaritic my'] },
  'יום': { arabic: 'yawm', meaning: 'day', cognates: ['Arabic yawm', 'Akkadian ūmu', 'Aramaic יוֹמָא'] },
  'לילה': { arabic: 'layl', meaning: 'night', cognates: ['Arabic layl', 'Akkadian līlītu', 'Aramaic לֵילְיָא'] },
  'חשך': { meaning: 'darkness', cognates: ['Arabic ẓulmah', 'Akkadian ekletu'] },
  'רקיע': { meaning: 'firmament', cognates: ['Related to רקע (to spread out)'] },
  'עשב': { arabic: 'ʿušb', meaning: 'herb/grass', cognates: ['Arabic ʿušb', 'Akkadian šammu'] },
  'עץ': { arabic: 'ʿūd', meaning: 'tree/wood', cognates: ['Arabic ʿūd', 'Akkadian iṣu'] },
  'פרי': { arabic: 'faraʾ', meaning: 'fruit/offspring', cognates: ['Arabic farʿ (branch)', 'Akkadian inbu'] },
  'זרע': { arabic: 'zarʿ', meaning: 'seed', cognates: ['Arabic zarʿ', 'Akkadian zēru', 'Aramaic זַרְעָא'] },

  // === Family & Relationships ===
  'אב': { arabic: 'ab', meaning: 'father', cognates: ['Arabic ʾab', 'Akkadian abu', 'Aramaic אַבָּא'] },
  'אם': { arabic: 'umm', meaning: 'mother', cognates: ['Arabic ʾumm', 'Akkadian ummu', 'Aramaic אִמָּא'] },
  'בן': { arabic: 'ibn', meaning: 'son', cognates: ['Arabic ibn', 'Aramaic בַּר', 'Akkadian māru'] },
  'בת': { arabic: 'bint', meaning: 'daughter', cognates: ['Arabic bint', 'Akkadian mārtu'] },
  'אח': { arabic: 'akh', meaning: 'brother', cognates: ['Arabic ʾakh', 'Akkadian aḫu', 'Aramaic אַחָא'] },
  'אחות': { arabic: 'ukht', meaning: 'sister', cognates: ['Arabic ʾukht', 'Akkadian aḫātu'] },
  'איש': { meaning: 'man', cognates: ['Ugaritic ʾiš', 'Akkadian awīlu'] },
  'אשה': { arabic: 'imraʾa', meaning: 'woman/wife', cognates: ['Arabic ʾunthā', 'Akkadian aššatu'] },
  'בית': { arabic: 'bayt', meaning: 'house', cognates: ['Arabic bayt', 'Akkadian bītu', 'Aramaic בֵּיתָא'] },

  // === Divine & Sacred ===
  'קדש': { arabic: 'quds', meaning: 'holy', cognates: ['Arabic quds', 'Ugaritic qdš', 'Akkadian qadištu'] },
  'ברך': { arabic: 'baraka', meaning: 'blessing', cognates: ['Arabic bāraka', 'Akkadian karābu'] },
  'שלם': { arabic: 'salām', meaning: 'peace/wholeness', cognates: ['Arabic salām', 'Akkadian šalāmu'] },
  'מלך': { arabic: 'malik', meaning: 'king', cognates: ['Arabic malik', 'Akkadian malku', 'Ugaritic mlk'] },
  'כהן': { arabic: 'kāhin', meaning: 'priest', cognates: ['Arabic kāhin', 'Akkadian kānu'] },
  'נביא': { meaning: 'prophet', cognates: ['Akkadian nabû (to call)', 'Arabic nabīy'] },
  'עבד': { arabic: 'ʿabd', meaning: 'servant/slave', cognates: ['Arabic ʿabd', 'Akkadian ardu'] },
  'צדק': { arabic: 'ṣadaqa', meaning: 'righteousness', cognates: ['Arabic ṣadaqa', 'Akkadian ṣidqu'] },
  'חסד': { meaning: 'lovingkindness', cognates: ['Unique Hebrew theological term'] },
  'תורה': { meaning: 'instruction/law', cognates: ['From ירה (to teach/throw)', 'Akkadian têrtu'] },
  'מצוה': { meaning: 'commandment', cognates: ['From צוה (to command)'] },
  'חטא': { arabic: 'khaṭaʾ', meaning: 'sin/miss', cognates: ['Arabic khaṭaʾ', 'Akkadian ḫaṭû'] },
  'כפר': { arabic: 'kafara', meaning: 'to atone/cover', cognates: ['Arabic kafara', 'Akkadian kapāru'] },

  // === Common Verbs ===
  'אמר': { arabic: 'amara', meaning: 'to say/command', cognates: ['Arabic ʾamara', 'Akkadian amāru'] },
  'שמע': { arabic: 'samiʿa', meaning: 'to hear', cognates: ['Arabic samiʿa', 'Akkadian šemû'] },
  'ראה': { arabic: 'raʾā', meaning: 'to see', cognates: ['Arabic raʾā', 'Akkadian amāru'] },
  'ידע': { arabic: 'wadaʿa', meaning: 'to know', cognates: ['Arabic wadaʿa', 'Akkadian idû'] },
  'עשה': { meaning: 'to do/make', cognates: ['Akkadian epēšu'] },
  'נתן': { meaning: 'to give', cognates: ['Akkadian nadānu', 'Ugaritic ytn'] },
  'לקח': { meaning: 'to take', cognates: ['Akkadian leqû'] },
  'הלך': { meaning: 'to go/walk', cognates: ['Akkadian alāku', 'Aramaic אֲזַל'] },
  'בוא': { meaning: 'to come/enter', cognates: ['Akkadian erēbu'] },
  'יצא': { meaning: 'to go out', cognates: ['Akkadian aṣû', 'Arabic kharaja'] },
  'שוב': { meaning: 'to return', cognates: ['Akkadian târu'] },
  'כתב': { arabic: 'kataba', meaning: 'to write', cognates: ['Arabic kataba', 'Ugaritic ktb'] },
  'שמר': { arabic: 'samar', meaning: 'to guard/keep', cognates: ['Arabic samara', 'Akkadian naṣāru'] },
  'אהב': { meaning: 'to love', cognates: ['Ugaritic ʾahb', 'Akkadian rāmu'] },
  'ירא': { meaning: 'to fear', cognates: ['Akkadian palāḫu'] },
  'חיה': { arabic: 'ḥayy', meaning: 'to live', cognates: ['Arabic ḥayy', 'Akkadian balāṭu'] },
  'מות': { arabic: 'māt', meaning: 'to die', cognates: ['Arabic māta', 'Akkadian mâtu', 'Ugaritic mwt'] },

  // === Body Parts ===
  'ראש': { arabic: 'raʾs', meaning: 'head', cognates: ['Arabic raʾs', 'Akkadian rēšu'] },
  'יד': { arabic: 'yad', meaning: 'hand', cognates: ['Arabic yad', 'Akkadian idu'] },
  'עין': { arabic: 'ʿayn', meaning: 'eye', cognates: ['Arabic ʿayn', 'Akkadian īnu'] },
  'אזן': { arabic: 'ʾudhun', meaning: 'ear', cognates: ['Arabic ʾudhun', 'Akkadian uznu'] },
  'פה': { arabic: 'fam', meaning: 'mouth', cognates: ['Arabic fam', 'Akkadian pû'] },
  'לב': { arabic: 'lubb', meaning: 'heart', cognates: ['Arabic lubb', 'Akkadian libbu'] },
  'נפש': { arabic: 'nafs', meaning: 'soul/breath', cognates: ['Arabic nafs', 'Akkadian napištu'] },
  'בשר': { arabic: 'basar', meaning: 'flesh/meat', cognates: ['Arabic basar', 'Akkadian bišru'] },
  'דם': { arabic: 'dam', meaning: 'blood', cognates: ['Arabic dam', 'Akkadian damu'] },

  // === Numbers ===
  'אחד': { arabic: 'ʾaḥad', meaning: 'one', cognates: ['Arabic ʾaḥad', 'Akkadian ištēn'] },
  'שנים': { meaning: 'two', cognates: ['Arabic ithnān', 'Akkadian šina'] },
  'שלש': { arabic: 'thalāth', meaning: 'three', cognates: ['Arabic thalātha', 'Akkadian šalāš'] },
  'שבע': { arabic: 'sabʿ', meaning: 'seven', cognates: ['Arabic sabʿa', 'Akkadian sebe'] },
  'עשר': { arabic: 'ʿashr', meaning: 'ten', cognates: ['Arabic ʿashr', 'Akkadian ešer'] },
  'מאה': { arabic: 'miʾa', meaning: 'hundred', cognates: ['Arabic miʾa', 'Akkadian mēʾatu'] },

  // === Food & Agriculture ===
  'לחם': { arabic: 'laḥm', meaning: 'bread/food', cognates: ['Arabic laḥm (meat)', 'Ugaritic lḥm'] },
  'יין': { meaning: 'wine', cognates: ['Greek oinos', 'Akkadian īnu'] },
  'שמן': { arabic: 'samn', meaning: 'oil', cognates: ['Arabic samn', 'Akkadian šamnu'] },
  'חלב': { arabic: 'ḥalīb', meaning: 'milk', cognates: ['Arabic ḥalīb', 'Akkadian ḫalābu'] },
  'דבש': { meaning: 'honey', cognates: ['Arabic dibs'] },
  'שדה': { meaning: 'field', cognates: ['Akkadian šadû (mountain)', 'Ugaritic šd'] },
  'כרם': { arabic: 'karm', meaning: 'vineyard', cognates: ['Arabic karm', 'Akkadian karmu'] },

  // === Animals ===
  'צאן': { arabic: 'ḍaʾn', meaning: 'sheep/flock', cognates: ['Arabic ḍaʾn', 'Akkadian ṣēnu'] },
  'בקר': { arabic: 'baqar', meaning: 'cattle', cognates: ['Arabic baqar', 'Akkadian alpu'] },
  'סוס': { meaning: 'horse', cognates: ['Akkadian sisû'] },
  'חמור': { arabic: 'ḥimār', meaning: 'donkey', cognates: ['Arabic ḥimār', 'Akkadian imēru'] },
  'כלב': { arabic: 'kalb', meaning: 'dog', cognates: ['Arabic kalb', 'Akkadian kalbu'] },

  // === Ritual & Temple ===
  'זבח': { arabic: 'dhabaḥa', meaning: 'sacrifice', cognates: ['Arabic dhabaḥa', 'Akkadian zibbu'] },
  'קרבן': { meaning: 'offering', cognates: ['From קרב (to draw near)'] },
  'מזבח': { meaning: 'altar', cognates: ['From זבח (sacrifice)'] },
  'משכן': { meaning: 'tabernacle', cognates: ['From שכן (to dwell)', 'Akkadian maškanu'] },
  'ארון': { meaning: 'ark/chest', cognates: ['Akkadian arānu'] },
};

// =============================================================================
// HEBREW GRAMMAR REFERENCE (Gesenius-based)
// =============================================================================

const BINYAN_INFO = {
  'קל': {
    name: 'Qal (Pa\'al)',
    latin: 'Qal',
    meaning: 'Simple active',
    description: 'Basic stem, simple action',
    example: 'שָׁמַר (he guarded)',
    frequency: 'Most common (~70%)'
  },
  'נפעל': {
    name: 'Nif\'al',
    latin: 'Niphal',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal',
    example: 'נִשְׁמַר (he was guarded)',
    frequency: 'Common'
  },
  'פיעל': {
    name: 'Pi\'el',
    latin: 'Piel',
    meaning: 'Intensive active',
    description: 'Intensive, causative, or denominative',
    example: 'שִׁמֵּר (he guarded carefully)',
    frequency: 'Common'
  },
  'פועל': {
    name: 'Pu\'al',
    latin: 'Pual',
    meaning: 'Intensive passive',
    description: 'Passive of Pi\'el',
    example: 'שֻׁמַּר (he was guarded carefully)',
    frequency: 'Less common'
  },
  'הפעיל': {
    name: 'Hif\'il',
    latin: 'Hiphil',
    meaning: 'Causative active',
    description: 'Causative - making someone do action',
    example: 'הִשְׁמִיר (he caused to guard)',
    frequency: 'Common'
  },
  'הופעל': {
    name: 'Hof\'al',
    latin: 'Hophal',
    meaning: 'Causative passive',
    description: 'Passive of Hif\'il',
    example: 'הָשְׁמַר (he was made to guard)',
    frequency: 'Rare'
  },
  'התפעל': {
    name: 'Hitpa\'el',
    latin: 'Hitpael',
    meaning: 'Reflexive/reciprocal',
    description: 'Reflexive action or mutual action',
    example: 'הִשְׁתַּמֵּר (he guarded himself)',
    frequency: 'Fairly common'
  }
};

const VERB_TENSES = {
  'עבר': { name: 'Perfect (Qatal)', description: 'Completed action', english: 'Past tense' },
  'עתיד': { name: 'Imperfect (Yiqtol)', description: 'Incomplete action', english: 'Future/Present' },
  'ציווי': { name: 'Imperative', description: 'Command', english: 'Command' },
  'שם הפועל': { name: 'Infinitive', description: 'Verbal noun', english: 'To + verb' },
  'בינוני': { name: 'Participle', description: 'Verbal adjective', english: '-ing form' }
};

// =============================================================================
// WORD CLEANING UTILITIES
// =============================================================================

// cleanWord - use cleanHebrewWord from ../utils/hebrewUtils
const cleanWord = cleanHebrewWord;

/**
 * Extract root using the enhanced grammar analysis service
 * Falls back to simple extraction if grammar service returns uncertain result
 */
// Common Hebrew/Aramaic 3-letter roots that should NOT have their first letter stripped
// Even though the first letter matches a common prefix (ש, ב, ל, מ, כ, etc.)
const PROTECTED_ROOTS = new Set([
  'שבת', // Sabbath/rest - ש is NOT a prefix
  'שמר', // guard
  'שמע', // hear
  'שלח', // send
  'שאל', // ask
  'שכב', // lie down
  'שכח', // forget
  'שפט', // judge
  'שבר', // break
  'שוב', // return
  'שים', // put/place
  'שיר', // sing
  'שנא', // hate
  'שקל', // weigh
  'בטח', // trust - ב is NOT a prefix
  'בין', // understand
  'בנה', // build
  'בקש', // seek
  'ברא', // create
  'ברך', // bless
  'לקח', // take - ל is NOT a prefix
  'למד', // learn
  'לבש', // wear
  'מלך', // reign - מ is NOT a prefix
  'מצא', // find
  'מות', // die
  'מלא', // fill
  'כתב', // write - כ is NOT a prefix
  'כרת', // cut
  'דבר', // speak - ד is NOT a prefix
  'הלך', // walk - ה is NOT a prefix (in this root)
]);

const extractRoot = (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return cleaned;

  // Use the improved grammar service for root extraction
  const grammarResult = extractGrammarRoot(word);
  if (grammarResult?.root && !grammarResult.uncertain) {
    return grammarResult.root;
  }

  // Fallback: simple heuristic if grammar service returns uncertain
  if (cleaned.length <= 3) return cleaned;

  // Check if this is a protected root (don't strip prefixes from these)
  if (PROTECTED_ROOTS.has(cleaned)) return cleaned;

  let root = cleaned;

  // Remove common prefixes
  const prefixes = ['וי', 'הת', 'ה', 'ו', 'ל', 'ב', 'מ', 'כ', 'ש', 'ד'];
  for (const prefix of prefixes) {
    if (root.startsWith(prefix) && root.length > prefix.length + 2) {
      const potentialRoot = root.slice(prefix.length);
      // Don't strip if the result is a protected root
      if (!PROTECTED_ROOTS.has(potentialRoot)) {
        root = potentialRoot;
        break;
      }
    }
  }

  // Remove common suffixes (including Aramaic)
  const suffixes = ['ים', 'ות', 'ין', 'יא', 'תא', 'תי', 'נו', 'תם', 'ה', 'ו'];
  for (const suffix of suffixes) {
    if (root.endsWith(suffix) && root.length > suffix.length + 2) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }

  return root.length >= 2 && root.length <= 4 ? root : cleaned.slice(0, 3);
};

/**
 * Transliterate Hebrew to scholarly Latin script
 * Uses standard academic transliteration (SBL/ALA-LC style)
 */
const transliterateHebrew = (word) => {
  if (!word || typeof word !== 'string') return '';

  // Hebrew consonant to Latin transliteration map (SBL academic style)
  const consonantMap = {
    'א': 'ʾ', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
    'ו': 'w', 'ז': 'z', 'ח': 'ḥ', 'ט': 'ṭ', 'י': 'y',
    'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
    'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'ʿ', 'פ': 'p',
    'ף': 'p', 'צ': 'ṣ', 'ץ': 'ṣ', 'ק': 'q', 'ר': 'r',
    'שׁ': 'š', 'שׂ': 'ś', 'ש': 'š', 'ת': 't'
  };

  // Vowel points (nikud) to vowel transliteration
  const vowelMap = {
    '\u05B0': 'ə',  // sheva
    '\u05B1': 'ĕ',  // hataf segol
    '\u05B2': 'ă',  // hataf patah
    '\u05B3': 'ŏ',  // hataf qamats
    '\u05B4': 'i',  // hiriq
    '\u05B5': 'ē',  // tsere
    '\u05B6': 'e',  // segol
    '\u05B7': 'a',  // patah
    '\u05B8': 'ā',  // qamats
    '\u05B9': 'ō',  // holam
    '\u05BA': 'ō',  // holam haser
    '\u05BB': 'u',  // qubuts
    '\u05BC': '',   // dagesh (handled separately)
  };

  let result = '';
  const chars = [...word];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Check for shin/sin dots
    if (char === 'ש') {
      const next = chars[i + 1];
      if (next === '\u05C1') { // shin dot
        result += 'š';
        i++;
        continue;
      } else if (next === '\u05C2') { // sin dot
        result += 'ś';
        i++;
        continue;
      }
    }

    // Consonant
    if (consonantMap[char]) {
      result += consonantMap[char];
    }
    // Vowel
    else if (vowelMap[char] !== undefined) {
      result += vowelMap[char];
    }
    // Skip cantillation marks
    else if (char.charCodeAt(0) >= 0x0591 && char.charCodeAt(0) <= 0x05AF) {
      continue;
    }
  }

  return result || cleanWord(word).split('').map(c => consonantMap[c] || c).join('');
};

// =============================================================================
// SEFARIA API INTEGRATION
// =============================================================================

/**
 * Fetch comprehensive lexicon data from Sefaria
 */
const fetchSefariaLexicon = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    return await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}`,
      { timeout: 8000 }
    );
  } catch {
    return null;
  }
};

/**
 * Fetch word lookup from Sefaria's alternative API endpoint
 * Tries multiple endpoints for better coverage
 */
const fetchSefariaWordAlternative = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Try the lexicon lookup API (suppress 404s - expected for most words)
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/lexicon/${encodeURIComponent(cleaned)}`,
      { timeout: 6000 }
    );
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return Array.isArray(data) ? data : [data];
    }
  } catch {
    // Silent fallback - 404/503/timeout are expected
  }

  // Try Steinsaltz dictionary specifically for Aramaic
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Steinsaltz`,
      { timeout: 6000 }
    );
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Silent fallback
  }

  return null;
};

/**
 * Fetch from Bolls.life Bible Dictionary API (BDB/Thayer's)
 * Additional online source for Hebrew-English translations
 * API: https://bolls.life/dictionary-definition/BDBT/{word}/
 * Note: Uses CORS proxy fallback since bolls.life doesn't support CORS
 */
const fetchBollsLifeDefinition = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // Use fetchWithFallback which has built-in CORS proxy support
    const data = await fetchWithFallback(
      `https://bolls.life/dictionary-definition/BDBT/${encodeURIComponent(cleaned)}/`,
      { timeout: 8000 }
    );

    // Bolls.life returns dictionary entries
    if (data && (data.definition || data.meaning || data.definitions)) {
      return {
        source: 'Bolls.life',
        fullName: 'Bolls.life BDB Dictionary',
        definition: cleanDefinitionText(data.definition || data.meaning || ''),
        definitions: Array.isArray(data.definitions)
          ? data.definitions.map(d => cleanDefinitionText(d)).filter(Boolean)
          : [],
        strongNumber: data.strong_number || data.strongNumber || null,
        partOfSpeech: data.pos || data.part_of_speech || null
      };
    }

    return null;
  } catch (error) {
    // Silent fallback - Bolls.life may not have all words or CORS proxy may fail
    return null;
  }
};

/**
 * Fetch from STEP Bible Lexicon API
 * Scripture Tools for Every Person - provides Strong's definitions
 * API: https://stepbibleguide.blogspot.com/p/api.html
 */
const fetchStepBibleDefinition = async (strongNumber) => {
  if (!strongNumber) return null;

  // Normalize Strong's number (H1234 format)
  const normalized = strongNumber.toString().toUpperCase().replace(/^H?/, 'H');

  try {
    const response = await fetch(
      `https://www.stepbible.org/rest/module/getAllStrongs/hebrewStrong_vocabulary/${normalized}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      const entry = data[0];
      return {
        source: 'STEP Bible',
        fullName: 'Scripture Tools for Every Person',
        definition: cleanDefinitionText(entry.gloss || entry.stepGloss || ''),
        strongNumber: entry.strongNumber || normalized,
        transliteration: entry.stepTransliteration || entry.transliteration || null
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Fetch CAL data with CORS proxy handling for production
 * @param {string} endpoint - CAL API endpoint
 * @returns {Promise<string|null>} HTML response or null
 */
const fetchCALData = async (endpoint) => {
  const url = buildCALUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': IS_DEV ? 'text/html' : 'application/json'
      },
      signal: AbortSignal.timeout(IS_DEV ? 10000 : 15000)
    });

    if (!response.ok) return null;

    if (IS_DEV) {
      // Development: direct HTML response
      return await response.text();
    } else {
      // Production: CORS proxy wraps response in JSON with 'contents' field
      const data = await response.json();
      return data.contents || '';
    }
  } catch (error) {
    if (IS_DEV) {
      log.warn('CAL fetch error:', error.message);
    }
    return null;
  }
};

/**
 * Fetch from CAL (Comprehensive Aramaic Lexicon)
 * Premier academic Aramaic dictionary - covers Targum, Talmud, all Aramaic dialects
 * Works in both development (local proxy) and production (CORS proxy)
 * @param {string} word - Aramaic word to look up
 * @returns {Promise<object|null>} CAL definition data
 */
const fetchCALDefinition = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // CAL uses URL-encoded Hebrew/Aramaic text directly in the query
    const endpoint = `/oneentry.php?lemma=${encodeURIComponent(cleaned)}&cession=S1`;
    const response = await fetchCALData(endpoint);

    // CAL returns HTML - extract definition data
    if (response && typeof response === 'string') {
      const result = parseCALResponse(response, cleaned);
      if (result) {
        return result;
      }
    }

    // Try alternative search with root form
    const root = extractRoot(cleaned);
    if (root && root !== cleaned) {
      const rootEndpoint = `/oneentry.php?lemma=${encodeURIComponent(root)}&cession=S1`;
      const rootResponse = await fetchCALData(rootEndpoint);

      if (rootResponse && typeof rootResponse === 'string') {
        return parseCALResponse(rootResponse, root);
      }
    }

    return null;
  } catch (error) {
    // Silent fail - CAL may not be accessible or word not found
    return null;
  }
};

/**
 * Parse CAL HTML response to extract definition data
 * CAL returns HTML with structured dictionary entries
 */
const parseCALResponse = (html, word) => {
  if (!html || typeof html !== 'string') return null;

  try {
    // Check for error responses from CAL
    if (html.includes('BAD LEMMA') ||
        html.includes('No entry found') ||
        html.includes('Error') ||
        html.includes('not found') ||
        html.length < 100) {
      return null; // Invalid response
    }

    // Extract definition from CAL's HTML structure
    // CAL uses specific classes and patterns for their entries

    const definitions = [];
    let headword = word;
    let etymology = null;
    let dialect = null;
    let partOfSpeech = null;

    // Extract headword (usually in <span class="lemma"> or similar)
    const headwordMatch = html.match(/<span[^>]*class="[^"]*lemma[^"]*"[^>]*>([^<]+)</i);
    if (headwordMatch) {
      headword = headwordMatch[1].trim();
    }

    // Extract definition text - CAL often uses <span class="definition"> or plain text after headword
    const defMatches = html.matchAll(/<span[^>]*class="[^"]*(?:definition|meaning|gloss)[^"]*"[^>]*>([^<]+)</gi);
    for (const match of defMatches) {
      const def = cleanDefinitionText(match[1]);
      if (def && def.length > 2) {
        definitions.push({ text: def });
      }
    }

    // Try alternative pattern - look for English text after Aramaic lemma
    if (definitions.length === 0) {
      // Look for pattern: Aramaic word followed by English definition
      const textBlocks = html.match(/>\s*([A-Za-z][A-Za-z\s,.'()-]{10,})\s*</g);
      if (textBlocks) {
        for (const block of textBlocks.slice(0, 5)) { // Take first 5 matches max
          const cleaned = cleanDefinitionText(block.replace(/[<>]/g, ''));
          if (cleaned && cleaned.length > 5 && /^[A-Za-z]/.test(cleaned)) {
            definitions.push({ text: cleaned });
          }
        }
      }
    }

    // Extract dialect info (Jewish Babylonian Aramaic, Palestinian Aramaic, etc.)
    const dialectMatch = html.match(/(?:JBA|CPA|JPA|OA|Syr|Sam|Mand|QA)/i);
    if (dialectMatch) {
      const dialectCodes = {
        'JBA': 'Jewish Babylonian Aramaic (Talmud Bavli)',
        'CPA': 'Christian Palestinian Aramaic',
        'JPA': 'Jewish Palestinian Aramaic (Talmud Yerushalmi)',
        'OA': 'Official Aramaic',
        'Syr': 'Syriac',
        'Sam': 'Samaritan Aramaic',
        'Mand': 'Mandaic',
        'QA': 'Qumran Aramaic'
      };
      dialect = dialectCodes[dialectMatch[0].toUpperCase()] || dialectMatch[0];
    }

    // Extract part of speech
    const posMatch = html.match(/\b(noun|verb|adj(?:ective)?|adv(?:erb)?|prep(?:osition)?|conj(?:unction)?|particle)\b/i);
    if (posMatch) {
      partOfSpeech = posMatch[1].toLowerCase();
    }

    // Extract etymology/cognates
    const etymMatch = html.match(/(?:cognate|related|from|cf\.|compare)[^<]+/i);
    if (etymMatch) {
      etymology = cleanDefinitionText(etymMatch[0]);
    }

    if (definitions.length === 0) {
      return null;
    }

    return {
      source: 'CAL',
      fullName: 'Comprehensive Aramaic Lexicon',
      headword,
      definitions,
      dialect,
      partOfSpeech,
      etymology,
      language: 'Aramaic',
      url: `https://cal.huc.edu/oneentry.php?lemma=${encodeURIComponent(word)}`
    };
  } catch (error) {
    return null;
  }
};

// =============================================================================
// NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog) removed
// This service focuses on scholarly Biblical/Talmudic sources:
// BDB, Jastrow, Strong's, HALOT, Klein, Gesenius, TWOT, Steinsaltz, STEP Bible, CAL
// =============================================================================

/**
 * SMART headword filtering - algorithmic string matching
 * Uses normalized edit distance with position-aware scoring
 */
const filterByHeadwordMatch = (data, searchedWord) => {
  if (!data || !Array.isArray(data) || !searchedWord) return data || [];

  const search = cleanWord(searchedWord);
  if (!search) return data;

  // Levenshtein distance
  const editDist = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) m[0][i] = i;
    for (let j = 0; j <= b.length; j++) m[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        m[j][i] = Math.min(m[j][i-1] + 1, m[j-1][i] + 1, m[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1));
      }
    }
    return m[b.length][a.length];
  };

  // Longest Common Subsequence length
  const lcsLength = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
      }
    }
    return m[b.length][a.length];
  };

  // Score each entry
  const scored = data.map(entry => {
    const head = cleanWord(entry.headword || entry.word || entry.term || '');
    if (!head) return { entry, score: 0 };

    // Perfect match
    if (head === search) return { entry, score: 1, head };

    const maxLen = Math.max(search.length, head.length);
    const minLen = Math.min(search.length, head.length);

    // Core metrics
    const dist = editDist(search, head);
    const lcs = lcsLength(search, head);

    // Normalized scores (0-1)
    const editSim = 1 - dist / maxLen;           // How few edits needed?
    const lcsRatio = lcs / maxLen;               // How much sequence preserved?
    const lenRatio = minLen / maxLen;            // How similar in length?

    // Combined score with emphasis on LCS (preserves character order)
    let score = (editSim * 0.35) + (lcsRatio * 0.45) + (lenRatio * 0.2);

    // Penalize when search is longer and head is strict prefix
    // (search has extra chars that might be meaningful root letters)
    if (search.startsWith(head) && head.length < search.length) {
      const extraRatio = (search.length - head.length) / search.length;
      score *= (1 - extraRatio * 0.8); // Strong penalty for prefix matches
    }

    return { entry, score, head };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Dynamic threshold: 70% of best score, minimum 0.5
  const maxScore = scored[0]?.score || 0;
  const threshold = Math.max(0.6, maxScore * 0.75);

  return scored.filter(s => s.score >= threshold).map(s => s.entry);
};

/**
 * Parse lexicon entries by source
 * Handles all Sefaria lexicon naming conventions
 */
const parseBySource = (data, searchedWord = null) => {
  if (!data || !Array.isArray(data)) {
    return { bdb: [], jastrow: [], strong: [], klein: [], steinsaltz: [], sefaria: [], halot: [], gesenius: [], twot: [], other: [] };
  }

  // Clean the searched word for validation
  const cleanedSearch = searchedWord ? cleanWord(searchedWord) : null;
  const searchLen = cleanedSearch ? cleanedSearch.length : 0;

  // Filter entries to prefer exact headword matches
  const filteredData = searchedWord ? filterByHeadwordMatch(data, searchedWord) : data;

  /**
   * Algorithmic headword validation using LCS similarity
   */
  const isValidHeadwordMatch = (entry) => {
    if (!cleanedSearch || searchLen < 2) return true;

    // Extract headword from entry
    let head = cleanWord(entry.headword || entry.word || entry.term || entry.form || '');

    // Try content if no headword
    if (!head && entry.content) {
      const str = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
      const match = str.match(/[\u05D0-\u05EA]{2,}/);
      if (match) head = cleanWord(match[0]);
    }

    if (!head) return false; // No headword = reject

    if (head === cleanedSearch) return true; // Exact match

    // LCS-based similarity check
    const lcs = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
        }
      }
      return m[b.length][a.length];
    };

    const maxLen = Math.max(searchLen, head.length);
    const lcsRatio = lcs(cleanedSearch, head) / maxLen;
    const lenRatio = Math.min(searchLen, head.length) / maxLen;

    // Combined similarity score
    let score = (lcsRatio * 0.6) + (lenRatio * 0.4);

    // Penalize if search is longer and head is prefix (stronger penalty)
    if (cleanedSearch.startsWith(head) && head.length < searchLen) {
      score *= (1 - ((searchLen - head.length) / searchLen) * 0.8);
    }

    return score >= 0.6; // Minimum 60% similarity required
  };

  const bySource = {
    bdb: [],
    jastrow: [],
    strong: [],
    klein: [],
    kleinRelated: [], // Related words for Klein (looser filter) - scholarly transparency
    steinsaltz: [],
    sefaria: [],
    halot: [],
    gesenius: [],
    twot: [],
    other: []
  };

  // FIRST PASS: Categorize unfiltered Klein entries for "related word" feature
  // This allows us to show Klein entries even when they're for similar but different words
  for (const entry of data) {
    const lexicon = (entry.parent_lexicon || '').toLowerCase();
    if (lexicon.includes('klein') || lexicon.includes('etymolog')) {
      bySource.kleinRelated.push(entry);
    }
  }

  for (const entry of filteredData) {
    // CRITICAL: Skip entries with mismatched headwords
    if (!isValidHeadwordMatch(entry)) {
      continue; // Skip this entry - wrong word!
    }

    const lexicon = (entry.parent_lexicon || '').toLowerCase();
    let matched = false;

    // Handle combined sources first (e.g., "BDB Augmented Strong")
    // These should be added to MULTIPLE categories

    // Check for Strong's number - if present, always add to Strong's
    if (lexicon.includes('strong') || entry.strong_number) {
      bySource.strong.push(entry);
      matched = true;
    }

    // BDB - Brown-Driver-Briggs (various naming formats)
    if (lexicon.includes('bdb') || lexicon.includes('brown') ||
        lexicon.includes('driver') || lexicon.includes('briggs') ||
        lexicon.includes('hebrew and english lexicon') ||
        lexicon.includes('augmented')) {
      bySource.bdb.push(entry);
      matched = true;
    }

    // Jastrow - Aramaic/Talmudic dictionary
    if (lexicon.includes('jastrow')) {
      bySource.jastrow.push(entry);
      matched = true;
    }

    // Klein's Etymological Dictionary
    if (lexicon.includes('klein') || lexicon.includes('etymolog')) {
      bySource.klein.push(entry);
      matched = true;
    }

    // Steinsaltz - Modern Talmud translation
    if (lexicon.includes('steinsaltz') || lexicon.includes('koren')) {
      bySource.steinsaltz.push(entry);
      matched = true;
    }

    // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
    if (lexicon.includes('halot') || lexicon.includes('hebrew and aramaic lexicon')) {
      bySource.halot.push(entry);
      matched = true;
    }

    // Gesenius - Hebrew Grammar and Lexicon
    if (lexicon.includes('gesenius') || lexicon.includes('gkc')) {
      bySource.gesenius.push(entry);
      matched = true;
    }

    // TWOT - Theological Wordbook of the Old Testament
    if (lexicon.includes('twot') || lexicon.includes('theological wordbook')) {
      bySource.twot.push(entry);
      matched = true;
    }

    // Sefaria's own lexicon
    if (lexicon.includes('sefaria')) {
      bySource.sefaria.push(entry);
      matched = true;
    }

    // Targum/Talmud/Midrash sources (likely Aramaic) - add to Jastrow if not already there
    if (!matched && (lexicon.includes('targum') || lexicon.includes('talmud') || lexicon.includes('midrash'))) {
      bySource.jastrow.push(entry);
      matched = true;
    }

    // Other sources - fallback
    if (!matched) {
      bySource.other.push(entry);
    }
  }

  return bySource;
};

/**
 * Prioritize and FILTER Jastrow entries based on alignment with BDB definitions
 * When multiple Jastrow entries exist (e.g., ברא = "create" vs "son" vs "outside"),
 * ONLY return entries whose definitions align with BDB, filtering out homographs
 * @param {Array} jastrowEntries - All Jastrow entries
 * @param {Array} bdbEntries - BDB entries for cross-reference
 * @returns {Array} - Filtered Jastrow entries matching BDB meaning
 */
const prioritizeJastrowEntries = (jastrowEntries, bdbEntries) => {
  if (!jastrowEntries || jastrowEntries.length <= 1) return jastrowEntries;
  if (!bdbEntries || bdbEntries.length === 0) return jastrowEntries;

  // Extract BDB definition keywords for matching (key semantic words)
  const bdbKeywords = new Set();
  const bdbRoots = new Set(); // Root concepts like "create", "make", "form"
  for (const entry of bdbEntries) {
    const defs = extractDefinitions(entry, false);
    for (const def of defs) {
      if (def.text) {
        const text = def.text.toLowerCase();
        // Extract significant words (3+ letters, not common words)
        const words = text.split(/\s+/);
        for (const word of words) {
          const cleaned = word.replace(/[^a-z]/g, '');
          if (cleaned.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(cleaned)) {
            bdbKeywords.add(cleaned);
            // Extract root forms (remove -ing, -ed, -s, etc.)
            const root = cleaned.replace(/(ing|ed|es|s|ly|tion|ness)$/, '');
            if (root.length >= 3) bdbRoots.add(root);
          }
        }
      }
    }
  }

  if (bdbKeywords.size === 0) return jastrowEntries;

  // Score each Jastrow entry based on keyword matches with BDB
  const scored = jastrowEntries.map(entry => {
    const defs = extractDefinitions(entry, true);
    let score = 0;
    let hasDirectMatch = false;

    for (const def of defs) {
      if (def.text) {
        const text = def.text.toLowerCase();
        const words = text.split(/\s+/);
        for (const word of words) {
          const cleaned = word.replace(/[^a-z]/g, '');
          // Direct keyword match
          if (bdbKeywords.has(cleaned)) {
            score += 15;
            hasDirectMatch = true;
          }
          // Root match (create/creation, form/forming)
          const root = cleaned.replace(/(ing|ed|es|s|ly|tion|ness)$/, '');
          if (root.length >= 3 && bdbRoots.has(root)) {
            score += 12;
            hasDirectMatch = true;
          }
          // Partial match
          for (const keyword of bdbKeywords) {
            if (cleaned.length >= 4 && keyword.length >= 4) {
              if (cleaned.startsWith(keyword.slice(0, 4)) || keyword.startsWith(cleaned.slice(0, 4))) {
                score += 5;
              }
            }
          }
        }
      }
    }
    return { entry, score, hasDirectMatch };
  });

  // FILTER: Only keep entries with keyword matches (score > 0)
  // This removes homographs like "son" when BDB says "create"
  const matched = scored.filter(s => s.score > 0 && s.hasDirectMatch);

  // If we have matches, use them; otherwise fall back to all entries
  const filtered = matched.length > 0 ? matched : scored;

  // Sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map(s => s.entry);
};

/**
 * Extract numbered definition senses from BDB-style definitions
 * Parses patterns like "1) meaning 2) meaning" or "1. meaning 2. meaning"
 * Also extracts semantic categories from parenthetical notes
 * @param {string} text - Raw definition text
 * @returns {Array<object>} - Array of { senseNum, text, semanticField }
 */
const parseNumberedSenses = (text) => {
  if (!text || typeof text !== 'string') return [];

  const senses = [];
  // Match patterns: "1)" "1." "1:" or "(1)" followed by text
  const sensePattern = /(?:^|\s)(?:\(?\d+[.):\]]\)?)\s*([^0-9(][^)]+?)(?=(?:\s+\(?\d+[.):\]]\)?|$))/gi;

  // Also try to detect semantic categories in parentheses: "(of God)" "(literal)" etc.
  const semanticPattern = /\(([^)]{2,30})\)/g;

  let match;
  let senseNum = 1;

  // Try numbered pattern first
  const text2 = ' ' + text; // Ensure patterns at start match
  while ((match = sensePattern.exec(text2)) !== null) {
    let senseText = cleanDefinitionText(match[1]);
    if (senseText && senseText.length >= 2) {
      // Extract semantic field from parenthetical notes
      let semanticField = null;
      const semMatch = senseText.match(semanticPattern);
      if (semMatch) {
        const potential = semMatch[0].slice(1, -1).toLowerCase();
        // Check if it's a semantic category (not a reference)
        const semanticKeywords = ['lit', 'fig', 'of god', 'divine', 'human', 'physical', 'moral',
          'abstract', 'concrete', 'transitive', 'intransitive', 'causative', 'reflexive'];
        if (semanticKeywords.some(k => potential.includes(k))) {
          semanticField = potential;
        }
      }

      senses.push({
        senseNum: senseNum++,
        text: senseText,
        semanticField: semanticField
      });
    }
  }

  // If no numbered senses found, try splitting by semicolon for multiple meanings
  if (senses.length === 0) {
    const parts = text.split(/;\s*/);
    for (const part of parts) {
      const cleaned = cleanDefinitionText(part);
      if (cleaned && cleaned.length >= 2) {
        senses.push({
          senseNum: senseNum++,
          text: cleaned,
          semanticField: null
        });
      }
    }
  }

  return senses;
};

/**
 * Extract definitions from entry content
 * Handles all Sefaria lexicon entry formats
 * Cleans HTML and scholarly notation from all definitions
 * Uses special extraction for Jastrow entries
 * Enhanced with numbered sense extraction for scholarly display
 * @param {object} entry - Lexicon entry
 * @param {boolean} isJastrow - Whether this is a Jastrow entry (requires special handling)
 */
const extractDefinitions = (entry, isJastrow = false) => {
  const definitions = [];

  if (!entry) return definitions;

  // Track sense numbers for BDB-style enumeration
  let globalSenseNum = 1;

  /**
   * Add a definition if it's valid and not a duplicate
   */
  const addDefinition = (text, extras = {}) => {
    // Use special Jastrow extraction for Jastrow entries
    const cleaned = isJastrow ? extractJastrowMeaning(text) : cleanDefinitionText(text);
    if (!cleaned || cleaned.length < 2) return;
    // Skip if it's just grammatical markers
    if (/^(?:[mfn]\.|ch\.|adj\.|v\.)$/i.test(cleaned)) return;
    // Skip if already exists (check first 40 chars for dedup)
    const normalized = cleaned.toLowerCase().slice(0, 40);
    if (definitions.find(d => d.text.toLowerCase().slice(0, 40) === normalized)) return;

    // Assign sense number if not provided
    const senseNum = extras.senseNum || globalSenseNum++;

    definitions.push({
      text: cleaned,
      senseNum,
      ...extras
    });
  };

  // First check for short_definition (quick summary) - often the cleanest
  if (entry.short_definition) {
    const shortDef = cleanDefinitionText(entry.short_definition);
    if (shortDef && shortDef.length >= 3) {
      definitions.push({ text: shortDef, isShort: true, senseNum: 0 }); // 0 = summary
    }
  }

  // Handle structured content with senses (BDB Augmented Strong format)
  if (entry.content?.senses) {
    let senseIdx = 1;
    for (const sense of entry.content.senses) {
      if (sense.definition) {
        addDefinition(sense.definition, {
          senseNum: senseIdx,
          grammar: sense.grammar || null,
          notes: sense.notes || null,
          semanticField: sense.semantic_field || sense.category || null
        });
        senseIdx++;
      }
      // Nested senses (e.g., 1a, 1b)
      if (sense.senses) {
        let subIdx = 0;
        for (const subSense of sense.senses) {
          if (subSense.definition) {
            const subLabel = String.fromCharCode(97 + subIdx); // a, b, c...
            addDefinition(subSense.definition, {
              senseNum: senseIdx - 1, // Same parent sense
              subSense: subLabel,
              grammar: subSense.grammar || null,
              notes: subSense.notes || null,
              isSubsense: true
            });
            subIdx++;
          }
        }
      }
    }
    globalSenseNum = senseIdx;
  }

  // Handle direct definition field - try to extract numbered senses
  if (entry.definition) {
    const defText = typeof entry.definition === 'string'
      ? entry.definition
      : JSON.stringify(entry.definition);

    // Try to parse numbered senses from definition text
    const numberedSenses = parseNumberedSenses(defText);
    if (numberedSenses.length > 1) {
      // Multiple senses found - add each with proper numbering
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          senseNum: sense.senseNum,
          semanticField: sense.semanticField
        });
      }
    } else {
      // Single definition
      addDefinition(defText);
    }
  }

  // Handle string content (HTML) - common in Jastrow entries
  if (typeof entry.content === 'string') {
    // Try to extract numbered senses from HTML content
    const numberedSenses = parseNumberedSenses(entry.content);
    if (numberedSenses.length > 1) {
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          senseNum: sense.senseNum,
          semanticField: sense.semanticField,
          raw: true
        });
      }
    } else {
      addDefinition(entry.content, { raw: true });
    }
  }

  // Handle 'definitions' array if present
  if (Array.isArray(entry.definitions)) {
    for (const def of entry.definitions) {
      const defText = typeof def === 'string' ? def : def?.text;
      const senseNum = typeof def === 'object' ? def?.sense_number : undefined;
      addDefinition(defText, senseNum ? { senseNum } : {});
    }
  }

  // Handle BDB/Jastrow specific fields
  if (entry.BDB) {
    const numberedSenses = parseNumberedSenses(entry.BDB);
    if (numberedSenses.length > 1) {
      for (const sense of numberedSenses) {
        addDefinition(sense.text, {
          source: 'BDB',
          senseNum: sense.senseNum,
          semanticField: sense.semanticField
        });
      }
    } else {
      addDefinition(entry.BDB, { source: 'BDB' });
    }
  }
  if (entry.Jastrow) {
    const jastrowDef = extractJastrowMeaning(entry.Jastrow);
    if (jastrowDef) {
      definitions.push({ text: jastrowDef, source: 'Jastrow', senseNum: globalSenseNum++ });
    }
  }

  return definitions;
};

// =============================================================================
// MAIN SCHOLARLY LOOKUP FUNCTION
// =============================================================================

/**
 * Generate word form variants for lookup
 * Handles prefixes, suffixes, plural forms, construct states, verb conjugations
 * Enhanced for better Torah Hebrew matching
 */
const generateWordForms = (word) => {
  const forms = new Set([word]);

  // Common Hebrew prefixes (articles, prepositions, conjunctions)
  const prefixes = [
    'וה', 'ול', 'וב', 'ומ', 'וכ', 'וש', // Vav + other prefix
    'שה', 'של', 'שב', 'שמ', 'שכ',       // Shin (that) + prefix
    'מה', 'לה', 'בה', 'כה',              // Prefix + article
    'ה',   // Definite article
    'ו',   // Vav (and)
    'ל',   // Lamed (to/for)
    'ב',   // Bet (in/with)
    'מ',   // Mem (from)
    'כ',   // Kaf (like/as)
    'ש',   // Shin (that/which)
  ];

  // Common Hebrew/Aramaic suffixes
  const suffixes = [
    'ותיהם', 'ותיהן', 'יהם', 'יהן',     // Compound suffixes
    'ותיו', 'ותיך', 'ותינו',              // More compounds
    'ות',  // feminine plural
    'ים',  // masculine plural
    'ין',  // Aramaic masculine plural
    'יא',  // Aramaic definite plural
    'תא',  // Aramaic definite feminine
    'א',   // Aramaic definite
    'ה',   // feminine singular / directive he
    'ת',   // feminine construct
    'י',   // construct state / 1st person
    'יו',  // 3rd person masc singular suffix
    'יה',  // 3rd person fem singular suffix
    'נו',  // 1st person plural suffix
    'ך',   // 2nd person masc suffix
    'כם',  // 2nd person masc plural suffix
    'כן',  // 2nd person fem plural suffix
    'הם',  // 3rd person masc plural suffix
    'הן',  // 3rd person fem plural suffix
    'ני',  // me (object suffix)
    'ם',   // them (short form)
    'ן',   // them fem (short form)
  ];

  // Verb conjugation prefixes (future tense / vav-conversive)
  const verbPrefixes = [
    'וי', 'ות', 'וא', 'ונ',  // Vav-conversive patterns
    'י', 'ת', 'א', 'נ',      // Future tense prefixes
  ];

  // Verb conjugation suffixes (past tense / imperatives)
  const verbSuffixes = [
    'תי', 'ת', 'תם', 'תן', 'נו', 'ו', 'ה', 'י', 'ו', 'נה',
  ];

  // Step 1: Try removing prefixes
  for (const prefix of prefixes) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      const stem = word.slice(prefix.length);
      forms.add(stem);
    }
  }

  // Step 2: Try removing suffixes
  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      forms.add(stem);

      // For feminine plural (ות), try adding ה for singular
      if (suffix === 'ות') {
        forms.add(stem + 'ה');
      }
      // For masculine plural (ים), try base form
      if (suffix === 'ים') {
        forms.add(stem);
        // Also try with ה ending (some words drop ה before ים)
        forms.add(stem + 'ה');
      }
    }
  }

  // Step 3: Try verb patterns (remove prefix AND suffix)
  for (const vPrefix of verbPrefixes) {
    if (word.startsWith(vPrefix) && word.length > vPrefix.length + 2) {
      const withoutPrefix = word.slice(vPrefix.length);
      forms.add(withoutPrefix);

      for (const vSuffix of verbSuffixes) {
        if (withoutPrefix.endsWith(vSuffix) && withoutPrefix.length > vSuffix.length + 2) {
          forms.add(withoutPrefix.slice(0, -vSuffix.length));
        }
      }
    }
  }

  // Step 4: Binyan (verb stem) patterns
  // Hif'il: remove leading ה and possibly middle י
  if (word.length >= 4 && word.startsWith('ה')) {
    const withoutH = word.slice(1);
    forms.add(withoutH);
    // Handle הגדיל -> גדל pattern
    if (withoutH.length === 3) {
      forms.add(withoutH);
    } else if (withoutH.length === 4 && withoutH[1] === 'י') {
      forms.add(withoutH[0] + withoutH.slice(2));
    }
  }

  // Hitpa'el: remove leading הת
  if (word.length >= 5 && word.startsWith('הת')) {
    forms.add(word.slice(2));
  }

  // Nif'al: remove leading נ
  if (word.length >= 4 && word.startsWith('נ')) {
    forms.add(word.slice(1));
  }

  // Step 5: Extract 3-letter root
  const root = extractRoot(word);
  if (root && root.length >= 3) {
    forms.add(root);
  }

  // Step 6: Combination - prefix AND suffix removal
  for (const prefix of prefixes.slice(0, 7)) { // Try common prefixes
    if (word.startsWith(prefix) && word.length > prefix.length + 3) {
      const withoutPrefix = word.slice(prefix.length);
      for (const suffix of suffixes.slice(0, 8)) { // Try common suffixes
        if (withoutPrefix.endsWith(suffix) && withoutPrefix.length > suffix.length + 2) {
          forms.add(withoutPrefix.slice(0, -suffix.length));
        }
      }
    }
  }

  // Step 7: Try ADDING common endings for incomplete forms
  // This helps Aramaic words like "יציא" match dictionary entries like "יציאה"
  // Only for words that might be truncated (3-5 letters, not already ending with common suffix)
  if (word.length >= 3 && word.length <= 6) {
    const commonEndings = [
      'ה',   // Feminine singular (יציא → יציאה)
      'א',   // Aramaic definite (מלכ → מלכא)
      'תא',  // Aramaic definite feminine
      'ת',   // Feminine construct
    ];

    // Don't add endings if word already ends with them
    for (const ending of commonEndings) {
      if (!word.endsWith(ending)) {
        forms.add(word + ending);
      }
    }

    // For words ending in א (Aramaic definite), also try ה variant
    // יציא → יציאה (the ה ending is often the dictionary form)
    if (word.endsWith('א') && !word.endsWith('תא')) {
      forms.add(word.slice(0, -1) + 'ה');
    }
  }

  return Array.from(forms);
};

/**
 * Comprehensive scholarly word lookup
 * Tries multiple word forms if exact match not found
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object>} Full scholarly analysis
 */
export const scholarlyLookup = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  const cacheKey = `scholarly:${CACHE_VERSION}:${cleaned}`;
  const cached = scholarlyCache.get(cacheKey);
  if (cached) return cached;

  // ==========================================================================
  // HALACHIC OVERRIDE: Check context-specific translations FIRST
  // This ensures words like השבת → "the Shabbat" (not "intermission")
  // NOTE: We no longer short-circuit here - we continue to fetch scholarly sources
  // and add the halachic override as a "recommended" source alongside them
  // ==========================================================================
  let halachicOverride = null;
  if (HALACHIC_OVERRIDE[cleaned]) {
    halachicOverride = {
      source: { name: 'Halachic', fullName: 'Halachic Context (recommended for Talmud study)' },
      headword: cleaned,
      definitions: [{ text: HALACHIC_OVERRIDE[cleaned], recommended: true }],
      _isOverride: true,
      recommended: true
    };
  }

  // ==========================================================================
  // LOCAL-FIRST: Get ALL local dictionaries (36k+ entries) for comprehensive data
  // These will be merged with API results to provide multiple scholarly sources
  // ==========================================================================
  const allLocalResults = await lookupAllLocalDictionaries(cleaned);

  // Generate word forms to try
  const wordForms = generateWordForms(cleaned);

  // Try each form until we find results
  let sefariaData = null;
  let matchedForm = cleaned;

  for (const form of wordForms) {
    const data = await fetchSefariaLexicon(form);
    if (data && Array.isArray(data) && data.length > 0) {
      sefariaData = data;
      matchedForm = form;
      break;
    }
  }

  // If no results from main API, try alternative endpoints
  if (!sefariaData || sefariaData.length === 0) {
    for (const form of wordForms.slice(0, 3)) { // Try first 3 forms only
      const altData = await fetchSefariaWordAlternative(form);
      if (altData && altData.length > 0) {
        sefariaData = altData;
        matchedForm = form;
        break;
      }
    }
  }

  // Parse entries by source, filtering by headword match to get accurate definitions
  const bySource = parseBySource(sefariaData, matchedForm);

  // Always try local Jastrow (25,000+ entries with morphological analysis)
  // Local is faster and handles prefixes/suffixes better than API
  try {
    const localEntry = await lookupLocalJastrow(cleaned);
    if (localEntry) {
      // Build morphological analysis note
      let morphNote = '';
      if (localEntry._strippedPrefix) {
        const prefixMeanings = {
          'ו': 'and', 'ה': 'the', 'ב': 'in', 'ל': 'to', 'מ': 'from', 'כ': 'like', 'ש': 'that',
          'וה': 'and the', 'וב': 'and in', 'ול': 'and to', 'ומ': 'and from',
          'שה': 'that the', 'כש': 'when'
        };
        const prefixMeaning = prefixMeanings[localEntry._strippedPrefix] || localEntry._strippedPrefix;
        morphNote += `[${prefixMeaning} + `;
      }
      if (localEntry._strippedSuffix) {
        const suffixMeanings = {
          'ים': 'pl.masc', 'ות': 'pl.fem', 'ין': 'pl.Aram', 'י': 'my', 'ך': 'your',
          'הם': 'their', 'נו': 'our'
        };
        morphNote += morphNote ? '' : '[';
        morphNote += `${localEntry._matchedForm} + ${suffixMeanings[localEntry._strippedSuffix] || localEntry._strippedSuffix}]`;
      } else if (morphNote) {
        morphNote += `${localEntry._matchedForm}]`;
      }

      // Add to results - prioritize local if API also returned results
      const localFormatted = {
        headword: localEntry.lemma || localEntry._matchedForm || cleaned,
        parent_lexicon: 'Jastrow Dictionary',
        content: localEntry.definition,
        short_definition: localEntry.definition,
        _isLocal: true,
        _ref: localEntry.ref,
        _matchType: localEntry._matchType,
        _morphNote: morphNote || null,
        _matchedForm: localEntry._matchedForm,
        // Copy morphological metadata so strictHeadwordFilter accepts these
        _strippedPrefix: localEntry._strippedPrefix,
        _strippedSuffix: localEntry._strippedSuffix
      };

      // If API didn't find Jastrow, use local
      if (bySource.jastrow.length === 0) {
        bySource.jastrow.push(localFormatted);
      } else {
        // API found something - check if local found a better/different match
        const apiHeadwords = bySource.jastrow.map(e => cleanWordForLookup(e.headword || ''));
        const localHeadword = cleanWordForLookup(localEntry._matchedForm || '');
        if (!apiHeadwords.includes(localHeadword)) {
          // Local found a different entry - add it
          bySource.jastrow.unshift(localFormatted);
        }
      }
    }
  } catch (e) { /* silent */ }

  // ==========================================================================
  // ADD ALL LOCAL DICTIONARY RESULTS (BDB, Strong's) for comprehensive scholarly data
  // This ensures users see multiple sources even when API is limited
  // ==========================================================================

  // Add local BDB if API didn't find it
  if (allLocalResults?.bdb && bySource.bdb.length === 0) {
    bySource.bdb.push(allLocalResults.bdb);
  }

  // Add local Strong's if API didn't find it
  if (allLocalResults?.strongs && bySource.strong.length === 0) {
    bySource.strong.push(allLocalResults.strongs);
  }

  // Also add local Jastrow from allLocalResults if not already added
  if (allLocalResults?.jastrow && bySource.jastrow.length === 0) {
    bySource.jastrow.push(allLocalResults.jastrow);
  }

  // Add Aramaic variant from Jastrow if found (e.g., רשות → רשותא = domain)
  // This provides the Talmudic meaning alongside the Hebrew meaning
  if (allLocalResults?.jastrowAlt) {
    // Add as a separate Jastrow entry with Aramaic context
    bySource.jastrow.push(allLocalResults.jastrowAlt);
  }

  /**
   * SMART headword filter - LCS + edit distance with prefix penalty
   */
  const strictHeadwordFilter = (entries) => {
    if (!entries || entries.length === 0) return [];

    // Edit distance
    const editDist = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      for (let i = 0; i <= a.length; i++) m[0][i] = i;
      for (let j = 0; j <= b.length; j++) m[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          m[j][i] = Math.min(m[j][i-1] + 1, m[j-1][i] + 1, m[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1));
        }
      }
      return m[b.length][a.length];
    };

    // LCS length (preserves character order)
    const lcs = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
        }
      }
      return m[b.length][a.length];
    };

    const scored = entries.map(entry => {
      const head = cleanWord(entry.headword || entry.word || entry.term || '');
      if (!head) return { entry, score: 0 };
      if (head === cleaned) return { entry, score: 1 };

      // MORPHOLOGICAL MATCH: Local entries with suffix/prefix stripping should pass
      // These are INTENTIONAL matches (e.g., הוצאות → הוצא via suffix strip)
      if (entry._strippedSuffix || entry._strippedPrefix || entry._isLocal) {
        return { entry, score: 0.95 }; // High score - valid morphological match
      }

      const maxLen = Math.max(cleaned.length, head.length);
      const minLen = Math.min(cleaned.length, head.length);

      // Core metrics
      const editSim = 1 - editDist(cleaned, head) / maxLen;
      const lcsRatio = lcs(cleaned, head) / maxLen;
      const lenRatio = minLen / maxLen;

      // Combined score emphasizing LCS
      let score = (editSim * 0.35) + (lcsRatio * 0.45) + (lenRatio * 0.2);

      // PENALTY: If search is longer and head is prefix, reduce score strongly
      // BUT skip for entries with _matchedForm (already verified morphologically)
      if (cleaned.startsWith(head) && head.length < cleaned.length && !entry._matchedForm) {
        const extraRatio = (cleaned.length - head.length) / cleaned.length;
        score *= (1 - extraRatio * 0.8); // Strong penalty
      }

      return { entry, score };
    });

    const maxScore = Math.max(...scored.map(s => s.score), 0);
    const threshold = Math.max(0.6, maxScore * 0.75); // Higher thresholds

    return scored.filter(s => s.score >= threshold).sort((a, b) => b.score - a.score).map(s => s.entry);
  };

  // Try Bolls.life API as additional source (if no BDB results from Sefaria)
  let bollsResult = null;
  if (bySource.bdb.length === 0) {
    for (const form of wordForms.slice(0, 2)) { // Try first 2 forms
      bollsResult = await fetchBollsLifeDefinition(form);
      if (bollsResult && bollsResult.definition) {
        break;
      }
    }
  }

  // Try STEP Bible if we have a Strong's number (primary scholarly source)
  let stepBibleResult = null;
  const strongNumber = bySource.strong?.[0]?.strong_number || bollsResult?.strongNumber;
  if (strongNumber) {
    try {
      stepBibleResult = await fetchStepBibleDefinition(strongNumber);
    } catch (e) { /* silent */ }
  }

  // Try CAL (Comprehensive Aramaic Lexicon) for Aramaic words
  // CAL is the premier academic Aramaic dictionary - essential for Talmud/Targum study
  let calResult = null;
  // Always try CAL for Aramaic lookups, or if Jastrow had results (indicates Aramaic)
  if (bySource.jastrow.length > 0 || bySource.steinsaltz?.length > 0) {
    try {
      calResult = await fetchCALDefinition(cleaned);
    } catch (e) { /* silent */ }
  }

  // Check if we have scholarly results (include halachic override)
  const hasResults = halachicOverride ||
                     bySource.bdb.length > 0 || bySource.jastrow.length > 0 ||
                     bySource.strong.length > 0 || bySource.klein.length > 0 ||
                     bySource.steinsaltz?.length > 0 || bySource.sefaria?.length > 0 ||
                     bySource.halot?.length > 0 || bySource.gesenius?.length > 0 ||
                     bySource.twot?.length > 0 || (bollsResult && bollsResult.definition) ||
                     (stepBibleResult && stepBibleResult.definition) ||
                     (calResult && calResult.definitions?.length > 0);

  // Build comprehensive result
  const result = {
    word: word,
    cleaned: cleaned,
    transliteration: transliterateHebrew(word), // Scholarly Latin script
    matchedForm: hasResults || bySource.other?.length > 0 ? matchedForm : null,
    root: extractRoot(cleaned),
    timestamp: Date.now(),

    // Dictionary entries by source - ALL use strictHeadwordFilter for safety
    sources: {
      // Halachic override (if applicable) - recommended for Talmud study context
      halachic: halachicOverride || null,

      bdb: (() => {
        const valid = strictHeadwordFilter(bySource.bdb);
        if (valid.length > 0) {
          return {
            source: SCHOLARLY_SOURCES.BDB,
            headword: valid[0]?.headword || cleaned,
            definitions: valid.flatMap(extractDefinitions),
            morphology: valid[0]?.content?.morphology || null,
            strongNumber: valid[0]?.strong_number || null
          };
        }
        // FALLBACK: Use local BDB if API results were filtered out
        if (allLocalResults?.bdb) {
          const localDef = extractJastrowMeaning(allLocalResults.bdb.content) ||
                           allLocalResults.bdb.short_definition;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.BDB,
              headword: allLocalResults.bdb.headword || cleaned,
              definitions: [{ text: localDef }],
              _isLocal: true
            };
          }
        }
        return null;
      })(),

      jastrow: (() => {
        const valid = strictHeadwordFilter(bySource.jastrow);
        if (valid.length > 0) {
          // Prioritize Jastrow entries that align with BDB definitions
          const prioritizedJastrow = prioritizeJastrowEntries(valid, bySource.bdb);
          return {
            source: SCHOLARLY_SOURCES.JASTROW,
            headword: prioritizedJastrow[0]?.headword || cleaned,
            definitions: prioritizedJastrow.flatMap(entry => extractDefinitions(entry, true)),
            language: 'Aramaic'
          };
        }
        // FALLBACK: Use local Jastrow if API results were filtered out
        if (allLocalResults?.jastrow) {
          const localDef = extractJastrowMeaning(allLocalResults.jastrow.content) ||
                           allLocalResults.jastrow.short_definition;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.JASTROW,
              headword: allLocalResults.jastrow.headword || cleaned,
              definitions: [{ text: localDef }],
              language: 'Aramaic',
              _isLocal: true
            };
          }
        }
        // Also try Aramaic variant
        if (allLocalResults?.jastrowAlt) {
          const altDef = extractJastrowMeaning(allLocalResults.jastrowAlt.content) ||
                         allLocalResults.jastrowAlt.short_definition;
          if (altDef) {
            return {
              source: SCHOLARLY_SOURCES.JASTROW,
              headword: allLocalResults.jastrowAlt.headword || cleaned,
              definitions: [{ text: altDef }],
              language: 'Aramaic',
              _isLocal: true,
              _isAramaicVariant: true
            };
          }
        }
        return null;
      })(),

      strong: (() => {
        const valid = strictHeadwordFilter(bySource.strong);
        if (valid.length > 0) {
          return {
            source: SCHOLARLY_SOURCES.STRONG,
            strongNumber: valid[0]?.strong_number || null,
            headword: valid[0]?.headword || cleaned,
            definitions: valid.flatMap(extractDefinitions)
          };
        }
        // FALLBACK: Use local Strong's if API results were filtered out
        if (allLocalResults?.strongs) {
          const localDef = allLocalResults.strongs.short_definition ||
                           allLocalResults.strongs.content;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.STRONG,
              strongNumber: allLocalResults.strongs.strong_number || null,
              headword: allLocalResults.strongs.headword || cleaned,
              definitions: [{ text: localDef }],
              _isLocal: true
            };
          }
        }
        return null;
      })(),

      // Klein - Show entry with clear headword indication for scholarly transparency
      klein: (() => {
        // First try strict match
        const valid = strictHeadwordFilter(bySource.klein);
        if (valid.length > 0) {
          // SEMANTIC DISAMBIGUATION: When multiple Klein entries pass (e.g., בְּרָא and בָּרָא both → ברא)
          // Use BDB/Jastrow definitions + known roots to prefer the one with matching meaning
          let bestEntry = valid[0];
          let bestScore = -1; // Start negative so first entry with ANY match wins

          // Collect reference keywords from BDB + Jastrow + cognate patterns
          const refKeywords = new Set();

          // From BDB
          for (const bdbEntry of (bySource.bdb || [])) {
            const defs = extractDefinitions(bdbEntry);
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  if (word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'its', 'are', 'was', 'has', 'had'].includes(word)) {
                    refKeywords.add(word);
                  }
                }
              }
            }
          }

          // From Jastrow
          for (const jEntry of (bySource.jastrow || [])) {
            const defs = extractDefinitions(jEntry, true);
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  if (word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'its', 'are', 'was', 'has', 'had'].includes(word)) {
                    refKeywords.add(word);
                  }
                }
              }
            }
          }

          // From COGNATE_PATTERNS (our curated Hebrew root meanings)
          const cognateData = COGNATE_PATTERNS[cleaned];
          if (cognateData?.meaning) {
            const words = cognateData.meaning.toLowerCase().split(/[^a-z]+/);
            for (const word of words) {
              if (word.length >= 3) {
                refKeywords.add(word);
              }
            }
          }

          // Score Klein entries by keyword match with reference sources
          for (const entry of valid) {
            const defs = extractDefinitions(entry);
            let score = 0;
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  // Exact keyword match
                  if (refKeywords.has(word)) {
                    score += 15;
                  }
                  // Partial/stem match (e.g., "create" matches "creation")
                  for (const kw of refKeywords) {
                    if (word.length >= 4 && kw.length >= 4) {
                      if (word.startsWith(kw.slice(0, 4)) || kw.startsWith(word.slice(0, 4))) {
                        score += 5;
                      }
                    }
                  }
                }
              }
            }
            if (score > bestScore) {
              bestScore = score;
              bestEntry = entry;
            }
          }

          return {
            source: SCHOLARLY_SOURCES.KLEIN,
            headword: bestEntry?.headword || cleaned,
            definitions: [bestEntry].flatMap(extractDefinitions),
            etymology: bestEntry?.etymology || null,
            isExactMatch: true
          };
        }
        // If no strict match but Klein has entries from strict filter, show them
        if (bySource.klein.length > 0) {
          const entry = bySource.klein[0];
          const entryHead = cleanWord(entry.headword || entry.word || entry.term || '');
          return {
            source: SCHOLARLY_SOURCES.KLEIN,
            headword: entryHead || cleaned,
            definitions: bySource.klein.flatMap(extractDefinitions),
            etymology: entry.etymology || null,
            isExactMatch: false,
            searchedWord: cleaned
          };
        }
        // SCHOLARLY FEATURE: If no strict match, show related word entries from Klein
        // This helps scholars see what Klein HAS even if it's a different but related word
        // (e.g., searching ברא shows Klein's entry for בר with clear indication)
        if (bySource.kleinRelated?.length > 0) {
          const entry = bySource.kleinRelated[0];
          const entryHead = cleanWord(entry.headword || entry.word || entry.term || '');
          // Only show if there's a reasonable relationship (at least 50% LCS match)
          const lcs = (a, b) => {
            const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
            for (let i = 1; i <= a.length; i++) {
              for (let j = 1; j <= b.length; j++) {
                m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
              }
            }
            return m[b.length][a.length];
          };
          const maxLen = Math.max(cleaned.length, entryHead.length);
          const lcsScore = lcs(cleaned, entryHead) / maxLen;

          // Show if at least 50% character overlap (looser than strict filter)
          if (lcsScore >= 0.5 && entryHead !== cleaned) {
            return {
              source: SCHOLARLY_SOURCES.KLEIN,
              headword: entryHead,
              definitions: [bySource.kleinRelated[0]].flatMap(extractDefinitions),
              etymology: entry.etymology || null,
              isExactMatch: false,
              searchedWord: cleaned // So UI can show "שורש קרוב: בר" (searched: ברא)
            };
          }
        }
        return null;
      })(),

      steinsaltz: (() => {
        const valid = strictHeadwordFilter(bySource.steinsaltz || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.STEINSALTZ,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(entry => extractDefinitions(entry, true)),
          language: 'Aramaic'
        };
      })(),

      sefaria: (() => {
        const valid = strictHeadwordFilter(bySource.sefaria || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.SEFARIA,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
      halot: (() => {
        const valid = strictHeadwordFilter(bySource.halot || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.HALOT,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // Gesenius - Classical Hebrew Grammar & Lexicon
      gesenius: (() => {
        const valid = strictHeadwordFilter(bySource.gesenius || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.GESENIUS,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // TWOT - Theological Wordbook of the Old Testament
      twot: (() => {
        const valid = strictHeadwordFilter(bySource.twot || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.TWOT,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // Bolls.life BDB API (additional online source)
      bolls: bollsResult ? {
        source: SCHOLARLY_SOURCES.BOLLS,
        headword: cleaned,
        definitions: [
          ...(bollsResult.definition ? [{ text: bollsResult.definition }] : []),
          ...(bollsResult.definitions || []).map(d => ({ text: d }))
        ].filter(d => d.text),
        strongNumber: bollsResult.strongNumber || null,
        partOfSpeech: bollsResult.partOfSpeech || null
      } : null,

      // STEP Bible - Scripture Tools for Every Person (Strong's definitions)
      step: stepBibleResult ? {
        source: SCHOLARLY_SOURCES.STEP,
        headword: cleaned,
        definitions: stepBibleResult.definition ? [{ text: stepBibleResult.definition }] : [],
        strongNumber: stepBibleResult.strongNumber || strongNumber || null,
        transliteration: stepBibleResult.transliteration || null
      } : null,

      // CAL - Comprehensive Aramaic Lexicon (premier Aramaic dictionary for Talmud/Targum)
      cal: calResult ? {
        source: SCHOLARLY_SOURCES.CAL,
        headword: calResult.headword || cleaned,
        definitions: calResult.definitions || [],
        dialect: calResult.dialect || null,
        partOfSpeech: calResult.partOfSpeech || null,
        etymology: calResult.etymology || null,
        language: 'Aramaic',
        url: calResult.url || null
      } : null,

      // Include other sources (miscellaneous lexicons)
      other: bySource.other?.length > 0 ? bySource.other.map(entry => ({
        lexicon: entry.parent_lexicon || 'Unknown',
        headword: entry.headword || cleaned,
        definitions: extractDefinitions(entry)
      })) : null
    },

    // Cognate analysis
    cognates: getCognateInfo(cleaned),

    // Grammar info
    grammar: getGrammarInfo(cleaned, bySource),

    // Summary for display (pass original word for Talmudic abbreviation detection)
    primaryDefinition: getPrimaryDefinition(bySource, bollsResult, {
      step: stepBibleResult,
      cal: calResult
    }, word),

    // Detected language - be more precise about Aramaic detection
    // Only CAL is a strong Aramaic indicator; Jastrow covers BOTH Hebrew and Aramaic
    // BDB is specifically Biblical Hebrew, so if BDB has results, prefer Hebrew
    language: calResult ? 'Aramaic' :
              bySource.bdb.length > 0 || bySource.strong.length > 0 ? 'Hebrew' :
              bySource.jastrow.length > 0 && bySource.jastrow[0]?.language === 'Aramaic' ? 'Aramaic' :
              'Hebrew',

    // Raw data for debugging (can be removed in production)
    _rawEntryCount: sefariaData?.length || 0,

    // Flag if halachic override was applied
    _halachicOverride: !!halachicOverride
  };

  scholarlyCache.set(cacheKey, result);
  return result;
};

/**
 * Get cognate information for a root
 */
const getCognateInfo = (word) => {
  const root = extractRoot(word);
  const pattern = COGNATE_PATTERNS[root];

  if (pattern) {
    return {
      root: root,
      cognates: pattern.cognates || [],
      arabicCognate: pattern.arabic || null,
      semanticField: pattern.meaning || null
    };
  }

  return null;
};

/**
 * Get grammar information - Enhanced binyan detection
 */
const getGrammarInfo = (word, bySource) => {
  const morphology = bySource.bdb?.[0]?.content?.morphology ||
                     bySource.strong?.[0]?.content?.morphology ||
                     bySource.other?.[0]?.content?.morphology;

  const info = {
    morphology: morphology || null,
    partOfSpeech: null,
    binyan: null,
    stem: null,
    gender: null,
    number: null,
    state: null,
    person: null,
    tense: null
  };

  // Detect binyan from word form patterns
  const cleaned = cleanWord(word);
  if (cleaned) {
    // Hitpa'el: התפעל pattern
    if (cleaned.startsWith('הת') && cleaned.length >= 5) {
      info.binyan = 'Hitpael';
      info.partOfSpeech = 'verb';
    }
    // Hif'il: הפעיל pattern
    else if (cleaned.startsWith('ה') && cleaned.length >= 4) {
      // Check for hif'il markers (often has י in middle)
      if (cleaned.length === 5 && cleaned[2] === 'י') {
        info.binyan = 'Hiphil';
        info.partOfSpeech = 'verb';
      }
    }
    // Nif'al: נפעל pattern
    else if (cleaned.startsWith('נ') && cleaned.length >= 4) {
      info.binyan = 'Niphal';
      info.partOfSpeech = 'verb';
    }
    // Pi'el/Pu'al: doubled middle letter
    else if (cleaned.length === 4 && cleaned[1] === cleaned[2]) {
      info.binyan = 'Piel';
      info.partOfSpeech = 'verb';
    }
  }

  // Parse morphology string if available
  if (morphology) {
    const morphLower = morphology.toLowerCase();

    // Part of speech
    if (morphLower.includes('verb')) info.partOfSpeech = 'verb';
    else if (morphLower.includes('noun')) info.partOfSpeech = 'noun';
    else if (morphLower.includes('adjective') || morphLower.includes('adj.')) info.partOfSpeech = 'adjective';
    else if (morphLower.includes('preposition') || morphLower.includes('prep.')) info.partOfSpeech = 'preposition';
    else if (morphLower.includes('adverb') || morphLower.includes('adv.')) info.partOfSpeech = 'adverb';
    else if (morphLower.includes('pronoun') || morphLower.includes('pron.')) info.partOfSpeech = 'pronoun';
    else if (morphLower.includes('particle')) info.partOfSpeech = 'particle';
    else if (morphLower.includes('conjunction') || morphLower.includes('conj.')) info.partOfSpeech = 'conjunction';
    else if (morphLower.includes('interjection')) info.partOfSpeech = 'interjection';
    else if (morphLower.includes('proper noun') || morphLower.includes('proper name')) info.partOfSpeech = 'proper noun';

    // Binyan detection from morphology text
    if (morphLower.includes('qal') || morphLower.includes('pa\'al')) info.binyan = 'Qal';
    else if (morphLower.includes('niphal') || morphLower.includes('nif\'al')) info.binyan = 'Niphal';
    else if (morphLower.includes('piel') || morphLower.includes('pi\'el')) info.binyan = 'Piel';
    else if (morphLower.includes('pual') || morphLower.includes('pu\'al')) info.binyan = 'Pual';
    else if (morphLower.includes('hiphil') || morphLower.includes('hif\'il') || morphLower.includes('hiph.')) info.binyan = 'Hiphil';
    else if (morphLower.includes('hophal') || morphLower.includes('hof\'al') || morphLower.includes('hoph.')) info.binyan = 'Hophal';
    else if (morphLower.includes('hitpael') || morphLower.includes('hitpa\'el') || morphLower.includes('hithp.')) info.binyan = 'Hitpael';
    // Aramaic stems
    else if (morphLower.includes('peal') || morphLower.includes('pe\'al')) info.binyan = 'Peal';
    else if (morphLower.includes('pael') || morphLower.includes('pa\'el')) info.binyan = 'Pael';
    else if (morphLower.includes('aphel') || morphLower.includes('af\'el')) info.binyan = 'Aphel';
    else if (morphLower.includes('ithpeel') || morphLower.includes('ithpe\'el')) info.binyan = 'Ithpeel';
    else if (morphLower.includes('ithpaal') || morphLower.includes('ithpa\'al')) info.binyan = 'Ithpaal';

    // Tense
    if (morphLower.includes('perfect') || morphLower.includes('perf.')) info.tense = 'Perfect';
    else if (morphLower.includes('imperfect') || morphLower.includes('impf.')) info.tense = 'Imperfect';
    else if (morphLower.includes('imperative') || morphLower.includes('imper.')) info.tense = 'Imperative';
    else if (morphLower.includes('infinitive') || morphLower.includes('inf.')) info.tense = 'Infinitive';
    else if (morphLower.includes('participle') || morphLower.includes('part.')) info.tense = 'Participle';
    else if (morphLower.includes('jussive')) info.tense = 'Jussive';
    else if (morphLower.includes('cohortative')) info.tense = 'Cohortative';

    // Gender
    if (morphLower.includes('masculine') || morphLower.includes('masc.') || morphLower.includes(' m.') || morphLower.includes(' m ')) {
      info.gender = 'masculine';
    } else if (morphLower.includes('feminine') || morphLower.includes('fem.') || morphLower.includes(' f.') || morphLower.includes(' f ')) {
      info.gender = 'feminine';
    }

    // Number
    if (morphLower.includes('plural') || morphLower.includes('plur.') || morphLower.includes(' pl.')) info.number = 'plural';
    else if (morphLower.includes('singular') || morphLower.includes('sing.') || morphLower.includes(' sg.')) info.number = 'singular';
    else if (morphLower.includes('dual')) info.number = 'dual';

    // State (construct vs absolute)
    if (morphLower.includes('construct') || morphLower.includes('const.') || morphLower.includes('cstr.')) info.state = 'construct';
    else if (morphLower.includes('absolute') || morphLower.includes('abs.')) info.state = 'absolute';

    // Person
    if (morphLower.includes('1st') || morphLower.includes('first')) info.person = '1st';
    else if (morphLower.includes('2nd') || morphLower.includes('second')) info.person = '2nd';
    else if (morphLower.includes('3rd') || morphLower.includes('third')) info.person = '3rd';
  }

  // Enhance with grammar analysis service (root extraction, prefix analysis)
  try {
    const grammarAnalysis = analyzeGrammar(word);
    if (grammarAnalysis) {
      // Add root information
      if (grammarAnalysis.root && !info.root) {
        info.root = grammarAnalysis.root;
        info.rootInfo = grammarAnalysis.rootInfo || null;
      }
      // Add prefix breakdown
      if (grammarAnalysis.prefixes && grammarAnalysis.prefixes.length > 0) {
        info.prefixes = grammarAnalysis.prefixes;
        info.prefixBreakdown = grammarAnalysis.prefixes
          .map(p => `${p.letter} (${p.meaning})`)
          .join(' + ');
      }
      // Fill in missing part of speech
      if (!info.partOfSpeech && grammarAnalysis.partOfSpeech?.name) {
        info.partOfSpeech = grammarAnalysis.partOfSpeech.name.toLowerCase();
      }
      // Add binyan from analysis if not already detected
      if (!info.binyan && grammarAnalysis.binyan?.name) {
        info.binyan = grammarAnalysis.binyan.name;
      }
      // Add tense from analysis if not already detected
      if (!info.tense && grammarAnalysis.tense?.name) {
        info.tense = grammarAnalysis.tense.name;
      }
    }
  } catch (e) { /* silent */ }

  // Return null if no useful info found
  if (!info.partOfSpeech && !info.binyan && !info.morphology && !info.root && !info.prefixes) return null;

  // Add full binyan info from BINYAN_INFO
  if (info.binyan) {
    // Map English binyan names to Hebrew keys
    const binyanMap = {
      'Qal': 'קל',
      'Niphal': 'נפעל',
      'Piel': 'פיעל',
      'Pual': 'פועל',
      'Hiphil': 'הפעיל',
      'Hophal': 'הופעל',
      'Hitpael': 'התפעל'
    };
    const hebrewKey = binyanMap[info.binyan];
    if (hebrewKey && BINYAN_INFO[hebrewKey]) {
      info.binyanInfo = {
        hebrew: hebrewKey,
        ...BINYAN_INFO[hebrewKey]
      };
    }
  }

  // Build form description (e.g., "Qal perfect 3ms")
  const formParts = [];
  if (info.binyan) formParts.push(info.binyan);
  if (info.tense) formParts.push(info.tense.toLowerCase());
  if (info.person) formParts.push(info.person.replace('st', '').replace('nd', '').replace('rd', ''));
  if (info.gender) formParts.push(info.gender === 'masculine' ? 'm' : 'f');
  if (info.number) formParts.push(info.number === 'singular' ? 's' : info.number === 'plural' ? 'p' : 'd');
  info.formDescription = formParts.length > 1 ? formParts.join(' ') : null;

  return info;
};

/**
 * Check if a definition appears to be a proper name (Biblical person/place)
 * These should be deprioritized when common noun definitions exist
 */
const isProperNameDefinition = (defText) => {
  if (!defText) return false;
  const text = defText.toLowerCase();
  // Patterns indicating proper names: "X = Y", "meaning of name", genealogies
  return (
    /^\s*\w+\s*=\s*["']/.test(text) ||  // "Mattenai = "gift of..."
    /gift of (god|jehovah|the lord)/i.test(text) ||
    /son of|father of|brother of/i.test(text) ||
    /proper name|proper noun/i.test(text) ||
    /a (levite|priest|king|prophet|judge)/i.test(text)
  );
};

/**
 * Check if word is a Talmudic/Rabbinic abbreviation
 * These often end with ׳ (geresh) or " (gershayim)
 */
const isTalmudicAbbreviation = (word) => {
  if (!word) return false;
  // Common Talmudic abbreviation markers
  return /[׳"'״]$/.test(word) || // Ends with geresh/gershayim/apostrophe
         /^(מתני|גמ|ר|רב|דר|תנ|ברי|וכו|עכ״ל|ע״ש|וגו)/i.test(word); // Common abbrev prefixes
};

/**
 * Get primary definition for quick display
 * @param {object} bySource - Dictionary entries organized by source
 * @param {object} bollsResult - Optional Bolls.life API result
 * @param {object} additionalResults - Optional additional API results (wiktionary, morfix, pealim)
 * @param {string} originalWord - Original word being looked up (for abbreviation detection)
 */
const getPrimaryDefinition = (bySource, bollsResult = null, additionalResults = {}, originalWord = '') => {
  // Check if this is a Talmudic abbreviation - prioritize Jastrow
  const isTalmudic = isTalmudicAbbreviation(originalWord);

  // For Talmudic abbreviations, check Jastrow FIRST
  if (isTalmudic && bySource.jastrow?.length > 0) {
    const defs = extractDefinitions(bySource.jastrow[0], true);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Check BDB - but skip if it's a proper name and we have Jastrow alternative
  if (bySource.bdb?.length > 0) {
    const defs = extractDefinitions(bySource.bdb[0]);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      const defText = fullDef?.text || defs[0].text;
      // Skip proper name definitions if Jastrow has a common noun definition
      if (isProperNameDefinition(defText) && bySource.jastrow?.length > 0) {
        const jastrowDefs = extractDefinitions(bySource.jastrow[0], true);
        if (jastrowDefs.length > 0 && !isProperNameDefinition(jastrowDefs[0]?.text)) {
          // Use Jastrow instead
          const jFullDef = jastrowDefs.find(d => !d.isShort);
          return jFullDef?.text || jastrowDefs[0].text;
        }
      }
      return defText;
    }
  }

  // Then Strong's - same proper name check
  if (bySource.strong?.length > 0) {
    const defs = extractDefinitions(bySource.strong[0]);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      const defText = fullDef?.text || defs[0].text;
      // Skip proper name definitions if Jastrow has a common noun definition
      if (isProperNameDefinition(defText) && bySource.jastrow?.length > 0) {
        const jastrowDefs = extractDefinitions(bySource.jastrow[0], true);
        if (jastrowDefs.length > 0 && !isProperNameDefinition(jastrowDefs[0]?.text)) {
          const jFullDef = jastrowDefs.find(d => !d.isShort);
          return jFullDef?.text || jastrowDefs[0].text;
        }
      }
      return defText;
    }
  }

  // Then Jastrow for Aramaic/Rabbinic (use isJastrow=true for proper cleaning)
  if (bySource.jastrow?.length > 0) {
    const defs = extractDefinitions(bySource.jastrow[0], true);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Then CAL (Comprehensive Aramaic Lexicon) - premier Aramaic dictionary
  if (additionalResults.cal?.definitions?.length > 0) {
    return additionalResults.cal.definitions[0]?.text || additionalResults.cal.definitions[0];
  }

  // Then Bolls.life (additional online BDB source)
  if (bollsResult?.definition) {
    return bollsResult.definition;
  }

  // Then STEP Bible (Strong's definitions)
  if (additionalResults.step?.definition) {
    return additionalResults.step.definition;
  }

  // Then Klein for etymology
  if (bySource.klein?.length > 0) {
    const defs = extractDefinitions(bySource.klein[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then HALOT (modern scholarly)
  if (bySource.halot?.length > 0) {
    const defs = extractDefinitions(bySource.halot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then Gesenius (classical Hebrew grammar)
  if (bySource.gesenius?.length > 0) {
    const defs = extractDefinitions(bySource.gesenius[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then TWOT (theological analysis)
  if (bySource.twot?.length > 0) {
    const defs = extractDefinitions(bySource.twot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Finally any other source
  if (bySource.other?.length > 0) {
    const defs = extractDefinitions(bySource.other[0]);
    if (defs.length > 0) return defs[0].text;
  }

  return null;
};

// =============================================================================
// ADDITIONAL SCHOLARLY FUNCTIONS
// =============================================================================

/**
 * Get etymology and cognate analysis
 */
export const getEtymology = async (word) => {
  const root = extractRoot(cleanWord(word));
  const pattern = COGNATE_PATTERNS[root];

  return {
    root: root,
    pattern: pattern || null,
    cognateLanguages: COGNATE_LANGUAGES,
    analysis: pattern ? {
      arabicCognate: pattern.arabic,
      semanticCore: pattern.meaning,
      relatedWords: pattern.cognates
    } : null
  };
};

/**
 * Get Hebrew grammar reference (Gesenius-style)
 */
export const getGrammarReference = (binyan) => {
  return BINYAN_INFO[binyan] || null;
};

/**
 * Get all binyanim info
 */
export const getAllBinyanim = () => BINYAN_INFO;

/**
 * Get verb tense info
 */
export const getVerbTenses = () => VERB_TENSES;

/**
 * Get biblical usage context for a word
 * Returns frequency, first occurrence, and usage notes
 * @param {string} word - Hebrew word
 * @returns {Promise<object>} Usage context with frequency, first occurrence, notes
 */
export const getBiblicalUsageContext = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // Search for first occurrence in Tanakh
    const response = await fetchWithFallback(
      `${SEFARIA_BASE}/search-wrapper?q=${encodeURIComponent(cleaned)}&type=text&size=5&filters[]=Tanakh`,
      { timeout: 8000 }
    );

    if (!response) return null;

    const total = response.total || 0;
    const hits = response.hits || [];

    // Get first occurrence
    let firstOccurrence = null;
    if (hits.length > 0) {
      // Sort by book order (Genesis first)
      const bookOrder = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
        'Joshua', 'Judges', 'Samuel', 'Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
        'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
        'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
        'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther',
        'Daniel', 'Ezra', 'Nehemiah', 'Chronicles'];

      const sorted = [...hits].sort((a, b) => {
        const bookA = (a.categories?.[1] || '').split(' ')[0];
        const bookB = (b.categories?.[1] || '').split(' ')[0];
        const orderA = bookOrder.indexOf(bookA);
        const orderB = bookOrder.indexOf(bookB);
        return (orderA === -1 ? 100 : orderA) - (orderB === -1 ? 100 : orderB);
      });

      const first = sorted[0];
      firstOccurrence = {
        ref: first.ref,
        heRef: first.heRef,
        book: first.categories?.[1] || '',
        text: (first.text || '').replace(/<[^>]*>/g, '').slice(0, 150)
      };
    }

    // Determine frequency category
    let frequencyCategory = null;
    let frequencyNote = null;
    if (total === 0) {
      frequencyCategory = 'not_found';
      frequencyNote = 'Not found in Tanakh';
    } else if (total === 1) {
      frequencyCategory = 'hapax';
      frequencyNote = 'Hapax legomenon (occurs only once)';
    } else if (total < 5) {
      frequencyCategory = 'rare';
      frequencyNote = `Rare word (${total} occurrences)`;
    } else if (total < 20) {
      frequencyCategory = 'uncommon';
      frequencyNote = `Uncommon (${total} occurrences)`;
    } else if (total < 100) {
      frequencyCategory = 'common';
      frequencyNote = `Common (${total} occurrences)`;
    } else {
      frequencyCategory = 'very_common';
      frequencyNote = `Very common (${total}+ occurrences)`;
    }

    // Get usage context from COGNATE_PATTERNS if available
    const root = extractRoot(cleaned);
    const cognateData = COGNATE_PATTERNS[root];
    let usageContext = null;
    if (cognateData?.meaning) {
      usageContext = cognateData.meaning;
    }

    return {
      word: cleaned,
      root: root,
      frequency: {
        total,
        category: frequencyCategory,
        note: frequencyNote
      },
      firstOccurrence,
      usageContext,
      // Mark special theological terms
      isTheologicalTerm: cognateData?.cognates?.some(c =>
        c.toLowerCase().includes('unique') || c.toLowerCase().includes('theological')
      ) || false
    };
  } catch (error) {
    log.warn('Biblical usage context lookup failed:', error);
    return null;
  }
};

/**
 * Search for word in biblical concordance
 */
export const searchConcordance = async (word, limit = 20) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return { results: [], total: 0 };

  try {
    const response = await fetch(
      `${SEFARIA_BASE}/search-wrapper?q=${encodeURIComponent(cleaned)}&type=text&size=${limit}&filters[]=Tanakh`
    );

    if (!response.ok) return { results: [], total: 0 };

    const data = await response.json();

    return {
      word: cleaned,
      total: data.total || 0,
      results: (data.hits || []).map(hit => ({
        ref: hit.ref,
        heRef: hit.heRef,
        text: hit.text?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
        book: hit.categories?.[1] || ''
      }))
    };
  } catch (error) {
    log.error('Concordance search failed:', error);
    return { results: [], total: 0 };
  }
};

/**
 * Get word frequency in Tanakh
 */
export const getWordFrequency = async (word) => {
  const concordance = await searchConcordance(word, 1);
  return {
    word: cleanWord(word),
    occurrences: concordance.total,
    isCommon: concordance.total > 50,
    isRare: concordance.total < 5
  };
};

/**
 * Format scholarly citation
 */
export const formatCitation = (source, entry) => {
  const sourceInfo = SCHOLARLY_SOURCES[source.toUpperCase()];
  if (!sourceInfo) return null;

  return {
    short: `${sourceInfo.abbreviation}`,
    full: `${sourceInfo.fullName} (${sourceInfo.year})`,
    academic: `${sourceInfo.abbreviation}, s.v. "${entry}"`,
    chicago: `"${entry}," in ${sourceInfo.fullName} (${sourceInfo.year})`
  };
};

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Lookup multiple words with scholarly data
 */
export const batchScholarlyLookup = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.map(cleanWord).filter(w => w.length >= 2))];

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    const promises = batch.map(async (word) => {
      const data = await scholarlyLookup(word);
      return { word, data };
    });

    const batchResults = await Promise.all(promises);
    for (const { word, data } of batchResults) {
      if (data) results.set(word, data);
    }

    // Rate limiting
    if (i + batchSize < uniqueWords.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

// =============================================================================
// SIMPLE LOOKUP FUNCTIONS (for backward compatibility with sefariaLexiconService)
// =============================================================================

/**
 * Simple direct lookup - returns basic translation data
 * Compatible with sefariaLexiconService.lookupWordSefaria
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object|null>} - Basic lookup result
 */
export const lookupWordSefaria = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const data = await fetchSefariaLexicon(cleaned);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Parse the first matching entry
    const entry = data[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract definitions from content.senses
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          definitions.push(cleanDefinitionText(sense.definition));
          if (!shortDefinition) {
            shortDefinition = cleanDefinitionText(sense.definition);
          }
        }
      }
    }

    // Fallback: use short_definition if available
    if (!shortDefinition && entry.short_definition) {
      shortDefinition = cleanDefinitionText(entry.short_definition);
    }

    // Determine language
    let language = 'Hebrew';
    if (entry.parent_lexicon?.toLowerCase().includes('jastrow') ||
        entry.parent_lexicon?.toLowerCase().includes('aramaic')) {
      language = 'Aramaic';
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language,
      strongNumber: entry.strong_number || null,
      sources: entry.parent_lexicon ? [entry.parent_lexicon] : []
    };
  } catch {
    // Silent fail - expected for many words
    return null;
  }
};

/**
 * Simple Jastrow-specific lookup
 * Compatible with sefariaLexiconService.lookupJastrow
 * @param {string} word - Aramaic word
 * @returns {Promise<object|null>} - Jastrow entry
 */
export const lookupJastrow = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Try local dictionary first (fast, offline-capable)
  try {
    const localEntry = await lookupLocalJastrow(word);
    if (localEntry) {
      const cleanedDef = extractJastrowMeaning(localEntry.definition) ||
                         cleanDefinitionText(localEntry.definition);
      return {
        word: cleaned,
        headword: localEntry.lemma || cleaned,
        definitions: cleanedDef ? [cleanedDef] : [],
        shortDefinition: cleanedDef,
        language: localEntry.isAramaic ? 'Aramaic' : 'Hebrew',
        source: 'Jastrow (local)',
        ref: localEntry.ref
      };
    }
  } catch (e) {
    // Continue to API fallback
  }

  // Fall back to Sefaria API
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Jastrow`,
      { timeout: 8000 }
    );
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Filter for Jastrow entries
    const jastrowEntries = data.filter(e =>
      e.parent_lexicon?.toLowerCase().includes('jastrow')
    );

    if (jastrowEntries.length === 0) return null;

    const entry = jastrowEntries[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract and clean definitions
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          const cleanedDef = extractJastrowMeaning(sense.definition);
          if (cleanedDef) {
            definitions.push(cleanedDef);
            if (!shortDefinition) shortDefinition = cleanedDef;
          }
        }
      }
    }

    if (!shortDefinition && entry.short_definition) {
      shortDefinition = extractJastrowMeaning(entry.short_definition) ||
                        cleanDefinitionText(entry.short_definition);
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language: 'Aramaic',
      source: 'Jastrow'
    };
  } catch {
    // Silent fail - expected for many words
    return null;
  }
};

/**
 * Get simple translation string
 * Compatible with sefariaLexiconService.getSimpleTranslation
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<string|null>} - Simple translation
 */
export const getSimpleTranslation = async (word) => {
  const result = await lookupWordSefaria(word);
  return result?.shortDefinition || result?.definitions?.[0] || null;
};

/**
 * Simple CAL-specific lookup for Aramaic words
 * Direct access to Comprehensive Aramaic Lexicon
 * @param {string} word - Aramaic word to look up
 * @returns {Promise<object|null>} - CAL entry
 */
export const lookupCAL = async (word) => {
  return fetchCALDefinition(word);
};

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Clear the scholarly cache - useful for debugging or forcing fresh lookups
 * Can be called from browser console: window.clearScholarlyCache()
 */
export const clearScholarlyCache = () => {
  scholarlyCache.clear();
  log.info('Cache cleared. Fresh lookups will be made.');
};

/**
 * Preload local Jastrow dictionary for instant Aramaic lookups
 * Call at app startup to avoid delay on first Aramaic word hover
 * @returns {Promise<boolean>} - True if loaded successfully
 */
export const preloadJastrow = async () => {
  try {
    const data = await loadLocalJastrow();
    return !!data;
  } catch (e) {
    log.warn('Jastrow preload failed:', e.message);
    return false;
  }
};

// Expose to window for debugging (development only)
if (typeof window !== 'undefined') {
  window.clearScholarlyCache = clearScholarlyCache;
  window.SCHOLARLY_CACHE_VERSION = CACHE_VERSION;
}

const scholarlyLexiconService = {
  // Main lookup
  scholarlyLookup,
  batchScholarlyLookup,

  // LOCAL DICTIONARIES (Offline-first - Priority 1)
  preloadDictionaries,      // Call at app startup for instant lookups
  getDictionaryStats,       // Check what's loaded
  lookupLocalDictionaries,  // Unified local lookup (Jastrow + BDB + Strong's)

  // Simple lookups (backward compatible with sefariaLexiconService)
  lookupWordSefaria,
  lookupJastrow,
  lookupCAL,
  getSimpleTranslation,

  // Etymology & cognates
  getEtymology,

  // Grammar
  getGrammarReference,
  getAllBinyanim,
  getVerbTenses,

  // Concordance
  searchConcordance,
  getWordFrequency,

  // Citations
  formatCitation,

  // Reference data
  SCHOLARLY_SOURCES,
  COGNATE_LANGUAGES,
  BINYAN_INFO,
  VERB_TENSES,

  // Utils
  cleanWord,
  extractRoot,

  // Cache management
  clearScholarlyCache,

  // Preloading (legacy - use preloadDictionaries instead)
  preloadJastrow
};

export default scholarlyLexiconService;
