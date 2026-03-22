// =============================================================================
// Services Index - Unified API for all application services
// =============================================================================
// Usage: import { sefariaApi, combinedTranslationService } from './services';
// =============================================================================

// =============================================================================
// SERVICE CATALOG - Quick reference for all available services
// =============================================================================
/**
 * CORE SERVICES
 * ├── sefariaApi          - Main Sefaria API client (texts, commentaries, search)
 * ├── hebcalService       - Jewish calendar, parsha, holidays
 * └── audioService        - Text-to-speech for Hebrew
 *
 * DICTIONARY & TRANSLATION
 * ├── combinedTranslationService  - PRIMARY: Multi-source word lookup (Hebrew + Aramaic)
 * ├── hebrewDictionary            - Hebrew word analysis, prefix/suffix handling
 * ├── babylonianDictionary        - Aramaic language detection
 * ├── calDictionaryService        - CAL API for Aramaic (fallback)
 * ├── scholarlyLexiconService     - Sefaria lexicon wrapper
 * ├── translationService          - Legacy API wrapper
 * ├── englishToFrenchService      - English → French translation
 * └── dictionaryPreloader         - Cache warm-up on app start
 *
 * COMMENTARY SERVICES
 * ├── rashiService        - Rashi commentary
 * ├── tosafotService      - Tosafot commentary
 * ├── soncinoService      - Soncino Talmud with footnotes
 * └── commentaryServiceFactory    - Unified commentary fetcher
 *
 * AI & ANALYSIS
 * ├── aiService           - Main AI interface (questions, follow-ups)
 * ├── groqService         - Groq API wrapper
 * ├── groqApi             - Low-level Groq API client
 * ├── aiTutorService      - AI teaching personas
 * ├── ragService          - Retrieval-augmented generation
 * └── smartDataService    - Unified intelligence layer
 *
 * GRAMMAR & LINGUISTICS
 * ├── grammarAnalysisService      - Verb analysis, binyan detection
 * ├── constructChainService       - Semichut (construct chain) analysis
 * ├── semanticFieldService        - Word semantics, synonyms, antonyms
 * └── wordFrequencyService        - Word frequency bands, vocabulary stats
 *
 * TEXTUAL ANALYSIS
 * ├── cantillationService         - Taamei hamikra analysis
 * ├── masoreticService            - Ketiv/Qere, masoretic notes
 * └── manuscriptVariantsService   - DSS and manuscript variants
 *
 * SCHOLARLY SERVICES
 * ├── scholarlyApiService         - Academic API endpoints
 * ├── discoursePatternService     - Talmudic discourse patterns
 * ├── namedEntityService          - Rabbi identification
 * ├── talmudicAbbreviationsService - Abbreviation expansion
 * └── rabbinicReferencesService   - Cross-references
 *
 * SMART FEATURES (2026)
 * ├── semanticSearchService       - AI-powered semantic search
 * ├── aiMemoryService             - Multi-turn conversation memory
 * ├── srsService                  - Spaced repetition system
 * ├── knowledgeGraphService       - Knowledge graph visualization
 * ├── learningRecommendationService - Personalized recommendations
 * └── sourceCredibilityService    - Source reliability ranking
 */

// =============================================================================
// CORE API SERVICES
// =============================================================================
export { default as sefariaApi } from './sefariaApi';
export { default as sefariaService } from './sefariaApi'; // Legacy alias
export { default as hebcalService } from './hebcalService';

// =============================================================================
// AUDIO & PRONUNCIATION
// =============================================================================
export { default as audioService } from './audioService';
export { default as pronunciationService } from './pronunciationService';
export { default as targumService } from './targumService';

// =============================================================================
// DICTIONARY & TRANSLATION SERVICES
// =============================================================================
// PRIMARY SERVICE: Use combinedTranslationService for all word lookups
// It handles Hebrew + Aramaic, context-awareness, multi-source, and caching
export { default as combinedTranslationService } from './combinedTranslationService';

// Supporting Dictionary Services
export { default as hebrewDictionary } from './hebrewDictionary';
export { default as babylonianDictionary } from './babylonianDictionary';
export { default as calDictionaryService } from './calDictionaryService';
export { default as scholarlyLexiconService } from './scholarlyLexiconService';
export { default as translationService } from './translationService';
export { default as englishToFrenchService } from './englishToFrenchService';
export { default as dictionaryPreloader } from './dictionaryPreloader';

// =============================================================================
// COMMENTARY SERVICES
// =============================================================================
export { default as rashiService } from './rashiService';
export { default as tosafotService } from './tosafotService';
export { default as soncinoService } from './soncinoService';
export {
  getCommentary,
  checkCommentaryAvailability,
  clearAllCommentaryCaches
} from './commentaryServiceFactory';

