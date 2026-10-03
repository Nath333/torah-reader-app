/**
 * Smoke tests comparativeSemiticService (post-split 03/10/2026).
 * Chemin curated = pur et synchrone : aucun réseau nécessaire.
 */

import {
  COGNATE_DATABASE,
  getCognates,
  hasCognates,
  formatCognatesForDisplay
} from './comparativeSemiticService';

describe('comparativeSemiticService (façade post-split)', () => {
  test('la base curated est exposée et peuplée', () => {
    expect(Object.keys(COGNATE_DATABASE).length).toBeGreaterThan(20);
    expect(COGNATE_DATABASE['אל'].protoSemitic).toBe('*ʾil-');
  });

  test('getCognates trouve une racine curated avec source=curated', () => {
    const hit = getCognates('אל');
    expect(hit).not.toBeNull();
    expect(hit.source).toBe('curated');
    expect(hit.akkadian.word).toBe('ilu');
  });

  test('getCognates normalise les finales et renvoie null hors base', () => {
    // 'האל' avec préfixe/article → normalizeRoot ; hors base → null
    expect(getCognates('קקקק')).toBeNull();
    expect(getCognates('')).toBeNull();
    expect(getCognates(null)).toBeNull();
  });

  test('hasCognates reflète la présence en base', () => {
    expect(hasCognates('אל')).toBe(true);
    expect(hasCognates('קקקק')).toBe(false);
  });

  test('formatCognatesForDisplay rend une entrée curated sans crash', () => {
    const hit = getCognates('אל');
    const out = formatCognatesForDisplay(hit);
    expect(out).toBeDefined();
  });
});
