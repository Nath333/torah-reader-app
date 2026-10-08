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
import { cleanHebrewWord } from './dictionaries/hebrewDictionary';
import { isLikelyAramaic } from './dictionaries/babylonianDictionary';
import { getContextFromReference } from '../constants/bookConstants';
import { createLogger, IS_DEV as DEBUG } from '../utils/debug';

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
} from './dictionaries/dictionaryLoader';
import { lookupAramaicWord as lookupCalAramaic } from './dictionaries/calDictionaryService';
import { lookupWordSefaria } from './dictionaries/scholarlyLexiconService';
// PRO SCHOLAR: Optional reference source (community-edited)
import { lookupWiktionary, fetchWiktionaryEtymology, getProtoSemitic } from './dictionaries/wiktionaryService';
// PRO SCHOLAR V12: Comparative Semitic - CURATED cognates (primary source)
import { getCognates as getCuratedCognates, getCognatesAsync } from './comparativeSemiticService';
// PRO SCHOLAR V12: Etymology enrichment with ALL scholarly databases (78,000+ entries)
import { getComprehensiveEtymology } from './dictionaries/etymologyEnrichmentService';
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../utils/hebrewUtils';
import { HEBREW_PREFIXES_ORDERED } from '../constants/morphology';
import { pickBestDefinition } from '../utils/definitionCleaner';
// Grammar and morphological analysis
import { tryHebrewVerbAnalysis } from './analysis/grammarAnalysisService';
import { extractRootsWithAsyncValidation, getRootFamily } from './analysis/rootExtraction';
import { analyzeWordMorphology } from './analysis/morphologicalAnalysisService';
// Semantic field integration
import {
  SEMANTIC_DOMAINS,
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  getDomain
} from './scholarly/semanticFieldService';
// French translation support
import { translateEnglishToFrench } from './dictionaries/englishToFrenchService';
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
} from './scholarly/wordRelationshipService';
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

import { generateCitation, generateAllCitations, CITATION_FORMATS, generateSBLCitation, generateAcademicCitations, CROSS_REFERENCE_DB, getCrossReferences } from './unifiedLookup/databases';
import { UNCERTAINTY_LEVELS, generateScholarlyUncertainty, exportToJsonLD, exportToMarkdown, exportToFlashcard } from './unifiedLookup/export';
import { CONFIDENCE_SCORING, calculateConfidence } from './unifiedLookup/scoring';

// Ré-exports publics (surface historique inchangée)
export { generateCitation, generateAllCitations, CITATION_FORMATS, generateSBLCitation, generateAcademicCitations, CROSS_REFERENCE_DB, getCrossReferences };
export { CONFIDENCE_SCORING, calculateConfidence };
export { UNCERTAINTY_LEVELS, generateScholarlyUncertainty, exportToJsonLD, exportToMarkdown, exportToFlashcard };
export { LINGUISTIC_PERIODS, ARAMAIC_DIALECTS, HAPAX_DATABASE, COMPARATIVE_SEMITIC_DB, HISTORICAL_PERIODS, SEMANTIC_EVOLUTION_DB } from './unifiedLookup/databases';
import { LINGUISTIC_PERIODS, ARAMAIC_DIALECTS, HAPAX_DATABASE, COMPARATIVE_SEMITIC_DB, HISTORICAL_PERIODS, SEMANTIC_EVOLUTION_DB, analyzeDialectalPeriod, getHapaxInfo, isLikelyHapax, getComparativeSemiticData, getHistoricalUsageTimeline } from './unifiedLookup/databases';
export { analyzeDialectalPeriod, getHapaxInfo, isLikelyHapax, getComparativeSemiticData, getHistoricalUsageTimeline } from './unifiedLookup/databases';
export { cleanHebrewWord } from './dictionaries/hebrewDictionary';


// =============================================================================
// CONFIDENCE SCORING CONSTANTS
// =============================================================================

// État partagé (cache géré, dédup, variants) déplacé dans ./unifiedLookup/state.js.
import {
  lookupCache,
  pendingLookups,
  _variantCache,
  MAX_VARIANT_CACHE
} from './unifiedLookup/state';

// =============================================================================
// DICTIONARY LOOKUP FUNCTIONS
// =============================================================================

// Use canonical HEBREW_PREFIXES_ORDERED from morphology.js (DRY - single source of truth)
// Includes 3/4-letter prefix combos that the local copy was missing
const HEBREW_PREFIXES = HEBREW_PREFIXES_ORDERED;

// Cache for variant generation — avoids recomputing for each dictionary lookup

/**
 * PRO SCHOLAR V13: Generate all morphological variants for dictionary lookup
 * Handles: diacritics, finals, plurals, prefixes
 * Results are cached per word to avoid redundant computation across lookups.
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Array<{form: string, type: string}>} Variants with type info
 */
