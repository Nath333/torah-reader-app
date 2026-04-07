// Commentary Services
export { default as rashiService } from './rashiService';
export { default as tosafotService } from './tosafotService';
export { default as soncinoService } from './soncinoService';
export { default as commentaryServiceFactory } from './commentaryServiceFactory';

// Commentary Factory
export {
  getCommentary,
  checkCommentaryAvailability,
  clearAllCommentaryCaches
} from './commentaryServiceFactory';

// Tosafot
export {
  getTosafotOnTalmud,
  getTosafotForDaf,
  isTosafotAvailable
} from './tosafotService';

// Soncino
export {
  getSoncinoTractate,
  getSoncinoFootnotesForTractate,
  getRashiFootnotesForTractate,
  getAvailableTractates,
  isTractateAvailable,
  hasHtmlAvailable,
  isPdfOnly,
  getSoncinoShabbat,
  getSoncinoFootnotes,
  getRashiFootnotes,
  getSoncinoShabbatPages,
  clearSoncinoCache
} from './soncinoService';
