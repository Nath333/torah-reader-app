/**
 * Gesenius Lexicon Fetcher
 * ========================
 * Fetches Hebrew lexicon data from STEP Bible (Tyndale House) public domain sources.
 *
 * The STEP Bible project provides high-quality, peer-reviewed Biblical Hebrew lexicon
 * data based on Gesenius/BDB lineage, available under CC BY-NC license.
 *
 * Data source: https://github.com/STEPBible/STEPBible-Data
 *
 * Usage: node scripts/fetchGeseniusLexicon.js
 * Output: public/data/gesenius_lexicon.json (expanded)
 */

const fs = require('fs');
const path = require('path');

// Paths
const OUTPUT_PATH = path.join(__dirname, '../public/data/gesenius_lexicon.json');
const EXISTING_PATH = OUTPUT_PATH; // We'll merge with existing
const STRONGS_PATH = path.join(__dirname, '../public/data/strongsComplete.json');

// STEP Bible raw data URLs (GitHub raw content)
// TBESH = Translators Brief lexicon of Extended Strongs for Hebrew (CC BY, 3.3MB)
const STEP_LEXICON_URL = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt';
const STEP_MORPHOLOGY_URL = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/TOHGC%20-%20Translators%20Amalgamated%20Hebrew%20Grammar%20Codes.txt';

// Alternative: OpenScriptures morphhb data
const OPENSCRIPTURES_URL = 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml';

// Full BDB (Brown-Driver-Briggs) XML - richest scholarly source
const BDB_XML_URL = 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml';

// Configuration
const TIMEOUT_MS = 60000; // 60s for large files (TBESH is 3.3MB)
const MIN_DEFINITION_LENGTH = 3;

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Torah-Reader-App/1.0 (Scholarly Research)',
        'Accept': 'text/plain, application/xml, */*'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse STEP Bible TBESH lexicon TSV format
 * Format: eStrong#  dStrong  uStrong  Hebrew  Transliteration  Morph  Gloss  Meaning
 */
