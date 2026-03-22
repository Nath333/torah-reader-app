// =============================================================================
// Combined Translation Service
// Uses Sefaria API (BDB, Jastrow, Strong's) as primary source
// Falls back to local dictionaries when offline or API fails
// Returns multiple scholarly sources for professional Jewish study
// =============================================================================

import { scholarlyLookup, lookupWordSefaria, getSimpleTranslation, lookupJastrow } from './scholarlyLexiconService';
import { cleanHebrewWord } from './hebrewDictionary';
import { isLikelyAramaic } from './babylonianDictionary';
import { translateEnglishToFrench, quickTranslate } from './englishToFrenchService';
import { createCache } from '../utils/cache';
// Local dictionaries for offline fallback
import { BDB_BY_WORD, BDB_BY_STRONGS } from '../data/bdbComplete';
import { JASTROW_COMPLETE } from '../data/jastrowComplete';
// Full Strong's concordance (8,674 Hebrew entries + Greek)
import { STRONGS_BY_WORD, STRONGS_BY_NUMBER } from '../data/strongsComplete.js';
// Additional local lexicons (Klein etymology, Strong's subset, BDB Aramaic)
import { KLEIN_LEXICON, STRONG_LEXICON, BDB_ARAMAIC } from '../data/hebrewLexicons.js';
// Local Aramaic dictionaries for offline lookup (CAL subset + Jastrow Aramaic)
import { CAL_ARAMAIC } from '../data/calAramaic';
import { JASTROW_ARAMAIC } from '../data/jastrowAramaic';
// CAL (Comprehensive Aramaic Lexicon) for Aramaic words - API-based
import { lookupAramaicWord as lookupCalAramaic } from './calDictionaryService';
import { createLogger } from '../utils/debug';
import {
  pickBestDefinition,
  extractCrossReference,
  followCrossReference,
  cleanDefinition,
  scoreDefinition,
  pickBestFromCandidates,
  // PRO SCHOLAR v2: Context-aware source prioritization
  CONTEXT_MODES,
  shouldSkipSource
} from '../utils/definitionCleaner';
// Dynamic halachic lookup with prefix handling
import { lookupHalachicWithPrefix } from '../utils/commentaryUtils';
// Centralized stop words, prefix list, and smart pattern detection for morphology
import { STOP_WORDS, isLikelyCompleteRoot, HEBREW_PREFIXES_ORDERED, HEBREW_SUFFIXES_ORDERED } from '../constants/morphology';
// PRO SCHOLAR v2: Reference-based context detection for auto dictionary selection
import { getContextFromReference } from '../constants/bookConstants';

// =============================================================================
// Debug Logging for Lookup Tracking
// =============================================================================
const log = createLogger('CombinedTranslation');
const DEBUG_LOOKUPS = process.env.NODE_ENV === 'development';

/**
 * Log lookup step results in development mode
 */
const logLookup = (step, word, result) => {
  if (DEBUG_LOOKUPS) {
    const status = result ? 'found' : 'miss';
    const details = result?.source || result?.matchedForm || '';
    log.debug(`[Lookup] ${word} → ${step}: ${status}${details ? ` (${details})` : ''}`);
  }
};

// =============================================================================
// Morphological Analysis for Better Matching
// =============================================================================

// Hebrew/Aramaic prefixes and suffixes - imported from centralized morphology.js
// This ensures ONE source of truth for prefix combinations like כשה (when the)
const HEBREW_PREFIXES = HEBREW_PREFIXES_ORDERED;
const HEBREW_SUFFIXES = HEBREW_SUFFIXES_ORDERED;

/**
 * Normalize final letters (sofit → regular form)
 */
const normalizeFinals = (word) => word
  .replace(/ם/g, 'מ')
  .replace(/ן/g, 'נ')
  .replace(/ץ/g, 'צ')
  .replace(/ף/g, 'פ')
  .replace(/ך/g, 'כ');

/**
 * Check if two Hebrew words are similar enough (share most consonants)
 * Used to prevent morphology from matching completely unrelated words
 */
const areSimilarWords = (word1, word2) => {
  if (!word1 || !word2) return false;
  // Remove vowels and normalize
  const clean1 = word1.replace(/[\u0591-\u05C7]/g, '');
  const clean2 = word2.replace(/[\u0591-\u05C7]/g, '');
  // Must share at least 2 consonants in same position
  const minLen = Math.min(clean1.length, clean2.length);
  if (minLen < 2) return clean1 === clean2;
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (clean1[i] === clean2[i]) matches++;
  }
  return matches >= Math.min(2, minLen - 1);
};

/**
 * Try to find a word in a dictionary with morphological variations
 * VALIDATES matches using areSimilarWords() to prevent wrong entries like "Tima" for "שתים"
 * @param {string} word - The word to look up
 * @param {Object} dictionary - The dictionary object
 * @returns {Object|null} - { entry, matchedForm, strippedPrefix, strippedSuffix }
 */
const lookupWithMorphology = (word, dictionary) => {
  if (!word || !dictionary) return null;

  // Direct match - no validation needed
  if (dictionary[word]) {
    return { entry: dictionary[word], matchedForm: word };
  }

  // Normalized match - no validation needed (same word, different finals)
  const normalized = normalizeFinals(word);
  if (normalized !== word && dictionary[normalized]) {
    return { entry: dictionary[normalized], matchedForm: normalized };
  }

  // SMART ROOT DETECTION: Use pattern-based detection instead of just hardcoded lists
  // This catches verb patterns (הגיד, מביא), noun patterns (מלאכה, הלכה), etc.
  // e.g., "כרת" should NOT become "כ + רת" (like + cut)
  if (STOP_WORDS.has(word) || STOP_WORDS.has(normalized) || isLikelyCompleteRoot(word)) {
    return null; // Don't try morphological variations - this is a complete root
  }

  // Helper: validate that matched entry is actually related to original word
  // Checks if the entry's lemma/headword shares consonants with original
  const isValidMatch = (entry, stem, originalWord) => {
    // Get the actual headword from the entry
    const headword = entry.lemma || entry.word || entry.headword || stem;
    // Must share consonants with the original (minus stripped affixes)
    return areSimilarWords(headword, stem) || areSimilarWords(headword, originalWord);
  };

  // Try stripping prefixes
  for (const prefix of HEBREW_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 1) {
      const stem = word.slice(prefix.length);

      // CRITICAL: Check if stem is a STOP WORD - this is our target word!
      // e.g., "השבת" = "ה" + "שבת" - שבת is a stop word, so look it up directly
      if (STOP_WORDS.has(stem)) {
        if (dictionary[stem]) {
          return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
        }
        // Stop word not in this dictionary - continue to next prefix, don't strip further
        continue;
      }

      if (dictionary[stem]) {
        // VALIDATE: entry must be related to stem
        if (isValidMatch(dictionary[stem], stem, word)) {
          return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
        }
      }
      const normalizedStem = normalizeFinals(stem);
      if (normalizedStem !== stem && dictionary[normalizedStem]) {
        if (isValidMatch(dictionary[normalizedStem], normalizedStem, word)) {
          return { entry: dictionary[normalizedStem], matchedForm: normalizedStem, strippedPrefix: prefix };
        }
      }
    }
  }

  // Try stripping suffixes
  for (const suffix of HEBREW_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      if (dictionary[stem]) {
        // VALIDATE: entry must be related to stem
        if (isValidMatch(dictionary[stem], stem, word)) {
          return { entry: dictionary[stem], matchedForm: stem, strippedSuffix: suffix };
        }
      }
      // For ות plural, try adding ה for feminine singular
      if (suffix === 'ות' && dictionary[stem + 'ה']) {
        if (isValidMatch(dictionary[stem + 'ה'], stem + 'ה', word)) {
          return { entry: dictionary[stem + 'ה'], matchedForm: stem + 'ה', strippedSuffix: suffix };
        }
      }
    }
  }

  // Try stripping both prefix AND suffix
  for (const prefix of HEBREW_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 3) {
      const afterPrefix = word.slice(prefix.length);
      for (const suffix of HEBREW_SUFFIXES) {
        if (afterPrefix.endsWith(suffix) && afterPrefix.length > suffix.length + 2) {
          const stem = afterPrefix.slice(0, -suffix.length);
          if (dictionary[stem]) {
            // VALIDATE: entry must be related to stem
            if (isValidMatch(dictionary[stem], stem, word)) {
              return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix, strippedSuffix: suffix };
            }
          }
        }
      }
    }
  }

  return null;
};

