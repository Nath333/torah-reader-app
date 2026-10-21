// =============================================================================
// Agrégation parallèle des dictionnaires locaux (lookupAllLocalDictionaries)
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  isLikelyAramaic
} from '../dictionaries/babylonianDictionary';
import {
  IS_DEV as DEBUG
} from '../../utils/debug';
import {
  aggregateLocalSources
} from '../scholarSourceAggregator';
import {
  pickBestDefinition
} from '../../utils/definitionCleaner';
import {
  calculateConfidence
} from './scoring';
import {
  recordDictionaryLookup
} from '../telemetryService';
import {
  generateAllCitations
} from './databases';
import { getDictionaries } from './variants';
import { lookupBDB, lookupJastrowLocal, lookupStrongs, lookupCALLocal, lookupJastrowAramaic, lookupGesenius, lookupKlein } from './localDictionaries';

// =============================================================================
// PARALLEL DICTIONARY AGGREGATION
// =============================================================================

/**
 * Look up word in all local dictionaries in parallel
 * Includes Jastrow Aramaic for Talmudic contexts
 * @param {string} word - Cleaned Hebrew/Aramaic word
 * @param {string} contextMode - 'biblical', 'talmudic', 'midrashic', etc.
 * @returns {Object} Aggregated result with all sources sorted by scholarly tier
 */
export const lookupAllLocalDictionaries = (word, contextMode = null) => {
  const dicts = getDictionaries();
  const isAramaic = isLikelyAramaic(word);
  const isTalmudic = contextMode === 'talmudic' || contextMode === 'rabbinic';

  // PRO SCHOLAR V13: Log dictionary availability for debugging
  if (DEBUG) {
    const available = Object.entries(dicts)
      .filter(([_, v]) => v !== null)
      .map(([k]) => k);
    if (available.length < 3) {
      log.debug(`[LookupAllLocal] Warning: Only ${available.length} dictionaries loaded: ${available.join(', ')}`);
    }
  }

  // Define lookup functions for parallel aggregation
  // Order determines priority when sources have equal tier
  // PRO SCHOLAR V16: All FREE academic sources
  const lookupFunctions = {
    // Tier 1 Academic (Hebrew)
    'BDB': () => lookupBDB(word, dicts),
    'Gesenius': () => lookupGesenius(word, dicts),
    // Tier 1 Academic (Aramaic) - always check for potential Aramaic
    'Jastrow': () => lookupJastrowLocal(word, dicts),
    // Tier 2 Scholarly (Etymology-focused)
    'Klein': () => lookupKlein(word, dicts),
    "Strong's": () => lookupStrongs(word, dicts)
  };

  // Add Aramaic sources if word is likely Aramaic or in Talmudic context
  if (isAramaic || isTalmudic) {
    // CAL - 12,243 Aramaic entries (FREE from Hebrew Union College!)
    lookupFunctions['Jastrow (Aramaic)'] = () => lookupJastrowAramaic(word, dicts);
    lookupFunctions['CAL'] = () => lookupCALLocal(word, dicts);
  }

  // Use synchronous aggregation for local dictionaries
  const aggregated = aggregateLocalSources(word, lookupFunctions, {
    validateHeadword: true
  });

  // Pick best definition from primary source
  if (aggregated.primary?.definition) {
    aggregated.primary.definition = pickBestDefinition(aggregated.primary.definition);
  }

  const confidence = calculateConfidence(aggregated);

  // Record dictionary lookups for telemetry
  // PRO SCHOLAR V16: Track sources for analytics
  const sources = aggregated.allSources || [];
  for (const src of sources) {
    const sourceName = (src.name || '').toLowerCase();
    if (sourceName.includes('bdb')) recordDictionaryLookup('bdb', true);
    else if (sourceName.includes('gesenius')) recordDictionaryLookup('gesenius', true);
    else if (sourceName.includes('klein')) recordDictionaryLookup('klein', true);
    else if (sourceName.includes('jastrow')) recordDictionaryLookup('jastrow', true);
    else if (sourceName.includes('strong')) recordDictionaryLookup('strongs', true);
    else if (sourceName.includes('cal')) recordDictionaryLookup('cal', true);
  }

  return {
    ...aggregated,
    isAramaic,
    language: isAramaic ? 'Aramaic' : 'Hebrew',
    confidence,
    citations: generateAllCitations(aggregated.allSources || [])
  };
};

