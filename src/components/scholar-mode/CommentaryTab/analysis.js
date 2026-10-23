// =============================================================================
// Détection de cross-references, extraction de résumé/dibbour, questions
// d'étude, catégorisation de liens + API Sefaria (fetchLinks).
// (extrait de CommentaryTab.constants.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { fetchWithFallback } from '../../../utils/http';
import { log, SEFARIA_BASE } from './env';
import { COMMENTATOR_INFO, COMMENTATORS } from './commentators';

// =============================================================================
// CROSS-REFERENCE DETECTION
// =============================================================================

// Patterns to detect when commentators reference each other
const CROSS_REF_PATTERNS = {
  rashi: [/רש"י/, /פירש"י/, /לרש"י/, /ורש"י/, /כרש"י/, /רש״י/],
  ramban: [/רמב"ן/, /הרמב"ן/, /לרמב"ן/, /רמב״ן/],
  'ibn ezra': [/אבן עזרא/, /ראב"ע/, /הראב"ע/, /ראב״ע/],
  onkelos: [/אונקלוס/, /תרגום/, /התרגום/],
  rashbam: [/רשב"ם/, /הרשב"ם/, /רשב״ם/],
  sforno: [/ספורנו/, /הספורנו/],
  radak: [/רד"ק/, /הרד"ק/, /רד״ק/],
  ralbag: [/רלב"ג/, /הרלב"ג/, /רלב״ג/]
};

// Disagreement markers
const DISAGREEMENT_MARKERS = [
  /ואני אומר/,
  /ולא נראה/,
  /ואין זה נכון/,
  /וקשה לי/,
  /ולפי דעתי/,
  /ולא כדברי/,
  /חולק/,
  /disagrees?/i,
  /however/i,
  /but I say/i,
  /this is not correct/i
];

// Detect cross-references in commentary text
export function detectCrossReferences(heText, enText, currentCommentator) {
  const references = [];
  const text = (heText || '') + ' ' + (enText || '');

  for (const [commentator, patterns] of Object.entries(CROSS_REF_PATTERNS)) {
    if (commentator === currentCommentator?.toLowerCase()) continue;

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        // Check if it's a disagreement
        const isDisagreement = DISAGREEMENT_MARKERS.some(marker => marker.test(text));
        references.push({
          commentator,
          isDisagreement,
          displayName: COMMENTATOR_INFO[commentator]?.heName || commentator
        });
        break;
      }
    }
  }

  return references;
}

// =============================================================================
// QUICK SUMMARY EXTRACTION
// =============================================================================

// Extract key phrases that indicate main points
export function extractKeySummary(heText, enText) {
  const summaryPoints = [];
  const text = enText || '';

  // Look for conclusion markers
  const conclusionPatterns = [
    /therefore[,\s]+([^.]+)/gi,
    /this teaches[,\s]+([^.]+)/gi,
    /the meaning is[,\s]+([^.]+)/gi,
    /we learn[,\s]+([^.]+)/gi,
    /this shows[,\s]+([^.]+)/gi,
    /the point is[,\s]+([^.]+)/gi
  ];

  for (const pattern of conclusionPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 10 && match[1].length < 150) {
        summaryPoints.push(match[1].trim());
      }
    }
  }

  // If no conclusions found, extract first meaningful sentence
  if (summaryPoints.length === 0 && text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences[0]) {
      summaryPoints.push(sentences[0].trim().substring(0, 120) + '...');
    }
  }

  return summaryPoints.slice(0, 3);
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function fetchLinks(book, chapter, verse, reference) {
  try {
    let apiRef = '';
    if (book && chapter && verse) {
      apiRef = `${book}_${chapter}:${verse}`;
    } else if (reference) {
      apiRef = reference
        .replace(/\.(\d+)\.(\d+)/, '_$1:$2')
        .replace(/\.(\d+):(\d+)/, '_$1:$2')
        .replace(/ /g, '_');
    }

    if (!apiRef) return [];

    log.debug('Fetching:', apiRef);
    const data = await fetchWithFallback(`${SEFARIA_BASE}/links/${apiRef}`, { timeout: 15000 });
    log.debug('Got', data?.length || 0, 'links');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    log.error('Fetch error:', err);
    return [];
  }
}

