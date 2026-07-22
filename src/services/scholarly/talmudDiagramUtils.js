/**
 * Talmud Diagram Utilities
 * Extracted from talmudDiagramService.js.
 *
 * Small, dependency-free helpers used by every diagram generator: Hebrew
 * normalization, Mermaid-safe cleanup, syntax validation, async safeExecute,
 * and the LRU diagram cache.
 */

import { stripAllDiacritics, normalizeFinals } from '../../utils/hebrewUtils';

// DRY: stripNikud consolidated → use stripAllDiacritics from hebrewUtils.js directly
export const stripNikud = stripAllDiacritics;

/**
 * Normalize Hebrew text for pattern matching.
 */
export const normalizeHebrew = (text) => {
  if (!text) return '';
  return normalizeFinals(stripNikud(text))
    .replace(/[׳']/g, '')
    .replace(/[״"]/g, '')
    .replace(/־/g, ' ')
    .replace(/–/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Clean text for safe Mermaid diagram inclusion.
 */
export const cleanForMermaid = (text, max = 40) => {
  if (!text) return '';

  const cleaned = stripNikud(text)
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .replace(/[[\]{}()<>]/g, '')
    .replace(/[#&;|`~^\\]/g, '')
    .replace(/-->/g, '-')
    .replace(/---/g, '-')
    .replace(/[^ -~֐-׿؀-ۿ]/g, '')
    .trim();

  if (cleaned.length > max) {
    return cleaned.slice(0, max - 3) + '...';
  }
  return cleaned;
};

/**
 * Safely execute an async function with fallback.
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
 * Validate Mermaid diagram syntax before rendering.
 */
export const validateMermaidSyntax = (mermaid) => {
  const errors = [];
  const warnings = [];

  if (!mermaid || typeof mermaid !== 'string') {
    return { valid: false, errors: ['Empty or invalid diagram'], warnings: [] };
  }

  const lines = mermaid.split('\n');

  if (!lines[0].match(/^(graph|flowchart)\s+(TB|BT|LR|RL)/i)) {
    errors.push('Missing or invalid graph declaration');
  }

  let subgraphDepth = 0;
  const nodeIds = new Set();
  const definedClasses = new Set();
  const usedClasses = new Set();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const lineNum = idx + 1;

    if (trimmed.startsWith('%%') || trimmed === '') return;

    if (trimmed.startsWith('subgraph ')) {
      subgraphDepth++;
      const match = trimmed.match(/^subgraph\s+(\w+)/);
      if (match) nodeIds.add(match[1]);
    }
    if (trimmed === 'end') {
      subgraphDepth--;
      if (subgraphDepth < 0) {
        errors.push(`Line ${lineNum}: Unmatched 'end' statement`);
      }
    }

    if (trimmed.startsWith('classDef ')) {
      const match = trimmed.match(/^classDef\s+(\w+)/);
      if (match) definedClasses.add(match[1]);
    }

    if (trimmed.startsWith('class ')) {
      const match = trimmed.match(/^class\s+\w+\s+(\w+)/);
      if (match) usedClasses.add(match[1]);
    }

    const brackets = trimmed.match(/[[\]{}()]/g) || [];
    const opens = brackets.filter(b => '[{('.includes(b)).length;
    const closes = brackets.filter(b => ']})'.includes(b)).length;
    if (opens !== closes) {
      warnings.push(`Line ${lineNum}: Possibly unbalanced brackets`);
    }

    if (trimmed.includes('-->') && trimmed.includes('<--')) {
      warnings.push(`Line ${lineNum}: Mixed arrow directions may cause issues`);
    }
  });

  if (subgraphDepth > 0) {
    errors.push(`${subgraphDepth} unclosed subgraph(s)`);
  }

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

// =============================================================================
// LRU CACHE
// =============================================================================

class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

const diagramCache = new LRUCache(150, 5 * 60 * 1000);

export function getCachedDiagram(key) {
  return diagramCache.get(key);
}

export function setCachedDiagram(key, data) {
  diagramCache.set(key, data);
}

export function clearDiagramCache() {
  diagramCache.clear();
}

export function getCacheStats() {
  return diagramCache.getStats();
}
