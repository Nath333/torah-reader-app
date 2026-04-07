// =============================================================================
// Soncino Talmud Service
// Fetches Talmud tractates with English footnotes from halakhah.com
// Footnotes include Rashi-based explanations (mixed with other commentators)
// =============================================================================

import { createCache } from '../../utils/cache';

// PDF.js is lazy-loaded only when needed for PDF parsing
// This saves ~500KB from the initial bundle
let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');
  // Configure PDF.js worker after lazy load
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  return pdfjsLib;
}

// =============================================================================
// TRACTATE MAPPINGS - halakhah.com URL paths
// =============================================================================

// Tractates with HTML available on halakhah.com (can be scraped for footnotes)
const HTML_TRACTATES = {
  // Seder Zeraim
  'Berakhot': 'berakoth',

  // Seder Moed
  'Shabbat': 'shabbath',

  // Seder Nashim (all have HTML)
  'Yevamot': 'yebamoth',
  'Ketubot': 'kethuboth',
  'Nedarim': 'nedarim',
  'Nazir': 'nazir',
  'Sotah': 'sotah',
  'Gittin': 'gittin',

  // Seder Nezikin (most have HTML)
  'Bava Kamma': 'babakamma',
  'Bava Metzia': 'babamezia',
  'Bava Batra': 'bababathra',
  'Sanhedrin': 'sanhedrin',
  'Avodah Zarah': 'zarah',
  'Horayot': 'horayoth',

  // Seder Tohorot
  'Niddah': 'niddah'
};

// Tractates with PDF only on halakhah.com (no HTML scraping possible)
// These are mapped but will return empty footnotes with a helpful message
const PDF_ONLY_TRACTATES = {
  // Seder Moed (most are PDF-only)
  'Eruvin': 'erubin',
  'Pesachim': 'pesachim',
  'Yoma': 'yoma',
  'Sukkah': 'sukkah',
  'Beitzah': 'betza',
  'Rosh Hashanah': 'roshashana',
  'Taanit': 'taanith',
  'Megillah': 'megilah',
  'Moed Katan': 'moedkatan',
  'Chagigah': 'hagiga',

  // Seder Nashim
  'Kiddushin': 'kiddushin',

  // Seder Nezikin (some PDF-only)
  'Makkot': 'makkoth',
  'Shevuot': 'shevuoth',

  // Seder Kodashim (all PDF-only)
  'Zevachim': 'zebahim',
  'Menachot': 'menachoth',
  'Chullin': 'hullin',
  'Bekhorot': 'bekhoroth',
  'Arakhin': 'erechin',
  'Temurah': 'temurah',
  'Keritot': 'kerithoth',
  'Meilah': 'meilah',
  'Tamid': 'tamid'
};

// Combined map for all tractates
const TRACTATE_URL_MAP = { ...HTML_TRACTATES, ...PDF_ONLY_TRACTATES };

// Get list of available tractates
export const getAvailableTractates = () => Object.keys(TRACTATE_URL_MAP);

// Check if a tractate is available on halakhah.com
export const isTractateAvailable = (tractate) => !!TRACTATE_URL_MAP[tractate];

// Get the URL path for a tractate
const getTractateUrlPath = (tractate) => TRACTATE_URL_MAP[tractate] || null;

// Use proxy to avoid CORS issues
const getBaseUrl = (tractate) => {
  const urlPath = getTractateUrlPath(tractate);
  if (!urlPath) return null;

  // In development, use the proxy; in production, try direct or fallback
  if (process.env.NODE_ENV === 'development') {
    return `/halakhah-api/${urlPath}`;
  }
  // For production (GitHub Pages), use a CORS proxy
  return `https://corsproxy.io/?https://halakhah.com/${urlPath}`;
};

const soncinoCache = createCache({ ttl: 60 * 60 * 1000, maxSize: 200 }); // 1 hour cache

/**
 * Convert daf notation (e.g., '2a', '15b') to Soncino page number
 * Soncino pages contain both 'a' and 'b' sides
 * @param {string} daf - Daf reference (e.g., '2a', '2b', '3a')
 * @returns {{ pageNum: number, side: string }} Page number and side
 */
