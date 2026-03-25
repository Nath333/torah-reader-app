/**
 * CAL Enrichment Script
 * Enriches CAL Aramaic data with Jastrow definitions and etymology
 */

const fs = require('fs');
const path = require('path');

const CAL_PATH = path.join(__dirname, '../public/data/cal_aramaic.json');
const JASTROW_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const ETYMOLOGY_PATH = path.join(__dirname, '../public/data/etymology_jastrow_extracted.json');

function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

function isAramaic(key, def) {
  // Aramaic indicators
  if (key.endsWith('א') || key.endsWith('י')) return true;
  if (/^ch\./i.test(def)) return true;
  if (/aramaic/i.test(def)) return true;
  if (/targ\./i.test(def)) return true;
  return false;
}

async function enrichCAL() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          CAL Aramaic Enrichment Script                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load CAL
  console.log('Loading CAL data...');
  const cal = JSON.parse(fs.readFileSync(CAL_PATH, 'utf8'));
  const initialCount = Object.keys(cal).filter(k => !k.startsWith('_')).length;
  console.log(`  Existing CAL entries: ${initialCount}`);

  // Load Jastrow
  console.log('Loading Jastrow data...');
  const jastrow = JSON.parse(fs.readFileSync(JASTROW_PATH, 'utf8'));
  const jastrowEntries = jastrow.byWord || jastrow;
  console.log(`  Jastrow entries: ${Object.keys(jastrowEntries).length}`);

  // Load etymology if available
  let etymology = {};
  if (fs.existsSync(ETYMOLOGY_PATH)) {
    console.log('Loading Jastrow etymology...');
    etymology = JSON.parse(fs.readFileSync(ETYMOLOGY_PATH, 'utf8'));
    console.log(`  Etymology entries: ${Object.keys(etymology.entries || etymology).length}`);
  }
  const etymEntries = etymology.entries || etymology;

  // Enrich CAL
  let enriched = 0;
  let newEntries = 0;
  let cognatesAdded = 0;

  for (const [word, jEntry] of Object.entries(jastrowEntries)) {
    if (word.startsWith('_')) continue;

    const def = jEntry.definition || jEntry.gloss || '';
    const key = cleanKey(word);

    if (!key || key.length < 2) continue;
    if (!isAramaic(key, def)) continue;

    if (cal[key]) {
      // Enrich existing CAL entry with Jastrow definition
      if (!cal[key].jastrowDef && def.length > 20) {
        cal[key].jastrowDef = def.substring(0, 300);
        enriched++;
      }

      // Add etymology from Jastrow
      const etymEntry = etymEntries[key];
      if (etymEntry && !cal[key].cognates) {
        if (etymEntry.etymology && etymEntry.etymology.cognates) {
          const cognateList = [];
          for (const [lang, cognates] of Object.entries(etymEntry.etymology.cognates)) {
            if (Array.isArray(cognates)) {
              for (const cog of cognates.slice(0, 2)) {
                const cogWord = typeof cog === 'string' ? cog : cog.word;
                if (cogWord) {
                  const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                  cognateList.push(`${langName}: ${cogWord}`);
                }
              }
            }
          }
          if (cognateList.length > 0) {
            cal[key].cognates = cognateList;
            cognatesAdded++;
          }
        }
      }
    } else {
      // Add new Aramaic entry from Jastrow
      cal[key] = {
        lemma: jEntry.lemma || word,
        key: key,
        pos: jEntry.pos || 'unknown',
        definition: def.substring(0, 400),
        dialects: ['JBA', 'JPA'],
        source: 'Jastrow',
        isAramaic: true
      };

      // Add etymology if available
      const etymEntry = etymEntries[key];
      if (etymEntry && etymEntry.etymology && etymEntry.etymology.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(etymEntry.etymology.cognates)) {
          if (Array.isArray(cognates)) {
            for (const cog of cognates.slice(0, 2)) {
              const cogWord = typeof cog === 'string' ? cog : cog.word;
              if (cogWord) {
                const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                cognateList.push(`${langName}: ${cogWord}`);
              }
            }
          }
        }
        if (cognateList.length > 0) {
          cal[key].cognates = cognateList;
        }
      }

      newEntries++;
    }
  }

  // Update metadata
  const finalCount = Object.keys(cal).filter(k => !k.startsWith('_')).length;
  cal._meta.entries = finalCount;
  cal._meta.enrichedFromJastrow = enriched;
  cal._meta.addedFromJastrow = newEntries;
  cal._meta.cognatesAdded = cognatesAdded;
  cal._meta.builtAt = new Date().toISOString();

  // Count dialects
  const dialectCounts = {};
  for (const [k, v] of Object.entries(cal)) {
    if (k.startsWith('_')) continue;
    for (const d of (v.dialects || [])) {
      dialectCounts[d] = (dialectCounts[d] || 0) + 1;
    }
  }

  // Write output
  console.log(`\nWriting enriched CAL to ${CAL_PATH}...`);
  fs.writeFileSync(CAL_PATH, JSON.stringify(cal, null, 2), 'utf8');

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ENRICHMENT COMPLETE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nInitial entries:    ${initialCount}`);
  console.log(`New entries added:  ${newEntries}`);
  console.log(`Entries enriched:   ${enriched}`);
  console.log(`Cognates added:     ${cognatesAdded}`);
  console.log(`Final entries:      ${finalCount}`);

  console.log('\nDialect coverage:');
  for (const [d, count] of Object.entries(dialectCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${count}`);
  }
}

enrichCAL().catch(console.error);
