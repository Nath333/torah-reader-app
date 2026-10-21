/**
 * Smoke tests de surface publique de sefariaApi (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue 20/10). Complète sefariaApi.test.js
 * (qui couvre getVerses/getVerse/getCommentary + caches + 429) : ici, chemins
 * purs uniquement — métadonnées de livres, parashiot, default export.
 */

import {
  getTorahBooks, getSefarimCategories, getBooksByCategory, isTorahBook, isTalmudBook,
  isMishnahBook, getMishnahSedarim, getChapters, getParshas, getShabbatDafList,
  clearCaches, sefariaApiRequest,
  getRashiOnTorah, getTosafotOnTalmud, getRambanForVerse,
  default as sefariaApi
} from './sefariaApi';

describe('sefariaApi (façade) — métadonnées et surface', () => {
  test('catégories et livres', () => {
    expect(getTorahBooks()).toHaveLength(5);
    const cats = getSefarimCategories();
    expect(Object.keys(cats).length).toBeGreaterThanOrEqual(4);
    expect(getBooksByCategory('torah')).toHaveLength(5);
    expect(isTorahBook('Genesis')).toBe(true);
    expect(isTalmudBook('Berakhot')).toBe(true);
    expect(isMishnahBook('Mishnah Berakhot')).toBe(true);
    expect(isTorahBook('Livre inconnu')).toBe(false);
  });

  test('comptes de chapitres et sedarim de la Mishna', () => {
    expect(getChapters('Genesis')).toHaveLength(50);
    expect(getChapters('Psalms')).toHaveLength(150);
    const sedarim = getMishnahSedarim();
    expect(Object.keys(sedarim)).toHaveLength(6);
    expect(sedarim.zeraim.tractates).toContain('Mishnah Berakhot');
  });

  test('parashiot de la Genèse et daf du Shabbat', () => {
    const parshas = getParshas('Genesis');
    expect(parshas.length).toBeGreaterThanOrEqual(12);
    expect(parshas[0].name || parshas[0]).toBeTruthy();
    const dafList = getShabbatDafList();
    expect(Array.isArray(dafList)).toBe(true);
    expect(dafList.length).toBeGreaterThan(100); // 2a-157b en pas de 1/2 daf
  });

  test('ré-exports des services de commentaires exposés', () => {
    expect(typeof getRashiOnTorah).toBe('function');
    expect(typeof getTosafotOnTalmud).toBe('function');
    expect(typeof getRambanForVerse).toBe('function');
    expect(typeof sefariaApiRequest).toBe('function');
  });

  test('le default export agrège l API historique', () => {
    for (const fn of ['getVerses', 'getVerse', 'getOnkelos', 'getCommentary', 'getRashi',
      'getIbnEzraForVerse', 'getSfornoForVerse', 'getOrHaChaimForVerse',
      'getBartenuraForMishnah', 'getTosafotYomTovForMishnah',
      'getRelatedTexts', 'getCrossReferences', 'getRandomText',
      'getTopics', 'getCalendars', 'getTextVersions', 'getBookIndex',
      'getPopularSheets', 'getWordDefinitions',
      'getTalmudDaf', 'getShabbatDaf', 'getRashiOnShabbat', 'getShabbatCommentaries',
      'clearCaches', 'toSefariaRef']) {
      expect(typeof sefariaApi[fn]).toBe('function');
    }
  });

  test('clearCaches ne crashe pas', () => {
    expect(() => clearCaches()).not.toThrow();
  });
});
