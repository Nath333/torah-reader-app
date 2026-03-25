// =============================================================================
// Discourse Pattern Detection Service
// Detects Talmudic structural elements: Mishna/Gemara markers, questions,
// objections, proofs, resolutions, and speaker attributions
// =============================================================================

// PRO SCHOLAR V12: Use centralized Hebrew utilities (DRY - single source of truth)
import { stripAllDiacritics } from '../utils/hebrewUtils';

/**
 * Talmudic Discourse Pattern Types
 * Based on scholarly research of formulaic terms in Talmud Bavli
 */
export const DISCOURSE_TYPES = {
  MISHNA: 'mishna',
  GEMARA: 'gemara',
  QUESTION: 'question',
  OBJECTION: 'objection',
  PROOF: 'proof',
  RESOLUTION: 'resolution',
  ALTERNATIVE: 'alternative',
  SOURCE_CITATION: 'source_citation',
  SPEAKER: 'speaker',
  LEGAL_RULING: 'legal_ruling',
  NARRATIVE: 'narrative',
  EXPLICATION: 'explication'
};

/**
 * Pattern Configuration
 * Each pattern has markers, display info, and semantic meaning
 */
export const DISCOURSE_PATTERNS = {
  // ==========================================================================
  // STRUCTURAL MARKERS - Identify major text divisions
  // ==========================================================================
  mishna: {
    type: DISCOURSE_TYPES.MISHNA,
    markers: [
      'מתני׳', 'מתניתין', 'תנן', 'שנינו', 'תנינא', 'משנה',
      'מַתְנִי׳', 'מַתְנִיתִין'
    ],
    label: 'Mishna',
    hebrewLabel: 'משנה',
    icon: '📘',
    color: '#3B82F6', // Blue
    description: 'Mishnaic source text',
    cssClass: 'discourse-mishna'
  },

  gemara: {
    type: DISCOURSE_TYPES.GEMARA,
    markers: [
      'גמ׳', 'גמרא', 'גְּמָ׳', 'גְּמָרָא'
    ],
    label: 'Gemara',
    hebrewLabel: 'גמרא',
    icon: '📜',
    color: '#8B4513', // Brown
    description: 'Gemara discussion begins',
    cssClass: 'discourse-gemara'
  },

  // ==========================================================================
  // SOURCE INDICATORS - Where information comes from
  // ==========================================================================
  tannaitic_source: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'תנו רבנן', 'תנא', 'תניא', 't\'na', 'ת״ר',
      'תָּנוּ רַבָּנָן', 'תַּנְיָא'
    ],
    label: 'Baraita',
    hebrewLabel: 'ברייתא',
    icon: '📋',
    color: '#6366F1', // Indigo
    description: 'External Tannaitic source (Baraita/Tosefta)',
    cssClass: 'discourse-baraita'
  },

  // PRO SCHOLAR V25: Parallel Mishna citation - "We learned elsewhere"
  parallel_mishna: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'תנן התם', 'תְּנַן הָתָם', 'תנינא התם', 'הא תנן', 'הָא תְּנַן',
      'דתנן', 'דִּתְנַן', 'כדתנן', 'כִּדְתְנַן'
    ],
    label: 'Parallel Mishna',
    hebrewLabel: 'משנה מקבילה',
    icon: '📜',
    color: '#0EA5E9', // Sky blue
    description: 'Citation from another Mishna for comparison',
    cssClass: 'discourse-parallel'
  },

  amoraic_statement: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'איתמר', 'אמר מר', 'אִיתְּמַר', 'אָמַר מָר'
    ],
    label: 'Amoraic Statement',
    hebrewLabel: 'מימרא',
    icon: '💬',
    color: '#8B5CF6', // Purple
    description: 'Amoraic teaching or discussion',
    cssClass: 'discourse-amoraic'
  },

  // ==========================================================================
  // QUESTION MARKERS - Inquiry and clarification
  // ==========================================================================
  question_what: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי', 'מַאי', 'מהו', 'מָהוּ', 'מנא הני מילי', 'מְנָא הָנֵי מִילֵּי',
      'מאי טעמא', 'מַאי טַעְמָא', 'מאי קא משמע לן', 'מַאי קָא מַשְׁמַע לַן'
    ],
    label: 'Question',
    hebrewLabel: 'שאלה',
    icon: '❓',
    color: '#F59E0B', // Amber/Orange
    description: 'Inquiry: What? Why? From where?',
    cssClass: 'discourse-question'
  },

  question_why: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי טעמא', 'למה', 'מדוע', 'מפני מה', 'מִפְּנֵי מָה'
    ],
    label: 'Why?',
    hebrewLabel: 'מדוע',
    icon: '🤔',
    color: '#F59E0B',
    description: 'Reason inquiry',
    cssClass: 'discourse-question-why'
  },

  question_source: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מנא הני מילי', 'מנלן', 'מְנָלָן', 'מנא לן', 'מְנָא לָן'
    ],
    label: 'Source?',
    hebrewLabel: 'מקור',
    icon: '📍',
    color: '#F59E0B',
    description: 'Source inquiry: From where do we learn this?',
    cssClass: 'discourse-question-source'
  },

  question_difference: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי בינייהו', 'מַאי בֵּינַיְיהוּ', 'במאי קא מיפלגי', 'בְּמַאי קָא מִיפַּלְגִי'
    ],
    label: 'Difference?',
    hebrewLabel: 'הבדל',
    icon: '⚖️',
    color: '#F59E0B',
    description: 'What is the practical difference between opinions?',
    cssClass: 'discourse-question-diff'
  },

  question_implication: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'מאי נפקא מינה', 'מַאי נַפְקָא מִינָּהּ', 'למאי נפקא מינה'
    ],
    label: 'Implication?',
    hebrewLabel: 'נפקא מינה',
    icon: '🎯',
    color: '#F59E0B',
    description: 'What is the practical implication?',
    cssClass: 'discourse-question-nafka'
  },

  disputed_question: {
    type: DISCOURSE_TYPES.QUESTION,
    markers: [
      'איבעיא להו', 'אִיבַּעְיָא לְהוּ', 'בעי', 'בָּעֵי', 'בעיא', 'בַּעְיָא'
    ],
    label: 'Disputed',
    hebrewLabel: 'בעיא',
    icon: '⁉️',
    color: '#EF4444', // Red
    description: 'Unresolved halachic question',
    cssClass: 'discourse-disputed'
  },

  // ==========================================================================
  // OBJECTION/CHALLENGE MARKERS
  // ==========================================================================
  objection_logical: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'מתקיף', 'מַתְקִיף', 'מתקיף לה', 'מַתְקִיף לָהּ'
    ],
    label: 'Challenge',
    hebrewLabel: 'קושיא',
    icon: '⚡',
    color: '#EF4444', // Red
    description: 'Logical objection/challenge',
    cssClass: 'discourse-objection'
  },

  objection_source: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'מתיבי', 'מְתִיבֵי', 'מיתיבי', 'מֵיתִיבֵי'
    ],
    label: 'Source Objection',
    hebrewLabel: 'מתיבי',
    icon: '📖⚡',
    color: '#DC2626', // Darker red
    description: 'Objection from authoritative source',
    cssClass: 'discourse-metivi'
  },

  contradiction: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'ורמינהו', 'וְרָמִינְהוּ', 'רמינהי', 'רָמִינְהִי', 'ורמי', 'וְרָמֵי'
    ],
    label: 'Contradiction',
    hebrewLabel: 'סתירה',
    icon: '🔄',
    color: '#DC2626',
    description: 'Contradiction between equal-authority sources',
    cssClass: 'discourse-contradiction'
  },

  conditional_challenge: {
    type: DISCOURSE_TYPES.OBJECTION,
    markers: [
      'בשלמא', 'בִּשְׁלָמָא', 'אי הכי', 'אִי הָכִי', 'אלא', 'אֶלָּא'
    ],
    label: 'Conditional',
    hebrewLabel: 'בשלמא',
    icon: '🔀',
    color: '#F97316', // Orange
    description: 'Conditional challenge: It\'s fine according to X, but...',
    cssClass: 'discourse-bishlama'
  },

  // ==========================================================================
  // PROOF/SUPPORT MARKERS
  // ==========================================================================
  proof_citation: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'תא שמע', 'תָּא שְׁמַע', 'ת״ש'
    ],
    label: 'Proof',
    hebrewLabel: 'ראיה',
    icon: '✅',
    color: '#10B981', // Green
    description: 'Come and hear - proof from authoritative source',
    cssClass: 'discourse-proof'
  },

  inference: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'שמע מינה', 'שְׁמַע מִינָּהּ', 'ש״מ'
    ],
    label: 'Inference',
    hebrewLabel: 'שמע מינה',
    icon: '💡',
    color: '#10B981',
    description: 'Infer from this - logical conclusion',
    cssClass: 'discourse-inference'
  },

  tannaitic_support: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'תנא כוותיה', 'תַּנָּא כְּוָותֵיהּ', 'תניא כוותיה', 'תַּנְיָא כְּוָותֵיהּ'
    ],
    label: 'Tannaitic Support',
    hebrewLabel: 'תנא כוותיה',
    icon: '👍',
    color: '#059669', // Darker green
    description: 'A Tanna taught in accordance with this view',
    cssClass: 'discourse-support'
  },

  logical_validation: {
    type: DISCOURSE_TYPES.PROOF,
    markers: [
      'מסתברא', 'מִסְתַּבְּרָא', 'מסתבר', 'מִסְתַּבֵּר'
    ],
    label: 'Logical',
    hebrewLabel: 'מסתברא',
    icon: '🧠',
    color: '#10B981',
    description: 'It is logical/reasonable',
    cssClass: 'discourse-logical'
  },

  // ==========================================================================
  // RESOLUTION MARKERS
  // ==========================================================================
  refutation: {
    type: DISCOURSE_TYPES.RESOLUTION,
    markers: [
      'תיובתא', 'תְּיוּבְתָּא', 'תיובתיה', 'תְּיוּבְתֵּיהּ'
    ],
    label: 'Refutation',
    hebrewLabel: 'תיובתא',
    icon: '❌',
    color: '#7C3AED', // Purple
    description: 'Conclusive refutation',
    cssClass: 'discourse-refutation'
  },

  resolution_answer: {
    type: DISCOURSE_TYPES.RESOLUTION,
    markers: [
      'לא קשיא', 'לָא קַשְׁיָא', 'הכי קאמר', 'הָכִי קָאָמַר',
      'לעולם', 'לְעוֹלָם'
    ],
    label: 'Resolution',
    hebrewLabel: 'תירוץ',
    icon: '🎯',
    color: '#7C3AED',
    description: 'Resolution of difficulty',
    cssClass: 'discourse-resolution'
  },

  halachic_conclusion: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'הלכתא', 'הִלְכְתָא', 'הלכה', 'הֲלָכָה', 'והלכתא', 'וְהִלְכְתָא'
    ],
    label: 'Halacha',
    hebrewLabel: 'הלכה',
    icon: '⚖️',
    color: '#0891B2', // Cyan
    description: 'Final halachic ruling',
    cssClass: 'discourse-halacha'
  },

  // ==========================================================================
  // ALTERNATIVE VIEWS
  // ==========================================================================
  alternative_version: {
    type: DISCOURSE_TYPES.ALTERNATIVE,
    markers: [
      'איכא דאמרי', 'אִיכָּא דְּאָמְרֵי', 'לישנא אחרינא', 'לִישָׁנָא אַחֲרִינָא',
      'ואיכא דאמרי', 'וְאִיכָּא דְּאָמְרֵי'
    ],
    label: 'Alternative',
    hebrewLabel: 'איכא דאמרי',
    icon: '🔀',
    color: '#6366F1', // Indigo
    description: 'Some say / Alternative version',
    cssClass: 'discourse-alternative'
  },

  // ==========================================================================
  // EXPLICATION MARKERS
  // ==========================================================================
  gufa_expansion: {
    type: DISCOURSE_TYPES.EXPLICATION,
    markers: [
      'גופא', 'גּוּפָא', 'גופה', 'גּוּפָהּ'
    ],
    label: 'Expansion',
    hebrewLabel: 'גופא',
    icon: '📖',
    color: '#0EA5E9', // Sky blue
    description: 'Now regarding the matter itself - detailed analysis',
    cssClass: 'discourse-gufa'
  },

  clarification: {
    type: DISCOURSE_TYPES.EXPLICATION,
    markers: [
      'מאי קאמר', 'מַאי קָאָמַר', 'היכי דמי', 'הֵיכִי דָּמֵי',
      'במאי עסקינן', 'בְּמַאי עָסְקִינַן'
    ],
    label: 'Clarification',
    hebrewLabel: 'פירוש',
    icon: '🔍',
    color: '#0EA5E9',
    description: 'What does he mean? / In what case?',
    cssClass: 'discourse-clarification'
  },

  // ==========================================================================
  // BIBLICAL CITATION MARKERS
  // ==========================================================================
  biblical_proof: {
    type: DISCOURSE_TYPES.SOURCE_CITATION,
    markers: [
      'שנאמר', 'שֶׁנֶּאֱמַר', 'דכתיב', 'דִּכְתִיב', 'כדכתיב', 'כִּדְכְתִיב',
      'מנין', 'מִנַּיִן', 'שנא׳', 'דכתי׳'
    ],
    label: 'Scripture',
    hebrewLabel: 'פסוק',
    icon: '📖',
    color: '#14B8A6', // Teal
    description: 'Biblical proof text',
    cssClass: 'discourse-scripture'
  },

  // ==========================================================================
  // LEGAL TERMS
  // ==========================================================================
  legal_liable: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'חייב', 'חַיָּב', 'חייבין', 'חַיָּבִין', 'חייבים', 'חַיָּבִים'
    ],
    label: 'Liable',
    hebrewLabel: 'חייב',
    icon: '⚠️',
    color: '#DC2626',
    description: 'Legally obligated/liable',
    cssClass: 'discourse-liable'
  },

  legal_exempt: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'פטור', 'פָּטוּר', 'פטורין', 'פְּטוּרִין', 'פטורים', 'פְּטוּרִים'
    ],
    label: 'Exempt',
    hebrewLabel: 'פטור',
    icon: '✓',
    color: '#10B981',
    description: 'Legally exempt',
    cssClass: 'discourse-exempt'
  },

  legal_permitted: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'מותר', 'מֻתָּר', 'שרי', 'שָׁרֵי'
    ],
    label: 'Permitted',
    hebrewLabel: 'מותר',
    icon: '✅',
    color: '#10B981',
    description: 'Permitted',
    cssClass: 'discourse-permitted'
  },

  legal_forbidden: {
    type: DISCOURSE_TYPES.LEGAL_RULING,
    markers: [
      'אסור', 'אָסוּר', 'אסורין', 'אֲסוּרִין', 'אסורים', 'אֲסוּרִים'
    ],
    label: 'Forbidden',
    hebrewLabel: 'אסור',
    icon: '🚫',
    color: '#DC2626',
    description: 'Forbidden',
    cssClass: 'discourse-forbidden'
  }
};

