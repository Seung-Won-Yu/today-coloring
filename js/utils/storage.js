(function() {
  const STORAGE_VERSION = "v12";
  const GALLERY_KEY = "sori_gallery_" + STORAGE_VERSION;
  const PROGRESS_KEY = "sori_progress_" + STORAGE_VERSION;
  const ARTWORK_REFRESH_KEY = "sori_artwork_refresh_v19_14_60";
  const REFRESHED_ARTWORK_IDS = ["vertical-14", "vertical-60"];

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
    }
  }

  function clearRefreshedArtworkSaves() {
    try {
      if (localStorage.getItem(ARTWORK_REFRESH_KEY) === "1") return;
      const progress = readJson(PROGRESS_KEY, {});
      let changedProgress = false;
      REFRESHED_ARTWORK_IDS.forEach((id) => {
        if (progress[id]) {
          delete progress[id];
          changedProgress = true;
        }
      });
      if (changedProgress) writeJson(PROGRESS_KEY, progress);
      const gallery = readJson(GALLERY_KEY, []);
      if (Array.isArray(gallery) && gallery.length > 0) {
        const nextGallery = gallery.filter((item) => !REFRESHED_ARTWORK_IDS.includes(item && item.artId));
        if (nextGallery.length !== gallery.length) writeJson(GALLERY_KEY, nextGallery);
      }
      localStorage.setItem(ARTWORK_REFRESH_KEY, "1");
    } catch (_) {
    }
  }

  function getSavedFills(saved) {
    if (Array.isArray(saved)) return saved;
    return saved ? saved.fills : [];
  }

  clearRefreshedArtworkSaves();

  window.AppStorage = {
    loadGallery: () => readJson(GALLERY_KEY, []),
    saveGallery: (list) => writeJson(GALLERY_KEY, list),
    loadProgress: () => readJson(PROGRESS_KEY, {}),
    saveProgress: (map) => writeJson(PROGRESS_KEY, map),
    getSavedFills
  };
})();
