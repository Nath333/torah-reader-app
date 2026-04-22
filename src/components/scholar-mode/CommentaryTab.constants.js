/**
 * CommentaryTab.constants - Constants, helpers, styles, and utility functions
 *
 * Extracted from CommentaryTab.js to reduce file size.
 * Contains: metadata maps, color palettes, style objects, cache logic,
 * API functions, cross-reference detection, and local storage helpers.
 */
import { safeGet, safeSet } from '../../utils/safeLocalStorage';
import { fetchWithFallback } from '../../utils/http';
import { createLogger } from '../../utils/debug';
import {
  COMMENTATORS as REGISTRY_COMMENTATORS,
  ERAS,
  COMMENTATOR_CATEGORIES
} from '../../constants/commentatorRegistry';

export const log = createLogger('Commentary');

// Use local proxy in development
export const SEFARIA_BASE = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// =============================================================================
// COMMENTARY TEXT CACHE
// =============================================================================

const TEXT_CACHE_MAX_SIZE = 100;
const textCache = new Map();

/**
 * Add to cache with LRU-style eviction
 */
export const cacheText = (ref, data) => {
  // If cache is full, remove oldest entries (first 20%)
  if (textCache.size >= TEXT_CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(textCache.keys()).slice(0, Math.floor(TEXT_CACHE_MAX_SIZE * 0.2));
    keysToDelete.forEach(key => textCache.delete(key));
  }
  textCache.set(ref, data);
};

/**
 * Clear cache (call when navigating to new chapter/book)
 */
export const clearCommentaryCache = () => {
  textCache.clear();
};

/** Expose textCache for internal use */
export { textCache };

// Local storage keys
const LEARNED_KEY = 'torah_learned_commentaries';
const NOTES_KEY = 'torah_study_notes';

// =============================================================================
// COMMENTATOR METADATA - Derived from central registry
// =============================================================================

// Map method to PaRDeS approach
const METHOD_TO_APPROACH = {
  'Peshat': 'pshat',
  'Strict Peshat': 'pshat',
  'Grammar': 'pshat',
  'Grammar & Peshat': 'pshat',
  'Grammar & linguistics': 'pshat',
  'Philosophy': 'pshat',
  'Aramaic translation': 'translation',
  'Kabbalah': 'drash',
  'Kabbalah & Peshat': 'mixed',
  'Mussar': 'drash',
  'Dialectical analysis': 'mixed',
  'Halacha & Aggada': 'mixed',
  'Halacha & Philosophy': 'mixed'
};

// Map era to difficulty
const ERA_DIFFICULTY = {
  targum: 'beginner',
  rishonim: 'intermediate',
  acharonim: 'advanced'
};

// Build COMMENTATOR_INFO from central registry
export const COMMENTATOR_INFO = Object.fromEntries(
  Object.entries(REGISTRY_COMMENTATORS).map(([key, c]) => {
    const era = ERAS[c.era];
    return [key.replace('_', ' '), {
      heName: c.hebrew,
      fullName: c.full,
      era: era?.name || c.era,
      years: c.dates,
      location: c.location,
      approach: METHOD_TO_APPROACH[c.method] || 'pshat',
      style: c.method,
      difficulty: ERA_DIFFICULTY[c.era] || 'intermediate',
      icon: c.icon
    }];
  })
);

// Commentator categorization - derived from registry with space-separated keys for matching
export const COMMENTATORS = Object.fromEntries(
  Object.entries(COMMENTATOR_CATEGORIES).map(([cat, keys]) => [
    cat,
    keys.map(k => k.replace('_', ' '))
  ])
);

// Approach colors
export const APPROACH_COLORS = {
  pshat: { bg: '#E8F5E9', text: '#2E7D32', label: 'פשט' },
  drash: { bg: '#FFF3E0', text: '#E65100', label: 'דרש' },
  remez: { bg: '#E3F2FD', text: '#1565C0', label: 'רמז' },
  sod: { bg: '#F3E5F5', text: '#7B1FA2', label: 'סוד' },
  mixed: { bg: '#FFF8E1', text: '#F57F17', label: 'מעורב' },
  translation: { bg: '#ECEFF1', text: '#546E7A', label: 'תרגום' }
};

