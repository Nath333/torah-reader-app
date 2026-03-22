/**
 * Contextual Definition Service - PRO SCHOLAR v3
 *
 * Intelligently selects the best definition from multiple sources
 * based on textual context, book type, semantic analysis, and user history.
 *
 * ALGORITHM:
 * 1. Gather definitions from multiple sources
 * 2. Score each definition based on context relevance
 * 3. Apply domain-specific weighting (Torah vs Talmud vs Poetry)
 * 4. Consider user's learning history and level
 * 5. Return ranked definitions with confidence scores
 */

// =============================================================================
// CONTEXT TYPES & WEIGHTS
// =============================================================================

export const CONTEXT_TYPES = {
  TORAH: 'torah',
  PROPHETS: 'prophets',
  WRITINGS: 'writings',
  TALMUD: 'talmud',
  MISHNAH: 'mishnah',
  MIDRASH: 'midrash',
  LITURGY: 'liturgy',
  POETRY: 'poetry',
  HALACHA: 'halacha',
  GENERAL: 'general',
};

// Source preferences by context type
const SOURCE_PREFERENCES = {
  [CONTEXT_TYPES.TORAH]: ['BDB', 'HALOT', 'Jastrow', 'Klein', 'Sefaria'],
  [CONTEXT_TYPES.PROPHETS]: ['BDB', 'HALOT', 'Klein', 'Jastrow', 'Sefaria'],
  [CONTEXT_TYPES.WRITINGS]: ['BDB', 'HALOT', 'Jastrow', 'Klein', 'Sefaria'],
  [CONTEXT_TYPES.TALMUD]: ['Jastrow', 'Sokoloff', 'CAL', 'Klein', 'Sefaria'],
  [CONTEXT_TYPES.MISHNAH]: ['Jastrow', 'Klein', 'BDB', 'Sefaria'],
  [CONTEXT_TYPES.MIDRASH]: ['Jastrow', 'Klein', 'BDB', 'Sefaria'],
  [CONTEXT_TYPES.LITURGY]: ['BDB', 'Jastrow', 'Klein', 'Sefaria'],
  [CONTEXT_TYPES.POETRY]: ['BDB', 'HALOT', 'Klein', 'Jastrow', 'Sefaria'],
  [CONTEXT_TYPES.HALACHA]: ['Jastrow', 'Klein', 'BDB', 'Sefaria'],
  [CONTEXT_TYPES.GENERAL]: ['Sefaria', 'BDB', 'Jastrow', 'Klein'],
};

// Domain keywords for context detection
const DOMAIN_KEYWORDS = {
  creation: ['בָּרָא', 'יָצַר', 'עָשָׂה', 'תֹּהוּ', 'בֹהוּ', 'בְּרֵאשִׁית'],
  covenant: ['בְּרִית', 'אוֹת', 'עֵדוּת', 'חֶסֶד', 'נֶדֶר', 'שְׁבוּעָה'],
  sacrifice: ['קָרְבָּן', 'עוֹלָה', 'שְׁלָמִים', 'חַטָּאת', 'מִנְחָה', 'זֶבַח'],
  temple: ['מִקְדָּשׁ', 'הֵיכָל', 'מִזְבֵּחַ', 'כֹּהֵן', 'לֵוִי', 'קֹדֶשׁ'],
  law: ['מִצְוָה', 'חֹק', 'מִשְׁפָּט', 'תּוֹרָה', 'דִּין', 'אִסּוּר'],
  prayer: ['תְּפִלָּה', 'בְּרָכָה', 'הַלֵּל', 'הוֹדָיָה', 'תְּחִנָּה', 'רִנָּה'],
  wisdom: ['חָכְמָה', 'בִּינָה', 'דַּעַת', 'מוּסָר', 'תְּבוּנָה', 'שֶׂכֶל'],
  prophecy: ['נָבִיא', 'חָזוֹן', 'נְבוּאָה', 'דְּבַר', 'מַשָּׂא', 'הִתְנַבֵּא'],
  eschatology: ['אַחֲרִית', 'גְּאֻלָּה', 'מָשִׁיחַ', 'תְּחִיָּה', 'עוֹלָם הַבָּא'],
  talmudic: ['תַּנָּא', 'אָמוֹרָא', 'גְּמָרָא', 'מִשְׁנָה', 'בָּרַיְתָא', 'סוּגְיָא'],
};

// Semantic field weights (how much to boost if word is in same field)
const SEMANTIC_BOOST = {
  EXACT_DOMAIN: 1.5,      // Definition explicitly mentions the domain
  RELATED_DOMAIN: 1.25,   // Definition is in a related domain
  SAME_ROOT: 1.3,         // Definition mentions same root family
  CONTEXTUAL: 1.2,        // Definition fits surrounding context
};

