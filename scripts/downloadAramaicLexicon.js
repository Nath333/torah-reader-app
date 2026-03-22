/**
 * Download Aramaic vocabulary from Sefaria's Jastrow Dictionary
 * Run with: node scripts/downloadAramaicLexicon.js
 */

const fs = require('fs');
const path = require('path');

// Common Aramaic/Talmudic words to fetch
const ARAMAIC_WORDS = [
  // Common verbs
  'אמר', 'הוה', 'עבד', 'יהב', 'נסב', 'אזל', 'אתא', 'חזא', 'ידע', 'בעא',
  'שמע', 'קרא', 'כתב', 'נפק', 'עאל', 'יתב', 'קום', 'אכל', 'שתא', 'קטל',
  'שרי', 'אסר', 'סבר', 'תנא', 'גמר', 'פסק', 'מתני', 'ברא',
  // Common nouns
  'מילתא', 'עובדא', 'גברא', 'איתתא', 'ביתא', 'ארעא', 'שמיא', 'מיא', 'נורא',
  'יומא', 'ליליא', 'עלמא', 'נפשא', 'לבא', 'ידא', 'רגלא', 'עינא', 'פומא',
  'רישא', 'מלכא', 'מלכותא', 'דינא', 'ממונא', 'חיובא', 'זכותא',
  // Family terms
  'אבא', 'אימא', 'בר', 'ברתא', 'אחא',
  // Talmudic terms
  'קשיא', 'תיובתא', 'פירוקא', 'שמעתא', 'מימרא', 'פלוגתא', 'ברייתא',
  'משנה', 'גמרא', 'הלכה', 'אגדה',
  // Question words
  'מאי', 'היכי', 'הכי', 'מנא', 'היכא', 'אמאי',
  // Particles
  'אית', 'לית', 'הא', 'אלא', 'דלמא', 'השתא', 'נמי', 'תו',
  // Adjectives
  'רבא', 'זעירא', 'טבא', 'בישא',
  // Numbers
  'חד', 'תרי', 'תלת', 'ארבע', 'חמש', 'שית', 'שבע'
];

async function fetchWord(word) {
  const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`Error fetching ${word}:`, err.message);
    return null;
  }
}

function extractJastrowAramaic(entries) {
  // Filter for Jastrow Aramaic entries
  return entries.filter(entry =>
    entry.parent_lexicon === 'Jastrow Dictionary' &&
    (entry.language_code?.includes('ch') || // Chaldean/Aramaic
     entry.headword?.includes('ֲ') || // Aramaic vowel patterns
     entry.content?.senses?.some(s =>
       s.definition?.toLowerCase().includes('aram') ||
       s.definition?.toLowerCase().includes('targ') ||
       s.definition?.toLowerCase().includes('talmud')
     ))
  );
}

function cleanDefinition(def) {
  if (!def) return '';
  // Remove HTML tags
  return def
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Truncate long definitions
}

function processEntry(entry) {
  const senses = entry.content?.senses || [];
  let definition = '';

  for (const sense of senses) {
    if (sense.definition) {
      definition = cleanDefinition(sense.definition);
      break;
    }
    if (sense.senses) {
      for (const subSense of sense.senses) {
        if (subSense.definition) {
          definition = cleanDefinition(subSense.definition);
          break;
        }
      }
      if (definition) break;
    }
  }

  return {
    lemma: entry.headword?.replace(/\s*[ᴵᴵᴵ]+$/, '').trim(),
    pos: entry.content?.morphology || 'unknown',
    definition: definition,
    source: 'Jastrow'
  };
}

async function main() {
  console.log('Downloading Aramaic vocabulary from Sefaria...\n');

  const results = {};
  let count = 0;

  for (const word of ARAMAIC_WORDS) {
    process.stdout.write(`Fetching ${word}... `);
    const data = await fetchWord(word);

    if (data && Array.isArray(data)) {
      const jastrowEntries = extractJastrowAramaic(data);

      if (jastrowEntries.length > 0) {
        const processed = processEntry(jastrowEntries[0]);
        if (processed.definition) {
          results[word] = processed;
          count++;
          console.log('✓');
        } else {
          console.log('(no definition)');
        }
      } else {
        // Check for any Jastrow entry
        const anyJastrow = data.find(e => e.parent_lexicon === 'Jastrow Dictionary');
        if (anyJastrow) {
          const processed = processEntry(anyJastrow);
          if (processed.definition) {
            results[word] = processed;
            count++;
            console.log('✓');
          } else {
            console.log('(no definition)');
          }
        } else {
          console.log('(not in Jastrow)');
        }
      }
    } else {
      console.log('(not found)');
    }

    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));
  }

  // Generate output
  const output = `/**
 * Jastrow Aramaic Dictionary - Downloaded from Sefaria
 * Source: Marcus Jastrow, "A Dictionary of the Targumim, the Talmud Babli and Yerushalmi"
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * ${count} entries
 */

export const JASTROW_ARAMAIC = ${JSON.stringify(results, null, 2)};

export const lookupJastrowLocal = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '');
  return JASTROW_ARAMAIC[cleaned] || null;
};

export default JASTROW_ARAMAIC;
`;

  const outputPath = path.join(__dirname, '..', 'src', 'data', 'jastrowAramaic.js');
  fs.writeFileSync(outputPath, output);

  console.log(`\n✓ Downloaded ${count} Aramaic entries`);
  console.log(`✓ Saved to ${outputPath}`);
}

main().catch(console.error);
