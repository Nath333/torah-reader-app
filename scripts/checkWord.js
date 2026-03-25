/**
 * Check word data across all dictionaries
 * Enhanced with color-coded output for better visibility
 */
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright colors
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',

  // Background colors
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const c = colors;

// Helper functions for styled output
const header = (text) => console.log(`\n${c.bold}${c.bgBlue}${c.white} ${text} ${c.reset}`);
const subHeader = (text) => console.log(`${c.bold}${c.brightCyan}${text}${c.reset}`);
const success = (label, value) => console.log(`  ${c.brightGreen}✓${c.reset} ${c.bold}${label}${c.reset}: ${value}`);
const error = (label) => console.log(`  ${c.red}✗${c.reset} ${c.dim}${label}: not found${c.reset}`);
const info = (label, value) => console.log(`    ${c.dim}${label}:${c.reset} ${c.yellow}${value}${c.reset}`);
const divider = () => console.log(`${c.dim}${'─'.repeat(65)}${c.reset}`);

const DATA = path.join(__dirname, '../public/data');

const word = process.argv[2] || 'בחוץ';
const root = process.argv[3] || 'חוץ';

// Load dictionaries
const bdb = JSON.parse(fs.readFileSync(path.join(DATA, 'bdbComplete.json'), 'utf8'));
const jastrow = JSON.parse(fs.readFileSync(path.join(DATA, 'jastrowComplete.json'), 'utf8'));
const strongs = JSON.parse(fs.readFileSync(path.join(DATA, 'strongsComplete.json'), 'utf8'));
const cal = JSON.parse(fs.readFileSync(path.join(DATA, 'cal_aramaic.json'), 'utf8'));
const klein = JSON.parse(fs.readFileSync(path.join(DATA, 'klein_lexicon.json'), 'utf8'));
const gesenius = JSON.parse(fs.readFileSync(path.join(DATA, 'gesenius_lexicon.json'), 'utf8'));

const bdbEntries = bdb.byWord || bdb;
const jastrowEntries = jastrow.byWord || jastrow;
const strongsEntries = strongs.byWord || strongs;
const geseniusEntries = gesenius.byWord || gesenius;

// Main header
console.log(`\n${c.bold}${c.bgMagenta}${c.white} DICTIONARY DATA CHECK ${c.reset}`);
console.log(`${c.bold}${c.magenta}Word:${c.reset} ${c.brightYellow}${word}${c.reset}  ${c.bold}${c.magenta}Root:${c.reset} ${c.brightYellow}${root}${c.reset}`);
console.log(`${c.dim}${'═'.repeat(65)}${c.reset}`);

// Direct word lookup
header('📖 DIRECT WORD LOOKUP');
subHeader(`Searching for: ${word}`);
divider();

if (bdbEntries[word]) {
  const e = bdbEntries[word];
  success('BDB', e.strongs || 'no strongs');
  info('Definition', (e.definition || '').slice(0, 100));
  info('Semantic', e.semanticField || 'none');
  info('Cognates', (e.cognates || []).length + ' found');
} else {
  error('BDB');
}

if (jastrowEntries[word]) {
  const e = jastrowEntries[word];
  success('Jastrow', e.strongs || 'no strongs');
  info('Definition', (e.definition || e.gloss || '').slice(0, 100));
  info('Semantic', e.semanticField || 'none');
} else {
  error('Jastrow');
}

if (strongsEntries[word]) {
  const e = strongsEntries[word];
  success('Strong\'s', e.strongs);
  info('Definition', (e.definition || e.gloss || '').slice(0, 100));
} else {
  error('Strong\'s');
}

if (geseniusEntries[word]) {
  const e = geseniusEntries[word];
  success('Gesenius', e.strongs || 'no strongs');
  info('Definition', (e.definition || '').slice(0, 100));
} else {
  error('Gesenius');
}

if (cal[word]) {
  const e = cal[word];
  success('CAL', e.strongs || 'no strongs');
  info('Definition', (e.definition || '').slice(0, 100));
  info('Dialects', e.dialects || 'none');
} else {
  error('CAL');
}

if (klein[word]) {
  const e = klein[word];
  success('Klein', e.strongs || e.strongNumber || 'no strongs');
  info('Definition', (e.definition || '').slice(0, 100));
  info('Semantic', e.semanticField || 'none');
} else {
  error('Klein');
}

// Root lookup
header('🌳 ROOT LOOKUP');
subHeader(`Searching for root: ${root}`);
divider();

if (bdbEntries[root]) {
  const e = bdbEntries[root];
  success('BDB Root', e.strongs);
  info('POS', e.pos || 'unknown');
  info('Definition', (e.definition || '').slice(0, 150));
  info('Semantic', e.semanticField || 'none');
  info('Cognates', JSON.stringify(e.cognates || []));
} else {
  error('BDB Root');
}

if (jastrowEntries[root]) {
  const e = jastrowEntries[root];
  success('Jastrow Root', e.strongs || 'no strongs');
  info('Semantic', e.semanticField || 'none');
} else {
  error('Jastrow Root');
}

if (strongsEntries[root]) {
  const e = strongsEntries[root];
  success('Strong\'s Root', e.strongs);
  info('Semantic', e.semanticField || 'none');
  info('Cognates', JSON.stringify(e.cognates || []));
} else {
  error('Strong\'s Root');
}

// Related forms
header('📝 RELATED FORMS');
subHeader(`Words containing: ${root}`);
divider();

let related = [];
for (const [k, v] of Object.entries(bdbEntries)) {
  if (k.startsWith('_')) continue;
  if (k.includes(root) || (v.root && v.root === root)) {
    related.push({ word: k, source: 'BDB', strongs: v.strongs });
  }
}
for (const [k, v] of Object.entries(jastrowEntries)) {
  if (k.startsWith('_')) continue;
  if (k.includes(root) || (v.root && v.root === root)) {
    if (!related.find(r => r.word === k)) {
      related.push({ word: k, source: 'Jastrow', strongs: v.strongs });
    }
  }
}

console.log(`${c.bold}${c.brightGreen}Found ${related.length} related forms:${c.reset}`);
for (const r of related.slice(0, 10)) {
  console.log(`  ${c.cyan}•${c.reset} ${c.brightYellow}${r.word}${c.reset} ${c.dim}(${r.source})${c.reset} ${c.blue}${r.strongs || ''}${c.reset}`);
}
if (related.length > 10) {
  console.log(`  ${c.dim}... and ${related.length - 10} more${c.reset}`);
}

// UI Recommendations
header('💡 UI ANALYSIS');
divider();

console.log(`${c.bold}${c.white}Based on your screenshot, the UI shows:${c.reset}`);
console.log(`  ${c.green}•${c.reset} 3 dictionary sources ${c.dim}(Rabbinic, BDB, Strong's)${c.reset}`);
console.log(`  ${c.green}•${c.reset} Comparative Semitic with 7 languages ${c.brightGreen}✓ EXCELLENT${c.reset}`);
console.log(`  ${c.green}•${c.reset} Root family with 2 forms`);

console.log(`\n${c.bold}${c.brightYellow}Potential improvements:${c.reset}`);
if (!bdbEntries[word]) {
  console.log(`  ${c.yellow}⚠${c.reset} BDB showing data from root ${c.cyan}${root}${c.reset}, not direct word`);
}
if (!jastrowEntries[word]) {
  console.log(`  ${c.yellow}⚠${c.reset} Consider showing Jastrow data from root`);
}
console.log(`  ${c.yellow}⚠${c.reset} "No historical data" - could show etymology timeline`);

console.log(`\n${c.dim}${'═'.repeat(65)}${c.reset}\n`);
