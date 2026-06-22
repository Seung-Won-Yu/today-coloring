(function() {
  const STORAGE_VERSION = "v12";
  const GALLERY_KEY = "sori_gallery_" + STORAGE_VERSION;
  const PROGRESS_KEY = "sori_progress_" + STORAGE_VERSION;
  const SETTINGS_KEY = "sori_settings_v1";
  const FONT_SCALE_OPTIONS = [1, 1.12, 1.24];
  const THEME_OPTIONS = ["따뜻", "차분", "고대비"];
  const DEFAULT_SETTINGS = {
    fontScale: 1,
    theme: "따뜻",
    paintFeedback: true
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

  function normalizeTheme(value) {
    return THEME_OPTIONS.includes(value) ? value : DEFAULT_SETTINGS.theme;
  }

  function normalizePaintFeedback(value) {
    return value === false ? false : true;
  }

  function createSettings(settings) {
    return {
      fontScale: normalizeFontScale(settings && settings.fontScale),
      theme: normalizeTheme(settings && settings.theme),
      paintFeedback: normalizePaintFeedback(settings && settings.paintFeedback)
    };
  }

  function loadSettings() {
    const saved = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
    const normalized = createSettings(saved);
    if (!saved || saved.fontScale !== normalized.fontScale || saved.theme !== normalized.theme || saved.paintFeedback !== normalized.paintFeedback) writeJson(SETTINGS_KEY, normalized);
    return normalized;
  }

  function saveSettings(settings) {
    writeJson(SETTINGS_KEY, createSettings(settings));
  }

  function normalizeFillColor(color) {
    if (typeof color !== "string") return null;
    const shortMatch = color.match(/^#([0-9a-f]{3})$/i);
    if (shortMatch) {
      return "#" + shortMatch[1].split("").map((char) => char + char).join("").toUpperCase();
    }
    const fullMatch = color.match(/^#([0-9a-f]{6})$/i);
    return fullMatch ? "#" + fullMatch[1].toUpperCase() : null;
  }

  function normalizeFill(fill) {
    if (!fill || !Number.isInteger(fill.x) || fill.x < 0 || !Number.isInteger(fill.y) || fill.y < 0) return null;
    const color = normalizeFillColor(fill.color);
    if (!color) return null;
    return fill.color === color ? fill : { ...fill, color };
  }

  function normalizeFills(fills) {
    if (!Array.isArray(fills)) return { value: [], changed: fills !== undefined };
    let changed = false;
    const next = [];
    fills.forEach((fill) => {
      const normalized = normalizeFill(fill);
      if (!normalized) {
        changed = true;
        return;
      }
      next.push(normalized);
      if (normalized !== fill) changed = true;
    });
    return {
      value: changed ? next : fills,
      changed
    };
  }

  function getSavedFills(saved) {
    if (Array.isArray(saved)) return normalizeFills(saved).value;
    return normalizeFills(saved && saved.fills).value;
  }

  function normalizeUndoHistory(history) {
    if (!Array.isArray(history)) return { value: [], changed: history !== undefined };
    let changed = false;
    const next = [];
    history.forEach((item) => {
      if (!Array.isArray(item)) {
        changed = true;
        return;
      }
      const normalized = normalizeFills(item);
      next.push(normalized.value);
      if (normalized.changed) changed = true;
    });
    return {
      value: changed ? next : history,
      changed
    };
  }

  function getSavedHistory(saved) {
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return [];
    return normalizeUndoHistory(saved.undoHistory).value;
  }

  function normalizeSnapshotDataUrl(value) {
    if (typeof value !== "string") return undefined;
    return /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) ? value : undefined;
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
    const normalizedFills = normalizeFills(fills);
    const normalizedHistory = normalizeUndoHistory(undoHistory);
    return {
      fills: normalizedFills.value,
      undoHistory: normalizedHistory.value,
      artworkVersion: getArtworkVersion(artId)
    };
  }

  function createGalleryItem(item) {
    if (!item || !item.artId) return item;
    const normalizedFills = normalizeFills(item.fills);
    const normalized = {
      ...item,
      fills: normalizedFills.value,
      artworkVersion: getArtworkVersion(item.artId)
    };
    const snapshotDataUrl = normalizeSnapshotDataUrl(item.snapshotDataUrl);
    if (snapshotDataUrl) normalized.snapshotDataUrl = snapshotDataUrl;
    else delete normalized.snapshotDataUrl;
    return normalized;
  }

  function normalizeProgress(progress) {
    const next = {};
    let changed = !progress || typeof progress !== "object" || Array.isArray(progress);
    Object.keys(changed ? {} : progress).forEach((artId) => {
      const saved = progress[artId];
      const rawFills = Array.isArray(saved) ? saved : saved && saved.fills;
      const normalizedFills = normalizeFills(rawFills);
      const fills = normalizedFills.value;
      const savedHistory = getSavedHistory(saved);
      if (!getArtworkById(artId) || !versionMatches(saved, artId) || !Array.isArray(fills) || fills.length === 0) {
        changed = true;
        return;
      }
      const normalized = createProgressEntry(artId, fills, savedHistory);
      next[artId] = normalized;
      if (!saved || Array.isArray(saved) || saved.artworkVersion !== normalized.artworkVersion || saved.fills !== fills || normalizedFills.changed || !Array.isArray(saved.undoHistory) || saved.undoHistory !== savedHistory) changed = true;
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
      if (!Array.isArray(item.fills) || item.fills !== normalized.fills || item.artworkVersion !== normalized.artworkVersion || item.snapshotDataUrl !== normalized.snapshotDataUrl) changed = true;
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
