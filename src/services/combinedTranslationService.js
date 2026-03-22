// =============================================================================
// Combined Translation Service
// Uses Sefaria API (BDB, Jastrow, Strong's) as primary source
// Falls back to local dictionaries when offline or API fails
// Returns multiple scholarly sources for professional Jewish study
// =============================================================================

import { scholarlyLookup, lookupWordSefaria, getSimpleTranslation, lookupJastrow } from './scholarlyLexiconService';
import { cleanHebrewWord } from './hebrewDictionary';
import { isLikelyAramaic } from './babylonianDictionary';
// PRO SCHOLAR V8: Centralized Hebrew utilities (single source of truth)
import { normalizeFinals, areSimilarWords } from '../utils/hebrewUtils';
import { translateEnglishToFrench, quickTranslate } from './englishToFrenchService';
// PRO SCHOLAR V6.2: Use managed cache with CacheOrchestrator for unified telemetry
import { createManagedCache } from './cacheOrchestrator';
// PRO SCHOLAR V7: Dynamic dictionary loading (removes ~30MB from bundle!)
// Uses dictionaryLoader.js for lazy loading instead of static imports
import {
  // Raw data access for morphological lookups (returns cached data or null)
  getBDBData,
  getJastrowData,
  getStrongsData
} from './dictionaryLoader';
// Additional local lexicons (Klein etymology, Strong's subset, BDB Aramaic)
// These are small enough to keep as static imports
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
import { STOP_WORDS, isLikelyCompleteRoot, HEBREW_PREFIXES_ORDERED, HEBREW_SUFFIXES_ORDERED, extractAramaicRoot, computeVerbTranslation, ROOT_MEANINGS, lookupFunctionWord, extractHebrewRoot, HEBREW_BINYANIM } from '../constants/morphology';
// PRO SCHOLAR v2: Reference-based context detection for auto dictionary selection
import { getContextFromReference } from '../constants/bookConstants';
// PRO SCHOLAR V3: Pre-classification service for proper nouns, abbreviations, technical terms
import { preClassify } from './preClassificationService';
// PRO SCHOLAR V3: Systematic morphological analysis with multiple possible roots
import { analyzeWordMorphology } from './morphologicalAnalysisService';
// PRO SCHOLAR V5: Unified root extraction with direct dictionary validation
import { extractRootsWithDirectValidation } from './unifiedRootService';
// PRO SCHOLAR V5: O(1) trie-based prefix lookup (replaces O(n) iteration)
import { findLongestPrefix } from '../utils/prefixTrie';

// =============================================================================
// Dictionary Data Getters (PRO SCHOLAR V7: Lazy loading convenience wrappers)
// =============================================================================
// These replace the old static imports (BDB_BY_WORD, JASTROW_COMPLETE, etc.)
const getBDB_BY_WORD = () => {
  const data = getBDBData();
  return data?.byWord || data || null;
};
const getBDB_BY_STRONGS = () => {
  const data = getBDBData();
  return data?.byStrongs || null;
};
const getJASTROW_COMPLETE = () => getJastrowData();
const getSTRONGS_BY_WORD = () => {
  const data = getStrongsData();
  return data?.byWord || data || null;
};
const getSTRONGS_BY_NUMBER = () => {
  const data = getStrongsData();
  return data?.byNumber || null;
};

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

