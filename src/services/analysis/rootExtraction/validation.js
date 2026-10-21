// =============================================================================
// Validation par dictionnaires — directe (synchrone, caches) et asynchrone
// (charge les dictionnaires au besoin). Ne nécessite pas de callback.
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger, IS_DEV as DEBUG } from '../../../utils/debug';
import { lookupJastrowSync, lookupBDBSync, lookupStrongsSync } from '../../dictionaries/dictionaryLoader';
import { lookupJastrowByWord, lookupBDBByWord, lookupStrongsByWord } from '../../dictionaries/dictionaryLoader';
import { getCached, setCache, recordLookup, _telemetry } from './state';
import { generateHypotheses } from './hypotheses';

const log = createLogger('UnifiedRoot');

// =============================================================================
// DIRECT DICTIONARY VALIDATION
// No callbacks needed! Validates directly against Jastrow/BDB/Strong's
// =============================================================================

/**
 * Validate hypotheses directly against cached dictionaries
 * This is the  way - no callbacks needed!
 *
 * @param {Array} hypotheses - Array from generateHypotheses
 * @param {Object} options - { skipStrongs: boolean, contextType: string }
 * @returns {Array} - Validated hypotheses with scholarly sources
 */
export function validateWithDirectDictionaries(hypotheses, options = {}) {
  const { skipStrongs = false, contextType = 'unknown' } = options;
  const validated = [];

  for (const hyp of hypotheses) {
    const { root } = hyp;
    const sources = [];

    // Check Jastrow (Aramaic/Talmudic - GOLD tier)
    const jastrowEntry = lookupJastrowSync(root);
    if (jastrowEntry) {
      const def = jastrowEntry.definition || jastrowEntry.gloss || jastrowEntry.meaning || jastrowEntry.shortDef;
      if (def) {
        sources.push({
          ...DICTIONARY_TIERS.jastrow,
          definition: def,
          headword: jastrowEntry.headword || root,
          entry: jastrowEntry
        });
      }
    }

    // Check BDB (Biblical Hebrew - GOLD tier)
    const bdbEntry = lookupBDBSync(root);
    if (bdbEntry) {
      const def = bdbEntry.definition || bdbEntry.gloss || bdbEntry.meaning || bdbEntry.shortDef;
      if (def) {
        sources.push({
          ...DICTIONARY_TIERS.bdb,
          definition: def,
          headword: bdbEntry.headword || root,
          entry: bdbEntry
        });
      }
    }

    // Check Strong's (Biblical Hebrew - SILVER tier) unless skipped for Talmudic context
    if (!skipStrongs && contextType !== 'talmudic' && contextType !== 'midrashic') {
      const strongsEntry = lookupStrongsSync(root);
      if (strongsEntry) {
        const def = strongsEntry.definition || strongsEntry.gloss || strongsEntry.meaning || strongsEntry.shortDef;
        if (def) {
          sources.push({
            ...DICTIONARY_TIERS.strongs,
            definition: def,
            strongNumber: strongsEntry.strongNumber || strongsEntry.number,
            entry: strongsEntry
          });
        }
      }
    }

    // If any dictionary matched, add to validated results
    if (sources.length > 0) {
      // Calculate confidence with tier bonus
      const bestSource = sources[0];
      const tierBonus = bestSource.tier === 'gold' ? 5 : 0;
      const adjustedConfidence = Math.min(100, hyp.confidence + tierBonus);

      validated.push({
        ...hyp,
        confidence: adjustedConfidence,
        dictionaryMatch: true,
        validated: true,
        definition: bestSource.definition,
        source: bestSource.name,
        sources: sources,
        sourceCount: sources.length,
        tier: bestSource.tier
      });
    }
  }

  // Sort by confidence (highest first)
  validated.sort((a, b) => b.confidence - a.confidence);

  if (DEBUG && validated.length > 0) {
    log.debug(`[DirectValidation] ${validated.length} matches from ${hypotheses.length} hypotheses`);
  }

  return validated;
}

