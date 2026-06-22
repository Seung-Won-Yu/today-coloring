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

function setRect(imageData, minX, minY, maxX, maxY, color) {
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * imageData.width + x) * 4;
      imageData.data[idx] = color[0];
      imageData.data[idx + 1] = color[1];
      imageData.data[idx + 2] = color[2];
      imageData.data[idx + 3] = color[3];
    }
  }
}

function run() {
  const PaintEngine = loadPaintEngine();
  const fillColor = { r: 36, g: 126, b: 238 };

  const longHex = PaintEngine.hexToRgb("#AABBCC");
  assert.strictEqual(longHex.r, 170);
  assert.strictEqual(longHex.g, 187);
  assert.strictEqual(longHex.b, 204);

  const shortHex = PaintEngine.hexToRgb("#abc");
  assert.strictEqual(shortHex.r, 170);
  assert.strictEqual(shortHex.g, 187);
  assert.strictEqual(shortHex.b, 204);

  const invalidHex = PaintEngine.hexToRgb("not-a-color");
  assert.strictEqual(invalidHex.r, 0);
  assert.strictEqual(invalidHex.g, 0);
  assert.strictEqual(invalidHex.b, 0);

  const malformedHex = PaintEngine.hexToRgb("#12345z");
  assert.strictEqual(malformedHex.r, 0);
  assert.strictEqual(malformedHex.g, 0);
  assert.strictEqual(malformedHex.b, 0);

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

  const invalidSeedLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const invalidSeedResult = PaintEngine.paintFillLayerSeed(invalidSeedLayer, base.data, { x: NaN, y: 1 }, fillColor);
  assert.strictEqual(invalidSeedResult, null);
  assert.deepStrictEqual(pixelAt(invalidSeedLayer, 0, 0), [0, 0, 0, 0]);

  const invalidDirectLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const invalidDirectResult = PaintEngine.doFloodFill(invalidDirectLayer, NaN, 1, fillColor);
  assert.strictEqual(invalidDirectResult, null);
  assert.deepStrictEqual(pixelAt(invalidDirectLayer, 0, 0), [0, 0, 0, 0]);

  const missingLayerResult = PaintEngine.doFloodFill(null, 0, 0, fillColor);
  assert.strictEqual(missingLayerResult, null);

  const missingColorLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const missingColorResult = PaintEngine.doFloodFill(missingColorLayer, 0, 1, null);
  assert.strictEqual(missingColorResult, null);
  assert.deepStrictEqual(pixelAt(missingColorLayer, 0, 1), [0, 0, 0, 0]);

  const invalidColorLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const invalidColorResult = PaintEngine.doFloodFill(invalidColorLayer, 0, 1, { r: 36, g: NaN, b: 238 });
  assert.strictEqual(invalidColorResult, null);
  assert.deepStrictEqual(pixelAt(invalidColorLayer, 0, 1), [0, 0, 0, 0]);

  const missingSeedLayer = PaintEngine.createFillLayerImageData(base.width, base.height);
  const missingSeedResult = PaintEngine.paintFillLayerSeed(missingSeedLayer, base.data, null, fillColor);
  assert.strictEqual(missingSeedResult, null);
  assert.deepStrictEqual(pixelAt(missingSeedLayer, 0, 0), [0, 0, 0, 0]);

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

  const regionBase = createImageData(96, 96, Array(96 * 96).fill([24, 24, 24, 255]));
  setRect(regionBase, 40, 40, 56, 56, [255, 255, 255, 255]);
  const regions = PaintEngine.analyzePaintRegions(regionBase, regionBase.width, regionBase.height);
  assert(regions.length > 0, "center paint island should be discovered");
  assert(regions.every((region) => !region.isBackground), "center paint island should not be classified as background");
  assert(regions.some((region) => region.size > 5), "center paint island should be large enough for showcase fills");

  const regionMapBase = createImageData(7, 3, [
    [255, 255, 255, 255], [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], [255, 255, 255, 255], blueSky,
    [255, 255, 255, 255], [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], [255, 255, 255, 255], blueSky,
    [255, 255, 255, 255], [255, 255, 255, 255], [168, 168, 168, 255], [24, 24, 24, 255], [168, 168, 168, 255], [255, 255, 255, 255], blueSky
  ]);
  const regionMap = PaintEngine.buildPaintRegionMap(regionMapBase);
  assert.strictEqual(regionMap.width, 7);
  assert.strictEqual(regionMap.height, 3);
  assert.strictEqual(PaintEngine.getPaintRegionLabel(regionMap, 0, 1), PaintEngine.getPaintRegionLabel(regionMap, 2, 1), "soft line fringe should belong to the fillable region");
  assert.notStrictEqual(PaintEngine.getPaintRegionLabel(regionMap, 0, 1), PaintEngine.getPaintRegionLabel(regionMap, 5, 1), "hard line should split fillable regions");
  assert.strictEqual(PaintEngine.getPaintRegionLabel(regionMap, 3, 1), 0, "hard line core should not receive a region label");
  assert.strictEqual(PaintEngine.getPaintRegionLabel(regionMap, 6, 1), 0, "colored background should not receive a paint region");

  const mappedFillLayer = PaintEngine.createFillLayerImageData(regionMapBase.width, regionMapBase.height);
  const mappedBounds = PaintEngine.paintRegionMapSeed(mappedFillLayer, regionMap, { x: 0, y: 1 }, fillColor);
  assert(mappedBounds);
  assert.deepStrictEqual(pixelAt(mappedFillLayer, 0, 1), [36, 126, 238, 255]);
  assert.deepStrictEqual(pixelAt(mappedFillLayer, 2, 1), [36, 126, 238, 255]);
  assert.deepStrictEqual(pixelAt(mappedFillLayer, 3, 1), [0, 0, 0, 0]);
  assert.deepStrictEqual(pixelAt(mappedFillLayer, 5, 1), [0, 0, 0, 0]);

  const mappedProgress = { data: new Uint8ClampedArray(regionMapBase.data), width: regionMapBase.width, height: regionMapBase.height };
  const mappedProgressBounds = PaintEngine.markProgressRegionMap(mappedProgress, regionMap, 0, 1);
  assert(mappedProgressBounds);
  assert.strictEqual(PaintEngine.isProgressMarked(mappedProgress.data, (1 * regionMapBase.width + 0) * 4), true);
  assert.strictEqual(PaintEngine.isProgressMarked(mappedProgress.data, (1 * regionMapBase.width + 5) * 4), false);

  const mappedSeeds = PaintEngine.getPaintRegionMapSeeds(regionMap);
  assert(mappedSeeds.some((seed) => seed.x === 0 && seed.y === 0 && seed.size >= 6), "region map should expose showcase-compatible seeds");

  console.log("paint-engine.test.js passed");
}

run();
