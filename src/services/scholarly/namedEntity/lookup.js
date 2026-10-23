// =============================================================================
// Lookup d'entités — rabbi par nom, rabbis par génération/période.
// (extrait de namedEntityService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { RABBI_DATABASE } from './data';

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up rabbi information by name
 * @param {string} name - Hebrew or English name
 * @returns {Object|null}
 */
export function lookupRabbi(name) {
  const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };

  // Direct lookup
  if (allRabbis[name]) {
    return { hebrew: name, ...allRabbis[name] };
  }

  // Reverse lookup by English name
  for (const [hebrew, info] of Object.entries(allRabbis)) {
    if (info.name.toLowerCase() === name.toLowerCase()) {
      return { hebrew, ...info };
    }
  }

  return null;
}

/**
 * Get all rabbis of a specific period/generation
 * @param {string} period - 'tanna' or 'amora'
 * @param {number} generation - Generation number
 * @returns {Array}
 */
export function getRabbisByGeneration(period, generation = null) {
  const source = period === 'tanna' ? RABBI_DATABASE.tannaim : RABBI_DATABASE.amoraim;

  const results = [];
  for (const [hebrew, info] of Object.entries(source)) {
    if (generation === null || info.generation === generation) {
      results.push({ hebrew, ...info });
    }
  }

  return results.sort((a, b) => (a.generation || 0) - (b.generation || 0));
}

