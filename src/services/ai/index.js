// AI & Intelligence Services
export { default as aiService } from './aiService';
export { default as ragService } from './ragService';
export { default as aiTutorService } from './aiTutorService';
export { default as smartDataService } from './smartDataService';
export { default as semanticSearchService } from './semanticSearchService';
export { default as aiMemoryService } from './aiMemoryService';

// AI Service
export {
  askFollowUp,
  askQuestion,
  cancelRequest,
  isRequestActive,
  clearConversation
} from './aiService';

// RAG Service
export {
  buildRAGContext,
  formatRAGContextForPrompt,
  getQuickRAGContext,
  clearRAGCache
} from './ragService';

// AI Tutor
export {
  TEACHING_PERSONAS,
  PERSONA_CONFIG,
  DIFFICULTY_LEVELS,
  LEVEL_CONFIG,
  TALMUDIC_TERMS
} from './aiTutorService';

// Smart Data Service
export {
  smartLookup,
  smartRAG,
  smartAnalyze,
  checkConnectivity,
  getConnectivityStatus,
  onConnectivityChange,
  prefetchRAGContext,
  prefetchWordLookups,
  getDataAvailability
} from './smartDataService';

// Semantic Search
export {
  indexVerse,
  indexVerses,
  semanticSearch,
  findSimilarVerses,
  aiSemanticSearch,
  hybridSearch,
  getConceptCloud,
  getSearchStats,
  clearIndex
} from './semanticSearchService';

// AI Memory
export {
  initializeMemory,
  startNewSession,
  addMessage,
  getConversationContext,
  getRelevantPastContext,
  updateUserProfile,
  trackStudy,
  getTopTopics,
  getFrequentSources,
  clearMemory,
  getMemoryStats
} from './aiMemoryService';
