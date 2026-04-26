/**
 * Nexus Klíma - Service Worker
 * Caching strategy for improved performance
 */

const CACHE_NAME = 'nexus-klima-v1';
/* Paths relative to this script (works at site root or in a subdirectory). */
const STATIC_ASSETS = [
  'index.html',
  'css/style.css',
  'css/qualifier-compat.css',
  'js/main.js',
  'assets/images/logo.png',
  'assets/images/Hero_secion.jpg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('Cache install failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Skip PHP files (dynamic content)
  if (event.request.url.endsWith('.php')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached version or fetch from network
      if (cached) {
        // Fetch in background to update cache
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {
          // Network failed, but we have cached version
        });
        return cached;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-success responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone response for caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Both cache and network failed
      // Could return offline fallback here
      return new Response('Offline - no cached version available');
    })
  );
});
