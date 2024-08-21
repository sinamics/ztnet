const CACHE_NAME = 'my-nextjs-pwa-cache';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.png'
  // Add other static assets to cache
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});