/**
 * Wiktionary Proto-Semitic Etymology Extraction Script
 * =====================================================
 * Fetches Proto-Semitic reconstructions from Wiktionary for Hebrew words.
 *
 * Wiktionary provides modern scholarly consensus on etymologies including:
 * - Proto-Semitic reconstructions (*root)
 * - Cognates in other Semitic languages
 * - References to HALOT, BDB, and other scholarly sources
 *
 * Usage: node scripts/extractWiktionaryEtymology.js [--limit=100] [--delay=1000]
 *
 * License: CC-BY-SA (attribution required)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Paths
const BDB_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/etymology_wiktionary.json');
const PROGRESS_PATH = path.join(__dirname, '../.wiktionary_progress.json');

// Wiktionary API
const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';

// Parse command line args
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultVal;
};

const CONFIG = {
  limit: getArg('limit', null),
  delay: parseInt(getArg('delay', '1000'), 10),
  resume: args.includes('--resume'),
  test: args.includes('--test'),
};

if (CONFIG.test) {
  CONFIG.limit = 20;
  CONFIG.delay = 500;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clean Hebrew word - remove niqqud
 */
function cleanWord(word) {
  return word
    .replace(/[\u0591-\u05C7]/g, '')
    .trim();
}

/**
 * HTTPS GET request
 */
function httpsGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TorahReaderApp/1.0 (Academic research; contact: github.com/torah-reader-app)',
        'Accept': 'application/json',
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
 * Fetch Wiktionary page content via API
 */
async function fetchWiktionaryPage(word) {
  const params = new URLSearchParams({
    action: 'query',
    titles: word,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    rvslots: 'main',
  });

  const url = `${WIKTIONARY_API}?${params.toString()}`;

  try {
    const response = await httpsGet(url);
    if (response.status !== 200) return null;

    const data = JSON.parse(response.data);
    const pages = data.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Page doesn't exist

    const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
    return content;
  } catch (err) {
    return null;
  }
}

/**
 * Parse Proto-Semitic reconstruction from Wiktionary content
 */
