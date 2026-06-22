(function() {
  function getArtworkFileName(art) {
    const title = art && art.title ? art.title : "today-coloring";
    return `${title}_\uC644\uC131.png`;
  }

  function postImageToNativeBridge(dataUrl, fileName, art) {
    const bridge = window.ReactNativeWebView;
    if (!bridge || typeof bridge.postMessage !== "function") return false;
    const artwork = art || {};
    try {
      bridge.postMessage(JSON.stringify({
        type: "COLORING_SAVE_IMAGE",
        payload: {
          artId: artwork.id,
          title: artwork.title,
          fileName,
          mimeType: "image/png",
          base64: String(dataUrl || "").split(",")[1] || ""
        }
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function triggerBrowserDownload(dataUrl, fileName) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  window.SaveImage = {
    getArtworkFileName,
    postImageToNativeBridge,
    triggerBrowserDownload
  };
})();
