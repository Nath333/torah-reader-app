#!/usr/bin/env node
/**
 * Etymology Extraction Pipeline Runner
 * =====================================
 * Master script to run the complete etymology extraction pipeline.
 *
 * Pipeline Stages:
 * 1. BDB Etymology Extraction (local, instant)
 * 2. Jastrow Cross-Reference Extraction (local, instant)
 * 3. [Optional] CAL Bulk Cache (API, slow, requires --with-cal)
 * 4. [Optional] Wiktionary Extraction (API, slow, requires --with-wiktionary)
 * 5. Build Root Meanings Pro (merge all sources)
 *
 * Usage:
 *   node scripts/runEtymologyPipeline.js              # Local sources only
 *   node scripts/runEtymologyPipeline.js --with-cal   # Include CAL (slow)
 *   node scripts/runEtymologyPipeline.js --with-wiktionary  # Include Wiktionary
 *   node scripts/runEtymologyPipeline.js --full       # All sources
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = __dirname;

// Parse arguments
const args = process.argv.slice(2);
const withCal = args.includes('--with-cal') || args.includes('--full');
const withWiktionary = args.includes('--with-wiktionary') || args.includes('--full');
const testMode = args.includes('--test');

/**
 * Run a script synchronously with output
 */
function runScript(scriptName, description) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);

  if (!fs.existsSync(scriptPath)) {
    console.log(`  [skip] ${scriptName} not found`);
    return false;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`STAGE: ${description}`);
  console.log(`Script: ${scriptName}`);
  console.log('='.repeat(60));

  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(SCRIPTS_DIR, '..'),
    });
    return true;
  } catch (err) {
    console.error(`Error running ${scriptName}:`, err.message);
    return false;
  }
}

/**
 * Run an async script with limited results
 */
function runAsyncScript(scriptName, description, extraArgs = '') {
  return runScript(
    `${scriptName}${extraArgs}`,
    description
  );
}

// =============================================================================
// MAIN
// =============================================================================

console.log(`
${'#'.repeat(60)}
#                                                          #
#           ETYMOLOGY EXTRACTION PIPELINE                  #
#                                                          #
#  Multi-source scholarly etymology database builder       #
#                                                          #
${'#'.repeat(60)}
`);

console.log('Configuration:');
console.log(`  - BDB extraction: YES (local)`);
console.log(`  - Jastrow extraction: YES (local)`);
console.log(`  - CAL API cache: ${withCal ? 'YES (API)' : 'NO (use --with-cal)'}`);
console.log(`  - Wiktionary extraction: ${withWiktionary ? 'YES (API)' : 'NO (use --with-wiktionary)'}`);
console.log(`  - Test mode: ${testMode ? 'YES' : 'NO'}`);

const startTime = Date.now();

// Stage 1: BDB Extraction
const bdbSuccess = runScript('extractBDBEtymologyEnhanced.js', 'BDB Etymology Extraction');
if (!bdbSuccess) {
  // Try original script
  runScript('extractBDBEtymology.js', 'BDB Etymology Extraction (fallback)');
}

// Stage 2: Jastrow Extraction
runScript('extractJastrowCrossRefs.js', 'Jastrow Cross-Reference Extraction');

// Stage 3: CAL Bulk Cache (optional, API-based)
if (withCal) {
  const calScript = testMode
    ? 'bulkCacheCAL.js --test'
    : 'bulkCacheCAL.js --limit=500 --delay=2000';
  console.log('\nNote: CAL extraction is API-based and may take a while...');
  execSync(`node "${path.join(SCRIPTS_DIR, 'bulkCacheCAL.js')}" ${testMode ? '--test' : '--limit=500'}`, {
    stdio: 'inherit',
    cwd: path.join(SCRIPTS_DIR, '..'),
  });
}

// Stage 4: Wiktionary Extraction (optional, API-based)
if (withWiktionary) {
  console.log('\nNote: Wiktionary extraction is API-based and may take a while...');
  execSync(`node "${path.join(SCRIPTS_DIR, 'extractWiktionaryEtymology.js')}" ${testMode ? '--test' : '--limit=200'}`, {
    stdio: 'inherit',
    cwd: path.join(SCRIPTS_DIR, '..'),
  });
}

// Stage 5: Build Root Meanings Pro
runScript('buildRootMeaningsPro.js', 'Build Root Meanings Pro (Unified Database)');

// Summary
const duration = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`
${'#'.repeat(60)}
#                                                          #
#           PIPELINE COMPLETE                              #
#                                                          #
${'#'.repeat(60)}

Total time: ${duration}s

Output files:
  - public/data/etymology_bdb_extracted.json
  - public/data/etymology_jastrow_extracted.json
  ${withCal ? '- public/data/cal_enriched.json' : ''}
  ${withWiktionary ? '- public/data/etymology_wiktionary.json' : ''}
  - public/data/root_meanings_pro.json (unified database)

Next steps:
  1. The app will automatically use root_meanings_pro.json
  2. The comparativeSemiticService.js now loads data dynamically
  3. For full CAL data, run: node scripts/bulkCacheCAL.js
  4. For Proto-Semitic data, run: node scripts/extractWiktionaryEtymology.js
`);
