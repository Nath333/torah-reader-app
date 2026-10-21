// =============================================================================
// Extracteurs partagés — termes clés, discours, locuteurs, disputes, rabbins,
// patterns de discours, explications et Mermaid de vue d'ensemble.
// Tous les générateurs appellent ces extract, analyze, generate (fonctions).
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripNikud, normalizeHebrew } from './textUtils';
import {
  TALMUD_COMMENTATORS,
  OUTCOME_ICONS,
  CONTENT_PATTERNS,
  DIRECT_SAGE_NAMES,
  SPEAKER_PATTERNS,
  SPEAKER_NORMALIZATION
} from '../talmudDiagramData';
import { RELATIONSHIP_TYPES, ENTITY_TYPES } from '../knowledgeGraphService';
import { DISCOURSE_PATTERNS, DISCOURSE_TYPES } from '../discoursePatternService';
import { RABBI_DATABASE } from '../namedEntityService';

/**
 * PRO SCHOLAR - Extract key terms from Hebrew/Aramaic text with enhanced filtering
 * @param {string} text - Text to analyze
 * @param {number} maxTerms - Maximum terms to return
 * @returns {Array<{word: string, frequency: number, isKeyTerm: boolean}>}
 */
export function extractKeyTerms(text, maxTerms = 15) {
  const terms = [];
  const wordCounts = new Map();

  // PRO SCHOLAR - Comprehensive Hebrew/Aramaic stopwords
  const STOPWORDS = new Set([
    // Hebrew function words
    'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
    'זה', 'זו', 'זאת', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אנחנו',
    'אותו', 'אותה', 'אותם', 'מה', 'מי', 'איך', 'למה', 'כמה', 'איזה', 'אשר',
    'שהוא', 'שהיא', 'והוא', 'והיא', 'יש', 'אין', 'היה', 'היתה', 'יהיה',
    'להיות', 'כן', 'כך', 'לו', 'לה', 'בו', 'בה', 'עליו', 'עליה', 'ממנו',
    // Aramaic function words
    'דאמר', 'ואמר', 'הא', 'הך', 'הני', 'האי', 'ההוא', 'ההיא', 'דהא',
    'מאי', 'היכי', 'למאי', 'מנא', 'אלא', 'אמאי', 'הכי', 'נמי', 'דילמא',
    'לאו', 'הכא', 'התם', 'מיהו', 'איכא', 'ליכא', 'למימר', 'למיעבד',
    // Talmudic discourse markers (not content words)
    'אמר', 'אומר', 'אמרו', 'אמרה', 'רבי', 'רב', 'רבן', 'בן', 'בר',
    'דתנן', 'דתניא', 'תנן', 'תנא', 'תניא', 'איתמר',
    // Numerals
    'אחד', 'אחת', 'שני', 'שתי', 'שנים', 'שלש', 'שלשה', 'ארבע', 'ארבעה',
    'חמש', 'חמשה', 'שש', 'ששה', 'שבע', 'שבעה', 'שמונה', 'תשע', 'עשר'
  ]);

  // Count word frequencies with stopword filtering
  const words = text.split(/\s+/);
  words.forEach(word => {
    // Clean the word (remove non-Hebrew chars and nikud)
    let clean = stripNikud(word).replace(/[^\u0590-\u05FF]/g, '');

    // Remove common prefixes for better matching
    if (clean.length > 3 && 'הובכלמשו'.includes(clean[0])) {
      clean = clean.slice(1);
    }

    // Skip stopwords and very short/long words
    if (clean.length < 3 || clean.length > 15 || STOPWORDS.has(clean)) {
      return;
    }

    wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
  });

  // Get most frequent content words
  const sorted = Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 2)  // Appear at least twice
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms);

  sorted.forEach(([word, count]) => {
    terms.push({
      word,
      frequency: count,
      isKeyTerm: true
    });
  });

  return terms;
}

/**
 * Extract full discourse elements (questions, proofs, objections, resolutions, conclusions)
 */
export function extractFullDiscourse(text) {
  // PRO SCHOLAR V20: Comprehensive discourse element extraction
  const elements = {
    questions: [],
    proofs: [],
    objections: [],
    resolutions: [],
    conclusions: []
  };

  const extractWith = (patterns, target) => {
    patterns.forEach(pattern => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = (match[1] || match[2] || match[0]).trim();
        if (content && content.length > 3) {
          target.push({ text: content, position: match.index });
        }
      }
    });
    target.sort((a, b) => a.position - b.position);
  };

  // PRO SCHOLAR V20: Comprehensive question patterns
  extractWith([
    /מאי\s+([^?。.]{3,50})/g,
    /מנלן\s*[?]?\s*([^。.]{3,40})/g,
    /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{3,40})/g,
    /היכי\s+דמי\s*[?]?\s*([^。.]{3,35})/g,
    /מאי\s+טעמא\s*[?]?\s*([^。.]{3,40})/g,
    /איבעיא\s+להו\s*[:]?\s*([^。.]{5,60})/g,
    /בעי\s+([^:。.]{3,40})/g,
    /למה\s+לי\s*[?]?\s*([^。.]{3,40})/g,
    /פשיטא\s*[!?]?\s*([^。.]{3,40})/g,
    /מאי\s+שנא\s*([^。.]{3,40})/g,
    /במאי\s+עסקינן\s*[?]?\s*([^。.]{3,40})/g,
    /מאי\s+קמ"ל\s*[?]?\s*([^。.]{3,40})/g,
  ], elements.questions);

  // PRO SCHOLAR V20: Comprehensive proof patterns
  extractWith([
    /שנאמר\s*[":״]?\s*([^"״。.]{3,50})/g,
    /דכתיב\s*[":״]?\s*([^"״。.]{3,50})/g,
    /תנן\s*[:]?\s*([^。.]{5,60})/g,
    /תניא\s*[:]?\s*([^。.]{5,60})/g,
    /תנו\s+רבנן\s*[:]?\s*([^。.]{5,60})/g,
    /תא\s+שמע\s*[:]?\s*([^。.]{5,60})/g,
    /תנן\s+התם\s*[:]?\s*([^。.]{5,60})/g,
    /אמר\s+קרא\s*[:]?\s*([^。.]{3,50})/g,
  ], elements.proofs);

  // PRO SCHOLAR V20: Comprehensive objection patterns
  extractWith([
    /מיתיבי\s*[:]?\s*([^。.]{5,60})/g,
    /ורמינהו\s*[:]?\s*([^。.]{5,60})/g,
    /והתניא\s*[:]?\s*([^。.]{5,50})/g,
    /והא\s+תנן\s*[:]?\s*([^。.]{5,50})/g,
    /מתקיף\s+לה\s*[:]?\s*([^。.]{5,50})/g,
    /איתיביה\s*[:]?\s*([^。.]{5,50})/g,
    /לימא\s+מתני[׳']?\s*([^。.]{5,50})/g,
    /ומי\s+אמר\s*([^。.]{5,40})/g,
  ], elements.objections);

  // PRO SCHOLAR V20: Comprehensive resolution patterns
  extractWith([
    /לא\s+קשיא\s*[:]?\s*([^。.]{5,60})/g,
    /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{5,60})/g,
    /שאני\s+([^。.]{3,50})/g,
    /הכי\s+קאמר\s*[:]?\s*([^。.]{5,50})/g,
    /הכי\s+קתני\s*[:]?\s*([^。.]{5,50})/g,
    /אלא\s+([^。.]{5,50})/g,
    /התם\s+([^。.]{5,50})/g,
  ], elements.resolutions);

  // PRO SCHOLAR V20: Comprehensive conclusion patterns
  extractWith([
    /שמע\s+מינה\s*[:]?\s*([^。.]{5,60})/g,
    /הלכה\s+כ?([^。.]{3,40})/g,
    /הלכתא\s+([^。.]{3,40})/g,
    /והלכתא\s+([^。.]{3,40})/g,
    /תיקו/g,
    /קשיא$/g,
    /צריך\s+עיון/g,
  ], elements.conclusions);

  return elements;
}

