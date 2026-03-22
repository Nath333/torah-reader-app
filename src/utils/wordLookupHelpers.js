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

import {
  getWordFrequency,
  analyzeGrammar as analyzeWord,
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  SEMANTIC_DOMAINS,
  getSourceBadgeData,
  sortSourcesByReliability
} from '../services/wordLookupOrchestrator';
import { analyzeWordWithConfidence, getAramaicConfidence, lookupFunctionWord } from '../constants/morphology';

// =============================================================================
// Source Configuration
// =============================================================================

/**
 * Source configuration for scholarly lookups
 */
export const SOURCE_CONFIG = {
  bdb: { fullName: 'Brown-Driver-Briggs Hebrew Lexicon', year: 1906 },
  strong: { fullName: "Strong's Concordance" },
  jastrow: { fullName: "Jastrow's Dictionary of Targumim, Talmud", year: 1903 },
  klein: { fullName: "Klein's Etymological Dictionary", year: 1987 },
  steinsaltz: { fullName: 'Steinsaltz Talmud Translation', year: 1989 },
  sefaria: { fullName: 'Sefaria.org Lexicon' },
  bolls: { fullName: 'Bolls.life Bible Dictionary', year: 2020 },
  halot: { fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', year: 2000 },
  gesenius: { fullName: "Gesenius' Hebrew Grammar & Lexicon", year: 1910 },
  twot: { fullName: 'Theological Wordbook of the Old Testament', year: 1980 },
  cal: { fullName: 'Comprehensive Aramaic Lexicon (Hebrew Union College)', year: 2023 }
};

// =============================================================================
// Result Enhancement
// =============================================================================

/**
 * Enhance lookup result with frequency, grammar analysis, source reliability, and semantic fields
 * @param {Object} result - Base lookup result
 * @returns {Object} Enhanced result
 */
export function enhanceResult(result) {
  if (!result) return result;

  const word = result.word || result.cleanedWord;

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
        confidence: 95
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
  const grammarAnalysis = analyzeWord(word);
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

  // Enhance sources with reliability badges
  if (result.sources && result.sources.length > 0) {
    result.sources = result.sources.map(source => ({
      ...source,
      badge: getSourceBadgeData(source.name)
    }));
    result.sources = sortSourcesByReliability(result.sources);
  }

  // Add primary source badge
  if (result.source) {
    result.sourceBadge = getSourceBadgeData(result.source);
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
      name: 'Talmudic',
      fullName: 'Curated Talmudic Vocabulary',
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

export default {
  SOURCE_CONFIG,
  enhanceResult,
  processSource,
  processScholarlyResult,
  createBaseResult,
  createFunctionWordResult,
  createAbbreviationResult,
  createCachedResult
};
