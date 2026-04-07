// =============================================================================
// PRO SCHOLAR V10: LOOKUP PIPELINE ARCHITECTURE
// Clean, composable orchestration with discrete lookup stages
// Enhanced with parallel source aggregation and expert consensus scoring
// =============================================================================
//
// This module provides the core infrastructure for Hebrew/Aramaic word lookup:
//
// MAIN COMPONENTS:
// - LookupContext: State carrier through the pipeline (immutable-style)
// - createPipeline: Factory for pipeline functions
// - runPipelineWithContext: Execute stages on existing context
// - Stage helpers: namedStage, safeStage, conditionalStage
//
// USAGE:
//   import { LookupContext, runPipelineWithContext } from './lookupPipeline';
//   import { createStages } from './lookupStages';
//
//   const ctx = new LookupContext('תורה', { contextMode: 'biblical' });
//   const stages = createStages({ lookupLocalDictionaries, tryHebrewVerbAnalysis });
//   runPipelineWithContext(ctx, stages);
//   const result = ctx.buildResult();
//
// =============================================================================

import { cleanHebrewWord } from './hebrewDictionary';
import { isLikelyAramaic } from './babylonianDictionary';
import { getContextFromReference } from '../constants/bookConstants';
import { createLogger } from '../utils/debug';
// PRO SCHOLAR V9: Use centralized Hebrew utilities (single source of truth)
import {
  isValidHeadwordMatch as _isValidHeadwordMatch,
  SIMILARITY_THRESHOLD
} from '../utils/hebrewUtils';
// Scholarly source aggregation with consensus scoring
import {
  calculateConsensus,
  getSourceTier,
  formatConsensusForUI
} from './scholarSourceAggregator';

const log = createLogger('LookupPipeline');
const DEBUG = process.env.NODE_ENV === 'development';

/** Minimum word length to require validation */
const MIN_VALIDATION_LENGTH = 3;

/** Base result structure - shared by all result builders */
const createBaseResult = (word, cleaned, isAramaic) => ({
  word,
  cleanedWord: cleaned,
  english: null,
  french: null,
  frenchSource: 'none',
  source: 'none',
  sources: [],
  isAramaic,
  language: isAramaic ? 'Aramaic' : 'Hebrew',
  sefariaData: null
});

/** Helper to set function name for debugging */
const setFunctionName = (fn, name) => {
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};

// =============================================================================
// LOOKUP CONTEXT - State carrier through the pipeline
// =============================================================================

/**
 * LookupContext - Immutable-style state carrier through the lookup pipeline
 *
 * This class is the central state manager for word lookups. Each lookup creates
 * a new context that flows through pipeline stages, accumulating results.
 *
 * @example
 * const ctx = new LookupContext('תורה', { contextMode: 'biblical' });
 * ctx.addSource({ name: 'BDB', definition: 'law, instruction' });
 * ctx.setPrimary('Torah', 'BDB');
 * const result = ctx.buildResult();
 *
 * PRO SCHOLAR V10 ENHANCEMENTS:
 * - Parallel source aggregation support
 * - Expert consensus scoring with tier weighting
 * - Alternative sources for scholarly comparison
 * - Source tier tracking (Tier 1: BDB/Jastrow, Tier 2: Klein, etc.)
 *
 * DESIGN BENEFITS:
 * - All state in one place (no scattered variables)
 * - Easy to debug (log ctx at any point in pipeline)
 * - Easy to test (mock/inject context)
 * - Clear data flow through stages
 * - Automatic deduplication of sources
 *
 * @class
 * @property {string} originalWord - The original input word
 * @property {string} cleaned - Cleaned word (no nikud, cantillation)
 * @property {Object} options - Lookup options passed by caller
 * @property {string|null} contextMode - 'talmudic', 'biblical', or null
 * @property {boolean} isAramaic - Whether word appears to be Aramaic
 * @property {Array} sources - Accumulated source objects
 * @property {string|null} primaryEnglish - Primary translation
 * @property {string} primarySource - Name of primary source
 * @property {Object} metadata - Additional metadata from stages
 * @property {Array} allSources - All sources for scholarly comparison
 * @property {Array} alternatives - Alternative interpretations
 * @property {Object|null} consensus - Expert consensus analysis
 * @property {boolean} isComplete - Whether to skip remaining stages
 */