// =============================================================================
// STUDY PATH - Recommended Learning Order
// =============================================================================

export const STUDY_PATH = {
  // Order for beginners - start with basics
  beginner: [
    { name: 'onkelos', reason: 'Foundation - Aramaic translation shows basic meaning' },
    { name: 'rashi', reason: 'Essential - Most fundamental commentary, explains pshat' },
    { name: 'rashbam', reason: 'Deeper pshat - Rashi\'s grandson, strict literal meaning' },
    { name: 'sforno', reason: 'Ethical lessons - Clear philosophical insights' }
  ],
  // Standard Yeshiva order
  intermediate: [
    { name: 'rashi', reason: 'Always start with Rashi' },
    { name: 'ramban', reason: 'See where Ramban disagrees/adds depth' },
    { name: 'ibn ezra', reason: 'Grammar and language precision' },
    { name: 'sforno', reason: 'Ethical and philosophical dimension' },
    { name: 'chizkuni', reason: 'Synthesis of earlier views' }
  ],
  // Advanced study
  advanced: [
    { name: 'rashi', reason: 'Foundation' },
    { name: 'ramban', reason: 'Deep analysis and disagreements' },
    { name: 'ibn ezra', reason: 'Grammatical precision' },
    { name: 'or hachaim', reason: 'Multiple interpretations, mystical' },
    { name: 'kli yakar', reason: 'Homiletical depth' },
    { name: 'malbim', reason: 'Precise linguistic analysis' }
  ]
};

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

// =============================================================================
// LOCAL STORAGE HELPERS - Using safeLocalStorage for error handling
// =============================================================================

export function getLearnedCommentaries() {
  return safeGet(LEARNED_KEY, {});
}

export function setLearnedCommentary(ref, learned) {
  const data = getLearnedCommentaries();
  if (learned) {
    data[ref] = Date.now();
  } else {
    delete data[ref];
  }
  safeSet(LEARNED_KEY, data);
}

export function getStudyNotes() {
  return safeGet(NOTES_KEY, {});
}

export function saveStudyNote(ref, note) {
  const data = getStudyNotes();
  if (note.trim()) {
    data[ref] = { text: note, updated: Date.now() };
  } else {
    delete data[ref];
  }
  safeSet(NOTES_KEY, data);
}

// =============================================================================
// SCHOLARLY COLOR PALETTE
// =============================================================================

export const COLORS = {
  primary: '#8B2635',
  primaryLight: '#A63446',
  primaryDark: '#6B1D2A',
  gold: '#C49A3D',
  goldLight: '#D4AA4D',
  goldDark: '#A67C2E',
  parchment: '#FAF6F0',
  parchmentDark: '#F0EBE3',
  cream: '#FFFDF8',
  ink: '#2C1810',
  inkLight: '#4A3328',
  inkMuted: '#7A6A5A',
  border: '#E5DDD4',
  borderDark: '#D4C9BC',
  shadow: 'rgba(44, 24, 16, 0.08)',
  shadowDark: 'rgba(44, 24, 16, 0.15)',
  success: '#2E7D32',
  successBg: '#E8F5E9'
};

// =============================================================================
// STYLES
// =============================================================================

