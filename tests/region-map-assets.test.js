const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadArtworkData() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/data/artworks.js"), "utf8"), context);
  return context.window;
}

function stripQuery(src) {
  return src.split("?")[0];
}

function readPngSize(relativePath) {
  const buffer = fs.readFileSync(path.join(rootDir, relativePath));
  assert.strictEqual(buffer.toString("ascii", 1, 4), "PNG", `${relativePath} should be a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function run() {
  const artworkData = loadArtworkData();
  const artworks = artworkData.ARTWORKS;
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "assets/regionmaps/paint/manifest.json"), "utf8"));
  const manifestById = new Map(manifest.maps.map((entry) => [entry.id, entry]));

  assert.strictEqual(manifest.mode, "paint", "region map manifest should describe paint-frame maps");
  assert.strictEqual(manifest.maps.length, artworks.length, "every artwork should have a paint region map");

  artworks.forEach((art) => {
    assert.strictEqual(typeof art.regionMapSrc, "string", `${art.id} should expose a region map source`);
    assert.strictEqual(typeof art.lineLayerSrc, "string", `${art.id} should expose a line layer source`);
    assert(art.regionMapSrc.includes("?v=" + artworkData.ARTWORK_VERSION), `${art.id} region map should use the artwork asset version`);
    assert(art.lineLayerSrc.includes("?v=" + artworkData.ARTWORK_VERSION), `${art.id} line layer should use the artwork asset version`);
    assert(stripQuery(art.regionMapSrc).endsWith(".png"), `${art.id} region map should be a PNG label map`);
    assert(stripQuery(art.lineLayerSrc).endsWith(".png"), `${art.id} line layer should be a PNG alpha overlay`);
    assert(fs.existsSync(path.join(rootDir, stripQuery(art.regionMapSrc))), `${art.id} region map file should exist`);
    assert(fs.existsSync(path.join(rootDir, stripQuery(art.lineLayerSrc))), `${art.id} line layer file should exist`);

    const manifestEntry = manifestById.get(art.id);
    assert(manifestEntry, `${art.id} should be listed in the region map manifest`);
    const size = readPngSize(stripQuery(art.regionMapSrc));
    const lineLayerSize = readPngSize(stripQuery(art.lineLayerSrc));
    assert.strictEqual(size.width, manifestEntry.width, `${art.id} manifest width should match PNG`);
    assert.strictEqual(size.height, manifestEntry.height, `${art.id} manifest height should match PNG`);
    assert.strictEqual(lineLayerSize.width, manifestEntry.width, `${art.id} line layer width should match manifest`);
    assert.strictEqual(lineLayerSize.height, manifestEntry.height, `${art.id} line layer height should match manifest`);
    assert.strictEqual(manifestEntry.lineLayerFile, path.basename(stripQuery(art.lineLayerSrc)), `${art.id} manifest should list the line layer file`);
    assert(manifestEntry.regions > 0, `${art.id} should have at least one paint region`);
    assert(manifestEntry.paintablePixels > 0, `${art.id} should have paintable pixels`);
  });

  console.log("region-map-assets.test.js passed");
}

run();