// Use shared cache utility for combined lookups
const combinedCache = createCache({ ttl: 60 * 60 * 1000, maxSize: 1000 }); // 1 hour

// =============================================================================
// Local Dictionary Fallback Lookups
// =============================================================================

/**
 * Raw BDB lookup (no cross-reference following) - used by followCrossReference
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - Raw dictionary entry
 */
const lookupBDBRaw = (word) => {
  if (!word || !BDB_BY_WORD) return null;

  const match = lookupWithMorphology(word, BDB_BY_WORD);
  if (!match?.entry) return null;

  return {
    definition: match.entry.definition || match.entry.fullDef,
    lemma: match.entry.lemma,
    pos: match.entry.pos,
    strongs: match.entry.strongs,
    matchedForm: match.matchedForm
  };
};

/**
 * Look up a word in the local BDB dictionary
 * Uses morphological matching for better coverage
 * DYNAMIC CROSS-REFERENCE FOLLOWING: When BDB returns "see X",
 * we follow the reference to get the real definition
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalBDB = (word) => {
  if (!word || !BDB_BY_WORD) return null;

  const match = lookupWithMorphology(word, BDB_BY_WORD);
  if (!match?.entry) return null;

  const entry = match.entry;
  const rawDef = entry.definition || entry.fullDef?.substring(0, 200) || null;

  // Check if this is a cross-reference
  const crossRefTarget = extractCrossReference(rawDef);
  if (crossRefTarget) {
    // DYNAMIC: Follow the cross-reference to get the real definition
    const resolved = followCrossReference(rawDef, lookupBDBRaw);
    if (resolved?.resolvedDefinition) {
      return {
        english: resolved.resolvedDefinition,
        fullDefinition: `${rawDef} → ${resolved.resolvedDefinition}`,
        source: 'BDB (Local)',
        sources: [{
          name: 'BDB',
          fullName: 'Brown-Driver-Briggs (Local)',
          definition: resolved.resolvedDefinition,
          year: 1906,
          strongNumber: entry.strongs,
          crossRefChain: resolved.chain
        }],
        headword: resolved.finalWord || entry.lemma,
        pos: entry.pos,
        strongNumber: entry.strongs,
        matchedForm: match.matchedForm,
        strippedPrefix: match.strippedPrefix,
        strippedSuffix: match.strippedSuffix,
        crossRefResolved: true,
        offline: true
      };
    }
    // Cross-reference couldn't be resolved - try other dictionaries
    return null;
  }

  // VALIDATE: Reject garbage definitions
  const cleanDef = pickBestDefinition(rawDef);
  if (!cleanDef) return null;

  return {
    english: cleanDef,
    fullDefinition: entry.fullDef,
    source: 'BDB (Local)',
    sources: [{
      name: 'BDB',
      fullName: 'Brown-Driver-Briggs (Local)',
      definition: cleanDef, // Use filtered definition
      year: 1906,
      strongNumber: entry.strongs
    }],
    headword: entry.lemma,
    pos: entry.pos,
    strongNumber: entry.strongs,
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Raw Jastrow lookup (no cross-reference following) - used by followCrossReference
 * @param {string} word - Cleaned Hebrew/Aramaic word
 * @returns {object|null} - Raw dictionary entry
 */
const lookupJastrowRaw = (word) => {
  if (!word || !JASTROW_COMPLETE) return null;

  const match = lookupWithMorphology(word, JASTROW_COMPLETE);
  if (!match?.entry) return null;

  return {
    definition: match.entry.definition,
    lemma: match.entry.lemma,
    pos: match.entry.pos,
    isAramaic: match.entry.isAramaic,
    matchedForm: match.matchedForm
  };
};

