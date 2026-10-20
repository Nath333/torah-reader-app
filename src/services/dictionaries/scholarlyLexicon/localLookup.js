// =============================================================================
// Lookups locaux offline — Jastrow, BDB, Strong's (42 000 entrées)
// Extrait de scholarlyLexiconService.js (recette docs/DECOUPE-MONOLITHES.md).
// L'état (cache de dédup) vit dans ./state.js.
// =============================================================================

// Unified dictionary loader (single source of truth for dictionary data)
import * as dictionaryLoader from '../dictionaryLoader';
import { cleanHebrewWord, normalizeFinals, stripVowels } from '../../../utils/hebrewUtils';
// Import shared morphology constants for prefix/suffix handling
import {
  HEBREW_PREFIXES_ORDERED,
  HEBREW_SUFFIXES_ORDERED
} from '../../../constants/morphology';
import { createLogger } from '../../../utils/debug';
import { _lookupCache, CACHE_TTL, CACHE_MAX } from './state';

const log = createLogger('ScholarlyLexicon');

// =============================================================================
// LOCAL DICTIONARY DATA (Offline-First)
// This avoids duplicate loading and reduces memory usage
// Combined: ~42,000 entries for instant lookups without API calls
// - Jastrow: 25,224 entries (Aramaic/Rabbinic Hebrew - Talmud, Midrash)
// - BDB: 8,050 Strong's numbers / 6,000 unique words (Biblical Hebrew)
// - Strong's: 8,674 Strong's numbers / 6,242 unique words (Concordance)
// Sources: openscriptures/strongs (CC-BY-SA), eliranwong/unabridged-BDB (PD)
// =============================================================================

/**
 * Load local Jastrow dictionary (Aramaic/Rabbinic Hebrew)
 * 25,224 entries - best for Talmud, Midrash, Targumim
 * Now delegates to unified dictionaryLoader
 */
export const loadLocalJastrow = () => dictionaryLoader.getJastrow();

/**
 * Load local BDB dictionary (Brown-Driver-Briggs)
 * 8,050 Strong's numbers / 6,000 unique words - best for Biblical Hebrew
 * Source: eliranwong/unabridged-BDB-Hebrew-lexicon (Public Domain)
 * Now delegates to unified dictionaryLoader
 */
export const loadLocalBDB = async () => {
  const data = await dictionaryLoader.getBDB();
  return data?.byWord || data;
};

/**
 * Load local Strong's dictionary
 * 8,674 Strong's numbers / 6,242 unique words - Strong's Concordance
 * Source: openscriptures/strongs (CC-BY-SA)
 * Now delegates to unified dictionaryLoader
 */
export const loadLocalStrongs = async () => {
  const data = await dictionaryLoader.getStrongs();
  return data?.byWord || data;
};

/**
 * Preload ALL local dictionaries at app startup
 * Call this early in app initialization for instant lookups
 * Now delegates to unified dictionaryLoader
 * @returns {Promise<object>} Stats about loaded dictionaries
 */
export const preloadDictionaries = async () => {
  log.debug('Preloading local dictionaries via dictionaryLoader...');
  const startTime = Date.now();

  await dictionaryLoader.preloadDictionaries();

  const loadTime = Date.now() - startTime;
  const stats = getDictionaryStats();

  log.debug(`Dictionaries preloaded in ${loadTime}ms: ${stats.totalEntries} total entries`);

  return stats;
};

/**
 * Get statistics about loaded dictionaries
 * Now uses dictionaryLoader cache status
 */
export const getDictionaryStats = () => {
  const cacheStatus = dictionaryLoader.getCacheStatus();
  const bdbData = dictionaryLoader.getBDBData();
  const jastrowData = dictionaryLoader.getJastrowData();
  const strongsData = dictionaryLoader.getStrongsData();

  const jastrowCount = jastrowData ? Object.keys(jastrowData).length : 0;
  const bdbCount = bdbData?.byWord ? Object.keys(bdbData.byWord).length : (bdbData ? Object.keys(bdbData).length : 0);
  const strongsCount = strongsData?.byWord ? Object.keys(strongsData.byWord).length : (strongsData ? Object.keys(strongsData).length : 0);

  return {
    jastrow: { loaded: cacheStatus.jastrow, entries: jastrowCount },
    bdb: { loaded: cacheStatus.bdb, entries: bdbCount },
    strongs: { loaded: cacheStatus.strongs, entries: strongsCount },
    totalEntries: jastrowCount + bdbCount + strongsCount,
    preloadComplete: cacheStatus.bdb && cacheStatus.jastrow && cacheStatus.strongs
  };
};

