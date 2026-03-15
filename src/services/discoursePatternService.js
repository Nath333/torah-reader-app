// =============================================================================
// Discourse Pattern Detection Service
// Detects Talmudic structural elements: Mishna/Gemara markers, questions,
// objections, proofs, resolutions, and speaker attributions
// =============================================================================

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
    markers: ['מתני׳', 'תנן', 'שנינו', 'מתניתין'],
    color: '#4A90D9', // blue
    label: 'Mishna',
    hebrewLabel: 'משנה',
    icon: '📘'
  },
  gemara: {
    markers: ['גמ׳', 'גְּמָ׳', 'גמרא'],
    color: '#8B4513', // brown
    label: 'Gemara',
    hebrewLabel: 'גמרא',
    icon: '📜'
  },
  question: {
    markers: ['מאי', 'מנא הני מילי', 'מאי טעמא', 'איבעיא להו', 'מאי בינייהו', 'מהו', 'מנלן'],
    color: '#E67E22', // orange
    label: 'Question',
    hebrewLabel: 'שאלה',
    icon: '❓'
  },
  objection: {
    markers: ['מתקיף', 'מתיבי', 'ורמינהו', 'בשלמא', 'אלא'],
    color: '#E74C3C', // red
    label: 'Challenge',
    hebrewLabel: 'קושיא',
    icon: '⚡'
  },
  proof: {
    markers: ['תא שמע', 'שמע מינה', 'תנא כוותיה', 'מסתברא'],
    color: '#27AE60', // green
    label: 'Proof',
    hebrewLabel: 'ראיה',
    icon: '✅'
  },
  resolution: {
    markers: ['תיובתא', 'מסתברא', 'הלכתא', 'לא קשיא', 'הכי קאמר'],
    color: '#9B59B6', // purple
    label: 'Conclusion',
    hebrewLabel: 'מסקנא',
    icon: '🎯'
  },
  alternative: {
    markers: ['איכא דאמרי', 'לישנא אחרינא', 'ואיכא דאמרי'],
    color: '#3498DB', // light blue
    label: 'Alternative View',
    hebrewLabel: 'לישנא אחרינא',
    icon: '🔀'
  },
  baraita: {
    markers: ['תנו רבנן', 'תניא', 'ת״ר', 'תנא'],
    color: '#6366F1', // indigo
    label: 'Baraita',
    hebrewLabel: 'ברייתא',
    icon: '📋'
  },
  scripture: {
    markers: ['שנאמר', 'דכתיב', 'כדכתיב', 'מנין'],
    color: '#14B8A6', // teal
    label: 'Scripture',
    hebrewLabel: 'פסוק',
    icon: '📖'
  }
};

// =============================================================================
// SIMPLIFIED STRUCTURAL MARKER DETECTION
// Returns flat array of markers with positions and styling info
// =============================================================================

/**
 * Detect structural markers in Hebrew text (simplified API)
 * Returns markers sorted by position with styling information
 * @param {string} hebrewText - The text to analyze
 * @returns {Array} Array of detected markers with position, type, color, label
 */
export function detectStructuralMarkers(hebrewText) {
  if (!hebrewText || typeof hebrewText !== 'string') return [];

  const results = [];
  const seenPositions = new Set();

  for (const [type, config] of Object.entries(TALMUDIC_PATTERNS)) {
    for (const marker of config.markers) {
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedMarker, 'g');

      let match;
      while ((match = regex.exec(hebrewText)) !== null) {
        const posKey = `${match.index}`;
        if (seenPositions.has(posKey)) continue;
        seenPositions.add(posKey);

        results.push({
          type,
          marker: match[0],
          position: match.index,
          endPosition: match.index + match[0].length,
          label: config.label,
          hebrewLabel: config.hebrewLabel,
          color: config.color,
          icon: config.icon
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
// DEFAULT EXPORT
// =============================================================================

const discoursePatternService = {
  // Type constants
  DISCOURSE_TYPES,
  DISCOURSE_PATTERNS,
  RABBI_PATTERNS,
  TALMUDIC_PATTERNS,

  // Core detection
  detectDiscoursePatterns,
  detectStructuralMarkers,
  detectRabbis,

  // Analysis
  analyzeDiscourseStructure,
  getPatternSummary,
  hasTalmudicStructure,

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