export const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: `linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`,
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${COLORS.border}`
  },
  header: {
    padding: '12px 16px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `3px solid ${COLORS.gold}`
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerIcon: {
    fontSize: '1.2rem'
  },
  headerText: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.95rem',
    fontWeight: '600'
  },
  modeToggle: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '3px'
  },
  modeBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.78rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modeBtnActive: {
    background: 'rgba(255,255,255,0.95)',
    color: COLORS.primary
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    padding: '8px 10px',
    background: COLORS.parchmentDark,
    borderBottom: `1px solid ${COLORS.border}`
  },
  viewBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.cream,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: COLORS.inkMuted,
    transition: 'all 0.2s'
  },
  viewBtnActive: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  badge: {
    background: COLORS.gold,
    color: COLORS.ink,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: '700'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px'
  },
  categoryTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px'
  },
  catTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    background: COLORS.cream,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: COLORS.inkLight,
    transition: 'all 0.2s'
  },
  catTabActive: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  catCount: {
    background: 'rgba(255,255,255,0.25)',
    padding: '1px 6px',
    borderRadius: '10px',
    fontSize: '0.72rem',
    fontWeight: '600'
  },
  studyStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    marginBottom: '12px',
    background: COLORS.cream,
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.82rem'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: COLORS.inkMuted
  },
  statValue: {
    fontWeight: '600',
    color: COLORS.ink
  },
  progressBar: {
    flex: 1,
    maxWidth: '120px',
    height: '6px',
    background: COLORS.border,
    borderRadius: '3px',
    overflow: 'hidden',
    marginLeft: '12px'
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
    borderRadius: '3px',
    transition: 'width 0.3s'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  // Study Card Styles
  card: {
    background: COLORS.cream,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  cardLearned: {
    borderColor: COLORS.success,
    borderLeftWidth: '4px'
  },
  cardOpen: {
    boxShadow: `0 6px 20px ${COLORS.shadowDark}`,
    borderColor: COLORS.gold
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left'
  },
  cardIcon: {
    fontSize: '1.3rem',
    lineHeight: 1
  },
  cardMain: {
    flex: 1,
    minWidth: 0
  },
  cardNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  cardName: {
    fontWeight: '600',
    fontSize: '0.92rem',
    color: COLORS.primary
  },
  cardHeName: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.88rem',
    color: COLORS.inkLight
  },
  approachBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  difficultyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  cardDibur: {
    marginTop: '6px',
    padding: '6px 10px',
    background: COLORS.parchmentDark,
    borderRadius: '6px',
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '0.88rem',
    color: COLORS.ink,
    direction: 'rtl',
    borderRight: `3px solid ${COLORS.gold}`
  },
  cardMeta: {
    marginTop: '4px',
    fontSize: '0.75rem',
    color: COLORS.inkMuted
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px'
  },
  cardArrow: {
    fontSize: '0.7rem',
    color: COLORS.gold,
    transition: 'transform 0.2s'
  },
  learnedCheck: {
    color: COLORS.success,
    fontSize: '1rem'
  },
  cardBody: {
    padding: '0 14px 14px',
    borderTop: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`
  },
  // Study Mode Elements
  studySection: {
    marginTop: '14px',
    padding: '12px',
    background: COLORS.cream,
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: COLORS.primary
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  questionItem: {
    padding: '10px 12px',
    background: COLORS.parchment,
    borderRadius: '8px',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    borderLeft: `3px solid ${COLORS.gold}`
  },
  noteArea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    resize: 'vertical',
    background: COLORS.cream
  },
  noteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px'
  },
  actionBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    background: COLORS.primary,
    color: COLORS.cream
  },
  secondaryBtn: {
    background: COLORS.parchment,
    color: COLORS.inkLight,
    border: `1px solid ${COLORS.border}`
  },
  learnedBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `2px solid ${COLORS.success}`,
    borderRadius: '8px',
    background: 'transparent',
    color: COLORS.success,
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  learnedBtnActive: {
    background: COLORS.successBg,
    borderColor: COLORS.success
  },
  textHe: {
    fontFamily: 'var(--font-hebrew, "SBL Hebrew", serif)',
    fontSize: '1.1rem',
    lineHeight: 2,
    color: COLORS.ink,
    marginTop: '12px',
    padding: '14px',
    background: COLORS.cream,
    borderRadius: '10px',
    borderRight: `4px solid ${COLORS.gold}`,
    direction: 'rtl'
  },
  textEn: {
    fontSize: '0.92rem',
    lineHeight: 1.75,
    color: COLORS.inkLight,
    marginTop: '10px',
    paddingLeft: '14px',
    borderLeft: `2px solid ${COLORS.border}`,
    fontStyle: 'italic'
  },
  infoBox: {
    marginTop: '12px',
    padding: '12px',
    background: COLORS.parchmentDark,
    borderRadius: '10px',
    fontSize: '0.82rem',
    lineHeight: 1.6
  },
  infoRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  infoLabel: {
    color: COLORS.inkMuted
  },
  infoValue: {
    fontWeight: '500',
    color: COLORS.ink
  },
  // Empty/Loading States
  state: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '12px'
  },
  stateIcon: {
    fontSize: '3rem',
    opacity: 0.6
  },
  stateText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: COLORS.ink
  },
  stateSub: {
    fontSize: '0.88rem',
    color: COLORS.inkMuted,
    maxWidth: '280px'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.primary,
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite'
  },
  fallbackLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 0',
    color: COLORS.primary,
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: '500'
  },
  // Comparison View Styles
  comparisonContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '12px',
    padding: '12px'
  },
  comparisonCard: {
    background: COLORS.cream,
    borderRadius: '12px',
    border: `2px solid ${COLORS.border}`,
    overflow: 'hidden'
  },
  comparisonCardSelected: {
    borderColor: COLORS.gold,
    boxShadow: `0 0 0 2px ${COLORS.gold}33`
  },
  comparisonHeader: {
    padding: '10px 14px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  comparisonBody: {
    padding: '12px',
    maxHeight: '300px',
    overflow: 'auto'
  },
  // Cross-reference badges
  crossRefBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: '600',
    marginRight: '6px',
    marginBottom: '4px'
  },
  crossRefAgree: {
    background: '#E3F2FD',
    color: '#1565C0'
  },
  crossRefDisagree: {
    background: '#FFEBEE',
    color: '#C62828'
  },
  // Study Path Styles
  studyPathPanel: {
    padding: '14px',
    background: `linear-gradient(135deg, ${COLORS.parchment} 0%, ${COLORS.cream} 100%)`,
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '16px'
  },
  studyPathTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: COLORS.primary
  },
  studyPathLevelToggle: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px'
  },
  studyPathLevelBtn: {
    flex: 1,
    padding: '8px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.cream,
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  studyPathLevelActive: {
    background: COLORS.primary,
    color: COLORS.cream,
    borderColor: COLORS.primaryDark
  },
  studyPathStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: COLORS.cream,
    borderRadius: '8px',
    marginBottom: '8px',
    border: `1px solid ${COLORS.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  studyPathStepActive: {
    borderColor: COLORS.gold,
    background: `${COLORS.gold}15`
  },
  studyPathStepComplete: {
    borderColor: COLORS.success,
    background: COLORS.successBg
  },
  studyPathNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: COLORS.primary,
    color: COLORS.cream,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  studyPathStepInfo: {
    flex: 1
  },
  studyPathStepName: {
    fontWeight: '600',
    fontSize: '0.88rem',
    color: COLORS.ink
  },
  studyPathStepReason: {
    fontSize: '0.78rem',
    color: COLORS.inkMuted,
    marginTop: '2px'
  },
  // Summary Styles
  summaryBox: {
    padding: '10px 12px',
    background: `linear-gradient(135deg, ${COLORS.gold}15 0%, ${COLORS.gold}08 100%)`,
    borderRadius: '8px',
    border: `1px solid ${COLORS.gold}40`,
    marginTop: '10px'
  },
  summaryTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: COLORS.goldDark,
    marginBottom: '8px'
  },
  summaryPoint: {
    fontSize: '0.85rem',
    lineHeight: 1.5,
    color: COLORS.ink,
    padding: '6px 0',
    borderBottom: `1px solid ${COLORS.border}`
  },
  // Compare selection checkbox
  compareCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: COLORS.gold
  },
  compareBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: `linear-gradient(90deg, ${COLORS.gold}20 0%, ${COLORS.gold}10 100%)`,
    borderBottom: `1px solid ${COLORS.gold}40`
  },
  compareBarText: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: COLORS.ink
  },
  compareBarBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '6px',
    background: COLORS.gold,
    color: COLORS.ink,
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
