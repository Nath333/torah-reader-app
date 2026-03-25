// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// =============================================================================
// Mock dictionaryLoader for tests
// =============================================================================
// Provides comprehensive mock data for Hebrew/Aramaic dictionary lookups.
// This allows tests to run without loading large JSON files.
// Note: jest.mock is hoisted, so all data must be defined inside the factory.

jest.mock('./services/dictionaryLoader', () => {
  // Hebrew words (BDB dictionary)
  const bdbData = {
    'מלך': { definition: 'king, reign', lemma: 'מלך', strongNumber: 'H4428' },
    'ארץ': { definition: 'land, earth, country', lemma: 'ארץ', strongNumber: 'H776' },
    'כל': { definition: 'all, every, whole', lemma: 'כל', strongNumber: 'H3605' },
    'בית': { definition: 'house, household', lemma: 'בית', strongNumber: 'H1004' },
    'אדם': { definition: 'man, mankind, Adam', lemma: 'אדם', strongNumber: 'H120' },
    'יום': { definition: 'day', lemma: 'יום', strongNumber: 'H3117' },
    'עם': { definition: 'people, nation', lemma: 'עם', strongNumber: 'H5971' },
    'דבר': { definition: 'word, thing, matter', lemma: 'דבר', strongNumber: 'H1697' },
  };

  // Aramaic words (Jastrow dictionary)
  const jastrowData = {
    'מלכא': { definition: 'king', isAramaic: true },
    'ארעא': { definition: 'land, earth', isAramaic: true },
    'דינא': { definition: 'judgment, law', isAramaic: true },
    'ביתא': { definition: 'house', isAramaic: true },
    'גברא': { definition: 'man', isAramaic: true },
    'אמר': { definition: 'he said', isAramaic: false },
    'רב': { definition: 'Rabbi, master', isAramaic: false },
  };

  // Strong's concordance
  const strongsData = {
    byWord: { ...bdbData },
    byNumber: {
      'H4428': { word: 'מלך', definition: 'king' },
      'H776': { word: 'ארץ', definition: 'earth, land' },
      'H3605': { word: 'כל', definition: 'all, every' },
    }
  };

  // CAL Aramaic data
  const calAramaicData = {
    'מלכא': { definition: 'king', dialect: 'Jewish Palestinian Aramaic' },
  };

  // Jastrow Aramaic data
  const jastrowAramaicData = {
    'מלכא': { definition: 'king', source: 'Jastrow Aramaic' },
  };

  // PRO SCHOLAR V15: Academic Sources (streamlined - only FREE sources)
  // Gesenius - Classical Hebrew grammar reference (public domain)
  const geseniusData = {
    'מלך': { lemma: 'מֶלֶךְ', definition: 'king', pos: 'noun', source: 'Gesenius' },
  };

  return {
    __esModule: true,
    // Data getters (primary interface for unifiedLookupService)
    getBDBData: jest.fn(() => ({ byWord: bdbData, byStrongs: strongsData.byNumber })),
    getJastrowData: jest.fn(() => jastrowData),
    getStrongsData: jest.fn(() => strongsData),
    // Additional data getters for unifiedLookupService
    getCALAramaicData: jest.fn(() => calAramaicData),
    getJastrowAramaicData: jest.fn(() => jastrowAramaicData),
    // PRO SCHOLAR V15: Academic Sources (streamlined)
    getGeseniusLexiconData: jest.fn(() => geseniusData),
    // PRO SCHOLAR V15: Async loaders for academic sources
    getGeseniusLexicon: jest.fn().mockResolvedValue(geseniusData),
    preloadAcademicSources: jest.fn().mockResolvedValue(undefined),
    // Async loaders
    getBDB: jest.fn().mockResolvedValue({ byWord: bdbData }),
    getJastrow: jest.fn().mockResolvedValue(jastrowData),
    getStrongs: jest.fn().mockResolvedValue(strongsData),
    // Async lookups
    lookupBDBByWord: jest.fn((word) => Promise.resolve(bdbData[word] || null)),
    lookupJastrowByWord: jest.fn((word) => Promise.resolve(jastrowData[word] || null)),
    lookupStrongsByWord: jest.fn((word) => Promise.resolve(strongsData.byWord?.[word] || null)),
    lookupStrongsByNumber: jest.fn((num) => Promise.resolve(strongsData.byNumber?.[num] || null)),
    // Sync lookups
    lookupBDBSync: jest.fn((word) => bdbData[word] || null),
    lookupJastrowSync: jest.fn((word) => jastrowData[word] || null),
    lookupStrongsSync: jest.fn((word) => strongsData.byWord?.[word] || null),
    // Utility functions
    isDictionaryLoaded: jest.fn(() => true),
    preloadAllDictionaries: jest.fn().mockResolvedValue(undefined),
    // Root meanings data for rootDatabase.js lazy proxy
    getRootMeaningsData: jest.fn(() => ({
      'מלך': { base: 'king', causative: 'make king', semantic_field: 'governance' },
      'ארץ': { base: 'land', semantic_field: 'geography' },
      'כתב': { base: 'write', causative: 'dictate', semantic_field: 'communication' },
    })),
    getSemanticFieldsData: jest.fn(() => ({
      'governance': ['מלך', 'שפט', 'משל'],
      'geography': ['ארץ', 'שמים'],
    })),
    getRootMeanings: jest.fn().mockResolvedValue({
      'מלך': { base: 'king', causative: 'make king' },
    }),
    getSemanticFields: jest.fn().mockResolvedValue({
      'governance': ['מלך'],
    }),
    // Common words for preloading
    COMMON_HEBREW_WORDS: ['מלך', 'ארץ', 'כל', 'בית'],
    COMMON_ARAMAIC_WORDS: ['מלכא', 'ארעא'],
    // PRO SCHOLAR V12: Etymology databases
    getSefariaCache: jest.fn().mockResolvedValue({
      'מלך': { definition: 'king', root: 'מלך', source: 'BDB Dictionary' },
    }),
    getRootMeaningsPro: jest.fn().mockResolvedValue({
      'מלך': { root: 'מלך', cognates: { akkadian: ['malku'] }, qualityScore: 80 },
    }),
    getEtymologyBDB: jest.fn().mockResolvedValue({
      'מלך': { cognates: { akkadian: [{ word: 'malku', meaning: 'king' }] } },
    }),
    getEtymologyJastrow: jest.fn().mockResolvedValue({
      'מלכא': { crossRefs: ['מלך'] },
    }),
    getWiktionaryCache: jest.fn().mockResolvedValue({
      'מלך': { protoSemitic: '*mlk', cognates: { arabic: ['malik'] } },
    }),
    // PRO SCHOLAR V12: Comprehensive lookup function
    lookupAllEtymology: jest.fn().mockImplementation((word) => {
      return Promise.resolve({
        sefaria: word === 'מלך' ? { definition: 'king', root: 'מלך' } : null,
        rootMeaningsPro: word === 'מלך' ? { root: 'מלך', qualityScore: 80 } : null,
        etymologyBDB: word === 'מלך' ? { cognates: { akkadian: [{ word: 'malku' }] } } : null,
        etymologyJastrow: null,
        wiktionary: word === 'מלך' ? { protoSemitic: '*mlk' } : null,
        hasEtymology: word === 'מלך'
      });
    }),
    // PRO SCHOLAR V12: Etymology database preloading
    preloadEtymologyDatabases: jest.fn().mockResolvedValue(undefined),
    // PRO SCHOLAR V13: Preload synchronization
    waitForPreload: jest.fn().mockResolvedValue(true),
    isCoreDictionariesLoaded: jest.fn(() => true),
  };
});
