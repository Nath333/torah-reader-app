// =============================================================================
// Confidence Scoring System - PRO SCHOLAR v3
// Calculates reliability scores for dictionary lookups
// =============================================================================

/**
 * Confidence scoring factors and their weights
 * Centralized for easy tuning and consistency
 */
export const CONFIDENCE_FACTORS = {
  EXACT_MATCH: { weight: 20, label: 'Exact dictionary match' },
  MORPHOLOGICAL_MATCH: { weight: 5, label: 'Morphological match (prefix/suffix stripped)' },
  THREE_PLUS_SOURCES: { weight: 15, label: 'Multiple sources agree' },
  TWO_SOURCES: { weight: 10, label: 'Two sources agree' },
  GOLD_SOURCE: { weight: 10, label: 'Academic source (Jastrow/BDB/CAL)' },
  ARAMAIC_CONFIRMED: { weight: 5, label: 'Aramaic language confirmed' },
  STRONG_NUMBER: { weight: 5, label: "Strong's number linked" },
  HEADWORD_FOUND: { weight: 5, label: 'Dictionary headword found' },
  GOOD_DEF_LENGTH: { weight: 5, label: 'Good definition length' },
  SHORT_DEF_PENALTY: { weight: -10, label: 'Definition too short' },
  AMBIGUITY_PENALTY: { weight: -10, label: 'Multiple possible meanings' },
};

/** Gold-tier academic sources */
const GOLD_SOURCES = ['Jastrow', 'BDB', 'CAL'];

/**
 * Calculate confidence score for a dictionary lookup result
 * @param {Object} lookupResult - Result from dictionary lookup
 * @returns {{ score: number, factors: string[], level: string, emoji: string }}
 */
export const calculateConfidence = (lookupResult) => {
  if (!lookupResult) {
    return { score: 0, factors: ['No result'], level: 'none', emoji: '?' };
  }

  const factors = [];
  let score = 50; // Base score

  // Factor 1: Exact match vs morphological match
  const isExact = lookupResult.matchedForm === lookupResult.word ||
    (!lookupResult.strippedPrefix && !lookupResult.strippedSuffix);

  if (isExact) {
    score += CONFIDENCE_FACTORS.EXACT_MATCH.weight;
    factors.push(CONFIDENCE_FACTORS.EXACT_MATCH.label);
  } else {
    score += CONFIDENCE_FACTORS.MORPHOLOGICAL_MATCH.weight;
    factors.push(CONFIDENCE_FACTORS.MORPHOLOGICAL_MATCH.label);
  }

  // Factor 2: Multiple sources agree
  const sourceCount = lookupResult.sources?.length || 1;
  if (sourceCount >= 3) {
    score += CONFIDENCE_FACTORS.THREE_PLUS_SOURCES.weight;
    factors.push(`${sourceCount} sources agree`);
  } else if (sourceCount >= 2) {
    score += CONFIDENCE_FACTORS.TWO_SOURCES.weight;
    factors.push(`${sourceCount} sources`);
  }

  // Factor 3: Gold-tier source present
  const hasGoldSource = lookupResult.sources?.some(s =>
    GOLD_SOURCES.includes(s.name)
  );
  if (hasGoldSource) {
    score += CONFIDENCE_FACTORS.GOLD_SOURCE.weight;
    factors.push(CONFIDENCE_FACTORS.GOLD_SOURCE.label);
  }

  // Factor 4: Aramaic detection confirmed
  if (lookupResult.isAramaic && lookupResult.language === 'Aramaic') {
    score += CONFIDENCE_FACTORS.ARAMAIC_CONFIRMED.weight;
    factors.push(CONFIDENCE_FACTORS.ARAMAIC_CONFIRMED.label);
  }

  // Factor 5: Has Strong's number
  if (lookupResult.strongNumber) {
    score += CONFIDENCE_FACTORS.STRONG_NUMBER.weight;
    factors.push(CONFIDENCE_FACTORS.STRONG_NUMBER.label);
  }

  // Factor 6: Headword found
  if (lookupResult.headword) {
    score += CONFIDENCE_FACTORS.HEADWORD_FOUND.weight;
    factors.push(CONFIDENCE_FACTORS.HEADWORD_FOUND.label);
  }

  // Factor 7: Definition quality
  const def = lookupResult.english || '';
  if (def.length >= 10 && def.length <= 100) {
    score += CONFIDENCE_FACTORS.GOOD_DEF_LENGTH.weight;
    factors.push(CONFIDENCE_FACTORS.GOOD_DEF_LENGTH.label);
  } else if (def.length < 5) {
    score += CONFIDENCE_FACTORS.SHORT_DEF_PENALTY.weight;
    factors.push(CONFIDENCE_FACTORS.SHORT_DEF_PENALTY.label);
  }

  // Factor 8: Ambiguity penalty
  const hasAmbiguity = lookupResult.sources?.some(s =>
    s.definition?.includes(' OR ') || s.definition?.includes(';')
  );
  if (hasAmbiguity) {
    score += CONFIDENCE_FACTORS.AMBIGUITY_PENALTY.weight;
    factors.push(CONFIDENCE_FACTORS.AMBIGUITY_PENALTY.label);
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine level and emoji
  let level, emoji;
  if (score >= 80) {
    level = 'high';
    emoji = '✓';
  } else if (score >= 60) {
    level = 'medium';
    emoji = '~';
  } else if (score >= 40) {
    level = 'low';
    emoji = '?';
  } else {
    level = 'very-low';
    emoji = '?';
  }

  return { score, factors, level, emoji };
};

/**
 * Get confidence display info
 * @param {number} score - Confidence score 0-100
 * @returns {{ level: string, color: string, label: string }}
 */
export const getConfidenceDisplay = (score) => {
  if (score >= 80) {
    return { level: 'high', color: '#10b981', label: 'High confidence' };
  } else if (score >= 60) {
    return { level: 'medium', color: '#f59e0b', label: 'Medium confidence' };
  } else if (score >= 40) {
    return { level: 'low', color: '#ef4444', label: 'Low confidence' };
  } else {
    return { level: 'very-low', color: '#dc2626', label: 'Very low confidence' };
  }
};
