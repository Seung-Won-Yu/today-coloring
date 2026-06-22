const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadServiceWorker(fetchImpl) {
  const listeners = {};
  const cachePuts = [];
  const context = {
    URL,
    Promise,
    fetch: fetchImpl,
    caches: {
      match() {
        return Promise.resolve(null);
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
  return { listeners, cachePuts };
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
  assert.strictEqual(okWorker.cachePuts.length, 1, "successful network responses should be cached");

  console.log("service-worker-fetch.test.js passed");
}

run();