export class LookupContext {
  constructor(word, options = {}) {
    // === INPUT ===
    this.originalWord = word;
    this.cleaned = cleanHebrewWord(word);
    this.options = options;

    // === DERIVED CONTEXT (computed once) ===
    this.contextMode = options.contextMode ||
      (options.reference ? getContextFromReference(options.reference) : null);
    this.isAramaic = this.cleaned ? isLikelyAramaic(this.cleaned) : false;

    // === RESULT ACCUMULATION ===
    this.sources = [];
    this.primaryEnglish = null;
    this.primarySource = 'none';
    this.metadata = {};

    // === PRO SCHOLAR V10: SCHOLARLY AGGREGATION ===
    this.allSources = [];           // All sources found (for parallel aggregation)
    this.alternatives = [];         // Alternative interpretations
    this.consensus = null;          // Expert consensus analysis
    this.sourceTiers = new Map();   // Track tier for each source

    // === PIPELINE CONTROL ===
    this.isComplete = false;      // Skip remaining stages
    this.skipDictionary = false;  // Skip dictionary lookups (e.g., for proper nouns)

    // === DEBUG ===
    this.stagesExecuted = [];
  }

  /** Check if word is valid for lookup (at least 2 chars after cleaning) */
  isValid() {
    return !!(this.cleaned && this.cleaned.length >= 2);
  }

  /** Add a source (auto-deduplicated by name+definition) */
  addSource(source) {
    if (!source?.definition) return false;

    const isDupe = this.sources.some(s =>
      s.name === source.name && s.definition === source.definition
    );
    if (isDupe) return false;

    // PRO SCHOLAR V10: Track source tier
    const tier = getSourceTier(source.name);
    this.sourceTiers.set(source.name, tier);

    // Enrich source with tier info
    const enrichedSource = {
      ...source,
      tier: tier.level,
      tierName: tier.name,
      tierWeight: tier.weight
    };

    this.sources.push(enrichedSource);
    this.allSources.push(enrichedSource);
    return true;
  }

  /** Add multiple sources */
  addSources(sources) {
    if (!Array.isArray(sources)) return;
    for (const src of sources) {
      this.addSource(src);
    }
  }

  // =========================================================================
  // PRO SCHOLAR V10: SCHOLARLY AGGREGATION METHODS
  // =========================================================================

  /**
   * Set aggregated sources from parallel lookup
   * @param {Array} sources - All sources from parallel aggregation
   */
  setAggregatedSources(sources) {
    if (!Array.isArray(sources)) return;

    this.allSources = sources.map(src => ({
      ...src,
      tier: getSourceTier(src.name)
    }));

    // Sort by tier (best first)
    this.allSources.sort((a, b) => a.tier.level - b.tier.level);

    // Compute consensus
    this.consensus = calculateConsensus(this.allSources);

    // Set primary from best source if not already set
    if (!this.primaryEnglish && this.allSources.length > 0) {
      const best = this.allSources[0];
      this.primaryEnglish = best.definition;
      this.primarySource = best.name;
    }

    // Set alternatives (all except primary)
    this.alternatives = this.allSources.slice(1);

    // Add to regular sources array for backward compatibility
    for (const src of this.allSources) {
      if (!this.sources.some(s => s.name === src.name && s.definition === src.definition)) {
        this.sources.push(src);
      }
    }
  }

  /**
   * Add an alternative interpretation
   * @param {Object} alternative - Alternative source/interpretation
   */
  addAlternative(alternative) {
    if (!alternative?.definition) return;

    const isDupe = this.alternatives.some(a =>
      a.name === alternative.name && a.definition === alternative.definition
    );
    if (isDupe) return;

    const tier = getSourceTier(alternative.name);
    this.alternatives.push({
      ...alternative,
      tier: tier.level,
      tierName: tier.name
    });
  }

  /**
   * Compute and store consensus from current sources
   */
  computeConsensus() {
    const sourcesForConsensus = this.allSources.length > 0
      ? this.allSources
      : this.sources;

    this.consensus = calculateConsensus(sourcesForConsensus);
    return this.consensus;
  }

  /**
   * Check if we have strong scholarly consensus
   * @returns {boolean}
   */
  hasStrongConsensus() {
    if (!this.consensus) this.computeConsensus();
    return this.consensus?.level?.level === 'strong';
  }

