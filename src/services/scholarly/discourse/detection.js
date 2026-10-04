// discoursePatternService — Détection des marqueurs de discours + visualisation de flux (split phase 2, 03/10/2026)
import {
  DISCOURSE_TYPES,
  DISCOURSE_PATTERNS,
  RABBI_PATTERNS,
  TALMUDIC_PATTERNS
} from './discourseData';
import { stripAllDiacritics as stripNikudLocal } from '../../../utils/hebrewUtils';

export function detectDiscoursePatterns(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];
  const seenPositions = new Set(); // Prevent duplicate detections

  for (const [patternKey, config] of Object.entries(DISCOURSE_PATTERNS)) {
    for (const marker of config.markers) {
      // Create regex that handles word boundaries for Hebrew
      // Use negative lookbehind/lookahead for Hebrew letters
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedMarker, 'g');

      let match;
      while ((match = regex.exec(text)) !== null) {
        const position = match.index;
        const posKey = `${position}-${position + match[0].length}`;

        // Skip if we've already detected something at this position
        if (seenPositions.has(posKey)) continue;
        seenPositions.add(posKey);

        results.push({
          type: config.type,
          patternKey,
          marker: match[0],
          position,
          endPosition: position + match[0].length,
          label: config.label,
          hebrewLabel: config.hebrewLabel,
          icon: config.icon,
          color: config.color,
          description: config.description,
          cssClass: config.cssClass,
          // Context: surrounding text
          context: text.slice(Math.max(0, position - 20), Math.min(text.length, position + match[0].length + 30))
        });
      }
    }
  }

  // Sort by position
  return results.sort((a, b) => a.position - b.position);
}

/**
 * Detect Rabbi attributions in text
 *
 * CONTRAT DIFFÉRENT de namedEntityService.detectRabbis : celle-ci est
 * structurelle (patternKey/type/position, pour le flux du discours via
 * analyzeDiscourseStructure) ; celle de namedEntityService est enrichie
 * (RABBI_DATABASE : english/period/generation/location — pour
 * UnifiedSugyaAnalysis et TalmudBrowsers). Deux usages, pas un doublon.
 *
 * @param {string} text - The text to analyze
 * @returns {Array} Array of detected rabbi mentions
 */
export function detectRabbis(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];

  for (const [patternKey, config] of Object.entries(RABBI_PATTERNS)) {
    let match;
    while ((match = config.pattern.exec(text)) !== null) {
      results.push({
        patternKey,
        type: config.type,
        match: match[0],
        name: match[1] || match[2], // Extract rabbi name
        position: match.index,
        endPosition: match.index + match[0].length,
        description: config.description
      });
    }
    // Reset regex lastIndex
    config.pattern.lastIndex = 0;
  }

  return results.sort((a, b) => a.position - b.position);
}

/**
 * Analyze the discourse structure of a text segment
 * Returns a high-level flow analysis
 * @param {string} text - Full text to analyze
 * @returns {Object} Structured analysis
 */
export function analyzeDiscourseStructure(text) {
  const patterns = detectDiscoursePatterns(text);
  const rabbis = detectRabbis(text);

  // Group patterns by type
  const byType = {};
  for (const p of patterns) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  // Determine primary structure
  const hasMishna = byType[DISCOURSE_TYPES.MISHNA]?.length > 0;
  const hasGemara = byType[DISCOURSE_TYPES.GEMARA]?.length > 0;
  const questionCount = byType[DISCOURSE_TYPES.QUESTION]?.length || 0;
  const objectionCount = byType[DISCOURSE_TYPES.OBJECTION]?.length || 0;
  const proofCount = byType[DISCOURSE_TYPES.PROOF]?.length || 0;
  const resolutionCount = byType[DISCOURSE_TYPES.RESOLUTION]?.length || 0;

  // Calculate complexity score
  const complexityScore = questionCount + objectionCount * 2 + proofCount + resolutionCount;

  // Build flow summary
  const flowSteps = [];
  let currentPosition = 0;

  for (const pattern of patterns) {
    if (pattern.position >= currentPosition) {
      flowSteps.push({
        type: pattern.type,
        label: pattern.label,
        icon: pattern.icon,
        color: pattern.color,
        position: pattern.position,
        marker: pattern.marker
      });
      currentPosition = pattern.endPosition;
    }
  }

  return {
    hasMishna,
    hasGemara,
    structure: hasMishna && hasGemara ? 'sugya' : hasGemara ? 'gemara-only' : 'mishna-only',
    statistics: {
      totalPatterns: patterns.length,
      questions: questionCount,
      objections: objectionCount,
      proofs: proofCount,
      resolutions: resolutionCount,
      rabbiMentions: rabbis.length
    },
    complexityScore,
    complexityLevel: complexityScore < 3 ? 'simple' : complexityScore < 8 ? 'moderate' : 'complex',
    flowSteps,
    allPatterns: patterns,
    rabbis,
    byType
  };
}