const parseDaf = (daf) => {
  const match = daf.match(/^(\d+)([ab])$/i);
  if (!match) return null;

  return {
    pageNum: parseInt(match[1], 10),
    side: match[2].toLowerCase()
  };
};

/**
 * Parse HTML content from Soncino page
 * The HTML structure uses <ol><li> for footnotes with anchor names like "2a_1", "2b_1"
 * @param {string} html - Raw HTML content
 * @param {string} tractate - Tractate name (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference for context (e.g., '2a')
 * @returns {Object} Parsed content with text and footnotes
 */
const parseSoncinoHtml = (html, tractate, daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return { tractate, daf, footnotes: [], sections: [] };

  const { pageNum, side } = parsed;
  const anchorPrefix = `${pageNum}${side}_`;

  const result = {
    tractate,
    daf,
    title: `${tractate} ${daf}`,
    sections: [],
    footnotes: [],
    rawText: ''
  };

  // Find all <ol> sections that contain footnotes
  // Each page can have multiple <ol> blocks (one per folio side)
  const olPattern = /<ol>([\s\S]*?)<\/ol>/gi;
  let olMatch;
  let footnoteNum = 0;

  while ((olMatch = olPattern.exec(html)) !== null) {
    const olContent = olMatch[1];

    // Check if this <ol> contains footnotes for our daf side
    // by looking for anchors like <a name="2a_1">
    if (!olContent.includes(`name="${pageNum}${side}_`)) {
      continue;
    }

    // Parse <li> items within this <ol>
    // Format: <li><a name="2a_1"></a> Footnote text here
    const liPattern = /<li>\s*<a\s+name="([^"]+)"[^>]*><\/a>\s*([\s\S]*?)(?=<li>|$)/gi;
    let liMatch;

    while ((liMatch = liPattern.exec(olContent)) !== null) {
      const anchorName = liMatch[1];
      let text = liMatch[2];

      // Only include footnotes for the requested side (a or b)
      if (!anchorName.startsWith(anchorPrefix)) {
        continue;
      }

      // Extract footnote number from anchor (e.g., "2a_1" -> 1)
      const numMatch = anchorName.match(/_(\d+)$/);
      const num = numMatch ? parseInt(numMatch[1], 10) : ++footnoteNum;

      // Clean the footnote text
      text = text
        .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
        .replace(/\s+/g, ' ')       // Normalize whitespace
        .replace(/&mdash;/g, '—')   // HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\[H\]/g, '[Hebrew]')  // Hebrew placeholder
        .trim();

      if (text) {
        // Detect if this footnote mentions Rashi or Tosafot
        const mentionsRashi = /\brashi\b/i.test(text);
        const mentionsTosafot = /\btosaf/i.test(text);

        result.footnotes.push({
          number: num,
          anchor: anchorName,
          text,
          mentionsRashi,
          mentionsTosafot,
          source: 'Soncino Talmud (halakhah.com)'
        });
      }
    }
  }

  // Alternative parsing if <ol> pattern didn't work
  // Some pages may have footnotes in different format
  if (result.footnotes.length === 0) {
    // Try to find footnotes after separator line
    const separatorIdx = html.indexOf('Original footnotes renumbered');
    if (separatorIdx > -1) {
      const footnotesHtml = html.substring(separatorIdx);

      // Pattern for numbered footnotes: 1. text, 2. text, etc.
      const numPattern = /(\d+)\.\s*<a\s+name="([^"]+)"[^>]*><\/a>\s*([\s\S]*?)(?=\d+\.\s*<a\s+name=|<\/ol>|$)/gi;
      let numMatch;

      while ((numMatch = numPattern.exec(footnotesHtml)) !== null) {
        const num = parseInt(numMatch[1], 10);
        const anchor = numMatch[2];
        let text = numMatch[3];

        // Only include footnotes for the requested side
        if (!anchor.startsWith(anchorPrefix)) {
          continue;
        }

        text = text
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/&mdash;/g, '—')
          .replace(/&nbsp;/g, ' ')
          .replace(/\[H\]/g, '[Hebrew]')
          .trim();

        if (text) {
          result.footnotes.push({
            number: num,
            anchor,
            text,
            mentionsRashi: /\brashi\b/i.test(text),
            mentionsTosafot: /\btosaf/i.test(text),
            source: 'Soncino Talmud'
          });
        }
      }
    }
  }

  // Sort footnotes by number
  result.footnotes.sort((a, b) => a.number - b.number);

  // Extract main text sections (MISHNAH, GEMARA)
  const mishnaPattern = /<B><I>MISHNAH<\/I><\/B>\.?\s*([\s\S]*?)(?=GEMARA|<hr|$)/i;
  const gemaraPattern = /GEMARA[,.]?\s*([\s\S]*?)(?=<hr|<div align="center">|$)/i;

  const mishnaMatch = html.match(mishnaPattern);
  const gemaraMatch = html.match(gemaraPattern);

  if (mishnaMatch) {
    let mishnaText = mishnaMatch[1]
      .replace(/<a[^>]*>\s*<sup>\d+<\/sup>\s*<\/a>/g, '') // Remove footnote refs
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();

    result.sections.push({
      type: 'MISHNAH',
      text: mishnaText
    });
  }

  if (gemaraMatch) {
    let gemaraText = gemaraMatch[1]
      .replace(/<a[^>]*>\s*<sup>\d+<\/sup>\s*<\/a>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();

    result.sections.push({
      type: 'GEMARA',
      text: gemaraText.substring(0, 500) + (gemaraText.length > 500 ? '...' : '')
    });
  }

  return result;
};

