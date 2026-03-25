/**
 * Word Lookup Helpers - Extracted from useWordLookup hook
 *
 * Contains pure functions for processing word lookup results:
 * - Result enhancement (frequency, grammar, reliability, semantic fields)
 * - Source processing and normalization
 * - Scholarly result processing
 *
 * These helpers are used by useWordLookup but can also be used independently.
 */

// PRO SCHOLAR V10: Import from single source of truth
import { stripAllDiacritics } from './hebrewUtils';
import { SEMANTIC_DOMAINS } from '../services/semanticFieldService';
import { getWordFrequency } from '../services/wordFrequencyService';
import { analyzeWord as analyzeWordForEnhancement } from '../services/grammarAnalysisService';
import {
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords
} from '../services/semanticFieldService';
import { getSourceBadgeData, sortSourcesByReliability } from '../constants/dictionarySources';
import {
  analyzeWordWithConfidence,
  getAramaicConfidence,
  lookupFunctionWord,
  extractAramaicRoot,
  computeVerbTranslation
} from '../constants/morphology';
// PRO SCHOLAR V8: Multi-hypothesis root extraction (renamed from unifiedRootService)
import { extractRootsWithDirectValidation } from '../services/rootExtraction';
// Grammar analysis for prefix/suffix meanings (used by getPrefixMeaning, getSuffixMeaning, isLikelyNoun)
import { analyzeWord as analyzeWordForMorphology, GRAMMAR_CONSTANTS } from '../services/grammarAnalysisService';

// Use PREFIXES and SUFFIXES from grammar service (single source of truth)
const { PREFIXES, SUFFIXES } = GRAMMAR_CONSTANTS;

// =============================================================================
// PRO SCHOLAR: Confidence Thresholds
// =============================================================================

/**
 * Confidence thresholds for different lookup strategies
 * Centralized to avoid magic numbers scattered throughout
 */
export const CONFIDENCE = {
  VERY_HIGH: 95,
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50,
  MIN_VALID: 40,
  VERB_PATTERN: 75,           // Aramaic verb pattern analysis
  ABBREVIATION: 85,           // Talmudic abbreviation detection
  FUNCTION_WORD: 90,          // Hebrew function words
  ARAMAIC_FUNCTION: 95,       // Aramaic function words
  MIN_WORD_LENGTH: 2,         // Minimum word length
  HEADWORD_MATCH_THRESHOLD: 0.65, // Minimum similarity for valid dictionary match
};

// =============================================================================
// PRO SCHOLAR: Source Categories for Transparency
// =============================================================================

/**
 * Source Category Classification
 * Maps source types to clear categories for user transparency
 */
export const SOURCE_CATEGORIES = {
  // Algorithm-based (computed, not hardcoded)
  'pattern-analysis': { category: 'algorithm', label: 'Pattern Analysis', description: 'Computed from verb patterns and root reconstruction' },
  'pattern-detection': { category: 'algorithm', label: 'Pattern Detection', description: 'Identified by morphological pattern matching' },
  'smart-root-extraction': { category: 'algorithm', label: 'Root Analysis', description: 'Root extracted via weak verb rules' },
  'morphology-analysis': { category: 'algorithm', label: 'Morphology', description: 'Analyzed prefix/suffix structure' },

  // Curated lists (scholarly, but hardcoded)
  'function-word': { category: 'curated', label: 'Curated', description: 'From curated Talmudic vocabulary' },
  'abbreviation': { category: 'curated', label: 'Abbreviation', description: 'Known abbreviation expansion' },
  'curated-list': { category: 'curated', label: 'Curated', description: 'From curated word list' },

  // Dictionary sources (external scholarly)
  'jastrow': { category: 'dictionary', label: 'Jastrow', description: "Jastrow's Dictionary of Targumim, Talmud" },
  'bdb': { category: 'dictionary', label: 'BDB', description: 'Brown-Driver-Briggs Hebrew Lexicon' },
  'sefaria': { category: 'dictionary', label: 'Sefaria', description: 'Sefaria.org Lexicon' },
  'cal': { category: 'dictionary', label: 'CAL', description: 'Comprehensive Aramaic Lexicon' },
  'steinsaltz': { category: 'dictionary', label: 'Steinsaltz', description: 'Steinsaltz Talmud Translation' },
  'local': { category: 'dictionary', label: 'Local Dict', description: 'Local dictionary file' },

  // Cache
  'cache': { category: 'cache', label: 'Cached', description: 'Previously fetched result' },
  'none': { category: 'none', label: 'Not Found', description: 'No translation found' }
};