/**
 * Look up a word in the local Jastrow dictionary
 * Uses morphological matching for better Aramaic/Talmudic coverage
 * DYNAMIC CROSS-REFERENCE FOLLOWING: When Jastrow returns "→ שַׁבָּת",
 * we follow the reference to get the real definition instead of rejecting it
 * @param {string} word - Cleaned Hebrew/Aramaic word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalJastrow = (word) => {
  if (!word || !JASTROW_COMPLETE) return null;

  const match = lookupWithMorphology(word, JASTROW_COMPLETE);
  if (!match?.entry) return null;

  const entry = match.entry;
  // Extract a shorter definition for display (remove Hebrew headword at start)
  const rawDef = entry.definition
    ? entry.definition.replace(/^[\u0590-\u05FF]+\s+/, '').substring(0, 200)
    : null;

  // Check if this is a cross-reference (e.g., "→ שַׁבָּת", "v. שבת", "see שבת")
  const crossRefTarget = extractCrossReference(rawDef);
  if (crossRefTarget) {
    // DYNAMIC: Follow the cross-reference to get the real definition
    const resolved = followCrossReference(rawDef, lookupJastrowRaw);
    if (resolved?.resolvedDefinition) {
      return {
        english: resolved.resolvedDefinition,
        fullDefinition: `${entry.definition} → ${resolved.resolvedDefinition}`,
        source: 'Jastrow (Local)',
        sources: [{
          name: 'Jastrow',
          fullName: 'Jastrow Dictionary (Local)',
          definition: resolved.resolvedDefinition,
          year: 1903,
          crossRefChain: resolved.chain // Track the reference chain for debugging
        }],
        headword: resolved.finalWord || entry.lemma,
        pos: entry.pos,
        isAramaic: entry.isAramaic,
        language: entry.isAramaic ? 'Aramaic' : 'Hebrew',
        matchedForm: match.matchedForm,
        strippedPrefix: match.strippedPrefix,
        strippedSuffix: match.strippedSuffix,
        crossRefResolved: true, // Flag that this came from a cross-reference
        offline: true
      };
    }
    // Cross-reference couldn't be resolved - let BDB try
    return null;
  }

  // VALIDATE: Reject garbage definitions (but we already handled cross-refs above)
  const shortDef = pickBestDefinition(rawDef);
  if (!shortDef) {
    // Jastrow returned garbage - let BDB handle this word
    return null;
  }

  return {
    english: shortDef,
    fullDefinition: entry.definition,
    source: 'Jastrow (Local)',
    sources: [{
      name: 'Jastrow',
      fullName: 'Jastrow Dictionary (Local)',
      definition: shortDef,
      year: 1903
    }],
    headword: entry.lemma,
    pos: entry.pos,
    isAramaic: entry.isAramaic,
    language: entry.isAramaic ? 'Aramaic' : 'Hebrew',
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Look up a word in the local Klein Etymology dictionary
 * Uses morphological matching for better coverage
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalKlein = (word) => {
  if (!word || !KLEIN_LEXICON) return null;

  const match = lookupWithMorphology(word, KLEIN_LEXICON);
  if (!match?.entry) return null;

  const entry = match.entry;
  const rawDef = entry.definition?.substring(0, 200);
  const cleanDef = pickBestDefinition(rawDef);
  if (!cleanDef) return null;

  return {
    english: cleanDef,
    fullDefinition: entry.definition,
    source: 'Klein (Local)',
    sources: [{
      name: 'Klein',
      fullName: "Klein's Etymological Dictionary (Local)",
      definition: cleanDef,
      year: 1987
    }],
    headword: entry.lemma || match.matchedForm,
    pos: entry.pos,
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Look up a word in the local Strong's Concordance
 * Uses FULL Strong's data (8,674 Hebrew entries) with morphological matching
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalStrong = (word) => {
  if (!word) return null;

  // Try full Strong's dictionary first (with morphology)
  const fullMatch = lookupWithMorphology(word, STRONGS_BY_WORD);
  if (fullMatch?.entry) {
    const entry = fullMatch.entry;
    // Extract clean definition from full Strong's format
    const rawDef = entry.gloss || entry.definition || entry.kjv_def;
    const cleanDef = pickBestDefinition(rawDef?.substring(0, 200));
    if (!cleanDef) return null; // Reject garbage definitions

    return {
      english: cleanDef,
      fullDefinition: entry.definition,
      source: "Strong's",
      sources: [{
        name: "Strong's",
        fullName: "Strong's Exhaustive Concordance",
        definition: cleanDef,
        strongNumber: entry.strongs || entry.strongNum
      }],
      headword: entry.lemma || entry.word,
      pos: entry.pos,
      strongNumber: entry.strongs || entry.strongNum,
      matchedForm: fullMatch.matchedForm,
      strippedPrefix: fullMatch.strippedPrefix,
      strippedSuffix: fullMatch.strippedSuffix,
      offline: true
    };
  }

  // Fallback to smaller STRONG_LEXICON subset
  if (STRONG_LEXICON) {
    const subsetMatch = lookupWithMorphology(word, STRONG_LEXICON);
    if (subsetMatch?.entry) {
      const entry = subsetMatch.entry;
      const rawDef = entry.definition?.substring(0, 200);
      const cleanDef = pickBestDefinition(rawDef);
      if (!cleanDef) return null; // Reject garbage definitions

      return {
        english: cleanDef,
        fullDefinition: entry.definition,
        source: "Strong's (Local)",
        sources: [{
          name: "Strong's",
          fullName: "Strong's Concordance (Local)",
          definition: cleanDef,
          strongNumber: entry.strongNum
        }],
        headword: entry.lemma,
        pos: entry.pos,
        strongNumber: entry.strongNum,
        matchedForm: subsetMatch.matchedForm,
        offline: true
      };
    }
  }

  return null;
};

/**
 * Look up a word by Strong's number (cross-reference)
 * @param {string} strongNumber - Strong's number (e.g., "H1254")
 * @returns {object|null} - Dictionary entry or null
 */
const lookupByStrongsNumber = (strongNumber) => {
  if (!strongNumber) return null;

  // Normalize the number (ensure H prefix for Hebrew)
  const normalized = strongNumber.toUpperCase().startsWith('H')
    ? strongNumber.toUpperCase()
    : `H${strongNumber}`;

  // Try full Strong's by number
  if (STRONGS_BY_NUMBER?.[normalized]) {
    const entry = STRONGS_BY_NUMBER[normalized];
    return {
      english: entry.gloss || entry.definition?.substring(0, 200),
      fullDefinition: entry.definition,
      source: "Strong's",
      strongNumber: normalized,
      headword: entry.lemma || entry.word,
      pos: entry.pos
    };
  }

  // Try BDB by Strong's number
  if (BDB_BY_STRONGS?.[normalized]) {
    const entry = BDB_BY_STRONGS[normalized];
    return {
      english: entry.definition?.substring(0, 200),
      fullDefinition: entry.fullDef,
      source: 'BDB',
      strongNumber: normalized,
      headword: entry.lemma,
      pos: entry.pos
    };
  }

  return null;
};

/**
 * Look up a word in the local BDB Aramaic dictionary
 * Uses morphological matching for better coverage
 * @param {string} word - Cleaned Aramaic word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalBDBAramaic = (word) => {
  if (!word || !BDB_ARAMAIC) return null;

  const match = lookupWithMorphology(word, BDB_ARAMAIC);
  if (!match?.entry) return null;

  const entry = match.entry;
  const rawDef = entry.definition?.substring(0, 200);
  const cleanDef = pickBestDefinition(rawDef);
  if (!cleanDef) return null; // Reject garbage definitions

  return {
    english: cleanDef,
    fullDefinition: entry.definition,
    source: 'BDB Aramaic (Local)',
    sources: [{
      name: 'BDB Aramaic',
      fullName: 'Brown-Driver-Briggs Aramaic (Local)',
      definition: cleanDef,
      year: 1906
    }],
    headword: entry.lemma || match.matchedForm,
    pos: entry.pos,
    language: 'Aramaic',
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Look up a word in the local CAL (Comprehensive Aramaic Lexicon) dictionary
 * Contains ~1,500 common Aramaic words for offline Talmud study
 * @param {string} word - Cleaned Aramaic word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalCAL = (word) => {
  if (!word || !CAL_ARAMAIC) return null;

  const match = lookupWithMorphology(word, CAL_ARAMAIC);
  if (!match?.entry) return null;

  const entry = match.entry;
  const rawDef = entry.definition?.substring(0, 200);
  const cleanDef = pickBestDefinition(rawDef);
  if (!cleanDef) return null;

  return {
    english: cleanDef,
    fullDefinition: entry.definition,
    source: 'CAL (Local)',
    sources: [{
      name: 'CAL',
      fullName: 'Comprehensive Aramaic Lexicon (Local)',
      definition: cleanDef,
      dialects: entry.dialects,
      hebrew: entry.hebrew // Hebrew equivalent if available
    }],
    headword: entry.lemma || match.matchedForm,
    pos: entry.pos,
    language: 'Aramaic',
    dialects: entry.dialects,
    hebrewEquivalent: entry.hebrew,
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Look up a word in the local Jastrow Aramaic subset
 * Contains 86 most common Talmudic Aramaic verbs for quick lookup
 * @param {string} word - Cleaned Aramaic word
 * @returns {object|null} - Dictionary entry or null
 */
