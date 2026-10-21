// =============================================================================
// Endpoints Talmud Bavli (William Davidson) — getTalmudDaf, daf de Shabbat,
// sugya complète + analyse des frontières (nouvelle Mishna, résolution).
// (extrait de sefariaApi.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { fetchWithFallback } from '../../utils/http';
import { cleanHtml } from '../../utils/sanitize';
import { viaProxy } from '../proxyConfig';
import { createLogger } from '../../utils/debug';
import { BASE_URL, textCache } from './state';
import { formatBookName } from './refHelpers';

const log = createLogger('sefariaApi');

// =============================================================================
// TALMUD BAVLI WITH ENGLISH TRANSLATION (William Davidson Edition)
// =============================================================================

/**
 * Fetch a Talmud daf (page) with full English translation
 * Uses the William Davidson Edition (Steinsaltz translation)
 * @async
 * @param {string} tractate - Name of tractate (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference (e.g., '2a', '15b')
 * @returns {Promise<Object>} Object with Hebrew/Aramaic and English text
 */
export const getTalmudDaf = async (tractate, daf) => {
  const cacheKey = `talmud:${tractate}:${daf}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  const formattedTractate = formatBookName(tractate);
  const logPrefix = `[Talmud:${tractate}.${daf}]`;

  // PRO SCHOLAR V11.2: Optimized helpers
  const flattenText = (arr) => {
    if (!arr) return [];
    if (typeof arr === 'string') return [arr];
    return Array.isArray(arr) ? arr.flatMap(flattenText) : [];
  };

  const buildSegments = (heTexts, enTexts) => {
    const segments = [];
    const hebrew = [];
    const english = [];
    const maxLen = Math.max(heTexts.length, enTexts.length);

    for (let i = 0; i < maxLen; i++) {
      const he = cleanHtml(heTexts[i] || '');
      const en = cleanHtml(enTexts[i] || '');
      if (he || en) {
        hebrew.push(he);
        english.push(en);
        segments.push({ index: i + 1, hebrew: he, english: en });
      }
    }
    return { segments, hebrew, english };
  };

  const createResult = (ref, heRef, segmentData) => ({
    ref: ref || `${tractate}.${daf}`,
    heRef: heRef || `${tractate} ${daf}`,
    tractate,
    daf,
    ...segmentData
  });

  // Strategy 1: Try v2 API (simpler, more reliable)
  try {
    const v2Data = await fetchWithFallback(
      `${BASE_URL}/texts/${formattedTractate}.${daf}?context=0`,
      { timeout: 15000 }
    );

    const heTexts = flattenText(v2Data.he);
    const enTexts = flattenText(v2Data.text);

    if (heTexts.length > 0 || enTexts.length > 0) {
      const segmentData = buildSegments(heTexts, enTexts);
      if (segmentData.segments.length > 0) {
        log.debug(`${logPrefix} v2 API: ${segmentData.segments.length} segments`);
        const result = createResult(v2Data.ref, v2Data.heRef, segmentData);
        textCache.set(cacheKey, result);
        return result;
      }
    }
    log.debug(`${logPrefix} v2 empty, trying v3...`);
  } catch (v2Err) {
    console.warn(`${logPrefix} v2 failed:`, v2Err.message);
  }

  // Strategy 2: Try v3 API with versions structure
  try {
    const v3Data = await fetchWithFallback(
      `${BASE_URL}/v3/texts/${formattedTractate}.${daf}`,
      { timeout: 15000 }
    );

    let heTexts = [];
    let enTexts = [];

    // v3 format: versions array OR direct he/text
    if (v3Data.versions?.length > 0) {
      const heVer = v3Data.versions.find(v => v.language === 'he');
      const enVer = v3Data.versions.find(v => v.language === 'en');
      heTexts = flattenText(heVer?.text || v3Data.he);
      enTexts = flattenText(enVer?.text || v3Data.text);
    } else {
      heTexts = flattenText(v3Data.he);
      enTexts = flattenText(v3Data.text);
    }

    if (heTexts.length > 0 || enTexts.length > 0) {
      const segmentData = buildSegments(heTexts, enTexts);
      if (segmentData.segments.length > 0) {
        log.debug(`${logPrefix} v3 API: ${segmentData.segments.length} segments`);
        const result = createResult(v3Data.ref, v3Data.heRef, segmentData);
        textCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (v3Err) {
    console.warn(`${logPrefix} v3 failed:`, v3Err.message);
  }

  // Strategy 3: Direct Sefaria fetch (bypass proxy issues)
  try {
    const directUrl = viaProxy(
      `/sefaria/api/texts/${formattedTractate}.${daf}`,
      `https://www.sefaria.org/api/texts/${formattedTractate}.${daf}`
    ) + '?context=0';

    // Use AbortController for timeout (compatible with older browsers)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(directUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const heTexts = flattenText(data.he);
      const enTexts = flattenText(data.text);

      if (heTexts.length > 0 || enTexts.length > 0) {
        const segmentData = buildSegments(heTexts, enTexts);
        if (segmentData.segments.length > 0) {
          log.debug(`${logPrefix} Direct fetch: ${segmentData.segments.length} segments`);
          const result = createResult(data.ref, data.heRef, segmentData);
          textCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (directErr) {
    console.warn(`${logPrefix} Direct fetch failed:`, directErr.message);
  }

  console.error(`${logPrefix} All strategies failed - no content available`);
  throw new Error(`לא ניתן לטעון ${tractate} ${daf} - בדוק חיבור לאינטרנט`);
};

/**
 * Fetch Tractate Shabbat with English translation
 * Convenience function for Shabbat tractate
 * @async
 * @param {string} daf - Daf reference (e.g., '2a', '73a')
 * @returns {Promise<Object>} Shabbat daf with Hebrew and English
 */
export const getShabbatDaf = async (daf) => {
  return getTalmudDaf('Shabbat', daf);
};

/**
 * PRO SCHOLAR V19: Fetch full Sugya (multiple consecutive pages)
 * Loads extended content for comprehensive scholarly display
 * @async
 * @param {string} tractate - Name of tractate (e.g., 'Shabbat')
 * @param {string} startDaf - Starting daf reference (e.g., '2a')
 * @param {number} pageCount - Number of pages to fetch (default: 4 = 2 full leaves)
 * @returns {Promise<Object>} Combined sugya with all pages
 */
export const getFullSugya = async (tractate, startDaf, pageCount = 4) => {
  const cacheKey = `sugya:${tractate}:${startDaf}:${pageCount}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  // Parse starting daf
  const dafMatch = startDaf.match(/^(\d+)([ab])$/);
  if (!dafMatch) {
    throw new Error(`Invalid daf format: ${startDaf}`);
  }

  let dafNum = parseInt(dafMatch[1], 10);
  let side = dafMatch[2]; // 'a' or 'b'

  // Generate list of pages to fetch
  const pagesToFetch = [];
  for (let i = 0; i < pageCount; i++) {
    pagesToFetch.push(`${dafNum}${side}`);
    // Advance to next page
    if (side === 'a') {
      side = 'b';
    } else {
      side = 'a';
      dafNum++;
    }
  }

  log.debug(`[Sugya] Fetching ${tractate} pages: ${pagesToFetch.join(', ')}`);

  // Fetch all pages in parallel
  const pagePromises = pagesToFetch.map(daf =>
    getTalmudDaf(tractate, daf).catch(err => {
      console.warn(`[Sugya] Failed to fetch ${tractate}.${daf}:`, err.message);
      return null;
    })
  );

  const pages = await Promise.all(pagePromises);
  const validPages = pages.filter(p => p !== null);

  if (validPages.length === 0) {
    throw new Error(`לא ניתן לטעון סוגיה מ-${tractate} ${startDaf}`);
  }

  // Combine all pages into one result
  const combinedHebrew = [];
  const combinedEnglish = [];
  const combinedSegments = [];
  const pageMarkers = [];

  validPages.forEach((page, idx) => {
    const pageNum = pagesToFetch[idx];
    pageMarkers.push({
      daf: pageNum,
      startIndex: combinedSegments.length,
      segmentCount: page.segments?.length || 0
    });

    // Add page marker to text
    combinedHebrew.push(`\n═══ ${tractate} ${pageNum} ═══\n`);
    combinedEnglish.push(`\n═══ ${tractate} ${pageNum} ═══\n`);

    // Add segments
    if (page.segments) {
      page.segments.forEach((seg, segIdx) => {
        combinedHebrew.push(seg.hebrew || '');
        combinedEnglish.push(seg.english || '');
        combinedSegments.push({
          ...seg,
          daf: pageNum,
          globalIndex: combinedSegments.length + 1
        });
      });
    } else if (page.hebrew) {
      page.hebrew.forEach((he, i) => {
        combinedHebrew.push(he);
        combinedEnglish.push(page.english?.[i] || '');
        combinedSegments.push({
          index: i + 1,
          hebrew: he,
          english: page.english?.[i] || '',
          daf: pageNum,
          globalIndex: combinedSegments.length + 1
        });
      });
    }
  });

  const result = {
    ref: `${tractate}.${startDaf}-${pagesToFetch[pagesToFetch.length - 1]}`,
    heRef: `${tractate} ${startDaf}-${pagesToFetch[pagesToFetch.length - 1]}`,
    tractate,
    startDaf,
    endDaf: pagesToFetch[pagesToFetch.length - 1],
    pageCount: validPages.length,
    pageMarkers,
    segments: combinedSegments,
    hebrew: combinedHebrew,
    english: combinedEnglish,
    fullHebrewText: combinedHebrew.join(' '),
    fullEnglishText: combinedEnglish.join(' '),
    isSugya: true
  };

  textCache.set(cacheKey, result);
  log.debug(`[Sugya] Loaded ${validPages.length} pages, ${combinedSegments.length} total segments`);
  return result;
};


// =============================================================================
// PRO SCHOLAR V22: Smart Sugya Loading - Loads until Gemara resolves the Mishna
// =============================================================================

/**
 * Patterns that indicate a new Mishna is starting (end of current sugya)
 */
const NEW_MISHNA_PATTERNS = [
  /^מתני[׳']?\.?\s/,           // מתני׳ at start of segment
  /^מתניתין\.?\s/,            // מתניתין at start
  /^הדרן\s+עלך/,              // הדרן עלך (end of chapter)
  /^פרק\s+[א-ת]/,             // New chapter marker
];

/**
 * Patterns that indicate the Gemara has reached a conclusion/resolution
 */
const RESOLUTION_PATTERNS = [
  /הלכה\s+כ[א-ת]/,            // הלכה כ... (the halacha follows...)
  /הלכתא\s+כ/,                // הלכתא כ...
  /שמע\s+מינה\s+תלת/,         // שמע מינה תלת (we derive three things)
  /שמע\s+מינה$/,              // שמע מינה at end (conclusion)
  /תיקו$/,                    // תיקו (stands unresolved)
  /קשיא$/,                    // קשיא (remains difficult)
  /ולא\s+היא/,                // ולא היא (rejection of premise - often conclusive)
];

/**
 * Patterns that indicate strong discussion continuation (don't stop here)
 */
const CONTINUATION_PATTERNS = [
  /^גמ[׳']?\.?\s/,            // גמ׳ - Gemara marker (just starting!)
  /איבעיא\s+להו/,            // Question to resolve
  /בעי\s+[א-ת]/,              // Asks...
  /תא\s+שמע/,                 // Come and hear (bringing proof)
  /מיתיבי/,                   // Objection from Braita
  /ורמינהו/,                  // Contradiction
  /והתניא/,                   // But it was taught
  /מנא\s+הני\s+מילי/,         // Source question
  /מנלן/,                     // From where do we know
];

/**
 * Check if a segment marks the start of a new Mishna
 */
const isNewMishna = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return NEW_MISHNA_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Check if text contains a resolution marker
 */
const hasResolution = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return RESOLUTION_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Check if text indicates strong continuation (shouldn't stop)
 */
const hasContinuation = (text) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  return CONTINUATION_PATTERNS.some(pattern => pattern.test(cleanText));
};

/**
 * Analyzes sugya content to determine sugya boundaries and extract full discussion
 * @param {Array} segments - Array of text segments
 * @returns {Object} Analysis with boundary info and full text
 */
const analyzeSugyaBoundaries = (segments) => {
  let mishnaEndIndex = -1;
  let gemaraStartIndex = -1;
  let resolutionIndex = -1;
  let nextMishnaIndex = -1;

  // Track whether we've passed the initial Mishna
  let passedInitialMishna = false;
  let segmentsAfterGemara = 0;
  const MIN_SEGMENTS_BEFORE_RESOLUTION = 5; // Don't accept resolution too early

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].hebrew || segments[i];
    const cleanText = typeof text === 'string' ? text.replace(/<[^>]*>/g, '').trim() : '';

    // Detect Gemara start
    if (gemaraStartIndex === -1 && /^גמ[׳']?\.?\s/.test(cleanText)) {
      gemaraStartIndex = i;
      mishnaEndIndex = i - 1;
      passedInitialMishna = true;
    }

    // If we have Gemara discourse patterns but no explicit גמ׳, detect transition
    if (gemaraStartIndex === -1 && passedInitialMishna === false) {
      const hasGemaraPattern = /תנן\s+התם|אמר\s+רב|תנו\s+רבנן|תניא|מאי\s+|פשיטא|איבעיא/.test(cleanText);
      if (hasGemaraPattern && i > 0) {
        gemaraStartIndex = i;
        mishnaEndIndex = i - 1;
        passedInitialMishna = true;
      }
    }

    // Count segments after Gemara starts
    if (gemaraStartIndex !== -1) {
      segmentsAfterGemara++;
    }

    // Detect new Mishna (only after we've had some Gemara)
    if (passedInitialMishna && segmentsAfterGemara > MIN_SEGMENTS_BEFORE_RESOLUTION && isNewMishna(cleanText)) {
      nextMishnaIndex = i;
      break; // Stop at next Mishna
    }

    // Detect resolution (only if we've had enough discussion)
    if (passedInitialMishna && segmentsAfterGemara > MIN_SEGMENTS_BEFORE_RESOLUTION) {
      if (hasResolution(cleanText) && !hasContinuation(cleanText)) {
        resolutionIndex = i;
        // Don't break immediately - continue a few more segments to include follow-up
      }
    }
  }

  return {
    mishnaEndIndex,
    gemaraStartIndex,
    resolutionIndex,
    nextMishnaIndex,
    suggestedEndIndex: nextMishnaIndex !== -1 ? nextMishnaIndex - 1 :
                       resolutionIndex !== -1 ? Math.min(resolutionIndex + 3, segments.length - 1) :
                       segments.length - 1
  };
};

/**
 * Load the complete Gemara discussion until it resolves the Mishna
 * PRO SCHOLAR V22: Smart sugya loading with boundary detection
 *
 * @param {string} tractate - Tractate name (e.g., 'Shabbat')
 * @param {string} startDaf - Starting daf (e.g., '2a')
 * @param {number} maxPages - Maximum pages to load (default: 8, safety limit)
 * @returns {Promise<Object>} Full sugya data with boundary analysis
 */
export const getFullSugyaUntilResolution = async (tractate, startDaf, maxPages = 8) => {
  const cacheKey = `sugya-full:${tractate}:${startDaf}`;
  const cached = textCache.get(cacheKey);
  if (cached) return cached;

  log.debug(`[Sugya V22] Loading ${tractate} ${startDaf} until resolution (max ${maxPages} pages)`);

  // Parse starting daf
  const dafMatch = startDaf.match(/^(\d+)([ab])$/);
  if (!dafMatch) {
    throw new Error(`Invalid daf format: ${startDaf}`);
  }

  let dafNum = parseInt(dafMatch[1], 10);
  let side = dafMatch[2];

  const combinedSegments = [];
  const combinedHebrew = [];
  const combinedEnglish = [];
  const pageMarkers = [];
  let foundResolution = false;
  let foundNextMishna = false;
  let pagesLoaded = 0;
  let lastEndDaf = startDaf;

  // Load pages until we find resolution or hit max
  while (pagesLoaded < maxPages && !foundResolution && !foundNextMishna) {
    const currentDaf = `${dafNum}${side}`;

    try {
      const page = await getTalmudDaf(tractate, currentDaf);

      if (!page) {
        console.warn(`[Sugya V22] Failed to load ${tractate}.${currentDaf}`);
        break;
      }

      pagesLoaded++;
      lastEndDaf = currentDaf;

      pageMarkers.push({
        daf: currentDaf,
        startIndex: combinedSegments.length,
        segmentCount: page.segments?.length || page.hebrew?.length || 0
      });

      // Add page marker
      combinedHebrew.push(`\n═══ ${tractate} ${currentDaf} ═══\n`);
      combinedEnglish.push(`\n═══ ${tractate} ${currentDaf} ═══\n`);

      // Process segments
      const segments = page.segments || page.hebrew?.map((h, i) => ({
        hebrew: h,
        english: page.english?.[i] || ''
      })) || [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const hebrew = seg.hebrew || seg;
        const english = seg.english || '';

        combinedHebrew.push(hebrew);
        combinedEnglish.push(english);
        combinedSegments.push({
          index: combinedSegments.length + 1,
          hebrew,
          english,
          daf: currentDaf,
          globalIndex: combinedSegments.length + 1
        });

        // Check for new Mishna or resolution (after first page)
        if (pagesLoaded > 1 || i > 5) {
          const cleanText = hebrew.replace(/<[^>]*>/g, '').trim();

          if (isNewMishna(cleanText)) {
            log.debug(`[Sugya V22] Found new Mishna at ${currentDaf} segment ${i}`);
            foundNextMishna = true;
            // Remove this segment and any after it (it's the new Mishna)
            combinedSegments.pop();
            combinedHebrew.pop();
            combinedEnglish.pop();
            break;
          }

          if (hasResolution(cleanText) && combinedSegments.length > 10) {
            log.debug(`[Sugya V22] Found resolution at ${currentDaf} segment ${i}: ${cleanText.slice(0, 50)}`);
            foundResolution = true;
            // Continue a few more segments for follow-up, then stop
            const remainingInPage = Math.min(3, segments.length - i - 1);
            for (let j = 1; j <= remainingInPage; j++) {
              const nextSeg = segments[i + j];
              if (nextSeg) {
                const nextHebrew = nextSeg.hebrew || nextSeg;
                const nextEnglish = nextSeg.english || '';
                if (!isNewMishna(nextHebrew)) {
                  combinedHebrew.push(nextHebrew);
                  combinedEnglish.push(nextEnglish);
                  combinedSegments.push({
                    index: combinedSegments.length + 1,
                    hebrew: nextHebrew,
                    english: nextEnglish,
                    daf: currentDaf,
                    globalIndex: combinedSegments.length + 1
                  });
                }
              }
            }
            break;
          }
        }
      }

      // Advance to next page
      if (side === 'a') {
        side = 'b';
      } else {
        side = 'a';
        dafNum++;
      }

    } catch (err) {
      console.error(`[Sugya V22] Error loading ${currentDaf}:`, err.message);
      break;
    }
  }

  // Analyze boundaries of the loaded content
  const boundaries = analyzeSugyaBoundaries(combinedSegments);

  const result = {
    ref: `${tractate}.${startDaf}-${lastEndDaf}`,
    heRef: `${tractate} ${startDaf}${pagesLoaded > 1 ? `-${lastEndDaf}` : ''}`,
    tractate,
    startDaf,
    endDaf: lastEndDaf,
    pageCount: pagesLoaded,
    pageMarkers,
    segments: combinedSegments,
    hebrew: combinedHebrew,
    english: combinedEnglish,
    fullHebrewText: combinedHebrew.join(' '),
    fullEnglishText: combinedEnglish.join(' '),
    isSugya: true,
    // V22 boundary analysis
    boundaries,
    foundResolution,
    foundNextMishna,
    status: foundResolution ? 'resolved' :
            foundNextMishna ? 'next_mishna' :
            pagesLoaded >= maxPages ? 'max_pages' : 'incomplete'
  };

  textCache.set(cacheKey, result);
  log.debug(`[Sugya V22] Loaded ${pagesLoaded} pages, ${combinedSegments.length} segments, status: ${result.status}`);
  return result;
};

/**
 * Get Rashi on Talmud Shabbat with English translation
 * Uses Sefaria Community Translation when available, falls back to AI translation
 * @async
 * @param {string} daf - Daf reference (e.g., '2a', '5b')
 * @returns {Promise<Array>} Array of Rashi comments with Hebrew and English
 */
