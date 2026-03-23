// =============================================================================
// PRO SCHOLAR V10: SCHOLARLY SOURCE AGGREGATOR
// Parallel source fetching with expert consensus scoring
// =============================================================================

import { createLogger } from '../utils/debug';
import { areSimilarWords, normalizeFinals } from '../utils/hebrewUtils';
// PRO SCHOLAR V10.3: Cache removed - caching delegated to unifiedLookupService

const log = createLogger('SourceAggregator');
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// SOURCE TIERS & SCHOLARLY WEIGHTS
// =============================================================================

/**
 * Academic credibility tiers with weights for consensus scoring
 * Higher tier = more weight in scholarly consensus
 */
export const SCHOLARLY_TIERS = {
  TIER_1_ACADEMIC: {
    level: 1,
    name: 'Peer-Reviewed Academic',
    weight: 1.0,
    // PRO SCHOLAR V11: Added DJBA & DJPA (Sokoloff's definitive Aramaic dictionaries)
    sources: ['BDB', 'Jastrow', 'HALOT', 'CAL', 'DJBA', 'DJPA'],
    description: 'Primary academic lexicons with peer review'
  },
  TIER_2_SCHOLARLY: {
    level: 2,
    name: 'Established Scholarly',
    weight: 0.85,
    // PRO SCHOLAR V11: Added Targum lexicon
    sources: ['Klein', 'Gesenius', 'TWOT', 'Koehler', 'Targum'],
    description: 'Respected scholarly references'
  },
  TIER_3_REFERENCE: {
    level: 3,
    name: 'Standard Reference',
    weight: 0.70,
    sources: ["Strong's", 'Strongs'],
    description: 'Widely-used concordance tools'
  },
  TIER_4_MODERN: {
    level: 4,
    name: 'Modern/Popular',
    weight: 0.55,
    sources: ['Sefaria', 'Steinsaltz', 'Artscroll'],
    description: 'Contemporary resources'
  }
};

// Pre-computed source-to-tier mapping for O(1) lookup
const SOURCE_TIER_MAP = (() => {
  const map = new Map();
  for (const tier of Object.values(SCHOLARLY_TIERS)) {
    for (const src of tier.sources) {
      map.set(src.toLowerCase().replace(/[^a-z]/g, ''), tier);
    }
  }
  return map;
})();

/**
 * Get tier info for a source (O(1) lookup with memoization)
 * @param {string} sourceName - Name of the dictionary source
 * @returns {Object} Tier configuration
 */
export const getSourceTier = (sourceName) => {
  if (!sourceName) return SCHOLARLY_TIERS.TIER_4_MODERN;

  const normalizedName = sourceName.toLowerCase().replace(/[^a-z]/g, '');

  // Direct match
  if (SOURCE_TIER_MAP.has(normalizedName)) {
    return SOURCE_TIER_MAP.get(normalizedName);
  }

  // Partial match (e.g., "BDB (Local)" matches "bdb")
  for (const [key, tier] of SOURCE_TIER_MAP) {
    if (normalizedName.includes(key)) {
      return tier;
    }
  }

  return SCHOLARLY_TIERS.TIER_4_MODERN;
};

// =============================================================================
// CONSENSUS SCORING ALGORITHMS
// =============================================================================

/** Minimum similarity score (0-100) for definitions to be considered agreeing */
const DEFINITION_SIMILARITY_THRESHOLD = 60;

/**
 * Consensus levels based on source agreement
 */
export const CONSENSUS_LEVELS = {
  STRONG: {
    level: 'strong',
    label: 'Strong Scholarly Consensus',
    icon: '✓✓✓',
    minSources: 3,
    minTier1Sources: 2,
    description: 'Multiple academic sources agree on core meaning'
  },
  MODERATE: {
    level: 'moderate',
    label: 'Moderate Consensus',
    icon: '✓✓',
    minSources: 2,
    minTier1Sources: 1,
    description: 'Academic sources with some agreement'
  },
  WEAK: {
    level: 'weak',
    label: 'Limited Consensus',
    icon: '✓',
    minSources: 1,
    minTier1Sources: 0,
    description: 'Single source or disagreement between sources'
  },
  DISPUTED: {
    level: 'disputed',
    label: 'Scholarly Dispute',
    icon: '⚡',
    minSources: 2,
    minTier1Sources: 0,
    description: 'Sources significantly disagree on meaning'
  }
};

