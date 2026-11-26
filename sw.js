const CACHE_NAME = 'kaizenreply-v4.2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/styles.css',
  '/static/app.js',
  '/static/theme-init.js',
  '/static/assets/kaizen-hero.jpg',
  '/static/assets/kaizen-desk.jpg',
  '/static/assets/kaizen-quote.jpg',
  '/static/logo-icon.png',
  '/static/logo-inkwash.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/icon-maskable-512.png',
  '/static/banner.png',
  '/static/linkedin-meme-template.jpg',
  '/static/data/kotowaza.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Robust caching: add individually so a single network/cache failure never aborts install
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Pre-cache failed for ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only handle our own origin; let fonts/CDNs use normal browser caching
  if (url.origin !== self.location.origin) return;

  // Never cache backend API routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    return;
  }

  // Network-first strategy for navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || fetchPromise;
    })
  );
});