/**
 * Async version of validateWithDirectDictionaries
 * Uses async lookups to ensure dictionaries are loaded before validation
 * This fixes the race condition where sync lookups return null if cache isn't populated
 *
 * @param {Array} hypotheses - Array from generateHypotheses
 * @param {Object} options - { skipStrongs: boolean, contextType: string }
 * @returns {Promise<Array>} - Validated hypotheses with scholarly sources
 */
export async function validateWithAsyncDictionaries(hypotheses, options = {}) {
  const { skipStrongs = false, contextType = 'unknown' } = options;
  const validated = [];

  for (const hyp of hypotheses) {
    const { root } = hyp;
    const sources = [];

    // Check Jastrow (Aramaic/Talmudic - GOLD tier) - ASYNC
    const jastrowEntry = await lookupJastrowByWord(root);
    if (jastrowEntry) {
      const def = jastrowEntry.definition || jastrowEntry.gloss || jastrowEntry.meaning || jastrowEntry.shortDef;
      if (def) {
        sources.push({
          ...DICTIONARY_TIERS.jastrow,
          definition: def,
          headword: jastrowEntry.headword || root,
          entry: jastrowEntry
        });
      }
    }

    // Check BDB (Biblical Hebrew - GOLD tier) - ASYNC
    const bdbEntry = await lookupBDBByWord(root);
    if (bdbEntry) {
      const def = bdbEntry.definition || bdbEntry.gloss || bdbEntry.meaning || bdbEntry.shortDef;
      if (def) {
        sources.push({
          ...DICTIONARY_TIERS.bdb,
          definition: def,
          headword: bdbEntry.headword || root,
          entry: bdbEntry
        });
      }
    }

    // Check Strong's (Biblical Hebrew - SILVER tier) unless skipped for Talmudic context - ASYNC
    if (!skipStrongs && contextType !== 'talmudic' && contextType !== 'midrashic') {
      const strongsEntry = await lookupStrongsByWord(root);
      if (strongsEntry) {
        const def = strongsEntry.definition || strongsEntry.gloss || strongsEntry.meaning || strongsEntry.shortDef;
        if (def) {
          sources.push({
            ...DICTIONARY_TIERS.strongs,
            definition: def,
            strongNumber: strongsEntry.strongNumber || strongsEntry.number,
            entry: strongsEntry
          });
        }
      }
    }

    // If any dictionary matched, add to validated results
    if (sources.length > 0) {
      // Calculate confidence with tier bonus
      const bestSource = sources[0];
      const tierBonus = bestSource.tier === 'gold' ? 5 : 0;
      const adjustedConfidence = Math.min(100, hyp.confidence + tierBonus);

      validated.push({
        ...hyp,
        confidence: adjustedConfidence,
        dictionaryMatch: true,
        validated: true,
        definition: bestSource.definition,
        source: bestSource.name,
        sources: sources,
        sourceCount: sources.length,
        tier: bestSource.tier
      });
    }
  }

  // Sort by confidence (highest first)
  validated.sort((a, b) => b.confidence - a.confidence);

  if (DEBUG && validated.length > 0) {
    log.debug(`[AsyncValidation] ${validated.length} matches from ${hypotheses.length} hypotheses`);
  }

  return validated;
}

/**
 * ★ PREFERRED ENTRY POINT ★
 * Extract roots with DIRECT dictionary validation - no callbacks needed!
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { contextType, skipStrongs }
 * @returns {Object} - { hypotheses, bestMatch, allMatches, directValidation: true }
 */
