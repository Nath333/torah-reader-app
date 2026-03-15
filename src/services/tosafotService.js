// Tosafot Service - Re-exports from consolidated commentary factory
// Maintains backwards compatibility with existing imports

export {
  isTosafotAvailable,
  getTosafotOnTalmud,
  getTosafotForDaf,
  clearTosafotCache,
  getTractatesWithTosafot,
  tosafotService as default
} from './commentaryServiceFactory';
