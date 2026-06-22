(function() {
  const artworkImageCache = new Map();
  const ARTWORK_IMAGE_CACHE_LIMIT = 48;

  function rememberArtworkImageCacheEntry(src, entry) {
    if (!src) return;
    if (artworkImageCache.has(src)) {
      artworkImageCache.delete(src);
    } else if (artworkImageCache.size >= ARTWORK_IMAGE_CACHE_LIMIT) {
      const oldestKey = artworkImageCache.keys().next().value;
      if (oldestKey !== undefined) artworkImageCache.delete(oldestKey);
    }
    artworkImageCache.set(src, entry);
  }

  function getArtworkImageCacheEntry(src) {
    const cached = artworkImageCache.get(src);
    if (!cached) return null;
    artworkImageCache.delete(src);
    artworkImageCache.set(src, cached);
    return cached;
  }

  function loadArtworkBitmap(src) {
    const cached = getArtworkImageCacheEntry(src);
    if (cached?.image) return Promise.resolve(cached.image);
    if (cached?.promise) return cached.promise;

    const image = new Image();
    image.decoding = "async";
    const promise = new Promise((resolve, reject) => {
      image.onload = () => {
        rememberArtworkImageCacheEntry(src, { image });
        resolve(image);
      };
      image.onerror = reject;
    });

    rememberArtworkImageCacheEntry(src, { promise });
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

  if (window.__COLORING_TEST_HOOKS__) {
    window.__COLORING_TEST_HOOKS__.getArtworkImageCacheLimit = () => ARTWORK_IMAGE_CACHE_LIMIT;
    window.__COLORING_TEST_HOOKS__.getArtworkImageCacheSize = () => artworkImageCache.size;
    window.__COLORING_TEST_HOOKS__.hasArtworkImageCacheEntry = (src) => artworkImageCache.has(src);
  }
})();
