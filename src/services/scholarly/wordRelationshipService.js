// =============================================================================
// Word Relationship Service — FAÇADE (split 21/10)
// Moteur de relations sémantiques pour le vocabulaire hébreu/araméen.
// Modules sous ./wordRelationship/ : data (pures), graphState (ÉTAT + persist),
// queries, visualization, management, rootAnalysis, crossRefs, etymology.
// Surface publique intégrale conservée.
// =============================================================================

import { WORD_RELATIONSHIP_TYPES, SEMANTIC_FIELDS, WORD_RELATIONSHIPS_DB } from './wordRelationship/data';
import {
  initializeWordGraph, addWordNode, addWordRelationship,
  markWordLearned, isWordLearned
} from './wordRelationship/graphState';
import {
  getWordRelationships, getRootFamily, getSemanticFieldWords,
  findSemanticFields, getLearningPath
} from './wordRelationship/queries';
import { generateWordGraph, generateWordMermaid, generateWordAscii } from './wordRelationship/visualization';
import {
  getWordGraphStats, getLearningProgress,
  exportWordGraph, importWordGraph, clearLearningProgress
} from './wordRelationship/management';
import { getRelatedRoots, getComprehensiveRootAnalysis } from './wordRelationship/rootAnalysis';
import { extractCrossReferences, parseAllCrossReferences } from './wordRelationship/crossRefs';
import { buildEtymologyChainFromData } from './wordRelationship/etymology';

export {
  // Données
  WORD_RELATIONSHIP_TYPES, SEMANTIC_FIELDS, WORD_RELATIONSHIPS_DB,
  // Graphe (état + mutations)
  initializeWordGraph, addWordNode, addWordRelationship, markWordLearned, isWordLearned,
  // Requêtes
  getWordRelationships, getRootFamily, getSemanticFieldWords, findSemanticFields, getLearningPath,
  // Visualisation
  generateWordGraph, generateWordMermaid, generateWordAscii,
  // Gestion
  getWordGraphStats, getLearningProgress, exportWordGraph, importWordGraph, clearLearningProgress,
  // Racines
  getRelatedRoots, getComprehensiveRootAnalysis,
  // Cross-refs & étymologie
  extractCrossReferences, parseAllCrossReferences, buildEtymologyChainFromData
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const wordRelationshipService = {
  // Init
  initializeWordGraph,
  // Node operations
  addWordNode,
  addWordRelationship,
  markWordLearned,
  isWordLearned,
  // Query
  getWordRelationships,
  getRootFamily,
  getSemanticFieldWords,
  findSemanticFields,
  getLearningPath,
  // Root analysis
  getRelatedRoots,
  getComprehensiveRootAnalysis,
  // Cross-references & Etymology
  extractCrossReferences,
  parseAllCrossReferences,
  buildEtymologyChainFromData,
  // Visualization
  generateWordGraph,
  generateWordMermaid,
  generateWordAscii,
  // Stats
  getWordGraphStats,
  getLearningProgress,
  // Export/Import
  exportWordGraph,
  importWordGraph,
  clearLearningProgress,
};

export default wordRelationshipService;