// =============================================================================
// PDF PARSING FUNCTIONS
// =============================================================================

/**
 * Check if a tractate has HTML available (vs PDF-only)
 * @param {string} tractate - Tractate name
 * @returns {boolean} True if HTML is available
 */
export const hasHtmlAvailable = (tractate) => !!HTML_TRACTATES[tractate];

/**
 * Check if a tractate is PDF-only
 * @param {string} tractate - Tractate name
 * @returns {boolean} True if PDF-only
 */
export const isPdfOnly = (tractate) => !!PDF_ONLY_TRACTATES[tractate];

/**
 * Get PDF URL for a tractate
 * @param {string} tractate - Tractate name
 * @param {number} pageNum - Page number (daf number)
 * @returns {string|null} PDF URL or null
 */
const getPdfUrl = (tractate, pageNum) => {
  const urlPath = getTractateUrlPath(tractate);
  if (!urlPath) return null;

  // halakhah.com PDF naming convention: tractate/pdf/tractate_001-020.pdf
  // PDFs are bundled in ranges of 20 pages
  const startPage = Math.floor((pageNum - 1) / 20) * 20 + 1;
  const endPage = startPage + 19;
  const paddedStart = String(startPage).padStart(3, '0');
  const paddedEnd = String(endPage).padStart(3, '0');

  if (process.env.NODE_ENV === 'development') {
    return `/halakhah-api/${urlPath}/pdf/${urlPath}_${paddedStart}-${paddedEnd}.pdf`;
  }
  return `https://corsproxy.io/?https://halakhah.com/${urlPath}/pdf/${urlPath}_${paddedStart}-${paddedEnd}.pdf`;
};

/**
 * Parse footnotes from PDF text content
 * @param {string} text - Raw text extracted from PDF
 * @param {string} tractate - Tractate name
 * @param {string} daf - Daf reference
 * @returns {Object} Parsed content with footnotes
 */
