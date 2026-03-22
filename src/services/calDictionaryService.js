// =============================================================================
// CAL (Comprehensive Aramaic Lexicon) Dictionary Service
// API-First Approach - Fetches from Hebrew Union College's CAL database
// https://cal.huc.edu/
//
// Based on scholarly Aramaic lexicography:
// - M. Sokoloff, Dictionary of Jewish Palestinian Aramaic (JPA)
// - M. Sokoloff, Dictionary of Jewish Babylonian Aramaic (JBA)
// - M. Jastrow, Dictionary of Targumim, Talmud & Midrashic Literature
// =============================================================================

// PRO SCHOLAR V6.2: Use CacheOrchestrator for unified cache management
import { createManagedCache } from './cacheOrchestrator';
import { cleanHebrewWord } from '../utils/hebrewUtils';

// CAL API base URL
// Development: use local proxy (setupProxy.js)
// Production: use CORS proxy with fallbacks
const CAL_DIRECT_URL = 'https://cal.huc.edu';
const IS_DEV = process.env.NODE_ENV === 'development';

// CORS proxies for production (with fallbacks)
const CORS_PROXIES = [
  { name: 'allorigins', url: 'https://api.allorigins.win/get?url=', jsonWrap: true },
  { name: 'corsproxy.io', url: 'https://corsproxy.io/?', jsonWrap: false },
];

// Track which proxy is working
let activeProxyIndex = 0;

/**
 * Build CAL API URL with CORS proxy support for production
 * Works in both development (local proxy) and production (CORS proxy)
 */
const buildCalUrl = (endpoint, proxyIndex = activeProxyIndex) => {
  if (IS_DEV) {
    // Development: use local proxy configured in setupProxy.js
    return `/cal-api${endpoint}`;
  }
  // Production: use CORS proxy
  const proxy = CORS_PROXIES[proxyIndex] || CORS_PROXIES[0];
  return `${proxy.url}${encodeURIComponent(`${CAL_DIRECT_URL}${endpoint}`)}`;
};

/**
 * Get current proxy configuration
 */
const getCurrentProxy = () => CORS_PROXIES[activeProxyIndex] || CORS_PROXIES[0];

/**
 * Fetch CAL data with CORS proxy handling and automatic fallback
 * Works in both development and production environments
 * @param {string} endpoint - CAL API endpoint
 * @param {number} proxyIndex - Which proxy to try (for fallback)
 */
const fetchCalData = async (endpoint, proxyIndex = activeProxyIndex) => {
  const url = buildCalUrl(endpoint, proxyIndex);
  const proxy = CORS_PROXIES[proxyIndex] || CORS_PROXIES[0];

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': IS_DEV ? 'text/html' : (proxy.jsonWrap ? 'application/json' : 'text/html')
      },
      // Add timeout for production reliability
      signal: AbortSignal.timeout(IS_DEV ? 10000 : 12000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (IS_DEV) {
      // Development: direct HTML response from local proxy
      return await response.text();
    } else if (proxy.jsonWrap) {
      // Production: allorigins wraps response in JSON with 'contents' field
      const data = await response.json();
      return data.contents || '';
    } else {
      // Production: corsproxy.io returns raw HTML
      return await response.text();
    }
  } catch (error) {
    // Try fallback proxy if available (production only)
    const nextProxyIndex = proxyIndex + 1;
    if (!IS_DEV && nextProxyIndex < CORS_PROXIES.length) {
      // Update active proxy for future requests
      activeProxyIndex = nextProxyIndex;
      return fetchCalData(endpoint, nextProxyIndex);
    }

    // Log errors only in development
    if (IS_DEV) {
      console.warn('CAL fetch error:', error.message);
    }
    return null;
  }
};

// PRO SCHOLAR V6.2: Cache for CAL lookups with unified telemetry
const calCache = createManagedCache('api', { ttl: 24 * 60 * 60 * 1000, maxSize: 1000 });

// =============================================================================
// TRANSLITERATION MAPPING
// CAL uses a specific ASCII transliteration scheme
// =============================================================================

