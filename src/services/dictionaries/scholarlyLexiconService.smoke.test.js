/**
 * Smoke tests scholarlyLexiconService (avant/après split docs/DECOUPE-MONOLITHES.md).
 * Chemins purs et syncrones uniquement : aucun réseau, aucun chargement de
 * dictionnaire lourd (mots < 2 lettres court-circuités par les services).
 */

import {
  SCHOLARLY_SOURCES,
  preloadDictionaries,
  getDictionaryStats,
  lookupLocalDictionaries,
  scholarlyLookup,
  batchScholarlyLookup,
  getEtymology,
  getGrammarReference,
  getAllBinyanim,
  getVerbTenses,
  getBiblicalUsageContext,
  searchConcordance,
  getWordFrequency,
  formatCitation,
  lookupWordSefaria,
  lookupJastrow,
  lookupCAL,
  getSimpleTranslation,
  clearScholarlyCache,
  preloadJastrow
} from './scholarlyLexiconService';
import service from './scholarlyLexiconService';

describe('scholarlyLexiconService (façade)', () => {
  test('l\'API publique est exposée', () => {
    for (const fn of [preloadDictionaries, getDictionaryStats, lookupLocalDictionaries,
      scholarlyLookup, batchScholarlyLookup, getEtymology, getGrammarReference,
      getAllBinyanim, getVerbTenses, getBiblicalUsageContext, searchConcordance,
      getWordFrequency, formatCitation, lookupWordSefaria, lookupJastrow,
      lookupCAL, getSimpleTranslation, clearScholarlyCache, preloadJastrow]) {
      expect(typeof fn).toBe('function');
    }
  });

  test('SCHOLARLY_SOURCES expose les lexiques savants', () => {
    expect(SCHOLARLY_SOURCES.BDB.id).toBe('bdb');
    expect(SCHOLARLY_SOURCES.JASTROW.year).toBe(1903);
    expect(Object.keys(SCHOLARLY_SOURCES).length).toBeGreaterThanOrEqual(6);
  });

  test('le default export agrège les utilitaires documentés', () => {
    expect(typeof service.cleanWord).toBe('function');
    expect(typeof service.extractRoot).toBe('function');
    expect(service.scholarlyLookup).toBe(scholarlyLookup);
    expect(service.lookupLocalDictionaries).toBe(lookupLocalDictionaries);
  });

  test('getDictionaryStats rend le statut des 3 dictionnaires locaux', () => {
    const stats = getDictionaryStats();
    expect(stats.jastrow).toHaveProperty('loaded');
    expect(stats.bdb).toHaveProperty('loaded');
    expect(stats.strongs).toHaveProperty('loaded');
    expect(typeof stats.totalEntries).toBe('number');
    expect(typeof stats.preloadComplete).toBe('boolean');
  });

  test('formatCitation construit les 4 formes de citation', () => {
    const c = formatCitation('BDB', 'אֱלֹהִים');
    expect(c.short).toBe('BDB');
    expect(c.full).toContain('1906');
    expect(c.academic).toContain('s.v.');
    expect(c.chicago).toContain('Brown-Driver-Briggs');
    expect(formatCitation('SOURCE_INCONNUE', 'x')).toBeNull();
  });

  test('getAllBinyanim / getVerbTenses / getGrammarReference (grammaire Gesenius)', () => {
    expect(Object.keys(getAllBinyanim()).length).toBeGreaterThan(3);
    expect(getVerbTenses()).toBeDefined();
    const binyan = Object.keys(getAllBinyanim())[0];
    expect(getGrammarReference(binyan)).toEqual(getAllBinyanim()[binyan]);
    expect(getGrammarReference('binyan_inexistant')).toBeNull();
  });

  test('getEtymology renvoie racine + langues cognates (chemin pur)', () => {
    // 'אל' : 2 lettres → extractRoot renvoie le mot tel quel, sans réseau
    return getEtymology('אל').then((res) => {
      expect(res.root).toBe('אל');
      // COGNATE_LANGUAGES est une carte (objet), pas un tableau
      expect(res.cognateLanguages).toBeDefined();
      expect(typeof res.cognateLanguages).toBe('object');
      expect(res.analysis).toBeNull();
    });
  });

  test('les entrées trop courtes court-circuitent sans réseau', async () => {
    expect(await lookupWordSefaria('a')).toBeNull();
    expect(await lookupJastrow('a')).toBeNull();
    expect(await lookupCAL('')).toBeNull();
    expect(await lookupLocalDictionaries('a')).toBeNull();
    expect(await getBiblicalUsageContext('')).toBeNull();
    expect(await getSimpleTranslation('a')).toBeNull();
    expect(await searchConcordance('a')).toEqual({ results: [], total: 0 });
    // cleanWord('a') → '' (seuls les caractères hébreux sont conservés)
    expect(await getWordFrequency('a')).toEqual({
      word: '', occurrences: 0, isCommon: false, isRare: true
    });
    const batch = await batchScholarlyLookup(['a', '']);
    expect(batch).toBeInstanceOf(Map);
    expect(batch.size).toBe(0);
  });

  test('scholarlyLookup rejette les entrées trop courtes', async () => {
    expect(await scholarlyLookup('a')).toBeNull();
    expect(await scholarlyLookup('')).toBeNull();
    expect(await scholarlyLookup(null)).toBeNull();
  });

  test('clearScholarlyCache ne crashe pas', () => {
    expect(() => clearScholarlyCache()).not.toThrow();
  });
});
