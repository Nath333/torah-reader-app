/**
 * Service Worker Registration Utilities
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register the service worker
 */
export const register = (config = {}) => {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`;

      if (isLocalhost) {
        // In localhost, check if service worker exists
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('[App] Service worker is ready for offline use');
        });
      } else {
        // In production, register directly
        registerValidSW(swUrl, config);
      }
    });
  }
};

/**
 * Register a valid service worker
 */
const registerValidSW = (swUrl, config) => {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              console.log('[App] New content available; please refresh.');
              if (config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              console.log('[App] Content is cached for offline use.');
              if (config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[App] Error during service worker registration:', error);
    });
};

/**
 * Check if service worker exists and is valid
 */
const checkValidServiceWorker = (swUrl, config) => {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType && !contentType.includes('javascript'))
      ) {
        // No service worker found - unregister
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found - register
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[App] No internet connection. Running in offline mode.');
    });
};

/**
 * Unregister the service worker
 */
export const unregister = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
};

// =============================================================================
// Pré-cache du kit dictionnaire hors-ligne
// =============================================================================
// Le SW met en cache les lexiques AU FIL des consultations ; ce pré-cache
// télécharge en arrière-plan le kit tier-1 (BDB + Jastrow + Strong's) pour
// que l'offline soit complet dès le premier voyage, sans avoir cliqué sur
// chaque mot. Une fois par semaine, jamais en connexion limitée.

const PRECACHE_FLAG = 'limud_precache_data_at';
const PRECACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

const connexionAcceptable = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return true; // pas d'info : on tente (la plupart des desktops)
  if (conn.saveData) return false; // l'utilisateur a activé l'économiseur
  const t = (conn.effectiveType || '').toLowerCase();
  return t !== '2g' && t !== 'slow-2g';
};

export const precacheData = async (urls) => {
  if (!('serviceWorker' in navigator)) {
    return false; // pas de SW : le cache-on-demand du SW prendra le relais
  }
  try {
    const last = Number(localStorage.getItem(PRECACHE_FLAG) || 0);
    if (Date.now() - last < PRECACHE_TTL) return false; // déjà fait cette semaine
    if (!connexionAcceptable()) return false;
  } catch {
    return false;
  }

  // ⚠ Au premier chargement après (ré)installation, `controller` est encore
  // null : le SW ne contrôle la page qu'après activation + clients.claim.
  // `ready` résout exactement ça — sans lui, le pré-cache ne part jamais
  // et ne retente jamais (constaté en prod, 05/10).
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller || registration.active || registration.waiting;
  if (!worker) return false;

  worker.postMessage({ type: 'PRECACHE_DATA', urls });
  try {
    localStorage.setItem(PRECACHE_FLAG, String(Date.now()));
  } catch {
    /* peu importe : on retentera */
  }
  return true;
};

const serviceWorkerUtils = { register, unregister, precacheData };
export default serviceWorkerUtils;
