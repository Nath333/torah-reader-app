// Données de FocusMode extraites (recette docs/DECOUPE-MONOLITHES.md).
// NB : MEFORSHIM filtre sur COMMENTATORS — même source que la façade.

import { COMMENTATORS, ERAS } from '../../../constants/commentatorRegistry';
export const THEMES = {
  dark: { name: 'Dark', icon: '🌙' },
  light: { name: 'Light', icon: '☀️' },
  sepia: { name: 'Sepia', icon: '📜' },
  parchment: { name: 'Klaf', icon: '📖' },
  midnight: { name: 'Midnight', icon: '🌌' }
};

// Auto-scroll speed options (in seconds)
const SCROLL_SPEEDS = [3, 5, 8, 12, 20];

// Focus view modes (different from Talmud STUDY_MODES in talmudStudy.js)
export const FOCUS_VIEW_MODES = {
  single: { name: 'Single Verse', icon: '1️⃣' },
  context: { name: 'With Context', icon: '📖' },
  learning: { name: 'Learning Mode', icon: '🎓' }
};

// Meforshim (Commentators) - derived from central registry
export const MEFORSHIM = Object.fromEntries(
  ['rashi', 'onkelos', 'ramban', 'ibn_ezra', 'sforno', 'rashbam', 'ohr_hachaim']
    .filter(key => COMMENTATORS[key])
    .map(key => {
      const c = COMMENTATORS[key];
      const era = ERAS[c.era];
      return [key, {
        name: c.hebrew,
        fullName: c.full,
        era: `${era?.name || c.era} (${c.dates})`,
        style: c.method,
        description: `${c.method} commentary`
      }];
    })
);
