const AppStorage = window.AppStorage;
const {
  hexToRgb,
  isProgressMarked,
  isPaintableBasePixel,
  isLinePixelColor,
  buildLineLayerImageData,
  buildPaintRegionMap,
  createFillLayerImageData,
  decodePaintRegionMapImageData,
  getPaintRegionLabel,
  getPaintRegionMapSeeds,
  paintFillLayerSeed,
  paintRegionMapSeed,
  composePaintLayers,
  analyzePaintRegions,
  findNearestUnpaintedStart,
  findNearestPaintedStart,
  markProgressRegion,
  markProgressRegionMap,
  createSafeArtworkCanvas,
  normalizeFillForFrame
} = window.PaintEngine;
const { loadArtworkBitmap, preloadArtworkBitmaps } = window.AssetLoader;
const { Icon, BigButton, isLight, Palette, useOrientation, Confetti } = window.UIComponents;
const { getArtworkFileName, postImageToNativeBridge, triggerBrowserDownload } = window.SaveImage;

function rememberBoundedCacheValue(cache, cacheKey, value, cloneValue, limit) {
  if (!cacheKey) return;
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  } else if (cache.size >= limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, cloneValue(value));
}

const regionAnalysisCache = new Map();
const REGION_ANALYSIS_CACHE_LIMIT = 12;
const paintLayerStateCache = new Map();
const PAINT_LAYER_STATE_CACHE_LIMIT = 6;
function getRegionAnalysisCacheKey(art, frameMode, width, height) {
  const artKey = art ? `${art.id || ""}@${art.version || ""}@${art.src || ""}` : "";
  return `${artKey}:${frameMode}:${width}x${height}`;
}

function getFillsCacheSignature(fillsArray) {
  if (!Array.isArray(fillsArray) || fillsArray.length === 0) return "0";
  return fillsArray.map((fill) => {
    const item = fill || {};
    return `${item.x || 0},${item.y || 0},${item.color || ""},${item.v || ""}`;
  }).join(";");
}

function getPaintLayerStateCacheKey(art, frameMode, width, height, fillsArray) {
  const artKey = art ? `${art.id || ""}@${art.version || ""}@${art.src || ""}@${art.regionMapSrc || ""}@${art.lineLayerSrc || ""}` : "";
  return `${artKey}:${frameMode}:${width}x${height}:${getFillsCacheSignature(fillsArray)}`;
}

function cloneRegionAnalysis(regions) {
  return (regions || []).map((region) => ({ ...region }));
}

function getCachedRegionAnalysis(cacheKey) {
  const cached = regionAnalysisCache.get(cacheKey);
  return cached ? cloneRegionAnalysis(cached) : null;
}

function rememberRegionAnalysis(cacheKey, regions) {
  rememberBoundedCacheValue(regionAnalysisCache, cacheKey, regions, cloneRegionAnalysis, REGION_ANALYSIS_CACHE_LIMIT);
}

function canUsePaintRegionMap(regionMap, width, height) {
  return Boolean(
    regionMap &&
    regionMap.width === width &&
    regionMap.height === height &&
    regionMap.labels &&
    Array.isArray(regionMap.regions)
  );
}

function replayFillOnFillLayer(fillLayerImageData, baseData, fill, frame, regionMap = null) {
  const normalizedFill = normalizeFillForFrame(fill, frame);
  const fillRgb = hexToRgb(normalizedFill.color);
  if (canUsePaintRegionMap(regionMap, fillLayerImageData.width, fillLayerImageData.height)) {
    const mappedBounds = paintRegionMapSeed(fillLayerImageData, regionMap, normalizedFill, fillRgb);
    if (mappedBounds) return mappedBounds;
  }
  return paintFillLayerSeed(fillLayerImageData, baseData, normalizedFill, fillRgb);
}

function markProgressForSeed(progressImgData, baseData, fill, frame, regionMap = null) {
  const normalizedFill = normalizeFillForFrame(fill, frame);
  if (canUsePaintRegionMap(regionMap, progressImgData.width, progressImgData.height)) {
    const mappedBounds = markProgressRegionMap(progressImgData, regionMap, normalizedFill.x, normalizedFill.y);
    if (mappedBounds) return mappedBounds;
  }
  return markProgressRegion(progressImgData, normalizedFill.x, normalizedFill.y, baseData);
}

