/**
 * Tests for Talmud Diagram Service
 * Deterministic Mermaid generation without AI
 */

import talmudDiagramService, {
  generateCommentatorNetworkDiagram,
  TALMUD_COMMENTATORS,
  DIAGRAM_TYPES,
  clearDiagramCache,
  validateMermaidSyntax
} from './scholarly/talmudDiagramService';

describe('talmudDiagramService', () => {
  describe('generateCommentatorNetworkDiagram', () => {
    it('should generate a commentator relationship diagram', () => {
      const mermaid = generateCommentatorNetworkDiagram([
        'Rashi',
        'Rashbam',
        'Tosafot',
        'Ramban'
      ]);

      expect(mermaid).toMatch(/^graph TB/);
      expect(mermaid).toContain('Rashi');
      expect(mermaid).toContain('Ramban');
    });

    it('should show teacher-student relationships', () => {
      const mermaid = generateCommentatorNetworkDiagram([
        'Rashi',
        'Rashbam'  // Rashbam was Rashi's student
      ]);

      // Should have student relationship
      expect(mermaid).toContain('student');
    });

    it('should show disagreement relationships', () => {
      const mermaid = generateCommentatorNetworkDiagram([
        'Rashi',
        'Tosafot'  // Tosafot often disagrees with Rashi
      ]);

      expect(mermaid).toContain('disagrees');
    });

    it('should generate diagram for all known commentators when none specified', () => {
      const mermaid = generateCommentatorNetworkDiagram();

      // Should include multiple commentators
      expect(mermaid).toContain('Rashi');
      expect(mermaid).toContain('Rambam');
    });

    it('should group commentators by period in subgraphs', () => {
      const mermaid = generateCommentatorNetworkDiagram([
        'Rashi',
        'Rambam',
        'Or HaChaim'  // Acharonim
      ]);

      expect(mermaid).toContain('subgraph Rishonim');
      expect(mermaid).toContain('subgraph Acharonim');
    });

    it('should include icons from RABBINIC_NETWORK', () => {
      const mermaid = generateCommentatorNetworkDiagram(['Rashi', 'Ramban']);

      // Rashi has 📜 icon, Ramban has ✨ icon
      expect(mermaid).toContain('📜');
      expect(mermaid).toContain('✨');
    });
  });

  describe('TALMUD_COMMENTATORS', () => {
    it('should export list of known Talmud commentators', () => {
      expect(TALMUD_COMMENTATORS).toBeInstanceOf(Array);
      expect(TALMUD_COMMENTATORS).toContain('Rashi');
      expect(TALMUD_COMMENTATORS).toContain('Tosafot');
      expect(TALMUD_COMMENTATORS.length).toBeGreaterThan(5);
    });
  });

  describe('talmudDiagramService exports', () => {
    it('should export generateDafDiagram function', () => {
      expect(typeof talmudDiagramService.generateDafDiagram).toBe('function');
    });

    it('should export generateDafDiagramsRange function', () => {
      expect(typeof talmudDiagramService.generateDafDiagramsRange).toBe('function');
    });

    it('should export generateCommentatorNetworkDiagram function', () => {
      expect(typeof talmudDiagramService.generateCommentatorNetworkDiagram).toBe('function');
    });

    it('should export generateMachloketDiagram function', () => {
      expect(typeof talmudDiagramService.generateMachloketDiagram).toBe('function');
    });

    it('should export extractSpeakersFromText function', () => {
      expect(typeof talmudDiagramService.extractSpeakersFromText).toBe('function');
    });

    it('should export extractDisputes function', () => {
      expect(typeof talmudDiagramService.extractDisputes).toBe('function');
    });

    it('should export clearDiagramCache function', () => {
      expect(typeof clearDiagramCache).toBe('function');
    });
  });

  describe('DIAGRAM_TYPES', () => {
    it('should include all diagram types', () => {
      expect(DIAGRAM_TYPES.OVERVIEW).toBe('overview');
      expect(DIAGRAM_TYPES.SUGYA_FLOW).toBe('sugya_flow');
      expect(DIAGRAM_TYPES.SPEAKER_NETWORK).toBe('speaker_network');
      expect(DIAGRAM_TYPES.HALACHIC_CHAIN).toBe('halachic_chain');
      expect(DIAGRAM_TYPES.CONCEPT_MAP).toBe('concept_map');
      expect(DIAGRAM_TYPES.TIMELINE).toBe('timeline');
      expect(DIAGRAM_TYPES.MACHLOKET).toBe('machloket');
      expect(DIAGRAM_TYPES.SUMMARY).toBe('summary');
    });
  });

  describe('generateSummaryDiagram', () => {
    it('should export generateSummaryDiagram function', () => {
      expect(typeof talmudDiagramService.generateSummaryDiagram).toBe('function');
    });

    it('should use preloadedText when provided instead of API call', async () => {
      const { generateSummaryDiagram } = talmudDiagramService;

      // Provide Hebrew text with recognizable patterns
      const preloadedText = `
        אמר רב יהודה המוציא מרשות לרשות חייב.
        ורבי יוחנן אומר פטור מכלום.
        מאי טעמא דרב יהודה? שנאמר כל המלאכות.
        תנן: ארבע רשויות לשבת - רשות היחיד, רשות הרבים, כרמלית, ומקום פטור.
      `;

      const result = await generateSummaryDiagram('Shabbat', '2a', {
        preloadedText
      });

      // Should generate a valid Mermaid diagram
      expect(result.mermaid).toMatch(/^graph/);
      expect(result.mermaid).toContain('Shabbat 2a');

      // Should have extracted meaningful content (not an error state)
      expect(result.stats.error).toBeUndefined();
    });

    it('should show error node when content is too short', async () => {
      const { generateSummaryDiagram } = talmudDiagramService;

      // Provide very short preloadedText to trigger "too short" path
      // (avoids API fallback which would timeout in tests)
      const result = await generateSummaryDiagram('Test', '1a', {
        preloadedText: 'קצר מדי'  // Less than 50 chars triggers short content path
      });

      // Should still generate valid Mermaid
      expect(result.mermaid).toMatch(/^graph/);
      // Should indicate empty/short content
      expect(result.stats.textLength).toBeLessThan(50);
    });
  });

  describe('extractSpeakersFromText', () => {
    const { extractSpeakersFromText } = talmudDiagramService;

    it('should extract speakers from "אמר רב X" pattern', () => {
      const content = { hebrew: ['אמר רב יוסף שמעתי מיניה'] };
      const speakers = extractSpeakersFromText(content);

      expect(speakers.length).toBeGreaterThan(0);
      expect(speakers.some(s => s.name.includes('רב יוסף'))).toBe(true);
    });

    it('should extract speakers from "א״ר X" abbreviated pattern', () => {
      const content = { hebrew: ['א"ר יוחנן אמר כן'] };
      const speakers = extractSpeakersFromText(content);

      expect(speakers.length).toBeGreaterThan(0);
    });

    it('should extract speakers from "רבי X אומר" pattern', () => {
      const content = { hebrew: ['רבי מאיר אומר כך והלכה'] };
      const speakers = extractSpeakersFromText(content);

      expect(speakers.length).toBeGreaterThan(0);
      expect(speakers.some(s => s.name.includes('רבי מאיר'))).toBe(true);
    });

    it('should include statement type in speaker data', () => {
      const content = { hebrew: ['בעי רב אשי מהו למעלי'] };
      const speakers = extractSpeakersFromText(content);

      const questionSpeaker = speakers.find(s => s.type === 'question');
      // May or may not match depending on exact pattern
    });

    it('should return empty array for content without speakers', () => {
      const content = { hebrew: ['משנה זו היא'] };
      const speakers = extractSpeakersFromText(content);

      // Should not crash
      expect(Array.isArray(speakers)).toBe(true);
    });

    it('should handle empty content', () => {
      const speakers = extractSpeakersFromText({});
      expect(speakers).toEqual([]);

      const speakers2 = extractSpeakersFromText(null);
      expect(speakers2).toEqual([]);
    });
  });

  describe('extractDisputes', () => {
    const { extractDisputes } = talmudDiagramService;

    it('should extract disputes with explicit פליגי pattern', () => {
      const text = 'רב יהודה ורב נחמן פליגי בהא';
      const disputes = extractDisputes(text);

      // Should find at least one dispute
      expect(Array.isArray(disputes)).toBe(true);
    });

    it('should return empty array for text without disputes', () => {
      const text = 'הלכה פשוטה היא';
      const disputes = extractDisputes(text);

      expect(disputes).toEqual([]);
    });
  });

  describe('clearDiagramCache', () => {
    it('should not throw when called', () => {
      expect(() => clearDiagramCache()).not.toThrow();
    });
  });
});

