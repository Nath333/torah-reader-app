// =============================================================================
// Fetchers en ligne du lexique savant — Sefaria, Bolls.life, STEP Bible, CAL
// (extrait de scholarlyLexiconService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { fetchWithFallback } from '../../../utils/http';
import { createLogger, IS_DEV } from '../../../utils/debug';
import { getSefariaBase } from '../../sefariaBase';
import { cleanWord, extractRoot } from './rootUtils';
import { cleanDefinitionText } from './textCleaning';

const log = createLogger('ScholarlyLexicon');

// Base Sefaria unique (dev : proxy Vite ; prod : limud-proxy si configuré)
export const SEFARIA_BASE = getSefariaBase();

// CAL (Comprehensive Aramaic Lexicon) configuration
// Development: local proxy | Production: CORS proxy via allorigins.win
const CAL_DIRECT_URL = 'https://cal.huc.edu';
const CAL_CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * Build CAL URL with CORS proxy support for production
 */
export const buildCALUrl = (endpoint) => {
  if (IS_DEV) {
    return `/cal-api${endpoint}`;
  }
  return `${CAL_CORS_PROXY}${encodeURIComponent(`${CAL_DIRECT_URL}${endpoint}`)}`;
};

// =============================================================================
// SEFARIA API INTEGRATION
// =============================================================================

/**
 * Fetch comprehensive lexicon data from Sefaria
 */
export const fetchSefariaLexicon = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    return await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}`,
      { timeout: 8000 }
    );
  } catch {
    return null;
  }
};

/**
 * Fetch word lookup from Sefaria's alternative API endpoint
 * Tries multiple endpoints for better coverage
 */
export const fetchSefariaWordAlternative = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Try the lexicon lookup API (suppress 404s - expected for most words)
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/lexicon/${encodeURIComponent(cleaned)}`,
      { timeout: 6000 }
    );
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
      return Array.isArray(data) ? data : [data];
    }
  } catch {
    // Silent fallback - 404/503/timeout are expected
  }

  // Try Steinsaltz dictionary specifically for Aramaic
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Steinsaltz`,
      { timeout: 6000 }
    );
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Silent fallback
  }

  return null;
};

/**
 * Fetch from Bolls.life Bible Dictionary API (BDB/Thayer's)
 * Additional online source for Hebrew-English translations
 * API: https://bolls.life/dictionary-definition/BDBT/{word}/
 * Note: Uses CORS proxy fallback since bolls.life doesn't support CORS
 */
export const fetchBollsLifeDefinition = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // Use fetchWithFallback which has built-in CORS proxy support
    const data = await fetchWithFallback(
      `https://bolls.life/dictionary-definition/BDBT/${encodeURIComponent(cleaned)}/`,
      { timeout: 8000 }
    );

    // Bolls.life returns dictionary entries
    if (data && (data.definition || data.meaning || data.definitions)) {
      return {
        source: 'Bolls.life',
        fullName: 'Bolls.life BDB Dictionary',
        definition: cleanDefinitionText(data.definition || data.meaning || ''),
        definitions: Array.isArray(data.definitions)
          ? data.definitions.map(d => cleanDefinitionText(d)).filter(Boolean)
          : [],
        strongNumber: data.strong_number || data.strongNumber || null,
        partOfSpeech: data.pos || data.part_of_speech || null
      };
    }

    return null;
  } catch (error) {
    // Silent fallback - Bolls.life may not have all words or CORS proxy may fail
    return null;
  }
};

/**
 * Fetch from STEP Bible Lexicon API
 * Scripture Tools for Every Person - provides Strong's definitions
 * API: https://stepbibleguide.blogspot.com/p/api.html
 */