  /**
   * Get the number of academic (tier 1-2) sources
   * @returns {number}
   */
  getAcademicSourceCount() {
    return this.allSources.filter(s => s.tier?.level <= 2).length;
  }

  /**
   * Check if there are divergent scholarly opinions
   * @returns {boolean}
   */
  hasDivergentOpinions() {
    if (!this.consensus) this.computeConsensus();
    return (this.consensus?.divergentOpinions?.length || 0) > 0;
  }

  /**
   * Build scholarly flags object (computed once for efficiency)
   * @returns {Object} Scholarly metadata flags
   * @private
   */
  _buildScholarlyFlags() {
    const academicCount = this.getAcademicSourceCount();
    return {
      hasMultipleSources: this.sources.length > 1,
      hasAcademicSource: academicCount > 0,
      academicSourceCount: academicCount,
      hasDivergentOpinions: this.hasDivergentOpinions(),
      consensusLevel: this.consensus?.level?.level || 'unknown',
      consensusScore: this.consensus?.weightedScore || 0
    };
  }

  /** Set primary result (only if not already set) */
  setPrimary(english, source) {
    if (!this.primaryEnglish && english) {
      this.primaryEnglish = english;
      this.primarySource = source;
      return true;
    }
    return false;
  }

  /** Set metadata fields */
  setMetadata(fields) {
    Object.assign(this.metadata, fields);
  }

  /** Mark lookup as complete - skip remaining pipeline stages */
  complete(extraMetadata = {}) {
    this.isComplete = true;
    Object.assign(this.metadata, extraMetadata);
  }

  /** Check if we have any result */
  hasResult() {
    return this.primaryEnglish !== null || this.sources.length > 0;
  }

  /** Build standardized result object */
  buildResult(overrides = {}) {
    const m = this.metadata;

    // PRO SCHOLAR V10: Ensure consensus is computed
    if (!this.consensus && (this.sources.length > 0 || this.allSources.length > 0)) {
      this.computeConsensus();
    }

    return {
      // Core
      word: this.originalWord,
      cleanedWord: this.cleaned,
      english: this.primaryEnglish,
      fullEnglish: m.fullEnglish || null,
      french: null,
      frenchSource: 'none',
      source: this.primarySource,
      sources: this.sources,

      // Linguistic
      headword: m.headword || null,
      root: m.root || null,
      binyan: m.binyan || null,
      prefix: m.prefix || null,

      // Language
      isAramaic: this.isAramaic || m.isAramaic || false,
      language: m.language || (this.isAramaic ? 'Aramaic' : 'Hebrew'),

      // Morphology
      morphology: m.morphology || null,
      morphologyInfo: m.morphologyInfo || null,
      alternativeRoots: m.alternativeRoots || null,
      derivationChain: m.derivationChain || null,

      // Classification
      isProperNoun: m.isProperNoun || false,
      isAbbreviation: m.isAbbreviation || false,
      isTechnicalTerm: m.isTechnicalTerm || false,

      // Status
      sefariaData: null,
      offline: true,
      isLoading: false,
      confidence: m.confidence || null,

      // =====================================================================
      // PRO SCHOLAR V10: SCHOLARLY AGGREGATION
      // =====================================================================

      // All sources for scholarly comparison (sorted by tier)
      allSources: this.allSources,

      // Alternative interpretations for scholarly display
      alternatives: this.alternatives,

      // Expert consensus analysis
      consensus: this.consensus,
      consensusUI: this.consensus ? formatConsensusForUI(this.consensus) : null,

      // Quick access scholarly flags (computed once for efficiency)
      scholarly: this._buildScholarlyFlags(),

      // Debug (dev only)
      ...(DEBUG ? { _stagesExecuted: this.stagesExecuted } : {}),
      ...overrides
    };
  }

  /** Build "not found / still loading" result */
  buildLoadingResult() {
    return {
      ...createBaseResult(this.originalWord, this.cleaned, this.isAramaic),
      isLoading: true
    };
  }

  /** Build empty/invalid result */
  buildEmptyResult() {
    return {
      ...createBaseResult(this.originalWord, this.cleaned, false),
      isLoading: false
    };
  }
}

