// Extrait de unifiedLookupService.js (recette docs/DECOUPE-MONOLITHES.md).
// État partagé des lookups (cache géré, dédup, variants) — un seul endroit,
// importé par la façade ; les modules d'étage n'y touchent qu'ici.
import { createManagedCache } from '../cacheOrchestrator';

export const lookupCache = createManagedCache('unifiedLookup', {
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 2000
});

export const pendingLookups = new Map(); // Deduplication
export const _variantCache = new Map();
export const MAX_VARIANT_CACHE = 500;
