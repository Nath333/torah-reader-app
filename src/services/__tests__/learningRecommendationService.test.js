/**
 * learningRecommendationService — sync sur les vraies données + libellés FR.
 * Le moteur de suggestions ne doit plus vivre sur ses compteurs internes
 * (figés) mais sur ceux du studyTracker / SRS, branchés par syncProgress.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import {
  syncProgress,
  generateRecommendations,
  generateMilestones,
  calculateLevel,
  LEARNING_LEVELS,
  getProgressSummary
} from '../scholarly/learningRecommendationService';

const STORE_KEY = 'learning-recommendations';

beforeEach(() => {
  localStorage.removeItem(STORE_KEY);
});

describe('syncProgress', () => {
  test('aligne versesStudied et déduit le niveau (critère versets)', () => {
    const p = syncProgress({ versesStudied: 60 });
    expect(p.versesStudied).toBe(60);
    expect(p.level).toBe('intermediate');
  });

  test('les mesures non fournies ne touchent pas le store', () => {
    syncProgress({ versesStudied: 10 });
    const p = syncProgress({});
    expect(p.versesStudied).toBe(10);
  });
});

describe('calculateLevel (verses-driven, aligné badge studyTracker)', () => {
  test('50 versets suffisent pour Intermédiaire même sans vocabulaire', () => {
    // L'ancienne conjonction stricte donnait Débutant ici → incohérent
    // avec le badge. Le jugement est désormais porté par les versets.
    expect(calculateLevel({ versesStudied: 50, vocabularyMastered: 0, commentatorsExplored: [] }).id)
      .toBe('intermediate');
  });
});

describe('generateRecommendations (FR)', () => {
  test('la suggestion systématique est en français', () => {
    const recs = generateRecommendations();
    const parsha = recs.find(r => r.id === 'next-parsha');
    expect(parsha).toBeDefined();
    expect(parsha.title).toMatch(/^Continuer avec la parasha /);
    expect(parsha.reason).toBe('Apprentissage systématique');
  });

  test('la carte vocabulaire apparaît quand des cartes SRS sont dues, avec compteur', async () => {
    const { createCard, processReview } = await import('../srsService');
    const card = createCard('test-word-1', 'בְּרֵאשִׁית', 'au commencement');
    processReview('test-word-1', 3); // due dans 1 j → mais createCard était due immédiatement ;
    // après révision la carte n'est plus due : on en recrée une, due tout de suite.
    createCard('test-word-2', 'שָׁמַיִם', 'le ciel');

    const recs = generateRecommendations();
    const vocab = recs.find(r => r.id === 'vocab-review');
    expect(vocab).toBeDefined();
    expect(vocab.count).toBeGreaterThanOrEqual(1);
    expect(vocab.title).toMatch(/^Réviser \d+ mot/);
  });

  test('les niveaux ont des libellés FR (badge dashboard)', () => {
    expect(LEARNING_LEVELS.BEGINNER.label).toBe('Débutant');
    expect(LEARNING_LEVELS.INTERMEDIATE.label).toBe('Intermédiaire');
    expect(LEARNING_LEVELS.ADVANCED.label).toBe('Avancé');
    expect(LEARNING_LEVELS.SCHOLAR.label).toBe('Savant');
  });

  test('getProgressSummary reflète les valeurs synchronisées', () => {
    syncProgress({ versesStudied: 210, vocabularyMastered: 5 });
    const summary = getProgressSummary();
    expect(summary.level.label).toBe('Avancé');
    expect(summary.stats.versesStudied).toBe(210);
  });
});

describe('generateMilestones (FR, contrat de champs)', () => {
  test('titres FR + champs title/completed/progress 0-100', () => {
    const ms = generateMilestones({
      versesStudied: 100,
      vocabularyMastered: 50,
      studyStreak: 7,
      commentatorsExplored: ['Rashi']
    });

    const verse100 = ms.find(m => m.id === 'verse-100');
    expect(verse100.title).toBe('100 versets étudiés');
    expect(verse100.completed).toBe(true);
    expect(verse100.progress).toBe(100);
    expect(verse100.remaining).toBe(0);

    const trio = ms.find(m => m.id === 'commentator-trio');
    expect(trio.title).toBe('Trois commentateurs');
    expect(trio.current).toBe(1);
    expect(trio.remaining).toBe(2);
    expect(trio.completed).toBe(false);

    const streak = ms.find(m => m.id === 'weekly-streak');
    expect(streak.title).toBe('Série de 7 jours');
    expect(streak.completed).toBe(true); // 7/7
  });

  test('progress bornée 0-100 même au-delà de la cible', () => {
    const ms = generateMilestones({ versesStudied: 9999 });
    const verse100 = ms.find(m => m.id === 'verse-100');
    expect(verse100.progress).toBe(100);
  });
});