const lookupLocalJastrowAramaic = (word) => {
  if (!word || !JASTROW_ARAMAIC) return null;

  const match = lookupWithMorphology(word, JASTROW_ARAMAIC);
  if (!match?.entry) return null;

  const entry = match.entry;
  const rawDef = entry.definition?.substring(0, 200);
  const cleanDef = pickBestDefinition(rawDef);
  if (!cleanDef) return null;

  return {
    english: cleanDef,
    fullDefinition: entry.definition,
    source: 'Jastrow Aramaic (Local)',
    sources: [{
      name: 'Jastrow',
      fullName: 'Jastrow Aramaic Subset (Local)',
      definition: cleanDef,
      year: 1903
    }],
    headword: entry.lemma || match.matchedForm,
    pos: entry.pos,
    language: 'Aramaic',
    matchedForm: match.matchedForm,
    strippedPrefix: match.strippedPrefix,
    strippedSuffix: match.strippedSuffix,
    offline: true
  };
};

/**
 * Fallback lookup using ALL local dictionaries
 * SYSTEMATIC SCORING: Collects ALL definitions, scores them, picks the BEST
 * This prevents returning wrong homograph meanings (e.g., "Israelite" for יד)
 *
 * PRO SCHOLAR v2: Context-aware source selection
 * - Detects Aramaic words and uses TALMUDIC context mode
 * - SKIPS Strong's entirely in Talmudic context (returns wrong homographs)
 *
 * @param {string} word - Cleaned Hebrew word
 * @param {string} contextMode - Optional context override (defaults to auto-detect)
 * @returns {object|null} - Combined result from local dictionaries
 */