/**
 * Get source category info for precise tracking
 * @param {string} source - Source identifier
 * @returns {Object} Category info with label and description
 */
export function getSourceCategory(source) {
  return SOURCE_CATEGORIES[source] || {
    category: 'unknown',
    label: source || 'Unknown',
    description: 'Unknown source'
  };
}

// =============================================================================
// PRO SCHOLAR: Dictionary Match Validation
// =============================================================================

/**
 * Calculate similarity between query and dictionary headword
 * Uses LCS (Longest Common Subsequence) algorithm
 *
 * PRO SCHOLAR: Detects when dictionary returns wrong entry
 * Example: Query "תפיקו" returns headword "פיק" (60% similarity - REJECT)
 *
 * @param {string} query - The word we searched for
 * @param {string} headword - The headword returned by dictionary
 * @returns {number} Similarity score 0-1
 */
export function calculateHeadwordSimilarity(query, headword) {
  if (!query || !headword) return 1; // No headword to validate, trust it

  // Strip vowels (nikud) for comparison - use hebrewUtils (DRY)
  const q = stripAllDiacritics(query);
  const h = stripAllDiacritics(headword);

  // Exact match
  if (q === h) return 1;

  // One contains the other (prefix/suffix stripped)
  if (q.includes(h) || h.includes(q)) {
    const minLen = Math.min(q.length, h.length);
    const maxLen = Math.max(q.length, h.length);
    // Penalize if too much was stripped (e.g., תפיקו → פיק is 3/5 = 0.6)
    return minLen / maxLen;
  }

  // Calculate Longest Common Subsequence ratio
  const lcs = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[j][i] = a[i - 1] === b[j - 1] ? m[j - 1][i - 1] + 1 : Math.max(m[j][i - 1], m[j - 1][i]);
      }
    }
    return m[b.length][a.length];
  };

  const lcsLen = lcs(q, h);
  const maxLen = Math.max(q.length, h.length);
  return lcsLen / maxLen;
}

/**
 * Validate that dictionary result actually matches the queried word
 * PRO SCHOLAR: Prevents returning wrong homographs
 *
 * Example: Klein's dictionary returns "פיק" (trembling) for "תפיקו"
 * But תפיקו is actually Aphel of נפק (bring out) - REJECT the dictionary match
 *
 * @param {string} query - The cleaned word we searched for
 * @param {Object} result - The dictionary result
 * @returns {Object} { isValid: boolean, similarity: number, reason: string }
 */
export function validateDictionaryMatch(query, result) {
  if (!result) return { isValid: false, similarity: 0, reason: 'no-result' };

  const headword = result.headword || result.matchedForm;

  // No headword to validate - trust the result but flag it
  if (!headword) {
    return { isValid: true, similarity: 1, reason: 'no-headword-to-validate' };
  }

  const similarity = calculateHeadwordSimilarity(query, headword);

  if (similarity >= CONFIDENCE.HEADWORD_MATCH_THRESHOLD) {
    return {
      isValid: true,
      similarity,
      reason: similarity === 1 ? 'exact-match' : 'acceptable-match'
    };
  }

  // Low similarity - dictionary matched a different word
  return {
    isValid: false,
    similarity,
    reason: 'headword-mismatch',
    details: `Query "${query}" got headword "${headword}" (similarity: ${(similarity * 100).toFixed(0)}%)`
  };
}

// =============================================================================
// Source Configuration - PRO SCHOLAR V5 UNIFIED METADATA
// =============================================================================

/**
 * PRO SCHOLAR V5: Unified source configuration with tier information
 * Single source of truth for all dictionary/source metadata
 *
 * Tiers:
 * - gold: Academic standard dictionaries (highest reliability, +5 bonus)
 * - silver: Established reference works (0 bonus)
 * - bronze: Algorithmic or general sources (-3 bonus)
 */
