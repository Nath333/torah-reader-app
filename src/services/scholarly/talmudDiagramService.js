/**
 * Talmud Diagram Service - PRO SCHOLAR Edition — FAÇADE
 * Deterministic Mermaid Generation (No AI Required)
 *
 * Split docs/DECOUPE-MONOLITHES.md (20/10) — modules sous ./talmudDiagram/ :
 *   textUtils.js       stripNikud, normalizeHebrew, cleanForMermaid, safeExecute…
 *   cache.js           ÉTAT : LRU + TTL + stats
 *   summarizer.js      TF-IDF (extractKeyTermsTfIdf, summarizeText…)
 *   extractors.js      extract, analyze, find, generate (fonctions) partagés
 *   generators/*.js    un fichier par type de diagramme (8 + réseau)
 * Le dispatcher generateDafDiagram et le batch restent en façade. La surface
 * publique (nommée + default) est intégralement conservée.
 *
 * @module talmudDiagramService
 * @version 2.0.0 PRO SCHOLAR
 */

import {
  TALMUD_COMMENTATORS,
  DIAGRAM_TYPES,
  HALACHIC_OUTCOMES,
  OUTCOME_ICONS,
  SPEAKER_PATTERNS
} from './talmudDiagramData';
import { stripNikud, normalizeHebrew, cleanForMermaid, validateMermaidSyntax } from './talmudDiagram/textUtils';
import { getCachedDiagram, setCachedDiagram, clearDiagramCache, getCacheStats } from './talmudDiagram/cache';
import { extractKeyTermsTfIdf, extractKeySegments, summarizeText } from './talmudDiagram/summarizer';
import { extractSpeakersFromText, extractDisputes, extractRulingsDynamic, extractDiscourseElements } from './talmudDiagram/extractors';
import { generateOverviewDiagram } from './talmudDiagram/generators/overview';
import { generateSugyaFlowDiagram } from './talmudDiagram/generators/sugyaFlow';
import { generateSpeakerNetworkDiagram } from './talmudDiagram/generators/speakerNetwork';
import { generateTimelineDiagram } from './talmudDiagram/generators/timeline';
import { generateHalachicChainDiagram } from './talmudDiagram/generators/halachicChain';
import { generateConceptMapDiagram } from './talmudDiagram/generators/conceptMap';
import { generateMachloketDiagram } from './talmudDiagram/generators/machloket';
import { generateSummaryDiagram } from './talmudDiagram/generators/summary';
import { generateCommentatorNetworkDiagram } from './talmudDiagram/generators/network';

export { TALMUD_COMMENTATORS, DIAGRAM_TYPES };
export {
  stripNikud,
  normalizeHebrew,
  cleanForMermaid,
  validateMermaidSyntax,
  clearDiagramCache,
  getCacheStats,
  extractKeyTermsTfIdf,
  extractKeySegments,
  summarizeText,
  generateCommentatorNetworkDiagram
};

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
