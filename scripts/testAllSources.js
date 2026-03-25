/**
 * Test word lookup across all dictionary sources
 * Run with: node scripts/testAllSources.js
 */
const fs = require('fs');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║           TESTING WORD LOOKUP ACROSS ALL SOURCES                  ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');

// Test word: שבת (Shabbat)
const testWord = 'שבת';
console.log('Test word: ' + testWord + ' (Shabbat)');
console.log('');

// Normalize final letters
function normalize(word) {
  return word
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
}

// Check each dictionary
const dicts = [
  { file: 'bdbComplete.json', name: 'BDB', key: 'byWord' },
  { file: 'jastrowComplete.json', name: 'Jastrow', key: null },
  { file: 'strongsComplete.json', name: "Strong's", key: 'byWord' },
  { file: 'halot_lexicon.json', name: 'HALOT', key: null },
  { file: 'klein_lexicon.json', name: 'Klein', key: null },
  { file: 'gesenius_lexicon.json', name: 'Gesenius', key: null },
  { file: 'twot_lexicon.json', name: 'TWOT', key: null },
  { file: 'djba_lexicon.json', name: 'DJBA', key: null },
  { file: 'cal_aramaic.json', name: 'CAL', key: null },
  { file: 'root_meanings_pro.json', name: 'Root PRO', key: 'entries' },
];

console.log('SOURCE          FOUND   DEFINITION PREVIEW');
console.log('─'.repeat(70));

for (const { file, name, key } of dicts) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + file));
    const lookup = key ? data[key] : data;
    const normalized = normalize(testWord);

    let entry = lookup[testWord] || lookup[normalized];

    // Search by lemma for arrays/objects
    if (!entry) {
      const values = Array.isArray(lookup) ? lookup : Object.values(lookup);
      for (const v of values.slice(0, 1000)) {
        if (v && typeof v === 'object') {
          const lemma = v.lemma || v.headword || v.key || '';
          if (lemma.includes(testWord) || lemma.includes(normalized)) {
            entry = v;
            break;
          }
        }
      }
    }

    if (entry) {
      const def = entry.definition || entry.gloss || entry.meaning || entry.shortDef || JSON.stringify(entry).substring(0, 50);
      const preview = String(def).substring(0, 40).replace(/\n/g, ' ');
      console.log(name.padEnd(14) + '  YES     ' + preview + '...');
    } else {
      console.log(name.padEnd(14) + '  NO');
    }
  } catch (e) {
    console.log(name.padEnd(14) + '  ERROR: ' + e.message.substring(0, 30));
  }
}

console.log('');
console.log('═'.repeat(70));
console.log('');

// Test another word: מלך (king)
const testWord2 = 'מלכ'; // normalized form
console.log('Test word: מלך/מלכ (king) - normalized');
console.log('');
console.log('SOURCE          FOUND   DEFINITION PREVIEW');
console.log('─'.repeat(70));

for (const { file, name, key } of dicts) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + file));
    const lookup = key ? data[key] : data;

    let entry = lookup[testWord2] || lookup['מלך'];

    if (!entry) {
      const values = Array.isArray(lookup) ? lookup : Object.values(lookup);
      for (const v of values.slice(0, 1000)) {
        if (v && typeof v === 'object') {
          const lemma = v.lemma || v.headword || v.key || '';
          if (lemma.includes('מלכ') || lemma.includes('מלך')) {
            entry = v;
            break;
          }
        }
      }
    }

    if (entry) {
      const def = entry.definition || entry.gloss || entry.meaning || entry.shortDef || '';
      const preview = String(def).substring(0, 40).replace(/\n/g, ' ');
      console.log(name.padEnd(14) + '  YES     ' + preview + '...');
    } else {
      console.log(name.padEnd(14) + '  NO');
    }
  } catch (e) {
    console.log(name.padEnd(14) + '  ERROR');
  }
}
