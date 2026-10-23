// =============================================================================
// Cache de textes (LRU 100 entrées) + clés localStorage + helpers de
// persistance (commentaires appris, notes d'étude).
// (extrait de CommentaryTab.constants.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { safeGet, safeSet } from '../../../utils/safeLocalStorage';

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

