/**
 * Download COMPLETE Jastrow Dictionary from Sefaria
 * Run with: node scripts/downloadFullJastrow.js
 *
 * This fetches ALL ~30,000 Jastrow entries by:
 * 1. Starting at the first entry (Jastrow, א)
 * 2. Following the "next" link to traverse the entire dictionary
 * 3. Extracting definitions and metadata from each entry
 *
 * Progress is saved to allow resuming interrupted downloads.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'src', 'data'),
  progressFile: path.join(__dirname, 'jastrow_progress.json'),
  outputFile: 'jastrowComplete.js',
  jsonOutputFile: 'jastrowComplete.json',
  delayMs: 100, // Delay between requests (be nice to the API)
  batchSize: 100, // Save progress every N entries
  maxRetries: 3,
  startRef: 'Jastrow, א', // First entry in the dictionary
};

// Track statistics
const stats = {
  total: 0,
  aramaic: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited - wait longer
        console.log('  Rate limited, waiting 10s...');
        await sleep(10000);
        continue;
      }
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries}: ${err.message}`);
      await sleep(2000 * (i + 1));
    }
  }
  return null;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean Hebrew word (remove nikud/cantillation)
 */
function cleanWord(word) {
  if (!word) return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove nikud/cantillation
    .replace(/[^\u05D0-\u05EA]/g, '') // Keep only Hebrew letters
    .trim();
}

/**
 * Clean definition text - remove HTML and excessive references
 */
