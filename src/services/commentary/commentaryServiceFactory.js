// Commentary Service Factory — FAÇADE (split 03/10/2026)
// Agrège le cœur et les familles (factory/factoryCore, factoryRashi…) et
// ré-exporte TOUS les noms historiques : aucun importeur à modifier.
import { COMMENTARY_CONFIGS, caches, getBookType } from './factory/factoryCore';
import { createErrorResponse } from '../../utils/commentaryUtils';
import {
  getRashiAvailability, getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach,
  getRashi, getRashiForVerse, getRashiForChapter, clearRashiCache
} from './factory/factoryRashi';
import {
  getRambanForChapter, isRambanAvailable, getRambanOnTorah, getRambanForVerse,
  getRambanIntroduction, clearRambanCache, getBooksWithRamban
} from './factory/factoryRamban';
import {
  isTosafotAvailable, getTosafotOnTalmud, getTosafotForDaf, clearTosafotCache,
  getTractatesWithTosafot,
  isMaharshaAvailable, getMaharshaHalachot, getMaharshaAggadot, getMaharshaForDaf,
  clearMaharshaCache, getTractatesWithMaharsha
} from './factory/factoryTosafotMaharsha';
import {
  isIbnEzraAvailable, getIbnEzra, getIbnEzraForVerse, clearIbnEzraCache, getIbnEzraForChapter,
  isOhrHachaimAvailable, getOhrHachaim, getOhrHachaimForVerse, clearOhrHachaimCache,
  isSfornoAvailable, getSforno, getSfornoForVerse, clearSfornoCache, getSfornoForChapter,
  isRadakAvailable, getRadak, getRadakForVerse, clearRadakCache,
  isKliYakarAvailable, getKliYakar, getKliYakarForVerse, clearKliYakarCache,
  isRabbeinuBahyaAvailable, getRabbeinuBahya, getRabbeinuBahyaForVerse, clearRabbeinuBahyaCache,
  isAbarbanelAvailable, getAbarbanel, getAbarbanelForVerse, clearAbarbanelCache,
  ibnEzraService, ohrHachaimService, sfornoService, radakService, kliYakarService,
  rabbeinuBahyaService, abarbanelService
} from './factory/factorySephardi';

export {
  getRashiAvailability, getRashiOnTorah, getRashiOnTalmud, getRashiOnTanach, getRashi,
  getRashiForVerse, getRashiForChapter, clearRashiCache,
  getRambanForChapter, isRambanAvailable, getRambanOnTorah, getRambanForVerse,
  getRambanIntroduction, clearRambanCache, getBooksWithRamban,
  isTosafotAvailable, getTosafotOnTalmud, getTosafotForDaf, clearTosafotCache,
  getTractatesWithTosafot,
  isMaharshaAvailable, getMaharshaHalachot, getMaharshaAggadot, getMaharshaForDaf,
  clearMaharshaCache, getTractatesWithMaharsha,
  isIbnEzraAvailable, getIbnEzra, getIbnEzraForVerse, clearIbnEzraCache, getIbnEzraForChapter,
  isOhrHachaimAvailable, getOhrHachaim, getOhrHachaimForVerse, clearOhrHachaimCache,
  isSfornoAvailable, getSforno, getSfornoForVerse, clearSfornoCache, getSfornoForChapter,
  isRadakAvailable, getRadak, getRadakForVerse, clearRadakCache,
  isKliYakarAvailable, getKliYakar, getKliYakarForVerse, clearKliYakarCache,
  isRabbeinuBahyaAvailable, getRabbeinuBahya, getRabbeinuBahyaForVerse, clearRabbeinuBahyaCache,
  isAbarbanelAvailable, getAbarbanel, getAbarbanelForVerse, clearAbarbanelCache,
  ibnEzraService, ohrHachaimService, sfornoService, radakService, kliYakarService,
  rabbeinuBahyaService, abarbanelService
};

// ============================================================================
// UNIFIED SERVICE OBJECTS (backwards compatible)
// ============================================================================

export const rashiService = {
  getRashiAvailability,
  getRashiOnTorah,
  getRashiOnTalmud,
  getRashiOnTanach,
  getRashi,
  getRashiForVerse,
  getRashiForChapter,  // Batch loading
  clearRashiCache
};

export const rambanService = {
  isRambanAvailable,
  getRambanOnTorah,
  getRambanForVerse,
  getRambanForChapter,  // Batch loading
  getRambanIntroduction,
  clearRambanCache,
  getBooksWithRamban
};

export const tosafotService = {
  isTosafotAvailable,
  getTosafotOnTalmud,
  getTosafotForDaf,
  clearTosafotCache,
  getTractatesWithTosafot
};

export const maharshaService = {
  isMaharshaAvailable,
  getMaharshaHalachot,
  getMaharshaAggadot,
  getMaharshaForDaf,
  clearMaharshaCache,
  getTractatesWithMaharsha
};

// ============================================================================
// GENERIC API (for new code)
// ============================================================================

/**
 * Get commentary for any text type (auto-detect)
 * Supports all commentators including Sephardi mefarshim
 * @param {string} commentaryType - Commentary identifier (rashi, ibn_ezra, ohr_hachaim, etc.)
 * @param {string} bookName - Book or tractate name
 * @param {number|string} chapter - Chapter number or daf
 * @param {number|null} verse - Verse number (optional)
 */
