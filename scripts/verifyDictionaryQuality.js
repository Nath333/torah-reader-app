/**
 * Verify Dictionary Quality - Check for duplicates and data integrity
 *
 * Runs as `npm run prebuild` to gate `react-scripts build`. Exits non-zero if:
 *   - Any referenced dictionary file is missing from public/data/
 *   - Any dictionary has > MAX_EMPTY_RATE empty/stub entries
 *   - Total definitions across all dictionaries fall below MIN_TOTAL_DEFS
 */
const fs = require('fs');
const path = require('path');

// Thresholds — tweak here. Build fails if any is breached.
const MAX_EMPTY_RATE = 0.05;     // 5% per-dictionary empty-definition cap
const MIN_TOTAL_DEFS = 60000;    // Minimum defs-with-content across all dicts

// Allow `--soft` to warn without failing (for ad-hoc local runs).
const SOFT_MODE = process.argv.includes('--soft');

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              DICTIONARY QUALITY VERIFICATION                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

// Dictionaries that must exist in public/data/ for the app to function.
// Add a new entry when adding a new dictionary (see DICTIONARIES.md §3).
const dictionaries = [
  { name: 'BDB', file: 'bdbComplete.json', key: 'byWord' },
  { name: 'Jastrow', file: 'jastrowComplete.json', key: null },
  { name: "Strong's", file: 'strongsComplete.json', key: 'byWord' },
  { name: 'Gesenius', file: 'gesenius_lexicon.json', key: null },
  { name: 'Klein', file: 'klein_lexicon.json', key: null },
  { name: 'CAL', file: 'cal_aramaic.json', key: null },
  { name: 'Root PRO', file: 'root_meanings_pro.json', key: 'entries' }
];

const failures = [];
const stats = {};
const allWords = new Map(); // Track word -> which dictionaries have it

for (const dict of dictionaries) {
  const filePath = path.join('public/data', dict.file);
  if (!fs.existsSync(filePath)) {
    stats[dict.name] = { error: 'file missing: ' + filePath };
    failures.push(`${dict.name}: referenced file ${filePath} is missing`);
    continue;
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = dict.key ? data[dict.key] : data;

    if (!entries || typeof entries !== 'object') {
      stats[dict.name] = { error: `entries key "${dict.key}" not found or not an object` };
      failures.push(`${dict.name}: entries key "${dict.key}" missing or invalid in ${filePath}`);
      continue;
    }

    // Filter out metadata
    const words = Object.keys(entries).filter(k => !k.startsWith('_'));

    // Check for actual content
    let withDefinition = 0;
    let emptyDef = 0;
    let duplicateSource = 0;
    let uniqueWords = new Set();

    for (const word of words) {
      const entry = entries[word];
      const def = entry?.definition || entry?.gloss || entry?.meaning || '';

      if (def && def.length > 2) {
        withDefinition++;
      } else {
        emptyDef++;
      }

      // Track which dictionaries have this word
      const cleanWord = word.replace(/[\u0591-\u05C7]/g, '');
      uniqueWords.add(cleanWord);

      if (!allWords.has(cleanWord)) {
        allWords.set(cleanWord, []);
      }
      allWords.get(cleanWord).push(dict.name);
    }

    stats[dict.name] = {
      total: words.length,
      withDefinition,
      emptyDef,
      uniqueWords: uniqueWords.size
    };

  } catch (e) {
    stats[dict.name] = { error: e.message };
    failures.push(`${dict.name}: failed to parse ${filePath} — ${e.message}`);
  }
}

// Print results
console.log('DICTIONARY        TOTAL   WITH_DEF  EMPTY  UNIQUE_WORDS');
console.log('─'.repeat(60));

let totalEntries = 0;
let totalWithDef = 0;

