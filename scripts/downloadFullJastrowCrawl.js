/**
 * Download COMPLETE Jastrow Dictionary (~30,000 entries) from Sefaria
 * Uses sequential navigation (next/prev links) to traverse ALL entries
 *
 * Run with: node scripts/downloadFullJastrowCrawl.js
 *
 * This crawls through every entry in Jastrow by following the 'next' links.
 * Progress is saved automatically - can resume if interrupted.
 *
 * Estimated time: ~2-3 hours (30,000 entries × ~300ms per request)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, '..', 'src', 'data'),
  progressFile: path.join(__dirname, 'jastrow_crawl_progress.json'),
  outputFile: 'jastrowFull.js',
  jsonOutputFile: 'jastrowFull.json',
  delayMs: 200,        // Delay between requests (be nice to server)
  saveEvery: 500,      // Save progress every N entries
  maxRetries: 5,
  startRef: 'Jastrow, א 1',  // First entry in the dictionary
};

const stats = {
  total: 0,
  errors: 0,
  skipped: 0,
  startTime: Date.now(),
};

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const waitTime = Math.pow(2, i + 1) * 1000; // Exponential backoff
        console.log(`  Rate limited, waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      const waitTime = Math.pow(2, i) * 500;
      console.log(`  Retry ${i + 1}/${retries} after ${waitTime}ms: ${err.message}`);
      await sleep(waitTime);
    }
  }
  return null;
}

/**
 * Clean Hebrew word (remove nikud/cantillation)
 */
function cleanWord(word) {
  if (!word) return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '')  // Remove nikud/cantillation
    .replace(/[^\u05D0-\u05EA]/g, '') // Keep only Hebrew letters
    .trim();
}

/**
 * Extract headword from Sefaria reference
 * e.g., "Jastrow, אָב 1" -> "אָב"
 */
function extractHeadword(ref) {
  if (!ref) return null;
  // Pattern: "Jastrow, HEADWORD [NUMBER]"
  const match = ref.match(/Jastrow,\s*([^\d]+)/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Clean definition text from HTML and scholarly references
 */
function cleanDefinition(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove HTML tags but preserve content
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  // Remove excessive Talmudic references for brevity
  cleaned = cleaned
    .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s;]+/gi, '')
    .replace(/\bY\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d,\s]*\d*[a-dᵃᵇᶜᵈ]?\s*/gi, '')
    .replace(/\bB\.\s*[A-Za-z]+\.?\s*\d+[ab]?\s*/gi, '')
    .replace(/\bGen\.\s*R\.\s*[^;.]+/gi, '')
    .replace(/\bEx\.\s*R\.\s*[^;.]+/gi, '')
    .replace(/\bLev\.\s*R\.\s*[^;.]+/gi, '')
    .replace(/\bNum\.\s*R\.\s*[^;.]+/gi, '')
    .replace(/\bDeut\.\s*R\.\s*[^;.]+/gi, '')
    .replace(/\b[A-Z][a-z]+\.\s*\d+[ab]?\s*(sq\.)?;?\s*/gi, '')
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
    .replace(/\bv\.\s*[\u0590-\u05FF]+;?/g, '')
    .replace(/\bib\.?\s*\d*;?/gi, '')
    .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
    .replace(/\bed\.\s*[A-Za-z]+\.?/gi, '')
    .replace(/—[\u0590-\u05FF\s,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading punctuation
  cleaned = cleaned.replace(/^[\s,;.—-]+/, '');

  return cleaned;
}

/**
 * Extract definition from entry text
 */
function extractDefinitionFromText(text) {
  if (!text) return '';

  // Join array if needed
  const fullText = Array.isArray(text) ? text.join(' ') : text;

  // Clean the text
  let definition = cleanDefinition(fullText);

  // Truncate if too long (keep first 500 chars)
  if (definition.length > 500) {
    definition = definition.substring(0, 500).replace(/\s+\S*$/, '') + '...';
  }

  return definition;
}

/**
 * Determine if entry is Aramaic based on content
 */
function isAramaic(headword, definition) {
  const cleanHeadword = cleanWord(headword);
  const defLower = definition.toLowerCase();

  // Explicit Aramaic markers
  if (defLower.includes('ch.') || defLower.includes('aram')) return true;
  if (defLower.includes('targ') || defLower.includes('targum')) return true;
  if (defLower.includes('talmud') || defLower.includes('gemara')) return true;

  // Aramaic emphatic state endings
  if (cleanHeadword.endsWith('א') && cleanHeadword.length > 2) {
    const beforeAleph = cleanHeadword.slice(-2, -1);
    if (!'הוי'.includes(beforeAleph)) return true; // Not ending in הא, וא, יא
  }
  if (cleanHeadword.endsWith('תא')) return true;
  if (cleanHeadword.endsWith('יתא')) return true;
  if (cleanHeadword.endsWith('ותא')) return true;

  // Aramaic plural endings
  if (cleanHeadword.endsWith('ין')) return true;
  if (cleanHeadword.endsWith('יא') && cleanHeadword.length > 3) return true;

  return false;
}

/**
 * Extract POS (part of speech) from definition
 */
function extractPOS(definition) {
  const defLower = definition.toLowerCase();

  // Common POS markers at the start of Jastrow definitions
  if (/^m\.\s/i.test(definition)) return 'm. (masc. noun)';
  if (/^f\.\s/i.test(definition)) return 'f. (fem. noun)';
  if (/^v\.\s/i.test(definition)) return 'v. (verb)';
  if (/^adj\.\s/i.test(definition)) return 'adj.';
  if (/^adv\.\s/i.test(definition)) return 'adv.';
  if (/^prep\.\s/i.test(definition)) return 'prep.';
  if (/^conj\.\s/i.test(definition)) return 'conj.';
  if (/^interj\.\s/i.test(definition)) return 'interj.';
  if (/^pr\.\s*n\./i.test(definition)) return 'pr. n. (proper noun)';

  // Check content for verb indicators
  if (defLower.includes('to ') && defLower.indexOf('to ') < 50) return 'verb';

  return 'unknown';
}

/**
 * Process a Sefaria entry into our format
 */
function processEntry(data) {
  const ref = data.ref || data.sectionRef;
  const headword = extractHeadword(ref) || data.he || '';
  const cleanHeadword = cleanWord(headword);

  if (!cleanHeadword || cleanHeadword.length < 1) {
    return null;
  }

  // Get the definition text
  const text = data.text || data.he || '';
  const definition = extractDefinitionFromText(text);

  if (!definition || definition.length < 3) {
    return null;
  }

  return {
    lemma: headword,
    key: cleanHeadword,
    ref: ref,
    pos: extractPOS(definition),
    definition: definition,
    isAramaic: isAramaic(headword, definition),
    source: 'Jastrow'
  };
}

/**
 * Load progress from previous run
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
      console.log(`Resuming: ${Object.keys(data.entries || {}).length} entries, last ref: ${data.lastRef || 'none'}`);
      return data;
    }
  } catch (err) {
    console.log('Starting fresh (no valid progress file)');
  }
  return { entries: {}, lastRef: null, visitedRefs: [] };
}

/**
 * Save progress
 */
function saveProgress(progress) {
  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify({
    entries: progress.entries,
    lastRef: progress.lastRef,
    visitedRefs: progress.visitedRefs.slice(-1000), // Keep last 1000 refs for cycle detection
    lastUpdate: progress.lastUpdate,
    stats: {
      total: stats.total,
      errors: stats.errors,
    }
  }));
}

