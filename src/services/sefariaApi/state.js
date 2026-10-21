// =============================================================================
// État partagé du service Sefaria — BASE_URL + caches CacheOrchestrator
// (extrait de sefariaApi.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createManagedCache } from '../cacheOrchestrator';
import { viaProxy } from '../proxyConfig';

// Use local proxy in development to avoid CORS issues.
// En production, si un serveur d'étude (limud-proxy) est configuré, il sert
// les réponses avec cache ; sinon Sefaria direct. Défini au chargement du
// module : changer le proxy dans les réglages se applique au rechargement.
export const BASE_URL = process.env.NODE_ENV === 'development'
  ? '/sefaria-api'
  : viaProxy('/sefaria/api', 'https://www.sefaria.org/api');

// PRO SCHOLAR V6.2: Create managed cache instances with CacheOrchestrator
export const textCache = createManagedCache('api', { ttl: 10 * 60 * 1000, maxSize: 500 }); // 10 min
export const commentaryCache = createManagedCache('commentary', { ttl: 60 * 60 * 1000, maxSize: 300 }); // 1 hour
