// Dictionary & Translation Services
export { default as dictionaryLoader } from './dictionaryLoader';
export { default as hebrewDictionary } from './hebrewDictionary';
export { default as babylonianDictionary } from './babylonianDictionary';
export { default as calDictionaryService } from './calDictionaryService';
export { default as scholarlyLexiconService } from './scholarlyLexiconService';
export { default as wiktionaryService } from './wiktionaryService';
export { default as englishToFrenchService } from './englishToFrenchService';
export { default as etymologyEnrichmentService } from './etymologyEnrichmentService';

// Dictionary Loader
export {
  getBDB, getJastrow, getStrongs,
  lookupBDBByWord, lookupBDBByStrongs,
  lookupJastrowByWord, lookupStrongsByWord, lookupStrongsByNumber,
  lookupAllDictionaries,
  lookupBDBSync, lookupJastrowSync, lookupStrongsSync, lookupAllSync,
  getBDBData, getJastrowData, getStrongsData,
  preloadDictionaries, isDictionaryLoaded, isDictionaryLoading,
  getLoadingStatus as getDictionaryLoadingStatus,
  getCacheStatus as getDictionaryCacheStatus,
  clearCache as clearDictionaryCache
} from './dictionaryLoader';

// Aramaic
export { lookupAramaicWord, isLikelyAramaic } from './babylonianDictionary';

// CAL Dictionary (API)
export {
  hebrewToCalTransliteration, calToHebrewTransliteration,
  browseCalLemmas, getCalEntry,
  lookupAramaicWord as lookupCalAramaicWord,
  searchCalByPrefix, translateAramaicText,
  analyzePrefix as analyzeAramaicPrefix,
  lookupWithFallback as lookupCalWithFallback,
  getCacheStats as getCalCacheStats,
  clearCache as clearCalCache
} from './calDictionaryService';

// Scholarly Lexicon
export {
  lookupJastrow, lookupWordSefaria,
  getSimpleTranslation, scholarlyLookup,
  getEtymology, SCHOLARLY_SOURCES
} from './scholarlyLexiconService';

// Wiktionary
export {
  lookupWiktionary, fetchWiktionaryEtymology,
  isWiktionaryAvailable, clearWiktionaryCache,
  getProtoSemitic, hasProtoSemitic, loadCachedEtymology
} from './wiktionaryService';

// English -> French
export {
  translateEnglishToFrench,
  translateWithSource as translateWithSourceFr,
  quickTranslate
} from './englishToFrenchService';

// Etymology Enrichment
export {
  getEnrichedEtymology, getEnrichedEtymologySync,
  getCognates as getEnrichedCognates,
  getCrossReferences as getEnrichedCrossRefs,
  isAramaic as isWordAramaic,
  getSemanticField as getEnrichedSemanticField,
  getDialects as getWordDialects,
  getAttestations as getWordAttestations,
  getAllDefinitions as getAllWordDefinitions,
  findWordsByCognateLanguage, findWordsBySemanticField, findWordsByDialect,
  getDataStatistics as getEtymologyStats,
  getDataSource as getEtymologyDataSource,
  preloadEnrichedData,
  isDataLoaded as isEtymologyLoaded,
  getRawEntry as getRawEtymologyEntry
} from './etymologyEnrichmentService';
