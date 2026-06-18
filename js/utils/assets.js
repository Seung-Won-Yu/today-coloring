(function() {
  const artworkImageCache = new Map();

  function loadArtworkBitmap(src) {
    const cached = artworkImageCache.get(src);
    if (cached?.image) return Promise.resolve(cached.image);
    if (cached?.promise) return cached.promise;

    const image = new Image();
    image.decoding = "async";
    const promise = new Promise((resolve, reject) => {
      image.onload = () => {
        artworkImageCache.set(src, { image });
        resolve(image);
      };
      image.onerror = reject;
    });

    artworkImageCache.set(src, { promise });
    image.src = src;
    return promise;
  }

  function preloadArtworkBitmaps(sources, options = {}) {
    const list = (sources || []).filter(Boolean);
    const limit = Math.max(1, options.limit || 8);
    const concurrency = Math.max(1, options.concurrency || 3);
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 80));
    let cursor = 0;
    let active = 0;

    const pump = () => {
      while (active < concurrency && cursor < Math.min(list.length, limit)) {
        const src = list[cursor++];
        active++;
        loadArtworkBitmap(src).catch(() => {}).finally(() => {
          active--;
          if (cursor < Math.min(list.length, limit)) pump();
        });
      }
    };

    schedule(pump, { timeout: 900 });
  }

  window.AssetLoader = {
    loadArtworkBitmap,
    preloadArtworkBitmaps
  };
})();