const HEBREW_TO_CAL = {
  'א': ')', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'w', 'ז': 'z', 'ח': 'x', 'ט': 'T', 'י': 'y',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '(', 'פ': 'p',
  'ף': 'p', 'צ': 'c', 'ץ': 'c', 'ק': 'q', 'ר': 'r',
  'ש': '$', 'שׂ': 's', 'שׁ': '$', 'ת': 't',
};

const CAL_TO_HEBREW = Object.fromEntries(
  Object.entries(HEBREW_TO_CAL).map(([k, v]) => [v, k])
);

// Part of speech codes
const POS_CODES = ['V', 'N', 'Av', 'A', 'P', 'Pr', 'C', 'Pn', ''];

// =============================================================================
// MORPHOLOGICAL ANALYSIS
// Aramaic prefix/suffix patterns for intelligent root extraction
// NOTE: These constants use object structure {pattern, meaning, strip} specific
// to this service's needs. For simple string arrays, see morphology.js exports.
// =============================================================================

const ARAMAIC_PREFIXES = [
  // Compound prefixes (longer first for correct matching)
  { pattern: 'דקא', meaning: 'that [is]', strip: true },
  { pattern: 'וד', meaning: 'and that', strip: true },
  { pattern: 'דב', meaning: 'that in', strip: true },
  { pattern: 'דל', meaning: 'that to', strip: true },
  { pattern: 'דמ', meaning: 'that from', strip: true },
  { pattern: 'קא', meaning: '[present tense]', strip: true },
  // Simple prefixes
  { pattern: 'ד', meaning: 'that/of', strip: true },
  { pattern: 'ו', meaning: 'and', strip: true },
  { pattern: 'ב', meaning: 'in', strip: true },
  { pattern: 'ל', meaning: 'to/for', strip: true },
  { pattern: 'מ', meaning: 'from', strip: true },
  { pattern: 'כ', meaning: 'like', strip: true },
  { pattern: 'ש', meaning: 'that', strip: true },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// cleanWord imported from ../utils/hebrewUtils as cleanHebrewWord

/**
 * Convert Hebrew/Aramaic word to CAL transliteration
 */
export const hebrewToCalTransliteration = (hebrewWord) => {
  const cleaned = cleanHebrewWord(hebrewWord);
  return [...cleaned].map(char => HEBREW_TO_CAL[char] || char).join('');
};

/**
 * Convert CAL transliteration back to Hebrew
 */
export const calToHebrewTransliteration = (calForm) => {
  return [...calForm].map(char => CAL_TO_HEBREW[char] || char).join('');
};

/**
 * Strip Aramaic prefix from word
 * Returns { root, prefix, prefixMeaning }
 */
const stripPrefix = (word) => {
  const cleaned = cleanHebrewWord(word);

  for (const { pattern, meaning, strip } of ARAMAIC_PREFIXES) {
    if (strip && cleaned.startsWith(pattern) && cleaned.length > pattern.length + 1) {
      return {
        root: cleaned.slice(pattern.length),
        prefix: pattern,
        prefixMeaning: meaning,
        hasPrefix: true,
      };
    }
  }

  return { root: cleaned, prefix: null, prefixMeaning: null, hasPrefix: false };
};

/**
 * Generate word variants for lookup
 * Tries different morphological forms
 */
const generateVariants = (word) => {
  const cleaned = cleanHebrewWord(word);
  const variants = [cleaned];

  // Strip prefix
  const { root, hasPrefix } = stripPrefix(cleaned);
  if (hasPrefix && root.length >= 2) {
    variants.push(root);
  }

  // Remove emphatic ending (final א)
  if (cleaned.endsWith('א') && cleaned.length > 2) {
    variants.push(cleaned.slice(0, -1));
  }

  // Remove feminine emphatic ending (final תא)
  if (cleaned.endsWith('תא') && cleaned.length > 3) {
    variants.push(cleaned.slice(0, -2));
  }

  // Remove plural endings
  if (cleaned.endsWith('ין') && cleaned.length > 3) {
    variants.push(cleaned.slice(0, -2));
    variants.push(cleaned.slice(0, -2) + 'א'); // Add emphatic
  }

  if (cleaned.endsWith('יא') && cleaned.length > 3) {
    variants.push(cleaned.slice(0, -2));
  }

  // Combine: prefix stripped + no emphatic
  if (hasPrefix && root.endsWith('א') && root.length > 2) {
    variants.push(root.slice(0, -1));
  }

  return [...new Set(variants)]; // Remove duplicates
};

// =============================================================================
// CAL API FUNCTIONS
// =============================================================================

/**
 * Browse CAL lemmas by first consonants
 */
export const browseCalLemmas = async (prefix) => {
  const cacheKey = `cal_browse_${prefix}`;
  const cached = calCache.get(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchCalData(`/browseSKEYheaders.php?first3=${encodeURIComponent(prefix)}`);

    if (!html) return [];

    const lemmas = parseCalBrowseResults(html);

    if (lemmas.length > 0) {
      calCache.set(cacheKey, lemmas);
    }
    return lemmas;
  } catch (error) {
    console.warn('CAL browse error:', error.message);
    return [];
  }
};

/**
 * Parse CAL browse results HTML to extract lemmas and meanings
 */
const parseCalBrowseResults = (html) => {
  const lemmas = [];

  // Multiple extraction patterns for different CAL page formats
  const patterns = [
    // Pattern 1: Links with meanings after dash
    /<a[^>]*href="oneentry\.php\?lemma=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>\s*[-—–]\s*([^<;]+)/gi,
    // Pattern 2: Bold lemmas with meanings
    /<b>([^<]+)<\/b>\s*[-—–]\s*([^<;,]+)/gi,
    // Pattern 3: Table cells with lemma and meaning
    /<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    const tempHtml = html; // Reset for each pattern
    pattern.lastIndex = 0;

    while ((match = pattern.exec(tempHtml)) !== null) {
      const lemma = (match[2] || match[1]).trim().replace(/[\s,;]+$/, '');
      const meaning = (match[3] || match[2]).trim().replace(/[\s,;]+$/, '');

      if (lemma && meaning && lemma.length >= 2 && meaning.length >= 2) {
        if (!lemmas.find(l => l.lemma === lemma)) {
          lemmas.push({
            lemma,
            meaning: cleanMeaning(meaning),
            calForm: match[1] || hebrewToCalTransliteration(lemma),
          });
        }
      }
    }

    if (lemmas.length > 0) break;
  }

  return lemmas;
};

/**
 * Get full CAL entry for a specific lemma
 */
export const getCalEntry = async (lemma, pos = '') => {
  const cacheKey = `cal_entry_${lemma}_${pos}`;
  const cached = calCache.get(cacheKey);
  if (cached) return cached;

  try {
    const lemmaParam = pos ? `${lemma}+${pos}` : lemma;
    const html = await fetchCalData(`/oneentry.php?lemma=${encodeURIComponent(lemmaParam)}&cits=all`);

    if (!html) return null;

    // Check for bad lemma request
    if (html.includes('BAD LEMMA REQUEST') || html.includes('No results')) {
      return null;
    }

    const entry = parseCalEntry(html, lemma);

    if (entry && entry.definitions.length > 0) {
      calCache.set(cacheKey, entry);
    }

    return entry;
  } catch (error) {
    console.warn('CAL entry error:', error.message);
    return null;
  }
};

/**
 * Parse CAL entry HTML to extract dictionary data
 * Uses multiple patterns to handle different CAL page formats
 */
const parseCalEntry = (html, originalLemma) => {
  const entry = {
    lemma: originalLemma,
    source: 'CAL',
    sourceFull: 'Comprehensive Aramaic Lexicon (Hebrew Union College)',
    sourceUrl: `https://cal.huc.edu/oneentry.php?lemma=${encodeURIComponent(originalLemma)}`,
    definitions: [],
    dialects: [],
    partOfSpeech: null,
    headword: null,
  };

  // Extract headword (vocalized form)
  const headwordPatterns = [
    /<span[^>]*class="[^"]*head[^"]*"[^>]*>([^<]+)/i,
    /<h[1-3][^>]*>([^<]+)</i,
    /<b>([^<]+)<\/b>\s*\(/i,
  ];

  for (const pattern of headwordPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      entry.headword = match[1].trim();
      break;
    }
  }

  // Extract part of speech
  const posMatch = html.match(/\b(n\.m\.|n\.f\.|n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|ptcl\.)/i);
  if (posMatch) {
    entry.partOfSpeech = posMatch[1];
  }

  // Extract meanings - multiple patterns for robustness
  const meaningPatterns = [
    // Pattern 1: Quoted definitions
    /"([^"]{3,100})"/g,
    // Pattern 2: After part of speech
    /(?:n\.m?\.|n\.f\.|v\.|adj\.|adv\.)[^"]*"([^"]+)"/gi,
    // Pattern 3: Numbered senses
    /(\d+)\.\s*([^<\d"]{5,80})/g,
    // Pattern 4: After meaning label
    /meaning[:\s]+([^<,;]{3,60})/gi,
    // Pattern 5: After dash in definition
    /—\s*([^<;]{3,60})/g,
  ];

  const seenMeanings = new Set();

  for (const pattern of meaningPatterns) {
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(html)) !== null) {
      const raw = match[2] || match[1];
      const meaning = cleanMeaning(raw);

      if (meaning && meaning.length >= 3 && meaning.length <= 100 && !seenMeanings.has(meaning.toLowerCase())) {
        seenMeanings.add(meaning.toLowerCase());
        entry.definitions.push({
          sense: entry.definitions.length + 1,
          meaning,
        });
      }
    }

    // Stop if we have enough definitions
    if (entry.definitions.length >= 3) break;
  }

  // Extract dialect information
  const dialectMap = {
    'JBA': 'Jewish Babylonian Aramaic',
    'JPA': 'Jewish Palestinian Aramaic',
    'Syr': 'Syriac',
    'BibAram': 'Biblical Aramaic',
    'Targ': 'Targumic',
    'Sam': 'Samaritan',
    'Man': 'Mandaic',
    'CPA': 'Christian Palestinian',
  };

  for (const [code, name] of Object.entries(dialectMap)) {
    if (html.includes(code)) {
      entry.dialects.push({ code, name });
    }
  }

  return entry.definitions.length > 0 ? entry : null;
};

/**
 * Clean meaning text - remove HTML, references, normalize whitespace
 */
const cleanMeaning = (text) => {
  if (!text) return '';

  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\([^)]{0,30}\)/g, '') // Remove short parentheticals
    .replace(/\[[^\]]*\]/g, '') // Remove bracketed references
    .replace(/v\.\s*[\u0590-\u05FF\w]+/gi, '') // Remove "v. word" references
    .replace(/cf\.\s*[\u0590-\u05FF\w]+/gi, '') // Remove "cf. word" references
    .replace(/esp\./gi, 'especially')
    .replace(/\s+/g, ' ')
    .replace(/^[,;.\s]+/, '') // Remove leading punctuation
    .replace(/[,;.\s]+$/, '') // Remove trailing punctuation
    .trim();
};

