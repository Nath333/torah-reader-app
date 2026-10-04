// Scoring de confiance — extrait de unifiedLookupService.js (split 04/10/2026)

import { rankSourcesByTier } from '../scholarSourceAggregator';
import { getSourceInfo, RELIABILITY_TIERS } from '../../constants/dictionarySources';

export const CONFIDENCE_SCORING = {
  // Source count scoring
  SOURCE_MULTIPLIER: 8,
  MAX_SOURCE_POINTS: 25,

  // Tier-based scoring
  TIER_1_POINTS: 20,  // Academic sources (BDB, Jastrow)
  TIER_2_POINTS: 10,  // Scholarly sources (Klein)
  TIER_3_POINTS: 5,   // Reference sources (Strong's)
  MAX_TIER_POINTS: 35,

  // Consensus scoring
  STRONG_CONSENSUS: 25,
  MODERATE_CONSENSUS: 15,
  WEAK_CONSENSUS: 8,

  // Match quality scoring
  EXACT_MATCH: 15,
  NORMALIZED_MATCH: 12,
  ROOT_MATCH: 8,
  MORPHOLOGICAL_MATCH: 5,
  DEFAULT_MATCH: 10,

  // Confidence thresholds
  THRESHOLDS: {
    VERY_HIGH: 80,
    HIGH: 60,
    MODERATE: 40,
    LOW: 20
  }
};


// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

/**
 * Calculate detailed confidence score for a lookup result
 * Factors: source count, source tiers, consensus, headword match quality
 *
 * @param {Object} result - Lookup result object
 * @returns {Object} Detailed confidence breakdown
 */
export const calculateConfidence = (result) => {
  if (!result || !result.sources || result.sources.length === 0) {
    return {
      score: 0,
      level: 'none',
      breakdown: { sources: 0, tiers: 0, consensus: 0, match: 0 },
      description: 'No sources found'
    };
  }

  const breakdown = {
    sources: 0,    // Points for number of sources (max 25)
    tiers: 0,      // Points for source quality tiers (max 35)
    consensus: 0,  // Points for source agreement (max 25)
    match: 0       // Points for headword match quality (max 15)
  };

  // Source count scoring (diminishing returns)
  const srcCount = result.sources.length;
  breakdown.sources = Math.min(
    srcCount * CONFIDENCE_SCORING.SOURCE_MULTIPLIER,
    CONFIDENCE_SCORING.MAX_SOURCE_POINTS
  );

  // Tier-based scoring
  const ranked = rankSourcesByTier(result.sources);
  if (ranked.academic.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_1_POINTS;
  if (ranked.scholarly.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_2_POINTS;
  if (ranked.reference.length > 0) breakdown.tiers += CONFIDENCE_SCORING.TIER_3_POINTS;
  breakdown.tiers = Math.min(breakdown.tiers, CONFIDENCE_SCORING.MAX_TIER_POINTS);

  // Consensus scoring
  if (result.consensus) {
    const level = result.consensus.level?.level || result.consensus.level;
    if (level === 'strong') breakdown.consensus = CONFIDENCE_SCORING.STRONG_CONSENSUS;
    else if (level === 'moderate') breakdown.consensus = CONFIDENCE_SCORING.MODERATE_CONSENSUS;
    else if (level === 'weak') breakdown.consensus = CONFIDENCE_SCORING.WEAK_CONSENSUS;
  }

  // Match quality scoring
  if (result.matchType === 'exact') breakdown.match = CONFIDENCE_SCORING.EXACT_MATCH;
  else if (result.matchType === 'normalized') breakdown.match = CONFIDENCE_SCORING.NORMALIZED_MATCH;
  else if (result.matchType === 'root') breakdown.match = CONFIDENCE_SCORING.ROOT_MATCH;
  else if (result.matchType === 'morphological') breakdown.match = CONFIDENCE_SCORING.MORPHOLOGICAL_MATCH;
  else breakdown.match = CONFIDENCE_SCORING.DEFAULT_MATCH;

  const score = breakdown.sources + breakdown.tiers + breakdown.consensus + breakdown.match;

  // Determine confidence level
  const { THRESHOLDS } = CONFIDENCE_SCORING;
  let level, description;
  if (score >= THRESHOLDS.VERY_HIGH) {
    level = 'very_high';
    description = 'Multiple academic sources agree';
  } else if (score >= THRESHOLDS.HIGH) {
    level = 'high';
    description = 'Strong scholarly support';
  } else if (score >= THRESHOLDS.MODERATE) {
    level = 'moderate';
    description = 'Reasonable confidence from available sources';
  } else if (score >= THRESHOLDS.LOW) {
    level = 'low';
    description = 'Limited source support';
  } else {
    level = 'very_low';
    description = 'Minimal scholarly backing';
  }

  return { score, level, breakdown, description };
};

