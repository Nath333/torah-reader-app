/**
 * Smoke tests de la façade utils/commentaryUtils.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : normalisation
 * de guillemets, lookup halachique à préfixes, extraction dibbour, processing.
 */

import {
  normalizeQuotes, lookupHalachicWithPrefix,
  TALMUDIC_ABBREVIATIONS, HALACHIC_OVERRIDE, RASHI_VOCABULARY,
  extractDibbur, processCommentArray, processTalmudComments,
  processTalmudCommentsParallel, createErrorResponse, cleanTextArray,
  processCommentArrayWithTranslation
} from './commentaryUtils';

describe('commentaryUtils (façade) — données', () => {
  test('constantes exportées peuplées', () => {
    expect(Object.keys(TALMUDIC_ABBREVIATIONS).length).toBeGreaterThan(5);
    expect(HALACHIC_OVERRIDE['שבת']).toBeTruthy();
    expect(Object.keys(RASHI_VOCABULARY).length).toBeGreaterThan(5);
  });
});

describe('commentaryUtils (façade) — normalisation et lookup', () => {
  test('normalizeQuotes ramène gershayim/geresh vers ASCII', () => {
    expect(normalizeQuotes('ר״ל')).toBe(`ר"ל`);
    expect(normalizeQuotes("ש'ל")).toBe(`ש'ל`);
  });

  test('lookupHalachicWithPrefix : exact, préfixe, hors base', () => {
    const exact = lookupHalachicWithPrefix('שבת');
    expect(exact).toBeTruthy();
    expect(exact.definition).toBeTruthy();
    const prefixed = lookupHalachicWithPrefix('השבת');
    expect(prefixed === null || prefixed.definition).toBeTruthy();
    expect(lookupHalachicWithPrefix('')).toBeNull();
    expect(lookupHalachicWithPrefix(null)).toBeNull();
  });
});

describe('commentaryUtils (façade) — processing des commentaires', () => {
  test('extractDibbur isole le dibbour hébreu (רש"י)', () => {
    const res = extractDibbur('רש"י: הלכתא גברא בשבת קדשא');
    expect(res).toBeTruthy();
  });

  test('createErrorResponse / cleanTextArray', () => {
    expect(createErrorResponse('boom')).toMatchObject({ error: 'boom', comments: [] });
    expect(cleanTextArray(['a', '', 'b'])).toEqual(['a', '', 'b']); // mappe sans filtrer
  });

  test('processCommentArray paire he/en', () => {
    const res = processCommentArray(
      ['רש"י: מלך'],
      ['Rashi: king']
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
  });

  test('processTalmudComments et variante parallèle', async () => {
    const sync = processTalmudComments(['אמר רב'], ['Rav said']);
    expect(Array.isArray(sync)).toBe(true);
    const par = await processTalmudCommentsParallel(['אמר רב'], ['Rav said']);
    expect(Array.isArray(par)).toBe(true);
  });

  test('processCommentArrayWithTranslation délègue sans crash', async () => {
    const res = await processCommentArrayWithTranslation(['מלך'], ['king']);
    expect(res).toBeTruthy();
  });
});