const parseFootnotesFromPdfText = (text, tractate, daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return { tractate, daf, footnotes: [], sections: [] };

  const result = {
    tractate,
    daf,
    title: `${tractate} ${daf}`,
    sections: [],
    footnotes: [],
    rawText: text,
    source: 'PDF'
  };

  // Try to find the footnotes section
  const footnoteSectionMatch = text.match(/(?:FOOTNOTES?|Notes:?)\s*\n([\s\S]*)/i);
  const searchText = footnoteSectionMatch ? footnoteSectionMatch[1] : text;

  // Extract numbered footnotes
  const footnoteRegex = /(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/g;
  let match;

  while ((match = footnoteRegex.exec(searchText)) !== null) {
    const num = parseInt(match[1], 10);
    let footnoteText = match[2]
      .replace(/\s+/g, ' ')
      .replace(/\[H\]/g, '[Hebrew]')
      .trim();

    if (footnoteText && footnoteText.length > 10) {
      result.footnotes.push({
        number: num,
        text: footnoteText,
        mentionsRashi: /\brashi\b/i.test(footnoteText),
        mentionsTosafot: /\btosaf/i.test(footnoteText),
        source: `Soncino PDF (${tractate} ${daf})`
      });
    }
  }

  // Sort by footnote number
  result.footnotes.sort((a, b) => a.number - b.number);

  // Extract main text sections if possible
  const mishnaMatch = text.match(/MISHNAH[.:]\s*([\s\S]*?)(?=GEMARA|$)/i);
  const gemaraMatch = text.match(/GEMARA[.:]\s*([\s\S]*?)(?=FOOTNOTES|$)/i);

  if (mishnaMatch) {
    result.sections.push({
      type: 'MISHNAH',
      text: mishnaMatch[1].substring(0, 500).trim()
    });
  }

  if (gemaraMatch) {
    result.sections.push({
      type: 'GEMARA',
      text: gemaraMatch[1].substring(0, 500).trim()
    });
  }

  return result;
};

/**
 * Fetch and parse a Soncino PDF
 * @async
 * @param {string} tractate - Tractate name
 * @param {string} daf - Daf reference
 * @returns {Promise<Object>} Parsed content from PDF
 */
const fetchAndParsePdf = async (tractate, daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) throw new Error(`Invalid daf reference: ${daf}`);

  const pdfUrl = getPdfUrl(tractate, parsed.pageNum);
  if (!pdfUrl) throw new Error(`No PDF URL for ${tractate}`);

  console.log(`[Soncino] Fetching PDF from: ${pdfUrl}`);

  try {
    // Lazy-load PDF.js only when needed
    const pdfjs = await loadPdfJs();

    // Fetch PDF as ArrayBuffer
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`PDF fetch failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Load PDF with pdf.js
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log(`[Soncino] PDF loaded: ${pdf.numPages} pages`);

    // Calculate which page in the PDF corresponds to our daf
    // PDFs bundle ~20 dapim, each daf is roughly 1 page
    const startDaf = Math.floor((parsed.pageNum - 1) / 20) * 20 + 1;
    const pageInPdf = parsed.pageNum - startDaf + 1;

    // Extract text from relevant pages (the daf and possibly surrounding pages for footnotes)
    let fullText = '';
    const startPage = Math.max(1, pageInPdf);
    const endPage = Math.min(pdf.numPages, pageInPdf + 2);

    for (let i = startPage; i <= endPage; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    // Parse the extracted text
    const result = parseFootnotesFromPdfText(fullText, tractate, daf);

    // Add metadata
    const urlPath = getTractateUrlPath(tractate);
    result.source = 'Soncino Talmud PDF (halakhah.com)';
    result.license = 'Public Domain';
    result.note = 'Extracted from PDF. Footnotes contain explanations based on Rashi, Tosafot, and other commentators.';
    result.url = `https://halakhah.com/${urlPath}/pdf/`;
    result.isPdf = true;

    return result;

  } catch (error) {
    console.error(`[Soncino] PDF parsing failed for ${tractate} ${daf}:`, error);
    throw error;
  }
};

/**
 * Fetch Soncino Talmud page with English footnotes for any tractate
 * Tries HTML first, falls back to PDF if available
 * @async
 * @param {string} tractate - Tractate name (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference (e.g., '2a', '73a')
 * @returns {Promise<Object>} Parsed Soncino content with text and footnotes
 */
