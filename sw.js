// ─── Barcelona Trip PWA — Service Worker ───
const CACHE_NAME = 'bcn-trip-v1';

// Files to cache on install
const STATIC_ASSETS = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icons/icon-144.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// ── INSTALL: pre-cache everything ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets…');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately — no need to wait for old tabs to close
  self.skipWaiting();
});

// ── ACTIVATE: drop old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  // Take over any existing pages straight away
  event.waitUntil(clients.claim());
});

// ── FETCH: cache-first for local files, network-first for everything else ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin requests (our own pages / assets)
  if (url.origin !== location.origin) {
    // For Google Fonts or other CDN stuff — try network, fall back to cache
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for our own assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      // Not in cache yet — fetch and store it
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        // Clone because a response body can only be consumed once
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
