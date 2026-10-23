/**
 * Smoke tests de la façade grammarAnalysisService.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : racines, binyanim,
 * analyse morphologique, constantes.
 */

import {
  PRONOMINAL_SUFFIXES, SUFFIXES,
  extractRoot, detectBinyan,
  analyzeVerb, analyzeWord, analyzePhrase,
  getGrammarSummary, getInlineGloss,
  GRAMMAR_CONSTANTS, getBinyanInfo, getAllBinyanim,
  tryHebrewVerbAnalysis,
  default as grammarAnalysisService
} from './grammarAnalysisService';

describe('grammarAnalysisService (façade) — racines et binyanim', () => {
  test('extractRoot rend une racine', () => {
    // peut renvoyer une string (racine) ou un objet enrichi selon le chemin
    const r1 = extractRoot('שמרתי');
    expect(r1).toBeTruthy();
    expect(extractRoot('מלכים')).toBeTruthy();
  });

  test('detectBinyan reconnaît les patterns', () => {
    const qal = detectBinyan('שמר');
    expect(qal).toBeTruthy();
    const nifal = detectBinyan('נשמר');
    expect(nifal).toBeTruthy();
  });

  test('suffixes exposés', () => {
    expect(Object.keys(PRONOMINAL_SUFFIXES).length).toBeGreaterThan(3);
    expect(Object.keys(SUFFIXES).length).toBeGreaterThan(3);
  });
});

describe('grammarAnalysisService (façade) — analyse', () => {
  test('analyzeWord rend une analyse structurée', () => {
    const res = analyzeWord('מלך');
    expect(res).toBeTruthy();
    expect(typeof res).toBe('object');
  });

  test('analyzeVerb et analyse de phrase', () => {
    expect(analyzeVerb('שמר')).toBeTruthy();
    expect(analyzePhrase('מלך גדול')).toBeTruthy();
  });

  test('getGrammarSummary et getInlineGloss ne crashent pas', () => {
    const analysis = analyzeWord('מלך');
    expect(getGrammarSummary(analysis)).toBeTruthy();
    const gloss = getInlineGloss('מלך');
    expect(['string', 'object', 'null', 'undefined']).toContain(gloss === null ? 'null' : typeof gloss);
  });

  test('tryHebrewVerbAnalysis ne crashe pas', () => {
    const res = tryHebrewVerbAnalysis('שמר');
    expect(res === null || typeof res === 'object').toBe(true);
  });
});

describe('grammarAnalysisService (façade) — constantes', () => {
  test('GRAMMAR_CONSTANTS expose binyanim et temps', () => {
    expect(GRAMMAR_CONSTANTS.BINYANIM).toBeTruthy();
    expect(GRAMMAR_CONSTANTS.TENSES).toBeTruthy();
    expect(Object.keys(GRAMMAR_CONSTANTS.BINYANIM).length).toBeGreaterThan(5);
  });

  test('getBinyanInfo et getAllBinyanim', () => {
    expect(getBinyanInfo('qal')).toBeTruthy();
    expect(getBinyanInfo('inexistant', false)).toBe(null);
    expect(Object.keys(getAllBinyanim()).length).toBeGreaterThan(5);
    expect(Object.keys(getAllBinyanim(true)).length).toBeGreaterThan(Object.keys(getAllBinyanim()).length);
  });

  test('default export agrège le service historique', () => {
    for (const fn of ['extractRoot', 'detectBinyan', 'analyzeVerb', 'analyzeWord',
      'analyzePhrase', 'getGrammarSummary', 'getInlineGloss', 'tryHebrewVerbAnalysis']) {
      expect(typeof grammarAnalysisService[fn]).toBe('function');
    }
  });
});
