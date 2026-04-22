// =============================================================================
// Services Index - Unified API for all application services
// =============================================================================
// Usage: import { sefariaApi, unifiedLookupService } from './services';
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
 * ├── unifiedLookupService        - PRIMARY: Multi-source word lookup (Hebrew + Aramaic)
 * ├── translationService          - Text translation (Hebrew → English sentences/commentary)
 * ├── dictionaryLoader            - PRIMARY: Lazy dictionary loading (BDB, Jastrow, Strong's)
 * ├── hebrewDictionary            - Hebrew word analysis, prefix/suffix handling
 * ├── babylonianDictionary        - Aramaic language detection
 * ├── calDictionaryService        - CAL API for Aramaic (fallback)
 * ├── scholarlyLexiconService     - Sefaria lexicon wrapper
 * ├── wiktionaryService           - Wiktionary API (optional reference source)
 * └── englishToFrenchService      - English → French translation
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
export { default as unifiedLookupService } from './unifiedLookupService';
export {
  lookupWord as lookupWordAsync,
  quickLookup as lookupWordSync,
  warmCache as prefetchTranslations,
  isCached as hasTranslation,
  clearCaches as clearTranslationCaches,
  preloadCommonWords,
  isPreloadComplete,
  getPreloadStatus
} from './unifiedLookupService';

// =============================================================================
// TRANSLATION SERVICE
// Pure text translation (Hebrew → English sentences/commentary)
// =============================================================================
export { default as translationService } from './translationService';
export {
  translateWord,
  translateHebrewToEnglish,
  translateCommentary,
  isTranslatable,
  translateWithSource,
  batchTranslate
} from './translationService';

// Supporting Dictionary Services
export { default as hebrewDictionary } from './dictionaries/hebrewDictionary';
export { default as babylonianDictionary } from './dictionaries/babylonianDictionary';
export { default as calDictionaryService } from './dictionaries/calDictionaryService';
export { default as scholarlyLexiconService } from './dictionaries/scholarlyLexiconService';
export { default as englishToFrenchService } from './dictionaries/englishToFrenchService';
// PRO SCHOLAR: Wiktionary - optional reference source (community-edited)
export { default as wiktionaryService } from './dictionaries/wiktionaryService';
export {
  lookupWiktionary,
  fetchWiktionaryEtymology,
  isWiktionaryAvailable,
  clearWiktionaryCache,
  // PRO SCHOLAR: Proto-Semitic reconstruction functions
  getProtoSemitic,
  hasProtoSemitic,
  loadCachedEtymology
} from './dictionaries/wiktionaryService';
// PRIMARY: Use dictionaryLoader for all dictionary loading
export { default as dictionaryLoader } from './dictionaries/dictionaryLoader';

// =============================================================================
// PRE-CLASSIFICATION SERVICE
// =============================================================================
export { default as preClassificationService } from './analysis/preClassificationService';
export {
  preClassify,
  getContextFromReference,
  getSourcesForContext as getSourcesForContextType,
  ARAMAIC_PARTICLES,
  PROPER_NAMES,
  TECHNICAL_TERMS
} from './analysis/preClassificationService';

// =============================================================================
// MORPHOLOGICAL ANALYSIS SERVICE
// =============================================================================
export { default as morphologicalAnalysisService } from './analysis/morphologicalAnalysisService';
export {
  analyzeMorphology,
  getMorphologyBreakdown,
  getVerbMorphology,
  getNounMorphology
} from './analysis/morphologicalAnalysisService';

// =============================================================================
// COMMENTARY SERVICES
// =============================================================================
export { default as rashiService } from './commentary/rashiService';
export { default as tosafotService } from './commentary/tosafotService';
export { default as soncinoService } from './commentary/soncinoService';
export {
  getCommentary,
  checkCommentaryAvailability,
  clearAllCommentaryCaches
} from './commentary/commentaryServiceFactory';

// =============================================================================
// AI & ANALYSIS SERVICES
// =============================================================================
export { default as aiService } from './ai/aiService';
export { default as groqService } from './groqService';
export { default as groqApi } from './groqApi';
export { default as ragService } from './ai/ragService';
export { default as aiTutorService } from './ai/aiTutorService';
export { default as smartDataService } from './ai/smartDataService';

// AI Tutor Constants
export {
  TEACHING_PERSONAS,
  PERSONA_CONFIG,
  DIFFICULTY_LEVELS,
  LEVEL_CONFIG,
  TALMUDIC_TERMS
} from './ai/aiTutorService';

// =============================================================================
// GRAMMAR & LINGUISTICS SERVICES
// =============================================================================
export { default as grammarAnalysisService } from './analysis/grammarAnalysisService';
export { default as semanticFieldService } from './scholarly/semanticFieldService';
// PRO SCHOLAR V12: Comparative Semitic linguistics
export { default as comparativeSemiticService } from './comparativeSemiticService';
export {
  COGNATE_DATABASE,
  getCognates as getComparativeCognates,
  getCognatesAsync,
  getCognatesWithCALSync,
  hasCognates,
  hasCognatesAsync,
  getCognateStats,
  getRootsByCategory,
  formatCognatesForDisplay,
  getCognateSummary
} from './comparativeSemiticService';
// PRO SCHOLAR V12: CAL Database integration (Aramaic)
export { default as calService } from './calService';
export {
  lookupCAL,
  lookupCALSync,
  loadCALData,
  getDialectInfo,
  hasCALData,
  getCALStats,
  formatCALForDisplay,
  clearCALCache,
  CAL_DIALECTS
} from './calService';

// =============================================================================
// TEXTUAL ANALYSIS SERVICES
// =============================================================================
export { default as cantillationService } from './textual/cantillationService';

// =============================================================================
// SCHOLARLY & ACADEMIC SERVICES
// =============================================================================
export { default as scholarlyApiService } from './scholarlyApiService';
export { default as discoursePatternService } from './scholarly/discoursePatternService';
export { default as namedEntityService } from './scholarly/namedEntityService';
export { default as talmudicAbbreviationsService } from './textual/talmudicAbbreviationsService';
export { default as rabbinicReferencesService } from './rabbinicReferencesService';

// =============================================================================
// SMART FEATURES - AI Intelligence Layer (2026)
// =============================================================================
export { default as semanticSearchService } from './ai/semanticSearchService';
export { default as aiMemoryService } from './ai/aiMemoryService';
export { default as srsService } from './srsService';
export { default as knowledgeGraphService } from './scholarly/knowledgeGraphService';
export { default as talmudDiagramService } from './scholarly/talmudDiagramService';
export { default as learningRecommendationService } from './scholarly/learningRecommendationService';
export { default as sourceCredibilityService } from './sourceCredibilityService';
export { default as wordRelationshipService } from './scholarly/wordRelationshipService';
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
} from './dictionaries/babylonianDictionary';

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
} from './dictionaries/calDictionaryService';

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
} from './dictionaries/scholarlyLexiconService';

