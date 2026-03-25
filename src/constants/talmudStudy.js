/**
 * Talmud Study Constants - PRO SCHOLAR V31
 *
 * Shared constants for Talmud study components.
 * Single source of truth for:
 * - Hebrew type labels
 * - Study modes (Iyun/Bekius/Chazara)
 * - Type categories
 * - Masechta names
 * - Chazara question templates
 * - Abbreviation type icons
 *
 * Used by:
 * - TalmudToolsTab.js
 * - UnifiedSugyaAnalysis/index.js
 * - AIAnalysisTab/ModeGrid.js
 * - Other scholar-mode components
 */

// =============================================================================
// TEXT TYPE LABELS - Book category labels with icons (DRY: single source)
// =============================================================================

export const TEXT_TYPE_LABELS = {
  torah: { icon: '📜', hebrew: 'תורה' },
  neviim: { icon: '📖', hebrew: 'נביאים' },
  ketuvim: { icon: '📚', hebrew: 'כתובים' },
  mishna: { icon: '📗', hebrew: 'משנה' },
  mishnah: { icon: '📗', hebrew: 'משנה' },
  talmud: { icon: '📕', hebrew: 'גמרא' },
  gemara: { icon: '📕', hebrew: 'גמרא' }
};

// =============================================================================
// HEBREW TYPE LABELS - Pattern type names in Hebrew
// =============================================================================

export const HEBREW_TYPE_LABELS = {
  mishna: 'משנה',
  gemara: 'גמרא',
  question: 'שאלה',
  objection: 'קושיא',
  proof: 'ראיה',
  resolution: 'תירוץ',
  alternative: 'איכא דאמרי',
  baraita: 'ברייתא',
  scripture: 'פסוק',
  source_citation: 'מקור',
  legal_ruling: 'הלכה'
};

// =============================================================================
// STUDY MODES - Three approaches to Talmud learning
// =============================================================================

export const STUDY_MODES = {
  iyun: {
    key: 'iyun',
    hebrew: 'עיון',
    english: 'Deep Analysis',
    icon: '🔬',
    description: 'לימוד מעמיק - הבנת הסברא והשקלא וטריא',
    color: '#7C3AED'
  },
  bekius: {
    key: 'bekius',
    hebrew: 'בקיאות',
    english: 'Overview',
    icon: '📖',
    description: 'סקירה כללית - מה עיקר ההלכה והנושא',
    color: '#3B82F6'
  },
  chazara: {
    key: 'chazara',
    hebrew: 'חזרה',
    english: 'Review',
    icon: '🔄',
    description: 'חזרה ובחינה עצמית - האם הבנתי?',
    color: '#10B981'
  }
};

// Enum-style constants for study modes (used by AIAnalysisTab)
export const STUDY_MODE_KEYS = {
  IYUN: 'iyun',
  BEKIUS: 'bekius',
  CHAZARA: 'chazara'
};

// =============================================================================
// TYPE CATEGORIES - Groupings for pattern types
// =============================================================================

export const TYPE_CATEGORIES = {
  structure: { label: 'מבנה', types: ['mishna', 'gemara', 'baraita'] },
  dialectic: { label: 'שקלא וטריא', types: ['question', 'objection', 'proof', 'resolution'] },
  sources: { label: 'מקורות', types: ['scripture', 'source_citation'] },
  halacha: { label: 'הלכה', types: ['legal_ruling', 'alternative'] }
};

// =============================================================================
// VIEW MODES - Different visualization options
// =============================================================================

export const VIEW_MODES = {
  FLOW: 'flow',
  TREE: 'tree',
  DIAGRAM: 'diagram',
  SUMMARY: 'summary'
};

// =============================================================================
// STORAGE KEYS - LocalStorage keys for persistence
// =============================================================================

export const STORAGE_KEYS = {
  notes: 'unified_sugya_notes',
  mastery: 'unified_sugya_mastery',
  viewPrefs: 'unified_sugya_prefs',
  chazaraAssessment: 'talmud_chazara_assessment'
};

// =============================================================================
// MASECHTA NAMES - Hebrew names for tractates
// =============================================================================

