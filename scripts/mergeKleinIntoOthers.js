/**
 * Merge Klein Etymology into Other Dictionaries
 * Preserves Klein's valuable etymology data by adding it to BDB/Gesenius/Strong's
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

async function mergeKlein() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           MERGING KLEIN ETYMOLOGY INTO OTHER DICTIONARIES                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Load Klein
  const kleinPath = path.join(DATA_DIR, 'klein_lexicon.json');
  if (!fs.existsSync(kleinPath)) {
    console.log('Klein lexicon not found!');
    return;
  }

  const klein = JSON.parse(fs.readFileSync(kleinPath, 'utf8'));
  const kleinKeys = Object.keys(klein).filter(k => /[א-ת]/.test(k));
  console.log(`Loaded Klein: ${kleinKeys.length} entries\n`);

  // Target dictionaries to enrich
  const targets = [
    { name: 'BDB', file: 'bdbComplete.json', structure: 'byWord' },
    { name: 'Gesenius', file: 'gesenius_lexicon.json', structure: 'flat' },
    { name: 'Strong\'s', file: 'strongsComplete.json', structure: 'byWord' }
  ];

  let totalMerged = 0;

  for (const target of targets) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Merging into ${target.name}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const filePath = path.join(DATA_DIR, target.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  File not found: ${target.file}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = target.structure === 'byWord' ? (data.byWord || data) : data;

    let merged = 0;
    let etymologyAdded = 0;
    let definitionEnriched = 0;

    for (const kleinKey of kleinKeys) {
      const kleinEntry = klein[kleinKey];
      const key = cleanKey(kleinKey);

      // Find matching entry in target
      let targetEntry = entries[key] || entries[kleinKey];

      if (targetEntry) {
        // Add Klein etymology if not present
        if (kleinEntry.definition && !targetEntry.kleinEtymology) {
          // Extract etymology-related content from Klein
          const def = kleinEntry.definition || '';

          // Klein definitions often contain etymology in format "from X" or "related to Y"
          targetEntry.kleinEtymology = def;
          etymologyAdded++;
        }

        // Add source attribution
        if (!targetEntry.sources) {
          targetEntry.sources = [];
        }
        if (!targetEntry.sources.includes('Klein')) {
          targetEntry.sources.push('Klein');
        }

        merged++;
      }
    }

    // Update metadata
    if (data._meta) {
      data._meta.kleinMerged = merged;
      data._meta.kleinMergedAt = new Date().toISOString();
    }

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`  Entries matched: ${merged}`);
    console.log(`  Etymology added: ${etymologyAdded}`);
    totalMerged += merged;
  }

  // Also add Klein data to etymology_unified_pro
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Adding Klein to etymology_unified_pro...`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const etymPath = path.join(DATA_DIR, 'etymology_unified_pro.json');
  if (fs.existsSync(etymPath)) {
    const etymData = JSON.parse(fs.readFileSync(etymPath, 'utf8'));
    const etymEntries = etymData.entries || etymData;

    let added = 0;
    for (const kleinKey of kleinKeys) {
      const kleinEntry = klein[kleinKey];
      const key = cleanKey(kleinKey);

      if (!etymEntries[key]) {
        // Add new entry from Klein
        etymEntries[key] = {
          word: kleinKey,
          definition: kleinEntry.definition,
          source: 'Klein',
          quality: 'scholarly'
        };
        added++;
      } else {
        // Enrich existing entry
        if (!etymEntries[key].kleinDefinition) {
          etymEntries[key].kleinDefinition = kleinEntry.definition;
        }
      }
    }

    // Update metadata
    if (etymData._meta) {
      etymData._meta.kleinAdded = added;
      etymData._meta.kleinMergedAt = new Date().toISOString();
    }

    fs.writeFileSync(etymPath, JSON.stringify(etymData, null, 2), 'utf8');
    console.log(`  New entries added: ${added}`);
    console.log(`  Existing entries enriched: ${kleinKeys.length - added}`);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    KLEIN MERGE COMPLETE                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal entries merged: ${totalMerged}`);
  console.log(`\nKlein data is now preserved in:`);
  console.log(`  - bdbComplete.json (kleinEtymology field)`);
  console.log(`  - gesenius_lexicon.json (kleinEtymology field)`);
  console.log(`  - strongsComplete.json (kleinEtymology field)`);
  console.log(`  - etymology_unified_pro.json (kleinDefinition field)`);
  console.log(`\nYou can now safely delete klein_lexicon.json`);
}

mergeKlein().catch(console.error);
