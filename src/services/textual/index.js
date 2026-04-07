// Textual Analysis Services
export { default as cantillationService } from './cantillationService';
export { default as masoreticService } from './masoreticService';
export { default as manuscriptVariantsService } from './manuscriptVariantsService';
export { default as talmudicAbbreviationsService } from './talmudicAbbreviationsService';

// Masoretic
export {
  KETIV_QERE_TYPE_LABELS,
  MASORAH_TYPES, MASORAH_TYPE_LABELS,
  getAllTiqquneSoferim, getKetivQere, getKetivQereForChapter,
  getKetivQereStats, getKetivVeloQere,
  getMasoreticNotes, getQereVeloKetiv,
  getTiqqunSoferim, searchKetivQere
} from './masoreticService';

// Manuscript Variants
export {
  MANUSCRIPT_SOURCES, SIGNIFICANCE_LEVELS,
  getAllDSSManuscripts, getDSSManuscript,
  getScholarlyAnalysis, getVariantStatistics,
  getVariantsForChapter, getVariantsForVerse,
  searchVariantsBySource
} from './manuscriptVariantsService';

// Talmudic Abbreviations
export {
  findAbbreviations, expandAbbreviation,
  expandAllAbbreviations, ABBREVIATIONS
} from './talmudicAbbreviationsService';
