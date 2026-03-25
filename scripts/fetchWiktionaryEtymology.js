/**
 * Wiktionary Etymology Batch Fetcher
 * ===================================
 * Scholar Pro: Fetches Proto-Semitic reconstructions and cognate data
 * from Wiktionary for Hebrew/Aramaic words.
 *
 * Wiktionary provides:
 * - Proto-Semitic reconstructions (*ʾab-, *malk-, etc.)
 * - Cognate words from other Semitic languages
 * - Etymology explanations
 * - Root derivations
 *
 * Usage: node scripts/fetchWiktionaryEtymology.js
 * Output: public/data/wiktionary_etymology_cache.json
 *
 * Note: Respects rate limits (500ms between requests)
 */

const fs = require('fs');
const path = require('path');

// Paths
const BDB_EXTRACTED_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');
const ROOT_MEANINGS_PATH = path.join(__dirname, '../public/data/root_meanings_enriched.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/wiktionary_etymology_cache.json');
const PROGRESS_PATH = path.join(__dirname, '../public/data/wiktionary_progress.json');

// Configuration
const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
const RATE_LIMIT_MS = 500; // 500ms between requests
const MAX_ENTRIES = 3000; // Limit for batch run
const TIMEOUT_MS = 10000;
const SAVE_INTERVAL = 50; // Save progress every 50 entries

// Proto-Semitic pattern detection
const PROTO_SEMITIC_PATTERNS = [
  /Proto-Semitic\s+\*([^\s,;.]+)/gi,
  /\*([ʾʿˀˁ]?[a-zA-Z\-āēīōūâêîôûəăĕĭŏŭ]+)/g,
];

// Cognate language patterns
const COGNATE_PATTERNS = {
  akkadian: /Akkadian\s+([^\s,;.()]+(?:\s+[^\s,;.()]+)?)/gi,
  arabic: /Arabic\s+([^\s,;.()]+)/gi,
  aramaic: /Aramaic\s+([^\s,;.()]+)/gi,
  ugaritic: /Ugaritic\s+([^\s,;.()]+)/gi,
  ethiopic: /(?:Ethiopic|Ge'ez)\s+([^\s,;.()]+)/gi,
  phoenician: /Phoenician\s+([^\s,;.()]+)/gi,
  syriac: /Syriac\s+([^\s,;.()]+)/gi,
  amharic: /Amharic\s+([^\s,;.()]+)/gi,
};

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
 * Strip HTML tags from string
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
 * Parse Wiktionary page HTML for etymology
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

  // Find Hebrew section first
  const hebrewSectionMatch = html.match(/<h2[^>]*>.*?Hebrew.*?<\/h2>([\s\S]*?)(?=<h2|$)/i);
  if (!hebrewSectionMatch) {
    // Try Biblical Hebrew
    const biblicalMatch = html.match(/<h2[^>]*>.*?Biblical Hebrew.*?<\/h2>([\s\S]*?)(?=<h2|$)/i);
    if (!biblicalMatch) {
      return null;
    }
    return parseEtymologySection(biblicalMatch[1], word, result);
  }

  return parseEtymologySection(hebrewSectionMatch[1], word, result);
}

/**
 * Parse etymology from a language section
 */
function parseEtymologySection(sectionHtml, word, result) {
  // Find etymology subsection
  const etymologyMatch = sectionHtml.match(/<span[^>]*id="Etymology[^"]*"[^>]*>.*?<\/span>[\s\S]*?<\/h\d>([\s\S]*?)(?=<h[23]|$)/i);

  let etymologyText = '';
  if (etymologyMatch) {
    etymologyText = stripHtml(etymologyMatch[1]).trim();
    result.etymologyText = etymologyText.substring(0, 500);
  } else {
    // Try to find etymology paragraph
    const paraMatch = sectionHtml.match(/<p>([\s\S]*?)<\/p>/i);
    if (paraMatch) {
      etymologyText = stripHtml(paraMatch[1]).trim();
      result.etymologyText = etymologyText.substring(0, 500);
    }
  }

  // Extract Proto-Semitic
  for (const pattern of PROTO_SEMITIC_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(etymologyText);
    if (match && match[1]) {
      result.protoSemitic = match[1].trim();
      break;
    }
  }

  // Also check raw HTML for Proto-Semitic links
  const protoLinkMatch = sectionHtml.match(/Proto-Semitic[^<]*<[^>]*>([^<]*\*[^<]+)<\/a>/i);
  if (protoLinkMatch && !result.protoSemitic) {
    result.protoSemitic = stripHtml(protoLinkMatch[1]).trim();
  }

  // Extract cognates
  for (const [lang, pattern] of Object.entries(COGNATE_PATTERNS)) {
    pattern.lastIndex = 0;
    const matches = [...etymologyText.matchAll(pattern)];
    if (matches.length > 0) {
      result.cognates[lang] = [...new Set(matches.map(m => m[1].trim()).filter(Boolean))];
    }
  }

  // Extract Hebrew root
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
 * Fetch etymology for a single word from Wiktionary
 */
async function fetchWordEtymology(word) {
  const cleanWord = word.replace(/[\u0591-\u05C7]/g, ''); // Remove vowels

  try {
    const url = `${WIKTIONARY_API}?action=parse&page=${encodeURIComponent(cleanWord)}&prop=text&format=json&origin=*`;

    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'Api-User-Agent': 'TorahReaderScholarPro/1.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.error || !data.parse?.text?.['*']) {
      return null;
    }

    const html = data.parse.text['*'];
    return parseWiktionaryEtymology(html, cleanWord);

  } catch (error) {
    // Silent fail - word might not exist in Wiktionary
    return null;
  }
}