const lookupLocalDictionaries = (word, contextMode = null) => {
  if (DEBUG_LOOKUPS) log.debug(`[Lookup] Starting local lookup: ${word}`);

  // === PRO SCHOLAR: DETECT CONTEXT MODE ===
  // Check if word is likely Aramaic FIRST to determine context
  const isAramaicWord = isLikelyAramaic(word);
  const effectiveContext = contextMode ||
    (isAramaicWord ? CONTEXT_MODES.TALMUDIC : CONTEXT_MODES.MIXED);

  if (DEBUG_LOOKUPS) log.debug(`[Lookup] Context: ${effectiveContext} (Aramaic: ${isAramaicWord})`);

  // Try all local dictionaries with morphological matching
  const bdbResult = lookupLocalBDB(word);
  logLookup('BDB', word, bdbResult);

  const jastrowResult = lookupLocalJastrow(word);
  logLookup('Jastrow', word, jastrowResult);

  // === PRO SCHOLAR: SKIP Strong's in TALMUDIC context ===
  // Strong's Concordance (1890) is for Biblical Hebrew only
  // In Talmudic/Aramaic context, it returns WRONG homographs
  let strongResult = null;
  if (!shouldSkipSource("Strong's", effectiveContext)) {
    strongResult = lookupLocalStrong(word);
    logLookup("Strong's", word, strongResult);
  } else {
    if (DEBUG_LOOKUPS) log.debug(`[Lookup] SKIPPED Strong's in ${effectiveContext} context`);
  }

  const kleinResult = lookupLocalKlein(word);
  logLookup('Klein', word, kleinResult);

  const bdbAramaicResult = lookupLocalBDBAramaic(word);
  logLookup('BDB-Aramaic', word, bdbAramaicResult);

  // Local CAL dictionary (Comprehensive Aramaic Lexicon subset)
  const calResult = lookupLocalCAL(word);
  logLookup('CAL', word, calResult);

  // Local Jastrow Aramaic subset (common Talmudic verbs)
  const jastrowAramaicResult = lookupLocalJastrowAramaic(word);
  logLookup('Jastrow-Aramaic', word, jastrowAramaicResult);

  // If no direct results but we found a Strong's number, try cross-reference
  let crossRefResult = null;
  const strongNum = bdbResult?.strongNumber || strongResult?.strongNumber;
  if (!bdbResult && !jastrowResult && !strongResult && strongNum) {
    crossRefResult = lookupByStrongsNumber(strongNum);
    logLookup(`CrossRef(${strongNum})`, word, crossRefResult);
  }

  // Check if we have any results
  if (!bdbResult && !jastrowResult && !strongResult && !kleinResult && !bdbAramaicResult && !calResult && !jastrowAramaicResult && !crossRefResult) {
    if (DEBUG_LOOKUPS) log.debug(`[Lookup] No results for: ${word}`);
    return null;
  }

  // ==========================================================================
  // SYSTEMATIC SCORING: Collect ALL definitions, score them, pick the BEST
  // This replaces fixed priority order and prevents wrong homograph selection
  // ==========================================================================
  const candidates = [];

  // SMART VALIDATION: Check if result's headword matches searched word
  // This automatically rejects wrong matches like "נָה" when searching for "הן"
  const isHeadwordMatch = (result) => {
    if (!result?.headword && !result?.matchedForm) return true; // No headword to validate
    const headword = result.headword || result.matchedForm;
    // Validate: headword should be similar to searched word
    // This prevents returning "daughter (בת)" when searching for "הן"
    return areSimilarWords(headword, word) || areSimilarWords(headword, normalizeFinals(word));
  };

  // Helper to add a candidate with scoring metadata + HEADWORD VALIDATION
  const addCandidate = (result, sourceName) => {
    if (result?.english) {
      // SMART: Reject if headword doesn't match searched word
      if (!isHeadwordMatch(result)) {
        if (DEBUG_LOOKUPS) log.debug(`[Lookup] Headword mismatch for ${sourceName}: "${result.headword}" vs searched "${word}"`);
        return; // Skip this candidate - wrong entry
      }
      candidates.push({
        definition: result.english,
        source: sourceName,
        result: result,  // Keep full result for later extraction
      });
    }
  };

  // Collect all candidates from all dictionaries
  addCandidate(jastrowResult, 'Jastrow');
  addCandidate(bdbResult, 'BDB');
  addCandidate(bdbAramaicResult, 'BDB Aramaic');
  addCandidate(calResult, 'CAL');
  addCandidate(jastrowAramaicResult, 'Jastrow Aramaic');
  addCandidate(kleinResult, 'Klein');
  addCandidate(strongResult, "Strong's");
  if (crossRefResult?.english) {
    addCandidate({ english: crossRefResult.english, ...crossRefResult }, 'CrossRef');
  }

  // Determine if word is likely Aramaic (for context-aware scoring)
  const wordIsAramaic = isAramaicWord ||
                        jastrowResult?.isAramaic ||
                        bdbAramaicResult?.language === 'Aramaic' ||
                        calResult?.language === 'Aramaic' ||
                        jastrowAramaicResult?.language === 'Aramaic';

  // Score all candidates with context - Strong's gets penalized/skipped in Talmudic context
  const bestCandidate = pickBestFromCandidates(candidates, {
    isAramaicContext: wordIsAramaic,
    contextMode: effectiveContext  // PRO SCHOLAR v2: Pass context for source prioritization
  });

  if (DEBUG_LOOKUPS && candidates.length > 0) {
    const scores = candidates.map(c => ({
      source: c.source,
      def: c.definition?.substring(0, 30),
      score: scoreDefinition(c.definition, c.source, { contextMode: effectiveContext, isAramaicContext: wordIsAramaic })
    }));
    log.debug(`[Lookup] Context: ${effectiveContext}, Scores for ${word}:`, scores);
    if (bestCandidate) {
      log.debug(`[Lookup] Best: ${bestCandidate.source} (score: ${bestCandidate.score})`);
    }
  }

  // If no candidate passed scoring, try falling back to the old priority logic
  // This handles edge cases where all definitions got rejected
  let primaryResult;
  if (bestCandidate) {
    primaryResult = bestCandidate.result;
  } else {
    // Fallback to old logic (should rarely happen with good scoring)
    // PRO SCHOLAR v2: Prefer Talmudic sources in Aramaic context
    if (wordIsAramaic || effectiveContext === CONTEXT_MODES.TALMUDIC) {
      primaryResult = jastrowResult || calResult || jastrowAramaicResult || bdbAramaicResult || bdbResult || kleinResult || strongResult || crossRefResult;
    } else {
      primaryResult = bdbResult || jastrowResult || kleinResult || calResult || jastrowAramaicResult || strongResult || bdbAramaicResult || crossRefResult;
    }
    // Even in fallback, reject if definition is garbage
    if (primaryResult?.english) {
      const score = scoreDefinition(primaryResult.english, primaryResult.source, { contextMode: effectiveContext, isAramaicContext: wordIsAramaic });
      if (score < 0) {
        if (DEBUG_LOOKUPS) log.debug(`[Lookup] Fallback rejected (score: ${score}): ${primaryResult.english}`);
        primaryResult = null;
      }
    }
  }

  if (!primaryResult) {
    if (DEBUG_LOOKUPS) log.debug(`[Lookup] All candidates rejected for: ${word}`);
    return null;
  }

  // Determine if word is likely Aramaic
  const isAramaic = jastrowResult?.isAramaic || bdbAramaicResult?.language === 'Aramaic' || calResult?.language === 'Aramaic' || jastrowAramaicResult?.language === 'Aramaic';

  // Collect all available sources (deduplicated) in SCHOLARLY ORDER
  // Gold tier first (Jastrow, BDB), then silver (Klein, Strong's)
  const sources = [];
  const seenSources = new Set();

  const addSourceFiltered = (result) => {
    if (result?.sources) {
      for (const src of result.sources) {
        const key = src.name + (src.strongNumber || '');
        if (!seenSources.has(key) && src.definition) {
          // SMART: Also validate headword match for each source
          // This prevents showing "daughter" when searching for "הן"
          const srcHeadword = src.headword || result.headword || result.matchedForm;
          if (srcHeadword && !areSimilarWords(srcHeadword, word) && !areSimilarWords(srcHeadword, normalizeFinals(word))) {
            if (DEBUG_LOOKUPS) log.debug(`[Lookup] Source headword mismatch: ${src.name} "${srcHeadword}" vs "${word}"`);
            continue; // Skip this source - wrong entry
          }

          // Score this source's definition - only include if good quality
          const defScore = scoreDefinition(src.definition, src.name);
          if (defScore > 0) {
            seenSources.add(key);
            sources.push({ ...src, score: defScore });
          } else if (DEBUG_LOOKUPS) {
            log.debug(`[Lookup] Source rejected (score: ${defScore}): ${src.name} - ${src.definition?.substring(0, 40)}`);
          }
        }
      }
    }
  };

  // Add sources in scholarly priority order (gold tier first)
  // But scoring will filter out garbage definitions from any source
  addSourceFiltered(jastrowResult);  // Gold - Talmud specialist
  addSourceFiltered(bdbResult);       // Gold - Academic standard
  addSourceFiltered(bdbAramaicResult); // Gold - Aramaic
  addSourceFiltered(calResult);       // Gold - CAL Aramaic
  addSourceFiltered(jastrowAramaicResult); // Gold - Jastrow Aramaic subset
  addSourceFiltered(kleinResult);     // Silver - Etymology
  addSourceFiltered(strongResult);    // Silver - Basic concordance
  if (crossRefResult && crossRefResult.english) {
    const key = (crossRefResult.source || 'CrossRef') + (crossRefResult.strongNumber || '');
    const defScore = scoreDefinition(crossRefResult.english, 'CrossRef');
    if (!seenSources.has(key) && defScore > 0) {
      sources.push({
        name: crossRefResult.source || 'CrossRef',
        fullName: `${crossRefResult.source} (via ${strongNum})`,
        definition: crossRefResult.english,
        strongNumber: crossRefResult.strongNumber,
        score: defScore
      });
    }
  }

  // Sort sources by score (highest first) for better display
  sources.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    english: primaryResult?.english,
    fullDefinition: primaryResult?.fullDefinition,
    source: primaryResult?.source || 'Local Dictionary',
    sources,
    headword: primaryResult?.headword,
    pos: primaryResult?.pos,
    strongNumber: strongNum || crossRefResult?.strongNumber,
    matchedForm: primaryResult?.matchedForm,
    strippedPrefix: primaryResult?.strippedPrefix,
    strippedSuffix: primaryResult?.strippedSuffix,
    language: isAramaic ? 'Aramaic' : 'Hebrew',
    offline: true
  };
};

// Note: pickBestDefinition is imported from '../utils/definitionCleaner'

// cleanWord alias for cleanHebrewWord (already imported from hebrewDictionary)
const cleanWord = cleanHebrewWord;

/**
 * Get cached result if available
 */
const getCached = (word) => {
  return combinedCache.get(word);
};

/**
 * Set cache for a word
 */
const setCache = (word, data) => {
  combinedCache.set(word, data);
};

/**
 * Lookup a Hebrew/Aramaic word using Sefaria scholarly sources
 * Returns both English and French translations with multiple sources
 *
 * @param {string} word - The Hebrew/Aramaic word
 * @returns {Promise<object>} - Translation result with multiple sources
 */
