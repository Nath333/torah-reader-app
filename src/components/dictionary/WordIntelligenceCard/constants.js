/**
 * Constants for WordIntelligenceCard
 * Display configurations for semantic fields, tiers, and other UI elements
 */

/** Semantic field display configuration - PRO SCHOLAR V6 */
export const SEMANTIC_FIELD_DISPLAY = {
  LEGAL: { name: 'Legal/Halachic', hebrew: 'הלכתי', icon: '⚖️', color: '#1d4ed8', bg: '#dbeafe' },
  DIALECTIC: { name: 'Dialectical', hebrew: 'סוגייתי', icon: '💬', color: '#7c3aed', bg: '#ede9fe' },
  RITUAL: { name: 'Ritual/Temple', hebrew: 'פולחני', icon: '🕯️', color: '#b45309', bg: '#fef3c7' },
  AGRICULTURAL: { name: 'Agricultural', hebrew: 'חקלאי', icon: '🌾', color: '#16a34a', bg: '#dcfce7' },
  COMMERCIAL: { name: 'Commercial', hebrew: 'מסחרי', icon: '💰', color: '#ca8a04', bg: '#fef9c3' },
  FAMILY: { name: 'Family/Social', hebrew: 'משפחתי', icon: '👨‍👩‍👧', color: '#ec4899', bg: '#fce7f3' },
  RELIGIOUS: { name: 'Religious', hebrew: 'דתי', icon: '✡️', color: '#6366f1', bg: '#e0e7ff' },
  ANATOMICAL: { name: 'Anatomical', hebrew: 'אנטומי', icon: '🫀', color: '#ef4444', bg: '#fee2e2' },
  TEMPORAL: { name: 'Temporal', hebrew: 'זמני', icon: '⏰', color: '#0891b2', bg: '#cffafe' },
  SPATIAL: { name: 'Spatial', hebrew: 'מרחבי', icon: '📍', color: '#84cc16', bg: '#ecfccb' }
};

/** Dictionary tier display - PRO SCHOLAR V6 */
export const TIER_DISPLAY = {
  gold: { icon: '🥇', label: 'Gold Standard', color: '#b8860b', bg: '#fef3c7' },
  silver: { icon: '🥈', label: 'Standard', color: '#6b7280', bg: '#f3f4f6' },
  bronze: { icon: '🥉', label: 'Supplementary', color: '#b45309', bg: '#fef3c7' }
};

/** Source category configurations */
export const SOURCE_CATEGORIES = {
  dictionary: { icon: '📖', label: 'Academic Dictionary', color: '#3b82f6' },
  pattern: { icon: '🔬', label: 'Morphological Analysis', color: '#8b5cf6' },
  corpus: { icon: '📊', label: 'Corpus Reference', color: '#10b981' },
  scholarly: { icon: '🎓', label: 'Scholarly Source', color: '#6366f1' }
};

/** Reference categories for cross-references */
export const REFERENCE_CATEGORIES = [
  { key: 'primary', label: 'Primary Sources', icon: '📜' },
  { key: 'talmud', label: 'Talmudic', icon: '📚' },
  { key: 'midrash', label: 'Midrashic', icon: '📖' },
  { key: 'commentaries', label: 'Commentaries', icon: '✍️' }
];

/** Hebrew dialects for detection */
export const HEBREW_DIALECTS = [
  { code: 'bh', name: 'Biblical Hebrew', icon: '📜', color: '#6b4423' },
  { code: 'mh', name: 'Mishnaic Hebrew', icon: '📚', color: '#1e40af' },
  { code: 'lbh', name: 'Late Biblical Hebrew', icon: '📖', color: '#7c3aed' },
  { code: 'rh', name: 'Rabbinic Hebrew', icon: '✡️', color: '#059669' },
  { code: 'aramaic', name: 'Aramaic', icon: '🏛️', color: '#b45309' },
  { code: 'aramaic-babylonian', name: 'Babylonian Aramaic', icon: '🏺', color: '#9a3412' },
  { code: 'aramaic-palestinian', name: 'Palestinian Aramaic', icon: '🕯️', color: '#7c2d12' },
  { code: 'aramaic-targumic', name: 'Targumic Aramaic', icon: '📖', color: '#854d0e' }
];

/** SRS rating configurations */
export const SRS_RATINGS = [
  { value: 1, label: 'Again', desc: 'Need more practice', color: '#ef4444', icon: '🔄' },
  { value: 2, label: 'Hard', desc: 'Recalled with difficulty', color: '#f97316', icon: '💪' },
  { value: 3, label: 'Good', desc: 'Recalled correctly', color: '#22c55e', icon: '✓' },
  { value: 4, label: 'Easy', desc: 'Very easy recall', color: '#3b82f6', icon: '⚡' }
];

/** Mastery thresholds for SRS - fallback if service unavailable */
export const DEFAULT_MASTERY_THRESHOLDS = {
  MASTERED: { minInterval: 21, minRepetitions: 5, label: 'mastered', icon: '⭐' },
  LEARNING: { minRepetitions: 3, label: 'learning', icon: '📚' },
  STARTED: { minRepetitions: 1, label: 'started', icon: '🌱' },
  NEW: { minRepetitions: 0, label: 'new', icon: '✨' },
};
