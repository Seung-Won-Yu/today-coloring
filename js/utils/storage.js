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
    return saved && Array.isArray(saved.fills) ? saved.fills : [];
  }

  function getArtworkById(artId) {
    const source = window.ARTWORKS || window.ALL_ARTWORKS || [];
    return source.find((art) => art && art.id === artId) || null;
  }

  function getArtworkVersion(artId) {
    const art = getArtworkById(artId);
    return art && art.version ? String(art.version) : "";
  }

  function versionMatches(saved, artId) {
    const art = getArtworkById(artId);
    const currentVersion = art && art.version ? String(art.version) : "";
    if (!currentVersion) return false;
    if (Array.isArray(saved)) return !art.requiresVersionedSave;
    if (!saved || typeof saved !== "object") return true;
    if (!saved.artworkVersion) return !art.requiresVersionedSave;
    return String(saved.artworkVersion) === currentVersion;
  }

  function createProgressEntry(artId, fills) {
    return {
      fills: Array.isArray(fills) ? fills : [],
      artworkVersion: getArtworkVersion(artId)
    };
  }

  function createGalleryItem(item) {
    if (!item || !item.artId) return item;
    return {
      ...item,
      fills: Array.isArray(item.fills) ? item.fills : [],
      artworkVersion: getArtworkVersion(item.artId)
    };
  }

  function normalizeProgress(progress) {
    const next = {};
    let changed = !progress || typeof progress !== "object" || Array.isArray(progress);
    Object.keys(changed ? {} : progress).forEach((artId) => {
      const saved = progress[artId];
      const fills = getSavedFills(saved);
      if (!getArtworkById(artId) || !versionMatches(saved, artId) || !Array.isArray(fills) || fills.length === 0) {
        changed = true;
        return;
      }
      const normalized = createProgressEntry(artId, fills);
      next[artId] = normalized;
      if (!saved || Array.isArray(saved) || saved.artworkVersion !== normalized.artworkVersion || saved.fills !== fills) changed = true;
    });
    return { value: next, changed };
  }

  function normalizeGallery(gallery) {
    if (!Array.isArray(gallery)) return { value: [], changed: true };
    const next = [];
    let changed = false;
    gallery.forEach((item) => {
      if (!item || !item.artId || !getArtworkById(item.artId) || !versionMatches(item, item.artId)) {
        changed = true;
        return;
      }
      const normalized = createGalleryItem(item);
      next.push(normalized);
      if (!Array.isArray(item.fills) || item.artworkVersion !== normalized.artworkVersion) changed = true;
    });
    return { value: next, changed };
  }

  function loadProgress() {
    const normalized = normalizeProgress(readJson(PROGRESS_KEY, {}));
    if (normalized.changed) writeJson(PROGRESS_KEY, normalized.value);
    return normalized.value;
  }

  function saveProgress(map) {
    writeJson(PROGRESS_KEY, normalizeProgress(map).value);
  }

  function loadGallery() {
    const normalized = normalizeGallery(readJson(GALLERY_KEY, []));
    if (normalized.changed) writeJson(GALLERY_KEY, normalized.value);
    return normalized.value;
  }

  function saveGallery(list) {
    writeJson(GALLERY_KEY, normalizeGallery(list).value);
  }

  window.AppStorage = {
    loadGallery,
    saveGallery,
    loadProgress,
    saveProgress,
    getSavedFills,
    getArtworkVersion,
    createProgressEntry,
    createGalleryItem
  };
})();
