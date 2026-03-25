/**
 * Test script to verify final letter restoration fix
 * PRO SCHOLAR V13
 */

const fs = require('fs');
const path = require('path');

const words = [
  'בפנים',      // prefix ב- + פנים
  'יציאות',     // feminine plural → יציאה
  'הכהנים',     // prefix ה- + כהנים → כהן (with final nun)
  'לתורה',      // prefix ל- + תורה
  'ומלך',       // prefix ו- + מלך
  'שבת',        // no prefix, direct word
  'בראשית',     // prefix ב- + ראשית
  'האדם',       // prefix ה- + אדם
  'המים',       // prefix ה- + מים
  'לפני',       // prefix ל- + פני
  'הארץ',       // prefix ה- + ארץ
  'אלהים',      // masculine plural → אלהים (special word)
  'השמים',      // prefix ה- + שמים → שמים/שמם
  'העולם',      // prefix ה- + עולם
  'הכתוב',      // prefix ה- + כתוב
];

function stripAllDiacritics(str) {
  return str.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
}

function restoreFinalLetter(str) {
  if (!str || str.length === 0) return str;
  const lastChar = str[str.length - 1];
  const finalForms = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  return finalForms[lastChar] ? str.slice(0, -1) + finalForms[lastChar] : str;
}

const HEBREW_PREFIXES = ['וה', 'וב', 'וכ', 'ול', 'ומ', 'וש', 'הב', 'הכ', 'הל', 'המ', 'מה', 'שה', 'ב', 'כ', 'ל', 'מ', 'ה', 'ו', 'ש'];

function generateVariants(word) {
  const variants = [];
  const stripped = stripAllDiacritics(word);
  const addVariant = (form, type) => {
    if (form && !variants.some(v => v.form === form)) {
      variants.push({ form, type });
    }
  };

  addVariant(stripped, 'stripped');

  // Plural → singular transformations
  if (stripped.endsWith('ות') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(stem + 'ה', 'fem-singular');
    addVariant(restoreFinalLetter(stem), 'stem');
  }
  if (stripped.endsWith('ים') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(restoreFinalLetter(stem), 'masc-singular');
    addVariant(stem, 'masc-singular-raw');
  }

  // Prefix stripping
  for (const prefix of HEBREW_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      addVariant(withoutPrefix, `prefix-${prefix}`);
      if (withoutPrefix.endsWith('ים') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(restoreFinalLetter(stem), `prefix-${prefix}-singular`);
      }
      if (withoutPrefix.endsWith('ות') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(stem + 'ה', `prefix-${prefix}-fem-singular`);
      }
    }
  }

  return variants;
}

// Load dictionaries
const loadDict = (file) => {
  try {
    const filepath = path.join(__dirname, '..', 'public', 'data', file);
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data.byWord || data;
  } catch (e) {
    return null;
  }
};

const jastrow = loadDict('jastrowComplete.json');
const bdb = loadDict('bdbComplete.json');
const strongs = loadDict('strongsComplete.json');
const klein = loadDict('klein_lexicon.json');
const calAramaic = loadDict('cal_aramaic.json');
const djba = loadDict('djba_lexicon.json');

const dictionaries = [
  { name: 'Jastrow', data: jastrow, tier: 1 },
  { name: 'BDB', data: bdb, tier: 1 },
  { name: "Strong's", data: strongs, tier: 2 },
  { name: 'Klein', data: klein, tier: 2 },
  { name: 'CAL', data: calAramaic, tier: 2 },
  { name: 'DJBA', data: djba, tier: 2 },
];

console.log('='.repeat(70));
console.log('PRO SCHOLAR V13: FINAL LETTER RESTORATION TEST');
console.log('='.repeat(70));
console.log('');

let passed = 0;
let failed = 0;
const failedWords = [];

for (const word of words) {
  const variants = generateVariants(word);
  const results = [];

  for (const dict of dictionaries) {
    if (!dict.data) continue;
    for (const v of variants) {
      if (dict.data[v.form]) {
        const entry = dict.data[v.form];
        const def = (entry.definition || entry.english || entry.kjv_def || '').substring(0, 35);
        results.push({
          dict: dict.name,
          form: v.form,
          type: v.type,
          def,
          tier: dict.tier
        });
        break;
      }
    }
  }

  const found = results.length > 0;
  const status = found ? '✅' : '❌';
  const details = found
    ? results.map(r => `${r.dict}(${r.form})`).join(', ')
    : 'NOT FOUND';

  console.log(`${status} ${word}`);
  console.log(`   Variants: ${variants.map(v => v.form).join(', ')}`);
  console.log(`   Found in: ${details}`);
  if (results[0]?.def) {
    console.log(`   Definition: ${results[0].def}...`);
  }
  console.log('');

  if (found) {
    passed++;
  } else {
    failed++;
    failedWords.push(word);
  }
}

console.log('─'.repeat(70));
console.log(`RESULTS: ${passed}/${words.length} words found (${Math.round(passed / words.length * 100)}%)`);

if (failedWords.length > 0) {
  console.log(`\nFailed words: ${failedWords.join(', ')}`);
}

// Show dictionary stats
console.log('\n' + '─'.repeat(70));
console.log('DICTIONARY ENTRY COUNTS:');
for (const dict of dictionaries) {
  if (dict.data) {
    console.log(`  ${dict.name}: ${Object.keys(dict.data).length.toLocaleString()} entries`);
  }
}
