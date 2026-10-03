// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// =============================================================================
// Web Storage shim (vitest 4 + jsdom 29)
// =============================================================================
// Le populateGlobal de vitest encapsule les getters du window jsdom et capture
// leur valeur avant que l'origine ne soit valide : localStorage/sessionStorage
// arrivent comme des objets vides (getItem/setItem/clear absents). On remplace
// par un stockage en mémoire si (et seulement si) l'implémentation est cassée.
const installStorageShim = (name) => {
  const current = globalThis[name];
  if (current && typeof current.getItem === 'function') return;

  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(String(key)); },
    clear: () => { store.clear(); },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };

  Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
  try {
    Object.defineProperty(globalThis.window, name, { value: storage, configurable: true, writable: true });
  } catch { /* window non redéfinissable */ }
};
installStorageShim('localStorage');
installStorageShim('sessionStorage');

// StorageEvent : jsdom 29 exige un vrai Storage jsdom pour init.storageArea —
// incompatible avec le shim ci-dessus. On pose storageArea en propriété
// d'instance (les hooks filtrants comparent e.storageArea à localStorage),
// en conservant le prototype pour instanceof.
const RealStorageEvent = globalThis.StorageEvent;
const TolerantStorageEvent = function (type, params = {}) {
  const { storageArea, ...rest } = params || {};
  const event = new RealStorageEvent(type, rest);
  if (params && 'storageArea' in params) {
    Object.defineProperty(event, 'storageArea', {
      value: storageArea ?? globalThis.localStorage,
      configurable: true
    });
  }
  return event;
};
Object.setPrototypeOf(TolerantStorageEvent, RealStorageEvent);
TolerantStorageEvent.prototype = RealStorageEvent.prototype;
globalThis.StorageEvent = TolerantStorageEvent;

// =============================================================================
// Mock dictionaryLoader for tests
// =============================================================================
// Provides comprehensive mock data for Hebrew/Aramaic dictionary lookups.
// This allows tests to run without loading large JSON files.
// Note: vi.mock is hoisted, so all data must be defined inside the factory.

vi.mock('./services/dictionaries/dictionaryLoader', () => {
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

  // PRO SCHOLAR V16: Klein etymological dictionary
  const kleinData = {
    'מלך': { lemma: 'מֶלֶךְ', definition: 'king', pos: 'noun', source: 'Klein' },
  };

  return {
    __esModule: true,
    // Data getters (primary interface for unifiedLookupService)
    getBDBData: vi.fn(() => ({ byWord: bdbData, byStrongs: strongsData.byNumber })),
    getJastrowData: vi.fn(() => jastrowData),
    getStrongsData: vi.fn(() => strongsData),
    // Additional data getters for unifiedLookupService
    getCALAramaicData: vi.fn(() => calAramaicData),
    getJastrowAramaicData: vi.fn(() => jastrowAramaicData),
    // Lexiques complets (accès sync au cache) — consommés par la chaîne WordsTab
    getBDBLexiconData: vi.fn(() => ({ byWord: bdbData, byStrongs: strongsData.byNumber })),
    getBDBAramaicData: vi.fn(() => jastrowAramaicData),
    getJastrowLexiconData: vi.fn(() => jastrowData),
    getStrongLexiconData: vi.fn(() => strongsData),
    // PRO SCHOLAR V15: Academic Sources (streamlined)
    getGeseniusLexiconData: vi.fn(() => geseniusData),
    // PRO SCHOLAR V16: Klein (added with the academic sources)
    getKleinLexiconData: vi.fn(() => kleinData),
    // PRO SCHOLAR V15/V16: Async loaders for academic sources
    getGeseniusLexicon: vi.fn().mockResolvedValue(geseniusData),
    getKleinLexicon: vi.fn().mockResolvedValue(kleinData),
    preloadAcademicSources: vi.fn().mockResolvedValue(undefined),
    // Async loaders
    getBDB: vi.fn().mockResolvedValue({ byWord: bdbData }),
    getJastrow: vi.fn().mockResolvedValue(jastrowData),
    getStrongs: vi.fn().mockResolvedValue(strongsData),
    // Async lookups
    lookupBDBByWord: vi.fn((word) => Promise.resolve(bdbData[word] || null)),
    lookupJastrowByWord: vi.fn((word) => Promise.resolve(jastrowData[word] || null)),
    lookupStrongsByWord: vi.fn((word) => Promise.resolve(strongsData.byWord?.[word] || null)),
    lookupStrongsByNumber: vi.fn((num) => Promise.resolve(strongsData.byNumber?.[num] || null)),
    // Sync lookups
    lookupBDBSync: vi.fn((word) => bdbData[word] || null),
    lookupJastrowSync: vi.fn((word) => jastrowData[word] || null),
    lookupStrongsSync: vi.fn((word) => strongsData.byWord?.[word] || null),
    // Utility functions
    isDictionaryLoaded: vi.fn(() => true),
    preloadAllDictionaries: vi.fn().mockResolvedValue(undefined),
    preloadLexicons: vi.fn().mockResolvedValue(undefined),
    // Root meanings data for rootDatabase.js lazy proxy
    getRootMeaningsData: vi.fn(() => ({
      'מלך': { base: 'king', causative: 'make king', semantic_field: 'governance' },
      'ארץ': { base: 'land', semantic_field: 'geography' },
      'כתב': { base: 'write', causative: 'dictate', semantic_field: 'communication' },
    })),
    getSemanticFieldsData: vi.fn(() => ({
      'governance': ['מלך', 'שפט', 'משל'],
      'geography': ['ארץ', 'שמים'],
    })),
    getRootMeanings: vi.fn().mockResolvedValue({
      'מלך': { base: 'king', causative: 'make king' },
    }),
    getSemanticFields: vi.fn().mockResolvedValue({
      'governance': ['מלך'],
    }),
    // Common words for preloading
    COMMON_HEBREW_WORDS: ['מלך', 'ארץ', 'כל', 'בית'],
    COMMON_ARAMAIC_WORDS: ['מלכא', 'ארעא'],
    // PRO SCHOLAR V12: Etymology databases
    getSefariaCache: vi.fn().mockResolvedValue({
      'מלך': { definition: 'king', root: 'מלך', source: 'BDB Dictionary' },
    }),
    getRootMeaningsPro: vi.fn().mockResolvedValue({
      'מלך': { root: 'מלך', cognates: { akkadian: ['malku'] }, qualityScore: 80 },
    }),
    getEtymologyBDB: vi.fn().mockResolvedValue({
      'מלך': { cognates: { akkadian: [{ word: 'malku', meaning: 'king' }] } },
    }),
    getEtymologyJastrow: vi.fn().mockResolvedValue({
      'מלכא': { crossRefs: ['מלך'] },
    }),
    getWiktionaryCache: vi.fn().mockResolvedValue({
      'מלך': { protoSemitic: '*mlk', cognates: { arabic: ['malik'] } },
    }),
    // PRO SCHOLAR V12: Comprehensive lookup function
    lookupAllEtymology: vi.fn().mockImplementation((word) => {
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
    preloadEtymologyDatabases: vi.fn().mockResolvedValue(undefined),
    // PRO SCHOLAR V13: Preload synchronization
    waitForPreload: vi.fn().mockResolvedValue(true),
    isCoreDictionariesLoaded: vi.fn(() => true),
  };
});

