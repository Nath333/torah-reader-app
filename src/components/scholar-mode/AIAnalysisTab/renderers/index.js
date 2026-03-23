/**
 * AI Analysis Renderers - Modular exports
 * Each renderer is now in its own file for maintainability
 */

// Shared utility components
export { ResultSection, KeyPointsList, LoadingSkeleton, RAGIndicator } from './SharedComponents';

// Individual mode-specific renderers (extracted to separate files)
export { TreeResultComponent } from './TreeResultComponent';
export { SugyaFlowResult } from './SugyaFlowResult';
export { ShaklaVetaryaResult } from './ShaklaVetaryaResult';
export { SugyaSummaryResult } from './SugyaSummaryResult';
export { PassageAnalysisResult } from './PassageAnalysisResult';
export { DeepStudyResult } from './DeepStudyResult';
export { TaamimResult } from './TaamimResult';
export { ShoreshResult } from './ShoreshResult';
export { ChavrutaResult } from './ChavrutaResult';

// Remaining renderers (still in main file - TODO: extract these too)
export {
  ShiurResult,
  NafkaMinaResult,
  MekabilotResult,
  AIResult
} from '../AIResultRenderers';

export { default } from '../AIResultRenderers';
