// =============================================================================
// PRO SCHOLAR V10: UNIFIED WORD LOOKUP MODULE
// Clean, composable Hebrew/Aramaic word lookup with scholarly consensus
// =============================================================================
//
// This is the MAIN ENTRY POINT for all word lookups.
// Use unifiedLookupService for new code - it's cleaner and more maintainable.
//
// QUICK START:
//   import { lookupWord, quickLookup } from './services/proScholarLookup';
//
//   // Async with optional online sources
//   const result = await lookupWord('תורה', { includeOnline: true });
//
//   // Fast synchronous (local dictionaries only)
//   const quick = quickLookup('משה');
//
//   // Efficient batch
//   const results = await batchLookup(['תורה', 'שבת', 'מלך']);
//
// =============================================================================
//
// ARCHITECTURE:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │                    unifiedLookupService (Entry Point)                       │
// │                                                                             │
// │  lookupWord()      → Async lookup with optional online sources              │
// │  quickLookup()     → Fast sync lookup (local dictionaries)                  │
// │  batchLookup()     → Efficient batch processing                             │
// │                                                                             │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │                         lookupPipeline (Core)                               │
// │                                                                             │
// │  LookupContext     → State carrier through pipeline                         │
// │  createPipeline()  → Factory for pipeline functions                         │
// │  namedStage()      → Stage composition helpers                              │
// │                                                                             │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │                      lookupStages (9 Stages)                                │
// │                                                                             │
// │  1. PreClassification      5. LocalDictionaries                             │
// │  2. HebrewVerbAnalysis     6. AramaicPatternAnalysis                        │
// │  3. HalachicLookup         7. MorphologicalAnalysis                         │
// │  4. FunctionWordLookup     8. MultiHypothesisLookup                         │
// │                            9. PreClassificationFallback                     │
// │                                                                             │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │                  scholarSourceAggregator (Consensus)                        │
// │                                                                             │
// │  calculateConsensus()     → Expert consensus scoring                        │
// │  raceWithEarlyReturn()    → Fast parallel fetching                          │
// │  getSourceTier()          → Scholarly tier classification                   │
// │                                                                             │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// SCHOLARLY TIERS:
// ┌────────┬──────────────────────┬────────┬─────────────────────────────────┐
// │ Tier   │ Name                 │ Weight │ Sources                         │
// ├────────┼──────────────────────┼────────┼─────────────────────────────────┤
// │ 1      │ Peer-Reviewed        │ 1.00   │ BDB, Jastrow, HALOT, CAL, DCPA │
// │ 2      │ Established Scholarly│ 0.85   │ Klein, Gesenius, TWOT, Koehler │
// │ 3      │ Standard Reference   │ 0.70   │ Strong's                        │
// │ 4      │ Modern/Popular       │ 0.55   │ Sefaria, Steinsaltz, Artscroll │
// └────────┴──────────────────────┴────────┴─────────────────────────────────┘
//
// =============================================================================

// -----------------------------------------------------------------------------
// IMPORTS (must be at top for ESLint import/first rule)
// -----------------------------------------------------------------------------
import unifiedLookupService from '../unifiedLookupService';
import { LookupContext, createPipeline } from '../lookupPipeline';
import { createStages, STAGE_ORDER } from '../lookupStages';
import {
  SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  getSourceTier,
  calculateConsensus
} from '../scholarSourceAggregator';

// -----------------------------------------------------------------------------
// MAIN API: Unified Lookup Service (Recommended)
// -----------------------------------------------------------------------------

export {
  // Primary lookup functions
  lookupWord,
  quickLookup,
  batchLookup,
  // Direct dictionary access
  lookupAllLocalDictionaries,
  // Cache utilities
  getCacheStats,
  clearCache
} from '../unifiedLookupService';

// Re-export default for convenience
export { default as unifiedLookup } from '../unifiedLookupService';

// -----------------------------------------------------------------------------
// PIPELINE INFRASTRUCTURE
// -----------------------------------------------------------------------------

export {
  LookupContext,
  createPipeline,
  runPipelineWithContext,
  namedStage,
  safeStage,
  conditionalStage,
  isValidHeadwordMatch
} from '../lookupPipeline';

// -----------------------------------------------------------------------------
// STAGE FACTORY
// -----------------------------------------------------------------------------

export {
  createStages,
  STAGE_ORDER
} from '../lookupStages';

// -----------------------------------------------------------------------------
// SCHOLARLY SOURCE AGGREGATION
// -----------------------------------------------------------------------------

export {
  // Tier configuration
  SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  getSourceTier,
  // Consensus calculation
  calculateConsensus,
  formatConsensusForUI,
  // Parallel fetching
  parallelSourceLookup,
  aggregateLocalSources,
  raceWithEarlyReturn,
  // Pipeline helpers
  mergeSourcesIntoContext,
  rankSourcesByTier,
  getResultQualityScore,
  // Comparison
  generateSourceComparison,
  createAggregatedResult,
  getCachedAggregation
} from '../scholarSourceAggregator';

// -----------------------------------------------------------------------------
// VERSION INFO
// -----------------------------------------------------------------------------

export const VERSION = {
  major: 10,
  minor: 1,
  patch: 0,
  name: 'Pro Scholar V10.1',
  codename: 'Unified',
  features: [
    'Unified lookup service (single entry point)',
    'Pipeline architecture with 9 composable stages',
    'Scholarly source aggregation with tier weighting',
    'Expert consensus scoring',
    'Race-with-early-return for fast results',
    'Batch lookup support',
    'LookupContext state management'
  ]
};

// -----------------------------------------------------------------------------
// DEFAULT EXPORT
// -----------------------------------------------------------------------------

const proScholarLookup = {
  // Main API
  ...unifiedLookupService,

  // Pipeline
  LookupContext,
  createPipeline,
  createStages,
  STAGE_ORDER,

  // Scholarly
  SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  getSourceTier,
  calculateConsensus,

  // Version
  VERSION
};

export default proScholarLookup;
