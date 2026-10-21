// =============================================================================
// Pipeline de lookup — createLookupStages, getPipeline, lookupWord,
// executeLookup, fetchOnlineSources (le cœur historique du service).
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  createStages
} from '../lookupStages';
import {
  tryHebrewVerbAnalysis
} from '../analysis/grammarAnalysisService';
import {
  createPipeline
} from '../lookupPipeline';
import {
  cleanHebrewWord
} from '../dictionaries/hebrewDictionary';
import {
  getContextFromReference
} from '../../constants/bookConstants';
import {
  recordLookup
} from '../telemetryService';
import {
  waitForPreload
} from '../dictionaries/dictionaryLoader';
import {
  extractRootsWithAsyncValidation
} from '../analysis/rootExtraction';
import {
  getCognates as getCuratedCognates,
  getCognatesAsync
} from '../comparativeSemiticService';
import {
  fetchWiktionaryEtymology,
  getProtoSemitic,
  lookupWiktionary
} from '../dictionaries/wiktionaryService';
import {
  IS_DEV as DEBUG
} from '../../utils/debug';
import {
  calculateConfidence
} from './scoring';
import {
  generateAllCitations
} from './databases';
import {
  SCHOLARLY_TIERS,
  calculateConsensus,
  generateSourceComparison,
  getSourceTier,
  raceWithEarlyReturn
} from '../scholarSourceAggregator';
import {
  lookupWordSefaria
} from '../dictionaries/scholarlyLexiconService';
import {
  lookupAramaicWord as lookupCalAramaic
} from '../dictionaries/calDictionaryService';
import { lookupCache, pendingLookups } from './state';
import { lookupAllLocalDictionaries } from './localAll';
import { getMorphology } from './morphology';
import { createEmptyResult } from './results';

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

export const getPipeline = () => {
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

