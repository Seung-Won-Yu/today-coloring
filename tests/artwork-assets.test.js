const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadArtworkData() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/data/artworks.js"), "utf8"), context);
  return {
    ...context.window,
    ARTWORK_META: context.ARTWORK_META,
    createVerticalArtwork: context.createVerticalArtwork
  };
}

function stripQuery(src) {
  return src.split("?")[0];
}

function assertFileExists(relativePath) {
  assert(
    fs.existsSync(path.join(rootDir, relativePath)),
    `${relativePath} should exist`
  );
}

function assertNoLegacyPngs(relativeDir) {
  const entries = fs.readdirSync(path.join(rootDir, relativeDir));
  const pngs = entries.filter((entry) => entry.toLowerCase().endsWith(".png"));
  assert.deepStrictEqual(pngs, [], `${relativeDir} should not contain legacy PNG artwork assets`);
}

function run() {
  const artworkData = loadArtworkData();
  const artworks = artworkData.ARTWORKS;
  const assetVersion = artworkData.ARTWORK_VERSION;
  const saveVersion = artworkData.ARTWORK_SAVE_VERSION;

  assert.strictEqual(typeof assetVersion, "string", "artworks should expose the asset cache version");
  assert(assetVersion.length > 0, "artwork asset cache version should not be empty");
  assert.strictEqual(typeof saveVersion, "string", "artworks should expose the save data version");
  assert(saveVersion.length > 0, "artwork save data version should not be empty");
  assert.strictEqual(artworks.length, 40, "the app should expose 40 coloring artworks");

  artworkData.ARTWORK_META["17"].version = saveVersion + "-17";
  const individuallyVersionedArtwork = artworkData.createVerticalArtwork(17);
  assert.strictEqual(individuallyVersionedArtwork.version, saveVersion + "-17");
  assert(individuallyVersionedArtwork.src.includes("?v=" + individuallyVersionedArtwork.version), "individual artwork versions should bust original image cache");
  assert(individuallyVersionedArtwork.thumbSrc.includes("?v=" + individuallyVersionedArtwork.version), "individual artwork versions should bust thumbnail cache");
  assert(individuallyVersionedArtwork.regionMapSrc.includes("?v=" + individuallyVersionedArtwork.version), "individual artwork versions should bust region map cache");
  assert(individuallyVersionedArtwork.lineLayerSrc.includes("?v=" + individuallyVersionedArtwork.version), "individual artwork versions should bust line layer cache");

  const seenIds = new Set();
  artworks.forEach((art) => {
    assert(/^vertical-\d{2}$/.test(art.id), `${art.id} should use the vertical-00 id format`);
    assert(!seenIds.has(art.id), `${art.id} should be unique`);
    seenIds.add(art.id);

    assert.strictEqual(typeof art.title, "string", `${art.id} should have a title`);
    assert(art.title.length > 0, `${art.id} title should not be empty`);
    assert(String(art.version).length > 0, `${art.id} should carry an artwork save version`);
    assert.strictEqual(art.isCanvas, true, `${art.id} should be marked as a canvas artwork`);
    assert.strictEqual(art.layout, "portrait", `${art.id} should keep the portrait layout contract`);
    assert(art.src.includes("?v=" + assetVersion), `${art.id} artwork src should be cache-busted with the artwork asset version`);
    assert(art.thumbSrc.includes("?v=" + assetVersion), `${art.id} thumb src should be cache-busted with the artwork asset version`);
    assert(art.regionMapSrc.includes("?v=" + assetVersion), `${art.id} region map src should be cache-busted with the artwork asset version`);
    assert(art.lineLayerSrc.includes("?v=" + assetVersion), `${art.id} line layer src should be cache-busted with the artwork asset version`);
    assert(stripQuery(art.src).endsWith(".webp"), `${art.id} artwork should use WebP`);
    assert(stripQuery(art.thumbSrc).endsWith(".webp"), `${art.id} thumbnail should use WebP`);
    assert(stripQuery(art.regionMapSrc).endsWith(".png"), `${art.id} region map should use PNG`);
    assert(stripQuery(art.lineLayerSrc).endsWith(".png"), `${art.id} line layer should use PNG`);
    assertFileExists(stripQuery(art.src));
    assertFileExists(stripQuery(art.thumbSrc));
    assertFileExists(stripQuery(art.regionMapSrc));
    assertFileExists(stripQuery(art.lineLayerSrc));
  });

  assertNoLegacyPngs("assets/images/artworks");
  assertNoLegacyPngs("assets/images/thumbs");

  console.log("artwork-assets.test.js passed");
}

run();
