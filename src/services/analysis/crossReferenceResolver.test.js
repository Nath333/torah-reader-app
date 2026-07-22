import {
  extractCrossReferences,
  isPureRedirect,
  pickConsensusRedirect,
  resolveCanonical,
  normalizeKey,
  REDIRECT_TYPES
} from './crossReferenceResolver';

describe('crossReferenceResolver', () => {
  describe('extractCrossReferences', () => {
    test('parses a pure "v." redirect', () => {
      const refs = extractCrossReferences('שְׁתַּיִם , v. שְׁנַיִם', 'שְׁתַּיִם');
      expect(refs).toHaveLength(1);
      expect(refs[0].type).toBe(REDIRECT_TYPES.SEE);
      expect(normalizeKey(refs[0].target)).toBe('שנים');
    });

    test('parses a gloss + redirect', () => {
      const refs = extractCrossReferences('אִישְׁתִּי he drank; v. שְׁתִי', 'אִישְׁתִּי');
      const seeRef = refs.find(r => r.type === REDIRECT_TYPES.SEE);
      expect(seeRef).toBeDefined();
      expect(normalizeKey(seeRef.target)).toBe('שתי');
    });

    test('parses "(= X)" equivalence', () => {
      const refs = extractCrossReferences('אֶישְׁתָּא , אֶשְׁתָּא f. (= שִׁיתָּא) six', 'אֶישְׁתָּא');
      const eq = refs.find(r => r.type === REDIRECT_TYPES.EQUIVALENT);
      expect(eq).toBeDefined();
      expect(normalizeKey(eq.target)).toBe('שיתא');
    });

    test('parses "ch. X" Chaldee marker (Aramaic → Hebrew cognate)', () => {
      // אֲזַל (Aramaic "went") ch. of Hebrew הלך. Distinct consonants so this
      // isn't treated as a self-redirect.
      const refs = extractCrossReferences('אֲזַל ch. הלך', 'אֲזַל');
      const ch = refs.find(r => r.type === REDIRECT_TYPES.CHALDEE);
      expect(ch).toBeDefined();
      expect(normalizeKey(ch.target)).toBe('הלך');
    });

    test('treats same-headword abbreviation target as self-redirect and drops it', () => {
      // Jastrow sometimes writes "v. אִשְׁ׳" meaning "v. אִשְׁתְּמוֹדַע" — expansion
      // resolves to the headword itself, which is a no-op redirect.
      const refs = extractCrossReferences('אִישְׁתְּמוֹדַע , v. אִשְׁ׳', 'אִישְׁתְּמוֹדַע');
      expect(refs).toHaveLength(0);
    });

    test('ignores empty / non-string input', () => {
      expect(extractCrossReferences('', 'x')).toEqual([]);
      expect(extractCrossReferences(null, 'x')).toEqual([]);
      expect(extractCrossReferences(undefined, 'x')).toEqual([]);
    });
  });

  describe('isPureRedirect', () => {
    test('classic short redirect is pure', () => {
      expect(isPureRedirect('שְׁתַּיִם , v. שְׁנַיִם', 'שְׁתַּיִם')).toBe(true);
    });

    test('gloss-then-redirect is NOT pure', () => {
      expect(isPureRedirect('אִישְׁתִּי he drank; v. שְׁתִי', 'אִישְׁתִּי')).toBe(false);
    });

    test('full definition is not a redirect', () => {
      expect(isPureRedirect(
        'שְׁנַיִם , שְׁנֵי , שְׁתַּיִם , שְׁתֵּי f. (b. h.) two . Ber. 8a ש׳ מקרא',
        'שְׁנַיִם'
      )).toBe(false);
    });
  });

  describe('pickConsensusRedirect', () => {
    test('follows when two independent sources redirect to the same target', () => {
      const sources = [
        { name: 'Jastrow', definition: 'שְׁתַּיִם , v. שְׁנַיִם', headword: 'שְׁתַּיִם', tier: 1 },
        { name: 'CAL',     definition: 'שְׁתֵּי , v. שְׁנַיִם',   headword: 'שְׁתֵּי',   tier: 1 }
      ];
      const pick = pickConsensusRedirect(sources);
      expect(pick).not.toBeNull();
      expect(normalizeKey(pick.target)).toBe('שנים');
      expect(pick.supporters).toEqual(expect.arrayContaining(['Jastrow', 'CAL']));
    });

    test('follows a single Tier-1 pure redirect', () => {
      const sources = [
        { name: 'Jastrow', definition: 'שְׁתַּיִם , v. שְׁנַיִם', headword: 'שְׁתַּיִם', tier: 1 }
      ];
      const pick = pickConsensusRedirect(sources);
      expect(pick).not.toBeNull();
      expect(normalizeKey(pick.target)).toBe('שנים');
    });

    test('does NOT follow a single non-pure low-confidence redirect', () => {
      const sources = [
        {
          name: 'Jastrow',
          definition: 'some long gloss describing something in detail; cmp. שְׁאָר',
          headword: 'something',
          tier: 1
        }
      ];
      expect(pickConsensusRedirect(sources)).toBeNull();
    });

    test('prefers "v." over "cmp." when both types are present', () => {
      const sources = [
        { name: 'Jastrow', definition: 'X , v. שְׁנַיִם', headword: 'X', tier: 1 },
        { name: 'CAL',     definition: 'X , v. שְׁנַיִם', headword: 'X', tier: 1 },
        { name: 'BDB',     definition: 'X cmp. אַחֵר',   headword: 'X', tier: 1 }
      ];
      const pick = pickConsensusRedirect(sources);
      expect(normalizeKey(pick.target)).toBe('שנים');
      expect(pick.type).toBe(REDIRECT_TYPES.SEE);
    });

    test('returns null when no sources redirect', () => {
      expect(pickConsensusRedirect([])).toBeNull();
      expect(pickConsensusRedirect([
        { name: 'Jastrow', definition: 'full definition with no redirect', headword: 'X', tier: 1 }
      ])).toBeNull();
    });
  });

  describe('resolveCanonical', () => {
    test('follows a consensus redirect via the provided lookupFn', () => {
      const lookupFn = jest.fn((word) => {
        if (normalizeKey(word) === 'שנים') {
          return {
            allSources: [
              {
                name: 'Jastrow',
                definition: 'two',
                headword: 'שְׁנַיִם',
                tier: 1,
                raw: { root: 'שני' }
              }
            ]
          };
        }
        return null;
      });

      const sources = [
        { name: 'Jastrow', definition: 'שְׁתַּיִם , v. שְׁנַיִם', headword: 'שְׁתַּיִם', tier: 1 },
        { name: 'CAL',     definition: 'שְׁתֵּי , v. שְׁנַיִם',   headword: 'שְׁתֵּי',   tier: 1 }
      ];

      const result = resolveCanonical(sources, lookupFn);
      expect(result.resolved).toBe(true);
      expect(normalizeKey(result.canonical)).toBe('שנים');
      expect(result.chain).toHaveLength(1);
      expect(result.resolvedSources[0].definition).toBe('two');
      expect(lookupFn).toHaveBeenCalledTimes(1);
    });

    test('stops at maxDepth for chains of redirects', () => {
      const fakeEntries = {
        'a': { allSources: [{ name: 'Jastrow', definition: 'A , v. B', headword: 'a', tier: 1 }] },
        'b': { allSources: [{ name: 'Jastrow', definition: 'B , v. C', headword: 'b', tier: 1 }] },
        'c': { allSources: [{ name: 'Jastrow', definition: 'C , v. A', headword: 'c', tier: 1 }] }
      };
      const lookupFn = jest.fn((word) => fakeEntries[normalizeKey(word)] || null);

      const result = resolveCanonical(
        [{ name: 'Jastrow', definition: 'A , v. B', headword: 'a', tier: 1 }],
        lookupFn,
        { maxDepth: 2 }
      );
      expect(result.chain.length).toBeLessThanOrEqual(2);
    });

    test('returns empty result when input sources are empty', () => {
      const lookupFn = jest.fn();
      const result = resolveCanonical([], lookupFn);
      expect(result.resolved).toBe(false);
      expect(lookupFn).not.toHaveBeenCalled();
    });

    test('does NOT report resolved when the target lookup returns nothing', () => {
      const lookupFn = jest.fn(() => ({ allSources: [] }));
      const sources = [
        { name: 'Jastrow', definition: 'שְׁתַּיִם , v. שְׁנַיִם', headword: 'שְׁתַּיִם', tier: 1 }
      ];
      const result = resolveCanonical(sources, lookupFn);
      expect(result.resolved).toBe(false);
      expect(result.chain).toEqual([]);
      expect(result.resolvedSources).toEqual([]);
    });
  });
});