export const SOURCE_CONFIG = {
  // GOLD TIER - Academic standard
  bdb: { fullName: 'Brown-Driver-Briggs Hebrew Lexicon', shortName: 'BDB (1906)', year: 1906, tier: 'gold', bonus: 5, language: 'hebrew' },
  jastrow: { fullName: "Jastrow's Dictionary of Targumim, Talmud", shortName: 'Jastrow (1903)', year: 1903, tier: 'gold', bonus: 5, language: 'aramaic' },
  halot: { fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', shortName: 'HALOT', year: 2000, tier: 'gold', bonus: 5, language: 'both' },
  cal: { fullName: 'Comprehensive Aramaic Lexicon (Hebrew Union College)', shortName: 'CAL', year: 2023, tier: 'gold', bonus: 5, language: 'aramaic' },

  // SILVER TIER - Established reference
  strongs: { fullName: "Strong's Exhaustive Concordance", shortName: "Strong's", tier: 'silver', bonus: 0, language: 'hebrew' },
  strong: { fullName: "Strong's Concordance", shortName: "Strong's", tier: 'silver', bonus: 0, language: 'hebrew' }, // alias
  klein: { fullName: "Klein's Etymological Dictionary", shortName: 'Klein', year: 1987, tier: 'silver', bonus: 0, language: 'hebrew' },
  gesenius: { fullName: "Gesenius' Hebrew Grammar & Lexicon", shortName: 'Gesenius', year: 1910, tier: 'silver', bonus: 0, language: 'hebrew' },
  twot: { fullName: 'Theological Wordbook of the Old Testament', shortName: 'TWOT', year: 1980, tier: 'silver', bonus: 0, language: 'hebrew' },

  // BRONZE TIER - General/algorithmic
  sefaria: { fullName: 'Sefaria.org Lexicon', shortName: 'Sefaria', tier: 'bronze', bonus: -3, language: 'both' },
  steinsaltz: { fullName: 'Steinsaltz Talmud Translation', shortName: 'Steinsaltz', year: 1989, tier: 'bronze', bonus: -3, language: 'aramaic' },
  bolls: { fullName: 'Bolls.life Bible Dictionary', shortName: 'Bolls', year: 2020, tier: 'bronze', bonus: -3, language: 'hebrew' }
};

/**
 * Tier reliability scores
 */
export const TIER_RELIABILITY = {
  gold: 0.95,
  silver: 0.85,
  bronze: 0.70
};

// =============================================================================
// PREFIX/SUFFIX MEANING UTILITIES
// Migrated from wordLookupService.js for centralized access
// =============================================================================

/**
 * Get prefix meaning from grammar service
 * @param {string} prefixStr - Hebrew prefix character(s)
 * @returns {string} Meaning of the prefix
 */
export const getPrefixMeaning = (prefixStr) => {
  if (!prefixStr) return 'prefix';
  if (prefixStr.length === 1) {
    const prefix = PREFIXES[prefixStr];
    if (!prefix) return 'prefix';
    return prefix.meaning.split(' ')[0].replace(/[()]/g, '');
  }
  const meanings = [];
  for (const letter of prefixStr) {
    const prefix = PREFIXES[letter];
    if (prefix) {
      meanings.push(prefix.meaning.split(' ')[0].replace(/[()]/g, ''));
    }
  }
  return meanings.length > 0 ? meanings.join(' + ') : 'prefix';
};

/**
 * Get suffix meaning from grammar service
 * @param {string} suffix - Hebrew suffix
 * @returns {string} Meaning of the suffix
 */
export const getSuffixMeaning = (suffix) => {
  if (!suffix) return 'suffix';
  const suffixInfo = SUFFIXES[suffix];
  if (suffixInfo) return suffixInfo.meaning;
  if (suffix.startsWith('ו') && suffix.length > 1) {
    const innerSuffix = suffix.slice(1);
    const innerInfo = SUFFIXES[innerSuffix];
    if (innerInfo) return `and + ${innerInfo.meaning}`;
  }
  return 'suffix';
};

/**
 * Smart detection: Is this word likely a noun?
 * @param {string} word - Hebrew word
 * @returns {boolean} True if likely a noun
 */
export const isLikelyNoun = (word) => {
  if (!word) return false;
  const analysis = analyzeWordForMorphology(word);
  if (analysis?.partOfSpeech?.name === 'Noun') return true;
  const hasDefiniteArticle = /^ה/.test(word);
  const hasPluralSuffix = /(?:ים|ות|ין)$/.test(word);
  return hasDefiniteArticle || hasPluralSuffix;
};

/**
 * Is this definition describing a verb action?
 * @param {string} text - Definition text
 * @returns {boolean} True if definition is verb-like
 */
export const isVerbSenseDefinition = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return (
    /^to\s+\w/.test(lower) ||
    /^(intermission|cessation|resting|ceasing)/i.test(lower) ||
    /^(departure|exit|going out)/i.test(lower) ||
    /^(entering|coming in|income)/i.test(lower)
  );
};

