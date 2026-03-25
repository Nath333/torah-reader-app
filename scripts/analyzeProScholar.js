/**
 * Pro Scholar Dictionary Analysis
 * Analyzes all dictionary sources for quality and coverage
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

const files = [
  'bdbComplete.json',
  'jastrowComplete.json',
  'strongsComplete.json',
  'gesenius_lexicon.json',
  'klein_lexicon.json',
  'cal_aramaic.json',
  'djba_lexicon.json'
];

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    PRO SCHOLAR DICTIONARY ANALYSIS                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

const results = [];

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log('❌ Missing:', file);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const meta = data._meta || {};
  const entries = Object.entries(data).filter(([k]) => !k.startsWith('_'));

  let withDef = 0, withPos = 0, withStrong = 0, withCognates = 0, withRoot = 0, withSemantic = 0;

  for (const [k, e] of entries) {
    if (e.definition || e.gloss || e.fullDef) withDef++;
    if (e.pos) withPos++;
    if (e.strongs || e.strong) withStrong++;
    if (e.cognates && e.cognates.length > 0) withCognates++;
    if (e.root) withRoot++;
    if (e.semanticField) withSemantic++;
  }

  const total = entries.length;
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  let name = file.replace('.json', '').replace('Complete', '').replace('_lexicon', '').replace('_aramaic', '');
  const lang = file.includes('jastrow') || file.includes('cal') || file.includes('djba') ? 'Aramaic' : 'Hebrew';
  const tier = meta.tier || (name === 'bdb' || name === 'gesenius' || name === 'jastrow' ? 1 : 2);

  results.push({
    name: name.toUpperCase(),
    entries: total,
    lang,
    tier,
    def: pct(withDef),
    pos: pct(withPos),
    strong: pct(withStrong),
    cognates: pct(withCognates),
    root: pct(withRoot),
    semantic: pct(withSemantic),
    source: meta.sources ? meta.sources.slice(0, 2).join(', ') : meta.institution || 'N/A'
  });
}

// Sort by tier then entries
results.sort((a, b) => a.tier - b.tier || b.entries - a.entries);

// Hebrew sources
console.log('HEBREW LEXICONS (Tier 1 = ★ Academic, Tier 2 = Scholarly):');
console.log('┌────────────┬─────────┬──────┬──────┬──────────┬──────────┬──────┬──────────┐');
console.log('│ Dictionary │ Entries │ Def  │ POS  │ Strong\'s │ Cognates │ Root │ Semantic │');
console.log('├────────────┼─────────┼──────┼──────┼──────────┼──────────┼──────┼──────────┤');
for (const r of results.filter(r => r.lang === 'Hebrew')) {
  const tier = r.tier === 1 ? '★' : ' ';
  console.log(`│${tier}${r.name.padEnd(10)} │ ${String(r.entries).padStart(7)} │ ${String(r.def + '%').padStart(4)} │ ${String(r.pos + '%').padStart(4)} │ ${String(r.strong + '%').padStart(8)} │ ${String(r.cognates + '%').padStart(8)} │ ${String(r.root + '%').padStart(4)} │ ${String(r.semantic + '%').padStart(8)} │`);
}
console.log('└────────────┴─────────┴──────┴──────┴──────────┴──────────┴──────┴──────────┘');

console.log('\nARAMAIC LEXICONS:');
console.log('┌────────────┬─────────┬──────┬──────┬──────────┬──────────┬──────┬──────────┐');
console.log('│ Dictionary │ Entries │ Def  │ POS  │ Strong\'s │ Cognates │ Root │ Semantic │');
console.log('├────────────┼─────────┼──────┼──────┼──────────┼──────────┼──────┼──────────┤');
for (const r of results.filter(r => r.lang === 'Aramaic')) {
  const tier = r.tier === 1 ? '★' : ' ';
  console.log(`│${tier}${r.name.padEnd(10)} │ ${String(r.entries).padStart(7)} │ ${String(r.def + '%').padStart(4)} │ ${String(r.pos + '%').padStart(4)} │ ${String(r.strong + '%').padStart(8)} │ ${String(r.cognates + '%').padStart(8)} │ ${String(r.root + '%').padStart(4)} │ ${String(r.semantic + '%').padStart(8)} │`);
}
console.log('└────────────┴─────────┴──────┴──────┴──────────┴──────────┴──────┴──────────┘');
console.log('★ = Tier 1 Academic Source\n');

// Totals
const hebrewTotal = results.filter(r => r.lang === 'Hebrew').reduce((s, r) => s + r.entries, 0);
const aramaicTotal = results.filter(r => r.lang === 'Aramaic').reduce((s, r) => s + r.entries, 0);
console.log(`TOTAL: ${hebrewTotal + aramaicTotal} entries (${hebrewTotal} Hebrew, ${aramaicTotal} Aramaic)\n`);

// Recommendations
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                         RECOMMENDATIONS                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

console.log('RECOMMENDED PRO SCHOLAR CONFIGURATION:\n');

console.log('HEBREW (Primary Sources):');
console.log('  1. BDB (Brown-Driver-Briggs) - ★ Tier 1 Academic');
console.log('     • 6,773 entries, 95% Strong\'s, 75% cognates');
console.log('     • Standard academic reference for Biblical Hebrew');
console.log('');
console.log('  2. Gesenius - ★ Tier 1 Academic');
console.log('     • 6,979 entries, 98% Strong\'s, 73% cognates');
console.log('     • Classical grammar reference with STEP Bible data');
console.log('');
console.log('  3. Klein - Tier 2 Scholarly (Etymology Focus)');
console.log('     • 7,131 entries - etymology-rich');
console.log('     • Use for: cognates, Proto-Semitic, etymology');
console.log('');
console.log('  4. Strong\'s - Tier 2 Reference');
console.log('     • 6,242 entries - concordance linkage');
console.log('     • Use for: verse references, word studies');
console.log('');

console.log('ARAMAIC (Primary Sources):');
console.log('  1. Jastrow - ★ Tier 1 Academic');
console.log('     • 25,231 entries - comprehensive Talmudic');
console.log('     • Standard reference for Rabbinic Aramaic');
console.log('');
console.log('  2. CAL (from Jastrow) - Tier 2 Scholarly');
console.log('     • 12,243 entries with dialect markers');
console.log('     • Use for: JBA, JPA, Syriac dialect info');
console.log('');

console.log('RECOMMENDED LOOKUP ORDER:');
console.log('  Hebrew:  BDB → Gesenius → Klein → Strong\'s');
console.log('  Aramaic: Jastrow → CAL → DJBA');
console.log('');

console.log('ISSUES TO ADDRESS:');
const issues = [];
for (const r of results) {
  if (r.cognates < 50) issues.push(`  • ${r.name}: Low cognates (${r.cognates}%)`);
  if (r.semantic < 40) issues.push(`  • ${r.name}: Low semantic fields (${r.semantic}%)`);
}
if (issues.length > 0) {
  console.log(issues.join('\n'));
} else {
  console.log('  ✓ All sources have good coverage');
}
