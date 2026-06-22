const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function createLocalStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    key(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
    dump() {
      return { ...store };
    }
  };
}

function loadStorage(initialStorage) {
  const localStorage = createLocalStorage(initialStorage);
  const context = {
    window: {},
    localStorage,
    console
  };
  context.window.localStorage = localStorage;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/data/artworks.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/utils/storage.js"), "utf8"), context);
  return context;
}

function getArtworkSaveVersion() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/data/artworks.js"), "utf8"), context);
  return context.window.ARTWORK_SAVE_VERSION;
}

function getStorageContract() {
  const context = loadStorage({});
  return {
    version: context.window.AppStorage.storageVersion,
    keys: context.window.AppStorage.storageKeys
  };
}

function assertJsonEqual(actual, expected) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

function run() {
  const artworkSaveVersion = getArtworkSaveVersion();
  const storageContract = getStorageContract();
  const storageKeys = storageContract.keys;
  assert.strictEqual(typeof artworkSaveVersion, "string", "artworks should expose the save data version");
  assert(/^v\d+$/.test(storageContract.version), "storage should expose a schema version");
  assert.strictEqual(storageKeys.progress, "sori_progress_" + storageContract.version);
  assert.strictEqual(storageKeys.gallery, "sori_gallery_" + storageContract.version);
  assert.strictEqual(storageKeys.settings, "sori_settings_v1");

  const context = loadStorage({
    [storageKeys.progress]: JSON.stringify({
      "vertical-15": { fills: [{ x: 1, y: 1, color: "#fff" }], artworkVersion: "old" },
      "vertical-17": {
        fills: [{ x: 2, y: 2, color: "#000" }, { x: "bad", y: 4, color: "#123456" }, { x: 4, y: 4, color: "red" }, { x: -1, y: 2, color: "#123456" }, { x: 2.5, y: 2, color: "#123456" }],
        undoHistory: [[{ x: 1, y: 1, color: "#fff" }, { x: 1, y: "bad", color: "#fff" }, { x: 1, y: 1, color: "white" }, { x: -1, y: 1, color: "#fff" }, { x: 1.5, y: 1, color: "#fff" }], "bad-history", []],
        artworkVersion: artworkSaveVersion
      },
      "vertical-40": [{ x: 3, y: 3, color: "#f00" }],
      "vertical-60": [{ x: 4, y: 4, color: "#0f0" }]
    }),
    [storageKeys.gallery]: JSON.stringify([
      { id: "old", artId: "vertical-15", fills: [{ x: 1 }], artworkVersion: "old" },
      { id: "current", artId: "vertical-17", fills: [{ x: 2, y: 2, color: "#000" }, { x: 2, y: 2, color: "blue" }], artworkVersion: artworkSaveVersion },
      { id: "legacy", artId: "vertical-40", fills: [{ x: 3 }] },
      { id: "legacy-stale", artId: "vertical-60", fills: [{ x: 4 }] }
    ]),
    sori_artwork_refresh_v19_14_60: "1"
  });

  const { AppStorage, ARTWORKS } = context.window;
  assert.strictEqual(ARTWORKS[0].version, artworkSaveVersion);

  const progress = AppStorage.loadProgress();
  assert.strictEqual(progress["vertical-15"], undefined);
  assert.strictEqual(progress["vertical-17"].artworkVersion, artworkSaveVersion);
  assertJsonEqual(progress["vertical-17"].fills, [{ x: 2, y: 2, color: "#000000" }]);
  assertJsonEqual(progress["vertical-17"].undoHistory, [[{ x: 1, y: 1, color: "#FFFFFF" }], []]);
  assert.strictEqual(progress["vertical-40"].artworkVersion, artworkSaveVersion);
  assertJsonEqual(progress["vertical-40"].undoHistory, []);
  assert.strictEqual(progress["vertical-60"], undefined);
  assertJsonEqual(AppStorage.getSavedHistory(progress["vertical-17"]), [[{ x: 1, y: 1, color: "#FFFFFF" }], []]);

  const gallery = AppStorage.loadGallery();
  assert.strictEqual(JSON.stringify(gallery.map((item) => item.id)), JSON.stringify(["current", "legacy"]));
  assert(gallery.every((item) => item.artworkVersion === artworkSaveVersion));
  assertJsonEqual(gallery[0].fills, [{ x: 2, y: 2, color: "#000000" }]);

  const newProgress = AppStorage.createProgressEntry("vertical-15", [{ x: 4, y: 4, color: "#abc" }], [
    [{ x: 3, y: 3, color: "#def" }, { x: 3, y: 3, color: "bad" }]
  ]);
  AppStorage.saveProgress({ "vertical-15": newProgress });
  const savedProgress = JSON.parse(context.localStorage.getItem(storageKeys.progress));
  assert.strictEqual(savedProgress["vertical-15"].artworkVersion, artworkSaveVersion);
  assertJsonEqual(savedProgress["vertical-15"].fills, [{ x: 4, y: 4, color: "#AABBCC" }]);
  assertJsonEqual(savedProgress["vertical-15"].undoHistory, [[{ x: 3, y: 3, color: "#DDEEFF" }]]);

  const snapshotDataUrl = "data:image/webp;base64,abc123";
  const newGalleryItem = AppStorage.createGalleryItem({ id: "new", artId: "vertical-15", fills: [], date: 1, snapshotDataUrl });
  const invalidSnapshotItem = AppStorage.createGalleryItem({ id: "bad-snapshot", artId: "vertical-17", fills: [], date: 2, snapshotDataUrl: "not-an-image" });
  AppStorage.saveGallery([newGalleryItem, invalidSnapshotItem]);
  const savedGallery = JSON.parse(context.localStorage.getItem(storageKeys.gallery));
  assert.strictEqual(savedGallery[0].artworkVersion, artworkSaveVersion);
  assert.strictEqual(savedGallery[0].snapshotDataUrl, snapshotDataUrl);
  assert.strictEqual(savedGallery[1].snapshotDataUrl, undefined);

  const perArtworkVersionContext = loadStorage({
    [storageKeys.progress]: JSON.stringify({
      "vertical-40": [{ x: 3, y: 3, color: "#f00" }]
    }),
    [storageKeys.gallery]: JSON.stringify([
      { id: "legacy-per-artwork", artId: "vertical-40", fills: [{ x: 3, y: 3, color: "#f00" }] }
    ])
  });
  perArtworkVersionContext.window.ARTWORKS.find((art) => art.id === "vertical-40").version = artworkSaveVersion + "-40";
  assert.strictEqual(perArtworkVersionContext.window.AppStorage.loadProgress()["vertical-40"], undefined);
  assertJsonEqual(perArtworkVersionContext.window.AppStorage.loadGallery(), []);

  assert.strictEqual(AppStorage.loadSettings().fontScale, 1);
  assert.strictEqual(AppStorage.loadSettings().theme, "따뜻");
  assert.strictEqual(AppStorage.loadSettings().paintFeedback, true);
  AppStorage.saveSettings({ fontScale: 1.24, theme: "고대비", paintFeedback: false });
  const savedSettings = JSON.parse(context.localStorage.getItem(storageKeys.settings));
  assert.strictEqual(savedSettings.fontScale, 1.24);
  assert.strictEqual(savedSettings.theme, "고대비");
  assert.strictEqual(savedSettings.paintFeedback, false);

  const settingsContext = loadStorage({
    [storageKeys.settings]: JSON.stringify({ fontScale: 1.12, theme: "차분", paintFeedback: false })
  });
  assert.strictEqual(settingsContext.window.AppStorage.loadSettings().fontScale, 1.12);
  assert.strictEqual(settingsContext.window.AppStorage.loadSettings().theme, "차분");
  assert.strictEqual(settingsContext.window.AppStorage.loadSettings().paintFeedback, false);

  const invalidSettingsContext = loadStorage({
    [storageKeys.settings]: JSON.stringify({ fontScale: 3, theme: "번쩍", paintFeedback: "꺼짐" })
  });
  assert.strictEqual(invalidSettingsContext.window.AppStorage.loadSettings().fontScale, 1);
  assert.strictEqual(invalidSettingsContext.window.AppStorage.loadSettings().theme, "따뜻");
  assert.strictEqual(invalidSettingsContext.window.AppStorage.loadSettings().paintFeedback, true);

  console.log("storage-version.test.js passed");
}

run();
