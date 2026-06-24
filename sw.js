const CACHE_VERSION = '8';
const CACHE_NAME = 'today-coloring-shell-v' + CACHE_VERSION;
const APP_PAGES = [
  './',
  './index.html',
  './single.html'
];
const APP_ASSETS = [
  './manifest.webmanifest',
  './assets/icons/app-icon.png',
  './assets/icons/app-icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './css/styles.css',
  './css/foundation/base.css',
  './css/screens/artworks/base.css',
  './css/screens/coloring/base.css',
  './css/components/guide-navigation.css',
  './css/screens/guide/modal.css',
  './css/responsive/mobile-shell.css',
  './css/screens/artworks/showcase.css',
  './css/components/canvas-feedback.css',
  './css/screens/artworks/cards.css',
  './css/screens/completion/reward.css',
  './css/screens/single/base.css',
  './css/theme/premium-book.css',
  './css/screens/lobby/landing.css',
  './js/vendor/react.production.min.js',
  './js/vendor/react-dom.production.min.js',
  './js/data/artworks.js',
  './js/data/palette.js',
  './js/utils/storage.js',
  './js/utils/paint.js',
  './js/utils/assets.js',
  './js/utils/save-image.js',
  './js/ui/components.js',
  './js/app.js',
  './js/data/modes.js',
  './js/single-app.js'
];

function withCacheVersion(url) {
  return url + (url.indexOf('?') === -1 ? '?v=' : '&v=') + CACHE_VERSION;
}

const APP_SHELL = APP_PAGES.concat(APP_ASSETS.map(withCacheVersion));

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
    const fallbackPage = requestUrl.pathname.endsWith('/single.html') ? './single.html' : './index.html';
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(fallbackPage);
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
