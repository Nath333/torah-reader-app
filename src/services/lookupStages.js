// =============================================================================
// PRO SCHOLAR V10: LOOKUP PIPELINE STAGES
// Composable lookup stages that integrate with existing dictionary services
// Enhanced with parallel source aggregation and scholarly consensus
// =============================================================================
//
// This module provides the 9 lookup stages that form the translation pipeline.
// Each stage is a pure function that modifies a LookupContext.
//
// STAGE ORDER (most specific → most general):
// 1. PreClassification      - Proper nouns, abbreviations, technical terms
// 2. HebrewVerbAnalysis     - Binyan detection (להביא → "to bring")
// 3. HalachicLookup         - Talmudic vocabulary with prefix handling
// 4. FunctionWordLookup     - Common particles (את, אל, על, כי, אשר)
// 5. LocalDictionaries      - Jastrow, BDB, Strong's, Klein, CAL
// 6. AramaicPatternAnalysis - Aramaic verb conjugation (תפיקו → Aphel נפק)
// 7. MorphologicalAnalysis  - Systematic prefix/suffix decomposition
// 8. MultiHypothesisLookup  - Root extraction with validation
// 9. PreClassificationFallback - Use preClass if all else failed
//
// USAGE:
//   import { createStages } from './lookupStages';
//   const stages = createStages({
//     lookupLocalDictionaries: (word, ctx) => { ... },
//     tryHebrewVerbAnalysis: (word) => { ... }
//   });
//
// Each stage can:
// - ctx.addSource({ name, definition, ... }) - Add a dictionary source
// - ctx.setPrimary(english, source) - Set primary translation
// - ctx.complete({ ...metadata }) - Mark complete, skip remaining stages
// - ctx.setMetadata({ key: value }) - Store additional data
//
// =============================================================================

import { namedStage, isValidHeadwordMatch } from './lookupPipeline';
import { preClassify } from './preClassificationService';
import { analyzeWordMorphology } from './morphologicalAnalysisService';
// PRO SCHOLAR V8: Renamed from unifiedRootService to rootExtraction
import { extractRootsWithDirectValidation } from './rootExtraction';
import { lookupHalachicWithPrefix } from '../utils/commentaryUtils';
import { pickBestDefinition } from '../utils/definitionCleaner';
import {
  lookupFunctionWord,
  extractAramaicRoot,
  computeVerbTranslation
} from '../constants/morphology';
import { createLogger } from '../utils/debug';
// PRO SCHOLAR V10: Scholarly source aggregation
import { getSourceTier } from './scholarSourceAggregator';

const log = createLogger('LookupStages');
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// STAGE FACTORY - Creates stages that work with external lookup functions
// =============================================================================

/**
 * Creates the array of pipeline stages with injected lookup dependencies.
 *
 * This factory pattern allows the stages to use lookup functions from the
 * main service without circular imports. The stages are pure functions that
 * operate on a LookupContext.
 *
 * @param {Object} lookups - Lookup function dependencies
 * @param {Function} lookups.lookupLocalDictionaries - (word, contextMode) => result
 * @param {Function} lookups.tryHebrewVerbAnalysis - (word) => result
 * @returns {Function[]} Array of 9 stage functions in execution order
 *
 * @example
 * const stages = createStages({
 *   lookupLocalDictionaries: myLookupFn,
 *   tryHebrewVerbAnalysis: myVerbAnalyzer
 * });
 *
 * // Use with pipeline
 * const ctx = new LookupContext('תורה');
 * for (const stage of stages) {
 *   if (ctx.isComplete) break;
 *   stage(ctx);
 * }
 */