export async function fetchText(ref) {
  if (!ref) return null;
  if (textCache.has(ref)) return textCache.get(ref);

  try {
    const normalized = ref.replace(/ /g, '_');
    const data = await fetchWithFallback(`${SEFARIA_BASE}/texts/${normalized}?context=0`, { timeout: 10000 });
    const result = {
      he: Array.isArray(data?.he) ? data.he.join(' ') : (data?.he || ''),
      en: Array.isArray(data?.text) ? data.text.join(' ') : (data?.text || '')
    };
    cacheText(ref, result); // Use LRU-style caching
    return result;
  } catch {
    return null;
  }
}

// Extract Dibur HaMatchil (opening words the commentary addresses)
export function extractDiburHaMatchil(hebrewText) {
  if (!hebrewText) return null;
  // Look for quoted text at the beginning (usually the verse words being commented on)
  // Common patterns: ד"ה, וד"ה, or text before a dash/colon
  const patterns = [
    /^([^.]{2,30})\s*[-–—:]/,  // Text before dash/colon
    /^ד"ה\s+([^\s.]+(?:\s+[^\s.]+)?)/,  // ד"ה pattern
    /^([א-ת]{2,}(?:\s+[א-ת]{2,}){0,3})\s*[-–—.]/  // Hebrew words before punctuation
  ];

  for (const pattern of patterns) {
    const match = hebrewText.match(pattern);
    if (match) return match[1].trim();
  }

  // Fallback: first 3-5 words
  const words = hebrewText.split(/\s+/).slice(0, 4);
  return words.join(' ');
}

// Generate study questions based on commentary
export function generateStudyQuestions(commentatorName, heText, enText) {
  const name = commentatorName.toLowerCase();
  const questions = [];

  // Generic questions based on commentator
  if (name.includes('rashi')) {
    questions.push('מה הקושי בפסוק שרש"י בא לתרץ?');
    questions.push('What textual difficulty is Rashi addressing?');
    if (enText?.includes('Midrash') || heText?.includes('מדרש')) {
      questions.push('Why does Rashi bring this Midrash here?');
    }
  } else if (name.includes('ramban')) {
    questions.push('במה הרמב"ן חולק על רש"י?');
    questions.push('What is the deeper meaning Ramban reveals?');
  } else if (name.includes('ibn ezra')) {
    questions.push('What grammatical point does Ibn Ezra make?');
  } else if (name.includes('sforno')) {
    questions.push('What ethical lesson does Sforno derive?');
  }

  // Generic questions
  questions.push('How does this commentary change your understanding?');
  questions.push('מה החידוש בפירוש זה?');

  return questions.slice(0, 3);
}

export function categorizeLinks(links) {
  const result = { primary: [], rishonim: [], acharonim: [], modern: [], other: [] };
  if (!links?.length) return result;

  for (const link of links) {
    const cat = (link.category || '').toLowerCase();
    if (!cat.includes('commentary') && !cat.includes('targum') && !link.collectiveTitle?.en) continue;

    const name = (link.collectiveTitle?.en || link.index_title || '').toLowerCase();
    const nameKey = Object.keys(COMMENTATOR_INFO).find(k => name.includes(k));
    const info = nameKey ? COMMENTATOR_INFO[nameKey] : null;

    const item = {
      ref: link.ref,
      heRef: link.heRef,
      he: link.he || '',
      en: link.text || '',
      name: link.collectiveTitle?.en || link.index_title || 'Commentary',
      nameKey,
      info,
      diburHaMatchil: extractDiburHaMatchil(link.he),
      approach: info?.approach || 'pshat'
    };

    if (COMMENTATORS.primary.some(c => name.includes(c))) result.primary.push(item);
    else if (COMMENTATORS.rishonim.some(c => name.includes(c))) result.rishonim.push(item);
    else if (COMMENTATORS.acharonim.some(c => name.includes(c))) result.acharonim.push(item);
    else if (COMMENTATORS.modern.some(c => name.includes(c))) result.modern.push(item);
    else result.other.push(item);
  }

  return result;
}
