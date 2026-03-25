/**
 * Talmud Diagram Service - PRO SCHOLAR Edition
 * Deterministic Mermaid Generation (No AI Required)
 *
 * FEATURES:
 * 1. Sugya Structure Diagrams - Mishna/Gemara flow, questions/answers/proofs
 * 2. Speaker Networks - Tannaim, Amoraim with generations & relationships
 * 3. Cross-Reference Maps - Biblical citations, parallel sugyot
 * 4. Discourse Flow - Logical argument progression
 * 5. Halachic Chains - From source to practical ruling
 *
 * INTEGRATES:
 * - discoursePatternService (Talmudic structure markers)
 * - namedEntityService (Rabbi database with generations)
 * - rabbinicReferencesService (Cross-references)
 * - knowledgeGraphService (Graph generation)
 * - wordRelationshipService (Key vocabulary)
 *
 * @module talmudDiagramService
 * @version 2.0.0 PRO SCHOLAR
 */

import { getRelatedTexts, getCrossReferences, getTalmudDaf } from './sefariaApi';
import { stripAllDiacritics } from '../utils/hebrewUtils';
import {
  RABBINIC_NETWORK,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES,
  addNode,
  addEdge,
  getSubgraph,
  clearGraph
} from './knowledgeGraphService';
import { DISCOURSE_PATTERNS, DISCOURSE_TYPES } from './discoursePatternService';
import { RABBI_DATABASE, detectEntities } from './namedEntityService';
import { getWordRelationships, SEMANTIC_FIELDS } from './wordRelationshipService';

// =============================================================================
// PRO SCHOLAR UTILITIES - Enhanced helper functions
// =============================================================================

/**
 * Strip Hebrew nikud (vowel marks) from text for consistent matching
 * @param {string} text - Text with potential nikud
 * @returns {string} Text without nikud
 */
export const stripNikud = (text) => {
  if (!text) return '';
  return stripAllDiacritics(text);
};

/**
 * PRO SCHOLAR - Normalize Hebrew text for pattern matching
 * Handles final letters (sofit), punctuation, and common variants
 * @param {string} text - Hebrew/Aramaic text
 * @returns {string} Normalized text
 */
