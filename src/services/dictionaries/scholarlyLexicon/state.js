// =============================================================================
// État partagé du lexique savant — caches module-level
// (recette docs/DECOUPE-MONOLITHES.md : les services à état exigent un module
// state.js partagé ; extrait de scholarlyLexiconService.js)
// =============================================================================

import { createManagedCache } from '../../cacheOrchestrator';

export const _lookupCache = new Map();
export const CACHE_TTL = 60000; // 1 minute
export const CACHE_MAX = 200;

// Cache for scholarly lookups (longer TTL for academic data)
// Use CacheOrchestrator for unified telemetry
export const scholarlyCache = createManagedCache('scholarly', { ttl: 48 * 60 * 60 * 1000, maxSize: 1000 }); // 48 hours

// =============================================================================
// CACHE VERSIONING - Automatically invalidates old cached results
// =============================================================================
// In DEVELOPMENT: Auto-renews on every npm start (fresh lookups for testing)
// In PRODUCTION: Uses manual version (increment when logic changes)
//
// Version History:
// v7: Stronger prefix penalty (0.8), higher threshold (0.6), stricter matching
// v6: Pure algorithmic matching - LCS + edit distance + prefix penalty, no hardcoded rules
// v5: EXTRA strict Klein validation - explicit headword length check at result building
// v4: STRICT validation - reject entries without headword, extract from content
// v3: Strict trilateral root matching (בר vs ברא), isValidHeadwordMatch
// v2: Added headword filtering
// v1: Initial implementation
// =============================================================================
export const CACHE_VERSION_MANUAL = 'v7';
export const CACHE_VERSION = process.env.NODE_ENV === 'development'
  ? `dev-${Date.now()}` // Auto-renew on every app start in development
  : CACHE_VERSION_MANUAL;