function cleanDefinition(text) {
  if (!text) return '';

  return text
    // Remove HTML tags but preserve content
    .replace(/<[^>]*>/g, ' ')
    // Remove RTL/LTR markers
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract headword from the sectionRef
 */
function extractHeadword(sectionRef) {
  if (!sectionRef) return '';
  // "Jastrow, אָב" -> "אָב"
  const match = sectionRef.match(/Jastrow,\s*(.+)/);
  return match ? match[1].trim() : '';
}

/**
 * Determine if entry is Aramaic (vs Hebrew)
 */
function isAramaic(headword, definition) {
  const defLower = (definition || '').toLowerCase();
  const cleanHeadword = cleanWord(headword);

  // Explicit Aramaic/Chaldean markers in definition
  if (defLower.includes('aram.') || defLower.includes('aramaic')) return true;
  if (defLower.includes('chald.') || defLower.includes('chaldee')) return true;
  if (defLower.includes('ch.')) return true;

  // Targum references (Aramaic translations)
  if (defLower.includes('targ.') || defLower.includes('targum')) return true;

  // Talmudic context (Bavli is mostly Aramaic)
  if (defLower.match(/\bb\.\s*[a-z]/i)) return true; // Bavli citation
  if (defLower.includes('talm.') || defLower.includes('talmud')) return true;

  // Emphatic state endings (characteristic of Aramaic)
  if (cleanHeadword.endsWith('א') && cleanHeadword.length > 2) return true;
  if (cleanHeadword.endsWith('תא') || cleanHeadword.endsWith('יתא')) return true;

  // Aramaic plural endings
  if (cleanHeadword.endsWith('ין') || cleanHeadword.endsWith('יא')) return true;

  return false;
}

/**
 * Extract part of speech from definition
 */
function extractPos(definition) {
  if (!definition) return 'unknown';
  const defLower = definition.toLowerCase();

  // Common part of speech markers in Jastrow
  if (defLower.match(/^(m\.|m\s)/)) return 'noun (m)';
  if (defLower.match(/^(f\.|f\s)/)) return 'noun (f)';
  if (defLower.match(/^(m\.\s*&\s*f\.)/)) return 'noun';
  if (defLower.match(/^(v\.|verb)/)) return 'verb';
  if (defLower.match(/^(adj\.|adjective)/)) return 'adjective';
  if (defLower.match(/^(adv\.|adverb)/)) return 'adverb';
  if (defLower.match(/^(prep\.|preposition)/)) return 'preposition';
  if (defLower.match(/^(conj\.|conjunction)/)) return 'conjunction';
  if (defLower.match(/^(interj\.|interjection)/)) return 'interjection';
  if (defLower.match(/^(pr\.\s*n\.|proper noun)/)) return 'proper noun';
  if (defLower.match(/^(part\.|particle)/)) return 'particle';

  return 'unknown';
}

/**
 * Process a Sefaria API response into our format
 */
function processEntry(data) {
  const sectionRef = data.sectionRef || data.ref || '';
  const headword = extractHeadword(sectionRef);

  if (!headword) return null;

  // Get the text content (may be array or string)
  let text = data.text;
  if (Array.isArray(text)) {
    text = text.join(' ');
  }

  const definition = cleanDefinition(text || '');
  if (!definition || definition.length < 3) return null;

  const cleanHeadwordKey = cleanWord(headword);
  const aramaic = isAramaic(headword, definition);
  const pos = extractPos(definition);

  return {
    lemma: headword,
    key: cleanHeadwordKey,
    pos: pos,
    definition: definition.substring(0, 500), // Cap length for reasonable file size
    isAramaic: aramaic,
    ref: sectionRef,
    source: 'Jastrow'
  };
}

/**
 * Fetch a dictionary entry by reference
 */
async function fetchEntry(ref) {
  const encodedRef = encodeURIComponent(ref);
  const url = `https://www.sefaria.org/api/texts/${encodedRef}?context=0&pad=0`;
  return await fetchWithRetry(url);
}

/**
 * Load progress from previous run
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
      console.log(`Resuming from previous run:`);
      console.log(`  Entries: ${Object.keys(data.entries || {}).length}`);
      console.log(`  Last ref: ${data.lastRef || 'none'}`);
      return data;
    }
  } catch (err) {
    console.log('Starting fresh (no valid progress file)');
  }
  return { entries: {}, lastRef: null, lastUpdate: null };
}

/**
 * Save progress
 */
function saveProgress(progress) {
  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

/**
 * Main download function using sequential traversal
 */
async function downloadJastrow() {
  console.log('='.repeat(60));
  console.log('Downloading Complete Jastrow Dictionary from Sefaria');
  console.log('Using sequential traversal via "next" links');
  console.log('='.repeat(60));
  console.log();

  // Load any previous progress
  const progress = loadProgress();
  const entries = progress.entries;

  // Start from last position or beginning
  let currentRef = progress.lastRef || CONFIG.startRef;
  let batchCount = 0;
  let nullCount = 0; // Track consecutive nulls to detect end

  console.log(`Starting from: ${currentRef}`);
  console.log(`Existing entries: ${Object.keys(entries).length}`);
  console.log();

  while (currentRef && nullCount < 3) {
    const progressPct = ((stats.total / 30000) * 100).toFixed(1);
    process.stdout.write(`[${progressPct}%] #${stats.total + 1}: "${currentRef}"... `);

    try {
      const data = await fetchEntry(currentRef);

      if (!data || data.error) {
        console.log('not found');
        nullCount++;
        stats.errors++;

        // Try to continue if we have a next ref
        if (data && data.next) {
          currentRef = data.next;
          nullCount = 0;
        } else {
          break;
        }
        continue;
      }

      nullCount = 0;
      const processed = processEntry(data);

      if (processed) {
        // Use ref as key to handle duplicates with different vocalization
        const entryKey = processed.key || processed.ref;
        if (!entries[entryKey]) {
          entries[entryKey] = processed;
          stats.total++;
          if (processed.isAramaic) stats.aramaic++;
          console.log(`OK (${processed.key})`);
        } else {
          console.log('duplicate');
        }
      } else {
        console.log('skipped');
      }

      // Save current position and move to next
      progress.lastRef = currentRef;
      currentRef = data.next || null;
      batchCount++;

      // Save progress periodically
      if (batchCount >= CONFIG.batchSize) {
        progress.entries = entries;
        saveProgress(progress);
        console.log(`  [Saved progress: ${Object.keys(entries).length} entries]`);
        batchCount = 0;
      }

      // Rate limiting
      await sleep(CONFIG.delayMs);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      stats.errors++;

      // Save progress and wait before retrying
      progress.entries = entries;
      progress.lastRef = currentRef;
      saveProgress(progress);

      await sleep(5000);
    }
  }

  // Final save
  progress.entries = entries;
  progress.lastRef = null; // Mark as complete
  saveProgress(progress);

  return entries;
}

/**
 * Write output files
 */
function writeOutput(entries) {
  const entryCount = Object.keys(entries).length;
  const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

  // Create data directory if needed
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Write JSON file (for debugging/inspection)
  const jsonPath = path.join(CONFIG.outputDir, CONFIG.jsonOutputFile);
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2));
  console.log(`\nWritten: ${jsonPath}`);

  // Write JS module
  const jsContent = `/**
 * Jastrow Dictionary - Complete Download from Sefaria
 * Source: Marcus Jastrow, "A Dictionary of the Targumim, the Talmud Babli and Yerushalmi" (1903)
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * Total entries: ${entryCount}
 * Aramaic entries: ${aramaicCount}
 *
 * This is a comprehensive offline dictionary for Talmudic/Rabbinic Hebrew and Aramaic.
 */

export const JASTROW_COMPLETE = ${JSON.stringify(entries, null, 2)};

/**
 * Lookup a word in the local Jastrow dictionary
 * @param {string} word - Hebrew/Aramaic word (with or without nikud)
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupJastrow = (word) => {
  if (!word) return null;

  // Clean the word (remove nikud)
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  if (!cleaned) return null;

  // Direct lookup
  if (JASTROW_COMPLETE[cleaned]) {
    return JASTROW_COMPLETE[cleaned];
  }

  // Try normalizing final letters
  const normalized = cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');

  if (JASTROW_COMPLETE[normalized]) {
    return JASTROW_COMPLETE[normalized];
  }

  // Partial match - find entries containing this word
  for (const [key, entry] of Object.entries(JASTROW_COMPLETE)) {
    if (key.includes(cleaned) || cleaned.includes(key)) {
      return entry;
    }
  }

  return null;
};

/**
 * Search Jastrow by English definition
 * @param {string} query - English search term
 * @returns {Array} - Matching entries
 */
export const searchJastrow = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return Object.entries(JASTROW_COMPLETE)
    .filter(([_, entry]) => entry.definition.toLowerCase().includes(lowerQuery))
    .map(([key, entry]) => ({ key, ...entry }))
    .slice(0, 50); // Limit results
};

/**
 * Get only Aramaic entries
 * @returns {Object} - Aramaic-only dictionary
 */
export const getAramaicEntries = () => {
  const result = {};
  for (const [key, entry] of Object.entries(JASTROW_COMPLETE)) {
    if (entry.isAramaic) {
      result[key] = entry;
    }
  }
  return result;
};

/**
 * Get statistics about the dictionary
 */
export const getJastrowStats = () => ({
  total: ${entryCount},
  aramaic: ${aramaicCount},
  hebrew: ${entryCount - aramaicCount},
  downloadDate: '${new Date().toISOString().split('T')[0]}'
});

export default JASTROW_COMPLETE;
`;

  const jsPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  fs.writeFileSync(jsPath, jsContent);
  console.log(`Written: ${jsPath}`);
}

/**
 * Print final statistics
 */
function printStats(entries) {
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const entryCount = Object.keys(entries).length;
  const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} minutes`);
  console.log(`Total entries saved: ${entryCount}`);
  console.log(`  - Aramaic: ${aramaicCount}`);
  console.log(`  - Hebrew: ${entryCount - aramaicCount}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(60));
}

/**
 * Main entry point
 */
async function main() {
  try {
    const entries = await downloadJastrow();
    writeOutput(entries);
    printStats(entries);

    // Clean up progress file on success
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
      console.log('\nCleaned up progress file.');
    }

    console.log('\nDone! You can now use:');
    console.log("  import { lookupJastrow } from './data/jastrowComplete';");

  } catch (err) {
    console.error('\nFATAL ERROR:', err);
    console.log('\nProgress has been saved. Run the script again to resume.');
    process.exit(1);
  }
}

main();
