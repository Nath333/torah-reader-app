// =============================================================================
// ENGLISH → FRENCH TRANSLATION SERVICE
// Professional Torah/Talmud study app - API-only translations
// Features: Multi-provider fallback, rate limiting, caching, source attribution
// NO HARDCODED DICTIONARY - All translations from online sources
// =============================================================================

import { createCache } from '../utils/cache';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  CACHE_TTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
  CACHE_SIZE: 5000,
  MIN_REQUEST_INTERVAL: 300,  // Fast lookups
  RATE_LIMIT_COOLDOWN: 30000, // 30s cooldown after errors
  MAX_FAILURES: 5,
  API_TIMEOUT: 8000,
  PERSIST_KEY: 'torah_fr_cache_v5',
  MAX_TEXT_LENGTH: 500
};

// Translation cache with persistence
const translationCache = createCache({ ttl: CONFIG.CACHE_TTL, maxSize: CONFIG.CACHE_SIZE });

// Per-API state
const apiState = {
  mymemory: { lastRequest: 0, rateLimitedUntil: 0, failures: 0 },
  libretranslate: { lastRequest: 0, rateLimitedUntil: 0, failures: 0 },
  lingva: { lastRequest: 0, rateLimitedUntil: 0, failures: 0 }
};

// Statistics
const stats = {
  cacheHits: 0,
  apiCalls: 0,
  apiSuccesses: 0,
  apiFailures: 0
};

// =============================================================================
// PERSISTENCE
// =============================================================================

const loadPersistedCache = () => {
  try {
    const stored = localStorage.getItem(CONFIG.PERSIST_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      let loaded = 0;
      Object.entries(data).forEach(([key, entry]) => {
        if (entry && entry.translation) {
          translationCache.set(key, entry);
          loaded++;
        }
      });
      if (loaded > 0) {
        console.info(`[FrenchService] Loaded ${loaded} cached translations`);
      }
    }
  } catch (e) {
    // Ignore
  }
};

const persistCache = () => {
  try {
    const entries = {};
    let count = 0;
    translationCache.forEach?.((value, key) => {
      if (value && value.translation) {
        entries[key] = value;
        count++;
      }
    });
    if (count > 0) {
      localStorage.setItem(CONFIG.PERSIST_KEY, JSON.stringify(entries));
    }
  } catch (e) {
    // Ignore
  }
};

if (typeof window !== 'undefined') {
  loadPersistedCache();
  setInterval(persistCache, 120000);
  window.addEventListener('beforeunload', persistCache);
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const shouldSkipApi = (apiName) => {
  const state = apiState[apiName];
  if (!state) return true;

  const now = Date.now();
  if (now < state.rateLimitedUntil) return true;
  if (state.failures >= CONFIG.MAX_FAILURES) {
    if (now - state.lastRequest > CONFIG.RATE_LIMIT_COOLDOWN) {
      state.failures = 0;
    } else {
      return true;
    }
  }
  return false;
};

const waitForRateLimit = async (apiName) => {
  const state = apiState[apiName];
  const now = Date.now();
  const timeSince = now - state.lastRequest;
  if (timeSince < CONFIG.MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, CONFIG.MIN_REQUEST_INTERVAL - timeSince));
  }
};

// =============================================================================
// POST-PROCESSING - Fix Jewish terms that APIs may mistranslate
// =============================================================================

/**
 * Fix common Jewish/Hebrew terms that translation APIs often mistranslate
 * Ensures proper French transliteration for religious terms
 * @param {string} text - Translated French text
 * @returns {string} - Corrected text
 */