// =============================================================================
// HEADWORD VALIDATION - Delegates to centralized hebrewUtils
// =============================================================================

/**
 * Validate headword match against query word
 * PRO SCHOLAR V9: Delegates to hebrewUtils.isValidHeadwordMatch (LCS algorithm)
 *
 * @param {string} headword - Dictionary entry's headword/lemma
 * @param {string} query - Original search term
 * @returns {boolean} - True if headword is a valid match
 */
export const isValidHeadwordMatch = (headword, query) => {
  // Skip validation for very short words
  if (!query || query.length < MIN_VALIDATION_LENGTH) return true;
  return _isValidHeadwordMatch(headword, query, SIMILARITY_THRESHOLD);
};

// =============================================================================
// PIPELINE RUNNER
// =============================================================================

/**
 * Execute stages on a context (shared logic for pipeline runners)
 * @param {LookupContext} ctx - The context to process
 * @param {Function[]} stages - Array of stage functions
 */
const executeStages = (ctx, stages) => {
  for (const stage of stages) {
    if (ctx.isComplete) break;

    try {
      stage(ctx);
      ctx.stagesExecuted.push(stage.name || 'anonymous');
    } catch (err) {
      if (DEBUG) {
        log.debug(`[Pipeline] Error in ${stage.name}: ${err.message}`);
      }
    }
  }
};

/**
 * Create a pipeline from an array of stage functions
 * Each stage is a function: (ctx) => void
 * Stages modify ctx in place and can set ctx.isComplete to stop early
 *
 * @param {Function[]} stages - Array of stage functions
 * @returns {Function} - Pipeline function that takes (word, options) and returns result
 */
export const createPipeline = (stages) => {
  return (word, options = {}) => {
    const ctx = new LookupContext(word, options);

    if (!ctx.isValid()) {
      return ctx.buildEmptyResult();
    }

    executeStages(ctx, stages);

    return ctx.hasResult() ? ctx.buildResult() : ctx.buildLoadingResult();
  };
};

/**
 * Run a pipeline with an existing context
 * Useful for testing or when you need more control
 *
 * @param {LookupContext} ctx - Existing context
 * @param {Function[]} stages - Array of stage functions
 * @returns {LookupContext} - The modified context
 */
export const runPipelineWithContext = (ctx, stages) => {
  executeStages(ctx, stages);
  return ctx;
};

// =============================================================================
// STAGE HELPERS - Utilities for building stages
// =============================================================================

/**
 * Create a stage that only runs if a condition is met
 * @param {Function} condition - (ctx) => boolean
 * @param {Function} stage - The stage to run
 * @returns {Function} - Conditional stage
 */
export const conditionalStage = (condition, stage) =>
  setFunctionName(
    (ctx) => { if (condition(ctx)) stage(ctx); },
    `conditional_${stage.name || 'anonymous'}`
  );

/**
 * Create a stage that wraps another with error handling
 * @param {Function} stage - The stage to wrap
 * @param {string} sourceName - Name for error reporting
 * @returns {Function} - Safe stage
 */
export const safeStage = (stage, sourceName) =>
  setFunctionName(
    (ctx) => {
      try {
        stage(ctx);
      } catch (err) {
        log.warn(`[${sourceName}] Stage failed for "${ctx.cleaned}": ${err.message}`);
      }
    },
    `safe_${stage.name || sourceName}`
  );

/**
 * Create a named stage with logging
 * @param {string} name - Stage name
 * @param {Function} fn - Stage implementation
 * @returns {Function} - Named stage with logging
 */
export const namedStage = (name, fn) =>
  setFunctionName(
    (ctx) => {
      if (DEBUG) log.debug(`[Stage:${name}] Processing "${ctx.cleaned}"`);
      const hadResult = ctx.hasResult();
      fn(ctx);
      if (DEBUG && !hadResult && ctx.hasResult()) {
        log.debug(`[Stage:${name}] Found: ${ctx.primaryEnglish?.substring(0, 50)}`);
      }
    },
    name
  );

// =============================================================================
// EXPORTS
// =============================================================================

const lookupPipeline = {
  LookupContext,
  isValidHeadwordMatch,
  createPipeline,
  runPipelineWithContext,
  conditionalStage,
  safeStage,
  namedStage
};

export default lookupPipeline;