const generateLookupVariants = (word) => {
  if (_variantCache.has(word)) return _variantCache.get(word);
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

  // Cache the result (with size cap)
  if (_variantCache.size >= MAX_VARIANT_CACHE) _variantCache.clear();
  _variantCache.set(word, variants);
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
// DICTIONARY LOOKUP FACTORY - DRY pattern for all dictionary lookups
// =============================================================================
const createDictLookup = ({ name, source, getDef, getDict, entryFilter = () => true, enrich = () => ({}) }) => {
  const fn = (word, dicts) => {
    const dict = getDict(dicts);
    if (!dict) return null;
    const variants = generateLookupVariants(word);
    for (const { form, type } of variants) {
      const entry = dict[form];
      if (entry && entryFilter(entry, form)) {
        return {
          name, source, definition: getDef(entry),
          headword: entry.headword || entry.lemma || form,
          ...enrich(entry),
          _matchedForm: type !== 'exact' ? form : undefined,
          _matchType: type
        };
      }
    }
    return null;
  };
  Object.defineProperty(fn, 'name', { value: `lookup${name.replace(/[^a-zA-Z]/g, '')}` });
  return fn;
};

const lookupBDB = createDictLookup({
  name: 'BDB', source: 'BDB (1906)',
  getDict: (d) => d.bdb?.byWord || d.bdb,
  getDef: (e) => e.definition || e.gloss || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, strongNumber: e.strongNumber })
});

const lookupJastrowLocal = createDictLookup({
  name: 'Jastrow', source: 'Jastrow (1903)',
  getDict: (d) => d.jastrow,
  getDef: (e) => e.definition || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, isAramaic: e.isAramaic || e.language === 'Aramaic' })
});

const lookupStrongs = createDictLookup({
  name: "Strong's", source: "Strong's Concordance",
  getDict: (d) => d.strongs?.byWord || d.strongs,
  getDef: (e) => e.definition || e.kjv_def || e.strongs_def,
  enrich: (e) => ({ strongNumber: e.strongNumber || e.H })
});

const lookupCALLocal = createDictLookup({
  name: 'CAL', source: 'CAL (Comprehensive Aramaic Lexicon)',
  getDict: (d) => d.calAramaic,
  getDef: (e) => e.definition || e.english,
  enrich: () => ({ isAramaic: true, language: 'Aramaic' })
});

const lookupJastrowAramaic = createDictLookup({
  name: 'Jastrow (Aramaic)', source: 'Jastrow (1903) - Aramaic',
  getDict: (d) => d.jastrowAramaic,
  getDef: (e) => e.definition || e.english,
  enrich: (e) => ({ fullDefinition: e.fullDefinition, isAramaic: true, language: 'Aramaic', dialect: e.dialect || 'Babylonian' })
});

const lookupGesenius = createDictLookup({
  name: 'Gesenius', source: 'Gesenius (1910)',
  getDict: (d) => d.gesenius,
  getDef: (e) => e.definition || e.english,
  entryFilter: (_e, form) => form !== '_meta',
  enrich: (e) => ({ fullDefinition: e.fullDefinition, grammar: e.grammar_note || e.grammar, forms: e.forms, pattern: e.pattern, usage: e.usage, language: 'Hebrew', pos: e.pos })
});

const lookupKlein = createDictLookup({
  name: 'Klein', source: 'Klein (1987)',
  getDict: (d) => d.klein,
  getDef: (e) => e.definition || e.gloss,
  entryFilter: (_e, form) => form !== '_meta',
  enrich: (e) => ({ fullDefinition: e.fullDefinition, etymology: e.etymology, cognates: e.cognates, protoSemitic: e.protoSemitic, semanticField: e.semanticField, language: 'Hebrew', pos: e.pos })
});

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
    const analyses = analyzeWordMorphology?.(word);
    if (!analyses || analyses.length === 0) return null;

    // analyzeWordMorphology returns an array sorted by confidence — use the best
    const best = analyses[0];

    const normalized = {
      word,
      root: best.root,
      prefixes: best.prefix ? [best.prefix] : [],
      suffixes: best.suffix ? [best.suffix] : [],
      stem: best.root,
      pattern: best.type,
      binyan: best.binyan,
      language: best.language,
      confidence: best.confidence,
      translation: best.translation,
      breakdown: best.breakdown,
      allAnalyses: analyses.slice(0, 3)
    };
    normalized.description = formatMorphologyDescription(normalized);
    return normalized;
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

  // Check cache — le flag online est discriminant : un résultat enrichi
  // Sefaria/CAL ne doit pas masquer la version locale (et inversement)
  const cacheKey = `${cleaned}:${effectiveContext || 'default'}${includeOnline ? ':online' : ''}`;

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
        tier: 1,
        citation: academicEntry.citation
      }],
      language: academicEntry.isAramaic ? 'Aramaic' : 'Hebrew',
      offline: true,
      isAcademic: true,
      tier: 1
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
        tier: 4
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

// Étage preload déplacé dans ./unifiedLookup/preload.js (import + ré-export,
// le default object et les appels internes passent par les bindings locaux).
import {
  warmCache,
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus,
  isCached
} from './unifiedLookup/preload';
export { warmCache, preloadCommonWords, isPreloadComplete, getPreloadStatus, isCached };

// Étage enriched déplacé dans ./unifiedLookup/enriched.js (cycle paresseux).
import {
  lookupFullyEnrichedV3,
  lookupFullyEnriched,
  lookupWordEnriched,
  lookupParallel,
  getSourceComparison,
  rankDefinitionsByContext,
  lookupWithContextRanking,
  getWordRelationships,
  lookupWithRelationships
} from './unifiedLookup/enriched';
export {
  lookupFullyEnrichedV3,
  lookupFullyEnriched,
  lookupWordEnriched,
  lookupParallel,
  getSourceComparison,
  rankDefinitionsByContext,
  lookupWithContextRanking,
  getWordRelationships,
  lookupWithRelationships
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