/**
 * Get source tier from name
 */
export const getSourceTier = (sourceName) => {
  const normalized = sourceName?.toLowerCase() || '';
  for (const [key, config] of Object.entries(SOURCE_CONFIG)) {
    if (normalized.includes(key)) return config.tier || 'bronze';
  }
  return 'bronze';
};

/**
 * Get confidence bonus for a source
 */
export const getSourceBonus = (sourceName) => {
  const normalized = sourceName?.toLowerCase() || '';
  for (const [key, config] of Object.entries(SOURCE_CONFIG)) {
    if (normalized.includes(key)) return config.bonus || 0;
  }
  return 0;
};

// =============================================================================
// Result Enhancement
// =============================================================================

/**
 * Enhance lookup result with frequency, grammar analysis, source reliability, and semantic fields
 * PRO SCHOLAR: Complete version with source category tracking and root extraction
 * @param {Object} result - Base lookup result
 * @returns {Object} Enhanced result
 */
export function enhanceResult(result) {
  if (!result) return result;

  const word = result.word || result.cleanedWord;

  // PRO SCHOLAR: Add precise SOURCE CATEGORY tracking for transparency
  if (result.source) {
    const categoryInfo = getSourceCategory(result.source);
    result.sourceCategory = categoryInfo.category;
    result.sourceLabel = categoryInfo.label;
    result.sourceDescription = categoryInfo.description;
  }

  // PRO SCHOLAR: ALWAYS extract root using extractAramaicRoot
  // This ensures root is populated even when dictionary returned a result without root info
  // Example: תפיקו should always show root נפק, even if dictionary returned something
  if (!result.root || !result.morphologyInfo) {
    const rootAnalysis = extractAramaicRoot(word);
    if (rootAnalysis?.root && rootAnalysis.confidence >= 50) {
      // Only override if we don't already have root
      if (!result.root) {
        result.root = rootAnalysis.root;
      }
      // Always add morphology info for transparency
      result.morphologyInfo = {
        ...rootAnalysis,
        extractedFrom: word,
        wasComputed: true
      };
      // If we have a high-confidence verb pattern, add computed translation too
      if (rootAnalysis.confidence >= CONFIDENCE.VERB_PATTERN && !result.computedTranslation) {
        const verbTranslation = computeVerbTranslation(rootAnalysis);
        if (verbTranslation) {
          result.computedTranslation = verbTranslation;
          result.verbBreakdown = {
            root: rootAnalysis.root,
            pattern: rootAnalysis.pattern,
            patternMeaning: rootAnalysis.patternMeaning,
            conjugation: rootAnalysis.conjugation,
            weakType: rootAnalysis.weakType,
            translation: verbTranslation
          };
        }
      }
    }
  }

  // PRO SCHOLAR V5: Multi-hypothesis root extraction
  // Shows ALL possible roots with dictionary validation and confidence scores
  if (!result.allHypotheses && word.length >= 3) {
    try {
      const multiHyp = extractRootsWithDirectValidation(word, {
        contextType: result.language === 'Aramaic' ? 'talmudic' : 'biblical'
      });

      if (multiHyp?.allMatches?.length > 0) {
        // Format hypotheses for display
        result.allHypotheses = multiHyp.allMatches.map((hyp, idx) => ({
          root: hyp.root || hyp.hypothesis?.root,
          confidence: hyp.confidence || hyp.score || 70,
          definition: hyp.definition || hyp.translation || hyp.hypothesis?.meaning,
          source: hyp.source || hyp.dictionarySource || 'analysis',
          tier: getSourceTier(hyp.source || hyp.dictionarySource || ''),
          weakVerb: hyp.weakVerb || hyp.hypothesis?.weakType,
          pattern: hyp.pattern || hyp.hypothesis?.pattern,
          morphology: hyp.hypothesis?.morphology || hyp.strippedMorphology,
          isPrimary: idx === 0,
          hypothesis: hyp.hypothesis
        }));

        // Set best match info if not already set
        if (!result.root && multiHyp.bestMatch?.root) {
          result.root = multiHyp.bestMatch.root;
          result.multiHypothesisBestMatch = {
            root: multiHyp.bestMatch.root,
            confidence: multiHyp.bestMatch.confidence,
            source: multiHyp.bestMatch.source
          };
        }

        // Track hypothesis metadata
        result.hypothesisMetadata = {
          totalGenerated: multiHyp.hypothesisCount || multiHyp.hypotheses?.length || 0,
          totalValidated: multiHyp.matchCount || multiHyp.allMatches?.length || 0,
          isAramaicParticle: multiHyp.isAramaicParticle || false,
          directValidation: multiHyp.directValidation || false
        };
      }
    } catch (e) {
      // Silent fail - multi-hypothesis is enhancement, not critical
      if (process.env.NODE_ENV === 'development') {
        console.warn('Multi-hypothesis extraction failed:', e.message);
      }
    }
  }

  // PRO SCHOLAR: Confidence-based morphology analysis
  const confidenceAnalysis = analyzeWordWithConfidence(word, {
    context: result.language === 'Aramaic' ? 'talmudic' : 'mixed'
  });

  if (confidenceAnalysis) {
    result.morphologyAnalysis = {
      interpretations: confidenceAnalysis.interpretations,
      bestGuess: confidenceAnalysis.bestGuess,
      totalInterpretations: confidenceAnalysis.metadata?.totalInterpretations || 0,
      highConfidenceCount: confidenceAnalysis.metadata?.highConfidenceCount || 0,
      aramaicConfidence: getAramaicConfidence(word)
    };

    // Check for known function word
    const functionWordTranslation = lookupFunctionWord(word);
    if (functionWordTranslation) {
      result.morphologyAnalysis.functionWord = {
        translation: functionWordTranslation,
        confidence: CONFIDENCE.ARAMAIC_FUNCTION
      };
    }

    // Flag abbreviations
    if (confidenceAnalysis.bestGuess?.type === 'abbreviation') {
      result.isAbbreviation = true;
      result.abbreviationInfo = confidenceAnalysis.bestGuess;
    }
  }

  // Add word frequency data
  const frequencyData = getWordFrequency(word);
  if (frequencyData) {
    result.frequency = {
      count: frequencyData.count,
      band: frequencyData.band,
      percentile: frequencyData.percentile,
      gloss: frequencyData.gloss,
      domain: frequencyData.domain
    };
  }

  // Add grammar/binyan analysis for verbs
  const grammarAnalysis = analyzeWordForEnhancement(word);
  if (grammarAnalysis) {
    result.grammar = {
      partOfSpeech: grammarAnalysis.partOfSpeech,
      root: grammarAnalysis.root,
      rootInfo: grammarAnalysis.rootInfo,
      prefixes: grammarAnalysis.prefixes,
      binyan: grammarAnalysis.binyan,
      binyanKey: grammarAnalysis.binyanKey,
      tense: grammarAnalysis.tense,
      confidence: grammarAnalysis.analysis?.confidence
    };
  }

  // Add semantic field data
  const semanticData = getWordSemantics(word);
  if (semanticData) {
    const primaryDomain = SEMANTIC_DOMAINS[semanticData.primaryDomain];
    const secondaryDomains = (semanticData.secondaryDomains || [])
      .map(d => SEMANTIC_DOMAINS[d])
      .filter(Boolean);

    result.semanticField = {
      primaryDomain: primaryDomain ? {
        key: semanticData.primaryDomain,
        ...primaryDomain
      } : null,
      secondaryDomains: secondaryDomains.map((d, i) => ({
        key: semanticData.secondaryDomains[i],
        ...d
      })),
      synonyms: getSynonyms(word).slice(0, 5),
      antonyms: getAntonyms(word).slice(0, 5),
      relatedWords: getRelatedWords(word, 5),
      meanings: semanticData.meanings,
      notes: semanticData.notes,
      cognates: semanticData.cognates
    };
  }

  // Enhance sources with reliability badges and tier info
  if (result.sources && result.sources.length > 0) {
    result.sources = result.sources.map(source => ({
      ...source,
      badge: getSourceBadgeData(source.name),
      tier: getSourceTier(source.name),
      bonus: getSourceBonus(source.name)
    }));
    result.sources = sortSourcesByReliability(result.sources);
  }

  // Add primary source badge with tier
  if (result.source) {
    result.sourceBadge = getSourceBadgeData(result.source);
    result.sourceTier = getSourceTier(result.source);
  }

  return result;
}

