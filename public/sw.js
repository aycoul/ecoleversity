// EcoleVersity Service Worker — Skeleton
// Will be expanded for offline caching in future phases

const CACHE_NAME = 'ecoleversity-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through for now — caching strategy added later
  event.respondWith(fetch(event.request));
});
