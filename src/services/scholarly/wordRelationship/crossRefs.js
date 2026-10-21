// =============================================================================
// Cross-references savantes — extraction regex des « cf. / perhaps from »
// des définitions BDB/Jastrow.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// CROSS-REFERENCE PARSING (BDB/Jastrow "cf." and "see")
// =============================================================================

/**
 * Patterns for extracting cross-references from dictionary definitions
 * BDB and Jastrow use various abbreviations:
 * - cf. (confer/compare)
 * - see
 * - v. (vide/see)
 * - comp. (compare)
 * - q.v. (quod vide)
 */
const CROSS_REF_PATTERNS = [
  // cf. followed by Hebrew word(s)
  { pattern: /cf\.?\s+([א-ת]+)/gi, type: 'compare', source: 'cf.' },
  // see followed by Hebrew word(s)
  { pattern: /see\s+([א-ת]+)/gi, type: 'see', source: 'see' },
  // v. (vide) followed by Hebrew word(s)
  { pattern: /\bv\.\s+([א-ת]+)/gi, type: 'see', source: 'v.' },
  // comp. followed by Hebrew word(s)
  { pattern: /comp\.?\s+([א-ת]+)/gi, type: 'compare', source: 'comp.' },
  // q.v. followed or preceded by Hebrew word
  { pattern: /([א-ת]+)\s*q\.v\./gi, type: 'see', source: 'q.v.' },
  // "from" indicating etymology
  { pattern: /from\s+([א-ת]+)/gi, type: 'etymology', source: 'from' },
  // "= " indicating synonym/equivalent
  { pattern: /=\s*([א-ת]+)/gi, type: 'synonym', source: '=' },
  // "opp." indicating antonym
  { pattern: /opp\.?\s+([א-ת]+)/gi, type: 'antonym', source: 'opp.' },
  // "der." (derivative) or "deriv."
  { pattern: /der(?:iv)?\.?\s+(?:of\s+)?([א-ת]+)/gi, type: 'derivative', source: 'deriv.' },
];

/**
 * Extract cross-references from a dictionary definition
 * Parses BDB/Jastrow "cf.", "see", "comp." references
 *
 * @param {string} definition - The dictionary definition text
 * @param {string} sourceDict - Source dictionary name (BDB, Jastrow, etc.)
 * @returns {Array} Array of cross-reference objects
 */
export function extractCrossReferences(definition, sourceDict = 'unknown') {
  if (!definition || typeof definition !== 'string') return [];

  const crossRefs = [];
  const seen = new Set(); // Prevent duplicates

  for (const { pattern, type, source } of CROSS_REF_PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(definition)) !== null) {
      const word = match[1];

      // Validate: must be 2-4 Hebrew letters (root or simple word)
      if (word && word.length >= 2 && word.length <= 5) {
        const key = `${word}-${type}`;
        if (!seen.has(key)) {
          seen.add(key);
          crossRefs.push({
            word,
            type,
            marker: source,
            sourceDict,
            context: definition.slice(
              Math.max(0, match.index - 20),
              Math.min(definition.length, match.index + match[0].length + 20)
            ).trim()
          });
        }
      }
    }
  }

  return crossRefs;
}

/**
 * Cross-reference across all supported dictionary sources.
 * Iterates each source's definition text, extracts refs, and deduplicates
 * by (word, type) across sources.
 *
 * @param {Object} dictionaryData - Dictionary entries keyed by source (jastrow, klein, gesenius, strongs, …)
 * @returns {{crossRefs: Array, byType: Object}}
 */
export function parseAllCrossReferences(dictionaryData) {
  const byType = {};
  const crossRefs = [];
  if (!dictionaryData) return { crossRefs, byType };

  const sources = [
    { key: 'bdb', name: 'BDB' },
    { key: 'jastrow', name: 'Jastrow' },
    { key: 'klein', name: 'Klein' },
    { key: 'gesenius', name: 'Gesenius' },
    { key: 'strongs', name: "Strong's" },
  ];
  const seen = new Set();

  for (const { key, name } of sources) {
    const entry = dictionaryData[key];
    if (!entry) continue;
    const definition = entry.definition || entry.gloss || entry.english || '';
    for (const ref of extractCrossReferences(definition, name)) {
      const dedupKey = `${ref.word}-${ref.type}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      crossRefs.push(ref);
      (byType[ref.type] ||= []).push(ref);
    }
  }

  return { crossRefs, byType };
}