export const createStages = (lookups) => {
  const {
    lookupLocalDictionaries,
    tryHebrewVerbAnalysis
  } = lookups;

  // =========================================================================
  // STAGE 1: Pre-classification
  // Catches proper nouns (משה=Moses), abbreviations (רש"י), technical terms
  // =========================================================================
  const stagePreClassification = namedStage('PreClassification', (ctx) => {
    const result = preClassify(ctx.cleaned, {
      reference: ctx.options.reference,
      textType: ctx.contextMode
    });

    if (!result) return;

    if (DEBUG) {
      log.debug(`[PreClassify] ${ctx.cleaned} → ${result.type}: ${result.english || result.meaning}`);
    }

    if (result.skipDictionary) {
      // Definitive match - complete immediately
      ctx.skipDictionary = true;
      ctx.setPrimary(result.english || result.meaning, result.source);
      ctx.addSource({
        name: result.source,
        fullName: result.source,
        definition: result.english || result.meaning,
        note: result.note,
        recommended: true,
        isProperNoun: result.type === 'proper_name',
        isAbbreviation: result.type === 'abbreviation'
      });
      ctx.complete({
        fullEnglish: result.note ? `${result.english || result.meaning} - ${result.note}` : null,
        isProperNoun: result.type === 'proper_name',
        isAbbreviation: result.type === 'abbreviation',
        isTechnicalTerm: result.type === 'technical_term',
        properNounType: result.subtype,
        expansion: result.expansion,
        _preClassified: true
      });
    } else {
      // Store for potential fallback
      ctx.metadata._preClassResult = result;
    }
  });

  // =========================================================================
  // STAGE 2: Hebrew verb binyan analysis
  // Detects verb patterns like להביא = Hiphil of בוא = "to bring"
  // =========================================================================
  const stageHebrewVerbAnalysis = namedStage('HebrewVerbAnalysis', (ctx) => {
    if (ctx.isComplete) return;

    const result = tryHebrewVerbAnalysis?.(ctx.cleaned);
    if (!result) return;

    if (DEBUG) {
      log.debug(`[HebrewVerb] ${ctx.cleaned} → ${result.binyan?.name} of ${result.root}: ${result.translation}`);
    }

    ctx.setPrimary(result.translation, result.source || 'Binyan Analysis');
    ctx.addSource({
      name: 'Binyan Analysis',
      fullName: `Hebrew ${result.binyan?.name || 'Verb'} Pattern`,
      definition: result.translation,
      recommended: true,
      root: result.root,
      binyan: result.binyan?.name
    });
    ctx.complete({
      fullEnglish: result.fullTranslation,
      root: result.root,
      binyan: result.binyan,
      morphologyInfo: result,
      _hebrewVerbAnalysis: true
    });
  });

  // =========================================================================
  // STAGE 3: Halachic/Talmudic vocabulary
  // Curated terms with prefix handling (e.g., בשבת = "on Shabbat")
  // =========================================================================
  const stageHalachicLookup = namedStage('HalachicLookup', (ctx) => {
    if (ctx.isComplete) return;

    const result = lookupHalachicWithPrefix(ctx.cleaned);
    if (!result) return;

    const fullDef = result.prefix ? `${result.prefix} ${result.definition}` : result.definition;

    ctx.addSource({
      name: result.source || 'Rabbinic',
      fullName: 'Rabbinic Context Dictionary',
      definition: fullDef,
      recommended: true
    });
    ctx.setPrimary(fullDef, result.source || 'Rabbinic');
    ctx.setMetadata({
      _halachicOverride: true,
      root: result.root,
      prefix: result.prefix
    });
    // Don't complete - continue to gather dictionary sources
  });

  // =========================================================================
  // STAGE 4: Function words (common particles)
  // את, אל, על, כי, אשר, etc.
  // =========================================================================
  const stageFunctionWordLookup = namedStage('FunctionWordLookup', (ctx) => {
    if (ctx.isComplete) return;

    const translation = lookupFunctionWord(ctx.cleaned);
    if (!translation) return;

    ctx.addSource({
      name: 'Rabbinic',
      fullName: 'Curated Rabbinic Vocabulary',
      definition: translation,
      recommended: true,
      isLocal: true
    });
    ctx.setPrimary(translation, 'Rabbinic');
    ctx.setMetadata({ _functionWord: true });
    // Don't complete - get academic dictionary sources too
  });

  // =========================================================================
  // STAGE 5: Local dictionaries (Jastrow, BDB, Strong's, Klein, CAL)
  // PRO SCHOLAR V10: Parallel aggregation with ALL sources + consensus
  // =========================================================================
  const stageLocalDictionaries = namedStage('LocalDictionaries', (ctx) => {
    if (ctx.isComplete || ctx.skipDictionary) return;

    // Try original word
    let localResult = lookupLocalDictionaries?.(ctx.cleaned, ctx.contextMode);

    // Fallback to root if we have one from halachic lookup
    if (!localResult?.sources?.length && ctx.metadata.root) {
      localResult = lookupLocalDictionaries?.(ctx.metadata.root, ctx.contextMode);
    }

    if (!localResult?.sources?.length) return;

    // Validate headword match
    const headword = localResult.headword || localResult.matchedForm;
    if (!isValidHeadwordMatch(headword, ctx.cleaned)) {
      if (DEBUG) {
        log.debug(`[LocalDict] Headword mismatch: "${headword}" vs query "${ctx.cleaned}"`);
      }
      return;
    }

    // PRO SCHOLAR V10: Enrich sources with tier info and add ALL sources
    const validSources = localResult.sources
      .filter(s => s.definition)
      .map(s => {
        const tier = getSourceTier(s.name);
        return {
          ...s,
          tier: tier.level,
          tierName: tier.name,
          tierWeight: tier.weight
        };
      })
      // Sort by tier (academic sources first)
      .sort((a, b) => a.tier - b.tier);

    // Add all valid sources (will be used for consensus)
    ctx.addSources(validSources);

    // PRO SCHOLAR V10: Track alternatives for scholarly comparison
    // First source becomes primary, rest are alternatives
    if (validSources.length > 1) {
      for (let i = 1; i < validSources.length; i++) {
        ctx.addAlternative(validSources[i]);
      }

      if (DEBUG) {
        log.debug(`[LocalDict] Found ${validSources.length} sources for "${ctx.cleaned}"`);
        log.debug(`[LocalDict] Primary: ${validSources[0].name}, Alternatives: ${validSources.slice(1).map(s => s.name).join(', ')}`);
      }
    }

    // Set primary if not yet set (prefer tier 1 source)
    if (localResult.english) {
      const primarySource = validSources[0] || localResult;
      ctx.setPrimary(
        pickBestDefinition(primarySource.definition || localResult.english) || localResult.english,
        primarySource.name || localResult.source
      );
    }

    ctx.setMetadata({
      fullEnglish: localResult.fullDefinition,
      headword: localResult.headword,
      isAramaic: localResult.isAramaic,
      language: localResult.language,
      // PRO SCHOLAR V10: Track source count for UI
      _sourceCount: validSources.length,
      _hasTier1Source: validSources.some(s => s.tier === 1)
    });
  });

  // =========================================================================
  // STAGE 6: Aramaic verb pattern analysis
  // For conjugated forms like תפיקו → Aphel of נפק = "to bring out"
  // =========================================================================
  const stageAramaicPatternAnalysis = namedStage('AramaicPatternAnalysis', (ctx) => {
    if (ctx.isComplete || ctx.primaryEnglish || !ctx.isAramaic) return;

    const rootAnalysis = extractAramaicRoot(ctx.cleaned);
    if (!rootAnalysis || rootAnalysis.confidence < 70 || !rootAnalysis.root) return;

    const translation = computeVerbTranslation(rootAnalysis);
    if (!translation) return;

    // Try to get scholarly source for the root
    const rootLookup = lookupLocalDictionaries?.(rootAnalysis.root);

    if (rootLookup?.english) {
      ctx.addSource({
        name: (rootLookup.source || 'Dictionary').replace(' (Local)', ''),
        fullName: `Root "${rootAnalysis.root}" from ${rootLookup.source}`,
        definition: rootLookup.english,
        isRootSource: true
      });
    }
    ctx.addSource({
      name: 'Pattern Analysis',
      fullName: 'Aramaic Verb Pattern Analysis',
      definition: `${rootAnalysis.pattern} of root ${rootAnalysis.root}${rootAnalysis.weakType ? ` (${rootAnalysis.weakType})` : ''}`
    });

    const sourceName = rootLookup?.source ? `${rootLookup.source} + pattern` : 'pattern-analysis';
    ctx.setPrimary(translation, sourceName);
    ctx.complete({
      isAramaic: true,
      language: 'Aramaic',
      root: rootAnalysis.root,
      morphologyInfo: {
        ...rootAnalysis,
        rootSource: rootLookup?.source || 'ROOT_MEANINGS',
        rootDefinition: rootLookup?.english || rootAnalysis.baseMeaning
      },
      derivationChain: {
        originalWord: ctx.cleaned,
        extractedRoot: rootAnalysis.root,
        pattern: rootAnalysis.pattern,
        finalTranslation: translation
      },
      confidence: rootAnalysis.confidence
    });
  });

  // =========================================================================
  // STAGE 7: Morphological analysis
  // Systematic decomposition for complex affixes, possessives, binyanim
  // =========================================================================
  const stageMorphologicalAnalysis = namedStage('MorphologicalAnalysis', (ctx) => {
    if (ctx.isComplete || ctx.primaryEnglish) return;

    const analyses = analyzeWordMorphology(ctx.cleaned, {
      isAramaic: ctx.isAramaic,
      context: ctx.contextMode
    });

    const best = analyses?.[0];
    if (!best || best.confidence < 65) return;

    // Build morphology breakdown
    const morphBreakdown = [];
    if (best.prefix) morphBreakdown.push(`${best.prefix.text} (${best.prefix.meaning})`);
    if (best.root) morphBreakdown.push(`${best.root} (root)`);
    if (best.suffix) morphBreakdown.push(`${best.suffix.text} (${best.suffix.meaning})`);

    ctx.addSource({
      name: 'Morphological Analysis',
      tier: 'analysis',
      definition: best.translation,
      analysis: best.analysisType,
      confidence: best.confidence
    });
    ctx.setPrimary(best.translation, best.source || 'morphological_analysis');
    ctx.complete({
      isAramaic: ctx.isAramaic || best.isAramaic,
      language: (ctx.isAramaic || best.isAramaic) ? 'Aramaic' : 'Hebrew',
      morphology: {
        breakdown: morphBreakdown.join(' + '),
        prefix: best.prefix,
        root: best.root,
        suffix: best.suffix,
        rootMeaning: best.rootMeaning,
        pattern: best.pattern,
        binyan: best.binyan
      },
      allAnalyses: analyses.slice(0, 3),
      confidence: best.confidence
    });
  });

  // =========================================================================
  // STAGE 8: Multi-hypothesis root extraction
  // Generates all possible roots and validates against dictionaries
  // =========================================================================
  const stageMultiHypothesisLookup = namedStage('MultiHypothesisLookup', (ctx) => {
    if (ctx.isComplete || ctx.primaryEnglish) return;

    const result = extractRootsWithDirectValidation(ctx.cleaned, {
      contextType: ctx.contextMode || 'unknown',
      skipStrongs: ctx.contextMode === 'talmudic' || ctx.contextMode === 'midrashic'
    });

    if (!result?.bestMatch) return;

    const best = result.bestMatch;
    if (DEBUG) {
      log.debug(`[MultiHyp] ${ctx.cleaned} → root "${best.root}" (${best.confidence}%): ${best.definition}`);
    }

    // Build morphology breakdown
    const morphBreakdown = [];
    for (const p of (best.morphology?.prefixes || [])) {
      morphBreakdown.push(`${p.letters} (${p.meaning})`);
    }
    morphBreakdown.push(`${best.root} (root)`);
    for (const s of (best.morphology?.suffixes || [])) {
      morphBreakdown.push(`${s.letters} (${s.meaning})`);
    }

    // Add sources
    if (best.sources?.length) {
      ctx.addSources(best.sources);
    } else {
      ctx.addSource({
        name: 'Multi-Hypothesis Analysis',
        fullName: `Root "${best.root}" via ${best.note || 'pattern analysis'}`,
        definition: best.definition,
        confidence: best.confidence,
        recommended: true
      });
    }

    ctx.setPrimary(best.definition, best.source || 'Multi-Hypothesis');
    ctx.complete({
      root: best.root,
      morphology: {
        breakdown: morphBreakdown.join(' + '),
        hypothesisId: best.id,
        pattern: best.morphology?.pattern,
        binyan: best.morphology?.binyan,
        nounPattern: best.morphology?.nounPattern,
        weakType: best.morphology?.weakType
      },
      alternativeRoots: result.allMatches.slice(1, 4).map(m => ({
        root: m.root,
        definition: m.definition,
        confidence: m.confidence
      })),
      confidence: best.confidence,
      _multiHypothesis: true
    });
  });

  // =========================================================================
  // STAGE 9: Pre-classification fallback
  // Use stored preClassResult if all dictionary lookups failed
  // =========================================================================
  const stagePreClassificationFallback = namedStage('PreClassificationFallback', (ctx) => {
    if (ctx.isComplete || ctx.primaryEnglish) return;

    const preClass = ctx.metadata._preClassResult;
    if (!preClass || (!preClass.english && !preClass.meaning)) return;

    if (DEBUG) {
      log.debug(`[PreClassFallback] ${ctx.cleaned} → ${preClass.type}`);
    }

    ctx.addSource({
      name: preClass.source || 'Pre-Classification',
      fullName: preClass.source || 'Morphological Analysis',
      definition: preClass.english || preClass.meaning,
      note: preClass.note,
      recommended: true,
      root: preClass.root,
      binyan: preClass.binyan
    });
    ctx.setPrimary(preClass.english || preClass.meaning, preClass.source || 'Pre-Classification');
    ctx.complete({
      fullEnglish: preClass.note ? `${preClass.english || preClass.meaning} - ${preClass.note}` : null,
      root: preClass.root,
      binyan: preClass.binyan ? { name: preClass.binyan } : null,
      morphologyInfo: {
        tense: preClass.tense,
        person: preClass.person,
        binyan: preClass.binyan
      },
      _preClassifiedFallback: true
    });
  });

  // Return all stages in execution order
  return [
    stagePreClassification,
    stageHebrewVerbAnalysis,
    stageHalachicLookup,
    stageFunctionWordLookup,
    stageLocalDictionaries,
    stageAramaicPatternAnalysis,
    stageMorphologicalAnalysis,
    stageMultiHypothesisLookup,
    stagePreClassificationFallback
  ];
};

// =============================================================================
// STAGE NAMES (for documentation and debugging)
// =============================================================================

export const STAGE_ORDER = [
  'PreClassification',        // 1. Proper nouns, abbreviations
  'HebrewVerbAnalysis',       // 2. Binyan patterns (להביא → bring)
  'HalachicLookup',           // 3. Talmudic terms
  'FunctionWordLookup',       // 4. Common particles (את, אל, על)
  'LocalDictionaries',        // 5. Jastrow, BDB, Strong's, Klein
  'AramaicPatternAnalysis',   // 6. Aramaic verb conjugation
  'MorphologicalAnalysis',    // 7. Systematic decomposition
  'MultiHypothesisLookup',    // 8. Root validation
  'PreClassificationFallback' // 9. Use preClass if all else fails
];

export default createStages;
