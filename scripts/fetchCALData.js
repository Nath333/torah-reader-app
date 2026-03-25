/**
 * CAL (Comprehensive Aramaic Lexicon) Batch Fetcher
 * ==================================================
 * Fetches Aramaic etymologies from CAL database (Hebrew Union College)
 * and caches them locally for offline Scholar Pro use.
 *
 * CAL provides DJBA/DJPA equivalent scholarly data including:
 * - Dialect information (Babylonian, Palestinian, Targumic)
 * - Attestation sources
 * - Etymology and cognates
 * - Verb conjugation patterns
 *
 * Usage: node scripts/fetchCALData.js
 * Output: public/data/cal_enriched_cache.json
 *
 * Note: This script respects rate limits and may take several minutes.
 */

const fs = require('fs');
const path = require('path');

// Paths
const JASTROW_EXTRACTED_PATH = path.join(__dirname, '../public/data/etymology_jastrow_extracted.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/cal_enriched_cache.json');

// CAL API configuration
const CAL_BASE_URL = 'https://cal.huc.edu';
const RATE_LIMIT_MS = 500; // 500ms between requests to be respectful
const MAX_ENTRIES = 2000; // Limit for testing (remove for full run)
const TIMEOUT_MS = 10000;

// CORS proxy for browser-like requests
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// Hebrew to CAL transliteration
const HEBREW_TO_CAL = {
  'א': ')', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'w', 'ז': 'z', 'ח': 'x', 'ט': 'T', 'י': 'y',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '(', 'פ': 'p',
  'ף': 'p', 'צ': 'c', 'ץ': 'c', 'ק': 'q', 'ר': 'r',
  'ש': '$', 'ת': 't',
};

/**
 * Convert Hebrew word to CAL transliteration
 */
function hebrewToCAL(word) {
  const cleaned = word.replace(/[\u0591-\u05C7]/g, ''); // Remove vowels
  return [...cleaned].map(char => HEBREW_TO_CAL[char] || char).join('');
}

/**
 * Delay helper for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse CAL browse results HTML
 */
function parseCalBrowseResults(html) {
  const lemmas = [];

  // Pattern: <a href="oneentry.php?lemma=XXX">WORD</a> - MEANING
  const pattern = /<a[^>]*href="oneentry\.php\?lemma=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>\s*[-—–]\s*([^<;]+)/gi;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const calForm = match[1].trim();
    const lemma = match[2].trim();
    const meaning = match[3].trim().replace(/[\s,;]+$/, '');

    if (lemma && meaning && meaning.length > 1) {
      lemmas.push({ calForm, lemma, meaning });
    }
  }

  return lemmas;
}

/**
 * Parse CAL entry HTML for detailed data
 */
function parseCalEntry(html, lemma) {
  const entry = {
    lemma,
    source: 'CAL',
    definitions: [],
    dialects: [],
    etymology: null,
    cognates: [],
    attestations: [],
    partOfSpeech: null
  };

  // Extract definitions - look for meaning patterns
  const defPatterns = [
    /<td[^>]*class="[^"]*meaning[^"]*"[^>]*>([^<]+)/gi,
    /meaning[^:]*:\s*([^<;]+)/gi,
    /<b>([^<]+)<\/b>\s*[-—]\s*([^<;]+)/gi
  ];

  for (const pattern of defPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const meaning = (match[2] || match[1]).trim();
      if (meaning && meaning.length > 2 && !entry.definitions.includes(meaning)) {
        entry.definitions.push(meaning);
      }
    }
  }

  // Extract dialect information
  const dialectPatterns = [
    /\b(JBA|Jewish Babylonian Aramaic)\b/gi,
    /\b(JPA|Jewish Palestinian Aramaic)\b/gi,
    /\b(Syr(?:iac)?)\b/gi,
    /\b(Targ(?:um(?:ic)?)?)\b/gi,
    /\b(Mand(?:aic)?)\b/gi,
    /\b(Sam(?:aritan)?)\b/gi
  ];

  const dialectMap = {
    'jba': 'Jewish Babylonian Aramaic',
    'jewish babylonian aramaic': 'Jewish Babylonian Aramaic',
    'jpa': 'Jewish Palestinian Aramaic',
    'jewish palestinian aramaic': 'Jewish Palestinian Aramaic',
    'syr': 'Syriac',
    'syriac': 'Syriac',
    'targ': 'Targumic',
    'targum': 'Targumic',
    'targumic': 'Targumic',
    'mand': 'Mandaic',
    'mandaic': 'Mandaic',
    'sam': 'Samaritan',
    'samaritan': 'Samaritan'
  };

  for (const pattern of dialectPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const dialect = dialectMap[match[1].toLowerCase()] || match[1];
      if (!entry.dialects.includes(dialect)) {
        entry.dialects.push(dialect);
      }
    }
  }

  // Extract POS
  const posMatch = html.match(/\b(verb|noun|adjective|adverb|preposition|conjunction|particle)\b/i);
  if (posMatch) {
    entry.partOfSpeech = posMatch[1].toLowerCase();
  }

  // Extract attestation references
  const attPattern = /\b(Bavli|Yerushalmi|Targum|Onkelos)\s+([A-Za-z]+\.?\s*\d+[ab]?)/gi;
  let attMatch;
  while ((attMatch = attPattern.exec(html)) !== null) {
    const att = `${attMatch[1]} ${attMatch[2]}`;
    if (!entry.attestations.includes(att)) {
      entry.attestations.push(att);
    }
  }

  return entry;
}