function loadPrecomputedPaintRegionMap(art, width, height, frameMode) {
  if (frameMode !== "paint" || !art || !art.regionMapSrc) return Promise.resolve(null);
  return loadArtworkBitmap(art.regionMapSrc).then((img) => {
    if (!img || img.width !== width || img.height !== height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return decodePaintRegionMapImageData(ctx.getImageData(0, 0, img.width, img.height));
  }).catch(() => null);
}

function loadPaintRegionMapForFrame(art, width, height, frameMode, baseImgData) {
  return loadPrecomputedPaintRegionMap(art, width, height, frameMode).then((precomputedRegionMap) => {
    if (precomputedRegionMap) return precomputedRegionMap;
    return baseImgData ? buildPaintRegionMap(baseImgData) : null;
  });
}

function loadPrecomputedPaintLineLayer(art, width, height, frameMode) {
  if (frameMode !== "paint" || !art || !art.lineLayerSrc) return Promise.resolve(null);
  return loadArtworkBitmap(art.lineLayerSrc).then((img) => {
    if (!img || img.width !== width || img.height !== height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  }).catch(() => null);
}

function cloneFillLayerImageData(imageData) {
  if (!imageData) return null;
  const clone = createFillLayerImageData(imageData.width, imageData.height);
  clone.data.set(imageData.data);
  return clone;
}

function cloneProgressImageData(imageData) {
  if (!imageData) return null;
  return {
    data: new Uint8ClampedArray(imageData.data),
    width: imageData.width,
    height: imageData.height
  };
}

function clonePaintLayerState(state) {
  if (!state) return null;
  return {
    fillLayer: cloneFillLayerImageData(state.fillLayer),
    progressImgData: cloneProgressImageData(state.progressImgData)
  };
}

function rememberPaintLayerState(cacheKey, state) {
  if (!cacheKey || !state || !state.fillLayer || !state.progressImgData) return;
  rememberBoundedCacheValue(paintLayerStateCache, cacheKey, state, clonePaintLayerState, PAINT_LAYER_STATE_CACHE_LIMIT);
}

function getCachedPaintLayerState(cacheKey) {
  const cached = paintLayerStateCache.get(cacheKey);
  return cached ? clonePaintLayerState(cached) : null;
}

function getOrBuildPaintLayerState(cacheKey, buildState) {
  const cached = getCachedPaintLayerState(cacheKey);
  if (cached) return cached;
  const state = buildState();
  rememberPaintLayerState(cacheKey, state);
  return state;
}

function buildPaintLayerState(baseImgData, fillsArray, frame, regionMap = null) {
  const fillLayer = createFillLayerImageData(baseImgData.width, baseImgData.height);
  const progressData = new Uint8ClampedArray(baseImgData.data);
  const progressImgData = { data: progressData, width: baseImgData.width, height: baseImgData.height };
  const usableRegionMap = canUsePaintRegionMap(regionMap, baseImgData.width, baseImgData.height) ? regionMap : null;
  for (let f of fillsArray) {
    replayFillOnFillLayer(fillLayer, baseImgData.data, f, frame, usableRegionMap);
    markProgressForSeed(progressImgData, baseImgData.data, f, frame, usableRegionMap);
  }
  return { fillLayer, progressImgData };
}

function useInViewport(options = {}) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(Boolean(options.initial));
  React.useEffect(() => {
    const node = ref.current;
    if (visible || !node) return;
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: options.rootMargin || "220px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, options.rootMargin]);
  return [ref, visible];
}

function CanvasArt({ art, fills, onPaint, selected, interactive = true, frameMode = "preview", onImageLoad, onRegionsChange, canPaint, paintFeedback = true }) {
  const canvasRef = React.useRef(null);
  const baseCanvasRef = React.useRef(null);
  const baseImageDataRef = React.useRef(null);
  const lineLayerImageDataRef = React.useRef(null);
  const fillLayerImageDataRef = React.useRef(null);
  const progressImageDataRef = React.useRef(null);
  const regionMapRef = React.useRef(null);
  const fillsArray = Array.isArray(fills) ? fills : [];
  const regionsRef = React.useRef(null);
  const frameRef = React.useRef(null);
  const lastArtSrcRef = React.useRef("");
  const analysisTaskRef = React.useRef(null);
  const [imageReady, setImageReady] = React.useState(false);
  const [paintPulse, setPaintPulse] = React.useState(null);
  const shouldAnalyzeRegions = Boolean(onRegionsChange);
  if (lastArtSrcRef.current !== art.src) {
    regionsRef.current = null;
    baseImageDataRef.current = null;
    lineLayerImageDataRef.current = null;
    fillLayerImageDataRef.current = null;
    progressImageDataRef.current = null;
    regionMapRef.current = null;
    lastArtSrcRef.current = art.src;
  }
  const publishRegions = (regions) => {
    const next = cloneRegionAnalysis(regions);
    regionsRef.current = next;
    if (onRegionsChange) onRegionsChange(next);
  };
  const cancelRegionAnalysis = () => {
    const task = analysisTaskRef.current;
    if (!task) return;
    if (task.kind === "idle" && window.cancelIdleCallback) {
      window.cancelIdleCallback(task.id);
    } else {
      window.clearTimeout(task.id);
    }
    analysisTaskRef.current = null;
  };
  React.useEffect(() => {
    let cancelled = false;
    cancelRegionAnalysis();
    setImageReady(false);
    setPaintPulse(null);
    loadArtworkBitmap(art.src).then(async (img) => {
      if (cancelled) return;
      const frame = createSafeArtworkCanvas(img, art.src, art.layout, { mode: frameMode });
      const cw = frame.width;
      const ch = frame.height;
      frameRef.current = frame;
      const needsRegionMap = interactive || fillsArray.length > 0 || shouldAnalyzeRegions;
      if (baseCanvasRef.current) {
        baseCanvasRef.current.width = cw;
        baseCanvasRef.current.height = ch;
        const ctx = baseCanvasRef.current.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(frame.canvas, 0, 0);
        baseImageDataRef.current = ctx.getImageData(0, 0, cw, ch);
        const [precomputedLineLayer, precomputedRegionMap] = await Promise.all([
          loadPrecomputedPaintLineLayer(art, cw, ch, frameMode),
          needsRegionMap ? loadPaintRegionMapForFrame(art, cw, ch, frameMode, baseImageDataRef.current) : Promise.resolve(null)
        ]);
        if (cancelled) return;
        lineLayerImageDataRef.current = precomputedLineLayer || buildLineLayerImageData(baseImageDataRef.current);
        regionMapRef.current = precomputedRegionMap;
        fillLayerImageDataRef.current = null;
        if (!shouldAnalyzeRegions) {
          regionsRef.current = null;
        }
      }
      redraw(cw, ch);
      if (onImageLoad) {
        onImageLoad({ width: cw, height: ch });
      }
      setImageReady(true);
      if (shouldAnalyzeRegions && baseImageDataRef.current) {
        const cacheKey = getRegionAnalysisCacheKey(art, frameMode, cw, ch);
        const cachedRegions = getCachedRegionAnalysis(cacheKey);
        if (cachedRegions) {
          publishRegions(cachedRegions);
          return;
        }
        const runAnalysis = () => {
          analysisTaskRef.current = null;
          if (cancelled || lastArtSrcRef.current !== art.src || !baseImageDataRef.current) return;
          try {
            const regions = canUsePaintRegionMap(regionMapRef.current, cw, ch)
              ? getPaintRegionMapSeeds(regionMapRef.current)
              : analyzePaintRegions(baseImageDataRef.current, cw, ch);
            rememberRegionAnalysis(cacheKey, regions);
            publishRegions(regions);
          } catch (e) {
            console.error("Error analyzing regions", e);
          }
        };
        if (window.requestIdleCallback) {
          analysisTaskRef.current = { kind: "idle", id: window.requestIdleCallback(runAnalysis, { timeout: 700 }) };
        } else {
          analysisTaskRef.current = { kind: "timer", id: window.setTimeout(runAnalysis, 0) };
        }
      }
    }).catch((error) => {
      if (!cancelled) console.error("Error loading artwork", error);
    });
    return () => {
      cancelled = true;
      cancelRegionAnalysis();
    };
  }, [art.src, frameMode, shouldAnalyzeRegions]);
  const redraw = (cw, ch) => {
    if (!canvasRef.current || !baseCanvasRef.current) return;
    canvasRef.current.width = cw;
    canvasRef.current.height = ch;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    const baseCtx = baseCanvasRef.current.getContext("2d", { willReadFrequently: true });
    const baseImgData = baseImageDataRef.current || baseCtx.getImageData(0, 0, cw, ch);
    const lineLayer = lineLayerImageDataRef.current || buildLineLayerImageData(baseImgData);
    lineLayerImageDataRef.current = lineLayer;
    const cacheKey = getPaintLayerStateCacheKey(art, frameMode, cw, ch, fillsArray);
    const { fillLayer, progressImgData } = getOrBuildPaintLayerState(
      cacheKey,
      () => buildPaintLayerState(baseImgData, fillsArray, frameRef.current, regionMapRef.current)
    );
    const composed = composePaintLayers(baseImgData, fillLayer, lineLayer);
    ctx.putImageData(composed, 0, 0);
    fillLayerImageDataRef.current = fillLayer;
    progressImageDataRef.current = progressImgData;
  };
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    if (cw === 0 || ch === 0) return;
    redraw(cw, ch);
  }, [fills]);
  const handlePointerUp = (e) => {
    if (!interactive || !onPaint) return;
    if (canPaint && !canPaint()) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const cw = canvasRef.current.width;
    const ch = canvasRef.current.height;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    const baseCtx = baseCanvasRef.current.getContext("2d", { willReadFrequently: true });
    const baseImgData = baseImageDataRef.current || baseCtx.getImageData(0, 0, cw, ch);
    const regionMap = canUsePaintRegionMap(regionMapRef.current, cw, ch) ? regionMapRef.current : null;
    let progressImgData = null;
    const cachedProgress = progressImageDataRef.current;
    if (cachedProgress && cachedProgress.width === cw && cachedProgress.height === ch) {
      progressImgData = {
        data: new Uint8ClampedArray(cachedProgress.data),
        width: cw,
        height: ch
      };
    } else {
      progressImgData = { data: new Uint8ClampedArray(baseImgData.data), width: cw, height: ch };
      for (let f of fillsArray) {
        markProgressForSeed(progressImgData, baseImgData.data, f, frameRef.current, regionMap);
      }
    }
    const progressData = progressImgData.data;
    const snapRadius = Math.max(26, Math.round(Math.max(scaleX, scaleY) * 22));
    const clickedIdx = (y * cw + x) * 4;
    const clickedIsPaintable = isPaintableBasePixel(baseImgData.data, clickedIdx);
    const clickedIsColored = isProgressMarked(progressData, clickedIdx);
    const clickedR = baseImgData.data[clickedIdx];
    const clickedG = baseImgData.data[clickedIdx + 1];
    const clickedB = baseImgData.data[clickedIdx + 2];
    const clickedA = baseImgData.data[clickedIdx + 3];
    const clickedIsLine = isLinePixelColor(clickedR, clickedG, clickedB, clickedA);
    const clickedRegionLabel = regionMap ? getPaintRegionLabel(regionMap, x, y) : 0;
    let start = { x, y };
    if (!clickedIsPaintable) {
      if (!clickedIsLine) return;
      const lineSnapRadius = Math.max(12, Math.round(Math.max(scaleX, scaleY) * 12));
      start = findNearestPaintedStart(baseImgData.data, progressData, cw, ch, x, y, Math.round(lineSnapRadius * 0.8)) || findNearestUnpaintedStart(baseImgData.data, progressData, cw, ch, x, y, lineSnapRadius) || null;
      if (!start) return;
    } else if (!clickedIsColored) {
      start = findNearestUnpaintedStart(baseImgData.data, progressData, cw, ch, x, y, snapRadius) || start;
    }
    const paintX = start.x;
    const paintY = start.y;
    const pIdx = (paintY * cw + paintX) * 4;
    const paintRegionLabel = regionMap ? getPaintRegionLabel(regionMap, paintX, paintY) : 0;
    if (!paintRegionLabel && !isPaintableBasePixel(baseImgData.data, pIdx)) return;
    const isAlreadyColored = isProgressMarked(progressData, pIdx);
    const selectedRgb = hexToRgb(selected);
    if (isAlreadyColored) {
      const pixel = ctx.getImageData(paintX, paintY, 1, 1).data;
      const dist = Math.abs(pixel[0] - selectedRgb.r) + Math.abs(pixel[1] - selectedRgb.g) + Math.abs(pixel[2] - selectedRgb.b);
      if (dist < 10) {
        return;
      }
    }
    const newFill = { x: paintX, y: paintY, color: selected, v: 2 };
    let nextFills = [...fillsArray, newFill];
    const directPaintSeeds = [{ x: paintX, y: paintY }];
    if (regionMap && clickedRegionLabel && !paintRegionLabel) {
      markProgressRegionMap(progressImgData, regionMap, x, y);
    } else {
      markProgressForSeed(progressImgData, baseImgData.data, { x: paintX, y: paintY, v: 2 }, frameRef.current, regionMap);
    }
    const cachedFillLayer = fillLayerImageDataRef.current;
    let fillLayer = cachedFillLayer && cachedFillLayer.width === cw && cachedFillLayer.height === ch
      ? cloneFillLayerImageData(cachedFillLayer)
      : buildPaintLayerState(baseImgData, fillsArray, frameRef.current, regionMap).fillLayer;
    directPaintSeeds.forEach((seed) => {
      const mappedBounds = regionMap ? paintRegionMapSeed(fillLayer, regionMap, seed, selectedRgb) : null;
      if (!mappedBounds) paintFillLayerSeed(fillLayer, baseImgData.data, seed, selectedRgb);
    });
    const lineLayer = lineLayerImageDataRef.current || buildLineLayerImageData(baseImgData);
    lineLayerImageDataRef.current = lineLayer;
    const composed = composePaintLayers(baseImgData, fillLayer, lineLayer);
    ctx.putImageData(composed, 0, 0);
    fillLayerImageDataRef.current = fillLayer;
    progressImageDataRef.current = progressImgData;
    rememberPaintLayerState(getPaintLayerStateCacheKey(art, frameMode, cw, ch, nextFills), { fillLayer, progressImgData });
    onPaint(nextFills);
    if (paintFeedback) {
      const pulse = { id: Date.now(), x: paintX / cw * 100, y: paintY / ch * 100 };
      setPaintPulse(pulse);
      setTimeout(() => {
        setPaintPulse((current) => current && current.id === pulse.id ? null : current);
      }, 460);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "canvas-art-shell" + (imageReady ? " is-ready" : " is-loading"), style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("canvas", { ref: baseCanvasRef, style: { display: "none" } }), !imageReady && /* @__PURE__ */ React.createElement("div", { className: "canvas-art-loading", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("span", null)), /* @__PURE__ */ React.createElement(
    "canvas",
    {
      ref: canvasRef,
      onPointerUp: handlePointerUp,
      style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", touchAction: "none" }
    }
  ), paintPulse && /* @__PURE__ */ React.createElement("span", { key: paintPulse.id, className: "paint-feedback", style: { left: paintPulse.x + "%", top: paintPulse.y + "%" } }));
}
function ArtworkImage({ art, priority = false }) {
  return /* @__PURE__ */ React.createElement("img", { src: art.thumbSrc || art.src, alt: "", loading: priority ? "eager" : "lazy", decoding: "async", fetchpriority: priority ? "high" : "auto", draggable: "false" });
}
function SnapshotImage({ src, priority = false, className = "" }) {
  return /* @__PURE__ */ React.createElement("img", {
    className,
    src,
    alt: "",
    loading: priority ? "eager" : "lazy",
    decoding: "async",
    fetchpriority: priority ? "high" : "auto",
    draggable: "false",
    style: { width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }
  });
}
function Thumb({ art, fills, snapshotDataUrl, lightweight = false, priority = false }) {
  const fillsArray = Array.isArray(fills) ? fills : [];
  const [viewportRef, isVisible] = useInViewport({ initial: priority, rootMargin: "360px" });
  if (snapshotDataUrl) {
    return /* @__PURE__ */ React.createElement(SnapshotImage, { src: snapshotDataUrl, priority });
  }
  if (lightweight && fillsArray.length === 0) {
    return /* @__PURE__ */ React.createElement(ArtworkImage, { art, priority });
  }
  return /* @__PURE__ */ React.createElement("div", { ref: viewportRef, style: { width: "100%", height: "100%" } },
    isVisible ? /* @__PURE__ */ React.createElement(CanvasArt, { art, fills: fillsArray, interactive: false, frameMode: fillsArray.length > 0 ? "paint" : "preview" }) : /* @__PURE__ */ React.createElement(ArtworkImage, { art, priority: false })
  );
}
const SHOWCASE_PALETTE = [
  "#F6D977",
  "#E0584F",
  "#F08E5D",
  "#8DC6B8",
  "#5ED8FF",
  "#7FB069",
  "#C98259",
  "#E9D8A6"
];
function buildShowcaseFills(seeds, limit = 80) {
  const usable = (seeds || []).filter((seed) => seed.size > 8);
  const backgrounds = usable.filter((seed) => seed.isBackground).sort((a, b) => b.size - a.size).slice(0, 2);
  const regions = usable.filter((seed) => !seed.isBackground).sort((a, b) => b.size - a.size).slice(0, Math.max(0, limit - backgrounds.length));
  return [...backgrounds, ...regions].sort((a, b) => a.y - b.y || a.x - b.x).map((seed, idx) => ({
    x: seed.x,
    y: seed.y,
    v: 2,
    color: seed.isBackground ? "#F6D977" : SHOWCASE_PALETTE[(idx + Math.floor(seed.x / 120) + Math.floor(seed.y / 120)) % SHOWCASE_PALETTE.length]
  }));
}
if (window.__COLORING_TEST_HOOKS__) {
  window.__COLORING_TEST_HOOKS__.buildShowcaseFills = buildShowcaseFills;
  window.__COLORING_TEST_HOOKS__.getRegionAnalysisCacheKey = getRegionAnalysisCacheKey;
  window.__COLORING_TEST_HOOKS__.rememberRegionAnalysis = rememberRegionAnalysis;
  window.__COLORING_TEST_HOOKS__.getCachedRegionAnalysis = getCachedRegionAnalysis;
  window.__COLORING_TEST_HOOKS__.getRegionAnalysisCacheLimit = () => REGION_ANALYSIS_CACHE_LIMIT;
  window.__COLORING_TEST_HOOKS__.getRegionAnalysisCacheSize = () => regionAnalysisCache.size;
  window.__COLORING_TEST_HOOKS__.getPaintLayerStateCacheKey = getPaintLayerStateCacheKey;
  window.__COLORING_TEST_HOOKS__.rememberPaintLayerState = rememberPaintLayerState;
  window.__COLORING_TEST_HOOKS__.getCachedPaintLayerState = getCachedPaintLayerState;
  window.__COLORING_TEST_HOOKS__.getOrBuildPaintLayerState = getOrBuildPaintLayerState;
  window.__COLORING_TEST_HOOKS__.getPaintLayerStateCacheLimit = () => PAINT_LAYER_STATE_CACHE_LIMIT;
  window.__COLORING_TEST_HOOKS__.getPaintLayerStateCacheSize = () => paintLayerStateCache.size;
  window.__COLORING_TEST_HOOKS__.loadPaintRegionMapForFrame = loadPaintRegionMapForFrame;
}
const finishedThumbCache = new Map();
const FINISHED_THUMB_CACHE_LIMIT = 48;
const FINISHED_THUMB_FRAME_MODE = "paint";
function getFinishedThumbCacheKey(art, limit) {
  if (!art) return "";
  return `${art.id || ""}@${art.version || ""}@${art.src || ""}:${FINISHED_THUMB_FRAME_MODE}:${limit}`;
}

function cloneShowcaseFills(fills) {
  return (fills || []).map((fill) => ({ ...fill }));
}

function getCachedFinishedThumbFills(cacheKey) {
  const cached = finishedThumbCache.get(cacheKey);
  return cached ? cloneShowcaseFills(cached) : null;
}

function rememberFinishedThumbFills(cacheKey, fills) {
  rememberBoundedCacheValue(finishedThumbCache, cacheKey, fills, cloneShowcaseFills, FINISHED_THUMB_CACHE_LIMIT);
}

if (window.__COLORING_TEST_HOOKS__) {
  window.__COLORING_TEST_HOOKS__.getFinishedThumbCacheKey = getFinishedThumbCacheKey;
  window.__COLORING_TEST_HOOKS__.rememberFinishedThumbFills = rememberFinishedThumbFills;
  window.__COLORING_TEST_HOOKS__.getCachedFinishedThumbFills = getCachedFinishedThumbFills;
  window.__COLORING_TEST_HOOKS__.getFinishedThumbFrameMode = () => FINISHED_THUMB_FRAME_MODE;
  window.__COLORING_TEST_HOOKS__.getFinishedThumbCacheLimit = () => FINISHED_THUMB_CACHE_LIMIT;
  window.__COLORING_TEST_HOOKS__.getFinishedThumbCacheSize = () => finishedThumbCache.size;
}

function FinishedThumb({ art, className = "", limit = 80 }) {
  const cacheKey = getFinishedThumbCacheKey(art, limit);
  const [ready, setReady] = React.useState(() => finishedThumbCache.has(cacheKey));
  const [fills, setFills] = React.useState(() => getCachedFinishedThumbFills(cacheKey) || []);
  const signatureRef = React.useRef("");
  React.useEffect(() => {
    if (!art) return;
    const cached = getCachedFinishedThumbFills(cacheKey);
    setFills(cached || []);
    signatureRef.current = cached ? cached.map((fill) => `${fill.x}:${fill.y}:${fill.color}`).join("|") : "";
    if (cached) {
      setReady(true);
      return;
    }
    setReady(false);
    const schedule = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : (callback) => window.setTimeout(callback, 90);
    const cancel = window.cancelIdleCallback ? window.cancelIdleCallback.bind(window) : window.clearTimeout.bind(window);
    const taskId = schedule(() => setReady(true));
    return () => cancel(taskId);
  }, [art, cacheKey]);
  const handleRegionsChange = React.useCallback((seeds) => {
    const next = buildShowcaseFills(seeds, limit);
    const signature = next.map((fill) => `${fill.x}:${fill.y}:${fill.color}`).join("|");
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;
    rememberFinishedThumbFills(cacheKey, next);
    setFills(cloneShowcaseFills(next));
  }, [cacheKey, limit]);
  return /* @__PURE__ */ React.createElement("div", { className: "finished-thumb " + className }, ready ? /* @__PURE__ */ React.createElement(CanvasArt, { art, fills, interactive: false, frameMode: FINISHED_THUMB_FRAME_MODE, onRegionsChange: handleRegionsChange }) : /* @__PURE__ */ React.createElement(ArtworkImage, { art, priority: true }));
}
// Artwork data is loaded from js/data/artworks.js.
function getArtworkById(id) {
  const source = window.ALL_ARTWORKS || window.ARTWORKS;
  return source.find((art) => art.id === id) || null;
}
function getThemeHint(category) {
  return THEME_HINTS[category] || "오늘의 작품";
}
// Palette data is loaded from js/data/palette.js.
function HowToModal({ featuredArt, onClose }) {
  const e = React.createElement;
  const [guideStep, setGuideStep] = React.useState(0);
  const guideTrackRef = React.useRef(null);
  const guideDragRef = React.useRef({ active: false, startX: 0, scrollLeft: 0 });
  const guideStepRef = React.useRef(0);
  const guideScrollTargetRef = React.useRef(null);
  const guideSlides = [
    {
      tag: "01",
      title: "그림 고르기",
      text: "오늘 칠하고 싶은 그림을 천천히 살펴보고 골라요.",
      kind: "art",
      points: ["큰 미리보기로 확인", "그림을 누르면 색칠 화면으로 이동"]
    },
    {
      tag: "02",
      title: "색 고르기",
      text: "하단 물감 팔레트에서 원하는 색을 고르면 크게 표시돼요.",
      kind: "palette",
      points: ["색은 좌우로 밀어서 더 보기", "고른 색은 언제든 바꾸기"]
    },
    {
      tag: "03",
      title: "천천히 색칠",
      text: "그림을 크게 보고 빈칸을 눌러 차분하게 채워요.",
      kind: "fill",
      points: ["돋보기로 작은 칸 확대", "완성 후 갤러리 보관"]
    }
  ];
  const guideDemoFills = [
    { x: 180, y: 250, color: "#FFD23F" },
    { x: 115, y: 395, color: "#6EEBD9" },
    { x: 245, y: 395, color: "#5ED8FF" }
  ];

  React.useEffect(() => {
    guideStepRef.current = 0;
    guideScrollTargetRef.current = null;
    setGuideStep(0);
    requestAnimationFrame(() => {
      if (guideTrackRef.current) guideTrackRef.current.scrollLeft = 0;
    });
  }, []);

  const syncGuideStep = (idx) => {
    guideStepRef.current = idx;
    setGuideStep(idx);
  };
  const getGuideIndexFromScroll = () => {
    const track = guideTrackRef.current;
    if (!track) return guideStepRef.current;
    const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    return Math.max(0, Math.min(guideSlides.length - 1, next));
  };
  const scrollGuideTo = (idx) => {
    const next = Math.max(0, Math.min(guideSlides.length - 1, idx));
    syncGuideStep(next);
    const track = guideTrackRef.current;
    if (track) {
      guideScrollTargetRef.current = next;
      track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    }
  };
  const nextGuide = () => {
    const current = guideStepRef.current;
    if (current === guideSlides.length - 1) {
      onClose();
      return;
    }
    scrollGuideTo(current + 1);
  };
  const handleGuideScroll = () => {
    const track = guideTrackRef.current;
    if (!track) return;
    const target = guideScrollTargetRef.current;
    if (target !== null) {
      const targetLeft = track.clientWidth * target;
      if (Math.abs(track.scrollLeft - targetLeft) > 2) return;
      guideScrollTargetRef.current = null;
    }
    const next = getGuideIndexFromScroll();
    if (next !== guideStepRef.current) syncGuideStep(next);
  };
  const handleGuidePointerDown = (ev) => {
    const track = guideTrackRef.current;
    if (!track) return;
    guideScrollTargetRef.current = null;
    guideDragRef.current = { active: true, startX: ev.clientX, scrollLeft: track.scrollLeft };
    if (track.setPointerCapture) track.setPointerCapture(ev.pointerId);
  };
  const handleGuidePointerMove = (ev) => {
    const track = guideTrackRef.current;
    const drag = guideDragRef.current;
    if (!track || !drag.active) return;
    track.scrollLeft = drag.scrollLeft - (ev.clientX - drag.startX);
  };
  const handleGuidePointerUp = () => {
    const track = guideTrackRef.current;
    if (!track) return;
    guideDragRef.current.active = false;
    scrollGuideTo(getGuideIndexFromScroll());
  };
  const renderGuideVisual = (slide) => {
    if (slide.kind === "palette") {
      return e("div", { className: "guide-visual guide-visual--palette" },
        e("div", { className: "guide-phonebar" }),
        e("div", { className: "guide-palette-card" },
          e("div", { className: "guide-current-color" }, "고른 색"),
          e("div", { className: "guide-swatches" }, PALETTE.slice(0, 8).map((p, idx) => e("span", { key: p.c, className: idx === 3 ? "is-picked" : "", style: { background: p.c } })))
        ),
        e("div", { className: "guide-pointer guide-pointer--palette", "aria-hidden": "true" },
          e("span", { className: "guide-pointer__halo" }),
          e("span", { className: "guide-pointer__dot" }),
          e("span", { className: "guide-pointer__finger" }, e(Icon, { name: "hand", size: 24, color: "#fff" }))
        )
      );
    }
    if (slide.kind === "fill") {
      return e("div", { className: "guide-visual guide-visual--fill" },
        e("div", { className: "guide-easel-demo" },
          e("div", { className: "guide-split guide-split--plain" }, e(Thumb, { art: featuredArt })),
          e("div", { className: "guide-split guide-split--colored" }, e(Thumb, { art: featuredArt, fills: guideDemoFills }))
        ),
        e("div", { className: "guide-paint-burst" }, e(Icon, { name: "fill", size: 44, color: "#fff" })),
        e("div", { className: "guide-pointer guide-pointer--fill", "aria-hidden": "true" },
          e("span", { className: "guide-pointer__halo" }),
          e("span", { className: "guide-pointer__dot" }),
          e("span", { className: "guide-pointer__finger" }, e(Icon, { name: "hand", size: 24, color: "#fff" }))
        )
      );
    }
    return e("div", { className: "guide-visual guide-visual--art" },
      e("div", { className: "guide-art-card" }, e(Thumb, { art: featuredArt })),
      e("div", { className: "guide-pointer guide-pointer--art", "aria-hidden": "true" },
        e("span", { className: "guide-pointer__halo" }),
        e("span", { className: "guide-pointer__dot" }),
        e("span", { className: "guide-pointer__finger" }, e(Icon, { name: "hand", size: 24, color: "#fff" }))
      )
    );
  };

  return e("div", { className: "guide-modal guide-modal--howto", onClick: onClose },
    e("div", { className: "guide-modal__content", onClick: (ev) => ev.stopPropagation() },
      e("div", { className: "guide-modal__top" },
        e("button", { className: "guide-modal__skip", onClick: onClose }, "닫기")
      ),
      e("div", {
        className: "guide-carousel",
        ref: guideTrackRef,
        onScroll: handleGuideScroll,
        onPointerDown: handleGuidePointerDown,
        onPointerMove: handleGuidePointerMove,
        onPointerUp: handleGuidePointerUp,
        onPointerCancel: handleGuidePointerUp
      },
        guideSlides.map((slide) => e("section", { className: "guide-slide guide-slide--" + slide.kind, key: slide.tag },
          renderGuideVisual(slide),
          e("div", { className: "guide-info-card" },
            e("span", { className: "guide-step-pill" }, slide.tag.replace("0", "") + "단계"),
            e("h2", null, slide.title),
            e("p", null, slide.text),
            e("div", { className: "guide-short__points" }, slide.points.map((point) => e("span", { key: point }, point)))
          )
        ))
      ),
      e("div", { className: "guide-modal__dots", "aria-label": "방법 슬라이드 진행" },
        guideSlides.map((slide, idx) => e("button", { key: slide.tag, className: idx === guideStep ? "is-on" : "", onClick: () => scrollGuideTo(idx), "aria-label": slide.title }))
      ),
      e("div", { className: "guide-modal__actions" },
        e("button", { className: "guide-modal__prev", onClick: () => scrollGuideTo(guideStepRef.current - 1), disabled: guideStep === 0 }, "이전"),
        e("button", { className: "guide-modal__next", onClick: nextGuide }, guideStep === guideSlides.length - 1 ? "시작" : "다음")
      )
    )
  );
}

function LobbyScreen({ onStart }) {
  const e = React.createElement;
  const [showGuide, setShowGuide] = React.useState(false);
  const featuredArt = window.ARTWORKS[0];
  const openGuide = () => setShowGuide(true);
  const closeGuide = () => setShowGuide(false);

  return e("div", { className: "lobby-screen" },
    e("div", { className: "lobby-overlay" },
      e("div", { className: "lobby-copy" },
        e("div", { className: "lobby-brand", "aria-label": "오늘의 색칠" },
          e("span", { className: "lobby-brand__mark" }, e(Icon, { name: "fill", size: 22, color: "#fff" })),
          e("span", { className: "lobby-brand__name" }, "오늘의 색칠")
        ),
        e("h1", { className: "lobby-title" }, "한 장 골라 색을 채워요"),
        e("p", { className: "lobby-subtitle" }, "큰 도안을 고르고 천천히 완성해보세요.")
      ),
      e("div", { className: "lobby-showcase", "aria-hidden": "true" },
        e("div", { className: "lobby-showcase__glow" }),
        featuredArt && e("div", { className: "lobby-showcase__card lobby-showcase__card--0" },
          e(ArtworkImage, { art: featuredArt, priority: true })
        ),
        e("div", { className: "lobby-showcase__badge" },
          e(Icon, { name: "star", size: 16, color: "#fff" }),
          e("span", null, "작품 ", window.ARTWORKS.length, "장")
        )
      ),
      e("div", { className: "lobby-theme-row", "aria-label": "특징" },
        ["큰 도안", "쉬운 색칠", "완성 보관"].map((theme) => e("span", { key: theme }, theme))
      ),
      e("div", { className: "lobby-palette", "aria-hidden": "true" }, PALETTE.slice(0, 6).map((p) => e("span", { key: p.c, style: { background: p.c } }))),
      e("div", { className: "lobby-actions" },
        e("button", { className: "lobby-start-btn", onClick: onStart }, "그림 고르기"),
        e("button", { className: "lobby-guide-btn", onClick: openGuide }, e(Icon, { name: "pencil", size: 18, color: "#7C695E" }), "방법")
      )
    ),
    showGuide && e(HowToModal, { featuredArt, onClose: closeGuide })
  );
}
function HomeScreen({ onPick, onGallery, onSettings, artworksList, progress, galleryCount }) {
  const e = React.createElement;
  const [cat, setCat] = React.useState("전체");
  const list = artworksList.filter((a) => cat === "전체" || a.category === cat);
  const totalCount = artworksList.length;
  const featuredArt = artworksList[0];
  const summaryArts = artworksList.slice(1, 3);
  const startedCount = artworksList.reduce((count, art) => {
    const saved = progress[art.id];
    return count + (AppStorage.getSavedFills(saved).length > 0 ? 1 : 0);
  }, 0);
  return e("div", { className: "screen home" },
    e("header", { className: "appbar appbar--home" },
      e("div", { className: "appbar__brand" },
        e("span", { className: "appbar__logo" }, e(Icon, { name: "star", size: 24, color: "#fff" })),
        e("h1", { style: { whiteSpace: "nowrap" } }, "오늘의 색칠")
      ),
      e("div", { className: "appbar__right" },
        e("button", { type: "button", className: "appbar__action appbar__settings", onClick: onSettings, "aria-label": "설정" },
          e(Icon, { name: "settings", size: 20 }),
          e("span", { className: "hide-narrow" }, "설정")
        ),
        e("div", { className: "appbar__count" }, totalCount, "장")
      )
    ),
    e("main", { className: "home-panel" },
      e("section", { className: "home-summary", "aria-label": "그림 선택" },
        e("div", { className: "home-preview-showcase", "aria-hidden": "true" },
          featuredArt && e(FinishedThumb, { art: featuredArt, limit: 90 }),
          e("span", null, "추천")
        ),
        e("div", { className: "home-summary__copy" },
          e("span", { className: "home-summary__eyebrow" }, "추천"),
          e("h2", null, "한 장 골라보기"),
          e("p", null, "색을 고르면 바로 시작해요."),
          e("div", { className: "home-summary__actions" },
            featuredArt && e("button", { className: "home-summary__start", type: "button", onClick: () => onPick(featuredArt.id) },
              e(Icon, { name: "pencil", size: 18 }),
              e("span", null, "색칠 시작")
            ),
            e("button", { className: "home-summary__gallery", type: "button", onClick: onGallery },
              e(Icon, { name: "star", size: 18 }),
              e("span", null, "보관 ", galleryCount, "점")
            )
          )
        ),
        e("div", { className: "home-summary__stack", "aria-hidden": "true" },
          summaryArts.map((art) => e("div", { key: art.id, className: "home-summary__mini" },
            e(ArtworkImage, { art })
          ))
        )
      ),
      e("section", { className: "home-library-strip", "aria-label": "작품 현황" },
        e("div", null, e("span", null, "작품"), e("strong", null, totalCount, "장")),
        e("div", null, e("span", null, "진행"), e("strong", null, startedCount, "장")),
        e("div", null, e("span", null, "보관"), e("strong", null, galleryCount, "점"))
      ),
      e("div", { className: "cats" },
        window.CATEGORIES.map((c) => e("button", { key: c, className: "cat" + (c === cat ? " cat--on" : ""), onClick: () => setCat(c) }, c === "전체" ? "전체" : c))
      ),
      e("div", { className: "prompt" },
        e("span", null, cat === "전체" ? "전체 작품" : cat),
        e("em", null, list.length, "장")
      ),
      e("div", { className: "cardgrid" }, list.map((a, idx) => {
        const pr = progress[a.id];
        const fillsArray = AppStorage.getSavedFills(pr);
        const hasStarted = fillsArray.length > 0;
        return e("button", { key: a.id, className: "artcard" + (hasStarted ? " artcard--started" : ""), onClick: () => onPick(a.id) },
          e("div", { className: "artcard__thumb" },
            e(Thumb, { art: a, fills: fillsArray, lightweight: true, priority: idx < 6 })
          ),
          e("div", { className: "artcard__body" },
            e("div", { className: "artcard__label" }, a.title),
            e("div", { className: "artcard__hint" }, hasStarted ? "이어 색칠하기" : getThemeHint(a.category))
          )
        );
      }))
    )
  );
}
function GalleryScreen({ items, onBack, onView }) {
  const e = React.createElement;
  const latest = items[0];
  const latestArt = latest ? getArtworkById(latest.artId) : window.ARTWORKS[0];
  return e("div", { className: "screen gallery " + (items.length === 0 ? "gallery--empty" : "gallery--filled") },
    e("header", { className: "appbar" },
      e("div", { className: "appbar__brand" },
        e("span", { className: "appbar__logo" }, e(Icon, { name: "star", size: 24, color: "#fff" })),
        e("h1", { style: { whiteSpace: "nowrap" } }, "내 갤러리")
      ),
      e("button", { className: "appbar__action", onClick: onBack },
        e(Icon, { name: "grid", size: 22 }),
        e("span", null, "작품")
      )
    ),
    e("section", { className: "gallery-summary", "aria-label": "갤러리 요약" },
      e("div", { className: "gallery-summary__thumb", "aria-hidden": "true" },
        latestArt && latest ? e(Thumb, { art: latestArt, fills: latest.fills, snapshotDataUrl: latest.snapshotDataUrl }) : e(Thumb, { art: latestArt })
      ),
      e("div", { className: "gallery-summary__copy" },
        e("span", { className: "gallery-summary__eyebrow" }, items.length > 0 ? "최근 보관" : "준비 중"),
        e("h2", null, items.length > 0 && latestArt ? latestArt.title : "첫 작품 준비"),
        e("p", null, items.length > 0 ? "완성작 " + items.length + "점을 보관 중이에요." : "보관하면 여기서 다시 볼 수 있어요.")
      ),
      e("div", { className: "gallery-summary__count" }, items.length, "점")
    ),
    items.length === 0 ? e("div", { className: "empty empty--gallery" },
      e("div", { className: "empty__art" }, e(Thumb, { art: window.ARTWORKS[0] })),
      e("p", { className: "empty__title" }, "아직 보관한 작품이 없어요"),
      e("p", { className: "empty__sub" }, "마음에 드는 도안을 골라 첫 작품을 완성해보세요."),
      e(BigButton, { icon: "plus", onClick: onBack }, "작품 고르기")
    ) : e("div", { className: "cardgrid" }, items.map((it) => {
    const art = getArtworkById(it.artId);
    if (!art) return null;
    return e("button", { key: it.id, type: "button", className: "artcard gallery-card", onClick: () => onView(it), "aria-label": art.title + " 보기" },
      e("div", { className: "artcard__thumb" },
        e(Thumb, { art, fills: it.fills, snapshotDataUrl: it.snapshotDataUrl })
      ),
      e("div", { className: "artcard__body gallery-card__body" },
        e("div", null,
          e("div", { className: "artcard__label" }, art.title),
          e("div", { className: "artcard__date" }, new Date(it.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }))
        )
      )
    );
    }))
  );
}
const DIALOG_FOCUS_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");
function getDialogFocusables(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(DIALOG_FOCUS_SELECTOR)).filter((el) => {
    return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
  });
}
function useDialogKeyboard(dialogRef, onClose) {
  React.useEffect(() => {
    const previousFocus = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      const focusables = getDialogFocusables(dialogRef.current);
      const target = focusables[0] || dialogRef.current;
      if (target && typeof target.focus === "function") target.focus();
    }, 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = getDialogFocusables(dialogRef.current);
      if (!focusables.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus && document.contains(previousFocus) && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [dialogRef, onClose]);
}
function ConfirmDialog({ title, message, confirmLabel = "확인", cancelLabel = "취소", danger = false, icon, onConfirm, onCancel }) {
  const e = React.createElement;
  const dialogRef = React.useRef(null);
  const iconName = icon || (danger ? "trash" : "check");
  useDialogKeyboard(dialogRef, onCancel);
  return e("div", { className: "confirm-layer", role: "presentation", onClick: onCancel },
    e("section", { ref: dialogRef, tabIndex: -1, className: "confirm-card", role: "dialog", "aria-modal": "true", "aria-label": title, onClick: (event) => event.stopPropagation() },
      e("div", { className: "confirm-card__icon " + (danger ? "confirm-card__icon--danger" : "") },
        e(Icon, { name: iconName, size: 24 })
      ),
      e("h2", { className: "confirm-card__title" }, title),
      e("p", { className: "confirm-card__message" }, message),
      e("div", { className: "confirm-card__actions" },
        e("button", { type: "button", className: "confirm-card__btn confirm-card__btn--ghost", onClick: onCancel }, cancelLabel),
        e("button", { type: "button", className: "confirm-card__btn " + (danger ? "confirm-card__btn--danger" : "confirm-card__btn--primary"), onClick: onConfirm }, confirmLabel)
      )
    )
  );
}
const FONT_SCALE_OPTIONS = [
  { label: "보통", value: 1 },
  { label: "크게", value: 1.12 },
  { label: "아주 크게", value: 1.24 }
];
const THEME_OPTIONS = [
  { label: "기본", value: "따뜻" },
  { label: "차분", value: "차분" },
  { label: "고대비", value: "고대비" }
];
function SettingsDialog({ settings, onChange, onClose }) {
  const e = React.createElement;
  const dialogRef = React.useRef(null);
  const fontScale = settings && settings.fontScale ? settings.fontScale : 1;
  const theme = settings && settings.theme ? settings.theme : "따뜻";
  const paintFeedback = !settings || settings.paintFeedback !== false;
  useDialogKeyboard(dialogRef, onClose);
  return e("div", { className: "confirm-layer settings-layer", role: "presentation", onClick: onClose },
    e("section", { ref: dialogRef, tabIndex: -1, className: "settings-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "settings-title", onClick: (event) => event.stopPropagation() },
      e("div", { className: "settings-card__top" },
        e("h2", { id: "settings-title", className: "settings-card__title" }, "설정"),
        e("button", { type: "button", className: "settings-card__close", onClick: onClose, "aria-label": "설정 닫기" },
          e(Icon, { name: "check", size: 20 })
        )
      ),
      e("fieldset", { className: "settings-field" },
        e("legend", null, "글씨 크기"),
        e("div", { className: "settings-segment", role: "group", "aria-label": "글씨 크기" },
          FONT_SCALE_OPTIONS.map((option) => {
            const selected = Math.abs(fontScale - option.value) < 0.001;
            return e("button", {
              key: option.value,
              type: "button",
              className: "settings-segment__btn" + (selected ? " settings-segment__btn--on" : ""),
              "aria-pressed": selected,
              onClick: () => onChange({ fontScale: option.value })
            }, option.label);
          })
        )
      ),
      e("fieldset", { className: "settings-field" },
        e("legend", null, "화면 색감"),
        e("div", { className: "settings-segment", role: "group", "aria-label": "화면 색감" },
          THEME_OPTIONS.map((option) => {
            const selected = theme === option.value;
            return e("button", {
              key: option.value,
              type: "button",
              className: "settings-segment__btn" + (selected ? " settings-segment__btn--on" : ""),
              "aria-pressed": selected,
              onClick: () => onChange({ theme: option.value })
            }, option.label);
          })
        )
      ),
      e("fieldset", { className: "settings-field" },
        e("legend", null, "색칠 반응"),
        e("label", { className: "settings-toggle" },
          e("span", { className: "settings-toggle__text" }, "표시"),
          e("input", {
            className: "settings-toggle__input",
            type: "checkbox",
            checked: paintFeedback,
            onChange: (event) => onChange({ paintFeedback: event.target.checked })
          }),
          e("span", { className: "settings-toggle__track", "aria-hidden": "true" },
            e("span", { className: "settings-toggle__thumb" })
          )
        )
      ),
      e("p", { className: "settings-preview", "aria-live": "polite" }, "오늘의 색칠")
    )
  );
}
function ColorToolbelt({ hasHistory, isZoomed, onUndo, onReset, onZoom }) {
  const e = React.createElement;
  return e("div", { className: "color-toolbelt", style: { zIndex: 18 } },
    e("button", { className: "color-toolbelt__btn", onClick: onUndo, disabled: !hasHistory, "aria-label": "\uB418\uB3CC\uB9AC\uAE30", title: "\uB418\uB3CC\uB9AC\uAE30" },
      e(Icon, { name: "undo", size: 19 }),
      e("span", { className: "color-toolbelt__label" }, "\uB418\uB3CC\uB9AC\uAE30")
    ),
    e("button", { className: "color-toolbelt__btn", onClick: onReset, "aria-label": "\uCC98\uC74C\uBD80\uD130", title: "\uCC98\uC74C\uBD80\uD130" },
      e(Icon, { name: "reset", size: 19 }),
      e("span", { className: "color-toolbelt__label" }, "\uCC98\uC74C\uBD80\uD130")
    ),
    e("button", { className: "color-toolbelt__btn", onClick: onZoom, "aria-label": isZoomed ? "\uCD95\uC18C\uD558\uAE30" : "\uD06C\uAC8C \uBCF4\uAE30", title: isZoomed ? "\uCD95\uC18C\uD558\uAE30" : "\uD06C\uAC8C \uBCF4\uAE30" },
      e(Icon, { name: isZoomed ? "zoomOut" : "zoomIn", size: 19 }),
      e("span", { className: "color-toolbelt__label" }, isZoomed ? "\uCD95\uC18C\uD558\uAE30" : "\uD06C\uAC8C \uBCF4\uAE30")
    )
  );
}
function ColoringScreen({ art, fills, history, selected, onSelect, onPaint, onHistoryChange, onExit, onFinish, tweaks }) {
  const e = React.createElement;
  const orient = useOrientation();
  const layout = orient === "landscape" ? "side" : "bottom";
  const containerRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const historyStack = Array.isArray(history) ? history : [];
  const [aspect, setAspect] = React.useState(1);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  React.useEffect(() => {
    if (scale === 1) {
      setOffset({ x: 0, y: 0 });
      setIsPanning(false);
    }
  }, [scale]);
  const getPanBounds = (nextScale) => {
    const container = containerRef.current;
    const inner = container?.querySelector(".canvasinner");
    if (!container || !inner) return null;
    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padRight = parseFloat(style.paddingRight) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const viewportW = Math.max(1, rect.width - padLeft - padRight);
    const viewportH = Math.max(1, rect.height - padTop - padBottom);
    const baseLeft = inner.offsetLeft;
    const baseTop = inner.offsetTop;
    const scaledW = inner.offsetWidth * nextScale;
    const scaledH = inner.offsetHeight * nextScale;
    const centerX = padLeft + (viewportW - scaledW) / 2 - baseLeft;
    const centerY = padTop + (viewportH - scaledH) / 2 - baseTop;
    const minX = scaledW <= viewportW ? centerX : padLeft + viewportW - baseLeft - scaledW;
    const maxX = scaledW <= viewportW ? centerX : padLeft - baseLeft;
    const minY = scaledH <= viewportH ? centerY : padTop + viewportH - baseTop - scaledH;
    const maxY = scaledH <= viewportH ? centerY : padTop - baseTop;
    return { minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
  };
  const clampPan = (nextOffset, nextScale = scale) => {
    if (nextScale <= 1) return { x: 0, y: 0 };
    const bounds = getPanBounds(nextScale);
    if (!bounds) return nextOffset;
    return {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, nextOffset.x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, nextOffset.y))
    };
  };
  const centeredPan = (nextScale) => {
    const bounds = getPanBounds(nextScale);
    return bounds ? { x: bounds.centerX, y: bounds.centerY } : { x: -180, y: -180 };
  };
  const touchStartRef = React.useRef({
    distance: 0,
    scale: 1,
    offset: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
    isPinching: false,
    isDragging: false
  });
  const lastDragTimeRef = React.useRef(0);
  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastDragTimeRef.current = Date.now();
  };
  const toggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      const nextScale = 2.2;
      setScale(nextScale);
      setOffset(clampPan(centeredPan(nextScale), nextScale));
    }
    lastDragTimeRef.current = Date.now();
  };
  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const prevFills = historyStack[historyStack.length - 1];
    onHistoryChange(historyStack.slice(0, -1));
    onPaint(prevFills);
  };
  const handleReset = () => {
    setResetConfirmOpen(true);
  };
  const confirmReset = () => {
    onPaint([]);
    onHistoryChange([]);
    setResetConfirmOpen(false);
  };
  const handleCanvasPaint = (newFills) => {
    if (Date.now() - lastDragTimeRef.current < 120) return false;
    onHistoryChange((prev) => [...(Array.isArray(prev) ? prev : []), Array.isArray(fills) ? [...fills] : []]);
    onPaint(newFills);
    return true;
  };
  const canCanvasPaint = () => Date.now() - lastDragTimeRef.current >= 120;
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const getTouchDist = (t1, t2) => {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };
    const getTouchCenter = (t1, t2) => {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    };
    const handleTouchStart = (e) => {
      const state = touchStartRef.current;
      if (e.touches.length === 2) {
        e.preventDefault();
        state.isPinching = true;
        state.isDragging = false;
        state.distance = getTouchDist(e.touches[0], e.touches[1]);
        state.scale = scale;
        state.offset = { ...offset };
        state.center = getTouchCenter(e.touches[0], e.touches[1]);
      } else if (e.touches.length === 1) {
        state.isPinching = false;
        state.isDragging = false;
        state.pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        state.startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        state.offset = { ...offset };
      }
    };
    const handleTouchMove = (e) => {
      const state = touchStartRef.current;
      if (e.touches.length === 2 && state.isPinching) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const nextScale = Math.max(1, Math.min(5, state.scale * (dist / state.distance)));
        const scaleRatio = nextScale / state.scale;
        const rect = containerRef.current.getBoundingClientRect();
        const canvasRect = containerRef.current.querySelector(".canvasinner")?.getBoundingClientRect();
        const cw = canvasRect?.width || Math.min(rect.width * 0.85, rect.height * 0.85, 760);
        const childLeft = canvasRect ? canvasRect.left - rect.left : (rect.width - cw) / 2;
        const childTop = canvasRect ? canvasRect.top - rect.top : (rect.height - cw) / 2;
        const mx = state.center.x - rect.left - childLeft;
        const my = state.center.y - rect.top - childTop;
        const dx = center.x - state.center.x;
        const dy = center.y - state.center.y;
        setScale(nextScale);
        setOffset(clampPan({
          x: mx - (mx - state.offset.x) * scaleRatio + dx,
          y: my - (my - state.offset.y) * scaleRatio + dy
        }, nextScale));
        lastDragTimeRef.current = Date.now();
      } else if (e.touches.length === 1 && !state.isPinching) {
        const dx = e.touches[0].clientX - state.startPos.x;
        const dy = e.touches[0].clientY - state.startPos.y;
        const moveDist = Math.hypot(dx, dy);
        if (moveDist > 8) {
          state.isDragging = true;
          if (scale > 1) {
            e.preventDefault();
            const curDx = e.touches[0].clientX - state.pos.x;
            const curDy = e.touches[0].clientY - state.pos.y;
            setOffset((prev) => clampPan({
              x: prev.x + curDx,
              y: prev.y + curDy
            }, scale));
            state.pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
          lastDragTimeRef.current = Date.now();
        }
      }
    };
    const handleTouchEnd = () => {
      const state = touchStartRef.current;
      state.isPinching = false;
      state.isDragging = false;
    };
    let isMouseDown = false;
    let startMousePos = { x: 0, y: 0 };
    let startMouseOffset = { x: 0, y: 0 };
    const handleMouseDown = (e) => {
      if (scale > 1) {
        isMouseDown = true;
        setIsPanning(true);
        startMousePos = { x: e.clientX, y: e.clientY };
        startMouseOffset = { ...offset };
      }
    };
    const handleMouseMove = (e) => {
      if (isMouseDown) {
        const dx = e.clientX - startMousePos.x;
        const dy = e.clientY - startMousePos.y;
        if (Math.hypot(dx, dy) > 5) {
          setOffset(clampPan({
            x: startMouseOffset.x + dx,
            y: startMouseOffset.y + dy
          }, scale));
          lastDragTimeRef.current = Date.now();
        }
      }
    };
    const handleMouseUp = () => {
      isMouseDown = false;
      setIsPanning(false);
    };
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSensitivity = 2e-3;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(1, Math.min(5, scale * (1 + delta)));
      if (newScale !== scale) {
        const rect = container.getBoundingClientRect();
        const canvasRect = container.querySelector(".canvasinner")?.getBoundingClientRect();
        const cw = canvasRect?.width || Math.min(rect.width * 0.85, rect.height * 0.85, 760);
        const childLeft = canvasRect ? canvasRect.left - rect.left : (rect.width - cw) / 2;
        const childTop = canvasRect ? canvasRect.top - rect.top : (rect.height - cw) / 2;
        const mx = e.clientX - rect.left - childLeft;
        const my = e.clientY - rect.top - childTop;
        const scaleRatio = newScale / scale;
        setOffset(clampPan({
          x: mx - (mx - offset.x) * scaleRatio,
          y: my - (my - offset.y) * scaleRatio
        }, newScale));
        setScale(newScale);
      }
    };
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [scale, offset]);
  React.useEffect(() => {
    const keepInBounds = () => {
      setOffset((prev) => clampPan(prev, scale));
    };
    keepInBounds();
    window.addEventListener("resize", keepInBounds);
    return () => window.removeEventListener("resize", keepInBounds);
  }, [scale, aspect, layout]);
  const hasHistory = historyStack.length > 0;
  const pageAspect = aspect >= 0.92 ? (layout === "side" ? 0.86 : 0.75) : aspect;
  const bottomChrome = window.innerWidth >= 768 ? 250 : 268;
  const selectedColorName = PALETTE.find((p) => p.c === selected)?.name || "";
  return e("div", { className: "screen color color--" + layout },
    e("header", { className: "appbar appbar--color", style: { position: "relative" } },
      e("button", { className: "appbar__back", onClick: onExit },
        e(Icon, { name: "back", size: 28 }),
        e("span", { className: "hide-narrow" }, "목록")
      ),
      e("div", { className: "appbar__center-txt appbar__center-title" }, art.title),
      e("div", { className: "appbar__tools appbar__tools--color" },
        e("button", { className: "appbar__save", onClick: onFinish },
          e(Icon, { name: "check", size: 19 }),
          e("span", null, "완성하기")
        )
      )
    ),
    e("div", { className: "colorbody", style: { position: "relative", overflow: "hidden" } },
      e("div", {
        className: "canvaswrap",
        ref: containerRef,
        style: { width: "100%", height: "100%", touchAction: "none", overflow: "hidden", cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "crosshair" }
      },
        e("div", {
          className: "canvasinner",
          style: {
            width: layout === "side" ? `min(100%, calc((100dvh - 84px) * ${pageAspect}), calc(100dvw - var(--color-side-reserved, 320px)), var(--color-canvas-max-side, 920px))` : `min(calc(100dvw - 10px), calc((100dvh - ${bottomChrome}px) * ${pageAspect}), var(--color-canvas-max-bottom, 680px))`,
            aspectRatio: pageAspect,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: touchStartRef.current.isPinching || touchStartRef.current.isDragging ? "none" : "transform 0.15s ease-out",
            willChange: "transform"
          }
        },
          e(CanvasArt, { art, fills, onPaint: handleCanvasPaint, selected, interactive: true, frameMode: "paint", canPaint: canCanvasPaint, paintFeedback: tweaks.paintFeedback !== false, onImageLoad: ({ width, height }) => setAspect(width / height) })
        )
      ),
      e("div", { className: "palettezone palettezone--" + layout, style: { zIndex: 20 } },
        e("div", { className: "color-controls" },
          e("div", { className: "curcolor", "aria-label": "\uC120\uD0DD\uD55C \uC0C9 " + selectedColorName, style: { background: selected, borderColor: isLight(selected) ? "rgba(74,64,54,.3)" : "transparent" } },
            e("span", { className: "curcolor__brush", "aria-hidden": "true" }, e(Icon, { name: "brush", size: 18, color: isLight(selected) ? "#4A4036" : "#fff" })),
            e("span", { className: "curcolor__name", style: { color: isLight(selected) ? "#4A4036" : "#fff" } }, selectedColorName)
          ),
          e(ColorToolbelt, { hasHistory, isZoomed: scale > 1, onUndo: handleUndo, onReset: handleReset, onZoom: toggleZoom })
        ),
        e(Palette, { selected, onSelect, layout })
      )
    ),
    resetConfirmOpen && e(ConfirmDialog, { title: "처음부터 색칠할까요?", message: "지금 작품의 색칠 기록만 지워져요.", confirmLabel: "초기화", cancelLabel: "계속 색칠", danger: true, icon: "reset", onConfirm: confirmReset, onCancel: () => setResetConfirmOpen(false) })
  );
}
function CompletionScreen({ art, fills, onSave, onKeep, onNew, onBack, saved }) {
  const e = React.createElement;
  const fillCount = Array.isArray(fills) ? fills.length : 0;
  return e("div", { className: "screen completion" },
    e(Confetti, null),
    e("div", { className: "completion__inner" },
      e("div", { className: "completion__header" },
        e("p", { className: "completion__eyebrow" }, e(Icon, { name: saved ? "check" : "star", size: 20, color: "var(--ok)" }), saved ? " 보관 완료" : " 완성"),
        e("h2", { className: "completion__title" }, saved ? "갤러리에 담았어요" : "작품이 완성됐어요"),
        e("p", { className: "completion__sub" }, saved ? "이미지로 저장하거나 다음 작품을 골라보세요." : "보관하거나 이미지로 저장할 수 있어요."),
        e("div", { className: "completion__certificate", "aria-label": "완성 작품 정보" },
          e("span", null, saved ? "보관 작품" : "완성 작품"),
          e("strong", null, art.title),
          e("small", null, fillCount, "번의 색칠 기록")
        )
      ),
      e("div", { className: "completion__art-stage" },
        e("div", { className: "completion__frame completion__frame--magic" }, e(CanvasArt, { art, fills, interactive: false, frameMode: "paint" }))
      ),
      e("div", { className: "completion__actions" },
        e("div", { className: "completion__btns" },
          !saved ? e(BigButton, { icon: "check", onClick: onKeep }, "갤러리에 보관") : e(BigButton, { icon: "save", onClick: onSave }, "이미지 저장"),
          !saved ? e("div", { className: "completion__row" },
            e(BigButton, { icon: "save", onClick: onSave, variant: "soft" }, "이미지 저장"),
            e(BigButton, { icon: "plus", onClick: onNew, variant: "ghost" }, "새 작품")
          ) : e("div", { className: "completion__row" },
            e(BigButton, { icon: "star", onClick: onNew, variant: "soft" }, "새 작품"),
            e(BigButton, { onClick: onBack, variant: "ghost" }, "더 칠하기")
          ),
          !saved && e("button", { className: "completion__textbtn", type: "button", onClick: onBack }, "더 칠하기")
        )
      )
    )
  );
}
function ViewScreen({ item, onBack, onSave, onRecolor, onDelete }) {
  const art = getArtworkById(item.artId);
  if (!art) return null;
  const e = React.createElement;
  return e("div", { className: "screen completion completion--view" },
    e("div", { className: "completion__inner" },
      e("div", { className: "completion__header" },
        e("p", { className: "completion__eyebrow" }, art.title),
        e("h2", { className: "completion__title" }, new Date(item.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }), " 완성"),
        e("div", { className: "completion__certificate completion__certificate--view", "aria-label": "갤러리 작품 정보" },
          e("span", null, "보관 작품"),
          e("strong", null, art.title),
          e("small", null, (item.fills || []).length, "번의 색칠 기록")
        )
      ),
      e("div", { className: "completion__art-stage" },
        e("div", { className: "completion__frame" },
          item.snapshotDataUrl ? e(SnapshotImage, { src: item.snapshotDataUrl, priority: true }) : e(CanvasArt, { art, fills: item.fills, interactive: false, frameMode: "paint" })
        )
      ),
      e("div", { className: "completion__actions" },
        e("div", { className: "completion__btns" },
          e("div", { className: "completion__row" },
            e(BigButton, { icon: "save", onClick: onSave }, "이미지 저장"),
            e(BigButton, { icon: "trash", onClick: () => onDelete(item.id), variant: "danger" }, "삭제")
          ),
          e("div", { className: "completion__row" },
            e(BigButton, { onClick: onBack, variant: "ghost" }, "보관함으로"),
            e(BigButton, { onClick: onRecolor, variant: "soft" }, "다시 색칠")
          )
        )
      )
    )
  );
}
function BottomNav({ active, galleryCount, onHome, onGallery }) {
  const items = [
    { key: "home", label: "\uC791\uD488", icon: "grid", onClick: onHome },
    { key: "gallery", label: "\uAC24\uB7EC\uB9AC", icon: "star", onClick: onGallery, count: galleryCount }
  ];
  return /* @__PURE__ */ React.createElement("nav", { className: "bottom-nav", "aria-label": "\uD558\uB2E8 \uC774\uB3D9" }, items.map((item) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: item.key,
      className: "bottom-nav__item" + (active === item.key ? " bottom-nav__item--on" : ""),
      onClick: item.onClick,
      type: "button"
    },
    /* @__PURE__ */ React.createElement("span", { className: "bottom-nav__icon" }, /* @__PURE__ */ React.createElement(Icon, { name: item.icon, size: 24 })),
    /* @__PURE__ */ React.createElement("span", { className: "bottom-nav__label" }, item.label),
    !!item.count && /* @__PURE__ */ React.createElement("span", { className: "bottom-nav__badge" }, item.count)
  )));
}
function renderArtworkDataUrl(art, fills, options = {}) {
  const mimeType = options.mimeType || "image/png";
  const quality = options.quality;
  const maxSide = options.maxSide || 0;
  return loadArtworkBitmap(art.src).then(async (img) => {
    const canvas = document.createElement("canvas");
    const frame = createSafeArtworkCanvas(img, art.src, art.layout, { mode: "paint" });
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(frame.canvas, 0, 0);
    const baseImgData = ctx.getImageData(0, 0, frame.width, frame.height);
    const baseData = new Uint8ClampedArray(baseImgData.data);
    const immutableBaseImgData = { data: baseData, width: frame.width, height: frame.height };
    const precomputedLineLayer = await loadPrecomputedPaintLineLayer(art, frame.width, frame.height, "paint");
    const lineLayer = precomputedLineLayer || buildLineLayerImageData(immutableBaseImgData);
    const fillsArray = Array.isArray(fills) ? fills : [];
    const regionMap = await loadPaintRegionMapForFrame(art, frame.width, frame.height, "paint", immutableBaseImgData);
    const cacheKey = getPaintLayerStateCacheKey(art, "paint", frame.width, frame.height, fillsArray);
    const { fillLayer } = getOrBuildPaintLayerState(
      cacheKey,
      () => buildPaintLayerState(immutableBaseImgData, fillsArray, frame, regionMap)
    );
    const composed = composePaintLayers(immutableBaseImgData, fillLayer, lineLayer);
    ctx.putImageData(composed, 0, 0);
    let outputCanvas = canvas;
    if (maxSide > 0 && Math.max(canvas.width, canvas.height) > maxSide) {
      const scale = maxSide / Math.max(canvas.width, canvas.height);
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      scaledCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      const scaledCtx = scaledCanvas.getContext("2d");
      scaledCtx.imageSmoothingEnabled = true;
      scaledCtx.imageSmoothingQuality = "high";
      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      outputCanvas = scaledCanvas;
    }
    return {
      dataUrl: quality ? outputCanvas.toDataURL(mimeType, quality) : outputCanvas.toDataURL(mimeType),
      width: outputCanvas.width,
      height: outputCanvas.height
    };
  });
}
function createGallerySnapshotDataUrl(art, fills) {
  return renderArtworkDataUrl(art, fills, { maxSide: 420, mimeType: "image/webp", quality: 0.74 }).then((snapshot) => snapshot.dataUrl);
}
function downloadCanvasPng(art, fills) {
  return renderArtworkDataUrl(art, fills).then(({ dataUrl }) => {
    const fileName = getArtworkFileName(art);
    if (!postImageToNativeBridge(dataUrl, fileName, art)) {
      triggerBrowserDownload(dataUrl, fileName);
    }
  });
}
const TWEAK_DEFAULTS = {
  "palettePos": "\uC790\uB3D9",
  "paintMode": "\uD0ED",
  "fontScale": 1,
  "theme": "\uB530\uB73B",
  "paintFeedback": true
};
function isAppDisplayMode() {
  const matchesDisplayMode = (query) => {
    return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  };
  return Boolean(
    window.navigator.standalone ||
    matchesDisplayMode("(display-mode: fullscreen)") ||
    matchesDisplayMode("(display-mode: standalone)")
  );
}
function shouldLockPortraitOrientation() {
  return Math.min(window.innerWidth || 0, window.innerHeight || 0) < 768;
}
function releaseOrientationLock() {
  const orientation = window.screen && window.screen.orientation;
  if (!orientation || !orientation.unlock) return false;
  try {
    orientation.unlock();
    return true;
  } catch (_) {
    return false;
  }
}
function applyOrientationPolicy() {
  const orientation = window.screen && window.screen.orientation;
  if (!orientation || !orientation.lock) {
    return Promise.resolve(false);
  }
  if (!shouldLockPortraitOrientation()) {
    return Promise.resolve(releaseOrientationLock());
  }
  try {
    return Promise.resolve(orientation.lock("portrait-primary"))
      .then(() => true)
      .catch(() => Promise.resolve(orientation.lock("portrait")).then(() => true).catch(() => false));
  } catch (_) {
    return Promise.resolve(false);
  }
}
function requestAppFullscreen() {
  if (isAppDisplayMode() || document.fullscreenElement) {
    return applyOrientationPolicy();
  }
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
  if (!request) {
    return applyOrientationPolicy();
  }
  try {
    return Promise.resolve(request.call(target))
      .then(() => applyOrientationPolicy().then(() => true))
      .catch(() => applyOrientationPolicy().then(() => false));
  } catch (_) {
    return applyOrientationPolicy();
  }
}
if (window.__COLORING_TEST_HOOKS__) {
  window.__COLORING_TEST_HOOKS__.isAppDisplayMode = isAppDisplayMode;
}
const App = function App() {
  const [screen, setScreen] = React.useState("lobby");
  const [artId, setArtId] = React.useState(null);
  const [fills, setFills] = React.useState([]);
  const [undoHistory, setUndoHistory] = React.useState([]);
  const [settings, setSettings] = React.useState(() => AppStorage.loadSettings());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(PALETTE[0].c);
  const [progress, setProgress] = React.useState(() => AppStorage.loadProgress());
  const [gallery, setGallery] = React.useState(() => AppStorage.loadGallery());
  const [viewItem, setViewItem] = React.useState(null);
  const [justSaved, setJustSaved] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState(null);
  const progressSaveTimerRef = React.useRef(null);
  const pendingProgressRef = React.useRef(null);
  const artworksList = window.ARTWORKS;
  const art = getArtworkById(artId);
  const t = { ...TWEAK_DEFAULTS, ...settings };
  React.useEffect(() => {
    preloadArtworkBitmaps(artworksList.slice(0, 10).map((item) => item.thumbSrc || item.src), { limit: 10, concurrency: 4 });
    preloadArtworkBitmaps(artworksList.slice(0, 3).map((item) => item.src), { limit: 3, concurrency: 1 });
  }, [artworksList]);
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };
  const updateSettings = (patch) => {
    setSettings((current) => {
      const next = AppStorage.createSettings({ ...current, ...patch });
      AppStorage.saveSettings(next);
      return next;
    });
  };
  const flushProgressSave = () => {
    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    if (pendingProgressRef.current) {
      AppStorage.saveProgress(pendingProgressRef.current);
      pendingProgressRef.current = null;
    }
  };
  const scheduleProgressSave = (next) => {
    pendingProgressRef.current = next;
    if (progressSaveTimerRef.current) window.clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = window.setTimeout(() => {
      progressSaveTimerRef.current = null;
      if (!pendingProgressRef.current) return;
      AppStorage.saveProgress(pendingProgressRef.current);
      pendingProgressRef.current = null;
    }, 220);
  };
  React.useEffect(() => {
    return () => flushProgressSave();
  }, []);
  React.useEffect(() => {
    if (screen !== "color" || !artId) {
      flushProgressSave();
      return;
    }
    setProgress((currentProgress) => {
      const fillsArray = Array.isArray(fills) ? fills : [];
      const next = { ...currentProgress };
      if (fillsArray.length === 0) {
        delete next[artId];
      } else {
        next[artId] = AppStorage.createProgressEntry(artId, fillsArray, undoHistory);
      }
      scheduleProgressSave(next);
      return next;
    });
  }, [fills, undoHistory, screen, artId]);
  const startApp = () => {
    requestAppFullscreen().finally(() => setScreen("home"));
  };
  const pickArt = (id) => {
    requestAppFullscreen();
    setArtId(id);
    const saved = progress[id];
    const fillsArray = AppStorage.getSavedFills(saved);
    const savedHistory = AppStorage.getSavedHistory(saved);
    setFills(fillsArray);
    setUndoHistory(savedHistory);
    setJustSaved(false);
    setScreen("color");
  };
  const handlePaintChange = (newFills) => {
    setFills(newFills);
  };
  const finish = () => {
    setScreen("done");
  };
  const keepInGallery = () => {
    if (justSaved || !art) return;
    setJustSaved(true);
    const item = AppStorage.createGalleryItem({ id: "g" + Date.now(), artId, fills, date: Date.now() });
    const next = [item, ...gallery];
    setGallery(next);
    AppStorage.saveGallery(next);
    createGallerySnapshotDataUrl(art, fills).then((snapshotDataUrl) => {
      const itemWithSnapshot = AppStorage.createGalleryItem({ ...item, snapshotDataUrl });
      setGallery((currentGallery) => {
        const updated = currentGallery.map((galleryItem) => galleryItem.id === item.id ? itemWithSnapshot : galleryItem);
        AppStorage.saveGallery(updated);
        return updated;
      });
    }).catch(() => {
    });
  };
  const deleteGalleryItem = (itemId) => {
    const next = gallery.filter((item) => item.id !== itemId);
    setGallery(next);
    AppStorage.saveGallery(next);
    setDeleteConfirmId(null);
    if (viewItem && viewItem.id === itemId) {
      setViewItem(null);
      setScreen("gallery");
    }
    flash("\uAC24\uB7EC\uB9AC\uC5D0\uC11C \uC0AD\uC81C\uD588\uC5B4\uC694");
  };
  const saveArtworkPng = async (targetArt, targetFills) => {
    try {
      await downloadCanvasPng(targetArt, targetFills);
      flash("\uC774\uBBF8\uC9C0\uB97C \uC800\uC7A5\uD588\uC5B4\uC694");
    } catch (_) {
      flash("\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694");
    }
  };
  const savePng = () => saveArtworkPng(art, fills);
  const exitHome = () => {
    setScreen("home");
  };
  const normTweaks = {
    palettePos: t.palettePos === "\uCE21\uBA74" ? "side" : t.palettePos === "\uD558\uB2E8" ? "bottom" : "auto"
  };
  const themeAttr = t.theme === "\uCC28\uBD84" ? "cool" : t.theme === "\uACE0\uB300\uBE44" ? "contrast" : "warm";
  const showBottomNav = ["home", "gallery"].includes(screen);
  const activeNav = screen;
  return /* @__PURE__ */ React.createElement("div", { className: "app app--" + screen, "data-theme": themeAttr, style: { "--fs": t.fontScale } }, screen === "lobby" && /* @__PURE__ */ React.createElement(LobbyScreen, { onStart: startApp }), screen === "home" && /* @__PURE__ */ React.createElement(
    HomeScreen,
    {
      onPick: pickArt,
      onGallery: () => setScreen("gallery"),
      onSettings: () => setSettingsOpen(true),
      artworksList,
      progress,
      galleryCount: gallery.length
    }
  ), screen === "color" && art && /* @__PURE__ */ React.createElement(
    ColoringScreen,
    {
      art,
      fills,
      history: undoHistory,
      selected,
      onSelect: setSelected,
      onPaint: handlePaintChange,
      onHistoryChange: setUndoHistory,
      onExit: exitHome,
      onFinish: finish,
      tweaks: normTweaks
    }
  ), screen === "done" && art && /* @__PURE__ */ React.createElement(
    CompletionScreen,
    {
      art,
      fills,
      saved: justSaved,
      onSave: savePng,
      onKeep: keepInGallery,
      onNew: () => setScreen("home"),
      onBack: () => setScreen("color")
    }
  ), screen === "gallery" && /* @__PURE__ */ React.createElement(
    GalleryScreen,
    {
      items: gallery,
      onBack: () => setScreen("home"),
      onView: (it) => {
        setViewItem(it);
        setScreen("view");
      }
    }
  ), screen === "view" && viewItem && /* @__PURE__ */ React.createElement(
    ViewScreen,
    {
      item: viewItem,
      onBack: () => setScreen("gallery"),
      onSave: () => {
        const a = getArtworkById(viewItem.artId);
        saveArtworkPng(a, viewItem.fills);
      },
      onRecolor: () => {
        setArtId(viewItem.artId);
        setFills(viewItem.fills);
        setUndoHistory([]);
        setJustSaved(false);
        setScreen("color");
      },
      onDelete: setDeleteConfirmId
    }
  ), deleteConfirmId && /* @__PURE__ */ React.createElement(ConfirmDialog, { title: "\uAC24\uB7EC\uB9AC\uC5D0\uC11C \uC0AD\uC81C\uD560\uAE4C\uC694?", message: "\uC0AD\uC81C\uD55C \uC644\uC131\uC791\uC740 \uB2E4\uC2DC \uBCF5\uAD6C\uD560 \uC218 \uC5C6\uC5B4\uC694.", confirmLabel: "\uC0AD\uC81C", cancelLabel: "\uCDE8\uC18C", danger: true, onConfirm: () => deleteGalleryItem(deleteConfirmId), onCancel: () => setDeleteConfirmId(null) }), toast && /* @__PURE__ */ React.createElement("div", { className: "toast toast--" + screen }, toast), showBottomNav && /* @__PURE__ */ React.createElement(
    BottomNav,
    {
      active: activeNav,
      galleryCount: gallery.length,
    onHome: () => setScreen("home"),
      onGallery: () => setScreen("gallery")
    }
  ), settingsOpen && /* @__PURE__ */ React.createElement(SettingsDialog, { settings, onChange: updateSettings, onClose: () => setSettingsOpen(false) }));
};
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