// =============================================================================
// BOOK CLASSIFICATION
// =============================================================================

const BOOK_CONTEXT_MAP = {
  // Torah
  'Genesis': CONTEXT_TYPES.TORAH,
  'Exodus': CONTEXT_TYPES.TORAH,
  'Leviticus': CONTEXT_TYPES.TORAH,
  'Numbers': CONTEXT_TYPES.TORAH,
  'Deuteronomy': CONTEXT_TYPES.TORAH,
  'Bereishit': CONTEXT_TYPES.TORAH,
  'Shemot': CONTEXT_TYPES.TORAH,
  'Vayikra': CONTEXT_TYPES.TORAH,
  'Bamidbar': CONTEXT_TYPES.TORAH,
  'Devarim': CONTEXT_TYPES.TORAH,

  // Prophets
  'Joshua': CONTEXT_TYPES.PROPHETS,
  'Judges': CONTEXT_TYPES.PROPHETS,
  'Samuel': CONTEXT_TYPES.PROPHETS,
  'I Samuel': CONTEXT_TYPES.PROPHETS,
  'II Samuel': CONTEXT_TYPES.PROPHETS,
  'Kings': CONTEXT_TYPES.PROPHETS,
  'I Kings': CONTEXT_TYPES.PROPHETS,
  'II Kings': CONTEXT_TYPES.PROPHETS,
  'Isaiah': CONTEXT_TYPES.PROPHETS,
  'Jeremiah': CONTEXT_TYPES.PROPHETS,
  'Ezekiel': CONTEXT_TYPES.PROPHETS,
  'Hosea': CONTEXT_TYPES.PROPHETS,
  'Joel': CONTEXT_TYPES.PROPHETS,
  'Amos': CONTEXT_TYPES.PROPHETS,
  'Obadiah': CONTEXT_TYPES.PROPHETS,
  'Jonah': CONTEXT_TYPES.PROPHETS,
  'Micah': CONTEXT_TYPES.PROPHETS,
  'Nahum': CONTEXT_TYPES.PROPHETS,
  'Habakkuk': CONTEXT_TYPES.PROPHETS,
  'Zephaniah': CONTEXT_TYPES.PROPHETS,
  'Haggai': CONTEXT_TYPES.PROPHETS,
  'Zechariah': CONTEXT_TYPES.PROPHETS,
  'Malachi': CONTEXT_TYPES.PROPHETS,

  // Writings
  'Psalms': CONTEXT_TYPES.POETRY,
  'Proverbs': CONTEXT_TYPES.WISDOM,
  'Job': CONTEXT_TYPES.WISDOM,
  'Song of Songs': CONTEXT_TYPES.POETRY,
  'Ruth': CONTEXT_TYPES.WRITINGS,
  'Lamentations': CONTEXT_TYPES.POETRY,
  'Ecclesiastes': CONTEXT_TYPES.WISDOM,
  'Esther': CONTEXT_TYPES.WRITINGS,
  'Daniel': CONTEXT_TYPES.PROPHETS,
  'Ezra': CONTEXT_TYPES.WRITINGS,
  'Nehemiah': CONTEXT_TYPES.WRITINGS,
  'Chronicles': CONTEXT_TYPES.WRITINGS,
  'I Chronicles': CONTEXT_TYPES.WRITINGS,
  'II Chronicles': CONTEXT_TYPES.WRITINGS,

  // Talmud tractates (sample)
  'Berakhot': CONTEXT_TYPES.TALMUD,
  'Shabbat': CONTEXT_TYPES.TALMUD,
  'Eruvin': CONTEXT_TYPES.TALMUD,
  'Pesachim': CONTEXT_TYPES.TALMUD,
  'Yoma': CONTEXT_TYPES.TALMUD,
  'Sukkah': CONTEXT_TYPES.TALMUD,
  'Beitzah': CONTEXT_TYPES.TALMUD,
  'Rosh Hashanah': CONTEXT_TYPES.TALMUD,
  'Taanit': CONTEXT_TYPES.TALMUD,
  'Megillah': CONTEXT_TYPES.TALMUD,
  'Moed Katan': CONTEXT_TYPES.TALMUD,
  'Chagigah': CONTEXT_TYPES.TALMUD,
  'Yevamot': CONTEXT_TYPES.TALMUD,
  'Ketubot': CONTEXT_TYPES.TALMUD,
  'Nedarim': CONTEXT_TYPES.TALMUD,
  'Nazir': CONTEXT_TYPES.TALMUD,
  'Sotah': CONTEXT_TYPES.TALMUD,
  'Gittin': CONTEXT_TYPES.TALMUD,
  'Kiddushin': CONTEXT_TYPES.TALMUD,
  'Bava Kamma': CONTEXT_TYPES.TALMUD,
  'Bava Metzia': CONTEXT_TYPES.TALMUD,
  'Bava Batra': CONTEXT_TYPES.TALMUD,
  'Sanhedrin': CONTEXT_TYPES.TALMUD,
  'Makkot': CONTEXT_TYPES.TALMUD,
  'Shevuot': CONTEXT_TYPES.TALMUD,
  'Avodah Zarah': CONTEXT_TYPES.TALMUD,
  'Horayot': CONTEXT_TYPES.TALMUD,
  'Zevachim': CONTEXT_TYPES.TALMUD,
  'Menachot': CONTEXT_TYPES.TALMUD,
  'Chullin': CONTEXT_TYPES.TALMUD,
  'Bekhorot': CONTEXT_TYPES.TALMUD,
  'Arakhin': CONTEXT_TYPES.TALMUD,
  'Temurah': CONTEXT_TYPES.TALMUD,
  'Keritot': CONTEXT_TYPES.TALMUD,
  'Meilah': CONTEXT_TYPES.TALMUD,
  'Tamid': CONTEXT_TYPES.TALMUD,
  'Niddah': CONTEXT_TYPES.TALMUD,

  // Mishnah (prefix)
  'Mishnah': CONTEXT_TYPES.MISHNAH,

  // Midrash
  'Midrash Rabbah': CONTEXT_TYPES.MIDRASH,
  'Bereishit Rabbah': CONTEXT_TYPES.MIDRASH,
  'Shemot Rabbah': CONTEXT_TYPES.MIDRASH,
  'Vayikra Rabbah': CONTEXT_TYPES.MIDRASH,
  'Bamidbar Rabbah': CONTEXT_TYPES.MIDRASH,
  'Devarim Rabbah': CONTEXT_TYPES.MIDRASH,
  'Tanchuma': CONTEXT_TYPES.MIDRASH,
  'Pesikta': CONTEXT_TYPES.MIDRASH,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detect context type from reference
 */
export function detectContextType(reference) {
  if (!reference) return CONTEXT_TYPES.GENERAL;

  // Check for explicit book match
  for (const [book, type] of Object.entries(BOOK_CONTEXT_MAP)) {
    if (reference.includes(book)) {
      return type;
    }
  }

  // Check for Talmud-style references (e.g., "Berakhot 2a")
  if (/\s\d+[ab]/.test(reference)) {
    return CONTEXT_TYPES.TALMUD;
  }

  // Check for chapter:verse style (likely Tanakh)
  if (/\d+:\d+/.test(reference)) {
    return CONTEXT_TYPES.TORAH; // Default Tanakh to Torah for scoring
  }

  return CONTEXT_TYPES.GENERAL;
}

/**
 * Detect domain from surrounding text
 */
export function detectDomain(surroundingText = '') {
  const domains = [];
  const textLower = surroundingText.toLowerCase();

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const matchCount = keywords.filter(kw =>
      surroundingText.includes(kw) || textLower.includes(domain)
    ).length;

    if (matchCount > 0) {
      domains.push({
        domain,
        confidence: Math.min(1, matchCount / 3),
        keywords: keywords.filter(kw => surroundingText.includes(kw)),
      });
    }
  }

  return domains.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate text similarity (simple overlap)
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// =============================================================================
// DEFINITION SCORING
// =============================================================================

/**
 * Score a single definition based on context
 */
export function scoreDefinition(definition, context) {
  const {
    word: _word = '',
    contextType = CONTEXT_TYPES.GENERAL,
    surroundingText = '',
    detectedDomains = [],
    userLevel = 'intermediate',
    preferredSources = [],
  } = context;
  void _word; // Reserved for future use

  let score = 0.5; // Base score
  const breakdown = {};

  // 1. Source preference scoring (0-0.3)
  const sourcePreferences = SOURCE_PREFERENCES[contextType] || SOURCE_PREFERENCES[CONTEXT_TYPES.GENERAL];
  const sourceIndex = sourcePreferences.indexOf(definition.source);

  if (sourceIndex !== -1) {
    const sourceScore = 0.3 * (1 - sourceIndex / sourcePreferences.length);
    score += sourceScore;
    breakdown.sourcePreference = sourceScore;
  }

  // User's custom source preferences
  if (preferredSources.includes(definition.source)) {
    score += 0.1;
    breakdown.userPreference = 0.1;
  }

  // 2. Domain relevance (0-0.25)
  if (definition.text && detectedDomains.length > 0) {
    const topDomain = detectedDomains[0];
    const domainKeywords = DOMAIN_KEYWORDS[topDomain.domain] || [];

    // Check if definition mentions domain keywords
    const definitionText = definition.text.toLowerCase();
    const matchingKeywords = domainKeywords.filter(kw =>
      definitionText.includes(kw.toLowerCase())
    );

    if (matchingKeywords.length > 0) {
      const domainScore = 0.25 * (matchingKeywords.length / domainKeywords.length);
      score += domainScore;
      breakdown.domainRelevance = domainScore;
    }
  }

  // 3. Contextual similarity (0-0.2)
  if (definition.text && surroundingText) {
    const similarity = calculateTextSimilarity(definition.text, surroundingText);
    const similarityScore = 0.2 * similarity;
    score += similarityScore;
    breakdown.contextualSimilarity = similarityScore;
  }

  // 4. Definition quality heuristics (0-0.15)
  if (definition.text) {
    let qualityScore = 0;

    // Prefer definitions with examples
    if (definition.examples?.length > 0) {
      qualityScore += 0.05;
    }

    // Prefer definitions with biblical references
    if (/\([A-Za-z]+\s+\d+:\d+\)/.test(definition.text)) {
      qualityScore += 0.05;
    }

    // Prefer definitions that aren't too short or too long
    const length = definition.text.length;
    if (length >= 20 && length <= 200) {
      qualityScore += 0.05;
    }

    score += qualityScore;
    breakdown.quality = qualityScore;
  }

  // 5. User level adjustment (0-0.1)
  const levelPreferences = {
    beginner: { preferSimple: true, maxComplexity: 1 },
    intermediate: { preferSimple: false, maxComplexity: 2 },
    advanced: { preferSimple: false, maxComplexity: 3 },
    scholar: { preferSimple: false, maxComplexity: 4 },
  };

  const levelPref = levelPreferences[userLevel] || levelPreferences.intermediate;

  if (levelPref.preferSimple && definition.text) {
    // Boost simpler definitions for beginners
    const avgWordLength = definition.text.split(/\s+/).reduce(
      (sum, w) => sum + w.length, 0
    ) / definition.text.split(/\s+/).length;

    if (avgWordLength < 6) {
      score += 0.05;
      breakdown.levelAdjustment = 0.05;
    }
  }

  return {
    definition,
    score: Math.min(1, Math.round(score * 100) / 100),
    breakdown,
    confidence: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low',
  };
}

/**
 * Rank multiple definitions by context relevance
 */
export function rankDefinitions(definitions, context) {
  if (!definitions || definitions.length === 0) {
    return [];
  }

  // Enhance context with detected domains
  const enhancedContext = {
    ...context,
    detectedDomains: detectDomain(context.surroundingText || ''),
    contextType: context.contextType || detectContextType(context.reference || ''),
  };

  // Score each definition
  const scored = definitions.map(def => scoreDefinition(def, enhancedContext));

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Add ranking
  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
    isBest: index === 0,
  }));
}

