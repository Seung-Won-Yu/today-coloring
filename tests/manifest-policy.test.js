const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.webmanifest"), "utf8"));
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(rootDir, "sw.js"), "utf8");

  assert.strictEqual(manifest.orientation, "any", "installed PWA should allow tablet and desktop landscape");
  assert(indexHtml.includes('href="manifest.webmanifest?v=5"'), "index should request the updated manifest version");
  assert(serviceWorker.includes("'./manifest.webmanifest?v=5'"), "service worker should cache the updated manifest version");

  console.log("manifest-policy.test.js passed");
}

run();