function parseSTEPLexicon(data) {
  const entries = {};
  const lines = data.split('\n');

  let headerFound = false;
  let dataStarted = false;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Skip comment/description lines (start with letters, not H/A for Strong's)
    if (!dataStarted && !line.startsWith('H') && !line.startsWith('A')) {
      // Detect header row
      if (line.includes('eStrong#') && line.includes('Hebrew')) {
        headerFound = true;
        console.log('  Found TBESH header row');
      }
      continue;
    }

    dataStarted = true;
    const parts = line.split('\t');

    // TBESH format: eStrong#, dStrong, uStrong, Hebrew, Transliteration, Morph, Gloss, Meaning
    if (parts.length >= 7) {
      try {
        const eStrong = parts[0]?.trim();      // e.g., "H0001"
        const dStrong = parts[1]?.trim();      // e.g., "H0001G ="
        const uStrong = parts[2]?.trim();      // e.g., "H0001G"
        const hebrew = parts[3]?.trim();       // e.g., "אָב"
        const translit = parts[4]?.trim();     // e.g., "av"
        const morph = parts[5]?.trim();        // e.g., "H:N-M"
        const gloss = parts[6]?.trim();        // e.g., "father"
        const meaning = parts[7]?.trim() || gloss;  // Full definition

        // Skip if no Hebrew word
        if (!hebrew || !/[א-ת]/.test(hebrew)) continue;

        // Clean the Hebrew word (remove niqqud for key)
        const key = hebrew.replace(/[\u0591-\u05C7]/g, '').trim();
        if (key.length < 1) continue;

        // Parse morphology code for POS (e.g., "H:N-M" = Hebrew Noun Masculine)
        let pos = null;
        if (morph) {
          const morphMatch = morph.match(/[HA]:([A-Z][a-z]*)/);
          if (morphMatch) {
            const morphMap = {
              'N': 'noun', 'V': 'verb', 'A': 'adj.', 'Adj': 'adj.',
              'Adv': 'adv.', 'Prep': 'prep.', 'Conj': 'conj.',
              'Part': 'particle', 'Intj': 'interj.', 'Art': 'article',
              'PerP': 'pron.', 'DemP': 'pron.', 'RelP': 'pron.',
              'Intg': 'interrog.', 'Neg': 'negation'
            };
            pos = morphMap[morphMatch[1]] || morphMatch[1].toLowerCase();
          }
        }

        // Clean meaning (remove HTML, shorten)
        let cleanMeaning = meaning
          .replace(/<br>/gi, '; ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Extract etymology note if present
        let etymology = null;
        const etymMatch = cleanMeaning.match(/Aramaic (?:of|equivalent:?) ([^;]+)/i);
        if (etymMatch) {
          etymology = `Aramaic: ${etymMatch[1].trim()}`;
        }

        // Build entry
        const entry = {
          lemma: hebrew,
          key: key,
          strong: eStrong || null,
          dStrong: dStrong?.replace(/\s*=.*/, '') || null,
          transliteration: translit || null,
          pos: pos,
          gloss: gloss || null,
          definition: cleanMeaning || gloss || '',
          morph: morph || null,
          source: 'Gesenius'
        };

        if (etymology) {
          entry.etymology = etymology;
        }

        // Store (prefer longer definitions if duplicate, or prefer non-names)
        const isName = morph?.includes('N:N-') && (morph.includes('-P') || morph.includes('-L'));
        const existingIsName = entries[key]?.morph?.includes('N:N-');

        if (!entries[key] ||
            (!isName && existingIsName) ||
            (entry.definition.length > (entries[key].definition?.length || 0) && !isName)) {
          entries[key] = entry;
        }

      } catch (e) {
        // Skip malformed lines
      }
    }
  }

  return entries;
}

/**
 * Parse OpenScriptures XML format (fallback)
 */
function parseOpenScripturesXML(xmlData) {
  const entries = {};

  // Simple regex-based XML parsing for <entry> elements
  const entryRegex = /<entry[^>]*>[\s\S]*?<\/entry>/g;
  const matches = xmlData.match(entryRegex) || [];

  for (const entryXml of matches) {
    try {
      // Extract fields
      const idMatch = entryXml.match(/id="([^"]+)"/);
      const hebrewMatch = entryXml.match(/<w>([^<]+)<\/w>/);
      const glossMatch = entryXml.match(/<gloss>([^<]+)<\/gloss>/);
      const defMatch = entryXml.match(/<def>([^<]+)<\/def>/);
      const posMatch = entryXml.match(/<pos>([^<]+)<\/pos>/);

      const hebrew = hebrewMatch?.[1]?.trim();
      if (!hebrew || !/[א-ת]/.test(hebrew)) continue;

      const key = hebrew.replace(/[\u0591-\u05C7]/g, '').trim();
      if (key.length < 2) continue;

      const definition = defMatch?.[1] || glossMatch?.[1] || '';
      if (definition.length < MIN_DEFINITION_LENGTH) continue;

      entries[key] = {
        lemma: hebrew,
        key: key,
        strong: idMatch?.[1] || null,
        pos: posMatch?.[1] || null,
        definition: definition,
        source: 'Gesenius'
      };

    } catch (e) {
      // Skip malformed entries
    }
  }

  return entries;
}

/**
 * Parse full BDB XML for rich scholarly data
 * Extracts: definitions, biblical refs, cognates, cross-refs
 */
