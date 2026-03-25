/**
 * Expand CAL Aramaic Lexicon - Batch 3
 * Additional common words from Hebrew/Aramaic roots
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';
const DELAY_MS = 150;

console.log('EXPAND CAL ARAMAIC - BATCH 3');

const calPath = path.join(DATA_DIR, 'cal_aramaic.json');
let calData = JSON.parse(fs.readFileSync(calPath, 'utf8'));
console.log(`Starting with ${Object.keys(calData).length} entries`);

// Batch 3: Hebrew-Aramaic cognates and more Talmudic terms
const batch3Words = [
  // More verbs (Hebrew roots often have Aramaic cognates)
  'אבד', 'אהב', 'אור', 'אחז', 'אסף', 'ארך', 'בוש', 'בחר', 'בטח', 'בין',
  'בכה', 'בלע', 'בער', 'גאל', 'גבר', 'גדל', 'גור', 'גלה', 'גמל', 'גנב',
  'דבק', 'דור', 'דרך', 'דרש', 'הגה', 'הלל', 'הפך', 'הרג', 'זבח', 'זכר',
  'זמר', 'זנה', 'זעק', 'זקן', 'חבא', 'חבל', 'חגג', 'חדל', 'חוש', 'חטא',
  'חיל', 'חכם', 'חלה', 'חלל', 'חלם', 'חלף', 'חמד', 'חנה', 'חנן', 'חסר',
  'חפש', 'חרב', 'חרה', 'חרש', 'חשב', 'טבע', 'טהר', 'טמא', 'טעם', 'יבש',
  'יגע', 'ידה', 'יכל', 'ילד', 'ינק', 'יעד', 'יעץ', 'יפה', 'יקר', 'ירא',
  'ירד', 'ירה', 'ירש', 'ישן', 'ישר', 'כבס', 'כבש', 'כהן', 'כון', 'כחד',
  'כלא', 'כלה', 'כסה', 'כעס', 'כרת', 'לבש', 'לון', 'לחם', 'למד', 'מאן',
  'מאס', 'מדד', 'מהר', 'מול', 'מות', 'מחה', 'מכר', 'מלא', 'מלל', 'מנה',
  'מצא', 'מרד', 'משח', 'משל', 'נאם', 'נבא', 'נגד', 'נגע', 'נגש', 'נדח',
  'נדר', 'נוח', 'נוס', 'נוע', 'נחה', 'נחל', 'נחם', 'נטה', 'נטע', 'נכה',
  'נכר', 'נסה', 'נסע', 'נעל', 'נעם', 'נער', 'נפל', 'נצב', 'נצל', 'נצר',
  'נקה', 'נקם', 'נשא', 'נשק', 'נתך', 'סבב', 'סגד', 'סכך', 'סלח', 'סמך',
  'ספד', 'ספק', 'סתר', 'עבר', 'עוד', 'עון', 'עור', 'עזב', 'עלה', 'עמד',
  'ענה', 'עצב', 'עצר', 'ערב', 'ערך', 'עשק', 'עתר', 'פגר', 'פדה', 'פוץ',
  'פחד', 'פלא', 'פלט', 'פלל', 'פנה', 'פעל', 'פקח', 'פקד', 'פרד', 'פרה',
  'פרח', 'פרש', 'פשע', 'פתח', 'צבא', 'צדק', 'צוה', 'צום', 'צור', 'צלח',
  'צלל', 'צמא', 'צמח', 'צעק', 'צפה', 'קבץ', 'קבר', 'קדם', 'קדש', 'קהל',
  'קנא', 'קנה', 'קצף', 'קצר', 'קרא', 'קרב', 'קשב', 'קשה', 'ראש', 'רבב',
  'רגז', 'רגל', 'רדה', 'רום', 'רחץ', 'רוץ', 'ריב', 'רכב', 'רנן', 'רעה',
  'רפא', 'רצה', 'רשע', 'שאל', 'שאר', 'שבה', 'שבח', 'שבע', 'שבר', 'שבת',
  'שגה', 'שדד', 'שוה', 'שוט', 'שחה', 'שחק', 'שחת', 'שטף', 'שיר', 'שכב',
  'שכח', 'שכל', 'שכם', 'שכן', 'שכר', 'שלח', 'שלל', 'שלם', 'שמד', 'שמח',
  'שמם', 'שמן', 'שמע', 'שמר', 'שנא', 'שנה', 'שעה', 'שפט', 'שפך', 'שפל',
  'שקט', 'שרף', 'שרר', 'שתה', 'תהל', 'תוך', 'תור', 'תלה', 'תמה', 'תמך',
  'תמם', 'תעב', 'תעה', 'תקע',
  // More nouns
  'אור', 'אש', 'באר', 'גבול', 'דם', 'הר', 'זרע', 'חיל', 'חלום', 'חסד',
  'יד', 'כח', 'כסא', 'מחנה', 'מקום', 'משכן', 'נער', 'נהר', 'עבודה', 'עדה',
  'צאן', 'קול', 'רגל', 'רוח', 'שדה', 'שער', 'תודה'
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
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[,;:]\s*/, '')
    .replace(/^\s*v\.\s*/i, '')
    .trim();
}

function processEntry(word, sefariaData) {
  if (!sefariaData || !Array.isArray(sefariaData) || sefariaData.length === 0) {
    return null;
  }

  // Prioritize Jastrow (Aramaic-focused)
  let relevantEntries = sefariaData.filter(e => e.parent_lexicon?.includes('Jastrow'));

  // If no Jastrow, try other lexicons
  if (relevantEntries.length === 0) {
    relevantEntries = sefariaData.filter(e =>
      e.language_code === 'arc' || e.parent_lexicon?.includes('Aramaic')
    );
  }

  // Fall back to any entry
  if (relevantEntries.length === 0 && sefariaData.length > 0) {
    relevantEntries.push(sefariaData[0]);
  }

  if (relevantEntries.length === 0) return null;

  const definitions = [];
  const forms = new Set();
  let pos = '';
  let hebrew = '';

  for (const entry of relevantEntries) {
    if (entry.morphology && !pos) pos = entry.morphology;
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          const cleaned = cleanHtml(sense.definition);
          if (cleaned && cleaned.length > 2) {
            definitions.push(cleaned);
          }
        }
      }
    }
    if (entry.alt_headwords) entry.alt_headwords.forEach(h => forms.add(h));
    if (entry.plural_form) entry.plural_form.forEach(p => forms.add(p));
    if (entry.strong_number) hebrew = entry.strong_number;
  }

  const uniqueDefs = [...new Set(definitions)];
  const definition = uniqueDefs.slice(0, 3).join('; ').substring(0, 400);

  if (!definition || definition.length < 3) return null;

  const result = {
    lemma: word,
    pos: pos || 'unknown',
    definition: definition,
    dialects: ['JBA', 'JPA', 'Tg'],
    forms: [word, ...forms],
    source: 'Sefaria/Jastrow'
  };

  if (hebrew) result.hebrew = hebrew;

  return result;
}

async function main() {
  const wordsToFetch = batch3Words.filter(w => !calData[w]);
  console.log(`Words to fetch: ${wordsToFetch.length}`);

  let success = 0, fail = 0;

  for (let i = 0; i < wordsToFetch.length; i++) {
    const word = wordsToFetch[i];
    if (i % 30 === 0) {
      console.log(`Progress: ${i}/${wordsToFetch.length} (+${success})`);
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
