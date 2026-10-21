/**
 * Smoke tests de la surface publique de dictionaryLoader (post-split
 * docs/DECOUPE-MONOLITHES.md). Pattern du test réel : vi.importActual
 * contourne le mock global de setupTests.js ; fetch mocké → aucun réseau,
 * tous les slots restent à null (cache froid, déterministe).
 */

global.fetch = vi.fn();

let loader;

beforeAll(async () => {
  loader = await vi.importActual('./dictionaryLoader');
});

describe('dictionaryLoader (façade) — surface publique', () => {
  test('le default export agrège toutes les familles de fonctions', () => {
    for (const fn of [
      'getBDB', 'lookupBDBByWord', 'lookupBDBByStrongs', 'lookupBDBSync', 'getBDBData',
      'getJastrow', 'lookupJastrowByWord', 'lookupJastrowSync', 'getJastrowData',
      'getStrongs', 'lookupStrongsByWord', 'lookupStrongsByNumber', 'lookupStrongsSync', 'getStrongsData',
      'getBDBLexicon', 'getCALAramaic', 'getGeseniusLexiconData', 'getKleinLexiconData',
      'getRootMeaningsData', 'getSefariaCacheData', 'getWiktionaryCacheData',
      'lookupAllEtymology', 'preloadEtymologyDatabases',
      'getRootMeaning', 'getRootMeaningFromAllSources', 'getRootMeaningAsync',
      'preloadDictionaries', 'preloadLexicons', 'preloadAcademicSources', 'preloadScholarlyData',
      'isDictionaryLoaded', 'isDictionaryLoading', 'getLoadingStatus', 'getCacheStatus', 'clearCache',
      'lookupAllDictionaries', 'lookupAllSync',
      'initializeDictionaries', 'initializePreload', 'preloadForBook', 'classifyBookCategory',
      'shouldPreload', 'waitForPreload', 'isCoreDictionariesLoaded',
      'getTextAttestations', 'getDictionaryHealth'
    ]) {
      expect(typeof loader[fn]).toBe('function');
    }
  });

  test('les listes de mots courants sont exposées', () => {
    // Nommées sur la façade ET dans le default export (commentaire historique)
    expect(loader.COMMON_HEBREW_WORDS.length).toBeGreaterThan(50);
    expect(loader.COMMON_ARAMAIC_WORDS).toContain('גמרא');
  });

  test('classifyBookCategory range les livres par catégorie', () => {
    expect(loader.classifyBookCategory('Genesis')).toBe('tanakh');
    expect(loader.classifyBookCategory(null)).toBe('mixed');
    expect(loader.classifyBookCategory('Livre inconnu')).toBe('mixed');
  });

  test('état du cache froid : statuts à false, statut complet 16 clés', () => {
    expect(loader.isDictionaryLoaded('bdb')).toBe(false);
    expect(loader.isDictionaryLoading('bdb')).toBe(false);
    // loadingState (loaderCore) couvre tous les slots, pas seulement le trio
    expect(loader.getLoadingStatus().bdb).toBe(false);
    expect(loader.getLoadingStatus().jastrow).toBe(false);
    const status = loader.getCacheStatus();
    expect(Object.keys(status).length).toBe(16);
    expect(status.bdb).toBe(false);
    expect(status.wiktionaryCache).toBe(false);
  });

  test('clearCache ne crashe pas (nommé et global)', () => {
    expect(() => loader.clearCache('bdb')).not.toThrow();
    expect(() => loader.clearCache()).not.toThrow();
  });

  test('lookups sync sur cache froid → null partout', () => {
    expect(loader.lookupBDBSync('מלך')).toBeNull();
    expect(loader.lookupJastrowSync('מלכא')).toBeNull();
    expect(loader.lookupStrongsSync('מלך')).toBeNull();
    expect(loader.lookupAllSync('מלך')).toEqual({ bdb: null, jastrow: null, strongs: null });
    expect(loader.getRootMeaning('מלך')).toBeNull();
    expect(loader.getRootMeaningFromAllSources('מלך')).toBeNull();
    expect(loader.getBDBData()).toBeNull();
    expect(loader.getCALAramaicData()).toBeNull();
  });

  test('lookupAllEtymology sur échec de chargement → hasEtymology false', async () => {
    const res = await loader.lookupAllEtymology('מלך');
    expect(res).toMatchObject({ hasEtymology: false, lookupWord: 'מלך' });
    expect(Array.isArray(res.alternativeRoots)).toBe(true);
  });

  test('preload de catégorie + waitForPreload résolvent sans réseau', async () => {
    await expect(loader.preloadForBook('Genesis')).resolves.toBeUndefined();
    await expect(loader.preloadDictionaries()).resolves.toBeUndefined();
    const ready = await loader.waitForPreload();
    expect(typeof ready).toBe('boolean');
    expect(typeof loader.isCoreDictionariesLoaded()).toBe('boolean');
    expect(typeof loader.shouldPreload()).toBe('boolean');
  });
});