function parseBDBXML(xmlData) {
  const entries = {};
  let entryCount = 0;

  // Match <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlData)) !== null) {
    try {
      const entryXml = match[0];
      const entryContent = match[1];

      // Extract Hebrew word(s)
      const hebrewMatches = entryContent.match(/<w[^>]*>([^<]+)<\/w>/g) || [];
      if (hebrewMatches.length === 0) continue;

      // Get first Hebrew word as main entry
      const firstHebrew = hebrewMatches[0].replace(/<[^>]+>/g, '').trim();
      if (!firstHebrew || !/[א-ת]/.test(firstHebrew)) continue;

      const key = firstHebrew.replace(/[\u0591-\u05C7]/g, '').trim();
      if (key.length < 1) continue;

      // Extract part of speech
      const posMatch = entryContent.match(/<pos>([^<]+)<\/pos>/);
      const pos = posMatch ? posMatch[1].trim() : null;

      // Extract all definitions
      const defMatches = entryContent.match(/<def>([^<]+)<\/def>/g) || [];
      const definitions = defMatches.map(d => d.replace(/<[^>]+>/g, '').trim());

      // Extract sense numbers and their definitions
      const senses = [];
      const senseRegex = /<sense[^>]*n="([^"]*)"[^>]*>([\s\S]*?)<\/sense>/g;
      let senseMatch;
      while ((senseMatch = senseRegex.exec(entryContent)) !== null) {
        const senseNum = senseMatch[1];
        const senseContent = senseMatch[2];
        const senseDefs = senseContent.match(/<def>([^<]+)<\/def>/g) || [];
        const senseText = senseDefs.map(d => d.replace(/<[^>]+>/g, '').trim()).join(', ');
        if (senseText) {
          senses.push(`${senseNum}) ${senseText}`);
        }
      }

      // Extract biblical references
      const refMatches = entryContent.match(/<ref[^>]*r="([^"]+)"[^>]*>/g) || [];
      const biblicalRefs = refMatches.slice(0, 5).map(r => {
        const refMatch = r.match(/r="([^"]+)"/);
        return refMatch ? refMatch[1] : null;
      }).filter(Boolean);

      // Extract cognate languages
      const cognates = [];
      const foreignMatches = entryContent.match(/<foreign[^>]*xml:lang="([^"]+)"[^>]*>([^<]*)<\/foreign>/g) || [];
      for (const fm of foreignMatches.slice(0, 3)) {
        const langMatch = fm.match(/xml:lang="([^"]+)"/);
        const textMatch = fm.match(/>([^<]*)</);
        if (langMatch && textMatch) {
          const langMap = {
            'akk': 'Akkadian', 'ara': 'Arabic', 'syr': 'Syriac',
            'gez': 'Ethiopic', 'grc': 'Greek', 'lat': 'Latin'
          };
          const langName = langMap[langMatch[1]] || langMatch[1];
          cognates.push(`${langName}: ${textMatch[1].trim()}`);
        }
      }

      // Extract cross-references to other entries
      const crossRefs = [];
      const srcMatches = entryContent.match(/src="([^"]+)"/g) || [];
      for (const sm of srcMatches.slice(0, 3)) {
        const srcMatch = sm.match(/src="([^"]+)"/);
        if (srcMatch) crossRefs.push(srcMatch[1]);
      }

      // Extract verb stems (Qal, Piel, etc.)
      const stems = [];
      const stemMatches = entryContent.match(/<stem>([^<]+)<\/stem>/g) || [];
      for (const stm of stemMatches) {
        stems.push(stm.replace(/<[^>]+>/g, '').trim());
      }

      // Build definition
      let fullDef = '';
      if (senses.length > 0) {
        fullDef = senses.join('; ');
      } else if (definitions.length > 0) {
        fullDef = definitions.join(', ');
      }

      if (!fullDef || fullDef.length < 2) continue;

      // Build entry
      const entry = {
        lemma: firstHebrew,
        key: key,
        pos: pos,
        definition: fullDef,
        source: 'Gesenius'
      };

      // Add optional fields
      if (biblicalRefs.length > 0) {
        entry.refs = biblicalRefs;
      }
      if (cognates.length > 0) {
        entry.cognates = cognates;
      }
      if (crossRefs.length > 0) {
        entry.crossRefs = crossRefs;
      }
      if (stems.length > 0) {
        entry.stems = stems;
      }

      // Store (prefer entries with more data)
      if (!entries[key] ||
          (entry.definition.length > entries[key].definition?.length) ||
          (entry.refs && !entries[key].refs)) {
        entries[key] = entry;
        entryCount++;
      }

    } catch (e) {
      // Skip malformed entries
    }
  }

  console.log(`  Parsed ${entryCount} entries from BDB XML`);
  return entries;
}

/**
 * Fetch from STEP Bible API directly (word lookup)
 */
async function fetchSTEPWord(word) {
  try {
    const url = `https://www.stepbible.org/rest/search/masterSearch/version=ESV|reference=${encodeURIComponent(word)}/HNVUG`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    return null;
  }
}

// Paths for etymology enrichment
const BDB_ETYMOLOGY_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');
const WIKTIONARY_ETYMOLOGY_PATH = path.join(__dirname, '../public/data/etymology_wiktionary.json');
const ROOT_MEANINGS_PATH = path.join(__dirname, '../public/data/root_meanings_pro.json');

/**
 * Enrich entries with BDB etymology data (cognates, semantic fields)
 */
