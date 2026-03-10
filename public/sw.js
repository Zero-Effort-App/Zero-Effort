const CACHE_NAME = 'zero-effort-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/zero-effort-logo-white.png',
  '/zero-effort-logo-dark.png',
  '/zero-effort-icon-white.png',
  '/zero-effort-icon-dark.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