export const normalizeHebrew = (text) => {
  if (!text) return '';
  return stripNikud(text)
    // Normalize final letters to base forms for matching
    .replace(/ך/g, 'כ')  // final kaf
    .replace(/ם/g, 'מ')  // final mem
    .replace(/ן/g, 'נ')  // final nun
    .replace(/ף/g, 'פ')  // final pe
    .replace(/ץ/g, 'צ')  // final tsadi
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
const safeExecute = async (fn, fallback, context) => {
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

// =============================================================================
// TALMUD COMMENTATORS (Available on Sefaria)
// =============================================================================

export const TALMUD_COMMENTATORS = [
  'Rashi',
  'Tosafot',
  'Rashbam',
  'Ritva',
  'Rashba',
  'Ran',
  'Rosh',
  'Maharsha',
  'Maharal',
  'Meiri',
  'Rabbeinu Chananel',
  'Rabbeinu Gershom'
];

// =============================================================================
// DIAGRAM TYPES - Different visualizations for different study needs
// =============================================================================

export const DIAGRAM_TYPES = {
  OVERVIEW: 'overview',           // Commentators + cross-refs (original)
  SUGYA_FLOW: 'sugya_flow',       // Argument structure (Q&A, proofs)
  SPEAKER_NETWORK: 'speaker_network', // Who said what, their relationships
  HALACHIC_CHAIN: 'halachic_chain',   // Source → ruling progression
  CONCEPT_MAP: 'concept_map',     // Key terms and their relationships
  TIMELINE: 'timeline',           // Chronological view of speakers
  MACHLOKET: 'machloket',         // Dispute visualization
  SUMMARY: 'summary'              // Real content summary of the daf
};

// =============================================================================
// CONTENT EXTRACTION PATTERNS - For real text analysis
// =============================================================================

// =============================================================================
// DYNAMIC TEXT ANALYSIS - No hardcoded topics, learns from text structure
// =============================================================================

// PRO SCHOLAR - Comprehensive halachic outcome patterns (V2 expanded)
const HALACHIC_OUTCOMES = {
  // Positive outcomes (obligations, permissions)
  positive: [
    'חייב', 'חייבים', 'חייבת', 'חייבות', 'מחייב',
    'מותר', 'מותרת', 'מותרים', 'מותרות', 'שרי',
    'טהור', 'טהורה', 'טהורים', 'טהורות', 'מטהר',
    'כשר', 'כשרה', 'כשרים', 'כשרות', 'מכשיר',
    'יצא', 'יצאה', 'יצאו', 'יוצא',
    'קנה', 'קנתה', 'קנו', 'קונה',
    'זכה', 'זכתה', 'זכו', 'זוכה',
    'מקודשת', 'מגורשת', 'מותרת לכהונה',
    'נאמן', 'נאמנת', 'נאמנים', // credibility
    'חל', 'חלה', 'חלים' // takes effect
  ],
  // Negative outcomes (exemptions, prohibitions)
  negative: [
    'פטור', 'פטורים', 'פטורה', 'פטורות', 'פוטר',
    'אסור', 'אסורה', 'אסורים', 'אסורות', 'אסיר',
    'טמא', 'טמאה', 'טמאים', 'טמאות', 'מטמא',
    'פסול', 'פסולה', 'פסולים', 'פסולות', 'פוסל',
    'לא יצא', 'לא יצאה', 'לא יצאו', 'אינו יוצא',
    'לא קנה', 'לא קנתה', 'לא קנו', 'אינו קונה',
    'לא זכה', 'לא זכתה', 'לא זכו', 'אינו זוכה',
    'אינה מקודשת', 'אינה מגורשת', 'אסורה לכהונה',
    'אינו נאמן', 'אינה נאמנת', // not credible
    'לא חל', 'לא חלה', 'אינו חל' // doesn't take effect
  ],
  // Uncertain/unresolved outcomes
  uncertain: [
    'ספק', 'ספיקא', 'מספקא', 'ספקא דרבנן', 'ספקא דאורייתא',
    'תיקו', 'תיקום', 'תיקו נדחה',
    'צריך עיון', 'צ"ע', 'צ״ע',
    'איבעיא', 'בעיא', 'בעי',
    'קשיא', 'קשה', 'קשיות',
    'לא איפשיטא', 'לא נפשטה' // unresolved inquiry
  ],
  // Conditional outcomes
  conditional: [
    'תלוי', 'תליא', 'תלויה',
    'אם...אז', 'בזמן ש', 'בזמן שהוא',
    'בכל מקום', 'במקצת', 'לפעמים',
    'לכתחילה', 'בדיעבד', // a priori vs ex post facto
    'מדאורייתא', 'מדרבנן' // biblical vs rabbinic
  ]
};

// Icons for different outcome types
const OUTCOME_ICONS = {
  'חייב': '🔴',
  'פטור': '🟢',
  'מותר': '✅',
  'אסור': '🚫',
  'טהור': '💧',
  'טמא': '⚠️',
  'כשר': '✓',
  'פסול': '✗',
  'ספק': '🟡',
  'תיקו': '❓',
  'יצא': '✅',
  'לא יצא': '❌',
  'קנה': '💰',
  'לא קנה': '💸'
};

// Structural markers for text segmentation (for future use)
// eslint-disable-next-line no-unused-vars
const _STRUCTURE_MARKERS = {
  mishna: /מתני[׳']|משנה/,
  gemara: /גמ[׳']|גמרא/,
  question: /מאי|מנלן|היכי|כיצד|מה טעם/,
  answer: /אמר|תנא|תניא|שנאמר|דכתיב/,
  conclusion: /שמע מינה|הלכה|למעשה|והלכתא/
};

const CONTENT_PATTERNS = {
  // Questions - What is being asked
  questions: [
    { pattern: /מאי\s+([^?。.]+)/g, type: 'definition', label: 'מהו' },
    { pattern: /מנלן\s*[?]?\s*([^。.]{5,50})/g, type: 'source', label: 'מניין לנו' },
    { pattern: /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{5,50})/g, type: 'source', label: 'מנא ה״מ' },
    { pattern: /היכי\s+דמי\s*[?]?\s*([^。.]{5,40})/g, type: 'case', label: 'כיצד' },
    { pattern: /מאי\s+טעמא\s*[?]?\s*([^。.]{5,50})/g, type: 'reason', label: 'מה הטעם' },
    { pattern: /מאי\s+שנא\s+([^。.]{5,50})/g, type: 'distinction', label: 'מה ההבדל' },
    { pattern: /למאי\s+נפקא\s+מינה\s*[?]?\s*([^。.]{5,50})/g, type: 'practical', label: 'נפק״מ' },
    { pattern: /פשיטא\s*[!]?\s*([^。.]{5,40})/g, type: 'obvious', label: 'פשיטא' },
    { pattern: /כיצד\??\s*([^。.]{5,60})/g, type: 'how', label: 'כיצד' },
  ],

  // Answers/Proofs - Sources cited
  proofs: [
    { pattern: /שנאמר\s*[":״]?\s*([^"״\n]{5,80})/g, type: 'verse', label: 'פסוק' },
    { pattern: /דכתיב\s*[":״]?\s*([^"״\n]{5,80})/g, type: 'verse', label: 'כתוב' },
    { pattern: /תנן\s*[:]?\s*([^。.]{10,100})/g, type: 'mishna', label: 'משנה' },
    { pattern: /תניא\s*[:]?\s*([^。.]{10,100})/g, type: 'baraita', label: 'ברייתא' },
    { pattern: /תנו\s+רבנן\s*[:]?\s*([^。.]{10,100})/g, type: 'baraita', label: 'ת״ר' },
    { pattern: /גמרא\s*[:]?\s*([^。.]{10,80})/g, type: 'gemara', label: 'גמרא' },
  ],

  // Objections
  objections: [
    { pattern: /מיתיבי\s*[:]?\s*([^。.]{10,80})/g, type: 'objection', label: 'קושיא' },
    { pattern: /ורמינהו\s*[:]?\s*([^。.]{10,80})/g, type: 'contradiction', label: 'סתירה' },
    { pattern: /והתניא\s*[:]?\s*([^。.]{10,80})/g, type: 'challenge', label: 'והרי תניא' },
    { pattern: /והאמר\s+(\S+)\s*[:]?\s*([^。.]{10,60})/g, type: 'challenge', label: 'והרי אמר' },
  ],

  // Resolutions
  resolutions: [
    { pattern: /לא\s+קשיא\s*[:]?\s*([^。.]{10,80})/g, type: 'resolution', label: 'תירוץ' },
    { pattern: /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{10,80})/g, type: 'case_distinction', label: 'הכא במאי עסקינן' },
    { pattern: /אמר\s+לך\s*[:]?\s*([^。.]{10,60})/g, type: 'response', label: 'תשובה' },
    { pattern: /שאני\s+([^。.]{5,60})/g, type: 'distinction', label: 'שאני' },
  ],

  // Conclusions
  conclusions: [
    { pattern: /שמע\s+מינה\s*[:]?\s*([^。.]{10,80})/g, type: 'inference', label: 'ש״מ' },
    { pattern: /הלכה\s+כ?([^。.]{5,50})/g, type: 'halacha', label: 'הלכה' },
    { pattern: /הלכתא\s+כ?([^。.]{5,50})/g, type: 'halacha', label: 'הלכתא' },
    { pattern: /והלכתא\s+([^。.]{5,50})/g, type: 'halacha', label: 'והלכתא' },
    { pattern: /למעשה\s+([^。.]{5,50})/g, type: 'practical', label: 'למעשה' },
  ],

  // Topics/Subjects
  topics: [
    { pattern: /מתני[׳']\s*[:]?\s*([^。.]{10,100})/g, type: 'mishna_topic', label: 'משנה' },
    { pattern: /גמ[׳']\s*[:]?\s*([^。.]{10,80})/g, type: 'gemara_topic', label: 'גמרא' },
    { pattern: /בעיא\s+([^。.]{5,60})/g, type: 'inquiry', label: 'בעיא' },
    { pattern: /איבעיא\s+להו\s*[:]?\s*([^。.]{10,80})/g, type: 'inquiry', label: 'איבעיא להו' },
  ]
};

// =============================================================================
// PRO SCHOLAR CACHING - LRU Cache with TTL for optimal performance
// =============================================================================

/**
 * LRU Cache with TTL support for diagram caching
 * @class LRUCache
 */
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

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key, data) {
    // Remove oldest if at capacity
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

function getCachedDiagram(key) {
  return diagramCache.get(key);
}

function setCachedDiagram(key, data) {
  diagramCache.set(key, data);
}

/**
 * Clear the diagram cache
 * @returns {void}
 */
export function clearDiagramCache() {
  diagramCache.clear();
}

/**
 * Get cache statistics for monitoring
 * @returns {{ size: number, maxSize: number, hits: number, misses: number, hitRate: string }}
 */
export function getCacheStats() {
  return diagramCache.getStats();
}

// =============================================================================
// PRO SCHOLAR TF-IDF TEXT SUMMARIZER - Algorithmic Talmudic Analysis
// =============================================================================

/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) Summarizer
 * PRO SCHOLAR Edition - Optimized for Talmudic/Rabbinic Hebrew-Aramaic texts
 *
 * Pure algorithmic approach (no AI) that:
 * 1. Uses TF-IDF to find statistically significant terms
 * 2. Applies Talmudic structural awareness (Mishna, Gemara, etc.)
 * 3. Extracts key segments by importance scoring
 *
 * @class TalmudicTextSummarizer
 */
class TalmudicTextSummarizer {
  constructor() {
    // Hebrew/Aramaic stop words - comprehensive for Talmudic texts (V2 expanded)
    this.stopWords = new Set([
      // Hebrew pronouns & particles
      'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
      'זה', 'זו', 'זאת', 'אלה', 'אלו', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה',
      'אנחנו', 'אתם', 'אותו', 'אותה', 'אותם', 'עצמו', 'עצמה',
      'יש', 'אין', 'היה', 'היתה', 'היו', 'יהיה', 'תהיה', 'להיות',
      'כן', 'כך', 'לו', 'לה', 'להם', 'בו', 'בה', 'בהם', 'מה', 'מי', 'איך', 'למה',
      // Aramaic function words (expanded)
      'דהא', 'דהוא', 'דהיא', 'הכי', 'הכא', 'התם', 'הא', 'הך', 'הני', 'הנהו',
      'האי', 'ההוא', 'ההיא', 'מאן', 'היכא', 'לאו', 'אלא', 'נמי', 'דלא',
      'ליה', 'להו', 'ביה', 'מיניה', 'מינה', 'עליה',
      // Speech verbs (structural)
      'אמר', 'אומר', 'אמרו', 'אמרה', 'דאמר', 'ואמר', 'כדאמר', 'אמרי', 'קאמר',
      'דתנן', 'דתניא', 'דתני', 'לימא',
      // Titles
      'רבי', 'רב', 'רבן', 'בן', 'בר', 'מר', 'רבה', 'רבא', 'אביי',
      // Numerals
      'אחד', 'אחת', 'שני', 'שנים', 'שתי', 'שתים', 'שלש', 'שלשה',
      'ארבע', 'ארבעה', 'חמש', 'חמשה', 'שש', 'ששה', 'שבע', 'שבעה',
      'שמונה', 'תשע', 'תשעה', 'עשר', 'עשרה', 'מאה',
      // Generic verbs
      'עשה', 'עושה', 'נתן', 'נותן', 'לקח', 'בא', 'הלך', 'ראה', 'שמע',
      // V3: Very short/common words that slip through
      'לי', 'לך', 'ני', 'בם', 'כם', 'נו', 'אף', 'יד', 'פה', 'לן', 'בי'
    ]);

    // V3: Particles that should never end a compound term
    this.particleSuffixes = ['את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא'];

    // Important bigrams (compound Talmudic terms) - V4 PRO SCHOLAR expanded
    this.importantBigrams = [
      // Conclusions & inferences
      'שמע מינה', 'נפקא מינה', 'למאי נפקא', 'מכלל דאמרת', 'תא שמע',
      'מכאן למדנו', 'הא קמשמע', 'מילתא דפשיטא',
      // Source citations
      'תנו רבנן', 'מנא הני', 'הני מילי', 'תנא דבי', 'תני חדא',
      'אמר קרא', 'מדכתיב', 'דאמר מר',
      // Logical arguments
      'מאי טעמא', 'לא קשיא', 'הכא במאי', 'במאי עסקינן', 'אי הכי',
      'אלא מעתה', 'מהו דתימא', 'קא משמע', 'לאפוקי מאי',
      'מידי איריא', 'מי דמי', 'שאני התם', 'לאו אמרת',
      // Schools & disputes
      'בית שמאי', 'בית הלל', 'תנא קמא', 'חכמים אומרים', 'תנאי היא',
      'פליגי בה', 'בהא פליגי',
      // Halachic terminology
      'מן התורה', 'מדרבנן', 'מדאורייתא', 'לכתחילה', 'בדיעבד',
      'יצא ידי', 'ידי חובה', 'אין יוצאין', 'לא יצא',
      'דאורייתא היא', 'גזירת הכתוב',
      // Hermeneutics (13 middot)
      'גזירה שוה', 'קל וחומר', 'בנין אב', 'כלל ופרט', 'פרט וכלל',
      'דבר הלמד', 'שני כתובים', 'כיוצא בו', 'היקש', 'סמוכים',
      // Objections & challenges
      'מאי שנא', 'מה נפשך', 'והא קיימא', 'והא אמרת', 'ותו הא',
      'והתנן', 'ורמינהי', 'והרי זה', 'איתמר נמי',
      // Resolutions
      'לא צריכא', 'הא מני', 'אמר לך', 'הכי קאמר',
      'לעולם כדאמרינן', 'התם שאני', 'הכא נמי',
      // Shabbat/Melacha specific
      'רשות היחיד', 'רשות הרבים', 'מקום פטור', 'עקירה והנחה',
      'אבות מלאכות', 'תולדות מלאכות', 'מלאכת מחשבת'
    ];

    // Important trigrams (3-word phrases) - V2 PRO SCHOLAR expanded
    this.importantTrigrams = [
      'הלכה למשה מסיני', 'כלל ופרט וכלל', 'פרט וכלל ופרט',
      'שנים שהן ארבע', 'ארבע שהן שמונה', 'מכות ארבעים חסר',
      'יצא ידי חובתו', 'אין יוצאין ידי', 'לא יצא ידי',
      // Additional trigrams
      'מן התורה הוא', 'דברי הכל היא', 'לכולי עלמא',
      'אליבא דרבי', 'אפילו לרבנן', 'בזמן הזה'
    ];

    // Structural weights for TF-IDF boosting (V2 expanded)
    this.structureWeights = {
      // Core structure (highest)
      'מתני': 3.0, 'משנה': 3.0, 'גמרא': 2.5, 'ברייתא': 2.5,
      // Halachic conclusions (very high)
      'הלכה': 3.0, 'הלכתא': 3.0, 'והלכתא': 3.0, 'פסק': 2.8, 'למעשה': 2.5,
      // Rulings (high)
      'חייב': 2.5, 'פטור': 2.5, 'מותר': 2.3, 'אסור': 2.3,
      'טהור': 2.2, 'טמא': 2.2, 'כשר': 2.2, 'פסול': 2.2,
      'יצא': 2.0, 'קנה': 2.0, 'זכה': 2.0,
      // Sources
      'שנאמר': 2.0, 'דכתיב': 2.0, 'תנן': 1.8, 'תניא': 1.8,
      // Conclusions
      'שמע': 2.2, 'מכלל': 2.0, 'אלמא': 1.8, 'משמע': 1.8,
      // Questions
      'מנלן': 1.8, 'מאי': 1.5, 'היכי': 1.5, 'כיצד': 1.5,
      // Disputes
      'פליגי': 2.0, 'מחלוקת': 2.0, 'איתמר': 1.8,
      // Uncertainty
      'תיקו': 2.5, 'ספק': 2.0, 'ספיקא': 2.0, 'איבעיא': 1.8, 'בעיא': 1.7,
      // Objections
      'מיתיבי': 1.8, 'ורמינהו': 1.8, 'קשיא': 1.7, 'תיובתא': 2.0
    };

    // Semantic categories for term grouping (V2 expanded to 7 categories)
    this.categories = {
      halachic: ['חייב', 'פטור', 'מותר', 'אסור', 'טהור', 'טמא', 'כשר', 'פסול', 'יצא', 'קנה', 'זכה'],
      sources: ['תורה', 'נביאים', 'כתובים', 'משנה', 'ברייתא', 'תוספתא', 'מדרש', 'גמרא'],
      states: ['מקודשת', 'מגורשת', 'נשואה', 'ארוסה', 'אלמנה', 'גרושה', 'יבמה'],
      actions: ['נטל', 'הניח', 'הוציא', 'הכניס', 'קבל', 'מסר', 'שחט', 'זרק', 'אכל', 'שתה'],
      times: ['שבת', 'יום טוב', 'חול', 'לילה', 'יום', 'ערב', 'בוקר'],
      places: ['בית', 'שדה', 'רשות', 'חצר', 'מקדש', 'עזרה', 'היכל'],
      measures: ['כזית', 'כביצה', 'טפח', 'אמה', 'מיל', 'רביעית', 'לוג', 'קב']
    };

    // Prefix/suffix patterns for stemming
    this.prefixes = 'והבכלמשד';
    this.suffixes = ['ים', 'ות', 'ין', 'יא', 'תא', 'ה', 'ך', 'כם', 'נו', 'הם', 'הן', 'יו'];
  }

  removeNikud(text) {
    return text ? stripAllDiacritics(text) : '';
  }

  // Enhanced stemming - removes up to 2 prefixes and longest matching suffix
  stemWord(word) {
    if (!word || word.length <= 2) return word;
    let stemmed = word;

    // Remove up to 2 prefixes
    for (let i = 0; i < 2 && stemmed.length > 3; i++) {
      if (this.prefixes.includes(stemmed[0])) {
        stemmed = stemmed.slice(1);
      } else break;
    }

    // Remove longest matching suffix
    for (const suffix of this.suffixes) {
      if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 2) {
        stemmed = stemmed.slice(0, -suffix.length);
        break;
      }
    }

    return stemmed.length >= 2 ? stemmed : word;
  }

  // Extract 3-letter Hebrew root (shoresh) when possible
  extractRoot(word) {
    const stemmed = this.stemWord(word);
    if (stemmed.length === 3) return stemmed;
    if (stemmed.length < 3) return null;

    // Piel/Pual: doubled middle letter
    if (stemmed.length === 4 && stemmed[1] === stemmed[2]) {
      return stemmed[0] + stemmed[1] + stemmed[3];
    }
    // Hifil: starts with ה or מ
    if (stemmed.length === 4 && 'המ'.includes(stemmed[0])) {
      return stemmed.slice(1);
    }
    return stemmed.length >= 3 ? stemmed.slice(0, 3) : null;
  }

  // Extract important n-grams (bigrams + trigrams) from text
  extractNgrams(text) {
    const found = [];

    // Extract trigrams first (longer matches take priority)
    for (const trigram of this.importantTrigrams) {
      const regex = new RegExp(trigram.replace(/\s+/g, '\\s+'), 'g');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(() => found.push({ ngram: trigram.replace(/\s+/g, '_'), type: 'trigram' }));
      }
    }

    // Extract bigrams
    for (const bigram of this.importantBigrams) {
      const regex = new RegExp(bigram.replace(/\s+/g, '\\s+'), 'g');
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(() => found.push({ ngram: bigram.replace(/\s+/g, '_'), type: 'bigram' }));
      }
    }

    return found;
  }

  // Legacy method for backward compatibility
  extractBigrams(text) {
    return this.extractNgrams(text).map(n => n.ngram);
  }

  // V3: Check if term ends with a particle (bad compound)
  endsWithParticle(term) {
    const words = term.split(/\s+/);
    const lastWord = words[words.length - 1];
    return this.particleSuffixes.includes(lastWord);
  }

  // Tokenize with bigram support
  tokenize(text) {
    if (!text) return [];
    const cleaned = this.removeNikud(text);

    // Extract bigrams first (filter out bad compounds)
    const bigrams = this.extractBigrams(cleaned)
      .filter(b => !this.endsWithParticle(b.replace(/_/g, ' ')));

    // Extract and stem single words - V3: minimum 3 chars to avoid fragments
    const words = cleaned.match(/[\u0590-\u05FF]{3,}/g) || [];
    const stemmedWords = words
      .map(w => this.stemWord(w))
      .filter(w => w.length >= 3 && !this.stopWords.has(w));

    return [...bigrams, ...stemmedWords];
  }

  // Calculate TF-IDF with position weighting, n-gram boost, and rarity scoring
  calculateTfIdf(text) {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return new Map();

    // Track term frequency, positions, and n-gram types
    const tf = new Map();
    const positions = new Map();
    const ngramTypes = new Map();

    // Get n-gram info for boost calculation
    const ngrams = this.extractNgrams(text);
    ngrams.forEach(({ ngram, type }) => ngramTypes.set(ngram, type));

    tokens.forEach((t, idx) => {
      tf.set(t, (tf.get(t) || 0) + 1);
      if (!positions.has(t)) positions.set(t, []);
      positions.get(t).push(idx);
    });

    const maxTf = Math.max(...tf.values(), 1);
    const totalTokens = tokens.length;
    const tfidf = new Map();

    tf.forEach((count, term) => {
      // Augmented TF (prevents bias toward frequent terms)
      const normalizedTf = 0.5 + (0.5 * count / maxTf);

      // IDF (single document approximation)
      const idf = Math.log(tf.size / count) + 1;

      // Position boost: first 15% and last 10% of text are more important
      const termPositions = positions.get(term);
      let positionBoost = 1.0;
      for (const pos of termPositions) {
        const relPos = pos / totalTokens;
        if (relPos < 0.15) positionBoost = Math.max(positionBoost, 1.3);
        else if (relPos > 0.90) positionBoost = Math.max(positionBoost, 1.2);
      }

      // Structural boost for Talmudic terms
      let structuralBoost = 1.0;
      const termClean = term.replace(/_/g, ' ');
      for (const [marker, weight] of Object.entries(this.structureWeights)) {
        if (termClean.includes(marker) || marker.includes(termClean)) {
          structuralBoost = Math.max(structuralBoost, weight);
        }
      }

      // N-gram boost: trigrams > bigrams > unigrams
      let ngramBoost = 1.0;
      if (ngramTypes.get(term) === 'trigram') {
        ngramBoost = 2.0;  // Trigrams are highly specific
      } else if (ngramTypes.get(term) === 'bigram' || term.includes('_')) {
        ngramBoost = 1.5;  // Bigrams are moderately specific
      }

      // Rarity boost: terms appearing 1-2 times are often key concepts
      let rarityBoost = 1.0;
      if (count === 1 && term.length >= 4) {
        rarityBoost = 1.15;  // Hapax legomenon (appears once)
      } else if (count === 2 && term.length >= 4) {
        rarityBoost = 1.08;  // Dis legomenon (appears twice)
      }

      const finalScore = normalizedTf * idf * positionBoost * structuralBoost * ngramBoost * rarityBoost;
      tfidf.set(term, finalScore);
    });

    return tfidf;
  }

  extractKeyTerms(text, topN = 12) {
    const tfidf = this.calculateTfIdf(text);
    const tokens = this.tokenize(text);
    const counts = new Map();
    tokens.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));

    const categorize = (term) => {
      const normalized = term.replace(/_/g, ' ');
      for (const [cat, words] of Object.entries(this.categories)) {
        if (words.some(w => normalized.includes(w) || w.includes(normalized))) return cat;
      }
      return null;
    };

    // V2: Filter out short fragments (< 3 chars) and ensure meaningful terms
    return Array.from(tfidf.entries())
      .filter(([term]) => {
        const cleanTerm = term.replace(/_/g, '');
        return cleanTerm.length >= 3;  // Minimum 3 Hebrew characters
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([term, score]) => ({
        term: term.replace(/_/g, ' '),  // Convert bigrams back to spaces
        score: Math.round(score * 100) / 100,
        count: counts.get(term) || 0,
        category: categorize(term),
        root: this.extractRoot(term.replace(/_/g, ''))  // Extract Hebrew root
      }));
  }

  segmentText(text) {
    if (!text) return [];
    const parts = text.split(/(?=מתני[׳']|גמ[׳']|תנן|תניא|תנו רבנן|שמע מינה|הלכה|איתמר|מיתיבי)/);
    return parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.length < 10) return null;
      let type = 'general';
      if (/^מתני[׳']|^משנה/.test(trimmed)) type = 'mishna';
      else if (/^גמ[׳']|^גמרא/.test(trimmed)) type = 'gemara';
      else if (/^תנן|^תניא|^תנו רבנן/.test(trimmed)) type = 'source';
      else if (/^שמע מינה/.test(trimmed)) type = 'conclusion';
      else if (/^הלכה|^הלכתא/.test(trimmed)) type = 'halacha';
      else if (/^איתמר/.test(trimmed)) type = 'dispute';
      else if (/^מיתיבי|^ורמינהו/.test(trimmed)) type = 'challenge';
      else if (/מאי|מנלן|היכי/.test(trimmed)) type = 'question';
      return { text: trimmed, type };
    }).filter(Boolean);
  }

  extractKeySegments(text, topN = 6) {
    const segments = this.segmentText(text);
    const tfidf = this.calculateTfIdf(text);
    const typeWeights = { mishna: 2.0, halacha: 1.9, conclusion: 1.8, dispute: 1.5, challenge: 1.3, source: 1.4, question: 1.2, gemara: 1.1, general: 1.0 };

    return segments.map(seg => {
      const tokens = this.tokenize(seg.text);
      let score = tokens.reduce((sum, t) => sum + (tfidf.get(t) || 0), 0);
      score = (score / Math.max(Math.sqrt(tokens.length), 1)) * (typeWeights[seg.type] || 1.0);
      return { ...seg, score };
    }).sort((a, b) => b.score - a.score).slice(0, topN);
  }

  summarize(text) {
    const tokens = this.tokenize(text);
    const keyTerms = this.extractKeyTerms(text, 15);
    const keySegments = this.extractKeySegments(text, 6);
    const ngrams = this.extractNgrams(text);

    const structure = {
      hasMishna: /מתני[׳']|משנה/.test(text),
      hasGemara: /גמ[׳']|גמרא/.test(text),
      hasBaraita: /תניא|תנו רבנן/.test(text),
      hasConclusion: /שמע מינה/.test(text),
      hasHalacha: /הלכה|הלכתא|והלכתא/.test(text),
      hasDispute: /פליגי|מחלוקת|איתמר/.test(text),
      hasUnresolved: /תיקו|צריך עיון|בעיא/.test(text),
      hasProof: /שנאמר|דכתיב/.test(text)
    };

    const statistics = {
      totalWords: tokens.length,
      uniqueTerms: new Set(tokens).size,
      bigramCount: ngrams.filter(n => n.type === 'bigram').length,
      trigramCount: ngrams.filter(n => n.type === 'trigram').length,
      questionCount: (text.match(/מאי|מנלן|היכי|מה טעם|כיצד|למאי/g) || []).length,
      proofCount: (text.match(/שנאמר|דכתיב|שכתוב/g) || []).length,
      sourceCount: (text.match(/תנן|תניא|תנו רבנן/g) || []).length,
      objectionCount: (text.match(/מיתיבי|ורמינהו|והתניא|והאמר/g) || []).length,
      conclusionCount: (text.match(/שמע מינה|מכלל|אלמא|משמע/g) || []).length,
      rulingCount: (text.match(/חייב|פטור|מותר|אסור|טהור|טמא|כשר|פסול/g) || []).length
    };

    // Category distribution of key terms
    const categoryDistribution = {};
    keyTerms.forEach(t => {
      if (t.category) categoryDistribution[t.category] = (categoryDistribution[t.category] || 0) + 1;
    });

    // Calculate confidence score (0-100) based on multiple signals
    const confidenceFactors = [
      structure.hasMishna ? 15 : 0,
      structure.hasGemara ? 10 : 0,
      structure.hasHalacha ? 20 : 0,
      structure.hasConclusion ? 15 : 0,
      Math.min(statistics.questionCount * 5, 15),
      Math.min(statistics.proofCount * 5, 10),
      Math.min(statistics.bigramCount * 3, 15),
      keyTerms.length >= 5 ? 10 : keyTerms.length * 2
    ];
    const confidence = Math.min(100, confidenceFactors.reduce((a, b) => a + b, 0));

    return {
      keyTerms,
      keySegments,
      structure,
      statistics,
      categoryDistribution,
      topRoots: keyTerms.filter(t => t.root).map(t => t.root).slice(0, 5),
      // New: confidence score for summary quality
      confidence,
      // New: detected n-grams for display
      detectedNgrams: ngrams.map(n => n.ngram.replace(/_/g, ' '))
    };
  }
}

const talmudicSummarizer = new TalmudicTextSummarizer();

/** Extract key terms using TF-IDF (PRO SCHOLAR) */
export function extractKeyTermsTfIdf(text, topN = 12) {
  return talmudicSummarizer.extractKeyTerms(text, topN);
}

/** Extract key text segments by importance (PRO SCHOLAR) */
export function extractKeySegments(text, topN = 6) {
  return talmudicSummarizer.extractKeySegments(text, topN);
}

/** Get full Talmudic text summary (PRO SCHOLAR) */
export function summarizeText(text) {
  return talmudicSummarizer.summarize(text);
}

// =============================================================================
// ENHANCED SPEAKER EXTRACTION PATTERNS - PRO SCHOLAR V13
// =============================================================================

// PRO SCHOLAR V13: Direct sage names for fallback detection
// These are detected even without standard prefix patterns
const DIRECT_SAGE_NAMES = [
  // Tannaim - Most Famous
  'הלל', 'שמאי', 'בית הלל', 'בית שמאי',
  'רבן גמליאל', 'רבי אליעזר', 'רבי יהושע', 'רבי עקיבא', 'רבי ישמעאל',
  'רבי מאיר', 'רבי יהודה', 'רבי יוסי', 'רבי שמעון', 'רבי נחמיה',
  'רבי יהודה הנשיא', 'רבינו הקדוש', 'רבי חייא',
  // Amoraim - Babylonian
  'רב', 'שמואל', 'רב הונא', 'רב יהודה', 'רב נחמן', 'רב ששת', 'רב חסדא',
  'רבה', 'רב יוסף', 'אביי', 'רבא', 'רב פפא', 'רב אשי', 'רבינא',
  // Amoraim - Israel
  'רבי יוחנן', 'ריש לקיש', 'רבי אמי', 'רבי אסי', 'רבי אבהו', 'רבי זירא',
  'רבי ירמיה', 'רבי יוסי בר חנינא', 'רבי אלעזר',
  // Common abbreviations
  'ר״ל', 'ר"ל', 'רשב"י', 'רשב״י', 'רשב"ג', 'רשב״ג'
];

// PRO SCHOLAR V13: Enhanced speaker patterns with better coverage
const SPEAKER_PATTERNS = [
  // =============================================================================
  // STANDARD STATEMENTS - אמר X (X said)
  // =============================================================================
  { pattern: /אמר\s+(רב[יא]?\s+\S+(?:\s+(?:בן|בר|ב"ר|ב״ר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /אמר\s+(רבן?\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /דאמר\s+(רב[יא]?\s+\S+)/g, type: 'citation' },
  { pattern: /כדאמר\s+(רב[יא]?\s+\S+)/g, type: 'citation' },
  // PRO SCHOLAR V13: Standalone rabbi mentions without אמר
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+[,:]/g, type: 'mention' },
  { pattern: /(רב\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+[,:]/g, type: 'mention' },

  // =============================================================================
  // ABBREVIATED FORMS - א"ר, ד"ר, etc.
  // =============================================================================
  { pattern: /א"ר\s+(\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /א״ר\s+(\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'statement' },
  { pattern: /ד"ר\s+(\S+)/g, type: 'citation' },
  { pattern: /ד״ר\s+(\S+)/g, type: 'citation' },
  // PRO SCHOLAR V13: More abbreviation variants
  { pattern: /וא"ר\s+(\S+)/g, type: 'statement' },
  { pattern: /וא״ר\s+(\S+)/g, type: 'statement' },
  { pattern: /כא"ר\s+(\S+)/g, type: 'like_statement' },

  // =============================================================================
  // OPINIONS - X אומר (X says)
  // =============================================================================
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אומר/g, type: 'opinion' },
  { pattern: /(רב\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אומר/g, type: 'opinion' },
  { pattern: /(רבן\s+\S+)\s+אומר/g, type: 'opinion' },
  // PRO SCHOLAR V13: Past tense opinions
  { pattern: /(רבי\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)\s+אמר/g, type: 'opinion' },
  { pattern: /(רב\s+\S+)\s+סבר/g, type: 'opinion' },

  // =============================================================================
  // TRANSMISSION CHAINS - אמר X אמר Y (X said in name of Y)
  // =============================================================================
  { pattern: /אמר\s+(\S+)\s+(?:א"ר|אמר)\s+(\S+)/g, type: 'transmission' },
  { pattern: /אמר\s+(\S+)\s+משום\s+(\S+)/g, type: 'transmission' },
  { pattern: /משום\s+(רב[יא]?\s+\S+)/g, type: 'source_attribution' },
  // PRO SCHOLAR V13: More transmission patterns
  { pattern: /אמר\s+(\S+)\s+משמיה\s+ד(\S+)/g, type: 'transmission' },
  { pattern: /(\S+)\s+משמיה\s+ד(\S+)/g, type: 'transmission' },

  // =============================================================================
  // FAMOUS AMORAIM - Direct name matches (no title needed)
  // =============================================================================
  { pattern: /(?:אמר|א"ר|א״ר)\s*(אביי|רבא|רבה|רב\s+נחמן|רב\s+ששת|רב\s+חסדא|רב\s+הונא|רב\s+יוסף|רב\s+פפא|רב\s+אשי)/g, type: 'statement' },
  // PRO SCHOLAR V13: Famous pairs mentioned together
  { pattern: /(אביי\s+ורבא|רב\s+ושמואל|רבי\s+יוחנן\s+ורבי\s+שמעון\s+בן\s+לקיש)/g, type: 'famous_pair' },
  { pattern: /(בית\s+שמאי\s+ובית\s+הלל|בית\s+הלל\s+ובית\s+שמאי)/g, type: 'famous_pair' },

  // =============================================================================
  // CONTINUATION - ואמר X (And X said)
  // =============================================================================
  { pattern: /ואמר\s+(רב[יא]?\s+\S+(?:\s+(?:בן|בר)\s+\S+)?)/g, type: 'continuation' },
  { pattern: /ו?אמר\s+ליה\s+(רב[יא]?\s+\S+)/g, type: 'response' },
  // PRO SCHOLAR V13: Question patterns
  { pattern: /בעי\s+מיניה\s+(\S+)\s+מ(\S+)/g, type: 'question_to' },
  { pattern: /שאליה\s+(\S+)\s+ל(\S+)/g, type: 'question_to' },

  // =============================================================================
  // OBJECTIONS AND CHALLENGES
  // =============================================================================
  { pattern: /מתיב\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /איתיביה\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /(מיתיבי)/g, type: 'anonymous_objection' },
  { pattern: /(ורמינהי)/g, type: 'contradiction' },
  { pattern: /(והתניא)/g, type: 'challenge' },
  { pattern: /(והאמר)\s+(רב[יא]?\s+\S+)/g, type: 'challenge' },
  // PRO SCHOLAR V13: More objection patterns
  { pattern: /מתקיף\s+לה\s+(רב[יא]?\s+\S+)/g, type: 'objection' },
  { pattern: /לימא\s+מסייע\s+ליה\s+ל?(רב[יא]?\s+\S+)/g, type: 'support' },

  // =============================================================================
  // BARAITOT AND MISHNA CITATIONS
  // =============================================================================
  { pattern: /(תנן)/g, type: 'mishna_citation' },
  { pattern: /(תנא)/g, type: 'baraita' },
  { pattern: /(תניא)/g, type: 'baraita' },
  { pattern: /תנו\s+רבנן/g, type: 'baraita' },
  { pattern: /תני\s+(רב[יא]?\s+\S+)/g, type: 'teaching' },
  // PRO SCHOLAR V13: Additional citation patterns
  { pattern: /דתנן/g, type: 'mishna_citation' },
  { pattern: /דתניא/g, type: 'baraita' },
  { pattern: /כדתנן/g, type: 'mishna_citation' },
  { pattern: /מתני׳/g, type: 'mishna_marker' },
  { pattern: /גמ׳/g, type: 'gemara_marker' },

  // =============================================================================
  // QUESTIONS AND INQUIRIES
  // =============================================================================
  { pattern: /בעי\s+(רב[יא]?\s+\S+)/g, type: 'question' },
  { pattern: /בעא\s+מיניה\s+(רב[יא]?\s+\S+)/g, type: 'question' },
  { pattern: /בעי\s+מר/g, type: 'question' },
  { pattern: /בעאי/g, type: 'question' },
  { pattern: /קא\s+מיבעיא\s+ליה/g, type: 'inquiry' },
  { pattern: /איבעיא\s+להו/g, type: 'inquiry' },

  // =============================================================================
  // DISPUTES - X ו-Y פליגי
  // =============================================================================
  { pattern: /(איתמר)/g, type: 'dispute_intro' },
  { pattern: /(רב[יא]?\s+\S+)\s+ו?(רב[יא]?\s+\S+)\s+(?:פליגי|איפליגו)/g, type: 'dispute' },
  { pattern: /(בית\s+שמאי)\s+(?:אומרים|ו?בית\s+הלל)/g, type: 'houses_dispute' },
  { pattern: /(בית\s+הלל)\s+אומרים/g, type: 'houses_dispute' },
  { pattern: /(לימא\s+כתנאי)/g, type: 'tannaitic_dispute' },
  { pattern: /תנאי\s+היא/g, type: 'tannaitic_dispute' },

  // =============================================================================
  // HALACHIC RULINGS
  // =============================================================================
  { pattern: /הלכה\s+כ?(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },
  { pattern: /הלכתא\s+כ?(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },
  { pattern: /והלכתא\s+([^.]{5,30})/g, type: 'final_ruling' },
  { pattern: /פסק\s+(רב[יא]?\s+\S+)/g, type: 'halachic_ruling' },

  // =============================================================================
  // OPINION CONTEXT - לדידיה ד, אליבא ד
  // =============================================================================
  { pattern: /לדידיה\s+ד?(רב[יא]?\s+\S+)/g, type: 'opinion_context' },
  { pattern: /אליבא\s+ד?(רב[יא]?\s+\S+)/g, type: 'opinion_context' },
  { pattern: /לדברי\s+(רב[יא]?\s+\S+)/g, type: 'opinion_context' },

  // =============================================================================
  // CONCLUSIONS AND INFERENCES
  // =============================================================================
  { pattern: /שמע\s+מינה\s+([^.]{5,40})/g, type: 'inference' },
  { pattern: /מכלל\s+ד([^.]{5,30})/g, type: 'inference' },
  { pattern: /אלמא/g, type: 'inference' }
];

// Normalization map for common speaker variations (PRO SCHOLAR - expanded)
const SPEAKER_NORMALIZATION = {
  // Standard abbreviations
  'ר\' יוחנן': 'רבי יוחנן',
  'ר״ל': 'ריש לקיש',
  'ר"ל': 'ריש לקיש',
  'ר"מ': 'רבי מאיר',
  'ר״מ': 'רבי מאיר',
  'ר"ע': 'רבי עקיבא',
  'ר״ע': 'רבי עקיבא',
  'רשב"י': 'רבי שמעון בר יוחאי',
  'רשב״י': 'רבי שמעון בר יוחאי',
  'רשב"ג': 'רבן שמעון בן גמליאל',
  'רשב״ג': 'רבן שמעון בן גמליאל',
  'ר"י': 'רבי יהודה',
  'ר״י': 'רבי יהודה',

  // Additional common abbreviations
  'ר"א': 'רבי אליעזר',
  'ר״א': 'רבי אליעזר',
  'ר"ג': 'רבן גמליאל',
  'ר״ג': 'רבן גמליאל',
  'ר"ש': 'רבי שמעון',
  'ר״ש': 'רבי שמעון',
  'ר"נ': 'רב נחמן',
  'ר״נ': 'רב נחמן',
  'ר"ה': 'רב הונא',
  'ר״ה': 'רב הונא',
  'ר"ח': 'רב חסדא',
  'ר״ח': 'רב חסדא',
  'ר"פ': 'רב פפא',
  'ר״פ': 'רב פפא',

  // Famous pairs
  'אביי ורבא': 'אביי ורבא',
  'ב"ש': 'בית שמאי',
  'ב״ש': 'בית שמאי',
  'ב"ה': 'בית הלל',
  'ב״ה': 'בית הלל',

  // Geographic designations
  'ר"י נשיאה': 'רבי יהודה הנשיא',
  'רבי': 'רבי יהודה הנשיא',
  'רבינא': 'רבינא',
  'מר זוטרא': 'מר זוטרא'
};

// =============================================================================
// DISCOURSE FLOW PATTERNS - Logical argument structure (for future diagram types)
// =============================================================================

// eslint-disable-next-line no-unused-vars
const _ARGUMENT_FLOW = {
  // Standard sugya pattern
  STANDARD: ['mishna', 'gemara', 'question', 'proof', 'resolution'],
  // Complex dispute pattern
  DISPUTE: ['statement_a', 'statement_b', 'question', 'difference', 'resolution'],
  // Proof-based pattern
  PROOF_CHAIN: ['claim', 'challenge', 'proof', 'inference', 'conclusion']
};

// =============================================================================
// MAIN DIAGRAM GENERATION
// =============================================================================

/**
 * Generate a Mermaid diagram for a Talmud daf
 * PRO SCHOLAR: Multiple diagram types available
 *
 * @param {string} tractate - Tractate name (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference (e.g., '2a', '73b')
 * @param {Object} [options] - Diagram configuration options
 * @param {string} [options.type='overview'] - Diagram type: 'overview', 'sugya_flow',
 *   'speaker_network', 'halachic_chain', 'concept_map', 'timeline', 'machloket', 'summary'
 * @param {boolean} [options.useCache=true] - Whether to use cached results
 * @param {boolean} [options.includeCommentators=true] - Include commentator nodes (overview)
 * @param {boolean} [options.includeCrossRefs=true] - Include cross-reference links (overview)
 * @param {boolean} [options.includeVerses=true] - Include biblical verse citations (overview)
 * @param {boolean} [options.includeSpeakers=true] - Include speaker/rabbi nodes (overview)
 * @param {number} [options.maxCrossRefs=10] - Maximum cross-references to show
 * @param {string} [options.direction='TB'] - Mermaid graph direction: 'TB', 'LR', 'BT', 'RL'
 * @returns {Promise<{mermaid: string, stats: Object, explanation: string}>} Diagram result
 * @example
 * // Generate overview diagram
 * const result = await generateDafDiagram('Berakhot', '2a');
 * console.log(result.mermaid); // Mermaid code
 *
 * @example
 * // Generate machloket (dispute) diagram
 * const result = await generateDafDiagram('Shabbat', '73a', { type: 'machloket' });
 */
export async function generateDafDiagram(tractate, daf, options = {}) {
  // Options passed to sub-generators via options object
  // PRO SCHOLAR V12: Diagram type and caching options
  const { type = DIAGRAM_TYPES.OVERVIEW, useCache = true } = options;

  // Check cache first
  const cacheKey = `${tractate}-${daf}-${type}-${JSON.stringify(options)}`;
  if (useCache) {
    const cached = getCachedDiagram(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Route to appropriate diagram generator
  let result;
  switch (type) {
    case DIAGRAM_TYPES.SUGYA_FLOW:
      result = await generateSugyaFlowDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.SPEAKER_NETWORK:
      result = await generateSpeakerNetworkDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.HALACHIC_CHAIN:
      result = await generateHalachicChainDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.TIMELINE:
      result = await generateTimelineDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.CONCEPT_MAP:
      result = await generateConceptMapDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.MACHLOKET:
      result = await generateMachloketDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.SUMMARY:
      result = await generateSummaryDiagram(tractate, daf, options);
      break;
    case DIAGRAM_TYPES.OVERVIEW:
    default:
      result = await generateOverviewDiagram(tractate, daf, options);
  }

  // Cache the result
  if (useCache) {
    setCachedDiagram(cacheKey, result);
  }

  return result;
}

// =============================================================================
// DIAGRAM TYPE: OVERVIEW (Original functionality + enhancements)
// =============================================================================

async function generateOverviewDiagram(tractate, daf, options = {}) {
  const {
    includeCommentators = true,
    includeCrossRefs = true,
    includeVerses = true,
    includeSpeakers = true,
    maxCrossRefs = 10,
    direction = 'TB'
  } = options;

  clearGraph();

  const dafRef = `${tractate}.${daf}`;
  const stats = {
    commentators: 0,
    crossRefs: 0,
    verses: 0,
    parallels: 0,
    speakers: 0
  };

  // Add central daf node
  addNode(dafRef, ENTITY_TYPES.VERSE, {
    label: `📖 ${tractate} ${daf}`,
    type: 'talmud_daf'
  });

  // Fetch related texts from Sefaria using safeExecute
  const [relatedTexts, dafContent] = await Promise.all([
    safeExecute(
      () => getRelatedTexts(dafRef),
      { commentary: [], parallels: [], connections: [] },
      'getRelatedTexts'
    ),
    safeExecute(
      () => getTalmudDaf(tractate, daf),
      null,
      'getTalmudDaf'
    )
  ]);

  // Process commentators
  if (includeCommentators) {
    const foundCommentators = new Set();

    (relatedTexts?.commentary || []).forEach(comm => {
      const source = extractCommentatorName(comm.ref || comm.category || '');
      if (source && RABBINIC_NETWORK[source]) {
        foundCommentators.add(source);
      }
    });

    foundCommentators.forEach(commentator => {
      const rabbiData = RABBINIC_NETWORK[commentator];

      addNode(commentator, ENTITY_TYPES.RABBI, {
        label: `${rabbiData?.icon || '📜'} ${commentator}`,
        period: rabbiData?.period,
        style: rabbiData?.style,
        nodeType: 'commentator'
      });

      addEdge(commentator, dafRef, RELATIONSHIP_TYPES.EXPLAINS);
      stats.commentators++;

      // Add inter-commentator relationships
      if (rabbiData?.teachers) {
        rabbiData.teachers.forEach(teacher => {
          if (foundCommentators.has(teacher)) {
            addEdge(commentator, teacher, RELATIONSHIP_TYPES.STUDENT_OF);
          }
        });
      }

      if (rabbiData?.disagreesWith) {
        rabbiData.disagreesWith.forEach(other => {
          if (foundCommentators.has(other)) {
            addEdge(commentator, other, RELATIONSHIP_TYPES.DISAGREES);
          }
        });
      }
    });
  }

  // Extract speakers from daf content
  if (includeSpeakers && dafContent) {
    const speakers = extractSpeakersFromText(dafContent);
    speakers.slice(0, options.maxSpeakers || 10).forEach(speaker => {
      const rabbiData = findRabbiData(speaker);
      if (rabbiData) {
        addNode(speaker, ENTITY_TYPES.RABBI, {
          label: `💬 ${rabbiData.name}`,
          period: rabbiData.period,
          generation: rabbiData.generation,
          nodeType: 'speaker'
        });
        addEdge(speaker, dafRef, 'speaks_on');
        stats.speakers++;
      }
    });
  }

  // Process cross-references
  if (includeCrossRefs || includeVerses) {
    const crossRefs = await safeExecute(
      () => getCrossReferences(tractate, daf),
      [],
      'getCrossReferences'
    );

    let refCount = 0;
    crossRefs.forEach(ref => {
      if (refCount >= maxCrossRefs) return;

      const category = (ref.category || '').toLowerCase();
      const isVerse = category.includes('tanakh') || category.includes('torah') ||
                      category.includes('prophets') || category.includes('writings');
      const isParallel = category.includes('talmud') || category.includes('bavli');

      if (isVerse && includeVerses) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: `📜 ${shortenRef(ref.ref)}`,
          type: 'biblical_verse'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.CITES);
        stats.verses++;
        refCount++;
      } else if (isParallel && includeCrossRefs) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: `🔗 ${shortenRef(ref.ref)}`,
          type: 'talmud_parallel'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.PARALLEL);
        stats.parallels++;
        refCount++;
      }
    });
    stats.crossRefs = refCount;
  }

  const subgraph = getSubgraph(dafRef, 2);
  const mermaid = generateOverviewMermaid(subgraph, dafRef, direction);
  const explanation = generateExplanation(tractate, daf, stats, 'Overview');

  return { mermaid, stats, explanation, dafRef, type: DIAGRAM_TYPES.OVERVIEW };
}

// =============================================================================
// DIAGRAM TYPE: SUGYA FLOW - Argument Structure - PRO SCHOLAR V13 Enhanced
// =============================================================================

// PRO SCHOLAR V13: Additional discourse patterns for better flow detection
const ENHANCED_DISCOURSE_MARKERS = [
  // Mishna/Baraita markers
  { pattern: /מתני[׳']?\s*[.:]/g, type: 'mishna', label: 'משנה', icon: '📘', category: 'source' },
  { pattern: /גמ[׳']?\s*[.:]/g, type: 'gemara', label: 'גמרא', icon: '📖', category: 'source' },
  { pattern: /תניא/g, type: 'baraita', label: 'ברייתא', icon: '📜', category: 'source' },
  { pattern: /תנו\s+רבנן/g, type: 'baraita', label: 'תנו רבנן', icon: '📜', category: 'source' },
  { pattern: /תנן/g, type: 'mishna_cite', label: 'תנן', icon: '📚', category: 'source' },

  // Questions and inquiries
  { pattern: /מאי\s+\S+/g, type: 'question', label: 'מאי (שאלה)', icon: '❓', category: 'question' },
  { pattern: /מנא\s+הני\s+מילי/g, type: 'source_question', label: 'מקור?', icon: '🔍', category: 'question' },
  { pattern: /מנ?לן/g, type: 'source_question', label: 'מנלן?', icon: '🔍', category: 'question' },
  { pattern: /איבעיא\s+להו/g, type: 'inquiry', label: 'איבעיא', icon: '🤔', category: 'question' },
  { pattern: /בעי\s+\S+/g, type: 'inquiry', label: 'בעי', icon: '🤔', category: 'question' },
  { pattern: /למאי\s+הלכתא/g, type: 'practical_q', label: 'למאי הלכתא?', icon: '⚖️', category: 'question' },

  // Objections and challenges
  { pattern: /מיתיבי/g, type: 'objection', label: 'מיתיבי', icon: '⚔️', category: 'objection' },
  { pattern: /ורמינהו?/g, type: 'contradiction', label: 'ורמינהו', icon: '💥', category: 'objection' },
  { pattern: /והתניא/g, type: 'challenge', label: 'והתניא?', icon: '❗', category: 'objection' },
  { pattern: /והאמר/g, type: 'challenge', label: 'והאמר?', icon: '❗', category: 'objection' },
  { pattern: /מתקיף\s+לה/g, type: 'attack', label: 'מתקיף', icon: '👊', category: 'objection' },
  { pattern: /קשיא/g, type: 'difficulty', label: 'קשיא', icon: '❌', category: 'objection' },
  { pattern: /תיובתא/g, type: 'refutation', label: 'תיובתא', icon: '🚫', category: 'objection' },

  // Proofs and support
  { pattern: /שנאמר/g, type: 'scripture', label: 'פסוק', icon: '📖', category: 'proof' },
  { pattern: /דכתיב/g, type: 'scripture', label: 'דכתיב', icon: '📖', category: 'proof' },
  { pattern: /ראיה/g, type: 'proof', label: 'ראיה', icon: '✅', category: 'proof' },
  { pattern: /לימא\s+מסייע/g, type: 'support', label: 'סיוע', icon: '🤝', category: 'proof' },

  // Resolutions and answers
  { pattern: /לא\s+קשיא/g, type: 'resolution', label: 'לא קשיא', icon: '✨', category: 'resolution' },
  { pattern: /הכי\s+קאמר/g, type: 'explanation', label: 'הכי קאמר', icon: '💡', category: 'resolution' },
  { pattern: /הכא\s+במאי\s+עסקינן/g, type: 'specification', label: 'הכא במאי עסקינן', icon: '🎯', category: 'resolution' },
  { pattern: /אמר\s+לך/g, type: 'response', label: 'אמר לך', icon: '💬', category: 'resolution' },
  { pattern: /תרי\s+תנאי/g, type: 'two_tannaim', label: 'תרי תנאי', icon: '👥', category: 'resolution' },
  { pattern: /חד\s+אמר.*וחד\s+אמר/g, type: 'two_opinions', label: 'מחלוקת', icon: '⚖️', category: 'resolution' },

  // Conclusions
  { pattern: /שמע\s+מינה/g, type: 'conclusion', label: 'שמע מינה', icon: '✔️', category: 'conclusion' },
  { pattern: /מכלל\s+ד/g, type: 'inference', label: 'מכלל', icon: '➡️', category: 'conclusion' },
  { pattern: /אלמא/g, type: 'inference', label: 'אלמא', icon: '➡️', category: 'conclusion' },
  { pattern: /הלכתא/g, type: 'halacha', label: 'הלכתא', icon: '⚖️', category: 'conclusion' },
  { pattern: /תיקו/g, type: 'unresolved', label: 'תיקו', icon: '🔮', category: 'conclusion' }
];

async function generateSugyaFlowDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'sugyaFlow:getTalmudDaf'
  );

  if (!dafContent?.segments) {
    return {
      mermaid: `graph ${direction}\n  A["📖 ${tractate} ${daf}"]\n  B["טען דף כדי לראות מהלך"]`,
      stats: { patterns: 0, questions: 0, objections: 0, resolutions: 0 },
      explanation: `מהלך הסוגיא: ${tractate} ${daf} (אין תוכן)`,
      type: DIAGRAM_TYPES.SUGYA_FLOW
    };
  }

  // Detect discourse patterns using enhanced markers
  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const detectedPatterns = [];

  // Apply all enhanced patterns
  ENHANCED_DISCOURSE_MARKERS.forEach(({ pattern, type, label, icon, category }) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      detectedPatterns.push({
        type,
        label,
        icon,
        category,
        position: match.index,
        text: match[0]
      });
    }
  });

  // Also use existing discourse pattern service
  const servicePatterns = detectDiscoursePatterns(fullText);
  servicePatterns.forEach(p => {
    const patternInfo = DISCOURSE_PATTERNS[p.type] || {};
    detectedPatterns.push({
      type: p.type,
      label: patternInfo.label || p.type,
      icon: patternInfo.icon || '📝',
      category: patternInfo.type || 'other',
      position: p.position || 0,
      text: p.marker
    });
  });

  // Sort by position and deduplicate
  detectedPatterns.sort((a, b) => a.position - b.position);

  // Remove duplicates (same position within 10 chars)
  const uniquePatterns = [];
  let lastPosition = -100;
  detectedPatterns.forEach(p => {
    if (p.position - lastPosition > 10) {
      uniquePatterns.push(p);
      lastPosition = p.position;
    }
  });

  const lines = [`graph ${direction}`];

  // Enhanced style definitions with better colors
  lines.push('  %% PRO SCHOLAR V13 Discourse Styles');
  lines.push('  classDef source fill:#3B82F6,stroke:#1E40AF,color:#fff,stroke-width:2px');
  lines.push('  classDef question fill:#F59E0B,stroke:#B45309,color:#000,stroke-width:2px');
  lines.push('  classDef objection fill:#DC2626,stroke:#991B1B,color:#fff,stroke-width:2px');
  lines.push('  classDef proof fill:#10B981,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef resolution fill:#7C3AED,stroke:#5B21B6,color:#fff,stroke-width:2px');
  lines.push('  classDef conclusion fill:#0891B2,stroke:#0E7490,color:#fff,stroke-width:2px');
  lines.push('  classDef other fill:#6B7280,stroke:#4B5563,color:#fff');

  // Stats tracking
  const stats = {
    patterns: uniquePatterns.length,
    questions: 0,
    objections: 0,
    proofs: 0,
    resolutions: 0,
    conclusions: 0
  };

  // Build flow with step numbers
  let prevNodeId = null;
  uniquePatterns.forEach((pattern, index) => {
    const nodeId = `p${index}`;
    const stepNum = index + 1;

    // Create node with step number
    lines.push(`  ${nodeId}["${stepNum}. ${pattern.icon} ${pattern.label}"]`);

    // Apply style class based on category
    lines.push(`  class ${nodeId} ${pattern.category}`);

    // Track stats
    if (pattern.category === 'question') stats.questions++;
    else if (pattern.category === 'objection') stats.objections++;
    else if (pattern.category === 'proof') stats.proofs++;
    else if (pattern.category === 'resolution') stats.resolutions++;
    else if (pattern.category === 'conclusion') stats.conclusions++;

    // Connect to previous with appropriate arrow style
    if (prevNodeId) {
      // Use different arrow styles based on relationship
      if (pattern.category === 'objection') {
        lines.push(`  ${prevNodeId} -.->|קושיא| ${nodeId}`);
      } else if (pattern.category === 'resolution') {
        lines.push(`  ${prevNodeId} ==>|תירוץ| ${nodeId}`);
      } else if (pattern.category === 'conclusion') {
        lines.push(`  ${prevNodeId} -->|מסקנה| ${nodeId}`);
      } else {
        lines.push(`  ${prevNodeId} --> ${nodeId}`);
      }
    }
    prevNodeId = nodeId;
  });

  // PRO SCHOLAR V26: Enhanced empty case handling with Mishna structure fallback
  if (uniquePatterns.length === 0) {
    lines.push(`  start["📖 ${tractate} ${daf}"]`);
    lines.push(`  class start source`);

    // Try to generate content from Mishna structure analysis
    const { analyzeMishnaStructure, generateMishnaSummary } = await import('./discoursePatternService');
    const mishnaAnalysis = analyzeMishnaStructure(fullText);
    const mishnaSummary = generateMishnaSummary(fullText, mishnaAnalysis);

    if (mishnaAnalysis.elements.length > 0 || mishnaSummary.rulings?.length > 0) {
      // Show Mishna structure elements as diagram
      let nodeIndex = 0;

      // Add topic node
      if (mishnaSummary.topic) {
        lines.push(`  topic["📚 ${mishnaSummary.topic}"]`);
        lines.push(`  class topic source`);
        lines.push(`  start --> topic`);
        nodeIndex++;
      }

      // Add ruling nodes
      if (mishnaSummary.rulings && mishnaSummary.rulings.length > 0) {
        const uniqueRulings = [...new Set(mishnaSummary.rulings.map(r => r.text))].slice(0, 6);
        uniqueRulings.forEach((ruling, i) => {
          const cleanRuling = ruling.replace(/["\[\]{}]/g, '').substring(0, 30);
          const isLiable = ruling.includes('חייב');
          const icon = isLiable ? '🔴' : '🟢';
          const styleClass = isLiable ? 'objection' : 'resolution';
          lines.push(`  r${i}["${icon} ${cleanRuling}"]`);
          lines.push(`  class r${i} ${styleClass}`);
          if (nodeIndex === 0) {
            lines.push(`  start --> r${i}`);
          } else if (i === 0 && mishnaSummary.topic) {
            lines.push(`  topic --> r${i}`);
          } else if (i > 0) {
            lines.push(`  r${i-1} --> r${i}`);
          }
        });
      }

      // Add structure element summary
      if (mishnaAnalysis.summary.breakdown) {
        const breakdown = mishnaAnalysis.summary.breakdown;
        const summaryParts = [];
        if (breakdown.enumeration) summaryParts.push(`${breakdown.enumeration} מניינים`);
        if (breakdown.condition) summaryParts.push(`${breakdown.condition} תנאים`);
        if (breakdown.ruling) summaryParts.push(`${breakdown.ruling} פסקים`);
        if (summaryParts.length > 0) {
          lines.push(`  summary["📊 ${summaryParts.join(' • ')}"]`);
          lines.push(`  class summary conclusion`);
        }
      }

      stats.patterns = mishnaAnalysis.elements.length;
    } else {
      // Fallback message when truly no content
      lines.push(`  note["🔍 טען את הטקסט המלא לניתוח"]`);
      lines.push(`  start --> note`);
    }
  }

  // Build explanation in Hebrew
  const explanationParts = [`${uniquePatterns.length} שלבים`];
  if (stats.questions > 0) explanationParts.push(`${stats.questions} שאלות`);
  if (stats.objections > 0) explanationParts.push(`${stats.objections} קושיות`);
  if (stats.resolutions > 0) explanationParts.push(`${stats.resolutions} תירוצים`);

  return {
    mermaid: lines.join('\n'),
    stats,
    explanation: `מהלך הסוגיא: ${explanationParts.join(' • ')}`,
    type: DIAGRAM_TYPES.SUGYA_FLOW,
    patterns: uniquePatterns
  };
}

// =============================================================================
// DIAGRAM TYPE: SPEAKER NETWORK - Who said what - PRO SCHOLAR V13
// =============================================================================

async function generateSpeakerNetworkDiagram(tractate, daf, options = {}) {
  // PRO SCHOLAR V13: Changed default direction to TB (top-bottom) for better timeline view
  const { direction = 'TB', maxSpeakers = 20 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'speakerNetwork:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions by generation/period
  lines.push('  %% Speaker Styles by Period');
  lines.push('  classDef tanna1 fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef tanna2 fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef tanna3 fill:#fef08a,stroke:#ca8a04');
  lines.push('  classDef amora1 fill:#bbf7d0,stroke:#16a34a');
  lines.push('  classDef amora2 fill:#a5f3fc,stroke:#0891b2');
  lines.push('  classDef amora3 fill:#c4b5fd,stroke:#7c3aed');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf central`);

  if (!dafContent?.segments) {
    lines.push(`  note["טען דף כדי לראות חכמים"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { speakers: 0, tannaim: 0, amoraim: 0 },
      explanation: `חכמי הסוגיא: ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SPEAKER_NETWORK
    };
  }

  // Extract speakers - PRO SCHOLAR V13 fix: properly extract unique speaker names
  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const speakerData = extractSpeakersFromText({ hebrew: [fullText] });

  // Get unique speaker names (speakers is array of objects with .name property)
  const uniqueNames = [...new Set(speakerData.map(s => s.name))].slice(0, maxSpeakers);

  const speakerNodes = new Map();

  // PRO SCHOLAR V13: Process unique speaker names
  uniqueNames.forEach((speakerName, index) => {
    const rabbiData = findRabbiData(speakerName);
    // Even if no database match, still show the speaker
    const effectiveData = rabbiData || {
      name: speakerName,
      period: 'unknown',
      generation: null,
      matchType: 'unmatched'
    };

    const nodeId = `s${index}`;
    speakerNodes.set(speakerName, { nodeId, data: effectiveData });

    const name = effectiveData.name || speakerName;
    const gen = effectiveData.generation || '?';
    const period = effectiveData.period || '';

    lines.push(`  ${nodeId}{{"${name} (G${gen})"}}`);

    // Apply style based on period and generation
    if (period === 'tanna') {
      if (gen <= 2) lines.push(`  class ${nodeId} tanna1`);
      else if (gen <= 3) lines.push(`  class ${nodeId} tanna2`);
      else lines.push(`  class ${nodeId} tanna3`);
    } else if (period === 'amora') {
      if (gen <= 2) lines.push(`  class ${nodeId} amora1`);
      else if (gen <= 4) lines.push(`  class ${nodeId} amora2`);
      else lines.push(`  class ${nodeId} amora3`);
    }

    // Connect to daf
    lines.push(`  ${nodeId} -->|speaks| daf`);
  });

  // Add teacher-student relationships between speakers on this daf
  speakerNodes.forEach(({ nodeId, data }, speaker) => {
    if (data.teachers) {
      data.teachers.forEach(teacher => {
        const teacherNode = speakerNodes.get(teacher);
        if (teacherNode) {
          lines.push(`  ${nodeId} -.->|תלמיד| ${teacherNode.nodeId}`);
        }
      });
    }
    if (data.disputesWith) {
      data.disputesWith.forEach(other => {
        const otherNode = speakerNodes.get(other);
        if (otherNode) {
          lines.push(`  ${nodeId} -.-x|מחלוקת| ${otherNode.nodeId}`);
        }
      });
    }
  });

  // PRO SCHOLAR V13: Enhanced stats and Hebrew explanation
  const tannaCount = Array.from(speakerNodes.values()).filter(s => s.data.period === 'tanna').length;
  const amoraCount = Array.from(speakerNodes.values()).filter(s => s.data.period === 'amora').length;

  const explanationParts = [`${speakerNodes.size} חכמים`];
  if (tannaCount > 0) explanationParts.push(`${tannaCount} תנאים`);
  if (amoraCount > 0) explanationParts.push(`${amoraCount} אמוראים`);

  return {
    mermaid: lines.join('\n'),
    stats: { speakers: speakerNodes.size, tannaim: tannaCount, amoraim: amoraCount },
    explanation: `חכמי הסוגיא: ${explanationParts.join(' • ')}`,
    type: DIAGRAM_TYPES.SPEAKER_NETWORK,
    speakers: Array.from(speakerNodes.keys())
  };
}

// =============================================================================
// DIAGRAM TYPE: TIMELINE - Chronological view
// =============================================================================

async function generateTimelineDiagram(tractate, daf, options = {}) {
  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'timeline:getTalmudDaf'
  );

  const lines = ['timeline'];
  lines.push(`  title Sages of ${tractate} ${daf}`);

  if (!dafContent?.segments) {
    lines.push('  section No Data');
    lines.push('    Load daf content');
    return {
      mermaid: lines.join('\n'),
      stats: { speakers: 0 },
      explanation: `Timeline for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.TIMELINE
    };
  }

  // Extract and organize speakers by period
  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const speakers = extractSpeakersFromText({ hebrew: [fullText] });
  const uniqueSpeakers = [...new Set(speakers)];

  const byPeriod = {
    'Zugot (100 BCE - 10 CE)': [],
    'Tannaim Gen 1-2 (10-120 CE)': [],
    'Tannaim Gen 3-4 (120-200 CE)': [],
    'Amoraim Gen 1-2 (220-290 CE)': [],
    'Amoraim Gen 3-4 (290-350 CE)': [],
    'Amoraim Gen 5+ (350-500 CE)': []
  };

  uniqueSpeakers.forEach(speaker => {
    const data = findRabbiData(speaker);
    if (!data) return;

    const period = data.period || '';
    const gen = data.generation || 0;

    if (period === 'tanna') {
      if (gen <= 2) byPeriod['Tannaim Gen 1-2 (10-120 CE)'].push(data.name);
      else byPeriod['Tannaim Gen 3-4 (120-200 CE)'].push(data.name);
    } else if (period === 'amora') {
      if (gen <= 2) byPeriod['Amoraim Gen 1-2 (220-290 CE)'].push(data.name);
      else if (gen <= 4) byPeriod['Amoraim Gen 3-4 (290-350 CE)'].push(data.name);
      else byPeriod['Amoraim Gen 5+ (350-500 CE)'].push(data.name);
    }
  });

  // Build timeline
  Object.entries(byPeriod).forEach(([period, sages]) => {
    if (sages.length > 0) {
      lines.push(`  section ${period}`);
      sages.forEach(sage => {
        lines.push(`    ${sage}`);
      });
    }
  });

  const totalSpeakers = Object.values(byPeriod).flat().length;

  return {
    mermaid: lines.join('\n'),
    stats: { speakers: totalSpeakers },
    explanation: `Timeline: ${totalSpeakers} sages across periods`,
    type: DIAGRAM_TYPES.TIMELINE
  };
}

// =============================================================================
// DIAGRAM TYPE: HALACHIC CHAIN - Source to ruling
// =============================================================================

async function generateHalachicChainDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const lines = [`graph ${direction}`];

  lines.push('  %% Halachic Chain Styles');
  lines.push('  classDef torah fill:#3B82F6,stroke:#1E40AF,color:#fff');
  lines.push('  classDef mishna fill:#8B5CF6,stroke:#6D28D9,color:#fff');
  lines.push('  classDef gemara fill:#F59E0B,stroke:#D97706');
  lines.push('  classDef rishonim fill:#10B981,stroke:#059669,color:#fff');
  lines.push('  classDef halacha fill:#DC2626,stroke:#B91C1C,color:#fff');

  // Simplified halachic chain structure
  lines.push(`  torah["📜 Torah Source"]`);
  lines.push(`  class torah torah`);

  lines.push(`  mishna["📘 Mishna - ${tractate}"]`);
  lines.push(`  class mishna mishna`);

  lines.push(`  gemara["📖 Gemara - ${daf}"]`);
  lines.push(`  class gemara gemara`);

  lines.push(`  rishonim["📚 Rishonim\\n(Rashi, Tosafot, Rambam)"]`);
  lines.push(`  class rishonim rishonim`);

  lines.push(`  halacha["⚖️ Practical Halacha\\n(Shulchan Aruch)"]`);
  lines.push(`  class halacha halacha`);

  // Connect the chain
  lines.push('  torah -->|"דרש"| mishna');
  lines.push('  mishna -->|"פירוש"| gemara');
  lines.push('  gemara -->|"ביאור"| rishonim');
  lines.push('  rishonim -->|"פסק"| halacha');

  return {
    mermaid: lines.join('\n'),
    stats: { levels: 5 },
    explanation: `Halachic chain from Torah to practice`,
    type: DIAGRAM_TYPES.HALACHIC_CHAIN
  };
}

// =============================================================================
// DIAGRAM TYPE: CONCEPT MAP - Key terms with semantic relationships
// =============================================================================

async function generateConceptMapDiagram(tractate, daf, options = {}) {
  const { direction = 'LR', maxConcepts = 15 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'conceptMap:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions
  lines.push('  %% Concept Map Styles');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef concept fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef root fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef synonym fill:#fce7f3,stroke:#db2777');
  lines.push('  classDef antonym fill:#fee2e2,stroke:#dc2626');
  lines.push('  classDef field fill:#e0e7ff,stroke:#6366f1');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf central`);

  if (!dafContent?.segments) {
    lines.push(`  note["Load daf content to see concepts"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { concepts: 0 },
      explanation: `Concept map for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.CONCEPT_MAP
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');

  // Extract key Hebrew terms from the text
  const keyTerms = extractKeyTerms(fullText, maxConcepts);
  const nodeIds = new Map();
  let nodeCount = 0;

  // Add key terms as nodes
  keyTerms.forEach((term, index) => {
    const nodeId = `t${index}`;
    nodeIds.set(term.word, nodeId);

    lines.push(`  ${nodeId}["${term.word}"]`);
    lines.push(`  class ${nodeId} concept`);
    lines.push(`  daf --> ${nodeId}`);
    nodeCount++;
  });

  // Try to find relationships between terms using wordRelationshipService
  keyTerms.forEach(term => {
    try {
      const relationships = getWordRelationships(term.word);

      // Add root family connections
      relationships.rootFamily?.slice(0, 3).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `r${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(["${rel.word}"])`);
          lines.push(`  class ${nodeId} root`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.->|שורש| ${targetId}`);
        }
      });

      // Add synonym connections
      relationships.synonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `s${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(("${rel.word}"))`);
          lines.push(`  class ${nodeId} synonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} <-->|נרדף| ${targetId}`);
        }
      });

      // Add antonym connections
      relationships.antonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `a${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}{{"${rel.word}"}}`);
          lines.push(`  class ${nodeId} antonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.-x|היפך| ${targetId}`);
        }
      });
    } catch (err) {
      // Word not in relationship database, skip
    }
  });

  // Add semantic field context
  const detectedFields = new Set();
  keyTerms.forEach(term => {
    Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
      if (field.words.some(w => term.word.includes(w) || w.includes(term.word))) {
        detectedFields.add(key);
      }
    });
  });

  if (detectedFields.size > 0) {
    lines.push(`  %% Semantic Fields`);
    let fieldIdx = 0;
    detectedFields.forEach(fieldKey => {
      const field = SEMANTIC_FIELDS[fieldKey];
      if (field) {
        const fieldNodeId = `f${fieldIdx++}`;
        lines.push(`  ${fieldNodeId}[/"📚 ${field.hebrewLabel}"/]`);
        lines.push(`  class ${fieldNodeId} field`);
        lines.push(`  daf -.-> ${fieldNodeId}`);
      }
    });
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      concepts: keyTerms.length,
      relationships: nodeCount - keyTerms.length,
      semanticFields: detectedFields.size
    },
    explanation: `${keyTerms.length} key terms with relationships`,
    type: DIAGRAM_TYPES.CONCEPT_MAP,
    keyTerms
  };
}