/**
 * Extract domains/locations dynamically
 */
export function extractDomainsDynamic(text) {
  const domains = new Set();
  const patterns = [
    /רשות\s+ה(רבים|יחיד)/g,
    /כרמלית/g,
    /מקום\s+פטור/g,
    /(בפנים|לפנים)/g,
    /(בחוץ|לחוץ)/g,
    /בית\s+(הכנסת|המדרש|דין)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const domain = match[0].trim();
      if (domain.length >= 3) domains.add(domain);
    }
  });

  return Array.from(domains).slice(0, 4);
}

/**
 * Extract actors dynamically
 */
export function extractActorsDynamic(text) {
  const actors = new Set();
  const patterns = [
    /(העני|הנותן|המקבל|המוציא|המכניס|הגוזל|הנגזל)/g,
    /(בעל\s+הבית|בעה"ב)/g,
    /ה(\S{2,})\s+(?:פשט|נתן|נטל|עשה|הוציא|הכניס)/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const actor = (match[1] || match[0]).trim();
      if (actor.length >= 3 && actor.length <= 15) actors.add(actor);
    }
  });

  return Array.from(actors).slice(0, 4);
}

/**
 * Extract compound terms (צירופים) - multi-word technical phrases
 * Dynamically finds repeated 2-3 word phrases that form technical terms
 * V2 PRO SCHOLAR: Fixed nikud stripping and function word filtering
 */
export function extractCompoundTerms(text) {
  const termCounts = new Map();

  // Strip nikud first for consistent matching
  const cleanText = stripNikud(text);

  // Function words to exclude from compound terms
  const functionWords = new Set([
    'את', 'על', 'של', 'אל', 'מן', 'עם', 'כי', 'גם', 'או', 'אם',
    'לא', 'כל', 'זה', 'זו', 'הוא', 'היא', 'הם', 'הן', 'יש', 'אין',
    'בו', 'בה', 'לו', 'לה', 'כן', 'מה', 'מי', 'אשר', 'עד', 'רק'
  ]);

  // Helper to check if term ends with function word
  const endsWithFunctionWord = (term) => {
    const words = term.split(/\s+/);
    const lastWord = words[words.length - 1];
    return functionWords.has(lastWord);
  };

  // Find two-word phrases with definite article or construct state
  // Pattern: ה + word + word (e.g., "רשות הרבים", "בעל הבית")
  const twoWordPatterns = [
    /(רשות)\s+(היחיד|הרבים)/g,      // רשות היחיד/הרבים (specific)
    /(בעל)\s+(הבית)/g,              // בעל הבית (specific)
    /(מלאכת)\s+(\S{3,})/g,          // מלאכת X
    /(דין)\s+(\S{3,})/g,            // דין X
    /(איסור)\s+(\S{3,})/g,          // איסור X
    /(מצות)\s+(\S{3,})/g,           // מצות X
    /(הלכות)\s+(\S{3,})/g,          // הלכות X
    /ה(עני)\s+(ו?ה?בעל)/g,          // העני ובעל/העני והבעל
  ];

  twoWordPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      if (term.length >= 5 && !endsWithFunctionWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }
  });

  // Find construct state patterns (סמיכות) - word ending in ת/י + meaningful word
  const constructPatterns = [
    /(\S{3,}ת)\s+(ה\S{3,})/g,   // X-ת הY (מלאכת הוצאה) - require 3+ chars
    /(\S{3,}י)\s+(ה\S{3,})/g,   // X-י הY (דיני שבת)
  ];

  constructPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      if (term.length >= 8 && term.length <= 25 && !endsWithFunctionWord(term)) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }
  });

  // Find key actor pairs (specific to Talmudic discourse)
  const actorPatterns = [
    /העני/g,
    /בעל הבית/g,
    /המוציא/g,
    /המכניס/g,
  ];

  actorPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = match[0].trim();
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  });

  // Return terms appearing 1+ times (lowered threshold for specific patterns)
  return Array.from(termCounts.entries())
    .filter(([term, count]) => count >= 1 && term.length >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));
}

/**
 * Extract enumeration patterns - the conceptual framework
 * Finds "X שהן Y" patterns like "שתיים שהן ארבע"
 */
