/**
 * CommentaryTab - Kollel/Yeshiva-Style Commentary Study
 *
 * Designed for serious Torah learning with features for:
 * - Dibur HaMatchil extraction (opening words)
 * - Study mode with questions and insights
 * - Commentary approach classification (Pshat/Drash)
 * - Personal notes and chiddushim
 * - Progress tracking (mark as learned)
 * - Comparison view for multiple commentaries
 * - Source citations and cross-references
 */
import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { safeGet, safeSet } from '../../utils/safeLocalStorage';
import RabbinicReferences from '../analysis/RabbinicReferences';
import { fetchWithFallback } from '../../utils/http';
import { createLogger } from '../../utils/debug';
import {
  COMMENTATORS as REGISTRY_COMMENTATORS,
  ERAS,
  COMMENTATOR_CATEGORIES
} from '../../constants/commentatorRegistry';

const log = createLogger('Commentary');

// Lazy-loaded RabbiInfoPanel for commentator biographies
const RabbiInfoPanel = lazy(() => import('./RabbiInfoPanel'));

// Use local proxy in development
const SEFARIA_BASE = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : 'https://www.sefaria.org/api';

// Commentary text cache with size limit to prevent memory bloat
const TEXT_CACHE_MAX_SIZE = 100;
const textCache = new Map();

/**
 * Add to cache with LRU-style eviction
 */