/**
 * PRO SCHOLAR - Extract key terms from Hebrew/Aramaic text with enhanced filtering
 * @param {string} text - Text to analyze
 * @param {number} maxTerms - Maximum terms to return
 * @returns {Array<{word: string, frequency: number, isKeyTerm: boolean}>}
 */
function extractKeyTerms(text, maxTerms = 15) {
  const terms = [];
  const wordCounts = new Map();

  // PRO SCHOLAR - Comprehensive Hebrew/Aramaic stopwords
  const STOPWORDS = new Set([
    // Hebrew function words
    'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
    'זה', 'זו', 'זאת', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אנחנו',
    'אותו', 'אותה', 'אותם', 'מה', 'מי', 'איך', 'למה', 'כמה', 'איזה', 'אשר',
    'שהוא', 'שהיא', 'והוא', 'והיא', 'יש', 'אין', 'היה', 'היתה', 'יהיה',
    'להיות', 'כן', 'כך', 'לו', 'לה', 'בו', 'בה', 'עליו', 'עליה', 'ממנו',
    // Aramaic function words
    'דאמר', 'ואמר', 'הא', 'הך', 'הני', 'האי', 'ההוא', 'ההיא', 'דהא',
    'מאי', 'היכי', 'למאי', 'מנא', 'אלא', 'אמאי', 'הכי', 'נמי', 'דילמא',
    'לאו', 'הכא', 'התם', 'מיהו', 'איכא', 'ליכא', 'למימר', 'למיעבד',
    // Talmudic discourse markers (not content words)
    'אמר', 'אומר', 'אמרו', 'אמרה', 'רבי', 'רב', 'רבן', 'בן', 'בר',
    'דתנן', 'דתניא', 'תנן', 'תנא', 'תניא', 'איתמר',
    // Numerals
    'אחד', 'אחת', 'שני', 'שתי', 'שנים', 'שלש', 'שלשה', 'ארבע', 'ארבעה',
    'חמש', 'חמשה', 'שש', 'ששה', 'שבע', 'שבעה', 'שמונה', 'תשע', 'עשר'
  ]);

  // Count word frequencies with stopword filtering
  const words = text.split(/\s+/);
  words.forEach(word => {
    // Clean the word (remove non-Hebrew chars and nikud)
    let clean = stripNikud(word).replace(/[^\u0590-\u05FF]/g, '');

    // Remove common prefixes for better matching
    if (clean.length > 3 && 'הובכלמשו'.includes(clean[0])) {
      clean = clean.slice(1);
    }

    // Skip stopwords and very short/long words
    if (clean.length < 3 || clean.length > 15 || STOPWORDS.has(clean)) {
      return;
    }

    wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
  });

  // Get most frequent content words
  const sorted = Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 2)  // Appear at least twice
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms);

  sorted.forEach(([word, count]) => {
    terms.push({
      word,
      frequency: count,
      isKeyTerm: true
    });
  });

  return terms;
}