export function extractEnumerations(text) {
  const enumerations = [];

  // Number words in Hebrew
  const numPatterns = [
    // שתיים שהן ארבע, etc.
    /(\S+)\s+שהן\s+(\S+)/g,
    // X שהם Y
    /(\S+)\s+שהם\s+(\S+)/g,
    // X ו-Y (explicit enumeration)
    /(שתיים|שלש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+(שהן|שהם)\s+(\S+)/g,
  ];

  numPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      enumerations.push({
        text: match[0].trim(),
        position: match.index,
        type: 'enumeration'
      });
    }
  });

  // Also find explicit list markers
  const listPatterns = [
    /אבות\s+מלאכות/g,
    /מ״ל\s+מלאכות/g,
    /ל״ט\s+אבות/g,
    /יציאות\s+ה?שבת/g,
  ];

  listPatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      enumerations.push({
        text: match[0].trim(),
        position: match.index,
        type: 'list_marker'
      });
    }
  });

  // Dedupe by position
  const seen = new Set();
  return enumerations.filter(e => {
    const key = Math.floor(e.position / 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract contrasting pairs - the conceptual structure
 * Finds opposites that appear together (פנים/חוץ, חייב/פטור)
 */
export function extractContrastingPairs(text) {
  const pairs = [];

  // Known contrasting pairs in Talmudic discourse (V2 PRO SCHOLAR expanded)
  const pairPatterns = [
    // Location pairs
    { regex: /(בפנים|לפנים|פנימה).*?(בחוץ|לחוץ|חוצה)/g, a: 'פנים', b: 'חוץ', type: 'location' },
    { regex: /(בחוץ|לחוץ|חוצה).*?(בפנים|לפנים|פנימה)/g, a: 'חוץ', b: 'פנים', type: 'location' },
    { regex: /(למעלה).*?(למטה)/g, a: 'למעלה', b: 'למטה', type: 'location' },
    // Ruling pairs
    { regex: /(חייב|חייבים).*?(פטור|פטורים)/g, a: 'חייב', b: 'פטור', type: 'ruling' },
    { regex: /(פטור|פטורים).*?(חייב|חייבים)/g, a: 'פטור', b: 'חייב', type: 'ruling' },
    { regex: /(מותר).*?(אסור)/g, a: 'מותר', b: 'אסור', type: 'ruling' },
    { regex: /(אסור).*?(מותר)/g, a: 'אסור', b: 'מותר', type: 'ruling' },
    { regex: /(טהור|טהורים).*?(טמא|טמאים)/g, a: 'טהור', b: 'טמא', type: 'ruling' },
    { regex: /(כשר|כשרה).*?(פסול|פסולה)/g, a: 'כשר', b: 'פסול', type: 'ruling' },
    // Actor pairs
    { regex: /(העני).*?(בעל\s*הבית)/g, a: 'העני', b: 'בעל הבית', type: 'actor' },
    { regex: /(הנותן).*?(המקבל)/g, a: 'הנותן', b: 'המקבל', type: 'actor' },
    { regex: /(המוציא).*?(המכניס)/g, a: 'המוציא', b: 'המכניס', type: 'actor' },
    { regex: /(המוכר).*?(הלוקח|הקונה)/g, a: 'המוכר', b: 'הלוקח', type: 'actor' },
    { regex: /(האב).*?(הבן)/g, a: 'האב', b: 'הבן', type: 'actor' },
    // Domain pairs
    { regex: /(רשות\s+היחיד).*?(רשות\s+הרבים)/g, a: 'רשות היחיד', b: 'רשות הרבים', type: 'domain' },
    { regex: /(כרמלית).*?(מקום\s+פטור)/g, a: 'כרמלית', b: 'מקום פטור', type: 'domain' },
    // Action pairs
    { regex: /(עקירה).*?(הנחה)/g, a: 'עקירה', b: 'הנחה', type: 'action' },
    { regex: /(הוצאה).*?(הכנסה)/g, a: 'הוצאה', b: 'הכנסה', type: 'action' },
    { regex: /(נטילה).*?(נתינה)/g, a: 'נטילה', b: 'נתינה', type: 'action' },
    // Time pairs
    { regex: /(לכתחילה).*?(בדיעבד)/g, a: 'לכתחילה', b: 'בדיעבד', type: 'time' },
    { regex: /(ביום).*?(בלילה)/g, a: 'ביום', b: 'בלילה', type: 'time' },
    // Source pairs
    { regex: /(דאורייתא|מן\s+התורה).*?(דרבנן|מדרבנן)/g, a: 'דאורייתא', b: 'דרבנן', type: 'source' },
    // Quantity pairs
    { regex: /(מרובה).*?(מועט)/g, a: 'מרובה', b: 'מועט', type: 'quantity' },
  ];

  const seenPairs = new Set();

  pairPatterns.forEach(({ regex, a, b, type }) => {
    regex.lastIndex = 0;
    if (regex.test(text)) {
      const pairKey = `${a}-${b}`;
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        pairs.push({ a, b, type });
      }
    }
  });

  return pairs;
}

/**
 * Extract halachic cases dynamically (actor → action → ruling)
 * PRO SCHOLAR V20: Comprehensive pattern matching for all ruling types
 * Finds patterns without hardcoding specific actors
 */
export function extractHalachicCasesDynamic(text) {
  const cases = [];
  const seenPositions = new Set();

  // PRO SCHOLAR V20: Comprehensive ruling types
  const rulingTypes = [
    // Obligation/Exemption
    'חייב', 'פטור', 'חייבים', 'פטורים', 'חייבת', 'פטורה',
    // Permission/Prohibition
    'מותר', 'אסור', 'מותרים', 'אסורים', 'מותרת', 'אסורה',
    // Validity
    'כשר', 'פסול', 'כשרים', 'פסולים', 'כשרה', 'פסולה',
    // Purity
    'טמא', 'טהור', 'טמאים', 'טהורים', 'טמאה', 'טהורה',
    // Fulfillment
    'יצא', 'יוצא', 'אינו יוצא',
    // Acquisition
    'קנה', 'קונה', 'אינו קונה'
  ];
  const rulingPattern = rulingTypes.join('|');

  // Pattern 1: Actor with definite article + ruling
  const actorActionRuling = [
    // הX ... ruling (definite noun followed somewhere by ruling)
    { regex: new RegExp(`(ה[\\u0590-\\u05FF]{2,}(?:\\s+ה?[\\u0590-\\u05FF]+)?)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,5}(${rulingPattern})`, 'g') },
    // X פשט/נתן/נטל ... ruling
    { regex: new RegExp(`([\\u0590-\\u05FF]+)\\s+(פשט|נתן|נטל|הוציא|הכניס|העביר|עשה|לקח|מכר)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,5}[-–—]?\\s*(${rulingPattern})`, 'g') },
    // X — ruling (direct ruling with dash)
    { regex: new RegExp(`([\\u0590-\\u05FF]+(?:\\s+[\\u0590-\\u05FF]+)?)\\s*[-–—]\\s*(${rulingPattern})`, 'g') },
    // PRO SCHOLAR V20: Additional patterns
    // שניהם ruling
    { regex: new RegExp(`(שניהם|שתיהם|כולם|כולן)\\s+(${rulingPattern})`, 'g') },
    // בעל X ruling
    { regex: new RegExp(`(בעל\\s+ה[\\u0590-\\u05FF]+)\\s+(?:[\\u0590-\\u05FF]+\\s+){0,3}(${rulingPattern})`, 'g') },
  ];

  actorActionRuling.forEach(({ regex }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const posKey = Math.floor(match.index / 25); // Finer granularity
      if (seenPositions.has(posKey)) continue;
      seenPositions.add(posKey);

      const actor = match[1]?.trim() || '';
      const action = match[2]?.trim() || '';
      let ruling = match[3]?.trim() || match[2]?.trim() || '';

      // Normalize ruling to base form
      if (ruling.includes('פטור')) ruling = 'פטור';
      else if (ruling.includes('חייב')) ruling = 'חייב';
      else if (ruling.includes('מותר')) ruling = 'מותר';
      else if (ruling.includes('אסור')) ruling = 'אסור';
      else if (ruling.includes('כשר')) ruling = 'כשר';
      else if (ruling.includes('פסול')) ruling = 'פסול';
      else if (ruling.includes('טמא')) ruling = 'טמא';
      else if (ruling.includes('טהור')) ruling = 'טהור';
      else if (ruling.includes('יצא') || ruling.includes('יוצא')) ruling = 'יצא';
      else if (ruling.includes('קנה') || ruling.includes('קונה')) ruling = 'קנה';
      else if (['פשט', 'נתן', 'נטל', 'הוציא', 'הכניס', 'העביר', 'עשה', 'לקח', 'מכר'].includes(ruling)) {
        // action captured as ruling - this is not a ruling, skip
        continue;
      }

      if (actor && ruling && actor.length >= 2 && actor.length <= 30) {
        cases.push({
          actor,
          action: ['פשט', 'נתן', 'נטל', 'הוציא', 'הכניס', 'העביר', 'עשה', 'לקח', 'מכר'].includes(action) ? action : null,
          ruling,
          position: match.index,
          fullMatch: match[0].slice(0, 60)
        });
      }
    }
  });

  // Sort by position and return unique cases
  return cases
    .sort((a, b) => a.position - b.position)
    .slice(0, 12); // Increased limit
}

/**
 * Find significant words by frequency analysis (dynamic, no hardcoding)
 * @private Reserved for future diagram enhancements
 */
// eslint-disable-next-line no-unused-vars
function findSignificantWords(text) {
  const wordCounts = new Map();

  // Function words to skip (grammatical, not content)
  const skipWords = new Set([
    'את', 'של', 'על', 'אל', 'מן', 'עם', 'כי', 'לא', 'גם', 'או', 'אם', 'כל',
    'זה', 'זו', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אנחנו', 'אותו', 'אותה',
    'מה', 'מי', 'איך', 'למה', 'כמה', 'איזה', 'אשר', 'שהוא', 'שהיא', 'והוא', 'והיא',
    'יש', 'אין', 'היה', 'היתה', 'יהיה', 'להיות', 'כן', 'כך', 'לו', 'לה', 'בו', 'בה',
    'אמר', 'אומר', 'אמרו', 'אמרה', 'דאמר', 'ואמר', // speech verbs
    'רבי', 'רב', 'רבן', 'בן', 'בר', // titles
    'דתנן', 'דתניא', 'מאי', 'היכי', 'למאי', 'מנא', // Aramaic function words
    'הא', 'הך', 'הני', 'האי', 'ההוא', 'ההיא', // demonstratives
    'כל', 'אחד', 'שני', 'שתי', 'שלש', 'ארבע' // numerals
  ]);

  // Extract words
  const words = text.match(/[\u0590-\u05FF]{3,}/g) || [];

  words.forEach(word => {
    // Remove common prefixes for analysis
    let clean = word;
    if (clean.length > 3 && 'הובכלמשו'.includes(clean[0])) {
      clean = clean.slice(1);
    }
    if (clean.length < 3 || skipWords.has(clean)) return;

    wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
  });

  // Return most frequent (appearing 3+ times)
  return Array.from(wordCounts.entries())
    .filter(([word, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Analyze text structure (find Mishna and Gemara sections)
 */
export function analyzeStructure(text) {
  const result = { mishna: null, gemara: null };

  // Find Mishna section
  const mishnaMatch = text.match(/(?:מתני[׳']|משנה)\s*[:.]?\s*([^.!?]{10,200})/);
  if (mishnaMatch) {
    result.mishna = mishnaMatch[1].trim();
  }

  // Find Gemara section
  const gemaraMatch = text.match(/(?:גמ[׳']|גמרא)\s*[:.]?\s*([^.!?]{10,150})/);
  if (gemaraMatch) {
    result.gemara = gemaraMatch[1].trim();
  }

  return result;
}

/**
 * PRO SCHOLAR - Extract rulings dynamically with comprehensive pattern matching
 * Finds subject + ruling patterns without hardcoded actors
 * @param {string} text - Talmud text to analyze
 * @returns {Array<{subject: string, ruling: string, position: number, category: string, icon: string}>}
 */
export function extractRulingsDynamic(text) {
  const rulings = [];
  const seenPositions = new Set();

  // PRO SCHOLAR - Comprehensive ruling patterns by category
  const patterns = [
    // =============================================================================
    // OBLIGATION/EXEMPTION (חיוב/פטור)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s*[-–—]\s*(חייב|פטור|חייבים|פטורים|חייבת|פטורה)/g, ruling: null, category: 'obligation' },
    { regex: /(ה[\u0590-\u05FF]{2,}|[\u0590-\u05FF]+ים|[\u0590-\u05FF]+ות)\s+(חייב|פטור|חייבים|פטורים|חייבת|פטורה)/g, ruling: null, category: 'obligation' },
    { regex: /(?:ב|על)\s*([\u0590-\u05FF]+)\s+(חייב|פטור)/g, ruling: null, category: 'obligation' },

    // =============================================================================
    // PERMISSION/PROHIBITION (היתר/איסור)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(מותר|אסור|מותרת|אסורה|מותרים|אסורים)/g, ruling: null, category: 'permission' },
    { regex: /ל([\u0590-\u05FF]+)\s+(מותר|אסור)/g, ruling: null, category: 'permission' },

    // =============================================================================
    // PURITY/IMPURITY (טהרה/טומאה)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(טהור|טמא|טהורה|טמאה|טהורים|טמאים)/g, ruling: null, category: 'purity' },

    // =============================================================================
    // VALIDITY (כשרות)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+(?:\s+[\u0590-\u05FF]+)?)\s+(כשר|פסול|כשרה|פסולה|כשרים|פסולים)/g, ruling: null, category: 'validity' },

    // =============================================================================
    // FULFILLMENT (יציאת חובה)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(יצא|לא\s+יצא|יצאה|לא\s+יצאה)/g, ruling: null, category: 'fulfillment' },
    { regex: /(?:יצא|לא\s+יצא)\s+ידי\s+חובת?\s+([\u0590-\u05FF]+)/g, ruling: null, category: 'fulfillment' },

    // =============================================================================
    // ACQUISITION (קניינים)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(קנה|לא\s+קנה|קנתה|לא\s+קנתה)/g, ruling: null, category: 'acquisition' },
    { regex: /([\u0590-\u05FF]+)\s+(זכה|לא\s+זכה|זכתה|לא\s+זכתה)/g, ruling: null, category: 'acquisition' },

    // =============================================================================
    // MARRIAGE/DIVORCE (קידושין וגירושין)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(מקודשת|אינה\s+מקודשת|מגורשת|אינה\s+מגורשת)/g, ruling: null, category: 'marriage' },

    // =============================================================================
    // UNRESOLVED/UNCERTAIN (ספק/תיקו)
    // =============================================================================
    { regex: /(תיקו)/g, ruling: 'תיקו', subject: 'בעיא', category: 'uncertain' },
    { regex: /ספק\s+([\u0590-\u05FF]+)/g, ruling: 'ספק', category: 'uncertain' },
    { regex: /צריך\s+עיון/g, ruling: 'צ"ע', subject: 'דין', category: 'uncertain' },
    { regex: /קשיא/g, ruling: 'קשיא', subject: 'קושיא', category: 'uncertain' },

    // =============================================================================
    // MONETARY (דיני ממונות)
    // =============================================================================
    { regex: /([\u0590-\u05FF]+)\s+(משלם|פטור\s+מלשלם|חייב\s+לשלם)/g, ruling: null, category: 'monetary' },
    { regex: /(נזק\s+שלם|חצי\s+נזק)/g, ruling: null, subject: 'נזיקין', category: 'monetary' },
  ];

  // Get icon for ruling
  const getIcon = (ruling, category) => {
    if (OUTCOME_ICONS[ruling]) return OUTCOME_ICONS[ruling];
    if (ruling?.includes('פטור') || ruling?.includes('לא')) return '🟢';
    if (ruling?.includes('חייב') || ruling?.includes('אסור')) return '🔴';
    if (ruling?.includes('מותר') || ruling?.includes('יצא') || ruling?.includes('קנה')) return '✅';
    if (ruling?.includes('ספק') || ruling?.includes('תיקו')) return '🟡';
    if (category === 'purity') return '💧';
    if (category === 'monetary') return '💰';
    return '⚪';
  };

  patterns.forEach(({ regex, ruling: fixedRuling, subject: fixedSubject, category }) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Avoid duplicates near same position
      const posKey = Math.floor(match.index / 40);
      if (seenPositions.has(posKey)) continue;
      seenPositions.add(posKey);

      const subject = fixedSubject || match[1]?.trim() || '';
      const ruling = fixedRuling || match[2]?.trim().replace(/ים$|ות$/, '') || '';

      // Normalize ruling
      let normalizedRuling = ruling;
      if (ruling.includes('פטור')) normalizedRuling = 'פטור';
      else if (ruling.includes('חייב') && !ruling.includes('לשלם')) normalizedRuling = 'חייב';
      else if (ruling.includes('לא יצא')) normalizedRuling = 'לא יצא';
      else if (ruling.includes('לא קנה')) normalizedRuling = 'לא קנה';
      else if (ruling.includes('אינה')) normalizedRuling = ruling.includes('מקודשת') ? 'אינה מקודשת' : 'אינה מגורשת';

      if (subject && normalizedRuling) {
        rulings.push({
          subject,
          ruling: normalizedRuling,
          position: match.index,
          fullMatch: match[0].slice(0, 50),
          category,
          icon: getIcon(normalizedRuling, category)
        });
      }
    }
  });

  // Sort by position and dedupe
  return rulings
    .sort((a, b) => a.position - b.position)
    .slice(0, 15);  // Increased limit for PRO SCHOLAR
}

/**
 * PRO SCHOLAR - Extract discourse elements (questions, objections, proofs, conclusions)
 * @param {string} text - Talmud text to analyze
 * @returns {{ questions: Array, objections: Array, proofs: Array, conclusions: Array }}
 */
export function extractDiscourseElements(text) {
  const elements = { questions: [], objections: [], proofs: [], conclusions: [] };

  // Question patterns (שאלות)
  const questionPatterns = [
    { regex: /מאי\s+([^?。.]{5,50})/g, type: 'definition' },
    { regex: /מנלן\s*[?]?\s*([^。.]{5,40})/g, type: 'source' },
    { regex: /מנא\s+הני\s+מילי\s*[?]?\s*([^。.]{5,40})/g, type: 'source' },
    { regex: /היכי\s+דמי\s*[?]?\s*([^。.]{5,35})/g, type: 'case' },
    { regex: /מאי\s+טעמא\s*[?]?\s*([^。.]{5,40})/g, type: 'reason' },
    { regex: /למאי\s+נפקא\s+מינה\s*[?]?\s*([^。.]{5,40})/g, type: 'practical' },
    { regex: /איבעיא\s+להו\s*[:]?\s*([^。.]{10,60})/g, type: 'inquiry' },
    { regex: /בעי\s+([\u0590-\u05FF]+)\s*[:]?\s*([^。.]{5,40})/g, type: 'question' },
    { regex: /מאי\s+שנא\s+([^。.]{5,40})/g, type: 'distinction' },
    { regex: /פשיטא\s*[!]?\s*([^。.]{5,35})/g, type: 'obvious' },
  ];

  // Objection patterns (קושיות)
  const objectionPatterns = [
    { regex: /מיתיבי\s*[:]?\s*([^。.]{10,60})/g, type: 'objection' },
    { regex: /ורמינהו\s*[:]?\s*([^。.]{10,60})/g, type: 'contradiction' },
    { regex: /והתניא\s*[:]?\s*([^。.]{10,60})/g, type: 'challenge' },
    { regex: /והאמר\s+(\S+)\s*[:]?\s*([^。.]{10,50})/g, type: 'challenge' },
    { regex: /ולא\s+פליגי\s*[?]?\s*([^。.]{5,40})/g, type: 'question' },
  ];

  // Proof patterns (ראיות)
  const proofPatterns = [
    { regex: /שנאמר\s*[":״]?\s*([^"״\n]{5,60})/g, type: 'verse' },
    { regex: /דכתיב\s*[":״]?\s*([^"״\n]{5,60})/g, type: 'verse' },
    { regex: /תנן\s*[:]?\s*([^。.]{10,80})/g, type: 'mishna' },
    { regex: /תניא\s*[:]?\s*([^。.]{10,80})/g, type: 'baraita' },
    { regex: /תנו\s+רבנן\s*[:]?\s*([^。.]{10,80})/g, type: 'baraita' },
    { regex: /כדתנן\s*[:]?\s*([^。.]{10,60})/g, type: 'mishna_citation' },
    { regex: /כדאמרינן\s*[:]?\s*([^。.]{10,60})/g, type: 'gemara_citation' },
  ];

  // Conclusion patterns (מסקנות)
  const conclusionPatterns = [
    { regex: /שמע\s+מינה\s*[:]?\s*([^。.]{10,60})/g, type: 'inference' },
    { regex: /הלכה\s+כ?([^。.]{5,40})/g, type: 'halacha' },
    { regex: /הלכתא\s+([^。.]{5,40})/g, type: 'halacha' },
    { regex: /והלכתא\s+([^。.]{5,40})/g, type: 'final_halacha' },
    { regex: /למעשה\s+([^。.]{5,40})/g, type: 'practical' },
    { regex: /לא\s+קשיא\s*[:]?\s*([^。.]{10,60})/g, type: 'resolution' },
    { regex: /הכא\s+במאי\s+עסקינן\s*[:]?\s*([^。.]{10,60})/g, type: 'case_distinction' },
    { regex: /שאני\s+([^。.]{5,40})/g, type: 'distinction' },
    { regex: /אלמא\s+([^。.]{5,40})/g, type: 'therefore' },
    { regex: /מכלל\s+ד([^。.]{5,40})/g, type: 'implication' },
  ];

  // Helper to extract patterns
  const extractPatterns = (patterns, targetArray) => {
    patterns.forEach(({ regex, type }) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const content = (match[1] || match[2])?.trim();
        if (content && content.length > 5) {
          targetArray.push({
            text: content,
            position: match.index,
            type,
            fullMatch: match[0].slice(0, 60)
          });
        }
      }
    });
  };

  // Extract all discourse elements
  extractPatterns(questionPatterns, elements.questions);
  extractPatterns(objectionPatterns, elements.objections);
  extractPatterns(proofPatterns, elements.proofs);
  extractPatterns(conclusionPatterns, elements.conclusions);

  // Sort all by position
  Object.values(elements).forEach(arr => arr.sort((a, b) => a.position - b.position));

  // Dedupe (remove items too close together)
  Object.keys(elements).forEach(key => {
    const seen = new Set();
    elements[key] = elements[key].filter(item => {
      const posKey = Math.floor(item.position / 30);
      if (seen.has(posKey)) return false;
      seen.add(posKey);
      return true;
    });
  });

  return elements;
}

/**
 * Extract real content from Talmud text using patterns
 * @private Reserved for future summary diagram enhancements
 */
// eslint-disable-next-line no-unused-vars
function extractRealContent(text) {
  const result = {
    topics: [],
    questions: [],
    proofs: [],
    objections: [],
    resolutions: [],
    conclusions: []
  };

  // Helper to extract matches
  const extractMatches = (patterns, targetArray) => {
    patterns.forEach(({ pattern, type, label }) => {
      pattern.lastIndex = 0; // Reset regex
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const content = match[1]?.trim();
        if (content && content.length > 3) {
          targetArray.push({
            content,
            type,
            label,
            position: match.index
          });
        }
      }
    });
  };

  // Extract each category
  extractMatches(CONTENT_PATTERNS.topics, result.topics);
  extractMatches(CONTENT_PATTERNS.questions, result.questions);
  extractMatches(CONTENT_PATTERNS.proofs, result.proofs);
  extractMatches(CONTENT_PATTERNS.objections, result.objections);
  extractMatches(CONTENT_PATTERNS.resolutions, result.resolutions);
  extractMatches(CONTENT_PATTERNS.conclusions, result.conclusions);

  // Sort each by position
  Object.values(result).forEach(arr => {
    arr.sort((a, b) => a.position - b.position);
  });

  // Remove duplicates within each category
  Object.keys(result).forEach(key => {
    const seen = new Set();
    result[key] = result[key].filter(item => {
      const normalized = item.content.slice(0, 30);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  });

  return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract speaker names from Talmud text with enhanced pattern recognition
 * @returns {Array<{name: string, type: string, position: number, context?: string}>}
 */
export function extractSpeakersFromText(dafContent) {
  const speakers = [];
  const seenAtPosition = new Set();

  const text = Array.isArray(dafContent?.hebrew)
    ? dafContent.hebrew.join(' ')
    : (typeof dafContent?.hebrew === 'string' ? dafContent.hebrew : '');

  if (!text) return speakers;

  // Apply all speaker patterns
  SPEAKER_PATTERNS.forEach(({ pattern, type }) => {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Get all captured groups (may be multiple speakers in dispute patterns)
      for (let i = 1; i < match.length; i++) {
        const rawSpeaker = match[i]?.trim();
        if (!rawSpeaker || rawSpeaker.length < 2) continue;

        // Skip discourse markers that aren't actual speakers
        if (['תנן', 'תנא', 'תניא', 'מיתיבי', 'איתמר', 'לימא כתנאי', 'דתנן', 'דתניא', 'מתני׳', 'גמ׳'].includes(rawSpeaker)) {
          continue;
        }

        // Normalize the speaker name
        const speaker = normalizeSpeakerName(rawSpeaker);

        // Create unique key to avoid duplicates at same position
        const positionKey = `${match.index}-${speaker}`;
        if (seenAtPosition.has(positionKey)) continue;
        seenAtPosition.add(positionKey);

        // Get surrounding context (20 chars before and after)
        const contextStart = Math.max(0, match.index - 20);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 20);
        const context = text.slice(contextStart, contextEnd);

        speakers.push({
          name: speaker,
          rawName: rawSpeaker,
          type,
          position: match.index,
          context: context.trim()
        });
      }
    }
  });

  // PRO SCHOLAR V13: Fallback - Direct sage name detection
  // This catches sages mentioned without standard patterns
  const seenNames = new Set(speakers.map(s => s.name));

  DIRECT_SAGE_NAMES.forEach(sageName => {
    // Skip if already found via patterns
    if (seenNames.has(sageName)) return;

    // Look for this sage name in the text
    const regex = new RegExp(sageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      const positionKey = `direct-${match.index}-${sageName}`;
      if (seenAtPosition.has(positionKey)) continue;
      seenAtPosition.add(positionKey);

      // Get surrounding context
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(text.length, match.index + sageName.length + 20);
      const context = text.slice(contextStart, contextEnd);

      speakers.push({
        name: sageName,
        rawName: sageName,
        type: 'direct_mention',
        position: match.index,
        context: context.trim()
      });

      seenNames.add(sageName);
    }
  });

  // Sort by position in text
  speakers.sort((a, b) => a.position - b.position);

  return speakers;
}

/**
 * Normalize speaker name using known abbreviations and variations
 */
function normalizeSpeakerName(name) {
  // Check normalization map first
  if (SPEAKER_NORMALIZATION[name]) {
    return SPEAKER_NORMALIZATION[name];
  }

  // Clean up common issues
  let normalized = name
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .trim();

  return normalized;
}

/**
 * Extract disputes (מחלוקות) from text
 * @returns {Array<{speakers: string[], topic?: string, position: number}>}
 */
export function extractDisputes(text) {
  const disputes = [];

  // Pattern: X אמר ... Y אמר (consecutive statements = dispute)
  const consecutivePattern = /(?:אמר|א"ר)\s+(\S+)[^א]*?(?:ו?אמר|א"ר)\s+(\S+)/g;

  // Pattern: פליגי בה X ו-Y
  const explicitPattern = /(רב[יא]?\s+\S+)\s+ו?(רב[יא]?\s+\S+)\s+(?:פליגי|איפליגו)/g;

  // Pattern: איתמר ... X אמר ... Y אמר
  const eitmarPattern = /איתמר[^:]*(?:אמר|א"ר)\s+(\S+)[^:]*?(?:ו?אמר|א"ר)\s+(\S+)/g;

  // Pattern: מר אמר ... ומר אמר (Mar said... and Mar said)
  const marPattern = /מר\s+אמר[^מ]*מר\s+אמר/g;

  [consecutivePattern, explicitPattern, eitmarPattern, marPattern].forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const speakers = [];
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          speakers.push(normalizeSpeakerName(match[i].trim()));
        }
      }
      if (speakers.length >= 2) {
        disputes.push({
          speakers: [...new Set(speakers)],  // Remove duplicates
          position: match.index,
          fullMatch: match[0].slice(0, 100)  // First 100 chars for context
        });
      }
    }
  });

  return disputes;
}

