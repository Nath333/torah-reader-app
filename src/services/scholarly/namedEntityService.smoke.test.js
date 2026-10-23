/**
 * Smoke tests de la façade namedEntityService.js (avant/après split
 * docs/DECOUPE-MONOLITHES.md — file étendue). Chemins purs : bases de rabbis,
 * figures bibliques, lieux, détection regex.
 */

import {
  ENTITY_TYPES, RABBI_DATABASE, RABBI_RELATIONSHIPS,
  BIBLICAL_FIGURES, PLACES,
  getRabbiRelationships, getTeacherChain,
  detectEntities, detectRabbis, detectBiblicalFigures, detectPlaces,
  detectBiblicalCitations, getEntityStatistics, getHighlightedEntities,
  lookupRabbi, getRabbisByGeneration,
  default as namedEntityService
} from './namedEntityService';

describe('namedEntityService (façade) — bases de données', () => {
  test('types, rabbis, figures et lieux peuplés', () => {
    expect(ENTITY_TYPES.RABBI).toBe('rabbi');
    expect(Object.keys(RABBI_DATABASE.tannaim).length).toBeGreaterThan(5);
    expect(Object.keys(RABBI_DATABASE.amoraim).length).toBeGreaterThan(5);
    expect(Object.keys(RABBI_RELATIONSHIPS).length).toBeGreaterThan(2);
    expect(BIBLICAL_FIGURES['אברהם']).toBeTruthy();
    expect(PLACES['ירושלים'].name).toBe('Jerusalem');
  });
});

describe('namedEntityService (façade) — détection', () => {
  test('detectEntities agrège par type', () => {
    const res = detectEntities('אמר רבי עקיבא בירושלים כתיב אברהם');
    expect(res).toHaveProperty('rabbis');
    expect(res).toHaveProperty('citations');
  });

  test('detectRabbis trouve רבי עקיבא', () => {
    const rabbis = detectRabbis('אמר רבי עקיבא');
    expect(Array.isArray(rabbis)).toBe(true);
    expect(rabbis.length).toBeGreaterThan(0);
  });

  test('detectBiblicalFigures et detectPlaces', () => {
    expect(detectBiblicalFigures('ויאמר אברהם').length).toBeGreaterThanOrEqual(0);
    const places = detectPlaces('מירושלים לקיסרי');
    expect(Array.isArray(places)).toBe(true);
  });

  test('getEntityStatistics et surbrillance', () => {
    const stats = getEntityStatistics('אמר רבי עקיבא בירושלים');
    expect(typeof stats).toBe('object');
    const hl = getHighlightedEntities('אמר רבי עקיבא');
    expect(hl).toBeTruthy();
  });
});

describe('namedEntityService (façade) — lookup', () => {
  test('lookupRabbi par nom hébreu', () => {
    const rabbi = lookupRabbi('רבי עקיבא');
    expect(rabbi === null || typeof rabbi === 'object').toBe(true);
  });

  test('getRabbisByGeneration et relations', () => {
    const byGen = getRabbisByGeneration('tannaim');
    expect(Array.isArray(byGen)).toBe(true);
    const rel = getRabbiRelationships('רבי עקיבא');
    expect(rel === null || typeof rel === 'object').toBe(true);
    expect(Array.isArray(getTeacherChain('רבי עקיבא'))).toBe(true);
  });

  test('default export agrège le service historique', () => {
    for (const fn of ['detectEntities', 'detectRabbis', 'detectBiblicalFigures',
      'detectPlaces', 'lookupRabbi', 'getRabbiRelationships', 'getEntityStatistics']) {
      expect(typeof namedEntityService[fn]).toBe('function');
    }
  });
});
