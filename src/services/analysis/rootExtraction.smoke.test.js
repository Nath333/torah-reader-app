/**
 * Smoke tests de la façade analysis/rootExtraction.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs ou s'appuyant sur
 * le mock dictionaryLoader de setupTests (מלך/ארץ/כתב) : zéro réseau.
 */

import {
  DICTIONARY_TIERS, WEAK_VERB_TYPES, BINYANIM,
  PREFIX_PATTERNS, SUFFIX_PATTERNS, NOUN_PATTERNS,
  getSourcesForContext, generateHypotheses,
  validateWithDirectDictionaries,
  extractRootsWithDirectValidation,
  extractRoots, getBestRoot, getTopRoots,
  extractAlternativeRoots, getAllAlternativeRoots,
  getTelemetry, resetTelemetry, clearCache, getCacheStats,
  extractRootsMultiHypothesis, extractAllPossibleRoots,
  ARAMAIC_PARTICLES,
  default as UnifiedRootService
} from './rootExtraction';

describe('rootExtraction (façade) — données et config', () => {
  test('patterns et tiers exposés et peuplés', () => {
    expect(PREFIX_PATTERNS.length).toBeGreaterThan(10);
    expect(SUFFIX_PATTERNS.length).toBeGreaterThan(5);
    expect(NOUN_PATTERNS.length).toBeGreaterThan(5);
    expect(Object.keys(DICTIONARY_TIERS).length).toBeGreaterThan(1);
    expect(Object.keys(WEAK_VERB_TYPES).length).toBeGreaterThan(3);
    expect(Object.keys(BINYANIM).length).toBeGreaterThan(5);
    expect(ARAMAIC_PARTICLES).toBeTruthy(); // structure (Set/objet) — péuplé et exposé
  });

  test('getSourcesForContext répond pour les contextes connus', () => {
    const talmud = getSourcesForContext('talmudic');
    expect(talmud).toBeTruthy();
    expect(getSourcesForContext('biblical')).toBeTruthy();
  });
});

describe('rootExtraction (façade) — pipeline', () => {
  test('generateHypotheses produit des hypothèses ordonnées', () => {
    const hyps = generateHypotheses('שמרתי');
    expect(Array.isArray(hyps)).toBe(true);
    expect(hyps.length).toBeGreaterThan(0);
    expect(hyps[0]).toHaveProperty('root');
  });

  test('validateWithDirectDictionaries valide contre le mock (מלך)', () => {
    const hyps = generateHypotheses('מלך');
    const validated = validateWithDirectDictionaries(hyps);
    expect(Array.isArray(validated)).toBe(true);
  });

  test('extractRootsWithDirectValidation rend un résultat complet (מלך)', () => {
    const res = extractRootsWithDirectValidation('מלך');
    expect(res).toBeTruthy();
  });

  test('extractRoots / getBestRoot / getTopRoots fonctionnent', () => {
    const roots = extractRoots('שמר');
    expect(Array.isArray(roots)).toBe(true);
    const best = getBestRoot('שמר');
    expect(best === null || typeof best === 'object').toBe(true);
    const top = getTopRoots('שמר', 3);
    expect(Array.isArray(top)).toBe(true);
    expect(top.length).toBeLessThanOrEqual(3);
  });

  test('racines alternatives extraites du mock', () => {
    expect(Array.isArray(extractAlternativeRoots({ definition: 'king, reign' }))).toBe(true);
    const all = getAllAlternativeRoots('מלך');
    expect(all).toBeTruthy();
  });

  test('legacy wrappers délèguent sans crash', () => {
    expect(Array.isArray(extractRootsMultiHypothesis('שמר'))).toBe(true);
    expect(extractAllPossibleRoots('שמר')).toBeTruthy();
  });
});

describe('rootExtraction (façade) — état', () => {
  test('télémétrie et cache gérables', () => {
    expect(typeof getTelemetry()).toBe('object');
    expect(() => resetTelemetry()).not.toThrow();
    expect(() => clearCache()).not.toThrow();
    expect(typeof getCacheStats()).toBe('object');
  });

  test('default export agrège le service historique', () => {
    for (const fn of ['extractRoots', 'generateHypotheses', 'extractRootsWithDirectValidation',
      'validateWithDirectDictionaries', 'extractRootsEnhanced', 'analyzeWordComplete',
      'getAllAlternativeRoots', 'getBestRoot', 'clearCache', 'getTelemetry']) {
      expect(typeof UnifiedRootService[fn]).toBe('function');
    }
  });
});