function parseProtoSemitic(content) {
  if (!content) return null;

  const result = {
    protoSemitic: null,
    cognates: {},
    etymologyText: null,
    references: [],
  };

  // Find Hebrew section
  const hebrewSection = content.match(/==Hebrew==([\s\S]*?)(?=\n==[^=]|$)/);
  if (!hebrewSection) return null;

  const hebrewContent = hebrewSection[1] || hebrewSection[0];

  // Extract etymology section - check for different header levels
  let etymologyText = '';
  const etymologyPatterns = [
    /===Etymology(?:\s*\d*)?===\n([\s\S]*?)(?=\n===|$)/i,
    /====Etymology====\n([\s\S]*?)(?=\n====|$)/i,
  ];

  for (const pattern of etymologyPatterns) {
    const match = hebrewContent.match(pattern);
    if (match) {
      etymologyText = match[1];
      break;
    }
  }

  // Clean up etymology text for display
  if (etymologyText) {
    result.etymologyText = etymologyText.trim()
      .replace(/\{\{[^}]*\}\}/g, '') // Remove templates
      .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, '$1') // Simplify links
      .replace(/'''?/g, '')
      .replace(/\n+/g, ' ')
      .substring(0, 500)
      .trim();
  }

  // Extract Proto-Semitic reconstruction from wiki templates
  // Pattern: {{inh|he|sem-pro|*root}} or {{der|he|sem-pro|*root}}
  const psTemplatePatterns = [
    /\{\{(?:inh|der)\|he\|sem-pro\|(\*?[^|}]+)/g,
    /\{\{(?:inh|der)\|hbo?\|sem-pro\|(\*?[^|}]+)/g,  // hbo = Biblical Hebrew
  ];

  for (const pattern of psTemplatePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(hebrewContent);
    if (match && match[1]) {
      let root = match[1].trim();
      // Ensure asterisk prefix for reconstruction
      if (!root.startsWith('*')) {
        root = '*' + root;
      }
      result.protoSemitic = root;
      break;
    }
  }

  // Extract cognates
  const cognatePatterns = {
    akkadian: [
      /\{\{cog\|akk\|([^|}]+)/gi,
      /Akkadian\s+([א-תa-zA-Z]+)/gi,
    ],
    arabic: [
      /\{\{cog\|ar\|([^|}]+)/gi,
      /Arabic\s+([ا-ي]+)/gi,
    ],
    ugaritic: [
      /\{\{cog\|uga\|([^|}]+)/gi,
      /Ugaritic\s+([a-zA-Z]+)/gi,
    ],
    aramaic: [
      /\{\{cog\|arc\|([^|}]+)/gi,
      /\{\{cog\|syc\|([^|}]+)/gi,
      /Aramaic\s+([א-ת]+)/gi,
    ],
    ethiopic: [
      /\{\{cog\|gez\|([^|}]+)/gi,
      /Ge['']ez\s+([a-zA-Z]+)/gi,
    ],
    phoenician: [
      /\{\{cog\|phn\|([^|}]+)/gi,
    ],
  };

  for (const [lang, patterns] of Object.entries(cognatePatterns)) {
    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(hebrewContent)) !== null) {
        if (!result.cognates[lang]) {
          result.cognates[lang] = [];
        }
        const word = match[1].trim();
        if (word && !result.cognates[lang].includes(word)) {
          result.cognates[lang].push(word);
        }
      }
    }
  }

  // Check if we found anything useful
  if (!result.protoSemitic && Object.keys(result.cognates).length === 0) {
    return null;
  }

  return result;
}

// =============================================================================
// MAIN EXTRACTION
// =============================================================================

/**
 * Get Hebrew words to look up
 */
function getWordsToLookup() {
  console.log('Loading BDB extracted data...');

  if (!fs.existsSync(BDB_PATH)) {
    console.error('BDB extracted file not found. Run extractBDBEtymologyEnhanced.js first.');
    process.exit(1);
  }

  const bdb = JSON.parse(fs.readFileSync(BDB_PATH, 'utf8'));
  const entries = bdb.entries || {};

  // Get words that have cognates (most likely to have Wiktionary entries)
  const words = Object.keys(entries)
    .filter(w => {
      const entry = entries[w];
      return entry.etymology?.cognates && Object.keys(entry.etymology.cognates).length > 0;
    })
    .map(w => cleanWord(w))
    .filter(w => w.length >= 2);

  // Also include high-frequency biblical words
  const highFreqWords = [
    'אב', 'אם', 'בן', 'בת', 'איש', 'אשה', 'אדם', 'ארץ', 'שמים',
    'יום', 'לילה', 'מים', 'אש', 'רוח', 'לב', 'יד', 'עין', 'פה',
    'אמר', 'ידע', 'ראה', 'שמע', 'הלך', 'בוא', 'נתן', 'לקח', 'עשה',
    'מלך', 'עבד', 'קדש', 'ברך', 'חיה', 'מות', 'אהב', 'שנא',
    'טוב', 'רע', 'גדול', 'קטן', 'חדש', 'ישן', 'עולם',
    'אל', 'אלהים', 'יהוה', 'שם', 'דבר', 'תורה', 'משפט', 'צדק',
  ];

  for (const w of highFreqWords) {
    if (!words.includes(w)) {
      words.push(w);
    }
  }

  console.log(`Found ${words.length} words to look up`);
  return [...new Set(words)].sort();
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
  console.log('\n=== Wiktionary Proto-Semitic Extraction ===\n');
  console.log(`Config: limit=${CONFIG.limit || 'all'}, delay=${CONFIG.delay}ms, resume=${CONFIG.resume}`);

  // Get words to look up
  const words = getWordsToLookup();

  if (words.length === 0) {
    console.error('No words to look up!');
    process.exit(1);
  }

  // Load previous progress
  const progress = loadProgress();
  const results = progress.results;
  let startIndex = CONFIG.resume ? progress.lastIndex : 0;
  let endIndex = CONFIG.limit ? Math.min(startIndex + parseInt(CONFIG.limit), words.length) : words.length;

  console.log(`\nProcessing ${endIndex - startIndex} words (${startIndex + 1} to ${endIndex} of ${words.length})`);
  console.log('Press Ctrl+C to pause and save progress\n');

  // Stats
  let found = 0;
  let withProtoSemitic = 0;
  let withCognates = 0;
  let notFound = 0;

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\nInterrupted! Saving progress...');
    saveProgress(startIndex + found + notFound, results);
    console.log(`Progress saved at index ${startIndex + found + notFound}`);
    process.exit(0);
  });

  // Process words
  for (let i = startIndex; i < endIndex; i++) {
    const word = words[i];

    if (results[word]) {
      continue; // Skip already fetched
    }

    try {
      process.stdout.write(`[${i + 1}/${endIndex}] ${word}... `);

      const content = await fetchWiktionaryPage(word);

      if (content) {
        const etymology = parseProtoSemitic(content);

        if (etymology) {
          results[word] = {
            word,
            ...etymology,
            source: 'Wiktionary',
            license: 'CC-BY-SA',
          };
          found++;

          if (etymology.protoSemitic) {
            withProtoSemitic++;
            console.log(`PS: ${etymology.protoSemitic}`);
          } else if (Object.keys(etymology.cognates).length > 0) {
            withCognates++;
            console.log(`cognates: ${Object.keys(etymology.cognates).join(', ')}`);
          } else {
            console.log('found (no PS)');
          }
        } else {
          results[word] = { word, notFound: true };
          notFound++;
          console.log('no etymology');
        }
      } else {
        results[word] = { word, notFound: true };
        notFound++;
        console.log('no page');
      }

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results[word] = { word, error: err.message };
    }

    // Rate limiting (Wiktionary rate limit is ~200 requests/min)
    await sleep(CONFIG.delay);

    // Save progress every 50 entries
    if ((found + notFound) % 50 === 0) {
      saveProgress(i + 1, results);
    }
  }

  // Final save
  const output = {
    _meta: {
      source: 'English Wiktionary',
      extractedAt: new Date().toISOString(),
      totalWords: Object.keys(results).length,
      found: Object.values(results).filter(r => !r.notFound && !r.error).length,
      withProtoSemitic,
      withCognates,
      notFound: Object.values(results).filter(r => r.notFound).length,
      sourceUrl: 'https://en.wiktionary.org',
      license: 'CC-BY-SA 3.0',
      attribution: 'Data from Wiktionary, the free dictionary. Licensed under CC-BY-SA.',
      note: 'Proto-Semitic reconstructions and cognates from scholarly community',
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
  console.log(`Total processed: ${found + notFound}`);
  console.log(`Found entries: ${found}`);
  console.log(`With Proto-Semitic: ${withProtoSemitic}`);
  console.log(`With cognates only: ${withCognates}`);
  console.log(`Not found: ${notFound}`);
  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