// =============================================================================
// Source Processing
// =============================================================================

/**
 * Unified source processor - converts API response to normalized source format
 * @param {string} name - Source display name
 * @param {Object} data - Source data from API
 * @param {Object} options - Additional source metadata
 * @returns {Object|null} Normalized source or null if invalid
 */
export function processSource(name, data, options = {}) {
  if (!data?.definitions?.length) return null;

  const def = data.definitions.find(d => !d.isShort)?.text || data.definitions[0]?.text;
  if (!def) return null;

  return {
    name,
    fullName: options.fullName || name,
    definition: def,
    year: options.year,
    strongNumber: data.strongNumber,
    morphology: data.morphology
  };
}

/**
 * Process scholarly result into normalized format
 * @param {Object} result - Raw scholarly lookup result
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word form
 * @returns {Object} Normalized lookup result
 */
export function processScholarlyResult(result, word, cleaned) {
  const output = {
    word,
    cleanedWord: cleaned,
    english: result.primaryDefinition || null,
    french: null,
    source: 'sefaria',
    sources: [],
    language: result.language || 'Hebrew',
    headword: null,
    root: result.root || null,
    morphology: result.grammar || null,
    matchedForm: result.matchedForm || null,
    cognates: result.cognates || null
  };

  // Get headword from first available source
  output.headword = result.sources?.bdb?.headword ||
                    result.sources?.strong?.headword ||
                    result.sources?.jastrow?.headword ||
                    cleaned;

  // Process each source
  for (const [key, config] of Object.entries(SOURCE_CONFIG)) {
    const sourceData = result.sources?.[key];
    if (sourceData) {
      const processed = processSource(
        key === 'strong' ? "Strong's" : key.charAt(0).toUpperCase() + key.slice(1),
        sourceData,
        config
      );
      if (processed) {
        output.sources.push(processed);

        // Set primary source based on priority
        if (key === 'bdb') output.source = 'bdb';
        else if (key === 'jastrow' && output.source === 'sefaria') {
          output.source = 'jastrow';
          output.language = 'Aramaic';
        }
        else if (key === 'steinsaltz' && output.source === 'sefaria') {
          output.source = 'steinsaltz';
          output.language = 'Aramaic';
        }
      }
    }
  }

  // Process other/unknown sources
  if (result.sources?.other?.length > 0) {
    for (const other of result.sources.other.slice(0, 3)) {
      if (!other.definitions?.length) continue;

      const lexicon = other.lexicon || '';
      let displayName = 'Lexicon';
      let fullName = lexicon;

      // Identify known lexicons
      if (lexicon.toLowerCase().includes('halot')) {
        displayName = 'HALOT';
        fullName = 'Hebrew and Aramaic Lexicon';
      } else if (lexicon.toLowerCase().includes('gesenius')) {
        displayName = 'Gesenius';
        fullName = "Gesenius' Hebrew Grammar";
      } else if (lexicon.toLowerCase().includes('twot')) {
        displayName = 'TWOT';
        fullName = 'Theological Wordbook';
      } else if (lexicon.toLowerCase().includes('even') || lexicon.toLowerCase().includes('shoshan')) {
        displayName = 'Even-Shoshan';
        fullName = 'Even-Shoshan Hebrew Dictionary';
      } else {
        displayName = lexicon.split(' ')[0] || 'Lexicon';
      }

      // Avoid duplicates
      if (!output.sources.find(s => s.name === displayName)) {
        output.sources.push({
          name: displayName,
          fullName,
          definition: other.definitions[0]?.text
        });
      }
    }
  }

  // Fallback source if none found
  if (output.sources.length === 0 && output.english) {
    output.sources.push({
      name: 'Sefaria',
      fullName: 'Sefaria Lexicon',
      definition: output.english
    });
  }

  return output;
}

