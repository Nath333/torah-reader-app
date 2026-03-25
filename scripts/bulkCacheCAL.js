/**
 * CAL Bulk Cache Script
 * ======================
 * Pre-fetches Aramaic vocabulary from CAL (Comprehensive Aramaic Lexicon)
 * for offline use in the Torah Reader app.
 *
 * This script:
 * 1. Extracts unique Aramaic roots from Jastrow Complete
 * 2. Queries the CAL API for each root
 * 3. Caches results to a local JSON file
 *
 * IMPORTANT: This script must be run respectfully with rate limiting
 * to avoid overwhelming the CAL server (Hebrew Union College).
 *
 * Usage: node scripts/bulkCacheCAL.js [--limit=100] [--delay=2000]
 *
 * Options:
 *   --limit=N   Maximum number of words to fetch (default: all)
 *   --delay=N   Delay between requests in ms (default: 1500)
 *   --resume    Resume from last position
 *   --test      Test mode: only fetch 10 words
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Paths
const JASTROW_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const JASTROW_EXTRACTED_PATH = path.join(__dirname, '../public/data/etymology_jastrow_extracted.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/cal_enriched.json');
const PROGRESS_PATH = path.join(__dirname, '../.cal_progress.json');

// CAL API URL
const CAL_BASE_URL = 'https://cal.huc.edu';

// Hebrew to CAL transliteration
const HEBREW_TO_CAL = {
  'א': ')', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'w', 'ז': 'z', 'ח': 'x', 'ט': 'T', 'י': 'y',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '(', 'פ': 'p',
  'ף': 'p', 'צ': 'c', 'ץ': 'c', 'ק': 'q', 'ר': 'r',
  'ש': '$', 'ת': 't',
};

// Parse command line args
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultVal;
};

const CONFIG = {
  limit: getArg('limit', null),
  delay: parseInt(getArg('delay', '1500'), 10),
  resume: args.includes('--resume'),
  test: args.includes('--test'),
};

if (CONFIG.test) {
  CONFIG.limit = 10;
  CONFIG.delay = 500;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clean Hebrew word - remove niqqud and special chars
 */
function cleanWord(word) {
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove niqqud
    .replace(/[^\u05D0-\u05EA]/g, '') // Keep only Hebrew letters
    .trim();
}

/**
 * Convert Hebrew to CAL transliteration
 */
function hebrewToCal(word) {
  const cleaned = cleanWord(word);
  return [...cleaned].map(c => HEBREW_TO_CAL[c] || c).join('');
}

/**
 * Simple HTTPS GET request
 */
function httpsGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TorahReaderApp/1.0 (Academic research tool)',
        'Accept': 'text/html',
      },
      timeout,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse CAL HTML response to extract definitions
 */
function parseCalResponse(html, word) {
  if (!html || html.includes('BAD LEMMA REQUEST') || html.includes('No results')) {
    return null;
  }

  const entry = {
    word,
    source: 'CAL',
    definitions: [],
    dialects: [],
    partOfSpeech: null,
    headword: null,
  };

  // Extract headword
  const headMatch = html.match(/<span[^>]*class="[^"]*head[^"]*"[^>]*>([^<]+)/i) ||
                    html.match(/<h[1-3][^>]*>([^<]+)</i);
  if (headMatch) {
    entry.headword = headMatch[1].trim();
  }

  // Extract part of speech
  const posMatch = html.match(/\b(n\.m\.|n\.f\.|n\.|v\.|adj\.|adv\.|prep\.|conj\.)/i);
  if (posMatch) {
    entry.partOfSpeech = posMatch[1];
  }

  // Extract meanings
  const meaningPatterns = [
    /"([^"]{3,100})"/g,
    /(?:n\.m?\.|n\.f\.|v\.|adj\.)[^"]*"([^"]+)"/gi,
    /meaning[:\s]+([^<,;]{3,60})/gi,
  ];

  const seen = new Set();
  for (const pattern of meaningPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(html)) !== null) {
      const meaning = (match[1] || '').trim()
        .replace(/<[^>]+>/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .trim();

      if (meaning.length >= 3 && meaning.length <= 100 && !seen.has(meaning.toLowerCase())) {
        seen.add(meaning.toLowerCase());
        entry.definitions.push(meaning);
      }
    }
    if (entry.definitions.length >= 5) break;
  }

  // Extract dialects
  const dialectMap = {
    'JBA': 'Jewish Babylonian Aramaic',
    'JPA': 'Jewish Palestinian Aramaic',
    'Syr': 'Syriac',
    'BibAram': 'Biblical Aramaic',
    'Targ': 'Targumic',
  };

  for (const [code, name] of Object.entries(dialectMap)) {
    if (html.includes(code)) {
      entry.dialects.push({ code, name });
    }
  }

  return entry.definitions.length > 0 ? entry : null;
}

/**
 * Fetch a single word from CAL
 */
