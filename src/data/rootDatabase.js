/**
 * ROOT DATABASE - PRO SCHOLAR Edition
 *
 * Comprehensive Hebrew/Aramaic root database with:
 * - Base and causative meanings
 * - Proto-Semitic etymology
 * - Cognates in sister languages (Arabic, Akkadian, Ugaritic, Syriac)
 * - Frequency data (Tanakh occurrences, Talmud occurrences)
 * - Semantic field classification
 *
 * Data is lazy-loaded from public/data/root_meanings.json and semantic_fields.json
 * to reduce initial bundle size.
 */

import { getRootMeaningsData, getSemanticFieldsData, getRootMeanings, getSemanticFields } from '../services/dictionaries/dictionaryLoader';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED DATA PROXIES
// =============================================================================

/**
 * ROOT_MEANINGS - Lazy-loaded from root_meanings.json
 * Access synchronously after preload, or use getRootMeanings() for async access.
 */
export const ROOT_MEANINGS = createLazyProxy(getRootMeaningsData);

/**
 * SEMANTIC_FIELDS - Lazy-loaded from semantic_fields.json
 * Groups of related roots by semantic category.
 */
export const SEMANTIC_FIELDS = createLazyProxy(getSemanticFieldsData);

// =============================================================================
// ROOT SEARCH UTILITIES
// =============================================================================

/**
 * Get all information about a root
 * @param {string} root - The three-letter root
 * @returns {Object|null} Root information or null
 */
export const getRootInfo = (root) => {
  const data = getRootMeaningsData();
  return data?.[root] || null;
};

/**
 * Search for roots by meaning
 * @param {string} meaningQuery - Search term in English
 * @returns {Array} Array of matching roots with info
 */
export const searchRootsByMeaning = (meaningQuery) => {
  const data = getRootMeaningsData();
  if (!data) return [];

  const query = meaningQuery.toLowerCase();
  const results = [];

  for (const [root, info] of Object.entries(data)) {
    const baseMatch = info.base?.toLowerCase().includes(query);
    const causativeMatch = info.causative?.toLowerCase().includes(query);
    const notesMatch = info.notes?.toLowerCase().includes(query);

    if (baseMatch || causativeMatch || notesMatch) {
      results.push({
        root,
        ...info,
        matchType: baseMatch ? 'base' : causativeMatch ? 'causative' : 'notes'
      });
    }
  }

  return results;
};

/**
 * Get all roots in a semantic field
 * @param {string} fieldName - Name of semantic field
 * @returns {Array} Array of roots with info
 */
export const getRootsBySemanticField = (fieldName) => {
  const fields = getSemanticFieldsData();
  const meanings = getRootMeaningsData();
  if (!fields || !meanings) return [];

  const field = fields[fieldName];
  if (!field) return [];

  return field.roots.map(root => ({
    root,
    ...meanings[root]
  })).filter(r => r.base); // Filter out any missing roots
};

/**
 * Get cognates for a root
 * @param {string} root - The root to look up
 * @returns {Object|null} Cognate information
 */
export const getCognates = (root) => {
  const info = getRootInfo(root);
  return info?.cognates || null;
};

/**
 * Get frequency data for a root
 * @param {string} root - The root to look up
 * @returns {Object|null} Frequency information
 */
export const getFrequency = (root) => {
  const info = getRootInfo(root);
  return info?.frequency || null;
};

/**
 * Check if a root is a Pe-Nun verb (first letter נ assimilates)
 * @param {string} root - The root to check
 * @returns {boolean}
 */
export const isPeNunVerb = (root) => {
  const info = getRootInfo(root);
  return info?.weakType === 'pe-nun' || root.startsWith('נ');
};

/**
 * Get related roots (alias for getRootsBySemanticField for easier API)
 * @param {string} fieldName - Name of semantic field
 * @returns {Array} Array of roots with info
 */
export const getRelatedRoots = (fieldName) => {
  return getRootsBySemanticField(fieldName);
};

/**
 * Get all roots with etymology from a specific language
 * @param {string} language - Language name (arabic, akkadian, syriac, etc.)
 * @returns {Array} Array of roots with cognates in that language
 */
export const getRootsByCognateLanguage = (language) => {
  const data = getRootMeaningsData();
  if (!data) return [];

  const results = [];
  const lang = language.toLowerCase();

  for (const [root, info] of Object.entries(data)) {
    if (info.cognates && info.cognates[lang]) {
      results.push({
        root,
        cognate: info.cognates[lang],
        meaning: info.base,
        ...info
      });
    }
  }

  return results;
};

// =============================================================================
// STATISTICS
// =============================================================================

export const getRootDatabaseStats = () => {
  const data = getRootMeaningsData();
  const fields = getSemanticFieldsData();
  if (!data) return { totalRoots: 0, withCognates: 0, withFrequency: 0, peNunVerbs: 0, semanticFields: 0 };

  const roots = Object.keys(data);
  const withCognates = roots.filter(r => data[r].cognates);
  const withFrequency = roots.filter(r => data[r].frequency);
  const peNunVerbs = roots.filter(r => isPeNunVerb(r));

  return {
    totalRoots: roots.length,
    withCognates: withCognates.length,
    withFrequency: withFrequency.length,
    peNunVerbs: peNunVerbs.length,
    semanticFields: fields ? Object.keys(fields).length : 0
  };
};

// =============================================================================
// ASYNC INITIALIZATION
// =============================================================================

/**
 * Ensure root database is loaded (call before using sync functions)
 * @returns {Promise<void>}
 */
export async function ensureLoaded() {
  await Promise.all([getRootMeanings(), getSemanticFields()]);
}

const rootDatabase = {
  ROOT_MEANINGS,
  SEMANTIC_FIELDS,
  getRootInfo,
  searchRootsByMeaning,
  getRootsBySemanticField,
  getRelatedRoots,
  getCognates,
  getFrequency,
  isPeNunVerb,
  getRootsByCognateLanguage,
  getRootDatabaseStats,
  ensureLoaded
};

export default rootDatabase;
