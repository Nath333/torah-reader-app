// =============================================================================
// UNIFIED LOOKUP SERVICE
// Single entry point for all word lookups with scholarly enrichment
// Features: parallel source aggregation, citations, confidence scoring,
// morphology, root family expansion, semantic fields, and contextual ranking
// =============================================================================

import { createManagedCache } from './cacheOrchestrator';
import { createPipeline } from './lookupPipeline';
import { createStages } from './lookupStages';
import {
  aggregateLocalSources,
  getSourceTier,
  calculateConsensus,
  raceWithEarlyReturn,
  getResultQualityScore,
  rankSourcesByTier,
  generateSourceComparison,
  SCHOLARLY_TIERS
} from './scholarSourceAggregator';
import { cleanHebrewWord } from './hebrewDictionary';
import { isLikelyAramaic } from './babylonianDictionary';
import { getContextFromReference } from '../constants/bookConstants';
import { createLogger } from '../utils/debug';

// Dictionary loaders (lazy) + common words for preloading
import {
  getBDBData,
  getJastrowData,
  getStrongsData,
  getCALAramaicData,
  getJastrowAramaicData,
  // PRO SCHOLAR V16: Academic sources (FREE public domain sources)
  getGeseniusLexiconData,
  getKleinLexiconData,
  COMMON_HEBREW_WORDS,
  COMMON_ARAMAIC_WORDS,
  // PRO SCHOLAR V13: Preload synchronization
  waitForPreload,
  isCoreDictionariesLoaded
} from './dictionaryLoader';
import { lookupAramaicWord as lookupCalAramaic } from './calDictionaryService';
import { lookupWordSefaria } from './scholarlyLexiconService';
// PRO SCHOLAR: Optional reference source (community-edited)
import { lookupWiktionary, fetchWiktionaryEtymology, getProtoSemitic } from './wiktionaryService';
// PRO SCHOLAR V12: Comparative Semitic - CURATED cognates (primary source)
import { getCognates as getCuratedCognates, getCognatesAsync } from './comparativeSemiticService';
// PRO SCHOLAR V12: Etymology enrichment with ALL scholarly databases (78,000+ entries)
import { getComprehensiveEtymology } from './etymologyEnrichmentService';
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../utils/hebrewUtils';
import { HEBREW_PREFIXES_ORDERED } from '../constants/morphology';
import { pickBestDefinition } from '../utils/definitionCleaner';
// Grammar and morphological analysis
import { tryHebrewVerbAnalysis } from './grammarAnalysisService';
import { extractRootsWithDirectValidation, extractRootsWithAsyncValidation, getRootFamily } from './rootExtraction';
import { analyzeWordMorphology } from './morphologicalAnalysisService';
// Semantic field integration
import {
  SEMANTIC_DOMAINS,
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  getDomain
} from './semanticFieldService';
// French translation support
import { translateEnglishToFrench } from './englishToFrenchService';
// Source metadata for citations
import { getSourceInfo, RELIABILITY_TIERS } from '../constants/dictionarySources';
// Contextual definition ranking
import {
  rankDefinitions,
  detectContextType,
  detectDomain,
  CONTEXT_TYPES
} from './contextualDefinitionService';
// Word relationship integration
import {
  getWordRelationships as _getWordRelationships,
  getRootFamily as _getRootFamily,
  findSemanticFields,
  WORD_RELATIONSHIP_TYPES,
  WORD_RELATIONSHIPS_DB
} from './wordRelationshipService';
// Critical word fallback for common words
import {
  lookupCriticalWord,
  isBiblicalName,
  // PRO SCHOLAR V12: Academic critical words with full scholarly data
  lookupAcademicCriticalWord,
  loadAcademicCriticalWords
} from '../constants/criticalWords';
// Telemetry integration for tracking lookup performance
import { recordLookup, recordDictionaryLookup } from './telemetryService';

const log = createLogger('UnifiedLookup');
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// CONFIDENCE SCORING CONSTANTS
// =============================================================================

const CONFIDENCE_SCORING = {
  // Source count scoring
  SOURCE_MULTIPLIER: 8,
  MAX_SOURCE_POINTS: 25,

  // Tier-based scoring
  TIER_1_POINTS: 20,  // Academic sources (BDB, Jastrow)
  TIER_2_POINTS: 10,  // Scholarly sources (Klein)
  TIER_3_POINTS: 5,   // Reference sources (Strong's)
  MAX_TIER_POINTS: 35,

  // Consensus scoring
  STRONG_CONSENSUS: 25,
  MODERATE_CONSENSUS: 15,
  WEAK_CONSENSUS: 8,

  // Match quality scoring
  EXACT_MATCH: 15,
  NORMALIZED_MATCH: 12,
  ROOT_MATCH: 8,
  MORPHOLOGICAL_MATCH: 5,
  DEFAULT_MATCH: 10,

  // Confidence thresholds
  THRESHOLDS: {
    VERY_HIGH: 80,
    HIGH: 60,
    MODERATE: 40,
    LOW: 20
  }
};

// =============================================================================
// CACHES
// =============================================================================

const lookupCache = createManagedCache('unifiedLookup', {
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 2000
});

const pendingLookups = new Map(); // Deduplication

// Preload state management
let preloadingPromise = null;
let preloadingComplete = false;
let preloadedCount = 0;

// =============================================================================
// DICTIONARY LOOKUP FUNCTIONS
// =============================================================================

// Use canonical HEBREW_PREFIXES_ORDERED from morphology.js (DRY - single source of truth)
// Includes 3/4-letter prefix combos that the local copy was missing
const HEBREW_PREFIXES = HEBREW_PREFIXES_ORDERED;

/**
 * PRO SCHOLAR V13: Generate all morphological variants for dictionary lookup
 * Handles: diacritics, finals, plurals, prefixes
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Array<{form: string, type: string}>} Variants with type info
 */
const generateLookupVariants = (word) => {
  const variants = [];
  const stripped = stripAllDiacritics(word);
  const normalized = normalizeFinals(stripped);

  // Helper to add variant if not duplicate
  const addVariant = (form, type) => {
    if (form && !variants.some(v => v.form === form)) {
      variants.push({ form, type });
    }
  };

  // 1. Original forms
  addVariant(word, 'exact');
  addVariant(stripped, 'stripped');
  addVariant(normalized, 'normalized');

  // 2. Plural → singular transformations (with final letter restoration)
  if (stripped.endsWith('ות') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(stem + 'ה', 'fem-singular'); // יציאות → יציאה
    addVariant(restoreFinals(stem), 'stem'); // יציאות → יציא (with proper final)
  }
  if (stripped.endsWith('ים') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(restoreFinals(stem), 'masc-singular'); // כהנים → כהן (not כהנ)
    addVariant(stem, 'masc-singular-raw'); // Also try without final restoration
  }
  if (stripped.endsWith('ין') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(restoreFinals(stem), 'aramaic-singular'); // מלכין → מלך
    addVariant(stem + 'א', 'aramaic-emphatic'); // מלכא
  }

  // 3. Prefix stripping (בפנים → פנים, הגדול → גדול)
  for (const prefix of HEBREW_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      addVariant(withoutPrefix, `prefix-${prefix}`);
      // Also try plural→singular on the prefix-stripped form
      if (withoutPrefix.endsWith('ים') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(restoreFinals(stem), `prefix-${prefix}-singular`); // הכהנים → כהן
        addVariant(stem, `prefix-${prefix}-singular-raw`);
      }
      if (withoutPrefix.endsWith('ות') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(stem + 'ה', `prefix-${prefix}-fem-singular`);
      }
    }
  }

  return variants;
};

/**
 * Get lazy-loaded dictionary data (includes Jastrow Aramaic for Talmudic lookup)
 * All lexicons are now lazy-loaded from JSON files
 * @returns {Object} Dictionary data sources
 */
const getDictionaries = () => ({
  bdb: getBDBData(),
  jastrow: getJastrowData(),
  strongs: getStrongsData(),
  calAramaic: getCALAramaicData(),
  jastrowAramaic: getJastrowAramaicData(),
  // PRO SCHOLAR V16: Academic sources (FREE public domain sources)
  gesenius: getGeseniusLexiconData(),
  klein: getKleinLexiconData()
});

// =============================================================================
// SCHOLARLY CITATION GENERATION
// =============================================================================

/**
 * Generate a scholarly citation for a dictionary source
 * Follows academic citation standards for lexicographical references
 *
 * @param {string} sourceName - Name of the source (BDB, Jastrow, etc.)
 * @param {string} headword - The dictionary headword
 * @param {Object} options - Citation options
 * @returns {Object} Citation object with full and short forms
 */
export const generateCitation = (sourceName, headword, options = {}) => {
  const info = getSourceInfo(sourceName);
  if (!info) {
    return { full: sourceName, short: sourceName, bibtex: null };
  }

  const { includeHeadword = true, format = 'chicago' } = options;
  const hw = includeHeadword && headword ? `, s.v. "${headword}"` : '';

  // Full citation formats
  const citations = {
    chicago: `${info.author}, *${info.title}* (${info.location}: ${info.publisher}, ${info.year})${hw}.`,
    apa: `${info.author} (${info.year}). *${info.title}*. ${info.publisher}${hw}.`,
    mla: `${info.author}. *${info.title}*. ${info.publisher}, ${info.year}${hw}.`
  };

  // Short inline citation
  const short = `${info.shortName || info.author.split(',')[0]} (${info.year})${hw}`;

  // BibTeX entry
  const bibtex = `@book{${sourceName.toLowerCase().replace(/[^a-z]/g, '')},
  author = {${info.author}},
  title = {${info.title}},
  publisher = {${info.publisher}},
  year = {${info.year}},
  address = {${info.location}}
}`;

  return {
    full: citations[format] || citations.chicago,
    short,
    bibtex,
    metadata: info
  };
};

/**
 * Generate citations for all sources in a lookup result
 * @param {Array} sources - Array of source objects
 * @returns {Array} Array of citation objects
 */
export const generateAllCitations = (sources) => {
  if (!sources || sources.length === 0) return [];

  return sources.map(src => ({
    source: src.name,
    headword: src.headword,
    citation: generateCitation(src.name, src.headword)
  }));
};

// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

/**
 * Calculate detailed confidence score for a lookup result
 * Factors: source count, source tiers, consensus, headword match quality
 *
 * @param {Object} result - Lookup result object
 * @returns {Object} Detailed confidence breakdown
 */