async function fetchCalEntry(word, calForm) {
  const posCodes = ['V', 'N', 'A', ''];

  for (const pos of posCodes) {
    try {
      const lemmaParam = pos ? `${calForm}+${pos}` : calForm;
      const url = `${CAL_BASE_URL}/oneentry.php?lemma=${encodeURIComponent(lemmaParam)}&cits=all`;

      const response = await httpsGet(url);

      if (response.status === 200) {
        const entry = parseCalResponse(response.data, word);
        if (entry && entry.definitions.length > 0) {
          entry.calTransliteration = calForm;
          entry.posCode = pos || 'any';
          return entry;
        }
      }
    } catch (err) {
      // Try next POS code
    }
  }

  return null;
}

// =============================================================================
// MAIN EXTRACTION
// =============================================================================

/**
 * Extract unique Aramaic words from Jastrow
 */
function extractAramaicWords() {
  console.log('Loading Jastrow data...');

  // Try extracted data first (has isAramaic flag)
  let aramaicWords = new Set();

  if (fs.existsSync(JASTROW_EXTRACTED_PATH)) {
    const extracted = JSON.parse(fs.readFileSync(JASTROW_EXTRACTED_PATH, 'utf8'));
    const entries = extracted.entries || {};

    for (const [word, entry] of Object.entries(entries)) {
      if (entry.isAramaic && cleanWord(word).length >= 2) {
        aramaicWords.add(cleanWord(word));
      }
    }

    console.log(`Found ${aramaicWords.size} Aramaic words from extracted data`);
  }

  // Supplement with Jastrow Complete
  if (fs.existsSync(JASTROW_PATH)) {
    const jastrow = JSON.parse(fs.readFileSync(JASTROW_PATH, 'utf8'));

    for (const [word, entry] of Object.entries(jastrow)) {
      const cleaned = cleanWord(word);
      if (cleaned.length >= 2) {
        // Check indicators of Aramaic
        const def = entry.definition || '';
        const isAramaic =
          entry.isAramaic === true ||
          /^ch\./i.test(def) ||
          /emphatic state/i.test(def) ||
          cleaned.endsWith('א') ||  // Emphatic aleph
          cleaned.endsWith('תא');    // Feminine emphatic

        if (isAramaic) {
          aramaicWords.add(cleaned);
        }
      }
    }

    console.log(`Total Aramaic words: ${aramaicWords.size}`);
  }

  return Array.from(aramaicWords).sort();
}

/**
 * Load previous progress
 */
function loadProgress() {
  if (CONFIG.resume && fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  }
  return { lastIndex: 0, results: {} };
}

/**
 * Save progress
 */
function saveProgress(index, results) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ lastIndex: index, results }, null, 2));
}

/**
 * Main function
 */
async function main() {
  console.log('\n=== CAL Bulk Cache Script ===\n');
  console.log(`Config: limit=${CONFIG.limit || 'all'}, delay=${CONFIG.delay}ms, resume=${CONFIG.resume}`);

  // Extract Aramaic words
  const aramaicWords = extractAramaicWords();

  if (aramaicWords.length === 0) {
    console.error('No Aramaic words found!');
    process.exit(1);
  }

  // Load previous progress
  const progress = loadProgress();
  const results = progress.results;
  let startIndex = CONFIG.resume ? progress.lastIndex : 0;
  let endIndex = CONFIG.limit ? Math.min(startIndex + parseInt(CONFIG.limit), aramaicWords.length) : aramaicWords.length;

  console.log(`\nProcessing ${endIndex - startIndex} words (${startIndex + 1} to ${endIndex} of ${aramaicWords.length})`);
  console.log('Press Ctrl+C to pause and save progress\n');

  // Stats
  let found = 0;
  let notFound = 0;
  let errors = 0;

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\nInterrupted! Saving progress...');
    saveProgress(startIndex + found + notFound, results);
    console.log(`Progress saved at index ${startIndex + found + notFound}`);
    process.exit(0);
  });

  // Process words
  for (let i = startIndex; i < endIndex; i++) {
    const word = aramaicWords[i];
    const calForm = hebrewToCal(word);

    if (results[word]) {
      // Skip already fetched
      continue;
    }

    try {
      process.stdout.write(`[${i + 1}/${endIndex}] ${word} (${calForm})... `);

      const entry = await fetchCalEntry(word, calForm);

      if (entry) {
        results[word] = entry;
        found++;
        console.log(`FOUND: ${entry.definitions[0]?.substring(0, 40) || '?'}...`);
      } else {
        results[word] = { word, notFound: true };
        notFound++;
        console.log('not found');
      }

    } catch (err) {
      errors++;
      console.log(`ERROR: ${err.message}`);
    }

    // Rate limiting
    await sleep(CONFIG.delay);

    // Save progress every 50 entries
    if ((found + notFound) % 50 === 0) {
      saveProgress(i + 1, results);
    }
  }

  // Final save
  const output = {
    _meta: {
      source: 'Comprehensive Aramaic Lexicon (Hebrew Union College)',
      extractedAt: new Date().toISOString(),
      totalWords: Object.keys(results).length,
      found: Object.values(results).filter(r => !r.notFound).length,
      notFound: Object.values(results).filter(r => r.notFound).length,
      sourceUrl: 'https://cal.huc.edu',
      license: 'Academic use - Hebrew Union College',
      note: 'Cached for offline scholarly research',
    },
    entries: results,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Clean up progress file
  if (fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total processed: ${found + notFound + errors}`);
  console.log(`Found in CAL: ${found}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
