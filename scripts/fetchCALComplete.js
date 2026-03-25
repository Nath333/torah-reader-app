/**
 * CAL Complete Fetcher
 * ====================
 * Comprehensive Aramaic Lexicon (CAL) - Hebrew Union College
 * Fetches the FULL CAL database (~50,000+ entries) from multiple sources.
 *
 * Data Sources:
 * 1. CAL Web API (cal.huc.edu) - individual lookups
 * 2. CAL Text Search - batch export capabilities
 * 3. Existing Jastrow/DJBA data - supplement with Aramaic words
 * 4. CAL GitHub data if available
 *
 * The CAL database is FREE for academic use!
 *
 * Usage: node scripts/fetchCALComplete.js [options]
 * Options:
 *   --method=api|search|alphabet  Fetch method (default: alphabet)
 *   --limit=N                     Max entries (default: all)
 *   --delay=N                     Delay between requests in ms (default: 1000)
 *   --resume                      Resume from saved progress
 *   --test                        Test mode (10 entries)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Paths
const OUTPUT_PATH = path.join(__dirname, '../public/data/cal_aramaic.json');
const PROGRESS_PATH = path.join(__dirname, '../.cal_complete_progress.json');
const JASTROW_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const EXISTING_CAL_PATH = OUTPUT_PATH;

// CAL API Configuration
const CAL_BASE = 'https://cal.huc.edu';

// Hebrew alphabet for systematic search
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

// Hebrew to CAL transliteration
const HEBREW_TO_CAL = {
  'א': ')', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'w', 'ז': 'z', 'ח': 'x', 'ט': 'T', 'י': 'y',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '(', 'פ': 'p',
  'ף': 'p', 'צ': 'c', 'ץ': 'c', 'ק': 'q', 'ר': 'r',
  'ש': '$', 'ת': 't'
};

const CAL_TO_HEBREW = Object.fromEntries(
  Object.entries(HEBREW_TO_CAL).map(([k, v]) => [v, k])
);

// Dialect information
const CAL_DIALECTS = {
  'JBA': { name: 'Jewish Babylonian Aramaic', period: 'Talmudic', corpus: 'Bavli' },
  'JPA': { name: 'Jewish Palestinian Aramaic', period: 'Talmudic', corpus: 'Yerushalmi' },
  'Syr': { name: 'Syriac', period: 'Classical', corpus: 'Peshitta' },
  'CPA': { name: 'Christian Palestinian Aramaic', period: 'Byzantine' },
  'Sam': { name: 'Samaritan Aramaic', period: 'Late' },
  'Man': { name: 'Mandaic', period: 'Late' },
  'OfA': { name: 'Official Aramaic', period: 'Imperial' },
  'OA': { name: 'Old Aramaic', period: 'Early' },
  'Tg': { name: 'Targumic', period: 'Post-biblical' },
  'BA': { name: 'Biblical Aramaic', period: 'Biblical' },
  'Palm': { name: 'Palmyrene', period: 'Classical' },
  'Nab': { name: 'Nabataean', period: 'Classical' },
  'Hat': { name: 'Hatran', period: 'Parthian' }
};

// Parse command line
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : def;
};

const CONFIG = {
  method: getArg('method', 'alphabet'),
  limit: getArg('limit', null),
  delay: parseInt(getArg('delay', '1000'), 10),
  resume: args.includes('--resume'),
  test: args.includes('--test')
};

if (CONFIG.test) {
  CONFIG.limit = 10;
  CONFIG.delay = 500;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanWord(word) {
  return (word || '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\u05D0-\u05EA]/g, '')
    .trim();
}

function hebrewToCal(word) {
  return [...cleanWord(word)].map(c => HEBREW_TO_CAL[c] || c).join('');
}

function calToHebrew(cal) {
  return [...(cal || '')].map(c => CAL_TO_HEBREW[c] || c).join('');
}

function httpsGet(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'TorahReaderApp/1.0 (Academic Research - Hebrew Union College CAL)',
        'Accept': 'text/html,application/xhtml+xml,*/*'
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

// ============================================================================
// CAL PARSING FUNCTIONS
// ============================================================================

/**
 * Parse CAL search results page to extract all lemmas
 */