// =============================================================================
// DIAGRAM TYPE: MACHLOKET - Dispute Visualization
// =============================================================================

async function generateMachloketDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'machloket:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions for disputes
  lines.push('  %% Machloket Diagram Styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef tanna fill:#fecaca,stroke:#dc2626,stroke-width:2px');
  lines.push('  classDef amora fill:#bbf7d0,stroke:#16a34a,stroke-width:2px');
  lines.push('  classDef opinion fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef halacha fill:#c4b5fd,stroke:#7c3aed,stroke-width:2px');
  lines.push('  classDef question fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef topic fill:#e5e7eb,stroke:#6b7280,stroke-dasharray:5 5');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf daf`);

  if (!dafContent?.segments) {
    lines.push(`  note["Load daf to see disputes"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { disputes: 0, speakers: 0 },
      explanation: `Machloket diagram for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.MACHLOKET
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');

  // Extract disputes from text
  const disputes = extractDisputes(fullText);
  const speakers = extractSpeakersFromText({ hebrew: [fullText] });

  const nodeIds = new Map();
  let nodeCount = 0;
  let disputeCount = 0;

  // Group speakers by type
  const speakersByName = new Map();
  speakers.forEach(speaker => {
    if (!speakersByName.has(speaker.name)) {
      speakersByName.set(speaker.name, {
        name: speaker.name,
        types: new Set(),
        positions: []
      });
    }
    speakersByName.get(speaker.name).types.add(speaker.type);
    speakersByName.get(speaker.name).positions.push(speaker.position);
  });

  // Add speaker nodes
  speakersByName.forEach((speakerInfo, name) => {
    const nodeId = `sp${nodeCount++}`;
    nodeIds.set(name, nodeId);

    const rabbiData = findRabbiData(name);
    const period = rabbiData?.period || 'unknown';
    const gen = rabbiData?.generation || '?';

    // Shape based on speaker type
    const hasDispute = speakerInfo.types.has('dispute') || speakerInfo.types.has('opinion');
    const hasQuestion = speakerInfo.types.has('question') || speakerInfo.types.has('objection');

    if (hasDispute) {
      lines.push(`  ${nodeId}{{{"${name} (דור ${gen})"}}}`)
    } else if (hasQuestion) {
      lines.push(`  ${nodeId}>"${name}"]`);
    } else {
      lines.push(`  ${nodeId}{{"${name}"}}`);
    }

    // Style based on period
    if (period === 'tanna') {
      lines.push(`  class ${nodeId} tanna`);
    } else if (period === 'amora') {
      lines.push(`  class ${nodeId} amora`);
    }

    lines.push(`  ${nodeId} --> daf`);
  });

  // Create dispute visualization
  if (disputes.length > 0) {
    lines.push(`  %% Disputes`);

    disputes.forEach((dispute, idx) => {
      disputeCount++;
      const disputeNodeId = `d${idx}`;

      // Create a dispute node
      lines.push(`  ${disputeNodeId}(["⚔️ מחלוקת ${idx + 1}"])`);
      lines.push(`  class ${disputeNodeId} topic`);

      // Connect disputants to the dispute
      dispute.speakers.forEach(speaker => {
        const speakerId = nodeIds.get(speaker);
        if (speakerId) {
          lines.push(`  ${speakerId} -.-x ${disputeNodeId}`);
        }
      });
    });
  }

  // PRO SCHOLAR - Comprehensive famous chavruta/dispute pairs
  const famousDisputes = [
    // Major Amoraic pairs (Babylon)
    { pair: ['אביי', 'רבא'], label: 'אביי ורבא', era: 'amora4' },
    { pair: ['רבה', 'רב יוסף'], label: 'רבה ורב יוסף', era: 'amora3' },
    { pair: ['רב חסדא', 'רב ששת'], label: 'רב חסדא ורב ששת', era: 'amora3' },
    { pair: ['רב נחמן', 'רב ששת'], label: 'רב נחמן ורב ששת', era: 'amora3' },
    { pair: ['רבינא', 'רב אשי'], label: 'רבינא ורב אשי', era: 'amora6' },
    // Founding Amoraic pairs
    { pair: ['רב', 'שמואל'], label: 'רב ושמואל', era: 'amora1' },
    { pair: ['רבי יוחנן', 'ריש לקיש'], label: 'ר״י ור״ל', era: 'amora2' },
    // Tannaitic pairs
    { pair: ['בית הלל', 'בית שמאי'], label: 'ב״ה וב״ש', era: 'tanna1' },
    { pair: ['רבי עקיבא', 'רבי ישמעאל'], label: 'ר״ע ור״י', era: 'tanna3' },
    { pair: ['רבי מאיר', 'רבי יהודה'], label: 'ר״מ ור״י', era: 'tanna4' },
    { pair: ['רבי שמעון', 'רבי יהודה'], label: 'ר״ש ור״י', era: 'tanna4' },
    { pair: ['רבי אליעזר', 'רבי יהושע'], label: 'ר״א ור״י', era: 'tanna2' },
    // Eretz Yisrael Amoraim
    { pair: ['רבי אמי', 'רבי אסי'], label: 'ר״א ור״א', era: 'amora3' },
    { pair: ['רבי זירא', 'רבי ירמיה'], label: 'ר״ז ור״י', era: 'amora3' }
  ];

  const foundPairs = [];
  famousDisputes.forEach(({ pair, label, era }) => {
    const [a, b] = pair;
    if (nodeIds.has(a) && nodeIds.has(b)) {
      foundPairs.push({ pair, label, era });
      const aId = nodeIds.get(a);
      const bId = nodeIds.get(b);
      lines.push(`  ${aId} <-.-x|"${label}"| ${bId}`);
    }
  });

  // Add legend
  lines.push(`  %% Legend`);
  lines.push(`  subgraph מקרא[" "]`);
  lines.push(`    direction LR`);
  lines.push(`    leg1[תנא]:::tanna`);
  lines.push(`    leg2[אמורא]:::amora`);
  lines.push(`    leg3(["מחלוקת"]):::topic`);
  lines.push(`  end`);

  return {
    mermaid: lines.join('\n'),
    stats: {
      disputes: disputeCount,
      speakers: speakersByName.size,
      famousPairs: foundPairs.length
    },
    explanation: `${disputeCount} disputes between ${speakersByName.size} sages`,
    type: DIAGRAM_TYPES.MACHLOKET,
    disputes,
    famousPairs: foundPairs
  };
}

// =============================================================================
// DIAGRAM TYPE: SUMMARY - Dynamic content-based summary (NO HARDCODING)
// Analyzes text structure dynamically without predefined topic patterns
// =============================================================================

async function generateSummaryDiagram(tractate, daf, options = {}) {
  const { direction = 'TB', preloadedText = null } = options;

  // PRO SCHOLAR V11.1: Use preloaded text if available, otherwise fetch
  let dafContent = null;
  let fetchError = null;

  // Use preloaded text if provided (avoids duplicate API calls)
  if (preloadedText && typeof preloadedText === 'string' && preloadedText.trim().length > 0) {
    console.log(`[Summary:${tractate}.${daf}] Using preloaded text (${preloadedText.length} chars)`);
    dafContent = {
      ref: `${tractate}.${daf}`,
      segments: [{ index: 1, hebrew: preloadedText }]
    };
  } else {
    // Fetch from API
    try {
      dafContent = await getTalmudDaf(tractate, daf);
      console.log(`[Summary:${tractate}.${daf}] Fetched ${dafContent?.segments?.length || 0} segments`);
    } catch (err) {
      fetchError = err;
      console.warn(`[Summary:${tractate}.${daf}] Primary API failed:`, err.message);

      // Try fallback: fetch with simpler API call (v2 endpoint)
      try {
        const fallbackUrl = process.env.NODE_ENV === 'development'
          ? `/sefaria-api/texts/${tractate}.${daf}?context=0`
          : `https://www.sefaria.org/api/texts/${tractate}.${daf}?context=0`;

        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          // Convert v2 response to our format
          const hebrewTexts = Array.isArray(data.he)
            ? data.he.flat().filter(Boolean)
            : [data.he].filter(Boolean);

          if (hebrewTexts.length > 0) {
            dafContent = {
              ref: data.ref || `${tractate}.${daf}`,
              segments: hebrewTexts.map((text, i) => ({
                index: i + 1,
                hebrew: typeof text === 'string' ? text : ''
              }))
            };
            console.log(`[Summary:${tractate}.${daf}] Fallback API succeeded: ${hebrewTexts.length} segments`);
          }
        }
      } catch (fallbackErr) {
        console.warn(`[Summary:${tractate}.${daf}] Fallback API also failed:`, fallbackErr.message);
      }
    }
  }

  const lines = [`graph ${direction}`];

  // Enhanced scholarly style definitions
  lines.push('  %% Scholarly Summary Styles');
  lines.push('  classDef daf fill:#1e40af,stroke:#1e3a8a,color:#fff,stroke-width:4px,font-weight:bold');
  lines.push('  classDef klal fill:#7c3aed,stroke:#6d28d9,color:#fff,stroke-width:3px');
  lines.push('  classDef mishna fill:#059669,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef gemara fill:#f59e0b,stroke:#d97706,color:#000');
  lines.push('  classDef case fill:#0ea5e9,stroke:#0284c7,color:#fff');
  lines.push('  classDef chiyuv fill:#dc2626,stroke:#b91c1c,color:#fff,stroke-width:2px');
  lines.push('  classDef ptur fill:#16a34a,stroke:#15803d,color:#fff,stroke-width:2px');
  lines.push('  classDef safek fill:#eab308,stroke:#ca8a04,color:#000');
  lines.push('  classDef subject fill:#8b5cf6,stroke:#7c3aed,color:#fff');
  lines.push('  classDef question fill:#f97316,stroke:#ea580c,color:#fff');
  lines.push('  classDef proof fill:#84cc16,stroke:#65a30d,color:#000');
  lines.push('  classDef objection fill:#ef4444,stroke:#dc2626,color:#fff');
  lines.push('  classDef resolution fill:#22c55e,stroke:#16a34a,color:#fff');
  lines.push('  classDef conclusion fill:#a855f7,stroke:#9333ea,color:#fff,stroke-width:2px');
  lines.push('  classDef rabbi fill:#ec4899,stroke:#db2777,color:#fff');
  lines.push('  classDef domain fill:#06b6d4,stroke:#0891b2,color:#fff');
  lines.push('  classDef actor fill:#f472b6,stroke:#ec4899,color:#fff');
  lines.push('  classDef stats fill:#64748b,stroke:#475569,color:#fff');
  lines.push('  classDef errorNode fill:#fca5a5,stroke:#ef4444,color:#7f1d1d,stroke-width:2px');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf daf`);

  if (!dafContent?.segments || dafContent.segments.length === 0) {
    // PRO SCHOLAR V11.2: Enhanced error display with known daf info
    const errorMsg = fetchError
      ? cleanForMermaid(fetchError.message, 35)
      : 'חיבור לסוגרים נכשל';

    // Show known info about this tractate even without content
    const tractateInfo = {
      'Shabbat': { topic: 'הלכות שבת', perakim: 24, firstMishna: 'יציאות השבת' },
      'Berakhot': { topic: 'הלכות ברכות', perakim: 9, firstMishna: 'מאימתי קורין' },
      'Pesachim': { topic: 'הלכות פסח', perakim: 10, firstMishna: 'אור לארבעה עשר' },
      'Bava Kamma': { topic: 'נזיקין', perakim: 10, firstMishna: 'ארבע אבות נזיקין' },
      'Sanhedrin': { topic: 'דיני נפשות', perakim: 11, firstMishna: 'דיני ממונות בשלשה' }
    }[tractate];

    lines.push(`  subgraph error["⚠️ שגיאה בטעינה"]`);
    lines.push(`    direction TB`);
    lines.push(`    errMsg["${errorMsg}"]`);
    lines.push(`    class errMsg errorNode`);
    if (tractateInfo) {
      lines.push(`    info["📚 ${tractateInfo.topic}\\n${tractateInfo.perakim} פרקים"]`);
      lines.push(`    class info case`);
    }
    lines.push(`    hint["💡 נסה לרענן או\\nבחר דף אחר"]`);
    lines.push(`    class hint stats`);
    lines.push(`  end`);
    lines.push(`  daf --> error`);

    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, error: fetchError?.message || 'connection_failed' },
      explanation: `שגיאה בטעינת ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew || '').join(' ');
  let nodeCount = 0;

  // Debug: Log text length for troubleshooting empty diagrams
  if (process.env.NODE_ENV === 'development') {
    console.log(`[talmudDiagramService:summary] ${tractate} ${daf} - Text length: ${fullText.length} chars`);
  }

  // Handle empty text case
  if (!fullText || fullText.trim().length < 50) {
    lines.push(`  empty["⚠️ לא נמצא תוכן עברי בדף זה"]`);
    lines.push(`  daf --> empty`);
    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, textLength: fullText?.length || 0 },
      explanation: `לא נמצא תוכן - ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  // ===== SCHOLARLY DYNAMIC ANALYSIS =====
  // NOTE: Using exported cleanForMermaid utility (includes stripNikud for better Hebrew matching)

  // 1. USE namedEntityService for entity detection
  const entities = detectEntities(fullText);

  // 2. Extract compound phrases (צירופים)
  const compoundTerms = extractCompoundTerms(fullText);

  // 3. Find enumeration patterns (שתיים שהן ארבע)
  const enumerations = extractEnumerations(fullText);

  // 4. Extract contrasting pairs (פנים/חוץ)
  const contrastingPairs = extractContrastingPairs(fullText);

  // 5. Extract structural elements
  const structure = analyzeStructure(fullText);

  // 6. Extract actor-action-ruling chains
  const halachicCases = extractHalachicCasesDynamic(fullText);

  // 7. Extract full discourse (questions, proofs, objections, resolutions, conclusions)
  const discourse = extractFullDiscourse(fullText);

  // 8. Extract domains/locations
  const domains = extractDomainsDynamic(fullText);

  // 9. Extract actors
  const actors = extractActorsDynamic(fullText);

  // Track node IDs for connections
  const nodeIds = {};

  // ===== BUILD DIAGRAM (SUGYA FLOW) =====

  // === KLAL (Underlying Principle) ===
  if (enumerations.length > 0) {
    lines.push(`  %% כלל`);
    const klalId = `klal${nodeCount++}`;
    nodeIds.klal = klalId;
    lines.push(`  ${klalId}{{{"📐 ${cleanForMermaid(enumerations[0].text, 28)}"}}}`);
    lines.push(`  class ${klalId} klal`);
    lines.push(`  daf --> ${klalId}`);
  }

  // === MISHNA ===
  if (structure.mishna) {
    lines.push(`  %% משנה`);
    const mishnaId = `m${nodeCount++}`;
    nodeIds.mishna = mishnaId;
    lines.push(`  ${mishnaId}["📜 מתני׳:\\n${cleanForMermaid(structure.mishna, 45)}"]`);
    lines.push(`  class ${mishnaId} mishna`);
    if (nodeIds.klal) {
      lines.push(`  ${nodeIds.klal} --> ${mishnaId}`);
    } else {
      lines.push(`  daf --> ${mishnaId}`);
    }
  }

  // === KEY CONCEPTS (מושגים) ===
  if (compoundTerms.length > 0 || domains.length > 0 || actors.length > 0) {
    lines.push(`  %% מושגים`);
    lines.push(`  subgraph concepts["מושגי יסוד"]`);
    lines.push(`    direction LR`);

    // V3: Pre-clean and filter to avoid fragments
    compoundTerms.slice(0, 3).forEach((term) => {
      const cleanTerm = cleanForMermaid(term.term, 20);
      if (cleanTerm.length < 4) return;  // Compound terms should be at least 4 chars
      const termId = `t${nodeCount++}`;
      lines.push(`    ${termId}["${cleanTerm}"]`);
      lines.push(`    class ${termId} subject`);
    });

    domains.slice(0, 2).forEach((dom) => {
      const cleanDom = cleanForMermaid(dom, 15);
      if (cleanDom.length < 3) return;  // Skip fragments
      const domId = `d${nodeCount++}`;
      lines.push(`    ${domId}["📍 ${cleanDom}"]`);
      lines.push(`    class ${domId} domain`);
    });

    actors.slice(0, 2).forEach((act) => {
      const cleanAct = cleanForMermaid(act, 15);
      if (cleanAct.length < 3) return;  // Skip fragments
      const actId = `a${nodeCount++}`;
      lines.push(`    ${actId}["👤 ${cleanAct}"]`);
      lines.push(`    class ${actId} actor`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> concepts`);
  }

  // Add contrasting pairs (the conceptual structure)
  if (contrastingPairs.length > 0) {
    lines.push(`  %% Contrasting Pairs`);
    lines.push(`  subgraph pairs["זוגות מנוגדים"]`);
    lines.push(`    direction TB`);
    // V3: Pre-clean and validate pairs
    contrastingPairs.slice(0, 3).forEach((pair) => {
      const cleanA = cleanForMermaid(pair.a, 15);
      const cleanB = cleanForMermaid(pair.b, 15);
      // Skip if either side is too short (fragment)
      if (cleanA.length < 3 || cleanB.length < 3) return;

      const pairId1 = `cp${nodeCount++}`;
      const pairId2 = `cp${nodeCount++}`;
      lines.push(`    ${pairId1}["${cleanA}"]`);
      lines.push(`    ${pairId2}["${cleanB}"]`);
      lines.push(`    ${pairId1} --- ${pairId2}`);
      if (pair.type === 'ruling') {
        lines.push(`    class ${pairId1} chiyuv`);
        lines.push(`    class ${pairId2} ptur`);
      } else {
        lines.push(`    class ${pairId1} case`);
        lines.push(`    class ${pairId2} case`);
      }
    });
    lines.push(`  end`);
    lines.push(`  daf --> pairs`);
  }

  // Add halachic cases (actor → action → ruling)
  if (halachicCases.length > 0) {
    lines.push(`  %% Halachic Cases`);
    lines.push(`  subgraph cases["מקרים ודינים"]`);
    lines.push(`    direction TB`);

    // V3: Pre-clean and validate case actors
    halachicCases.slice(0, 8).forEach((c) => {
      const actor = cleanForMermaid(c.actor, 12);
      // Skip if actor is too short (fragment)
      if (actor.length < 2) return;

      const caseId = `case${nodeCount++}`;
      const icon = c.ruling === 'חייב' ? '🔴' :
                   c.ruling === 'פטור' ? '🟢' :
                   c.ruling === 'ספק' ? '🟡' :
                   c.ruling === 'מותר' ? '✅' :
                   c.ruling === 'אסור' ? '🚫' : '⚪';

      const action = c.action ? `\\n${cleanForMermaid(c.action, 15)}` : '';
      const ruling = c.ruling ? `\\n${c.ruling}` : '';

      lines.push(`    ${caseId}["${icon} ${actor}${action}${ruling}"]`);

      if (c.ruling === 'חייב') lines.push(`    class ${caseId} chiyuv`);
      else if (c.ruling === 'פטור') lines.push(`    class ${caseId} ptur`);
      else if (c.ruling === 'ספק' || c.ruling === 'תיקו') lines.push(`    class ${caseId} safek`);
      else lines.push(`    class ${caseId} case`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> cases`);
  }

  // === GEMARA DISCUSSION (שקלא וטריא) ===
  const hasDiscourse = structure.gemara || discourse.questions.length > 0 ||
                       discourse.proofs.length > 0 || discourse.objections.length > 0;

  if (hasDiscourse) {
    lines.push(`  %% שקלא וטריא`);
    lines.push(`  subgraph shakla["שקלא וטריא"]`);
    lines.push(`    direction TB`);

    if (structure.gemara) {
      const gId = `g${nodeCount++}`;
      nodeIds.gemara = gId;
      lines.push(`    ${gId}>"📚 גמ׳: ${cleanForMermaid(structure.gemara, 30)}"]`);
      lines.push(`    class ${gId} gemara`);
    }

    discourse.questions.slice(0, 2).forEach((q, idx) => {
      const qId = `q${nodeCount++}`;
      lines.push(`    ${qId}>"❓ ${cleanForMermaid(q.text, 25)}"]`);
      lines.push(`    class ${qId} question`);
    });

    discourse.proofs.slice(0, 1).forEach((p, idx) => {
      const pId = `prf${nodeCount++}`;
      lines.push(`    ${pId}["📖 ${cleanForMermaid(p.text, 22)}"]`);
      lines.push(`    class ${pId} proof`);
    });

    discourse.objections.slice(0, 1).forEach((o, idx) => {
      const oId = `obj${nodeCount++}`;
      lines.push(`    ${oId}>"⚡ ${cleanForMermaid(o.text, 22)}"]`);
      lines.push(`    class ${oId} objection`);
    });

    discourse.resolutions.slice(0, 1).forEach((r, idx) => {
      const rId = `res${nodeCount++}`;
      lines.push(`    ${rId}["✓ ${cleanForMermaid(r.text, 22)}"]`);
      lines.push(`    class ${rId} resolution`);
    });

    lines.push(`  end`);
    if (nodeIds.mishna) {
      lines.push(`  ${nodeIds.mishna} -.-> shakla`);
    } else {
      lines.push(`  daf --> shakla`);
    }
  }

  // === CONCLUSIONS (מסקנות) ===
  if (discourse.conclusions.length > 0) {
    lines.push(`  %% מסקנות`);
    discourse.conclusions.slice(0, 2).forEach((c, idx) => {
      const cId = `conc${nodeCount++}`;
      lines.push(`  ${cId}[["⭐ ${cleanForMermaid(c.text, 30)}"]]`);
      lines.push(`  class ${cId} conclusion`);
      lines.push(`  daf --> ${cId}`);
    });
  }

  // === SAGES (חכמים) ===
  const uniqueRabbis = [...new Set(entities.rabbis.map(r => r.hebrew))].slice(0, 4);
  if (uniqueRabbis.length > 0) {
    lines.push(`  %% חכמים`);
    lines.push(`  subgraph sages["חכמים"]`);
    lines.push(`    direction LR`);
    uniqueRabbis.forEach((rabbi) => {
      const rId = `r${nodeCount++}`;
      lines.push(`    ${rId}(("${rabbi}"))`);
      lines.push(`    class ${rId} rabbi`);
    });
    lines.push(`  end`);
    lines.push(`  sages -.-> daf`);
  }

  // === TF-IDF KEY TERMS (PRO SCHOLAR Algorithmic Analysis) ===
  const tfidfSummary = summarizeText(fullText);
  const topTerms = tfidfSummary.keyTerms.slice(0, 6);

  if (topTerms.length > 0) {
    lines.push(`  %% מילות מפתח (TF-IDF)`);
    lines.push(`  subgraph tfidf["📊 מילות מפתח"]`);
    lines.push(`    direction LR`);
    // V3: Pre-filter terms and skip fragments after cleaning
    topTerms.forEach((t) => {
      // V3: Clean FIRST, then validate meaningful length
      const cleanTerm = cleanForMermaid(t.term, 15);
      // Skip fragments (< 3 chars) and empty terms
      if (cleanTerm.length < 3) return;

      const tId = `tf${nodeCount++}`;
      const categoryIcon = t.category === 'halachic' ? '⚖️' :
                          t.category === 'sources' ? '📜' :
                          t.category === 'states' ? '🔄' : '🔹';
      lines.push(`    ${tId}["${categoryIcon} ${cleanTerm}\\n(${t.count}×)"]`);
      // Color by score intensity
      if (t.score > 3) lines.push(`    class ${tId} conclusion`);
      else if (t.score > 2) lines.push(`    class ${tId} subject`);
      else lines.push(`    class ${tId} case`);
    });
    lines.push(`  end`);
    lines.push(`  tfidf -.-> daf`);
  }

  // === FALLBACK: Basic word extraction when nothing else found ===
  if (nodeCount === 0) {
    // If no scholarly content was extracted, show basic text analysis
    lines.push(`  %% Fallback: Basic Text Analysis`);

    // Extract most frequent significant Hebrew words (skip common stopwords)
    const stopwords = new Set(['את', 'של', 'על', 'אם', 'כי', 'לא', 'הוא', 'היא', 'הם', 'זה', 'זו', 'מה', 'אשר', 'כל', 'בו', 'לו', 'בה', 'עד', 'גם', 'או', 'יש', 'אין', 'רק', 'אך', 'אלא', 'כמו']);
    const wordCounts = new Map();
    const words = fullText.split(/\s+/).filter(w => w.length >= 3);
    words.forEach(word => {
      const clean = word.replace(/[^\u0590-\u05FF]/g, '');
      if (clean.length >= 3 && !stopwords.has(clean)) {
        wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
      }
    });

    // Get top 8 words by frequency
    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (topWords.length > 0) {
      lines.push(`  subgraph words["📝 מילים מרכזיות"]`);
      lines.push(`    direction LR`);
      topWords.forEach(([word, count], idx) => {
        const wId = `w${idx}`;
        lines.push(`    ${wId}["${word} (${count}×)"]`);
        lines.push(`    class ${wId} case`);
        nodeCount++;
      });
      lines.push(`  end`);
      lines.push(`  daf --> words`);
    }
  }

  // === STATS SUMMARY ===
  const chiyuvCount = halachicCases.filter(c => c.ruling === 'חייב').length;
  const pturCount = halachicCases.filter(c => c.ruling === 'פטור').length;

  // Always show stats summary with text statistics
  const statsId = `st${nodeCount++}`;
  const statsParts = [
    chiyuvCount > 0 ? `🔴${chiyuvCount}` : '',
    pturCount > 0 ? `🟢${pturCount}` : '',
    discourse.questions.length > 0 ? `❓${discourse.questions.length}` : '',
    uniqueRabbis.length > 0 ? `👤${uniqueRabbis.length}` : '',
    `📝${tfidfSummary.statistics.uniqueTerms || fullText.split(/\s+/).length}`,
  ].filter(Boolean).join(' ');
  lines.push(`  ${statsId}[/"${statsParts}"/]`);
  lines.push(`  class ${statsId} stats`);
  lines.push(`  daf -.-> ${statsId}`);

  // Build scholarly explanation (V3: clean all terms)
  const explanationParts = [];
  if (enumerations.length > 0) {
    explanationParts.push(cleanForMermaid(enumerations[0].text, 20));
  }
  if (compoundTerms.length > 0) {
    // V3: Clean and filter compound terms for explanation
    const cleanedTerms = compoundTerms.slice(0, 2)
      .map(t => cleanForMermaid(t.term, 15))
      .filter(t => t.length >= 4);  // Skip fragments
    if (cleanedTerms.length > 0) {
      explanationParts.push(cleanedTerms.join(', '));
    }
  }
  if (halachicCases.length > 0 && (chiyuvCount > 0 || pturCount > 0)) {
    explanationParts.push(`${chiyuvCount} חייב, ${pturCount} פטור`);
  }
  if (uniqueRabbis.length > 0) {
    explanationParts.push(`${uniqueRabbis.length} חכמים`);
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      compoundTerms: compoundTerms.length,
      enumerations: enumerations.length,
      contrastingPairs: contrastingPairs.length,
      halachicCases: halachicCases.length,
      chiyuvCases: chiyuvCount,
      pturCases: pturCount,
      domains: domains.length,
      actors: actors.length,
      rabbis: uniqueRabbis.length,
      questions: discourse.questions.length,
      proofs: discourse.proofs.length,
      objections: discourse.objections.length,
      resolutions: discourse.resolutions.length,
      conclusions: discourse.conclusions.length,
      elements: nodeCount,
      // TF-IDF Statistics
      tfidf: tfidfSummary.statistics
    },
    explanation: explanationParts.join(' • ') || `סיכום ${tractate} ${daf}`,
    type: DIAGRAM_TYPES.SUMMARY,
    extracted: {
      compoundTerms, enumerations, contrastingPairs, halachicCases,
      discourse, domains, actors, entities, structure,
      // TF-IDF Analysis Results
      tfidfKeyTerms: tfidfSummary.keyTerms,
      tfidfKeySegments: tfidfSummary.keySegments,
      tfidfStructure: tfidfSummary.structure
    }
  };
}

/**
 * Extract full discourse elements (questions, proofs, objections, resolutions, conclusions)
 */
function extractFullDiscourse(text) {
  // PRO SCHOLAR V20: Comprehensive discourse element extraction
  const elements = {
    questions: [],
    proofs: [],
    objections: [],
    resolutions: [],
    conclusions: []
  };

  const extractWith = (patterns, target) => {
    patterns.forEach(pattern => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = (match[1] || match[2] || match[0]).trim();
        if (content && content.length > 3) {
          target.push({ text: content, position: match.index });
        }
      }
    });
    target.sort((a, b) => a.position - b.position);
  };

  // PRO SCHOLAR V20: Comprehensive question patterns
  extractWith([
    /מאי\s+([^?。.]{3,50})/g,
    /מנלן\s*[?]?\s*([^。.]{3,40})/g,
    /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{3,40})/g,
    /היכי\s+דמי\s*[?]?\s*([^。.]{3,35})/g,
    /מאי\s+טעמא\s*[?]?\s*([^。.]{3,40})/g,
    /איבעיא\s+להו\s*[:]?\s*([^。.]{5,60})/g,
    /בעי\s+([^:。.]{3,40})/g,
    /למה\s+לי\s*[?]?\s*([^。.]{3,40})/g,
    /פשיטא\s*[!?]?\s*([^。.]{3,40})/g,
    /מאי\s+שנא\s*([^。.]{3,40})/g,
    /במאי\s+עסקינן\s*[?]?\s*([^。.]{3,40})/g,
    /מאי\s+קמ"ל\s*[?]?\s*([^。.]{3,40})/g,
  ], elements.questions);

  // PRO SCHOLAR V20: Comprehensive proof patterns
  extractWith([
    /שנאמר\s*[":״]?\s*([^"״。.]{3,50})/g,
    /דכתיב\s*[":״]?\s*([^"״。.]{3,50})/g,
    /תנן\s*[:]?\s*([^。.]{5,60})/g,
    /תניא\s*[:]?\s*([^。.]{5,60})/g,
    /תנו\s+רבנן\s*[:]?\s*([^。.]{5,60})/g,
    /תא\s+שמע\s*[:]?\s*([^。.]{5,60})/g,
    /תנן\s+התם\s*[:]?\s*([^。.]{5,60})/g,
    /אמר\s+קרא\s*[:]?\s*([^。.]{3,50})/g,
  ], elements.proofs);

  // PRO SCHOLAR V20: Comprehensive objection patterns
  extractWith([
    /מיתיבי\s*[:]?\s*([^。.]{5,60})/g,
    /ורמינהו\s*[:]?\s*([^。.]{5,60})/g,
    /והתניא\s*[:]?\s*([^。.]{5,50})/g,
    /והא\s+תנן\s*[:]?\s*([^。.]{5,50})/g,
    /מתקיף\s+לה\s*[:]?\s*([^。.]{5,50})/g,
    /איתיביה\s*[:]?\s*([^。.]{5,50})/g,
    /לימא\s+מתני[׳']?\s*([^。.]{5,50})/g,
    /ומי\s+אמר\s*([^。.]{5,40})/g,
  ], elements.objections);

  // PRO SCHOLAR V20: Comprehensive resolution patterns
  extractWith([
    /לא\s+קשיא\s*[:]?\s*([^。.]{5,60})/g,
    /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{5,60})/g,
    /שאני\s+([^。.]{3,50})/g,
    /הכי\s+קאמר\s*[:]?\s*([^。.]{5,50})/g,
    /הכי\s+קתני\s*[:]?\s*([^。.]{5,50})/g,
    /אלא\s+([^。.]{5,50})/g,
    /התם\s+([^。.]{5,50})/g,
  ], elements.resolutions);

  // PRO SCHOLAR V20: Comprehensive conclusion patterns
  extractWith([
    /שמע\s+מינה\s*[:]?\s*([^。.]{5,60})/g,
    /הלכה\s+כ?([^。.]{3,40})/g,
    /הלכתא\s+([^。.]{3,40})/g,
    /והלכתא\s+([^。.]{3,40})/g,
    /תיקו/g,
    /קשיא$/g,
    /צריך\s+עיון/g,
  ], elements.conclusions);

  return elements;
}

/**
 * Extract domains/locations dynamically
 */
function extractDomainsDynamic(text) {
  const domains = new Set();
  const patterns = [
    /רשות\s+ה(רבים|יחיד)/g,
    /כרמלית/g,
    /מקום\s+פטור/g,
    /(בפנים|לפנים)/g,
    /(בחוץ|לחוץ)/g,
    /בית\s+(הכנסת|המדרש|דין)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const domain = match[0].trim();
      if (domain.length >= 3) domains.add(domain);
    }
  });

  return Array.from(domains).slice(0, 4);
}

/**
 * Extract actors dynamically
 */
function extractActorsDynamic(text) {
  const actors = new Set();
  const patterns = [
    /(העני|הנותן|המקבל|המוציא|המכניס|הגוזל|הנגזל)/g,
    /(בעל\s+הבית|בעה"ב)/g,
    /ה(\S{2,})\s+(?:פשט|נתן|נטל|עשה|הוציא|הכניס)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const actor = (match[1] || match[0]).trim();
      if (actor.length >= 3 && actor.length <= 15) actors.add(actor);
    }
  });

  return Array.from(actors).slice(0, 4);
}

/**
 * Extract compound terms (צירופים) - multi-word technical phrases
 * Dynamically finds repeated 2-3 word phrases that form technical terms
 * V2 PRO SCHOLAR: Fixed nikud stripping and function word filtering
 */
function extractCompoundTerms(text) {
  const termCounts = new Map();

  // Strip nikud first for consistent matching
  const cleanText = stripNikud(text);

  // Function words to exclude from compound terms
  const functionWords = new Set([
    'את', 'על', 'של', 'אל', 'מן', 'עם', 'כי', 'גם', 'או', 'אם',
    'לא', 'כל', 'זה', 'זו', 'הוא', 'היא', 'הם', 'הן', 'יש', 'אין',
    'בו', 'בה', 'לו', 'לה', 'כן', 'מה', 'מי', 'אשר', 'עד', 'רק'
  ]);

  // Helper to check if term ends with function word
  const endsWithFunctionWord = (term) => {
    const words = term.split(/\s+/);
    const lastWord = words[words.length - 1];
    return functionWords.has(lastWord);
  };

  // Find two-word phrases with definite article or construct state
  // Pattern: ה + word + word (e.g., "רשות הרבים", "בעל הבית")
  const twoWordPatterns = [
    /(רשות)\s+(היחיד|הרבים)/g,      // רשות היחיד/הרבים (specific)
    /(בעל)\s+(הבית)/g,              // בעל הבית (specific)
    /(מלאכת)\s+(\S{3,})/g,          // מלאכת X
    /(דין)\s+(\S{3,})/g,            // דין X
    /(איסור)\s+(\S{3,})/g,          // איסור X
    /(מצות)\s+(\S{3,})/g,           // מצות X
    /(הלכות)\s+(\S{3,})/g,          // הלכות X
    /ה(עני)\s+(ו?ה?בעל)/g,          // העני ובעל/העני והבעל
  ];

  twoWordPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      if (term.length >= 5 && !endsWithFunctionWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }
  });

  // Find construct state patterns (סמיכות) - word ending in ת/י + meaningful word
  const constructPatterns = [
    /(\S{3,}ת)\s+(ה\S{3,})/g,   // X-ת הY (מלאכת הוצאה) - require 3+ chars
    /(\S{3,}י)\s+(ה\S{3,})/g,   // X-י הY (דיני שבת)
  ];

  constructPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      if (term.length >= 8 && term.length <= 25 && !endsWithFunctionWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }
  });

  // Find key actor pairs (specific to Talmudic discourse)
  const actorPatterns = [
    /העני/g,
    /בעל הבית/g,
    /המוציא/g,
    /המכניס/g,
  ];

  actorPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  });

  // Return terms appearing 1+ times (lowered threshold for specific patterns)
  return Array.from(termCounts.entries())
    .filter(([term, count]) => count >= 1 && term.length >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));
}

/**
 * Extract enumeration patterns - the conceptual framework
 * Finds "X שהן Y" patterns like "שתיים שהן ארבע"
 */
function extractEnumerations(text) {
  const enumerations = [];

  // Number words in Hebrew
  const numPatterns = [
    // שתיים שהן ארבע, etc.
    /(\S+)\s+שהן\s+(\S+)/g,
    // X שהם Y
    /(\S+)\s+שהם\s+(\S+)/g,
    // X ו-Y (explicit enumeration)
    /(שתיים|שלש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+(שהן|שהם)\s+(\S+)/g,
  ];

  numPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      enumerations.push({
        text: match[0].trim(),
        position: match.index,
        type: 'enumeration'
      });
    }
  });

  // Also find explicit list markers
  const listPatterns = [
    /אבות\s+מלאכות/g,
    /מ״ל\s+מלאכות/g,
    /ל״ט\s+אבות/g,
    /יציאות\s+ה?שבת/g,
  ];

  listPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      enumerations.push({
        text: match[0].trim(),
        position: match.index,
        type: 'list_marker'
      });
    }
  });

  // Dedupe by position
  const seen = new Set();
  return enumerations.filter(e => {
    const key = Math.floor(e.position / 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract contrasting pairs - the conceptual structure
 * Finds opposites that appear together (פנים/חוץ, חייב/פטור)
 */
function extractContrastingPairs(text) {
  const pairs = [];

  // Known contrasting pairs in Talmudic discourse (V2 PRO SCHOLAR expanded)
  const pairPatterns = [
    // Location pairs
    { regex: /(בפנים|לפנים|פנימה).*?(בחוץ|לחוץ|חוצה)/g, a: 'פנים', b: 'חוץ', type: 'location' },
    { regex: /(בחוץ|לחוץ|חוצה).*?(בפנים|לפנים|פנימה)/g, a: 'חוץ', b: 'פנים', type: 'location' },
    { regex: /(למעלה).*?(למטה)/g, a: 'למעלה', b: 'למטה', type: 'location' },
    // Ruling pairs
    { regex: /(חייב|חייבים).*?(פטור|פטורים)/g, a: 'חייב', b: 'פטור', type: 'ruling' },
    { regex: /(פטור|פטורים).*?(חייב|חייבים)/g, a: 'פטור', b: 'חייב', type: 'ruling' },
    { regex: /(מותר).*?(אסור)/g, a: 'מותר', b: 'אסור', type: 'ruling' },
    { regex: /(אסור).*?(מותר)/g, a: 'אסור', b: 'מותר', type: 'ruling' },
    { regex: /(טהור|טהורים).*?(טמא|טמאים)/g, a: 'טהור', b: 'טמא', type: 'ruling' },
    { regex: /(כשר|כשרה).*?(פסול|פסולה)/g, a: 'כשר', b: 'פסול', type: 'ruling' },
    // Actor pairs
    { regex: /(העני).*?(בעל\s*הבית)/g, a: 'העני', b: 'בעל הבית', type: 'actor' },
    { regex: /(הנותן).*?(המקבל)/g, a: 'הנותן', b: 'המקבל', type: 'actor' },
    { regex: /(המוציא).*?(המכניס)/g, a: 'המוציא', b: 'המכניס', type: 'actor' },
    { regex: /(המוכר).*?(הלוקח|הקונה)/g, a: 'המוכר', b: 'הלוקח', type: 'actor' },
    { regex: /(האב).*?(הבן)/g, a: 'האב', b: 'הבן', type: 'actor' },
    // Domain pairs
    { regex: /(רשות\s+היחיד).*?(רשות\s+הרבים)/g, a: 'רשות היחיד', b: 'רשות הרבים', type: 'domain' },
    { regex: /(כרמלית).*?(מקום\s+פטור)/g, a: 'כרמלית', b: 'מקום פטור', type: 'domain' },
    // Action pairs
    { regex: /(עקירה).*?(הנחה)/g, a: 'עקירה', b: 'הנחה', type: 'action' },
    { regex: /(הוצאה).*?(הכנסה)/g, a: 'הוצאה', b: 'הכנסה', type: 'action' },
    { regex: /(נטילה).*?(נתינה)/g, a: 'נטילה', b: 'נתינה', type: 'action' },
    // Time pairs
    { regex: /(לכתחילה).*?(בדיעבד)/g, a: 'לכתחילה', b: 'בדיעבד', type: 'time' },
    { regex: /(ביום).*?(בלילה)/g, a: 'ביום', b: 'בלילה', type: 'time' },
    // Source pairs
    { regex: /(דאורייתא|מן\s+התורה).*?(דרבנן|מדרבנן)/g, a: 'דאורייתא', b: 'דרבנן', type: 'source' },
    // Quantity pairs
    { regex: /(מרובה).*?(מועט)/g, a: 'מרובה', b: 'מועט', type: 'quantity' },
  ];

  const seenPairs = new Set();

  pairPatterns.forEach(({ regex, a, b, type }) => {
    regex.lastIndex = 0;
    if (regex.test(text)) {
      const pairKey = `${a}-${b}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        pairs.push({ a, b, type });
      }
    }
  });

  return pairs;
}

