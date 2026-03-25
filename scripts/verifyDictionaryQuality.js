/**
 * Verify Dictionary Quality - Check for duplicates and data integrity
 */
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              DICTIONARY QUALITY VERIFICATION                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

const dictionaries = [
  { name: 'BDB', file: 'bdbComplete.json', key: 'byWord' },
  { name: 'Jastrow', file: 'jastrowComplete.json', key: null },
  { name: "Strong's", file: 'strongsComplete.json', key: 'byWord' },
  { name: 'HALOT', file: 'halot_lexicon.json', key: null },
  { name: 'DJBA', file: 'djba_lexicon.json', key: null },
  { name: 'Gesenius', file: 'gesenius_lexicon.json', key: null },
  { name: 'TWOT', file: 'twot_lexicon.json', key: null },
  { name: 'Klein', file: 'klein_lexicon.json', key: null },
  { name: 'CAL', file: 'cal_aramaic.json', key: null },
  { name: 'Root PRO', file: 'root_meanings_pro.json', key: 'entries' }
];

const stats = {};
const allWords = new Map(); // Track word -> which dictionaries have it

for (const dict of dictionaries) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + dict.file, 'utf8'));
    const entries = dict.key ? data[dict.key] : data;

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

  if (s.emptyDef > s.total * 0.1) {
    issues.push(`${s.emptyDef} entries (${(s.emptyDef/s.total*100).toFixed(0)}%) have no definition`);
  }

  if (s.uniqueWords < s.total * 0.9) {
    issues.push(`Possible internal duplicates: ${s.total - s.uniqueWords} entries`);
  }

  if (issues.length > 0) {
    console.log(`\n⚠️ ${dict.name}:`);
    issues.forEach(i => console.log(`   - ${i}`));
  }
}

console.log('\n✅ Quality verification complete!');
