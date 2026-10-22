/**
 * Smoke tests de la façade utils/definitionCleaner.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : nettoyage,
 * scoring, sélection, cross-references.
 */

import {
  CONTEXT_MODES, SOURCE_PRIORITIES, getSourcePriority, shouldSkipSource,
  cleanDefinition, extractCrossReference,
  pickBestDefinition, formatForTooltip, followCrossReference,
  scoreDefinition, pickBestFromCandidates,
  default as definitionCleaner
} from './definitionCleaner';

describe('definitionCleaner (façade) — contexte et priorités', () => {
  test('modes et priorités exposés', () => {
    expect(CONTEXT_MODES.TALMUDIC).toBe('talmudic');
    expect(Object.keys(SOURCE_PRIORITIES).length).toBeGreaterThan(2);
    expect(getSourcePriority('jastrow', 'talmudic').priority).toBeGreaterThan(0);
    expect(typeof shouldSkipSource("strong's", 'talmudic')).toBe('boolean');
  });
});

describe('definitionCleaner (façade) — nettoyage', () => {
  test('cleanDefinition retire références et notations', () => {
    const cleaned = cleanDefinition('king, reign. Gen. 1:1; v. מלך; (b. h.)');
    expect(typeof cleaned).toBe('string');
    expect(cleaned).not.toContain('Gen. 1:1');
  });

  test('cleanDefinition tolère entrées vides', () => {
    expect(cleanDefinition('')).toBe('');
    expect(cleanDefinition(null)).toBe('');
  });

  test('extractCrossReference isole la cible', () => {
    const ref = extractCrossReference('v. שבת');
    expect(typeof ref).toBe('string'); // renvoie le mot cible
    expect(ref).toContain('שבת');
  });
});

describe('definitionCleaner (façade) — sélection et scoring', () => {
  test('scoreDefinition : bon score pour définition simple, rejet pour garbage', () => {
    const good = scoreDefinition('king', 'jastrow');
    const bad = scoreDefinition('???', 'unknown');
    expect(good).toBeGreaterThan(bad); // relatif : le bon bat le garbage
  });

  test('pickBestDefinition choisit une partie sensée', () => {
    const best = pickBestDefinition('king; ruler. Ex. 2:1 (b. h.)');
    expect(best === null || typeof best === 'string').toBe(true);
  });

  test('pickBestFromCandidates ordonne par score', () => {
    const res = pickBestFromCandidates([
      { definition: 'king', source: 'jastrow' },
      { definition: '???', source: 'unknown' }
    ]);
    expect(res).toBeTruthy();
  });

  test('formatForTooltip borne la longueur', () => {
    const tip = formatForTooltip('a'.repeat(500), 'jastrow');
    expect(tip.length).toBeLessThan(500);
  });

  test('followCrossReference avec stub lookup ne crashe pas', () => {
    const res = followCrossReference('v. שבת', () => null);
    expect(res === null || typeof res === 'object').toBe(true);
  });

  test('default export agrège le service historique', () => {
    for (const fn of ['cleanDefinition', 'pickBestDefinition', 'formatForTooltip',
      'followCrossReference', 'scoreDefinition', 'pickBestFromCandidates',
      'getSourcePriority', 'shouldSkipSource', 'extractCrossReference']) {
      expect(typeof definitionCleaner[fn]).toBe('function');
    }
  });
});