// =============================================================================
// AI & ANALYSIS SERVICES
// =============================================================================
export { default as aiService } from './aiService';
export { default as groqService } from './groqService';
export { default as groqApi } from './groqApi';
export { default as ragService } from './ragService';
export { default as aiTutorService } from './aiTutorService';
export { default as smartDataService } from './smartDataService';

// AI Tutor Constants
export {
  TEACHING_PERSONAS,
  PERSONA_CONFIG,
  DIFFICULTY_LEVELS,
  LEVEL_CONFIG,
  TALMUDIC_TERMS
} from './aiTutorService';

// =============================================================================
// GRAMMAR & LINGUISTICS SERVICES
// =============================================================================
export { default as grammarAnalysisService } from './grammarAnalysisService';
export { default as semanticFieldService } from './semanticFieldService';

// =============================================================================
// TEXTUAL ANALYSIS SERVICES
// =============================================================================
export { default as cantillationService } from './cantillationService';

// =============================================================================
// SCHOLARLY & ACADEMIC SERVICES
// =============================================================================
export { default as scholarlyApiService } from './scholarlyApiService';
export { default as discoursePatternService } from './discoursePatternService';
export { default as namedEntityService } from './namedEntityService';
export { default as talmudicAbbreviationsService } from './talmudicAbbreviationsService';
export { default as rabbinicReferencesService } from './rabbinicReferencesService';

// =============================================================================
// SMART FEATURES - AI Intelligence Layer (2026)
// =============================================================================
export { default as semanticSearchService } from './semanticSearchService';
export { default as aiMemoryService } from './aiMemoryService';
export { default as srsService } from './srsService';
export { default as knowledgeGraphService } from './knowledgeGraphService';
export { default as learningRecommendationService } from './learningRecommendationService';
export { default as sourceCredibilityService } from './sourceCredibilityService';
export { default as wordRelationshipService } from './wordRelationshipService';
export { default as contextualDefinitionService } from './contextualDefinitionService';
export { default as rootFormsService } from './rootFormsService';

// =============================================================================
// NAMED EXPORTS - Audio & Speech
// =============================================================================
export {
  speakHebrew,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  createAudioQueue,
  getBestHebrewVoice
} from './audioService';

// =============================================================================
// NAMED EXPORTS - Calendar (Hebcal)
// =============================================================================
export {
  getWeeklyParsha,
  getDafYomi,
  getJewishDate,
  parshaToReference,
  getAliyot
} from './hebcalService';

// =============================================================================
// NAMED EXPORTS - Targum (Aramaic)
// =============================================================================
export {
  getOnkelos,
  getTargumJonathan,
  getAllTargumim,
  getAvailableTargumim,
  cleanAramaicText
} from './targumService';

// =============================================================================
// NAMED EXPORTS - Pronunciation
// =============================================================================
export {
  TRADITIONS,
  getPronunciation,
  getParshaName,
  getPronunciationDifferences
} from './pronunciationService';

// =============================================================================
// NAMED EXPORTS - Aramaic Dictionary
// =============================================================================
export {
  lookupAramaicWord,
  isLikelyAramaic
} from './babylonianDictionary';

// =============================================================================
// NAMED EXPORTS - CAL Dictionary (API)
// =============================================================================
export {
  hebrewToCalTransliteration,
  calToHebrewTransliteration,
  browseCalLemmas,
  getCalEntry,
  lookupAramaicWord as lookupCalAramaicWord,
  searchCalByPrefix,
  translateAramaicText,
  analyzePrefix as analyzeAramaicPrefix,
  lookupWithFallback as lookupCalWithFallback,
  getCacheStats as getCalCacheStats,
  clearCache as clearCalCache,
} from './calDictionaryService';

// =============================================================================
// NAMED EXPORTS - Scholarly Lexicon
// =============================================================================
export {
  lookupJastrow,
  lookupWordSefaria,
  getSimpleTranslation,
  scholarlyLookup,
  getEtymology,
  SCHOLARLY_SOURCES
} from './scholarlyLexiconService';

// =============================================================================
// NAMED EXPORTS - English → French Translation
// =============================================================================
export {
  translateEnglishToFrench,
  translateWithSource,
  quickTranslate
} from './englishToFrenchService';

// =============================================================================
// NAMED EXPORTS - Dictionary Preloader
// =============================================================================
export {
  preloadCommonWords,
  preloadVerseWords,
  shouldPreload,
  markPreloadComplete,
  initializePreload
} from './dictionaryPreloader';

// =============================================================================
// NAMED EXPORTS - Groq API (Low-Level)
// =============================================================================
export {
  GROQ_API_URL,
  DEFAULT_MODEL,
  AIError,
  ERROR_TYPES,
  callGroqAPI,
  readStream,
  withRetry,
  checkConnection
} from './groqApi';

