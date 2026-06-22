const CACHE_NAME = 'today-coloring-shell-v174';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest?v=5',
  './assets/icons/app-icon.png',
  './assets/icons/app-icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './css/styles.css?v=152',
  './css/foundation/base.css?v=2',
  './css/screens/artworks/base.css',
  './css/screens/coloring/base.css',
  './css/components/guide-navigation.css',
  './css/screens/guide/modal.css',
  './css/responsive/mobile-shell.css',
  './css/screens/artworks/showcase.css',
  './css/components/canvas-feedback.css',
  './css/screens/artworks/cards.css',
  './css/screens/completion/reward.css',
  './css/theme/premium-book.css?v=12',
  './css/screens/lobby/landing.css?v=1',
  './js/vendor/react.production.min.js',
  './js/vendor/react-dom.production.min.js',
  './js/data/artworks.js?v=35',
  './js/data/palette.js?v=2',
  './js/utils/storage.js?v=26',
  './js/utils/paint.js?v=35',
  './js/utils/assets.js?v=17',
  './js/utils/save-image.js?v=1',
  './js/ui/components.js?v=16',
  './js/app.js?v=89'
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

function isArtworkAssetRequest(requestUrl) {
  return (
    requestUrl.pathname.indexOf('/assets/images/artworks/') !== -1 ||
    requestUrl.pathname.indexOf('/assets/images/thumbs/') !== -1 ||
    requestUrl.pathname.indexOf('/assets/regionmaps/') !== -1 ||
    requestUrl.pathname.indexOf('/assets/linelayers/') !== -1
  );
}

function fetchAndCache(request) {
  return fetch(request).then(function(networkResponse) {
    if (!networkResponse || !networkResponse.ok) return networkResponse;
    var responseCopy = networkResponse.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(request, responseCopy);
    });
    return networkResponse;
  });
}

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

  if (isArtworkAssetRequest(requestUrl)) {
    event.respondWith(
      fetchAndCache(event.request).catch(function(error) {
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) return cachedResponse;
          throw error;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) return cachedResponse;

      return fetchAndCache(event.request);
    })
  );
});