/**
 * Main crawl function
 */
async function crawlJastrow() {
  console.log('='.repeat(60));
  console.log('Crawling Complete Jastrow Dictionary (~30,000 entries)');
  console.log('='.repeat(60));
  console.log();

  const progress = loadProgress();
  const entries = progress.entries || {};
  const visitedRefs = new Set(progress.visitedRefs || []);

  // Determine starting point
  let currentRef = progress.lastRef || CONFIG.startRef;
  console.log(`Starting from: ${currentRef}`);
  console.log(`Existing entries: ${Object.keys(entries).length}`);
  console.log();

  let saveCounter = 0;
  let consecutiveErrors = 0;

  while (currentRef) {
    // Check for cycles
    if (visitedRefs.has(currentRef)) {
      console.log(`Already visited ${currentRef}, stopping to prevent cycle.`);
      break;
    }

    stats.total++;
    const progressPct = (stats.total / 30000 * 100).toFixed(2);
    process.stdout.write(`[${progressPct}%] #${stats.total} "${currentRef}"... `);

    try {
      const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(currentRef)}?context=0`;
      const data = await fetchWithRetry(url);

      if (!data) {
        console.log('not found, stopping');
        break;
      }

      visitedRefs.add(currentRef);
      consecutiveErrors = 0;

      // Process the entry
      const processed = processEntry(data);
      if (processed) {
        // Use key + ref to handle homographs
        const uniqueKey = processed.key;
        if (!entries[uniqueKey]) {
          entries[uniqueKey] = processed;
          console.log(`✓ "${processed.lemma}"`);
        } else {
          // Append to existing entry's definitions if different
          if (!entries[uniqueKey].definition.includes(processed.definition.substring(0, 50))) {
            entries[uniqueKey].altDefinitions = entries[uniqueKey].altDefinitions || [];
            entries[uniqueKey].altDefinitions.push({
              ref: processed.ref,
              definition: processed.definition
            });
          }
          console.log(`(merged with existing)`);
        }
      } else {
        console.log('(no usable definition)');
        stats.skipped++;
      }

      // Get next entry
      currentRef = data.next || null;
      progress.lastRef = currentRef;

      // Save progress periodically
      saveCounter++;
      if (saveCounter >= CONFIG.saveEvery) {
        progress.entries = entries;
        progress.visitedRefs = Array.from(visitedRefs);
        saveProgress(progress);
        console.log(`  [Saved: ${Object.keys(entries).length} entries]`);
        saveCounter = 0;
      }

      // Rate limiting
      await sleep(CONFIG.delayMs);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      stats.errors++;
      consecutiveErrors++;

      if (consecutiveErrors > 10) {
        console.log('\nToo many consecutive errors, saving and stopping.');
        break;
      }

      // Try to continue with estimated next ref
      await sleep(2000);
    }
  }

  // Final save
  progress.entries = entries;
  progress.visitedRefs = Array.from(visitedRefs);
  progress.lastRef = currentRef;
  saveProgress(progress);

  return entries;
}

/**
 * Write output files
 */
function writeOutput(entries) {
  const entryCount = Object.keys(entries).length;
  const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Write JSON
  const jsonPath = path.join(CONFIG.outputDir, CONFIG.jsonOutputFile);
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2));
  console.log(`\nWritten: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(1)} MB)`);

  // Write JS module
  const jsContent = `/**
 * Jastrow Dictionary - COMPLETE (~30,000 entries)
 * Source: Marcus Jastrow, "A Dictionary of the Targumim, Talmud Babli and Yerushalmi" (1903)
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * Total entries: ${entryCount}
 * Aramaic entries: ${aramaicCount}
 * Hebrew entries: ${entryCount - aramaicCount}
 */