/**
 * Fetch CAL entry for a word
 */
async function fetchCalEntry(word) {
  const calForm = hebrewToCAL(word);

  try {
    // First try direct entry lookup
    const entryUrl = `${CORS_PROXY}${encodeURIComponent(`${CAL_BASE_URL}/oneentry.php?lemma=${encodeURIComponent(calForm)}&cits=all`)}`;

    const response = await fetchWithTimeout(entryUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const html = data.contents || '';

    if (html.includes('BAD LEMMA REQUEST') || html.includes('No results')) {
      // Try browse instead
      return await fetchCalBrowse(word);
    }

    const entry = parseCalEntry(html, word);

    if (entry.definitions.length > 0 || entry.dialects.length > 0) {
      return entry;
    }

    return null;
  } catch (error) {
    // Silent fail - CAL might not have this word
    return null;
  }
}

/**
 * Fetch CAL browse results for word prefix
 */
async function fetchCalBrowse(word) {
  const calPrefix = hebrewToCAL(word.substring(0, 3));

  try {
    const browseUrl = `${CORS_PROXY}${encodeURIComponent(`${CAL_BASE_URL}/browseSKEYheaders.php?first3=${encodeURIComponent(calPrefix)}`)}`;

    const response = await fetchWithTimeout(browseUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const html = data.contents || '';

    const results = parseCalBrowseResults(html);

    // Find best match
    const targetCal = hebrewToCAL(word);
    const bestMatch = results.find(r =>
      r.calForm === targetCal ||
      r.lemma === word ||
      targetCal.startsWith(r.calForm)
    );

    if (bestMatch) {
      return {
        lemma: bestMatch.lemma,
        source: 'CAL',
        definitions: [bestMatch.meaning],
        dialects: [],
        fromBrowse: true
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get high-priority Aramaic words from Jastrow extraction
 */
function getAramaicWordList() {
  console.log('Loading Jastrow extracted data...');

  if (!fs.existsSync(JASTROW_EXTRACTED_PATH)) {
    console.error('Jastrow extraction not found. Run extractJastrowCrossRefs.js first.');
    process.exit(1);
  }

  const jastrow = JSON.parse(fs.readFileSync(JASTROW_EXTRACTED_PATH, 'utf8'));
  const entries = jastrow.entries || {};

  // Get all Aramaic entries
  const aramaicWords = Object.entries(entries)
    .filter(([_, entry]) => entry.isAramaic)
    .map(([word, _]) => word)
    .slice(0, MAX_ENTRIES); // Limit for testing

  console.log(`Found ${aramaicWords.length} Aramaic words to fetch`);
  return aramaicWords;
}

/**
 * Main batch fetch function
 */
async function batchFetchCAL() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       CAL Database Batch Fetcher                              ║');
  console.log('║       (Comprehensive Aramaic Lexicon - Hebrew Union College)  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const words = getAramaicWordList();
  const results = {};
  let success = 0;
  let failed = 0;
  let skipped = 0;

  const startTime = Date.now();

  console.log(`\nFetching CAL data for ${words.length} Aramaic words...`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests\n`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Skip very short words
    if (word.replace(/[\u0591-\u05C7]/g, '').length < 2) {
      skipped++;
      continue;
    }

    try {
      const entry = await fetchCalEntry(word);

      if (entry && (entry.definitions.length > 0 || entry.dialects.length > 0)) {
        results[word] = entry;
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }

    // Progress update every 50 words
    if ((i + 1) % 50 === 0 || i === words.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (success / parseFloat(elapsed)).toFixed(1);
      console.log(`  [${i + 1}/${words.length}] Success: ${success}, Failed: ${failed}, Rate: ${rate}/s`);
    }

    // Rate limiting
    await delay(RATE_LIMIT_MS);
  }

  // Create output
  const output = {
    _meta: {
      source: 'CAL (Comprehensive Aramaic Lexicon)',
      institution: 'Hebrew Union College',
      url: 'https://cal.huc.edu',
      fetchedAt: new Date().toISOString(),
      totalAttempted: words.length,
      totalSuccess: success,
      totalFailed: failed,
      totalSkipped: skipped,
      successRate: `${((success / words.length) * 100).toFixed(1)}%`,
      note: 'DJBA/DJPA equivalent scholarly Aramaic data'
    },
    entries: results
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n✅ CAL Fetch Complete!');
  console.log('========================');
  console.log(`Total attempted: ${words.length}`);
  console.log(`Successful: ${success} (${((success / words.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Duration: ${duration}s`);
  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  batchFetchCAL().catch(console.error);
}

module.exports = { batchFetchCAL, fetchCalEntry, hebrewToCAL };