/**
 * Extract halachic cases dynamically (actor → action → ruling)
 * PRO SCHOLAR V20: Comprehensive pattern matching for all ruling types
 * Finds patterns without hardcoding specific actors
 */
function extractHalachicCasesDynamic(text) {
  const cases = [];
  const seenPositions = new Set();

  // PRO SCHOLAR V20: Comprehensive ruling types
  const rulingTypes = [
    // Obligation/Exemption
    'חייב', 'פטור', 'חייבים', 'פטורים', 'חייבת', 'פטורה',
    // Permission/Prohibition
    'מותר', 'אסור', 'מותרים', 'אסורים', 'מותרת', 'אסורה',
    // Validity
    'כשר', 'פסול', 'כשרים', 'פסולים', 'כשרה', 'פסולה',
    // Purity
    'טמא', 'טהור', 'טמאים', 'טהורים', 'טמאה', 'טהורה',
    // Fulfillment
    'יצא', 'יוצא', 'אינו יוצא',
    // Acquisition
    'קנה', 'קונה', 'אינו קונה'
  ];
  const rulingPattern = rulingTypes.join('|');

  // Pattern 1: Actor with definite article + ruling
  const actorActionRuling = [
    // הX ... ruling (definite noun followed somewhere by ruling)
    { regex: new RegExp(`(ה[\\u0590-\\u05FF]{2,}(?:\\s+ה?[\\u0590-\\u05FF]+)?)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,5}(${rulingPattern})`, 'g') },
    // X פשט/נתן/נטל ... ruling
    { regex: new RegExp(`([\\u0590-\\u05FF]+)\\s+(פשט|נתן|נטל|הוציא|הכניס|העביר|עשה|לקח|מכר)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,5}[-–—]?\\s*(${rulingPattern})`, 'g') },
    // X — ruling (direct ruling with dash)
    { regex: new RegExp(`([\\u0590-\\u05FF]+(?:\\s+[\\u0590-\\u05FF]+)?)\\s*[-–—]\\s*(${rulingPattern})`, 'g') },
    // PRO SCHOLAR V20: Additional patterns
    // שניהם ruling
    { regex: new RegExp(`(שניהם|שתיהם|כולם|כולן)\\s+(${rulingPattern})`, 'g') },
    // בעל X ruling
    { regex: new RegExp(`(בעל\\s+ה[\\u0590-\\u05FF]+)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,3}(${rulingPattern})`, 'g') },
  ];

  actorActionRuling.forEach(({ regex }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const posKey = Math.floor(match.index / 25); // Finer granularity
      if (seenPositions.has(posKey)) continue;
      seenPositions.add(posKey);

      const actor = match[1]?.trim() || '';
      const action = match[2]?.trim() || '';
      let ruling = match[3]?.trim() || match[2]?.trim() || '';

      // Normalize ruling to base form
      if (ruling.includes('פטור')) ruling = 'פטור';
      else if (ruling.includes('חייב')) ruling = 'חייב';
      else if (ruling.includes('מותר')) ruling = 'מותר';
      else if (ruling.includes('אסור')) ruling = 'אסור';
      else if (ruling.includes('כשר')) ruling = 'כשר';
      else if (ruling.includes('פסול')) ruling = 'פסול';
      else if (ruling.includes('טמא')) ruling = 'טמא';
      else if (ruling.includes('טהור')) ruling = 'טהור';
      else if (ruling.includes('יצא') || ruling.includes('יוצא')) ruling = 'יצא';
      else if (ruling.includes('קנה') || ruling.includes('קונה')) ruling = 'קנה';
      else if (['פשט', 'נתן', 'נטל', 'הוציא', 'הכניס', 'העביר', 'עשה', 'לקח', 'מכר'].includes(ruling)) {
        // action captured as ruling - this is not a ruling, skip
        continue;
      }

      if (actor && ruling && actor.length >= 2 && actor.length <= 30) {
        cases.push({
          actor,
          action: ['פשט', 'נתן', 'נטל', 'הוציא', 'הכניס', 'העביר', 'עשה', 'לקח', 'מכר'].includes(action) ? action : null,
          ruling,
          position: match.index,
          fullMatch: match[0].slice(0, 60)
        });
      }
    }
  });

  // Sort by position and return unique cases
  return cases
    .sort((a, b) => a.position - b.position)
    .slice(0, 12); // Increased limit
}

