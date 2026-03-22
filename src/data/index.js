/**
 * Data Index - Dictionaries, lexicons, and reference data
 * Usage: import { lookupJastrow, RABBIS, ROOT_MEANINGS } from './data';
 */

// =============================================================================
// DATA CATALOG - Quick reference
// =============================================================================
/**
 * LEXICONS & DICTIONARIES
 * ├── jastrowComplete    - Full Jastrow dictionary (async lazy-loaded)
 * ├── jastrowAramaic     - Aramaic subset (sync)
 * ├── bdbComplete        - Brown-Driver-Briggs (async lazy-loaded)
 * ├── strongsComplete    - Strong's Hebrew (async lazy-loaded)
 * ├── calAramaic         - CAL Aramaic database (sync)
 * └── hebrewLexicons     - Combined BDB/Klein/Jastrow/Strong
 *
 * REFERENCE DATA
 * ├── rabbiBiographies   - Talmudic & Medieval scholars
 * ├── realia             - Measures, currencies, objects
 * └── rootDatabase       - Hebrew root meanings & semantic fields
 */

// =============================================================================
// Jastrow Dictionary (Async - Lazy Loaded)
// =============================================================================
export { default as jastrowComplete } from './jastrowComplete';
export {
  JASTROW_COMPLETE,
  lookupJastrow,
  searchJastrow,
  getAramaicEntries,
  getJastrowStats,
  isJastrowLoaded,
  preloadJastrow
} from './jastrowComplete';

// =============================================================================
// Jastrow Aramaic Subset (Sync)
// =============================================================================
export { default as jastrowAramaic } from './jastrowAramaic';
export {
  JASTROW_ARAMAIC,
  lookupJastrowLocal
} from './jastrowAramaic';

// =============================================================================
// BDB - Brown-Driver-Briggs (Async - Lazy Loaded)
// =============================================================================
export { default as bdbComplete } from './bdbComplete';
export {
  BDB_BY_WORD,
  BDB_BY_STRONGS,
  lookupBDBByWord,
  lookupBDBByStrongs,
  searchBDB,
  getBDBStats,
  lookupBDBSync,
  isBDBLoaded,
  preloadBDB
} from './bdbComplete';

// =============================================================================
// Strong's Hebrew Concordance (Async - Lazy Loaded)
// =============================================================================
export { default as strongsComplete } from './strongsComplete';
export {
  STRONGS_BY_WORD,
  STRONGS_BY_NUMBER,
  lookupStrongsByWord,
  lookupStrongsByNumber,
  searchStrongs,
  getStrongsStats,
  isStrongsLoaded,
  preloadStrongs
} from './strongsComplete';

// =============================================================================
// CAL Aramaic Database (Sync)
// =============================================================================
export { default as calAramaic } from './calAramaic';
export {
  CAL_ARAMAIC,
  lookupCAL,
  getByDialect,
  searchCAL
} from './calAramaic';

// =============================================================================
// Combined Hebrew Lexicons (BDB, Klein, Jastrow, Strong)
// =============================================================================
export {
  BDB_LEXICON,
  BDB_ARAMAIC,
  KLEIN_LEXICON,
  JASTROW_LEXICON,
  STRONG_LEXICON,
  lookupAllLexicons,
  lookupBDB,
  lookupKlein,
  lookupJastrowLocal as lookupJastrowSync,
  lookupStrong,
  getLexiconStats
} from './hebrewLexicons';

// =============================================================================
// Rabbi Biographies
// =============================================================================
export { default as rabbiBiographies } from './rabbiBiographies';
export {
  RABBIS,
  findRabbi,
  getAllRabbiNames,
  createRabbiMatcher
} from './rabbiBiographies';

// =============================================================================
// Realia - Measures, Currencies, Objects
// =============================================================================
export { default as realia } from './realia';
export {
  MEASURES,
  findMeasure,
  getAllMeasureNames,
  getMeasuresByCategory
} from './realia';

// =============================================================================
// Root Database - Hebrew roots with semantic fields
// =============================================================================
export { default as rootDatabase } from './rootDatabase';
export {
  ROOT_MEANINGS,
  SEMANTIC_FIELDS,
  getRootInfo,
  searchRootsByMeaning,
  getRootsBySemanticField,
  getRelatedRoots,
  getCognates,
  getFrequency,
  isPeNunVerb,
  getRootsByCognateLanguage,
  getRootDatabaseStats
} from './rootDatabase';
