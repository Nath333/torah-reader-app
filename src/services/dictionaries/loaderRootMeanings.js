// =============================================================================
// ROOT MEANING LOOKUP (SHORESH)
// Shows the meaning of the 3-letter root from multiple dictionaries
// Extrait de dictionaryLoader.js (recette docs/DECOUPE-MONOLITHES.md).
// =============================================================================

import { stripAllDiacritics, restoreFinals } from '../../utils/hebrewUtils';
import { cache, loadDictionary } from './loaderCore';

// =============================================================================

// =============================================================================
// ROOT MEANING LOOKUP (SHORESH)
// Shows the meaning of the 3-letter root from multiple dictionaries
// =============================================================================

/**
 * Extract a short definition (first meaning only)
 * @param {string} definition - Full definition text
 * @returns {string} Short definition
 */
function extractShortDefinition(definition) {
  if (!definition) return '';
  const short = definition
    .split(/[;,(]/)[0]
    .replace(/^(to |a |an |the )/i, '')
    .trim();
  return short.length > 60 ? short.slice(0, 57) + '...' : short;
}

/**
 * Look up root meaning from root_meanings_pro.json (22,049 entries)
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Object|null} Root meaning data
 */
export function getRootMeaning(root) {
  const rootData = cache.rootMeaningsPro || cache.rootMeanings;
  if (!rootData?.entries) return null;

  const cleaned = stripAllDiacritics(root || '');
  if (!cleaned || cleaned.length < 2) return null;

  let entry = rootData.entries[cleaned];
  if (!entry) {
    const withFinal = restoreFinals(cleaned);
    entry = rootData.entries[withFinal];
  }
  if (!entry) return null;

  return {
    root: entry.key || cleaned,
    lemma: entry.lemma,
    definition: entry.definition,
    shortDef: extractShortDefinition(entry.definition),
    pos: entry.pos,
    isAramaic: entry.isAramaic,
    isBiblicalHebrew: entry.isBiblicalHebrew,
    semanticField: entry.semanticField,
    sources: entry.sources || [],
    cognates: entry.etymology?.cognates || null,
    protoSemitic: entry.etymology?.protoSemitic || null,
    qualityScore: entry.qualityScore || 0,
    source: 'Root Meanings Pro'
  };
}

/**
 * Look up root meaning from ALL dictionary sources
 * Aggregates definitions from BDB, Jastrow, Klein, Strong's
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Object|null} Aggregated root meanings from all sources
 */
export function getRootMeaningFromAllSources(root) {
  const cleaned = stripAllDiacritics(root || '');
  if (!cleaned || cleaned.length < 2) return null;

  const results = {
    root: cleaned,
    definitions: [],
    sources: [],
    primaryDefinition: null,
    isAramaic: false,
    semanticField: null
  };

  // 1. Check root_meanings_pro (main source - 22,049 entries)
  const rootPro = getRootMeaning(cleaned);
  if (rootPro) {
    results.definitions.push({
      source: 'Root Meanings Pro',
      definition: rootPro.definition,
      shortDef: rootPro.shortDef,
      pos: rootPro.pos,
      tier: 1
    });
    results.sources.push(...(rootPro.sources || []));
    results.isAramaic = rootPro.isAramaic;
    results.semanticField = rootPro.semanticField;
    results.cognates = rootPro.cognates;
    results.protoSemitic = rootPro.protoSemitic;
  }

  // 2. Check BDB (Biblical Hebrew)
  const bdb = cache.bdb?.byWord?.[cleaned] || cache.bdb?.[cleaned];
  if (bdb) {
    const def = bdb.definition || bdb.gloss || bdb.english;
    if (def && !results.definitions.some(d => d.source === 'BDB')) {
      results.definitions.push({
        source: 'BDB',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: bdb.pos,
        strongNumber: bdb.strongNumber,
        tier: 1
      });
      if (!results.sources.includes('BDB')) results.sources.push('BDB');
    }
  }

  // 3. Check Jastrow (Talmudic/Aramaic)
  const jastrow = cache.jastrow?.[cleaned];
  if (jastrow) {
    const def = jastrow.definition || jastrow.english;
    if (def && !results.definitions.some(d => d.source === 'Jastrow')) {
      results.definitions.push({
        source: 'Jastrow',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: jastrow.pos,
        isAramaic: jastrow.isAramaic,
        tier: 1
      });
      if (!results.sources.includes('Jastrow')) results.sources.push('Jastrow');
      if (jastrow.isAramaic) results.isAramaic = true;
    }
  }

  // 4. Check Klein (Etymology-focused)
  const klein = cache.kleinLexicon?.[cleaned];
  if (klein) {
    const def = klein.definition || klein.gloss;
    if (def && !results.definitions.some(d => d.source === 'Klein')) {
      results.definitions.push({
        source: 'Klein',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: klein.pos,
        etymology: klein.etymology,
        tier: 2
      });
      if (!results.sources.includes('Klein')) results.sources.push('Klein');
    }
  }

  // 5. Check Strong's (Concordance)
  const strongs = cache.strongs?.byWord?.[cleaned] || cache.strongs?.[cleaned];
  if (strongs) {
    const def = strongs.definition || strongs.kjv_def || strongs.strongs_def;
    if (def && !results.definitions.some(d => d.source === "Strong's")) {
      results.definitions.push({
        source: "Strong's",
        definition: def,
        shortDef: extractShortDefinition(def),
        strongNumber: strongs.strongNumber || strongs.H,
        tier: 3
      });
      if (!results.sources.includes("Strong's")) results.sources.push("Strong's");
    }
  }

  // 6. Check Gesenius (Academic source)
  const gesenius = cache.geseniusLexicon?.[cleaned] || cache.geseniusLexicon?.byWord?.[cleaned];
  if (gesenius) {
    const def = gesenius.definition || gesenius.gloss || gesenius.english;
    if (def && !results.definitions.some(d => d.source === 'Gesenius')) {
      results.definitions.push({
        source: 'Gesenius',
        definition: def,
        shortDef: extractShortDefinition(def),
        pos: gesenius.pos,
        tier: 1
      });
      if (!results.sources.includes('Gesenius')) results.sources.push('Gesenius');
    }
  }

  // 7. Check CAL Aramaic (for Aramaic roots)
  const calAramaic = cache.calAramaic?.[cleaned];
  if (calAramaic) {
    const def = calAramaic.definition || calAramaic.meaning;
    if (def && !results.definitions.some(d => d.source === 'CAL')) {
      results.definitions.push({
        source: 'CAL',
        definition: def,
        shortDef: extractShortDefinition(def),
        isAramaic: true,
        tier: 1
      });
      if (!results.sources.includes('CAL')) results.sources.push('CAL');
      results.isAramaic = true;
    }
  }

  // Set primary definition (prefer tier 1)
  if (results.definitions.length > 0) {
    const tier1 = results.definitions.find(d => d.tier === 1);
    results.primaryDefinition = tier1?.shortDef || results.definitions[0].shortDef;
  }

// Determine usage eras based on which dictionaries have data
  const eras = [];
  if (results.sources.includes('BDB') || results.sources.includes('Gesenius')) {
    eras.push('biblical');
  }
  if (results.sources.includes('Jastrow') || results.sources.includes('CAL')) {
    eras.push('talmudic');
    if (!eras.includes('mishnaic')) eras.push('mishnaic');
  }
  // If only Strong's, assume biblical
  if (results.sources.includes("Strong's") && !eras.includes('biblical')) {
    eras.push('biblical');
  }
  results.eras = eras;

// Add frequency estimates based on sources
  // (Actual frequency data would come from corpus analysis)
  if (results.definitions.length > 0) {
    const hasMultipleSources = results.sources.length > 1;
    const hasBiblicalSource = eras.includes('biblical');
    const hasTalmudicSource = eras.includes('talmudic');

    results.frequency = {
      biblical: hasBiblicalSource ? (hasMultipleSources ? 'common' : 'attested') : null,
      talmudic: hasTalmudicSource ? (hasMultipleSources ? 'common' : 'attested') : null,
      sourceCount: results.sources.length
    };
  }

  return results.definitions.length > 0 ? results : null;
}

/**
 * Async version that ensures dictionaries are loaded
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Promise<Object|null>} Root meanings from all sources
 */
export async function getRootMeaningAsync(root) {
  await Promise.all([
    loadDictionary('rootMeaningsPro').catch(() => null),
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('kleinLexicon').catch(() => null),
    loadDictionary('strongs').catch(() => null),
// Additional academic sources
    loadDictionary('geseniusLexicon').catch(() => null),
    loadDictionary('calAramaic').catch(() => null)
  ]);
  return getRootMeaningFromAllSources(root);
}
