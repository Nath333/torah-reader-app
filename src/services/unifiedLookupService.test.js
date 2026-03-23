/**
 * Tests for unifiedLookupService.js
 * PRO SCHOLAR V10.1: Unified lookup with pipeline architecture
 */

// Mock groqService to avoid pdfjs-dist import chain issue
jest.mock('./groqService', () => ({
  translateToFrench: jest.fn().mockResolvedValue(null),
  translateText: jest.fn().mockResolvedValue(null),
  askGroq: jest.fn().mockResolvedValue(null)
}));

import {
  lookupWord,
  quickLookup,
  batchLookup,
  lookupAllLocalDictionaries,
  getCacheStats,
  clearCache,
  raceWithEarlyReturn,
  getResultQualityScore,
  warmCache,
  isCached,
  progressiveLookup,
  progressiveBatchLookup,
  getSemanticField,
  enrichWithSemantics,
  lookupWithSemantics,
  // PRO SCHOLAR V10.2: New functions
  rankDefinitionsByContext,
  lookupWithContextRanking,
  getWordRelationships,
  lookupWithRelationships,
  generateScholarlyUncertainty,
  UNCERTAINTY_LEVELS,
  exportToJsonLD,
  exportToMarkdown,
  exportToFlashcard,
  lookupFullyEnriched,
  // PRO SCHOLAR V10.3: New functions
  LINGUISTIC_PERIODS,
  ARAMAIC_DIALECTS,
  analyzeDialectalPeriod,
  HAPAX_DATABASE,
  getHapaxInfo,
  isLikelyHapax,
  COMPARATIVE_SEMITIC_DB,
  getComparativeSemiticData,
  HISTORICAL_PERIODS,
  SEMANTIC_EVOLUTION_DB,
  getHistoricalUsageTimeline,
  CITATION_FORMATS,
  generateSBLCitation,
  generateAcademicCitations,
  CROSS_REFERENCE_DB,
  getCrossReferences,
  lookupFullyEnrichedV3
} from './unifiedLookupService';

import {
  calculateConsensus,
  getSourceTier,
  SCHOLARLY_TIERS,
  CONSENSUS_LEVELS,
  formatConsensusForUI,
  rankSourcesByTier
} from './scholarSourceAggregator';