export const lookupWordAsync = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  // Check cache first
  const cached = getCached(cleaned);
  if (cached) return cached;

  let result = {
    word: word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    source: 'none',
    sources: [], // Multiple scholarly sources
    sefariaData: null,
    language: 'Hebrew'
  };

  // Helper: Filter and clean definitions before adding to sources
  // Returns cleaned definition or null if it should be skipped
  const filterDefinition = (def) => {
    if (!def) return null;
    const cleaned = cleanDefinition(def, { strictQuality: true });
    return cleaned && cleaned.length >= 3 ? cleaned : null;
  };

  // Helper: Add source only if definition is valid
  const addSource = (sourceObj) => {
    const filteredDef = filterDefinition(sourceObj.definition);
    if (filteredDef) {
      result.sources.push({ ...sourceObj, definition: filteredDef });
      return true;
    }
    return false;
  };

  try {
    // Use scholarly lookup for comprehensive multi-source results
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      // Try to get a meaningful short definition, fall back to full
      const bestDef = pickBestDefinition(scholarlyResult.primaryDefinition);
      result.english = bestDef || scholarlyResult.primaryDefinition;
      result.fullEnglish = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.headword = scholarlyResult.sources?.bdb?.headword ||
                        scholarlyResult.sources?.jastrow?.headword ||
                        scholarlyResult.sources?.strong?.headword ||
                        cleaned;
      result.language = scholarlyResult.language || 'Hebrew';

      // Default source to 'sefaria' when we have a definition
      // Will be overridden if specific source is identified
      result.source = 'sefaria';

      // Collect all available scholarly sources (filtered for quality)
      if (scholarlyResult.sources?.bdb) {
        const bdbDefs = scholarlyResult.sources.bdb.definitions || [];
        const bdbDef = bdbDefs.length > 0 ? bdbDefs[0]?.text : scholarlyResult.primaryDefinition;
        if (addSource({
          name: 'BDB',
          fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
          definition: bdbDef,
          year: 1906
        })) {
          result.source = 'bdb';
        }
      }

      if (scholarlyResult.sources?.jastrow) {
        const jastrowDefs = scholarlyResult.sources.jastrow.definitions || [];
        const jastrowDef = jastrowDefs.length > 0 ? jastrowDefs[0]?.text : null;
        if (addSource({
          name: 'Jastrow',
          fullName: "Jastrow's Dictionary of Targumim, Talmud",
          definition: jastrowDef,
          year: 1903
        })) {
          if (result.source === 'sefaria') result.source = 'jastrow';
          result.language = 'Aramaic';
        }
      }

      if (scholarlyResult.sources?.strong) {
        const strongDefs = scholarlyResult.sources.strong.definitions || [];
        const strongDef = strongDefs.length > 0 ? strongDefs[0]?.text : null;
        if (addSource({
          name: "Strong's",
          fullName: "Strong's Concordance",
          definition: strongDef,
          strongNumber: scholarlyResult.sources.strong.strongNumber
        })) {
          if (result.source === 'sefaria') result.source = 'strong';
        }
      }

      if (scholarlyResult.sources?.klein) {
        const kleinDefs = scholarlyResult.sources.klein.definitions || [];
        const kleinDef = kleinDefs.length > 0 ? kleinDefs[0]?.text : null;
        addSource({
          name: 'Klein',
          fullName: "Klein's Etymological Dictionary",
          definition: kleinDef,
          year: 1987
        });
      }

      // Add Steinsaltz if available (Aramaic/Talmudic)
      if (scholarlyResult.sources?.steinsaltz) {
        const steinsaltzDefs = scholarlyResult.sources.steinsaltz.definitions || [];
        const steinsaltzDef = steinsaltzDefs.length > 0 ? steinsaltzDefs[0]?.text : null;
        if (addSource({
          name: 'Steinsaltz',
          fullName: 'Steinsaltz Talmud Dictionary',
          definition: steinsaltzDef,
          year: 1989
        })) {
          result.language = 'Aramaic';
        }
      }

      // Add Bolls.life if available (online BDB API)
      if (scholarlyResult.sources?.bolls) {
        const bollsDefs = scholarlyResult.sources.bolls.definitions || [];
        const bollsDef = bollsDefs.length > 0 ? bollsDefs[0]?.text : null;
        if (addSource({
          name: 'Bolls.life',
          fullName: 'Bolls.life Bible Dictionary (BDB)',
          definition: bollsDef,
          year: 2020,
          strongNumber: scholarlyResult.sources.bolls.strongNumber
        })) {
          if (result.source === 'sefaria') result.source = 'bolls';
        }
      }

      // Add STEP Bible if available (Strong's definitions)
      if (scholarlyResult.sources?.step) {
        const stepDefs = scholarlyResult.sources.step.definitions || [];
        const stepDef = stepDefs.length > 0 ? stepDefs[0]?.text : null;
        if (addSource({
          name: 'STEP Bible',
          fullName: 'Scripture Tools for Every Person',
          definition: stepDef,
          year: 2021,
          strongNumber: scholarlyResult.sources.step.strongNumber,
          transliteration: scholarlyResult.sources.step.transliteration
        })) {
          if (result.source === 'sefaria') result.source = 'step';
        }
      }

      // Add HALOT if available (modern scholarly lexicon)
      if (scholarlyResult.sources?.halot) {
        const halotDefs = scholarlyResult.sources.halot.definitions || [];
        const halotDef = halotDefs.length > 0 ? halotDefs[0]?.text : null;
        addSource({
          name: 'HALOT',
          fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
          definition: halotDef,
          year: 2000
        });
      }

      // Add Gesenius if available (classical Hebrew grammar)
      if (scholarlyResult.sources?.gesenius) {
        const geseniusDefs = scholarlyResult.sources.gesenius.definitions || [];
        const geseniusDef = geseniusDefs.length > 0 ? geseniusDefs[0]?.text : null;
        addSource({
          name: 'Gesenius',
          fullName: "Gesenius' Hebrew Grammar & Lexicon",
          definition: geseniusDef,
          year: 1910
        });
      }

      // Add TWOT if available (theological analysis)
      if (scholarlyResult.sources?.twot) {
        const twotDefs = scholarlyResult.sources.twot.definitions || [];
        const twotDef = twotDefs.length > 0 ? twotDefs[0]?.text : null;
        addSource({
          name: 'TWOT',
          fullName: 'Theological Wordbook of the Old Testament',
          definition: twotDef,
          year: 1980
        });
      }

      // If we still have no specific sources but have a definition, add Sefaria as source
      if (result.sources.length === 0 && result.english) {
        addSource({
          name: 'Sefaria',
          fullName: 'Sefaria Lexicon',
          definition: result.english
        });
      }

      if (scholarlyResult.grammar) {
        result.morphology = scholarlyResult.grammar;
      }

      if (scholarlyResult.cognates) {
        result.cognates = scholarlyResult.cognates;
      }
    }
  } catch {
    // Silent fail - API errors expected
  }

  // Fallback to simple Sefaria lookup if scholarly failed
  if (!result.english) {
    try {
      const sefariaResult = await getSimpleTranslation(cleaned);
      if (sefariaResult) {
        result.english = pickBestDefinition(sefariaResult);
        result.fullEnglish = sefariaResult;
        result.source = 'sefaria';
        addSource({
          name: 'Sefaria',
          fullName: 'Sefaria Lexicon',
          definition: result.english
        });

        // Get full Sefaria data for additional info
        const fullData = await lookupWordSefaria(cleaned);
        if (fullData) {
          result.sefariaData = {
            language: fullData.language,
            headword: fullData.headword,
            strongNumber: fullData.strongNumber,
            morphology: fullData.morphology,
            definitions: fullData.definitions
          };
          result.language = fullData.language || 'Hebrew';
        }
      }
    } catch {
      // Silent fail - expected for some words
    }
  }

  // Try Jastrow specifically for Aramaic words
  if (!result.english || isLikelyAramaic(cleaned)) {
    try {
      const jastrowResult = await lookupJastrow(cleaned);
      if (jastrowResult?.shortDefinition) {
        if (!result.english) {
          result.english = jastrowResult.shortDefinition;
          result.source = 'jastrow';
        }
        // Add Jastrow if not already in sources
        if (!result.sources.find(s => s.name === 'Jastrow')) {
          addSource({
            name: 'Jastrow',
            fullName: "Jastrow's Dictionary of Targumim, Talmud",
            definition: jastrowResult.shortDefinition,
            year: 1903
          });
        }
        result.language = 'Aramaic';
        result.headword = jastrowResult.headword || result.headword;
      }
    } catch {
      // Silent fail - expected for Hebrew words
    }
  }

  // Check if word is Aramaic (for UI indication)
  if (isLikelyAramaic(cleaned)) {
    result.isAramaic = true;
    result.language = 'Aramaic';
  }

  // === LOCAL DICTIONARY FALLBACK ===
  // If all API lookups failed, try local dictionaries
  if (!result.english) {
    const localResult = lookupLocalDictionaries(cleaned);
    if (localResult?.english) {
      result.english = pickBestDefinition(localResult.english) || localResult.english;
      result.fullEnglish = localResult.fullDefinition;
      result.source = localResult.source;
      result.sources = localResult.sources;
      result.headword = localResult.headword;
      result.language = localResult.language || 'Hebrew';
      result.offline = true;
      // Preserve morphological info
      result.matchedForm = localResult.matchedForm;
      result.strippedPrefix = localResult.strippedPrefix;
      result.strippedSuffix = localResult.strippedSuffix;
    }
  }

  // === CAL (Comprehensive Aramaic Lexicon) FALLBACK ===
  // Last resort for Aramaic words not found in local dictionaries
  if (!result.english && (result.isAramaic || isLikelyAramaic(cleaned))) {
    try {
      const calResult = await lookupCalAramaic(cleaned);
      if (calResult?.definitions?.length > 0) {
        const def = calResult.definitions[0].meaning;
        result.english = pickBestDefinition(def) || def;
        result.fullEnglish = calResult.definitions.map(d => d.meaning).join('; ');
        result.source = 'CAL';
        addSource({
          name: 'CAL',
          fullName: 'Comprehensive Aramaic Lexicon (HUC)',
          definition: def,
          url: calResult.sourceUrl
        });
        result.headword = calResult.headword || calResult.lemma;
        result.language = 'Aramaic';
        result.calData = {
          dialects: calResult.dialects,
          partOfSpeech: calResult.partOfSpeech,
          calTransliteration: calResult.calTransliteration
        };
        // CAL morphological info
        if (calResult.prefix) {
          result.strippedPrefix = calResult.prefix;
        }
        logLookup('CAL', cleaned, calResult);
      }
    } catch {
      // CAL lookup failed - continue without
      logLookup('CAL', cleaned, null);
    }
  }

  // Get French translation - try quick lookup first, then API
  if (result.english) {
    // Use the short definition for translation
    const textToTranslate = result.english.length > 200
      ? (pickBestDefinition(result.english) || result.english.substring(0, 200))
      : result.english;

    // First try quick translation (cache + common words - no API call)
    const quickFrench = quickTranslate(textToTranslate);
    if (quickFrench) {
      result.french = quickFrench;
      result.frenchSource = 'Dictionary';
    } else {
      // Fall back to API translation (rate limited)
      try {
        const translatedFrench = await translateEnglishToFrench(textToTranslate);
        if (translatedFrench) {
          result.french = translatedFrench;
          result.frenchSource = 'Google Translate';
        } else {
          result.french = null;
          result.frenchSource = 'none';
        }
      } catch {
        // Silent fail - rate limiting expected
        result.french = null;
        result.frenchSource = 'error';
      }
    }
  }

  // Only cache successful results (has English translation)
  // Don't cache errors or empty results - let next attempt try fresh
  if (result.english && result.source !== 'none') {
    setCache(cleaned, result);
  }

  return result;
};

