// Maharsha Service - Re-exports from consolidated commentary factory
// Maintains backwards compatibility with existing imports

export {
  isMaharshaAvailable,
  getMaharshaHalachot,
  getMaharshaAggadot,
  getMaharshaForDaf,
  clearMaharshaCache,
  getTractatesWithMaharsha,
  maharshaService as default
} from './commentaryServiceFactory';