// =============================================================================
// NAMED EXPORTS - English → French Translation
// =============================================================================
export {
  translateEnglishToFrench,
  translateWithSource as translateWithSourceFr,
  quickTranslate
} from './dictionaries/englishToFrenchService';

// =============================================================================
// NAMED EXPORTS - Dictionary Loader (BDB, Jastrow, Strong's)
// =============================================================================
export {
  // Async loaders
  getBDB,
  getJastrow,
  getStrongs,
  // Async lookups
  lookupBDBByWord,
  lookupBDBByStrongs,
  lookupJastrowByWord,
  lookupStrongsByWord,
  lookupStrongsByNumber,
  lookupAllDictionaries,
  // Sync lookups (require preloaded data)
  lookupBDBSync,
  lookupJastrowSync,
  lookupStrongsSync,
  lookupAllSync,
  // Raw data access (for morphological analysis)
  getBDBData,
  getJastrowData,
  getStrongsData,
  // Preloading & state management
  preloadDictionaries,
  isDictionaryLoaded,
  isDictionaryLoading,
  getLoadingStatus as getDictionaryLoadingStatus,
  getCacheStatus as getDictionaryCacheStatus,
  clearCache as clearDictionaryCache
} from './dictionaries/dictionaryLoader';


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
} from './ai/aiService';

// =============================================================================
// NAMED EXPORTS - RAG Service
// =============================================================================
export {
  buildRAGContext,
  formatRAGContextForPrompt,
  getQuickRAGContext,
  clearRAGCache
} from './ai/ragService';

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
} from './ai/smartDataService';

// =============================================================================
// NAMED EXPORTS - Tosafot Commentary
// =============================================================================
export {
  getTosafotOnTalmud,
  getTosafotForDaf,
  isTosafotAvailable
} from './commentary/tosafotService';

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
} from './analysis/grammarAnalysisService';

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
} from './scholarly/semanticFieldService';

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
} from './textual/masoreticService';

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
} from './textual/manuscriptVariantsService';

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
} from './scholarly/discoursePatternService';

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
} from './scholarly/namedEntityService';

