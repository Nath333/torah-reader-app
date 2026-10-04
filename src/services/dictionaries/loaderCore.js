/**
 * Dynamic Dictionary Loader Service — NOYAU (split 04/10/2026)
 *
 * Loads dictionary data on-demand from public/data/*.json instead of bundling.
 * This reduces initial bundle size by ~30MB (uncompressed) / ~6MB (gzipped).
 *
 * Features:
 * - Lazy loading on first access
 * - In-memory caching after load
 * - Graceful error handling
 * - Loading state tracking
 */

import { createLogger } from '../../utils/debug';
// Centralized Hebrew text utilities (single source of truth)
import { normalizeFinals, stripAllDiacritics, restoreFinals } from '../../utils/hebrewUtils';
// Use canonical prefix list (DRY - single source of truth)
import { HEBREW_PREFIXES_ORDERED } from '../../constants/morphology';
// Use shared SOURCE_CONFIG for dictionary tiers (DRY)
import { SOURCE_CONFIG } from '../../constants/sourceConfig';
// Book classifiers for context-aware preload gating
import { isTorahBook, isTalmudBook, isMishnahBook } from '../sefariaApi';
import { getSefariaBase } from '../sefariaBase';
// IndexedDB persistence for parsed dictionary JSON
import { getCached, putCached } from './dictionaryCache';

const log = createLogger('DictionaryLoader');

// =============================================================================
// CACHE & STATE
// =============================================================================

/** Cached dictionary data */
export const cache = {
  bdb: null,
  jastrow: null,
  strongs: null,
  // Additional lexicons (lazy-loaded from JSON)
  bdbLexicon: null,
  bdbAramaic: null,
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
// Academic Hebrew lexicons
  geseniusLexicon: null,  // Gesenius - Classical Hebrew grammar (6,979 entries)
  kleinLexicon: null,     // Klein - Etymology-focused Hebrew (6,979 entries)
  // Scholarly data (lazy-loaded from JSON)
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
// Major Etymology Databases
  sefariaCache: null,         // 2,493 entries - Pre-parsed Klein, BDB, Jastrow, Strong's
  rootMeaningsPro: null,      // 18,898 entries - Main unified etymology database
  etymologyJastrow: null,     // 16,794 entries - Cross-refs from Jastrow
  wiktionaryCache: null       // 108+ entries - Proto-Semitic reconstructions
};

/** Loading promises to prevent duplicate fetches */
export const loadingPromises = {
  bdb: null,
  jastrow: null,
  strongs: null,
  bdbLexicon: null,
  bdbAramaic: null,
  jastrowLexicon: null,
  strongLexicon: null,
  calAramaic: null,
  jastrowAramaic: null,
// Academic Hebrew lexicons
  geseniusLexicon: null,
  kleinLexicon: null,
  rootMeanings: null,
  semanticFields: null,
  rabbiBiographies: null,
  realia: null,
// Major Etymology Databases
  sefariaCache: null,
  rootMeaningsPro: null,
  etymologyJastrow: null,
  wiktionaryCache: null
};

/** Loading state for UI feedback */
export const loadingState = {
  bdb: false,
  jastrow: false,
  strongs: false,
  bdbLexicon: false,
  bdbAramaic: false,
  jastrowLexicon: false,
  strongLexicon: false,
  calAramaic: false,
  jastrowAramaic: false,
// Academic Hebrew lexicons
  geseniusLexicon: false,
  kleinLexicon: false,
  rootMeanings: false,
  semanticFields: false,
  rabbiBiographies: false,
  realia: false,
// Major Etymology Databases
  sefariaCache: false,
  rootMeaningsPro: false,
  etymologyJastrow: false,
  wiktionaryCache: false
};

// =============================================================================
// HEALTH MONITORING
// =============================================================================

/**
 * Per-dictionary health state. Lets the UI / diagnostic tools distinguish
 * between "never requested", "loading", "loaded OK", and "failed".
 *
 * Entry shape:
 *   { status: 'idle'|'loading'|'ready'|'failed',
 *     error: string|null,
 *     loadedAt: number|null,
 *     durationMs: number|null,
 *     entryCount: number|null,
 *     attempts: number }
 */
const dictionaryHealth = Object.fromEntries(
  Object.keys(cache).map(name => [name, {
    status: 'idle',
    error: null,
    loadedAt: null,
    durationMs: null,
    entryCount: null,
    attempts: 0
  }])
);

/**
 * Read-only snapshot of dictionary health. Safe for UI consumption.
 * @returns {Object<string, object>} Frozen copy of health state.
 */
export function getDictionaryHealth() {
  const snapshot = {};
  for (const [name, state] of Object.entries(dictionaryHealth)) {
    snapshot[name] = { ...state };
  }
  return snapshot;
}

/**
 * List dictionaries that failed on their most recent load attempt.
 * @returns {Array<{name: string, error: string, attempts: number}>}
 */
export function getUnhealthyDictionaries() {
  return Object.entries(dictionaryHealth)
    .filter(([, state]) => state.status === 'failed')
    .map(([name, state]) => ({ name, error: state.error, attempts: state.attempts }));
}