export const getSoncinoTractate = async (tractate, daf) => {
  const cacheKey = `soncino:${tractate}:${daf}`;
  const cached = soncinoCache.get(cacheKey);
  if (cached) return cached;

  const baseUrl = getBaseUrl(tractate);
  if (!baseUrl) {
    throw new Error(`Tractate ${tractate} is not available on halakhah.com`);
  }

  const parsed = parseDaf(daf);
  if (!parsed) {
    throw new Error(`Invalid daf reference: ${daf}`);
  }

  const urlPath = getTractateUrlPath(tractate);
  const isHtml = hasHtmlAvailable(tractate);

  // Try HTML first if available
  if (isHtml) {
    try {
      // Soncino uses page numbers like shabbath_2.html (contains both 2a and 2b)
      const url = `${baseUrl}/${urlPath}_${parsed.pageNum}.html`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Torah Reader App'
        }
      });

      if (response.ok) {
        const html = await response.text();
        const parsedContent = parseSoncinoHtml(html, tractate, daf);

        // Add metadata (use original halakhah.com URL for display)
        const originalUrl = `https://halakhah.com/${urlPath}/${urlPath}_${parsed.pageNum}.html`;
        const result = {
          ...parsedContent,
          source: 'Soncino Talmud (halakhah.com)',
          license: 'Public Domain',
          note: 'Footnotes contain explanations based on Rashi, Tosafot, and other commentators',
          url: originalUrl,
          isPdf: false
        };

        soncinoCache.set(cacheKey, result);
        return result;
      }
    } catch (htmlError) {
      console.warn(`[Soncino] HTML fetch failed for ${tractate} ${daf}, trying PDF:`, htmlError.message);
    }
  }

  // Fall back to PDF parsing
  try {
    console.log(`[Soncino] Attempting PDF fetch for ${tractate} ${daf}`);
    const pdfResult = await fetchAndParsePdf(tractate, daf);
    soncinoCache.set(cacheKey, pdfResult);
    return pdfResult;
  } catch (pdfError) {
    console.error(`[Soncino] PDF fetch also failed for ${tractate} ${daf}:`, pdfError.message);

    // Return empty result with helpful message
    const emptyResult = {
      tractate,
      daf,
      title: `${tractate} ${daf}`,
      sections: [],
      footnotes: [],
      source: 'Soncino Talmud (halakhah.com)',
      license: 'Public Domain',
      note: `Footnotes not available online for ${tractate}. Visit halakhah.com for PDF download.`,
      url: `https://halakhah.com/${urlPath}/`,
      error: true
    };
    return emptyResult;
  }
};

// Backwards compatibility - kept for existing code
export const getSoncinoShabbat = async (daf) => getSoncinoTractate('Shabbat', daf);

/**
 * Get Soncino footnotes for any tractate
 * @async
 * @param {string} tractate - Tractate name (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference
 * @returns {Promise<Array>} Array of footnote objects
 */
export const getSoncinoFootnotesForTractate = async (tractate, daf) => {
  try {
    const data = await getSoncinoTractate(tractate, daf);
    return data.footnotes || [];
  } catch (error) {
    console.warn(`Failed to get Soncino footnotes for ${tractate} ${daf}:`, error.message);
    return [];
  }
};

// Backwards compatibility for Shabbat
export const getSoncinoFootnotes = async (daf) => getSoncinoFootnotesForTractate('Shabbat', daf);

/**
 * Get footnotes that specifically mention Rashi
 * @async
 * @param {string} tractate - Tractate name
 * @param {string} daf - Daf reference
 * @returns {Promise<Array>} Footnotes that explicitly reference Rashi
 */
export const getRashiFootnotesForTractate = async (tractate, daf) => {
  const footnotes = await getSoncinoFootnotesForTractate(tractate, daf);
  return footnotes.filter(fn => fn.mentionsRashi);
};

// Backwards compatibility
export const getRashiFootnotes = async (daf) => getRashiFootnotesForTractate('Shabbat', daf);

/**
 * Get list of available Shabbat pages on halakhah.com
 * Shabbat has folios 2-157
 * @returns {Array} List of available daf references
 */
export const getSoncinoShabbatPages = () => {
  const pages = [];
  for (let i = 2; i <= 157; i++) {
    pages.push(`${i}a`);
    pages.push(`${i}b`);
  }
  return pages;
};

/**
 * Clear the Soncino cache
 */
export const clearSoncinoCache = () => {
  soncinoCache.clear();
};

// =============================================================================
// Default Export
// =============================================================================

const soncinoService = {
  // Generic tractate functions
  getSoncinoTractate,
  getSoncinoFootnotesForTractate,
  getRashiFootnotesForTractate,
  getAvailableTractates,
  isTractateAvailable,

  // HTML/PDF availability helpers
  hasHtmlAvailable,
  isPdfOnly,

  // Backwards compatibility (Shabbat-specific)
  getSoncinoShabbat,
  getSoncinoFootnotes,
  getRashiFootnotes,
  getSoncinoShabbatPages,

  // Utilities
  clearSoncinoCache
};

export default soncinoService;