// =============================================================================
// NAMED EXPORTS - Talmudic Abbreviations
// =============================================================================
export {
  findAbbreviations,
  expandAbbreviation,
  expandAllAbbreviations,
  ABBREVIATIONS
} from './textual/talmudicAbbreviationsService';

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
} from './ai/semanticSearchService';

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
} from './ai/aiMemoryService';

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
} from './scholarly/knowledgeGraphService';

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
} from './scholarly/learningRecommendationService';

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
// NAMED EXPORTS - Word Relationship Service
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
} from './scholarly/wordRelationshipService';

// =============================================================================
// NAMED EXPORTS - Learning Recommendation PRO
// =============================================================================
export {
  calculatePriorityScore,
  createOptimizedSession,
  analyzeRootFamilyGaps,
  identifyWeakAreas,
  generateMilestones,
  getStudyFocus
} from './scholarly/learningRecommendationService';

// =============================================================================
// NAMED EXPORTS - Contextual Definition Service
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
} from './commentary/soncinoService';

// =============================================================================
// NAMED EXPORTS - Root Forms Service
// =============================================================================
export {
  generateRootForms,
  getAttestedForms,
  getRootFamilyTree,
  searchRootFamily,
  FORM_CATEGORIES
} from './rootFormsService';

// =============================================================================
// FEATURE FLAGS - Unified Feature Registry & Performance Layer
// =============================================================================
export { default as featureFlags } from './featureFlags';
export {
  // Version & Feature Flags
  PRO_SCHOLAR_VERSION,
  FEATURES as PRO_SCHOLAR_FEATURES,

  // Service Management
  getService as getProService,

  // Unified API
  analyzeWord as proAnalyzeWord,
  getCrossReferences as proGetCrossReferences,
  getKnowledgeGraph as proGetKnowledgeGraph,
  getSRSCard as proGetSRSCard,
  processSRSReview as proProcessSRSReview,

  // Preloading & Prefetching
  preloadServices,
  prefetchWords,

  // Telemetry
  getTelemetry as getProTelemetry
} from './featureFlags';

// =============================================================================
// ★★★ UNIFIED LOOKUP SERVICE - PRIMARY WORD LOOKUP API ★★★
// =============================================================================
// USE THIS FOR NEW CODE! It's cleaner and more maintainable than combinedTranslationService.
//
// Quick usage:
//   import { lookupWordUnified, quickLookupUnified, batchLookup } from './services';
//
//   // Async with optional online sources
//   const result = await lookupWordUnified('תורה', { includeOnline: true });
//
//   // Fast sync (local dictionaries only)
//   const quick = quickLookupUnified('משה');
//
//   // Efficient batch
//   const results = await batchLookup(['תורה', 'שבת', 'מלך']);
//
// NOTE: unifiedLookupService default export is at line ~85 (not duplicated here)
export {
  // Core lookup functions
  lookupWord as lookupWordUnified,
  quickLookup as quickLookupUnified,
  batchLookup,
  lookupAllLocalDictionaries,

  // Enhanced lookup
  lookupWordEnriched,

  // Scholarly features
  generateCitation,
  generateAllCitations,
  calculateConfidence,
  getRootFamilyExpansion,
  getMorphology,

  // Compatibility layer (migrated from combinedTranslationService)
  lookupParallel,
  getSourceComparison,
  lookupWordSync as lookupWordSyncUnified,
  clearCaches as clearCachesUnified,

  // Cache management
  getCacheStats as getUnifiedCacheStats,
  clearCache as clearUnifiedCache,
  warmCache,
  isCached,

  // Preloading
  preloadCommonWords as preloadCommonWordsUnified,
  isPreloadComplete as isPreloadCompleteUnified,
  getPreloadStatus as getPreloadStatusUnified,

  // Translation
  getFrenchTranslation,

  // Progressive lookup (non-blocking UI pattern)
  progressiveLookup,
  progressiveBatchLookup,

  // Semantic field enrichment
  getSemanticField as getWordSemanticField,
  enrichWithSemantics,
  lookupWithSemantics,

  // Full enrichment (most comprehensive lookup)
  lookupFullyEnriched,

  // Contextual definition ranking
  rankDefinitionsByContext,
  lookupWithContextRanking,

  // Word relationships (aliased to avoid collision)
  getWordRelationships as getWordRelationshipsUnified,
  lookupWithRelationships,

  // Scholarly uncertainty markers
  generateScholarlyUncertainty,
  UNCERTAINTY_LEVELS,

  // Export capabilities
  exportToJsonLD,
  exportToMarkdown,
  exportToFlashcard,

  // Constants (aliased to avoid collision)
  CONTEXT_TYPES as UNIFIED_CONTEXT_TYPES,
  WORD_RELATIONSHIP_TYPES as UNIFIED_RELATIONSHIP_TYPES,

  // Advanced source management
  raceWithEarlyReturn,
  getResultQualityScore,
  rankSourcesByTier,
  SCHOLARLY_TIERS as UNIFIED_SCHOLARLY_TIERS,
  SEMANTIC_DOMAINS as UNIFIED_SEMANTIC_DOMAINS,
  RELIABILITY_TIERS
} from './unifiedLookupService';

