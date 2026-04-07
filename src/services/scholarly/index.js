// Scholarly & Academic Services
export { default as discoursePatternService } from './discoursePatternService';
export { default as namedEntityService } from './namedEntityService';
export { default as knowledgeGraphService } from './knowledgeGraphService';
export { default as talmudDiagramService } from './talmudDiagramService';
export { default as learningRecommendationService } from './learningRecommendationService';
export { default as semanticFieldService } from './semanticFieldService';
export { default as wordRelationshipService } from './wordRelationshipService';

// Discourse Patterns
export {
  detectDiscoursePatterns,
  detectStructuralMarkers,
  analyzeDiscourseStructure,
  getFlowDiagram,
  generateDiscourseFlowVisualization,
  applyLayerColoring,
  getDiscourseLayerStyles,
  segmentIntoSugyaUnits,
  DISCOURSE_PATTERNS,
  TALMUDIC_PATTERNS,
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafStyles,
  getTzuratHaDafProps,
  renderTzuratHaDafHtml
} from './discoursePatternService';

// Named Entity Recognition
export {
  detectEntities,
  detectRabbis,
  lookupRabbi,
  getRabbiRelationships,
  getTeacherChain,
  RABBI_DATABASE,
  ENTITY_TYPES
} from './namedEntityService';

// Knowledge Graph
export {
  RELATIONSHIP_TYPES,
  ENTITY_TYPES as GRAPH_ENTITY_TYPES,
  addNode, addEdge,
  buildGraphFromAnalysis, buildCommentatorNetwork,
  getSubgraph,
  generateMermaidDiagram, generateAsciiGraph,
  findPath, getNodeConnections,
  getGraphStats, clearGraph,
  exportGraph, importGraph
} from './knowledgeGraphService';

// Learning Recommendations
export {
  LEARNING_LEVELS,
  initializeRecommendations, calculateLevel,
  trackStudyActivity, generateRecommendations,
  dismissRecommendation, getRecommendations,
  getProgressSummary, getStudyPath, resetRecommendations,
  calculatePriorityScore, createOptimizedSession,
  analyzeRootFamilyGaps, identifyWeakAreas,
  generateMilestones, getStudyFocus
} from './learningRecommendationService';

// Semantic Fields
export {
  SEMANTIC_DOMAINS,
  getWordSemantics, getSynonyms, getAntonyms,
  getRelatedWords, getDomain, getAllDomains, searchByMeaning
} from './semanticFieldService';

// Word Relationships
export {
  WORD_RELATIONSHIP_TYPES,
  SEMANTIC_FIELDS as WORD_SEMANTIC_FIELDS,
  WORD_RELATIONSHIPS_DB,
  initializeWordGraph, addWordNode, addWordRelationship,
  markWordLearned, isWordLearned,
  getWordRelationships, getRootFamily,
  getSemanticFieldWords, findSemanticFields,
  getLearningPath,
  generateWordGraph, generateWordMermaid, generateWordAscii,
  getWordGraphStats, getLearningProgress,
  exportWordGraph, importWordGraph, clearLearningProgress
} from './wordRelationshipService';
