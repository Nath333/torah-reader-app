/**
 * Rabbi Biography Database
 * Comprehensive data for Talmudic and Medieval scholars
 *
 * Data is lazy-loaded from public/data/rabbi_biographies.json
 * to reduce initial bundle size.
 */

import { getRabbiBiographiesData, getRabbiBiographies } from '../services/dictionaryLoader';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED DATA
// =============================================================================

/**
 * RABBIS - Lazy-loaded from rabbi_biographies.json
 * Access synchronously after preload, or use getRabbiBiographies() for async access.
 */
export const RABBIS = createLazyProxy(getRabbiBiographiesData);

// =============================================================================
// LOOKUP UTILITIES
// =============================================================================

/**
 * Lookup rabbi by Hebrew or English name
 * @param {string} name - Hebrew or English name to search
 * @returns {Object|null} Rabbi data with key, or null if not found
 */
export function findRabbi(name) {
  const data = getRabbiBiographiesData();
  if (!data) return null;

  // Direct Hebrew lookup
  if (data[name]) return { key: name, ...data[name] };

  // Search by English name
  for (const [key, rabbi] of Object.entries(data)) {
    if (rabbi.english.toLowerCase() === name.toLowerCase() ||
        rabbi.fullName?.toLowerCase().includes(name.toLowerCase())) {
      return { key, ...rabbi };
    }
  }

  return null;
}

/**
 * Get all rabbi names (Hebrew) for text matching
 * @returns {Array<string>} Array of Hebrew rabbi names
 */
export function getAllRabbiNames() {
  const data = getRabbiBiographiesData();
  if (!data) return [];

  const names = new Set();
  for (const key of Object.keys(data)) {
    names.add(key);
    // Add common variations
    if (key.includes('רבי')) {
      names.add(key.replace('רבי ', 'ר\' '));
      names.add(key.replace('רבי ', "ר'"));
    }
  }
  return Array.from(names);
}

/**
 * Create regex pattern for matching rabbi names in text
 * @returns {RegExp} Pattern matching all rabbi names
 */
export function createRabbiMatcher() {
  const names = getAllRabbiNames().sort((a, b) => b.length - a.length); // Longest first
  if (names.length === 0) return /(?!)/; // Never-matching regex
  const pattern = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(${pattern})`, 'g');
}

/**
 * Get rabbis by era
 * @param {string} era - Era name (Tanna, Amora, Rishon, etc.)
 * @returns {Array} Array of rabbis from that era
 */
export function getRabbisByEra(era) {
  const data = getRabbiBiographiesData();
  if (!data) return [];

  return Object.entries(data)
    .filter(([_, rabbi]) => rabbi.era === era)
    .map(([key, rabbi]) => ({ key, ...rabbi }));
}

/**
 * Ensure rabbi data is loaded (call before using sync functions)
 * @returns {Promise<void>}
 */
export async function ensureLoaded() {
  await getRabbiBiographies();
}

export default RABBIS;