// =============================================================================
// Result Builders
// =============================================================================

/**
 * Create a base lookup result object
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word form
 * @param {string} language - 'Hebrew' or 'Aramaic'
 * @returns {Object} Base result object
 */
export function createBaseResult(word, cleaned, language = 'Hebrew') {
  return {
    word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    source: 'none',
    sources: [],
    language,
    headword: null,
    root: null
  };
}

/**
 * Create a function word result (high confidence match)
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word form
 * @param {string} translation - Function word translation
 * @param {Object} confidenceAnalysis - Morphology analysis result
 * @returns {Object} Function word result
 */
export function createFunctionWordResult(word, cleaned, translation, confidenceAnalysis) {
  return enhanceResult({
    word,
    cleanedWord: cleaned,
    english: translation,
    french: null,
    source: 'function-word',
    sources: [{
      name: 'Rabbinic',
      fullName: 'Curated Rabbinic Vocabulary',
      definition: translation
    }],
    language: confidenceAnalysis?.bestGuess?.type?.includes('aramaic') ? 'Aramaic' : 'Hebrew',
    headword: cleaned,
    isFunctionWord: true,
    confidence: 95
  });
}

/**
 * Create an abbreviation result
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word form
 * @param {Object} abbrevAnalysis - Abbreviation analysis result
 * @returns {Object} Abbreviation result
 */