// normalizeFinals and areSimilarWords are now imported from ../utils/hebrewUtils

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

  // PRO SCHOLAR V5: Try stripping prefixes using O(1) trie lookup
  // First try the longest matching prefix (most common case)
  const trieResult = findLongestPrefix(word);
  if (trieResult && trieResult.remainder.length >= 2) {
    const { prefix, remainder: stem } = trieResult;

    // CRITICAL: Check if stem is a STOP WORD - this is our target word!
    if (STOP_WORDS.has(stem)) {
      if (dictionary[stem]) {
        return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
      }
    } else {
      // Try direct match
      if (dictionary[stem] && isValidMatch(dictionary[stem], stem, word)) {
        return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
      }
      // Try normalized
      const normalizedStem = normalizeFinals(stem);
      if (normalizedStem !== stem && dictionary[normalizedStem]) {
        if (isValidMatch(dictionary[normalizedStem], normalizedStem, word)) {
          return { entry: dictionary[normalizedStem], matchedForm: normalizedStem, strippedPrefix: prefix };
        }
      }
    }
  }

  // Fallback: Try shorter prefixes if longest didn't work (rare case)
  for (const prefix of HEBREW_PREFIXES) {
    // Skip if this is the same as trie result (already tried)
    if (trieResult && prefix === trieResult.prefix) continue;

    if (word.startsWith(prefix) && word.length > prefix.length + 1) {
      const stem = word.slice(prefix.length);

      if (STOP_WORDS.has(stem)) {
        if (dictionary[stem]) {
          return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
        }
        continue;
      }

      if (dictionary[stem] && isValidMatch(dictionary[stem], stem, word)) {
        return { entry: dictionary[stem], matchedForm: stem, strippedPrefix: prefix };
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
  // Construct+possessive suffixes that need ה restoration
  const CONSTRUCT_POSSESSIVE = new Set(['תו', 'תי', 'תך', 'תם', 'תן', 'תנו']);

  for (const suffix of HEBREW_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      if (dictionary[stem]) {
        // VALIDATE: entry must be related to stem
        if (isValidMatch(dictionary[stem], stem, word)) {
          return { entry: dictionary[stem], matchedForm: stem, strippedSuffix: suffix };
        }
      }

      // PRO SCHOLAR: Construct-state ה restoration
      // For construct+possessive suffixes (תו, תי, etc.), try adding ה
      // Example: שגגתו → strip תו → שגג → try שגגה ✓
      if (CONSTRUCT_POSSESSIVE.has(suffix) && dictionary[stem + 'ה']) {
        if (isValidMatch(dictionary[stem + 'ה'], stem + 'ה', word)) {
          return { entry: dictionary[stem + 'ה'], matchedForm: stem + 'ה', strippedSuffix: suffix };
        }
      }

      // For ות plural, try adding ה for feminine singular
      if (suffix === 'ות' && dictionary[stem + 'ה']) {
        if (isValidMatch(dictionary[stem + 'ה'], stem + 'ה', word)) {
          return { entry: dictionary[stem + 'ה'], matchedForm: stem + 'ה', strippedSuffix: suffix };
        }
      }

      // PRO SCHOLAR: For possessive suffixes where stem ends in ת (construct state)
      // Try replacing ת with ה to get absolute form
      // Example: מלאכתו → strip ו → מלאכת → מלאכה ✓
      if (['ו', 'י', 'ך', 'ה'].includes(suffix) && stem.endsWith('ת') && stem.length >= 3) {
        const absoluteForm = stem.slice(0, -1) + 'ה';
        if (dictionary[absoluteForm]) {
          if (isValidMatch(dictionary[absoluteForm], absoluteForm, word)) {
            return { entry: dictionary[absoluteForm], matchedForm: absoluteForm, strippedSuffix: suffix };
          }
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

// PRO SCHOLAR V6.2: Use CacheOrchestrator's managed cache for unified telemetry
const combinedCache = createManagedCache('translation', { ttl: 60 * 60 * 1000, maxSize: 1000 }); // 1 hour

// PRO SCHOLAR V7: Word-level cache for lookupLocalDictionaries to prevent duplicate lookups
// This fixes the issue where the same word is looked up 3-4 times through different code paths
const localDictionaryCache = createManagedCache('localDictionary', { ttl: 5 * 60 * 1000, maxSize: 500 }); // 5 minutes

// =============================================================================
// Local Dictionary Fallback Lookups
// =============================================================================

/**
 * Raw BDB lookup (no cross-reference following) - used by followCrossReference
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - Raw dictionary entry
 */
const lookupBDBRaw = (word) => {
  const BDB_BY_WORD = getBDB_BY_WORD();
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
  const BDB_BY_WORD = getBDB_BY_WORD();
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
  const JASTROW_COMPLETE = getJASTROW_COMPLETE();
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
  const JASTROW_COMPLETE = getJASTROW_COMPLETE();
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
  const STRONGS_BY_WORD = getSTRONGS_BY_WORD();
  const fullMatch = STRONGS_BY_WORD ? lookupWithMorphology(word, STRONGS_BY_WORD) : null;
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

  // Get dynamically loaded dictionary data
  const STRONGS_BY_NUMBER = getSTRONGS_BY_NUMBER();
  const BDB_BY_STRONGS = getBDB_BY_STRONGS();

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

// =============================================================================
// PRO SCHOLAR V4: SYSTEMATIC ROOT EXTRACTION AND LOOKUP
// =============================================================================

/**
 * Extract the 3-letter שורש (root) from any Hebrew/Aramaic word
 * Uses systematic morphological analysis without hardcoding every form
 *
 * @param {string} word - Hebrew word
 * @returns {Object} - { root, prefixes, suffixes, pattern, confidence }
 */
const extractShoresh = (word) => {
  if (!word || word.length < 2) return null;

  const cleaned = cleanWord(word);
  let remaining = cleaned;
  const prefixes = [];
  const suffixes = [];

  // === STEP 1: STRIP PREFIXES ===
  // Order matters: longer prefixes first (וה, וב, ול, etc.)
  const prefixPatterns = [
    { prefix: 'וה', meaning: 'and the' },
    { prefix: 'וב', meaning: 'and in' },
    { prefix: 'ול', meaning: 'and to' },
    { prefix: 'ומ', meaning: 'and from' },
    { prefix: 'וכ', meaning: 'and like' },
    { prefix: 'הת', meaning: 'hitpael marker' },
    { prefix: 'מת', meaning: 'mitpael marker' },
    { prefix: 'ו', meaning: 'and' },
    { prefix: 'ה', meaning: 'the' },
    { prefix: 'ב', meaning: 'in' },
    { prefix: 'ל', meaning: 'to' },
    { prefix: 'מ', meaning: 'from/participle' },
    { prefix: 'כ', meaning: 'like' },
    { prefix: 'ש', meaning: 'that/who' },
    { prefix: 'ד', meaning: 'of (Aram.)' },
  ];

  // Only strip if remaining > 2 letters
  for (const { prefix, meaning } of prefixPatterns) {
    if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
      // Don't strip from protected roots
      if (!STOP_WORDS.has(remaining)) {
        prefixes.push({ letter: prefix, meaning });
        remaining = remaining.slice(prefix.length);
        if (prefixes.length >= 2) break; // Max 2 prefixes
      }
    }
  }

  // === STEP 2: STRIP SUFFIXES ===
  // Order: longer suffixes first for greedy matching
  const suffixPatterns = [
    // Construct + possessive compound suffixes
    { suffix: 'ותיהם', meaning: 'their (f.pl)' },
    { suffix: 'ותיהן', meaning: 'their (f.pl)' },
    { suffix: 'תנו', meaning: 'construct + our' },
    { suffix: 'תם', meaning: 'construct + their (m)' },
    { suffix: 'תן', meaning: 'construct + their (f)' },
    { suffix: 'תו', meaning: 'construct + his' },
    { suffix: 'תי', meaning: 'construct + my' },
    { suffix: 'תך', meaning: 'construct + your' },
    // Plurals
    { suffix: 'ים', meaning: 'plural (m)' },
    { suffix: 'ות', meaning: 'plural (f)' },
    { suffix: 'ין', meaning: 'plural (Aram.)' },
    // Possessives
    { suffix: 'יהם', meaning: 'their' },
    { suffix: 'יהן', meaning: 'their (f)' },
    { suffix: 'נו', meaning: 'our/we' },
    { suffix: 'הם', meaning: 'them' },
    { suffix: 'הן', meaning: 'them (f)' },
    { suffix: 'יו', meaning: 'his' },
    { suffix: 'יה', meaning: 'her' },
    { suffix: 'כם', meaning: 'your (pl)' },
    { suffix: 'ו', meaning: 'his/they' },
    { suffix: 'י', meaning: 'my' },
    { suffix: 'ך', meaning: 'your' },
    { suffix: 'ה', meaning: 'her/direction' },
    // Aramaic
    { suffix: 'תא', meaning: 'emphatic (Aram.)' },
    { suffix: 'יא', meaning: 'emphatic (Aram.)' },
    { suffix: 'א', meaning: 'emphatic (Aram.)' },
  ];

  for (const { suffix, meaning } of suffixPatterns) {
    if (remaining.endsWith(suffix) && remaining.length > suffix.length + 2) {
      suffixes.push({ letter: suffix, meaning });
      remaining = remaining.slice(0, -suffix.length);
      break; // Only one suffix pass
    }
  }

  // === STEP 3: HANDLE WEAK VERB PATTERNS ===
  let root = remaining;
  let pattern = 'Qal';
  let weakType = null;

  // Qal participle: CוCC → remove ו to get CCC
  if (root.length === 4 && root[1] === 'ו') {
    root = root[0] + root.slice(2);
    pattern = 'Qal Participle';
  }

  // Hollow verbs (ע"ו/ע"י): CיC or CוC → expand to CוC or CיC
  if (root.length === 3 && (root[1] === 'ו' || root[1] === 'י')) {
    weakType = 'hollow (ע"ו/ע"י)';
  }

  // Lamed-He verbs: CC → CCה (if only 2 letters remain)
  if (root.length === 2) {
    root = root + 'ה';
    weakType = 'lamed-he (ל"ה)';
  }

  // Geminate (ע"ע): CC → CCC (double last letter)
  // Only if remaining is 2 consonants
  if (root.length === 2 && !weakType) {
    root = root + root[1];
    weakType = 'geminate (ע"ע)';
  }

  return {
    originalWord: cleaned,
    root: root.length >= 2 && root.length <= 4 ? root : remaining,
    prefixes,
    suffixes,
    pattern,
    weakType,
    confidence: root.length === 3 ? 90 : (root.length === 2 ? 70 : 50)
  };
};

/**
 * PRO SCHOLAR V4: Root-based fallback lookup
 * When direct lookup fails, extract the root and look it up
 * Returns scholarly definition with full morphological breakdown
 *
 * @param {string} word - The original word
 * @param {string} contextMode - Context for dictionary priority
 * @returns {Object|null} - Lookup result with morphological info
 */
const lookupByExtractedRoot = (word, contextMode) => {
  const rootAnalysis = extractShoresh(word);
  if (!rootAnalysis || !rootAnalysis.root || rootAnalysis.root.length < 2) {
    return null;
  }

  const { root, prefixes, suffixes, pattern, weakType, confidence } = rootAnalysis;

  if (DEBUG_LOOKUPS) {
    log.debug(`[RootLookup] ${word} → root: ${root}, pattern: ${pattern}, weak: ${weakType || 'strong'}`);
  }

  // Try looking up the extracted root in dictionaries
  const rootResult = lookupRootInDictionaries(root, contextMode);

  // Also try with ה restoration for lamed-he verbs
  let alternateResult = null;
  if (!rootResult && root.length === 3 && !root.endsWith('ה')) {
    alternateResult = lookupRootInDictionaries(root.slice(0, 2) + 'ה', contextMode);
  }

  // Also try potential construct-state restoration
  if (!rootResult && !alternateResult && suffixes.some(s => s.letter.startsWith('ת'))) {
    // שגגתו → שגג → שגגה
    alternateResult = lookupRootInDictionaries(root + 'ה', contextMode);
  }

  const finalResult = rootResult || alternateResult;
  if (!finalResult) return null;

  // Build morphological breakdown string
  const prefixStr = prefixes.map(p => `${p.letter} (${p.meaning})`).join(' + ');
  const suffixStr = suffixes.map(s => `${s.letter} (${s.meaning})`).join(' + ');
  const morphNote = [
    prefixStr ? `Prefix: ${prefixStr}` : null,
    `Root: ${root}`,
    pattern !== 'Qal' ? `Pattern: ${pattern}` : null,
    weakType ? `Type: ${weakType}` : null,
    suffixStr ? `Suffix: ${suffixStr}` : null,
  ].filter(Boolean).join(' • ');

  return {
    english: finalResult.english,
    fullDefinition: finalResult.fullDefinition,
    source: `${finalResult.source} (root)`,
    sources: finalResult.sources?.map(s => ({
      ...s,
      name: `${s.name} (root)`,
      isRootLookup: true
    })) || [{
      name: `${finalResult.source} (root)`,
      definition: finalResult.english,
      isRootLookup: true
    }],
    headword: root,
    matchedForm: root,
    originalWord: word,
    morphologyNote: morphNote,
    rootAnalysis: {
      root,
      prefixes,
      suffixes,
      pattern,
      weakType,
      confidence
    },
    language: finalResult.language || 'Hebrew',
    isRootLookup: true,
    offline: true
  };
};

/**
 * Look up a root in all dictionaries (used by root-based fallback)
 */
const lookupRootInDictionaries = (root, contextMode) => {
  // Try each dictionary for the root
  const bdbResult = lookupLocalBDB(root);
  const jastrowResult = lookupLocalJastrow(root);
  const strongResult = contextMode !== CONTEXT_MODES.TALMUDIC ? lookupLocalStrong(root) : null;
  const kleinResult = lookupLocalKlein(root);

  // Return first valid result with priority
  if (jastrowResult?.english) return jastrowResult;
  if (bdbResult?.english) return bdbResult;
  if (kleinResult?.english) return kleinResult;
  if (strongResult?.english) return strongResult;

  return null;
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
  // === PRO SCHOLAR V7: CACHE CHECK TO PREVENT DUPLICATE LOOKUPS ===
  // The same word can be looked up 3-4 times through different code paths
  // (main lookup, halachic root, Aramaic root analysis, etc.)
  const cacheKey = `${word}:${contextMode || 'auto'}`;
  const cached = localDictionaryCache.get(cacheKey);
  if (cached !== undefined) {
    if (DEBUG_LOOKUPS) log.debug(`[Lookup] Cache HIT: ${word}`);
    return cached;
  }

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
    localDictionaryCache.set(cacheKey, null); // Cache negative results too
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

    // === PRO SCHOLAR V4: ROOT-BASED FALLBACK ===
    // If no direct match, extract the שורש (root) and look it up
    // This handles inflected forms like שגגתו → שגג/שגה, זדונו → זדון
    const rootFallback = lookupByExtractedRoot(word, effectiveContext);
    if (rootFallback) {
      localDictionaryCache.set(cacheKey, rootFallback);
      return rootFallback;
    }

    localDictionaryCache.set(cacheKey, null);
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

  const result = {
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

  // Cache the result to prevent duplicate lookups
  localDictionaryCache.set(cacheKey, result);
  return result;
};

// Note: pickBestDefinition is imported from '../utils/definitionCleaner'

// cleanWord alias for cleanHebrewWord (already imported from hebrewDictionary)
const cleanWord = cleanHebrewWord;

// =============================================================================
// PRO SCHOLAR V3: Hebrew Binyan Verb Analysis
// Detects verb patterns (Hiphil, Piel, etc.) and extracts correct root
// This prevents wrong matches like להביא → הב (love) instead of בוא (bring)
// =============================================================================

/**
 * Try to analyze a Hebrew word as a conjugated verb
 * Handles cases like להביא where prefix stripping could match wrong roots
 *
 * @param {string} word - Cleaned Hebrew word
 * @returns {object|null} - { root, binyan, translation, ... } or null
 */
const tryHebrewVerbAnalysis = (word) => {
  if (!word || word.length < 3) return null;

  const cleanedWord = word.replace(/[\u0591-\u05C7]/g, ''); // Remove vowels

  // Common prefixes to try stripping
  const VERB_PREFIXES = ['ל', 'ה', 'ו', 'וה', 'ול', 'וב', 'ומ', 'וכ'];

  // Try the word as-is first
  let verbResult = extractHebrewRoot(cleanedWord);

  // If no result, try stripping prefixes
  if (!verbResult || verbResult.uncertain) {
    for (const prefix of VERB_PREFIXES) {
      if (cleanedWord.startsWith(prefix) && cleanedWord.length > prefix.length + 2) {
        const stem = cleanedWord.slice(prefix.length);
        const stemResult = extractHebrewRoot(stem);

        if (stemResult && stemResult.root && stemResult.confidence > 60) {
          verbResult = {
            ...stemResult,
            strippedPrefix: prefix
          };
          break;
        }
      }
    }
  }

  // If we found a valid verb with good confidence
  if (verbResult && verbResult.root && verbResult.confidence >= 65) {
    const rootInfo = ROOT_MEANINGS[verbResult.root];

    if (rootInfo) {
      // Determine the translation based on binyan
      let translation = rootInfo.base || '';
      let binyanEffect = '';

      if (verbResult.binyan) {
        const binyanName = verbResult.binyan.name || verbResult.binyan;

        switch (binyanName) {
          case 'Hifil':
          case 'Hiphil':
            // Causative: "come" → "bring", "know" → "make known"
            translation = rootInfo.causative || `to cause to ${rootInfo.base}`;
            binyanEffect = 'causative';
            break;
          case 'Piel':
            // Intensive: "break" → "shatter"
            translation = rootInfo.intensive || rootInfo.base;
            binyanEffect = 'intensive';
            break;
          case 'Pual':
            // Intensive passive
            translation = `to be ${rootInfo.intensive || rootInfo.base}`;
            binyanEffect = 'intensive passive';
            break;
          case 'Hitpael':
            // Reflexive
            translation = rootInfo.reflexive || `to ${rootInfo.base} oneself`;
            binyanEffect = 'reflexive';
            break;
          case 'Nifal':
            // Passive/reflexive
            translation = rootInfo.passive || `to be ${rootInfo.base}`;
            binyanEffect = 'passive';
            break;
          case 'Hufal':
            // Causative passive
            translation = `to be caused to ${rootInfo.base}`;
            binyanEffect = 'causative passive';
            break;
          default:
            // Qal (basic)
            translation = rootInfo.base;
            binyanEffect = 'basic';
        }
      }

      // Add prefix meaning if stripped (infinitive construct)
      if (verbResult.strippedPrefix === 'ל' && !translation.startsWith('to ')) {
        translation = `to ${translation}`;
      }

      return {
        root: verbResult.root,
        binyan: verbResult.binyan || HEBREW_BINYANIM?.qal,
        binyanEffect,
        translation: translation,
        fullTranslation: `${verbResult.binyan?.name || 'Qal'} of ${verbResult.root}: ${translation}`,
        rootMeaning: rootInfo.base,
        confidence: verbResult.confidence,
        strippedPrefix: verbResult.strippedPrefix,
        source: 'Root Database + Binyan',
        etymology: rootInfo.etymology,
        cognates: rootInfo.cognates
      };
    }
  }

  return null;
};

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

  // === PRO SCHOLAR V3: PRE-CLASSIFICATION ===
  // Check for proper nouns, abbreviations, and technical terms BEFORE dictionary lookup
  // This prevents wrong homograph matches like משה="to pull" instead of "Moses"
  const preClassResult = preClassify(cleaned, { reference, textType: effectiveContextMode });
  if (preClassResult) {
    if (DEBUG_LOOKUPS) log.debug(`[PreClassify] ${cleaned} → ${preClassResult.type}: ${preClassResult.english || preClassResult.meaning}`);

    // For proper names and abbreviations, return immediately without dictionary lookup
    if (preClassResult.skipDictionary) {
      return {
        word: word,
        cleanedWord: cleaned,
        english: preClassResult.english || preClassResult.meaning,
        fullEnglish: preClassResult.note ? `${preClassResult.english || preClassResult.meaning} - ${preClassResult.note}` : null,
        french: null,
        frenchSource: 'none',
        source: preClassResult.source,
        sources: [{
          name: preClassResult.source,
          fullName: preClassResult.source,
          definition: preClassResult.english || preClassResult.meaning,
          note: preClassResult.note,
          recommended: true,
          isProperNoun: preClassResult.type === 'proper_name',
          isAbbreviation: preClassResult.type === 'abbreviation'
        }],
        isProperNoun: preClassResult.type === 'proper_name',
        isAbbreviation: preClassResult.type === 'abbreviation',
        isTechnicalTerm: preClassResult.type === 'technical_term',
        properNounType: preClassResult.subtype,
        expansion: preClassResult.expansion, // For abbreviations
        language: 'Hebrew',
        offline: true,
        _preClassified: true
      };
    }

    // For technical terms, continue to dictionary but mark as recommended
    // This allows us to get additional scholarly sources
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

  // === PRO SCHOLAR: Check FUNCTION_WORDS first for common terms ===
  // This catches: העומדים, נפקא, להביא, התראתו, לקמן, etc.
  // These are curated translations that should take priority
  const functionWordTranslation = lookupFunctionWord(cleaned);
  if (functionWordTranslation) {
    return {
      word: word,
      cleanedWord: cleaned,
      english: functionWordTranslation,
      source: 'Talmudic',
      sources: [{
        name: 'Talmudic',
        fullName: 'Talmudic Vocabulary',
        definition: functionWordTranslation,
        recommended: true
      }],
      isAramaic: isLikelyAramaic(cleaned),
      language: isLikelyAramaic(cleaned) ? 'Aramaic' : 'Hebrew',
      offline: true,
      _functionWord: true
    };
  }

  // === PRO SCHOLAR V3: HEBREW BINYAN DETECTION ===
  // For verbs like להביא, detect binyan pattern and extract correct root
  // This prevents matching הב (love) instead of בוא (come) → Hiphil = bring
  const hebrewVerbResult = tryHebrewVerbAnalysis(cleaned);
  if (hebrewVerbResult) {
    if (DEBUG_LOOKUPS) log.debug(`[HebrewVerb] ${cleaned} → ${hebrewVerbResult.binyan?.name} of ${hebrewVerbResult.root}: ${hebrewVerbResult.translation}`);
    return {
      word: word,
      cleanedWord: cleaned,
      english: hebrewVerbResult.translation,
      fullEnglish: hebrewVerbResult.fullTranslation,
      french: null,
      frenchSource: 'none',
      source: hebrewVerbResult.source || 'Binyan Analysis',
      sources: [{
        name: 'Binyan Analysis',
        fullName: `Hebrew ${hebrewVerbResult.binyan?.name || 'Verb'} Pattern`,
        definition: hebrewVerbResult.translation,
        recommended: true,
        root: hebrewVerbResult.root,
        binyan: hebrewVerbResult.binyan?.name
      }],
      root: hebrewVerbResult.root,
      binyan: hebrewVerbResult.binyan,
      morphologyInfo: hebrewVerbResult,
      language: 'Hebrew',
      offline: true,
      _hebrewVerbAnalysis: true
    };
  }

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
    // PRO SCHOLAR: Validate headword match before accepting dictionary result
    // This prevents returning פיק (trembling) when searching for תפיקו (Aphel of נפק)
    const headword = localResult.headword || localResult.matchedForm;
    let isValidMatch = true;

    if (headword && cleaned.length >= 3) {
      // Calculate similarity between query and headword
      const stripVowels = (s) => s.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
      const cleanQuery = stripVowels(cleaned);
      const cleanHeadword = stripVowels(headword);

      // Check various match criteria
      const exactMatch = cleanQuery === cleanHeadword;
      const containsQuery = cleanHeadword.includes(cleanQuery) || cleanQuery.includes(cleanHeadword);

      // Calculate letter overlap (LCS-style)
      let matches = 0;
      const shorter = cleanQuery.length <= cleanHeadword.length ? cleanQuery : cleanHeadword;
      const longer = cleanQuery.length > cleanHeadword.length ? cleanQuery : cleanHeadword;
      for (const char of shorter) {
        if (longer.includes(char)) matches++;
      }
      const similarity = matches / Math.max(cleanQuery.length, cleanHeadword.length);

      // Reject if similarity is too low (< 65%) and not exact/contained
      if (!exactMatch && !containsQuery && similarity < 0.65) {
        isValidMatch = false;
        if (DEBUG_LOOKUPS) {
          log.debug(`[Lookup] Headword mismatch: "${headword}" vs query "${cleaned}" (similarity: ${(similarity * 100).toFixed(0)}%)`);
        }
      }
    }

    if (isValidMatch) {
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

  // PRO SCHOLAR: Try pattern analysis for Aramaic verbs (e.g., תפיקו → נפק)
  // This is critical for weak verbs where dictionary lookup fails
  if (checkAramaic || isLikelyAramaic(cleaned)) {
    const rootAnalysis = extractAramaicRoot(cleaned);
    if (rootAnalysis && rootAnalysis.confidence >= 70 && rootAnalysis.root) {
      const computedTranslation = computeVerbTranslation(rootAnalysis);
      if (computedTranslation) {
        // Look up the ROOT in dictionaries for scholarly source
        let rootDictionarySource = null;
        let rootDictionaryDef = null;
        const rootLookup = lookupLocalDictionaries(rootAnalysis.root);
        if (rootLookup?.english) {
          rootDictionaryDef = rootLookup.english;
          rootDictionarySource = rootLookup.source || 'Dictionary';
        }

        // Build sources array
        const patternSources = [];
        if (rootDictionarySource && rootDictionaryDef) {
          patternSources.push({
            name: rootDictionarySource.replace(' (Local)', ''),
            fullName: `Root "${rootAnalysis.root}" from ${rootDictionarySource}`,
            definition: rootDictionaryDef,
            isRootSource: true
          });
        }
        patternSources.push({
          name: 'Pattern Analysis',
          fullName: 'Aramaic Verb Pattern Analysis',
          definition: `${rootAnalysis.pattern} of root ${rootAnalysis.root}${rootAnalysis.weakType ? ` (${rootAnalysis.weakType})` : ''}`
        });

        return {
          word: word,
          cleanedWord: cleaned,
          english: computedTranslation,
          french: null,
          frenchSource: 'none',
          source: rootDictionarySource ? `${rootDictionarySource} + pattern` : 'pattern-analysis',
          sources: patternSources,
          isAramaic: true,
          language: 'Aramaic',
          root: rootAnalysis.root,
          morphologyInfo: {
            ...rootAnalysis,
            rootSource: rootDictionarySource || 'ROOT_MEANINGS',
            rootDefinition: rootDictionaryDef || rootAnalysis.baseMeaning
          },
          derivationChain: {
            originalWord: cleaned,
            extractedRoot: rootAnalysis.root,
            rootSource: rootDictionarySource || 'ROOT_MEANINGS',
            rootMeaning: rootDictionaryDef || rootAnalysis.baseMeaning,
            pattern: rootAnalysis.pattern,
            patternEffect: rootAnalysis.patternMeaning,
            conjugation: rootAnalysis.conjugation,
            finalTranslation: computedTranslation
          },
          confidence: rootAnalysis.confidence,
          sefariaData: null,
          offline: true,
          isLoading: false // Pattern analysis complete - no need to load more
        };
      }
    }
  }

  // === PRO SCHOLAR V3: MORPHOLOGICAL ANALYSIS FALLBACK ===
  // Try systematic morphological analysis as last resort before giving up
  // This handles Aramaic possessives, Hebrew binyanim, and complex affixes
  const morphAnalyses = analyzeWordMorphology(cleaned, {
    isAramaic: checkAramaic,
    context: effectiveContextMode
  });

  // Get the best analysis from the computed results (highest confidence first)
  const bestMorphAnalysis = morphAnalyses.length > 0 ? morphAnalyses[0] : null;

  if (bestMorphAnalysis && bestMorphAnalysis.confidence >= 65) {
    // Build comprehensive result from morphological analysis
    const morphBreakdown = [];

    if (bestMorphAnalysis.prefix) {
      morphBreakdown.push(`${bestMorphAnalysis.prefix.text} (${bestMorphAnalysis.prefix.meaning})`);
    }
    if (bestMorphAnalysis.root) {
      morphBreakdown.push(`${bestMorphAnalysis.root} (root)`);
    }
    if (bestMorphAnalysis.suffix) {
      morphBreakdown.push(`${bestMorphAnalysis.suffix.text} (${bestMorphAnalysis.suffix.meaning})`);
    }

    return {
      word: word,
      cleanedWord: cleaned,
      english: bestMorphAnalysis.translation,
      french: null,
      frenchSource: 'none',
      source: bestMorphAnalysis.source || 'morphological_analysis',
      sources: [{
        name: 'Morphological Analysis',
        tier: 'analysis',
        definition: bestMorphAnalysis.translation,
        analysis: bestMorphAnalysis.analysisType,
        confidence: bestMorphAnalysis.confidence
      }],
      isAramaic: checkAramaic || bestMorphAnalysis.isAramaic,
      language: (checkAramaic || bestMorphAnalysis.isAramaic) ? 'Aramaic' : 'Hebrew',
      morphology: {
        breakdown: morphBreakdown.join(' + '),
        prefix: bestMorphAnalysis.prefix,
        root: bestMorphAnalysis.root,
        suffix: bestMorphAnalysis.suffix,
        rootMeaning: bestMorphAnalysis.rootMeaning,
        pattern: bestMorphAnalysis.pattern,
        binyan: bestMorphAnalysis.binyan
      },
      allAnalyses: morphAnalyses.slice(0, 3), // Include top 3 possibilities
      confidence: bestMorphAnalysis.confidence,
      sefariaData: null,
      offline: true,
      isLoading: false
    };
  }

  // === PRO SCHOLAR V5: DIRECT DICTIONARY VALIDATION ===
  // Generate ALL possible roots using morphological patterns (not hardcoded lists!)
  // and validate each DIRECTLY against Jastrow/BDB/Strong's (no callbacks!)
  const multiHypResult = extractRootsWithDirectValidation(cleaned, {
    contextType: effectiveContextMode || 'unknown',
    skipStrongs: effectiveContextMode === 'talmudic' || effectiveContextMode === 'midrashic'
  });

  if (multiHypResult?.bestMatch) {
    const best = multiHypResult.bestMatch;
    if (DEBUG_LOOKUPS) {
      log.debug(`[MultiHypothesis] ${cleaned} → root "${best.root}" (${best.confidence}%): ${best.definition}`);
    }

    // Build morphology breakdown for display
    const morphBreakdown = [];
    if (best.morphology?.prefixes?.length > 0) {
      for (const p of best.morphology.prefixes) {
        morphBreakdown.push(`${p.letters} (${p.meaning})`);
      }
    }
    morphBreakdown.push(`${best.root} (root)`);
    if (best.morphology?.suffixes?.length > 0) {
      for (const s of best.morphology.suffixes) {
        morphBreakdown.push(`${s.letters} (${s.meaning})`);
      }
    }

    return {
      word: word,
      cleanedWord: cleaned,
      english: best.definition,
      french: null,
      frenchSource: 'none',
      source: best.source || 'Multi-Hypothesis',
      sources: best.sources || [{
        name: 'Multi-Hypothesis Analysis',
        fullName: `Root "${best.root}" via ${best.note || 'pattern analysis'}`,
        definition: best.definition,
        confidence: best.confidence,
        recommended: true
      }],
      isAramaic: checkAramaic,
      language: checkAramaic ? 'Aramaic' : 'Hebrew',
      root: best.root,
      morphology: {
        breakdown: morphBreakdown.join(' + '),
        hypothesisId: best.id,
        pattern: best.morphology?.pattern,
        binyan: best.morphology?.binyan,
        nounPattern: best.morphology?.nounPattern,
        weakType: best.morphology?.weakType
      },
      alternativeRoots: multiHypResult.allMatches.slice(1, 4).map(m => ({
        root: m.root,
        definition: m.definition,
        confidence: m.confidence
      })),
      confidence: best.confidence,
      sefariaData: null,
      offline: true,
      isLoading: false,
      _multiHypothesis: true
    };
  }

  // PRO SCHOLAR V6.2: Fallback to preClassResult if dictionaries didn't find the word
  // This ensures verb_form and other non-skipDictionary results are still used
  if (preClassResult && (preClassResult.english || preClassResult.meaning)) {
    if (DEBUG_LOOKUPS) log.debug(`[PreClassify Fallback] ${cleaned} → ${preClassResult.type}: ${preClassResult.english || preClassResult.meaning}`);
    return {
      word: word,
      cleanedWord: cleaned,
      english: preClassResult.english || preClassResult.meaning,
      fullEnglish: preClassResult.note ? `${preClassResult.english || preClassResult.meaning} - ${preClassResult.note}` : null,
      french: null,
      frenchSource: 'none',
      source: preClassResult.source || 'Pre-Classification',
      sources: [{
        name: preClassResult.source || 'Pre-Classification',
        fullName: preClassResult.source || 'Morphological Analysis',
        definition: preClassResult.english || preClassResult.meaning,
        note: preClassResult.note,
        recommended: true,
        root: preClassResult.root,
        binyan: preClassResult.binyan
      }],
      root: preClassResult.root,
      binyan: preClassResult.binyan ? { name: preClassResult.binyan } : null,
      morphologyInfo: {
        tense: preClassResult.tense,
        person: preClassResult.person,
        binyan: preClassResult.binyan
      },
      isAramaic: checkAramaic,
      language: checkAramaic ? 'Aramaic' : 'Hebrew',
      offline: true,
      _preClassifiedFallback: true
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
