/**
 * Enrich Semantic Fields for Jastrow and CAL
 * Cross-references from BDB, Strong's, Gesenius which have 91-94% coverage
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

async function enrichSemanticFields() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║          SEMANTIC FIELD ENRICHMENT FOR JASTROW & CAL                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Load source dictionaries with high semantic coverage
  console.log('Loading source dictionaries (high semantic coverage)...');

  const semanticSources = {};

  // 1. BDB (92% semantic)
  const bdbPath = path.join(DATA_DIR, 'bdbComplete.json');
  if (fs.existsSync(bdbPath)) {
    const bdb = JSON.parse(fs.readFileSync(bdbPath, 'utf8'));
    const entries = bdb.byWord || bdb;
    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);
      if (key && entry.semanticField && !semanticSources[key]) {
        semanticSources[key] = { field: entry.semanticField, source: 'BDB' };
      }
    }
    console.log(`  BDB: loaded ${Object.keys(entries).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 2. Strong's (94% semantic)
  const strongsPath = path.join(DATA_DIR, 'strongsComplete.json');
  if (fs.existsSync(strongsPath)) {
    const strongs = JSON.parse(fs.readFileSync(strongsPath, 'utf8'));
    const entries = strongs.byWord || strongs;
    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);
      if (key && entry.semanticField && !semanticSources[key]) {
        semanticSources[key] = { field: entry.semanticField, source: "Strong's" };
      }
    }
    console.log(`  Strong's: loaded ${Object.keys(entries).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 3. Gesenius (92% semantic)
  const geseniusPath = path.join(DATA_DIR, 'gesenius_lexicon.json');
  if (fs.existsSync(geseniusPath)) {
    const gesenius = JSON.parse(fs.readFileSync(geseniusPath, 'utf8'));
    for (const [word, entry] of Object.entries(gesenius)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);
      if (key && entry.semanticField && !semanticSources[key]) {
        semanticSources[key] = { field: entry.semanticField, source: 'Gesenius' };
      }
    }
    console.log(`  Gesenius: loaded ${Object.keys(gesenius).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 4. Klein (91% semantic)
  const kleinPath = path.join(DATA_DIR, 'klein_lexicon.json');
  if (fs.existsSync(kleinPath)) {
    const klein = JSON.parse(fs.readFileSync(kleinPath, 'utf8'));
    for (const [word, entry] of Object.entries(klein)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);
      if (key && entry.semanticField && !semanticSources[key]) {
        semanticSources[key] = { field: entry.semanticField, source: 'Klein' };
      }
    }
    console.log(`  Klein: loaded ${Object.keys(klein).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 5. Root meanings (often has semantic info)
  const rootPath = path.join(DATA_DIR, 'root_meanings_pro.json');
  if (fs.existsSync(rootPath)) {
    const rootFile = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
    const rootData = rootFile.entries || rootFile;
    for (const [word, entry] of Object.entries(rootData)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);
      if (key && entry.semanticField && !semanticSources[key]) {
        semanticSources[key] = { field: entry.semanticField, source: 'Root Meanings' };
      }
    }
    console.log(`  Root meanings: loaded`);
  }

  console.log(`\nTotal semantic field mappings: ${Object.keys(semanticSources).length}\n`);

  // Now enrich Jastrow
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Enriching Jastrow...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const jastrowPath = path.join(DATA_DIR, 'jastrowComplete.json');
  if (fs.existsSync(jastrowPath)) {
    const jastrow = JSON.parse(fs.readFileSync(jastrowPath, 'utf8'));
    const entries = jastrow.byWord || jastrow;

    let added = 0;
    let alreadyHas = 0;
    let noMatch = 0;
    const sourceBreakdown = {};

    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);

      if (entry.semanticField) {
        alreadyHas++;
        continue;
      }

      const source = semanticSources[key];
      if (source) {
        entry.semanticField = source.field;
        entry.semanticSource = source.source;
        added++;
        sourceBreakdown[source.source] = (sourceBreakdown[source.source] || 0) + 1;
      } else {
        noMatch++;
      }
    }

    // Update metadata
    if (jastrow._meta) {
      jastrow._meta.semanticEnrichedAt = new Date().toISOString();
      jastrow._meta.semanticAdded = added;
    }

    fs.writeFileSync(jastrowPath, JSON.stringify(jastrow, null, 2), 'utf8');

    console.log(`  Already had semantic field: ${alreadyHas}`);
    console.log(`  Semantic fields added: ${added}`);
    console.log(`  No match found: ${noMatch}`);
    console.log(`  Sources used:`);
    for (const [src, count] of Object.entries(sourceBreakdown)) {
      console.log(`    - ${src}: ${count}`);
    }
  }

  // Now enrich CAL
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Enriching CAL...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const calPath = path.join(DATA_DIR, 'cal_aramaic.json');
  if (fs.existsSync(calPath)) {
    const cal = JSON.parse(fs.readFileSync(calPath, 'utf8'));

    let added = 0;
    let alreadyHas = 0;
    let noMatch = 0;
    const sourceBreakdown = {};

    for (const [word, entry] of Object.entries(cal)) {
      if (word.startsWith('_')) continue;
      const key = cleanKey(word);

      if (entry.semanticField) {
        alreadyHas++;
        continue;
      }

      const source = semanticSources[key];
      if (source) {
        entry.semanticField = source.field;
        entry.semanticSource = source.source;
        added++;
        sourceBreakdown[source.source] = (sourceBreakdown[source.source] || 0) + 1;
      } else {
        noMatch++;
      }
    }

    // Update metadata
    if (cal._meta) {
      cal._meta.semanticEnrichedAt = new Date().toISOString();
      cal._meta.semanticAdded = added;
    }

    fs.writeFileSync(calPath, JSON.stringify(cal, null, 2), 'utf8');

    console.log(`  Already had semantic field: ${alreadyHas}`);
    console.log(`  Semantic fields added: ${added}`);
    console.log(`  No match found: ${noMatch}`);
    console.log(`  Sources used:`);
    for (const [src, count] of Object.entries(sourceBreakdown)) {
      console.log(`    - ${src}: ${count}`);
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                SEMANTIC FIELD ENRICHMENT COMPLETE                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
}

enrichSemanticFields().catch(console.error);
