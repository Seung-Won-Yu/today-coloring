const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadAppHooks(options = {}) {
  const testHooks = {};
  const windowStub = {
      __COLORING_TEST_HOOKS__: testHooks,
      AppStorage: {},
      PaintEngine: {
        hexToRgb: () => ({ r: 0, g: 0, b: 0 }),
        isProgressMarked: () => false,
        isPaintableBasePixel: () => false,
        isLinePixelColor: () => false,
        buildLineLayerImageData: () => null,
        createFillLayerImageData: () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) }),
        paintFillLayerSeed: () => null,
        composePaintLayers: () => null,
        analyzePaintRegions: () => [],
        findNearestUnpaintedStart: () => null,
        findNearestPaintedStart: () => null,
        markProgressRegion: () => null,
        createSafeArtworkCanvas: () => null,
        normalizeFillForFrame: (fill) => fill
      },
      AssetLoader: {
        loadArtworkBitmap: () => Promise.resolve(null),
        preloadArtworkBitmaps: () => null
      },
      UIComponents: {
        Icon: () => null,
        BigButton: () => null,
        isLight: () => false,
        Palette: () => null,
        useOrientation: () => "portrait",
        Confetti: () => null
      },
      SaveImage: {
        getArtworkFileName: () => "today-coloring.png",
        postImageToNativeBridge: () => false,
        triggerBrowserDownload: () => null
      },
      ARTWORKS: [],
      ALL_ARTWORKS: [],
      CATEGORIES: [],
      performance: { now: () => 0 },
      navigator: {},
      screen: {},
      setTimeout,
      clearTimeout,
      addEventListener: () => null,
      removeEventListener: () => null
  };
  if (options.matchMedia !== false) {
    windowStub.matchMedia = () => ({ matches: false });
  }
  const context = {
    window: windowStub,
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useRef: (value) => ({ current: value || null }),
      useState: (value) => [typeof value === "function" ? value() : value, () => null],
      useEffect: () => null,
      useCallback: (fn) => fn
    },
    ReactDOM: {
      createRoot: () => ({ render: () => null })
    },
    document: {
      getElementById: () => ({}),
      documentElement: {}
    },
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Uint8ClampedArray
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/app.js"), "utf8"), context);
  return testHooks;
}

