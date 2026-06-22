const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function matchOne(source, pattern, label) {
  const match = source.match(pattern);
  assert(match, `${label} should be present`);
  return match[1];
}

function run() {
  const indexHtml = read("index.html");
  const serviceWorker = read("sw.js");

  const registeredSwVersion = matchOne(
    indexHtml,
    /serviceWorker\.register\('\.\/sw\.js\?v=(\d+)'\)/,
    "service worker registration version"
  );
  const cacheVersion = matchOne(
    serviceWorker,
    /const CACHE_NAME = 'today-coloring-shell-v(\d+)'/,
    "service worker cache version"
  );
  assert.strictEqual(
    registeredSwVersion,
    cacheVersion,
    "index service worker registration version should match CACHE_NAME"
  );

  const versionedAssets = [
    ["css/styles.css", /href="css\/styles\.css\?v=(\d+)"/],
    ["js/data/artworks.js", /src="js\/data\/artworks\.js\?v=(\d+)"/],
    ["js/data/palette.js", /src="js\/data\/palette\.js\?v=(\d+)"/],
    ["js/utils/storage.js", /src="js\/utils\/storage\.js\?v=(\d+)"/],
    ["js/utils/paint.js", /src="js\/utils\/paint\.js\?v=(\d+)"/],
    ["js/utils/assets.js", /src="js\/utils\/assets\.js\?v=(\d+)"/],
    ["js/utils/save-image.js", /src="js\/utils\/save-image\.js\?v=(\d+)"/],
    ["js/ui/components.js", /src="js\/ui\/components\.js\?v=(\d+)"/],
    ["js/app.js", /src="js\/app\.js\?v=(\d+)"/]
  ];

  versionedAssets.forEach(([assetPath, indexPattern]) => {
    const indexVersion = matchOne(indexHtml, indexPattern, `${assetPath} index version`);
    assert(
      serviceWorker.includes(`'./${assetPath}?v=${indexVersion}'`),
      `service worker should cache ${assetPath}?v=${indexVersion}`
    );
  });

  console.log("cache-version-consistency.test.js passed");
}

run();
