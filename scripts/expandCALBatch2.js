/**
 * Expand CAL Aramaic Lexicon - Batch 2
 * Additional Aramaic words from common Talmudic vocabulary
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';
const DELAY_MS = 150;

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║         EXPAND CAL ARAMAIC - BATCH 2                                      ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

const calPath = path.join(DATA_DIR, 'cal_aramaic.json');
let calData = JSON.parse(fs.readFileSync(calPath, 'utf8'));
console.log(`Starting with ${Object.keys(calData).length} entries`);

// Batch 2: More common Aramaic vocabulary
const batch2Words = [
  // Additional verbs
  'נטר', 'שבק', 'שדי', 'רמי', 'קפד', 'גזי', 'בדק', 'פשט', 'שקל',
  'איחייב', 'איפטר', 'אתחזי', 'איתמר', 'איתעביד', 'אשתמע',
  'ממלא', 'מרבה', 'ממעט', 'מוסיף', 'מגרע', 'משמע',
  'מודה', 'כופר', 'טוען', 'מעיד', 'מכחיש', 'מודה',
  // Legal terms
  'שבועה', 'נדר', 'התר', 'איסר', 'חרם', 'קללה',
  'גט', 'קידושין', 'כתובה', 'גירושין', 'חליצה',
  'ירושה', 'נחלה', 'צוואה', 'מתנה', 'הקדש',
  'בכור', 'פדיון', 'ערכין', 'חרמין', 'תמורה',
  // Sacrificial terms
  'עולה', 'חטאת', 'אשם', 'שלמים', 'מנחה', 'נסך',
  'זבח', 'קטרת', 'לבונה', 'סמים', 'תמיד',
  // Temple terms
  'מזבח', 'כיור', 'מנורה', 'שלחן', 'ארון', 'כפרת',
  'פרכת', 'מסך', 'קלעים', 'קרשים', 'אדנים',
  // Agricultural terms
  'שדה', 'כרם', 'גנה', 'פרדס', 'יער', 'מדבר',
  'זרע', 'קציר', 'גרן', 'יקב', 'בור', 'גת',
  // Animals
  'בהמה', 'חיה', 'עוף', 'דג', 'שרץ', 'רמש',
  'שור', 'פרה', 'כבש', 'עז', 'חמור', 'גמל',
  // Food/Drink
  'לחם', 'יין', 'שמן', 'דבש', 'חלב', 'בשר',
  'פת', 'מזון', 'מאכל', 'משקה', 'תבלין',
  // Clothing
  'בגד', 'כסות', 'מלבוש', 'ציצית', 'טלית', 'כיפה',
  'נעל', 'סנדל', 'חגורה', 'אבנט', 'מצנפת',
  // Objects
  'כלי', 'חפץ', 'דבר', 'אבן', 'עץ', 'ברזל',
  'נחשת', 'כסף', 'זהב', 'חרס', 'עור',
  // Abstract concepts
  'אמת', 'שקר', 'צדק', 'רשע', 'טוב', 'רע',
  'אהבה', 'שנאה', 'רחמים', 'אכזריות', 'חכמה', 'סכלות',
  // Time expressions
  'עתה', 'מתי', 'אימתי', 'לפני', 'אחרי', 'תחלה',
  'סוף', 'קודם', 'אחור', 'עבר', 'עתיד', 'הווה',
  // Quantities
  'הרבה', 'מעט', 'כלום', 'שום', 'כל', 'מקצת',
  'רוב', 'מיעוט', 'חצי', 'שליש', 'רבע',
  // Directions
  'מזרח', 'מערב', 'צפון', 'דרום', 'מעלה', 'מטה',
  'פנים', 'חוץ', 'לפנים', 'לאחור', 'ימין', 'שמאל',
  // More Talmudic technical terms
  'סוגיא', 'מסכת', 'פרק', 'דף', 'עמוד', 'שורה',
  'מאמר', 'דרשה', 'פירוש', 'ביאור', 'חידוש', 'קושיא',
  // Additional common words
  'אפילו', 'דווקא', 'בלבד', 'ממש', 'עצמו', 'גופא',
  'כגון', 'למשל', 'כעין', 'מעין', 'דוגמא', 'ראיה'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWord(word) {
  try {
    const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
}

function cleanHtml(text) {
  if (!text) return text;
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[,;:]\s*/, '')
    .replace(/^\s*v\.\s*/i, '')
    .trim();
}

function processEntry(word, sefariaData) {
  if (!sefariaData || !Array.isArray(sefariaData) || sefariaData.length === 0) {
    return null;
  }

  const relevantEntries = sefariaData.filter(e =>
    e.parent_lexicon?.includes('Jastrow') ||
    e.language_code === 'arc' ||
    e.parent_lexicon?.includes('Aramaic')
  );

  if (relevantEntries.length === 0 && sefariaData.length > 0) {
    relevantEntries.push(sefariaData[0]);
  }

  if (relevantEntries.length === 0) return null;

  const definitions = [];
  const forms = new Set();
  const dialects = new Set(['JBA', 'JPA']);
  let pos = '';

  for (const entry of relevantEntries) {
    if (entry.morphology && !pos) pos = entry.morphology;
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          definitions.push(cleanHtml(sense.definition));
        }
      }
    }
    if (entry.alt_headwords) entry.alt_headwords.forEach(h => forms.add(h));
    if (entry.plural_form) entry.plural_form.forEach(p => forms.add(p));
  }

  const uniqueDefs = [...new Set(definitions.filter(d => d && d.length > 2))];
  const definition = uniqueDefs.slice(0, 3).join('; ').substring(0, 400);

  if (!definition || definition.length < 3) return null;

  return {
    lemma: word,
    pos: pos || 'unknown',
    definition: definition,
    dialects: [...dialects],
    forms: [word, ...forms],
    source: 'Sefaria/Jastrow'
  };
}

async function main() {
  const wordsToFetch = batch2Words.filter(w => !calData[w]);
  console.log(`Words to fetch: ${wordsToFetch.length}`);

  let success = 0, fail = 0;

  for (let i = 0; i < wordsToFetch.length; i++) {
    const word = wordsToFetch[i];
    if (i % 25 === 0) {
      console.log(`Progress: ${i}/${wordsToFetch.length} (${success} success)`);
    }

    const data = await fetchWord(word);
    const processed = processEntry(word, data);

    if (processed) {
      calData[word] = processed;
      success++;
    } else {
      fail++;
    }

    await sleep(DELAY_MS);
  }

  // Sort and save
  const sortedData = {};
  Object.keys(calData).sort((a, b) => a.localeCompare(b, 'he'))
    .forEach(k => sortedData[k] = calData[k]);

  fs.writeFileSync(calPath, JSON.stringify(sortedData, null, 2));
  console.log(`\nFinal: ${Object.keys(sortedData).length} entries (added ${success})`);
}

main().catch(console.error);