/**
 * Get simple list of speaker names (backwards compatible)
 * @private Reserved for backwards compatibility
 */
// eslint-disable-next-line no-unused-vars
function extractSpeakerNames(dafContent) {
  return extractSpeakersFromText(dafContent)
    .map(s => s.name)
    .filter((name, i, arr) => arr.indexOf(name) === i);  // Unique names
}

/**
 * Find rabbi data from RABBI_DATABASE - PRO SCHOLAR V13 Enhanced
 * Uses multiple matching strategies for better coverage
 */
export function findRabbiData(hebrewName) {
  if (!hebrewName) return null;

  // Normalize the input name
  const normalized = normalizeHebrew(hebrewName);
  const trimmed = hebrewName.trim();

  // Strategy 1: Exact match
  if (RABBI_DATABASE?.tannaim?.[trimmed]) {
    return { ...RABBI_DATABASE.tannaim[trimmed], period: 'tanna', matchType: 'exact' };
  }
  if (RABBI_DATABASE?.amoraim?.[trimmed]) {
    return { ...RABBI_DATABASE.amoraim[trimmed], period: 'amora', matchType: 'exact' };
  }

  // Strategy 2: Check normalization map
  const normalizedName = SPEAKER_NORMALIZATION[trimmed];
  if (normalizedName) {
    if (RABBI_DATABASE?.tannaim?.[normalizedName]) {
      return { ...RABBI_DATABASE.tannaim[normalizedName], period: 'tanna', matchType: 'normalized' };
    }
    if (RABBI_DATABASE?.amoraim?.[normalizedName]) {
      return { ...RABBI_DATABASE.amoraim[normalizedName], period: 'amora', matchType: 'normalized' };
    }
  }

  // Build combined database for fuzzy matching
  const allRabbis = {
    ...(RABBI_DATABASE?.tannaim || {}),
    ...(RABBI_DATABASE?.amoraim || {})
  };

  // Strategy 3: Partial/substring match
  for (const [key, data] of Object.entries(allRabbis)) {
    // Check if input contains the database key or vice versa
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return { ...data, period: data.period || 'unknown', matchType: 'partial' };
    }
  }

  // Strategy 4: Normalized comparison (ignore final letters, geresh, etc.)
  for (const [key, data] of Object.entries(allRabbis)) {
    const keyNormalized = normalizeHebrew(key);
    if (normalized === keyNormalized || normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return { ...data, period: data.period || 'unknown', matchType: 'normalized_fuzzy' };
    }
  }

  // Strategy 5: First word match (for names like "רבי יהודה" matching "רבי יהודה הנשיא")
  const firstTwoWords = trimmed.split(/\s+/).slice(0, 2).join(' ');
  if (firstTwoWords !== trimmed) {
    for (const [key, data] of Object.entries(allRabbis)) {
      if (key.startsWith(firstTwoWords) || firstTwoWords.startsWith(key)) {
        return { ...data, period: data.period || 'unknown', matchType: 'prefix' };
      }
    }
  }

  // Strategy 6: Handle common patterns not in database
  // These are "inferred" sages based on naming patterns
  if (/^רבי\s+\S+/.test(trimmed)) {
    return {
      name: trimmed,
      period: 'tanna', // Assume Tanna if "רבי"
      generation: null,
      matchType: 'inferred_tanna'
    };
  }
  if (/^רב\s+\S+/.test(trimmed) && !trimmed.startsWith('רבי')) {
    return {
      name: trimmed,
      period: 'amora', // Assume Amora if "רב" without "י"
      generation: null,
      matchType: 'inferred_amora'
    };
  }

  return null;
}

