/**
 * Realia Database - Measures, currencies, objects in Jewish texts
 *
 * Data is lazy-loaded from public/data/realia.json
 * to reduce initial bundle size.
 */

import { getRealiaData, getRealia } from '../services/dictionaries/dictionaryLoader';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED DATA
// =============================================================================

/**
 * MEASURES - Lazy-loaded from realia.json
 * Access synchronously after preload, or use getRealia() for async access.
 */
export const MEASURES = createLazyProxy(getRealiaData);

// =============================================================================
// LOOKUP UTILITIES
// =============================================================================

/**
 * Find measure by Hebrew or English name
 * @param {string} name - Hebrew or English name to search
 * @returns {Object|null} Measure data with key, or null if not found
 */
export function findMeasure(name) {
  const data = getRealiaData();
  if (!data) return null;

  if (data[name]) return { key: name, ...data[name] };

  for (const [key, measure] of Object.entries(data)) {
    if (measure.english.toLowerCase() === name.toLowerCase()) {
      return { key, ...measure };
    }
  }
  return null;
}

/**
 * Get all measure names for text matching
 * @returns {Array<string>} Array of Hebrew measure names
 */
export function getAllMeasureNames() {
  const data = getRealiaData();
  return data ? Object.keys(data) : [];
}

/**
 * Get measures by category
 * @param {string} category - Category name (currency, length, volume, weight, time)
 * @returns {Array} Array of measures in that category
 */
export function getMeasuresByCategory(category) {
  const data = getRealiaData();
  if (!data) return [];

  return Object.entries(data)
    .filter(([_, measure]) => measure.category === category)
    .map(([key, measure]) => ({ key, ...measure }));
}

/**
 * Get all categories
 * @returns {Array<string>} Array of unique category names
 */
export function getAllCategories() {
  const data = getRealiaData();
  if (!data) return [];

  const categories = new Set();
  for (const measure of Object.values(data)) {
    if (measure.category) categories.add(measure.category);
  }
  return Array.from(categories);
}

/**
 * Ensure realia data is loaded (call before using sync functions)
 * @returns {Promise<void>}
 */
export async function ensureLoaded() {
  await getRealia();
}

export default MEASURES;