// =============================================================================
// RABBI DETECTION PATTERNS
// =============================================================================

export const RABBI_PATTERNS = {
  amar_rabbi: {
    // אמר רבי X, א"ר X
    pattern: /(?:אמר|א"ר|א״ר)\s*(רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'statement',
    description: 'Rabbi X says'
  },

  rabbi_amar: {
    // רבי X אמר, רב X אמר
    pattern: /(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)\s*(?:אמר|אומר)/gu,
    type: 'statement',
    description: 'Rabbi X says'
  },

  ploni_ve_ploni: {
    // רבי X ורבי Y
    pattern: /(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)\s*(?:ו|ו־)(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'dispute',
    description: 'Rabbi X and Rabbi Y'
  },

  machloket: {
    // פליגי בה רבי X ורבי Y
    pattern: /(?:פליגי|נחלקו)\s*(?:בה|בהּ)?\s*(?:רב(?:י|ן|א)?|ר׳)\s*(\p{Script=Hebrew}+)/gu,
    type: 'dispute',
    description: 'Dispute between...'
  }
};

// =============================================================================
// CORE DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect all discourse markers in Hebrew/Aramaic text
 * @param {string} text - The text to analyze
 * @returns {Array} Array of detected patterns with positions
 */
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
// SIMPLIFIED TALMUDIC PATTERNS (Quick Reference)
// Color-coded structural markers for visual highlighting
// =============================================================================

export const TALMUDIC_PATTERNS = {
  mishna: {
    markers: ['מתני׳', 'תנן', 'שנינו', 'מתניתין', 'במתניתין', 'דתנן', 'מדתנן'],
    color: '#4A90D9', // blue
    label: 'Mishna',
    hebrewLabel: 'משנה',
    icon: '📘'
  },
  gemara: {
    // V30: Enhanced Gemara detection - includes explicit marker AND implicit Gemara starters
    markers: [
      'גמ׳', 'גְּמָ׳', 'גמרא', 'בגמרא',
      // Implicit Gemara starters (when text starts discussing the Mishna)
      'מאי קאמר', 'מאי קא משמע לן', 'במאי עסקינן', 'היכי דמי'
    ],
    color: '#8B4513', // brown
    label: 'Gemara',
    hebrewLabel: 'גמרא',
    icon: '📜'
  },
  question: {
    // V29: Question markers - removed כיצד (it's a Mishna case intro, not a Gemara question)
    markers: [
      'מאי', 'מנא הני מילי', 'מאי טעמא', 'איבעיא להו', 'מאי בינייהו', 'מהו', 'מנלן',
      'היכי דמי', 'מאן תנא', 'פשיטא', 'למימרא', 'מה הן', 'היכי', 'מאי קאמר',
      'מאי שנא', 'מה בין', 'באיזה', 'מי אמר', 'אימא', 'וכי'
    ],
    color: '#E67E22', // orange
    label: 'Question',
    hebrewLabel: 'שאלה',
    icon: '❓'
  },
  objection: {
    // V28: Expanded objection markers
    markers: [
      'מתקיף', 'מתיבי', 'ורמינהו', 'בשלמא', 'אלא',
      'קשיא', 'תיקו', 'איתיביה', 'ומי', 'והא', 'והתניא',
      'ולא', 'ליתא', 'קא קשיא', 'הא גופא קשיא'
    ],
    color: '#E74C3C', // red
    label: 'Challenge',
    hebrewLabel: 'קושיא',
    icon: '⚡'
  },
  proof: {
    // V28: Expanded proof markers
    markers: [
      'תא שמע', 'שמע מינה', 'תנא כוותיה', 'מסתברא',
      'ראיה', 'דתנן', 'מדתנן', 'דתניא', 'מדתניא', 'מיתיבי',
      'לימא', 'איכא למימר', 'מכלל', 'אלמא'
    ],
    color: '#27AE60', // green
    label: 'Proof',
    hebrewLabel: 'ראיה',
    icon: '✅'
  },
  resolution: {
    // V30: Expanded resolution markers with more answer patterns
    markers: [
      'תיובתא', 'הלכתא', 'לא קשיא', 'הכי קאמר',
      'משום', 'כדתניא', 'הכי נמי', 'לא צריכא',
      'תרוץ', 'לעולם', 'שאני', 'כדאמרן',
      // V30: Additional resolution patterns
      'אלא אמר', 'הכא במאי עסקינן', 'אמר לך', 'תנאי היא',
      'דאמר קרא', 'כדרב', 'כדשמואל', 'אין הכי נמי'
    ],
    color: '#9B59B6', // purple
    label: 'Conclusion',
    hebrewLabel: 'מסקנא',
    icon: '🎯'
  },
  alternative: {
    // V28: Expanded alternative markers
    markers: [
      'איכא דאמרי', 'לישנא אחרינא', 'ואיכא דאמרי',
      'אי נמי', 'אי הכי', 'או דילמא', 'אלא אי אמרת'
    ],
    color: '#3498DB', // light blue
    label: 'Alternative View',
    hebrewLabel: 'לישנא אחרינא',
    icon: '🔀'
  },
  baraita: {
    // V28: Expanded baraita markers
    markers: ['תנו רבנן', 'תניא', 'ת״ר', 'תנא', 'דתנא', 'כדתניא', 'ברייתא'],
    color: '#6366F1', // indigo
    label: 'Baraita',
    hebrewLabel: 'ברייתא',
    icon: '📋'
  },
  scripture: {
    // V28: Expanded scripture markers
    markers: [
      'שנאמר', 'דכתיב', 'כדכתיב', 'מנין',
      'וכתיב', 'ואומר', 'הכתוב', 'מקרא'
    ],
    color: '#14B8A6', // teal
    label: 'Scripture',
    hebrewLabel: 'פסוק',
    icon: '📖'
  },
  // V30: Enhanced sage detection with more patterns
  sage_statement: {
    markers: [
      // Standard attribution patterns
      'אמר רב', 'אמר רבי', 'אמר ר\'', 'א"ר', 'אר"ש', 'אר"מ',
      'רבא אמר', 'אביי אמר', 'רבי אומר', 'חכמים אומרים',
      // V30: Additional sage patterns
      'רב אמר', 'שמואל אמר', 'רבי יוחנן', 'ריש לקיש',
      'רב הונא', 'רב נחמן', 'רב יוסף', 'רב ששת', 'רב חסדא',
      'רבינא', 'רב אשי', 'מר זוטרא', 'רב פפא',
      // Tannaim
      'רבי מאיר', 'רבי יהודה', 'רבי שמעון', 'רבי יוסי',
      'רבי עקיבא', 'רבי אליעזר', 'רבי יהושע', 'רבן גמליאל',
      // Attribution verbs
      'סבר', 'סבירא ליה', 'אמר ליה', 'א"ל'
    ],
    color: '#8B5CF6', // violet
    label: 'Sage Statement',
    hebrewLabel: 'דברי חכם',
    icon: '👤'
  },
  legal_ruling: {
    markers: [
      'הלכה', 'דינא', 'הדין', 'חייב', 'פטור', 'מותר', 'אסור',
      'כשר', 'פסול', 'טמא', 'טהור'
    ],
    color: '#DC2626', // dark red
    label: 'Legal Ruling',
    hebrewLabel: 'פסק הלכה',
    icon: '⚖️'
  }
};

// =============================================================================
// SIMPLIFIED STRUCTURAL MARKER DETECTION
// Returns flat array of markers with positions and styling info
// =============================================================================

/**
 * Strip Hebrew nikud (vowel marks) from text for pattern matching
 * @param {string} text - Text with potential nikud
 * @returns {string} Text without nikud
 */
// PRO SCHOLAR V12: stripNikudLocal now delegates to centralized stripAllDiacritics
function stripNikudLocal(text) {
  return stripAllDiacritics(text) || '';
}

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
export function getDiscourseLayerStyles() {
  let css = '';

  for (const [type, config] of Object.entries(TALMUDIC_PATTERNS)) {
    css += `
.discourse-layer-${type} {
  background-color: ${config.color}15;
  border-left: 3px solid ${config.color};
  padding-left: 8px;
  margin: 4px 0;
}

.discourse-marker-${type} {
  background-color: ${config.color}25;
  border-bottom: 2px solid ${config.color};
  padding: 0 2px;
  font-weight: bold;
}

.discourse-badge-${type} {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: ${config.color}20;
  color: ${config.color};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
`;
  }

  return css;
}

/**
 * Apply layer coloring to text - returns HTML with colored spans
 * @param {string} text - Original Hebrew text
 * @returns {string} HTML with discourse layer styling
 */
export function applyLayerColoring(text) {
  const markers = detectStructuralMarkers(text);
  if (markers.length === 0) return text;

  // Sort by position descending to insert from end to start
  const sortedMarkers = [...markers].sort((a, b) => b.position - a.position);

  let result = text;
  for (const m of sortedMarkers) {
    const before = result.slice(0, m.position);
    const markerText = result.slice(m.position, m.endPosition);
    const after = result.slice(m.endPosition);

    const span = `<span class="discourse-marker-${m.type}"
      style="background-color: ${m.color}25; border-bottom: 2px solid ${m.color};"
      title="${m.icon} ${m.label} (${m.hebrewLabel})"
      data-type="${m.type}"
      data-marker="${m.marker}">${markerText}</span>`;

    result = before + span + after;
  }

  return result;
}

// =============================================================================
// SUGYA SEGMENTATION
// Automatically segment text into logical Talmudic units
// =============================================================================

/**
 * Segment text into logical sugya units based on discourse markers
 * @param {string} text - Full Talmudic text
 * @returns {Array} Array of segments with type and content
 */
export function segmentIntoSugyaUnits(text) {
  const markers = detectStructuralMarkers(text);
  if (markers.length === 0) {
    return [{ type: 'text', content: text, startPos: 0, endPos: text.length }];
  }

  const segments = [];
  let lastPos = 0;
  let currentSection = 'intro';

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextMarker = markers[i + 1];

    // Add any text before this marker
    if (marker.position > lastPos) {
      const preText = text.slice(lastPos, marker.position).trim();
      if (preText) {
        segments.push({
          type: currentSection,
          content: preText,
          startPos: lastPos,
          endPos: marker.position
        });
      }
    }

    // Determine section boundaries
    if (marker.type === 'mishna') {
      currentSection = 'mishna';
    } else if (marker.type === 'gemara') {
      currentSection = 'gemara';
    }

    // Calculate end position
    const endPos = nextMarker ? nextMarker.position : text.length;
    const content = text.slice(marker.position, endPos).trim();

    segments.push({
      type: marker.type,
      sectionType: currentSection,
      marker: marker.marker,
      label: marker.label,
      hebrewLabel: marker.hebrewLabel,
      icon: marker.icon,
      color: marker.color,
      content,
      startPos: marker.position,
      endPos
    });

    lastPos = endPos;
  }

  return segments;
}

// =============================================================================
// TZURAT HADAF - Traditional Talmud Page Layout
// Visualizes text in the classic Vilna Shas format:
// - Center: Main text (Mishna/Gemara)
// - Inner margin: Rashi commentary
// - Outer margin: Tosafot commentary
// =============================================================================

/**
 * Generate Tzurat HaDaf layout data structure
 * Creates a traditional Talmud page layout with center text and margin commentaries
 * @param {Object} options - Layout options
 * @param {string} options.mainText - Main Gemara/Mishna text
 * @param {string} options.rashiText - Rashi commentary (inner margin)
 * @param {string} options.tosafotText - Tosafot commentary (outer margin)
 * @param {string} options.dafNumber - Page reference (e.g., "2a", "15b")
 * @param {string} options.masechet - Tractate name
 * @returns {Object} Structured layout data for rendering
 */
export function generateTzuratHaDaf(options = {}) {
  const {
    mainText = '',
    rashiText = '',
    tosafotText = '',
    dafNumber = '',
    masechet = '',
    additionalCommentaries = []
  } = options;

  // Analyze main text for discourse markers
  const mainAnalysis = mainText ? analyzeDiscourseStructure(mainText) : null;
  const mainMarkers = mainText ? detectStructuralMarkers(mainText) : [];

  // Segment main text into Mishna/Gemara sections
  const segments = mainText ? segmentIntoSugyaUnits(mainText) : [];

  // Find Mishna and Gemara sections
  const mishnaSegments = segments.filter(s => s.type === 'mishna' || s.sectionType === 'mishna');
  const gemaraSegments = segments.filter(s => s.type === 'gemara' || s.sectionType === 'gemara');

  return {
    // Page header
    header: {
      masechet,
      dafNumber,
      fullRef: masechet && dafNumber ? `${masechet} ${dafNumber}` : '',
      amud: dafNumber?.includes('a') ? 'א' : dafNumber?.includes('b') ? 'ב' : ''
    },

    // Main text area (center column)
    mainColumn: {
      text: mainText,
      htmlWithMarkers: mainText ? applyLayerColoring(mainText) : '',
      segments,
      mishnaSegments,
      gemaraSegments,
      analysis: mainAnalysis,
      markers: mainMarkers
    },

    // Inner margin (Rashi - right side in Hebrew)
    innerMargin: {
      commentator: 'רש"י',
      commentatorEn: 'Rashi',
      text: rashiText,
      style: {
        fontFamily: 'Rashi',
        fontSize: '0.85em',
        direction: 'rtl'
      }
    },

    // Outer margin (Tosafot - left side in Hebrew)
    outerMargin: {
      commentator: 'תוספות',
      commentatorEn: 'Tosafot',
      text: tosafotText,
      style: {
        fontFamily: 'Tosafot',
        fontSize: '0.85em',
        direction: 'rtl'
      }
    },

    // Additional commentaries (bottom or side panels)
    additionalCommentaries: additionalCommentaries.map(c => ({
      name: c.name || '',
      hebrewName: c.hebrewName || '',
      text: c.text || '',
      position: c.position || 'bottom'
    })),

    // Layout configuration
    layout: {
      type: 'tzurat-hadaf',
      columns: 3,
      mainColumnWidth: '50%',
      marginWidth: '25%',
      direction: 'rtl'
    },

    // Visual indicators for discourse structure
    discourseIndicators: mainMarkers.map(m => ({
      type: m.type,
      position: m.position,
      icon: m.icon,
      color: m.color,
      label: m.hebrewLabel
    }))
  };
}

/**
 * Generate ASCII representation of Tzurat HaDaf
 * For console/text display of traditional layout
 * @param {Object} options - Same options as generateTzuratHaDaf
 * @returns {string} ASCII art representation
 */
export function generateTzuratHaDafAscii(options = {}) {
  const { mainText = '', rashiText = '', tosafotText = '', dafNumber = '', masechet = '' } = options;

  const width = 80;
  const mainWidth = 40;
  const marginWidth = 18;

  const border = '═'.repeat(width);

  // Helper to wrap text to width
  const wrapText = (text, maxWidth) => {
    if (!text) return [''];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  };

  // Wrap each column's text
  const rashiLines = wrapText(rashiText, marginWidth);
  const mainLines = wrapText(mainText, mainWidth);
  const tosafotLines = wrapText(tosafotText, marginWidth);

  // Get max lines
  const maxLines = Math.max(rashiLines.length, mainLines.length, tosafotLines.length, 10);

  // Build the page
  const lines = [];

  // Header
  lines.push(`╔${border}╗`);
  const headerText = masechet && dafNumber ? `${masechet} דף ${dafNumber}` : 'צורת הדף';
  const headerPadding = Math.floor((width - headerText.length) / 2);
  lines.push(`║${' '.repeat(headerPadding)}${headerText}${' '.repeat(width - headerPadding - headerText.length)}║`);
  lines.push(`╠${'═'.repeat(marginWidth)}╦${'═'.repeat(mainWidth)}╦${'═'.repeat(marginWidth)}╣`);

  // Column headers
  const rashiHeader = 'רש"י'.padStart(Math.floor((marginWidth + 4) / 2)).padEnd(marginWidth);
  const mainHeader = 'גמרא'.padStart(Math.floor((mainWidth + 4) / 2)).padEnd(mainWidth);
  const tosafotHeader = 'תוספות'.padStart(Math.floor((marginWidth + 6) / 2)).padEnd(marginWidth);
  lines.push(`║${rashiHeader}║${mainHeader}║${tosafotHeader}║`);
  lines.push(`╠${'─'.repeat(marginWidth)}╬${'─'.repeat(mainWidth)}╬${'─'.repeat(marginWidth)}╣`);

  // Content rows
  for (let i = 0; i < maxLines; i++) {
    const rashiLine = (rashiLines[i] || '').padEnd(marginWidth);
    const mainLine = (mainLines[i] || '').padEnd(mainWidth);
    const tosafotLine = (tosafotLines[i] || '').padEnd(marginWidth);
    lines.push(`║${rashiLine}║${mainLine}║${tosafotLine}║`);
  }

  // Footer
  lines.push(`╚${'═'.repeat(marginWidth)}╩${'═'.repeat(mainWidth)}╩${'═'.repeat(marginWidth)}╝`);

  return lines.join('\n');
}

/**
 * Generate CSS styles for Tzurat HaDaf rendering
 * @returns {string} CSS stylesheet for daf layout
 */
export function getTzuratHaDafStyles() {
  return `
/* Tzurat HaDaf - Traditional Talmud Page Layout */
.tzurat-hadaf {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0;
  direction: rtl;
  font-family: 'David Libre', 'Frank Ruhl Libre', serif;
  background: #faf8f0;
  border: 2px solid #8b7355;
  border-radius: 4px;
  padding: 0;
  max-width: 1200px;
  margin: 0 auto;
}

/* Page Header */
.tzurat-hadaf-header {
  grid-column: 1 / -1;
  text-align: center;
  padding: 12px;
  background: linear-gradient(to bottom, #d4c4a8, #e8dcc8);
  border-bottom: 2px solid #8b7355;
  font-size: 1.4rem;
  font-weight: bold;
}

.tzurat-hadaf-header .masechet {
  font-size: 1.6rem;
  color: #4a3728;
}

.tzurat-hadaf-header .daf-number {
  font-size: 1.2rem;
  color: #6b5344;
  margin-right: 8px;
}

/* Main Gemara Column (Center) */
.tzurat-hadaf-main {
  grid-column: 2;
  padding: 16px 20px;
  font-size: 1.1rem;
  line-height: 1.8;
  text-align: justify;
  border-left: 1px solid #c4b49a;
  border-right: 1px solid #c4b49a;
  background: #fffef8;
}

.tzurat-hadaf-main .mishna-section {
  background: #e8f4fc;
  border-right: 4px solid #4A90D9;
  padding: 12px;
  margin: 8px 0;
  border-radius: 0 4px 4px 0;
}

.tzurat-hadaf-main .gemara-section {
  background: #fdf8f0;
  border-right: 4px solid #8B4513;
  padding: 12px;
  margin: 8px 0;
  border-radius: 0 4px 4px 0;
}

/* Rashi Column (Inner/Right) */
.tzurat-hadaf-rashi {
  grid-column: 1;
  padding: 12px;
  font-family: 'Rashi', 'SBL Hebrew', serif;
  font-size: 0.85rem;
  line-height: 1.6;
  background: #f5f0e6;
}

.tzurat-hadaf-rashi .commentary-header {
  font-weight: bold;
  text-align: center;
  padding: 8px;
  background: #e8dcc8;
  border-bottom: 1px solid #c4b49a;
  margin: -12px -12px 12px -12px;
}

/* Tosafot Column (Outer/Left) */
.tzurat-hadaf-tosafot {
  grid-column: 3;
  padding: 12px;
  font-family: 'Tosafot', 'SBL Hebrew', serif;
  font-size: 0.85rem;
  line-height: 1.6;
  background: #f5f0e6;
}

.tzurat-hadaf-tosafot .commentary-header {
  font-weight: bold;
  text-align: center;
  padding: 8px;
  background: #e8dcc8;
  border-bottom: 1px solid #c4b49a;
  margin: -12px -12px 12px -12px;
}

/* Additional Commentaries Footer */
.tzurat-hadaf-footer {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: #e8dcc8;
  border-top: 2px solid #8b7355;
}

.tzurat-hadaf-footer .commentary-block {
  flex: 1;
  min-width: 200px;
  padding: 8px;
  background: #f5f0e6;
  border: 1px solid #c4b49a;
  border-radius: 4px;
}

/* Discourse Markers within Tzurat HaDaf */
.tzurat-hadaf .discourse-marker-mishna {
  background-color: #4A90D920;
  border-bottom: 2px solid #4A90D9;
  font-weight: bold;
}

.tzurat-hadaf .discourse-marker-gemara {
  background-color: #8B451320;
  border-bottom: 2px solid #8B4513;
  font-weight: bold;
}

.tzurat-hadaf .discourse-marker-question {
  background-color: #E67E2220;
  border-bottom: 2px solid #E67E22;
}

.tzurat-hadaf .discourse-marker-objection {
  background-color: #E74C3C20;
  border-bottom: 2px solid #E74C3C;
}

.tzurat-hadaf .discourse-marker-proof {
  background-color: #27AE6020;
  border-bottom: 2px solid #27AE60;
}

.tzurat-hadaf .discourse-marker-resolution {
  background-color: #9B59B620;
  border-bottom: 2px solid #9B59B6;
}

/* Responsive Layout */
@media (max-width: 768px) {
  .tzurat-hadaf {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
  }

  .tzurat-hadaf-rashi,
  .tzurat-hadaf-tosafot {
    grid-column: 1;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #c4b49a;
  }

  .tzurat-hadaf-main {
    grid-column: 1;
    border-left: none;
    border-right: none;
  }
}

/* Print Styles */
@media print {
  .tzurat-hadaf {
    border: 1px solid #000;
    background: #fff;
  }

  .tzurat-hadaf-header,
  .tzurat-hadaf-footer {
    background: #f0f0f0;
  }
}
`;
}

/**
 * Generate React-compatible props for Tzurat HaDaf component
 * @param {Object} options - Layout options
 * @returns {Object} Props object for React component
 */
export function getTzuratHaDafProps(options = {}) {
  const layout = generateTzuratHaDaf(options);

  return {
    className: 'tzurat-hadaf',
    style: {
      direction: 'rtl',
      fontFamily: "'David Libre', 'Frank Ruhl Libre', serif"
    },
    header: {
      masechet: layout.header.masechet,
      dafNumber: layout.header.dafNumber,
      amud: layout.header.amud
    },
    columns: {
      rashi: {
        title: layout.innerMargin.commentator,
        content: layout.innerMargin.text,
        style: layout.innerMargin.style
      },
      main: {
        content: layout.mainColumn.htmlWithMarkers,
        segments: layout.mainColumn.segments,
        analysis: layout.mainColumn.analysis
      },
      tosafot: {
        title: layout.outerMargin.commentator,
        content: layout.outerMargin.text,
        style: layout.outerMargin.style
      }
    },
    footer: layout.additionalCommentaries,
    discourseIndicators: layout.discourseIndicators
  };
}

/**
 * Render Tzurat HaDaf as HTML string
 * @param {Object} options - Layout options
 * @returns {string} Complete HTML string for the daf
 */
export function renderTzuratHaDafHtml(options = {}) {
  const layout = generateTzuratHaDaf(options);

  return `
<div class="tzurat-hadaf">
  <header class="tzurat-hadaf-header">
    <span class="masechet">${layout.header.masechet || ''}</span>
    <span class="daf-number">דף ${layout.header.dafNumber || ''}</span>
  </header>

  <aside class="tzurat-hadaf-rashi">
    <div class="commentary-header">${layout.innerMargin.commentator}</div>
    <div class="commentary-content">${layout.innerMargin.text || '<em>אין רש"י</em>'}</div>
  </aside>

  <main class="tzurat-hadaf-main">
    ${layout.mainColumn.segments.map(seg => `
      <div class="${seg.type}-section" data-type="${seg.type}">
        ${seg.icon ? `<span class="section-icon">${seg.icon}</span>` : ''}
        ${seg.content}
      </div>
    `).join('')}
  </main>

  <aside class="tzurat-hadaf-tosafot">
    <div class="commentary-header">${layout.outerMargin.commentator}</div>
    <div class="commentary-content">${layout.outerMargin.text || '<em>אין תוספות</em>'}</div>
  </aside>

  ${layout.additionalCommentaries.length > 0 ? `
  <footer class="tzurat-hadaf-footer">
    ${layout.additionalCommentaries.map(c => `
      <div class="commentary-block">
        <strong>${c.hebrewName || c.name}</strong>
        <p>${c.text}</p>
      </div>
    `).join('')}
  </footer>
  ` : ''}
</div>
`;
}

// =============================================================================
// MISHNA STRUCTURE ANALYSIS (PRO SCHOLAR V13)
// =============================================================================

/**
 * Mishna Structure Patterns
 * Detects enumeration, conditions, exceptions, and rulings in Mishnaic text
 */
export const MISHNA_STRUCTURE_PATTERNS = {
  // Enumeration patterns - Enhanced for Shabbat 2a style (שתים שהן ארבע)
  enumeration: {
    patterns: [
      /(?:שתים|שלש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|שנים עשר|שלושה|ארבעה|חמישה)\s+(?:דברים|מקומות|זמנים|אופנים|מינים|דרכים)/g,
      /(?:שתים|שלש|ארבע)\s+שהן\s+(?:ארבע|שש|שמונה)/g, // שתים שהן ארבע
      /ראשון\b|שני\b|שלישי\b|רביעי\b|חמישי\b/g,
      /(?:אחד|שתים|שלש)\b.*?(?:ואחד|ושתים|ושלש)\b/g,
      /(?:מבפנים|מבחוץ|בפנים|בחוץ)/g // Inside/outside cases
    ],
    label: 'ספירה',
    icon: '🔢',
    color: '#3B82F6'
  },
  // Conditional rulings - Enhanced for case scenarios
  condition: {
    patterns: [
      /(?:אם|כל\s+ש|בזמן\s+ש|כשהוא|כש)\s+[\u0590-\u05FF]+/g,
      /(?:היה|היו|היתה)\s+[\u0590-\u05FF]+/g,
      /(?:עד\s+ש|משום\s+ש|מפני\s+ש)/g,
      /(?:פשט\s+[\u0590-\u05FF]+\s+ידו|הכניס\s+ידו|הוציא\s+ידו)/g, // Hand extension cases
      /(?:עני\s+[\u0590-\u05FF]*\s*עומד|בעל\s+הבית\s+[\u0590-\u05FF]*\s*עומד)/g // Poor man/homeowner standing
    ],
    label: 'תנאי',
    icon: '🔀',
    color: '#F59E0B'
  },
  // Exceptions
  exception: {
    patterns: [
      /(?:חוץ\s+מ|אלא\s+א|אבל|ואם|אלא\s+ש)/g,
      /(?:פרט\s+ל|להוציא|יצא)/g
    ],
    label: 'יוצא מן הכלל',
    icon: '⚡',
    color: '#EF4444'
  },
  // Legal rulings - Enhanced with liable/exempt pairs
  ruling: {
    patterns: [
      /(?:מותר|אסור|פטור|חייב|טהור|טמא|כשר|פסול|יוצא|אינו יוצא)\b/g,
      /(?:חייב\s+[\u0590-\u05FF]*\s*(?:ו|ה)?פטור|פטור\s+[\u0590-\u05FF]*\s*(?:ו|ה)?חייב)/g, // Liable-exempt pairs
      /(?:העני\s+[\u0590-\u05FF]*\s*חייב|בעל\s+הבית\s+[\u0590-\u05FF]*\s*פטור)/g, // Poor man liable, homeowner exempt
      /(?:חכמים אומרים|רבי\s+[\u0590-\u05FF]+\s+אומר)/g,
      /(?:זה\s+הכלל|כלל\s+גדול)/g,
      /(?:שניהם\s+פטורים|שניהם\s+חייבים)/g // Both exempt/liable
    ],
    label: 'פסק',
    icon: '⚖️',
    color: '#10B981'
  },
  // Disputes
  dispute: {
    patterns: [
      /בית\s+(?:הלל|שמאי)\s+אומרים/g,
      /(?:רבי\s+[\u0590-\u05FF]+)\s+אומר.*?(?:וחכמים אומרים|ורבי\s+[\u0590-\u05FF]+\s+אומר)/g,
      /מחלוקת\b/g
    ],
    label: 'מחלוקת',
    icon: '⚔️',
    color: '#8B5CF6'
  },
  // Case structure - NEW for Shabbat 2a style
  case_structure: {
    patterns: [
      /(?:יציאות\s+השבת|הוצאות\s+שבת)/g, // Shabbat carrying
      /(?:רשות\s+היחיד|רשות\s+הרבים)/g, // Private/public domain
      /(?:הכנסה|הוצאה)/g, // Bringing in/taking out
      /(?:כיצד)/g // "How is this?"
    ],
    label: 'מקרה',
    icon: '📋',
    color: '#6366F1'
  }
};

/**
 * Analyze Mishna structure - detects enumeration, conditions, rulings
 * @param {string} text - Mishna text to analyze
 * @returns {Object} Structured analysis of the Mishna
 */
export function analyzeMishnaStructure(text) {
  if (!text) return { elements: [], summary: null };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // PRO SCHOLAR V28: Build position mapping from clean text to original text
  // This fixes the nikud position alignment issue where positions don't match
  const cleanToOriginal = [];
  let cleanIdx = 0;
  for (let origIdx = 0; origIdx < text.length; origIdx++) {
    const char = text[origIdx];
    // Check if character is nikud/cantillation (will be stripped)
    if (!/[\u0591-\u05C7]/.test(char)) {
      cleanToOriginal[cleanIdx] = origIdx;
      cleanIdx++;
    }
  }
  // Add end mapping for slicing
  cleanToOriginal[cleanIdx] = text.length;

  const elements = [];
  const seenPositions = new Set();

  for (const [type, config] of Object.entries(MISHNA_STRUCTURE_PATTERNS)) {
    for (const pattern of config.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(cleanText)) !== null) {
        // Map clean text positions back to original text positions
        const origStart = cleanToOriginal[match.index] ?? match.index;
        const origEnd = cleanToOriginal[match.index + match[0].length] ?? (match.index + match[0].length);

        const posKey = `${origStart}-${type}`;
        if (!seenPositions.has(posKey)) {
          seenPositions.add(posKey);
          // Extract original text with nikud
          const originalText = text.slice(origStart, origEnd);
          elements.push({
            type,
            text: originalText || match[0],
            position: origStart,
            endPosition: origEnd,
            label: config.label,
            icon: config.icon,
            color: config.color
          });
        }
      }
    }
  }

  // Sort by position
  elements.sort((a, b) => a.position - b.position);

  // Generate summary
  const summary = {
    hasEnumeration: elements.some(e => e.type === 'enumeration'),
    hasConditions: elements.some(e => e.type === 'condition'),
    hasExceptions: elements.some(e => e.type === 'exception'),
    hasRulings: elements.some(e => e.type === 'ruling'),
    hasDisputes: elements.some(e => e.type === 'dispute'),
    hasCaseStructure: elements.some(e => e.type === 'case_structure'),
    totalElements: elements.length,
    breakdown: {}
  };

  // Count by type
  for (const el of elements) {
    summary.breakdown[el.type] = (summary.breakdown[el.type] || 0) + 1;
  }

  return { elements, summary };
}