// =============================================================================
// HIGH-LEVEL LOOKUP FUNCTIONS
// =============================================================================

/**
 * Look up an Aramaic word in CAL
 * Tries multiple forms and part-of-speech combinations
 */
export const lookupAramaicWord = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Generate word variants (original, without prefix, without emphatic, etc.)
  const variants = generateVariants(cleaned);
  const { prefix, prefixMeaning } = stripPrefix(cleaned);

  // Try each variant with each POS
  for (const variant of variants) {
    const calForm = hebrewToCalTransliteration(variant);

    for (const pos of POS_CODES) {
      const entry = await getCalEntry(calForm, pos);

      if (entry && entry.definitions.length > 0) {
        return {
          ...entry,
          originalWord: word,
          searchedVariant: variant,
          calTransliteration: calForm,
          prefix: prefix !== variant ? prefix : null,
          prefixMeaning: prefix !== variant ? prefixMeaning : null,
        };
      }
    }
  }

  // Last resort: browse by first 3 letters and find best match
  const calPrefix = hebrewToCalTransliteration(cleaned.slice(0, 3));
  const browseResults = await browseCalLemmas(calPrefix);

  if (browseResults.length > 0) {
    // Find best match
    const targetCal = hebrewToCalTransliteration(cleaned);
    const bestMatch = browseResults.find(r =>
      r.calForm === targetCal ||
      r.lemma === cleaned ||
      targetCal.startsWith(r.calForm)
    );

    if (bestMatch) {
      return {
        lemma: bestMatch.lemma,
        source: 'CAL',
        sourceFull: 'Comprehensive Aramaic Lexicon',
        definitions: [{ sense: 1, meaning: bestMatch.meaning }],
        originalWord: word,
        calTransliteration: bestMatch.calForm,
        fromBrowse: true,
      };
    }
  }

  return null;
};