/**
 * Extract core semantic meaning from a definition for comparison
 * Removes grammatical markers, examples, cross-references
 */
const extractCoreMeaning = (definition) => {
  if (!definition) return '';

  // Remove common prefixes/suffixes that don't affect core meaning
  let core = definition
    .toLowerCase()
    .replace(/^(to |a |an |the )/i, '')
    .replace(/\([^)]*\)/g, '') // Remove parentheticals
    .replace(/;.*$/, '') // Take first meaning only
    .replace(/,.*$/, '') // Take first meaning only
    .replace(/\s+/g, ' ')
    .trim();

  // Extract first 2-3 significant words
  const words = core.split(' ').slice(0, 3);
  return words.join(' ');
};

/**
 * Calculate semantic similarity between two definitions
 * Returns 0-100 score
 */
const calculateDefinitionSimilarity = (def1, def2) => {
  if (!def1 || !def2) return 0;

  const core1 = extractCoreMeaning(def1);
  const core2 = extractCoreMeaning(def2);

  if (core1 === core2) return 100;

  // Word overlap calculation
  const words1 = new Set(core1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(core2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  // Jaccard similarity * 100
  return Math.round((intersection / union) * 100);
};

/**
 * Calculate expert consensus across multiple sources
 * @param {Array} sources - Array of source objects with { name, definition, ... }
 * @returns {Object} Consensus analysis
 */
export const calculateConsensus = (sources) => {
  if (!sources || sources.length === 0) {
    return {
      level: CONSENSUS_LEVELS.WEAK,
      score: 0,
      agreementCount: 0,
      totalSources: 0,
      weightedScore: 0,
      primaryMeaning: null,
      divergentOpinions: [],
      analysisNotes: ['No sources available']
    };
  }

  // Enrich sources with tier info
  const enrichedSources = sources.map(src => ({
    ...src,
    tier: getSourceTier(src.name),
    coreMeaning: extractCoreMeaning(src.definition)
  }));

  // Count tier 1 sources
  const tier1Sources = enrichedSources.filter(s => s.tier.level === 1);
  const tier2Sources = enrichedSources.filter(s => s.tier.level === 2);

  // Group sources by similar meaning
  const meaningGroups = [];

  for (const source of enrichedSources) {
    let foundGroup = false;

    for (const group of meaningGroups) {
      const similarity = calculateDefinitionSimilarity(
        group[0].definition,
        source.definition
      );

      if (similarity >= DEFINITION_SIMILARITY_THRESHOLD) {
        group.push(source);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      meaningGroups.push([source]);
    }
  }

  // Sort groups by weighted score (prefer groups with tier 1 sources)
  meaningGroups.sort((a, b) => {
    const scoreA = a.reduce((sum, s) => sum + s.tier.weight, 0);
    const scoreB = b.reduce((sum, s) => sum + s.tier.weight, 0);
    return scoreB - scoreA;
  });

  const primaryGroup = meaningGroups[0] || [];
  const divergentGroups = meaningGroups.slice(1);

  // Calculate weighted agreement score
  const totalWeight = enrichedSources.reduce((sum, s) => sum + s.tier.weight, 0);
  const primaryWeight = primaryGroup.reduce((sum, s) => sum + s.tier.weight, 0);
  const weightedScore = totalWeight > 0 ? Math.round((primaryWeight / totalWeight) * 100) : 0;

  // Determine consensus level
  let consensusLevel;
  const primaryTier1Count = primaryGroup.filter(s => s.tier.level === 1).length;

  if (primaryGroup.length >= 3 && primaryTier1Count >= 2) {
    consensusLevel = CONSENSUS_LEVELS.STRONG;
  } else if (primaryGroup.length >= 2 && primaryTier1Count >= 1) {
    consensusLevel = CONSENSUS_LEVELS.MODERATE;
  } else if (divergentGroups.length > 0 && divergentGroups[0].length >= primaryGroup.length) {
    consensusLevel = CONSENSUS_LEVELS.DISPUTED;
  } else {
    consensusLevel = CONSENSUS_LEVELS.WEAK;
  }

  // Build analysis notes
  const notes = [];

  if (tier1Sources.length > 0) {
    notes.push(`${tier1Sources.length} academic lexicon${tier1Sources.length > 1 ? 's' : ''} (${tier1Sources.map(s => s.name).join(', ')})`);
  }

  if (primaryGroup.length > 1) {
    notes.push(`${primaryGroup.length} sources agree on core meaning`);
  }

  if (divergentGroups.length > 0) {
    notes.push(`${divergentGroups.length} alternative interpretation${divergentGroups.length > 1 ? 's' : ''}`);
  }

  return {
    level: consensusLevel,
    score: weightedScore,
    agreementCount: primaryGroup.length,
    totalSources: sources.length,
    weightedScore,
    tier1Count: tier1Sources.length,
    tier2Count: tier2Sources.length,
    primaryMeaning: primaryGroup[0]?.definition || null,
    primarySources: primaryGroup.map(s => ({
      name: s.name,
      tier: s.tier.name,
      definition: s.definition
    })),
    divergentOpinions: divergentGroups.map(group => ({
      definition: group[0]?.definition,
      sources: group.map(s => s.name),
      weight: group.reduce((sum, s) => sum + s.tier.weight, 0)
    })),
    analysisNotes: notes
  };
};

// =============================================================================
// PARALLEL SOURCE AGGREGATOR
// =============================================================================

/**
 * Aggregated result structure for parallel source lookup
 */
export const createAggregatedResult = (word, sources = []) => ({
  word,
  // All sources found (sorted by tier)
  allSources: sources,

  // Primary recommendation (best source)
  primary: sources[0] || null,

  // Alternative sources for scholarly comparison
  alternatives: sources.slice(1),

  // Expert consensus analysis
  consensus: calculateConsensus(sources),

  // Quick access flags
  hasAcademicSource: sources.some(s => getSourceTier(s.name).level <= 2),
  hasMultipleSources: sources.length > 1,
  hasTier1Source: sources.some(s => getSourceTier(s.name).level === 1),

  // Metadata
  sourceCount: sources.length,
  lookupTimestamp: Date.now()
});

/**
 * Execute parallel dictionary lookups and aggregate results
 * @param {string} word - Word to look up
 * @param {Object} lookupFunctions - Object mapping source names to lookup functions
 * @param {Object} options - Lookup options
 * @returns {Object} Aggregated result with all sources
 */
export const parallelSourceLookup = async (word, lookupFunctions, options = {}) => {
  const {
    timeout = 2000,
    validateHeadword = true
  } = options;

  const startTime = Date.now();

  // Create promise for each lookup with timeout
  const lookupPromises = Object.entries(lookupFunctions).map(async ([sourceName, lookupFn]) => {
    try {
      // Wrap in timeout
      const result = await Promise.race([
        Promise.resolve(lookupFn(word)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      if (result?.english || result?.definition) {
        // Validate headword match if enabled
        if (validateHeadword) {
          const headword = result.headword || result.matchedForm || word;
          if (!areSimilarWords(headword, word) && !areSimilarWords(headword, normalizeFinals(word))) {
            if (DEBUG) {
              log.debug(`[Parallel] Headword mismatch for ${sourceName}: "${headword}" vs "${word}"`);
            }
            return null;
          }
        }

        return {
          name: sourceName,
          definition: result.english || result.definition,
          fullDefinition: result.fullDefinition || result.fullEnglish,
          headword: result.headword || result.matchedForm,
          source: result.source || sourceName,
          tier: getSourceTier(sourceName),
          raw: result,
          lookupTime: Date.now() - startTime
        };
      }
      return null;
    } catch (err) {
      if (DEBUG) {
        log.debug(`[Parallel] Error in ${sourceName}: ${err.message}`);
      }
      return null;
    }
  });

  // Wait for all lookups to complete
  const allResults = await Promise.all(lookupPromises);

  // Filter valid results and sort by tier (best first)
  const validResults = allResults
    .filter(r => r !== null)
    .sort((a, b) => {
      // Primary sort: tier level (1 = best)
      if (a.tier.level !== b.tier.level) {
        return a.tier.level - b.tier.level;
      }
      // Secondary sort: lookup time (faster = better)
      return a.lookupTime - b.lookupTime;
    });

  if (DEBUG && validResults.length > 0) {
    log.debug(`[Parallel] Found ${validResults.length} sources for "${word}" in ${Date.now() - startTime}ms`);
  }

  return createAggregatedResult(word, validResults);
};

/**
 * Synchronous version for local dictionaries
 * @param {string} word - Word to look up
 * @param {Object} lookupFunctions - Object mapping source names to lookup functions
 * @param {Object} options - Lookup options
 * @returns {Object} Aggregated result with all sources
 */
export const aggregateLocalSources = (word, lookupFunctions, options = {}) => {
  const { validateHeadword = true } = options;
  const results = [];

  for (const [sourceName, lookupFn] of Object.entries(lookupFunctions)) {
    try {
      const result = lookupFn(word);

      if (result?.english || result?.definition) {
        // Validate headword match if enabled
        if (validateHeadword) {
          const headword = result.headword || result.matchedForm || word;
          if (!areSimilarWords(headword, word) && !areSimilarWords(headword, normalizeFinals(word))) {
            if (DEBUG) {
              log.debug(`[Aggregate] Headword mismatch for ${sourceName}: "${headword}" vs "${word}"`);
            }
            continue;
          }
        }

        results.push({
          name: sourceName,
          definition: result.english || result.definition,
          fullDefinition: result.fullDefinition || result.fullEnglish,
          headword: result.headword || result.matchedForm,
          source: result.source || sourceName,
          tier: getSourceTier(sourceName),
          raw: result,
          // Additional scholarly metadata
          pos: result.pos,
          language: result.language,
          strongNumber: result.strongNumber,
          strippedPrefix: result.strippedPrefix,
          strippedSuffix: result.strippedSuffix
        });
      }
    } catch (err) {
      if (DEBUG) {
        log.debug(`[Aggregate] Error in ${sourceName}: ${err.message}`);
      }
    }
  }

  // Sort by tier (best first)
  results.sort((a, b) => a.tier.level - b.tier.level);

  return createAggregatedResult(word, results);
};

// =============================================================================
// SCHOLARLY COMPARISON UTILITIES
// =============================================================================

/**
 * Generate a scholarly comparison report between sources
 * @param {Array} sources - Array of source objects
 * @returns {Object} Comparison report
 */
export const generateSourceComparison = (sources) => {
  if (!sources || sources.length < 2) {
    return {
      hasComparison: false,
      reason: sources?.length === 1 ? 'Single source only' : 'No sources'
    };
  }

  const comparison = {
    hasComparison: true,
    sourceCount: sources.length,

    // Agreement analysis
    coreAgreement: null,
    nuancesDiffer: false,

    // Source breakdown by tier
    byTier: {
      academic: sources.filter(s => getSourceTier(s.name).level <= 2),
      reference: sources.filter(s => getSourceTier(s.name).level === 3),
      modern: sources.filter(s => getSourceTier(s.name).level >= 4)
    },

    // Definition comparison
    definitions: sources.map(s => ({
      source: s.name,
      tier: getSourceTier(s.name).name,
      definition: s.definition,
      coreMeaning: extractCoreMeaning(s.definition)
    })),

    // Semantic overlap
    semanticOverlap: 0,

    // Scholarly notes
    notes: []
  };

  // Calculate pairwise similarities
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sim = calculateDefinitionSimilarity(
        sources[i].definition,
        sources[j].definition
      );
      totalSimilarity += sim;
      comparisons++;
    }
  }

  comparison.semanticOverlap = comparisons > 0
    ? Math.round(totalSimilarity / comparisons)
    : 0;

  // Determine agreement level
  if (comparison.semanticOverlap >= 80) {
    comparison.coreAgreement = 'strong';
    comparison.notes.push('Sources strongly agree on core meaning');
  } else if (comparison.semanticOverlap >= 50) {
    comparison.coreAgreement = 'partial';
    comparison.nuancesDiffer = true;
    comparison.notes.push('Sources agree on general meaning but differ in nuance');
  } else {
    comparison.coreAgreement = 'weak';
    comparison.nuancesDiffer = true;
    comparison.notes.push('Significant variation between source definitions');
  }

  // Add tier-based notes
  if (comparison.byTier.academic.length >= 2) {
    comparison.notes.push('Multiple academic sources available');
  }

  return comparison;
};

/**
 * Format consensus result for UI display
 * @param {Object} consensus - Consensus object from calculateConsensus
 * @returns {Object} UI-friendly format
 */
export const formatConsensusForUI = (consensus) => {
  if (!consensus) {
    return {
      badge: { text: 'Unknown', color: '#6b7280', icon: '?' },
      summary: 'No consensus data available',
      details: null
    };
  }

  const badges = {
    strong: { text: 'Strong Consensus', color: '#059669', icon: '✓✓✓' },
    moderate: { text: 'Moderate Agreement', color: '#0891b2', icon: '✓✓' },
    weak: { text: 'Limited Sources', color: '#d97706', icon: '✓' },
    disputed: { text: 'Scholarly Debate', color: '#dc2626', icon: '⚡' }
  };

  const level = consensus.level?.level || 'weak';
  const badge = badges[level] || badges.weak;

  return {
    badge,
    summary: `${consensus.agreementCount} of ${consensus.totalSources} sources agree`,
    score: consensus.weightedScore,
    primaryMeaning: consensus.primaryMeaning,
    hasAlternatives: consensus.divergentOpinions?.length > 0,
    alternativeCount: consensus.divergentOpinions?.length || 0,
    details: {
      tier1Count: consensus.tier1Count,
      tier2Count: consensus.tier2Count,
      notes: consensus.analysisNotes
    }
  };
};

// =============================================================================
// PARALLEL FETCHING WITH EARLY RETURN OPTIMIZATION
// =============================================================================

/**
 * Race multiple lookups with early return when a tier-1 source is found
 * Continues background fetching but returns as soon as we have quality results
 *
 * @param {string} word - Word to look up
 * @param {Object} lookupFunctions - Map of source names to async lookup functions
 * @param {Object} options - Options for early return behavior
 * @returns {Promise<Object>} Aggregated result (may receive updates)
 */
export const raceWithEarlyReturn = async (word, lookupFunctions, options = {}) => {
  const {
    timeout = 2000,
    earlyReturnOnTier1 = true,
    minSourcesForEarlyReturn = 1,
    onSourceFound = null // Callback when a source is found
  } = options;

  const startTime = Date.now();
  const foundSources = [];
  let hasReturnedEarly = false;

  // Create a promise that resolves when we have enough quality sources
  return new Promise((resolve) => {
    const checkEarlyReturn = () => {
      if (hasReturnedEarly) return;

      // Count tier 1 sources
      const tier1Count = foundSources.filter(s => s.tier.level === 1).length;
      const tier2Count = foundSources.filter(s => s.tier.level === 2).length;

      // Early return conditions:
      // 1. We have at least one tier 1 source
      // 2. We have at least 2 tier 2 sources
      // 3. We've reached minimum sources and timeout is approaching
      const shouldReturn = (
        (earlyReturnOnTier1 && tier1Count >= minSourcesForEarlyReturn) ||
        (tier1Count + tier2Count >= 2) ||
        (foundSources.length >= 2 && Date.now() - startTime > timeout / 2)
      );

      if (shouldReturn && foundSources.length > 0) {
        hasReturnedEarly = true;
        const result = createAggregatedResult(word, sortByTier(foundSources));
        result.isPartial = true; // Indicate more results may come
        resolve(result);
      }
    };

    // Execute all lookups in parallel
    const lookupPromises = Object.entries(lookupFunctions).map(async ([sourceName, lookupFn]) => {
      try {
        const result = await Promise.race([
          Promise.resolve(lookupFn(word)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);

        if (result?.english || result?.definition) {
          const source = {
            name: sourceName,
            definition: result.english || result.definition,
            fullDefinition: result.fullDefinition || result.fullEnglish,
            headword: result.headword || result.matchedForm,
            source: result.source || sourceName,
            tier: getSourceTier(sourceName),
            raw: result,
            lookupTime: Date.now() - startTime
          };

          foundSources.push(source);

          // Notify callback if provided
          if (onSourceFound) {
            onSourceFound(source, foundSources.length);
          }

          // Check if we should return early
          checkEarlyReturn();
        }
      } catch (err) {
        if (DEBUG) {
          log.debug(`[Race] Error in ${sourceName}: ${err.message}`);
        }
      }
    });

    // When all promises complete, resolve with final result
    Promise.all(lookupPromises).then(() => {
      if (!hasReturnedEarly) {
        const result = createAggregatedResult(word, sortByTier(foundSources));
        result.isPartial = false;
        resolve(result);
      }
    });

    // Timeout fallback - resolve with whatever we have
    setTimeout(() => {
      if (!hasReturnedEarly) {
        const result = createAggregatedResult(word, sortByTier(foundSources));
        result.isPartial = foundSources.length < Object.keys(lookupFunctions).length;
        result.timedOut = true;
        resolve(result);
      }
    }, timeout);
  });
};

/**
 * Sort sources by tier (best first)
 */
const sortByTier = (sources) => {
  return [...sources].sort((a, b) => {
    if (a.tier.level !== b.tier.level) {
      return a.tier.level - b.tier.level;
    }
    return (a.lookupTime || 0) - (b.lookupTime || 0);
  });
};

// =============================================================================
// PIPELINE INTEGRATION HELPERS
// =============================================================================

/**
 * Merge new sources into existing context
 * Handles deduplication and consensus recalculation
 *
 * @param {LookupContext} ctx - Pipeline context
 * @param {Array} newSources - Sources to merge
 */
export const mergeSourcesIntoContext = (ctx, newSources) => {
  if (!newSources || newSources.length === 0) return;

  for (const source of newSources) {
    const isDupe = ctx.sources.some(s =>
      s.name === source.name && s.definition === source.definition
    );

    if (!isDupe) {
      const tier = getSourceTier(source.name);
      ctx.sources.push({
        ...source,
        tier: tier.level,
        tierName: tier.name,
        tierWeight: tier.weight
      });
      ctx.allSources.push(source);
    }
  }

  // Recalculate consensus
  ctx.computeConsensus();
};

/**
 * Create a source ranking for display
 * Groups sources by tier with quality indicators
 *
 * @param {Array} sources - Array of source objects
 * @returns {Object} Ranked sources by tier
 */
export const rankSourcesByTier = (sources) => {
  if (!sources || sources.length === 0) {
    return { academic: [], scholarly: [], reference: [], modern: [] };
  }

  return {
    academic: sources.filter(s => getSourceTier(s.name).level === 1),
    scholarly: sources.filter(s => getSourceTier(s.name).level === 2),
    reference: sources.filter(s => getSourceTier(s.name).level === 3),
    modern: sources.filter(s => getSourceTier(s.name).level >= 4)
  };
};

/**
 * Get a quality score for the lookup result
 * Used for deciding whether to continue fetching more sources
 *
 * @param {Object} aggregatedResult - Result from aggregation
 * @returns {number} Quality score 0-100
 */
export const getResultQualityScore = (aggregatedResult) => {
  if (!aggregatedResult) return 0;

  let score = 0;

  // Points for source count
  score += Math.min(aggregatedResult.sourceCount * 10, 30);

  // Points for tier 1 sources
  if (aggregatedResult.hasTier1Source) {
    score += 30;
  }

  // Points for academic sources
  if (aggregatedResult.hasAcademicSource) {
    score += 20;
  }

  // Points for consensus
  if (aggregatedResult.consensus) {
    const level = aggregatedResult.consensus.level?.level;
    if (level === 'strong') score += 20;
    else if (level === 'moderate') score += 10;
  }

  return Math.min(score, 100);
};

// =============================================================================
// PASSTHROUGH FOR AGGREGATED RESULTS
// PRO SCHOLAR V10.3: Cache removed - caching delegated to unifiedLookupService
// The unifiedLookupService.lookupCache handles all word lookup caching (15 min TTL, 2000 entries)
// =============================================================================

/**
 * Execute aggregated source lookup (no caching at this level)
 * Caching is handled by unifiedLookupService for all word lookups
 * @param {string} word - Hebrew word (kept for API compatibility)
 * @param {string} contextMode - Context mode (kept for API compatibility)
 * @param {Function} lookupFn - Lookup function to execute
 * @returns {Object} Aggregation result
 */
export const getCachedAggregation = (word, contextMode, lookupFn) => {
  // PRO SCHOLAR V10.3: No caching here - delegated to unifiedLookupService
  return lookupFn();
};

// =============================================================================
// EXPORTS
// =============================================================================

const scholarSourceAggregator = {
  // Tiers and levels
  SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  getSourceTier,

  // Consensus calculation
  calculateConsensus,
  formatConsensusForUI,

  // Aggregation functions
  parallelSourceLookup,
  aggregateLocalSources,
  createAggregatedResult,

  // Enhanced parallel fetching
  raceWithEarlyReturn,

  // Pipeline integration
  mergeSourcesIntoContext,
  rankSourcesByTier,
  getResultQualityScore,

  // Comparison utilities
  generateSourceComparison,

  // Caching
  getCachedAggregation
};

export default scholarSourceAggregator;