// =============================================================================
// MISHNA SUMMARY GENERATOR (PRO SCHOLAR V26)
// Generates meaningful one-liner summaries explaining the halacha
// =============================================================================

/**
 * PRO SCHOLAR V26: Known Mishna opening patterns with explanations
 * Maps famous opening phrases to descriptive summaries
 */
const KNOWN_MISHNA_OPENINGS = {
  // Shabbat
  'יציאות השבת': {
    topic: 'הוצאה והכנסה בשבת',
    summary: 'מלאכת הוצאה: העברת חפצים בין רשות היחיד לרשות הרבים',
    details: 'שתים שהן ארבע - שני צדדים (הוצאה/הכנסה) × שני גורמים (עני/בעה"ב)'
  },
  'שתים שהן ארבע': {
    topic: 'מניין חיובי הוצאה',
    summary: 'ארבעה מקרים של הוצאה: מבפנים החוצה ומבחוץ פנימה, כל אחד על ידי עני או בעל הבית',
    details: 'בפנים = רשות היחיד, בחוץ = רשות הרבים'
  },
  'במה מדליקין': {
    topic: 'נרות שבת',
    summary: 'חומרים כשרים ופסולים להדלקת נר שבת - פתילות ושמנים',
    details: 'נר שבת חייב לדלוק כראוי לכבוד שבת'
  },
  'כירה': {
    topic: 'שהיית תבשיל על האש',
    summary: 'מתי מותר להשאיר תבשיל על כירה בשבת - גרוף וקטום',
    details: 'חשש שמא יחתה בגחלים להגביר האש'
  },
  'במה טומנין': {
    topic: 'הטמנת תבשיל',
    summary: 'חומרים בהם מותר/אסור לעטוף סיר כדי לשמור חום',
    details: 'מותר בדבר שאינו מוסיף הבל'
  },
  // Berakhot
  'מאימתי קורין': {
    topic: 'זמן קריאת שמע',
    summary: 'זמני קריאת שמע של ערבית ושחרית',
    details: 'משעה שהכהנים נכנסים לאכול בתרומתן'
  },
  'היה קורא': {
    topic: 'קריאת שמע',
    summary: 'דיני קריאת שמע - כוונה, הפסקות, וטעויות',
    details: 'כוונה בפסוק ראשון מעכבת'
  },
  // General patterns
  'שלשה דברים': {
    topic: 'מנייה תלת',
    summary: 'שלושה עניינים הקשורים בנושא המשנה',
    details: 'מבנה של ספירה וסיווג'
  },
  'ארבעה דברים': {
    topic: 'מנייה ארבע',
    summary: 'ארבעה עניינים או סוגים בנושא הנידון',
    details: 'מבנה של ספירה וסיווג'
  }
};