/**
 * Synchronous lookup - returns cached data or loading state
 * PRO SCHOLAR MODE: ALWAYS queries ALL dictionaries and combines sources
 *
 * PRO SCHOLAR v2: Now accepts contextMode to use correct dictionaries
 * - 'talmudic' → Jastrow priority, SKIP Strong's
 * - 'biblical' → BDB/Strong's priority
 * - 'mixed' → Both (default)
 *
 * PRO SCHOLAR v2.1: Auto-detect context from reference string
 * Pass a reference like "Shabbat 2a" or "Genesis 1:1" to auto-detect context
 *
 * @param {string} word - The Hebrew word
 * @param {object} options - Lookup options
 * @param {string} options.contextMode - 'talmudic', 'biblical', or 'mixed' (default)
 * @param {string} options.reference - Sefaria-style reference for auto-context detection
 * @returns {object} - Cached result or loading placeholder
 */
export const lookupWordSync = (word, options = {}) => {
  const { contextMode = null, reference = null } = options;

  // PRO SCHOLAR v2.1: Auto-detect context from reference if provided
  // e.g., "Shabbat 2a" → talmudic, "Genesis 1:1" → biblical
  // "Rashi on Shabbat 2a" → talmudic (base text determines context)
  const effectiveContextMode = contextMode || (reference ? getContextFromReference(reference) : null);

  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  // Check cache first (might have full scholarly result)
  // Skip cache in PRO SCHOLAR MODE to always get fresh multi-source results
  // Also skip cache if context is explicitly set (need context-specific results)
  const cached = getCached(cleaned);
  if (cached && cached.sources?.length > 1 && !effectiveContextMode) {
    // Only use cache if it has multiple sources (PRO SCHOLAR result) AND no specific context
    return cached;
  }
  // Otherwise, re-fetch to get all sources

  // === PRO SCHOLAR MODE: ALWAYS query ALL sources ===
  const allSources = [];
  let primaryEnglish = null;
  let primarySource = 'none';
  const checkAramaic = isLikelyAramaic(cleaned);

  // 1. Check halachic/talmudic terms FIRST (recommended for context)
  const halachicResult = lookupHalachicWithPrefix(cleaned);
  if (halachicResult) {
    const fullDefinition = halachicResult.prefix
      ? `${halachicResult.prefix} ${halachicResult.definition}`
      : halachicResult.definition;
    allSources.push({
      name: halachicResult.source || 'Talmudic',
      fullName: 'Talmudic Context Dictionary',
      definition: fullDefinition,
      recommended: true  // Mark as recommended for this context
    });
    primaryEnglish = fullDefinition;
    primarySource = halachicResult.source || 'Talmudic';
  }

  // 2. ALWAYS also query local dictionaries (Jastrow, BDB, Strong's, Klein)
  // Try both the original word AND the root (if halachic found a root)
  const seenNames = new Set(allSources.map(s => s.name));

  // First try the original word
  // PRO SCHOLAR v2.1: Pass effectiveContextMode to skip Strong's in Talmudic context
  let localResult = lookupLocalDictionaries(cleaned, effectiveContextMode);

  // If no results AND we have a root from halachic lookup, try the root
  if ((!localResult?.sources?.length || localResult.sources.length === 0) && halachicResult?.root) {
    localResult = lookupLocalDictionaries(halachicResult.root, effectiveContextMode);
  }

  if (localResult?.sources?.length > 0) {
    // Add all dictionary sources (deduplicated)
    for (const src of localResult.sources) {
      if (!seenNames.has(src.name) && src.definition) {
        seenNames.add(src.name);
        allSources.push(src);
      }
    }
    // Use local result as primary if no halachic match
    if (!primaryEnglish && localResult.english) {
      primaryEnglish = pickBestDefinition(localResult.english) || localResult.english;
      primarySource = localResult.source;
    }
  }

  // Return combined result with ALL sources
  if (allSources.length > 0 || primaryEnglish) {
    return {
      word: word,
      cleanedWord: cleaned,
      english: primaryEnglish,
      fullEnglish: localResult?.fullDefinition,
      french: null,
      frenchSource: 'none',
      source: primarySource,
      sources: allSources,
      headword: localResult?.headword,
      isAramaic: checkAramaic || localResult?.isAramaic,
      language: localResult?.language || (checkAramaic ? 'Aramaic' : 'Hebrew'),
      sefariaData: null,
      offline: true,
      _halachicOverride: !!halachicResult,
      root: halachicResult?.root,
      prefix: halachicResult?.prefix,
      isLoading: true // Still trigger API for potentially better results
    };
  }

  // No results - return loading state
  return {
    word: word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    frenchSource: 'none',
    source: 'none',
    sources: [],
    isAramaic: checkAramaic,
    language: checkAramaic ? 'Aramaic' : 'Hebrew',
    sefariaData: null,
    isLoading: true
  };
};