/**
 * Find significant words by frequency analysis (dynamic, no hardcoding)
 * @private Reserved for future diagram enhancements
 */
// eslint-disable-next-line no-unused-vars
function findSignificantWords(text) {
  const wordCounts = new Map();

  // Function words to skip (grammatical, not content)
  const skipWords = new Set([
    'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
    'זה', 'זו', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אנחנו', 'אותו', 'אותה',
    'מה', 'מי', 'איך', 'למה', 'כמה', 'איזה', 'אשר', 'שהוא', 'שהיא', 'והוא', 'והיא',
    'יש', 'אין', 'היה', 'היתה', 'יהיה', 'להיות', 'כן', 'כך', 'לו', 'לה', 'בו', 'בה',
    'אמר', 'אומר', 'אמרו', 'אמרה', 'דאמר', 'ואמר', // speech verbs
    'רבי', 'רב', 'רבן', 'בן', 'בר', // titles
    'דתנן', 'דתניא', 'מאי', 'היכי', 'למאי', 'מנא', // Aramaic function words
    'הא', 'הך', 'הני', 'האי', 'ההוא', 'ההיא', // demonstratives
    'כל', 'אחד', 'שני', 'שתי', 'שלש', 'ארבע' // numerals
  ]);

  // Extract words
  const words = text.match(/[\u0590-\u05FF]{3,}/g) || [];

  words.forEach(word => {
    // Remove common prefixes for analysis
    let clean = word;
    if (clean.length > 3 && 'הובכלמשו'.includes(clean[0])) {
      clean = clean.slice(1);
    }
    if (clean.length < 3 || skipWords.has(clean)) return;

    wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
  });

  // Return most frequent (appearing 3+ times)
  return Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Analyze text structure (find Mishna and Gemara sections)
 */
function analyzeStructure(text) {
  const result = { mishna: null, gemara: null };

  // Find Mishna section
  const mishnaMatch = text.match(/(?:מתני[׳']|משנה)\s*[:.]?\s*([^.!?]{10,200})/);
  if (mishnaMatch) {
    result.mishna = mishnaMatch[1].trim();
  }

  // Find Gemara section
  const gemaraMatch = text.match(/(?:גמ[׳']|גמרא)\s*[:.]?\s*([^.!?]{10,150})/);
  if (gemaraMatch) {
    result.gemara = gemaraMatch[1].trim();
  }

  return result;
}

/**
 * PRO SCHOLAR - Extract rulings dynamically with comprehensive pattern matching
 * Finds subject + ruling patterns without hardcoded actors
 * @param {string} text - Talmud text to analyze
 * @returns {Array<{subject: string, ruling: string, position: number, category: string, icon: string}>}
 */
function extractRulingsDynamic(text) {
  const rulings = [];
  const seenPositions = new Set();

  // PRO SCHOLAR - Comprehensive ruling patterns by category
  const patterns = [
    // =============================================================================
    // OBLIGATION/EXEMPTION (חיוב/פטור)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s*[-–—]\s*(חייב|פטור|חייבים|פטורים|חייבת|פטורה)/g, ruling: null, category: 'obligation' },
    { regex: /(ה[\u0590-\u05FF]{2,}|[\u0590-\u05FF]+ים|[\u0590-\u05FF]+ות)\s+(חייב|פטור|חייבים|פטורים|חייבת|פטורה)/g, ruling: null, category: 'obligation' },
    { regex: /(?:ב|על)\s*([\u0590-\u05FF]+)\s+(חייב|פטור)/g, ruling: null, category: 'obligation' },

    // =============================================================================
    // PERMISSION/PROHIBITION (היתר/איסור)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(מותר|אסור|מותרת|אסורה|מותרים|אסורים)/g, ruling: null, category: 'permission' },
    { regex: /ל([\u0590-\u05FF]+)\s+(מותר|אסור)/g, ruling: null, category: 'permission' },

    // =============================================================================
    // PURITY/IMPURITY (טהרה/טומאה)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(טהור|טמא|טהורה|טמאה|טהורים|טמאים)/g, ruling: null, category: 'purity' },

    // =============================================================================
    // VALIDITY (כשרות)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(כשר|פסול|כשרה|פסולה|כשרים|פסולים)/g, ruling: null, category: 'validity' },

    // =============================================================================
    // FULFILLMENT (יציאת חובה)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(יצא|לא\s+יצא|יצאה|לא\s+יצאה)/g, ruling: null, category: 'fulfillment' },
    { regex: /(?:יצא|לא\s+יצא)\s+ידי\s+חובת?\s+([\u0590-\u05FF]+)/g, ruling: null, category: 'fulfillment' },

    // =============================================================================
    // ACQUISITION (קניינים)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(קנה|לא\s+קנה|קנתה|לא\s+קנתה)/g, ruling: null, category: 'acquisition' },
    { regex: /([\u0590-\u05FF]+)\s+(זכה|לא\s+זכה|זכתה|לא\s+זכתה)/g, ruling: null, category: 'acquisition' },

    // =============================================================================
    // MARRIAGE/DIVORCE (קידושין וגירושין)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(מקודשת|אינה\s+מקודשת|מגורשת|אינה\s+מגורשת)/g, ruling: null, category: 'marriage' },

    // =============================================================================
    // UNRESOLVED/UNCERTAIN (ספק/תיקו)
    // =============================================================================
    { regex: /(תיקו)/g, ruling: 'תיקו', subject: 'בעיא', category: 'uncertain' },
    { regex: /ספק\s+([\u0590-\u05FF]+)/g, ruling: 'ספק', category: 'uncertain' },
    { regex: /צריך\s+עיון/g, ruling: 'צ"ע', subject: 'דין', category: 'uncertain' },
    { regex: /קשיא/g, ruling: 'קשיא', subject: 'קושיא', category: 'uncertain' },

    // =============================================================================
    // MONETARY (דיני ממונות)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(משלם|פטור\s+מלשלם|חייב\s+לשלם)/g, ruling: null, category: 'monetary' },
    { regex: /(נזק\s+שלם|חצי\s+נזק)/g, ruling: null, subject: 'נזיקין', category: 'monetary' },
  ];

  // Get icon for ruling
  const getIcon = (ruling, category) => {
    if (OUTCOME_ICONS[ruling]) return OUTCOME_ICONS[ruling];
    if (ruling?.includes('פטור') || ruling?.includes('לא')) return '🟢';
    if (ruling?.includes('חייב') || ruling?.includes('אסור')) return '🔴';
    if (ruling?.includes('מותר') || ruling?.includes('יצא') || ruling?.includes('קנה')) return '✅';
    if (ruling?.includes('ספק') || ruling?.includes('תיקו')) return '🟡';
    if (category === 'purity') return '💧';
    if (category === 'monetary') return '💰';
    return '⚪';
  };

  patterns.forEach(({ regex, ruling: fixedRuling, subject: fixedSubject, category }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Avoid duplicates near same position
      const posKey = Math.floor(match.index / 40);
      if (seenPositions.has(posKey)) continue;
      seenPositions.add(posKey);

      const subject = fixedSubject || match[1]?.trim() || '';
      const ruling = fixedRuling || match[2]?.trim().replace(/ים$|ות$/, '') || '';

      // Normalize ruling
      let normalizedRuling = ruling;
      if (ruling.includes('פטור')) normalizedRuling = 'פטור';
      else if (ruling.includes('חייב') && !ruling.includes('לשלם')) normalizedRuling = 'חייב';
      else if (ruling.includes('לא יצא')) normalizedRuling = 'לא יצא';
      else if (ruling.includes('לא קנה')) normalizedRuling = 'לא קנה';
      else if (ruling.includes('אינה')) normalizedRuling = ruling.includes('מקודשת') ? 'אינה מקודשת' : 'אינה מגורשת';

      if (subject && normalizedRuling) {
        rulings.push({
          subject,
          ruling: normalizedRuling,
          position: match.index,
          fullMatch: match[0].slice(0, 50),
          category,
          icon: getIcon(normalizedRuling, category)
        });
      }
    }
  });

  // Sort by position and dedupe
  return rulings
    .sort((a, b) => a.position - b.position)
    .slice(0, 15);  // Increased limit for PRO SCHOLAR
}

/**
 * PRO SCHOLAR - Extract discourse elements (questions, objections, proofs, conclusions)
 * @param {string} text - Talmud text to analyze
 * @returns {{ questions: Array, objections: Array, proofs: Array, conclusions: Array }}
 */
function extractDiscourseElements(text) {
  const elements = { questions: [], objections: [], proofs: [], conclusions: [] };

  // Question patterns (שאלות)
  const questionPatterns = [
    { regex: /מאי\s+([^?。.]{5,50})/g, type: 'definition' },
    { regex: /מנלן\s*[?]?\s*([^。.]{5,40})/g, type: 'source' },
    { regex: /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{5,40})/g, type: 'source' },
    { regex: /היכי\s+דמי\s*[?]?\s*([^。.]{5,35})/g, type: 'case' },
    { regex: /מאי\s+טעמא\s*[?]?\s*([^。.]{5,40})/g, type: 'reason' },
    { regex: /למאי\s+נפקא\s+מינה\s*[?]?\s*([^。.]{5,40})/g, type: 'practical' },
    { regex: /איבעיא\s+להו\s*[:]?\s*([^。.]{10,60})/g, type: 'inquiry' },
    { regex: /בעי\s+([\u0590-\u05FF]+)\s*[:]?\s*([^。.]{5,40})/g, type: 'question' },
    { regex: /מאי\s+שנא\s+([^。.]{5,40})/g, type: 'distinction' },
    { regex: /פשיטא\s*[!]?\s*([^。.]{5,35})/g, type: 'obvious' },
  ];

  // Objection patterns (קושיות)
  const objectionPatterns = [
    { regex: /מיתיבי\s*[:]?\s*([^。.]{10,60})/g, type: 'objection' },
    { regex: /ורמינהו\s*[:]?\s*([^。.]{10,60})/g, type: 'contradiction' },
    { regex: /והתניא\s*[:]?\s*([^。.]{10,60})/g, type: 'challenge' },
    { regex: /והאמר\s+(\S+)\s*[:]?\s*([^。.]{10,50})/g, type: 'challenge' },
    { regex: /ולא\s+פליגי\s*[?]?\s*([^。.]{5,40})/g, type: 'question' },
  ];

  // Proof patterns (ראיות)
  const proofPatterns = [
    { regex: /שנאמר\s*[":״]?\s*([^"״\n]{5,60})/g, type: 'verse' },
    { regex: /דכתיב\s*[":״]?\s*([^"״\n]{5,60})/g, type: 'verse' },
    { regex: /תנן\s*[:]?\s*([^。.]{10,80})/g, type: 'mishna' },
    { regex: /תניא\s*[:]?\s*([^。.]{10,80})/g, type: 'baraita' },
    { regex: /תנו\s+רבנן\s*[:]?\s*([^。.]{10,80})/g, type: 'baraita' },
    { regex: /כדתנן\s*[:]?\s*([^。.]{10,60})/g, type: 'mishna_citation' },
    { regex: /כדאמרינן\s*[:]?\s*([^。.]{10,60})/g, type: 'gemara_citation' },
  ];

  // Conclusion patterns (מסקנות)
  const conclusionPatterns = [
    { regex: /שמע\s+מינה\s*[:]?\s*([^。.]{10,60})/g, type: 'inference' },
    { regex: /הלכה\s+כ?([^。.]{5,40})/g, type: 'halacha' },
    { regex: /הלכתא\s+([^。.]{5,40})/g, type: 'halacha' },
    { regex: /והלכתא\s+([^。.]{5,40})/g, type: 'final_halacha' },
    { regex: /למעשה\s+([^。.]{5,40})/g, type: 'practical' },
    { regex: /לא\s+קשיא\s*[:]?\s*([^。.]{10,60})/g, type: 'resolution' },
    { regex: /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{10,60})/g, type: 'case_distinction' },
    { regex: /שאני\s+([^。.]{5,40})/g, type: 'distinction' },
    { regex: /אלמא\s+([^。.]{5,40})/g, type: 'therefore' },
    { regex: /מכלל\s+ד([^。.]{5,40})/g, type: 'implication' },
  ];

  // Helper to extract patterns
  const extractPatterns = (patterns, targetArray) => {
    patterns.forEach(({ regex, type }) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const content = (match[1] || match[2])?.trim();
        if (content && content.length > 5) {
          targetArray.push({
            text: content,
            position: match.index,
            type,
            fullMatch: match[0].slice(0, 60)
          });
        }
      }
    });
  };

  // Extract all discourse elements
  extractPatterns(questionPatterns, elements.questions);
  extractPatterns(objectionPatterns, elements.objections);
  extractPatterns(proofPatterns, elements.proofs);
  extractPatterns(conclusionPatterns, elements.conclusions);

  // Sort all by position
  Object.values(elements).forEach(arr => arr.sort((a, b) => a.position - b.position));

  // Dedupe (remove items too close together)
  Object.keys(elements).forEach(key => {
    const seen = new Set();
    elements[key] = elements[key].filter(item => {
      const posKey = Math.floor(item.position / 30);
      if (seen.has(posKey)) return false;
      seen.add(posKey);
      return true;
    });
  });

  return elements;
}

