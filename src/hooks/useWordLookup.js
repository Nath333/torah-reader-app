/**
 * useWordLookup - Custom hook for Hebrew/Aramaic word translations
 *
 * Provides a clean API for looking up words with multi-source support,
 * handling both synchronous local lookups and async API calls.
 *
 * Architecture: Strategy Pattern for extensible lookup pipeline
 * - Dictionary lookup first (scholarly sources)
 * - Pattern-based fallbacks (algorithmic, not hardcoded)
 * - Clear source tracking throughout
 *
 * Now integrated with smartDataService for:
 * - Intelligent caching (memory + IndexedDB)
 * - Offline support with graceful degradation
 * - Connectivity awareness
 */

import { useState, useCallback, useRef } from 'react';
// Consolidated imports from word lookup orchestrator
import {
  cleanHebrewWord,
  lookupWordAsync,
  lookupWordSync,
  scholarlyLookup,
  lookupJastrow,
  lookupWordSefaria,
  lookupCAL,
  analyzeCALPrefix,
  translateEnglishToFrench,
  smartLookup,
  getConnectivityStatus,
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
import { analyzeWordWithConfidence, getAramaicConfidence, lookupFunctionWord, extractAramaicRoot, computeVerbTranslation } from '../constants/morphology';

// =============================================================================
// Constants
// =============================================================================

/**
 * Confidence thresholds for different lookup strategies
 * Centralized to avoid magic numbers scattered throughout
 */
const CONFIDENCE = {
  VERB_PATTERN: 75,        // Aramaic verb pattern analysis
  ABBREVIATION: 85,        // Talmudic abbreviation detection
  FUNCTION_WORD: 90,       // Hebrew function words (particles, pronouns)
  ARAMAIC_FUNCTION: 95,    // Aramaic function words (higher confidence)
  MIN_WORD_LENGTH: 2,      // Minimum word length to attempt lookup
};

// =============================================================================
// Result Factory
// =============================================================================

/**
 * Create a normalized result object with sensible defaults
 * Ensures consistent shape across all lookup paths
 */
const createResult = (word, cleaned, overrides = {}) => ({
  word,
  cleanedWord: cleaned,
  english: null,
  french: null,
  translation: null,
  source: 'none',
  sources: [],
  language: 'Hebrew',
  headword: null,
  root: null,
  confidence: 0,
  lookupPath: null,
  ...overrides,
});

// =============================================================================
// Lookup Strategy Pattern
// =============================================================================

/**
 * Strategy: Aramaic Verb Pattern Analysis
 * Uses extractAramaicRoot + computeVerbTranslation to COMPUTE translation
 * Example: תפיקו → root נפק + Aphel + 2nd person + plural → "you (pl) bring out"
 */
const verbPatternStrategy = {
  name: 'verb-pattern',
  check: (cleaned) => {
    const rootAnalysis = extractAramaicRoot(cleaned);
    if (!rootAnalysis || rootAnalysis.confidence < CONFIDENCE.VERB_PATTERN) {
      return null;
    }

    const computedTranslation = computeVerbTranslation(rootAnalysis);
    if (!computedTranslation) return null;

    return {
      english: computedTranslation,
      translation: computedTranslation,
      source: 'pattern-analysis',
      sources: [{
        name: 'Morphology',
        fullName: 'Aramaic Verb Pattern Analysis',
        definition: `${rootAnalysis.pattern} of root ${rootAnalysis.root}${rootAnalysis.weakType ? ` (${rootAnalysis.weakType})` : ''}`
      }],
      language: 'Aramaic',
      root: rootAnalysis.root,
      isAramaicVerb: true,
      morphologyInfo: rootAnalysis,
      confidence: rootAnalysis.confidence,
      algorithmUsed: 'extractAramaicRoot + computeVerbTranslation'
    };
  }
};

/**
 * Strategy: Talmudic Abbreviation Detection
 * Catches abbreviations that aren't in standard dictionaries
 */
const abbreviationStrategy = {
  name: 'abbreviation',
  check: (cleaned) => {
    const analysis = analyzeWordWithConfidence(cleaned, { context: 'talmudic' });
    if (!analysis?.bestGuess ||
        analysis.bestGuess.type !== 'abbreviation' ||
        analysis.bestGuess.confidence < CONFIDENCE.ABBREVIATION) {
      return null;
    }

    return {
      english: analysis.bestGuess.interpretation || 'abbreviation',
      source: 'pattern-detection',
      sources: [{
        name: 'Abbreviation',
        fullName: 'Talmudic Abbreviation Pattern',
        definition: analysis.bestGuess.reason
      }],
      language: 'Hebrew',
      isAbbreviation: true,
      abbreviationInfo: analysis.bestGuess,
      confidence: analysis.bestGuess.confidence
    };
  }
};

/**
 * Ordered list of fallback strategies (used AFTER dictionary lookup fails)
 * Strategies are tried in order; first match wins
 */
const FALLBACK_STRATEGIES = [
  verbPatternStrategy,
  abbreviationStrategy,
];

/**
 * Run fallback strategies after dictionary miss
 * @param {string} word - Original word
 * @param {string} cleaned - Cleaned word
 * @param {string} lookupPathPrefix - Path to prepend (e.g., 'dictionary-miss')
 * @returns {Object|null} Result or null if no match
 */
const runFallbackStrategies = (word, cleaned, lookupPathPrefix = 'dictionary-miss') => {
  for (const strategy of FALLBACK_STRATEGIES) {
    const result = strategy.check(cleaned);
    if (result) {
      return createResult(word, cleaned, {
        ...result,
        lookupPath: `${lookupPathPrefix} → ${strategy.name}`
      });
    }
  }
  return null;
};

// =============================================================================
// Source Categories
// =============================================================================

/**
 * PRO SCHOLAR: Source Category Classification
 * Maps source types to clear categories for user transparency
 */
const SOURCE_CATEGORIES = {
  // Algorithm-based (SMART - computed, not hardcoded)
  'pattern-analysis': { category: 'algorithm', label: 'Pattern Analysis', description: 'Computed from verb patterns and root reconstruction' },
  'pattern-detection': { category: 'algorithm', label: 'Pattern Detection', description: 'Identified by morphological pattern matching' },
  'smart-root-extraction': { category: 'algorithm', label: 'Root Analysis', description: 'Root extracted via weak verb rules' },
  'morphology-analysis': { category: 'algorithm', label: 'Morphology', description: 'Analyzed prefix/suffix structure' },

  // Curated lists (scholarly, but hardcoded)
  'function-word': { category: 'curated', label: 'Curated', description: 'From curated Talmudic vocabulary' },
  'abbreviation': { category: 'curated', label: 'Abbreviation', description: 'Known abbreviation expansion' },
  'curated-list': { category: 'curated', label: 'Curated', description: 'From curated word list' },

  // Dictionary sources (external scholarly)
  'jastrow': { category: 'dictionary', label: 'Jastrow', description: 'Jastrow\'s Dictionary of Targumim, Talmud' },
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
 */
const getSourceCategory = (source) => {
  return SOURCE_CATEGORIES[source] || {
    category: 'unknown',
    label: source || 'Unknown',
    description: 'Unknown source'
  };
};

// =============================================================================
// Result Enhancement
// =============================================================================

/**
 * Enhance lookup result with frequency, grammar analysis, source reliability, and semantic fields
 * PRO SCHOLAR: Now includes precise sourceCategory for transparency
 * @param {Object} result - Base lookup result
 * @returns {Object} Enhanced result
 */
const enhanceResult = (result) => {
  if (!result) return result;

  const word = result.word || result.cleanedWord;

  // Add precise SOURCE CATEGORY tracking
  if (result.source) {
    const categoryInfo = getSourceCategory(result.source);
    result.sourceCategory = categoryInfo.category;
    result.sourceLabel = categoryInfo.label;
    result.sourceDescription = categoryInfo.description;
  }

  // Confidence-based morphology analysis
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

    // Check if this is a known function word
    const functionWordTranslation = lookupFunctionWord(word);
    if (functionWordTranslation) {
      result.morphologyAnalysis.functionWord = {
        translation: functionWordTranslation,
        confidence: CONFIDENCE.ARAMAIC_FUNCTION
      };
    }

    // Flag if best guess is an abbreviation
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
};

// =============================================================================
// Source Processing
// =============================================================================

/**
 * Unified source processor - converts API response to normalized source format
 */
const processSource = (name, data, options = {}) => {
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
};

/**
 * Source configuration for scholarly lookups
 */
const SOURCE_CONFIG = {
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

/**
 * Process scholarly result into normalized format
 */
const processScholarlyResult = (result, word, cleaned) => {
  const output = createResult(word, cleaned, {
    english: result.primaryDefinition || null,
    source: 'sefaria',
    language: result.language || 'Hebrew',
    root: result.root || null,
    morphology: result.grammar || null,
    matchedForm: result.matchedForm || null,
    cognates: result.cognates || null
  });

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
};

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Hebrew scholarly lookup - PRO SCHOLAR WORKFLOW
 *
 * CORRECT ORDER (per user requirements):
 * 1. FIRST: Dictionary lookup AS-IS (search exact word)
 * 2. IF dictionary has good match → use it (source: dictionary)
 * 3. IF NOT found → Pattern analysis via strategy pattern
 * 4. NEVER rely primarily on hardcoded lists
 */
const lookupHebrew = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createResult(word, cleaned, { lookupPath: 'too-short' });
  }

  // STEP 1: DICTIONARY LOOKUP FIRST (AS-IS)
  const connectivity = getConnectivityStatus();
  let dictionaryResult = null;

  if (connectivity.isOnline && connectivity.sefaria) {
    try {
      const scholarly = await scholarlyLookup(cleaned);
      if (scholarly?.primaryDefinition) {
        dictionaryResult = processScholarlyResult(scholarly, word, cleaned);
        dictionaryResult.lookupPath = 'dictionary-hit';
      }
    } catch {
      // Silent - will try pattern analysis next
    }
  }

  // If dictionary found a good match, use it
  if (dictionaryResult?.english && dictionaryResult.sources?.length > 0) {
    // Get French translation
    if (dictionaryResult.english && !dictionaryResult.french) {
      try {
        dictionaryResult.french = await translateEnglishToFrench(dictionaryResult.english);
      } catch {
        // French optional
      }
    }
    return enhanceResult(dictionaryResult);
  }

  // STEP 2: PATTERN ANALYSIS via Strategy Pattern
  const strategyResult = runFallbackStrategies(word, cleaned, 'dictionary-miss');
  if (strategyResult) {
    return enhanceResult(strategyResult);
  }

  // STEP 3: FALLBACK - Try cache/local if offline
  if (!connectivity.isOnline || !connectivity.sefaria) {
    const cached = await smartLookup(word, { includeFrench: true });
    if (cached?.success) {
      return enhanceResult(createResult(word, cleaned, {
        english: cached.english,
        french: cached.french,
        source: cached.source || 'cache',
        sources: cached.sources || [],
        language: cached.language || 'Hebrew',
        headword: cached.headword,
        root: cached.root,
        offline: true,
        lookupPath: 'offline → cache'
      }));
    }
  }

  // STEP 4: FINAL FALLBACK - Combined/Local lookups
  try {
    const combined = await lookupWordAsync(cleaned);
    if (combined?.english) {
      return enhanceResult(createResult(word, cleaned, {
        english: combined.english,
        french: combined.french,
        source: combined.source || 'sefaria',
        sources: combined.sources || [{ name: 'Sefaria', definition: combined.english }],
        language: combined.language || 'Hebrew',
        lookupPath: 'dictionary-miss → pattern-miss → combined-lookup'
      }));
    }
  } catch {
    // Silent fail
  }

  // Local sync as last resort
  const local = lookupWordSync(cleaned);
  if (local?.english) {
    return enhanceResult(createResult(word, cleaned, {
      english: local.english,
      french: local.french,
      source: 'local',
      sources: [{ name: 'Dictionary', definition: local.english }],
      lookupPath: 'all-miss → local-dictionary'
    }));
  }

  return createResult(word, cleaned, { lookupPath: 'no-match-found' });
};

/**
 * Aramaic scholarly lookup - PRO SCHOLAR WORKFLOW
 *
 * CORRECT ORDER (same as Hebrew):
 * 1. FIRST: Dictionary lookup AS-IS (Jastrow, CAL, Sefaria)
 * 2. IF dictionary has good match → use it
 * 3. IF NOT found → Pattern analysis via strategy pattern
 */
const lookupAramaic = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createResult(word, cleaned, { language: 'Aramaic', lookupPath: 'too-short' });
  }

  // Check connectivity
  const connectivity = getConnectivityStatus();

  // STEP 1: DICTIONARY LOOKUP FIRST (AS-IS)
  if (connectivity.isOnline && connectivity.sefaria) {
    try {
      const scholarly = await scholarlyLookup(cleaned);
      if (scholarly?.primaryDefinition) {
        const result = processScholarlyResult(scholarly, word, cleaned);
        // Cache for offline use
        smartLookup(word, { includeFrench: false }).catch(() => {});

        return enhanceResult(createResult(word, cleaned, {
          translation: result.english,
          english: result.english,
          source: result.source,
          sources: result.sources,
          headword: result.headword,
          root: result.root,
          morphology: result.morphology,
          cognates: result.cognates,
          language: result.language || 'Aramaic',
          lookupPath: 'dictionary-hit'
        }));
      }
    } catch {
      // Silent - will try pattern analysis next
    }
  }

  // STEP 2: PATTERN ANALYSIS via Strategy Pattern
  const strategyResult = runFallbackStrategies(word, cleaned, 'dictionary-miss');
  if (strategyResult) {
    strategyResult.language = 'Aramaic';
    return enhanceResult(strategyResult);
  }

  // STEP 3: FALLBACK - Try other dictionary sources
  if (!connectivity.isOnline || !connectivity.sefaria) {
    const cached = await smartLookup(word, { includeFrench: false });
    if (cached?.success) {
      return enhanceResult(createResult(word, cleaned, {
        translation: cached.english,
        english: cached.english,
        source: cached.source || 'cache',
        sources: cached.sources || [],
        language: 'Aramaic',
        offline: true,
        lookupPath: 'offline → cache'
      }));
    }
  }

  try {
    // Fallback: Direct Jastrow
    const jastrow = await lookupJastrow(cleaned);
    if (jastrow?.shortDefinition) {
      return enhanceResult(createResult(word, cleaned, {
        translation: jastrow.shortDefinition,
        english: jastrow.shortDefinition,
        source: 'jastrow',
        sources: [{ name: 'Jastrow', fullName: "Jastrow's Dictionary", definition: jastrow.shortDefinition }],
        headword: jastrow.headword,
        language: 'Aramaic',
        lookupPath: 'scholarly-miss → jastrow-direct'
      }));
    }

    // Fallback: Sefaria
    const sefaria = await lookupWordSefaria(cleaned);
    if (sefaria?.shortDefinition) {
      return enhanceResult(createResult(word, cleaned, {
        translation: sefaria.shortDefinition,
        english: sefaria.shortDefinition,
        source: sefaria.language === 'Aramaic' ? 'jastrow' : 'sefaria',
        sources: [{ name: 'Sefaria', definition: sefaria.shortDefinition }],
        headword: sefaria.headword,
        language: sefaria.language || 'Aramaic',
        lookupPath: 'scholarly-miss → jastrow-miss → sefaria'
      }));
    }

    // Fallback: CAL (Comprehensive Aramaic Lexicon)
    const cal = await lookupCAL(word);
    if (cal?.meaning || cal?.definitions?.[0]?.meaning) {
      const meaning = cal.meaning || cal.definitions?.[0]?.meaning;
      return enhanceResult(createResult(word, cleaned, {
        translation: meaning,
        english: meaning,
        source: 'cal',
        sources: [{
          name: 'CAL',
          fullName: 'Comprehensive Aramaic Lexicon (Hebrew Union College)',
          definition: meaning
        }],
        headword: cal.headword || cal.lemma,
        calTransliteration: cal.calTransliteration,
        language: 'Aramaic',
        lookupPath: 'scholarly-miss → jastrow-miss → sefaria-miss → cal'
      }));
    }
  } catch {
    // Try cache as fallback
    const cached = await smartLookup(word, { includeFrench: false });
    if (cached?.success) {
      return enhanceResult(createResult(word, cleaned, {
        translation: cached.english,
        english: cached.english,
        source: 'cache',
        sources: cached.sources || [],
        language: 'Aramaic',
        offline: true,
        lookupPath: 'error-fallback → cache'
      }));
    }
  }

  return createResult(word, cleaned, { language: 'Aramaic', lookupPath: 'no-match-found' });
};