export const fetchStepBibleDefinition = async (strongNumber) => {
  if (!strongNumber) return null;

  // Normalize Strong's number (H1234 format)
  const normalized = strongNumber.toString().toUpperCase().replace(/^H?/, 'H');

  try {
    const response = await fetch(
      `https://www.stepbible.org/rest/module/getAllStrongs/hebrewStrong_vocabulary/${normalized}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      const entry = data[0];
      return {
        source: 'STEP Bible',
        fullName: 'Scripture Tools for Every Person',
        definition: cleanDefinitionText(entry.gloss || entry.stepGloss || ''),
        strongNumber: entry.strongNumber || normalized,
        transliteration: entry.stepTransliteration || entry.transliteration || null
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Fetch CAL data with CORS proxy handling for production
 * @param {string} endpoint - CAL API endpoint
 * @returns {Promise<string|null>} HTML response or null
 */
export const fetchCALData = async (endpoint) => {
  const url = buildCALUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': IS_DEV ? 'text/html' : 'application/json'
      },
      signal: AbortSignal.timeout(IS_DEV ? 10000 : 15000)
    });

    if (!response.ok) return null;

    if (IS_DEV) {
      // Development: direct HTML response
      return await response.text();
    } else {
      // Production: CORS proxy wraps response in JSON with 'contents' field
      const data = await response.json();
      return data.contents || '';
    }
  } catch (error) {
    if (IS_DEV) {
      log.warn('CAL fetch error:', error.message);
    }
    return null;
  }
};

/**
 * Fetch from CAL (Comprehensive Aramaic Lexicon)
 * Premier academic Aramaic dictionary - covers Targum, Talmud, all Aramaic dialects
 * Works in both development (local proxy) and production (CORS proxy)
 * @param {string} word - Aramaic word to look up
 * @returns {Promise<object|null>} CAL definition data
 */
export const fetchCALDefinition = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // CAL uses URL-encoded Hebrew/Aramaic text directly in the query
    const endpoint = `/oneentry.php?lemma=${encodeURIComponent(cleaned)}&cession=S1`;
    const response = await fetchCALData(endpoint);

    // CAL returns HTML - extract definition data
    if (response && typeof response === 'string') {
      const result = parseCALResponse(response, cleaned);
      if (result) {
        return result;
      }
    }

    // Try alternative search with root form
    const root = extractRoot(cleaned);
    if (root && root !== cleaned) {
      const rootEndpoint = `/oneentry.php?lemma=${encodeURIComponent(root)}&cession=S1`;
      const rootResponse = await fetchCALData(rootEndpoint);

      if (rootResponse && typeof rootResponse === 'string') {
        return parseCALResponse(rootResponse, root);
      }
    }

    return null;
  } catch (error) {
    // Silent fail - CAL may not be accessible or word not found
    return null;
  }
};

/**
 * Parse CAL HTML response to extract definition data
 * CAL returns HTML with structured dictionary entries
 */
const parseCALResponse = (html, word) => {
  if (!html || typeof html !== 'string') return null;

  try {
    // Check for error responses from CAL
    if (html.includes('BAD LEMMA') ||
        html.includes('No entry found') ||
        html.includes('Error') ||
        html.includes('not found') ||
        html.length < 100) {
      return null; // Invalid response
    }

    // Extract definition from CAL's HTML structure
    // CAL uses specific classes and patterns for their entries

    const definitions = [];
    let headword = word;
    let etymology = null;
    let dialect = null;
    let partOfSpeech = null;

    // Extract headword (usually in <span class="lemma"> or similar)
    const headwordMatch = html.match(/<span[^>]*class="[^"]*lemma[^"]*"[^>]*>([^<]+)</i);
    if (headwordMatch) {
      headword = headwordMatch[1].trim();
    }

    // Extract definition text - CAL often uses <span class="definition"> or plain text after headword
    const defMatches = html.matchAll(/<span[^>]*class="[^"]*(?:definition|meaning|gloss)[^"]*"[^>]*>([^<]+)</gi);
    for (const match of defMatches) {
      const def = cleanDefinitionText(match[1]);
      if (def && def.length > 2) {
        definitions.push({ text: def });
      }
    }

    // Try alternative pattern - look for English text after Aramaic lemma
    if (definitions.length === 0) {
      // Look for pattern: Aramaic word followed by English definition
      const textBlocks = html.match(/>\s*([A-Za-z][A-Za-z\s,.'()-]{10,})\s*</g);
      if (textBlocks) {
        for (const block of textBlocks.slice(0, 5)) { // Take first 5 matches max
          const cleaned = cleanDefinitionText(block.replace(/[<>]/g, ''));
          if (cleaned && cleaned.length > 5 && /^[A-Za-z]/.test(cleaned)) {
            definitions.push({ text: cleaned });
          }
        }
      }
    }

    // Extract dialect info (Jewish Babylonian Aramaic, Palestinian Aramaic, etc.)
    const dialectMatch = html.match(/(?:JBA|CPA|JPA|OA|Syr|Sam|Mand|QA)/i);
    if (dialectMatch) {
      const dialectCodes = {
        'JBA': 'Jewish Babylonian Aramaic (Talmud Bavli)',
        'CPA': 'Christian Palestinian Aramaic',
        'JPA': 'Jewish Palestinian Aramaic (Talmud Yerushalmi)',
        'OA': 'Official Aramaic',
        'Syr': 'Syriac',
        'Sam': 'Samaritan Aramaic',
        'Mand': 'Mandaic',
        'QA': 'Qumran Aramaic'
      };
      dialect = dialectCodes[dialectMatch[0].toUpperCase()] || dialectMatch[0];
    }

    // Extract part of speech
    const posMatch = html.match(/\b(noun|verb|adj(?:ective)?|adv(?:erb)?|prep(?:osition)?|conj(?:unction)?|particle)\b/i);
    if (posMatch) {
      partOfSpeech = posMatch[1].toLowerCase();
    }

    // Extract etymology/cognates
    const etymMatch = html.match(/(?:cognate|related|from|cf\.|compare)[^<]+/i);
    if (etymMatch) {
      etymology = cleanDefinitionText(etymMatch[0]);
    }

    if (definitions.length === 0) {
      return null;
    }

    return {
      source: 'CAL',
      fullName: 'Comprehensive Aramaic Lexicon',
      headword,
      definitions,
      dialect,
      partOfSpeech,
      etymology,
      language: 'Aramaic',
      url: `https://cal.huc.edu/oneentry.php?lemma=${encodeURIComponent(word)}`
    };
  } catch (error) {
    return null;
  }
};

// =============================================================================
// NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog) removed
// This service focuses on scholarly Biblical/Talmudic sources:
// BDB, Jastrow, Strong's, HALOT, Klein, Gesenius, TWOT, Steinsaltz, STEP Bible, CAL
// =============================================================================
