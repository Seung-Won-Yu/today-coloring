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

function run() {
  const context = loadStorage({
    sori_progress_v12: JSON.stringify({
      "vertical-15": { fills: [{ x: 1, y: 1, color: "#fff" }], artworkVersion: "old" },
      "vertical-17": { fills: [{ x: 2, y: 2, color: "#000" }], artworkVersion: "20" },
      "vertical-40": [{ x: 3, y: 3, color: "#f00" }],
      "vertical-60": [{ x: 4, y: 4, color: "#0f0" }]
    }),
    sori_gallery_v12: JSON.stringify([
      { id: "old", artId: "vertical-15", fills: [{ x: 1 }], artworkVersion: "old" },
      { id: "current", artId: "vertical-17", fills: [{ x: 2 }], artworkVersion: "20" },
      { id: "legacy", artId: "vertical-40", fills: [{ x: 3 }] },
      { id: "legacy-stale", artId: "vertical-60", fills: [{ x: 4 }] }
    ]),
    sori_artwork_refresh_v19_14_60: "1"
  });

  const { AppStorage, ARTWORKS } = context.window;
  assert.strictEqual(ARTWORKS[0].version, "20");

  const progress = AppStorage.loadProgress();
  assert.strictEqual(progress["vertical-15"], undefined);
  assert.strictEqual(progress["vertical-17"].artworkVersion, "20");
  assert.strictEqual(progress["vertical-40"].artworkVersion, "20");
  assert.strictEqual(progress["vertical-60"], undefined);

  const gallery = AppStorage.loadGallery();
  assert.strictEqual(JSON.stringify(gallery.map((item) => item.id)), JSON.stringify(["current", "legacy"]));
  assert(gallery.every((item) => item.artworkVersion === "20"));

  const newProgress = AppStorage.createProgressEntry("vertical-15", [{ x: 4, y: 4, color: "#abc" }]);
  AppStorage.saveProgress({ "vertical-15": newProgress });
  const savedProgress = JSON.parse(context.localStorage.getItem("sori_progress_v12"));
  assert.strictEqual(savedProgress["vertical-15"].artworkVersion, "20");

  const newGalleryItem = AppStorage.createGalleryItem({ id: "new", artId: "vertical-15", fills: [], date: 1 });
  AppStorage.saveGallery([newGalleryItem]);
  const savedGallery = JSON.parse(context.localStorage.getItem("sori_gallery_v12"));
  assert.strictEqual(savedGallery[0].artworkVersion, "20");

  console.log("storage-version.test.js passed");
}

run();
