/**
 * Verify PRO SCHOLAR Dictionary Usage
 * Tests that all dictionaries are correctly loaded and accessible
 */
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         PRO SCHOLAR - DICTIONARY USAGE VERIFICATION           ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Test words
const testWords = ['תורה', 'שבת', 'ברא', 'אמר', 'הלך', 'מים', 'שמים'];

console.log('1. LOADING DICTIONARIES...\n');

const dicts = {};

// Load all dictionaries
try {
  dicts.jastrow = JSON.parse(fs.readFileSync('public/data/jastrowComplete.json', 'utf8'));
  console.log('   ✅ Jastrow loaded:', Object.keys(dicts.jastrow).filter(k => k[0] !== '_').length, 'entries');
} catch (e) { console.log('   ❌ Jastrow FAILED:', e.message); }

try {
  dicts.bdb = JSON.parse(fs.readFileSync('public/data/bdbComplete.json', 'utf8'));
  console.log('   ✅ BDB loaded:', Object.keys(dicts.bdb.byWord || {}).length, 'entries');
} catch (e) { console.log('   ❌ BDB FAILED:', e.message); }

try {
  dicts.strongs = JSON.parse(fs.readFileSync('public/data/strongsComplete.json', 'utf8'));
  console.log('   ✅ Strong\'s loaded:', Object.keys(dicts.strongs.byStrongs || {}).length, 'entries');
} catch (e) { console.log('   ❌ Strong\'s FAILED:', e.message); }

try {
  dicts.gesenius = JSON.parse(fs.readFileSync('public/data/gesenius_lexicon.json', 'utf8'));
  console.log('   ✅ Gesenius loaded:', Object.keys(dicts.gesenius).filter(k => k[0] !== '_').length, 'entries');
} catch (e) { console.log('   ❌ Gesenius FAILED:', e.message); }

try {
  dicts.klein = JSON.parse(fs.readFileSync('public/data/klein_lexicon.json', 'utf8'));
  console.log('   ✅ Klein loaded:', Object.keys(dicts.klein).filter(k => k[0] !== '_').length, 'entries');
} catch (e) { console.log('   ❌ Klein FAILED:', e.message); }

try {
  dicts.cal = JSON.parse(fs.readFileSync('public/data/cal_aramaic.json', 'utf8'));
  console.log('   ✅ CAL loaded:', Object.keys(dicts.cal).filter(k => k[0] !== '_').length, 'entries');
} catch (e) { console.log('   ❌ CAL FAILED:', e.message); }

try {
  dicts.rootPro = JSON.parse(fs.readFileSync('public/data/root_meanings_pro.json', 'utf8'));
  const entries = dicts.rootPro.entries || dicts.rootPro;
  console.log('   ✅ Root PRO loaded:', Object.keys(entries).filter(k => k[0] !== '_').length, 'entries');
} catch (e) { console.log('   ❌ Root PRO FAILED:', e.message); }

// Test lookups
console.log('\n2. TESTING WORD LOOKUPS...\n');

function lookup(word, dict, key) {
  if (!dict) return null;
  const data = key ? dict[key] : dict;
  if (!data) return null;
  return data[word] || null;
}

for (const word of testWords) {
  const results = [];

  if (lookup(word, dicts.jastrow, null)) results.push('Jastrow');
  if (lookup(word, dicts.bdb, 'byWord')) results.push('BDB');
  if (lookup(word, dicts.strongs, 'byWord')) results.push('Strong\'s');
  if (lookup(word, dicts.gesenius, null)) results.push('Gesenius');
  if (lookup(word, dicts.klein, null)) results.push('Klein');
  if (lookup(word, dicts.cal, null)) results.push('CAL');
  if (lookup(word, dicts.rootPro?.entries || dicts.rootPro, null)) results.push('RootPRO');

  const status = results.length > 0 ? '✅' : '❌';
  console.log(`   ${status} "${word}": Found in ${results.length} sources → ${results.join(', ') || 'NONE'}`);
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SUMMARY:');
console.log('─────────────────────────────────────────────────────────────────');

const loaded = Object.keys(dicts).filter(k => dicts[k] !== undefined).length;
console.log(`   Dictionaries loaded: ${loaded}/7`);

// Check Klein issue
const kleinCount = Object.keys(dicts.klein || {}).filter(k => k[0] !== '_').length;
if (kleinCount < 1000) {
  console.log(`   ⚠️  Klein has only ${kleinCount} entries - needs rebuilding`);
} else {
  console.log(`   ✅ Klein has ${kleinCount} entries`);
}

console.log('\n✅ Dictionary verification complete!');
