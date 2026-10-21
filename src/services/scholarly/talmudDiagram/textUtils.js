// =============================================================================
// Utilitaires texte/Mermaid du service de diagrammes talmudiques
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics, normalizeFinals } from '../../../utils/hebrewUtils';

// =============================================================================
// PRO SCHOLAR UTILITIES - Enhanced helper functions
// =============================================================================

// DRY: logique déléguée à stripAllDiacritics (hebrewUtils.js), mais l'ancien contrat
// de stripNikud veut '' pour entrée vide/null (stripAllDiacritics transmet tel quel)
export const stripNikud = (text) => stripAllDiacritics(text) ?? '';

/**
 * PRO SCHOLAR - Normalize Hebrew text for pattern matching
 * Handles final letters (sofit), punctuation, and common variants
 * @param {string} text - Hebrew/Aramaic text
 * @returns {string} Normalized text
 */
export const normalizeHebrew = (text) => {
  if (!text) return '';
  return normalizeFinals(stripNikud(text))
    // Normalize Hebrew punctuation
    .replace(/[׳']/g, '')  // geresh (used in abbreviations like א׳, ר׳)
    .replace(/[״"]/g, '')  // gershayim (double quotes)
    .replace(/־/g, ' ')    // maqaf (Hebrew hyphen) to space
    .replace(/–/g, ' ')    // en-dash to space
    .replace(/\s+/g, ' ')  // collapse whitespace
    .trim();
};

/**
 * Clean text for safe Mermaid diagram inclusion
 * @param {string} text - Raw text
 * @param {number} max - Maximum characters
 * @returns {string} Cleaned text safe for Mermaid
 */
export const cleanForMermaid = (text, max = 40) => {
  if (!text) return '';

  // Clean the text for safe Mermaid rendering
  const cleaned = stripNikud(text)
    .replace(/[\n\r\t]/g, ' ')        // Replace whitespace
    .replace(/\s+/g, ' ')              // Collapse multiple spaces
    .replace(/"/g, "'")                // Replace double quotes
    .replace(/[[\]{}()<>]/g, '')       // Remove brackets/parens
    .replace(/[#&;|`~^\\]/g, '')       // Remove Mermaid special chars
    .replace(/-->/g, '-')              // Remove arrow syntax
    .replace(/---/g, '-')              // Remove line syntax
    .replace(/[^\u0020-\u007E\u0590-\u05FF\u0600-\u06FF]/g, '') // Keep ASCII + Hebrew + Arabic
    .trim();

  // Truncate based on cleaned text length
  if (cleaned.length > max) {
    return cleaned.slice(0, max - 3) + '...';
  }
  return cleaned;
};

/**
 * Safely execute an async function with fallback
 * @param {Function} fn - Async function to execute
 * @param {*} fallback - Value to return on error
 * @param {string} context - Context for logging
 * @returns {Promise<*>} Result or fallback
 */
export const safeExecute = async (fn, fallback, context) => {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[talmudDiagramService:${context}]`, err.message);
    return fallback;
  }
};

/**
 * Validate Mermaid diagram syntax before rendering
 * @param {string} mermaid - Mermaid diagram code
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export const validateMermaidSyntax = (mermaid) => {
  const errors = [];
  const warnings = [];

  if (!mermaid || typeof mermaid !== 'string') {
    return { valid: false, errors: ['Empty or invalid diagram'], warnings: [] };
  }

  const lines = mermaid.split('\n');

  // Check for graph declaration
  if (!lines[0].match(/^(graph|flowchart)\s+(TB|BT|LR|RL)/i)) {
    errors.push('Missing or invalid graph declaration');
  }

  // Track open/close of subgraphs
  let subgraphDepth = 0;
  const nodeIds = new Set();
  const definedClasses = new Set();
  const usedClasses = new Set();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    // Skip comments and empty lines
    if (trimmed.startsWith('%%') || trimmed === '') return;

    // Track subgraph depth
    if (trimmed.startsWith('subgraph ')) {
      subgraphDepth++;
      // Extract subgraph ID
      const match = trimmed.match(/^subgraph\s+(\w+)/);
      if (match) nodeIds.add(match[1]);
    }
    if (trimmed === 'end') {
      subgraphDepth--;
      if (subgraphDepth < 0) {
        errors.push(`Line ${lineNum}: Unmatched 'end' statement`);
      }
    }

    // Track classDef
    if (trimmed.startsWith('classDef ')) {
      const match = trimmed.match(/^classDef\s+(\w+)/);
      if (match) definedClasses.add(match[1]);
    }

    // Track class usage
    if (trimmed.startsWith('class ')) {
      const match = trimmed.match(/^class\s+\w+\s+(\w+)/);
      if (match) usedClasses.add(match[1]);
    }

    // Check for unclosed brackets in node definitions
    const brackets = trimmed.match(/[\[\]{}()]/g) || [];
    const opens = brackets.filter(b => '[{('.includes(b)).length;
    const closes = brackets.filter(b => ']})'.includes(b)).length;
    if (opens !== closes) {
      warnings.push(`Line ${lineNum}: Possibly unbalanced brackets`);
    }

    // Check for problematic characters
    if (trimmed.includes('-->') && trimmed.includes('<--')) {
      warnings.push(`Line ${lineNum}: Mixed arrow directions may cause issues`);
    }
  });

  // Check unclosed subgraphs
  if (subgraphDepth > 0) {
    errors.push(`${subgraphDepth} unclosed subgraph(s)`);
  }

  // Check undefined classes
  usedClasses.forEach(cls => {
    if (!definedClasses.has(cls)) {
      warnings.push(`Class '${cls}' used but not defined`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Generate a unique node ID that's safe for Mermaid
 * @param {string} prefix - ID prefix
 * @param {number} index - Unique index
 * @returns {string} Safe node ID
 */
const generateNodeId = (prefix, index) => {
  // Ensure prefix is alphanumeric only
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'node';
  return `${safePrefix}${index}`;
};

