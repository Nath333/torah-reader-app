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

const serviceWorkerUtils = { register, unregister };
export default serviceWorkerUtils;
