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

  window.AssetLoader = {
    loadArtworkBitmap
  };
})();