/**
 * Extract halachic ruling patterns from text
 * @param {string} text - Hebrew text
 * @returns {Object[]} Array of rulings with type and context
 */
function extractRulings(text) {
  const rulings = [];
  const patterns = [
    { regex: /(?:העני|עני)\s*[\u0590-\u05FF]*\s*(?:חייב|פטור)/g, actor: 'עני', actionType: 'transfer' },
    { regex: /(?:בעל\s+הבית|בעה"ב)\s*[\u0590-\u05FF]*\s*(?:חייב|פטור)/g, actor: 'בעל הבית', actionType: 'transfer' },
    { regex: /שניהם\s+(?:פטורים|חייבים)/g, actor: 'שניהם', actionType: 'both' },
    { regex: /(?:מותר|אסור)\s+[\u0590-\u05FF]{2,20}/g, actor: null, actionType: 'permission' },
    { regex: /(?:חייב|פטור)\s+[\u0590-\u05FF]{2,20}/g, actor: null, actionType: 'liability' }
  ];

  for (const { regex, actor, actionType } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      rulings.push({
        text: match[0],
        actor,
        actionType,
        isLiable: match[0].includes('חייב'),
        isExempt: match[0].includes('פטור'),
        isPermitted: match[0].includes('מותר'),
        isForbidden: match[0].includes('אסור'),
        position: match.index
      });
    }
  }

  return rulings;
}

/**
 * PRO SCHOLAR V26: Generate a meaningful Mishna summary
 * Creates a one-liner that explains the actual halachic content
 * @param {string} text - Mishna text
 * @param {Object} analysis - Output from analyzeMishnaStructure
 * @returns {Object} Summary with oneLiner, topic, details, and rulings
 */
export function generateMishnaSummary(text, analysis = null) {
  if (!text) return { oneLiner: '', topic: '', details: '', rulings: [] };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // Check for known Mishna openings
  for (const [opening, info] of Object.entries(KNOWN_MISHNA_OPENINGS)) {
    if (cleanText.includes(opening)) {
      const rulings = extractRulings(cleanText);
      return {
        oneLiner: info.summary,
        topic: info.topic,
        details: info.details,
        rulings,
        isKnown: true
      };
    }
  }

  // Generate dynamic summary based on detected patterns
  const structureAnalysis = analysis || analyzeMishnaStructure(text);
  const { elements = [], summary = {} } = structureAnalysis;

  // Extract key content
  const rulings = extractRulings(cleanText);
  const liableCount = rulings.filter(r => r.isLiable).length;
  const exemptCount = rulings.filter(r => r.isExempt).length;

  // Build summary based on detected elements
  const summaryParts = [];

  // Check for enumeration (שתים שהן ארבע pattern)
  const enumMatch = cleanText.match(/(?:שתים|שלש|ארבע|חמש|שש|שבע)\s+(?:שהן|שהם)\s+(?:ארבע|שש|שמונה|עשר)/);
  if (enumMatch) {
    summaryParts.push(`מניין: ${enumMatch[0]}`);
  }

  // Count rulings
  if (liableCount > 0 || exemptCount > 0) {
    const ruleParts = [];
    if (liableCount > 0) ruleParts.push(`${liableCount} מקרי חיוב`);
    if (exemptCount > 0) ruleParts.push(`${exemptCount} מקרי פטור`);
    summaryParts.push(ruleParts.join(' ו-'));
  }

  // Check for dispute
  if (summary.hasDisputes) {
    summaryParts.push('מחלוקת תנאים');
  }

  // Check for cases
  if (elements.some(e => e.type === 'case_structure')) {
    const caseTexts = elements.filter(e => e.type === 'case_structure').map(e => e.text);
    if (caseTexts.length > 0) {
      summaryParts.push(`מקרים: ${caseTexts.slice(0, 2).join(', ')}`);
    }
  }

  // Generate one-liner
  let oneLiner = '';
  if (summaryParts.length > 0) {
    oneLiner = summaryParts.join(' • ');
  } else {
    // Fallback: Extract first meaningful sentence
    const firstSentence = cleanText.split(/[.:]/).filter(s => s.length > 10)[0];
    if (firstSentence) {
      oneLiner = firstSentence.trim().substring(0, 80) + (firstSentence.length > 80 ? '...' : '');
    }
  }

  // Determine topic from content
  let topic = 'נושא המשנה';
  if (cleanText.includes('שבת') || cleanText.includes('הוצאה') || cleanText.includes('מלאכ')) {
    topic = 'הלכות שבת';
  } else if (cleanText.includes('קורא') || cleanText.includes('שמע')) {
    topic = 'קריאת שמע';
  } else if (cleanText.includes('תפל')) {
    topic = 'הלכות תפילה';
  }

  return {
    oneLiner,
    topic,
    details: `${elements.length} אלמנטים מבניים זוהו`,
    rulings,
    isKnown: false,
    breakdown: summary.breakdown || {}
  };
}

// =============================================================================
// GEMARA Q&A FLOW EXTRACTOR (PRO SCHOLAR V26)
// Enhanced to detect source-based and comparison-based Gemara flows
// =============================================================================

/**
 * Extract Q&A flow from Gemara text
 * Groups patterns into logical question-answer-resolution chains
 * PRO SCHOLAR V25: Also detects source-based flows (e.g., "תנן התם")
 * @param {string} text - Gemara text to analyze
 * @returns {Object} Q&A flow with questions, challenges, proofs, and resolutions
 */
export function extractGemaraQA(text) {
  if (!text) return { flow: [], summary: { questionsAsked: 0, challengesRaised: 0, proofsOffered: 0, resolved: 0, unresolved: 0 } };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  // Detect all discourse patterns
  const patterns = detectStructuralMarkers(cleanText);

  // PRO SCHOLAR V26: Enhanced implicit question patterns for better Q&A detection
  // Includes Shabbat 2a specific patterns and general Talmudic inquiry forms
  const implicitQuestions = [];
  const implicitPatterns = [
    // Basic question forms
    { regex: /מאי\s+[א-ת]{2,}/g, label: 'מאי (שאלה)', type: 'question' },
    { regex: /מהו\s+[א-ת]{2,}/g, label: 'מהו', type: 'question' },
    { regex: /מנא\s+הני\s+מילי/g, label: 'מנא הני מילי', type: 'question' },
    { regex: /מנלן/g, label: 'מנלן', type: 'question' },
    { regex: /היכי\s+דמי/g, label: 'היכי דמי', type: 'question' },
    { regex: /פשיטא/g, label: 'פשיטא (קושיא)', type: 'objection' },
    { regex: /למימרא/g, label: 'למימרא', type: 'question' },
    { regex: /איבעיא\s+להו/g, label: 'איבעיא להו', type: 'disputed' },
    // PRO SCHOLAR V29: כיצד is a Mishna case introduction, not a Gemara question
    { regex: /כיצד/g, label: 'כיצד', type: 'case_structure' },
    { regex: /הא\s+תנן/g, label: 'הא תנן', type: 'question' },
    { regex: /מאי\s+טעמא/g, label: 'מה הטעם?', type: 'question' },
    { regex: /מאי\s+שנא/g, label: 'מה שונה?', type: 'question' },
    { regex: /למה\s+לי/g, label: 'למה לי?', type: 'question' },
    { regex: /לאתויי\s+מאי/g, label: 'לאתויי מאי?', type: 'question' },
    { regex: /אמאי/g, label: 'אמאי?', type: 'question' },
    { regex: /מדוע/g, label: 'מדוע?', type: 'question' },
    // Source-based questions
    { regex: /תנן\s+התם/g, label: 'תנן התם', type: 'source_citation' },
    { regex: /דתנן/g, label: 'דתנן', type: 'source_citation' },
    { regex: /תנו\s+רבנן/g, label: 'תנו רבנן', type: 'source_citation' },
    { regex: /תניא/g, label: 'תניא', type: 'source_citation' },
    // Challenges and objections
    { regex: /והאמר/g, label: 'והאמר', type: 'objection' },
    { regex: /ורמינהו/g, label: 'ורמינהו', type: 'objection' },
    { regex: /מיתיבי/g, label: 'מיתיבי', type: 'objection' },
    { regex: /מתקיף\s+לה/g, label: 'מתקיף', type: 'objection' },
    { regex: /קשיא/g, label: 'קשיא', type: 'objection' },
    // Resolutions - V30: Significantly expanded
    { regex: /לא\s+קשיא/g, label: 'לא קשיא', type: 'resolution' },
    { regex: /הכא\s+במאי\s+עסקינן/g, label: 'הכא במאי עסקינן', type: 'resolution' },
    { regex: /אמר\s+לך/g, label: 'אמר לך', type: 'resolution' },
    { regex: /הכי\s+קאמר/g, label: 'הכי קאמר', type: 'resolution' },
    { regex: /אלא\s+אמר/g, label: 'אלא אמר', type: 'resolution' },
    { regex: /הכי\s+נמי/g, label: 'הכי נמי', type: 'resolution' },
    { regex: /שאני/g, label: 'שאני (חילוק)', type: 'resolution' },
    { regex: /לעולם/g, label: 'לעולם', type: 'resolution' },
    { regex: /כדאמרן/g, label: 'כדאמרן', type: 'resolution' },
    { regex: /לא\s+צריכא/g, label: 'לא צריכא', type: 'resolution' },
    { regex: /דאמר\s+קרא/g, label: 'דאמר קרא', type: 'resolution' },
    { regex: /תנאי\s+היא/g, label: 'תנאי היא', type: 'resolution' },
    { regex: /אין\s+הכי\s+נמי/g, label: 'אין הכי נמי', type: 'resolution' },
    { regex: /הא\s+מני/g, label: 'הא מני', type: 'resolution' },
    { regex: /כגון/g, label: 'כגון', type: 'resolution' },
    // Unresolved markers - V30: Track open questions
    { regex: /תיקו/g, label: 'תיקו', type: 'unresolved' },
    { regex: /צריך\s+עיון/g, label: 'צריך עיון', type: 'unresolved' },
    { regex: /קשיא$/gm, label: 'נשאר בקשיא', type: 'unresolved' },
    // Conclusions
    { regex: /שמע\s+מינה/g, label: 'שמע מינה', type: 'halachic_conclusion' },
    { regex: /מכלל\s+ד/g, label: 'מכלל', type: 'halachic_conclusion' },
    { regex: /הלכתא/g, label: 'הלכתא', type: 'halachic_conclusion' },
    { regex: /אלמא/g, label: 'אלמא', type: 'halachic_conclusion' },
    { regex: /נמצא/g, label: 'נמצא', type: 'halachic_conclusion' }
  ];

  for (const { regex, label, type } of implicitPatterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      implicitQuestions.push({
        marker: match[0],
        label,
        type,
        category: type,
        position: match.index
      });
    }
  }

  // Combine and sort all patterns
  const allPatterns = [...patterns, ...implicitQuestions].sort((a, b) => a.position - b.position);

  // Group into Q&A units
  const flow = [];
  let currentUnit = null;

  const questionTypes = ['question', 'disputed'];
  const challengeTypes = ['objection', 'contradiction'];
  const proofTypes = ['proof'];
  const sourceTypes = ['source_citation', 'tannaitic_source'];
  const resolutionTypes = ['resolution', 'halachic_conclusion'];
  const startUnitTypes = ['source_citation', 'tannaitic_source', 'explication'];

  for (const pattern of allPatterns) {
    const patternType = pattern.category || pattern.type;

    // Start new Q&A unit on question
    if (questionTypes.includes(patternType)) {
      if (currentUnit) flow.push(currentUnit);
      currentUnit = {
        type: 'qa_unit',
        question: pattern,
        sources: [],
        challenges: [],
        proofs: [],
        resolution: null,
        speakers: []
      };
    }
    // PRO V25: Start unit on source citation if no unit exists (common in Bavli)
    else if (startUnitTypes.includes(patternType) && !currentUnit) {
      currentUnit = {
        type: 'source_unit',
        question: { marker: pattern.marker, label: pattern.hebrewLabel || pattern.label, type: 'source' },
        sources: [pattern],
        challenges: [],
        proofs: [],
        resolution: null,
        speakers: []
      };
    }
    // Add challenge to current unit or start new unit
    else if (challengeTypes.includes(patternType)) {
      if (!currentUnit) {
        currentUnit = {
          type: 'challenge_unit',
          question: { marker: pattern.marker, label: 'קושיא', type: 'challenge' },
          sources: [],
          challenges: [],
          proofs: [],
          resolution: null,
          speakers: []
        };
      }
      currentUnit.challenges.push(pattern);
    }
    // Add source/proof to current unit
    else if (sourceTypes.includes(patternType) && currentUnit) {
      currentUnit.sources.push(pattern);
    }
    else if (proofTypes.includes(patternType) && currentUnit) {
      currentUnit.proofs.push(pattern);
    }
    // Set resolution
    else if (resolutionTypes.includes(patternType) && currentUnit) {
      currentUnit.resolution = pattern;
      flow.push(currentUnit);
      currentUnit = null;
    }
    // Track speakers
    else if (patternType === 'speaker' && currentUnit) {
      currentUnit.speakers.push(pattern);
    }
  }

  // Push final unit if exists
  if (currentUnit) flow.push(currentUnit);

  // Generate summary
  const summary = {
    totalUnits: flow.length,
    questionsAsked: flow.filter(u => u.type === 'qa_unit').length,
    sourceCitations: flow.filter(u => u.type === 'source_unit').length,
    challengesRaised: flow.reduce((sum, u) => sum + u.challenges.length, 0),
    proofsOffered: flow.reduce((sum, u) => sum + (u.proofs?.length || 0) + (u.sources?.length || 0), 0),
    resolved: flow.filter(u => u.resolution).length,
    unresolved: flow.filter(u => !u.resolution).length
  };

  return { flow, summary };
}