/**
 * Extract real content from Talmud text using patterns
 * @private Reserved for future summary diagram enhancements
 */
// eslint-disable-next-line no-unused-vars
function extractRealContent(text) {
  const result = {
    topics: [],
    questions: [],
    proofs: [],
    objections: [],
    resolutions: [],
    conclusions: []
  };

  // Helper to extract matches
  const extractMatches = (patterns, targetArray) => {
    patterns.forEach(({ pattern, type, label }) => {
      pattern.lastIndex = 0; // Reset regex
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = match[1]?.trim();
        if (content && content.length > 3) {
          targetArray.push({
            content,
            type,
            label,
            position: match.index
          });
        }
      }
    });
  };

  // Extract each category
  extractMatches(CONTENT_PATTERNS.topics, result.topics);
  extractMatches(CONTENT_PATTERNS.questions, result.questions);
  extractMatches(CONTENT_PATTERNS.proofs, result.proofs);
  extractMatches(CONTENT_PATTERNS.objections, result.objections);
  extractMatches(CONTENT_PATTERNS.resolutions, result.resolutions);
  extractMatches(CONTENT_PATTERNS.conclusions, result.conclusions);

  // Sort each by position
  Object.values(result).forEach(arr => {
    arr.sort((a, b) => a.position - b.position);
  });

  // Remove duplicates within each category
  Object.keys(result).forEach(key => {
    const seen = new Set();
    result[key] = result[key].filter(item => {
      const normalized = item.content.slice(0, 30);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  });

  return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract speaker names from Talmud text with enhanced pattern recognition
 * @returns {Array<{name: string, type: string, position: number, context?: string}>}
 */
function extractSpeakersFromText(dafContent) {
  const speakers = [];
  const seenAtPosition = new Set();

  const text = Array.isArray(dafContent?.hebrew)
    ? dafContent.hebrew.join(' ')
    : (typeof dafContent?.hebrew === 'string' ? dafContent.hebrew : '');

  if (!text) return speakers;

  // Apply all speaker patterns
  SPEAKER_PATTERNS.forEach(({ pattern, type }) => {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Get all captured groups (may be multiple speakers in dispute patterns)
      for (let i = 1; i < match.length; i++) {
        const rawSpeaker = match[i]?.trim();
        if (!rawSpeaker || rawSpeaker.length < 2) continue;

        // Skip discourse markers that aren't actual speakers
        if (['תנן', 'תנא', 'תניא', 'מיתיבי', 'איתמר', 'לימא כתנאי', 'דתנן', 'דתניא', 'מתני׳', 'גמ׳'].includes(rawSpeaker)) {
          continue;
        }

        // Normalize the speaker name
        const speaker = normalizeSpeakerName(rawSpeaker);

        // Create unique key to avoid duplicates at same position
        const positionKey = `${match.index}-${speaker}`;
        if (seenAtPosition.has(positionKey)) continue;
        seenAtPosition.add(positionKey);

        // Get surrounding context (20 chars before and after)
        const contextStart = Math.max(0, match.index - 20);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
        const context = text.slice(contextStart, contextEnd);

        speakers.push({
          name: speaker,
          rawName: rawSpeaker,
          type,
          position: match.index,
          context: context.trim()
        });
      }
    }
  });

  // PRO SCHOLAR V13: Fallback - Direct sage name detection
  // This catches sages mentioned without standard patterns
  const seenNames = new Set(speakers.map(s => s.name));

  DIRECT_SAGE_NAMES.forEach(sageName => {
    // Skip if already found via patterns
    if (seenNames.has(sageName)) return;

    // Look for this sage name in the text
    const regex = new RegExp(sageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const positionKey = `direct-${match.index}-${sageName}`;
      if (seenAtPosition.has(positionKey)) continue;
      seenAtPosition.add(positionKey);

      // Get surrounding context
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(text.length, match.index + sageName.length + 20);
      const context = text.slice(contextStart, contextEnd);

      speakers.push({
        name: sageName,
        rawName: sageName,
        type: 'direct_mention',
        position: match.index,
        context: context.trim()
      });

      seenNames.add(sageName);
    }
  });

  // Sort by position in text
  speakers.sort((a, b) => a.position - b.position);

  return speakers;
}

/**
 * Normalize speaker name using known abbreviations and variations
 */
function normalizeSpeakerName(name) {
  // Check normalization map first
  if (SPEAKER_NORMALIZATION[name]) {
    return SPEAKER_NORMALIZATION[name];
  }

  // Clean up common issues
  let normalized = name
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .trim();

  return normalized;
}

/**
 * Extract disputes (מחלוקות) from text
 * @returns {Array<{speakers: string[], topic?: string, position: number}>}
 */
function extractDisputes(text) {
  const disputes = [];

  // Pattern: X אמר ... Y אמר (consecutive statements = dispute)
  const consecutivePattern = /(?:אמר|א"ר)\s+(\S+)[^א]*?(?:ו?אמר|א"ר)\s+(\S+)/g;

  // Pattern: פליגי בה X ו-Y
  const explicitPattern = /(רב[יא]?\s+\S+)\s+ו?(רב[יא]?\s+\S+)\s+(?:פליגי|איפליגו)/g;

  // Pattern: איתמר ... X אמר ... Y אמר
  const eitmarPattern = /איתמר[^:]*(?:אמר|א"ר)\s+(\S+)[^:]*?(?:ו?אמר|א"ר)\s+(\S+)/g;

  // Pattern: מר אמר ... ומר אמר (Mar said... and Mar said)
  const marPattern = /מר\s+אמר[^מ]*מר\s+אמר/g;

  [consecutivePattern, explicitPattern, eitmarPattern, marPattern].forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const speakers = [];
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          speakers.push(normalizeSpeakerName(match[i].trim()));
        }
      }
      if (speakers.length >= 2) {
        disputes.push({
          speakers: [...new Set(speakers)],  // Remove duplicates
          position: match.index,
          fullMatch: match[0].slice(0, 100)  // First 100 chars for context
        });
      }
    }
  });

  return disputes;
}