const cacheText = (ref, data) => {
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
const COMMENTATOR_INFO = Object.fromEntries(
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
const COMMENTATORS = Object.fromEntries(
  Object.entries(COMMENTATOR_CATEGORIES).map(([cat, keys]) => [
    cat,
    keys.map(k => k.replace('_', ' '))
  ])
);

// Approach colors
const APPROACH_COLORS = {
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

const STUDY_PATH = {
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
function detectCrossReferences(heText, enText, currentCommentator) {
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
function extractKeySummary(heText, enText) {
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

async function fetchLinks(book, chapter, verse, reference) {
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

async function fetchText(ref) {
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
function extractDiburHaMatchil(hebrewText) {
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
function generateStudyQuestions(commentatorName, heText, enText) {
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

function categorizeLinks(links) {
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

function getLearnedCommentaries() {
  return safeGet(LEARNED_KEY, {});
}

function setLearnedCommentary(ref, learned) {
  const data = getLearnedCommentaries();
  if (learned) {
    data[ref] = Date.now();
  } else {
    delete data[ref];
  }
  safeSet(LEARNED_KEY, data);
}

function getStudyNotes() {
  return safeGet(NOTES_KEY, {});
}

function saveStudyNote(ref, note) {
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

const COLORS = {
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

const styles = {
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

const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// =============================================================================
// STUDY CARD COMPONENT
// =============================================================================

function StudyCard({ item, isOpen, onToggle, studyMode, isCompareSelected, onCompareToggle, showCompare }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [isLearned, setIsLearned] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showRabbiInfo, setShowRabbiInfo] = useState(false);

  // Load learned status and notes
  useEffect(() => {
    const learned = getLearnedCommentaries();
    setIsLearned(!!learned[item.ref]);
    const notes = getStudyNotes();
    setNote(notes[item.ref]?.text || '');
  }, [item.ref]);

  // Fetch text when opened
  useEffect(() => {
    if (isOpen && !item.he && !item.en && !text && !loading) {
      setLoading(true);
      fetchText(item.ref).then(data => {
        setText(data);
        setLoading(false);
      });
    }
  }, [isOpen, item, text, loading]);

  const heContent = text?.he || item.he;
  const enContent = text?.en || item.en;
  const info = item.info;
  const approach = APPROACH_COLORS[item.approach] || APPROACH_COLORS.pshat;
  const questions = useMemo(() =>
    generateStudyQuestions(item.name, heContent, enContent),
    [item.name, heContent, enContent]
  );

  // Detect cross-references to other commentators
  const crossRefs = useMemo(() =>
    detectCrossReferences(heContent, enContent, item.nameKey),
    [heContent, enContent, item.nameKey]
  );

  // Extract key summary points
  const summaryPoints = useMemo(() =>
    extractKeySummary(heContent, enContent),
    [heContent, enContent]
  );

  const handleToggleLearned = (e) => {
    e.stopPropagation();
    const newState = !isLearned;
    setIsLearned(newState);
    setLearnedCommentary(item.ref, newState);
  };

  const handleSaveNote = () => {
    saveStudyNote(item.ref, note);
  };

  const difficultyColor = {
    beginner: '#4CAF50',
    intermediate: '#FF9800',
    advanced: '#F44336'
  };

  return (
    <div style={{
      ...styles.card,
      ...(isOpen ? styles.cardOpen : {}),
      ...(isLearned ? styles.cardLearned : {}),
      ...(isCompareSelected ? styles.comparisonCardSelected : {})
    }}>
      <button style={styles.cardHeader} onClick={onToggle}>
        {showCompare && (
          <input
            type="checkbox"
            checked={isCompareSelected}
            onChange={(e) => {
              e.stopPropagation();
              onCompareToggle?.();
            }}
            onClick={(e) => e.stopPropagation()}
            style={styles.compareCheckbox}
            title="Add to comparison"
          />
        )}
        <span style={styles.cardIcon}>{info?.icon || '📖'}</span>

        <div style={styles.cardMain}>
          <div style={styles.cardNameRow}>
            <span style={styles.cardName}>{item.name}</span>
            {info?.heName && <span style={styles.cardHeName}>({info.heName})</span>}
            <span style={{
              ...styles.approachBadge,
              background: approach.bg,
              color: approach.text
            }}>
              {approach.label}
            </span>
            {info?.difficulty && (
              <span style={{
                ...styles.difficultyDot,
                background: difficultyColor[info.difficulty]
              }} title={info.difficulty} />
            )}
          </div>

          {item.diburHaMatchil && (
            <div style={styles.cardDibur}>
              ד"ה {item.diburHaMatchil}
            </div>
          )}

          {info && (
            <div style={styles.cardMeta}>
              {info.years} • {info.location}
            </div>
          )}
        </div>

        <div style={styles.cardRight}>
          {isLearned && <span style={styles.learnedCheck}>✓</span>}
          <span style={{
            ...styles.cardArrow,
            transform: isOpen ? 'rotate(90deg)' : 'none'
          }}>▶</span>
        </div>
      </button>

      {isOpen && (
        <div style={styles.cardBody}>
          {loading ? (
            <div style={{ ...styles.state, padding: '24px' }}>
              <div style={styles.spinner} />
              <span style={{ fontSize: '0.88rem', color: COLORS.inkMuted }}>Loading...</span>
            </div>
          ) : heContent || enContent ? (
            <>
              {/* Cross-References - Show when this commentator references others */}
              {crossRefs.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  {crossRefs.map((ref, i) => (
                    <span
                      key={i}
                      style={{
                        ...styles.crossRefBadge,
                        ...(ref.isDisagreement ? styles.crossRefDisagree : styles.crossRefAgree)
                      }}
                    >
                      {ref.isDisagreement ? '⚔️' : '🔗'}
                      {ref.isDisagreement ? 'Disagrees with' : 'References'} {ref.displayName}
                    </span>
                  ))}
                </div>
              )}

              {/* Commentary Text */}
              {heContent && (
                <div style={styles.textHe} dir="rtl">
                  {heContent}
                </div>
              )}
              {enContent && (
                <div style={styles.textEn}>
                  {enContent}
                </div>
              )}

              {/* Quick Summary - Key Points */}
              {studyMode && summaryPoints.length > 0 && (
                <div style={styles.summaryBox}>
                  <div
                    style={{ ...styles.summaryTitle, cursor: 'pointer' }}
                    onClick={() => setShowSummary(!showSummary)}
                  >
                    <span>💡</span>
                    <span>Key Points</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                      {showSummary ? '▼' : '▶'}
                    </span>
                  </div>
                  {showSummary && summaryPoints.map((point, i) => (
                    <div key={i} style={styles.summaryPoint}>{point}</div>
                  ))}
                </div>
              )}

              {/* Commentator Info */}
              {info && (
                <div style={styles.infoBox}>
                  <div style={styles.infoRow}>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Era:</span>
                      <span style={styles.infoValue}>{info.era}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>Style:</span>
                      <span style={styles.infoValue}>{info.style}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRabbiInfo(!showRabbiInfo);
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 10px',
                        border: `1px solid ${showRabbiInfo ? COLORS.gold : COLORS.border}`,
                        borderRadius: '6px',
                        background: showRabbiInfo ? `${COLORS.gold}20` : 'transparent',
                        color: showRabbiInfo ? COLORS.goldDark : COLORS.inkMuted,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>📜</span>
                      <span>{showRabbiInfo ? 'Hide' : 'Show'} Biography</span>
                    </button>
                  </div>

                  {/* RabbiInfoPanel - Show detailed biography */}
                  {showRabbiInfo && (
                    <div style={{ marginTop: '12px' }}>
                      <Suspense fallback={
                        <div style={{ padding: '16px', textAlign: 'center', color: COLORS.inkMuted }}>
                          Loading biography...
                        </div>
                      }>
                        <RabbiInfoPanel
                          rabbiName={info.heName || item.name}
                          onClose={() => setShowRabbiInfo(false)}
                          compact={true}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              )}

              {/* Study Mode Features */}
              {studyMode && (
                <>
                  {/* Study Questions */}
                  <div style={styles.studySection}>
                    <div
                      style={{ ...styles.sectionTitle, cursor: 'pointer' }}
                      onClick={() => setShowQuestions(!showQuestions)}
                    >
                      <span>🎯</span>
                      <span>Study Questions</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                        {showQuestions ? '▼' : '▶'}
                      </span>
                    </div>
                    {showQuestions && (
                      <div style={styles.questionList}>
                        {questions.map((q, i) => (
                          <div key={i} style={styles.questionItem}>{q}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Personal Notes */}
                  <div style={styles.studySection}>
                    <div style={styles.sectionTitle}>
                      <span>📝</span>
                      <span>My Notes & Chiddushim</span>
                    </div>
                    <textarea
                      style={styles.noteArea}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write your insights, questions, or connections..."
                    />
                    <div style={styles.noteActions}>
                      <button
                        style={{ ...styles.actionBtn, ...styles.primaryBtn }}
                        onClick={handleSaveNote}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Mark as Learned Button */}
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{
                    ...styles.learnedBtn,
                    ...(isLearned ? styles.learnedBtnActive : {})
                  }}
                  onClick={handleToggleLearned}
                >
                  <span>{isLearned ? '✓' : '○'}</span>
                  <span>{isLearned ? 'Learned' : 'Mark as Learned'}</span>
                </button>
              </div>
            </>
          ) : (
            <a
              href={`https://www.sefaria.org/${item.ref?.replace(/ /g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.fallbackLink}
            >
              View on Sefaria →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CommentaryTab({ commentaries, reference, book, chapter, verse }) {
  const [view, setView] = useState('commentary');
  const [studyMode, setStudyMode] = useState(true); // Default to study mode
  const [category, setCategory] = useState('primary');
  const [openItems, setOpenItems] = useState(new Set());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [learnedCount, setLearnedCount] = useState(0);
  // New: Comparison View state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState(new Set());
  const [showCompareView, setShowCompareView] = useState(false);
  // New: Study Path state
  const [showStudyPath, setShowStudyPath] = useState(false);
  const [studyPathLevel, setStudyPathLevel] = useState('intermediate');

  // Parse reference
  const parsed = useMemo(() => {
    if (book && chapter && verse) return { book, chapter, verse };
    if (!reference) return null;
    const m = reference.match(/^([A-Za-z\s]+)[\s._](\d+)[.:_](\d+)/);
    if (m) return { book: m[1].trim(), chapter: parseInt(m[2]), verse: parseInt(m[3]) };
    return null;
  }, [reference, book, chapter, verse]);

  // Fetch commentaries
  useEffect(() => {
    if (commentaries && Object.values(commentaries).flat().length > 0) {
      setData(commentaries);
      return;
    }

    if (!parsed && !reference) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchLinks(parsed?.book || book, parsed?.chapter || chapter, parsed?.verse || verse, reference)
      .then(links => {
        const organized = categorizeLinks(links);
        const total = Object.values(organized).flat().length;
        if (total === 0) setError('No commentaries found');
        setData(organized);
      })
      .catch(err => {
        setError(err.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [commentaries, reference, book, chapter, verse, parsed]);

  // Update learned count
  useEffect(() => {
    const learned = getLearnedCommentaries();
    const allItems = data ? Object.values(data).flat() : [];
    const count = allItems.filter(item => learned[item.ref]).length;
    setLearnedCount(count);
  }, [data, openItems]); // Re-check when items change

  // Category counts
  const counts = useMemo(() => ({
    primary: data?.primary?.length || 0,
    rishonim: data?.rishonim?.length || 0,
    acharonim: data?.acharonim?.length || 0,
    modern: data?.modern?.length || 0,
    other: data?.other?.length || 0
  }), [data]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // Auto-select first available category
  useEffect(() => {
    if (counts[category] === 0) {
      const first = ['primary', 'rishonim', 'acharonim', 'modern', 'other'].find(c => counts[c] > 0);
      if (first) setCategory(first);
    }
  }, [counts, category]);

  const currentItems = data?.[category] || [];

  const toggleItem = useCallback((idx) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      const key = `${category}-${idx}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [category]);

  // Toggle comparison selection for an item
  const toggleCompareSelect = useCallback((itemRef) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(itemRef)) {
        next.delete(itemRef);
      } else if (next.size < 4) { // Max 4 items for comparison
        next.add(itemRef);
      }
      return next;
    });
  }, []);

  // Get all items flat for comparison view
  const allItems = useMemo(() => {
    if (!data) return [];
    return Object.values(data).flat();
  }, [data]);

  // Get selected items for comparison
  const compareItems = useMemo(() => {
    return allItems.filter(item => selectedForCompare.has(item.ref));
  }, [allItems, selectedForCompare]);

  // Get study path items that are available in current commentaries
  const availableStudyPath = useMemo(() => {
    const path = STUDY_PATH[studyPathLevel] || [];
    const available = [];
    const learned = getLearnedCommentaries();

    for (const step of path) {
      const foundItem = allItems.find(item =>
        item.nameKey === step.name || item.name.toLowerCase().includes(step.name)
      );
      if (foundItem) {
        available.push({
          ...step,
          item: foundItem,
          isComplete: !!learned[foundItem.ref],
          displayName: COMMENTATOR_INFO[step.name]?.heName || step.name
        });
      }
    }
    return available;
  }, [allItems, studyPathLevel]);

  const refDisplay = parsed ? `${parsed.book} ${parsed.chapter}:${parsed.verse}` : reference || 'Select a verse';

  const categoryLabels = {
    primary: { icon: '⭐', label: 'ראשונים' },
    rishonim: { icon: '📜', label: 'Rishonim' },
    acharonim: { icon: '📖', label: 'אחרונים' },
    modern: { icon: '📚', label: 'Modern' },
    other: { icon: '📝', label: 'Other' }
  };

  const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={styles.container}>
        {/* Header with Mode Toggle */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📖</span>
            <span style={styles.headerText}>{refDisplay}</span>
          </div>

          <div style={styles.modeToggle}>
            <button
              style={{ ...styles.modeBtn, ...(studyMode ? styles.modeBtnActive : {}) }}
              onClick={() => setStudyMode(true)}
            >
              📚 Study
            </button>
            <button
              style={{ ...styles.modeBtn, ...(!studyMode ? styles.modeBtnActive : {}) }}
              onClick={() => setStudyMode(false)}
            >
              👁 Browse
            </button>
          </div>
        </div>

        {/* Tools Bar - Study Path & Compare */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          background: COLORS.parchmentDark,
          borderBottom: `1px solid ${COLORS.border}`
        }}>
          <button
            style={{
              ...styles.modeBtn,
              background: showStudyPath ? COLORS.gold : 'transparent',
              color: showStudyPath ? COLORS.ink : COLORS.inkMuted,
              border: `1px solid ${showStudyPath ? COLORS.gold : COLORS.border}`,
              borderRadius: '6px'
            }}
            onClick={() => setShowStudyPath(!showStudyPath)}
          >
            🛤️ Study Path
          </button>
          <button
            style={{
              ...styles.modeBtn,
              background: compareMode ? COLORS.gold : 'transparent',
              color: compareMode ? COLORS.ink : COLORS.inkMuted,
              border: `1px solid ${compareMode ? COLORS.gold : COLORS.border}`,
              borderRadius: '6px'
            }}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) {
                setSelectedForCompare(new Set());
                setShowCompareView(false);
              }
            }}
          >
            ⚖️ Compare {compareMode && selectedForCompare.size > 0 ? `(${selectedForCompare.size})` : ''}
          </button>
          {compareMode && selectedForCompare.size >= 2 && (
            <button
              style={{
                ...styles.modeBtn,
                background: COLORS.primary,
                color: COLORS.cream,
                borderRadius: '6px',
                marginLeft: 'auto'
              }}
              onClick={() => setShowCompareView(true)}
            >
              View Comparison →
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div style={styles.viewToggle}>
          <button
            style={{ ...styles.viewBtn, ...(view === 'commentary' ? styles.viewBtnActive : {}) }}
            onClick={() => setView('commentary')}
          >
            <span>📚</span>
            <span>מפרשים</span>
            {totalCount > 0 && <span style={styles.badge}>{totalCount}</span>}
          </button>
          <button
            style={{ ...styles.viewBtn, ...(view === 'rabbinic' ? styles.viewBtnActive : {}) }}
            onClick={() => setView('rabbinic')}
          >
            <span>📜</span>
            <span>תלמוד ומדרש</span>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Comparison View Modal */}
          {showCompareView && compareItems.length >= 2 && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: COLORS.cream,
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
                  color: COLORS.cream
                }}>
                  <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                    ⚖️ Commentary Comparison
                  </span>
                  <button
                    onClick={() => setShowCompareView(false)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: COLORS.cream,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Close
                  </button>
                </div>
                <div style={styles.comparisonContainer}>
                  {compareItems.map((item, idx) => (
                    <div key={idx} style={styles.comparisonCard}>
                      <div style={styles.comparisonHeader}>
                        <span>{item.info?.icon || '📖'} {item.name}</span>
                        <span style={{
                          ...styles.approachBadge,
                          background: 'rgba(255,255,255,0.2)',
                          color: COLORS.cream
                        }}>
                          {APPROACH_COLORS[item.approach]?.label || 'פשט'}
                        </span>
                      </div>
                      <div style={styles.comparisonBody}>
                        {item.he && (
                          <div style={{ ...styles.textHe, marginTop: 0 }} dir="rtl">
                            {item.he}
                          </div>
                        )}
                        {item.en && (
                          <div style={{ ...styles.textEn, marginTop: '8px' }}>
                            {item.en}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Study Path Panel */}
          {showStudyPath && availableStudyPath.length > 0 && (
            <div style={styles.studyPathPanel}>
              <div style={styles.studyPathTitle}>
                <span>🛤️</span>
                <span>Recommended Study Path</span>
              </div>

              {/* Level Toggle */}
              <div style={styles.studyPathLevelToggle}>
                {['beginner', 'intermediate', 'advanced'].map(level => (
                  <button
                    key={level}
                    style={{
                      ...styles.studyPathLevelBtn,
                      ...(studyPathLevel === level ? styles.studyPathLevelActive : {})
                    }}
                    onClick={() => setStudyPathLevel(level)}
                  >
                    {level === 'beginner' ? '🌱' : level === 'intermediate' ? '🌿' : '🌳'}
                    {' '}{level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>

              {/* Study Steps */}
              {availableStudyPath.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.studyPathStep,
                    ...(step.isComplete ? styles.studyPathStepComplete : {})
                  }}
                  onClick={() => {
                    // Find the item in categories and open it
                    for (const [cat, items] of Object.entries(data || {})) {
                      const itemIdx = items.findIndex(i => i.ref === step.item.ref);
                      if (itemIdx >= 0) {
                        setCategory(cat);
                        setOpenItems(new Set([`${cat}-${itemIdx}`]));
                        setShowStudyPath(false);
                        break;
                      }
                    }
                  }}
                >
                  <div style={{
                    ...styles.studyPathNumber,
                    background: step.isComplete ? COLORS.success : COLORS.primary
                  }}>
                    {step.isComplete ? '✓' : idx + 1}
                  </div>
                  <div style={styles.studyPathStepInfo}>
                    <div style={styles.studyPathStepName}>
                      {step.displayName} - {step.item.name}
                    </div>
                    <div style={styles.studyPathStepReason}>{step.reason}</div>
                  </div>
                  <span style={{ color: COLORS.inkMuted }}>→</span>
                </div>
              ))}
            </div>
          )}

          {view === 'commentary' && (
            <>
              {loading ? (
                <div style={styles.state}>
                  <div style={styles.spinner} />
                  <span style={styles.stateText}>Loading commentaries...</span>
                </div>
              ) : error && totalCount === 0 ? (
                <div style={styles.state}>
                  <span style={styles.stateIcon}>📚</span>
                  <span style={styles.stateText}>{error}</span>
                  <span style={styles.stateSub}>{refDisplay}</span>
                </div>
              ) : totalCount === 0 ? (
                <div style={styles.state}>
                  <span style={styles.stateIcon}>📭</span>
                  <span style={styles.stateText}>Select a verse to begin learning</span>
                  <span style={styles.stateSub}>Choose a verse from the text above to see commentaries</span>
                </div>
              ) : (
                <>
                  {/* Study Progress */}
                  {studyMode && (
                    <div style={styles.studyStats}>
                      <div style={styles.statItem}>
                        <span>📖</span>
                        <span style={styles.statValue}>{totalCount}</span>
                        <span>commentaries</span>
                      </div>
                      <div style={styles.statItem}>
                        <span>✓</span>
                        <span style={styles.statValue}>{learnedCount}</span>
                        <span>learned</span>
                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Tabs */}
                  <div style={styles.categoryTabs}>
                    {Object.entries(counts).filter(([, c]) => c > 0).map(([id, count]) => (
                      <button
                        key={id}
                        style={{ ...styles.catTab, ...(category === id ? styles.catTabActive : {}) }}
                        onClick={() => setCategory(id)}
                      >
                        <span>{categoryLabels[id].icon}</span>
                        <span>{categoryLabels[id].label}</span>
                        <span style={styles.catCount}>{count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Commentary List */}
                  <div style={styles.list}>
                    {currentItems.map((item, idx) => (
                      <StudyCard
                        key={`${item.ref}-${idx}`}
                        item={item}
                        isOpen={openItems.has(`${category}-${idx}`)}
                        onToggle={() => toggleItem(idx)}
                        studyMode={studyMode}
                        showCompare={compareMode}
                        isCompareSelected={selectedForCompare.has(item.ref)}
                        onCompareToggle={() => toggleCompareSelect(item.ref)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {view === 'rabbinic' && (
            parsed ? (
              <RabbinicReferences book={parsed.book} chapter={parsed.chapter} verse={parsed.verse} />
            ) : (
              <div style={styles.state}>
                <span style={styles.stateIcon}>📜</span>
                <span style={styles.stateText}>Select a verse to view Talmud & Midrash</span>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