/**
 * Aggregate counts useful for a status badge / diagnostic panel.
 * @returns {{total: number, ready: number, loading: number, failed: number, idle: number}}
 */
export function getDictionaryHealthSummary() {
  const totals = { total: 0, ready: 0, loading: 0, failed: 0, idle: 0 };
  for (const state of Object.values(dictionaryHealth)) {
    totals.total += 1;
    totals[state.status] = (totals[state.status] || 0) + 1;
  }
  return totals;
}

// =============================================================================
// SHARED CONSTANTS & HELPERS (DRY)
// =============================================================================

// Replaces local COMMON_PREFIXES — the canonical list includes 3/4-letter combos
const COMMON_PREFIXES = HEBREW_PREFIXES_ORDERED;

/** Words that shouldn't have root extraction applied */
const COMMON_WHOLE_WORDS = ['שבת', 'תורה', 'משנה', 'גמרא', 'ברכה', 'תפלה', 'מצוה', 'עולם', 'ישראל', 'אדם'];

/**
 * Shared root extraction helper (DRY)
 * Extracts root from word using rootExtraction service with fallback
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<{root: string|null, alternativeRoots: Array}>}
 */
export async function extractRootHelper(word) {
  let extractedRoot = null;
  let alternativeRoots = [];

  // Skip extraction for known whole words
  if (COMMON_WHOLE_WORDS.includes(word)) {
    return { root: word, alternativeRoots: [] };
  }

  // Try rootExtraction service first
  try {
    const { extractRootsWithDirectValidation } = await import('../analysis/rootExtraction');
    const rootResult = extractRootsWithDirectValidation(word);

    if (rootResult?.bestMatch?.root) {
      extractedRoot = rootResult.bestMatch.root;
    } else if (rootResult?.hypotheses?.length > 0) {
      extractedRoot = rootResult.hypotheses[0].root;
    } else if (rootResult?.allMatches?.length > 0) {
      extractedRoot = rootResult.allMatches[0].root;
    }

    // Collect alternative hypotheses
    const allHypotheses = rootResult?.hypotheses || rootResult?.allMatches || [];
    alternativeRoots = allHypotheses
      .slice(0, 3)
      .map(h => ({ root: h.root, confidence: h.confidence, note: h.note }))
      .filter(h => h.root && h.root !== extractedRoot);
  } catch {
    // Root extraction service unavailable - use fallback
  }

  // Fallback: basic stem extraction
  if (!extractedRoot) {
    extractedRoot = extractRootFallback(word);
  }

  return { root: extractedRoot, alternativeRoots };
}

/**
 * Fallback root extraction without rootExtraction module (DRY)
 * @param {string} word - Hebrew word
 * @returns {string|null} Extracted root
 */
export function extractRootFallback(word) {
  let stem = word;

  // Check for hollow verb pattern - don't strip prefix if detected
  let skipPrefixStrip = false;
  if (word.length >= 4) {
    let tempStem = word;
    const suffixes = ['ים', 'ות', 'ין'];
    for (const suf of suffixes) {
      if (tempStem.endsWith(suf)) {
        tempStem = tempStem.slice(0, -suf.length);
        break;
      }
    }
    if (tempStem.length === 4 && tempStem[1] === 'ו') skipPrefixStrip = true;
    if (tempStem.length === 3 && !['ה', 'ו', 'ב', 'כ', 'ל'].includes(tempStem[0])) skipPrefixStrip = true;
  }

  // Strip prefix if safe
  let strippedPrefix = null;
  if (!skipPrefixStrip) {
    for (const pre of COMMON_PREFIXES) {
      if (stem.startsWith(pre) && stem.length > pre.length + 2) {
        strippedPrefix = pre;
        stem = stem.slice(pre.length);
        break;
      }
    }
  }

  // Infinitive pattern: לכתוב → כתב
  if (strippedPrefix === 'ל' && stem.length >= 4) {
    if (stem.endsWith('ות')) return stem.slice(0, -2) + 'ה';
    if (stem[stem.length - 2] === 'ו') return stem.slice(0, -2) + stem.slice(-1);
  }

  // Strip suffixes
  const suffixes = ['ות', 'ים', 'ין', 'ה', 'ת', 'ן', 'נו', 'כם', 'הם', 'הן'];
  for (const suf of suffixes) {
    if (stem.endsWith(suf) && stem.length > suf.length + 1) {
      stem = stem.slice(0, -suf.length);
      break;
    }
  }

  // Extract root based on stem length
  if (stem.length === 4 && stem[2] === 'י') return stem[0] + stem[1] + stem[3];
  if (stem.length === 4 && stem[1] === 'ו') return stem[0] + stem[2] + stem[3];
  if (stem.length === 4) return stem.slice(0, 3);
  if (stem.length === 3) return restoreFinals(stem);
  if (stem.length === 2) return stem + 'ה';

  return null;
}

