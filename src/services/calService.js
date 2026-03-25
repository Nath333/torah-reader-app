// =============================================================================
// CAL Service - Comprehensive Aramaic Lexicon Integration
// =============================================================================
// PRO SCHOLAR V12: Academic Aramaic data from Hebrew Union College
// This is equivalent to DJBA/DJPA quality data - FREE!
//
// CAL Database: http://cal.huc.edu/
// - 10,000+ Aramaic entries with scholarly analysis
// - Dialect information (JBA, JPA, Syriac, Mandaic)
// - Attestations with source citations
// - Cognate connections
// =============================================================================

import { createLogger } from '../utils/debug';
import { stripAllDiacritics } from '../utils/hebrewUtils';
const log = createLogger('CAL');

// CAL API endpoints
const CAL_BASE_URL = 'https://cal.huc.edu';
const CAL_SEARCH_URL = `${CAL_BASE_URL}/oneentry`;

// Cache for CAL results
const calCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Dialect codes used by CAL
export const CAL_DIALECTS = {
  'JBA': { name: 'Jewish Babylonian Aramaic', period: 'Talmudic', corpus: 'Bavli' },
  'JPA': { name: 'Jewish Palestinian Aramaic', period: 'Talmudic', corpus: 'Yerushalmi, Midrash' },
  'Syr': { name: 'Syriac', period: 'Classical', corpus: 'Peshitta, Church Fathers' },
  'Sam': { name: 'Samaritan Aramaic', period: 'Late', corpus: 'Samaritan Targum' },
  'CPA': { name: 'Christian Palestinian Aramaic', period: 'Byzantine', corpus: 'Christian texts' },
  'Man': { name: 'Mandaic', period: 'Late', corpus: 'Mandaean literature' },
  'OA': { name: 'Official Aramaic', period: 'Persian', corpus: 'Imperial documents' },
  'OfA': { name: 'Old Aramaic', period: 'Early', corpus: 'Inscriptions' },
  'Tg': { name: 'Targumic', period: 'Post-biblical', corpus: 'Targumim' },
  'Gal': { name: 'Galilean Aramaic', period: 'Talmudic', corpus: 'Palestinian sources' }
};

// Preloaded CAL data (loaded from extracted JSON)
let calExtractedData = null;

/**
 * Load pre-extracted CAL data from JSON
 */
export const loadCALData = async () => {
  if (calExtractedData) return calExtractedData;

  try {
    // PRO SCHOLAR V12: Use cal_aramaic.json (276 curated entries)
    const response = await fetch('/data/cal_aramaic.json');
    if (response.ok) {
      const data = await response.json();
      // cal_aramaic.json is a flat object (not nested under .entries)
      calExtractedData = data.entries || data || {};
      log(`Loaded ${Object.keys(calExtractedData).length} CAL entries from cache`);
    }
  } catch (err) {
    log('CAL data not available:', err.message);
    calExtractedData = {};
  }

  return calExtractedData;
};

/**
 * Parse CAL HTML response to extract structured data
 * CAL returns HTML pages, so we need to parse them
 */
function parseCALResponse(html, word) {
  if (!html || typeof html !== 'string') return null;

  const result = {
    word,
    lemma: null,
    definition: null,
    dialects: [],
    forms: [],
    cognates: {},
    attestations: [],
    etymology: null,
    source: 'CAL'
  };

  // Extract lemma (usually in <b> or <strong> tags)
  const lemmaMatch = html.match(/<b[^>]*>([^<]+)<\/b>/i) ||
                     html.match(/<strong[^>]*>([^<]+)<\/strong>/i);
  if (lemmaMatch) {
    result.lemma = lemmaMatch[1].trim();
  }

  // Extract definition
  const defMatch = html.match(/Definition:\s*([^<]+)/i) ||
                   html.match(/Meaning:\s*([^<]+)/i);
  if (defMatch) {
    result.definition = defMatch[1].trim();
  }

  // Extract dialects
  for (const [code, info] of Object.entries(CAL_DIALECTS)) {
    const dialectPattern = new RegExp(`\\b${code}\\b`, 'gi');
    if (dialectPattern.test(html)) {
      result.dialects.push({
        code,
        name: info.name,
        period: info.period
      });
    }
  }

  // Extract attestations (references to texts)
  const attMatch = html.matchAll(/([A-Z][a-z]+\s+\d+[ab]?(?::\d+)?)/g);
  for (const match of attMatch) {
    const ref = match[1];
    if (!result.attestations.includes(ref) && result.attestations.length < 10) {
      result.attestations.push(ref);
    }
  }

  // Extract etymology notes
  const etymMatch = html.match(/Etymology:\s*([^<]+)/i) ||
                    html.match(/cf\.\s+([^<]+)/i);
  if (etymMatch) {
    result.etymology = etymMatch[1].trim();
  }

  // Check if we found meaningful data
  if (!result.definition && !result.lemma && result.dialects.length === 0) {
    return null;
  }

  return result;
}

