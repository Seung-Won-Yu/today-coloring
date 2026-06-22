const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadServiceWorker(fetchImpl, options = {}) {
  const listeners = {};
  const cachePuts = [];
  const cacheMatches = [];
  const context = {
    URL,
    Promise,
    fetch: fetchImpl,
    caches: {
      match(request) {
        cacheMatches.push(request);
        return Promise.resolve(options.cachedResponse || null);
      },
      open() {
        return Promise.resolve({
          addAll() {
            return Promise.resolve();
          },
          put(request, response) {
            cachePuts.push({ request, response });
            return Promise.resolve();
          }
        });
      },
      keys() {
        return Promise.resolve([]);
      },
      delete() {
        return Promise.resolve(true);
      }
    },
    self: {
      location: { origin: "https://example.test" },
      skipWaiting() {},
      clients: {
        claim() {
          return Promise.resolve();
        }
      },
      addEventListener(type, handler) {
        listeners[type] = handler;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "sw.js"), "utf8"), context);
  return { listeners, cachePuts, cacheMatches };
}

function createResponse(status) {
  return {
    ok: status >= 200 && status < 300,
    status,
    clone() {
      return { ok: this.ok, status: this.status, cloned: true };
    }
  };
}

async function dispatchFetch(fetchHandler, request) {
  let responsePromise = null;
  fetchHandler({
    request,
    respondWith(promise) {
      responsePromise = promise;
    }
  });
  assert(responsePromise, "fetch handler should call respondWith for same-origin GET requests");
  return responsePromise;
}

async function run() {
  const failed = createResponse(404);
  const failedWorker = loadServiceWorker(() => Promise.resolve(failed));
  const failedResponse = await dispatchFetch(failedWorker.listeners.fetch, {
    method: "GET",
    mode: "cors",
    url: "https://example.test/missing.png"
  });
  await Promise.resolve();
  assert.strictEqual(failedResponse, failed);
  assert.strictEqual(failedWorker.cacheMatches.length, 1, "non-artwork requests should check cache before network");
  assert.strictEqual(failedWorker.cachePuts.length, 0, "failed network responses should not be cached");

  const ok = createResponse(200);
  const okWorker = loadServiceWorker(() => Promise.resolve(ok));
  const okResponse = await dispatchFetch(okWorker.listeners.fetch, {
    method: "GET",
    mode: "cors",
    url: "https://example.test/assets/icons/app-icon.png"
  });
  await Promise.resolve();
  assert.strictEqual(okResponse, ok);
  assert.strictEqual(okWorker.cacheMatches.length, 1, "non-artwork requests should keep cache-first behavior");
  assert.strictEqual(okWorker.cachePuts.length, 1, "successful network responses should be cached");

  const staleArtwork = createResponse(200);
  const freshArtwork = createResponse(200);
  const artworkWorker = loadServiceWorker(() => Promise.resolve(freshArtwork), { cachedResponse: staleArtwork });
  const artworkResponse = await dispatchFetch(artworkWorker.listeners.fetch, {
    method: "GET",
    mode: "cors",
    url: "https://example.test/assets/images/artworks/vertical-15.webp?v=20"
  });
  await Promise.resolve();
  assert.strictEqual(artworkResponse, freshArtwork, "artwork images should prefer the network over stale cache entries");
  assert.strictEqual(artworkWorker.cacheMatches.length, 0, "artwork images should skip cache lookup when network succeeds");
  assert.strictEqual(artworkWorker.cachePuts.length, 1, "fresh artwork image responses should refresh the cache");

  const cachedArtwork = createResponse(200);
  const offlineArtworkWorker = loadServiceWorker(() => Promise.reject(new Error("offline")), {
    cachedResponse: cachedArtwork
  });
  const offlineArtworkResponse = await dispatchFetch(offlineArtworkWorker.listeners.fetch, {
    method: "GET",
    mode: "cors",
    url: "https://example.test/assets/images/thumbs/vertical-15.webp?v=20"
  });
  assert.strictEqual(offlineArtworkResponse, cachedArtwork, "artwork images should fall back to cache when offline");
  assert.strictEqual(offlineArtworkWorker.cacheMatches.length, 1, "offline artwork requests should check cache once");

  const freshRegionMap = createResponse(200);
  const regionMapWorker = loadServiceWorker(() => Promise.resolve(freshRegionMap), { cachedResponse: staleArtwork });
  const regionMapResponse = await dispatchFetch(regionMapWorker.listeners.fetch, {
    method: "GET",
    mode: "cors",
    url: "https://example.test/assets/regionmaps/paint/vertical-15.png?v=22"
  });
  await Promise.resolve();
  assert.strictEqual(regionMapResponse, freshRegionMap, "region maps should prefer the network over stale cache entries");
  assert.strictEqual(regionMapWorker.cacheMatches.length, 0, "region maps should skip cache lookup when network succeeds");

  console.log("service-worker-fetch.test.js passed");
}

run();