export const MASECHTA_HEBREW = {
  'Berakhot': 'ברכות',
  'Shabbat': 'שבת',
  'Eruvin': 'עירובין',
  'Pesachim': 'פסחים',
  'Shekalim': 'שקלים',
  'Yoma': 'יומא',
  'Sukkah': 'סוכה',
  'Beitzah': 'ביצה',
  'Rosh Hashanah': 'ראש השנה',
  'Taanit': 'תענית',
  'Megillah': 'מגילה',
  'Moed Katan': 'מועד קטן',
  'Chagigah': 'חגיגה',
  'Yevamot': 'יבמות',
  'Ketubot': 'כתובות',
  'Nedarim': 'נדרים',
  'Nazir': 'נזיר',
  'Sotah': 'סוטה',
  'Gittin': 'גיטין',
  'Kiddushin': 'קידושין',
  'Bava Kamma': 'בבא קמא',
  'Bava Metzia': 'בבא מציעא',
  'Bava Batra': 'בבא בתרא',
  'Sanhedrin': 'סנהדרין',
  'Makkot': 'מכות',
  'Shevuot': 'שבועות',
  'Avodah Zarah': 'עבודה זרה',
  'Horayot': 'הוריות',
  'Zevachim': 'זבחים',
  'Menachot': 'מנחות',
  'Chullin': 'חולין',
  'Bekhorot': 'בכורות',
  'Arakhin': 'ערכין',
  'Temurah': 'תמורה',
  'Keritot': 'כריתות',
  'Meilah': 'מעילה',
  'Tamid': 'תמיד',
  'Niddah': 'נדה'
};

// =============================================================================
// CHAZARA QUESTION TEMPLATES - Self-test questions by category
// =============================================================================

export const CHAZARA_QUESTION_TEMPLATES = {
  mishna: [
    'מהי ההלכה העיקרית במשנה?',
    'כמה מקרים מונה המשנה?',
    'מהם התנאים שההלכה תלויה בהם?'
  ],
  gemara: [
    'מה שואלת הגמרא על המשנה?',
    'מה הקושיא המרכזית?',
    'כיצד הגמרא מתרצת?'
  ],
  sages: [
    'אילו חכמים מוזכרים בסוגיא?',
    'מה דעתו של כל חכם?'
  ]
};

// =============================================================================
// ABBREVIATION TYPE ICONS - Icons for ראשי תיבות grouping
// =============================================================================

export const ABBR_TYPE_ICONS = {
  name: '👤',
  source: '📜',
  proof: '✓',
  structure: '📑',
  attribution: '💬',
  question: '❓',
  school: '🏛️',
  teaching: '📚',
  ruling: '⚡',
  tractate: '📕',
  term: '🏷️',
  other: '📌'
};

// =============================================================================
// CROSS-REFERENCE CATEGORIES - Types of related sources (V31 merged)
// =============================================================================

export const CROSS_REF_CATEGORIES = {
  // Detailed cross-reference types for Talmud study
  parallel_sugya: { icon: '📚', label: 'סוגיא מקבילה', color: '#8B5CF6' },
  parallel_mishna: { icon: '📘', label: 'משנה מקבילה', color: '#3B82F6' },
  tosefta: { icon: '📜', label: 'תוספתא', color: '#10B981' },
  scripture: { icon: '✡️', label: 'פסוקים', color: '#F59E0B' },
  yerushalmi: { icon: '🏛️', label: 'ירושלמי', color: '#EC4899' },
  // Generic categories (backwards compatibility)
  parallel: { label: 'סוגיות מקבילות', icon: '🔗', color: '#8B5CF6' },
  source: { label: 'מקורות', icon: '📜', color: '#10B981' },
  related: { label: 'נושאים קשורים', icon: '📚', color: '#3B82F6' },
  halacha: { label: 'הלכה למעשה', icon: '⚖️', color: '#F59E0B' }
};

// =============================================================================
// IYUN ANALYSIS PATTERNS - Deep study pattern detection
// =============================================================================