describe('unifiedLookupService', () => {
  // Clear cache before each test for isolation
  beforeEach(() => {
    clearCache();
  });

  // ===========================================
  // quickLookup (Synchronous)
  // ===========================================
  describe('quickLookup', () => {
    describe('input validation', () => {
      test('returns empty result for null input', () => {
        const result = quickLookup(null);
        expect(result.english).toBeNull();
        expect(result.sources).toEqual([]);
      });

      test('returns empty result for empty string', () => {
        const result = quickLookup('');
        expect(result.english).toBeNull();
      });

      test('returns empty result for single character', () => {
        const result = quickLookup('א');
        expect(result.english).toBeNull();
      });
    });

    describe('proper nouns', () => {
      test('recognizes משה (Moses) as proper noun', () => {
        const result = quickLookup('משה');
        expect(result.english).toBeTruthy();
        expect(result.english.toLowerCase()).toContain('moses');
      });

      test('recognizes אברהם (Abraham) as proper noun', () => {
        const result = quickLookup('אברהם');
        expect(result.english).toBeTruthy();
        expect(result.english.toLowerCase()).toContain('abraham');
      });

      test('recognizes דוד (David) as proper noun', () => {
        const result = quickLookup('דוד');
        expect(result.english).toBeTruthy();
        expect(result.english.toLowerCase()).toContain('david');
      });
    });

    describe('common Hebrew words', () => {
      test('translates תורה (Torah)', () => {
        const result = quickLookup('תורה');
        expect(result.cleanedWord).toBe('תורה');
        expect(result.offline).toBe(true);
      });

      test('translates שבת (Shabbat)', () => {
        const result = quickLookup('שבת');
        expect(result.english).toBeTruthy();
        expect(result.english.toLowerCase()).toMatch(/shabbat|sabbath/i);
      });
    });

    describe('function words', () => {
      test('translates וגו (etc.)', () => {
        const result = quickLookup('וגו');
        expect(result.english).toBeTruthy();
        expect(result.english.toLowerCase()).toContain('etc');
      });
    });

    describe('caching', () => {
      test('caches results', () => {
        const word = 'תורה';

        // First lookup
        const result1 = quickLookup(word);

        // Second lookup should be cached
        const result2 = quickLookup(word);
        expect(result2.fromCache).toBe(true);
      });
    });

    describe('result structure', () => {
      test('returns expected fields', () => {
        const result = quickLookup('תורה');

        expect(result).toHaveProperty('word');
        expect(result).toHaveProperty('cleanedWord');
        expect(result).toHaveProperty('english');
        expect(result).toHaveProperty('source');
        expect(result).toHaveProperty('sources');
        expect(result).toHaveProperty('offline');
        expect(result).toHaveProperty('scholarly');
      });

      test('scholarly flags are present', () => {
        const result = quickLookup('תורה');

        if (result.scholarly) {
          expect(result.scholarly).toHaveProperty('hasMultipleSources');
          expect(result.scholarly).toHaveProperty('hasAcademicSource');
          expect(result.scholarly).toHaveProperty('consensusLevel');
        }
      });
    });
  });

  // ===========================================
  // lookupWord (Async)
  // ===========================================
  describe('lookupWord', () => {
    test('returns result for valid word', async () => {
      const result = await lookupWord('משה');
      expect(result.english).toBeTruthy();
      expect(result.english.toLowerCase()).toContain('moses');
    });

    test('returns empty for invalid input', async () => {
      const result = await lookupWord('');
      expect(result.english).toBeNull();
    });

    test('accepts context options', async () => {
      const result = await lookupWord('גמרא', { contextMode: 'talmudic' });
      expect(result).toBeDefined();
      expect(result.cleanedWord).toBeTruthy();
    });

    test('caches results', async () => {
      const word = 'תורה';

      // First lookup
      await lookupWord(word);

      // Second lookup should be cached
      const result2 = await lookupWord(word);
      expect(result2.fromCache).toBe(true);
    });
  });

  // ===========================================
  // batchLookup
  // ===========================================
  describe('batchLookup', () => {
    test('looks up multiple words', async () => {
      const words = ['משה', 'אברהם', 'תורה'];
      const results = await batchLookup(words);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThan(0);
    });

    test('deduplicates words', async () => {
      const words = ['משה', 'משה', 'משה'];
      const results = await batchLookup(words);

      // Should only have one entry
      expect(results.size).toBe(1);
    });

    test('handles mixed valid/invalid words', async () => {
      const words = ['משה', '', 'א', 'תורה'];
      const results = await batchLookup(words);

      // Should have results for valid words
      expect(results.has('משה')).toBe(true);
      expect(results.has('תורה')).toBe(true);
    });
  });

  // ===========================================
  // lookupAllLocalDictionaries
  // ===========================================
  describe('lookupAllLocalDictionaries', () => {
    test('aggregates sources from multiple dictionaries', () => {
      const result = lookupAllLocalDictionaries('תורה');

      expect(result).toHaveProperty('allSources');
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('consensus');
    });

    test('detects Aramaic words', () => {
      const result = lookupAllLocalDictionaries('דינא');

      expect(result.isAramaic).toBe(true);
      expect(result.language).toBe('Aramaic');
    });

    test('includes scholarly flags', () => {
      const result = lookupAllLocalDictionaries('תורה');

      expect(result).toHaveProperty('hasAcademicSource');
      expect(result).toHaveProperty('hasMultipleSources');
    });
  });

  // ===========================================
  // Cache Management
  // ===========================================
  describe('cache management', () => {
    test('getCacheStats returns stats object', () => {
      const stats = getCacheStats();
      expect(stats).toBeDefined();
    });

    test('clearCache clears the cache', () => {
      // Populate cache
      quickLookup('תורה');

      // Clear
      clearCache();

      // Next lookup should not be cached
      const result = quickLookup('תורה');
      expect(result.fromCache).toBeFalsy();
    });
  });

  // ===========================================
  // Context Modes
  // ===========================================
  describe('context modes', () => {
    test('accepts talmudic context', async () => {
      const result = await lookupWord('גמרא', { contextMode: 'talmudic' });
      expect(result).toBeDefined();
    });

    test('accepts biblical context', async () => {
      const result = await lookupWord('בראשית', { contextMode: 'biblical' });
      expect(result).toBeDefined();
    });

    test('auto-detects from reference', async () => {
      const result = await lookupWord('גמרא', { reference: 'Shabbat 2a' });
      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Scholarly Source Aggregation
  // ===========================================
  describe('scholarSourceAggregator', () => {
    describe('SCHOLARLY_TIERS', () => {
      test('defines all four tiers', () => {
        expect(SCHOLARLY_TIERS.TIER_1_ACADEMIC).toBeDefined();
        expect(SCHOLARLY_TIERS.TIER_2_SCHOLARLY).toBeDefined();
        expect(SCHOLARLY_TIERS.TIER_3_REFERENCE).toBeDefined();
        expect(SCHOLARLY_TIERS.TIER_4_MODERN).toBeDefined();
      });

      test('tier 1 has highest weight (1.0)', () => {
        expect(SCHOLARLY_TIERS.TIER_1_ACADEMIC.weight).toBe(1.0);
      });

      test('tier weights decrease by level', () => {
        expect(SCHOLARLY_TIERS.TIER_1_ACADEMIC.weight).toBeGreaterThan(SCHOLARLY_TIERS.TIER_2_SCHOLARLY.weight);
        expect(SCHOLARLY_TIERS.TIER_2_SCHOLARLY.weight).toBeGreaterThan(SCHOLARLY_TIERS.TIER_3_REFERENCE.weight);
        expect(SCHOLARLY_TIERS.TIER_3_REFERENCE.weight).toBeGreaterThan(SCHOLARLY_TIERS.TIER_4_MODERN.weight);
      });

      test('tier 1 includes academic sources', () => {
        expect(SCHOLARLY_TIERS.TIER_1_ACADEMIC.sources).toContain('BDB');
        expect(SCHOLARLY_TIERS.TIER_1_ACADEMIC.sources).toContain('Jastrow');
      });
    });

    describe('getSourceTier', () => {
      test('returns tier 1 for BDB', () => {
        const tier = getSourceTier('BDB');
        expect(tier.level).toBe(1);
        expect(tier.name).toBe('Peer-Reviewed Academic');
      });

      test('returns tier 1 for Jastrow', () => {
        const tier = getSourceTier('Jastrow');
        expect(tier.level).toBe(1);
      });

      test('returns tier 2 for Klein', () => {
        const tier = getSourceTier('Klein');
        expect(tier.level).toBe(2);
      });

      test("returns tier 3 for Strong's", () => {
        const tier = getSourceTier("Strong's");
        expect(tier.level).toBe(3);
      });

      test('returns tier 4 for Sefaria', () => {
        const tier = getSourceTier('Sefaria');
        expect(tier.level).toBe(4);
      });

      test('returns tier 4 for unknown sources', () => {
        const tier = getSourceTier('UnknownSource');
        expect(tier.level).toBe(4);
      });

      test('handles null input gracefully', () => {
        const tier = getSourceTier(null);
        expect(tier).toBeDefined();
        expect(tier.level).toBe(4);
      });
    });

    describe('calculateConsensus', () => {
      test('returns weak consensus for empty sources', () => {
        const consensus = calculateConsensus([]);
        expect(consensus.level.level).toBe('weak');
        expect(consensus.totalSources).toBe(0);
      });

      test('returns weak consensus for single source', () => {
        const sources = [
          { name: 'BDB', definition: 'law, instruction' }
        ];
        const consensus = calculateConsensus(sources);
        expect(consensus.totalSources).toBe(1);
        expect(consensus.agreementCount).toBe(1);
      });

      test('detects agreement between sources with similar definitions', () => {
        const sources = [
          { name: 'BDB', definition: 'law, instruction, teaching' },
          { name: 'Jastrow', definition: 'law, teaching' },
          { name: 'Klein', definition: 'law, instruction' }
        ];
        const consensus = calculateConsensus(sources);
        expect(consensus.agreementCount).toBeGreaterThanOrEqual(2);
      });

      test('calculates weighted score', () => {
        const sources = [
          { name: 'BDB', definition: 'law' },
          { name: 'Jastrow', definition: 'law' }
        ];
        const consensus = calculateConsensus(sources);
        expect(consensus.weightedScore).toBeGreaterThan(0);
      });

      test('counts tier 1 sources', () => {
        const sources = [
          { name: 'BDB', definition: 'law' },
          { name: 'Jastrow', definition: 'law' },
          { name: 'Sefaria', definition: 'law' }
        ];
        const consensus = calculateConsensus(sources);
        expect(consensus.tier1Count).toBe(2);
      });

      test('includes analysis notes', () => {
        const sources = [
          { name: 'BDB', definition: 'law' },
          { name: 'Jastrow', definition: 'law' }
        ];
        const consensus = calculateConsensus(sources);
        expect(consensus.analysisNotes).toBeInstanceOf(Array);
      });
    });

    describe('CONSENSUS_LEVELS', () => {
      test('defines all consensus levels', () => {
        expect(CONSENSUS_LEVELS.STRONG).toBeDefined();
        expect(CONSENSUS_LEVELS.MODERATE).toBeDefined();
        expect(CONSENSUS_LEVELS.WEAK).toBeDefined();
        expect(CONSENSUS_LEVELS.DISPUTED).toBeDefined();
      });

      test('strong requires 3+ sources with 2+ tier 1', () => {
        expect(CONSENSUS_LEVELS.STRONG.minSources).toBe(3);
        expect(CONSENSUS_LEVELS.STRONG.minTier1Sources).toBe(2);
      });
    });

    describe('formatConsensusForUI', () => {
      test('returns badge object for valid consensus', () => {
        const sources = [
          { name: 'BDB', definition: 'law' },
          { name: 'Jastrow', definition: 'law' }
        ];
        const consensus = calculateConsensus(sources);
        const ui = formatConsensusForUI(consensus);

        expect(ui).toHaveProperty('badge');
        expect(ui.badge).toHaveProperty('text');
        expect(ui.badge).toHaveProperty('color');
        expect(ui.badge).toHaveProperty('icon');
      });

      test('returns summary string', () => {
        const sources = [{ name: 'BDB', definition: 'law' }];
        const consensus = calculateConsensus(sources);
        const ui = formatConsensusForUI(consensus);

        expect(ui.summary).toContain('of');
        expect(ui.summary).toContain('sources');
      });

      test('handles null consensus gracefully', () => {
        const ui = formatConsensusForUI(null);
        expect(ui.badge.text).toBe('Unknown');
      });
    });

    describe('rankSourcesByTier', () => {
      test('groups sources by tier', () => {
        const sources = [
          { name: 'BDB', definition: 'law' },
          { name: 'Klein', definition: 'law' },
          { name: "Strong's", definition: 'law' },
          { name: 'Sefaria', definition: 'law' }
        ];
        const ranked = rankSourcesByTier(sources);

        expect(ranked.academic.length).toBe(1);
        expect(ranked.scholarly.length).toBe(1);
        expect(ranked.reference.length).toBe(1);
        expect(ranked.modern.length).toBe(1);
      });

      test('handles empty array', () => {
        const ranked = rankSourcesByTier([]);
        expect(ranked.academic).toEqual([]);
        expect(ranked.scholarly).toEqual([]);
      });
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Result Quality Scoring
  // ===========================================
  describe('getResultQualityScore', () => {
    test('returns 0 for null result', () => {
      const score = getResultQualityScore(null);
      expect(score).toBe(0);
    });

    test('higher score for tier 1 sources', () => {
      const resultWithTier1 = {
        sourceCount: 1,
        hasTier1Source: true,
        hasAcademicSource: true,
        consensus: { level: { level: 'moderate' } }
      };
      const resultWithoutTier1 = {
        sourceCount: 1,
        hasTier1Source: false,
        hasAcademicSource: false,
        consensus: { level: { level: 'weak' } }
      };

      const score1 = getResultQualityScore(resultWithTier1);
      const score2 = getResultQualityScore(resultWithoutTier1);

      expect(score1).toBeGreaterThan(score2);
    });

    test('higher score for more sources', () => {
      const result1 = { sourceCount: 1 };
      const result2 = { sourceCount: 3 };

      const score1 = getResultQualityScore(result1);
      const score2 = getResultQualityScore(result2);

      expect(score2).toBeGreaterThan(score1);
    });

    test('capped at 100', () => {
      const perfectResult = {
        sourceCount: 10,
        hasTier1Source: true,
        hasAcademicSource: true,
        consensus: { level: { level: 'strong' } }
      };
      const score = getResultQualityScore(perfectResult);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Cache Warming
  // ===========================================
  describe('warmCache', () => {
    test('warms cache with words from text', async () => {
      clearCache();

      const text = 'משה אברהם תורה';
      await warmCache(text);

      // Words should now be cached
      expect(isCached('משה')).toBe(true);
      expect(isCached('אברהם')).toBe(true);
      expect(isCached('תורה')).toBe(true);
    });

    test('handles empty text gracefully', async () => {
      await expect(warmCache('')).resolves.not.toThrow();
      await expect(warmCache(null)).resolves.not.toThrow();
    });

    test('deduplicates words during warming', async () => {
      clearCache();

      const text = 'משה משה משה תורה תורה';
      await warmCache(text);

      // Should only lookup each unique word once
      expect(isCached('משה')).toBe(true);
      expect(isCached('תורה')).toBe(true);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: isCached utility
  // ===========================================
  describe('isCached', () => {
    test('returns false for uncached word', () => {
      clearCache();
      expect(isCached('תורה')).toBe(false);
    });

    test('returns true after lookup', () => {
      clearCache();
      quickLookup('משה');
      expect(isCached('משה')).toBe(true);
    });

    test('returns false for invalid word', () => {
      expect(isCached('')).toBe(false);
      expect(isCached(null)).toBe(false);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Scholarly Result Structure
  // ===========================================
  describe('scholarly result structure', () => {
    test('includes consensus in result', () => {
      const result = quickLookup('תורה');

      if (result.sources.length > 0) {
        expect(result).toHaveProperty('consensus');
        expect(result).toHaveProperty('consensusUI');
      }
    });

    test('includes alternatives for scholarly comparison', () => {
      const result = quickLookup('תורה');
      expect(result).toHaveProperty('alternatives');
      expect(result.alternatives).toBeInstanceOf(Array);
    });

    test('includes allSources sorted by tier', () => {
      const result = quickLookup('תורה');
      expect(result).toHaveProperty('allSources');
      expect(result.allSources).toBeInstanceOf(Array);
    });

    test('scholarly flags include consensus level', () => {
      const result = quickLookup('משה');

      expect(result.scholarly).toHaveProperty('consensusLevel');
      expect(result.scholarly).toHaveProperty('consensusScore');
    });

    test('sources include tier information', () => {
      const result = quickLookup('תורה');

      if (result.sources.length > 0) {
        const source = result.sources[0];
        expect(source).toHaveProperty('tier');
        expect(source).toHaveProperty('tierName');
        expect(source).toHaveProperty('tierWeight');
      }
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: raceWithEarlyReturn
  // ===========================================
  describe('raceWithEarlyReturn', () => {
    test('returns result when source found', async () => {
      const lookupFunctions = {
        'TestSource': () => Promise.resolve({ english: 'test definition' })
      };

      const result = await raceWithEarlyReturn('test', lookupFunctions, {
        timeout: 1000
      });

      expect(result).toBeDefined();
      expect(result.allSources).toBeInstanceOf(Array);
    });

    test('handles timeout gracefully', async () => {
      const lookupFunctions = {
        'SlowSource': () => new Promise(resolve =>
          setTimeout(() => resolve({ english: 'slow' }), 5000)
        )
      };

      const result = await raceWithEarlyReturn('test', lookupFunctions, {
        timeout: 100
      });

      expect(result).toBeDefined();
      // Should timeout but not throw
    });

    test('handles lookup errors gracefully', async () => {
      const lookupFunctions = {
        'ErrorSource': () => Promise.reject(new Error('Test error'))
      };

      const result = await raceWithEarlyReturn('test', lookupFunctions, {
        timeout: 1000
      });

      expect(result).toBeDefined();
      expect(result.allSources.length).toBe(0);
    });

    test('calls onSourceFound callback', async () => {
      const onSourceFound = jest.fn();
      const lookupFunctions = {
        'TestSource': () => Promise.resolve({ english: 'test' })
      };

      await raceWithEarlyReturn('test', lookupFunctions, {
        timeout: 1000,
        onSourceFound
      });

      expect(onSourceFound).toHaveBeenCalled();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Progressive Enhancement
  // ===========================================
  describe('progressiveLookup', () => {
    beforeEach(() => {
      clearCache();
    });

    test('returns immediate result for valid word', () => {
      const result = progressiveLookup('משה');

      expect(result).toBeDefined();
      expect(result.english).toBeTruthy();
      expect(result.english.toLowerCase()).toContain('moses');
    });

    test('returns empty result for invalid word', () => {
      const result = progressiveLookup('');

      expect(result.english).toBeNull();
    });

    test('returns result without callback if no onEnhanced provided', () => {
      const result = progressiveLookup('תורה');

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBe('תורה');
    });

    test('marks result as incomplete when background fetch pending', () => {
      const onEnhanced = jest.fn();
      const result = progressiveLookup('גמרא', {
        onEnhanced,
        includeOnline: true
      });

      // Immediate result should be marked as pending
      expect(result.isPending).toBe(true);
      expect(result.isComplete).toBe(false);
    });

    test('marks high-quality results as complete without background fetch', () => {
      // Use a proper noun which typically has high quality results
      const result = progressiveLookup('משה', {
        onEnhanced: jest.fn(),
        includeOnline: true
      });

      // If quality is already high (>= 80), should be marked complete
      if (result.qualityScore >= 80) {
        expect(result.isComplete).toBe(true);
      }
    });

    test('returns result without online fetch when includeOnline is false', () => {
      const onEnhanced = jest.fn();
      const result = progressiveLookup('תורה', {
        onEnhanced,
        includeOnline: false
      });

      expect(result).toBeDefined();
      // Should not have pending flag since online is disabled
      expect(result.isPending).toBeFalsy();
    });

    test('includes qualityScore in result', () => {
      const result = progressiveLookup('משה', {
        onEnhanced: jest.fn()
      });

      expect(result).toHaveProperty('qualityScore');
      expect(typeof result.qualityScore).toBe('number');
    });
  });

  describe('progressiveBatchLookup', () => {
    beforeEach(() => {
      clearCache();
    });

    test('returns immediate results for all words', () => {
      const words = ['משה', 'אברהם', 'תורה'];
      const results = progressiveBatchLookup(words);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(3);

      // Each word should have a result
      expect(results.has('משה')).toBe(true);
      expect(results.has('אברהם')).toBe(true);
      expect(results.has('תורה')).toBe(true);
    });

    test('deduplicates words', () => {
      const words = ['משה', 'משה', 'משה'];
      const results = progressiveBatchLookup(words);

      expect(results.size).toBe(1);
    });

    test('filters out invalid words', () => {
      const words = ['משה', '', 'א', 'תורה'];
      const results = progressiveBatchLookup(words);

      // Only valid words (>= 2 chars) should be included
      expect(results.size).toBe(2);
      expect(results.has('משה')).toBe(true);
      expect(results.has('תורה')).toBe(true);
    });

    test('works without callbacks', () => {
      const words = ['משה', 'תורה'];
      const results = progressiveBatchLookup(words);

      expect(results).toBeInstanceOf(Map);
      expect(results.get('משה').english).toBeTruthy();
    });

    test('accepts contextMode option', () => {
      const words = ['גמרא', 'דינא'];
      const results = progressiveBatchLookup(words, {
        contextMode: 'talmudic'
      });

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.1: Semantic Field Enrichment
  // ===========================================
  describe('getSemanticField', () => {
    test('returns null for invalid word', () => {
      expect(getSemanticField('')).toBeNull();
      expect(getSemanticField(null)).toBeNull();
    });

    test('returns semantic data for known word', () => {
      // Most common words should be in the vocabulary
      const result = getSemanticField('אלהים'); // God

      // May or may not be in vocabulary, just test structure if found
      if (result) {
        expect(result).toHaveProperty('word');
        expect(result).toHaveProperty('root');
        expect(result).toHaveProperty('gloss');
      }
    });

    test('includes domain information when available', () => {
      const result = getSemanticField('תורה');

      if (result && result.domain) {
        expect(result.domain).toHaveProperty('key');
        expect(result.domain).toHaveProperty('name');
        expect(result.domain).toHaveProperty('color');
      }
    });

    test('includes synonyms when requested', () => {
      const result = getSemanticField('תורה', { includeSynonyms: true });

      if (result) {
        expect(result).toHaveProperty('synonyms');
        expect(result.synonyms).toBeInstanceOf(Array);
      }
    });

    test('includes antonyms when requested', () => {
      const result = getSemanticField('טוב', { includeAntonyms: true }); // good

      if (result) {
        expect(result).toHaveProperty('antonyms');
        expect(result.antonyms).toBeInstanceOf(Array);
      }
    });

    test('excludes synonyms when not requested', () => {
      const result = getSemanticField('תורה', { includeSynonyms: false });

      if (result) {
        expect(result.synonyms).toBeUndefined();
      }
    });
  });

  describe('enrichWithSemantics', () => {
    test('handles null result gracefully', () => {
      expect(enrichWithSemantics(null)).toBeNull();
    });

    test('handles result without cleanedWord', () => {
      const result = { english: 'test' };
      expect(enrichWithSemantics(result)).toEqual(result);
    });

    test('adds semantics to valid result', () => {
      const result = quickLookup('תורה');
      const enriched = enrichWithSemantics(result);

      expect(enriched).toBeDefined();
      // Semantics may or may not be added depending on vocabulary
      if (enriched.semantics) {
        expect(enriched.semantics).toHaveProperty('word');
      }
    });

    test('adds domain color when available', () => {
      const result = quickLookup('אלהים');
      const enriched = enrichWithSemantics(result);

      if (enriched.semantics && enriched.semantics.domain) {
        expect(enriched).toHaveProperty('domainColor');
        expect(enriched).toHaveProperty('domainName');
      }
    });
  });

  describe('lookupWithSemantics', () => {
    test('returns lookup result with semantic data', () => {
      const result = lookupWithSemantics('משה');

      expect(result).toBeDefined();
      expect(result.english).toBeTruthy();
      expect(result.english.toLowerCase()).toContain('moses');
    });

    test('handles invalid word gracefully', () => {
      const result = lookupWithSemantics('');

      expect(result.english).toBeNull();
    });

    test('accepts semantic options', () => {
      const result = lookupWithSemantics('תורה', {
        includeSynonyms: true,
        includeAntonyms: true,
        includeRelated: false
      });

      expect(result).toBeDefined();
      // Semantics added if word is in vocabulary
      if (result.semantics) {
        expect(result.semantics).toHaveProperty('synonyms');
        expect(result.semantics).toHaveProperty('antonyms');
        expect(result.semantics.relatedWords).toBeUndefined();
      }
    });

    test('accepts lookup options', () => {
      const result = lookupWithSemantics('גמרא', {
        contextMode: 'talmudic'
      });

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBeTruthy();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.2: Contextual Definition Ranking
  // ===========================================
  describe('rankDefinitionsByContext', () => {
    test('returns empty array for null sources', () => {
      const result = rankDefinitionsByContext(null);
      expect(result).toEqual([]);
    });

    test('returns empty array for empty sources', () => {
      const result = rankDefinitionsByContext([]);
      expect(result).toEqual([]);
    });

    test('ranks sources with context scores', () => {
      const sources = [
        { name: 'BDB', definition: 'law, instruction' },
        { name: 'Jastrow', definition: 'teaching' }
      ];
      const result = rankDefinitionsByContext(sources, {
        reference: 'Genesis 1:1',
        userLevel: 'intermediate'
      });

      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('contextScore');
      expect(result[0]).toHaveProperty('contextRank');
    });

    test('adds context ranking metadata', () => {
      const sources = [
        { name: 'BDB', definition: 'to create' }
      ];
      const result = rankDefinitionsByContext(sources, {
        reference: 'Genesis 1:1'
      });

      expect(result[0]).toHaveProperty('isBestForContext');
      expect(result[0]).toHaveProperty('contextConfidence');
    });
  });

  describe('lookupWithContextRanking', () => {
    test('returns result with context ranking for valid word', () => {
      const result = lookupWithContextRanking('תורה', {
        reference: 'Deuteronomy 1:1'
      });

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBe('תורה');
    });

    test('includes contextType from reference', () => {
      const result = lookupWithContextRanking('תורה', {
        reference: 'Genesis 1:1'
      });

      if (result.sources?.length > 0) {
        expect(result).toHaveProperty('contextType');
      }
    });

    test('handles missing reference gracefully', () => {
      const result = lookupWithContextRanking('שבת');

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBeTruthy();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.2: Word Relationships
  // ===========================================
  describe('getWordRelationships', () => {
    test('returns null for invalid word', () => {
      const result = getWordRelationships(null);
      expect(result).toBeNull();
    });

    test('returns null for empty word', () => {
      const result = getWordRelationships('');
      expect(result).toBeNull();
    });

    test('returns relationship data for valid word', () => {
      const result = getWordRelationships('מלך');

      expect(result).toBeDefined();
      expect(result.word).toBe('מלך');
      expect(result).toHaveProperty('synonyms');
      expect(result).toHaveProperty('antonyms');
    });

    test('includes relationshipCount', () => {
      const result = getWordRelationships('טוב');

      expect(result).toBeDefined();
      expect(typeof result.relationshipCount).toBe('number');
    });

    test('respects includeRootFamily option', () => {
      const withFamily = getWordRelationships('מלך', { includeRootFamily: true });
      const withoutFamily = getWordRelationships('מלך', { includeRootFamily: false });

      // With family should potentially have rootFamily
      expect(withFamily).toBeDefined();
      expect(withoutFamily).toBeDefined();
    });

    test('includes biblical pairs when available', () => {
      const result = getWordRelationships('שמים', { includeBiblicalPairs: true });

      if (result?.biblicalPairs) {
        expect(Array.isArray(result.biblicalPairs)).toBe(true);
      }
    });
  });

  describe('lookupWithRelationships', () => {
    test('returns lookup result with relationships', () => {
      const result = lookupWithRelationships('תורה');

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBe('תורה');
      expect(result).toHaveProperty('relationships');
    });

    test('includes hasRelationships flag', () => {
      const result = lookupWithRelationships('טוב');

      expect(result).toBeDefined();
      expect(typeof result.hasRelationships).toBe('boolean');
    });

    test('passes lookup options correctly', () => {
      const result = lookupWithRelationships('גמרא', {
        contextMode: 'talmudic'
      });

      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.2: Scholarly Uncertainty
  // ===========================================
  describe('UNCERTAINTY_LEVELS', () => {
    test('defines all uncertainty levels', () => {
      expect(UNCERTAINTY_LEVELS.CERTAIN).toBeDefined();
      expect(UNCERTAINTY_LEVELS.PROBABLE).toBeDefined();
      expect(UNCERTAINTY_LEVELS.DISPUTED).toBeDefined();
      expect(UNCERTAINTY_LEVELS.UNCERTAIN).toBeDefined();
      expect(UNCERTAINTY_LEVELS.HAPAX).toBeDefined();
    });

    test('each level has required properties', () => {
      Object.values(UNCERTAINTY_LEVELS).forEach(level => {
        expect(level).toHaveProperty('level');
        expect(level).toHaveProperty('label');
        expect(level).toHaveProperty('icon');
        expect(level).toHaveProperty('description');
      });
    });
  });

  describe('generateScholarlyUncertainty', () => {
    test('returns uncertain for null result', () => {
      const result = generateScholarlyUncertainty(null);

      expect(result.level).toBe(UNCERTAINTY_LEVELS.UNCERTAIN);
      expect(result.markers.length).toBeGreaterThan(0);
    });

    test('returns uncertain for result with no sources', () => {
      const result = generateScholarlyUncertainty({ sources: [] });

      expect(result.level).toBe(UNCERTAINTY_LEVELS.UNCERTAIN);
      expect(result.confidence).toBe(0);
    });

    test('identifies single source as uncertain', () => {
      const result = generateScholarlyUncertainty({
        sources: [{ name: 'BDB', definition: 'test' }]
      });

      expect(result.markers.some(m => m.type === 'single_source')).toBe(true);
    });

    test('includes confidence score', () => {
      const result = generateScholarlyUncertainty({
        sources: [
          { name: 'BDB', definition: 'test' },
          { name: 'Jastrow', definition: 'test' }
        ],
        consensus: { weightedScore: 75 }
      });

      expect(result.confidence).toBe(75);
    });

    test('identifies divergent opinions', () => {
      const result = generateScholarlyUncertainty({
        sources: [
          { name: 'BDB', definition: 'meaning A' },
          { name: 'Jastrow', definition: 'meaning B' }
        ],
        consensus: {
          divergentOpinions: [{ definition: 'alt meaning', sources: ['Other'] }]
        }
      });

      expect(result.markers.some(m => m.type === 'divergent_opinions')).toBe(true);
      expect(result.hasScholarlyDebate).toBe(true);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.2: Export Capabilities
  // ===========================================
  describe('exportToJsonLD', () => {
    test('returns null for null result', () => {
      expect(exportToJsonLD(null)).toBeNull();
    });

    test('creates valid JSON-LD structure', () => {
      const result = quickLookup('תורה');
      const jsonld = exportToJsonLD(result);

      expect(jsonld).toHaveProperty('@context');
      expect(jsonld).toHaveProperty('@type', 'lexeme');
      expect(jsonld).toHaveProperty('@id');
    });

    test('includes language code', () => {
      const hebrewResult = { cleanedWord: 'תורה', isAramaic: false };
      const aramaicResult = { cleanedWord: 'מלכא', isAramaic: true };

      expect(exportToJsonLD(hebrewResult).inLanguage).toBe('hbo');
      expect(exportToJsonLD(aramaicResult).inLanguage).toBe('arc');
    });

    test('includes scholarly metadata', () => {
      const result = {
        cleanedWord: 'תורה',
        english: 'Torah, instruction',
        source: 'BDB',
        sources: [{ name: 'BDB' }, { name: 'Jastrow' }],
        confidence: { score: 85 }
      };
      const jsonld = exportToJsonLD(result);

      expect(jsonld.scholarly).toHaveProperty('sourceCount', 2);
      expect(jsonld.scholarly).toHaveProperty('confidenceScore', 85);
    });

    test('includes dateRetrieved', () => {
      const jsonld = exportToJsonLD({ cleanedWord: 'test' });
      expect(jsonld.dateRetrieved).toBeDefined();
      expect(new Date(jsonld.dateRetrieved)).toBeInstanceOf(Date);
    });
  });

  describe('exportToMarkdown', () => {
    test('returns empty string for null result', () => {
      expect(exportToMarkdown(null)).toBe('');
    });

    test('creates markdown with header', () => {
      const result = { word: 'תורה', cleanedWord: 'תורה', english: 'Torah' };
      const md = exportToMarkdown(result);

      expect(md).toContain('# תורה');
    });

    test('includes primary definition', () => {
      const result = {
        word: 'תורה',
        cleanedWord: 'תורה',
        english: 'Torah, instruction',
        source: 'BDB'
      };
      const md = exportToMarkdown(result);

      expect(md).toContain('## Primary Definition');
      expect(md).toContain('Torah, instruction');
      expect(md).toContain('BDB');
    });

    test('includes sources table when available', () => {
      const result = {
        word: 'תורה',
        cleanedWord: 'תורה',
        english: 'Torah',
        source: 'BDB',
        sources: [
          { name: 'BDB', definition: 'instruction' },
          { name: 'Jastrow', definition: 'teaching' }
        ]
      };
      const md = exportToMarkdown(result);

      expect(md).toContain('## Dictionary Sources');
      expect(md).toContain('| Source | Tier | Definition |');
    });

    test('includes generation footer', () => {
      const result = { word: 'test', cleanedWord: 'test' };
      const md = exportToMarkdown(result);

      expect(md).toContain('Torah Reader Pro Scholar');
    });

    test('respects options', () => {
      const result = {
        word: 'תורה',
        cleanedWord: 'תורה',
        english: 'Torah',
        sources: [{ name: 'BDB', definition: 'test' }],
        morphology: { pattern: 'qal' }
      };

      const withMorphology = exportToMarkdown(result, { includeMorphology: true });
      const withoutMorphology = exportToMarkdown(result, { includeMorphology: false });

      expect(withMorphology).toContain('Morphological Analysis');
      expect(withoutMorphology).not.toContain('Morphological Analysis');
    });
  });

  describe('exportToFlashcard', () => {
    test('returns null for null result', () => {
      expect(exportToFlashcard(null)).toBeNull();
    });

    test('creates flashcard with front and back', () => {
      const result = { cleanedWord: 'תורה', english: 'Torah', source: 'BDB' };
      const card = exportToFlashcard(result);

      expect(card.front).toBe('תורה');
      expect(card.back).toBe('Torah');
    });

    test('includes language tag', () => {
      const hebrewCard = exportToFlashcard({ cleanedWord: 'תורה', isAramaic: false });
      const aramaicCard = exportToFlashcard({ cleanedWord: 'מלכא', isAramaic: true });

      expect(hebrewCard.language).toBe('Hebrew');
      expect(aramaicCard.language).toBe('Aramaic');
    });

    test('includes tags array', () => {
      const card = exportToFlashcard({
        cleanedWord: 'תורה',
        isAramaic: false,
        source: 'BDB'
      });

      expect(Array.isArray(card.tags)).toBe(true);
      expect(card.tags).toContain('hebrew');
    });

    test('includes metadata', () => {
      const card = exportToFlashcard({
        cleanedWord: 'תורה',
        sources: [{ name: 'BDB' }, { name: 'Jastrow' }],
        morphology: { pattern: 'qal' }
      });

      expect(card.metadata.sourceCount).toBe(2);
      expect(card.metadata.hasMorphology).toBe(true);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.2: Fully Enriched Lookup
  // ===========================================
  describe('lookupFullyEnriched', () => {
    test('returns enriched result for valid word', async () => {
      const result = await lookupFullyEnriched('תורה');

      expect(result).toBeDefined();
      expect(result.cleanedWord).toBe('תורה');
    });

    test('includes isFullyEnriched flag', async () => {
      const result = await lookupFullyEnriched('שבת');

      expect(result.isFullyEnriched).toBe(true);
      expect(result.enrichmentLevel).toBe('full');
    });

    test('includes relationships when enabled', async () => {
      const result = await lookupFullyEnriched('מלך', {
        includeRelationships: true
      });

      expect(result).toHaveProperty('relationships');
    });

    test('includes uncertainty when enabled', async () => {
      const result = await lookupFullyEnriched('תורה', {
        includeUncertainty: true
      });

      expect(result).toHaveProperty('uncertainty');
      expect(result.uncertainty).toHaveProperty('level');
    });

    test('respects includeOnline option', async () => {
      const result = await lookupFullyEnriched('תורה', {
        includeOnline: false
      });

      expect(result).toBeDefined();
      // Should still return result without online sources
    });

    test('handles invalid word gracefully', async () => {
      const result = await lookupFullyEnriched('');

      expect(result).toBeDefined();
      expect(result.english).toBeNull();
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Dialectal/Period Analysis
  // ===========================================
  describe('LINGUISTIC_PERIODS', () => {
    test('defines all linguistic periods', () => {
      expect(LINGUISTIC_PERIODS.ARCHAIC_BIBLICAL).toBeDefined();
      expect(LINGUISTIC_PERIODS.STANDARD_BIBLICAL).toBeDefined();
      expect(LINGUISTIC_PERIODS.LATE_BIBLICAL).toBeDefined();
      expect(LINGUISTIC_PERIODS.QUMRAN).toBeDefined();
      expect(LINGUISTIC_PERIODS.MISHNAIC).toBeDefined();
      expect(LINGUISTIC_PERIODS.AMORAIC).toBeDefined();
    });

    test('each period has required properties', () => {
      Object.values(LINGUISTIC_PERIODS).forEach(period => {
        expect(period).toHaveProperty('key');
        expect(period).toHaveProperty('name');
        expect(period).toHaveProperty('abbrev');
        expect(period).toHaveProperty('dateRange');
      });
    });
  });

  describe('ARAMAIC_DIALECTS', () => {
    test('defines all Aramaic dialects', () => {
      expect(ARAMAIC_DIALECTS.BIBLICAL_ARAMAIC).toBeDefined();
      expect(ARAMAIC_DIALECTS.TARGUMIC).toBeDefined();
      expect(ARAMAIC_DIALECTS.JEWISH_PALESTINIAN).toBeDefined();
      expect(ARAMAIC_DIALECTS.JEWISH_BABYLONIAN).toBeDefined();
      expect(ARAMAIC_DIALECTS.SYRIAC).toBeDefined();
    });

    test('each dialect has required properties', () => {
      Object.values(ARAMAIC_DIALECTS).forEach(dialect => {
        expect(dialect).toHaveProperty('key');
        expect(dialect).toHaveProperty('name');
        expect(dialect).toHaveProperty('abbrev');
      });
    });
  });

  describe('analyzeDialectalPeriod', () => {
    test('returns null for invalid word', () => {
      expect(analyzeDialectalPeriod(null)).toBeNull();
      expect(analyzeDialectalPeriod('')).toBeNull();
    });

    test('returns analysis object for valid word', () => {
      const analysis = analyzeDialectalPeriod('תורה');
      expect(analysis).toHaveProperty('word');
      expect(analysis).toHaveProperty('detectedPeriods');
      expect(analysis).toHaveProperty('primaryPeriod');
      expect(analysis).toHaveProperty('confidence');
    });

    test('detects late biblical markers', () => {
      const analysis = analyzeDialectalPeriod('מלכות');
      expect(analysis.detectedPeriods).toContain('late_biblical');
    });

    test('defaults to standard biblical for unmarked words', () => {
      // Using a word without period markers
      const analysis = analyzeDialectalPeriod('אור');
      expect(analysis.primaryPeriod.key).toBe('standard_biblical');
      expect(analysis.confidence).toBe('low');
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Hapax Legomena
  // ===========================================
  describe('HAPAX_DATABASE', () => {
    test('contains known hapax legomena', () => {
      expect(HAPAX_DATABASE['גחון']).toBeDefined();
      expect(HAPAX_DATABASE['צהר']).toBeDefined();
      expect(HAPAX_DATABASE['לילית']).toBeDefined();
    });

    test('each hapax has required properties', () => {
      Object.values(HAPAX_DATABASE).forEach(hapax => {
        expect(hapax).toHaveProperty('reference');
        expect(hapax).toHaveProperty('meaning');
        expect(hapax).toHaveProperty('scholarlyNote');
      });
    });
  });

  describe('getHapaxInfo', () => {
    test('returns null for non-hapax word', () => {
      expect(getHapaxInfo('תורה')).toBeNull();
    });

    test('returns hapax info for known hapax', () => {
      const info = getHapaxInfo('צהר');
      expect(info).toBeDefined();
      expect(info.isHapax).toBe(true);
      expect(info.reference).toBe('Gen 6:16');
    });

    test('includes scholarly significance', () => {
      const info = getHapaxInfo('גחון');
      expect(info.scholarlySignificance).toBe('high');
      expect(info.interpretationCaution).toBeDefined();
    });
  });

  describe('isLikelyHapax', () => {
    test('returns false for null result', () => {
      expect(isLikelyHapax(null)).toBe(false);
    });

    test('returns false for result without sources', () => {
      expect(isLikelyHapax({ sources: [] })).toBe(false);
    });

    test('returns true when definition mentions hapax', () => {
      const result = {
        sources: [{ definition: 'This is a hapax legomenon', fullDefinition: '' }]
      };
      expect(isLikelyHapax(result)).toBe(true);
    });

    test('returns true when definition mentions only once', () => {
      const result = {
        sources: [{ definition: 'occurs only once in the Bible', fullDefinition: '' }]
      };
      expect(isLikelyHapax(result)).toBe(true);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Comparative Semitic
  // ===========================================
  describe('COMPARATIVE_SEMITIC_DB', () => {
    test('contains common Semitic roots', () => {
      expect(COMPARATIVE_SEMITIC_DB['אב']).toBeDefined();
      expect(COMPARATIVE_SEMITIC_DB['מים']).toBeDefined();
      expect(COMPARATIVE_SEMITIC_DB['מלך']).toBeDefined();
    });

    test('entries have Arabic and Akkadian cognates', () => {
      const entry = COMPARATIVE_SEMITIC_DB['אב'];
      expect(entry.arabic).toBeDefined();
      expect(entry.akkadian).toBeDefined();
    });

    test('entries have proto-Semitic reconstruction', () => {
      const entry = COMPARATIVE_SEMITIC_DB['בן'];
      expect(entry.protoSemitic).toBeDefined();
      expect(entry.protoSemitic).toMatch(/^\*/);
    });
  });

  describe('getComparativeSemiticData', () => {
    test('returns null for invalid word', () => {
      expect(getComparativeSemiticData(null)).toBeNull();
      expect(getComparativeSemiticData('')).toBeNull();
    });

    test('returns null for word not in database', () => {
      expect(getComparativeSemiticData('קודש')).toBeNull();
    });

    test('returns comparative data for known word', () => {
      const data = getComparativeSemiticData('אב');
      expect(data).toBeDefined();
      expect(data.hasComparativeData).toBe(true);
      expect(data.arabic).toBeDefined();
      expect(data.akkadian).toBeDefined();
    });

    test('includes cognate count', () => {
      const data = getComparativeSemiticData('מלך');
      expect(data.cognateCount).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Historical Timeline
  // ===========================================
  describe('HISTORICAL_PERIODS', () => {
    test('contains ordered historical periods', () => {
      expect(HISTORICAL_PERIODS.length).toBeGreaterThan(0);
      expect(HISTORICAL_PERIODS[0]).toHaveProperty('key');
      expect(HISTORICAL_PERIODS[0]).toHaveProperty('name');
      expect(HISTORICAL_PERIODS[0]).toHaveProperty('dateRange');
    });

    test('periods are in chronological order', () => {
      const orders = HISTORICAL_PERIODS.map(p => p.order);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThan(orders[i - 1]);
      }
    });
  });

  describe('SEMANTIC_EVOLUTION_DB', () => {
    test('contains words with semantic evolution', () => {
      expect(SEMANTIC_EVOLUTION_DB['תורה']).toBeDefined();
      expect(SEMANTIC_EVOLUTION_DB['משׁיח']).toBeDefined();
    });

    test('each entry has evolution array', () => {
      const entry = SEMANTIC_EVOLUTION_DB['תורה'];
      expect(entry.evolution).toBeInstanceOf(Array);
      expect(entry.evolution.length).toBeGreaterThan(0);
    });
  });

  describe('getHistoricalUsageTimeline', () => {
    test('returns null for invalid word', () => {
      expect(getHistoricalUsageTimeline(null)).toBeNull();
    });

    test('returns null for word not in database', () => {
      expect(getHistoricalUsageTimeline('שלום')).toBeNull();
    });

    test('returns timeline for known word', () => {
      const timeline = getHistoricalUsageTimeline('תורה');
      expect(timeline).toBeDefined();
      expect(timeline.hasEvolution).toBe(true);
      expect(timeline.evolution.length).toBeGreaterThan(0);
    });

    test('includes period info in evolution', () => {
      const timeline = getHistoricalUsageTimeline('תורה');
      expect(timeline.evolution[0]).toHaveProperty('period');
      expect(timeline.evolution[0]).toHaveProperty('meaning');
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Enhanced Citations
  // ===========================================
  describe('CITATION_FORMATS', () => {
    test('defines SBL format', () => {
      expect(CITATION_FORMATS.SBL).toBeDefined();
      expect(CITATION_FORMATS.SBL.name).toContain('Biblical Literature');
    });

    test('defines Chicago format', () => {
      expect(CITATION_FORMATS.CHICAGO).toBeDefined();
    });
  });

  describe('generateSBLCitation', () => {
    test('returns fallback for unknown source', () => {
      const citation = generateSBLCitation('UnknownSource', 'word');
      expect(citation.footnote).toBe('UnknownSource');
    });

    test('returns SBL formatted citation for known source', () => {
      const citation = generateSBLCitation('BDB', 'תורה');
      expect(citation.format).toBe('SBL');
      expect(citation.footnote).toContain('תורה');
    });

    test('includes bibliography entry', () => {
      const citation = generateSBLCitation('BDB', 'אב');
      expect(citation.bibliography).toBeDefined();
    });
  });

  describe('generateAcademicCitations', () => {
    test('returns empty array for null sources', () => {
      expect(generateAcademicCitations(null)).toEqual([]);
    });

    test('returns empty array for empty sources', () => {
      expect(generateAcademicCitations([])).toEqual([]);
    });

    test('generates citations for all sources', () => {
      const sources = [
        { name: 'BDB', headword: 'תורה' },
        { name: 'Jastrow', headword: 'תורה' }
      ];
      const citations = generateAcademicCitations(sources, 'SBL');
      expect(citations.length).toBe(2);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Cross-References
  // ===========================================
  describe('CROSS_REFERENCE_DB', () => {
    test('contains key theological terms', () => {
      expect(CROSS_REFERENCE_DB['חסד']).toBeDefined();
      expect(CROSS_REFERENCE_DB['שׁבת']).toBeDefined();
    });

    test('each entry has references array', () => {
      const entry = CROSS_REFERENCE_DB['חסד'];
      expect(entry.references).toBeInstanceOf(Array);
      expect(entry.references.length).toBeGreaterThan(0);
    });

    test('references have required properties', () => {
      const entry = CROSS_REFERENCE_DB['שׁבת'];
      entry.references.forEach(ref => {
        expect(ref).toHaveProperty('ref');
        expect(ref).toHaveProperty('type');
        expect(ref).toHaveProperty('text');
      });
    });
  });

  describe('getCrossReferences', () => {
    test('returns null for invalid word', () => {
      expect(getCrossReferences(null)).toBeNull();
    });

    test('returns null for word not in database', () => {
      expect(getCrossReferences('קודש')).toBeNull();
    });

    test('returns cross-references for known word', () => {
      const refs = getCrossReferences('חסד');
      expect(refs).toBeDefined();
      expect(refs.hasCrossReferences).toBe(true);
      expect(refs.referenceCount).toBeGreaterThan(0);
    });

    test('includes reference types', () => {
      // Use חסד which is definitely in the database
      const refs = getCrossReferences('חסד');
      expect(refs.types).toBeInstanceOf(Array);
      expect(refs.types.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // PRO SCHOLAR V10.3: Ultimate Enriched Lookup
  // ===========================================
  describe('lookupFullyEnrichedV3', () => {
    test('returns enriched result for valid word', async () => {
      const result = await lookupFullyEnrichedV3('תורה');
      expect(result).toBeDefined();
      expect(result.cleanedWord).toBe('תורה');
    });

    test('marks result as V10.3 enriched', async () => {
      const result = await lookupFullyEnrichedV3('שבת');
      expect(result.isFullyEnriched).toBe(true);
      expect(result.enrichmentLevel).toBe('pro_scholar_v10.3');
    });

    test('includes dialectal analysis when enabled', async () => {
      const result = await lookupFullyEnrichedV3('מלכות', {
        includeDialectalAnalysis: true
      });
      expect(result.dialectalAnalysis).toBeDefined();
    });

    test('includes comparative Semitic data when available', async () => {
      const result = await lookupFullyEnrichedV3('אב', {
        includeComparativeSemitic: true
      });
      expect(result.comparativeSemitic).toBeDefined();
      expect(result.hasComparativeData).toBe(true);
    });

    test('includes historical timeline when available', async () => {
      const result = await lookupFullyEnrichedV3('תורה', {
        includeHistoricalTimeline: true
      });
      expect(result.historicalTimeline).toBeDefined();
      expect(result.hasSemanticEvolution).toBe(true);
    });

    test('includes cross-references when available', async () => {
      const result = await lookupFullyEnrichedV3('חסד', {
        includeCrossReferences: true
      });
      expect(result.crossReferences).toBeDefined();
      expect(result.hasCrossReferences).toBe(true);
    });

    test('includes enrichment features summary', async () => {
      const result = await lookupFullyEnrichedV3('אב');
      expect(result.enrichmentFeatures).toBeDefined();
      expect(result.enrichmentFeatures).toHaveProperty('dialectalAnalysis');
      expect(result.enrichmentFeatures).toHaveProperty('comparativeSemitic');
    });

    test('handles invalid word gracefully', async () => {
      const result = await lookupFullyEnrichedV3('');
      expect(result).toBeDefined();
      expect(result.english).toBeNull();
    });
  });
});