export function extractRootsWithDirectValidation(word, options = {}) {
  const startTime = performance.now();
  const { contextType = 'unknown' } = options;

  // Check cache first (30% faster repeat lookups)
  const cacheKey = `direct:${contextType}:${word}`;
  const cached = getCached(cacheKey);
  if (cached) {
    if (DEBUG) log.debug(`[Cache HIT] ${word}`);
    recordLookup(performance.now() - startTime, true);
    return cached;
  }

  // Generate all possible hypotheses
  const hypotheses = generateHypotheses(word, options);
  _telemetry.hypothesesGenerated += hypotheses.length;

  if (hypotheses.length === 0) {
    recordLookup(performance.now() - startTime, false);
    return { hypotheses: [], bestMatch: null, allMatches: [], word, directValidation: true };
  }

  // If it's an Aramaic particle, skip dictionary validation (already has definition)
  if (hypotheses[0]?.isParticle) {
    _telemetry.particlesFound++;
    const result = {
      originalWord: word,
      hypotheses: hypotheses,
      allMatches: hypotheses,
      bestMatch: hypotheses[0],
      matchCount: 1,
      hypothesisCount: 1,
      isAramaicParticle: true,
      directValidation: true
    };
    recordLookup(performance.now() - startTime, false);
    return setCache(cacheKey, result);
  }

  // Validate with direct dictionary access
  const validated = validateWithDirectDictionaries(hypotheses, {
    ...options,
    skipStrongs: contextType === 'talmudic' || contextType === 'midrashic'
  });
  _telemetry.validatedMatches += validated.length;
  _telemetry.dictionaryLookups += hypotheses.length * 3; // Jastrow, BDB, Strong's

  // Count weak verbs detected
  const weakVerbCount = validated.filter(h => h.weakVerb).length;
  _telemetry.weakVerbsDetected += weakVerbCount;

  const result = {
    originalWord: word,
    hypotheses: hypotheses,
    allMatches: validated,
    bestMatch: validated[0] || null,
    matchCount: validated.length,
    hypothesisCount: hypotheses.length,
    directValidation: true
  };

  recordLookup(performance.now() - startTime, false);
  return setCache(cacheKey, result);
}

/**
 * ★ ASYNC ENTRY POINT ★
 * Extract roots with ASYNC dictionary validation - ensures dictionaries are loaded!
 * Use this when you need guaranteed dictionary lookup (fixes race condition on initial load)
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { contextType, skipStrongs }
 * @returns {Promise<Object>} - { hypotheses, bestMatch, allMatches, directValidation: true }
 */
export async function extractRootsWithAsyncValidation(word, options = {}) {
  const startTime = performance.now();
  const { contextType = 'unknown' } = options;

  // Check cache first (30% faster repeat lookups)
  const cacheKey = `async:${contextType}:${word}`;
  const cached = getCached(cacheKey);
  if (cached) {
    if (DEBUG) log.debug(`[Cache HIT] ${word}`);
    recordLookup(performance.now() - startTime, true);
    return cached;
  }

  // Generate all possible hypotheses
  const hypotheses = generateHypotheses(word, options);
  _telemetry.hypothesesGenerated += hypotheses.length;

  if (hypotheses.length === 0) {
    recordLookup(performance.now() - startTime, false);
    return { hypotheses: [], bestMatch: null, allMatches: [], word, directValidation: true };
  }

  // If it's an Aramaic particle, skip dictionary validation (already has definition)
  if (hypotheses[0]?.isParticle) {
    _telemetry.particlesFound++;
    const result = {
      originalWord: word,
      hypotheses: hypotheses,
      allMatches: hypotheses,
      bestMatch: hypotheses[0],
      matchCount: 1,
      hypothesisCount: 1,
      isAramaicParticle: true,
      directValidation: true
    };
    recordLookup(performance.now() - startTime, false);
    return setCache(cacheKey, result);
  }

  // Validate with ASYNC dictionary access (ensures dictionaries are loaded)
  const validated = await validateWithAsyncDictionaries(hypotheses, {
    ...options,
    skipStrongs: contextType === 'talmudic' || contextType === 'midrashic'
  });
  _telemetry.validatedMatches += validated.length;
  _telemetry.dictionaryLookups += hypotheses.length * 3; // Jastrow, BDB, Strong's

  // Count weak verbs detected
  const weakVerbCount = validated.filter(h => h.weakVerb).length;
  _telemetry.weakVerbsDetected += weakVerbCount;

  const result = {
    originalWord: word,
    hypotheses: hypotheses,
    allMatches: validated,
    bestMatch: validated[0] || null,
    matchCount: validated.length,
    hypothesisCount: hypotheses.length,
    directValidation: true
  };

  recordLookup(performance.now() - startTime, false);
  return setCache(cacheKey, result);
}

