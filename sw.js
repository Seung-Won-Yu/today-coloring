const CACHE_NAME = 'today-coloring-shell-v120';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest?v=4',
  './assets/icons/app-icon.png',
  './assets/icons/app-icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './css/styles.css?v=140',
  './js/vendor/react.production.min.js',
  './js/vendor/react-dom.production.min.js',
  './js/data/artworks.js?v=30',
  './js/data/palette.js?v=2',
  './js/utils/storage.js?v=15',
  './js/utils/paint.js?v=26',
  './js/utils/assets.js?v=14',
  './js/ui/components.js?v=14',
  './js/app.js?v=63'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(function(networkResponse) {
        var responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseCopy);
        });
        return networkResponse;
      });
    })
  );
});
