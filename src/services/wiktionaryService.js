// =============================================================================
// Wiktionary Service - Community dictionary lookup (optional reference source)
// =============================================================================
// PRO SCHOLAR: Reference tier source for supplementary definitions
// Reliability: Reference (tier 5) - Community-edited, not peer-reviewed
// Use case: Fallback when academic sources lack coverage, modern Hebrew
// SCHOLAR PRO ENHANCEMENT: Proto-Semitic reconstruction extraction
// =============================================================================

import { stripAllDiacritics, normalizeFinals } from '../utils/hebrewUtils';

const DEBUG = false;

// Proto-Semitic pattern detection (used in parseWiktionaryEtymology)
// eslint-disable-next-line no-unused-vars
const PROTO_SEMITIC_PATTERNS = [
  /Proto-Semitic\s+\*([^\s,;.]+)/gi,
  /\*([ʾʿˀˁ]?[a-zA-Z\-āēīōūâêîôûəăĕĭŏŭ]+)/g, // Reconstructed forms with asterisk
  /from\s+(?:the\s+)?root\s+([א-ת]{2,4})/gi,
];

// Cognate language detection patterns (used in parseWiktionaryEtymology)
// eslint-disable-next-line no-unused-vars
const COGNATE_PATTERNS = {
  akkadian: /Akkadian\s+([^\s,;.()]+(?:\s+[^\s,;.()]+)?)/gi,
  arabic: /Arabic\s+([^\s,;.()]+)/gi,
  aramaic: /Aramaic\s+([^\s,;.()]+)/gi,
  ugaritic: /Ugaritic\s+([^\s,;.()]+)/gi,
  ethiopic: /(?:Ethiopic|Ge'ez)\s+([^\s,;.()]+)/gi,
  phoenician: /Phoenician\s+([^\s,;.()]+)/gi,
  syriac: /Syriac\s+([^\s,;.()]+)/gi,
};

// Cache for Wiktionary results (in-memory, session-only)
const wiktionaryCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// PRO SCHOLAR: Cached etymology data loaded from pre-extracted file
let cachedEtymologyData = null;
let cachedEtymologyLoaded = false;

/**
 * Load pre-extracted Wiktionary etymology data for offline/fast access
 * @returns {Promise<Object>} Cached etymology entries
 */
async function loadCachedEtymology() {
  if (cachedEtymologyLoaded) return cachedEtymologyData || {};

  try {
    const response = await fetch('/data/etymology_wiktionary.json');
    if (response.ok) {
      const data = await response.json();
      cachedEtymologyData = data.entries || {};
      cachedEtymologyLoaded = true;
      if (DEBUG) console.log(`[Wiktionary] Loaded ${Object.keys(cachedEtymologyData).length} cached etymology entries`);
    }
  } catch (err) {
    if (DEBUG) console.log('[Wiktionary] Could not load cached etymology:', err.message);
    cachedEtymologyData = {};
    cachedEtymologyLoaded = true;
  }

  return cachedEtymologyData || {};
}

/**
 * Normalize Hebrew word for lookup (strip niqqud, finals)
 */
function normalizeWord(word) {
  return normalizeFinals(stripAllDiacritics(word)).trim();
}

/**
 * Get Proto-Semitic reconstruction from cached data (offline-first)
 * @param {string} word - Hebrew word
 * @returns {Promise<Object|null>} Etymology data with Proto-Semitic if available
 */
export async function getProtoSemitic(word) {
  if (!word) return null;

  const normalized = normalizeWord(word);
  const cached = await loadCachedEtymology();

  const entry = cached[normalized] || cached[word];

  if (entry && !entry.notFound) {
    return {
      word: entry.word,
      protoSemitic: entry.protoSemitic,
      cognates: entry.cognates,
      etymologyText: entry.etymologyText,
      source: 'Wiktionary (cached)',
      license: 'CC-BY-SA',
    };
  }

  return null;
}

/**
 * Check if we have Proto-Semitic data for a word
 * @param {string} word - Hebrew word
 * @returns {Promise<boolean>}
 */
export async function hasProtoSemitic(word) {
  const data = await getProtoSemitic(word);
  return data?.protoSemitic != null;
}

/**
 * Lookup a Hebrew word in Wiktionary (English edition)
 * Uses the Wiktionary REST API for definitions
 *
 * @param {string} word - Hebrew word to lookup
 * @returns {Promise<Object|null>} Definition object or null if not found
 */
export async function lookupWiktionary(word) {
  if (!word || typeof word !== 'string') {
    return null;
  }

  const cleanWord = word.trim();
  if (cleanWord.length < 2) {
    return null;
  }

  // Check cache first
  const cached = wiktionaryCache.get(cleanWord);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (DEBUG) console.log('[Wiktionary] Cache hit for:', cleanWord);
    return cached.data;
  }

  try {
    // Wiktionary REST API endpoint
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cleanWord)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-User-Agent': 'TorahReaderApp/1.0 (https://github.com/torah-reader)'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Word not found - cache the miss to avoid repeated lookups
        wiktionaryCache.set(cleanWord, { data: null, timestamp: Date.now() });
        return null;
      }
      throw new Error(`Wiktionary API error: ${response.status}`);
    }

    const data = await response.json();
    const result = parseWiktionaryResponse(data, cleanWord);

    // Cache the result
    wiktionaryCache.set(cleanWord, { data: result, timestamp: Date.now() });

    if (DEBUG) console.log('[Wiktionary] Found:', cleanWord, result);
    return result;

  } catch (err) {
    if (DEBUG) console.log('[Wiktionary] Error:', err.message);
    // Don't cache errors - allow retry
    return null;
  }
}

