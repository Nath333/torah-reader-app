// Rashi Service - Re-exports from consolidated commentary factory
// Maintains backwards compatibility with existing imports

export {
  getRashiAvailability,
  getRashiOnTorah,
  getRashiOnTalmud,
  getRashiOnTanach,
  getRashi,
  getRashiForVerse,
  clearRashiCache,
  rashiService as default
} from './commentaryServiceFactory';