export const calculateConfidence = (result) => {
  if (!result || !result.sources || result.sources.length === 0) {
    return {
      score: 0,
      level: 'none',
      breakdown: { sources: 0, tiers: 0, consensus: 0, match: 0 },
      description: 'No sources found'
    };
  }

  const breakdown = {
    sources: 0,    // Points for number of sources (max 25)
    tiers: 0,      // Points for source quality tiers (max 35)
    consensus: 0,  // Points for source agreement (max 25)
    match: 0       // Points for headword match quality (max 15)
  };

  // Source count scoring (diminishing returns)
  const srcCount = result.sources.length;
  breakdown.sources = Math.min(
    srcCount * CONFIDENCE_SCORING.SOURCE_MULTIPLIER,
    CONFIDENCE_SCORING.MAX_SOURCE_POINTS
  );

  // Tier-based scoring
  const ranked = rankSourcesByTier(result.sources);
  if (ranked.academic.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_1_POINTS;
  if (ranked.scholarly.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_2_POINTS;
  if (ranked.reference.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_3_POINTS;
  breakdown.tiers = Math.min(breakdown.tiers, CONFIDENCE_SCORING.MAX_TIER_POINTS);

  // Consensus scoring
  if (result.consensus) {
    const level = result.consensus.level?.level || result.consensus.level;
    if (level === 'strong') breakdown.consensus = CONFIDENCE_SCORING.STRONG_CONSENSUS;
    else if (level === 'moderate') breakdown.consensus = CONFIDENCE_SCORING.MODERATE_CONSENSUS;
    else if (level === 'weak') breakdown.consensus = CONFIDENCE_SCORING.WEAK_CONSENSUS;
  }

  // Match quality scoring
  if (result.matchType === 'exact') breakdown.match = CONFIDENCE_SCORING.EXACT_MATCH;
  else if (result.matchType === 'normalized') breakdown.match = CONFIDENCE_SCORING.NORMALIZED_MATCH;
  else if (result.matchType === 'root') breakdown.match = CONFIDENCE_SCORING.ROOT_MATCH;
  else if (result.matchType === 'morphological') breakdown.match = CONFIDENCE_SCORING.MORPHOLOGICAL_MATCH;
  else breakdown.match = CONFIDENCE_SCORING.DEFAULT_MATCH;

  const score = breakdown.sources + breakdown.tiers + breakdown.consensus + breakdown.match;

  // Determine confidence level
  const { THRESHOLDS } = CONFIDENCE_SCORING;
  let level, description;
  if (score >= THRESHOLDS.VERY_HIGH) {
    level = 'very_high';
    description = 'Multiple academic sources agree';
  } else if (score >= THRESHOLDS.HIGH) {
    level = 'high';
    description = 'Strong scholarly support';
  } else if (score >= THRESHOLDS.MODERATE) {
    level = 'moderate';
    description = 'Reasonable confidence from available sources';
  } else if (score >= THRESHOLDS.LOW) {
    level = 'low';
    description = 'Limited source support';
  } else {
    level = 'very_low';
    description = 'Minimal scholarly backing';
  }

  return { score, level, breakdown, description };
};

/**
 * Lookup in BDB dictionary
 * PRO SCHOLAR V13: Enhanced with morphological variants
 */
const lookupBDB = (word, dicts) => {
  const bdb = dicts.bdb?.byWord || dicts.bdb;
  if (!bdb) return null;

  // PRO SCHOLAR V13: Use unified variant generator (handles prefixes, plurals, etc.)
  const variants = generateLookupVariants(word);

  for (const { form, type } of variants) {
    const entry = bdb[form];
    if (entry) {
      return {
        name: 'BDB',
        definition: entry.definition || entry.gloss || entry.english,
        fullDefinition: entry.fullDefinition,
        headword: entry.headword || form,
        source: 'BDB (1906)',
        strongNumber: entry.strongNumber,
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

/**
 * Lookup in Jastrow dictionary
 * PRO SCHOLAR V13: Enhanced with full morphological variants (plural→singular, prefixes, etc.)
 */
const lookupJastrowLocal = (word, dicts) => {
  const jastrow = dicts.jastrow;
  if (!jastrow) return null;

  // PRO SCHOLAR V13: Use unified variant generator (handles prefixes, plurals, etc.)
  const variants = generateLookupVariants(word);

  for (const { form, type } of variants) {
    const entry = jastrow[form];
    if (entry) {
      return {
        name: 'Jastrow',
        definition: entry.definition || entry.english,
        fullDefinition: entry.fullDefinition,
        headword: entry.headword || form,
        source: 'Jastrow (1903)',
        isAramaic: entry.isAramaic || entry.language === 'Aramaic',
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

/**
 * Lookup in Strong's dictionary
 * PRO SCHOLAR V13: Enhanced with prefix stripping
 */
const lookupStrongs = (word, dicts) => {
  const strongs = dicts.strongs?.byWord || dicts.strongs;
  if (!strongs) return null;

  const variants = generateLookupVariants(word);

  for (const { form, type } of variants) {
    const entry = strongs[form];
    if (entry) {
      return {
        name: "Strong's",
        definition: entry.definition || entry.kjv_def || entry.strongs_def,
        headword: entry.headword || form,
        source: "Strong's Concordance",
        strongNumber: entry.strongNumber || entry.H,
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

/**
 * Lookup in CAL Aramaic dictionary (local subset)
 * PRO SCHOLAR V13: Enhanced with prefix stripping
 */
const lookupCALLocal = (word, dicts) => {
  const cal = dicts.calAramaic;
  if (!cal) return null;

  const variants = generateLookupVariants(word);
  for (const { form, type } of variants) {
    const entry = cal[form];
    if (entry) {
      return {
        name: 'CAL',
        definition: entry.definition || entry.english,
        headword: entry.headword || form,
        source: 'CAL (Comprehensive Aramaic Lexicon)',
        isAramaic: true,
        language: 'Aramaic',
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

/**
 * Lookup in Jastrow Aramaic subset (Talmudic/Rabbinic Aramaic vocabulary)
 * PRO SCHOLAR V13: Enhanced with prefix stripping
 */
const lookupJastrowAramaic = (word, dicts) => {
  const jastrowAram = dicts.jastrowAramaic;
  if (!jastrowAram) return null;

  const variants = generateLookupVariants(word);

  for (const { form, type } of variants) {
    const entry = jastrowAram[form];
    if (entry) {
      return {
        name: 'Jastrow (Aramaic)',
        definition: entry.definition || entry.english,
        fullDefinition: entry.fullDefinition,
        headword: entry.headword || form,
        source: 'Jastrow (1903) - Aramaic',
        isAramaic: true,
        language: 'Aramaic',
        dialect: entry.dialect || 'Babylonian',
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

// =============================================================================
// PRO SCHOLAR V15: ACADEMIC LEXICON LOOKUPS (Streamlined - FREE sources only)
// =============================================================================

/**
 * Lookup in Gesenius - Classical Hebrew grammar reference (Tier 1)
 * Wilhelm Gesenius - Foundational Hebrew grammar
 * PRO SCHOLAR V13: Enhanced with prefix stripping
 */
const lookupGesenius = (word, dicts) => {
  const gesenius = dicts.gesenius;
  if (!gesenius) return null;

  const variants = generateLookupVariants(word);
  for (const { form, type } of variants) {
    const entry = gesenius[form];
    if (entry && form !== '_meta') {
      return {
        name: 'Gesenius',
        definition: entry.definition || entry.english,
        fullDefinition: entry.fullDefinition,
        headword: entry.lemma || entry.headword || form,
        source: 'Gesenius (1910)',
        grammar: entry.grammar_note || entry.grammar,
        forms: entry.forms,
        pattern: entry.pattern,
        usage: entry.usage,
        language: 'Hebrew',
        pos: entry.pos,
        tier: { level: 1, name: 'Academic' },
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

/**
 * Lookup in Klein - Etymology-focused Hebrew lexicon (Tier 2)
 * Ernest Klein - Comprehensive Etymological Dictionary of the Hebrew Language
 * PRO SCHOLAR V16: Etymology-rich entries with cognates
 */
const lookupKlein = (word, dicts) => {
  const klein = dicts.klein;
  if (!klein) return null;

  const variants = generateLookupVariants(word);
  for (const { form, type } of variants) {
    const entry = klein[form];
    if (entry && form !== '_meta') {
      return {
        name: 'Klein',
        definition: entry.definition || entry.gloss,
        fullDefinition: entry.fullDefinition,
        headword: entry.lemma || entry.headword || form,
        source: 'Klein (1987)',
        etymology: entry.etymology,
        cognates: entry.cognates,
        protoSemitic: entry.protoSemitic,
        semanticField: entry.semanticField,
        language: 'Hebrew',
        pos: entry.pos,
        tier: { level: 2, name: 'Scholarly' },
        _matchedForm: type !== 'exact' ? form : undefined,
        _matchType: type
      };
    }
  }
  return null;
};

// =============================================================================
// ROOT FAMILY EXPANSION
// =============================================================================

/**
 * Get related words from the same root family
 * Provides scholarly context by showing cognate forms
 *
 * @param {string} word - The word to analyze
 * @param {Object} options - Options for root family lookup
 * @returns {Promise<Object>} Root family information
 */
export const getRootFamilyExpansion = async (word, options = {}) => {
  const { maxRelated = 10, includeDefinitions = true } = options;

  try {
    // Extract roots from the word
    // PRO SCHOLAR V12: Use async version to ensure dictionaries are loaded
    const rootResult = await extractRootsWithAsyncValidation(word);
    const bestRoot = rootResult?.bestMatch || rootResult?.hypotheses?.[0] || rootResult?.allMatches?.[0];
    if (!bestRoot?.root) {
      return { root: null, related: [], hasFamily: false };
    }

    // Get the best root
    const primaryRoot = bestRoot.root;
    if (!primaryRoot || primaryRoot.length < 3) {
      return { root: null, related: [], hasFamily: false };
    }

    // Get root family (if available)
    let family = null;
    try {
      family = getRootFamily?.(primaryRoot);
    } catch (err) {
      // getRootFamily may not be available
    }

    // Build related words list
    const related = [];
    if (family?.derivatives) {
      for (const derivative of family.derivatives.slice(0, maxRelated)) {
        const item = {
          word: derivative.word || derivative,
          relationship: derivative.type || 'derivative'
        };

        // Optionally look up definitions for related words
        if (includeDefinitions && typeof derivative === 'object' && derivative.word) {
          const def = quickLookup(derivative.word, { contextMode: options.contextMode });
          if (def?.english) {
            item.definition = def.english;
          }
        }

        related.push(item);
      }
    }

    return {
      root: primaryRoot,
      rootMeaning: bestRoot?.meaning || family?.meaning,
      confidence: bestRoot?.confidence,
      related,
      hasFamily: related.length > 0,
      binyan: bestRoot?.binyan,
      semanticField: family?.semanticField
    };
  } catch (err) {
    if (DEBUG) {
      log.debug(`[RootFamily] Error expanding family for "${word}": ${err.message}`);
    }
    return { root: null, related: [], hasFamily: false };
  }
};

/**
 * Get morphological analysis for a word (prefixes, suffixes, root breakdown)
 * @param {string} word - Word to analyze
 * @returns {Object} Morphological breakdown
 */
export const getMorphology = (word) => {
  try {
    const analysis = analyzeWordMorphology?.(word);
    if (!analysis) return null;

    return {
      word,
      root: analysis.root,
      prefixes: analysis.prefixes || [],
      suffixes: analysis.suffixes || [],
      stem: analysis.stem,
      pattern: analysis.pattern,
      binyan: analysis.binyan,
      person: analysis.person,
      number: analysis.number,
      gender: analysis.gender,
      tense: analysis.tense,
      state: analysis.state,
      description: formatMorphologyDescription(analysis)
    };
  } catch (err) {
    return null;
  }
};

/**
 * Format morphological analysis as human-readable description
 */
const formatMorphologyDescription = (analysis) => {
  if (!analysis) return null;

  const parts = [];

  if (analysis.prefixes?.length > 0) {
    parts.push(`Prefixes: ${analysis.prefixes.join(' + ')}`);
  }

  if (analysis.root) {
    parts.push(`Root: ${analysis.root}`);
  }

  if (analysis.binyan) {
    parts.push(`Binyan: ${analysis.binyan}`);
  }

  if (analysis.tense) {
    parts.push(`Tense: ${analysis.tense}`);
  }

  if (analysis.person && analysis.number) {
    parts.push(`${analysis.person} ${analysis.number}${analysis.gender ? ` ${analysis.gender}` : ''}`);
  }

  if (analysis.suffixes?.length > 0) {
    parts.push(`Suffixes: ${analysis.suffixes.join(' + ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
};

// =============================================================================
// PARALLEL DICTIONARY AGGREGATION
// =============================================================================

/**
 * Look up word in all local dictionaries in parallel
 * Includes Jastrow Aramaic for Talmudic contexts
 * @param {string} word - Cleaned Hebrew/Aramaic word
 * @param {string} contextMode - 'biblical', 'talmudic', 'midrashic', etc.
 * @returns {Object} Aggregated result with all sources sorted by scholarly tier
 */
export const lookupAllLocalDictionaries = (word, contextMode = null) => {
  const dicts = getDictionaries();
  const isAramaic = isLikelyAramaic(word);
  const isTalmudic = contextMode === 'talmudic' || contextMode === 'rabbinic';

  // PRO SCHOLAR V13: Log dictionary availability for debugging
  if (DEBUG) {
    const available = Object.entries(dicts)
      .filter(([_, v]) => v !== null)
      .map(([k]) => k);
    if (available.length < 3) {
      log.debug(`[LookupAllLocal] Warning: Only ${available.length} dictionaries loaded: ${available.join(', ')}`);
    }
  }

  // Define lookup functions for parallel aggregation
  // Order determines priority when sources have equal tier
  // PRO SCHOLAR V16: All FREE academic sources
  const lookupFunctions = {
    // Tier 1 Academic (Hebrew)
    'BDB': () => lookupBDB(word, dicts),
    'Gesenius': () => lookupGesenius(word, dicts),
    // Tier 1 Academic (Aramaic) - always check for potential Aramaic
    'Jastrow': () => lookupJastrowLocal(word, dicts),
    // Tier 2 Scholarly (Etymology-focused)
    'Klein': () => lookupKlein(word, dicts),
    "Strong's": () => lookupStrongs(word, dicts)
  };

  // Add Aramaic sources if word is likely Aramaic or in Talmudic context
  if (isAramaic || isTalmudic) {
    // CAL - 12,243 Aramaic entries (FREE from Hebrew Union College!)
    lookupFunctions['Jastrow (Aramaic)'] = () => lookupJastrowAramaic(word, dicts);
    lookupFunctions['CAL'] = () => lookupCALLocal(word, dicts);
  }

  // Use synchronous aggregation for local dictionaries
  const aggregated = aggregateLocalSources(word, lookupFunctions, {
    validateHeadword: true
  });

  // Pick best definition from primary source
  if (aggregated.primary?.definition) {
    aggregated.primary.definition = pickBestDefinition(aggregated.primary.definition);
  }

  const confidence = calculateConfidence(aggregated);

  // Record dictionary lookups for telemetry
  // PRO SCHOLAR V16: Track sources for analytics
  const sources = aggregated.allSources || [];
  for (const src of sources) {
    const sourceName = (src.name || '').toLowerCase();
    if (sourceName.includes('bdb')) recordDictionaryLookup('bdb', true);
    else if (sourceName.includes('gesenius')) recordDictionaryLookup('gesenius', true);
    else if (sourceName.includes('klein')) recordDictionaryLookup('klein', true);
    else if (sourceName.includes('jastrow')) recordDictionaryLookup('jastrow', true);
    else if (sourceName.includes('strong')) recordDictionaryLookup('strongs', true);
    else if (sourceName.includes('cal')) recordDictionaryLookup('cal', true);
  }

  return {
    ...aggregated,
    isAramaic,
    language: isAramaic ? 'Aramaic' : 'Hebrew',
    confidence,
    citations: generateAllCitations(aggregated.allSources || [])
  };
};

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

/**
 * Create the lookup stages with injected dependencies
 */
const createLookupStages = () => {
  return createStages({
    lookupLocalDictionaries: lookupAllLocalDictionaries,
    tryHebrewVerbAnalysis
  });
};

// Lazy-initialized pipeline
let pipeline = null;

const getPipeline = () => {
  if (!pipeline) {
    pipeline = createPipeline(createLookupStages());
  }
  return pipeline;
};

// =============================================================================
// MAIN LOOKUP FUNCTION
// =============================================================================

/**
 * Unified word lookup - single entry point for all lookups
 *
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {Object} options - Lookup options
 * @param {string} options.reference - Book/chapter reference for context
 * @param {string} options.contextMode - 'biblical', 'talmudic', 'midrashic'
 * @param {boolean} options.includeOnline - Include online API sources
 * @param {boolean} options.skipCache - Bypass cache
 * @returns {Object} Complete lookup result with sources and consensus
 */
export const lookupWord = async (word, options = {}) => {
  const startTime = performance.now();
  const {
    reference = null,
    contextMode = null,
    includeOnline = false,
    skipCache = false
  } = options;

  // Clean and validate word
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return createEmptyResult(word);
  }

  // Derive context if not provided
  const effectiveContext = contextMode ||
    (reference ? getContextFromReference(reference) : null);

  // Check cache
  const cacheKey = `${cleaned}:${effectiveContext || 'default'}`;

  if (!skipCache) {
    const cached = lookupCache.get(cacheKey);
    if (cached) {
      // Record cache hit telemetry
      const durationMs = performance.now() - startTime;
      recordLookup({
        word: cleaned,
        success: true,
        fromCache: true,
        durationMs,
        source: cached.source || 'cache'
      });
      return { ...cached, fromCache: true };
    }
  }

  // Deduplicate concurrent requests
  if (pendingLookups.has(cacheKey)) {
    return pendingLookups.get(cacheKey);
  }

  // Create and execute lookup promise
  const lookupPromise = executeLookup(word, cleaned, effectiveContext, includeOnline);
  pendingLookups.set(cacheKey, lookupPromise);

  try {
    const result = await lookupPromise;

    // Cache successful results
    if (result.english || result.sources.length > 0) {
      lookupCache.set(cacheKey, result);
    }

    // Record cache miss telemetry
    const durationMs = performance.now() - startTime;
    recordLookup({
      word: cleaned,
      success: !!(result.english || result.sources?.length > 0),
      fromCache: false,
      durationMs,
      source: result.source || result.sources?.[0]?.name?.toLowerCase() || 'unified'
    });

    return result;
  } finally {
    pendingLookups.delete(cacheKey);
  }
};

/**
 * Execute lookup with full scholarly enrichment:
 * morphology, root extraction, confidence scoring, citations, source comparison
 */
const executeLookup = async (word, cleaned, contextMode, includeOnline) => {
  // PRO SCHOLAR V13: Ensure dictionaries are loaded before lookup
  // This prevents returning null/empty results when user clicks before preload completes
  await waitForPreload();

  // Run local pipeline first (synchronous - now safe since dictionaries are loaded)
  const runPipeline = getPipeline();
  const localResult = runPipeline(word, { contextMode });

  const morphology = getMorphology(cleaned);

  // Extract root with validation + Proto-Semitic in parallel
  let rootData = null;
  let protoSemiticData = null;

  try {
    // Run root extraction first
    // PRO SCHOLAR V12: Use async version to ensure dictionaries are loaded before validation
    // This fixes the race condition where roots were empty on initial load
    const rootResult = await extractRootsWithAsyncValidation(cleaned);

    // PRO SCHOLAR V12: Use bestMatch first, then first hypothesis
    const bestRoot = rootResult?.bestMatch || rootResult?.hypotheses?.[0] || rootResult?.allMatches?.[0];
    if (bestRoot?.root) {
      rootData = {
        root: bestRoot.root,
        confidence: bestRoot.confidence,
        source: bestRoot.source,
        binyan: bestRoot.binyan,
        weakVerb: bestRoot.weakVerb
      };
    }

    // PRO SCHOLAR V12: Fallback root extraction for action nouns (יציאות → יצא)
    // If async extraction didn't find a root, try direct pattern matching
    if (!rootData?.root && cleaned.length >= 4) {
      // Pattern 1: Action nouns ending in -ות (plural) like יציאות → יצא
      if (cleaned.endsWith('ות') && cleaned.length >= 5) {
        const stem = cleaned.slice(0, -2); // Remove -ות
        // Check for yod-infix pattern: R1-R2-י-R3 → R1-R2-R3
        if (stem.length === 4 && stem[2] === 'י') {
          const extractedRoot = stem[0] + stem[1] + stem[3];
          rootData = {
            root: extractedRoot,
            confidence: 75,
            source: 'Pattern Analysis',
            note: 'Action noun pattern (קְטִילָה)'
          };
        }
      }
      // Pattern 2: Feminine singular -ה like יציאה → יצא
      else if (cleaned.endsWith('ה') && cleaned.length >= 4) {
        const stem = cleaned.slice(0, -1); // Remove -ה
        if (stem.length === 4 && stem[2] === 'י') {
          const extractedRoot = stem[0] + stem[1] + stem[3];
          rootData = {
            root: extractedRoot,
            confidence: 75,
            source: 'Pattern Analysis',
            note: 'Action noun pattern (קְטִילָה)'
          };
        }
      }
    }

    // PRO SCHOLAR V12: Multi-tier Proto-Semitic lookup chain
    // Priority 1: Curated comparative Semitic database (hand-verified scholarly data)
    const rootForCognates = rootData?.root || cleaned;
    let curatedCognates = getCuratedCognates(rootForCognates);

    if (curatedCognates?.protoSemitic) {
      protoSemiticData = {
        form: curatedCognates.protoSemitic,
        cognates: curatedCognates, // Full cognate data
        meaning: curatedCognates.meaning,
        source: 'Comparative Semitic (curated)',
        tier: 1,
        tierName: 'Gold (Academic)'
      };
    } else {
      // Priority 2: Async lookup (CAL + extracted BDB/Jastrow)
      const asyncCognates = await getCognatesAsync(rootForCognates).catch(() => null);
      if (asyncCognates?.protoSemitic) {
        protoSemiticData = {
          form: asyncCognates.protoSemitic,
          cognates: asyncCognates,
          meaning: asyncCognates.meaning,
          source: asyncCognates.tierName || asyncCognates.source || 'CAL/BDB',
          tier: asyncCognates.tier || 2,
          tierName: asyncCognates.tierName || 'Silver (Dictionary)'
        };
      } else {
        // Priority 3: Wiktionary fallback (community source)
        const protoSemitic = await getProtoSemitic(cleaned).catch(() => null);
        if (protoSemitic) {
          protoSemiticData = {
            form: protoSemitic.protoSemitic,
            cognates: protoSemitic.cognates,
            etymologyText: protoSemitic.etymologyText,
            source: 'Wiktionary (community)',
            tier: 5,
            tierName: 'Reference (Community)'
          };
        }
      }
    }
  } catch (err) {
    if (DEBUG) log.debug(`[Root/ProtoSemitic] Extraction failed: ${err.message}`);
  }

  const confidence = calculateConfidence(localResult);
  const citations = generateAllCitations(localResult.sources || []);

  // Generate source comparison if multiple sources
  let sourceComparison = null;
  if (localResult.sources?.length > 1) {
    try {
      sourceComparison = generateSourceComparison(localResult.sources);
    } catch (err) {
      if (DEBUG) log.debug(`[Comparison] Failed: ${err.message}`);
    }
  }

  // Build enriched result
  // PRO SCHOLAR V12: Add extractedRoot at top level for WordDefinitionCard
  // This is the properly extracted 3-letter root (e.g., יציאות → יצא)
  const extractedRoot = rootData?.root && rootData.root !== cleaned ? rootData.root : null;

  // PRO SCHOLAR V12: Determine the best root to display
  // Priority: extractedRoot (if it's a proper 3-letter root) > localResult.root
  // This ensures יציאות shows root יצא instead of the full word
  const isProperExtractedRoot = extractedRoot && extractedRoot.length >= 2 && extractedRoot.length <= 4;
  const localRootIsFullWord = localResult.root === cleaned || localResult.root === word;
  const bestRoot = (isProperExtractedRoot && (localRootIsFullWord || !localResult.root))
    ? extractedRoot
    : (localResult.root || extractedRoot);

  let enrichedResult = {
    ...localResult,
    morphology,
    rootData,
    // PRO SCHOLAR V12: extractedRoot at top level so WordDefinitionCard can display it
    extractedRoot,
    // PRO SCHOLAR V12: Use bestRoot logic - prefer extracted 3-letter root over full word
    root: bestRoot,
    protoSemitic: protoSemiticData, // PRO SCHOLAR: Proto-Semitic reconstruction
    confidence,
    citations,
    sourceComparison,
    scholarly: {
      ...localResult.scholarly,
      hasAcademicSource: localResult.sources?.some(s =>
        getSourceTier(s.name) === SCHOLARLY_TIERS.ACADEMIC
      ),
      hasMorphology: !!morphology,
      hasRoot: !!rootData,
      hasComparison: !!sourceComparison,
      hasProtoSemitic: !!protoSemiticData?.form // PRO SCHOLAR
    }
  };

  // If we have a strong result and don't need online sources, return
  if (!includeOnline || enrichedResult.scholarly?.hasAcademicSource) {
    return enrichedResult;
  }

  // Optionally enhance with online sources
  try {
    const onlineResult = await fetchOnlineSources(cleaned, contextMode);

    if (onlineResult?.sources?.length > 0) {
      // Merge online sources with local
      const mergedSources = [...(localResult.sources || [])];

      for (const src of onlineResult.sources) {
        if (!mergedSources.some(s => s.name === src.name)) {
          mergedSources.push(src);
        }
      }

      // Recalculate consensus with all sources
      const consensus = calculateConsensus(mergedSources);

      // Regenerate citations and comparison with all sources
      const allCitations = generateAllCitations(mergedSources);
      const allComparison = mergedSources.length > 1 ? generateSourceComparison(mergedSources) : null;

      // Recalculate confidence
      const newConfidence = calculateConfidence({
        ...enrichedResult,
        sources: mergedSources
      });

      return {
        ...enrichedResult,
        sources: mergedSources,
        consensus,
        citations: allCitations,
        sourceComparison: allComparison,
        confidence: newConfidence,
        scholarly: {
          ...enrichedResult.scholarly,
          hasOnlineSource: true,
          hasComparison: !!allComparison
        }
      };
    }
  } catch (err) {
    if (DEBUG) {
      log.debug(`[Online] Error fetching online sources: ${err.message}`);
    }
  }

  return enrichedResult;
};

/**
 * Fetch from online sources (Sefaria API, CAL API)
 * Uses raceWithEarlyReturn for fast response when tier-1 source found
 * Added error handling with graceful fallback
 */
const fetchOnlineSources = async (word, contextMode) => {
  try {
    // Build lookup functions map for parallel fetching
    const lookupFunctions = {
      'Sefaria': () => lookupWordSefaria(word)
    };

    // PRO SCHOLAR: Always include CAL API for comprehensive Aramaic coverage
    // Many Hebrew words have Aramaic cognates or Talmudic usage
    // CAL provides academic-grade Aramaic data (Sokoloff's DJBA/DJPA)
    lookupFunctions['CAL API'] = async () => {
      const result = await lookupCalAramaic(word);
      if (result) {
        return { ...result, isAramaic: true, source: 'CAL (Hebrew Union College)' };
      }
      return null;
    };

    // PRO SCHOLAR: Wiktionary as optional reference source (community-edited)
    // Reliability tier: Reference (tier 5) - useful for modern Hebrew and fallback
    // Not peer-reviewed but provides broad coverage + Proto-Semitic etymology
    lookupFunctions['Wiktionary'] = async () => {
      // Fetch definition and etymology in parallel
      const [definition, etymology] = await Promise.all([
        lookupWiktionary(word),
        fetchWiktionaryEtymology(word).catch(() => null)
      ]);

      if (definition || etymology) {
        return {
          ...(definition || {}),
          source: 'Wiktionary',
          reliability: 'reference',
          isCommunitySource: true,
          // PRO SCHOLAR: Include etymology data if available
          etymology: etymology ? {
            protoSemitic: etymology.protoSemitic,
            cognates: etymology.cognates,
            etymologyText: etymology.etymologyText,
            root: etymology.root
          } : null
        };
      }
      return null;
    };

    // Use raceWithEarlyReturn for parallel fetching with early return
    // Returns as soon as a tier-1 (academic) source is found
    // Increased timeout for slower connections and comprehensive results
    const result = await raceWithEarlyReturn(word, lookupFunctions, {
      timeout: 4000,
      earlyReturnOnTier1: true,
      minSourcesForEarlyReturn: 1
    });

    return {
      sources: result?.allSources || [],
      isPartial: result?.isPartial || false,
      timedOut: result?.timedOut || false
    };
  } catch (err) {
    // Graceful fallback on error - return empty sources instead of throwing
    if (DEBUG) {
      log.debug(`[fetchOnlineSources] Error: ${err.message}`);
    }
    return {
      sources: [],
      isPartial: true,
      timedOut: false,
      error: err.message
    };
  }
};

// =============================================================================
// QUICK LOOKUP (SYNCHRONOUS)
// =============================================================================

/**
 * Quick synchronous lookup - for immediate results without waiting
 * Uses only local dictionaries, no online sources
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Lookup options
 * @returns {Object} Lookup result (may be incomplete)
 */
export const quickLookup = (word, options = {}) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return createEmptyResult(word);
  }

  const cacheKey = `${cleaned}:${options.contextMode || 'default'}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Track whether dictionaries are loaded — results may be incomplete if not
  const dictReady = isCoreDictionariesLoaded();

  // Run pipeline synchronously
  const runPipeline = getPipeline();
  const result = runPipeline(word, options);

  // Guard against null/undefined pipeline result
  if (!result) {
    if (DEBUG) {
      log.debug(`[quickLookup] Pipeline returned null for: ${word}`);
    }
    const empty = createEmptyResult(word, cleaned);
    empty.dictionariesLoaded = dictReady;
    return empty;
  }

  // Tag result with dictionary loading state
  result.dictionariesLoaded = dictReady;

  // Cache and return if we found something
  // Only cache if dictionaries were loaded (avoid caching incomplete results)
  if (result.english || (result.sources && result.sources.length > 0)) {
    if (dictReady) {
      lookupCache.set(cacheKey, result);
    }
    return result;
  }

  // PRO SCHOLAR V12: Academic critical words (HALOT, DJBA, Jastrow) - Tier 1
  // Try scholarly source first for common terms (sync - uses preloaded data)
  const academicEntry = lookupAcademicCriticalWord(cleaned);
  if (academicEntry) {
    if (DEBUG) {
      log.debug(`[AcademicCritical] ${cleaned} → ${academicEntry.definition} (${academicEntry.source})`);
    }
    const academicResult = {
      word,
      cleanedWord: cleaned,
      english: academicEntry.definition,
      fullDefinition: academicEntry.fullDefinition,
      source: academicEntry.source,
      etymology: academicEntry.etymology,
      cognates: academicEntry.cognates,
      citation: academicEntry.citation,
      frequency: academicEntry.frequency,
      category: academicEntry.category || academicEntry._category,
      pos: academicEntry.pos,
      lemma: academicEntry.lemma,
      isAramaic: academicEntry.isAramaic,
      sources: [{
        name: academicEntry.source,
        definition: academicEntry.fullDefinition || academicEntry.definition,
        tier: { level: 1, name: 'Academic (HALOT/DJBA)' },
        citation: academicEntry.citation
      }],
      language: academicEntry.isAramaic ? 'Aramaic' : 'Hebrew',
      offline: true,
      isAcademic: true,
      tier: { level: 1, name: 'Academic Critical' }
    };
    lookupCache.set(cacheKey, academicResult);
    return academicResult;
  }

  // CRITICAL_WORDS fallback for common words (simple string translations)
  // Final fallback for common words when all dictionary lookups fail
  const criticalTranslation = lookupCriticalWord(cleaned) || lookupCriticalWord(word);
  if (criticalTranslation) {
    if (DEBUG) {
      log.debug(`[CriticalWords] ${cleaned} → ${criticalTranslation}`);
    }
    const fallbackResult = {
      word,
      cleanedWord: cleaned,
      english: criticalTranslation,
      source: isBiblicalName(cleaned) ? 'Biblical Name' : 'Critical Words',
      sources: [{
        name: isBiblicalName(cleaned) ? 'Biblical Names' : 'Critical Words',
        definition: criticalTranslation,
        tier: { level: 4, name: 'Fallback' }
      }],
      language: 'Hebrew',
      offline: true,
      isFallback: true
    };
    lookupCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  return result;
};

// =============================================================================
// PROGRESSIVE LOOKUP - Quick return + background enhancement
// =============================================================================

/**
 * Progressive lookup - returns fast with local results, enhances in background
 *
 * This is the recommended function for UI components that want:
 * 1. Immediate results from local dictionaries
 * 2. Enhanced results with online sources when available
 * 3. Non-blocking user experience
 *
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {Object} options - Lookup options
 * @param {string} options.contextMode - 'biblical', 'talmudic', 'midrashic'
 * @param {boolean} options.includeOnline - Fetch online sources in background (default: true)
 * @param {Function} options.onEnhanced - Callback when enhanced results available (result) => void
 * @returns {Object} Immediate result from local dictionaries
 *
 * @example
 * const result = progressiveLookup('תורה', {
 *   onEnhanced: (enhancedResult) => {
 *     // Update UI with better results
 *     setTranslation(enhancedResult);
 *   }
 * });
 *
 * // result is immediately available (local only)
 * showTranslation(result);
 */
export const progressiveLookup = (word, options = {}) => {
  const {
    contextMode = null,
    includeOnline = true,
    onEnhanced = null
  } = options;

  // Step 1: Return immediate local result
  const localResult = quickLookup(word, { contextMode });

  // If no callback or no online needed, just return local
  if (!onEnhanced || !includeOnline) {
    return localResult;
  }

  // Check if we already have strong results
  const qualityScore = getResultQualityScore(localResult);
  if (qualityScore >= 80) {
    // Already have high quality - no need for background fetch
    return { ...localResult, qualityScore, isComplete: true };
  }

  // Step 2: Start background enhancement
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return localResult;
  }

  // Mark result as potentially enhanceable
  const progressiveResult = {
    ...localResult,
    qualityScore,
    isComplete: false,
    isPending: true
  };

  // Background enhancement (use setTimeout for browser compatibility)
  setTimeout(async () => {
    try {
      // Use lookupWord with online sources
      const enhancedResult = await lookupWord(word, {
        contextMode,
        includeOnline: true
      });

      // Calculate new quality
      const enhancedScore = getResultQualityScore(enhancedResult);

      // Only call callback if we got better results
      if (enhancedScore > qualityScore ||
          enhancedResult.sources.length > localResult.sources.length) {
        onEnhanced({
          ...enhancedResult,
          qualityScore: enhancedScore,
          isComplete: true,
          wasEnhanced: true,
          previousScore: qualityScore
        });
      } else {
        // No improvement, still call with completion status
        onEnhanced({
          ...localResult,
          qualityScore,
          isComplete: true,
          wasEnhanced: false
        });
      }
    } catch (err) {
      if (DEBUG) {
        log.debug(`[Progressive] Background enhancement failed: ${err.message}`);
      }
      // Still mark as complete on error
      onEnhanced({
        ...localResult,
        qualityScore,
        isComplete: true,
        wasEnhanced: false,
        error: err.message
      });
    }
  });

  return progressiveResult;
};

/**
 * Progressive batch lookup - returns fast for all words, enhances in background
 *
 * @param {string[]} words - Array of words to look up
 * @param {Object} options - Lookup options
 * @param {Function} options.onWordEnhanced - Callback when a word gets enhanced (word, result) => void
 * @param {Function} options.onAllComplete - Callback when all lookups complete (results) => void
 * @returns {Map<string, Object>} Immediate results from local dictionaries
 */
export const progressiveBatchLookup = (words, options = {}) => {
  const {
    contextMode = null,
    includeOnline = true,
    onWordEnhanced = null,
    onAllComplete = null
  } = options;

  // Deduplicate
  const uniqueWords = [...new Set(words.map(w => cleanHebrewWord(w)).filter(w => w && w.length >= 2))];
  const results = new Map();

  // Step 1: Quick local lookup for all words
  for (const word of uniqueWords) {
    results.set(word, quickLookup(word, { contextMode }));
  }

  // If no callbacks, return immediately
  if (!onWordEnhanced && !onAllComplete) {
    return results;
  }

  // Step 2: Background enhancement (use setTimeout for browser compatibility)
  if (includeOnline) {
    setTimeout(async () => {
      const enhancedResults = new Map();

      for (const word of uniqueWords) {
        try {
          const localResult = results.get(word);
          const localScore = getResultQualityScore(localResult);

          // Skip if already high quality
          if (localScore >= 80) {
            enhancedResults.set(word, { ...localResult, isComplete: true });
            continue;
          }

          // Fetch enhanced
          const enhanced = await lookupWord(word, {
            contextMode,
            includeOnline: true
          });

          const enhancedScore = getResultQualityScore(enhanced);

          if (enhancedScore > localScore) {
            enhancedResults.set(word, {
              ...enhanced,
              qualityScore: enhancedScore,
              wasEnhanced: true,
              isComplete: true
            });

            if (onWordEnhanced) {
              onWordEnhanced(word, enhancedResults.get(word));
            }
          } else {
            enhancedResults.set(word, { ...localResult, isComplete: true });
          }
        } catch (err) {
          enhancedResults.set(word, { ...results.get(word), isComplete: true, error: err.message });
        }
      }

      if (onAllComplete) {
        onAllComplete(enhancedResults);
      }
    });
  }

  return results;
};

// =============================================================================
// BATCH LOOKUP
// =============================================================================

/**
 * Look up multiple words efficiently
 * Deduplicates and runs in parallel
 *
 * @param {string[]} words - Array of words to look up
 * @param {Object} options - Lookup options
 * @returns {Map<string, Object>} Map of word -> result
 */
export const batchLookup = async (words, options = {}) => {
  const uniqueWords = [...new Set(words.map(w => cleanHebrewWord(w)).filter(Boolean))];
  const results = new Map();

  // Check cache first
  const uncached = [];
  for (const word of uniqueWords) {
    const cacheKey = `${word}:${options.contextMode || 'default'}`;
    const cached = lookupCache.get(cacheKey);
    if (cached) {
      results.set(word, { ...cached, fromCache: true });
    } else {
      uncached.push(word);
    }
  }

  // Lookup uncached words in parallel
  if (uncached.length > 0) {
    const lookupPromises = uncached.map(word =>
      lookupWord(word, options).then(result => ({ word, result }))
    );

    const lookupResults = await Promise.allSettled(lookupPromises);

    for (const outcome of lookupResults) {
      if (outcome.status === 'fulfilled') {
        results.set(outcome.value.word, outcome.value.result);
      }
    }
  }

  return results;
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create empty result for invalid words
 */
const createEmptyResult = (word, cleanedWord = null) => ({
  word,
  cleanedWord,
  english: null,
  french: null,
  source: 'none',
  sources: [],
  isLoading: false,
  scholarly: {
    hasMultipleSources: false,
    hasAcademicSource: false,
    consensusLevel: 'none'
  }
});

/**
 * Get morphological hint for words not found in dictionary
 * Provides helpful breakdown of prefixes, root, and suffixes
 *
 * @param {string} word - The word to analyze
 * @returns {Object|null} Morphological hint object
 */
export const getMorphologicalHint = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  const hint = {
    word: cleaned,
    prefixes: [],
    possibleRoot: null,
    suffixes: [],
    breakdown: null
  };

  // Common Hebrew prefixes
  const prefixMap = {
    'ו': 'and',
    'ה': 'the',
    'ב': 'in',
    'ל': 'to/for',
    'מ': 'from',
    'כ': 'like/as',
    'ש': 'that/which',
    'וה': 'and the',
    'וב': 'and in',
    'ול': 'and to',
    'מה': 'from the',
    'לה': 'to the',
    'בה': 'in the',
    'כש': 'when'
  };

  // Common Hebrew suffixes
  const suffixMap = {
    'ים': 'masc. pl.',
    'ות': 'fem. pl.',
    'ין': 'Aram. pl.',
    'י': 'my/of',
    'ך': 'your (m)',
    'ה': 'her/to',
    'ו': 'his/him',
    'נו': 'our/us',
    'כם': 'your (m.pl)',
    'הם': 'their (m)',
    'הן': 'their (f)'
  };

  let remaining = cleaned;

  // Try to detect prefixes (max 2 chars)
  for (const [prefix, meaning] of Object.entries(prefixMap).sort((a, b) => b[0].length - a[0].length)) {
    if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
      hint.prefixes.push({ chars: prefix, meaning });
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  // Try to detect suffixes
  for (const [suffix, meaning] of Object.entries(suffixMap).sort((a, b) => b[0].length - a[0].length)) {
    if (remaining.endsWith(suffix) && remaining.length > suffix.length + 2) {
      hint.suffixes.push({ chars: suffix, meaning });
      remaining = remaining.slice(0, -suffix.length);
      break;
    }
  }

  // The remaining part might be the root
  if (remaining.length >= 2 && remaining.length <= 4) {
    hint.possibleRoot = remaining;
  }

  // Build human-readable breakdown
  const parts = [];
  if (hint.prefixes.length > 0) {
    parts.push(hint.prefixes.map(p => `${p.chars}(${p.meaning})`).join('+'));
  }
  if (hint.possibleRoot) {
    parts.push(`√${hint.possibleRoot}`);
  } else {
    parts.push(remaining);
  }
  if (hint.suffixes.length > 0) {
    parts.push(hint.suffixes.map(s => `${s.chars}(${s.meaning})`).join('+'));
  }

  hint.breakdown = parts.join(' + ');

  return hint;
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => lookupCache.getStats?.() || { size: 0 };

/**
 * Clear the lookup cache
 */
export const clearCache = () => lookupCache.clear?.();

/**
 * Clear cache entries for a specific word
 * Used by hooks to force refresh without clearing entire cache
 * @param {string} word - Word to clear from cache
 */
export const clearWordCache = (word) => {
  if (!word || !lookupCache.delete) return;
  // Clear all possible cache key variants for this word
  const cleanedWord = cleanHebrewWord(word);
  const variants = [word, cleanedWord, `${word}:auto`, `${cleanedWord}:auto`];
  variants.forEach(key => lookupCache.delete(key));
};

/**
 * Glossary-compatible lookup wrapper
 * Provides WordGlossary-compatible response shape from unifiedLookupService
 * This enables migration from scholarlyLookup while maintaining compatibility
 *
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {string} contextType - Context type ('talmudic', 'biblical', etc.)
 * @returns {Object|null} WordGlossary-compatible result object
 */
export const glossaryLookup = (word, contextType = 'talmudic') => {
  const result = quickLookup(word, { contextMode: contextType });

  if (!result || (!result.english && (!result.sources || result.sources.length === 0))) {
    return null;
  }

  // Map to WordGlossary expected shape
  const primarySource = result.sources?.[0];
  return {
    word: result.cleanedWord || result.word,
    definition: result.english || primarySource?.definition,
    source: result.source || primarySource?.name?.toLowerCase() || 'unified',
    sourceName: primarySource?.name || result.source,
    root: result.rootData?.root || result.root,
    isLocal: result.offline || primarySource?._isLocal,
    isLexicon: primarySource?.tier?.level <= 2,
    matchType: result.matchType || (result.rootData?.root ? 'ROOT_DERIVED' : 'EXACT'),
    // Additional scholarly data
    confidence: result.confidence,
    sources: result.sources,
    morphology: result.morphology
  };
};

// =============================================================================
// SEMANTIC FIELD ENRICHMENT
// =============================================================================

/**
 * Get semantic field data for a word
 * Returns domain, synonyms, antonyms, and related words
 *
 * @param {string} word - Hebrew word to analyze
 * @param {Object} options - Options
 * @param {boolean} options.includeSynonyms - Include synonyms (default: true)
 * @param {boolean} options.includeAntonyms - Include antonyms (default: true)
 * @param {boolean} options.includeRelated - Include related words (default: false)
 * @param {number} options.relatedLimit - Max related words (default: 5)
 * @returns {Object|null} Semantic data or null if word not in vocabulary
 */
export const getSemanticField = (word, options = {}) => {
  const {
    includeSynonyms = true,
    includeAntonyms = true,
    includeRelated = false,
    relatedLimit = 5
  } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;

  const semantics = getWordSemantics(cleaned);
  if (!semantics) return null;

  const primaryDomain = semantics.primaryDomain
    ? getDomain(semantics.primaryDomain)
    : null;

  const result = {
    word: cleaned,
    root: semantics.root,
    gloss: semantics.gloss,
    domain: primaryDomain ? {
      key: semantics.primaryDomain,
      name: primaryDomain.name,
      hebrewName: primaryDomain.hebrewName,
      color: primaryDomain.color
    } : null,
    secondaryDomains: (semantics.secondaryDomains || []).map(key => {
      const domain = getDomain(key);
      return domain ? { key, name: domain.name, color: domain.color } : null;
    }).filter(Boolean),
    frequency: semantics.frequency || null,
    theologicalNote: semantics.theologicalNote || null
  };

  if (includeSynonyms) {
    result.synonyms = getSynonyms(cleaned).map(s => ({
      word: s.word,
      gloss: s.gloss,
      root: s.root
    }));
  }

  if (includeAntonyms) {
    result.antonyms = getAntonyms(cleaned).map(a => ({
      word: a.word,
      gloss: a.gloss,
      root: a.root
    }));
  }

  if (includeRelated) {
    result.relatedWords = getRelatedWords(cleaned, relatedLimit).map(r => ({
      word: r.word,
      gloss: r.gloss,
      root: r.root
    }));
  }

  return result;
};

/**
 * Enrich a lookup result with semantic field data
 *
 * @param {Object} result - Lookup result to enrich
 * @param {Object} options - Semantic options
 * @returns {Object} Result with semantics added
 */
export const enrichWithSemantics = (result, options = {}) => {
  if (!result || !result.cleanedWord) return result;

  const semantics = getSemanticField(result.cleanedWord, options);

  if (semantics) {
    result.semantics = semantics;
    if (semantics.domain) {
      result.domainColor = semantics.domain.color;
      result.domainName = semantics.domain.name;
    }
  }

  return result;
};

/**
 * Lookup word with semantic enrichment
 *
 * @param {string} word - Word to lookup
 * @param {Object} options - Lookup + semantic options
 * @returns {Object} Lookup result with semantic field data
 */
export const lookupWithSemantics = (word, options = {}) => {
  const {
    includeSynonyms = true,
    includeAntonyms = true,
    includeRelated = false,
    relatedLimit = 5,
    ...lookupOptions
  } = options;

  const result = quickLookup(word, lookupOptions);

  return enrichWithSemantics(result, {
    includeSynonyms,
    includeAntonyms,
    includeRelated,
    relatedLimit
  });
};

// =============================================================================
// FRENCH TRANSLATION
// =============================================================================

/**
 * Get French translation for English text (via Lingva API)
 * @param {string} englishText - English text to translate
 * @returns {Promise<string|null>} French translation or null
 */
export const getFrenchTranslation = async (englishText) => {
  if (!englishText) return null;
  try {
    return await translateEnglishToFrench(englishText);
  } catch (err) {
    if (DEBUG) {
      log.debug(`[French] Translation failed: ${err.message}`);
    }
    return null;
  }
};

// =============================================================================
// CACHE WARMING
// =============================================================================

/**
 * Warm cache with words from text
 * Pre-fetches translations for better UX
 *
 * @param {string} text - Text containing words to cache
 * @param {Object} options - Lookup options
 */
export const warmCache = async (text, options = {}) => {
  if (!text) return;

  // Split text into words (simple split, no complex parsing needed)
  const words = text
    .split(/[\s\u0591-\u05C7]+/) // Split on whitespace and cantillation
    .map(w => cleanHebrewWord(w))
    .filter(w => w && w.length >= 2);

  // Deduplicate
  const uniqueWords = [...new Set(words)];

  // Look up in batches to warm cache
  const batchSize = 20;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(word => lookupWord(word, { ...options, skipCache: false }))
    );
  }
};

/**
 * Preload common Hebrew and Aramaic words into cache
 * @param {string[]} words - Optional custom word list (default: common words)
 * @returns {Promise<number>} Number of words successfully preloaded
 */
export const preloadCommonWords = async (words = null) => {
  // Return existing promise if already preloading
  if (preloadingPromise) return preloadingPromise;

  // Skip if already completed
  if (preloadingComplete) return preloadedCount;

  preloadingPromise = (async () => {
    // PRO SCHOLAR V12: Preload academic critical words first (fast, ~100 entries)
    await loadAcademicCriticalWords().catch(() => null);

    // Get word list - either provided or defaults
    const wordList = words || [...COMMON_HEBREW_WORDS, ...COMMON_ARAMAIC_WORDS];

    let successCount = 0;
    const startTime = Date.now();

    if (DEBUG) {
      log.debug(`[Preload] Starting preload of ${wordList.length} words...`);
    }

    // Load from local dictionaries using quickLookup (instant, no API)
    for (const word of wordList) {
      const cleaned = cleanHebrewWord(word);
      if (!cleaned) continue;

      // Check if already cached
      const cacheKey = `${cleaned}:default`;
      if (lookupCache.has?.(cacheKey)) {
        successCount++;
        continue;
      }

      // Use quickLookup (sync, local only)
      const result = quickLookup(cleaned);
      if (result?.english) {
        successCount++;
      }
    }

    if (DEBUG) {
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
 * @returns {boolean}
 */
export const isPreloadComplete = () => preloadingComplete;

/**
 * Get preloading status
 * @returns {Object} Preload status with count and completion flag
 */
export const getPreloadStatus = () => ({
  complete: preloadingComplete,
  count: preloadedCount,
  inProgress: preloadingPromise !== null && !preloadingComplete
});

/**
 * Check if a word is already in cache
 *
 * @param {string} word - Word to check
 * @param {Object} options - Lookup options
 * @returns {boolean} True if cached
 */
export const isCached = (word, options = {}) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return false;

  const cacheKey = `${cleaned}:${options.contextMode || 'default'}`;
  return lookupCache.has?.(cacheKey) || false;
};

// Re-export cleanHebrewWord for consumers
export { cleanHebrewWord };

// Re-export SEMANTIC_DOMAINS for consumers
export { SEMANTIC_DOMAINS };

// =============================================================================
// DIALECTAL AND PERIOD ANALYSIS
// =============================================================================

/**
 * Linguistic periods in Hebrew/Aramaic literature
 */
export const LINGUISTIC_PERIODS = {
  ARCHAIC_BIBLICAL: {
    key: 'archaic_biblical',
    name: 'Archaic Biblical Hebrew',
    abbrev: 'ABH',
    dateRange: 'c. 1200-1000 BCE',
    description: 'Earliest biblical poetry (Song of Deborah, Blessing of Moses)',
    markers: ['archaic verbal forms', 'rare vocabulary', 'unique syntax']
  },
  STANDARD_BIBLICAL: {
    key: 'standard_biblical',
    name: 'Standard Biblical Hebrew',
    abbrev: 'SBH',
    dateRange: 'c. 1000-586 BCE',
    description: 'Classical prose of Torah, Former Prophets',
    markers: ['classical verbal system', 'waw-consecutive', 'standard vocabulary']
  },
  LATE_BIBLICAL: {
    key: 'late_biblical',
    name: 'Late Biblical Hebrew',
    abbrev: 'LBH',
    dateRange: 'c. 586-200 BCE',
    description: 'Post-exilic texts (Esther, Daniel, Chronicles)',
    markers: ['Aramaisms', 'Persian loanwords', 'changed syntax']
  },
  QUMRAN: {
    key: 'qumran',
    name: 'Qumran Hebrew',
    abbrev: 'QH',
    dateRange: 'c. 200 BCE-70 CE',
    description: 'Dead Sea Scrolls sectarian literature',
    markers: ['mixed features', 'archaizing tendencies', 'unique terminology']
  },
  MISHNAIC: {
    key: 'mishnaic',
    name: 'Mishnaic Hebrew',
    abbrev: 'MH',
    dateRange: 'c. 70-200 CE',
    description: 'Tannaitic literature (Mishnah, Tosefta)',
    markers: ['no waw-consecutive', 'Greek/Latin loans', 'participle-based syntax']
  },
  AMORAIC: {
    key: 'amoraic',
    name: 'Amoraic Hebrew',
    abbrev: 'AH',
    dateRange: 'c. 200-500 CE',
    description: 'Hebrew portions of Talmud, Midrash',
    markers: ['mixed with Aramaic', 'reduced verbal system', 'technical terms']
  }
};

/**
 * Aramaic dialects in Jewish literature
 */
export const ARAMAIC_DIALECTS = {
  BIBLICAL_ARAMAIC: {
    key: 'biblical_aramaic', name: 'Biblical Aramaic', abbrev: 'BA',
    texts: 'Daniel 2-7, Ezra 4-7', features: ['Imperial Aramaic influence', 'older orthography']
  },
  TARGUMIC: {
    key: 'targumic', name: 'Targumic Aramaic', abbrev: 'TgA',
    texts: 'Targum Onkelos, Jonathan', features: ['translation Hebrew', 'literary dialect']
  },
  JEWISH_PALESTINIAN: {
    key: 'jewish_palestinian', name: 'Jewish Palestinian Aramaic', abbrev: 'JPA',
    texts: 'Palestinian Talmud', features: ['Western Aramaic', 'Greek influence']
  },
  JEWISH_BABYLONIAN: {
    key: 'jewish_babylonian', name: 'Jewish Babylonian Aramaic', abbrev: 'JBA',
    texts: 'Babylonian Talmud', features: ['Eastern Aramaic', 'Akkadian substrate']
  },
  SYRIAC: {
    key: 'syriac', name: 'Syriac', abbrev: 'Syr',
    texts: 'Peshitta', features: ['Christian literary Aramaic', 'useful cognates']
  }
};

const PERIOD_MARKERS = {
  lbh_markers: [
    { pattern: /מלכות/, type: 'kingdom_term', period: 'late_biblical' },
    { pattern: /זמן/, type: 'time_word', period: 'late_biblical' },
    { pattern: /דת/, type: 'persian_loan', period: 'late_biblical' }
  ],
  mh_markers: [
    { pattern: /של/, type: 'genitive_shel', period: 'mishnaic' },
    { pattern: /כדי/, type: 'purpose_kedei', period: 'mishnaic' },
    { pattern: /הלכה/, type: 'legal_term', period: 'mishnaic' }
  ],
  aramaic_markers: [
    { pattern: /די/, type: 'relative', dialect: 'general' },
    { pattern: /קדם/, type: 'preposition', dialect: 'general' }
  ]
};

/**
 * Analyze the dialectal period of a word
 */
export const analyzeDialectalPeriod = (word, lookupResult = null) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const analysis = { word: cleaned, detectedPeriods: [], primaryPeriod: null, aramaicDialect: null, confidence: 'low', markers: [], evidence: [] };
  for (const [category, markers] of Object.entries(PERIOD_MARKERS)) {
    for (const marker of markers) {
      if (marker.pattern.test(cleaned)) {
        analysis.markers.push({ type: marker.type, category, period: marker.period || marker.dialect });
        if (marker.period) analysis.detectedPeriods.push(marker.period);
        if (marker.dialect) analysis.aramaicDialect = marker.dialect;
      }
    }
  }
  if (lookupResult?.sources) {
    for (const source of lookupResult.sources) {
      const combined = `${source.definition || ''} ${source.fullDefinition || ''}`.toLowerCase();
      if (combined.includes('late') || combined.includes('post-exilic')) { analysis.evidence.push({ source: source.name, indicator: 'late biblical' }); analysis.detectedPeriods.push('late_biblical'); }
      if (combined.includes('mishnaic') || combined.includes('rabbinic')) { analysis.evidence.push({ source: source.name, indicator: 'mishnaic' }); analysis.detectedPeriods.push('mishnaic'); }
      if (combined.includes('aramaic')) { analysis.evidence.push({ source: source.name, indicator: 'aramaic' }); if (!analysis.aramaicDialect) analysis.aramaicDialect = 'general'; }
      if (combined.includes('archaic') || combined.includes('poetic')) { analysis.evidence.push({ source: source.name, indicator: 'archaic' }); analysis.detectedPeriods.push('archaic_biblical'); }
    }
  }
  if (lookupResult?.isAramaic) { analysis.isAramaic = true; if (lookupResult?.contextMode === 'talmudic') analysis.aramaicDialect = 'jewish_babylonian'; }
  if (analysis.detectedPeriods.length > 0) {
    const counts = {}; for (const p of analysis.detectedPeriods) counts[p] = (counts[p] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    analysis.primaryPeriod = LINGUISTIC_PERIODS[sorted[0][0].toUpperCase()] || null;
    analysis.confidence = sorted[0][1] >= 2 ? 'high' : 'moderate';
  } else { analysis.primaryPeriod = LINGUISTIC_PERIODS.STANDARD_BIBLICAL; analysis.confidence = 'low'; }
  if (analysis.aramaicDialect && analysis.aramaicDialect !== 'general') analysis.dialectDetails = ARAMAIC_DIALECTS[analysis.aramaicDialect.toUpperCase()] || null;
  return analysis;
};

// =============================================================================
// HAPAX LEGOMENA DATABASE
// =============================================================================

export const HAPAX_DATABASE = {
  'גחון': { reference: 'Gen 3:14', meaning: 'belly (of serpent)', etymology: 'uncertain', scholarlyNote: 'Unique term for serpent locomotion' },
  'תשׁוקה': { reference: 'Gen 3:16', meaning: 'desire, longing', etymology: 'from שׁוק', scholarlyNote: 'Only 3 occurrences; debated meaning' },
  'צהר': { reference: 'Gen 6:16', meaning: 'roof/window opening', etymology: 'related to צהרים', scholarlyNote: 'Ark term; exact meaning disputed' },
  'אחו': { reference: 'Gen 41:2', meaning: 'reed grass', etymology: 'Egyptian loanword', scholarlyNote: 'Confirms Egyptian setting' },
  'לילית': { reference: 'Isa 34:14', meaning: 'night creature', etymology: 'from לילה + Akkadian lilītu', scholarlyNote: 'Mythological; debated interpretation' }
};

export const getHapaxInfo = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = HAPAX_DATABASE[cleaned] || HAPAX_DATABASE[normalizeFinals(cleaned)];
  if (entry) return { isHapax: true, ...entry, word: cleaned, scholarlySignificance: 'high', interpretationCaution: 'Meaning derived from context; scholarly debate exists' };
  return null;
};

export const isLikelyHapax = (lookupResult) => {
  if (!lookupResult) return false;
  const allText = (lookupResult.sources || []).map(s => `${s.definition || ''} ${s.fullDefinition || ''}`.toLowerCase()).join(' ');
  return allText.includes('hapax') || allText.includes('only once') || allText.includes('occurs once') || lookupResult.uncertainty?.level?.level === 'hapax';
};

// =============================================================================
// COMPARATIVE SEMITIC DATA
// =============================================================================

export const COMPARATIVE_SEMITIC_DB = {
  'אב': { arabic: { word: 'أب', meaning: 'father' }, akkadian: { word: 'abu', meaning: 'father' }, ugaritic: { word: 'ab', meaning: 'father' }, protoSemitic: '*ʾab-', note: 'Universal Semitic "father"' },
  'אם': { arabic: { word: 'أم', meaning: 'mother' }, akkadian: { word: 'ummu', meaning: 'mother' }, protoSemitic: '*ʾimm-', note: 'Universal Semitic "mother"' },
  'בן': { arabic: { word: 'ابن', meaning: 'son' }, akkadian: { word: 'māru', meaning: 'son' }, ugaritic: { word: 'bn', meaning: 'son' }, protoSemitic: '*bin-', note: 'Proto-Semitic *bin-' },
  'מים': { arabic: { word: 'ماء', meaning: 'water' }, akkadian: { word: 'mû', meaning: 'water' }, protoSemitic: '*may-', note: 'Dual "waters"' },
  'שׁמים': { arabic: { word: 'سماء', meaning: 'sky' }, akkadian: { word: 'šamû', meaning: 'heaven' }, protoSemitic: '*šamay-', note: 'Dual "heavens"' },
  'ארץ': { arabic: { word: 'أرض', meaning: 'earth' }, akkadian: { word: 'erṣetu', meaning: 'earth' }, protoSemitic: '*ʾarṣ-', note: 'Common Semitic "earth"' },
  'יום': { arabic: { word: 'يوم', meaning: 'day' }, akkadian: { word: 'ūmu', meaning: 'day' }, protoSemitic: '*yawm-', note: 'Universal time word' },
  'מלך': { arabic: { word: 'ملك', meaning: 'king' }, akkadian: { word: 'malku', meaning: 'king' }, protoSemitic: '*malk-', note: 'Semitic royal term' },
  'אלהים': { arabic: { word: 'إله', meaning: 'god' }, akkadian: { word: 'ilu', meaning: 'god' }, protoSemitic: '*ʾil-', note: 'Hebrew plural unique' },
  'לב': { arabic: { word: 'لب', meaning: 'core' }, akkadian: { word: 'libbu', meaning: 'heart' }, protoSemitic: '*libb-', note: 'Seat of intellect' },
  'דם': { arabic: { word: 'دم', meaning: 'blood' }, akkadian: { word: 'dāmu', meaning: 'blood' }, protoSemitic: '*dam-', note: 'Blood = life' },
  'שׁמשׁ': { arabic: { word: 'شمس', meaning: 'sun' }, akkadian: { word: 'šamšu', meaning: 'sun' }, protoSemitic: '*šamš-', note: 'Celestial term' }
};

export const getComparativeSemiticData = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = COMPARATIVE_SEMITIC_DB[cleaned] || COMPARATIVE_SEMITIC_DB[normalizeFinals(cleaned)] || COMPARATIVE_SEMITIC_DB[stripAllDiacritics(cleaned)];
  if (entry) return { hebrewWord: cleaned, ...entry, hasComparativeData: true, cognateCount: Object.keys(entry).filter(k => ['arabic', 'akkadian', 'ugaritic', 'ethiopic'].includes(k)).length };
  return null;
};

// =============================================================================
// HISTORICAL USAGE TIMELINE
// =============================================================================

export const HISTORICAL_PERIODS = [
  { key: 'patriarchal', name: 'Patriarchal Era', dateRange: 'c. 2000-1500 BCE', order: 1 },
  { key: 'monarchy', name: 'Monarchy', dateRange: 'c. 1020-586 BCE', order: 2 },
  { key: 'exile', name: 'Babylonian Exile', dateRange: '586-538 BCE', order: 3 },
  { key: 'second_temple', name: 'Second Temple', dateRange: '538 BCE-70 CE', order: 4 },
  { key: 'tannaitic', name: 'Tannaitic', dateRange: '70-220 CE', order: 5 },
  { key: 'amoraic', name: 'Amoraic', dateRange: '220-500 CE', order: 6 }
];

export const SEMANTIC_EVOLUTION_DB = {
  'תורה': { evolution: [{ period: 'monarchy', meaning: 'instruction, teaching' }, { period: 'second_temple', meaning: 'the Law, Pentateuch' }, { period: 'tannaitic', meaning: 'oral and written law' }], note: 'Narrowing then broadening' },
  'משׁיח': { evolution: [{ period: 'monarchy', meaning: 'anointed one (king, priest)' }, { period: 'exile', meaning: 'future deliverer' }, { period: 'second_temple', meaning: 'eschatological redeemer' }], note: 'Common title to specific figure' },
  'קדושׁ': { evolution: [{ period: 'patriarchal', meaning: 'set apart' }, { period: 'monarchy', meaning: 'holy, sacred' }, { period: 'tannaitic', meaning: 'holy, martyr' }], note: 'Preserved with extensions' }
};

export const getHistoricalUsageTimeline = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = SEMANTIC_EVOLUTION_DB[cleaned] || SEMANTIC_EVOLUTION_DB[normalizeFinals(cleaned)];
  if (entry) return { word: cleaned, hasEvolution: true, evolution: entry.evolution.map(e => ({ ...e, periodInfo: HISTORICAL_PERIODS.find(p => p.key === e.period) })), note: entry.note, periodsCovered: entry.evolution.length };
  return null;
};

// =============================================================================
// ENHANCED CITATIONS & CROSS-REFERENCES
// =============================================================================

export const CITATION_FORMATS = { SBL: { name: 'Society of Biblical Literature' }, CHICAGO: { name: 'Chicago Manual of Style' } };

/**
 * PRO SCHOLAR V12: Enhanced SBL citation with page numbers
 * @param {string} sourceName - Dictionary name
 * @param {string} headword - Entry headword
 * @param {Object} citationData - Optional { page, entryId } from dictionary entry
 * @returns {Object} Full academic citation
 */
export const generateSBLCitation = (sourceName, headword, citationData = {}) => {
  const info = getSourceInfo(sourceName);
  if (!info) return { footnote: sourceName, bibliography: sourceName, short: sourceName };

  // Build page reference if available (PRO SCHOLAR V12)
  const pageRef = citationData.page ? `, ${citationData.page}` : '';
  const entryRef = citationData.entryId ? ` (${citationData.entryId})` : '';

  // SBL Handbook format for lexicons
  const footnote = `${info.author}, "${headword},"${entryRef} *${info.title}* (${info.location}: ${info.publisher}, ${info.year})${pageRef}.`;
  const bibliography = `${info.author}. *${info.title}*. ${info.location}: ${info.publisher}, ${info.year}.`;
  const short = `${info.shortName || info.author.split(',')[0]}${pageRef ? pageRef : `, s.v. "${headword}"`}`;

  return {
    footnote,
    bibliography,
    short,
    format: 'SBL',
    page: citationData.page || null,
    entryId: citationData.entryId || null
  };
};

export const generateAcademicCitations = (sources, format = 'SBL') => {
  if (!sources?.length) return [];
  return sources.map(src => format === 'SBL' ? { source: src.name, headword: src.headword, ...generateSBLCitation(src.name, src.headword) } : { source: src.name, ...generateCitation(src.name, src.headword, { format: format.toLowerCase() }) });
};

export const CROSS_REFERENCE_DB = {
  'בראשׁית': { references: [{ ref: 'Gen 1:1', type: 'primary', text: 'In the beginning God created' }, { ref: 'Prov 8:22', type: 'thematic', text: 'The LORD possessed me at the beginning' }] },
  'חסד': { references: [{ ref: 'Exod 34:6', type: 'definition', text: 'Abundant in lovingkindness' }, { ref: 'Ps 136', type: 'liturgical', text: 'His lovingkindness is everlasting' }, { ref: 'Mic 6:8', type: 'ethical', text: 'Love kindness' }] },
  'צדקה': { references: [{ ref: 'Gen 15:6', type: 'theological', text: 'Counted as righteousness' }, { ref: 'Isa 32:17', type: 'eschatological', text: 'Work of righteousness is peace' }] },
  'שׁבת': { references: [{ ref: 'Gen 2:2-3', type: 'creation', text: 'God rested' }, { ref: 'Exod 20:8', type: 'decalogue', text: 'Remember the Sabbath' }] }
};

export const getCrossReferences = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const refs = CROSS_REFERENCE_DB[cleaned] || CROSS_REFERENCE_DB[normalizeFinals(cleaned)];
  if (refs) return { word: cleaned, hasCrossReferences: true, references: refs.references, referenceCount: refs.references.length, types: [...new Set(refs.references.map(r => r.type))] };
  return null;
};

// =============================================================================
// ULTIMATE ENRICHED LOOKUP
// =============================================================================

export const lookupFullyEnrichedV3 = async (word, options = {}) => {
  const { contextMode = null, reference = null, surroundingText = '', userLevel = 'scholar', includeOnline = false, includeContextRanking = true, includeRelationships = true, includeMorphology = true, includeRootFamily = true, includeCitations = true, includeSemantics = true, includeUncertainty = true, includeDialectalAnalysis = true, includeHapaxInfo = true, includeComparativeSemitic = true, includeHistoricalTimeline = true, includeCrossReferences = true, includeEtymology = true, citationFormat = 'SBL' } = options;
  const result = await lookupFullyEnriched(word, { contextMode, reference, surroundingText, userLevel, includeOnline, includeContextRanking, includeRelationships, includeMorphology, includeRootFamily, includeCitations, includeSemantics, includeUncertainty });
  if (includeDialectalAnalysis) result.dialectalAnalysis = analyzeDialectalPeriod(word, result);
  if (includeHapaxInfo) { const hapax = getHapaxInfo(word); if (hapax) { result.hapaxInfo = hapax; result.isHapax = true; } else if (isLikelyHapax(result)) { result.hapaxInfo = { isHapax: true, word: result.cleanedWord, scholarlyNote: 'Likely hapax based on dictionary descriptions' }; result.isHapax = true; } }
  if (includeComparativeSemitic) { const cognates = getComparativeSemiticData(word); if (cognates) { result.comparativeSemitic = cognates; result.hasComparativeData = true; } }
  // PRO SCHOLAR V12: Comprehensive etymology from ALL scholarly databases (78,000+ entries)
  // Sources: Sefaria (2,493), Root Pro (18,898), BDB (2,591), Jastrow (16,794), Wiktionary (168+)
  if (includeEtymology) {
    const etymology = await getComprehensiveEtymology(word);
    if (etymology) {
      result.etymology = {
        protoSemitic: etymology.protoSemitic,
        cognates: etymology.cognates,
        relatedRoots: etymology.relatedRoots,
        references: etymology.references,
        confidence: etymology.confidence,
        root: etymology.root,
        dialects: etymology.dialects,
        crossReferences: etymology.crossReferences,
        loanwords: etymology.loanwords,
        qualityScore: etymology.qualityScore,
        qualityLevel: etymology.qualityLevel,
        sources: etymology.sources,
        // PRO SCHOLAR V12: Additional data from comprehensive lookup
        sefariaData: etymology.sefariaData,
        rootProData: etymology.rootProData,
        bdbEtymology: etymology.bdbEtymology,
        jastrowEtymology: etymology.jastrowEtymology,
        wiktionaryData: etymology.wiktionaryData,
        sourceCount: etymology.sources?.length || 0
      };
      result.hasEtymology = true;
      result.etymologySourceCount = etymology.sources?.length || 0;
    }
  }
  if (includeHistoricalTimeline) { const timeline = getHistoricalUsageTimeline(word); if (timeline) { result.historicalTimeline = timeline; result.hasSemanticEvolution = true; } }
  if (includeCrossReferences) { const crossRefs = getCrossReferences(word); if (crossRefs) { result.crossReferences = crossRefs; result.hasCrossReferences = true; } }
  if (includeCitations && citationFormat === 'SBL') result.academicCitations = generateAcademicCitations(result.sources || [], 'SBL');
  result.isFullyEnriched = true;
  result.enrichmentLevel = 'pro_scholar_v12';
  result.enrichmentFeatures = { dialectalAnalysis: !!result.dialectalAnalysis, hapaxInfo: !!result.hapaxInfo, comparativeSemitic: !!result.comparativeSemitic, etymology: !!result.etymology, historicalTimeline: !!result.historicalTimeline, crossReferences: !!result.crossReferences };
  return result;
};

// =============================================================================
// CONTEXTUAL DEFINITION RANKING
// =============================================================================

/**
 * Rank definitions from multiple sources by contextual relevance
 * Uses scholarly context to determine which definition is most appropriate
 *
 * @param {Array} sources - Array of source objects with definitions
 * @param {Object} context - Context for ranking
 * @param {string} context.reference - Book/chapter reference (e.g., "Genesis 1:1")
 * @param {string} context.surroundingText - Text around the word
 * @param {string} context.userLevel - 'beginner', 'intermediate', 'advanced', 'scholar'
 * @returns {Array} Sources ranked by contextual relevance
 */
export const rankDefinitionsByContext = (sources, context = {}) => {
  if (!sources || sources.length === 0) return [];

  const {
    reference = '',
    surroundingText = '',
    userLevel = 'intermediate',
    preferredSources = []
  } = context;

  // Convert sources to definition format for ranking
  const definitions = sources.map(src => ({
    source: src.name,
    text: src.definition || src.fullDefinition,
    headword: src.headword,
    tier: src.tier,
    examples: src.examples,
    original: src
  }));

  // Rank using contextualDefinitionService
  const ranked = rankDefinitions(definitions, {
    reference,
    surroundingText,
    userLevel,
    preferredSources
  });

  // Map back to source format with rankings
  return ranked.map(r => ({
    ...r.original,
    contextScore: r.score,
    contextRank: r.rank,
    isBestForContext: r.isBest,
    contextConfidence: r.confidence,
    scoreBreakdown: r.breakdown
  }));
};

/**
 * Get the best definition for a word based on context
 * Combines scholarly tier with contextual relevance
 *
 * @param {string} word - Word to look up
 * @param {Object} context - Context for selection
 * @returns {Object} Result with context-ranked definitions
 */
export const lookupWithContextRanking = (word, context = {}) => {
  const result = quickLookup(word, context);

  if (!result.sources || result.sources.length === 0) {
    return result;
  }

  // Rank definitions by context
  const rankedSources = rankDefinitionsByContext(result.sources, context);

  // Get the best definition considering both tier and context
  const bestSource = rankedSources[0];

  return {
    ...result,
    sources: rankedSources,
    contextBestDefinition: bestSource?.definition || result.english,
    contextBestSource: bestSource?.name || result.source,
    hasContextRanking: true,
    contextType: detectContextType(context.reference || ''),
    detectedDomains: detectDomain(context.surroundingText || '')
  };
};

// =============================================================================
// WORD RELATIONSHIP INTEGRATION
// =============================================================================

/**
 * Get comprehensive word relationships
 * Includes synonyms, antonyms, biblical pairs, root family, and cognates
 *
 * @param {string} word - Hebrew word to analyze
 * @param {Object} options - Options
 * @param {boolean} options.includeRootFamily - Include root family (default: true)
 * @param {boolean} options.includeCognates - Include Aramaic cognates (default: true)
 * @param {boolean} options.includeBiblicalPairs - Include biblical pairs (default: true)
 * @returns {Object} Word relationship data
 */
export const getWordRelationships = (word, options = {}) => {
  const {
    includeRootFamily = true,
    includeCognates = true,
    includeBiblicalPairs = true
  } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;

  // Get relationships from wordRelationshipService
  const relationships = _getWordRelationships(cleaned);

  // Build comprehensive result
  const result = {
    word: cleaned,
    synonyms: relationships.synonyms || [],
    antonyms: relationships.antonyms || [],
    collocations: relationships.collocations || [],
    semanticFields: findSemanticFields(cleaned) || []
  };

  if (includeRootFamily) {
    const rootFamily = _getRootFamily(cleaned);
    if (rootFamily) {
      result.rootFamily = rootFamily;
      result.hasRootFamily = true;
    }
  }

  if (includeCognates) {
    const cognate = WORD_RELATIONSHIPS_DB.aramaicCognates[cleaned];
    if (cognate) {
      result.aramaicCognate = cognate;
    }
  }

  if (includeBiblicalPairs) {
    const biblicalPairs = WORD_RELATIONSHIPS_DB.biblicalPairs[cleaned];
    if (biblicalPairs) {
      result.biblicalPairs = biblicalPairs;
    }
  }

  // Calculate relationship richness score
  result.relationshipCount =
    (result.synonyms?.length || 0) +
    (result.antonyms?.length || 0) +
    (result.collocations?.length || 0) +
    (result.rootFamily?.words?.length || 0) +
    (result.biblicalPairs?.length || 0) +
    (result.aramaicCognate ? 1 : 0);

  return result;
};

/**
 * Lookup with full word relationship data
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup + relationship options
 * @returns {Object} Result with relationships
 */
export const lookupWithRelationships = (word, options = {}) => {
  const {
    includeRootFamily = true,
    includeCognates = true,
    includeBiblicalPairs = true,
    ...lookupOptions
  } = options;

  const result = quickLookup(word, lookupOptions);

  // Add relationship data
  const relationships = getWordRelationships(word, {
    includeRootFamily,
    includeCognates,
    includeBiblicalPairs
  });

  if (relationships) {
    result.relationships = relationships;
    result.hasRelationships = relationships.relationshipCount > 0;
  }

  return result;
};

// =============================================================================
// SCHOLARLY UNCERTAINTY MARKERS
// =============================================================================

/**
 * Scholarly uncertainty levels
 */
export const UNCERTAINTY_LEVELS = {
  CERTAIN: {
    level: 'certain',
    label: 'Scholarly Certainty',
    icon: '●',
    description: 'All sources agree on core meaning'
  },
  PROBABLE: {
    level: 'probable',
    label: 'Highly Probable',
    icon: '◐',
    description: 'Most sources agree, minor variations'
  },
  DISPUTED: {
    level: 'disputed',
    label: 'Scholarly Dispute',
    icon: '◑',
    description: 'Sources present different interpretations'
  },
  UNCERTAIN: {
    level: 'uncertain',
    label: 'Uncertain Etymology',
    icon: '○',
    description: 'Limited evidence, possible meanings'
  },
  HAPAX: {
    level: 'hapax',
    label: 'Hapax Legomenon',
    icon: '◇',
    description: 'Word appears only once in corpus'
  }
};

/**
 * Generate scholarly uncertainty markers for a lookup result
 * Analyzes source agreement and flags areas of scholarly debate
 *
 * @param {Object} result - Lookup result with sources
 * @returns {Object} Uncertainty analysis
 */
export const generateScholarlyUncertainty = (result) => {
  if (!result || !result.sources || result.sources.length === 0) {
    return {
      level: UNCERTAINTY_LEVELS.UNCERTAIN,
      markers: [{
        type: 'no_sources',
        message: 'No dictionary sources found for this word',
        severity: 'warning'
      }],
      confidence: 0
    };
  }

  const markers = [];
  let uncertaintyLevel = UNCERTAINTY_LEVELS.CERTAIN;

  // Check for divergent opinions in consensus
  if (result.consensus?.divergentOpinions?.length > 0) {
    markers.push({
      type: 'divergent_opinions',
      message: `${result.consensus.divergentOpinions.length} alternative interpretation(s) exist`,
      alternatives: result.consensus.divergentOpinions.map(d => ({
        definition: d.definition,
        sources: d.sources
      })),
      severity: 'info'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.DISPUTED;
  }

  // Check for tier mismatch (tier 1 disagrees with tier 2/3)
  const tier1Sources = result.sources.filter(s => getSourceTier(s.name).level === 1);
  const tier2Sources = result.sources.filter(s => getSourceTier(s.name).level === 2);

  if (tier1Sources.length > 0 && tier2Sources.length > 0) {
    const tier1Defs = tier1Sources.map(s => s.definition?.toLowerCase().substring(0, 30));
    const tier2Defs = tier2Sources.map(s => s.definition?.toLowerCase().substring(0, 30));

    const hasOverlap = tier1Defs.some(d1 =>
      tier2Defs.some(d2 => d1 && d2 && (d1.includes(d2.substring(0, 10)) || d2.includes(d1.substring(0, 10))))
    );

    if (!hasOverlap && tier1Defs.length > 0 && tier2Defs.length > 0) {
      markers.push({
        type: 'tier_disagreement',
        message: 'Academic and scholarly sources may differ',
        tier1: tier1Sources.map(s => s.name),
        tier2: tier2Sources.map(s => s.name),
        severity: 'info'
      });
      if (uncertaintyLevel.level !== 'disputed') {
        uncertaintyLevel = UNCERTAINTY_LEVELS.PROBABLE;
      }
    }
  }

  // Check for etymology uncertainty (if Klein provides uncertain etymology)
  const kleinSource = result.sources.find(s => s.name === 'Klein');
  if (kleinSource?.etymology?.includes('uncertain') || kleinSource?.etymology?.includes('perhaps')) {
    markers.push({
      type: 'uncertain_etymology',
      message: 'Etymology is uncertain or debated',
      etymology: kleinSource.etymology,
      severity: 'info'
    });
    if (uncertaintyLevel.level === 'certain') {
      uncertaintyLevel = UNCERTAINTY_LEVELS.PROBABLE;
    }
  }

  // Check for single source (low confidence)
  if (result.sources.length === 1) {
    markers.push({
      type: 'single_source',
      message: 'Only one dictionary source found',
      source: result.sources[0].name,
      severity: 'warning'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.UNCERTAIN;
  }

  // Check for hapax legomenon marker
  if (result.morphology?.frequency === 'hapax' || result.sources.some(s =>
    s.definition?.toLowerCase().includes('hapax') ||
    s.fullDefinition?.toLowerCase().includes('only once')
  )) {
    markers.push({
      type: 'hapax_legomenon',
      message: 'This word appears only once in the biblical corpus',
      severity: 'info'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.HAPAX;
  }

  // Calculate overall confidence from consensus
  const confidence = result.consensus?.weightedScore || 0;

  return {
    level: uncertaintyLevel,
    markers,
    confidence,
    sourcesAgree: markers.filter(m => m.type === 'divergent_opinions').length === 0,
    hasScholarlyDebate: markers.some(m =>
      m.type === 'divergent_opinions' || m.type === 'tier_disagreement'
    ),
    markerCount: markers.length
  };
};

// =============================================================================
// SCHOLARLY EXPORT CAPABILITIES
// =============================================================================

/**
 * Export lookup result to JSON-LD format for scholarly interchange
 * Follows schema.org vocabulary with extensions for lexicography
 *
 * @param {Object} result - Lookup result to export
 * @returns {Object} JSON-LD formatted data
 */
export const exportToJsonLD = (result) => {
  if (!result) return null;

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'lexeme': 'https://www.w3.org/ns/lemon/ontolex#Lexeme',
      'sense': 'https://www.w3.org/ns/lemon/ontolex#LexicalSense',
      'hebrewWord': 'http://www.lexinfo.net/ontology/2.0/lexinfo#',
      'biblicalHebrew': 'http://example.org/biblical-hebrew#'
    },
    '@type': 'lexeme',
    '@id': `urn:hebrew:${result.cleanedWord}`,
    'name': result.word,
    'inLanguage': result.isAramaic ? 'arc' : 'hbo',
    'writtenForm': result.cleanedWord,
    'lexicalEntry': {
      '@type': 'sense',
      'definition': result.english,
      'source': result.source
    },
    'root': result.rootData?.root || result.root || null,
    'morphology': result.morphology ? {
      'pattern': result.morphology.pattern,
      'binyan': result.morphology.binyan,
      'prefixes': result.morphology.prefixes,
      'suffixes': result.morphology.suffixes
    } : null,
    'scholarly': {
      'consensus': result.consensus?.level?.label || null,
      'confidenceScore': result.confidence?.score || 0,
      'sourceCount': result.sources?.length || 0,
      'academicSources': result.sources?.filter(s =>
        getSourceTier(s.name).level <= 2
      ).map(s => s.name) || []
    },
    'citations': result.citations?.map(c => ({
      'source': c.source,
      'citation': c.citation?.full
    })) || [],
    'dateRetrieved': new Date().toISOString()
  };
};

/**
 * Export lookup result to Markdown format for documentation
 *
 * @param {Object} result - Lookup result to export
 * @param {Object} options - Export options
 * @returns {string} Markdown formatted text
 */
export const exportToMarkdown = (result, options = {}) => {
  if (!result) return '';

  const {
    includeAllSources = true,
    includeMorphology = true,
    includeCitations = true,
    includeUncertainty = true
  } = options;

  const lines = [];

  // Header
  lines.push(`# ${result.word}`);
  lines.push('');

  // Basic info
  lines.push(`**Cleaned Form:** ${result.cleanedWord}`);
  lines.push(`**Language:** ${result.language || (result.isAramaic ? 'Aramaic' : 'Hebrew')}`);
  lines.push('');

  // Primary definition
  lines.push('## Primary Definition');
  lines.push(`> ${result.english || 'No definition found'}`);
  lines.push(`*Source: ${result.source}*`);
  lines.push('');

  // Root information
  if (result.rootData?.root || result.root) {
    lines.push('## Root');
    lines.push(`**Root:** ${result.rootData?.root || result.root}`);
    if (result.rootData?.binyan) {
      lines.push(`**Binyan:** ${result.rootData.binyan}`);
    }
    lines.push('');
  }

  // Morphology
  if (includeMorphology && result.morphology) {
    lines.push('## Morphological Analysis');
    if (result.morphology.pattern) lines.push(`- **Pattern:** ${result.morphology.pattern}`);
    if (result.morphology.binyan) lines.push(`- **Binyan:** ${result.morphology.binyan}`);
    if (result.morphology.prefixes?.length) lines.push(`- **Prefixes:** ${result.morphology.prefixes.join(', ')}`);
    if (result.morphology.suffixes?.length) lines.push(`- **Suffixes:** ${result.morphology.suffixes.join(', ')}`);
    if (result.morphology.description) lines.push(`- **Description:** ${result.morphology.description}`);
    lines.push('');
  }

  // All sources
  if (includeAllSources && result.sources?.length > 0) {
    lines.push('## Dictionary Sources');
    lines.push('');
    lines.push('| Source | Tier | Definition |');
    lines.push('|--------|------|------------|');
    for (const src of result.sources) {
      const tier = getSourceTier(src.name);
      const defPreview = (src.definition || '').substring(0, 60) + ((src.definition?.length || 0) > 60 ? '...' : '');
      lines.push(`| ${src.name} | ${tier.name} | ${defPreview} |`);
    }
    lines.push('');
  }

  // Consensus
  if (result.consensus) {
    lines.push('## Scholarly Consensus');
    lines.push(`**Level:** ${result.consensus.level?.label || 'Unknown'}`);
    lines.push(`**Agreement:** ${result.consensus.agreementCount}/${result.consensus.totalSources} sources agree`);
    lines.push(`**Score:** ${result.consensus.weightedScore}/100`);
    lines.push('');
  }

  // Uncertainty markers
  if (includeUncertainty) {
    const uncertainty = generateScholarlyUncertainty(result);
    if (uncertainty.markers.length > 0) {
      lines.push('## Scholarly Notes');
      for (const marker of uncertainty.markers) {
        lines.push(`- ${marker.icon || '•'} ${marker.message}`);
      }
      lines.push('');
    }
  }

  // Citations
  if (includeCitations && result.citations?.length > 0) {
    lines.push('## Bibliography');
    for (const cit of result.citations) {
      lines.push(`- ${cit.citation?.full || cit.source}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated by Torah Reader Pro Scholar - ${new Date().toISOString()}*`);

  return lines.join('\n');
};

/**
 * Export lookup result for flashcard/SRS systems
 *
 * @param {Object} result - Lookup result
 * @returns {Object} Flashcard-ready data
 */
export const exportToFlashcard = (result) => {
  if (!result) return null;

  return {
    front: result.cleanedWord,
    back: result.english || 'Unknown',
    pronunciation: null, // Could be added from pronunciation service
    root: result.rootData?.root || result.root || null,
    source: result.source,
    confidence: result.confidence?.level || 'unknown',
    language: result.isAramaic ? 'Aramaic' : 'Hebrew',
    tags: [
      result.isAramaic ? 'aramaic' : 'hebrew',
      result.source?.toLowerCase().replace(/[^a-z]/g, ''),
      result.consensus?.level?.level
    ].filter(Boolean),
    metadata: {
      sourceCount: result.sources?.length || 0,
      hasRoot: !!(result.rootData?.root || result.root),
      hasMorphology: !!result.morphology
    }
  };
};

// =============================================================================
// FULLY ENRICHED LOOKUP
// =============================================================================

/**
 * Full lookup with ALL enrichments
 * This is the most comprehensive lookup function combining:
 * - Dictionary sources with consensus scoring
 * - Contextual definition ranking
 * - Word relationships (synonyms, antonyms, cognates)
 * - Morphological analysis
 * - Root family expansion
 * - Scholarly uncertainty markers
 * - Citations
 * - Semantic field data
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Full enrichment options
 * @returns {Promise<Object>} Fully enriched lookup result
 */
export const lookupFullyEnriched = async (word, options = {}) => {
  const {
    // Lookup options
    contextMode = null,
    reference = null,
    surroundingText = '',
    userLevel = 'intermediate',
    includeOnline = false,
    // Enrichment toggles
    includeContextRanking = true,
    includeRelationships = true,
    includeMorphology = true,
    includeRootFamily = true,
    includeCitations = true,
    includeSemantics = true,
    includeUncertainty = true
  } = options;

  // Get base enriched result
  const result = await lookupWordEnriched(word, {
    contextMode,
    reference,
    includeOnline,
    includeMorphology,
    includeRootFamily,
    includeCitations
  });

  // Add contextual ranking
  if (includeContextRanking && result.sources?.length > 0) {
    const rankedSources = rankDefinitionsByContext(result.sources, {
      reference,
      surroundingText,
      userLevel
    });
    result.sources = rankedSources;
    result.contextType = detectContextType(reference || '');
    result.detectedDomains = detectDomain(surroundingText);
  }

  // Add word relationships
  if (includeRelationships) {
    result.relationships = getWordRelationships(word, {
      includeRootFamily: true,
      includeCognates: true,
      includeBiblicalPairs: true
    });
  }

  // Add semantic field data
  if (includeSemantics) {
    const semantics = getSemanticField(word, {
      includeSynonyms: true,
      includeAntonyms: true,
      includeRelated: true,
      relatedLimit: 10
    });
    if (semantics) {
      result.semantics = semantics;
    }
  }

  // Add scholarly uncertainty markers
  if (includeUncertainty) {
    result.uncertainty = generateScholarlyUncertainty(result);
  }

  // Mark as fully enriched
  result.isFullyEnriched = true;
  result.enrichmentLevel = 'full';

  return result;
};

// =============================================================================
// ENHANCED LOOKUP WITH ALL FEATURES
// =============================================================================

/**
 * Full lookup with all enrichments
 * Includes confidence scoring, citations, morphology, and root family
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Promise<Object>} Fully enriched lookup result
 */
export const lookupWordEnriched = async (word, options = {}) => {
  const {
    includeMorphology = true,
    includeRootFamily = false,
    includeCitations = true,
    ...lookupOptions
  } = options;

  // Get base lookup result
  const result = await lookupWord(word, lookupOptions);

  // Add confidence scoring if not already present
  if (!result.confidence) {
    result.confidence = calculateConfidence(result);
  }

  // Add citations if requested and not already present
  if (includeCitations && !result.citations) {
    result.citations = generateAllCitations(result.sources || []);
  }

  // Add morphological analysis if requested
  if (includeMorphology) {
    result.morphology = getMorphology(word);
  }

  // Add root family if requested
  if (includeRootFamily) {
    result.rootFamily = await getRootFamilyExpansion(word, {
      contextMode: lookupOptions.contextMode,
      maxRelated: 5
    });
  }

  return result;
};

// =============================================================================
// COMPATIBILITY LAYER: Aliases for combinedTranslationService migration
// =============================================================================

/**
 * Parallel lookup across all local dictionaries
 * API-compatible replacement for combinedTranslationService.lookupParallel
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Object} Aggregated result with all sources + consensus
 */
export const lookupParallel = (word, options = {}) => {
  const { contextMode = null } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return {
      word,
      cleanedWord: cleaned,
      allSources: [],
      primary: null,
      alternatives: [],
      consensus: null,
      sourceCount: 0,
      error: 'Word too short'
    };
  }

  // Use the unified local dictionary lookup
  const aggregated = lookupAllLocalDictionaries(cleaned, contextMode);
  const isAramaicWord = isLikelyAramaic(cleaned);

  return {
    word,
    cleanedWord: cleaned,
    isAramaic: isAramaicWord,
    language: isAramaicWord ? 'Aramaic' : 'Hebrew',
    allSources: aggregated.allSources || [],
    primary: aggregated.primary,
    english: aggregated.primary?.definition || null,
    source: aggregated.primary?.name || 'none',
    alternatives: aggregated.alternatives || [],
    consensus: aggregated.consensus,
    hasAcademicSource: aggregated.allSources?.some(s =>
      getSourceTier(s.name).level <= 2
    ) || false,
    hasTier1Source: aggregated.allSources?.some(s =>
      getSourceTier(s.name).level === 1
    ) || false,
    sourceCount: aggregated.allSources?.length || 0,
    offline: true
  };
};

/**
 * Get scholarly comparison between sources for a word
 * API-compatible replacement for combinedTranslationService.getSourceComparison
 *
 * @param {string} word - Word to compare
 * @returns {Object} Detailed source comparison
 */
export const getSourceComparison = (word) => {
  const result = lookupParallel(word);

  if (result.sourceCount < 2) {
    return {
      word,
      hasComparison: false,
      reason: result.sourceCount === 1 ? 'Single source only' : 'No sources found'
    };
  }

  return generateSourceComparison(result.allSources);
};

/**
 * Synchronous word lookup - alias for quickLookup
 * API-compatible replacement for combinedTranslationService.lookupWordSync
 */
export const lookupWordSync = (word, options = {}) => quickLookup(word, options);

/**
 * Clear all caches - alias for clearCache
 * API-compatible replacement for combinedTranslationService.clearCaches
 */
export const clearCaches = () => clearCache();

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export raceWithEarlyReturn for advanced use cases
export { raceWithEarlyReturn, getResultQualityScore, rankSourcesByTier, SCHOLARLY_TIERS };

// Re-export source metadata utilities
export { RELIABILITY_TIERS };

// Re-export constants for services/index.js
export { CONTEXT_TYPES, WORD_RELATIONSHIP_TYPES };

const unifiedLookupService = {
  // Core lookup functions
  lookupWord,
  quickLookup,
  batchLookup,
  lookupAllLocalDictionaries,

  // Progressive enhancement
  progressiveLookup,
  progressiveBatchLookup,

  // Enhanced lookup
  lookupWordEnriched,
  lookupFullyEnriched,
  lookupFullyEnrichedV3,

  // Scholarly features
  generateCitation,
  generateAllCitations,
  calculateConfidence,
  getRootFamilyExpansion,
  getMorphology,

  // Contextual ranking
  rankDefinitionsByContext,
  lookupWithContextRanking,

  // Word relationships
  getWordRelationships,
  lookupWithRelationships,

  // Scholarly uncertainty
  generateScholarlyUncertainty,
  UNCERTAINTY_LEVELS,

  // Export capabilities
  exportToJsonLD,
  exportToMarkdown,
  exportToFlashcard,

  // Dialectal/Period Analysis
  analyzeDialectalPeriod,
  LINGUISTIC_PERIODS,
  ARAMAIC_DIALECTS,

  // Hapax Legomena
  getHapaxInfo,
  isLikelyHapax,
  HAPAX_DATABASE,

  // Comparative Semitic
  getComparativeSemiticData,
  COMPARATIVE_SEMITIC_DB,

  // Historical Timeline
  getHistoricalUsageTimeline,
  HISTORICAL_PERIODS,
  SEMANTIC_EVOLUTION_DB,

  // Enhanced Citations
  generateSBLCitation,
  generateAcademicCitations,
  CITATION_FORMATS,

  // Cross-References
  getCrossReferences,
  CROSS_REFERENCE_DB,

  // Legacy compatibility
  lookupParallel,
  getSourceComparison,
  lookupWordSync,
  clearCaches,

  // Cache management
  getCacheStats,
  clearCache,
  warmCache,
  isCached,

  // Preloading
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus,

  // Translation
  getFrenchTranslation,
  cleanHebrewWord,

  // Semantic field enrichment
  getSemanticField,
  enrichWithSemantics,
  lookupWithSemantics,

  // Advanced parallel fetching
  raceWithEarlyReturn,
  getResultQualityScore,
  rankSourcesByTier,

  // Constants
  SCHOLARLY_TIERS,
  SEMANTIC_DOMAINS,
  RELIABILITY_TIERS,
  CONTEXT_TYPES,
  WORD_RELATIONSHIP_TYPES
};

export default unifiedLookupService;
