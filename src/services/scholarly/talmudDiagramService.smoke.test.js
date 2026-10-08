/**
 * Smoke test du split talmudDiagram : les données pures vivent dans
 * talmudDiagramData.js, la façade ré-exporte les noms publics et son état
 * (cache LRU) reste opérationnel. Un seul import cassé = undefined au
 * runtime — d'où la vérification de contenu, pas seulement d'existence.
 */
import { describe, test, expect } from 'vitest';
import {
  DIAGRAM_TYPES,
  TALMUD_COMMENTATORS,
  clearDiagramCache,
  getCacheStats,
  default as talmudDiagramService
} from './talmudDiagramService';
import {
  HALACHIC_OUTCOMES,
  OUTCOME_ICONS,
  CONTENT_PATTERNS,
  DIRECT_SAGE_NAMES,
  SPEAKER_PATTERNS,
  SPEAKER_NORMALIZATION,
  ENHANCED_DISCOURSE_MARKERS
} from './talmudDiagramData';

describe('données déplacées (talmudDiagramData)', () => {
  test('les exports publics restent servis par la façade', () => {
    expect(DIAGRAM_TYPES).toBeDefined();
    expect(DIAGRAM_TYPES.OVERVIEW).toBe('overview');
    expect(DIAGRAM_TYPES.SPEAKER_NETWORK).toBe('speaker_network');
    expect(Array.isArray(TALMUD_COMMENTATORS)).toBe(true);
    expect(TALMUD_COMMENTATORS.length).toBeGreaterThan(0);
  });

  test('les données de détection ne sont pas vides', () => {
    expect(DIRECT_SAGE_NAMES.length).toBeGreaterThan(20);
    expect(DIRECT_SAGE_NAMES).toContain('רבי עקיבא');
    expect(SPEAKER_PATTERNS.length).toBeGreaterThan(5);
    expect(Object.keys(SPEAKER_NORMALIZATION).length).toBeGreaterThan(0);
    expect(ENHANCED_DISCOURSE_MARKERS.length).toBeGreaterThan(0);
    expect(Object.keys(CONTENT_PATTERNS).length).toBeGreaterThan(0);
    expect(Object.keys(HALACHIC_OUTCOMES).length).toBeGreaterThan(0);
    expect(Object.keys(OUTCOME_ICONS).length).toBeGreaterThan(0);
  });

  test('le default de la façade expose les API de cache et les données', () => {
    expect(typeof talmudDiagramService.clearDiagramCache).toBe('function');
    expect(talmudDiagramService.DIAGRAM_TYPES).toBe(DIAGRAM_TYPES);
  });

  test('le cache LRU de la façade tourne après le split', () => {
    clearDiagramCache();
    const stats = getCacheStats();
    expect(stats).toBeDefined();
    expect(typeof stats.size).toBe('number');
  });
});