/**
 * Search CAL for words matching a prefix
 */
export const searchCalByPrefix = async (prefix) => {
  const cleaned = cleanHebrewWord(prefix);
  if (!cleaned || cleaned.length < 2) return [];

  const calPrefix = hebrewToCalTransliteration(cleaned);
  return browseCalLemmas(calPrefix);
};

/**
 * Translate Aramaic text - word by word lookup
 */
export const translateAramaicText = async (text) => {
  if (!text) return [];

  const words = text.split(/\s+/).filter(w => cleanHebrewWord(w).length >= 2);
  const results = [];

  for (const word of words) {
    const entry = await lookupAramaicWord(word);
    const { prefix, prefixMeaning } = stripPrefix(word);

    results.push({
      word,
      cleaned: cleanHebrewWord(word),
      translation: entry?.definitions?.[0]?.meaning || null,
      prefix: entry?.prefix || prefix,
      prefixMeaning: entry?.prefixMeaning || prefixMeaning,
      entry,
      found: !!entry,
    });
  }

  return results;
};

/**
 * Quick prefix analysis - identify grammatical prefixes without API call
 */
export const analyzePrefix = (word) => {
  return stripPrefix(word);
};

/**
 * Alias for backward compatibility
 */
export const quickLookup = (word) => {
  // Now always returns null - use API lookup instead
  // Only analyze prefix for immediate feedback
  const { prefix, prefixMeaning } = stripPrefix(word);
  if (prefix) {
    return {
      prefix,
      prefixMeaning,
      meaning: null, // Meaning comes from API
      requiresApiLookup: true,
    };
  }
  return null;
};

