// Services Index - Clean exports for all services
// Usage: import { sefariaApi, hebcalService } from './services';

// Core Services
export { default as audioService } from './audioService';
export { default as hebcalService } from './hebcalService';
export { default as pronunciationService } from './pronunciationService';
export { default as sefariaApi } from './sefariaApi';
export { default as targumService } from './targumService';

// Dictionary Services
export { default as hebrewDictionary } from './hebrewDictionary';
export { default as babylonianDictionary } from './babylonianDictionary';

// Translation Services
export { default as translationService } from './translationService';
export { default as combinedTranslationService } from './combinedTranslationService';
export { default as englishToFrenchService } from './englishToFrenchService';
export { default as scholarlyLexiconService } from './scholarlyLexiconService';

// Scholarly/Academic Services
export { default as discoursePatternService } from './discoursePatternService';
export { default as namedEntityService } from './namedEntityService';
export { default as talmudicAbbreviationsService } from './talmudicAbbreviationsService';

// AI Services
export { default as aiService } from './aiService';
export { default as groqService } from './groqService';

// Unified Analysis Service (routes between scholarly and AI)
export { default as analysisService } from './analysisService';
export { default as scholarlyAnalysisModes } from './scholarlyAnalysisModes';

// Commentary Services
export { default as rashiService } from './rashiService';
export { default as rambanService } from './rambanService';
export { default as tosafotService } from './tosafotService';
export { default as maharshaService } from './maharshaService';

// Unified Commentary Factory (new API)
export {
  getCommentary,
  checkCommentaryAvailability,
  clearAllCommentaryCaches
} from './commentaryServiceFactory';

// Legacy alias for backward compatibility
export { default as sefariaService } from './sefariaApi';

// =============================================================================
// Named exports for commonly used functions
// =============================================================================

// Audio
export {
  speakHebrew,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  createAudioQueue,
  getBestHebrewVoice
} from './audioService';

// Calendar
export {
  getWeeklyParsha,
  getDafYomi,
  getJewishDate,
  parshaToReference,
  getAliyot
} from './hebcalService';

// Targum
export {
  getOnkelos,
  getTargumJonathan,
  getAllTargumim,
  getAvailableTargumim,
  cleanAramaicText
} from './targumService';

// Pronunciation
export {
  TRADITIONS,
  getPronunciation,
  getParshaName,
  getPronunciationDifferences
} from './pronunciationService';

// Aramaic Dictionary
export {
  lookupAramaicWord,
  hasAramaicTranslation,
  isLikelyAramaic,
  getDictionaryStats
} from './babylonianDictionary';

// Scholarly Lexicon (Hebrew → English)
export {
  lookupJastrow,
  lookupWordSefaria,
  getSimpleTranslation,
  scholarlyLookup,
  getEtymology,
  SCHOLARLY_SOURCES
} from './scholarlyLexiconService';

// English → French Translation
export {
  translateEnglishToFrench,
  translateWithSource,
  quickTranslate,
  batchTranslateToFrench
} from './englishToFrenchService';

// AI/Groq
export {
  setGroqApiKey,
  getStoredApiKey,
  removeGroqApiKey,
  hasApiKey,
  checkGroqConnection,
  analyzeCommentary,
  ANALYSIS_MODES
} from './groqService';

export {
  askFollowUp,
  askQuestion,
  cancelRequest,
  isRequestActive,
  clearConversation
} from './aiService';

// Unified Analysis (scholarly + AI routing)
export {
  analyze,
  canUseScholarlyMode,
  requiresAI,
  getRecommendedType,
  analyzeScholaryOnly,
  analyzeWithAI,
  analyzeWithStreaming,
  SCHOLARLY_MODES
} from './analysisService';

// Scholarly Analysis Modes (rule-based, no AI)
export {
  analyzeScholarly,
  analyzePARDES,
  analyzeMefarshim,
  analyzeHalacha,
  analyzeLexicon,
  analyzeIntertextual,
  analyzeSummary
} from './scholarlyAnalysisModes';

// Ramban Commentary
export {
  getRambanOnTorah,
  getRambanForVerse,
  isRambanAvailable
} from './rambanService';

// Tosafot Commentary
export {
  getTosafotOnTalmud,
  getTosafotForDaf,
  isTosafotAvailable
} from './tosafotService';

// Maharsha Commentary
export {
  getMaharshaHalachot,
  getMaharshaAggadot,
  getMaharshaForDaf,
  isMaharshaAvailable
} from './maharshaService';

// =============================================================================
// Scholarly Analysis Exports
// =============================================================================

// Discourse Pattern Analysis
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

// Talmudic Abbreviations
export {
  findAbbreviations,
  expandAbbreviation,
  expandAllAbbreviations,
  ABBREVIATIONS
} from './talmudicAbbreviationsService';

// Scholarly API Service
export { default as scholarlyApiService } from './scholarlyApiService';
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