export const IYUN_ANALYSIS_PATTERNS = {
  sevara: [
    { pattern: /מאי\s+טעמא/g, label: 'מה הטעם?', type: 'reasoning' },
    { pattern: /משום\s+ד/g, label: 'משום ש...', type: 'reason' },
    { pattern: /מה\s+הטעם/g, label: 'מה הטעם?', type: 'reasoning' },
    { pattern: /טעמא\s+מאי/g, label: 'טעם?', type: 'reasoning' },
    { pattern: /סברא\s+הוא/g, label: 'סברא', type: 'logic' },
    { pattern: /מסתבר/g, label: 'מסתבר', type: 'logic' }
  ],
  distinction: [
    { pattern: /הכא.*התם/g, label: 'כאן/שם', type: 'distinction' },
    { pattern: /לא\s+קשיא/g, label: 'לא קשיא', type: 'resolution' },
    { pattern: /שאני/g, label: 'שאני - שונה', type: 'distinction' },
    { pattern: /מה\s+נפשך/g, label: 'מה נפשך', type: 'dilemma' }
  ],
  assumption: [
    { pattern: /פשיטא/g, label: 'פשיטא - ברור', type: 'obvious' },
    { pattern: /מהו\s+דתימא/g, label: 'סלקא דעתך', type: 'assumption' },
    { pattern: /קא\s+משמע\s+לן/g, label: 'קמ״ל', type: 'teaching' }
  ]
};

// =============================================================================
// IYUN PROMPTS - Study prompts for deep analysis
// =============================================================================

export const IYUN_PROMPTS = [
  'מהי השאלה שהגמרא מנסה לענות עליה?',
  'מה הסברא מאחורי הדין?',
  'מדוע הקושיא קשה? מה היה אמור להיות?',
  'מה החידוש בתירוץ?',
  'האם יש נפקא מינה למחלוקת?',
  'מה היסוד ההלכתי/הסברתי?'
];

// =============================================================================
// HELPER: Parse daf reference
// =============================================================================

export function parseDafReference(reference) {
  if (!reference) return null;

  // Match patterns like "Berakhot 2a", "Bava Metzia 15b", etc.
  const match = reference.match(/^(.+?)\s+(\d+)([ab])$/i);
  if (!match) return null;

  const [, masechta, daf, amud] = match;
  const hebrewMasechta = MASECHTA_HEBREW[masechta] || masechta;
  const hebrewAmud = amud.toLowerCase() === 'a' ? 'ע״א' : 'ע״ב';
  const hebrewDaf = `${daf}${amud === 'a' ? '.' : ':'}`;

  return {
    masechta,
    hebrewMasechta,
    daf: parseInt(daf),
    amud: amud.toLowerCase(),
    hebrewAmud,
    hebrewDaf,
    fullHebrew: `${hebrewMasechta} ${hebrewDaf}`,
    sefariaUrl: `https://www.sefaria.org/${masechta.replace(/\s+/g, '_')}.${daf}${amud}`
  };
}

// =============================================================================
// HELPER: Parse reference to extract tractate and daf
// =============================================================================

export function parseReference(ref) {
  if (!ref) return null;
  // Match patterns like "Shabbat 2a", "Berakhot 15b", etc.
  const match = ref.match(/^([A-Za-z\s]+)\s*(\d+[ab])$/i);
  if (match) {
    return {
      tractate: match[1].trim(),
      daf: match[2].toLowerCase()
    };
  }
  return null;
}

// =============================================================================
// HELPER: Strip nikud for pattern matching (re-export from hebrewUtils - DRY)
// =============================================================================

export { stripAllDiacritics as stripNikud } from '../utils/hebrewUtils';

// =============================================================================
// HELPER: Strip HTML tags and clean text
// =============================================================================

export const stripHtmlTags = (text) => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')           // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')            // Replace &nbsp; with space
    .replace(/&amp;/g, '&')             // Replace &amp; with &
    .replace(/&lt;/g, '<')              // Replace &lt; with <
    .replace(/&gt;/g, '>')              // Replace &gt; with >
    .replace(/&quot;/g, '"')            // Replace &quot; with "
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
};
