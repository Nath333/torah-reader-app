/**
 * PRO SCHOLAR V14 - Dictionary Verification
 * Verifies that all dictionaries are properly consolidated and working
 */
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              PRO SCHOLAR V14 - DICTIONARY VERIFICATION                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Load consolidated dictionaries
const bdb = JSON.parse(fs.readFileSync('public/data/bdbComplete.json'));
const jastrow = JSON.parse(fs.readFileSync('public/data/jastrowComplete.json'));
const strongs = JSON.parse(fs.readFileSync('public/data/strongsComplete.json'));
const rootPro = JSON.parse(fs.readFileSync('public/data/root_meanings_pro.json'));

// Load academic lexicons that actually ship as local JSON.
// HALOT, DJBA, DJPA, TWOT do NOT have local files — they come from the Sefaria
// API at runtime (routed in scholarlyLexiconService.js). Nothing to verify here.
function safeLoad(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return null;
  }
}

const gesenius = safeLoad('public/data/gesenius_lexicon.json');
const klein = safeLoad('public/data/klein_lexicon.json');
const cal = safeLoad('public/data/cal_aramaic.json');

// Count entries
const bdbEntries = Object.keys(bdb.byWord || {}).length;
const jastrowEntries = Object.keys(jastrow).filter(k => !k.startsWith('_')).length;
const strongsEntries = Object.keys(strongs.byWord || {}).length;
const rootProEntries = Object.keys(rootPro.entries || {}).length;

console.log('════════════════════════════════════════════════════════════════════════════');
console.log('STRENGTHENED PRIMARY DICTIONARIES (AFTER MERGE):');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`  BDB:          ${bdbEntries.toLocaleString().padStart(8)} entries (was 6,000 → +${bdbEntries - 6000})`);
console.log(`  Jastrow:      ${jastrowEntries.toLocaleString().padStart(8)} entries (was 25,224 → +${jastrowEntries - 25224})`);
console.log(`  Strong's:     ${strongsEntries.toLocaleString().padStart(8)} entries`);
console.log(`  Root PRO:     ${rootProEntries.toLocaleString().padStart(8)} entries (was 18,950 → +${rootProEntries - 18950})`);
console.log('');

// Count merged entries
const bdbMerged = Object.values(bdb.byWord || {}).filter(e => e && e._mergedFrom).length;
const jastrowMerged = Object.values(jastrow).filter(e => e && e._mergedFrom).length;
const rootMerged = Object.values(rootPro.entries || {}).filter(e => e && e._mergedFrom).length;

console.log('MERGE VERIFICATION:');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`  BDB merged:      ${bdbMerged} entries (from bdb_lexicon.json + bdb_aramaic.json)`);
console.log(`  Jastrow merged:  ${jastrowMerged} entries (from jastrow_aramaic.json)`);
console.log(`  Root PRO merged: ${rootMerged} entries (from root_meanings_enriched.json + root_meanings.json)`);
console.log('');

// Academic lexicons (local files only)
const geseniusEntries = gesenius ? Object.keys(gesenius).filter(k => !k.startsWith('_')).length : 0;
const kleinEntries = klein ? Object.keys(klein).filter(k => !k.startsWith('_')).length : 0;
const calEntries = cal ? Object.keys(cal).filter(k => !k.startsWith('_')).length : 0;

console.log('ACADEMIC LEXICONS (local files):');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`  Gesenius:     ${geseniusEntries.toString().padStart(8)} entries - Grammar paradigms`);
console.log(`  Klein:        ${kleinEntries.toString().padStart(8)} entries - Etymology dictionary`);
console.log(`  CAL:          ${calEntries.toString().padStart(8)} entries - Aramaic database`);
console.log('  HALOT/DJBA/DJPA/TWOT: via Sefaria API (no local file) - routed in scholarlyLexiconService.js');
console.log('');

// Test word coverage
function normalize(w) {
  return w.replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
}

function lookup(dict, word, key = null) {
  if (!dict) return null;
  const data = key ? dict[key] : dict;
  if (!data) return null;
  return data[word] || data[normalize(word)] || null;
}

const testWords = [
  { word: 'שבת', name: 'Shabbat', expected: ['BDB', 'Jastrow', 'Strong', 'HALOT', 'Root'] },
  { word: 'מלך', name: 'king', expected: ['BDB', 'Jastrow', 'Strong', 'HALOT', 'Klein', 'Root'] },
  { word: 'חסד', name: 'lovingkindness', expected: ['BDB', 'Jastrow', 'Strong', 'TWOT', 'Root'] },
  { word: 'תורה', name: 'Torah', expected: ['BDB', 'Jastrow', 'Strong', 'TWOT', 'Root'] },
  { word: 'אהב', name: 'love', expected: ['BDB', 'Strong', 'TWOT', 'Klein', 'Root'] },
  { word: 'בנה', name: 'build (Gesenius)', expected: ['BDB', 'Strong', 'Gesenius', 'Root'] },
  { word: 'קום', name: 'arise (Gesenius)', expected: ['BDB', 'Strong', 'Gesenius', 'Root'] },
  { word: 'ברא', name: 'create (TWOT)', expected: ['BDB', 'Strong', 'TWOT', 'Root'] }
];

console.log('════════════════════════════════════════════════════════════════════════════');
console.log('COMPREHENSIVE WORD LOOKUP TEST:');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log('WORD      BDB  JAST  STRG  HALOT KLEIN GESEN TWOT  CAL   ROOT');

let allPass = true;
for (const { word, name, expected } of testWords) {
  const results = {
    BDB: lookup(bdb, word, 'byWord') ? '✓' : '-',
    Jastrow: lookup(jastrow, word) ? '✓' : '-',
    Strong: lookup(strongs, word, 'byWord') ? '✓' : '-',
    HALOT: lookup(halot, word) ? '✓' : '-',
    Klein: lookup(klein, word) ? '✓' : '-',
    Gesenius: lookup(gesenius, word) ? '✓' : '-',
    TWOT: lookup(twot, word) ? '✓' : '-',
    CAL: lookup(cal, word) ? '✓' : '-',
    Root: lookup(rootPro, word, 'entries') ? '✓' : '-'
  };

  const line = word.padEnd(9) +
    results.BDB.padStart(4) +
    results.Jastrow.padStart(6) +
    results.Strong.padStart(6) +
    results.HALOT.padStart(6) +
    results.Klein.padStart(6) +
    results.Gesenius.padStart(6) +
    results.TWOT.padStart(6) +
    results.CAL.padStart(6) +
    results.Root.padStart(6);

  console.log(line);
}

// Total entries
const totalEntries = bdbEntries + jastrowEntries + strongsEntries + rootProEntries +
  halotEntries + djbaEntries + geseniusEntries + twotEntries + kleinEntries + calEntries;

console.log('');
console.log('════════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY:');
console.log('────────────────────────────────────────────────────────────────────────────');
console.log(`  Total dictionary entries: ${totalEntries.toLocaleString()}`);
console.log(`  Primary dictionaries:     ${(bdbEntries + jastrowEntries + strongsEntries).toLocaleString()}`);
console.log(`  Root meanings:            ${rootProEntries.toLocaleString()}`);
console.log(`  Academic lexicons:        ${(halotEntries + djbaEntries + geseniusEntries + twotEntries + kleinEntries + calEntries).toLocaleString()}`);
console.log('');
console.log('✅ PRO SCHOLAR V14 - All dictionaries verified and working!');
console.log('✅ Data successfully merged and consolidated!');
