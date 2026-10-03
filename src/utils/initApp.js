/**
 * Application Initialization
 * Runs once at app startup before rendering
 */

/**
 * Aucune clé API via variables d'environnement : une REACT_APP_* est inlinée
 * en clair dans le bundle public. La clé Groq provient uniquement de la saisie
 * utilisateur (Réglages → API), stockée via safeStorage (voir services/groqApi.js).
 */
export const initializeApp = () => {};

// =============================================================================
// Auto-réparation « chunk parti »
// =============================================================================
// Après un déploiement, un onglet resté ouvert (ou un cache SW périmé) peut
// demander un chunk qui n'existe plus côté serveur (404) : React lazy lève un
// ChunkLoadError et l'ErrorBoundary affiche « Something went wrong » — sans
// qu'aucun bouton ne répare le cache. On purge service worker + caches puis on
// recharge UNE fois (garde sessionStorage contre les boucles de rechargement).
const CHUNK_FAILURE = /ChunkLoadError|Loading (chunk|CSS chunk)|dynamically imported module|error loading dynamically|Failed to fetch dynamically/i;
const HEAL_FLAG = 'sefarim:chunk-heal';

const purgeAndReload = () => {
  try {
    if (sessionStorage.getItem(HEAL_FLAG)) return; // déjà tenté cette session
    sessionStorage.setItem(HEAL_FLAG, String(Date.now()));
  } catch {
    // sessionStorage indisponible : on tente quand même, sans garde
  }
  const reload = () => window.location.reload();
  if (navigator.serviceWorker?.getRegistrations) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {})
      .finally(() => {
        if (window.caches?.keys) {
          window.caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
            .catch(() => {})
            .finally(reload);
        } else {
          reload();
        }
      });
  } else {
    reload();
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const signature = `${event?.error?.name || ''} ${event?.message || ''}`;
    if (CHUNK_FAILURE.test(signature)) purgeAndReload();
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const signature = `${reason?.name || ''} ${reason?.message || reason || ''}`;
    if (CHUNK_FAILURE.test(signature)) purgeAndReload();
  });
}