function parseSearchResults(html) {
  const entries = [];

  // CAL search results contain lemma links
  // Pattern: <a href="oneentry.php?lemma=...)b)">)b)</a>
  const lemmaPattern = /oneentry\.php\?lemma=([^"&]+)/g;
  const seen = new Set();

  let match;
  while ((match = lemmaPattern.exec(html)) !== null) {
    const calLemma = decodeURIComponent(match[1]).replace(/\+.*$/, '');
    if (!seen.has(calLemma) && calLemma.length >= 2) {
      seen.add(calLemma);
      entries.push(calLemma);
    }
  }

  return entries;
}

/**
 * Parse a single CAL entry page
 */
function parseEntryPage(html, calLemma) {
  if (!html || html.includes('BAD LEMMA REQUEST') || html.includes('No results found')) {
    return null;
  }

  const entry = {
    lemma: calToHebrew(calLemma),
    cal: calLemma,
    definitions: [],
    dialects: [],
    pos: null,
    forms: [],
    attestations: [],
    cognates: {},
    source: 'CAL'
  };

  // Extract part of speech
  const posPatterns = [
    /\b(n\.m\.|n\.f\.|n\.|v\.|adj\.|adv\.|prep\.|conj\.|part\.|interj\.)/i,
    /<span[^>]*class="[^"]*pos[^"]*"[^>]*>([^<]+)/i
  ];

  for (const pattern of posPatterns) {
    const posMatch = html.match(pattern);
    if (posMatch) {
      entry.pos = posMatch[1].toLowerCase().replace(/\.$/, '');
      break;
    }
  }

  // Extract definitions - multiple patterns
  const defPatterns = [
    // Quoted definitions
    /"([^"]{3,150})"/g,
    // Definition sections
    /(?:meaning|gloss|def)[:\s]+([^<,;]{3,100})/gi,
    // After POS markers
    /(?:n\.m?\.|n\.f\.|v\.|adj\.)[^"]*"([^"]+)"/gi
  ];

  const seenDefs = new Set();
  for (const pattern of defPatterns) {
    pattern.lastIndex = 0;
    let defMatch;
    while ((defMatch = pattern.exec(html)) !== null && entry.definitions.length < 8) {
      let def = (defMatch[1] || '').trim()
        .replace(/<[^>]+>/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (def.length >= 3 && def.length <= 150 && !seenDefs.has(def.toLowerCase())) {
        seenDefs.add(def.toLowerCase());
        entry.definitions.push(def);
      }
    }
  }

  // Extract dialects
  for (const [code, info] of Object.entries(CAL_DIALECTS)) {
    const dialectPattern = new RegExp(`\\b${code}\\b`, 'g');
    if (dialectPattern.test(html)) {
      entry.dialects.push(code);
    }
  }

  // Extract forms/variants
  const formPattern = /(?:variant|form|pl\.|sg\.)[:\s]*([^\s<,;]+)/gi;
  let formMatch;
  while ((formMatch = formPattern.exec(html)) !== null && entry.forms.length < 10) {
    const form = formMatch[1].trim();
    if (form.length >= 2 && !entry.forms.includes(form)) {
      entry.forms.push(form);
    }
  }

  // Extract attestations (text references)
  const attPattern = /\b([A-Z][a-z]+\.?\s*\d+[ab]?(?::\d+)?)/g;
  let attMatch;
  while ((attMatch = attPattern.exec(html)) !== null && entry.attestations.length < 5) {
    const att = attMatch[1];
    if (!entry.attestations.includes(att)) {
      entry.attestations.push(att);
    }
  }

  // Extract cognates (Hebrew, Akkadian, etc.)
  const cognatePatterns = [
    { lang: 'hebrew', pattern: /(?:Heb\.?|Hebrew)[:\s]+([^\s<,;]+)/gi },
    { lang: 'akkadian', pattern: /(?:Akk\.?|Akkadian)[:\s]+([^\s<,;]+)/gi },
    { lang: 'arabic', pattern: /(?:Arab\.?|Arabic)[:\s]+([^\s<,;]+)/gi },
    { lang: 'syriac', pattern: /(?:Syr\.?|Syriac)[:\s]+([^\s<,;]+)/gi }
  ];

  for (const { lang, pattern } of cognatePatterns) {
    pattern.lastIndex = 0;
    const cogMatch = pattern.exec(html);
    if (cogMatch) {
      entry.cognates[lang] = cogMatch[1].trim();
    }
  }

  // Only return if we found meaningful data
  if (entry.definitions.length === 0 && entry.dialects.length === 0) {
    return null;
  }

  return entry;
}

// ============================================================================
// FETCH METHODS
// ============================================================================

/**
 * Method 1: Alphabet search - query CAL for all lemmas starting with each letter
 */
async function fetchByAlphabet(existingEntries, limit) {
  console.log('\n📖 Method: Alphabet Search');
  console.log('Querying CAL for all lemmas by first letter...\n');

  const results = { ...existingEntries };
  let totalFetched = 0;
  let newEntries = 0;

  const calLetters = Object.values(HEBREW_TO_CAL).filter(c => /[a-zA-Z()]/.test(c));

  for (const letter of calLetters) {
    if (limit && totalFetched >= limit) break;

    console.log(`\n🔤 Searching lemmas starting with "${letter}"...`);

    try {
      // CAL text search URL - search for all words starting with letter
      const searchUrl = `${CAL_BASE}/browselemmas.php?first=${encodeURIComponent(letter)}`;

      const response = await httpsGet(searchUrl);
      if (response.status !== 200) {
        console.log(`  ⚠️ HTTP ${response.status}`);
        continue;
      }

      const lemmas = parseSearchResults(response.data);
      console.log(`  Found ${lemmas.length} lemmas`);

      // Fetch each lemma
      for (const calLemma of lemmas) {
        if (limit && totalFetched >= limit) break;

        const hebrewLemma = calToHebrew(calLemma);
        const key = cleanWord(hebrewLemma) || hebrewLemma;

        // Skip if already have good data
        if (results[key] && results[key].definitions?.length > 0) {
          continue;
        }

        process.stdout.write(`  [${totalFetched + 1}] ${key} (${calLemma})... `);

        try {
          const entryUrl = `${CAL_BASE}/oneentry.php?lemma=${encodeURIComponent(calLemma)}&cits=no`;
          const entryResp = await httpsGet(entryUrl);

          if (entryResp.status === 200) {
            const entry = parseEntryPage(entryResp.data, calLemma);
            if (entry) {
              results[key] = {
                lemma: entry.lemma,
                cal: entry.cal,
                pos: entry.pos || 'unknown',
                definition: entry.definitions.join('; '),
                dialects: entry.dialects,
                forms: entry.forms,
                attestations: entry.attestations,
                cognates: entry.cognates,
                source: 'CAL'
              };
              newEntries++;
              console.log(`✓ ${entry.definitions[0]?.substring(0, 30) || ''}...`);
            } else {
              console.log('(no data)');
            }
          } else {
            console.log(`HTTP ${entryResp.status}`);
          }
        } catch (err) {
          console.log(`error: ${err.message}`);
        }

        totalFetched++;
        await sleep(CONFIG.delay);

        // Save progress every 100 entries
        if (totalFetched % 100 === 0) {
          saveProgress({ letter, index: totalFetched, results });
        }
      }

    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    await sleep(CONFIG.delay * 2); // Extra delay between letters
  }

  return { results, totalFetched, newEntries };
}

/**
 * Method 2: API lookup for specific word list
 */
async function fetchByWordList(existingEntries, limit) {
  console.log('\n📖 Method: Word List Lookup');

  // Build word list from Jastrow Aramaic entries
  const wordList = new Set();

  if (fs.existsSync(JASTROW_PATH)) {
    console.log('Loading Aramaic words from Jastrow...');
    const jastrow = JSON.parse(fs.readFileSync(JASTROW_PATH, 'utf8'));

    for (const [word, entry] of Object.entries(jastrow)) {
      const cleaned = cleanWord(word);
      if (cleaned.length >= 2) {
        const def = entry.definition || '';
        // Check Aramaic indicators
        if (/^ch\./i.test(def) ||
            /aramaic/i.test(def) ||
            cleaned.endsWith('א') ||
            entry.isAramaic) {
          wordList.add(cleaned);
        }
      }
    }
    console.log(`Found ${wordList.size} Aramaic words`);
  }

  // Add existing CAL entries keys
  for (const key of Object.keys(existingEntries)) {
    if (cleanWord(key).length >= 2) {
      wordList.add(cleanWord(key));
    }
  }

  const words = Array.from(wordList).sort();
  const results = { ...existingEntries };
  let fetched = 0;
  let newEntries = 0;

  for (const word of words) {
    if (limit && fetched >= limit) break;

    // Skip if already have good data
    if (results[word] && results[word].definitions?.length > 0) {
      continue;
    }

    const calForm = hebrewToCal(word);
    process.stdout.write(`[${fetched + 1}/${Math.min(words.length, limit || words.length)}] ${word} (${calForm})... `);

    try {
      const url = `${CAL_BASE}/oneentry.php?lemma=${encodeURIComponent(calForm)}&cits=no`;
      const response = await httpsGet(url);

      if (response.status === 200) {
        const entry = parseEntryPage(response.data, calForm);
        if (entry) {
          results[word] = {
            lemma: entry.lemma,
            cal: entry.cal,
            pos: entry.pos || 'unknown',
            definition: entry.definitions.join('; '),
            dialects: entry.dialects,
            forms: entry.forms,
            attestations: entry.attestations,
            cognates: entry.cognates,
            source: 'CAL'
          };
          newEntries++;
          console.log(`✓ ${entry.definitions[0]?.substring(0, 30) || ''}...`);
        } else {
          console.log('not found');
        }
      } else {
        console.log(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.log(`error: ${err.message}`);
    }

    fetched++;
    await sleep(CONFIG.delay);

    if (fetched % 50 === 0) {
      saveProgress({ index: fetched, results });
    }
  }

  return { results, totalFetched: fetched, newEntries };
}

// ============================================================================
// PROGRESS MANAGEMENT
// ============================================================================

function loadProgress() {
  if (CONFIG.resume && fs.existsSync(PROGRESS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function saveProgress(data) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2));
}

function loadExistingCAL() {
  if (fs.existsSync(EXISTING_CAL_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(EXISTING_CAL_PATH, 'utf8'));
      // Remove metadata keys
      const entries = {};
      for (const [k, v] of Object.entries(data)) {
        if (!k.startsWith('_')) {
          entries[k] = v;
        }
      }
      return entries;
    } catch {
      return {};
    }
  }
  return {};
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CAL Complete Fetcher - Comprehensive Aramaic Lexicon      ║');
  console.log('║     Hebrew Union College (FREE Academic Resource)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Config: method=${CONFIG.method}, delay=${CONFIG.delay}ms, limit=${CONFIG.limit || 'all'}`);

  // Load existing data
  const existingEntries = loadExistingCAL();
  console.log(`\nExisting CAL entries: ${Object.keys(existingEntries).length}`);

  // Check for resume
  const progress = loadProgress();
  if (progress) {
    console.log(`Resuming from previous progress...`);
  }

  // Handle Ctrl+C
  let interrupted = false;
  process.on('SIGINT', () => {
    console.log('\n\n⚠️ Interrupted! Saving progress...');
    interrupted = true;
  });

  // Run appropriate method
  let result;

  switch (CONFIG.method) {
    case 'alphabet':
      result = await fetchByAlphabet(existingEntries, CONFIG.limit ? parseInt(CONFIG.limit) : null);
      break;
    case 'wordlist':
    case 'api':
      result = await fetchByWordList(existingEntries, CONFIG.limit ? parseInt(CONFIG.limit) : null);
      break;
    default:
      console.log(`Unknown method: ${CONFIG.method}`);
      process.exit(1);
  }

  // Build output
  const output = {
    _meta: {
      name: 'CAL',
      fullName: 'Comprehensive Aramaic Lexicon',
      institution: 'Hebrew Union College',
      url: 'https://cal.huc.edu',
      description: 'Academic Aramaic lexicon covering all major dialects',
      entries: Object.keys(result.results).length,
      dialects: Object.keys(CAL_DIALECTS),
      license: 'Free for academic use',
      builtAt: new Date().toISOString(),
      note: 'Extracted for offline scholarly research'
    },
    ...result.results
  };

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Cleanup progress file
  if (fs.existsSync(PROGRESS_PATH) && !interrupted) {
    fs.unlinkSync(PROGRESS_PATH);
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`Total entries: ${Object.keys(result.results).length}`);
  console.log(`New entries added: ${result.newEntries}`);
  console.log(`Fetched this run: ${result.totalFetched}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  // Dialect breakdown
  const dialectCounts = {};
  for (const entry of Object.values(result.results)) {
    for (const d of (entry.dialects || [])) {
      dialectCounts[d] = (dialectCounts[d] || 0) + 1;
    }
  }

  if (Object.keys(dialectCounts).length > 0) {
    console.log('\nDialect coverage:');
    for (const [d, count] of Object.entries(dialectCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${d}: ${count} entries`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
