// Rashi Service - Re-exports from consolidated commentary factory
// Maintains backwards compatibility with existing imports

export {
  getRashiAvailability,
  getRashiOnTorah,
  getRashiOnTalmud,
  getRashiOnTanach,
  getRashi,
  getRashiForVerse,
  getRashiForChapter,
  clearRashiCache,
  rashiService as default
} from './commentaryServiceFactory';