export const getCommentary = async (commentaryType, bookName, chapter, verse = null) => {
  const bookType = getBookType(bookName);
  const normalizedType = commentaryType.toLowerCase().replace(/[- ]/g, '_');

  switch (normalizedType) {
    // Core commentators
    case 'rashi':
      return getRashi(bookName, chapter, verse);
    case 'ramban':
      return getRambanOnTorah(bookName, chapter, verse);
    case 'tosafot':
      if (bookType === 'talmud') return getTosafotOnTalmud(bookName, chapter);
      return createErrorResponse('Tosafot is only available for Talmud');
    case 'maharsha':
      if (bookType === 'talmud') return getMaharshaForDaf(bookName, chapter);
      return createErrorResponse('Maharsha is only available for Talmud');
    // Sephardi commentators
    case 'ibn_ezra':
    case 'ibnezra':
      return getIbnEzra(bookName, chapter, verse);
    case 'ohr_hachaim':
    case 'ohrhachaim':
    case 'or_hachaim':
      return getOhrHachaim(bookName, chapter, verse);
    case 'sforno':
      return getSforno(bookName, chapter, verse);
    case 'radak':
      return getRadak(bookName, chapter, verse);
    case 'kli_yakar':
    case 'kliyakar':
      return getKliYakar(bookName, chapter, verse);
    case 'rabbeinu_bahya':
    case 'rabbeinubahya':
    case 'bahya':
      return getRabbeinuBahya(bookName, chapter, verse);
    case 'abarbanel':
      return getAbarbanel(bookName, chapter, verse);
    default:
      return createErrorResponse(`Unknown commentary type: ${commentaryType}`);
  }
};

/**
 * Check if commentary is available for a book
 */
export const checkCommentaryAvailability = (commentaryType, bookName) => {
  const normalizedType = commentaryType.toLowerCase().replace(/[- ]/g, '_');

  switch (normalizedType) {
    // Core commentators
    case 'rashi':
      return getRashiAvailability(bookName) !== null;
    case 'ramban':
      return isRambanAvailable(bookName);
    case 'tosafot':
      return isTosafotAvailable(bookName);
    case 'maharsha':
      return isMaharshaAvailable(bookName);
    // Sephardi commentators
    case 'ibn_ezra':
    case 'ibnezra':
      return isIbnEzraAvailable(bookName);
    case 'ohr_hachaim':
    case 'ohrhachaim':
    case 'or_hachaim':
      return isOhrHachaimAvailable(bookName);
    case 'sforno':
      return isSfornoAvailable(bookName);
    case 'radak':
      return isRadakAvailable(bookName);
    case 'kli_yakar':
    case 'kliyakar':
      return isKliYakarAvailable(bookName);
    case 'rabbeinu_bahya':
    case 'rabbeinubahya':
    case 'bahya':
      return isRabbeinuBahyaAvailable(bookName);
    case 'abarbanel':
      return isAbarbanelAvailable(bookName);
    default:
      return false;
  }
};

/**
 * Get all available commentators for a given book
 */
export const getAvailableCommentators = (bookName) => {
  const all = Object.entries(COMMENTARY_CONFIGS);
  return all.filter(([key, config]) => {
    const bookType = getBookType(bookName);
    if (bookType === 'torah' && config.supportsTorah) return true;
    if (bookType === 'talmud' && config.supportsTalmud) return true;
    if ((bookType === 'neviim' || bookType === 'ketuvim') && config.supportsTanach) return true;
    return false;
  }).map(([key, config]) => ({
    id: key,
    name: config.name,
    nameHebrew: config.nameHebrew,
    tradition: config.tradition || 'universal',
    era: config.era || 'unknown',
    methodology: config.methodology || null
  }));
};

/**
 * Get commentators by tradition (sephardi, ashkenazi, universal)
 */
export const getCommentatorsByTradition = (tradition) => {
  return Object.entries(COMMENTARY_CONFIGS)
    .filter(([_, config]) => config.tradition === tradition || tradition === 'all')
    .map(([key, config]) => ({
      id: key,
      name: config.name,
      nameHebrew: config.nameHebrew,
      tradition: config.tradition,
      era: config.era,
      supportsTorah: config.supportsTorah,
      supportsTalmud: config.supportsTalmud,
      supportsTanach: config.supportsTanach
    }));
};

/**
 * Clear all commentary caches
 */
export const clearAllCommentaryCaches = () => {
  Object.values(caches).forEach(cache => cache.clear());
};

const commentaryServiceFactory = {
  // Generic API
  getCommentary,
  checkCommentaryAvailability,
  getAvailableCommentators,
  getCommentatorsByTradition,
  clearAllCommentaryCaches,
  // Core services
  rashiService,
  rambanService,
  tosafotService,
  maharshaService,
  // Sephardi services
  ibnEzraService,
  ohrHachaimService,
  sfornoService,
  radakService,
  kliYakarService,
  rabbeinuBahyaService,
  abarbanelService,
  // Configuration
  COMMENTARY_CONFIGS
};

export default commentaryServiceFactory;

// Also export COMMENTARY_CONFIGS for components that need metadata
export { COMMENTARY_CONFIGS };