export const JASTROW_FULL = ${JSON.stringify(entries, null, 2)};

/**
 * Lookup a word in the complete Jastrow dictionary
 * @param {string} word - Hebrew/Aramaic word (with or without nikud)
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupJastrow = (word) => {
  if (!word) return null;

  // Clean the word
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  if (!cleaned) return null;

  // Direct lookup
  if (JASTROW_FULL[cleaned]) {
    return JASTROW_FULL[cleaned];
  }

  // Try normalizing final letters
  const normalized = cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');

  return JASTROW_FULL[normalized] || null;
};

/**
 * Search Jastrow by English definition
 * @param {string} query - English search term
 * @param {number} limit - Max results (default 50)
 * @returns {Array} - Matching entries
 */
export const searchJastrow = (query, limit = 50) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return Object.entries(JASTROW_FULL)
    .filter(([_, entry]) => entry.definition.toLowerCase().includes(lowerQuery))
    .map(([key, entry]) => ({ key, ...entry }))
    .slice(0, limit);
};

/**
 * Get Aramaic-only entries
 * @returns {Object} - Aramaic entries only
 */
export const getAramaicEntries = () => {
  const result = {};
  for (const [key, entry] of Object.entries(JASTROW_FULL)) {
    if (entry.isAramaic) {
      result[key] = entry;
    }
  }
  return result;
};

/**
 * Get Hebrew-only entries
 * @returns {Object} - Hebrew entries only
 */
export const getHebrewEntries = () => {
  const result = {};
  for (const [key, entry] of Object.entries(JASTROW_FULL)) {
    if (!entry.isAramaic) {
      result[key] = entry;
    }
  }
  return result;
};

/**
 * Get statistics
 */
export const getJastrowStats = () => ({
  total: ${entryCount},
  aramaic: ${aramaicCount},
  hebrew: ${entryCount - aramaicCount},
  source: 'Marcus Jastrow, Dictionary of Targumim, Talmud and Midrashic Literature (1903)',
  downloadDate: '${new Date().toISOString().split('T')[0]}'
});

export default JASTROW_FULL;
`;

  const jsPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  fs.writeFileSync(jsPath, jsContent);
  console.log(`Written: ${jsPath}`);
}

/**
 * Print statistics
 */
function printStats(entries) {
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const entryCount = Object.keys(entries).length;
  const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

  console.log('\n' + '='.repeat(60));
  console.log('CRAWL COMPLETE');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} minutes`);
  console.log(`Entries processed: ${stats.total}`);
  console.log(`Entries saved: ${entryCount}`);
  console.log(`  - Aramaic: ${aramaicCount}`);
  console.log(`  - Hebrew: ${entryCount - aramaicCount}`);
  console.log(`Skipped (no definition): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(60));
}

/**
 * Main entry point
 */
async function main() {
  try {
    const entries = await crawlJastrow();
    writeOutput(entries);
    printStats(entries);

    // Clean up progress file on success
    if (Object.keys(entries).length > 10000) {
      if (fs.existsSync(CONFIG.progressFile)) {
        fs.unlinkSync(CONFIG.progressFile);
        console.log('\nCleaned up progress file.');
      }
    }

    console.log('\nDone! Import with:');
    console.log("  import { lookupJastrow, searchJastrow } from './data/jastrowFull';");

  } catch (err) {
    console.error('\nFATAL ERROR:', err);
    console.log('\nProgress saved. Run script again to resume.');
    process.exit(1);
  }
}

main();
