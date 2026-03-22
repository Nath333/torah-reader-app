/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'sefarim-reader-v1';
const API_CACHE_NAME = 'sefarim-api-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// API domains to cache
const API_DOMAINS = ['sefaria.org'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Domains to skip - don't intercept third-party APIs
const SKIP_DOMAINS = [
  'translate.googleapis.com',  // Google Translate (French translation)
  'fonts.gstatic.com',
  'fonts.googleapis.com'
];

// Local ports to skip (local services like Ollama)
const SKIP_LOCAL_PORTS = ['11434'];

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Parse URL safely
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return; // Invalid URL - skip
  }

  // Skip third-party APIs - don't intercept at all
  // This prevents the "FetchEvent resulted in a network error" messages
  if (SKIP_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) {
    return; // Let browser handle normally
  }

  // Skip local services (like Ollama on port 11434)
  if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      SKIP_LOCAL_PORTS.includes(url.port)) {
    return; // Let browser handle normally
  }

  // Skip cross-origin requests that aren't from our allowed domains
  const isOwnOrigin = url.origin === self.location.origin;
  const isApiRequest = API_DOMAINS.some(domain => url.hostname.includes(domain));

  if (!isOwnOrigin && !isApiRequest) {
    return; // Don't intercept third-party requests
  }

  if (isApiRequest) {
    // Network first, fallback to cache for API requests
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Clone and cache the response
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Offline - try to serve from cache
            return cache.match(request);
          });
      })
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          event.waitUntil(
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {})
          );
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(request).then((response) => {
          // Cache the response for future use
          if (response.ok && !url.pathname.includes('hot-update')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