/**
 * Get highlighted HTML for text with discourse markers
 * @param {string} text - Original text
 * @param {Array} patterns - Detected patterns (from detectDiscoursePatterns)
 * @returns {string} HTML with span markers
 */
export function getHighlightedText(text, patterns = null) {
  if (!text) return '';

  const detectedPatterns = patterns || detectDiscoursePatterns(text);
  if (detectedPatterns.length === 0) return text;

  // Sort patterns by position (descending) to insert from end to start
  const sortedPatterns = [...detectedPatterns].sort((a, b) => b.position - a.position);

  let result = text;
  for (const p of sortedPatterns) {
    const before = result.slice(0, p.position);
    const marker = result.slice(p.position, p.endPosition);
    const after = result.slice(p.endPosition);

    // Create span with data attributes
    const span = `<span class="discourse-marker ${p.cssClass}"
      data-type="${p.type}"
      data-label="${p.label}"
      data-icon="${p.icon}"
      style="background-color: ${p.color}20; border-bottom: 2px solid ${p.color};"
      title="${p.description}">${marker}</span>`;

    result = before + span + after;
  }

  return result;
}

/**
 * Get a visual flow diagram data structure
 * @param {string} text - Text to analyze
 * @returns {Array} Flow diagram nodes
 */
export function getFlowDiagram(text) {
  const analysis = analyzeDiscourseStructure(text);

  const nodes = [];
  let currentType = null;
  let nodeId = 0;

  for (const step of analysis.flowSteps) {
    // Group consecutive same-type patterns
    if (step.type !== currentType) {
      nodes.push({
        id: `node-${nodeId++}`,
        type: step.type,
        label: step.label,
        icon: step.icon,
        color: step.color,
        items: [step.marker]
      });
      currentType = step.type;
    } else {
      // Add to existing node
      nodes[nodes.length - 1].items.push(step.marker);
    }
  }

  return {
    nodes,
    structure: analysis.structure,
    complexity: analysis.complexityLevel,
    statistics: analysis.statistics
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if text contains any Talmudic discourse markers
 * @param {string} text
 * @returns {boolean}
 */
export function hasTalmudicStructure(text) {
  const patterns = detectDiscoursePatterns(text);
  return patterns.length > 0;
}

/**
 * Get discourse pattern summary for a text
 * @param {string} text
 * @returns {Object} Summary with counts
 */
export function getPatternSummary(text) {
  const analysis = analyzeDiscourseStructure(text);
  return {
    isTalmudic: analysis.totalPatterns > 0,
    structure: analysis.structure,
    complexity: analysis.complexityLevel,
    ...analysis.statistics
  };
}

/**
 * Get all available pattern types
 * @returns {Object} Pattern types configuration
 */
export function getPatternTypes() {
  return DISCOURSE_TYPES;
}

/**
 * Get pattern configuration by key
 * @param {string} patternKey
 * @returns {Object|null} Pattern configuration
 */
export function getPatternConfig(patternKey) {
  return DISCOURSE_PATTERNS[patternKey] || null;
}


// =============================================================================
// SIMPLIFIED STRUCTURAL MARKER DETECTION
// Returns flat array of markers with positions and styling info
// =============================================================================

/**
 * Strip Hebrew nikud (vowel marks) from text for pattern matching
 * @param {string} text - Text with potential nikud
 * @returns {string} Text without nikud
 */
// DRY: stripNikudLocal imported as alias from hebrewUtils.js

/**
 * Detect structural markers in Hebrew text (simplified API)
 * Returns markers sorted by position with styling information
 * PRO SCHOLAR: Now strips nikud for better matching with Sefaria text
 * @param {string} hebrewText - The text to analyze
 * @returns {Array} Array of detected markers with position, type, color, label
 */
export function detectStructuralMarkers(hebrewText) {
  if (!hebrewText || typeof hebrewText !== 'string') return [];

  const results = [];
  const seenPositions = new Set();

  // Strip nikud from input text for matching
  const cleanText = stripNikudLocal(hebrewText);

  // PRO SCHOLAR V28: Build position mapping from clean text to original text
  // This fixes the nikud position alignment issue where positions don't match
  const cleanToOriginal = [];
  let cleanIdx = 0;
  for (let origIdx = 0; origIdx < hebrewText.length; origIdx++) {
    const char = hebrewText[origIdx];
    // Check if character is nikud/cantillation (will be stripped)
    if (!/[\u0591-\u05C7]/.test(char)) {
      cleanToOriginal[cleanIdx] = origIdx;
      cleanIdx++;
    }
  }
  // Add end mapping for slicing
  cleanToOriginal[cleanIdx] = hebrewText.length;

  for (const [type, config] of Object.entries(TALMUDIC_PATTERNS)) {
    for (const marker of config.markers) {
      // Also strip nikud from marker and normalize punctuation
      const cleanMarker = stripNikudLocal(marker);
      const escapedMarker = cleanMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedMarker, 'g');

      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        // Map clean text positions back to original text positions
        const origStart = cleanToOriginal[match.index] ?? match.index;
        const origEnd = cleanToOriginal[match.index + match[0].length] ?? (match.index + match[0].length);

        const posKey = `${origStart}`;
        if (seenPositions.has(posKey)) continue;
        seenPositions.add(posKey);

        // Get the original text at mapped position (with nikud) for display
        const originalMarker = hebrewText.slice(origStart, origEnd);

        // PRO SCHOLAR V23: Extract context after the marker (up to 60 chars or sentence end)
        const contextStart = origEnd;
        const contextEnd = Math.min(origEnd + 80, hebrewText.length);
        let contextText = hebrewText.slice(contextStart, contextEnd).trim();
        // Find natural break point (sentence end or colon)
        const breakMatch = contextText.match(/[.!?:]/);
        if (breakMatch && breakMatch.index > 10 && breakMatch.index < 60) {
          contextText = contextText.slice(0, breakMatch.index + 1);
        } else {
          contextText = contextText.slice(0, 50);
        }
        // Strip HTML if any
        contextText = contextText.replace(/<[^>]+>/g, '').trim();

        results.push({
          type,
          marker: originalMarker || cleanMarker,
          position: origStart,
          endPosition: origEnd,
          label: config.label,
          hebrewLabel: config.hebrewLabel,
          color: config.color,
          icon: config.icon,
          context: contextText // PRO SCHOLAR V23: Added context for better display
        });
      }
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

// =============================================================================
// DISCOURSE FLOW VISUALIZATION
// Generate ASCII/text-based flow diagram of Talmudic argumentation
// =============================================================================

/**
 * Generate a visual discourse flow diagram
 * Shows the structure of Talmudic argumentation in readable format
 * @param {string} text - The text to analyze
 * @returns {Object} Flow visualization with text and structured data
 */
export function generateDiscourseFlowVisualization(text) {
  const markers = detectStructuralMarkers(text);
  const analysis = analyzeDiscourseStructure(text);

  // Build ASCII visualization
  const lines = [];
  let indentLevel = 0;

  // Section border character
  const border = '─'.repeat(45);

  for (const marker of markers) {
    const indent = '   '.repeat(indentLevel);

    switch (marker.type) {
      case 'mishna':
        indentLevel = 0;
        lines.push('');
        lines.push(`📘 MISHNA (${marker.marker}) ${border}`);
        lines.push('   The basic law statement');
        break;

      case 'gemara':
        indentLevel = 0;
        lines.push('');
        lines.push(`📜 GEMARA (${marker.marker}) ${border}`);
        break;

      case 'question':
        indentLevel = Math.min(indentLevel + 1, 3);
        lines.push(`${indent}❓ Question (${marker.marker})`);
        lines.push(`${indent}   ${getQuestionDescription(marker.marker)}`);
        break;

      case 'objection':
        lines.push(`${indent}⚡ Challenge (${marker.marker})`);
        lines.push(`${indent}   ${getObjectionDescription(marker.marker)}`);
        break;

      case 'proof':
        lines.push(`${indent}✅ Proof (${marker.marker})`);
        lines.push(`${indent}   ${getProofDescription(marker.marker)}`);
        break;

      case 'resolution':
        indentLevel = Math.max(indentLevel - 1, 0);
        lines.push(`${indent}🎯 Resolution (${marker.marker})`);
        lines.push(`${indent}   ${getResolutionDescription(marker.marker)}`);
        break;

      case 'alternative':
        lines.push(`${indent}🔀 Alternative (${marker.marker})`);
        lines.push(`${indent}   Some say / Another version...`);
        break;

      case 'baraita':
        lines.push(`${indent}📋 Baraita (${marker.marker})`);
        lines.push(`${indent}   External Tannaitic source...`);
        break;

      case 'scripture':
        lines.push(`${indent}📖 Scripture (${marker.marker})`);
        lines.push(`${indent}   Biblical proof text...`);
        break;

      default:
        // Handle unknown marker types gracefully
        lines.push(`${indent}• ${marker.type} (${marker.marker})`);
        break;
    }
  }

  return {
    // ASCII text representation
    text: lines.join('\n'),

    // Structured flow for rendering
    flowSteps: markers.map((m, i) => ({
      id: `step-${i}`,
      type: m.type,
      marker: m.marker,
      label: m.label,
      hebrewLabel: m.hebrewLabel,
      icon: m.icon,
      color: m.color,
      position: m.position
    })),

    // Summary statistics
    summary: {
      structure: analysis.structure,
      complexity: analysis.complexityLevel,
      questionCount: markers.filter(m => m.type === 'question').length,
      objectionCount: markers.filter(m => m.type === 'objection').length,
      proofCount: markers.filter(m => m.type === 'proof').length,
      resolutionCount: markers.filter(m => m.type === 'resolution').length,
      totalMarkers: markers.length
    },

    // For layered coloring
    layers: {
      mishna: markers.filter(m => m.type === 'mishna'),
      gemara: markers.filter(m => m.type === 'gemara'),
      dialectic: markers.filter(m => ['question', 'objection', 'proof', 'resolution'].includes(m.type))
    }
  };
}

// Helper functions for flow descriptions
function getQuestionDescription(marker) {
  const descriptions = {
    'מאי': 'What is the meaning?',
    'מנא הני מילי': 'From where do we derive this?',
    'מאי טעמא': 'What is the reason?',
    'איבעיא להו': 'They raised a question...',
    'מאי בינייהו': 'What is the practical difference?',
    'מהו': 'What about...?',
    'מנלן': 'From where do we learn this?'
  };
  return descriptions[marker] || 'Question raised...';
}

function getObjectionDescription(marker) {
  const descriptions = {
    'מתקיף': 'Logical challenge raised...',
    'מתיבי': 'Objection from authoritative source...',
    'ורמינהו': 'But this contradicts...',
    'בשלמא': "It's fine according to X, but...",
    'אלא': 'Rather / But then...'
  };
  return descriptions[marker] || 'Challenge raised...';
}

function getProofDescription(marker) {
  const descriptions = {
    'תא שמע': 'Come and hear (proof from source)...',
    'שמע מינה': 'We can infer from this...',
    'תנא כוותיה': 'A Tanna supports this view...',
    'מסתברא': 'It is logical that...'
  };
  return descriptions[marker] || 'Proof cited...';
}

function getResolutionDescription(marker) {
  const descriptions = {
    'תיובתא': 'Conclusive refutation!',
    'מסתברא': 'The logical conclusion is...',
    'הלכתא': 'The halacha is...',
    'לא קשיא': 'There is no difficulty...',
    'הכי קאמר': 'This is what it means...'
  };
  return descriptions[marker] || 'Resolution...';
}

// =============================================================================
// LAYER COLORING FOR RENDERING
// Generate CSS styles for discourse layer highlighting
// =============================================================================

/**
 * Get CSS styles for discourse layer highlighting
 * @returns {string} CSS stylesheet string
 */
