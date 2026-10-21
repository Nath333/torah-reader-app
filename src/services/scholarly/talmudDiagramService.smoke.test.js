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

describe('surface du split générateurs/extracteurs (20/10)', () => {
  test('utilitaires de texte exposés et déterministes', async () => {
    const mod = await import('./talmudDiagramService');
    expect(mod.stripNikud('מַלְכָּא')).toBe('מלכא');
    expect(typeof mod.normalizeHebrew('מלך')).toBe('string');
    expect(typeof mod.cleanForMermaid('abc')).toBe('string');
    expect(mod.validateMermaidSyntax('graph TB\n  A --> B')).toBeDefined();
  });

  test('les 10 générateurs + dispatcher sont des fonctions (default export)', async () => {
    const mod = await import('./talmudDiagramService');
    // Les générateurs typés ne sont exposés QUE via le default export (contrat historique)
    for (const fn of ['generateDafDiagram', 'generateOverviewDiagram', 'generateSugyaFlowDiagram',
      'generateSpeakerNetworkDiagram', 'generateTimelineDiagram', 'generateHalachicChainDiagram',
      'generateConceptMapDiagram', 'generateMachloketDiagram', 'generateSummaryDiagram',
      'generateCommentatorNetworkDiagram']) {
      expect(typeof mod.default[fn]).toBe('function');
    }
    // Seuls le dispatcher et le réseau sont aussi des exports nommés
    expect(typeof mod.generateDafDiagram).toBe('function');
    expect(typeof mod.generateCommentatorNetworkDiagram).toBe('function');
    expect(typeof mod.generateDafDiagramsRange).toBe('function');
  });

  test('extracteurs exposés (default export) + nommés TF-IDF', async () => {
    const mod = await import('./talmudDiagramService');
    for (const fn of ['extractSpeakersFromText', 'extractDisputes', 'extractRulingsDynamic',
      'extractDiscourseElements', 'extractKeyTermsTfIdf', 'extractKeySegments', 'summarizeText']) {
      expect(typeof mod.default[fn]).toBe('function');
    }
    expect(typeof mod.extractKeyTermsTfIdf).toBe('function');
  });

  test('summarizer TF-IDF : bornes sur texte hébreu', async () => {
    const { extractKeyTermsTfIdf, summarizeText } = await import('./talmudDiagramService');
    const text = 'תנן שמר שמר קדש ואהבת לרעך כמוך רבי עקיבא אומר';
    const terms = extractKeyTermsTfIdf(text, 5);
    expect(Array.isArray(terms)).toBe(true);
    expect(terms.length).toBeLessThanOrEqual(5);
    const summary = summarizeText(text);
    expect(summary).toBeTruthy();
  });
});
