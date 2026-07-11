const CACHE_NAME = 'my-nextjs-pwa-cache';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/ztnet_300x300.png'
  // Add other static assets to cache
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache each asset individually so one missing/failed request doesn't
      // reject the whole precache (which surfaces as an uncaught addAll error).
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
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});