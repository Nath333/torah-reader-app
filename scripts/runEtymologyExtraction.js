/**
 * Master Etymology Extraction Runner
 * ====================================
 * Runs the complete etymology extraction pipeline:
 * 1. Extract etymology from BDB Complete
 * 2. Extract cross-references from Jastrow Complete
 * 3. Merge all sources into unified dataset
 *
 * Usage: node scripts/runEtymologyExtraction.js
 */

const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║       SCHOLAR PRO: Etymology Extraction Pipeline              ║');
console.log('║       ═══════════════════════════════════════════             ║');
console.log('║                                                               ║');
console.log('║   Extracting scholarly data from:                             ║');
console.log('║   • BDB Complete (17MB, ~14,000 entries)                      ║');
console.log('║   • Jastrow Complete (11MB, ~25,000 entries)                  ║');
console.log('║   • Strong\'s Complete (12MB, ~8,600 entries)                  ║');
console.log('║                                                               ║');
console.log('║   No AI generation - pure extraction from scholarly sources   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

async function runPipeline() {
  const startTime = Date.now();

  try {
    // Step 1: BDB Extraction
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 1/3: BDB Etymology Extraction');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { extractBDBEtymology } = require('./extractBDBEtymology');
    const bdbResult = extractBDBEtymology();

    console.log('\n');

    // Step 2: Jastrow Extraction
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 2/3: Jastrow Cross-Reference Extraction');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { extractJastrowCrossRefs } = require('./extractJastrowCrossRefs');
    const jastrowResult = extractJastrowCrossRefs();

    console.log('\n');

    // Step 3: Merge All Sources
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('STEP 3/3: Merging All Sources');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { mergeEtymologyData } = require('./mergeEtymologyData');
    const mergedResult = mergeEtymologyData();

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    EXTRACTION COMPLETE!                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log(`║   Total time: ${duration}s                                           ║`);
    console.log('║                                                               ║');
    console.log('║   Generated files:                                            ║');
    console.log('║   • public/data/etymology_bdb_extracted.json                  ║');
    console.log('║   • public/data/etymology_jastrow_extracted.json              ║');
    console.log('║   • public/data/root_meanings_enriched.json                   ║');
    console.log('║                                                               ║');
    console.log('║   Next steps:                                                 ║');
    console.log('║   1. Review the extracted data                                ║');
    console.log('║   2. Update services to use new enriched data                 ║');
    console.log('║   3. (Optional) Add CAL/Sefaria API enrichment                ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    return {
      bdb: bdbResult,
      jastrow: jastrowResult,
      merged: mergedResult,
      duration
    };

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
runPipeline();
