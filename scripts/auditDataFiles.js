/**
 * PRO SCHOLAR Data File Audit V2
 * Checks ACTUAL network fetch calls - not just file references
 */
const fs = require('fs');
const path = require('path');

// =============================================================================
// Find all actual fetch() calls to /data/ files
// =============================================================================
function findFetchCalls() {
  const srcDir = './src';
  const fetchMap = {};

  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !file.includes('node_modules')) {
        searchDir(fullPath);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Pattern 1: fetch('/data/filename.json')
        const pattern1 = /fetch\s*\(\s*['"`]([^'"`]*\/data\/[^'"`]+\.json)['"`]/g;
        let match;
        while ((match = pattern1.exec(content)) !== null) {
          const dataFile = match[1].replace(/.*\/data\//, '');
          if (!fetchMap[dataFile]) fetchMap[dataFile] = [];
          const shortPath = fullPath.replace(/\\/g, '/').replace('./src/', 'src/');
          if (!fetchMap[dataFile].includes(shortPath)) {
            fetchMap[dataFile].push(shortPath);
          }
        }

        // Pattern 2: fetch(`${process.env.PUBLIC_URL}/data/filename.json`)
        const pattern2 = /fetch\s*\(\s*`\$\{process\.env\.PUBLIC_URL\}\/data\/([^`]+\.json)`/g;
        while ((match = pattern2.exec(content)) !== null) {
          const dataFile = match[1];
          if (!fetchMap[dataFile]) fetchMap[dataFile] = [];
          const shortPath = fullPath.replace(/\\/g, '/').replace('./src/', 'src/');
          if (!fetchMap[dataFile].includes(shortPath)) {
            fetchMap[dataFile].push(shortPath);
          }
        }
      }
    }
  }

  searchDir(srcDir);
  return fetchMap;
}

// Run analysis
const fetchMap = findFetchCalls();
const dataFiles = fs.readdirSync('./public/data').filter(f => f.endsWith('.json'));
const existingFiles = new Set(dataFiles);

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║     ACTUAL NETWORK FETCH ANALYSIS - Where files are REALLY loaded         ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');

let duplicateFiles = [];
let missingFilesList = [];

for (const [file, loaders] of Object.entries(fetchMap).sort()) {
  const isDup = loaders.length > 1;
  const status = isDup ? '⚠️ ' : '✅';
  const fileExists = existingFiles.has(file);
  const existsLabel = fileExists ? '' : ' ❌ MISSING!';

  if (!fileExists) missingFilesList.push(file);
  if (isDup) duplicateFiles.push({ file, loaders, size: fileExists ? fs.statSync('./public/data/' + file).size : 0 });

  console.log('║ ' + status + file.padEnd(42) + existsLabel.padEnd(15) + '║');
  for (const loader of loaders) {
    console.log('║     → ' + loader.padEnd(57) + '║');
  }
}

console.log('╠════════════════════════════════════════════════════════════════════════════╣');

if (duplicateFiles.length > 0) {
  console.log('║ ⚠️  TRUE DUPLICATES (same file fetched from multiple services):           ║');
  let totalWaste = 0;
  for (const { file, loaders, size } of duplicateFiles) {
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    totalWaste += size * (loaders.length - 1);
    console.log('║   • ' + file.padEnd(35) + (' ' + sizeMB + ' MB × ' + loaders.length + ' fetches').padStart(20) + '   ║');
  }
  console.log('║                                                                            ║');
  console.log('║   WASTED BANDWIDTH: ~' + (totalWaste / 1024 / 1024).toFixed(1) + ' MB per session                             ║');
} else {
  console.log('║ ✅ No duplicate fetches detected                                           ║');
}

if (missingFilesList.length > 0) {
  console.log('║                                                                            ║');
  console.log('║ ❌ MISSING FILES (fetch will FAIL):                                        ║');
  for (const file of missingFilesList) {
    console.log('║   • ' + file.padEnd(62) + '║');
  }
}

// Check files NOT fetched at all
const fetchedFiles = new Set(Object.keys(fetchMap));
const unfetchedFiles = dataFiles.filter(f => !fetchedFiles.has(f));

if (unfetchedFiles.length > 0) {
  console.log('║                                                                            ║');
  console.log('║ 📁 FILES NOT DIRECTLY FETCHED (may use dictionaryLoader generic path):    ║');
  for (const file of unfetchedFiles.slice(0, 10)) {
    console.log('║   • ' + file.padEnd(62) + '║');
  }
  if (unfetchedFiles.length > 10) {
    console.log('║   ... and ' + (unfetchedFiles.length - 10) + ' more                                                     ║');
  }
}

console.log('╚════════════════════════════════════════════════════════════════════════════╝');

// Summary
console.log('');
console.log('SUMMARY:');
console.log('  - Files with direct fetch() calls: ' + Object.keys(fetchMap).length);
console.log('  - Duplicate fetches: ' + duplicateFiles.length);
console.log('  - Missing files: ' + missingFilesList.length);
console.log('  - Files via dictionaryLoader: ' + unfetchedFiles.length);
