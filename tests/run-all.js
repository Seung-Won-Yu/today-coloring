const { spawnSync } = require("child_process");
const path = require("path");

const tests = [
  "cache-version-consistency.test.js",
  "service-worker-fetch.test.js",
  "save-image-bridge.test.js",
  "artwork-assets.test.js",
  "manifest-policy.test.js",
  "index-boot.test.js",
  "storage-version.test.js",
  "paint-engine.test.js",
  "app-showcase-fills.test.js"
];

const testsDir = __dirname;
let failed = false;

tests.forEach((testFile) => {
  const testPath = path.join(testsDir, testFile);
  const result = spawnSync(process.execPath, [testPath], {
    cwd: path.resolve(testsDir, ".."),
    stdio: "inherit"
  });

  if (result.status !== 0) {
    failed = true;
  }
});

if (failed) {
  process.exit(1);
}

console.log("all tests passed");