/**
 * Get high-priority word list (words with cognates but no Proto-Semitic)
 */
function getWordList() {
  console.log('Loading source data...');

  const words = new Set();

  // Get words from BDB extraction (these have cognates)
  if (fs.existsSync(BDB_EXTRACTED_PATH)) {
    const bdb = JSON.parse(fs.readFileSync(BDB_EXTRACTED_PATH, 'utf8'));
    Object.keys(bdb.entries || {}).forEach(w => words.add(w));
    console.log(`  BDB extracted: ${Object.keys(bdb.entries || {}).length} words`);
  }

  // Get words from root meanings (high-quality entries)
  if (fs.existsSync(ROOT_MEANINGS_PATH)) {
    const roots = JSON.parse(fs.readFileSync(ROOT_MEANINGS_PATH, 'utf8'));
    Object.keys(roots.entries || {}).forEach(w => words.add(w));
    console.log(`  Root meanings: ${Object.keys(roots.entries || {}).length} words`);
  }

  // Convert to array and limit
  const wordList = [...words].slice(0, MAX_ENTRIES);
  console.log(`\nTotal unique words to process: ${wordList.length}`);

  return wordList;
}

/**
 * Load previous progress
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {
      return { processed: [], results: {} };
    }
  }
  return { processed: [], results: {} };
}

/**
 * Save progress
 */
function saveProgress(processed, results) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ processed, results }, null, 2), 'utf8');
}

/**
 * Main batch fetch function
 */
async function batchFetchWiktionary() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       Wiktionary Etymology Batch Fetcher                      ║');
  console.log('║       Scholar Pro: Proto-Semitic Reconstruction Extraction    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const words = getWordList();
  const progress = loadProgress();
  const processedSet = new Set(progress.processed);
  const results = progress.results;

  let success = 0;
  let failed = 0;
  let skipped = 0;
  let protoSemiticFound = 0;

  const startTime = Date.now();
  const toProcess = words.filter(w => !processedSet.has(w));

  console.log(`\nFetching Wiktionary etymology for ${toProcess.length} words...`);
  console.log(`(${processedSet.size} already processed from previous run)`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const word = toProcess[i];

    // Skip very short words
    if (word.replace(/[\u0591-\u05C7]/g, '').length < 2) {
      skipped++;
      progress.processed.push(word);
      continue;
    }

    try {
      const entry = await fetchWordEtymology(word);

      if (entry) {
        results[word] = entry;
        success++;
        if (entry.protoSemitic) {
          protoSemiticFound++;
        }
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }

    progress.processed.push(word);

    // Progress update every 50 words
    if ((i + 1) % 50 === 0 || i === toProcess.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (success / Math.max(1, parseFloat(elapsed))).toFixed(2);
      console.log(`  [${i + 1}/${toProcess.length}] Success: ${success}, Proto-Semitic: ${protoSemiticFound}, Rate: ${rate}/s`);
    }

    // Save progress periodically
    if ((i + 1) % SAVE_INTERVAL === 0) {
      saveProgress(progress.processed, results);
    }

    // Rate limiting
    await delay(RATE_LIMIT_MS);
  }

  // Final save
  saveProgress(progress.processed, results);

  // Create output
  const output = {
    _meta: {
      source: 'Wiktionary (English Edition)',
      url: 'https://en.wiktionary.org',
      fetchedAt: new Date().toISOString(),
      totalAttempted: toProcess.length,
      totalSuccess: success,
      totalFailed: failed,
      totalSkipped: skipped,
      protoSemiticFound,
      successRate: `${((success / Math.max(1, toProcess.length)) * 100).toFixed(1)}%`,
      protoSemiticRate: `${((protoSemiticFound / Math.max(1, success)) * 100).toFixed(1)}%`,
      note: 'Proto-Semitic reconstructions and cognate data'
    },
    entries: results
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Clean up progress file
  if (fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n✅ Wiktionary Etymology Fetch Complete!');
  console.log('==========================================');
  console.log(`Total attempted: ${toProcess.length}`);
  console.log(`Successful: ${success} (${((success / Math.max(1, toProcess.length)) * 100).toFixed(1)}%)`);
  console.log(`Proto-Semitic found: ${protoSemiticFound} (${((protoSemiticFound / Math.max(1, success)) * 100).toFixed(1)}% of successes)`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Duration: ${duration}s`);
  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  // Show sample Proto-Semitic entries
  const protoEntries = Object.entries(results).filter(([_, v]) => v.protoSemitic).slice(0, 5);
  if (protoEntries.length > 0) {
    console.log('\nSample Proto-Semitic reconstructions:');
    protoEntries.forEach(([word, data]) => {
      console.log(`  ${word}: *${data.protoSemitic}`);
    });
  }

  return output;
}

// Run if called directly
if (require.main === module) {
  batchFetchWiktionary().catch(console.error);
}

module.exports = { batchFetchWiktionary, fetchWordEtymology };
