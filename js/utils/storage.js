(function() {
  const STORAGE_VERSION = "v12";
  const GALLERY_KEY = "sori_gallery_" + STORAGE_VERSION;
  const PROGRESS_KEY = "sori_progress_" + STORAGE_VERSION;

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

  function getSavedFills(saved) {
    if (Array.isArray(saved)) return saved;
    return saved ? saved.fills : [];
  }

  function getSavedPct(saved) {
    if (Array.isArray(saved)) {
      return Math.min(100, Math.round(saved.length / 25 * 100));
    }
    return saved ? saved.pct : 0;
  }

  window.AppStorage = {
    loadGallery: () => readJson(GALLERY_KEY, []),
    saveGallery: (list) => writeJson(GALLERY_KEY, list),
    loadProgress: () => readJson(PROGRESS_KEY, {}),
    saveProgress: (map) => writeJson(PROGRESS_KEY, map),
    getSavedFills,
    getSavedPct
  };
})();