/**
 * Get simple list of speaker names (backwards compatible)
 * @private Reserved for backwards compatibility
 */
// eslint-disable-next-line no-unused-vars
function extractSpeakerNames(dafContent) {
  return extractSpeakersFromText(dafContent)
    .map(s => s.name)
    .filter((name, i, arr) => arr.indexOf(name) === i);  // Unique names
}

/**
 * Find rabbi data from RABBI_DATABASE - PRO SCHOLAR V13 Enhanced
 * Uses multiple matching strategies for better coverage
 */
function findRabbiData(hebrewName) {
  if (!hebrewName) return null;

  // Normalize the input name
  const normalized = normalizeHebrew(hebrewName);
  const trimmed = hebrewName.trim();

  // Strategy 1: Exact match
  if (RABBI_DATABASE?.tannaim?.[trimmed]) {
    return { ...RABBI_DATABASE.tannaim[trimmed], period: 'tanna', matchType: 'exact' };
  }
  if (RABBI_DATABASE?.amoraim?.[trimmed]) {
    return { ...RABBI_DATABASE.amoraim[trimmed], period: 'amora', matchType: 'exact' };
  }

  // Strategy 2: Check normalization map
  const normalizedName = SPEAKER_NORMALIZATION[trimmed];
  if (normalizedName) {
    if (RABBI_DATABASE?.tannaim?.[normalizedName]) {
      return { ...RABBI_DATABASE.tannaim[normalizedName], period: 'tanna', matchType: 'normalized' };
    }
    if (RABBI_DATABASE?.amoraim?.[normalizedName]) {
      return { ...RABBI_DATABASE.amoraim[normalizedName], period: 'amora', matchType: 'normalized' };
    }
  }

  // Build combined database for fuzzy matching
  const allRabbis = {
    ...(RABBI_DATABASE?.tannaim || {}),
    ...(RABBI_DATABASE?.amoraim || {})
  };

  // Strategy 3: Partial/substring match
  for (const [key, data] of Object.entries(allRabbis)) {
    // Check if input contains the database key or vice versa
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return { ...data, period: data.period || 'unknown', matchType: 'partial' };
    }
  }

  // Strategy 4: Normalized comparison (ignore final letters, geresh, etc.)
  for (const [key, data] of Object.entries(allRabbis)) {
    const keyNormalized = normalizeHebrew(key);
    if (normalized === keyNormalized || normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return { ...data, period: data.period || 'unknown', matchType: 'normalized_fuzzy' };
    }
  }

  // Strategy 5: First word match (for names like "רבי יהודה" matching "רבי יהודה הנשיא")
  const firstTwoWords = trimmed.split(/\s+/).slice(0, 2).join(' ');
  if (firstTwoWords !== trimmed) {
    for (const [key, data] of Object.entries(allRabbis)) {
      if (key.startsWith(firstTwoWords) || firstTwoWords.startsWith(key)) {
        return { ...data, period: data.period || 'unknown', matchType: 'prefix' };
      }
    }
  }

  // Strategy 6: Handle common patterns not in database
  // These are "inferred" sages based on naming patterns
  if (/^רבי\s+\S+/.test(trimmed)) {
    return {
      name: trimmed,
      period: 'tanna', // Assume Tanna if "רבי"
      generation: null,
      matchType: 'inferred_tanna'
    };
  }
  if (/^רב\s+\S+/.test(trimmed) && !trimmed.startsWith('רבי')) {
    return {
      name: trimmed,
      period: 'amora', // Assume Amora if "רב" without "י"
      generation: null,
      matchType: 'inferred_amora'
    };
  }

  return null;
}

/**
 * Detect discourse patterns in text
 */
function detectDiscoursePatterns(text) {
  const patterns = [];

  Object.entries(DISCOURSE_PATTERNS).forEach(([key, config]) => {
    if (!config.markers) return;

    config.markers.forEach(marker => {
      if (text.includes(marker)) {
        patterns.push({
          type: key,
          marker,
          discourseType: config.type
        });
      }
    });
  });

  // Sort by typical order in sugya
  const typeOrder = {
    [DISCOURSE_TYPES.MISHNA]: 1,
    [DISCOURSE_TYPES.GEMARA]: 2,
    [DISCOURSE_TYPES.SOURCE_CITATION]: 3,
    [DISCOURSE_TYPES.QUESTION]: 4,
    [DISCOURSE_TYPES.OBJECTION]: 5,
    [DISCOURSE_TYPES.PROOF]: 6,
    [DISCOURSE_TYPES.RESOLUTION]: 7,
    [DISCOURSE_TYPES.LEGAL_RULING]: 8
  };

  return patterns.sort((a, b) =>
    (typeOrder[a.discourseType] || 99) - (typeOrder[b.discourseType] || 99)
  );
}

/**
 * Extract commentator name from a reference
 */
function extractCommentatorName(ref) {
  const patterns = [
    /^(Rashi|Tosafot|Rashbam|Ritva|Rashba|Ran|Rosh|Maharsha|Maharal|Meiri)/i,
    /^Rabbeinu\s+(Chananel|Gershom)/i
  ];

  for (const pattern of patterns) {
    const match = ref.match(pattern);
    if (match) return match[0];
  }

  for (const name of TALMUD_COMMENTATORS) {
    if (ref.toLowerCase().includes(name.toLowerCase())) {
      return name;
    }
  }

  return null;
}

/**
 * Shorten a reference for display
 */
function shortenRef(ref) {
  if (!ref) return '';

  const shortcuts = {
    'Genesis': 'Gen', 'Exodus': 'Ex', 'Leviticus': 'Lev',
    'Numbers': 'Num', 'Deuteronomy': 'Deut',
    'Shabbat': 'Shab', 'Berakhot': 'Ber', 'Sanhedrin': 'San',
    'Bava Kamma': 'BK', 'Bava Metzia': 'BM', 'Bava Batra': 'BB'
  };

  let short = ref;
  Object.entries(shortcuts).forEach(([full, abbr]) => {
    short = short.replace(full, abbr);
  });

  return short.length > 20 ? short.substring(0, 17) + '...' : short;
}

/**
 * Generate explanation text - PRO SCHOLAR V13 Hebrew enhanced
 */
function generateExplanation(tractate, daf, stats, type) {
  // PRO SCHOLAR V13: Hebrew type labels
  const typeLabels = {
    'Overview': 'סקירה',
    'Summary': 'סיכום',
    'Flow': 'מהלך',
    'Speakers': 'חכמים'
  };

  const hebrewType = typeLabels[type] || type;
  const parts = [`${hebrewType}: ${tractate} ${daf}`];

  if (stats.commentators > 0) parts.push(`${stats.commentators} מפרשים`);
  if (stats.speakers > 0) parts.push(`${stats.speakers} חכמים`);
  if (stats.verses > 0) parts.push(`${stats.verses} פסוקים`);
  if (stats.parallels > 0) parts.push(`${stats.parallels} מקבילות`);

  return parts.join(' • ');
}

/**
 * Generate Mermaid for overview diagram
 */
function generateOverviewMermaid(subgraph, centerRef, direction = 'TB') {
  const lines = [`graph ${direction}`];

  lines.push('  %% Node styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px,font-weight:bold');
  lines.push('  classDef rabbi fill:#dbeafe,stroke:#2563eb,stroke-width:2px');
  lines.push('  classDef verse fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef parallel fill:#fae8ff,stroke:#c026d3');
  lines.push('  classDef speaker fill:#fed7aa,stroke:#ea580c');

  const nodeIds = new Map();

  subgraph.nodes.forEach((node, index) => {
    const safeId = `n${index}`;
    nodeIds.set(node.id, safeId);

    const label = (node.data?.label || node.label || node.id)
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    let shape, className;

    if (node.id === centerRef) {
      shape = `${safeId}[["${label}"]]`;
      className = 'daf';
    } else if (node.data?.nodeType === 'speaker') {
      shape = `${safeId}(("${label}"))`;
      className = 'speaker';
    } else if (node.type === ENTITY_TYPES.RABBI || node.data?.nodeType === 'commentator') {
      shape = `${safeId}{{"${label}"}}`;
      className = 'rabbi';
    } else if (node.data?.type === 'biblical_verse') {
      shape = `${safeId}(["${label}"])`;
      className = 'verse';
    } else if (node.data?.type === 'talmud_parallel') {
      shape = `${safeId}[/"${label}"/]`;
      className = 'parallel';
    } else {
      shape = `${safeId}["${label}"]`;
      className = 'verse';
    }

    lines.push(`  ${shape}`);
    lines.push(`  class ${safeId} ${className}`);
  });

  const edgeLabels = {
    [RELATIONSHIP_TYPES.EXPLAINS]: 'מפרש',
    [RELATIONSHIP_TYPES.CITES]: 'מצטט',
    [RELATIONSHIP_TYPES.PARALLEL]: 'מקביל',
    [RELATIONSHIP_TYPES.STUDENT_OF]: 'תלמיד',
    [RELATIONSHIP_TYPES.DISAGREES]: 'חולק',
    'speaks_on': 'אומר'
  };

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      const label = edgeLabels[edge.relationship] || '';
      const style = edge.relationship === RELATIONSHIP_TYPES.DISAGREES ? '-.-x' :
                    edge.relationship === RELATIONSHIP_TYPES.PARALLEL ? '<-->' : '-->';

      if (label) {
        lines.push(`  ${sourceId} ${style}|${label}| ${targetId}`);
      } else {
        lines.push(`  ${sourceId} ${style} ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

export async function* generateDafDiagramsRange(tractate, startDaf, endDaf, options = {}) {
  const dafim = generateDafRange(startDaf, endDaf);

  for (const daf of dafim) {
    try {
      const result = await generateDafDiagram(tractate, daf, options);
      yield { daf, result, success: true };
    } catch (error) {
      yield { daf, error: error.message, success: false };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function generateDafRange(start, end) {
  const dafim = [];
  const parseRef = (ref) => {
    const match = ref.match(/(\d+)([ab])/);
    return match ? { num: parseInt(match[1]), side: match[2] } : null;
  };

  const startParsed = parseRef(start);
  const endParsed = parseRef(end);

  if (!startParsed || !endParsed) return [start];

  let current = { ...startParsed };

  while (current.num < endParsed.num ||
         (current.num === endParsed.num &&
          (current.side === 'a' || current.side === endParsed.side))) {
    dafim.push(`${current.num}${current.side}`);

    if (current.side === 'a') {
      current.side = 'b';
    } else {
      current.num++;
      current.side = 'a';
    }

    if (dafim.length > 500) break;
  }

  return dafim;
}

// =============================================================================
// COMMENTATOR NETWORK DIAGRAM
// =============================================================================

export function generateCommentatorNetworkDiagram(commentators = null) {
  clearGraph();

  const selectedCommentators = commentators || Object.keys(RABBINIC_NETWORK);

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    addNode(name, ENTITY_TYPES.RABBI, {
      label: `${data.icon || '📜'} ${name}`,
      period: data.period,
      dates: data.dates,
      style: data.style
    });
  });

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    data.teachers?.forEach(teacher => {
      if (selectedCommentators.includes(teacher)) {
        addEdge(name, teacher, RELATIONSHIP_TYPES.STUDENT_OF);
      }
    });

    data.disagreesWith?.forEach(other => {
      if (selectedCommentators.includes(other)) {
        addEdge(name, other, RELATIONSHIP_TYPES.DISAGREES);
      }
    });
  });

  const subgraph = {
    nodes: selectedCommentators
      .map(name => ({ id: name, type: ENTITY_TYPES.RABBI, data: RABBINIC_NETWORK[name] }))
      .filter(n => n.data),
    edges: []
  };

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    data.teachers?.forEach(teacher => {
      if (selectedCommentators.includes(teacher)) {
        subgraph.edges.push({
          source: name,
          target: teacher,
          relationship: RELATIONSHIP_TYPES.STUDENT_OF
        });
      }
    });

    data.disagreesWith?.forEach(other => {
      if (selectedCommentators.includes(other)) {
        subgraph.edges.push({
          source: name,
          target: other,
          relationship: RELATIONSHIP_TYPES.DISAGREES
        });
      }
    });
  });

  return generateCommentatorMermaid(subgraph);
}

function generateCommentatorMermaid(subgraph) {
  const lines = ['graph TB'];

  lines.push('  classDef tannaim fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef rishonim fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef acharonim fill:#dbeafe,stroke:#2563eb');

  const nodeIds = new Map();
  const byPeriod = { Tannaim: [], Rishonim: [], Acharonim: [], Other: [] };

  subgraph.nodes.forEach((node, index) => {
    const safeId = `r${index}`;
    nodeIds.set(node.id, safeId);

    const data = node.data || {};
    const label = `${data.icon || '📜'} ${node.id}`;
    const period = data.period || 'Other';

    if (byPeriod[period]) {
      byPeriod[period].push({ safeId, label, period });
    } else {
      byPeriod.Other.push({ safeId, label, period: 'Other' });
    }
  });

  Object.entries(byPeriod).forEach(([period, nodes]) => {
    if (nodes.length === 0) return;

    lines.push(`  subgraph ${period}`);
    nodes.forEach(({ safeId, label }) => {
      lines.push(`    ${safeId}{{"${label}"}}`);
    });
    lines.push('  end');
  });

  subgraph.nodes.forEach((node, index) => {
    const safeId = `r${index}`;
    const period = (node.data?.period || '').toLowerCase();

    if (period.includes('tanna')) {
      lines.push(`  class ${safeId} tannaim`);
    } else if (period.includes('rishon')) {
      lines.push(`  class ${safeId} rishonim`);
    } else if (period.includes('acharon')) {
      lines.push(`  class ${safeId} acharonim`);
    }
  });

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      if (edge.relationship === RELATIONSHIP_TYPES.STUDENT_OF) {
        lines.push(`  ${sourceId} -->|student| ${targetId}`);
      } else if (edge.relationship === RELATIONSHIP_TYPES.DISAGREES) {
        lines.push(`  ${sourceId} -.-x|disagrees| ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}

// =============================================================================
// PRO SCHOLAR EXPORTS
// =============================================================================

const talmudDiagramService = {
  // Main function
  generateDafDiagram,

  // Specific diagram types (8 types)
  generateOverviewDiagram,
  generateSugyaFlowDiagram,
  generateSpeakerNetworkDiagram,
  generateTimelineDiagram,
  generateHalachicChainDiagram,
  generateConceptMapDiagram,
  generateMachloketDiagram,
  generateSummaryDiagram,

  // Batch & network
  generateDafDiagramsRange,
  generateCommentatorNetworkDiagram,

  // Cache management
  clearDiagramCache,
  getCacheStats,

  // PRO SCHOLAR Utilities
  extractSpeakersFromText,
  extractDisputes,
  extractRulingsDynamic,
  extractDiscourseElements,
  stripNikud,
  normalizeHebrew,
  cleanForMermaid,
  validateMermaidSyntax,

  // TF-IDF Text Summarization (PRO SCHOLAR - No AI Required)
  extractKeyTermsTfIdf,
  extractKeySegments,
  summarizeText,

  // Constants
  TALMUD_COMMENTATORS,
  DIAGRAM_TYPES,
  SPEAKER_PATTERNS,
  HALACHIC_OUTCOMES,
  OUTCOME_ICONS
};

export default talmudDiagramService;
