/**
 * Tests for Talmud Diagram Service
 * Deterministic Mermaid generation without AI
 */

import talmudDiagramService, {
  generateCommentatorNetworkDiagram,
  TALMUD_COMMENTATORS
} from './talmudDiagramService';

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
