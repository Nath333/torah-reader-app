/**
 * Tests for sefariaApi — URL building, mapping, caching, 429, partial failures
 * fetch est mocké ; aucune requête réseau réelle.
 */

import {
  getVerses,
  getVerse,
  getCommentary,
  clearCaches,
  isTorahBook,
  isTalmudBook,
  isMishnahBook,
  getTorahBooks,
  getMishnahSedarim
} from './sefariaApi';

global.fetch = vi.fn();

const jsonOk = (data) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data)
});

beforeEach(() => {
  fetch.mockReset();
  clearCaches();
});

describe('helpers livres', () => {
  test('getTorahBooks renvoie les 5 livres', () => {
    expect(getTorahBooks()).toHaveLength(5);
  });

  test('isTorahBook / isTalmudBook / isMishnahBook', () => {
    expect(isTorahBook('Genesis')).toBe(true);
    expect(isTorahBook('Berakhot')).toBe(false);
    expect(isTalmudBook('Berakhot')).toBe(true);
    expect(isTalmudBook('Genesis')).toBe(false);
    const firstMishnah = Object.values(getMishnahSedarim())[0]?.tractates?.[0];
    expect(firstMishnah).toBeTruthy();
    expect(isMishnahBook(firstMishnah)).toBe(true);
  });
});

describe('getVerses', () => {
  test('construit l URL Sefaria et mappe he/text sur les versets', async () => {
    fetch.mockResolvedValueOnce(jsonOk({ he: ['בְּרֵאשִׁית', 'וַיֹּאמֶר'], text: ['In the beginning', 'And He said'] }));

    const verses = await getVerses('Genesis', 1);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://www.sefaria.org/api/texts/Genesis.1?context=0');
    expect(verses).toHaveLength(2);
    expect(verses[0]).toMatchObject({ verse: 1, hebrewText: 'בְּרֵאשִׁית', englishText: 'In the beginning' });
    expect(verses[1].rawEnglishHtml).toBe('And He said');
  });

  test('met en cache : deuxième appel = aucun fetch supplémentaire', async () => {
    fetch.mockResolvedValue(jsonOk({ he: ['א'], text: ['a'] }));

    await getVerses('Exodus', 2);
    await getVerses('Exodus', 2);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('gère les réponses scalaires (he/text non-tableaux)', async () => {
    fetch.mockResolvedValueOnce(jsonOk({ he: 'שָׁלוֹם', text: 'Peace' }));

    const verses = await getVerses('Tehilim', 23);
    expect(verses).toHaveLength(1);
    expect(verses[0].hebrewText).toBe('שָׁלוֹם');
  });

});

describe('getVerse', () => {
  test('joint les tableaux et renvoie ref/heRef/hebrew/english', async () => {
    fetch.mockResolvedValueOnce(jsonOk({
      ref: 'Genesis.1.1',
      heRef: 'בראשית א, א',
      he: ['בְּרֵאשִׁית', 'בָּרָא'],
      text: ['In the <b>beginning</b>', 'God created']
    }));

    const verse = await getVerse('Genesis.1.1');

    expect(verse.ref).toBe('Genesis.1.1');
    expect(verse.hebrew).toBe('בְּרֵאשִׁית בָּרָא');
    expect(verse.english).not.toContain('<b>');
    expect(verse.english).toContain('beginning');
  });

  test('renvoie null si le fetch échoue (au lieu de jeter)', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getVerse('DoesNotExist.99.9')).resolves.toBeNull();
  });
});

describe('getCommentary', () => {
  test('agrège les commentateurs et tolère un échec partiel (allSettled)', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.includes('Onkelos')) {
        return { ok: false, status: 500, json: () => Promise.resolve({}) };
      }
      return jsonOk({ he: 'פירוש', text: 'Commentary in English' });
    });

    const result = await getCommentary('Genesis', 1, 1);

    // 6 commentateurs pour un livre de Torah
    expect(fetch).toHaveBeenCalledTimes(6);
    const sources = new Set(result.map((c) => c.source));
    expect(sources.has('Rashi')).toBe(true);
    expect(sources.has('Onkelos')).toBe(false);
    expect(sources.has('Ramban')).toBe(true);
    // hébreu + anglais présents
    expect(result.some((c) => c.language === 'hebrew')).toBe(true);
    expect(result.some((c) => c.language === 'english' && c.isTranslated === false)).toBe(true);
  });

  test('met le résultat en cache (échec compris : aucun second fetch)', async () => {
    fetch.mockResolvedValue(jsonOk({ he: 'x', text: 'y' }));

    await getCommentary('Leviticus', 3, 5);
    await getCommentary('Leviticus', 3, 5);

    expect(fetch).toHaveBeenCalledTimes(6);
  });
});

describe('limitation de débit (DOIT rester en dernier : état 429 global dans http.js)', () => {
  test('échoue avec un message clair sur 429', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => '60' }
    });

    await expect(getVerses('RateLimitBook', 7)).rejects.toThrow('Failed to load RateLimitBook 7');
  });
});