// =============================================================================
// LOOKUP PIPELINE - Context management and stage execution
// =============================================================================
export { default as lookupPipeline } from './lookupPipeline';
export {
  LookupContext,
  createPipeline,
  runPipelineWithContext,
  isValidHeadwordMatch,
  namedStage,
  safeStage,
  conditionalStage
} from './lookupPipeline';

// =============================================================================
// LOOKUP STAGES - Composable lookup stages
// =============================================================================
export { default as lookupStages, createStages, STAGE_ORDER } from './lookupStages';

// =============================================================================
// ROOT EXTRACTION - Unified Root Extraction Service
// =============================================================================
export { default as rootExtraction } from './analysis/rootExtraction';
export {
  // Complete scholarly analysis
  analyzeWordComplete,
  getHistoricalLayer,
  getHistoricalEvolution,
  getGrammaticalAnomaly,
  getCognates as getRootCognates,

  // Enhanced analysis with binyan, dialect, semantic
  extractRootsEnhanced,
  analyzeBinyan,
  detectDialect,
  detectCitations,
  getSemanticField,
  getRootFamily as getRootFamilyV6,

  // ★ PREFERRED: Direct dictionary validation (no callbacks needed!)
  extractRootsWithDirectValidation,
  validateWithDirectDictionaries,

  // Standard extraction (with optional callback)
  extractRoots,
  generateHypotheses,
  getBestRoot,
  getTopRoots,

  // Legacy compatibility (use extractRootsWithDirectValidation instead)
  extractRootsMultiHypothesis,
  extractAllPossibleRoots,

  // Comprehensive linguistic patterns
  PREFIX_PATTERNS,
  SUFFIX_PATTERNS,
  NOUN_PATTERNS,
  getSourcesForContext,

  // Configuration
  DICTIONARY_TIERS,
  WEAK_VERB_TYPES,
  BINYANIM,

  // Cache management
  clearCache as clearRootCache,
  getCacheStats as getRootCacheStats,

  // Telemetry
  getTelemetry as getRootTelemetry,
  resetTelemetry as resetRootTelemetry
} from './analysis/rootExtraction';

// =============================================================================
// Service Preloader - Parallel initialization
// =============================================================================
export { default as servicePreloader } from './servicePreloader';
export {
  preloadServices as preloadAllServices,
  preloadCriticalServices,
  getPreloadStatus as getServicePreloadStatus,
  isServiceLoaded
} from './servicePreloader';

// =============================================================================
// UNIFIED CACHE SYSTEM
// =============================================================================
export { wordLookupCache, WordLookupCache } from './cacheOrchestrator';

// =============================================================================
// LINGUISTIC ANALYSIS - Advanced Linguistic Analysis + Historical & Cognate Data
// =============================================================================
export { default as linguisticAnalysis } from './analysis/linguisticAnalysis';
export {
  PRO_SCHOLAR_V6_VERSION,
  // Binyan analysis
  BINYAN_ANALYSIS,
  analyzeBinyan as analyzeWordBinyan,
  // Dialect detection
  DIALECT_MARKERS,
  detectAramaicDialect,
  // Citation patterns
  CITATION_PATTERNS,
  detectCitationPatterns,
  // Root family
  expandRootFamily,
  // Semantic fields
  SEMANTIC_FIELDS as V6_SEMANTIC_FIELDS,
  identifySemanticField,
  // Contextual analysis
  applyContextualBoost,
  // Cross-references
  BIBLICAL_BOOKS,
  detectCrossReferences,
  analyzeWordV6,

  // Historical Layers
  HISTORICAL_LAYERS,
  HISTORICAL_EVOLUTION,
  detectHistoricalLayer,

  // Grammatical Anomalies
  GRAMMATICAL_ANOMALIES,
  checkGrammaticalAnomaly,

  // Cognate Languages
  COGNATE_LANGUAGES,
  ROOT_COGNATES,
  getCognates,

  // Enhanced Analysis
  analyzeWordV6Enhanced
} from './analysis/linguisticAnalysis';