/**
 * Prefetch translations for multiple words using scholarly sources
 * Useful for loading a verse/paragraph
 *
 * @param {string[]} words - Array of Hebrew words
 * @returns {Promise<Map<string, object>>} - Map of word to translation
 */
export const prefetchTranslations = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.map(cleanWord).filter(w => w && w.length >= 2))];

  // First, get all from cache
  const needsApi = [];
  for (const word of uniqueWords) {
    const cached = getCached(word);
    if (cached) {
      results.set(word, cached);
    } else {
      needsApi.push(word);
    }
  }

  // Fetch from Sefaria API for words not in cache
  if (needsApi.length > 0) {
    await fetchFromSefariaInBackground(needsApi, results);
  }

  return results;
};

/**
 * Background fetch from Sefaria API using scholarly lookup
 */
const fetchFromSefariaInBackground = async (words, results) => {
  const batchSize = 3;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);

    const promises = batch.map(async (word) => {
      try {
        const result = await lookupWordAsync(word);
        if (result.english) {
          results.set(word, result);
        }
      } catch {
        // Keep any existing result
      }
    });

    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < words.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
};

/**
 * Check if a word has any translation available
 * @param {string} word - The Hebrew word
 * @returns {boolean} - True if translation might exist
 */
export const hasTranslation = (word) => {
  const cleaned = cleanWord(word);
  // All Hebrew words with 2+ letters potentially have translations via Sefaria
  return cleaned && cleaned.length >= 2;
};

/**
 * Clear all caches
 */
export const clearCaches = () => {
  combinedCache.clear();
};

// =============================================================================
// Common Word Preloading
// Word lists are in dictionaryPreloader.js (single source of truth)
// This module handles the actual caching logic
// =============================================================================

// Track preloading status
let preloadingPromise = null;
let preloadingComplete = false;
let preloadedCount = 0;

/**
 * Preload words into cache from local dictionaries
 * Word lists are imported from dictionaryPreloader.js to avoid duplication
 * @param {string[]} words - Optional custom word list (default: loads from dictionaryPreloader)
 * @returns {Promise<number>} - Number of words successfully preloaded
 */
export const preloadCommonWords = async (words = null) => {
  // Return existing promise if already preloading
  if (preloadingPromise) return preloadingPromise;

  // Skip if already completed
  if (preloadingComplete) return preloadedCount;

  preloadingPromise = (async () => {
    // Get word list - either provided or from dictionaryPreloader
    let wordList = words;
    if (!wordList) {
      try {
        // Dynamic import to avoid circular dependency
        const preloader = await import('./dictionaryPreloader');
        wordList = [...preloader.COMMON_HEBREW_WORDS, ...preloader.COMMON_ARAMAIC_WORDS];
      } catch {
        // Minimal fallback if import fails
        wordList = ['את', 'אל', 'על', 'כי', 'לא', 'אשר', 'כל'];
      }
    }

    let successCount = 0;
    const startTime = Date.now();

    if (DEBUG_LOOKUPS) {
      log.debug(`[Preload] Starting preload of ${wordList.length} words...`);
    }

    // Load from local dictionaries (instant, no API)
    for (const word of wordList) {
      if (getCached(word)) {
        successCount++;
        continue;
      }

      const localResult = lookupLocalDictionaries(word);
      if (localResult?.english) {
        setCache(word, {
          word,
          cleanedWord: word,
          english: pickBestDefinition(localResult.english) || localResult.english,
          fullEnglish: localResult.fullDefinition,
          french: null,
          frenchSource: 'none',
          source: localResult.source,
          sources: localResult.sources,
          headword: localResult.headword,
          language: localResult.language || 'Hebrew',
          offline: true,
          preloaded: true
        });
        successCount++;
      }
    }

    if (DEBUG_LOOKUPS) {
      log.debug(`[Preload] Complete: ${successCount}/${wordList.length} in ${Date.now() - startTime}ms`);
    }

    preloadingComplete = true;
    preloadedCount = successCount;
    return successCount;
  })();

  return preloadingPromise;
};

/**
 * Check if common words have been preloaded
 */
export const isPreloadComplete = () => preloadingComplete;

/**
 * Get preloading status
 */
export const getPreloadStatus = () => ({
  complete: preloadingComplete,
  cachedCount: preloadedCount
});

const combinedTranslationService = {
  lookupWordAsync,
  lookupWordSync,
  prefetchTranslations,
  hasTranslation,
  clearCaches,
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus
};

export default combinedTranslationService;
