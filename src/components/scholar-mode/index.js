/**
 * Scholar-mode barrel — utilitaires toujours nécessaires uniquement.
 *
 * Les onglets (AIAnalysisTab, WordsTab, CommentaryTab, NotebookTab,
 * TalmudToolsTab, TzuratHaDafTab, ChavrutaTab) sont chargés à la demande
 * via React.lazy dans ScholarModePanel : NE PAS les ré-exporter ici, leurs
 * imports CSS (effets de bord) les ramèneraient dans le chunk d'entrée.
 */

export { LoadingState } from './LoadingStates';
export { default as TabButton } from './TabButton';