/**
 * Detect discourse patterns in text
 */
export function detectDiscoursePatterns(text) {
  const patterns = [];

  Object.entries(DISCOURSE_PATTERNS).forEach(([key, config]) => {
    if (!config.markers) return;

    config.markers.forEach(marker => {
      if (text.includes(marker)) {
        patterns.push({
          type: key,
          marker,
          discourseType: config.type
        });
      }
    });
  });

  // Sort by typical order in sugya
  const typeOrder = {
    [DISCOURSE_TYPES.MISHNA]: 1,
    [DISCOURSE_TYPES.GEMARA]: 2,
    [DISCOURSE_TYPES.SOURCE_CITATION]: 3,
    [DISCOURSE_TYPES.QUESTION]: 4,
    [DISCOURSE_TYPES.OBJECTION]: 5,
    [DISCOURSE_TYPES.PROOF]: 6,
    [DISCOURSE_TYPES.RESOLUTION]: 7,
    [DISCOURSE_TYPES.LEGAL_RULING]: 8
  };

  return patterns.sort((a, b) =>
    (typeOrder[a.discourseType] || 99) - (typeOrder[b.discourseType] || 99)
  );
}

/**
 * Extract commentator name from a reference
 */
export function extractCommentatorName(ref) {
  const patterns = [
    /^(Rashi|Tosafot|Rashbam|Ritva|Rashba|Ran|Rosh|Maharsha|Maharal|Meiri)/i,
    /^Rabbeinu\s+(Chananel|Gershom)/i
  ];

  for (const pattern of patterns) {
    const match = ref.match(pattern);
    if (match) return match[0];
  }

  for (const name of TALMUD_COMMENTATORS) {
    if (ref.toLowerCase().includes(name.toLowerCase())) {
      return name;
    }
  }

  return null;
}

