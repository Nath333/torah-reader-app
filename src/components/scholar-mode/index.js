/**
 * Scholar-mode barrel — uniquement les exports consommés (ScholarModePanel).
 * Recréé après la purge 6324225 qui avait supprimé l'ancien index avec le
 * code mort : les composants listés ici sont tous vivants et importés.
 */

// Utility components
export { LoadingState } from './LoadingStates';
export { default as TabButton } from './TabButton';

// Core tab components
export { default as AIAnalysisTab } from './AIAnalysisTab';      // LEARN tab
export { default as WordsTab } from './WordsTab';                 // WORDS tab
export { default as CommentaryTab } from './CommentaryTab';      // COMMENTARY tab
export { default as NotebookTab } from './NotebookTab';          // NOTEBOOK tab
export { default as TalmudToolsTab } from './TalmudToolsTab';    // TALMUD tab
export { default as TzuratHaDafTab } from './TzuratHaDafTab';    // TZURAT HADAF tab
export { default as ChavrutaTab } from './ChavrutaTab';          // CHAVRUTA tab
