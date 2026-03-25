const fs = require('fs');

// Check Strong's structure
const strongs = JSON.parse(fs.readFileSync('public/data/strongsComplete.json'));
console.log("Strong's top-level keys:", Object.keys(strongs).slice(0, 15));
console.log('Has byWord:', strongs.byWord ? 'YES' : 'NO');
console.log('Has byStrong:', strongs.byStrong ? 'YES' : 'NO');

// Check if entries have strong field
const wordKeys = Object.keys(strongs.byWord || strongs).filter(k => k.match(/[א-ת]/));
console.log('\nHebrew word entries:', wordKeys.length);
if (wordKeys.length > 0) {
  const sample = (strongs.byWord || strongs)[wordKeys[0]];
  console.log('Sample entry fields:', Object.keys(sample || {}));
  console.log('Sample strong:', sample?.strong || sample?.strongNumber || 'NONE');
}

// Check root_meanings_pro structure
console.log('\n--- ROOT MEANINGS ---');
const roots = JSON.parse(fs.readFileSync('public/data/root_meanings_pro.json'));
const rootKeys = Object.keys(roots).filter(k => k.match(/[א-ת]/)).slice(0, 5);
console.log('Hebrew root entries:', Object.keys(roots).filter(k => k.match(/[א-ת]/)).length);
if (rootKeys.length > 0) {
  console.log('Sample root key:', rootKeys[0]);
  console.log('Sample root entry:', JSON.stringify(roots[rootKeys[0]], null, 2).substring(0, 300));
}

// Check etymology_unified_pro structure
console.log('\n--- ETYMOLOGY UNIFIED ---');
const etym = JSON.parse(fs.readFileSync('public/data/etymology_unified_pro.json'));
const etymKeys = Object.keys(etym).filter(k => k.match(/[א-ת]/)).slice(0, 5);
console.log('Hebrew etym entries:', Object.keys(etym).filter(k => k.match(/[א-ת]/)).length);
if (etymKeys.length > 0) {
  console.log('Sample etym key:', etymKeys[0]);
  const sample = etym[etymKeys[0]];
  console.log('Has cognates:', sample?.cognates ? 'YES' : 'NO');
  console.log('Has root:', sample?.root ? 'YES' : 'NO');
}
