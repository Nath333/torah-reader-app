// Grammar & Linguistic Analysis Services
export { default as grammarAnalysisService } from './grammarAnalysisService';
export { default as linguisticAnalysis } from './linguisticAnalysis';
export { default as morphologicalAnalysisService } from './morphologicalAnalysisService';
export { default as preClassificationService } from './preClassificationService';
export { default as rootExtraction } from './rootExtraction';

// Grammar Analysis
export {
  analyzeWord,
  analyzeVerb,
  detectBinyan,
  getBinyanInfo,
  getAllBinyanim,
  GRAMMAR_CONSTANTS
} from './grammarAnalysisService';

// Morphological Analysis
export {
  analyzeMorphology,
  getMorphologyBreakdown,
  getVerbMorphology,
  getNounMorphology
} from './morphologicalAnalysisService';

// Pre-Classification
export {
  preClassify,
  getContextFromReference,
  getSourcesForContext as getSourcesForContextType,
  ARAMAIC_PARTICLES,
  PROPER_NAMES,
  TECHNICAL_TERMS
} from './preClassificationService';

// Root Extraction
export {
  analyzeWordComplete,
  getHistoricalLayer,
  getHistoricalEvolution,
  getGrammaticalAnomaly,
  getCognates as getRootCognates,
  extractRootsEnhanced,
  analyzeBinyan,
  detectDialect,
  detectCitations,
  getSemanticField,
  getRootFamily as getRootFamilyV6,
  extractRootsWithDirectValidation,
  validateWithDirectDictionaries,
  extractRoots,
  generateHypotheses,
  getBestRoot,
  getTopRoots,
  extractRootsMultiHypothesis,
  extractAllPossibleRoots,
  PREFIX_PATTERNS,
  SUFFIX_PATTERNS,
  NOUN_PATTERNS,
  getSourcesForContext,
  DICTIONARY_TIERS,
  WEAK_VERB_TYPES,
  BINYANIM,
  clearCache as clearRootCache,
  getCacheStats as getRootCacheStats,
  getTelemetry as getRootTelemetry,
  resetTelemetry as resetRootTelemetry
} from './rootExtraction';

// Linguistic Analysis (V6)
export {
  PRO_SCHOLAR_V6_VERSION,
  BINYAN_ANALYSIS,
  analyzeBinyan as analyzeWordBinyan,
  DIALECT_MARKERS,
  detectAramaicDialect,
  CITATION_PATTERNS,
  detectCitationPatterns,
  expandRootFamily,
  SEMANTIC_FIELDS as V6_SEMANTIC_FIELDS,
  identifySemanticField,
  applyContextualBoost,
  BIBLICAL_BOOKS,
  detectCrossReferences,
  analyzeWordV6,
  HISTORICAL_LAYERS,
  HISTORICAL_EVOLUTION,
  detectHistoricalLayer,
  GRAMMATICAL_ANOMALIES,
  checkGrammaticalAnomaly,
  COGNATE_LANGUAGES,
  ROOT_COGNATES,
  getCognates,
  analyzeWordV6Enhanced
} from './linguisticAnalysis';