// =============================================================================
// NAMED EXPORTS - Groq Service (High-Level)
// =============================================================================
export {
  setGroqApiKey,
  getStoredApiKey,
  removeGroqApiKey,
  hasApiKey,
  checkGroqConnection,
  analyzeCommentary,
  sanitizeMermaidDiagram,
  ANALYSIS_MODES
} from './groqService';

// =============================================================================
// NAMED EXPORTS - AI Service
// =============================================================================
export {
  askFollowUp,
  askQuestion,
  cancelRequest,
  isRequestActive,
  clearConversation
} from './aiService';

// =============================================================================
// NAMED EXPORTS - RAG Service
// =============================================================================
export {
  buildRAGContext,
  formatRAGContextForPrompt,
  getQuickRAGContext,
  clearRAGCache
} from './ragService';

// =============================================================================
// NAMED EXPORTS - Smart Data Service
// =============================================================================
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

// =============================================================================
// NAMED EXPORTS - Tosafot Commentary
// =============================================================================
export {
  getTosafotOnTalmud,
  getTosafotForDaf,
  isTosafotAvailable
} from './tosafotService';

// =============================================================================
// NAMED EXPORTS - Grammar Analysis
// =============================================================================
export {
  analyzeWord,
  analyzeVerb,
  detectBinyan,
  getBinyanInfo,
  getAllBinyanim,
  GRAMMAR_CONSTANTS
} from './grammarAnalysisService';

// =============================================================================
// NAMED EXPORTS - Construct Chains (Semichut)
// =============================================================================
export {
  CHAIN_TYPES,
  CONSTRUCT_PATTERNS,
  analyzeConstructChain,
  findConstructsWithWord,
  getChainTypeStats,
  getConstructHelp,
  getConstructsByType
} from './constructChainService';

// =============================================================================
// NAMED EXPORTS - Semantic Fields
// =============================================================================
export {
  SEMANTIC_DOMAINS,
  getWordSemantics,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  getDomain,
  getAllDomains,
  searchByMeaning
} from './semanticFieldService';

// =============================================================================
// NAMED EXPORTS - Word Frequency
// =============================================================================
export {
  BAND_KEYS,
  FREQUENCY_BANDS,
  getDerivedWords,
  getFrequencyBand,
  getLearningRecommendations,
  getRootOccurrences,
  getVocabularyStats,
  getWordFrequency,
  getWordsByBand,
  getWordsByDomain,
  getWordsByPOS,
  getWordsByRoot,
  searchVocabulary
} from './wordFrequencyService';

// =============================================================================
// NAMED EXPORTS - Cantillation
// =============================================================================
// Re-exported from cantillationService if needed

// =============================================================================
// NAMED EXPORTS - Masoretic Service
// =============================================================================
export {
  KETIV_QERE_TYPE_LABELS,
  MASORAH_TYPES,
  MASORAH_TYPE_LABELS,
  getAllTiqquneSoferim,
  getKetivQere,
  getKetivQereForChapter,
  getKetivQereStats,
  getKetivVeloQere,
  getMasoreticNotes,
  getQereVeloKetiv,
  getTiqqunSoferim,
  searchKetivQere
} from './masoreticService';

// =============================================================================
// NAMED EXPORTS - Manuscript Variants
// =============================================================================
export {
  MANUSCRIPT_SOURCES,
  SIGNIFICANCE_LEVELS,
  getAllDSSManuscripts,
  getDSSManuscript,
  getScholarlyAnalysis,
  getVariantStatistics,
  getVariantsForChapter,
  getVariantsForVerse,
  searchVariantsBySource
} from './manuscriptVariantsService';

// =============================================================================
// NAMED EXPORTS - Discourse Patterns
// =============================================================================
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
  // Tzurat HaDaf (Traditional Page Layout)
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafStyles,
  getTzuratHaDafProps,
  renderTzuratHaDafHtml
} from './discoursePatternService';

// =============================================================================
// NAMED EXPORTS - Named Entity Recognition
// =============================================================================
export {
  detectEntities,
  detectRabbis,
  lookupRabbi,
  getRabbiRelationships,
  getTeacherChain,
  RABBI_DATABASE,
  ENTITY_TYPES
} from './namedEntityService';

// =============================================================================
// NAMED EXPORTS - Talmudic Abbreviations
// =============================================================================
export {
  findAbbreviations,
  expandAbbreviation,
  expandAllAbbreviations,
  ABBREVIATIONS
} from './talmudicAbbreviationsService';

// =============================================================================
// NAMED EXPORTS - Scholarly API
// =============================================================================
export {
  getScholarlyData,
  getCompleteScholarlyAnalysis,
  getTextPreview,
  getTopicDetails,
  searchTopics,
  getTopicSources,
  getRelatedTopics,
  getDailyLearning,
  getRandomInspiration,
  getVerseConnections,
  getWordAnalysis,
  addVocalization,
  checkNakdanAvailability,
  COMMENTARY_LAYERS
} from './scholarlyApiService';

