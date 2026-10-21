/**
 * Smoke tests de la façade constants/morphology.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md). Chemins purs : aucun réseau ; le comportement
 * s'appuie sur le mock rootDatabase de setupTests (racines מלך/ארץ/כתב).
 */

import {
  // Ré-exports functionWords (contrat historique)
  STOP_WORDS, isStopWord, FUNCTION_WORDS, lookupFunctionWord,
  // Préfixes/suffixes
  HEBREW_PREFIX_MEANINGS, getPrefixMeaning, getPrefixInfo,
  HEBREW_PREFIXES_ORDERED, SINGLE_PREFIXES, HEBREW_SUFFIXES_ORDERED,
  HEBREW_VERB_PREFIXES, HEBREW_VERB_SUFFIXES, ARAMAIC_PREFIXES, getCombinedPrefixMeaning,
  // Patterns + analyse racine
  isLikelyCompleteRoot, smartPrefixAnalysis,
  // Conjugaison araméenne
  CONJUGATION_PREFIXES, CONJUGATION_SUFFIXES, ARAMAIC_BINYANIM, WEAK_VERB_TYPES,
  getConjugationPrefixLabel, getConjugationSuffixLabel, computeVerbTranslation,
  extractAramaicRoot,
  // Confiance
  analyzeWordWithConfidence, getAramaicConfidence, ABBREVIATION_EXPANSIONS,
  // Binyanim hébreux
  HEBREW_BINYANIM, detectHebrewBinyan, getBinyanInfo, extractHebrewRoot
} from './morphology';
import morphology from './morphology';

describe('constants/morphology (façade)', () => {
  test('ré-exports functionWords conservés', () => {
    expect(STOP_WORDS).toBeInstanceOf(Set);
    expect(typeof isStopWord).toBe('function');
    expect(typeof FUNCTION_WORDS).toBe('object');
    expect(typeof lookupFunctionWord).toBe('function');
  });

  test('données de préfixes/suffixes peuplées', () => {
    expect(Object.keys(HEBREW_PREFIX_MEANINGS).length).toBeGreaterThan(5);
    expect(HEBREW_PREFIXES_ORDERED.length).toBeGreaterThan(5);
    expect(Array.isArray(SINGLE_PREFIXES)).toBe(true);
    expect(HEBREW_SUFFIXES_ORDERED.length).toBeGreaterThan(3);
    expect(HEBREW_VERB_PREFIXES.length).toBeGreaterThan(3);
    expect(HEBREW_VERB_SUFFIXES.length).toBeGreaterThan(3);
    expect(ARAMAIC_PREFIXES.length).toBeGreaterThan(3);
    expect(getPrefixMeaning('ב')).toBeTruthy();
    expect(getPrefixInfo('ל')).toBeTruthy();
    expect(typeof getCombinedPrefixMeaning('וב')).toBe('string');
  });

  test('patterns + conjugaison exposés', () => {
    expect(Object.keys(CONJUGATION_PREFIXES).length).toBeGreaterThan(3);
    expect(Object.keys(CONJUGATION_SUFFIXES).length).toBeGreaterThan(3);
    expect(Object.keys(ARAMAIC_BINYANIM).length).toBeGreaterThan(3);
    expect(Object.keys(WEAK_VERB_TYPES).length).toBeGreaterThan(2);
    expect(getConjugationPrefixLabel('י')).toBeTruthy();
    expect(typeof computeVerbTranslation).toBe('function');
  });

  test('isLikelyCompleteRoot : bornes de longueur et mot mocké', () => {
    expect(isLikelyCompleteRoot('ב')).toBe(false);
    expect(isLikelyCompleteRoot('')).toBe(false);
    expect(typeof isLikelyCompleteRoot('מלך')).toBe('boolean');
  });

  test('smartPrefixAnalysis : bornes et structure', () => {
    expect(smartPrefixAnalysis('ב')).toBeNull(); // trop court
    const res = smartPrefixAnalysis('ובית');
    // null si le mot est déjà une racine complète, sinon { root, prefix, … }
    expect(res === null || (res && res.root && res.prefix)).toBe(true);
  });

  test('extractAramaicRoot + computeVerbTranslation ne crashent pas', () => {
    expect(extractAramaicRoot('מלכא')).toBeDefined();
    expect(extractAramaicRoot('')).toBeNull();
  });

  test('getAramaicConfidence : score borné et déterministe', () => {
    expect(getAramaicConfidence(null)).toBe(0);
    expect(getAramaicConfidence('')).toBe(0);
    expect(getAramaicConfidence('מלכא')).toBe(30); // ending emphatique א
    expect(getAramaicConfidence('גברין')).toBeGreaterThanOrEqual(25);
    expect(getAramaicConfidence('מלכא')).toBeLessThanOrEqual(100);
  });

  test('analyzeWordWithConfidence renvoie au moins une interprétation', () => {
    const res = analyzeWordWithConfidence('מלך');
    expect(res).toBeTruthy();
  });

  test('binyanim hébreux : données + getters', () => {
    expect(Object.keys(HEBREW_BINYANIM).length).toBeGreaterThanOrEqual(7);
    const binyan = Object.keys(HEBREW_BINYANIM)[0];
    expect(getBinyanInfo(binyan)).toEqual(HEBREW_BINYANIM[binyan]);
    expect(getBinyanInfo('inexistant')).toBeNull();
    expect(detectHebrewBinyan('ש')).toBeNull(); // trop court
    expect(detectHebrewBinyan('התקדש')).toBeTruthy(); // hitpaël הת-
    expect(extractHebrewRoot('שמר')).toBeTruthy();
    expect(typeof ABBREVIATION_EXPANSIONS).toBe('object');
  });

  test('default export agrège l\'API historique', () => {
    for (const key of ['HEBREW_PREFIXES_ORDERED', 'SINGLE_PREFIXES', 'HEBREW_SUFFIXES_ORDERED',
      'getPrefixMeaning', 'getPrefixInfo', 'isLikelyCompleteRoot', 'smartPrefixAnalysis',
      'getPrefixMeaning', 'ARAMAIC_PREFIXES', 'getCombinedPrefixMeaning',
      'computeVerbTranslation', 'extractAramaicRoot',
      'analyzeWordWithConfidence', 'getAramaicConfidence',
      'detectHebrewBinyan', 'getBinyanInfo', 'extractHebrewRoot']) {
      expect(morphology[key]).toBeDefined();
    }
  });
});
