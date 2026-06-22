const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadArtworks() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/data/artworks.js"), "utf8"), context);
  return context.window.ARTWORKS;
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
  const artworks = loadArtworks();
  assert.strictEqual(artworks.length, 40, "the app should expose 40 coloring artworks");

  const seenIds = new Set();
  artworks.forEach((art) => {
    assert(/^vertical-\d{2}$/.test(art.id), `${art.id} should use the vertical-00 id format`);
    assert(!seenIds.has(art.id), `${art.id} should be unique`);
    seenIds.add(art.id);

    assert.strictEqual(typeof art.title, "string", `${art.id} should have a title`);
    assert(art.title.length > 0, `${art.id} title should not be empty`);
    assert.strictEqual(String(art.version), "20", `${art.id} should carry the current artwork save version`);
    assert.strictEqual(art.isCanvas, true, `${art.id} should be marked as a canvas artwork`);
    assert.strictEqual(art.layout, "portrait", `${art.id} should keep the portrait layout contract`);
    assert(art.src.includes("?v=20"), `${art.id} artwork src should be cache-busted with the artwork version`);
    assert(art.thumbSrc.includes("?v=20"), `${art.id} thumb src should be cache-busted with the artwork version`);
    assert(stripQuery(art.src).endsWith(".webp"), `${art.id} artwork should use WebP`);
    assert(stripQuery(art.thumbSrc).endsWith(".webp"), `${art.id} thumbnail should use WebP`);
    assertFileExists(stripQuery(art.src));
    assertFileExists(stripQuery(art.thumbSrc));
  });

  assertNoLegacyPngs("assets/images/artworks");
  assertNoLegacyPngs("assets/images/thumbs");

  console.log("artwork-assets.test.js passed");
}

run();
