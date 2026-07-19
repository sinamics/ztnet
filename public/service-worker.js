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
        Promise.all(
          keys
            // Only remove THIS worker's caches: older versions (ztnet-pwa-*) and
            // the legacy pre-fix name. Leaves any unrelated caches untouched.
            .filter(
              (k) =>
                k !== CACHE_NAME &&
                (k.startsWith('ztnet-pwa-') || k === 'my-nextjs-pwa-cache')
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ONLY ever intercept our own precached static assets. Everything else —
  // navigations (e.g. "/" -> "/network"), API calls, Next.js data, redirects —
  // is left entirely to the browser, so the SW can never turn a request into a
  // network error ("Failed to fetch" / "redirected response ... not follow").
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!urlsToCache.includes(url.pathname)) return;

  // Cache-first within THIS worker's own cache only.
  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.match(req))
      .then((cached) => cached || fetch(req))
  );
});