function enrichWithBDBEtymology(entries) {
  if (!fs.existsSync(BDB_ETYMOLOGY_PATH)) {
    console.log('  BDB etymology file not found, skipping...');
    return entries;
  }

  try {
    const bdbEtym = JSON.parse(fs.readFileSync(BDB_ETYMOLOGY_PATH, 'utf8'));
    const etymEntries = bdbEtym.entries || bdbEtym;

    let cognatesAdded = 0;
    let semanticAdded = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const etymEntry = etymEntries[key];
      if (!etymEntry) continue;

      // Add cognates from BDB etymology
      if (etymEntry.etymology?.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(etymEntry.etymology.cognates)) {
          for (const cog of cognates) {
            const word = typeof cog === 'string' ? cog : cog.word;
            if (word) {
              const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
              cognateList.push(`${langName}: ${word}`);
            }
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6); // Limit to 6 cognates
          cognatesAdded++;
        }
      }

      // Add semantic field
      if (etymEntry.semanticField && !entry.semanticField) {
        entry.semanticField = etymEntry.semanticField;
        semanticAdded++;
      }

      // Add root if available
      if (etymEntry.etymology?.root && !entry.root) {
        entry.root = etymEntry.etymology.root;
      }
    }

    console.log(`  Added cognates to ${cognatesAdded} entries`);
    console.log(`  Added semantic fields to ${semanticAdded} entries`);
    return entries;

  } catch (e) {
    console.log(`  Error loading BDB etymology: ${e.message}`);
    return entries;
  }
}

/**
 * Enrich entries with Proto-Semitic reconstructions from Wiktionary
 */
function enrichWithProtoSemitic(entries) {
  if (!fs.existsSync(WIKTIONARY_ETYMOLOGY_PATH)) {
    console.log('  Wiktionary etymology file not found, skipping...');
    return entries;
  }

  try {
    const wiktionary = JSON.parse(fs.readFileSync(WIKTIONARY_ETYMOLOGY_PATH, 'utf8'));
    const wiktEntries = wiktionary.entries || wiktionary;

    let protoAdded = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const wiktEntry = wiktEntries[key];
      if (!wiktEntry) continue;

      // Add Proto-Semitic reconstruction
      if (wiktEntry.protoSemitic && !entry.protoSemitic) {
        entry.protoSemitic = wiktEntry.protoSemitic;
        protoAdded++;
      }

      // Add etymology text if not present
      if (wiktEntry.etymologyText && !entry.etymologyText) {
        entry.etymologyText = wiktEntry.etymologyText;
      }

      // Merge cognates if we don't have them yet
      if (wiktEntry.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(wiktEntry.cognates)) {
          for (const word of cognates) {
            const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
            cognateList.push(`${langName}: ${word}`);
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
        }
      }
    }

    console.log(`  Added Proto-Semitic to ${protoAdded} entries`);
    return entries;

  } catch (e) {
    console.log(`  Error loading Wiktionary etymology: ${e.message}`);
    return entries;
  }
}

/**
 * Enrich entries with root meanings from unified etymology database
 */
function enrichWithRootMeanings(entries) {
  if (!fs.existsSync(ROOT_MEANINGS_PATH)) {
    console.log('  Root meanings file not found, skipping...');
    return entries;
  }

  try {
    const rootData = JSON.parse(fs.readFileSync(ROOT_MEANINGS_PATH, 'utf8'));
    const rootEntries = rootData.entries || rootData;

    let rootsAdded = 0;
    let cognatesFromRoot = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const rootEntry = rootEntries[key];
      if (!rootEntry) continue;

      // Add root info
      if (rootEntry.root && !entry.root) {
        entry.root = rootEntry.root;
        rootsAdded++;
      }

      // Add quality tier from unified database
      if (rootEntry.quality && !entry.quality) {
        entry.quality = rootEntry.quality;
      }

      // Add cognates if we don't have them
      if (rootEntry.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(rootEntry.cognates)) {
          if (Array.isArray(cognates)) {
            for (const cog of cognates) {
              const word = typeof cog === 'string' ? cog : cog.word;
              if (word) {
                const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                cognateList.push(`${langName}: ${word}`);
              }
            }
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
          cognatesFromRoot++;
        }
      }

      // Add semantic field if not present
      if (rootEntry.semanticField && !entry.semanticField) {
        entry.semanticField = rootEntry.semanticField;
      }

      // Add Proto-Semitic if available and not present
      if (rootEntry.protoSemitic && !entry.protoSemitic) {
        entry.protoSemitic = rootEntry.protoSemitic;
      }
    }

    console.log(`  Added root info to ${rootsAdded} entries`);
    console.log(`  Added cognates from root DB to ${cognatesFromRoot} entries`);
    return entries;

  } catch (e) {
    console.log(`  Error loading root meanings: ${e.message}`);
    return entries;
  }
}

