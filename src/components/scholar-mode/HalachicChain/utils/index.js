/**
 * HalachicChain Utilities Index
 * 
 * Exports all utility functions for building and managing halachic chains.
 */

export { buildHalachicChain } from './chainBuilder';
export { calculateMajority, getConsensusLevel, formatMajorityResult } from './majorityCalculator';
export { 
  extractMishnaOpinions, 
  isMishnaText 
} from './mishnaParser';
export { 
  extractGemaraAnalysis, 
  identifyStructuralMarkers, 
  isGemaraText 
} from './gemaraParser';
export { 
  fetchRishonimDecisions, 
  fetchPsakFromSefaria,
  SHULCHAN_ARUCH_MAP 
} from './sefariaIntegration';
export { 
  extractCrossReferences,
  groupReferencesByType,
  filterReferencesByBook
} from './crossReferenceExtractor';
export {
  generateCacheKey,
  getCache,
  setCache,
  removeCache,
  clearAllCache,
  getCacheStats
} from './chainCache';
export {
  analyzeKlaleiPesika,
  getRulesForLayer,
  TANNAIM_RULES,
  GEMARA_RULES,
  RISHONIM_RULES,
  SHULCHAN_ARUCH_RULES
} from './klaleiPesika';
export {
  buildOpinionFlows,
  getFlowForAuthority,
  getFlowSummary
} from './opinionFlowTracker';
