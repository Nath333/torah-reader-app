/**
 * Final Dictionary Status Report
 */
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              PRO SCHOLAR - FINAL DICTIONARY STATUS                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

const dictionaries = [
  { name: 'Jastrow', file: 'jastrowComplete.json', key: null, expected: 30000, note: 'Public domain Aramaic' },
  { name: 'Root PRO', file: 'root_meanings_pro.json', key: 'entries', expected: 25000, note: 'Root database (95% have roots)' },
  { name: 'CAL', file: 'cal_aramaic.json', key: null, expected: 30000, note: 'Aramaic from Sefaria/CAL' },
  { name: 'Gesenius', file: 'gesenius_lexicon.json', key: null, expected: 8000, note: 'Public domain (1910)' },
  { name: 'BDB', file: 'bdbComplete.json', key: 'byWord', expected: 8000, note: 'Public domain (1906)' },
  { name: "Strong's", file: 'strongsComplete.json', key: 'byWord', expected: 8674, note: 'Public domain concordance' },
  { name: 'Klein', file: 'klein_lexicon.json', key: null, expected: 8000, note: 'Enhanced etymology' },
];

console.log('DICTIONARY    ENTRIES   EXPECTED   %COMPLETE   STATUS        NOTE');
console.log('─'.repeat(90));

let totalEntries = 0;
let totalExpected = 0;

for (const dict of dictionaries) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + dict.file, 'utf8'));
    const entries = dict.key ? data[dict.key] : data;
    const count = Object.keys(entries).filter(k => !k.startsWith('_')).length;
    const percent = Math.round((count / dict.expected) * 100);

    totalEntries += count;
    totalExpected += dict.expected;

    let status = '❌ STUB';
    if (percent >= 80) status = '✅ GOOD';
    else if (percent >= 40) status = '🔶 PARTIAL';
    else if (percent >= 10) status = '🔸 LIMITED';

    console.log(
      dict.name.padEnd(12) +
      count.toString().padStart(8) +
      dict.expected.toString().padStart(10) +
      (percent + '%').padStart(12) +
      status.padStart(14) +
      '   ' + dict.note
    );
  } catch (e) {
    console.log(dict.name.padEnd(12) + '  ERROR: ' + e.message.substring(0, 50));
  }
}

console.log('─'.repeat(90));
console.log(
  'TOTAL'.padEnd(12) +
  totalEntries.toString().padStart(8) +
  totalExpected.toString().padStart(10) +
  (Math.round(totalEntries / totalExpected * 100) + '%').padStart(12)
);

// Unique words analysis
console.log('\n═══════════════════════════════════════════════════════════════════════════');
console.log('UNIQUE VOCABULARY COVERAGE:');
console.log('─────────────────────────────────────────────────────────────────────────────');

const allWords = new Set();
for (const dict of dictionaries) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + dict.file, 'utf8'));
    const entries = dict.key ? data[dict.key] : data;
    for (const key of Object.keys(entries)) {
      if (!key.startsWith('_')) {
        allWords.add(key.replace(/[\u0591-\u05C7]/g, ''));
      }
    }
  } catch (e) {}
}

console.log(`Total unique Hebrew/Aramaic words: ${allWords.size.toLocaleString()}`);
console.log(`Total dictionary entries: ${totalEntries.toLocaleString()}`);
console.log(`Average coverage per word: ${(totalEntries / allWords.size).toFixed(1)} sources`);

console.log('\n✅ Dictionary verification complete!');
