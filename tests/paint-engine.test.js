const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadPaintEngine() {
  const context = {
    window: {},
    console,
    Uint8ClampedArray,
    Int32Array,
    Uint8Array
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/utils/paint.js"), "utf8"), context);
  return context.window.PaintEngine;
}

function createImageData(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const pixel = pixels[i] || [255, 255, 255, 255];
    data[i * 4] = pixel[0];
    data[i * 4 + 1] = pixel[1];
    data[i * 4 + 2] = pixel[2];
    data[i * 4 + 3] = pixel[3];
  }
  return { width, height, data };
}

function pixelAt(imageData, x, y) {
  const idx = (y * imageData.width + x) * 4;
  return Array.from(imageData.data.slice(idx, idx + 4));
}

function run() {
  const PaintEngine = loadPaintEngine();
  const fillColor = { r: 36, g: 126, b: 238 };

  const blueSky = [142, 210, 239, 255];
  const base = createImageData(5, 3, [
    [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], blueSky,
    [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], blueSky,
    [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], blueSky
  ]);

  assert.strictEqual(PaintEngine.isPaintableBasePixel(base.data, 0), true);
  assert.strictEqual(PaintEngine.isPaintableBasePixel(base.data, 4), false);
  assert.strictEqual(PaintEngine.isPaintableBasePixel(base.data, 8), false);
  assert.strictEqual(PaintEngine.isPaintableBasePixel(base.data, 16), false);
  assert.strictEqual(PaintEngine.isLinePixelColor(blueSky[0], blueSky[1], blueSky[2], blueSky[3]), false);
  assert.strictEqual(PaintEngine.isLinePixelColor(24, 24, 24, 255), true);

  const fillLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const result = PaintEngine.paintFillLayerSeed(fillLayer, base.data, { x: 0, y: 1 }, fillColor);
  assert(result);
  assert.deepStrictEqual(pixelAt(fillLayer, 0, 1), [36, 126, 238, 255]);
  assert.deepStrictEqual(pixelAt(fillLayer, 1, 1), [36, 126, 238, 255]);
  assert.deepStrictEqual(pixelAt(fillLayer, 2, 1), [0, 0, 0, 0]);
  assert.deepStrictEqual(pixelAt(fillLayer, 3, 1), [0, 0, 0, 0]);
  assert.deepStrictEqual(pixelAt(fillLayer, 4, 1), [0, 0, 0, 0]);

  const lineLayer = PaintEngine.buildLineLayerImageData(base);
  const composed = PaintEngine.composePaintLayers(base, fillLayer, lineLayer);
  const fringePixel = pixelAt(composed, 1, 1);
  const linePixel = pixelAt(composed, 2, 1);
  const backgroundPixel = pixelAt(composed, 4, 1);
  assert(fringePixel[2] < fillColor.b, "anti-aliased fringe should darken filled color under the line layer");
  assert(fringePixel[2] > 0, "anti-aliased fringe should keep visible fill color instead of white halo");
  assert(linePixel[0] < 40 && linePixel[1] < 40 && linePixel[2] < 40, "hard line should stay dark");
  assert.deepStrictEqual(backgroundPixel, blueSky, "colored artwork backgrounds should stay in color");

  console.log("paint-engine.test.js passed");
}

run();
