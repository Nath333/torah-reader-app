/**
 * studyTracker — compteurs persistants hors React (versets, mots, niveau).
 * Les clés sont écrites/lues dans le localStorage shimé de setupTests.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import {
  registerVerseRead,
  registerWordLearned,
  getTodayStats,
  getLevelProgress
} from '../studyTracker';

const DAY_KEY = 'torah-study-tracker-day';
const LIFE_KEY = 'torah-study-tracker-life';

beforeEach(() => {
  localStorage.removeItem(DAY_KEY);
  localStorage.removeItem(LIFE_KEY);
});

describe('registerVerseRead', () => {
  test('compte les versets uniques du jour (dédup)', () => {
    expect(registerVerseRead('Genesis.1:1')).toBe(true);
    expect(registerVerseRead('Genesis.1:1')).toBe(false); // déjà lu aujourd'hui
    registerVerseRead('Genesis.1:2');
    expect(getTodayStats().versesRead).toBe(2);
  });

  test('rollover journalier : un nouveau jour repart de zéro', () => {
    registerVerseRead('Genesis.1:1');
    const d = JSON.parse(localStorage.getItem(DAY_KEY));
    d.date = 'Wed Oct 07 2026';
    localStorage.setItem(DAY_KEY, JSON.stringify(d));
    expect(getTodayStats().versesRead).toBe(0);
  });
});

describe('registerWordLearned (anneau Mots)', () => {
  test('compte les mots distincts, dédup insensible à la casse', () => {
    expect(registerWordLearned('בְּרֵאשִׁית')).toBe(true);
    expect(registerWordLearned('בְּרֵאשִׁית')).toBe(false);
    registerWordLearned('  שָׁמַיִם ');
    expect(getTodayStats().wordsLearned).toBe(2);
    expect(getTodayStats().wordsProgress).toBe(40); // 2 / objectif 5
  });

  test('sans mot : pas d\'écriture', () => {
    expect(registerWordLearned('')).toBe(false);
    expect(registerWordLearned(null)).toBe(false);
    expect(getTodayStats().wordsLearned).toBe(0);
  });

  test('les mots et les versets vivent dans le même jour sans se marcher dessus', () => {
    registerVerseRead('Genesis.1:1');
    registerWordLearned('בְּרֵאשִׁית');
    const stats = getTodayStats();
    expect(stats.versesRead).toBe(1);
    expect(stats.wordsLearned).toBe(1);
  });
});

describe('niveaux', () => {
  test('progression jusqu\'au 4ᵉ niveau SCHOLAR (500 versets)', () => {
    const life = { versesStudied: 0, verseRefs: [] };
    for (let i = 1; i <= 500; i++) life.verseRefs.push(`Genesis.1:${i}`);
    life.versesStudied = life.verseRefs.length;
    localStorage.setItem(LIFE_KEY, JSON.stringify(life));

    const progress = getLevelProgress();
    expect(progress.level).toBe('SCHOLAR');
    expect(progress.label).toBe('Savant');
    expect(progress.nextLabel).toBeNull();
    expect(progress.progressToNextLevel).toBe(100);
  });

  test('niveau intermédiaire à 50 versets, avec cap vers le suivant', () => {
    const refs = Array.from({ length: 50 }, (_, i) => `Genesis.1:${i + 1}`);
    localStorage.setItem(LIFE_KEY, JSON.stringify({ versesStudied: 50, verseRefs: refs }));
    const progress = getLevelProgress();
    expect(progress.level).toBe('INTERMEDIATE');
    expect(progress.nextLabel).toBe('Avancé');
    expect(progress.progressToNextLevel).toBe(25); // 50 / 200
  });
});