// =============================================================================
// NAMED EXPORTS - Semantic Search
// =============================================================================
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

// =============================================================================
// NAMED EXPORTS - AI Memory
// =============================================================================
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

// =============================================================================
// NAMED EXPORTS - Spaced Repetition (SRS)
// =============================================================================
export {
  QUALITY as SRS_QUALITY,
  initializeSRS,
  createCard,
  processReview,
  getDueCards,
  getCardsDueToday,
  getStats as getSRSStats,
  getReviewForecast,
  getCard,
  updateCard,
  deleteCard,
  importFromVocabulary,
  exportCards,
  importCards,
  resetSRS,
  getDifficultCards,
  getMasteredCards,
  getOptimalSession
} from './srsService';

// =============================================================================
// NAMED EXPORTS - Knowledge Graph
// =============================================================================
export {
  RELATIONSHIP_TYPES,
  ENTITY_TYPES as GRAPH_ENTITY_TYPES,
  addNode,
  addEdge,
  buildGraphFromAnalysis,
  buildCommentatorNetwork,
  getSubgraph,
  generateMermaidDiagram,
  generateAsciiGraph,
  findPath,
  getNodeConnections,
  getGraphStats,
  clearGraph,
  exportGraph,
  importGraph
} from './knowledgeGraphService';

// =============================================================================
// NAMED EXPORTS - Learning Recommendations
// =============================================================================
export {
  LEARNING_LEVELS,
  initializeRecommendations,
  calculateLevel,
  trackStudyActivity,
  generateRecommendations,
  dismissRecommendation,
  getRecommendations,
  getProgressSummary,
  getStudyPath,
  resetRecommendations
} from './learningRecommendationService';

// =============================================================================
// NAMED EXPORTS - Source Credibility
// =============================================================================
export {
  SOURCE_CATEGORIES,
  getSourceCredibility,
  analyzeConsensus,
  getCredibilityBadge,
  sortByCredibility,
  getCategoryDistribution,
  isFromPeriod,
  getSourcesByCategory
} from './sourceCredibilityService';

// =============================================================================
// NAMED EXPORTS - Word Relationship Service (PRO SCHOLAR v3)
// =============================================================================
export {
  WORD_RELATIONSHIP_TYPES,
  SEMANTIC_FIELDS as WORD_SEMANTIC_FIELDS,
  WORD_RELATIONSHIPS_DB,
  initializeWordGraph,
  addWordNode,
  addWordRelationship,
  markWordLearned,
  isWordLearned,
  getWordRelationships,
  getRootFamily,
  getSemanticFieldWords,
  findSemanticFields,
  getLearningPath,
  generateWordGraph,
  generateWordMermaid,
  generateWordAscii,
  getWordGraphStats,
  getLearningProgress,
  exportWordGraph,
  importWordGraph,
  clearLearningProgress
} from './wordRelationshipService';

// =============================================================================
// NAMED EXPORTS - Learning Recommendation PRO (PRO SCHOLAR v3)
// =============================================================================
export {
  calculatePriorityScore,
  createOptimizedSession,
  analyzeRootFamilyGaps,
  identifyWeakAreas,
  generateMilestones,
  getStudyFocus
} from './learningRecommendationService';

// =============================================================================
// NAMED EXPORTS - Contextual Definition Service (PRO SCHOLAR v3)
// =============================================================================
export {
  CONTEXT_TYPES,
  detectContextType,
  detectDomain,
  scoreDefinition,
  rankDefinitions,
  aiSelectBestDefinition,
  getContextualDefinitions,
  getBestDefinition,
  analyzeContextForDefinition
} from './contextualDefinitionService';

// =============================================================================
// NAMED EXPORTS - Soncino Service
// =============================================================================
export {
  // Generic functions for all tractates
  getSoncinoTractate,
  getSoncinoFootnotesForTractate,
  getRashiFootnotesForTractate,
  getAvailableTractates,
  isTractateAvailable,
  // HTML/PDF availability helpers
  hasHtmlAvailable,
  isPdfOnly,
  // Backwards compatibility (Shabbat-specific)
  getSoncinoShabbat,
  getSoncinoFootnotes,
  getRashiFootnotes,
  getSoncinoShabbatPages,
  clearSoncinoCache
} from './soncinoService';

// =============================================================================
// NAMED EXPORTS - Root Forms Service (PRO SCHOLAR v4)
// =============================================================================
export {
  generateRootForms,
  getAttestedForms,
  getRootFamilyTree,
  searchRootFamily,
  FORM_CATEGORIES
} from './rootFormsService';