/**
 * Parse Wiktionary API response into standardized format
 *
 * @param {Object} data - Raw API response
 * @param {string} word - Original word looked up
 * @returns {Object|null} Parsed result
 */
function parseWiktionaryResponse(data, word) {
  if (!data || !data.he) {
    // Try to find Hebrew definitions in any language section
    const hebrewSection = data?.he || data?.hbo || null;
    if (!hebrewSection) {
      return null;
    }
  }

  const hebrewData = data.he || data.hbo || [];

  // Extract definitions from all parts of speech
  const definitions = [];
  const partsOfSpeech = [];

  for (const entry of hebrewData) {
    if (entry.partOfSpeech) {
      partsOfSpeech.push(entry.partOfSpeech);
    }

    if (entry.definitions && Array.isArray(entry.definitions)) {
      for (const def of entry.definitions) {
        if (def.definition) {
          // Strip HTML tags from definition
          const cleanDef = stripHtml(def.definition);
          if (cleanDef && !definitions.includes(cleanDef)) {
            definitions.push(cleanDef);
          }
        }
      }
    }
  }

  if (definitions.length === 0) {
    return null;
  }

  return {
    word: word,
    headword: word,
    definition: definitions[0], // Primary definition
    allDefinitions: definitions,
    partOfSpeech: partsOfSpeech.length > 0 ? partsOfSpeech[0] : null,
    partsOfSpeech: [...new Set(partsOfSpeech)],
    source: 'Wiktionary',
    sourceName: 'Wiktionary',
    sourceType: 'reference',
    reliability: 'reference',
    url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    isCommunitySource: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Strip HTML tags from a string
 * @param {string} html - String potentially containing HTML
 * @returns {string} Clean text
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SCHOLAR PRO: Fetch etymology data including Proto-Semitic reconstructions
 * Uses Wiktionary's parse API for HTML content to extract etymology section
 *
 * @param {string} word - Hebrew word to lookup
 * @returns {Promise<Object|null>} Etymology data with Proto-Semitic if available
 */
export async function fetchWiktionaryEtymology(word) {
  if (!word || typeof word !== 'string') {
    return null;
  }

  const cleanWord = stripAllDiacritics(word.trim());

  try {
    // Use Wiktionary parse API to get full page HTML with etymology
    const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(cleanWord)}&prop=text&format=json&origin=*`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Api-User-Agent': 'TorahReaderApp/1.0 (https://github.com/torah-reader)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.parse?.text?.['*']) {
      return null;
    }

    const html = data.parse.text['*'];
    return parseWiktionaryEtymology(html, cleanWord);

  } catch (err) {
    if (DEBUG) console.log('[Wiktionary] Etymology fetch error:', err.message);
    return null;
  }
}

/**
 * Parse etymology section from Wiktionary HTML
 * Extracts Proto-Semitic reconstructions and cognate information
 *
 * @param {string} html - Full page HTML
 * @param {string} word - Original word
 * @returns {Object|null} Parsed etymology data
 */
function parseWiktionaryEtymology(html, word) {
  const result = {
    word,
    protoSemitic: null,
    cognates: {},
    etymologyText: null,
    root: null,
    source: 'Wiktionary'
  };

  // Find Hebrew etymology section
  // Pattern: <h3>...<span class="mw-headline" id="Etymology">Etymology</span>...</h3> followed by content
  const hebrewSectionMatch = html.match(/<h2[^>]*>.*?Hebrew.*?<\/h2>([\s\S]*?)(?=<h2|$)/i);
  if (!hebrewSectionMatch) {
    return null;
  }

  const hebrewSection = hebrewSectionMatch[1];

  // Find etymology within Hebrew section
  const etymologyMatch = hebrewSection.match(/<span[^>]*id="Etymology[^"]*"[^>]*>.*?<\/span>[\s\S]*?<\/h\d>([\s\S]*?)(?=<h[23]|$)/i);

  let etymologyText = '';
  if (etymologyMatch) {
    etymologyText = stripHtml(etymologyMatch[1]).trim();
    result.etymologyText = etymologyText.substring(0, 500); // Limit length
  }

  // Extract Proto-Semitic from etymology text
  for (const pattern of PROTO_SEMITIC_PATTERNS) {
    const match = etymologyText.match(pattern);
    if (match && match[1]) {
      result.protoSemitic = match[1].trim();
      break;
    }
  }

  // Also check for Proto-Semitic link format in HTML
  const protoLinkMatch = html.match(/Proto-Semitic.*?<a[^>]*>([^<]+)<\/a>/i);
  if (protoLinkMatch && !result.protoSemitic) {
    result.protoSemitic = protoLinkMatch[1].trim();
  }

  // Extract cognates
  for (const [lang, pattern] of Object.entries(COGNATE_PATTERNS)) {
    const matches = [...etymologyText.matchAll(pattern)];
    if (matches.length > 0) {
      result.cognates[lang] = matches.map(m => m[1].trim()).filter(Boolean);
    }
  }

  // Extract root
  const rootMatch = etymologyText.match(/root\s+([א-ת]{2,4})/i);
  if (rootMatch) {
    result.root = rootMatch[1];
  }

  // Check if we found anything useful
  if (!result.protoSemitic && Object.keys(result.cognates).length === 0 && !result.root) {
    return null;
  }

  return result;
}

/**
 * Check if Wiktionary service is available
 * Performs a lightweight ping to verify API accessibility
 *
 * @returns {Promise<boolean>} True if service is reachable
 */
export async function isWiktionaryAvailable() {
  try {
    const response = await fetch(
      'https://en.wiktionary.org/api/rest_v1/',
      {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Clear the Wiktionary cache
 */
export function clearWiktionaryCache() {
  wiktionaryCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getWiktionaryCacheStats() {
  return {
    size: wiktionaryCache.size,
    entries: Array.from(wiktionaryCache.keys())
  };
}

// Default export for service pattern
const wiktionaryService = {
  lookupWiktionary,
  fetchWiktionaryEtymology,
  isWiktionaryAvailable,
  clearWiktionaryCache,
  getWiktionaryCacheStats,
  // PRO SCHOLAR: Proto-Semitic functions
  getProtoSemitic,
  hasProtoSemitic,
  loadCachedEtymology
};

export default wiktionaryService;