/**
 * Look up with API - primary lookup function
 */
export const lookupWithFallback = async (word) => {
  return lookupAramaicWord(word);
};

/**
 * Get statistics about cache
 */
export const getCacheStats = () => {
  return {
    size: calCache.size?.() || 0,
    maxSize: 1000,
  };
};

/**
 * Clear the cache
 */
export const clearCache = () => {
  calCache.clear?.();
};

/**
 * Test CAL connectivity - useful for diagnostics
 * Tests both the CORS proxy (production) and direct access (development)
 * @returns {Promise<object>} Connection test results
 */
export const testConnection = async () => {
  const startTime = Date.now();
  const testWord = 'אמר'; // Common Aramaic word: "to say"
  const proxy = getCurrentProxy();

  try {
    // Test with a known word
    const result = await lookupAramaicWord(testWord);
    const latency = Date.now() - startTime;

    return {
      success: !!result,
      latency,
      mode: IS_DEV ? 'development (local proxy)' : `production (${proxy.name})`,
      proxy: IS_DEV ? null : proxy.name,
      testWord,
      foundDefinition: result?.definitions?.[0]?.meaning || null,
      source: result?.source || null,
      cacheStats: getCacheStats()
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - startTime,
      mode: IS_DEV ? 'development (local proxy)' : `production (${proxy.name})`,
      proxy: IS_DEV ? null : proxy.name,
      error: error.message,
      testWord
    };
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

const calDictionaryService = {
  // Transliteration
  hebrewToCalTransliteration,
  calToHebrewTransliteration,

  // CAL API
  browseCalLemmas,
  getCalEntry,

  // High-level lookups
  lookupAramaicWord,
  searchCalByPrefix,
  translateAramaicText,

  // Morphological analysis
  analyzePrefix,

  // Compatibility aliases
  quickLookup,
  lookupWithFallback,

  // Cache management
  getCacheStats,
  clearCache,

  // Diagnostics
  testConnection,

  // Constants
  POS_CODES,
  ARAMAIC_PREFIXES,
};

export default calDictionaryService;