for (const [name, s] of Object.entries(stats)) {
  if (s.error) {
    console.log(`${name.padEnd(16)} ERROR: ${s.error}`);
  } else {
    console.log(
      name.padEnd(16) +
      s.total.toString().padStart(6) +
      s.withDefinition.toString().padStart(10) +
      s.emptyDef.toString().padStart(7) +
      s.uniqueWords.toString().padStart(14)
    );
    totalEntries += s.total;
    totalWithDef += s.withDefinition;
  }
}

console.log('─'.repeat(60));
console.log(`${'TOTAL'.padEnd(16)}${totalEntries.toString().padStart(6)}${totalWithDef.toString().padStart(10)}`);

// Check cross-dictionary coverage
console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('CROSS-DICTIONARY ANALYSIS:');
console.log('─────────────────────────────────────────────────────────────────────────────');

// Words in multiple dictionaries
let inMultiple = 0;
let inSingle = 0;
const coverage = {};

for (const [word, dicts] of allWords.entries()) {
  if (dicts.length > 1) {
    inMultiple++;
  } else {
    inSingle++;
  }

  const count = dicts.length;
  coverage[count] = (coverage[count] || 0) + 1;
}

console.log('\nWord coverage distribution:');
for (const [count, num] of Object.entries(coverage).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const bar = '█'.repeat(Math.min(50, Math.round(num / 100)));
  console.log(`  In ${count} dict(s): ${num.toString().padStart(6)} ${bar}`);
}

console.log(`\nTotal unique words across all dictionaries: ${allWords.size}`);
console.log(`Words in multiple dictionaries: ${inMultiple} (${(inMultiple/allWords.size*100).toFixed(1)}%)`);
console.log(`Words in single dictionary: ${inSingle} (${(inSingle/allWords.size*100).toFixed(1)}%)`);

// Sample words in many dictionaries
console.log('\nSample words with best coverage (in 5+ dictionaries):');
const bestCoverage = [...allWords.entries()]
  .filter(([w, d]) => d.length >= 5)
  .slice(0, 10);

for (const [word, dicts] of bestCoverage) {
  console.log(`  ${word}: ${dicts.join(', ')}`);
}

// Check for potential issues
console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('QUALITY CHECKS:');
console.log('─────────────────────────────────────────────────────────────────────────────');

// Check each dictionary for issues
for (const dict of dictionaries) {
  const s = stats[dict.name];
  if (s.error) continue;

  const issues = [];
  const emptyRate = s.total ? s.emptyDef / s.total : 0;

  if (emptyRate > MAX_EMPTY_RATE) {
    const msg = `${s.emptyDef} entries (${(emptyRate * 100).toFixed(1)}%) have no definition — exceeds ${(MAX_EMPTY_RATE * 100).toFixed(0)}% cap`;
    issues.push(msg);
    failures.push(`${dict.name}: ${msg}`);
  } else if (s.emptyDef > s.total * 0.1) {
    // Keep the old informational warning for 10% — only fails at MAX_EMPTY_RATE.
    issues.push(`${s.emptyDef} entries (${(s.emptyDef / s.total * 100).toFixed(0)}%) have no definition`);
  }

  if (s.uniqueWords < s.total * 0.9) {
    issues.push(`Possible internal duplicates: ${s.total - s.uniqueWords} entries`);
  }

  if (issues.length > 0) {
    console.log(`\n⚠️ ${dict.name}:`);
    issues.forEach(i => console.log(`   - ${i}`));
  }
}

// Total-definitions gate
if (totalWithDef < MIN_TOTAL_DEFS) {
  failures.push(`Total definitions ${totalWithDef} below required minimum ${MIN_TOTAL_DEFS}`);
}

console.log('\n═══════════════════════════════════════════════════════════════════════════');
if (failures.length === 0) {
  console.log('✅ Quality verification passed.');
  process.exit(0);
}

console.log(`❌ Quality verification found ${failures.length} blocking issue(s):`);
failures.forEach(f => console.log(`   • ${f}`));
if (SOFT_MODE) {
  console.log('\n(running with --soft: not failing the build)');
  process.exit(0);
}
console.log('\nRun with --soft to bypass locally. Fix issues above to unblock the build.');
process.exit(1);
