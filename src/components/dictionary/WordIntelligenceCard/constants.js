/**
 * WordIntelligenceCard Constants
 * Shared constants and configuration for all sub-components
 */

import { getSourceInfo, RELIABILITY_TIERS } from '../../../constants/dictionarySources';

// =============================================================================
// SEMANTIC FIELD DISPLAY
// =============================================================================

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

// =============================================================================
// TIER DISPLAY
// =============================================================================

export const TIER_DISPLAY = {
  academic: { icon: '🥇', label: 'Academic', color: '#059669', bg: '#dcfce7' },
  scholarly: { icon: '🥈', label: 'Reference', color: '#0891b2', bg: '#cffafe' },
  curated: { icon: '🥉', label: 'Curated', color: '#6366f1', bg: '#e0e7ff' },
  derived: { icon: '⚙️', label: 'Derived', color: '#8b5cf6', bg: '#ede9fe' },
  reference: { icon: '📑', label: 'General', color: '#64748b', bg: '#f1f5f9' },
  gold: { icon: '🥇', label: 'Academic', color: '#059669', bg: '#dcfce7' },
  silver: { icon: '🥈', label: 'Reference', color: '#0891b2', bg: '#cffafe' },
  bronze: { icon: '🥉', label: 'Curated', color: '#6366f1', bg: '#e0e7ff' }
};

// =============================================================================
// SOURCE CATEGORIES
// =============================================================================

export const SOURCE_CATEGORIES = {
  dictionary: { label: 'Dictionary', icon: '📖', color: '#2563eb' },
  algorithm:  { label: 'Pattern Analysis', icon: '🔬', color: '#7c3aed' },
  curated:    { label: 'Curated', icon: '✨', color: '#059669' },
  cache:      { label: 'Cached', icon: '💾', color: '#6b7280' }
};

// =============================================================================
// REFERENCE CATEGORIES
// =============================================================================

export const REFERENCE_CATEGORIES = [
  { key: 'tanakh', label: '📖 Tanakh' },
  { key: 'talmud', label: '📚 Talmud' },
  { key: 'midrash', label: '✨ Midrash' }
];

// =============================================================================
// HEBREW DIALECTS
// =============================================================================

export const HEBREW_DIALECTS = [
  { key: 'modern', label: 'Modern', icon: '🇮🇱' },
  { key: 'sephardi', label: 'Sephardi', icon: '🌴' },
  { key: 'ashkenazi', label: 'Ashkenazi', icon: '❄️' }
];

// =============================================================================
// SRS RATINGS
// =============================================================================

export const SRS_RATINGS = [
  { q: 0, icon: '?', tip: 'Forgot' },
  { q: 1, icon: '✗', tip: 'Wrong' },
  { q: 2, icon: '~', tip: 'Hard' },
  { q: 3, icon: '✓', tip: 'OK' },
  { q: 4, icon: '✓✓', tip: 'Easy' },
  { q: 5, icon: '⭐', tip: 'Perfect' }
];

// =============================================================================
// CROSS-REFS CACHE
// =============================================================================

const _crossRefsCache = new Map();
const CROSS_REFS_CACHE_TTL = 10 * 60 * 1000;
const CROSS_REFS_CACHE_MAX = 100;
const CROSS_REFS_CLEANUP_INTERVAL = 5 * 60 * 1000;

export const getCachedCrossRefs = (key) => {
  const cached = _crossRefsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CROSS_REFS_CACHE_TTL) {
    return cached.data;
  }
  _crossRefsCache.delete(key);
  return null;
};

export const setCachedCrossRefs = (key, data) => {
  if (_crossRefsCache.size >= CROSS_REFS_CACHE_MAX) {
    cleanupExpiredCrossRefs();
    if (_crossRefsCache.size >= CROSS_REFS_CACHE_MAX) {
      const oldestKey = _crossRefsCache.keys().next().value;
      _crossRefsCache.delete(oldestKey);
    }
  }
  _crossRefsCache.set(key, { data, timestamp: Date.now() });
};

const cleanupExpiredCrossRefs = () => {
  const now = Date.now();
  for (const [key, entry] of _crossRefsCache.entries()) {
    if (now - entry.timestamp >= CROSS_REFS_CACHE_TTL) {
      _crossRefsCache.delete(key);
    }
  }
};

if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCrossRefs, CROSS_REFS_CLEANUP_INTERVAL);
}

// =============================================================================
// HELPERS
// =============================================================================

export { getSourceInfo, RELIABILITY_TIERS };
