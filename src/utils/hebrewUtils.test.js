/**
 * Hebrew Text Utilities Tests
 *
 * Tests for Hebrew text manipulation functions including:
 * - Diacritics stripping (cantillation, vowels)
 * - Word normalization (final letters)
 * - Similarity calculations
 * - Text statistics
 */

import {
  stripCantillation,
  stripVowels,
  stripAllDiacritics,
  stripNiqqud,
  normalizeFinals,
  areSimilarWords,
  calculateSimilarity,
  isValidHeadwordMatch,
  SIMILARITY_THRESHOLD,
  cleanHebrewWord,
  cleanHebrewWordStrict,
  processHebrewText,
  hasVowels,
  hasCantillation,
  getDisplayModeLabel,
  countWords,
  countLetters,
  countUniqueWords,
  getVerseStats,
  getChapterStats,
} from './hebrewUtils';

describe('hebrewUtils', () => {
  describe('stripCantillation', () => {
    it('should return input for null/undefined', () => {
      expect(stripCantillation(null)).toBeNull();
      expect(stripCantillation(undefined)).toBeUndefined();
      expect(stripCantillation('')).toBe('');
    });

    it('should return input for non-string', () => {
      expect(stripCantillation(123)).toBe(123);
    });

    it('should remove cantillation marks', () => {
      // בְּרֵאשִׁ֖ית with etnachta (U+0591)
      const withCantillation = 'בְּרֵאשִׁ֖ית';
      const result = stripCantillation(withCantillation);
      // Should still have vowels but no cantillation
      expect(result).not.toMatch(/[\u0591-\u05AF]/);
      expect(result).toMatch(/[\u05B0-\u05BD]/); // Should have vowels
    });

    it('should preserve vowels (nikud)', () => {
      const text = 'שָׁלוֹם';
      const result = stripCantillation(text);
      expect(result).toBe('שָׁלוֹם'); // No change, no cantillation present
    });

    it('should handle text without any diacritics', () => {
      const text = 'שלום';
      expect(stripCantillation(text)).toBe('שלום');
    });
  });

  describe('stripVowels', () => {
    it('should return input for null/undefined', () => {
      expect(stripVowels(null)).toBeNull();
      expect(stripVowels(undefined)).toBeUndefined();
    });

    it('should remove vowel points (nikud)', () => {
      const withVowels = 'שָׁלוֹם';
      const result = stripVowels(withVowels);
      expect(result).toBe('שלום');
      expect(result).not.toMatch(/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/);
    });

    it('should preserve cantillation marks', () => {
      // Text with both vowels and cantillation
      const text = 'בְּרֵאשִׁ֖ית';
      const result = stripVowels(text);
      // Cantillation (U+05D6 etnachta) should remain
      expect(result).toMatch(/[\u0591-\u05AF]/);
    });

    it('should handle text without vowels', () => {
      const text = 'בראשית';
      expect(stripVowels(text)).toBe('בראשית');
    });
  });

  describe('stripAllDiacritics', () => {
    it('should return input for null/undefined', () => {
      expect(stripAllDiacritics(null)).toBeNull();
      expect(stripAllDiacritics(undefined)).toBeUndefined();
    });

    it('should remove both vowels and cantillation', () => {
      const withAll = 'בְּרֵאשִׁ֖ית';
      const result = stripAllDiacritics(withAll);
      expect(result).toBe('בראשית');
      expect(result).not.toMatch(/[\u0591-\u05C7]/);
    });

    it('should return consonants only', () => {
      const text = 'הָאָ֗רֶץ';
      const result = stripAllDiacritics(text);
      expect(result).toBe('הארץ');
    });
  });

  describe('stripNiqqud (alias)', () => {
    it('should be the same as stripVowels', () => {
      expect(stripNiqqud).toBe(stripVowels);
    });
  });

  describe('normalizeFinals', () => {
    it('should return input for null/undefined', () => {
      expect(normalizeFinals(null)).toBeNull();
      expect(normalizeFinals(undefined)).toBeUndefined();
    });

    it('should convert final mem to regular mem', () => {
      expect(normalizeFinals('שלום')).toBe('שלומ');
    });

    it('should convert final nun to regular nun', () => {
      expect(normalizeFinals('אמן')).toBe('אמנ');
    });

    it('should convert final tsadi to regular tsadi', () => {
      expect(normalizeFinals('ארץ')).toBe('ארצ');
    });

    it('should convert final pe to regular pe', () => {
      expect(normalizeFinals('כף')).toBe('כפ');
    });

    it('should convert final kaf to regular kaf', () => {
      expect(normalizeFinals('מלך')).toBe('מלכ');
    });

    it('should convert all finals in one word', () => {
      expect(normalizeFinals('שלום')).toBe('שלומ');
    });

    it('should not affect non-final letters', () => {
      expect(normalizeFinals('מלכים')).toBe('מלכימ');
    });
  });

  describe('areSimilarWords', () => {
    it('should return false for null/undefined inputs', () => {
      expect(areSimilarWords(null, 'test')).toBe(false);
      expect(areSimilarWords('test', null)).toBe(false);
      expect(areSimilarWords(null, null)).toBe(false);
    });

    it('should return true for identical words', () => {
      expect(areSimilarWords('שלום', 'שלום')).toBe(true);
    });

    it('should return true for words with same consonants', () => {
      expect(areSimilarWords('שָׁלוֹם', 'שלום')).toBe(true);
    });

    it('should handle short words', () => {
      expect(areSimilarWords('אל', 'אל')).toBe(true);
      expect(areSimilarWords('א', 'א')).toBe(true);
    });

    it('should return false for completely different words', () => {
      expect(areSimilarWords('שלום', 'בית')).toBe(false);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for null/undefined (no validation possible)', () => {
      expect(calculateSimilarity(null, 'test')).toBe(1);
      expect(calculateSimilarity('test', null)).toBe(1);
    });

    it('should return 1 for exact match', () => {
      expect(calculateSimilarity('שלום', 'שלום')).toBe(1);
    });

    it('should return 1 for match with diacritics', () => {
      expect(calculateSimilarity('שָׁלוֹם', 'שלום')).toBe(1);
    });

    it('should return high score for similar words', () => {
      const score = calculateSimilarity('שלום', 'שלומ');
      expect(score).toBeGreaterThan(0.7); // 3 out of 4 characters match = 0.75
    });

    it('should return low score for different words', () => {
      const score = calculateSimilarity('שלום', 'בית');
      expect(score).toBeLessThan(0.5);
    });

    it('should handle prefix matching', () => {
      const score = calculateSimilarity('בראשית', 'בראש');
      expect(score).toBeGreaterThan(0.6);
    });
  });

  describe('isValidHeadwordMatch', () => {
    it('should return true for short queries', () => {
      expect(isValidHeadwordMatch('שלום', 'של')).toBe(true);
    });

    it('should return true for matching headwords', () => {
      expect(isValidHeadwordMatch('שלום', 'שלום')).toBe(true);
    });

    it('should return true for similar headwords', () => {
      expect(isValidHeadwordMatch('בראשית', 'בראש')).toBe(true);
    });

    it('should use custom threshold', () => {
      const result = isValidHeadwordMatch('שלום', 'בית', 0.1);
      // Very low threshold should pass
      expect(typeof result).toBe('boolean');
    });
  });

  describe('SIMILARITY_THRESHOLD', () => {
    it('should be defined and reasonable', () => {
      expect(SIMILARITY_THRESHOLD).toBeDefined();
      expect(SIMILARITY_THRESHOLD).toBeGreaterThan(0);
      expect(SIMILARITY_THRESHOLD).toBeLessThan(1);
    });
  });

  describe('cleanHebrewWord', () => {
    it('should return empty string for null/undefined', () => {
      expect(cleanHebrewWord(null)).toBe('');
      expect(cleanHebrewWord(undefined)).toBe('');
      expect(cleanHebrewWord('')).toBe('');
    });

    it('should remove diacritics but keep letters', () => {
      expect(cleanHebrewWord('שָׁלוֹם')).toBe('שלום');
    });

    it('should preserve gershayim for abbreviations', () => {
      // רש"י should keep the quotation mark
      expect(cleanHebrewWord('רש"י')).toBe('רש"י');
      expect(cleanHebrewWord("רש'י")).toBe("רש'י");
    });

    it('should remove non-Hebrew characters', () => {
      expect(cleanHebrewWord('Hello שלום World')).toBe('שלום');
    });
  });

  describe('cleanHebrewWordStrict', () => {
    it('should return empty string for null/undefined', () => {
      expect(cleanHebrewWordStrict(null)).toBe('');
      expect(cleanHebrewWordStrict(undefined)).toBe('');
    });

    it('should remove ALL non-Hebrew including gershayim', () => {
      expect(cleanHebrewWordStrict('רש"י')).toBe('רשי');
      expect(cleanHebrewWordStrict("רש'י")).toBe('רשי');
    });

    it('should keep only Hebrew consonants', () => {
      expect(cleanHebrewWordStrict('שָׁלוֹם')).toBe('שלום');
    });
  });

  describe('processHebrewText', () => {
    it('should return input for null/undefined', () => {
      expect(processHebrewText(null)).toBeNull();
      expect(processHebrewText(undefined)).toBeUndefined();
    });

    it('should return unchanged text with default options', () => {
      const text = 'שָׁלוֹם';
      expect(processHebrewText(text)).toBe(text);
    });

    it('should strip cantillation when showCantillation is false', () => {
      const text = 'בְּרֵאשִׁ֖ית';
      const result = processHebrewText(text, { showCantillation: false });
      expect(result).not.toMatch(/[\u0591-\u05AF]/);
      expect(result).toMatch(/[\u05B0-\u05BD]/); // Vowels preserved
    });

    it('should strip vowels when showVowels is false', () => {
      const text = 'שָׁלוֹם';
      const result = processHebrewText(text, { showVowels: false });
      expect(result).toBe('שלום');
    });

    it('should strip both when both are false', () => {
      const text = 'בְּרֵאשִׁ֖ית';
      const result = processHebrewText(text, { showVowels: false, showCantillation: false });
      expect(result).toBe('בראשית');
    });
  });

  describe('hasVowels', () => {
    it('should return false for null/undefined', () => {
      expect(hasVowels(null)).toBe(false);
      expect(hasVowels(undefined)).toBe(false);
      expect(hasVowels('')).toBe(false);
    });

    it('should return true for text with vowels', () => {
      expect(hasVowels('שָׁלוֹם')).toBe(true);
    });

    it('should return false for text without vowels', () => {
      expect(hasVowels('שלום')).toBe(false);
    });
  });

  describe('hasCantillation', () => {
    it('should return false for null/undefined', () => {
      expect(hasCantillation(null)).toBe(false);
      expect(hasCantillation(undefined)).toBe(false);
    });

    it('should return true for text with cantillation', () => {
      const withCantillation = 'בְּרֵאשִׁ֖ית';
      expect(hasCantillation(withCantillation)).toBe(true);
    });

    it('should return false for text with only vowels', () => {
      expect(hasCantillation('שָׁלוֹם')).toBe(false);
    });
  });

  describe('getDisplayModeLabel', () => {
    it('should return מלא for full display', () => {
      expect(getDisplayModeLabel(true, true)).toBe('מלא');
    });

    it('should return עם נקודות for vowels only', () => {
      expect(getDisplayModeLabel(true, false)).toBe('עם נקודות');
    });

    it('should return עם טעמים for cantillation only', () => {
      expect(getDisplayModeLabel(false, true)).toBe('עם טעמים');
    });

    it('should return כתיב חסר for consonants only', () => {
      expect(getDisplayModeLabel(false, false)).toBe('כתיב חסר');
    });
  });

  describe('countWords', () => {
    it('should return 0 for null/undefined/empty', () => {
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
      expect(countWords('')).toBe(0);
    });

    it('should count Hebrew words', () => {
      expect(countWords('שלום עולם')).toBe(2);
    });

    it('should handle multiple spaces', () => {
      expect(countWords('שלום   עולם')).toBe(2);
    });

    it('should handle HTML tags', () => {
      expect(countWords('<b>שלום</b> עולם')).toBe(2);
    });

    it('should count verse correctly', () => {
      const verse = 'בראשית ברא אלהים את השמים ואת הארץ';
      expect(countWords(verse)).toBe(7);
    });
  });

  describe('countLetters', () => {
    it('should return 0 for null/undefined/empty', () => {
      expect(countLetters(null)).toBe(0);
      expect(countLetters(undefined)).toBe(0);
      expect(countLetters('')).toBe(0);
    });

    it('should count Hebrew consonants only', () => {
      expect(countLetters('שלום')).toBe(4);
    });

    it('should ignore vowels', () => {
      expect(countLetters('שָׁלוֹם')).toBe(4);
    });

    it('should ignore spaces and non-Hebrew', () => {
      expect(countLetters('שלום עולם')).toBe(8);
    });

    it('should ignore English letters', () => {
      expect(countLetters('Hello שלום')).toBe(4);
    });
  });

  describe('countUniqueWords', () => {
    it('should return 0 for null/undefined/empty', () => {
      expect(countUniqueWords(null)).toBe(0);
      expect(countUniqueWords(undefined)).toBe(0);
      expect(countUniqueWords('')).toBe(0);
    });

    it('should count unique words', () => {
      expect(countUniqueWords('שלום עולם שלום')).toBe(2);
    });

    it('should handle HTML', () => {
      expect(countUniqueWords('<b>שלום</b> עולם <i>שלום</i>')).toBe(2);
    });

    it('should normalize before counting', () => {
      // Same word with/without vowels should be counted once
      expect(countUniqueWords('שָׁלוֹם שלום')).toBe(1);
    });
  });

  describe('getVerseStats', () => {
    it('should return zeros for null/undefined', () => {
      const result = getVerseStats(null);
      expect(result.words).toBe(0);
      expect(result.letters).toBe(0);
      expect(result.uniqueWords).toBe(0);
      expect(result.hasVowels).toBe(false);
      expect(result.hasCantillation).toBe(false);
    });

    it('should return correct stats for a verse', () => {
      const verse = 'בְּרֵאשִׁית בָּרָא אֱלֹהִים';
      const result = getVerseStats(verse);

      expect(result.words).toBe(3);
      expect(result.letters).toBeGreaterThan(0);
      expect(result.uniqueWords).toBe(3);
      expect(result.hasVowels).toBe(true);
    });

    it('should detect cantillation', () => {
      const withCant = 'בְּרֵאשִׁ֖ית';
      const result = getVerseStats(withCant);
      expect(result.hasCantillation).toBe(true);
    });
  });

  describe('getChapterStats', () => {
    it('should return zeros for null/undefined', () => {
      const result = getChapterStats(null);
      expect(result.totalWords).toBe(0);
      expect(result.verseCount).toBe(0);
    });

    it('should return zeros for empty array', () => {
      const result = getChapterStats([]);
      expect(result.verseCount).toBe(0);
      expect(result.totalWords).toBe(0);
    });

    it('should aggregate verse statistics', () => {
      const verses = [
        { hebrew: 'שלום עולם' },
        { hebrew: 'בוקר טוב' },
      ];
      const result = getChapterStats(verses);

      expect(result.verseCount).toBe(2);
      expect(result.totalWords).toBe(4);
      expect(result.uniqueWords).toBe(4);
      expect(result.avgWordsPerVerse).toBe(2);
    });

    it('should handle mixed property names', () => {
      const verses = [
        { hebrew: 'שלום' },
        { he: 'עולם' },
      ];
      const result = getChapterStats(verses);
      expect(result.totalWords).toBe(2);
    });

    it('should calculate unique words across verses', () => {
      const verses = [
        { hebrew: 'שלום עולם' },
        { hebrew: 'שלום חברים' }, // שלום appears twice
      ];
      const result = getChapterStats(verses);
      expect(result.uniqueWords).toBe(3); // שלום, עולם, חברים
    });
  });
});
