// =============================================================================
// CommentaryTab.constants — FAÇADE (split 23/10)
// Données, analyse, cache/persistance et styles du module Commentary.
// Modules sous ./CommentaryTab/ : env, cache, commentators, analysis, styles.
// Surface publique intégralement conservée.
// =============================================================================

export { log, SEFARIA_BASE } from './CommentaryTab/env';
export { cacheText, clearCommentaryCache, textCache, getLearnedCommentaries, setLearnedCommentary, getStudyNotes, saveStudyNote } from './CommentaryTab/cache';
export { COMMENTATOR_INFO, COMMENTATORS, APPROACH_COLORS, STUDY_PATH } from './CommentaryTab/commentators';
export {
  detectCrossReferences, extractKeySummary, fetchLinks, fetchText,
  extractDiburHaMatchil, generateStudyQuestions, categorizeLinks
} from './CommentaryTab/analysis';
export { COLORS, styles, spinnerKeyframes } from './CommentaryTab/styles';
