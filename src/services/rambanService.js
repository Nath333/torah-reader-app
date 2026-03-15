// Ramban Service - Re-exports from consolidated commentary factory
// Maintains backwards compatibility with existing imports

export {
  isRambanAvailable,
  getRambanOnTorah,
  getRambanForVerse,
  getRambanIntroduction,
  clearRambanCache,
  getBooksWithRamban,
  rambanService as default
} from './commentaryServiceFactory';
