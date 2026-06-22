const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadAppHooks() {
  const testHooks = {};
  const context = {
    window: {
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
      matchMedia: () => ({ matches: false }),
      setTimeout,
      clearTimeout,
      addEventListener: () => null,
      removeEventListener: () => null
    },
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

  const fills = hooks.buildShowcaseFills([
    { x: 44, y: 52, size: 24, isBackground: true },
    { x: 180, y: 120, size: 32, isBackground: false }
  ], 8);

  assert.strictEqual(fills.length, 2);
  assert(fills.every((fill) => fill.v === 2), "showcase fills should be stored as frame-space seeds");
  assert.strictEqual(fills[0].x, 44);
  assert.strictEqual(fills[0].y, 52);

  console.log("app-showcase-fills.test.js passed");
}

run();