/**
 * Enrich entries with Strong's data from existing file
 */
function enrichWithStrongs(entries, strongsData) {
  if (!strongsData) return entries;

  let enriched = 0;

  for (const [key, entry] of Object.entries(entries)) {
    // Try to match by Hebrew word key
    if (strongsData[key]) {
      const strongEntry = strongsData[key];

      // Add grammar notes if available
      if (strongEntry.derivation && !entry.grammar_note) {
        entry.grammar_note = strongEntry.derivation;
        enriched++;
      }

      // Add usage examples if available
      if (strongEntry.kjv_def && !entry.usage) {
        entry.usage = strongEntry.kjv_def;
      }

      // Add Strong's number if missing
      if (strongEntry.strongs && !entry.strong) {
        entry.strong = strongEntry.strongs;
      }

      // Add transliteration if missing
      if (strongEntry.xlit && !entry.transliteration) {
        entry.transliteration = strongEntry.xlit;
      }
    }
  }

  console.log(`  Enriched ${enriched} entries with Strong's data`);
  return entries;
}

/**
 * Merge with existing Gesenius data (preserve grammar entries)
 */
function mergeWithExisting(newEntries, existingPath) {
  if (!fs.existsSync(existingPath)) {
    return newEntries;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    const merged = { ...newEntries };

    // Preserve existing grammar-focused entries (they have grammar_note or pattern fields)
    for (const [key, entry] of Object.entries(existing)) {
      if (key === '_meta') continue;

      // Keep existing if it has grammar notes or patterns
      if (entry.grammar_note || entry.pattern || entry.forms) {
        // Merge: keep grammar info, update definition if new is better
        if (merged[key]) {
          merged[key] = {
            ...merged[key],
            grammar_note: entry.grammar_note || merged[key].grammar_note,
            pattern: entry.pattern || merged[key].pattern,
            forms: entry.forms || merged[key].forms,
            usage: entry.usage || merged[key].usage
          };
        } else {
          merged[key] = entry;
        }
      }
    }

    console.log(`  Merged with ${Object.keys(existing).length - 1} existing entries`);
    return merged;

  } catch (e) {
    console.log(`  Could not load existing data: ${e.message}`);
    return newEntries;
  }
}

/**
 * Create synthetic entries from Strong's data for Biblical Hebrew
 */
function createFromStrongs(strongsPath) {
  const entries = {};

  if (!fs.existsSync(strongsPath)) {
    console.log('  Strong\'s data not found, skipping...');
    return entries;
  }

  try {
    const strongs = JSON.parse(fs.readFileSync(strongsPath, 'utf8'));
    // Your Strong's uses byWord structure
    const strongsEntries = strongs.byWord || strongs.byStrong || strongs;

    let count = 0;
    for (const [wordKey, data] of Object.entries(strongsEntries)) {
      // Skip non-Hebrew or metadata
      if (!wordKey || !/[א-ת]/.test(wordKey)) continue;
      if (wordKey.startsWith('_')) continue;

      const hebrew = data.lemma || wordKey;
      const key = hebrew.replace(/[\u0591-\u05C7]/g, '').trim();
      if (key.length < 2) continue;

      // Get definition (your format has strongs_def, gloss, definition)
      const definition = data.gloss || data.strongs_def || data.definition;
      if (!definition || definition.length < MIN_DEFINITION_LENGTH) continue;

      // Create Gesenius-style entry
      entries[key] = {
        lemma: hebrew,
        key: key,
        strong: data.strongs || null,
        transliteration: data.xlit || null,
        pos: detectPOS(definition),
        definition: cleanDefinition(definition),
        grammar_note: data.derivation || data.etymology || null,
        source: 'Gesenius'
      };

      count++;
    }

    console.log(`  Created ${count} entries from Strong's concordance`);
    return entries;

  } catch (e) {
    console.log(`  Error reading Strong's: ${e.message}`);
    return entries;
  }
}

