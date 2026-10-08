/**
 * Kit hors-ligne Sefaria — le repli offline de getVerses/getOnkelos doit
 * servir les chapitres du kit quand le réseau échoue, au même format que
 * l'API (he/text par chapitre).
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const KIT = {
  generatedAt: '2026-10-02T00:00:00Z',
  books: {
    Genesis: {
      versions: [
        { lang: 'Hebrew', chapters: [['בראשית ברא', 'והארץ היתה תהו']] },
        { lang: 'English', chapters: [['In the beginning God created', 'The earth was void']] }
      ]
    },
    'Rashi_on_Genesis': {
      versions: [{ lang: 'Hebrew', chapters: [[['Rashi 1:1a', 'Rashi 1:1b'], ['Rashi 1:2']]] }]
    },
    'Onkelos_Genesis': {
      versions: [{ lang: 'Hebrew', chapters: [['בקדמין ברא ייי', 'וארעא הות צדיא']] }]
    }
  }
};

describe('sefariaOfflineKit', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).includes('sefaria-kit-torah.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(KIT) });
      }
      return Promise.reject(new Error('offline'));
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  test('getChapter renvoie he/text au format API', async () => {
    const { getChapter } = await import('../sefariaOfflineKit');
    const ch = await getChapter('Genesis', 1);
    expect(ch.he).toEqual(['בראשית ברא', 'והארץ היתה תהו']);
    expect(ch.text[0]).toBe('In the beginning God created');
  });

  test('les commentaires Rashi gardent leurs sous-commentaires', async () => {
    const { getChapter } = await import('../sefariaOfflineKit');
    const ch = await getChapter('Rashi_on_Genesis', 1);
    expect(Array.isArray(ch.he[0])).toBe(true);
    expect(ch.he[0][0]).toContain('Rashi 1:1a');
  });

  test('chapitre hors bornes et livre inconnu -> null', async () => {
    const { getChapter } = await import('../sefariaOfflineKit');
    expect(await getChapter('Genesis', 99)).toBeNull();
    expect(await getChapter('Zohar', 1)).toBeNull();
  });

  test('kit indisponible (fetch offline) -> getChapter null sans crash', async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const { getChapter } = await import('../sefariaOfflineKit');
    expect(await getChapter('Genesis', 1)).toBeNull();
  });

  test('repli getVerses : fetch réseau en échec -> versets servis par le kit', async () => {
    vi.resetModules();
    const kitFetch = vi.fn((url) => {
      if (String(url).includes('sefaria-kit-torah.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(KIT) });
      }
      return Promise.reject(new Error('offline'));
    });
    vi.stubGlobal('fetch', kitFetch);
    vi.doMock('../../utils/http', () => ({
      fetchWithFallback: vi.fn(() => Promise.reject(new Error('offline'))),
      default: vi.fn()
    }));
    const { getVerses } = await import('../sefariaApi');
    const verses = await getVerses('Genesis', 1);
    expect(verses).toHaveLength(2);
    expect(verses[0].hebrewText).toBe('בראשית ברא');
    expect(verses[0].englishText).toBe('In the beginning God created');
  });

  test('repli Rashi offline : chapitre entier servi par le kit', async () => {
    vi.resetModules();
    const kitFetch = vi.fn((url) => {
      if (String(url).includes('sefaria-kit-torah.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(KIT) });
      }
      return Promise.reject(new Error('offline'));
    });
    vi.stubGlobal('fetch', kitFetch);
    vi.doMock('../../../utils/http', () => ({
      fetchWithFallback: vi.fn(() => Promise.reject(new Error('offline'))),
      default: vi.fn()
    }));
    const { fetchTorahCommentary } = await import('../commentary/factory/factoryCore');
    const result = await fetchTorahCommentary('rashi', 'Genesis', 1);
    expect(result.offline).toBe(true);
    expect(result.source).toBe('Rashi');
    expect(result.comments).toBeDefined();
  });

  test('repli Rashi offline : un verset précis extrait du chapitre', async () => {
    vi.resetModules();
    const kitFetch = vi.fn((url) => {
      if (String(url).includes('sefaria-kit-torah.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(KIT) });
      }
      return Promise.reject(new Error('offline'));
    });
    vi.stubGlobal('fetch', kitFetch);
    vi.doMock('../../../utils/http', () => ({
      fetchWithFallback: vi.fn(() => Promise.reject(new Error('offline'))),
      default: vi.fn()
    }));
    const { fetchTorahCommentary } = await import('../commentary/factory/factoryCore');
    const result = await fetchTorahCommentary('rashi', 'Genesis', 1, 2);
    expect(result.offline).toBe(true);
    expect(result.verse).toBe(2);
    expect(JSON.stringify(result.comments)).toContain('Rashi 1:2');
    expect(JSON.stringify(result.comments)).not.toContain('Rashi 1:1a');
  });

  test('repli getOnkelos : araméen servi par le kit', async () => {
    vi.resetModules();
    const kitFetch = vi.fn((url) => {
      if (String(url).includes('sefaria-kit-torah.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(KIT) });
      }
      return Promise.reject(new Error('offline'));
    });
    vi.stubGlobal('fetch', kitFetch);
    vi.doMock('../../utils/http', () => ({
      fetchWithFallback: vi.fn(() => Promise.reject(new Error('offline'))),
      default: vi.fn()
    }));
    const { getOnkelos } = await import('../sefariaApi');
    const onkelos = await getOnkelos('Genesis', 1);
    expect(onkelos[0].aramaic).toContain('בקדמין');
  });
});
