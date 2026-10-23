// =============================================================================
// Métadonnées des commentateurs (dérivées du registre central) + parcours
// d'étude recommandé.
// (extrait de CommentaryTab.constants.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  COMMENTATORS as REGISTRY_COMMENTATORS,
  ERAS,
  COMMENTATOR_CATEGORIES
} from '../../../constants/commentatorRegistry';

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

