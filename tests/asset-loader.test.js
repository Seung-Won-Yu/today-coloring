const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadAssetLoader() {
  const testHooks = {};
  const createdImages = [];

  class FakeImage {
    constructor() {
      this.decoding = "";
      this.onload = null;
      this.onerror = null;
      this._src = "";
      createdImages.push(this);
    }

    set src(value) {
      this._src = value;
    }

    get src() {
      return this._src;
    }
  }

  const context = {
    window: {
      __COLORING_TEST_HOOKS__: testHooks,
      setTimeout,
      requestIdleCallback: (callback) => {
        callback();
        return 1;
      }
    },
    Image: FakeImage,
    Promise,
    console,
    setTimeout,
    clearTimeout
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/utils/assets.js"), "utf8"), context);
  return { AssetLoader: context.window.AssetLoader, createdImages, testHooks };
}

async function resolveImageLoad(promise, image) {
  assert.strictEqual(typeof image.onload, "function", "fake image should receive an onload handler");
  image.onload();
  return promise;
}

async function run() {
  const { AssetLoader, createdImages, testHooks } = loadAssetLoader();
  assert.strictEqual(typeof AssetLoader.loadArtworkBitmap, "function");
  assert.strictEqual(typeof AssetLoader.preloadArtworkBitmaps, "function");
  assert.strictEqual(typeof testHooks.getArtworkImageCacheLimit, "function");
  assert.strictEqual(typeof testHooks.getArtworkImageCacheSize, "function");
  assert.strictEqual(typeof testHooks.hasArtworkImageCacheEntry, "function");

  const firstLoad = AssetLoader.loadArtworkBitmap("shared.webp");
  const secondLoad = AssetLoader.loadArtworkBitmap("shared.webp");
  assert.strictEqual(createdImages.length, 1, "duplicate in-flight image loads should share one Image instance");
  const image = await resolveImageLoad(firstLoad, createdImages[0]);
  assert.strictEqual(await secondLoad, image, "duplicate in-flight image loads should resolve to the same image");
  assert.strictEqual(testHooks.getArtworkImageCacheSize(), 1);

  const limited = loadAssetLoader();
  const limit = limited.testHooks.getArtworkImageCacheLimit();
  assert(limit >= 40, "artwork image cache should fit the current artwork set");
  for (let idx = 0; idx <= limit; idx += 1) {
    const promise = limited.AssetLoader.loadArtworkBitmap(`artwork-${idx}.webp`);
    await resolveImageLoad(promise, limited.createdImages[idx]);
  }
  assert.strictEqual(limited.testHooks.getArtworkImageCacheSize(), limit, "artwork image cache should stay within its limit");
  assert.strictEqual(limited.testHooks.hasArtworkImageCacheEntry("artwork-0.webp"), false, "artwork image cache should evict the oldest entry first");
  assert.strictEqual(limited.testHooks.hasArtworkImageCacheEntry(`artwork-${limit}.webp`), true, "artwork image cache should keep the newest entry");

  console.log("asset-loader.test.js passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