/**
 * Look up a word in CAL (online API)
 * Note: CAL has rate limiting, use sparingly
 */
export const lookupCAL = async (word) => {
  if (!word || typeof word !== 'string') return null;

  const cleanWord = stripAllDiacritics(word.trim());

  // Check local cache first
  const cached = calCache.get(cleanWord);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Check pre-extracted data
  const extracted = await loadCALData();
  if (extracted[cleanWord]) {
    calCache.set(cleanWord, { data: extracted[cleanWord], timestamp: Date.now() });
    return extracted[cleanWord];
  }

  // Online lookup (use sparingly due to rate limits)
  try {
    // CAL search URL format
    const searchUrl = `${CAL_SEARCH_URL}?lemma=${encodeURIComponent(cleanWord)}&cits=no`;

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'TorahReaderApp/1.0 (Academic Research)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      log(`CAL API returned ${response.status} for ${cleanWord}`);
      calCache.set(cleanWord, { data: null, timestamp: Date.now() });
      return null;
    }

    const html = await response.text();
    const result = parseCALResponse(html, cleanWord);

    calCache.set(cleanWord, { data: result, timestamp: Date.now() });
    return result;

  } catch (err) {
    log(`CAL lookup error for ${cleanWord}:`, err.message);
    return null;
  }
};

/**
 * Look up word synchronously from pre-extracted data only
 */
export const lookupCALSync = (word) => {
  if (!word) return null;
  const cleanWord = stripAllDiacritics(word.trim());
  return calExtractedData?.[cleanWord] || null;
};

/**
 * Get dialect information for a word
 */
export const getDialectInfo = async (word) => {
  const result = await lookupCAL(word);
  if (!result?.dialects?.length) return null;

  return {
    word,
    dialects: result.dialects,
    primaryDialect: result.dialects[0],
    isMultiDialect: result.dialects.length > 1
  };
};

/**
 * Check if CAL has data for a root
 */
export const hasCALData = async (root) => {
  const result = await lookupCAL(root);
  return result !== null;
};

/**
 * Get statistics about loaded CAL data
 */
export const getCALStats = async () => {
  const data = await loadCALData();
  const entries = Object.values(data);

  const dialectCounts = {};
  let withDefinition = 0;
  let withAttestations = 0;

  for (const entry of entries) {
    if (entry.definition) withDefinition++;
    if (entry.attestations?.length > 0) withAttestations++;

    for (const dialect of (entry.dialects || [])) {
      dialectCounts[dialect.code] = (dialectCounts[dialect.code] || 0) + 1;
    }
  }

  return {
    totalEntries: entries.length,
    withDefinition,
    withAttestations,
    dialectCounts,
    source: 'CAL (Hebrew Union College)'
  };
};

/**
 * Format CAL data for display
 */
export const formatCALForDisplay = (calData) => {
  if (!calData) return null;

  return {
    word: calData.word,
    definition: calData.definition,
    dialects: calData.dialects?.map(d => ({
      code: d.code,
      name: d.name,
      badge: d.code // For UI badge display
    })) || [],
    attestations: calData.attestations?.slice(0, 5) || [], // Limit for UI
    hasMultipleDialects: (calData.dialects?.length || 0) > 1,
    source: 'CAL'
  };
};

/**
 * Clear CAL cache
 */
export const clearCALCache = () => {
  calCache.clear();
  log('CAL cache cleared');
};

// Default export
const calService = {
  lookupCAL,
  lookupCALSync,
  loadCALData,
  getDialectInfo,
  hasCALData,
  getCALStats,
  formatCALForDisplay,
  clearCALCache,
  CAL_DIALECTS
};

export default calService;