// =============================================================================
// AI-ENHANCED SELECTION
// =============================================================================

/**
 * Use AI to select best definition (when multiple are close)
 * This calls the groqService for disambiguation
 */
export async function aiSelectBestDefinition(word, definitions, context, options = {}) {
  const { useAI = true, maxTokens = 150 } = options;

  // First, do standard ranking
  const ranked = rankDefinitions(definitions, context);

  // If clear winner or AI disabled, return standard ranking
  if (!useAI || ranked.length === 0) {
    return ranked;
  }

  const topScore = ranked[0]?.score || 0;
  const secondScore = ranked[1]?.score || 0;

  // Only use AI if top definitions are close (within 0.15)
  if (topScore - secondScore > 0.15) {
    return ranked;
  }

  // Import groqService dynamically to avoid circular dependencies
  try {
    const { analyzeCommentary } = await import('./groqService');

    const prompt = `Given the Hebrew word "${word}" in the context of "${context.reference || 'general text'}", which definition is most accurate?

Context: "${(context.surroundingText || '').substring(0, 200)}"

Definitions to choose from:
${ranked.slice(0, 3).map((r, i) =>
  `${i + 1}. [${r.definition.source}]: ${r.definition.text?.substring(0, 100)}`
).join('\n')}

Reply with just the number (1, 2, or 3) of the best definition and a brief explanation (one sentence).`;

    const response = await analyzeCommentary(prompt, 'summary', {
      maxTokens,
      temperature: 0.3,
    });

    // Parse AI response
    const match = response?.match(/^(\d)/);
    if (match) {
      const aiChoice = parseInt(match[1], 10) - 1;
      if (aiChoice >= 0 && aiChoice < ranked.length) {
        // Boost AI-selected definition
        ranked[aiChoice].score = Math.min(1, ranked[aiChoice].score + 0.15);
        ranked[aiChoice].aiSelected = true;
        ranked[aiChoice].aiReason = response.replace(/^\d\.\s*/, '').trim();

        // Re-sort
        ranked.sort((a, b) => b.score - a.score);
        ranked.forEach((item, index) => {
          item.rank = index + 1;
          item.isBest = index === 0;
        });
      }
    }
  } catch (err) {
    console.warn('AI definition selection failed:', err);
    // Fall back to standard ranking
  }

  return ranked;
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Get contextually-ranked definitions for a word
 */
export async function getContextualDefinitions(word, options = {}) {
  const {
    reference = '',
    surroundingText = '',
    definitions = [],
    userLevel = 'intermediate',
    preferredSources = [],
    useAI = false,
  } = options;

  const context = {
    word,
    reference,
    surroundingText,
    userLevel,
    preferredSources,
    contextType: detectContextType(reference),
  };

  // If definitions provided, rank them
  if (definitions.length > 0) {
    if (useAI) {
      return aiSelectBestDefinition(word, definitions, context);
    }
    return rankDefinitions(definitions, context);
  }

  // If no definitions, return context analysis only
  return {
    word,
    context,
    detectedDomains: detectDomain(surroundingText),
    suggestedSources: SOURCE_PREFERENCES[context.contextType] || SOURCE_PREFERENCES[CONTEXT_TYPES.GENERAL],
    message: 'No definitions provided. Use suggestedSources to fetch definitions.',
  };
}

/**
 * Get the best definition (convenience method)
 */
export async function getBestDefinition(word, definitions, context = {}) {
  const ranked = await getContextualDefinitions(word, {
    definitions,
    ...context,
  });

  if (Array.isArray(ranked) && ranked.length > 0) {
    return ranked[0].definition;
  }

  return null;
}

/**
 * Analyze context for definition selection hints
 */
export function analyzeContextForDefinition(reference, surroundingText = '') {
  const contextType = detectContextType(reference);
  const domains = detectDomain(surroundingText);

  return {
    contextType,
    contextLabel: contextType.charAt(0).toUpperCase() + contextType.slice(1),
    domains,
    primaryDomain: domains[0] || null,
    suggestedSources: SOURCE_PREFERENCES[contextType] || SOURCE_PREFERENCES[CONTEXT_TYPES.GENERAL],
    tips: generateContextTips(contextType, domains),
  };
}

/**
 * Generate helpful tips based on context
 */
function generateContextTips(contextType, domains) {
  const tips = [];

  switch (contextType) {
    case CONTEXT_TYPES.TALMUD:
      tips.push('Aramaic definitions from Jastrow are prioritized');
      tips.push('Consider technical legal (halachic) meanings');
      break;
    case CONTEXT_TYPES.TORAH:
      tips.push('Biblical Hebrew definitions from BDB/HALOT are prioritized');
      tips.push('Consider both literal and midrashic interpretations');
      break;
    case CONTEXT_TYPES.POETRY:
      tips.push('Poetic/metaphorical meanings may apply');
      tips.push('Consider parallel structure for context');
      break;
    case CONTEXT_TYPES.PROPHETS:
      tips.push('Prophetic vocabulary often has specialized meanings');
      tips.push('Consider the prophetic context and audience');
      break;
    default:
      tips.push('Compare multiple sources for best understanding');
  }

  if (domains.length > 0) {
    tips.push(`Domain detected: ${domains[0].domain} - specialized meanings may apply`);
  }

  return tips;
}

// =============================================================================
// EXPORTS
// =============================================================================

const contextualDefinitionService = {
  // Types
  CONTEXT_TYPES,
  SOURCE_PREFERENCES,
  DOMAIN_KEYWORDS,
  SEMANTIC_BOOST,
  // Detection
  detectContextType,
  detectDomain,
  // Scoring
  scoreDefinition,
  rankDefinitions,
  // AI Selection
  aiSelectBestDefinition,
  // Main API
  getContextualDefinitions,
  getBestDefinition,
  analyzeContextForDefinition,
};

export default contextualDefinitionService;