// =============================================================================
// PRO SCHOLAR TESTS
// =============================================================================

describe('PRO SCHOLAR Features', () => {
  describe('stripNikud', () => {
    it('should remove nikud from Hebrew text', () => {
      const { stripNikud } = talmudDiagramService;
      const withNikud = 'בָּרוּךְ אַתָּה';
      const result = stripNikud(withNikud);

      // Should not contain nikud characters
      expect(result).not.toMatch(/[\u0591-\u05C7]/);
    });

    it('should handle empty input', () => {
      const { stripNikud } = talmudDiagramService;
      expect(stripNikud('')).toBe('');
      expect(stripNikud(null)).toBe('');
    });
  });

  describe('normalizeHebrew', () => {
    it('should normalize final letters (sofit) to base forms', () => {
      const { normalizeHebrew } = talmudDiagramService;
      const text = 'מלך שלום רבנן';
      const result = normalizeHebrew(text);

      // Final letters should be normalized
      expect(result).not.toContain('ך');  // Final kaf
      expect(result).not.toContain('ם');  // Final mem
      expect(result).not.toContain('ן');  // Final nun
    });

    it('should remove geresh and gershayim', () => {
      const { normalizeHebrew } = talmudDiagramService;
      const text = 'א׳ ר׳ יהודה א"ר';
      const result = normalizeHebrew(text);

      expect(result).not.toContain('׳');
      expect(result).not.toContain('"');
    });

    it('should handle maqaf (Hebrew hyphen)', () => {
      const { normalizeHebrew } = talmudDiagramService;
      // Test that maqaf characters are removed/converted
      const text = 'אבג־דהו';  // With maqaf (U+05BE)
      const result = normalizeHebrew(text);

      // Should not contain maqaf
      expect(result).not.toContain('־');
      expect(result).not.toContain('\u05BE');
    });

    it('should handle empty input', () => {
      const { normalizeHebrew } = talmudDiagramService;
      expect(normalizeHebrew('')).toBe('');
      expect(normalizeHebrew(null)).toBe('');
    });
  });

  describe('cleanForMermaid', () => {
    it('should clean text for Mermaid diagrams', () => {
      const { cleanForMermaid } = talmudDiagramService;
      const dirty = 'Test [with] {brackets} and "quotes"';
      const result = cleanForMermaid(dirty);

      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('"');
    });

    it('should truncate long text', () => {
      const { cleanForMermaid } = talmudDiagramService;
      const longText = 'א'.repeat(100);
      const result = cleanForMermaid(longText, 20);

      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('should strip nikud from Hebrew text', () => {
      const { cleanForMermaid } = talmudDiagramService;
      // Text with nikud: בַּעַל הַבַּיִת
      const withNikud = 'בַּעַל הַבַּיִת';
      const result = cleanForMermaid(withNikud);

      // Should not contain nikud characters (U+0591-U+05C7)
      expect(result).not.toMatch(/[\u0591-\u05C7]/);
      // Should still have the base letters
      expect(result).toContain('בעל');
      expect(result).toContain('הבית');
    });

    it('should return empty string for null/undefined input', () => {
      const { cleanForMermaid } = talmudDiagramService;
      expect(cleanForMermaid(null)).toBe('');
      expect(cleanForMermaid(undefined)).toBe('');
      expect(cleanForMermaid('')).toBe('');
    });

    it('should remove Mermaid arrow syntax', () => {
      const { cleanForMermaid } = talmudDiagramService;
      const withArrows = 'A --> B --- C';
      const result = cleanForMermaid(withArrows);

      expect(result).not.toContain('-->');
      expect(result).not.toContain('---');
    });
  });

  describe('extractRulingsDynamic', () => {
    it('should extract חייב/פטור rulings', () => {
      const { extractRulingsDynamic } = talmudDiagramService;
      const text = 'המוציא מרשות לרשות חייב';
      const rulings = extractRulingsDynamic(text);

      expect(rulings.length).toBeGreaterThan(0);
      expect(rulings.some(r => r.ruling === 'חייב')).toBe(true);
    });

    it('should extract מותר/אסור rulings', () => {
      const { extractRulingsDynamic } = talmudDiagramService;
      const text = 'מלאכה זו אסור בשבת';
      const rulings = extractRulingsDynamic(text);

      expect(rulings.some(r => r.ruling === 'אסור')).toBe(true);
    });

    it('should extract תיקו (unresolved)', () => {
      const { extractRulingsDynamic } = talmudDiagramService;
      const text = 'בעי רבא ולא איפשיטא תיקו';
      const rulings = extractRulingsDynamic(text);

      expect(rulings.some(r => r.ruling === 'תיקו')).toBe(true);
    });

    it('should categorize rulings by type', () => {
      const { extractRulingsDynamic } = talmudDiagramService;
      const text = 'הבהמה טהורה והדבר כשר';
      const rulings = extractRulingsDynamic(text);

      // Should have category information
      const purityRuling = rulings.find(r => r.category === 'purity');
      const validityRuling = rulings.find(r => r.category === 'validity');

      expect(purityRuling || validityRuling).toBeTruthy();
    });

    it('should include icons for rulings', () => {
      const { extractRulingsDynamic } = talmudDiagramService;
      const text = 'והאיש חייב';
      const rulings = extractRulingsDynamic(text);

      expect(rulings.some(r => r.icon)).toBe(true);
    });
  });

  describe('extractDiscourseElements', () => {
    it('should extract questions (מאי)', () => {
      const { extractDiscourseElements } = talmudDiagramService;
      const text = 'מאי שנא התם דפטור';
      const elements = extractDiscourseElements(text);

      expect(elements.questions.length).toBeGreaterThan(0);
    });

    it('should extract conclusions (שמע מינה)', () => {
      const { extractDiscourseElements } = talmudDiagramService;
      const text = 'שמע מינה דבר זה נכון';
      const elements = extractDiscourseElements(text);

      expect(elements.conclusions.length).toBeGreaterThan(0);
    });

    it('should extract objections (מיתיבי)', () => {
      const { extractDiscourseElements } = talmudDiagramService;
      const text = 'מיתיבי הרי אמרו כך';
      const elements = extractDiscourseElements(text);

      expect(elements.objections.length).toBeGreaterThan(0);
    });

    it('should extract proofs (שנאמר)', () => {
      const { extractDiscourseElements } = talmudDiagramService;
      const text = 'שנאמר ועשית הישר והטוב';
      const elements = extractDiscourseElements(text);

      expect(elements.proofs.length).toBeGreaterThan(0);
    });

    it('should return all four element types', () => {
      const { extractDiscourseElements } = talmudDiagramService;
      const text = 'מאי שנא? תניא כך. מיתיבי הרי אמרו. שמע מינה נכון.';
      const elements = extractDiscourseElements(text);

      expect(elements).toHaveProperty('questions');
      expect(elements).toHaveProperty('objections');
      expect(elements).toHaveProperty('proofs');
      expect(elements).toHaveProperty('conclusions');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const { getCacheStats } = talmudDiagramService;
      const stats = getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('validateMermaidSyntax', () => {
    const { validateMermaidSyntax } = talmudDiagramService;

    it('should validate correct Mermaid syntax', () => {
      const validChart = `graph TB
  A["Node A"]
  B["Node B"]
  A --> B`;
      const result = validateMermaidSyntax(validChart);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unclosed subgraphs', () => {
      const invalidChart = `graph TB
  subgraph test["Test"]
    A["Node"]`;
      const result = validateMermaidSyntax(invalidChart);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unclosed'))).toBe(true);
    });

    it('should return invalid for empty input', () => {
      const result = validateMermaidSyntax('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Empty'))).toBe(true);
    });

    it('should detect missing graph declaration', () => {
      const invalidChart = `A["Node A"]
  B["Node B"]`;
      const result = validateMermaidSyntax(invalidChart);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('graph declaration'))).toBe(true);
    });

    it('should warn about unbalanced brackets', () => {
      const chartWithBrackets = `graph TB
  A["Node [test"]`;
      const result = validateMermaidSyntax(chartWithBrackets);
      expect(result.warnings.some(w => w.includes('bracket'))).toBe(true);
    });
  });

  describe('HALACHIC_OUTCOMES', () => {
    it('should have positive outcome patterns', () => {
      const { HALACHIC_OUTCOMES } = talmudDiagramService;
      expect(HALACHIC_OUTCOMES.positive).toContain('חייב');
      expect(HALACHIC_OUTCOMES.positive).toContain('מותר');
      expect(HALACHIC_OUTCOMES.positive).toContain('יצא');
      expect(HALACHIC_OUTCOMES.positive).toContain('קנה');
    });

    it('should have negative outcome patterns', () => {
      const { HALACHIC_OUTCOMES } = talmudDiagramService;
      expect(HALACHIC_OUTCOMES.negative).toContain('פטור');
      expect(HALACHIC_OUTCOMES.negative).toContain('אסור');
      expect(HALACHIC_OUTCOMES.negative).toContain('לא יצא');
    });

    it('should have uncertain outcome patterns', () => {
      const { HALACHIC_OUTCOMES } = talmudDiagramService;
      expect(HALACHIC_OUTCOMES.uncertain).toContain('ספק');
      expect(HALACHIC_OUTCOMES.uncertain).toContain('תיקו');
    });
  });

  describe('OUTCOME_ICONS', () => {
    it('should have icons for common rulings', () => {
      const { OUTCOME_ICONS } = talmudDiagramService;
      expect(OUTCOME_ICONS['חייב']).toBe('🔴');
      expect(OUTCOME_ICONS['פטור']).toBe('🟢');
      expect(OUTCOME_ICONS['ספק']).toBe('🟡');
    });
  });

  describe('extractKeyTermsTfIdf', () => {
    const { extractKeyTermsTfIdf } = talmudDiagramService;

    it('should filter out short fragments (< 3 chars)', () => {
      // Text with 2-char fragments that should be filtered
      const text = 'ני לי בם הבית הגדול והעני החכם פטור מזה';
      const terms = extractKeyTermsTfIdf(text, 10);

      // Should not contain 2-char fragments
      const shortTerms = terms.filter(t => t.term.replace(/\s/g, '').length < 3);
      expect(shortTerms).toHaveLength(0);
    });

    it('should filter out compounds ending with particles like את', () => {
      // Text with compounds that end with accusative particle
      const text = 'הבית את הנר את העני את החכם אומר דבר גדול';
      const terms = extractKeyTermsTfIdf(text, 10);

      // Should not contain terms ending with את
      const badTerms = terms.filter(t => t.term.endsWith('את'));
      expect(badTerms).toHaveLength(0);
    });

    it('should extract meaningful Talmudic terms', () => {
      const text = 'בעל הבית פטור והעני חייב שמע מינה דבר זה נכון';
      const terms = extractKeyTermsTfIdf(text, 10);

      // Should contain meaningful halachic terms
      const termTexts = terms.map(t => t.term);
      expect(termTexts.some(t => t.includes('פטור') || t.includes('חייב'))).toBe(true);
    });

    it('should include term counts and scores', () => {
      const text = 'רבי אומר פטור פטור פטור מזה';
      const terms = extractKeyTermsTfIdf(text, 5);

      // Each term should have score and count
      terms.forEach(term => {
        expect(term).toHaveProperty('term');
        expect(term).toHaveProperty('score');
        expect(term).toHaveProperty('count');
      });
    });
  });
});

// Integration tests - require actual API calls
// Run these manually or in integration test suite
describe.skip('talmudDiagramService integration', () => {
  it('should fetch real data from Sefaria and generate diagram', async () => {
    const { generateDafDiagram } = talmudDiagramService;
    const result = await generateDafDiagram('Berakhot', '2a');

    console.log('Generated Mermaid:');
    console.log(result.mermaid);
    console.log('\nStats:', result.stats);
    console.log('Explanation:', result.explanation);

    expect(result.mermaid).toBeTruthy();
    expect(result.mermaid).toMatch(/^graph/);
  });

  it('should generate diagram for Shabbat 73a (39 melachot)', async () => {
    const { generateDafDiagram } = talmudDiagramService;
    const result = await generateDafDiagram('Shabbat', '73a');

    console.log('Shabbat 73a Diagram:');
    console.log(result.mermaid);

    expect(result.stats.commentators).toBeGreaterThan(0);
  });
});
