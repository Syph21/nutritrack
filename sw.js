/* NutriTrack Offline - service worker */
const CACHE_NAME = 'nutritrack-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './sb.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // cache same-origin + cdn assets opportunistically
        try {
          const url = new URL(req.url);
          if (res.ok && (url.origin === self.location.origin || url.hostname.includes('cdn') || url.hostname.includes('fonts'))) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
        } catch (e) {}
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
