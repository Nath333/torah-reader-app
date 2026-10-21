// =============================================================================
// Helpers de résultat — createEmptyResult (structure vide canonique)
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================


/**
 * Create empty result for invalid words
 */
export const createEmptyResult = (word, cleanedWord = null) => ({
  word,
  cleanedWord,
  english: null,
  french: null,
  source: 'none',
  sources: [],
  isLoading: false,
  scholarly: {
    hasMultipleSources: false,
    hasAcademicSource: false,
    consensusLevel: 'none'
  }
});
