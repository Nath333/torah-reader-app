/**
 * Lexicon quality analysis script
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../public/data');

const dictionaries = [
  { name: 'BDB', file: 'bdbComplete.json', structure: 'byWord' },
  { name: 'Jastrow', file: 'jastrowComplete.json', structure: 'byWord' },
  { name: 'Strong\'s', file: 'strongsComplete.json', structure: 'byWord' },
  { name: 'Gesenius', file: 'gesenius_lexicon.json', structure: 'flat' },
  { name: 'Klein', file: 'klein_lexicon.json', structure: 'flat' },
  { name: 'CAL', file: 'cal_aramaic.json', structure: 'flat' }
];

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    DICTIONARY DATA QUALITY REPORT                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

const results = [];

for (const dict of dictionaries) {
  const fp = path.join(dataDir, dict.file);

  if (fs.existsSync(fp) === false) {
    console.log(`${dict.name}: NOT FOUND`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const entries = dict.structure === 'byWord' ? (data.byWord || data) : data;

  // Filter out metadata keys
  const keys = Object.keys(entries).filter(k => {
    return k.charAt(0) !== '_';
  });

  // Count fields
  let withDef = 0, withPos = 0, withStrong = 0, withCognates = 0, withRoot = 0, withSemantic = 0;

  for (const k of keys) {
    const e = entries[k];
    if (e.definition && e.definition.length > 5) withDef++;
    if (e.pos) withPos++;
    if (e.strong || e.strongs || e.strongNumber) withStrong++;
    if (e.cognates && e.cognates.length > 0) withCognates++;
    if (e.root) withRoot++;
    if (e.semanticField) withSemantic++;
  }

  const total = keys.length;
  const size = fs.statSync(fp).size;

  results.push({
    name: dict.name,
    total,
    size: (size / 1024 / 1024).toFixed(2),
    defPct: Math.round(withDef / total * 100),
    posPct: Math.round(withPos / total * 100),
    strongPct: Math.round(withStrong / total * 100),
    cognatePct: Math.round(withCognates / total * 100),
    rootPct: Math.round(withRoot / total * 100),
    semanticPct: Math.round(withSemantic / total * 100)
  });
}

// Print table header
console.log('┌────────────┬─────────┬────────┬───────┬───────┬────────┬──────────┬───────┬──────────┐');
console.log('│ Dictionary │ Entries │  Size  │  Def  │  POS  │ Strong │ Cognates │  Root │ Semantic │');
console.log('├────────────┼─────────┼────────┼───────┼───────┼────────┼──────────┼───────┼──────────┤');

for (const r of results) {
  const name = r.name.padEnd(10);
  const total = String(r.total).padStart(7);
  const size = (r.size + ' MB').padStart(6);
  const def = (r.defPct + '%').padStart(5);
  const pos = (r.posPct + '%').padStart(5);
  const strong = (r.strongPct + '%').padStart(6);
  const cognate = (r.cognatePct + '%').padStart(8);
  const root = (r.rootPct + '%').padStart(5);
  const semantic = (r.semanticPct + '%').padStart(8);

  console.log(`│ ${name} │ ${total} │ ${size} │ ${def} │ ${pos} │ ${strong} │ ${cognate} │ ${root} │ ${semantic} │`);
}

console.log('└────────────┴─────────┴────────┴───────┴───────┴────────┴──────────┴───────┴──────────┘');

// Calculate totals
const totalEntries = results.reduce((sum, r) => sum + r.total, 0);
console.log(`\nTotal entries across all dictionaries: ${totalEntries.toLocaleString()}`);

// Quality summary
console.log('\nField coverage key:');
console.log('  Def = Definition | POS = Part of Speech | Strong = Strong\'s Number');
console.log('  Cognates = Related words in other Semitic languages');
console.log('  Root = Hebrew/Aramaic root | Semantic = Semantic field classification');
