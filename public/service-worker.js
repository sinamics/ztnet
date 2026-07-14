// Minimal service worker: exists so the app stays installable as a PWA
// (manifest.json + a registered SW with a fetch handler), while staying out of
// the way of navigations so it can never cache a redirect.
//
// Bump CACHE_NAME whenever this file changes so old caches are cleared.
const CACHE_NAME = 'ztnet-pwa-v2';

// Only cache safe, non-redirecting static assets. NEVER cache "/" — it redirects
// (e.g. to /auth/login), and returning a cached redirect to a navigation throws:
// "a redirected response was used for a request whose redirect mode is not follow".
const urlsToCache = [
  '/manifest.json',
  '/ztnet_300x300.png'
];

self.addEventListener('install', (event) => {
  // Activate this version immediately, replacing any older broken SW.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache each asset individually so one missing/failed request doesn't
      // reject the whole precache.
      Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW precache skipped', url, err);
          })
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle page navigations (and their redirects) directly.
  // This is the key fix for the "redirected response ... not follow" error.
  if (event.request.mode === 'navigate') return;

  // Cache-first only for the safe static assets above; everything else hits network.
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
