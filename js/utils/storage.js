(function() {
  const STORAGE_VERSION = "v12";
  const GALLERY_KEY = "sori_gallery_" + STORAGE_VERSION;
  const PROGRESS_KEY = "sori_progress_" + STORAGE_VERSION;
  const SETTINGS_KEY = "sori_settings_v1";
  const FONT_SCALE_OPTIONS = [1, 1.12, 1.24];
  const DEFAULT_SETTINGS = {
    fontScale: 1
  };

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

  function normalizeFontScale(value) {
    const numeric = Number(value);
    const matched = FONT_SCALE_OPTIONS.find((option) => Math.abs(option - numeric) < 0.001);
    return matched || DEFAULT_SETTINGS.fontScale;
  }

  function createSettings(settings) {
    return {
      fontScale: normalizeFontScale(settings && settings.fontScale)
    };
  }

  function loadSettings() {
    const saved = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
    const normalized = createSettings(saved);
    if (!saved || saved.fontScale !== normalized.fontScale) writeJson(SETTINGS_KEY, normalized);
    return normalized;
  }

  function saveSettings(settings) {
    writeJson(SETTINGS_KEY, createSettings(settings));
  }

  function getSavedFills(saved) {
    if (Array.isArray(saved)) return saved;
    return saved && Array.isArray(saved.fills) ? saved.fills : [];
  }

  function normalizeUndoHistory(history) {
    if (!Array.isArray(history)) return { value: [], changed: history !== undefined };
    const next = history.filter((item) => Array.isArray(item));
    return {
      value: next.length === history.length ? history : next,
      changed: next.length !== history.length
    };
  }

  function getSavedHistory(saved) {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return [];
    return normalizeUndoHistory(saved.undoHistory).value;
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

  function createProgressEntry(artId, fills, undoHistory) {
    const normalizedHistory = normalizeUndoHistory(undoHistory);
    return {
      fills: Array.isArray(fills) ? fills : [],
      undoHistory: normalizedHistory.value,
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
      const savedHistory = getSavedHistory(saved);
      if (!getArtworkById(artId) || !versionMatches(saved, artId) || !Array.isArray(fills) || fills.length === 0) {
        changed = true;
        return;
      }
      const normalized = createProgressEntry(artId, fills, savedHistory);
      next[artId] = normalized;
      if (!saved || Array.isArray(saved) || saved.artworkVersion !== normalized.artworkVersion || saved.fills !== fills || !Array.isArray(saved.undoHistory) || saved.undoHistory !== savedHistory) changed = true;
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
    loadSettings,
    saveSettings,
    createSettings,
    getSavedFills,
    getSavedHistory,
    getArtworkVersion,
    createProgressEntry,
    createGalleryItem
  };
})();
