/**
 * Smoke tests de la façade wordRelationshipService.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : données,
 * requêtes sur graphe froid, cross-refs regex, chaîne étymologique.
 */

import {
  WORD_RELATIONSHIP_TYPES, SEMANTIC_FIELDS, WORD_RELATIONSHIPS_DB,
  getWordRelationships, getRootFamily, getSemanticFieldWords, findSemanticFields,
  getLearningPath,
  getWordGraphStats, getLearningProgress,
  exportWordGraph, importWordGraph, clearLearningProgress,
  isWordLearned, markWordLearned,
  getRelatedRoots, getComprehensiveRootAnalysis,
  extractCrossReferences, parseAllCrossReferences,
  buildEtymologyChainFromData,
  default as wordRelationshipService
} from './wordRelationshipService';

describe('wordRelationshipService (façade) — données', () => {
  test('types, champs sémantiques et base peuplés', () => {
    expect(Object.keys(WORD_RELATIONSHIP_TYPES).length).toBeGreaterThan(5);
    expect(Object.keys(SEMANTIC_FIELDS).length).toBeGreaterThan(5);
    expect(Object.keys(WORD_RELATIONSHIPS_DB).length).toBeGreaterThan(5);
  });

  test('racines apparentées et analyse complète', () => {
    const rel = getRelatedRoots('שמר');
    expect(rel).toBeTruthy();
    const analysis = getComprehensiveRootAnalysis('שמר');
    expect(analysis).toBeTruthy();
  });

  test('extraction de cross-references depuis une définition', () => {
    const refs = extractCrossReferences('joy; cf. שמח; perhaps from שמה', 'BDB');
    expect(Array.isArray(refs)).toBe(true);
    const all = parseAllCrossReferences({ 'אור': { definition: 'light; cf. נר' } });
    expect(all).toBeTruthy();
  });

  test('chaîne étymologique construite depuis des données', () => {
    const chain = buildEtymologyChainFromData({ protoSemitic: '*šmr-', cognates: { akkadian: 'šāmaru' } });
    expect(chain).toBeTruthy();
  });
});

describe('wordRelationshipService (façade) — graphe et apprentissage', () => {
  test('requêtes sur graphe froid sans crash', () => {
    // graphe froid : mot absent → null ou objet, jamais de crash
    const rel = getWordRelationships('שמר');
    expect(rel === null || typeof rel === 'object').toBe(true);
    expect(Array.isArray(getRootFamily('שמר'))).toBe(true);
    expect(getSemanticFieldWords('torah') === null || typeof getSemanticFieldWords('torah') === 'object').toBe(true);
    expect(Array.isArray(findSemanticFields('תורה'))).toBe(true);
    expect(getLearningPath('שמר')).toBeTruthy();
  });

  test('statistiques, export et progression', () => {
    expect(typeof getWordGraphStats()).toBe('object');
    expect(typeof getLearningProgress()).toBe('object');
    const exported = exportWordGraph();
    expect(exported).toBeTruthy();
    expect(() => importWordGraph(exported)).not.toThrow();
    expect(() => clearLearningProgress()).not.toThrow();
  });

  test('mots appris persistables', () => {
    expect(isWordLearned('קקקק')).toBe(false);
    expect(() => markWordLearned('קקקק')).not.toThrow();
  });

  test('default export agrège le service historique', () => {
    for (const fn of ['addWordNode', 'addWordRelationship', 'getWordRelationships',
      'getRootFamily', 'getLearningPath', 'generateWordGraph', 'generateWordMermaid',
      'getWordGraphStats', 'exportWordGraph', 'getRelatedRoots', 'markWordLearned']) {
      expect(typeof wordRelationshipService[fn]).toBe('function');
    }
  });
});
