/**
 * Sefaria Lexicon Batch Fetcher
 * ==============================
 * Fetches lexicon entries from Sefaria's free API and caches them locally.
 *
 * Sefaria provides:
 * - Pre-parsed BDB, Jastrow, Strong's data
 * - Normalized definitions
 * - Cross-linked entries
 *
 * Usage: node scripts/fetchSefariaLexicon.js
 * Output: public/data/sefaria_lexicon_cache.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const BDB_COMPLETE_PATH = path.join(__dirname, '../public/data/bdbComplete.json');
const JASTROW_COMPLETE_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/sefaria_lexicon_cache.json');

// Sefaria API configuration
const SEFARIA_API_URL = 'https://www.sefaria.org/api/words';
const RATE_LIMIT_MS = 200; // 200ms between requests (Sefaria is more generous)
const MAX_ENTRIES = 3000; // Limit for reasonable runtime
const TIMEOUT_MS = 8000;
const BATCH_SIZE = 100; // Save progress every N entries

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
 * Fetch Sefaria lexicon entry for a word
 */
async function fetchSefariaEntry(word) {
  try {
    const url = `${SEFARIA_API_URL}/${encodeURIComponent(word)}`;

    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Torah-Reader-App/1.0 (Scholarly Research)'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Sefaria returns an array of lexicon entries
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Process and normalize entries
    const entries = data.map(entry => ({
      word: entry.headword || word,
      lexicon: entry.parent_lexicon || 'Unknown',
      definition: entry.content?.senses?.[0]?.definition ||
                  entry.content?.definition ||
                  entry.definition || '',
      pos: entry.content?.morphology || entry.pos || null,
      strongNumber: entry.strong_number || null,
      refs: entry.refs || [],
      rid: entry.rid || null
    })).filter(e => e.definition && e.definition.length > 0);

    if (entries.length === 0) {
      return null;
    }

    return {
      word,
      source: 'Sefaria',
      entries,
      fetchedAt: new Date().toISOString()
    };

  } catch (error) {
    // Silent fail
    return null;
  }
}

/**
 * Get word list from BDB and Jastrow
 */
function getWordList() {
  console.log('Loading word lists...');

  const words = new Set();

  // Load BDB words
  if (fs.existsSync(BDB_COMPLETE_PATH)) {
    const bdb = JSON.parse(fs.readFileSync(BDB_COMPLETE_PATH, 'utf8'));
    const bdbWords = Object.keys(bdb.byWord || bdb);
    bdbWords.forEach(w => words.add(w));
    console.log(`  BDB: ${bdbWords.length} words`);
  }

  // Load Jastrow words (prioritize these as they may have more Sefaria coverage)
  if (fs.existsSync(JASTROW_COMPLETE_PATH)) {
    const jastrow = JSON.parse(fs.readFileSync(JASTROW_COMPLETE_PATH, 'utf8'));
    const jastrowWords = Object.keys(jastrow);
    jastrowWords.forEach(w => words.add(w));
    console.log(`  Jastrow: ${jastrowWords.length} words`);
  }

  // Convert to array and filter
  const wordList = [...words]
    .filter(w => {
      const cleaned = w.replace(/[\u0591-\u05C7]/g, '');
      return cleaned.length >= 2 && /^[א-ת]+$/.test(cleaned);
    })
    .slice(0, MAX_ENTRIES);

  console.log(`  Total unique words: ${words.size}`);
  console.log(`  Using first ${wordList.length} for fetch`);

  return wordList;
}

/**
 * Save progress to file
 */
function saveProgress(results, meta) {
  const output = {
    _meta: {
      ...meta,
      lastSavedAt: new Date().toISOString()
    },
    entries: results
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
}

/**
 * Main batch fetch function
 */
async function batchFetchSefaria() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       Sefaria Lexicon Batch Fetcher                           ║');
  console.log('║       (Free API - BDB, Jastrow, Strong\'s data)                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const words = getWordList();
  const results = {};
  let success = 0;
  let failed = 0;
  let skipped = 0;

  // Track which lexicons we find data from
  const lexiconCounts = {};

  const startTime = Date.now();

  console.log(`\nFetching Sefaria lexicon data for ${words.length} words...`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Saving progress every ${BATCH_SIZE} entries\n`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    try {
      const entry = await fetchSefariaEntry(word);

      if (entry && entry.entries.length > 0) {
        results[word] = entry;
        success++;

        // Count lexicons
        for (const e of entry.entries) {
          const lex = e.lexicon || 'Unknown';
          lexiconCounts[lex] = (lexiconCounts[lex] || 0) + 1;
        }
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }

    // Progress update every 100 words
    if ((i + 1) % 100 === 0 || i === words.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (success / parseFloat(elapsed) || 0).toFixed(1);
      const eta = ((words.length - i - 1) * RATE_LIMIT_MS / 1000 / 60).toFixed(1);
      console.log(`  [${i + 1}/${words.length}] Success: ${success}, Failed: ${failed}, Rate: ${rate}/s, ETA: ${eta}min`);

      // Save progress
      if ((i + 1) % BATCH_SIZE === 0) {
        saveProgress(results, {
          source: 'Sefaria Lexicon API',
          url: 'https://www.sefaria.org/api/words',
          inProgress: true,
          currentIndex: i + 1,
          totalWords: words.length
        });
        console.log(`    [Saved progress to ${OUTPUT_PATH}]`);
      }
    }

    // Rate limiting
    await delay(RATE_LIMIT_MS);
  }

  // Create final output
  const output = {
    _meta: {
      source: 'Sefaria Lexicon API',
      url: 'https://www.sefaria.org/api/words',
      fetchedAt: new Date().toISOString(),
      totalAttempted: words.length,
      totalSuccess: success,
      totalFailed: failed,
      successRate: `${((success / words.length) * 100).toFixed(1)}%`,
      lexiconCoverage: lexiconCounts,
      license: 'CC-BY-NC',
      note: 'Pre-parsed scholarly lexicon data from Sefaria'
    },
    entries: results
  };

  // Write final output
  console.log(`\nWriting final output to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n✅ Sefaria Fetch Complete!');
  console.log('===========================');
  console.log(`Total attempted: ${words.length}`);
  console.log(`Successful: ${success} (${((success / words.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration}s`);

  console.log('\nLexicon coverage:');
  for (const [lex, count] of Object.entries(lexiconCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lex}: ${count} entries`);
  }

  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  batchFetchSefaria().catch(console.error);
}

module.exports = { batchFetchSefaria, fetchSefariaEntry };