function run() {
  const hooks = loadAppHooks();
  assert.strictEqual(typeof hooks.buildShowcaseFills, "function");
  assert.strictEqual(typeof hooks.isAppDisplayMode, "function");
  assert.strictEqual(typeof hooks.getRegionAnalysisCacheKey, "function");
  assert.strictEqual(typeof hooks.rememberRegionAnalysis, "function");
  assert.strictEqual(typeof hooks.getCachedRegionAnalysis, "function");
  assert.strictEqual(typeof hooks.getRegionAnalysisCacheLimit, "function");
  assert.strictEqual(typeof hooks.getRegionAnalysisCacheSize, "function");
  assert.strictEqual(typeof hooks.getFinishedThumbCacheKey, "function");
  assert.strictEqual(typeof hooks.rememberFinishedThumbFills, "function");
  assert.strictEqual(typeof hooks.getCachedFinishedThumbFills, "function");
  assert.strictEqual(typeof hooks.getFinishedThumbCacheLimit, "function");
  assert.strictEqual(typeof hooks.getFinishedThumbCacheSize, "function");

  const fills = hooks.buildShowcaseFills([
    { x: 44, y: 52, size: 24, isBackground: true },
    { x: 180, y: 120, size: 32, isBackground: false }
  ], 8);

  assert.strictEqual(fills.length, 2);
  assert(fills.every((fill) => fill.v === 2), "showcase fills should be stored as frame-space seeds");
  assert.strictEqual(fills[0].x, 44);
  assert.strictEqual(fills[0].y, 52);

  const firstVersionKey = hooks.getRegionAnalysisCacheKey({ id: "vertical-40", version: "20", src: "art.webp?v=20" }, "preview", 320, 420);
  const nextVersionKey = hooks.getRegionAnalysisCacheKey({ id: "vertical-40", version: "21", src: "art.webp?v=21" }, "preview", 320, 420);
  assert.notStrictEqual(firstVersionKey, nextVersionKey, "region cache keys should include artwork version changes");

  const regions = [{ x: 8, y: 12, size: 20, isBackground: false }];
  hooks.rememberRegionAnalysis(firstVersionKey, regions);
  regions[0].x = 99;
  const cachedRegions = hooks.getCachedRegionAnalysis(firstVersionKey);
  assert.strictEqual(cachedRegions[0].x, 8, "cached region data should not retain caller object references");
  cachedRegions[0].x = 42;
  assert.strictEqual(hooks.getCachedRegionAnalysis(firstVersionKey)[0].x, 8, "region cache reads should return defensive copies");

  const regionCacheHooks = loadAppHooks();
  const regionCacheLimit = regionCacheHooks.getRegionAnalysisCacheLimit();
  assert(regionCacheLimit > 0, "region analysis cache should have a positive limit");
  for (let idx = 0; idx <= regionCacheLimit; idx += 1) {
    regionCacheHooks.rememberRegionAnalysis(`region-${idx}`, [{ x: idx, y: idx + 1, size: 20, isBackground: false }]);
  }
  assert.strictEqual(regionCacheHooks.getRegionAnalysisCacheSize(), regionCacheLimit, "region analysis cache should stay within its limit");
  assert.strictEqual(regionCacheHooks.getCachedRegionAnalysis("region-0"), null, "region analysis cache should evict the oldest entry first");
  assert.strictEqual(regionCacheHooks.getCachedRegionAnalysis(`region-${regionCacheLimit}`)[0].x, regionCacheLimit, "region analysis cache should keep the newest entry");

  const firstThumbKey = hooks.getFinishedThumbCacheKey({ id: "vertical-40", version: "20", src: "art.webp?v=20" }, 80);
  const nextThumbKey = hooks.getFinishedThumbCacheKey({ id: "vertical-40", version: "21", src: "art.webp?v=21" }, 80);
  assert.notStrictEqual(firstThumbKey, nextThumbKey, "finished thumbnail cache keys should include artwork version changes");

  const thumbFills = [{ x: 1, y: 2, color: "#ABCDEF", v: 2 }];
  hooks.rememberFinishedThumbFills(firstThumbKey, thumbFills);
  thumbFills[0].x = 9;
  const cachedThumbFills = hooks.getCachedFinishedThumbFills(firstThumbKey);
  assert.strictEqual(cachedThumbFills[0].x, 1, "finished thumbnail cache should not retain caller fill references");
  cachedThumbFills[0].x = 7;
  assert.strictEqual(hooks.getCachedFinishedThumbFills(firstThumbKey)[0].x, 1, "finished thumbnail cache reads should return defensive copies");

  const cacheLimitHooks = loadAppHooks();
  const thumbCacheLimit = cacheLimitHooks.getFinishedThumbCacheLimit();
  assert(thumbCacheLimit >= 40, "finished thumbnail cache should fit the current artwork set");
  for (let idx = 0; idx <= thumbCacheLimit; idx += 1) {
    cacheLimitHooks.rememberFinishedThumbFills(`thumb-${idx}`, [{ x: idx, y: idx + 1, color: "#ABCDEF", v: 2 }]);
  }
  assert.strictEqual(cacheLimitHooks.getFinishedThumbCacheSize(), thumbCacheLimit, "finished thumbnail cache should stay within its limit");
  assert.strictEqual(cacheLimitHooks.getCachedFinishedThumbFills("thumb-0"), null, "finished thumbnail cache should evict the oldest entry first");
  assert.strictEqual(cacheLimitHooks.getCachedFinishedThumbFills(`thumb-${thumbCacheLimit}`)[0].x, thumbCacheLimit, "finished thumbnail cache should keep the newest entry");

  const noMatchMediaHooks = loadAppHooks({ matchMedia: false });
  assert.strictEqual(noMatchMediaHooks.isAppDisplayMode(), false);

  console.log("app-showcase-fills.test.js passed");
}

run();