/**
 * Shorten a reference for display
 */
export function shortenRef(ref) {
  if (!ref) return '';

  const shortcuts = {
    'Genesis': 'Gen', 'Exodus': 'Ex', 'Leviticus': 'Lev',
    'Numbers': 'Num', 'Deuteronomy': 'Deut',
    'Shabbat': 'Shab', 'Berakhot': 'Ber', 'Sanhedrin': 'San',
    'Bava Kamma': 'BK', 'Bava Metzia': 'BM', 'Bava Batra': 'BB'
  };

  let short = ref;
  Object.entries(shortcuts).forEach(([full, abbr]) => {
    short = short.replace(full, abbr);
  });

  return short.length > 20 ? short.substring(0, 17) + '...' : short;
}

/**
 * Generate explanation text - PRO SCHOLAR V13 Hebrew enhanced
 */
export function generateExplanation(tractate, daf, stats, type) {
  // PRO SCHOLAR V13: Hebrew type labels
  const typeLabels = {
    'Overview': 'סקירה',
    'Summary': 'סיכום',
    'Flow': 'מהלך',
    'Speakers': 'חכמים'
  };

  const hebrewType = typeLabels[type] || type;
  const parts = [`${hebrewType}: ${tractate} ${daf}`];

  if (stats.commentators > 0) parts.push(`${stats.commentators} מפרשים`);
  if (stats.speakers > 0) parts.push(`${stats.speakers} חכמים`);
  if (stats.verses > 0) parts.push(`${stats.verses} פסוקים`);
  if (stats.parallels > 0) parts.push(`${stats.parallels} מקבילות`);

  return parts.join(' • ');
}

