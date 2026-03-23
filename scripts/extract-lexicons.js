/**
 * Extract lexicon data from hebrewLexicons.js to JSON files
 * This script extracts the large dictionary objects and saves them as JSON
 * for lazy loading via fetch() instead of bundling.
 *
 * Run: node scripts/extract-lexicons.js
 */

const fs = require('fs');
const path = require('path');

// Configuration for lexicons to extract
const LEXICONS = [
  { name: 'BDB_LEXICON', outputFile: 'bdb_lexicon.json' },
  { name: 'BDB_ARAMAIC', outputFile: 'bdb_aramaic.json' },
  { name: 'KLEIN_LEXICON', outputFile: 'klein_lexicon.json' },
  { name: 'JASTROW_LEXICON', outputFile: 'jastrow_lexicon.json' },
  { name: 'STRONG_LEXICON', outputFile: 'strong_lexicon.json' }
];

// Also extract from calAramaic and jastrowAramaic
const ARAMAIC_SOURCES = [
  { file: 'calAramaic.js', name: 'CAL_ARAMAIC', outputFile: 'cal_aramaic.json' },
  { file: 'jastrowAramaic.js', name: 'JASTROW_ARAMAIC', outputFile: 'jastrow_aramaic.json' }
];

const srcDataDir = path.join(__dirname, '../src/data');
const publicDataDir = path.join(__dirname, '../public/data');

// Create output directory
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

/**
 * Extract a JS object from source using line-based parsing
 */
function extractObjectFromFile(filePath, objectName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let inObject = false;
  let braceCount = 0;
  let objectLines = [];
  let startLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for start of the object
    if (!inObject && line.includes(`export const ${objectName} = {`)) {
      inObject = true;
      braceCount = 1;
      objectLines.push('{');
      startLine = i;
      continue;
    }

    if (inObject) {
      // Count braces
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }

      objectLines.push(line);

      // End of object
      if (braceCount === 0) {
        console.log(`  Found ${objectName} from line ${startLine + 1} to ${i + 1}`);
        break;
      }
    }
  }

  if (objectLines.length === 0) {
    console.error(`  Could not find ${objectName} in ${filePath}`);
    return null;
  }

  // Join and clean up
  let objStr = objectLines.join('\n')
    .replace(/;\s*$/, '') // Remove trailing semicolon
    .trim();

  try {
    // Parse as JSON (JS object literals are valid JSON if keys are quoted)
    // First, we need to handle unquoted keys
    const jsonStr = objStr
      // Already quoted keys should be fine, but let's normalize
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      // Handle trailing commas (not valid JSON)
      .replace(/,(\s*[}\]])/g, '$1');

    const obj = eval('(' + objStr + ')');
    return obj;
  } catch (e) {
    console.error(`  Error parsing ${objectName}:`, e.message);

    // Try a simpler approach - use vm module
    try {
      const vm = require('vm');
      const sandbox = {};
      const script = `result = ${objStr}`;
      vm.runInNewContext(script, sandbox);
      return sandbox.result;
    } catch (e2) {
      console.error(`  VM parsing also failed:`, e2.message);
      return null;
    }
  }
}

console.log('Extracting lexicons from hebrewLexicons.js...\n');

// Extract from hebrewLexicons.js
const hebrewLexiconsPath = path.join(srcDataDir, 'hebrewLexicons.js');
let totalSize = 0;

for (const { name, outputFile } of LEXICONS) {
  console.log(`Extracting ${name}...`);
  const data = extractObjectFromFile(hebrewLexiconsPath, name);

  if (data) {
    const outputPath = path.join(publicDataDir, outputFile);
    const json = JSON.stringify(data);
    fs.writeFileSync(outputPath, json);
    const size = (json.length / 1024).toFixed(1);
    totalSize += parseFloat(size);
    console.log(`  Saved to ${outputFile} (${size} KB, ${Object.keys(data).length} entries)\n`);
  }
}

// Extract Aramaic sources
console.log('\nExtracting Aramaic lexicons...\n');

for (const { file, name, outputFile } of ARAMAIC_SOURCES) {
  console.log(`Extracting ${name} from ${file}...`);
  const filePath = path.join(srcDataDir, file);
  const data = extractObjectFromFile(filePath, name);

  if (data) {
    const outputPath = path.join(publicDataDir, outputFile);
    const json = JSON.stringify(data);
    fs.writeFileSync(outputPath, json);
    const size = (json.length / 1024).toFixed(1);
    totalSize += parseFloat(size);
    console.log(`  Saved to ${outputFile} (${size} KB, ${Object.keys(data).length} entries)\n`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Total extracted: ${totalSize.toFixed(1)} KB`);
console.log(`Files saved to: ${publicDataDir}`);
console.log(`\nNext steps:`);
console.log(`1. Update dictionaryLoader.js to load these JSON files`);
console.log(`2. Update services to use async loading`);
console.log(`3. Rebuild and verify bundle size reduction`);