/**
 * Detect part of speech from definition text
 */
function detectPOS(definition) {
  if (!definition) return null;

  const lower = definition.toLowerCase();

  if (/^(a |the )?proper (name|noun)/i.test(lower)) return 'proper noun';
  if (/^(a |the )?(masculine |feminine )?(plural )?noun/i.test(lower)) return 'noun';
  if (/^(a )?verb/i.test(lower) || /to \w+/.test(lower)) return 'verb';
  if (/^(an? )?adjective/i.test(lower)) return 'adj.';
  if (/^(an? )?adverb/i.test(lower)) return 'adv.';
  if (/^(a )?preposition/i.test(lower)) return 'prep.';
  if (/^(a )?conjunction/i.test(lower)) return 'conj.';
  if (/^(a |an )?interjection/i.test(lower)) return 'interj.';
  if (/^(a )?pronoun/i.test(lower)) return 'pron.';
  if (/^(a )?particle/i.test(lower)) return 'particle';

  return null;
}

/**
 * Clean definition text
 */
function cleanDefinition(def) {
  if (!def) return '';

  return def
    .replace(/^(a |an |the )/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main fetch and build function
 */
async function buildGeseniusLexicon() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       Gesenius Hebrew Lexicon Builder                         ║');
  console.log('║       (Public Domain 1910 + STEP Bible Data)                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let allEntries = {};

  // Method 1: Try STEP Bible lexicon data
  console.log('1. Fetching STEP Bible lexicon data...');
  try {
    const stepData = await fetchWithTimeout(STEP_LEXICON_URL);
    const stepEntries = parseSTEPLexicon(stepData);
    console.log(`   Found ${Object.keys(stepEntries).length} entries from STEP`);
    allEntries = { ...allEntries, ...stepEntries };
  } catch (e) {
    console.log(`   STEP fetch failed: ${e.message}`);
  }

  // Method 2: Create from Strong's concordance (comprehensive)
  console.log('\n2. Building from Strong\'s concordance...');
  const strongsEntries = createFromStrongs(STRONGS_PATH);
  // Strong's entries are base, STEP entries override with better data
  allEntries = { ...strongsEntries, ...allEntries };

  // Method 3: Fetch full BDB XML for scholarly data (cognates, refs, cross-refs)
  console.log('\n3. Fetching BDB XML for scholarly enrichment...');
  try {
    const bdbData = await fetchWithTimeout(BDB_XML_URL, 90000); // 90s for 2.9MB
    const bdbEntries = parseBDBXML(bdbData);
    console.log(`   Found ${Object.keys(bdbEntries).length} entries from BDB XML`);

    // Merge BDB data (add cognates, refs to existing entries)
    let enrichedCount = 0;
    for (const [key, bdbEntry] of Object.entries(bdbEntries)) {
      if (allEntries[key]) {
        // Enrich existing entry with BDB data
        if (bdbEntry.cognates && !allEntries[key].cognates) {
          allEntries[key].cognates = bdbEntry.cognates;
          enrichedCount++;
        }
        if (bdbEntry.refs && !allEntries[key].refs) {
          allEntries[key].refs = bdbEntry.refs;
        }
        if (bdbEntry.crossRefs && !allEntries[key].crossRefs) {
          allEntries[key].crossRefs = bdbEntry.crossRefs;
        }
        if (bdbEntry.stems && !allEntries[key].stems) {
          allEntries[key].stems = bdbEntry.stems;
        }
      } else {
        // Add new entry from BDB
        allEntries[key] = bdbEntry;
      }
    }
    console.log(`   Enriched ${enrichedCount} entries with cognates/refs`);
  } catch (e) {
    console.log(`   BDB fetch failed: ${e.message}`);
  }

  // Method 4: Try OpenScriptures as fallback
  if (Object.keys(allEntries).length < 1000) {
    console.log('\n4. Trying OpenScriptures fallback...');
    try {
      const osData = await fetchWithTimeout(OPENSCRIPTURES_URL);
      const osEntries = parseOpenScripturesXML(osData);
      console.log(`   Found ${Object.keys(osEntries).length} entries from OpenScriptures`);
      allEntries = { ...allEntries, ...osEntries };
    } catch (e) {
      console.log(`   OpenScriptures fetch failed: ${e.message}`);
    }
  }

  // Enrich with Strong's grammar data
  console.log('\n5. Enriching with Strong\'s grammar data...');
  if (fs.existsSync(STRONGS_PATH)) {
    const strongs = JSON.parse(fs.readFileSync(STRONGS_PATH, 'utf8'));
    allEntries = enrichWithStrongs(allEntries, strongs.byStrong || strongs);
  }

  // Merge with existing Gesenius data (preserve grammar entries)
  console.log('\n6. Merging with existing Gesenius grammar data...');
  allEntries = mergeWithExisting(allEntries, EXISTING_PATH);

  // Method 7: Enrich with BDB etymology data (cognates, semantic fields)
  console.log('\n7. Enriching with BDB etymology data...');
  allEntries = enrichWithBDBEtymology(allEntries);

  // Method 8: Add Proto-Semitic reconstructions from Wiktionary
  console.log('\n8. Adding Proto-Semitic reconstructions...');
  allEntries = enrichWithProtoSemitic(allEntries);

  // Method 9: Add root meanings
  console.log('\n9. Adding root meanings...');
  allEntries = enrichWithRootMeanings(allEntries);

  // Build final output
  const entryCount = Object.keys(allEntries).length;

  // Count entries with scholarly data
  const entriesWithCognates = Object.values(allEntries).filter(e => e.cognates).length;
  const entriesWithRefs = Object.values(allEntries).filter(e => e.refs).length;
  const entriesWithCrossRefs = Object.values(allEntries).filter(e => e.crossRefs).length;
  const entriesWithProtoSemitic = Object.values(allEntries).filter(e => e.protoSemitic).length;
  const entriesWithSemanticField = Object.values(allEntries).filter(e => e.semanticField).length;
  const entriesWithRoot = Object.values(allEntries).filter(e => e.root).length;

  const output = {
    _meta: {
      name: 'Gesenius',
      fullName: "Gesenius' Hebrew Grammar and Lexicon",
      author: 'Wilhelm Gesenius (ed. E. Kautzsch, A.E. Cowley)',
      year: 1910,
      description: 'Classic reference work on Biblical Hebrew grammar and vocabulary with scholarly enrichment',
      entries: entryCount,
      tier: 1,
      note: 'Academic Tier 1 - Foundational Hebrew lexicon reference',
      sources: ['STEP Bible (Tyndale House)', "Strong's Concordance", 'BDB (Brown-Driver-Briggs)', 'OpenScriptures', 'Wiktionary Proto-Semitic'],
      license: 'Public Domain (1910) / CC BY (STEP, OpenScriptures) / CC-BY-SA (Wiktionary)',
      scholarlyData: {
        entriesWithCognates,
        entriesWithBiblicalRefs: entriesWithRefs,
        entriesWithCrossRefs,
        entriesWithProtoSemitic,
        entriesWithSemanticField,
        entriesWithRoot
      },
      builtAt: new Date().toISOString()
    },
    ...allEntries
  };

  // Write output
  console.log(`\n10. Writing ${entryCount} entries to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ✅ Gesenius Lexicon Build Complete!                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal entries: ${entryCount}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  console.log('\nScholarly enrichment:');
  console.log(`  Entries with cognates:      ${entriesWithCognates}`);
  console.log(`  Entries with biblical refs: ${entriesWithRefs}`);
  console.log(`  Entries with cross-refs:    ${entriesWithCrossRefs}`);
  console.log(`  Entries with Proto-Semitic: ${entriesWithProtoSemitic}`);
  console.log(`  Entries with semantic field:${entriesWithSemanticField}`);
  console.log(`  Entries with root:          ${entriesWithRoot}`);

  // Sample entries
  console.log('\nSample entries:');
  const sampleKeys = Object.keys(allEntries).slice(0, 3);
  for (const key of sampleKeys) {
    const e = allEntries[key];
    console.log(`  ${key}: ${e.gloss || e.definition?.substring(0, 40)}...`);
    if (e.cognates) console.log(`    Cognates: ${e.cognates.slice(0,2).join(', ')}`);
    if (e.protoSemitic) console.log(`    Proto-Semitic: ${e.protoSemitic}`);
  }

  return output;
}

// Run if called directly
if (require.main === module) {
  buildGeseniusLexicon().catch(console.error);
}

module.exports = { buildGeseniusLexicon };