/**
 * Generate Mermaid for overview diagram
 */
export function generateOverviewMermaid(subgraph, centerRef, direction = 'TB') {
  const lines = [`graph ${direction}`];

  lines.push('  %% Node styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px,font-weight:bold');
  lines.push('  classDef rabbi fill:#dbeafe,stroke:#2563eb,stroke-width:2px');
  lines.push('  classDef verse fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef parallel fill:#fae8ff,stroke:#c026d3');
  lines.push('  classDef speaker fill:#fed7aa,stroke:#ea580c');

  const nodeIds = new Map();

  subgraph.nodes.forEach((node, index) => {
    const safeId = `n${index}`;
    nodeIds.set(node.id, safeId);

    const label = (node.data?.label || node.label || node.id)
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    let shape, className;

    if (node.id === centerRef) {
      shape = `${safeId}[["${label}"]]`;
      className = 'daf';
    } else if (node.data?.nodeType === 'speaker') {
      shape = `${safeId}(("${label}"))`;
      className = 'speaker';
    } else if (node.type === ENTITY_TYPES.RABBI || node.data?.nodeType === 'commentator') {
      shape = `${safeId}{{"${label}"}}`;
      className = 'rabbi';
    } else if (node.data?.type === 'biblical_verse') {
      shape = `${safeId}(["${label}"])`;
      className = 'verse';
    } else if (node.data?.type === 'talmud_parallel') {
      shape = `${safeId}[/"${label}"/]`;
      className = 'parallel';
    } else {
      shape = `${safeId}["${label}"]`;
      className = 'verse';
    }

    lines.push(`  ${shape}`);
    lines.push(`  class ${safeId} ${className}`);
  });

  const edgeLabels = {
    [RELATIONSHIP_TYPES.EXPLAINS]: 'מפרש',
    [RELATIONSHIP_TYPES.CITES]: 'מצטט',
    [RELATIONSHIP_TYPES.PARALLEL]: 'מקביל',
    [RELATIONSHIP_TYPES.STUDENT_OF]: 'תלמיד',
    [RELATIONSHIP_TYPES.DISAGREES]: 'חולק',
    'speaks_on': 'אומר'
  };

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      const label = edgeLabels[edge.relationship] || '';
      const style = edge.relationship === RELATIONSHIP_TYPES.DISAGREES ? '-.-x' :
                    edge.relationship === RELATIONSHIP_TYPES.PARALLEL ? '<-->' : '-->';

      if (label) {
        lines.push(`  ${sourceId} ${style}|${label}| ${targetId}`);
      } else {
        lines.push(`  ${sourceId} ${style} ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}