// =============================================================================
// PRO SCHOLAR ENGINE - Unified Orchestrator
// =============================================================================
export { default as ProScholarEngine } from './ProScholarEngine';
export {
  ENGINE_VERSION,
  // Main analysis functions
  analyzeWord as engineAnalyzeWord,
  analyzeWords as engineAnalyzeWords,
  quickLookup as engineQuickLookup,
  // Gematria calculator
  GematriaCalculator,
  // Word evolution tracker
  WordEvolutionTracker,
  // Difficulty scorer
  DifficultyScorer,
  // Parallel text finder
  ParallelTextFinder,
  // Engine management
  EngineManager
} from './ProScholarEngine';

// =============================================================================
// CACHE ORCHESTRATOR - Unified Cache Management
// =============================================================================
export { default as CacheOrchestrator } from './cacheOrchestrator';
export {
  // Registration
  registerCache,
  unregisterCache,
  getCache,
  // Telemetry
  recordOperation,
  getGlobalTelemetry,
  getPerformanceMetrics,
  // Operations
  clearAllCaches,
  pruneExpiredEntries,
  getMemoryPressure,
  autoManageCaches,
  // Factory
  createManagedCache,
  // Constants
  CACHE_CONFIGS
} from './cacheOrchestrator';

// =============================================================================
// TELEMETRY SERVICE - Unified Analytics
// =============================================================================
export { default as TelemetryService } from './telemetryService';
export {
  // Recording
  recordLookup,
  recordV6Analysis,
  recordTiming,
  recordError,
  recordDictionaryLookup,
  // Retrieval
  getTelemetry,
  getCacheStats as getTelemetryCacheStats,
  getRecentPerformance,
  getDictionaryStats,
  getPerformanceAlerts,
  // Control
  resetTelemetry,
  exportTelemetry
} from './telemetryService';

// =============================================================================
// SCHOLARLY SOURCE AGGREGATOR
// Parallel source fetching with expert consensus scoring
// =============================================================================
export { default as scholarSourceAggregator } from './scholarSourceAggregator';
export {
  // Source tiers & classification (aliased to avoid collision with unifiedLookupService)
  SCHOLARLY_TIERS as AGGREGATOR_SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  getSourceTier,

  // Consensus analysis
  calculateConsensus,
  formatConsensusForUI,

  // Parallel aggregation
  parallelSourceLookup,
  aggregateLocalSources,
  createAggregatedResult,

  // Enhanced parallel fetching (aliased - also exported from unifiedLookupService)
  raceWithEarlyReturn as aggregatorRaceWithEarlyReturn,

  // Pipeline integration helpers (aliased - also exported from unifiedLookupService)
  mergeSourcesIntoContext,
  rankSourcesByTier as aggregatorRankSourcesByTier,
  getResultQualityScore as aggregatorGetResultQualityScore,

  // Scholarly comparison
  generateSourceComparison,
  getCachedAggregation
} from './scholarSourceAggregator';

// =============================================================================
// WORD PREFETCH SERVICE
// Intelligent prefetching for faster lookup experience
// =============================================================================
export { default as wordPrefetchService } from './wordPrefetchService';
export {
  // Verse prefetching
  prefetchVerse,
  prefetchVerses,
  prefetchWord,

  // Queue management
  clearPrefetchQueue,
  getPrefetchStatus,

  // Warmup
  warmupCommonWords,

  // React integration
  createPrefetchHandlers,

  // Configuration
  PREFETCH_CONFIG
} from './wordPrefetchService';

// =============================================================================
// ETYMOLOGY ENRICHMENT SERVICE - Scholar Pro
// Multi-source etymology: BDB, Jastrow, CAL, Sefaria (17,976+ entries)
// =============================================================================
export { default as etymologyEnrichmentService } from './dictionaries/etymologyEnrichmentService';
export {
  // Main etymology lookup
  getEnrichedEtymology,
  getEnrichedEtymologySync,

  // Specific data access
  getCognates as getEnrichedCognates,
  getCrossReferences as getEnrichedCrossRefs,
  isAramaic as isWordAramaic,
  getSemanticField as getEnrichedSemanticField,

  // Scholar Pro: Dialect & Attestation (CAL data)
  getDialects as getWordDialects,
  getAttestations as getWordAttestations,
  getAllDefinitions as getAllWordDefinitions,

  // Search functions
  findWordsByCognateLanguage,
  findWordsBySemanticField,
  findWordsByDialect,

  // Data management
  getDataStatistics as getEtymologyStats,
  getDataSource as getEtymologyDataSource,
  preloadEnrichedData,
  isDataLoaded as isEtymologyLoaded,
  getRawEntry as getRawEtymologyEntry
} from './dictionaries/etymologyEnrichmentService';