const fixJewishTerms = (text) => {
  if (!text) return text;
  return text
    // Shabbat terms - "samedi" (Saturday) should stay as Chabbat in religious context
    .replace(/\bsamedi\b/gi, 'Chabbat')
    .replace(/\bsabbat\b/gi, 'Chabbat')
    .replace(/\bshabbat\b/gi, 'Chabbat')
    // Mishna/Talmud - proper French transliteration
    .replace(/\bmishn?a\b/gi, 'Michna')
    .replace(/\bguemara\b/gi, 'Guemara')
    .replace(/\bgemara\b/gi, 'Guemara')
    // Titles - keep Hebrew titles
    .replace(/\brabbi\b/gi, 'Rabbi')
    .replace(/\brav\b/gi, 'Rav')
    // Legal terms - proper transliteration
    .replace(/\bhalakha\b/gi, 'Halakha')
    .replace(/\bhalacha\b/gi, 'Halakha')
    .replace(/\bmitzvah?\b/gi, 'Mitsva')
    .replace(/\bmitzv[ao]t\b/gi, 'Mitsvot')
    // Sacred texts - keep original names
    .replace(/\btorah\b/gi, 'Torah')
    .replace(/\btalmud\b/gi, 'Talmud')
    .replace(/\btanakh?\b/gi, 'Tanakh')
    // Common terms
    .replace(/\bkosher\b/gi, 'Casher')
    .replace(/\bkasher\b/gi, 'Casher')
    .replace(/\bsyna?gogue\b/gi, 'Synagogue')
    .replace(/\bpessa[hc]h?\b/gi, 'Pessah')
    .replace(/\bsoukkot\b/gi, 'Souccot')
    .replace(/\bsukkot\b/gi, 'Souccot')
    .replace(/\brosh hashanah?\b/gi, 'Roch Hachana')
    .replace(/\byom kippur\b/gi, 'Yom Kippour');
};

// =============================================================================
// TRANSLATION PROVIDERS - All translations from online APIs
// =============================================================================

/**
 * MyMemory Translation API
 * Free tier: 1000 words/day without key
 * Quality: Good for common phrases
 */
const translateWithMyMemory = async (text) => {
  if (shouldSkipApi('mymemory')) return null;
  await waitForRateLimit('mymemory');
  apiState.mymemory.lastRequest = Date.now();

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
    });

    if (response.status === 429) {
      apiState.mymemory.rateLimitedUntil = Date.now() + CONFIG.RATE_LIMIT_COOLDOWN;
      apiState.mymemory.failures++;
      return null;
    }

    if (!response.ok) {
      apiState.mymemory.failures++;
      return null;
    }

    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translation = data.responseData.translatedText.replace(/\s+/g, ' ').trim();
      const match = data.responseData.match || 0;

      // Validate translation
      if (translation && translation.length >= 1 && translation.length <= text.length * 5) {
        apiState.mymemory.failures = 0;
        const fixed = fixJewishTerms(translation.charAt(0).toUpperCase() + translation.slice(1));
        return {
          translation: fixed,
          source: 'MyMemory',
          confidence: match,
          accuracy: match >= 0.9 ? 'high' : match >= 0.7 ? 'medium' : 'auto'
        };
      }
    }
  } catch (error) {
    apiState.mymemory.failures++;
  }
  return null;
};

/**
 * LibreTranslate API
 * Open source, multiple public instances
 * Quality: Good general translation
 */
const translateWithLibreTranslate = async (text) => {
  if (shouldSkipApi('libretranslate')) return null;
  await waitForRateLimit('libretranslate');
  apiState.libretranslate.lastRequest = Date.now();

  const instances = [
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate',
    'https://translate.terraprint.co/translate'
  ];

  for (const baseUrl of instances) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: 'fr', format: 'text' }),
        signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
      });

      if (response.status === 429) continue;

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          apiState.libretranslate.failures = 0;
          const translation = data.translatedText.replace(/\s+/g, ' ').trim();
          const fixed = fixJewishTerms(translation.charAt(0).toUpperCase() + translation.slice(1));
          return {
            translation: fixed,
            source: 'LibreTranslate',
            confidence: 0.85,
            accuracy: 'auto'
          };
        }
      }
    } catch (error) {
      // Try next instance
    }
  }

  apiState.libretranslate.failures++;
  return null;
};

/**
 * Lingva Translate API
 * Open source Google Translate frontend
 * Quality: High (Google backend)
 */
