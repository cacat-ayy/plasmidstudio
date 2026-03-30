// Cache version - update this when deploying new code.
// Run: md5sum plasmid.js plasmid.css app.html index.html landing.css | md5sum | cut -c1-8
const CACHE_VERSION = '44883d31';
const CACHE_NAME = 'plasmidstudio-' + CACHE_VERSION;
const PRECACHE = [
  '/app.html',
  '/plasmid.js',
  '/plasmid.css',
  '/index.html',
  '/landing.css',
  '/manifest.json',
  '/og-image.png',
  '/fonts/inter-latin.woff2',
  '/fonts/inter-latin-ext.woff2',
  '/offline.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for same-origin requests, cache fallback for offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('/offline.html') : undefined)))
  );
});
