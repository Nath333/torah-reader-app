/**
 * Tests pour le VRAI dictionaryLoader (vi.importActual contourne le mock
 * global de setupTests.js) — chargement réseau mocké, santé, lookups.
 *
 * ATTENTION : le cache du loader est module-level. Chaque test utilise un
 * slot (bdb, bdbLexicon, jastrowLexicon, strongs…) différent pour rester
 * indépendant — ne pas réutiliser un slot entre deux tests.
 */

global.fetch = vi.fn();

const jsonOk = (data) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(data)
});

const BDB = {
  byWord: {
    'מלך': { definition: 'king, reign', strongNumber: 'H4428' },
    'ארץ': { definition: 'land, earth', strongNumber: 'H776' }
  },
  byStrongs: { 'H215': { word: 'אור', definition: 'light' } }
};

let loader;

beforeAll(async () => {
  loader = await vi.importActual('./dictionaryLoader');
});

beforeEach(() => {
  fetch.mockReset();
});

describe('dictionaryLoader réel — chargement et lookup BDB (slot bdb)', () => {
  test('fetch le JSON attendu et lookupBDBSync trouve les entrées', async () => {
    fetch.mockResolvedValueOnce(jsonOk(BDB));

    const data = await loader.getBDB();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/data/bdbComplete.json');
    expect(data).toBe(BDB);
    expect(loader.lookupBDBSync('מלך')).toMatchObject({ definition: 'king, reign' });
  });

  test('lookupBDBSync tolère les voyelles (nikud) ; inconnu → null', () => {
    expect(loader.lookupBDBSync('מֶלֶךְ')).toMatchObject({ definition: 'king, reign' });
    expect(loader.lookupBDBSync('קקקקקק')).toBeNull();
  });

  test('lookupBDBByStrongs interroge l index byStrongs', async () => {
    const hit = await loader.lookupBDBByStrongs('H215');
    expect(hit).toMatchObject({ word: 'אור' });
    expect(await loader.lookupBDBByStrongs('H99999')).toBeNull();
  });
});

describe('dictionaryLoader réel — santé et échecs (slots distincts)', () => {
  test('un échec réseau passe le dictionnaire en failed et est listé (slot bdbLexicon)', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    // l'erreur d'origine est relancée ; la classification va dans la santé
    await expect(loader.getBDBLexicon()).rejects.toThrow('Failed to fetch');

    const unhealthy = loader.getUnhealthyDictionaries();
    const bdbLex = unhealthy.find((d) => d.name === 'bdbLexicon');
    expect(bdbLex).toBeDefined();
    expect(bdbLex.error).toContain('bdbLexicon');
    expect(bdbLex.error).toContain('Network error');
    expect(loader.getDictionaryHealthSummary().failed).toBeGreaterThanOrEqual(1);
  });

  test('réessai possible après échec (promesse nettoyée, slot jastrowLexicon)', async () => {
    fetch.mockRejectedValueOnce(new Error('HTTP 500 loading jastrowLexicon'));
    await expect(loader.getJastrowLexicon()).rejects.toThrow();

    fetch.mockResolvedValueOnce(jsonOk({ 'מלכא': { definition: 'king' } }));
    const data = await loader.getJastrowLexicon();
    expect(data).toMatchObject({ 'מלכא': { definition: 'king' } });
  });

  test('les réponses non-JSON sont rejetées avec un message clair (slot strongs)', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      json: () => Promise.resolve({})
    });

    await expect(loader.getStrongs()).rejects.toThrow('Expected JSON');
  });
});
