/**
 * Smoke tests de la façade CommentaryTab.constants.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : données
 * commentateurs, détection, extraction, styles, cache.
 */

import {
  log, SEFARIA_BASE,
  cacheText, clearCommentaryCache, textCache,
  COMMENTATOR_INFO, COMMENTATORS, APPROACH_COLORS, STUDY_PATH,
  detectCrossReferences, extractKeySummary, extractDiburHaMatchil,
  generateStudyQuestions, categorizeLinks,
  getLearnedCommentaries, setLearnedCommentary, getStudyNotes, saveStudyNote,
  COLORS, styles, spinnerKeyframes
} from './CommentaryTab.constants';

describe('CommentaryTab.constants (façade) — données', () => {
  test('métadonnées commentateurs dérivées du registre', () => {
    expect(Object.keys(COMMENTATOR_INFO).length).toBeGreaterThan(3);
    expect(Object.keys(COMMENTATORS).length).toBeGreaterThan(2);
    expect(APPROACH_COLORS.pshat).toBeTruthy();
    expect(Array.isArray(STUDY_PATH.beginner)).toBe(true);
    expect(typeof SEFARIA_BASE).toBe('string');
    expect(typeof log).toBe('object');
  });

  test('styles et couleurs exposés', () => {
    expect(Object.keys(COLORS).length).toBeGreaterThan(3);
    expect(styles.container).toBeTruthy();
    expect(spinnerKeyframes).toContain('@keyframes spin');
  });
});

describe('CommentaryTab.constants (façade) — analyse et extraction', () => {
  test('detectCrossReferences repère רש"י', () => {
    const refs = detectCrossReferences('כמו שפירש רש"י', '', 'ramban');
    expect(refs).toBeTruthy();
  });

  test('extractKeySummary et dibbour', () => {
    const summary = extractKeySummary('רש"י: מלך', 'Rashi: king');
    expect(summary).toBeTruthy();
    const dibbur = extractDiburHaMatchil('דבר המתחיל: מלך');
    expect(dibbur === null || typeof dibbur === 'string').toBe(true);
  });

  test('questions d étude et catégorisation de liens', () => {
    expect(generateStudyQuestions('Rashi', 'מלך', 'king')).toBeTruthy();
    const cats = categorizeLinks([{ type: 'commentary' }, { type: 'verse' }]);
    expect(cats).toBeTruthy();
  });
});

describe('CommentaryTab.constants (façade) — cache et persistance', () => {
  test('cache de textes opérationnel', () => {
    cacheText('Gen.1.1', ['x']);
    expect(textCache.get('Gen.1.1')).toEqual(['x']);
    expect(() => clearCommentaryCache()).not.toThrow();
  });

  test('notes et commentaires appris persistables', () => {
    expect(getLearnedCommentaries()).toBeTruthy();
    expect(() => setLearnedCommentary('Gen.1.1', true)).not.toThrow();
    expect(getStudyNotes()).toBeTruthy();
    expect(() => saveStudyNote('Gen.1.1', 'note')).not.toThrow();
  });
});
