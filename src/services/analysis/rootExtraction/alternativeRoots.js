// =============================================================================
// Racines alternatives depuis les sources savantes — extrait les références
// « compare / perhaps from / possibly from » de BDB/Jastrow.
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { lookupJastrowSync, lookupBDBSync } from '../../dictionaries/dictionaryLoader';

// =============================================================================
// ALTERNATIVE ROOT EXTRACTION FROM SCHOLARLY SOURCES
// Extracts "compare", "perhaps from", "possibly from" references from BDB/Jastrow
// =============================================================================

/**
 * Patterns to extract alternative root suggestions from scholarly definitions
 * These represent scholarly uncertainty or comparison references
 */
const ALTERNATIVE_ROOT_PATTERNS = [
  { regex: /compare\s+([א-ת]{2,4})/gi, type: 'comparison', confidence: 60 },
  { regex: /perhaps\s+from\s+([א-ת]{2,4})/gi, type: 'uncertain', confidence: 50 },
  { regex: /possibly\s+from\s+([א-ת]{2,4})/gi, type: 'uncertain', confidence: 45 },
  { regex: /cf\.?\s*([א-ת]{2,4})/gi, type: 'comparison', confidence: 55 },
  { regex: /cognate\s+(?:to|with)?\s*([א-ת]{2,4})/gi, type: 'cognate', confidence: 65 },
  { regex: /related\s+to\s+([א-ת]{2,4})/gi, type: 'related', confidence: 60 },
  { regex: /denominative\s+(?:from|of)\s+([א-ת]{2,4})/gi, type: 'denominative', confidence: 70 },
  { regex: /from\s+root\s+([א-ת]{2,4})/gi, type: 'derivation', confidence: 75 },
  { regex: /√([א-ת]{2,4})/gi, type: 'root_symbol', confidence: 80 },
  { regex: /see\s+([א-ת]{2,4})/gi, type: 'cross_reference', confidence: 55 },
];

/**
 * Extract alternative root suggestions from scholarly dictionary definitions
 * @param {Object} dictionaryEntry - Entry from BDB, Jastrow, etc.
 * @returns {Array} - Array of { root, type, confidence, source, context }
 */
export function extractAlternativeRoots(dictionaryEntry) {
  if (!dictionaryEntry) return [];

  const fullDef = dictionaryEntry.fullDef || dictionaryEntry.definition || '';
  const alternatives = [];
  const seenRoots = new Set();

  // Skip if too short
  if (fullDef.length < 10) return [];

  for (const { regex, type, confidence } of ALTERNATIVE_ROOT_PATTERNS) {
    regex.lastIndex = 0; // Reset regex state
    let match;
    while ((match = regex.exec(fullDef)) !== null) {
      const root = match[1];

      // Validate: must be 2-4 Hebrew letters, not already seen
      if (root && root.length >= 2 && root.length <= 4 && !seenRoots.has(root)) {
        // Skip if it's the main entry word
        if (root === dictionaryEntry.key || root === dictionaryEntry.lemma) continue;

        seenRoots.add(root);

        // Extract surrounding context (30 chars before and after)
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 30);
        const contextEnd = Math.min(fullDef.length, matchIndex + match[0].length + 30);
        const context = fullDef.slice(contextStart, contextEnd).trim();

        alternatives.push({
          root,
          type,
          confidence,
          context: `...${context}...`,
          source: dictionaryEntry.source || 'unknown',
          pattern: match[0]
        });
      }
    }
  }

  // Sort by confidence (highest first)
  return alternatives.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get all alternative roots for a word from multiple dictionaries
 * @param {string} word - Hebrew word to look up
 * @returns {Object} - { primaryRoot, alternatives: [...], hasMultiple: boolean }
 */
export function getAllAlternativeRoots(word) {
  const result = {
    word,
    primaryRoot: null,
    alternatives: [],
    hasMultiple: false,
    scholarlyNote: null
  };

  // Get entries from all dictionaries
  const bdbEntry = lookupBDBSync(word);
  const jastrowEntry = lookupJastrowSync(word);

  // Extract primary root
  if (bdbEntry?.root) result.primaryRoot = bdbEntry.root;
  else if (jastrowEntry?.root) result.primaryRoot = jastrowEntry.root;

  // Extract alternatives from both
  const bdbAlts = bdbEntry ? extractAlternativeRoots({ ...bdbEntry, source: 'BDB' }) : [];
  const jastrowAlts = jastrowEntry ? extractAlternativeRoots({ ...jastrowEntry, source: 'Jastrow' }) : [];

  // Merge and deduplicate
  const seenRoots = new Set();
  if (result.primaryRoot) seenRoots.add(result.primaryRoot);

  for (const alt of [...bdbAlts, ...jastrowAlts]) {
    if (!seenRoots.has(alt.root)) {
      seenRoots.add(alt.root);
      result.alternatives.push(alt);
    }
  }

  result.hasMultiple = result.alternatives.length > 0;

  // Generate scholarly note if multiple roots
  if (result.hasMultiple) {
    const types = [...new Set(result.alternatives.map(a => a.type))];
    if (types.includes('uncertain')) {
      result.scholarlyNote = 'Etymology uncertain - multiple possible roots';
    } else if (types.includes('comparison')) {
      result.scholarlyNote = 'Scholars compare to related roots';
    } else {
      result.scholarlyNote = 'Alternative derivations proposed';
    }
  }

  return result;
}

