const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

function loadSaveImage() {
  const clicks = [];
  const appended = [];
  const removed = [];
  const context = {
    window: {},
    document: {
      body: {
        appendChild(node) {
          appended.push(node);
        },
        removeChild(node) {
          removed.push(node);
        }
      },
      createElement(tagName) {
        assert.strictEqual(tagName, "a");
        return {
          href: "",
          download: "",
          click() {
            clicks.push(this);
          }
        };
      }
    },
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(rootDir, "js/utils/save-image.js"), "utf8"), context);
  return { context, SaveImage: context.window.SaveImage, clicks, appended, removed };
}

function run() {
  const { context, SaveImage, clicks, appended, removed } = loadSaveImage();

  assert.strictEqual(SaveImage.getArtworkFileName({ title: "sheep" }), "sheep_\uC644\uC131.png");
  assert.strictEqual(SaveImage.getArtworkFileName({}), "today-coloring_\uC644\uC131.png");
  assert.strictEqual(
    SaveImage.postImageToNativeBridge("data:image/png;base64,abc123", "sheep.png", { id: "vertical-05", title: "sheep" }),
    false,
    "missing React Native bridge should fall back to browser download"
  );

  const messages = [];
  context.window.ReactNativeWebView = {
    postMessage(message) {
      messages.push(JSON.parse(message));
    }
  };

  assert.strictEqual(
    SaveImage.postImageToNativeBridge("data:image/png;base64,abc123", "sheep.png", { id: "vertical-05", title: "sheep" }),
    true
  );
  assert.deepStrictEqual(messages[0], {
    type: "COLORING_SAVE_IMAGE",
    payload: {
      artId: "vertical-05",
      title: "sheep",
      fileName: "sheep.png",
      mimeType: "image/png",
      base64: "abc123"
    }
  });

  context.window.ReactNativeWebView = {
    postMessage() {
      throw new Error("bridge down");
    }
  };
  assert.strictEqual(
    SaveImage.postImageToNativeBridge("data:image/png;base64,abc123", "sheep.png", { id: "vertical-05", title: "sheep" }),
    false,
    "bridge errors should fall back to browser download"
  );

  assert.strictEqual(SaveImage.triggerBrowserDownload("data:image/png;base64,xyz", "fallback.png"), true);
  assert.strictEqual(appended.length, 1);
  assert.strictEqual(removed.length, 1);
  assert.strictEqual(clicks.length, 1);
  assert.strictEqual(clicks[0].href, "data:image/png;base64,xyz");
  assert.strictEqual(clicks[0].download, "fallback.png");

  console.log("save-image-bridge.test.js passed");
}

run();