/**
 * Sync lookups for immediate display
 */
const lookupHebrewSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createResult(word, cleaned);
  }

  const local = lookupWordSync(cleaned);
  return createResult(word, cleaned, {
    english: local?.english || null,
    french: local?.french || null,
    source: local?.english ? 'local' : 'none',
    sources: local?.english ? [{ name: 'Dictionary', definition: local.english }] : []
  });
};

const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createResult(word, cleaned, { language: 'Aramaic' });
  }

  // Analyze prefix for immediate feedback (CAL API will provide full meaning)
  const prefixInfo = analyzeCALPrefix(word);

  return createResult(word, cleaned, {
    translation: prefixInfo?.prefixMeaning ? `${prefixInfo.prefixMeaning}...` : null,
    source: 'analyzing',
    language: 'Aramaic',
    prefix: prefixInfo?.prefix,
    prefixMeaning: prefixInfo?.prefixMeaning,
    loading: true,
  });
};

// =============================================================================
// Hook
// =============================================================================

/**
 * useWordLookup - Hook for managing word lookup state and actions
 *
 * @param {Object} options
 * @param {string} options.language - 'hebrew' or 'aramaic'
 * @returns {Object} Lookup state and handlers
 */
const useWordLookup = ({ language = 'hebrew' } = {}) => {
  const [selectedWord, setSelectedWord] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const isAramaic = language === 'aramaic';
  const syncLookup = isAramaic ? lookupAramaicSync : lookupHebrewSync;
  const asyncLookup = isAramaic ? lookupAramaic : lookupHebrew;

  /**
   * Look up a word
   */
  const lookup = useCallback(async (word) => {
    // Toggle off if same word
    if (selectedWord === word) {
      setSelectedWord(null);
      setTranslationData(null);
      return;
    }

    // Cancel previous lookup
    if (abortRef.current) {
      abortRef.current.abort = true;
    }

    const controller = { abort: false };
    abortRef.current = controller;

    setSelectedWord(word);
    setIsLoading(true);

    // Immediate local result
    const localResult = syncLookup(word);
    setTranslationData(localResult);

    // Async API lookup
    try {
      const apiResult = await asyncLookup(word);

      if (!controller.abort) {
        const hasResult = isAramaic
          ? apiResult.translation
          : apiResult.english;

        if (hasResult) {
          setTranslationData(apiResult);
        }
      }
    } catch {
      // Silent fail - already have sync result
    } finally {
      if (!controller.abort) {
        setIsLoading(false);
      }
    }
  }, [selectedWord, syncLookup, asyncLookup, isAramaic]);

  /**
   * Clear selection
   */
  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    setSelectedWord(null);
    setTranslationData(null);
    setIsLoading(false);
  }, []);

  return {
    selectedWord,
    translationData,
    isLoading,
    isAramaic,
    lookup,
    clear
  };
};

export default useWordLookup;
export { lookupHebrew, lookupAramaic, lookupHebrewSync, lookupAramaicSync, CONFIDENCE };