export function createAbbreviationResult(word, cleaned, abbrevAnalysis) {
  return enhanceResult({
    word,
    cleanedWord: cleaned,
    english: abbrevAnalysis.bestGuess.interpretation || 'abbreviation',
    french: null,
    source: 'abbreviation',
    sources: [{
      name: 'Abbreviation',
      fullName: 'Talmudic Abbreviation',
      definition: abbrevAnalysis.bestGuess.reason
    }],
    language: 'Hebrew',
    isAbbreviation: true,
    abbreviationInfo: abbrevAnalysis.bestGuess
  });
}

/**
 * Create a cached/offline result
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word form
 * @param {Object} cached - Cached lookup data
 * @returns {Object} Cached result
 */
export function createCachedResult(word, cleaned, cached) {
  return enhanceResult({
    word,
    cleanedWord: cleaned,
    english: cached.english,
    french: cached.french,
    source: cached.source || 'cache',
    sources: cached.sources || [],
    language: cached.language || 'Hebrew',
    headword: cached.headword,
    root: cached.root,
    offline: true
  });
}

const WordLookupHelpers = {
  // PRO SCHOLAR: Confidence thresholds
  CONFIDENCE,
  // PRO SCHOLAR: Source transparency
  SOURCE_CATEGORIES,
  SOURCE_CONFIG,
  getSourceCategory,
  // PRO SCHOLAR: Dictionary validation
  calculateHeadwordSimilarity,
  validateDictionaryMatch,
  // PRO SCHOLAR: Prefix/suffix utilities
  getPrefixMeaning,
  getSuffixMeaning,
  isLikelyNoun,
  isVerbSenseDefinition,
  // Source tier utilities
  TIER_RELIABILITY,
  getSourceTier,
  getSourceBonus,
  // Result processing
  enhanceResult,
  processSource,
  processScholarlyResult,
  // Result builders
  createBaseResult,
  createFunctionWordResult,
  createAbbreviationResult,
  createCachedResult
};

export default WordLookupHelpers;