/**
 * PRO SCHOLAR V30: Enhanced visual flow diagram with subgraphs and cross-references
 * Enhanced to include Mishna structure, cross-refs, and sage statements
 * @param {string} text - Gemara text
 * @returns {string} Mermaid diagram code
 */
export function generateQAFlowDiagram(text) {
  const { flow, summary } = extractGemaraQA(text);
  const mishnaAnalysis = analyzeMishnaStructure(text);
  const mishnaSummary = generateMishnaSummary(text, mishnaAnalysis);

  // V28: Also try to generate from structural markers if flow is empty
  if (flow.length === 0 && mishnaAnalysis.elements.length === 0) {
    // Fall back to pattern-based diagram generation
    return generatePatternBasedDiagram(text);
  }

  // V30: Extract cross-references and sages for enhanced diagram
  const crossRefs = extractEnhancedCrossRefs(text);
  const sages = extractSagesFromText(text);

  let mermaid = 'flowchart TD\n';

  // V30: Enhanced styling with better visuals
  mermaid += '  classDef mishna fill:#DBEAFE,stroke:#3B82F6,color:#1E40AF,font-weight:bold,stroke-width:2px\n';
  mermaid += '  classDef question fill:#FEF3C7,stroke:#F59E0B,color:#92400E,stroke-width:2px\n';
  mermaid += '  classDef challenge fill:#FEE2E2,stroke:#EF4444,color:#991B1B,stroke-width:2px\n';
  mermaid += '  classDef proof fill:#D1FAE5,stroke:#10B981,color:#047857,stroke-width:2px\n';
  mermaid += '  classDef resolution fill:#DDD6FE,stroke:#7C3AED,color:#5B21B6,stroke-width:2px\n';
  mermaid += '  classDef liable fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:2px\n';
  mermaid += '  classDef exempt fill:#D1FAE5,stroke:#10B981,color:#065F46,stroke-width:2px\n';
  mermaid += '  classDef gemara fill:#FEF9C3,stroke:#CA8A04,color:#713F12,stroke-width:2px\n';
  mermaid += '  classDef sage fill:#F3E8FF,stroke:#8B5CF6,color:#6D28D9,stroke-width:2px\n';
  mermaid += '  classDef crossref fill:#E0F2FE,stroke:#0EA5E9,color:#0369A1,stroke-width:1px,stroke-dasharray:3\n';
  mermaid += '  classDef baraita fill:#E0E7FF,stroke:#6366F1,color:#4338CA,stroke-width:2px\n';
  mermaid += '  classDef scripture fill:#CCFBF1,stroke:#14B8A6,color:#0F766E,stroke-width:2px\n';
  mermaid += '  classDef conclusion fill:#FDF4FF,stroke:#D946EF,color:#A21CAF,stroke-width:3px\n\n';

  let nodeIndex = 0;
  let prevNode = null;
  const mishnaNodeIds = [];
  const gemaraNodeIds = [];

  // V30: Create Mishna subgraph if we have content
  const hasMishnaContent = mishnaSummary?.topic || (mishnaSummary?.rulings?.length > 0);
  if (hasMishnaContent) {
    mermaid += '  subgraph MISHNA["📘 משנה"]\n';
    mermaid += '    direction TB\n';

    // Add Mishna topic header if available
    if (mishnaSummary?.topic && mishnaSummary.isKnown) {
      const topicId = `T${nodeIndex++}`;
      const topicText = mishnaSummary.topic.replace(/"/g, "'").substring(0, 22);
      mermaid += `    ${topicId}["${topicText}"]\n`;
      mishnaNodeIds.push(topicId);
      prevNode = topicId;
    }

    // Add Mishna rulings to the diagram
    if (mishnaSummary?.rulings && mishnaSummary.rulings.length > 0) {
      const uniqueRulings = [...new Set(mishnaSummary.rulings.map(r => r.text))].slice(0, 4);
      uniqueRulings.forEach((ruling, i) => {
        const rulingId = `R${nodeIndex++}`;
        const rulingText = ruling.replace(/"/g, "'").substring(0, 18);
        const isLiable = ruling.includes('חייב');
        const icon = isLiable ? '🔴' : '🟢';
        mermaid += `    ${rulingId}["${icon} ${rulingText}"]\n`;
        mishnaNodeIds.push(rulingId);

        if (prevNode) {
          mermaid += `    ${prevNode} --> ${rulingId}\n`;
        }
        prevNode = rulingId;
      });
    }

    mermaid += '  end\n\n';
  }

  // V30: Create Gemara subgraph with Q&A flow
  const hasGemaraContent = flow.length > 0 || sages.length > 0;
  if (hasGemaraContent) {
    mermaid += '  subgraph GEMARA["📜 גמרא"]\n';
    mermaid += '    direction TB\n';

    // Add Gemara header
    const gemaraId = `G${nodeIndex++}`;
    mermaid += `    ${gemaraId}["גמרא"]\n`;
    gemaraNodeIds.push({ id: gemaraId, type: 'gemara' });

    if (prevNode && hasMishnaContent) {
      // Will link after subgraph
    }
    prevNode = gemaraId;

    // V30: Add sage statements as nodes
    const uniqueSages = [...new Set(sages.map(s => s.name))].slice(0, 3);
    uniqueSages.forEach((sageName, i) => {
      const sageId = `S${nodeIndex++}`;
      const sageText = sageName.substring(0, 12).replace(/"/g, "'");
      mermaid += `    ${sageId}["👤 ${sageText}"]\n`;
      gemaraNodeIds.push({ id: sageId, type: 'sage' });
    });

    // Q&A flow
    flow.forEach((unit, i) => {
      const qId = `Q${nodeIndex++}`;
      const qText = (unit.question?.marker?.substring(0, 14) || `שאלה ${i + 1}`).replace(/"/g, "'");
      mermaid += `    ${qId}["❓ ${qText}"]\n`;
      gemaraNodeIds.push({ id: qId, type: 'question' });

      if (prevNode) {
        mermaid += `    ${prevNode} --> ${qId}\n`;
      }

      // Add challenges
      unit.challenges.forEach((c, j) => {
        const cId = `C${nodeIndex++}`;
        const cText = (c.marker?.substring(0, 10) || 'קושיא').replace(/"/g, "'");
        mermaid += `    ${cId}["⚡ ${cText}"]\n`;
        mermaid += `    ${qId} --> ${cId}\n`;
        gemaraNodeIds.push({ id: cId, type: 'challenge' });
      });

      // Add proofs
      unit.proofs.forEach((p, j) => {
        const pId = `P${nodeIndex++}`;
        const pText = (p.marker?.substring(0, 10) || 'ראיה').replace(/"/g, "'");
        mermaid += `    ${pId}["✅ ${pText}"]\n`;
        mermaid += `    ${qId} --> ${pId}\n`;
        gemaraNodeIds.push({ id: pId, type: 'proof' });
      });

      // Add resolution with thick arrow
      if (unit.resolution) {
        const rId = `RS${nodeIndex++}`;
        const rText = (unit.resolution.marker?.substring(0, 10) || 'תירוץ').replace(/"/g, "'");
        mermaid += `    ${rId}["🎯 ${rText}"]\n`;
        mermaid += `    ${qId} ==> ${rId}\n`;
        gemaraNodeIds.push({ id: rId, type: 'resolution' });
        prevNode = rId;
      } else {
        prevNode = qId;
      }
    });

    mermaid += '  end\n\n';
  }

  // V30: Add cross-references subgraph if present
  if (crossRefs.length > 0) {
    mermaid += '  subgraph REFS["🔗 הפניות"]\n';
    mermaid += '    direction LR\n';

    const refNodeIds = [];
    crossRefs.slice(0, 4).forEach((ref, i) => {
      const refId = `XR${nodeIndex++}`;
      const refText = (ref.text || ref.tractate || 'מקור').substring(0, 12).replace(/"/g, "'");
      const icon = ref.icon || '📚';
      mermaid += `    ${refId}["${icon} ${refText}"]\n`;
      refNodeIds.push(refId);
    });

    mermaid += '  end\n\n';

    // Link refs to main content with dashed lines
    if (mishnaNodeIds.length > 0 && refNodeIds.length > 0) {
      mermaid += `  ${mishnaNodeIds[0]} -.- ${refNodeIds[0]}\n`;
    }

    // Apply crossref class
    if (refNodeIds.length > 0) {
      mermaid += `  class ${refNodeIds.join(',')} crossref\n`;
    }
  }

  // Apply classes to nodes
  if (mishnaNodeIds.length > 0) {
    mermaid += `  class ${mishnaNodeIds.join(',')} mishna\n`;
  }
  gemaraNodeIds.forEach(n => {
    mermaid += `  class ${n.id} ${n.type}\n`;
  });

  // Link Mishna to Gemara subgraphs
  if (hasMishnaContent && hasGemaraContent && mishnaNodeIds.length > 0 && gemaraNodeIds.length > 0) {
    mermaid += `  ${mishnaNodeIds[mishnaNodeIds.length - 1]} --> ${gemaraNodeIds[0].id}\n`;
  }

  // Add unresolved indicator
  if (summary.unresolved > 0) {
    const unresolvedId = `U${nodeIndex++}`;
    mermaid += `  ${unresolvedId}["⏳ ${summary.unresolved} פתוחות"]\n`;
    mermaid += `  class ${unresolvedId} question\n`;
    if (prevNode) {
      mermaid += `  ${prevNode} -.-> ${unresolvedId}\n`;
    }
  }

  // V30: Add conclusion node if there are resolutions
  if (summary.resolutions > 0) {
    const conclusionId = `CON${nodeIndex++}`;
    mermaid += `  ${conclusionId}(["🎯 מסקנה"])\n`;
    mermaid += `  class ${conclusionId} conclusion\n`;
    if (prevNode) {
      mermaid += `  ${prevNode} ==> ${conclusionId}\n`;
    }
  }

  return mermaid;
}

/**
 * V30: Extract cross-references for diagram
 * @param {string} text - Source text
 * @returns {Array} Array of cross-reference objects
 */
function extractEnhancedCrossRefs(text) {
  if (!text) return [];

  const cleanText = stripNikudLocal(text);
  const refs = [];

  // Parallel Mishna pattern
  const mishnaPattern = /תנן\s+התם\s*([\u0590-\u05FF\s]{3,30})/g;
  let match;
  while ((match = mishnaPattern.exec(cleanText)) !== null) {
    refs.push({ type: 'mishna', text: match[1]?.trim(), icon: '📘' });
  }

  // Baraita pattern
  const baraitaPattern = /(?:תניא|תנו\s*רבנן)\s*([\u0590-\u05FF\s]{3,30})/g;
  while ((match = baraitaPattern.exec(cleanText)) !== null) {
    refs.push({ type: 'baraita', text: match[1]?.trim(), icon: '📋' });
  }

  // Scripture pattern
  const scripturePattern = /(?:דכתיב|שנאמר)\s*([\u0590-\u05FF\s]{3,30})/g;
  while ((match = scripturePattern.exec(cleanText)) !== null) {
    refs.push({ type: 'scripture', text: match[1]?.trim(), icon: '📖' });
  }

  // Tractate references
  const tractatePattern = /במסכת\s+(\S+)|כדאמרינן\s+ב(\S+)/g;
  while ((match = tractatePattern.exec(cleanText)) !== null) {
    const tractate = match[1] || match[2];
    if (tractate) {
      refs.push({ type: 'tractate', tractate: tractate.trim(), text: tractate, icon: '📚' });
    }
  }

  return refs.slice(0, 6);
}

/**
 * V30: Extract sage names from text
 * @param {string} text - Source text
 * @returns {Array} Array of sage objects
 */
function extractSagesFromText(text) {
  if (!text) return [];

  const cleanText = stripNikudLocal(text);
  const sages = [];
  const seenNames = new Set();

  // Sage statement patterns
  const patterns = [
    /אמר\s+(רב[יא]?\s*\S{2,10})/g,
    /אמר\s+(ר['׳]\s*\S{2,10})/g,
    /א"ר\s*(\S{2,10})/g
  ];

  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(cleanText)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length >= 2 && !seenNames.has(name)) {
        seenNames.add(name);
        sages.push({ name, position: match.index });
      }
    }
  });

  return sages.slice(0, 5);
}

/**
 * V28: Generate a Mermaid diagram from structural markers
 * Fallback for when Q&A flow extraction doesn't find structured units
 */
function generatePatternBasedDiagram(text) {
  const markers = detectStructuralMarkers(text);
  if (!markers || markers.length === 0) return null;

  let mermaid = 'flowchart TD\n';
  mermaid += '  classDef mishna fill:#DBEAFE,stroke:#3B82F6\n';
  mermaid += '  classDef gemara fill:#FEF3C7,stroke:#D97706\n';
  mermaid += '  classDef question fill:#FEF3C7,stroke:#F59E0B\n';
  mermaid += '  classDef objection fill:#FEE2E2,stroke:#EF4444\n';
  mermaid += '  classDef proof fill:#D1FAE5,stroke:#10B981\n';
  mermaid += '  classDef resolution fill:#DDD6FE,stroke:#7C3AED\n';
  mermaid += '  classDef legal fill:#FEE2E2,stroke:#DC2626\n';
  mermaid += '  classDef sage fill:#F3E8FF,stroke:#8B5CF6\n';
  mermaid += '  classDef baraita fill:#E0E7FF,stroke:#6366F1\n';
  mermaid += '  classDef scripture fill:#CCFBF1,stroke:#14B8A6\n\n';

  // Build nodes
  let prevId = null;
  markers.forEach((m, i) => {
    const nodeId = `N${i}`;
    const nodeText = m.marker?.substring(0, 15)?.replace(/"/g, "'") || m.type;
    const icon = TALMUDIC_PATTERNS[m.type]?.icon || '📝';
    const cssClass = getCssClassForType(m.type);

    mermaid += `  ${nodeId}["${icon} ${nodeText}"]:::${cssClass}\n`;

    // Link to previous node
    if (prevId !== null) {
      // Use different arrow styles based on relationship
      const arrowStyle = getArrowStyle(markers[i - 1]?.type, m.type);
      mermaid += `  ${prevId} ${arrowStyle} ${nodeId}\n`;
    }
    prevId = nodeId;
  });

  return mermaid;
}

/**
 * V28: Get CSS class for pattern type
 */
function getCssClassForType(type) {
  const typeMap = {
    mishna: 'mishna',
    gemara: 'gemara',
    question: 'question',
    objection: 'objection',
    proof: 'proof',
    resolution: 'resolution',
    legal_ruling: 'legal',
    sage_statement: 'sage',
    baraita: 'baraita',
    scripture: 'scripture',
    alternative: 'question'
  };
  return typeMap[type] || 'question';
}

/**
 * V28: Get arrow style based on pattern relationship
 */
function getArrowStyle(prevType, currentType) {
  // Question to resolution: thick arrow
  if (prevType === 'question' && currentType === 'resolution') {
    return '==>';
  }
  // Objection to resolution: thick arrow
  if (prevType === 'objection' && currentType === 'resolution') {
    return '==>';
  }
  // Normal flow
  return '-->';
}

// =============================================================================
// PRO SCHOLAR V30: SVARA (LOGIC) DETECTION
// Detects underlying logical principles and hermeneutic rules
// =============================================================================

/**
 * PRO SCHOLAR V30: Detect Svara (logical reasoning) patterns in Talmudic text
 * Identifies hermeneutic rules, logical principles, and reasoning patterns
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Array} Array of detected svara patterns with type and context
 */
export function detectSvarot(text) {
  if (!text) return [];

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const svaraPatterns = [
    // Logical reasoning
    { regex: /מסתברא\s+([\u0590-\u05FF\s]{5,50})/g, type: 'logical_reasoning', label: 'מסתברא', icon: '🧠' },
    { regex: /סברא\s+היא/g, type: 'logical_principle', label: 'סברא היא', icon: '💭' },
    { regex: /מה\s+טעם/g, type: 'reason_inquiry', label: 'מה טעם', icon: '❓' },

    // Hermeneutic rules (מידות שהתורה נדרשת בהן)
    { regex: /קל\s+וחומר/g, type: 'kal_vachomer', label: 'קל וחומר', icon: '⬆️', description: 'A fortiori' },
    { regex: /גזרה\s+שוה/g, type: 'gezera_shava', label: 'גזרה שוה', icon: '🔗', description: 'Word analogy' },
    { regex: /בנין\s+אב/g, type: 'binyan_av', label: 'בנין אב', icon: '🏛️', description: 'Prototype' },
    { regex: /מה\s+מצינו/g, type: 'mah_matzinu', label: 'מה מצינו', icon: '🔍', description: 'What we find' },
    { regex: /היקש/g, type: 'hekesh', label: 'היקש', icon: '⚖️', description: 'Juxtaposition' },
    { regex: /סמוכין/g, type: 'semuchin', label: 'סמוכין', icon: '📐', description: 'Proximity' },
    { regex: /כלל\s+ופרט/g, type: 'klal_uprat', label: 'כלל ופרט', icon: '📊', description: 'General/specific' },
    { regex: /ריבוי\s+ומיעוט/g, type: 'ribui_miut', label: 'ריבוי ומיעוט', icon: '±', description: 'Include/exclude' },

    // Logical distinctions
    { regex: /אין\s+למדין\s+מן\s+הכללות/g, type: 'klalot_rule', label: 'אין למדין מן הכללות', icon: '⚠️' },
    { regex: /כל\s+היכא\s+ד/g, type: 'general_principle', label: 'כל היכא ד', icon: '📜' },
    { regex: /מידי\s+דהוה/g, type: 'comparison', label: 'מידי דהוה', icon: '↔️' },
    { regex: /לאו\s+כל\s+כמינך/g, type: 'limitation', label: 'לאו כל כמינך', icon: '🚫' },

    // Assumptions and conclusions
    { regex: /הוה\s+אמינא/g, type: 'initial_thought', label: 'הו"א', icon: '💭', description: 'I would have thought' },
    { regex: /קא\s+משמע\s+לן/g, type: 'teaching', label: 'קמ"ל', icon: '💡', description: 'It teaches us' },
    { regex: /צריכא/g, type: 'necessity', label: 'צריכא', icon: '✓', description: 'Necessary' },
    { regex: /למעוטי\s+מאי/g, type: 'exclusion', label: 'למעוטי מאי', icon: '➖' }
  ];

  const results = [];
  for (const { regex, type, label, icon, description } of svaraPatterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      results.push({
        type,
        label,
        icon,
        description: description || '',
        text: match[0],
        context: match[1] || '',
        position: match.index
      });
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

// =============================================================================
// PRO SCHOLAR V30: HALACHIC CONCLUSION EXTRACTOR
// =============================================================================

/**
 * PRO SCHOLAR V30: Extract halachic conclusions and rulings from text
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Array} Array of halachic conclusions with classification
 */
export function extractHalachicConclusions(text) {
  if (!text) return [];

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const conclusions = [];

  const patterns = [
    // Definitive rulings
    { regex: /הלכה\s+כ([\u0590-\u05FF]+)/g, type: 'ruling_like', extract: 1, icon: '⚖️' },
    { regex: /הלכתא\s+([\u0590-\u05FF\s]{3,30})/g, type: 'halachta', extract: 1, icon: '⚖️' },
    { regex: /קיימא\s+לן/g, type: 'established_law', icon: '✓' },
    { regex: /הכי\s+נקטינן/g, type: 'we_hold', icon: '✓' },

    // Liability rulings
    { regex: /(חייב)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'liable', extract: 0, icon: '🔴' },
    { regex: /(פטור)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'exempt', extract: 0, icon: '🟢' },
    { regex: /(מותר)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'permitted', extract: 0, icon: '✅' },
    { regex: /(אסור)\s+([\u0590-\u05FF\s]{2,25})/g, type: 'forbidden', extract: 0, icon: '🚫' },

    // Ritual status
    { regex: /(טהור|טמא)\s*([\u0590-\u05FF\s]{0,20})/g, type: 'purity_status', extract: 0, icon: '🔵' },
    { regex: /(כשר|פסול)\s*([\u0590-\u05FF\s]{0,20})/g, type: 'validity_status', extract: 0, icon: '✓' },

    // Final statements
    { regex: /נמצא\s+([\u0590-\u05FF\s]{5,40})/g, type: 'conclusion', extract: 1, icon: '📝' },
    { regex: /אלמא\s+([\u0590-\u05FF\s]{5,40})/g, type: 'therefore', extract: 1, icon: '➡️' }
  ];

  for (const { regex, type, extract, icon } of patterns) {
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const fullText = match[0];
      conclusions.push({
        type,
        icon,
        fullText,
        extracted: extract !== undefined ? (match[extract] || fullText) : fullText,
        position: match.index,
        isLiable: fullText.includes('חייב'),
        isExempt: fullText.includes('פטור'),
        isPermitted: fullText.includes('מותר'),
        isForbidden: fullText.includes('אסור')
      });
    }
  }

  return conclusions.sort((a, b) => a.position - b.position);
}

// =============================================================================
// PRO SCHOLAR V30: CROSS-REFERENCE DETECTION
// =============================================================================

/**
 * PRO SCHOLAR V30: Detect cross-references to other Talmudic sources
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Categorized cross-references
 */
export function detectCrossReferences(text) {
  if (!text) return { parallel_sugya: [], mishna_elsewhere: [], baraita: [], scripture: [], yerushalmi: [], midrash: [] };

  // PRO SCHOLAR V12: Using centralized stripAllDiacritics
  const cleanText = stripAllDiacritics(text);

  const refs = {
    parallel_sugya: [],
    mishna_elsewhere: [],
    baraita: [],
    scripture: [],
    yerushalmi: [],
    midrash: []
  };

  // Parallel Mishna references
  const mishnaPattern = /(?:תנן\s+התם|הא\s+תנן|כדתנן|דתנן)\s*([\u0590-\u05FF\s]{3,50})/g;
  let match;
  while ((match = mishnaPattern.exec(cleanText)) !== null) {
    refs.mishna_elsewhere.push({ marker: match[0].trim(), context: match[1]?.trim() || '', position: match.index, icon: '📘' });
  }

  // Baraita references
  const baraitaPattern = /(?:תנו\s+רבנן|תניא|ת"ר|דתניא)\s*([\u0590-\u05FF\s]{3,60})/g;
  while ((match = baraitaPattern.exec(cleanText)) !== null) {
    refs.baraita.push({ marker: match[0].trim(), context: match[1]?.trim() || '', position: match.index, icon: '📋' });
  }

  // Scripture citations
  const scripturePattern = /(?:שנאמר|דכתיב|כדכתיב|הכתוב\s+אומר)\s*([\u0590-\u05FF\s]{3,60})/g;
  while ((match = scripturePattern.exec(cleanText)) !== null) {
    refs.scripture.push({ marker: match[0].trim(), verse: match[1]?.trim() || '', position: match.index, icon: '📖' });
  }

  // Other tractate references
  const tractatePattern = /(?:כדאמרינן|כדאיתא)\s+(?:ב)?(שבת|עירובין|פסחים|ברכות|יומא|סוכה|ביצה|מגילה|יבמות|כתובות|גיטין|קידושין|בבא\s*קמא|בבא\s*מציעא|בבא\s*בתרא|סנהדרין|מכות|חולין|נדה)/g;
  while ((match = tractatePattern.exec(cleanText)) !== null) {
    refs.parallel_sugya.push({ marker: match[0], tractate: match[1], position: match.index, icon: '📚' });
  }

  // Yerushalmi references
  const yerushalmiPattern = /(?:ירושלמי|תלמודא\s*דמערבא)/g;
  while ((match = yerushalmiPattern.exec(cleanText)) !== null) {
    refs.yerushalmi.push({ marker: match[0], position: match.index, icon: '🏛️' });
  }

  return refs;
}

// =============================================================================
// PRO SCHOLAR V30: ARGUMENT CHAIN TRACKING
// =============================================================================

/**
 * PRO SCHOLAR V30: Build argument chain with depth tracking
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Argument chain with depth, status, and relationships
 */
export function buildArgumentChain(text) {
  if (!text) return { chain: [], maxDepth: 0, unresolvedCount: 0, summary: {} };

  const markers = detectStructuralMarkers(text);
  const chain = [];
  let depth = 0;
  let maxDepth = 0;
  let questionId = 0;

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const node = { ...m, id: `node-${i}`, depth, direction: 'statement', status: null, resolvedBy: null, questionId: null };

    if (['question', 'objection'].includes(m.type)) {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
      node.depth = depth;
      node.direction = 'question';
      node.status = 'open';
      node.questionId = ++questionId;
      chain.push(node);
    }
    else if (['resolution', 'proof', 'halachic_conclusion'].includes(m.type)) {
      const openQuestions = chain.filter(c => c.status === 'open');
      const matchingQuestion = openQuestions[openQuestions.length - 1];

      if (matchingQuestion) {
        matchingQuestion.status = 'resolved';
        matchingQuestion.resolvedBy = `node-${i}`;
        node.resolves = matchingQuestion.id;
      }

      node.depth = Math.max(depth, 1);
      node.direction = 'answer';
      chain.push(node);
      depth = Math.max(0, depth - 1);
    }
    else if (['mishna', 'gemara'].includes(m.type)) {
      depth = 0;
      node.depth = 0;
      node.direction = 'structure';
      chain.push(node);
    }
    else {
      chain.push(node);
    }
  }

  const unresolvedCount = chain.filter(c => c.status === 'open').length;
  const resolvedCount = chain.filter(c => c.status === 'resolved').length;
  const totalQuestions = chain.filter(c => c.direction === 'question').length;

  return {
    chain,
    maxDepth,
    unresolvedCount,
    summary: {
      totalNodes: chain.length,
      totalQuestions,
      resolvedCount,
      unresolvedCount,
      resolutionRate: totalQuestions > 0 ? Math.round((resolvedCount / totalQuestions) * 100) : 100,
      complexity: maxDepth < 2 ? 'simple' : maxDepth < 4 ? 'moderate' : 'complex'
    }
  };
}

/**
 * PRO SCHOLAR V30: Get comprehensive sugya analysis
 * Combines all analysis functions for a complete picture
 * @param {string} text - Hebrew/Aramaic text to analyze
 * @returns {Object} Complete sugya analysis with all components
 */
export function getComprehensiveSugyaAnalysis(text) {
  if (!text) return null;

  const markers = detectStructuralMarkers(text);
  const mishnaAnalysis = analyzeMishnaStructure(text);
  const mishnaSummary = generateMishnaSummary(text, mishnaAnalysis);
  const qaFlow = extractGemaraQA(text);
  const svarot = detectSvarot(text);
  const halachicConclusions = extractHalachicConclusions(text);
  const crossRefs = detectCrossReferences(text);
  const argumentChain = buildArgumentChain(text);

  const hasMishna = markers.some(m => m.type === 'mishna');
  const hasGemara = markers.some(m => m.type === 'gemara') || markers.some(m => ['question', 'objection', 'resolution'].includes(m.type));
  const hasSages = markers.some(m => m.type === 'sage_statement');

  return {
    hasMishna,
    hasGemara,
    hasSages,
    markers,
    mishnaAnalysis,
    mishnaSummary,
    qaFlow,
    argumentChain,
    svarot,
    halachicConclusions,
    crossRefs,
    statistics: {
      totalMarkers: markers.length,
      mishnaElements: mishnaAnalysis.elements.length,
      qaUnits: qaFlow.flow.length,
      svarotCount: svarot.length,
      conclusionsCount: halachicConclusions.length,
      crossRefCount: Object.values(crossRefs).flat().length,
      argumentDepth: argumentChain.maxDepth,
      resolutionRate: argumentChain.summary.resolutionRate
    }
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const discoursePatternService = {
  // Type constants
  DISCOURSE_TYPES,
  DISCOURSE_PATTERNS,
  RABBI_PATTERNS,
  TALMUDIC_PATTERNS,
  MISHNA_STRUCTURE_PATTERNS,

  // Core detection
  detectDiscoursePatterns,
  detectStructuralMarkers,
  detectRabbis,

  // Analysis
  analyzeDiscourseStructure,
  getPatternSummary,
  hasTalmudicStructure,

  // PRO SCHOLAR V26 - Mishna & Gemara Analysis
  analyzeMishnaStructure,
  generateMishnaSummary,
  extractGemaraQA,
  generateQAFlowDiagram,

  // PRO SCHOLAR V30 - Enhanced Analysis
  detectSvarot,
  extractHalachicConclusions,
  detectCrossReferences,
  buildArgumentChain,
  getComprehensiveSugyaAnalysis,

  // Visualization
  generateDiscourseFlowVisualization,
  getFlowDiagram,
  getHighlightedText,
  applyLayerColoring,
  getDiscourseLayerStyles,

  // Segmentation
  segmentIntoSugyaUnits,

  // Tzurat HaDaf (Traditional Page Layout)
  generateTzuratHaDaf,
  generateTzuratHaDafAscii,
  getTzuratHaDafStyles,
  getTzuratHaDafProps,
  renderTzuratHaDafHtml,

  // Utilities
  getPatternTypes,
  getPatternConfig
};

export default discoursePatternService;
