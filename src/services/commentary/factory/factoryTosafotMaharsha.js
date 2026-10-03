// Tosafot & Maharsha — familles Talmud (split 03/10/2026)
import { TALMUD_BAVLI } from '../../../constants/bookConstants';
import { caches, fetchTalmudCommentary } from './factoryCore';

// ============================================================================
// TOSAFOT EXPORTS (backwards compatible)
// ============================================================================

export const isTosafotAvailable = (tractate) => TALMUD_BAVLI.includes(tractate);

export const getTosafotOnTalmud = (tractate, daf) => {
  return fetchTalmudCommentary('tosafot', tractate, daf);
};

export const getTosafotForDaf = async (tractate, daf) => {
  const result = await getTosafotOnTalmud(tractate, daf);
  return result.comments || [];
};

export const clearTosafotCache = () => caches.tosafot.clear();

export const getTractatesWithTosafot = () => [...TALMUD_BAVLI];

// ============================================================================
// MAHARSHA EXPORTS (backwards compatible)
// ============================================================================

export const isMaharshaAvailable = (tractate) => TALMUD_BAVLI.includes(tractate);

export const getMaharshaHalachot = (tractate, daf) => {
  return fetchTalmudCommentary('maharshaHalachot', tractate, daf, { type: 'halachot' });
};

export const getMaharshaAggadot = (tractate, daf) => {
  return fetchTalmudCommentary('maharshaAggadot', tractate, daf, { type: 'aggadot' });
};

export const getMaharshaForDaf = async (tractate, daf) => {
  const [halachot, aggadot] = await Promise.all([
    getMaharshaHalachot(tractate, daf),
    getMaharshaAggadot(tractate, daf)
  ]);

  return {
    source: 'Maharsha',
    sourceHebrew: 'מהרש״א',
    halachot: halachot.comments || [],
    aggadot: aggadot.comments || [],
    comments: [...(halachot.comments || []), ...(aggadot.comments || [])]
  };
};

export const clearMaharshaCache = () => {
  caches.maharshaHalachot.clear();
  caches.maharshaAggadot.clear();
};

export const getTractatesWithMaharsha = () => [...TALMUD_BAVLI];