// Use shared morphology constants for prefix/suffix analysis
// HEBREW_PREFIXES_ORDERED and HEBREW_SUFFIXES_ORDERED imported from morphology.js

/**
 * Extract cross-reference target from Jastrow definition
 * Examples: "v. נוֹמִי" → "נומי", "= שַׁבָּת" → "שבת"
 * @param {string} definition - Raw Jastrow definition
 * @returns {string|null} - Target word (without vowels) or null
 */
export const extractJastrowCrossRef = (definition) => {
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
      return stripVowels(match[1]);
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
export const lookupLocalJastrow = async (word, _depth = 0) => {
  // Prevent infinite recursion on cross-references
  if (_depth > 3) return null;

  const data = await loadLocalJastrow();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // normalizeFinals imported from ../utils/hebrewUtils

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
  // Construct+possessive suffixes that need ה restoration: תו, תי, תך, תם, תן, תנו
  const CONSTRUCT_POSSESSIVE_SUFFIXES = new Set(['תו', 'תי', 'תך', 'תם', 'תן', 'תנו']);

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

      // Construct-state ה restoration
      // For construct+possessive suffixes (תו, תי, etc.), try adding ה to stem
      // Example: שגגתו → strip תו → שגג → try שגגה ✓
      if (CONSTRUCT_POSSESSIVE_SUFFIXES.has(suffix)) {
        result = tryLookup(stem + 'ה');
        if (result) {
          return {
            ...result.entry,
            _matchedForm: result.matchedForm,
            _strippedSuffix: suffix,
            _matchType: 'construct-to-absolute'
          };
        }
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

      // For possessive suffixes where stem ends in ת (construct state)
      // Try replacing ת with ה to get absolute form
      // Example: מלאכת + ו = מלאכתו → strip ו → מלאכת → מלאכה ✓
      if (['ו', 'י', 'ך', 'ה'].includes(suffix) && stem.endsWith('ת') && stem.length >= 3) {
        const absoluteForm = stem.slice(0, -1) + 'ה';
        result = tryLookup(absoluteForm);
        if (result) {
          return {
            ...result.entry,
            _matchedForm: result.matchedForm,
            _strippedSuffix: suffix,
            _matchType: 'construct-to-absolute'
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

  // Qal active participle pattern: CוCC → root CCC
  // Example: זורק (throwing) → root זרק (to throw)
  // Pattern: 4 letters with ו as second letter = Qal active participle (בינוני פועל)
  if (cleaned.length === 4 && cleaned[1] === 'ו') {
    const root = cleaned[0] + cleaned.slice(2); // Remove the ו
    result = tryLookup(root);
    if (result) {
      return { ...result.entry, _matchedForm: result.matchedForm, _matchType: 'qal-participle-root' };
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
export const lookupLocalBDB = async (word) => {
  const data = await loadLocalBDB();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // normalizeFinals imported from ../utils/hebrewUtils

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
export const lookupLocalStrongs = async (word) => {
  const data = await loadLocalStrongs();
  if (!data) return null;

  const cleaned = cleanWordForLookup(word);
  if (!cleaned || cleaned.length < 2) return null;

  // normalizeFinals imported from ../utils/hebrewUtils

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
export const CROSS_REF_PATTERNS = [
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
export const isCrossReferenceOnly = (text) => {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return CROSS_REF_PATTERNS.some(pattern => pattern.test(trimmed));
};

export const lookupLocalDictionaries = async (word) => {
  if (!word || word.length < 2) return null;

// Check cache first
  const cacheKey = word;
  const cached = _lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

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

  if (results.length === 0) {
    if (_lookupCache.size >= CACHE_MAX) _lookupCache.delete(_lookupCache.keys().next().value);
    _lookupCache.set(cacheKey, { result: null, timestamp: Date.now() });
    return null;
  }
  results.sort((a, b) => a._priority - b._priority);

  const result = results[0];
  if (_lookupCache.size >= CACHE_MAX) _lookupCache.delete(_lookupCache.keys().next().value);
  _lookupCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
};

/**
 * Lookup ALL local dictionaries and return ALL results (not just the best)
 * Used to provide comprehensive multi-source data for scholarly apps
 * Enhanced: Also tries Aramaic variants for Talmudic context
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object>} Object with jastrow, bdb, strongs, jastrowAlt (Aramaic variant)
 */
export const lookupAllLocalDictionaries = async (word) => {
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