const translateWithLingva = async (text) => {
  if (shouldSkipApi('lingva')) return null;
  await waitForRateLimit('lingva');
  apiState.lingva.lastRequest = Date.now();

  const instances = [
    'https://lingva.ml/api/v1',
    'https://translate.plausibility.cloud/api/v1',
    'https://lingva.pussthecat.org/api/v1'
  ];

  for (const baseUrl of instances) {
    try {
      const url = `${baseUrl}/en/fr/${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translation) {
          apiState.lingva.failures = 0;
          const translation = data.translation.replace(/\s+/g, ' ').trim();
          const fixed = fixJewishTerms(translation.charAt(0).toUpperCase() + translation.slice(1));
          return {
            translation: fixed,
            source: 'Lingva (Google)',
            confidence: 0.9,
            accuracy: 'high'
          };
        }
      }
    } catch (error) {
      // Try next instance
    }
  }

  apiState.lingva.failures++;
  return null;
};

// =============================================================================
// MAIN TRANSLATION FUNCTION
// =============================================================================

/**
 * Translate English to French using multiple online APIs
 * Tries providers in order until successful
 * @param {string} text - English text
 * @returns {Promise<string|null>} - French translation
 */
export const translateEnglishToFrench = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const trimmedText = text.trim();

  // Handle long text
  if (trimmedText.length > CONFIG.MAX_TEXT_LENGTH) {
    const shortText = trimmedText.split(/[,;.]/)[0].trim();
    if (shortText.length > 200) return null;
    return translateEnglishToFrench(shortText);
  }

  const cacheKey = trimmedText.toLowerCase();

  // Check cache (from previous API calls)
  const cached = translationCache.get(cacheKey);
  if (cached?.translation) {
    stats.cacheHits++;
    return cached.translation;
  }

  stats.apiCalls++;

  // Try APIs in order (Lingva first for quality, then fallbacks)
  let result = null;

  result = await translateWithLingva(trimmedText);
  if (!result) result = await translateWithMyMemory(trimmedText);
  if (!result) result = await translateWithLibreTranslate(trimmedText);

  if (result?.translation) {
    stats.apiSuccesses++;
    translationCache.set(cacheKey, result);
    return result.translation;
  }

  stats.apiFailures++;
  return null;
};

/**
 * Quick translate - cache only (synchronous)
 */
export const quickTranslate = (text) => {
  if (!text) return null;
  const cached = translationCache.get(text.toLowerCase().trim());
  if (cached?.translation) {
    stats.cacheHits++;
    return cached.translation;
  }
  return null;
};

// =============================================================================
// BOLD PRESERVATION FOR TRANSLATIONS
// =============================================================================

// Markers used to preserve bold through translation
const BOLD_START = '【B】';
const BOLD_END = '【/B】';

/**
 * Convert HTML bold tags to markers before translation
 * @param {string} html - HTML with <b>/<strong> tags
 * @returns {string} - Text with markers
 */
const htmlBoldToMarkers = (html) => {
  if (!html || typeof html !== 'string') return html;
  return html
    .replace(/<big[^>]*>/gi, '')
    .replace(/<\/big>/gi, '')
    .replace(/<(b|strong)[^>]*>/gi, BOLD_START)
    .replace(/<\/(b|strong)>/gi, BOLD_END)
    .replace(/<[^>]+>/g, ''); // Remove other HTML tags
};

/**
 * Convert markers back to HTML bold tags after translation
 * Handles all bracket variants: 【B】 [B] 【B] [B】
 * @param {string} text - Text with markers
 * @returns {string} - HTML with <strong> tags
 */
const markersToHtmlBold = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    // Comprehensive pattern: any combination of fullwidth/regular brackets
    .replace(/[【[]B[】\]]/gi, '<strong>')
    .replace(/[【[]\/B[】\]]/gi, '</strong>');
};

/**
 * Check if text has bold markers (any bracket variant)
 */
const hasBoldMarkers = (text) => {
  if (!text) return false;
  return text.includes(BOLD_START) || /\[B\]/i.test(text) || /【B/.test(text);
};

/**
 * Translate with full source metadata
 * @returns {Promise<Object>} - { translation, source, original, accuracy, method }
 */
export const translateWithSource = async (text) => {
  const baseResult = {
    translation: null,
    source: 'none',
    original: text,
    accuracy: 'none',
    method: 'EN → FR'
  };

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return baseResult;
  }

  const trimmedText = text.trim();
  const cacheKey = trimmedText.toLowerCase();

  // Check cache
  const cached = translationCache.get(cacheKey);
  if (cached?.translation) {
    stats.cacheHits++;
    return {
      translation: cached.translation,
      source: `${cached.source} (cached)`,
      original: trimmedText,
      accuracy: cached.accuracy || 'high',
      method: 'EN → FR'
    };
  }

  stats.apiCalls++;

  // Try APIs
  let result = null;
  result = await translateWithLingva(trimmedText);
  if (!result) result = await translateWithMyMemory(trimmedText);
  if (!result) result = await translateWithLibreTranslate(trimmedText);

  if (result?.translation) {
    stats.apiSuccesses++;
    translationCache.set(cacheKey, result);
    return {
      translation: result.translation,
      source: result.source,
      original: trimmedText,
      accuracy: result.accuracy || 'auto',
      method: 'EN → FR'
    };
  }

  stats.apiFailures++;
  return { ...baseResult, original: trimmedText };
};

/**
 * Translate HTML with bold preservation
 * Converts <b>/<strong> to markers, translates, then converts back
 * @param {string} html - HTML text with bold tags
 * @returns {Promise<Object>} - { translation, rawHtml, source, accuracy, method }
 */
export const translateWithBoldPreservation = async (html) => {
  if (!html || typeof html !== 'string') {
    return { translation: '', rawHtml: '', source: 'none', accuracy: 'none', method: 'EN → FR' };
  }

  // Convert HTML bold to markers
  const textWithMarkers = htmlBoldToMarkers(html);

  // Translate with markers
  const result = await translateWithSource(textWithMarkers);

  if (result.translation) {
    // Convert markers back to HTML
    const rawHtml = markersToHtmlBold(result.translation);
    // Also provide plain text version
    const plainText = result.translation
      .replace(/【B】/g, '')
      .replace(/【\/B】/g, '');

    return {
      translation: plainText,
      rawHtml: hasBoldMarkers(result.translation) ? rawHtml : result.translation,
      source: result.source,
      accuracy: result.accuracy,
      method: result.method
    };
  }

  return {
    translation: result.translation || '',
    rawHtml: '',
    source: result.source,
    accuracy: result.accuracy,
    method: result.method
  };
};

/**
 * Batch translate with source info
 */
export const batchTranslateToFrench = async (texts) => {
  const results = new Map();
  const unique = [...new Set(texts.filter(t => t?.trim()))];

  for (const text of unique) {
    const result = await translateWithSource(text);
    results.set(text, result.translation || text);
    await new Promise(r => setTimeout(r, CONFIG.MIN_REQUEST_INTERVAL));
  }

  return results;
};

/**
 * Clear all caches
 */
export const clearCache = () => {
  translationCache.clear();
  try {
    localStorage.removeItem(CONFIG.PERSIST_KEY);
  } catch (e) {
    // Ignore
  }
};

/**
 * Save cache manually
 */
export const saveCache = () => {
  persistCache();
};

/**
 * Get API status
 */
export const getApiStatus = () => ({
  mymemory: { ...apiState.mymemory, isAvailable: !shouldSkipApi('mymemory') },
  libretranslate: { ...apiState.libretranslate, isAvailable: !shouldSkipApi('libretranslate') },
  lingva: { ...apiState.lingva, isAvailable: !shouldSkipApi('lingva') }
});

/**
 * Get statistics
 */
export const getStats = () => ({
  ...stats,
  cacheEfficiency: stats.cacheHits > 0
    ? ((stats.cacheHits / (stats.cacheHits + stats.apiCalls)) * 100).toFixed(1) + '%'
    : '0%'
});

/**
 * Reset API state
 */
export const resetApiState = () => {
  Object.keys(apiState).forEach(key => {
    apiState[key] = { lastRequest: 0, rateLimitedUntil: 0, failures: 0 };
  });
};

// Backward compatibility
export const getRateLimitStatus = getApiStatus;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const englishToFrenchService = {
  translateEnglishToFrench,
  translateWithSource,
  translateWithBoldPreservation,
  batchTranslateToFrench,
  quickTranslate,
  clearCache,
  saveCache,
  getApiStatus,
  getStats,
  resetApiState,
  getRateLimitStatus
};

export default englishToFrenchService;
