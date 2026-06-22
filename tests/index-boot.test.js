const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function getVersionResetScript() {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  const script = scripts.find((source) => source.includes("sori_app_ver"));
  assert(script, "index.html should include the app version reset script");
  return script;
}

function createLocalStorage(initial = {}) {
  const storage = { ...initial };
  storage.getItem = (key) => storage[key] || null;
  storage.setItem = (key, value) => {
    storage[key] = String(value);
  };
  storage.removeItem = (key) => {
    delete storage[key];
  };
  return storage;
}

function runScript(localStorage) {
  vm.runInNewContext(getVersionResetScript(), { localStorage, Object });
}

function run() {
  const storage = createLocalStorage({
    sori_app_ver: "old",
    sori_progress_v12: "progress",
    sori_gallery_v12: "gallery",
    unrelated: "keep"
  });
  runScript(storage);
  assert.strictEqual(storage.sori_progress_v12, undefined);
  assert.strictEqual(storage.sori_gallery_v12, undefined);
  assert.strictEqual(storage.unrelated, "keep");
  assert.strictEqual(storage.sori_app_ver, "v9.1");

  const blockedStorage = {
    getItem() {
      throw new Error("localStorage blocked");
    },
    setItem() {
      throw new Error("localStorage blocked");
    },
    removeItem() {
      throw new Error("localStorage blocked");
    }
  };
  assert.doesNotThrow(() => runScript(blockedStorage));

  console.log("index-boot.test.js passed");
}

run();
