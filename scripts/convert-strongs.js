/**
 * Convert openscriptures Strong's Hebrew Dictionary to app format
 * Source: https://github.com/openscriptures/strongs
 *
 * Converts 8,674 entries to the format used by strongsComplete.json
 */

const fs = require('fs');
const path = require('path');

// Read the raw JS file and extract the JSON
const rawPath = path.join(__dirname, 'strongs-raw.js');
const rawContent = fs.readFileSync(rawPath, 'utf8');

// Extract the JSON object from the JS variable assignment
// Format: var strongsHebrewDictionary = {...};\n\nmodule.exports = ...
const startMarker = 'var strongsHebrewDictionary = ';
const startIdx = rawContent.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find strongsHebrewDictionary in file');
  process.exit(1);
}

// Find the end of the JSON object (};)
const jsonStart = startIdx + startMarker.length;
const endMarker = '};\n';
const endIdx = rawContent.lastIndexOf(endMarker);
if (endIdx === -1) {
  console.error('Could not find end of JSON object');
  process.exit(1);
}

const jsonStr = rawContent.substring(jsonStart, endIdx + 1);

let rawData;
try {
  rawData = JSON.parse(jsonStr);
} catch (e) {
  console.error('JSON parse error:', e.message);
  console.error('JSON starts with:', jsonStr.substring(0, 100));
  process.exit(1);
}

// Hebrew presentation forms to base letters mapping
const PRESENTATION_FORMS = {
  '\uFB1D': 'י', '\uFB1F': 'י', '\uFB20': 'ע', '\uFB21': 'א', '\uFB22': 'ד',
  '\uFB23': 'ה', '\uFB24': 'כ', '\uFB25': 'ל', '\uFB26': 'ם', '\uFB27': 'ר',
  '\uFB28': 'ת', '\uFB2A': 'ש', '\uFB2B': 'ש', '\uFB2C': 'ש', '\uFB2D': 'ש',
  '\uFB2E': 'א', '\uFB2F': 'א', '\uFB30': 'א', '\uFB31': 'ב', '\uFB32': 'ג',
  '\uFB33': 'ד', '\uFB34': 'ה', '\uFB35': 'ו', '\uFB36': 'ז', '\uFB38': 'ט',
  '\uFB39': 'י', '\uFB3A': 'ך', '\uFB3B': 'כ', '\uFB3C': 'ל', '\uFB3E': 'מ',
  '\uFB40': 'נ', '\uFB41': 'ס', '\uFB43': 'ף', '\uFB44': 'פ', '\uFB46': 'צ',
  '\uFB47': 'ק', '\uFB48': 'ר', '\uFB49': 'ש', '\uFB4A': 'ת', '\uFB4B': 'ו',
  '\uFB4C': 'ב', '\uFB4D': 'כ', '\uFB4E': 'פ', '\uFB4F': 'א',
};

// Remove niqqud/vowels from Hebrew text for key lookup
function cleanHebrewForKey(text) {
  if (!text) return '';
  // Convert presentation forms to base letters
  let result = '';
  for (const char of text) {
    result += PRESENTATION_FORMS[char] || char;
  }
  return result
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
}

// Convert to app format
const byWord = {};
const byStrongs = {};

let count = 0;
for (const [strongsNum, entry] of Object.entries(rawData)) {
  const hebrewKey = cleanHebrewForKey(entry.lemma);

  if (!hebrewKey) continue;

  const converted = {
    strongs: strongsNum,
    lemma: entry.lemma || '',
    key: hebrewKey,
    xlit: entry.xlit || '',
    pron: entry.pron || '',
    pos: entry.pron || '', // pos field seems to use pronunciation in original
    definitions: [],
    definition: '',
    derivation: entry.derivation || '',
    etymology: entry.derivation || '',
    gloss: entry.strongs_def || '',
    strongs_def: entry.strongs_def || '',
    kjv_def: entry.kjv_def || '',
    translations: entry.kjv_def || '',
    dictSource: "Strong's"
  };

  // Build definition from strongs_def and kjv_def
  const defParts = [];
  if (entry.strongs_def) {
    defParts.push(entry.strongs_def.replace(/^\{|\}$/g, ''));
  }
  if (entry.kjv_def) {
    defParts.push(`KJV: ${entry.kjv_def}`);
  }

  converted.definition = defParts.join('; ');
  converted.definitions = defParts;

  // Store by Hebrew word (may have multiple entries per word)
  if (!byWord[hebrewKey]) {
    byWord[hebrewKey] = converted;
  }

  // Store by Strong's number
  byStrongs[strongsNum] = converted;

  count++;
}

// Output statistics
console.log(`Converted ${count} Strong's entries`);
console.log(`Unique Hebrew words: ${Object.keys(byWord).length}`);
console.log(`Strong's numbers: ${Object.keys(byStrongs).length}`);

// Write the converted data
const output = {
  byWord,
  byStrongs,
  metadata: {
    source: 'openscriptures/strongs',
    license: 'CC-BY-SA',
    totalEntries: count,
    uniqueWords: Object.keys(byWord).length,
    generatedAt: new Date().toISOString()
  }
};

const outputPath = path.join(__dirname, '..', 'public', 'data', 'strongsComplete.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Written to: ${outputPath}`);

// Also update src/data for reference
const srcOutputPath = path.join(__dirname, '..', 'src', 'data', 'strongsComplete.json');
fs.writeFileSync(srcOutputPath, JSON.stringify(output, null, 2));
console.log(`Written to: ${srcOutputPath}`);