// =============================================================================
// CORE LOADING FUNCTIONS
// =============================================================================

/**
 * Load a dictionary from public/data
 * @param {'bdb' | 'jastrow' | 'strongs'} name - Dictionary name
 * @returns {Promise<Object>} Dictionary data
 */
export async function loadDictionary(name) {
  // Return cached data if available
  if (cache[name]) {
    return cache[name];
  }

  // Return existing promise if already loading
  if (loadingPromises[name]) {
    return loadingPromises[name];
  }

  // Start loading
  loadingState[name] = true;
  if (dictionaryHealth[name]) {
    dictionaryHealth[name].status = 'loading';
    dictionaryHealth[name].error = null;
    dictionaryHealth[name].attempts += 1;
  }
  const loadStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  log.debug(`Loading ${name} dictionary...`);

  const fileName = {
    // PRIMARY DICTIONARIES (Complete versions)
    bdb: 'bdbComplete.json',
    jastrow: 'jastrowComplete.json',
    strongs: 'strongsComplete.json',
    // Redirects to complete versions (data merged)
    // Legacy keys now point to consolidated files
    bdbLexicon: 'bdbComplete.json',       // MERGED: was bdb_lexicon.json (subset)
    bdbAramaic: 'bdbComplete.json',       // MERGED: was bdb_aramaic.json (subset)
    jastrowLexicon: 'jastrowComplete.json', // MERGED: was jastrow_lexicon.json (subset)
    jastrowAramaic: 'jastrowComplete.json', // MERGED: was jastrow_aramaic.json (subset)
    strongLexicon: 'strongsComplete.json',  // MERGED: was strong_lexicon.json (subset)
    // ESSENTIAL LEXICONS (Not redundant - unique data)
    calAramaic: 'cal_aramaic.json',           // CAL - 12,243 Aramaic entries (FREE!)
    // Academic Hebrew lexicons
    geseniusLexicon: 'gesenius_lexicon.json', // Gesenius - Classical Hebrew grammar (6,979 entries)
    kleinLexicon: 'klein_lexicon.json',       // Klein - Etymology-focused Hebrew (6,979 entries)
    // Scholarly data
    rootMeanings: 'root_meanings_pro.json',   // MERGED: was root_meanings.json (subset)
    semanticFields: 'semantic_fields.json',
    rabbiBiographies: 'rabbi_biographies.json',
    realia: 'realia.json',
    // Major Etymology Databases
    sefariaCache: 'sefaria_lexicon_cache.json',        // 2,493 pre-parsed entries
    rootMeaningsPro: 'root_meanings_pro.json',          // 22,049 unified entries (strengthened!)
    etymologyJastrow: 'etymology_jastrow_extracted.json', // 16,794 cross-refs (source data)
    wiktionaryCache: 'wiktionary_etymology_cache.json'  // 108+ Proto-Semitic
  }[name];

  const markReady = (data, { source }) => {
    cache[name] = data;
    loadingState[name] = false;
    loadingPromises[name] = Promise.resolve(data);
    const now = Date.now();
    const nowPerf = (typeof performance !== 'undefined' && performance.now) ? performance.now() : now;
    const entryCount = Object.keys(data?.byWord || data || {}).length;
    if (dictionaryHealth[name]) {
      dictionaryHealth[name].status = 'ready';
      dictionaryHealth[name].error = null;
      dictionaryHealth[name].loadedAt = now;
      dictionaryHealth[name].durationMs = Math.round(nowPerf - loadStartedAt);
      dictionaryHealth[name].entryCount = entryCount;
    }
    log.debug(`Loaded ${name} from ${source}: ${entryCount} entries`);
  };

  loadingPromises[name] = (async () => {
    // IndexedDB hit: skip network entirely on warm sessions.
    const cached = await getCached(fileName);
    if (cached) {
      markReady(cached, { source: 'IndexedDB' });
      return cached;
    }

    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/data/${fileName}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${name}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('json')) {
        throw new Error(`Expected JSON for ${name} but got ${contentType}`);
      }
      const data = await response.json();
      markReady(data, { source: 'network' });
      // Fire-and-forget persistence so we don't block the first render.
      putCached(fileName, data).catch(() => {});
      return data;
    } catch (error) {
      loadingState[name] = false;
      // Clear promise on failure so retry is possible
      loadingPromises[name] = null;

      let classification;
      if (error instanceof SyntaxError) {
        classification = 'Malformed JSON';
      } else if (error instanceof TypeError) {
        classification = 'Network error';
      } else {
        classification = 'Load failed';
      }
      const message = `[${name}] ${classification}: ${error.message}`;

      if (dictionaryHealth[name]) {
        dictionaryHealth[name].status = 'failed';
        dictionaryHealth[name].error = message;
      }

      // Unconditional warn — the debug logger may be silent in production.
      // Previously swallowed failures masked broken dictionaries from users.
      // eslint-disable-next-line no-console
      console.warn(`[DictionaryLoader] ${message}`);
      log.error(message);
      throw error;
    }
  })();

  return loadingPromises[name];
}

