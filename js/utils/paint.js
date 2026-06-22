(function() {
  function getColorLuminance(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
  }

  // Tuned thresholds for separating fillable paper, soft line edges, and hard ink.
  const PAINT_TUNING = Object.freeze({
    LINE_ALPHA_WHITE_POINT: 248,
    LINE_ALPHA_GAIN: 1.38,
    HARD_LINE_LUMINANCE: 112,
    LINE_CHROMA_LIMIT: 72,
    FLOOD_FILL_TOLERANCE: 95
  });
  const {
    LINE_ALPHA_WHITE_POINT,
    LINE_ALPHA_GAIN,
    HARD_LINE_LUMINANCE,
    LINE_CHROMA_LIMIT,
    FLOOD_FILL_TOLERANCE
  } = PAINT_TUNING;

  function createImageDataLike(width, height, data = null) {
    const pixels = data || new Uint8ClampedArray(width * height * 4);
    if (typeof ImageData !== "undefined") {
      return new ImageData(pixels, width, height);
    }
    return { data: pixels, width, height };
  }

  function getPixelStats(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return {
      max,
      min,
      chroma: max - min,
      luminance: getColorLuminance(r, g, b)
    };
  }

  function isWhiteBaseColor(r, g, b, a) {
    if (a < 50) return false;
    const stats = getPixelStats(r, g, b);
    return stats.min > 238 && stats.luminance > 247 && stats.chroma < 28;
  }

  function isHardLineCoreColor(r, g, b, a) {
    if (a < 50) return false;
    const stats = getPixelStats(r, g, b);
    return stats.luminance <= HARD_LINE_LUMINANCE && stats.chroma <= LINE_CHROMA_LIMIT;
  }

  function getLineAlphaFromColor(r, g, b, a) {
    if (a < 50) return 0;
    const stats = getPixelStats(r, g, b);
    return Math.max(0, Math.min(255, Math.round((LINE_ALPHA_WHITE_POINT - stats.luminance) * LINE_ALPHA_GAIN)));
  }

  function hasHardLineNeighbor(source, width, height, x, y, radius = 2) {
    for (let dy = -radius; dy <= radius; dy++) {
      const py = y + dy;
      if (py < 0 || py >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const px = x + dx;
        if (px < 0 || px >= width) continue;
        const idx = (py * width + px) * 4;
        if (isHardLineCoreColor(source[idx], source[idx + 1], source[idx + 2], source[idx + 3])) return true;
      }
    }
    return false;
  }

  function getLineAlphaForBasePixel(source, width, height, x, y) {
    const idx = (y * width + x) * 4;
    const r = source[idx];
    const g = source[idx + 1];
    const b = source[idx + 2];
    const a = source[idx + 3];
    if (isHardLineCoreColor(r, g, b, a)) return getLineAlphaFromColor(r, g, b, a);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = getColorLuminance(r, g, b);
    if (min >= 246 && luminance >= 248 && max - min <= 18) return 0;
    if (max - min > LINE_CHROMA_LIMIT || luminance <= HARD_LINE_LUMINANCE || luminance >= LINE_ALPHA_WHITE_POINT) return 0;
    return hasHardLineNeighbor(source, width, height, x, y) ? getLineAlphaFromColor(r, g, b, a) : 0;
  }

  function isFloodFillBasePixel(data, width, height, x, y) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (isWhiteBaseColor(r, g, b, a)) return true;
    return getLineAlphaForBasePixel(data, width, height, x, y) > 0 && !isHardLineCoreColor(r, g, b, a);
  }

  function buildLineLayerImageData(baseImageData) {
    const width = baseImageData.width;
    const height = baseImageData.height;
    const source = baseImageData.data;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let idx = 0; idx < data.length; idx += 4) {
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = getLineAlphaForBasePixel(source, width, height, (idx / 4) % width, Math.floor((idx / 4) / width));
    }
    return createImageDataLike(width, height, data);
  }

  function createFillLayerImageData(width, height) {
    return createImageDataLike(width, height);
  }

  function isValidImageData(imageData) {
    return Boolean(
      imageData &&
      Number.isInteger(imageData.width) &&
      Number.isInteger(imageData.height) &&
      imageData.width > 0 &&
      imageData.height > 0 &&
      imageData.data &&
      imageData.data.length >= imageData.width * imageData.height * 4
    );
  }

  function isValidRgbColor(color) {
    return Boolean(color && Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b));
  }

  function doFloodFill(imageData, startX, startY, fillColor, tolerance = FLOOD_FILL_TOLERANCE, baseData = null) {
    if (!isValidImageData(imageData) || !isValidRgbColor(fillColor)) return null;
    const width = imageData.width;
    const height = imageData.height;
    if (!Number.isInteger(startX) || !Number.isInteger(startY)) return null;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;
    const data = imageData.data;
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const canUseBasePixel = (x, y) => {
      if (!baseData) return true;
      return isFloodFillBasePixel(baseData, width, height, x, y);
    };
    const targetIdx = getPixelIndex(startX, startY);
    if (!canUseBasePixel(startX, startY)) return null;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];
    const fillR = fillColor.r;
    const fillG = fillColor.g;
    const fillB = fillColor.b;
    const colorDist = Math.abs(targetR - fillR) + Math.abs(targetG - fillG) + Math.abs(targetB - fillB);
    if (targetA >= 50 && colorDist < 10) return null;
    const isLinePixel = (r, g, b, a) => {
      if (a < 50) return false;
      return r < 75 && g < 75 && b < 75;
    };
    if (isLinePixel(targetR, targetG, targetB, targetA)) {
      return null;
    }
    const colorMatch = (r, g, b, a, x, y) => {
      if (!canUseBasePixel(x, y)) return false;
      if (isLinePixel(r, g, b, a)) return false;
      if (targetA < 50 || a < 50) return targetA < 50 && a < 50;
      if (targetR > 215 && targetG > 215 && targetB > 215) {
        const isGrayscale = Math.abs(r - g) < 50 && Math.abs(g - b) < 50 && Math.abs(r - b) < 50;
        if (isGrayscale) return r > 185 && g > 185 && b > 185;
      }
      return Math.abs(r - targetR) <= tolerance && Math.abs(g - targetG) <= tolerance && Math.abs(b - targetB) <= tolerance;
    };
    const queue = new Int32Array(width * height);
    const visited = new Uint8Array(width * height);
    queue[0] = startY * width + startX;
    visited[queue[0]] = 1;
    let head = 0;
    let tail = 1;
    let painted = 0;
    let minX = startX;
    let minY = startY;
    let maxX = startX;
    let maxY = startY;
    while (head < tail) {
      const pos = queue[head++];
      const cx = pos % width;
      const cy = Math.floor(pos / width);
      const currIdx = pos * 4;
      data[currIdx] = fillR;
      data[currIdx + 1] = fillG;
      data[currIdx + 2] = fillB;
      data[currIdx + 3] = 255;
      painted++;
      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;
      if (cx > maxX) maxX = cx;
      if (cy > maxY) maxY = cy;
      const neighbors = [pos + 1, pos - 1, pos + width, pos - width];
      for (let i = 0; i < neighbors.length; i++) {
        const next = neighbors[i];
        if (next < 0 || next >= visited.length || visited[next]) continue;
        const nx = next % width;
        const ny = Math.floor(next / width);
        if ((i === 0 && nx === 0) || (i === 1 && nx === width - 1)) continue;
        const nIdx = next * 4;
        if (colorMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2], data[nIdx + 3], nx, ny)) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    return { painted, minX, minY, maxX, maxY };
  }

  function fillConnectedRegion(imageData, baseData, seed, fillColor, options = {}) {
    if (!imageData || !seed || !fillColor) return null;
    const tolerance = options.tolerance || FLOOD_FILL_TOLERANCE;
    return doFloodFill(imageData, seed.x, seed.y, fillColor, tolerance, baseData);
  }

  const PROGRESS_MARKER = { r: 18, g: 52, b: 86 };

  function hexToRgb(hex) {
    const raw = String(hex || "").trim().replace(/^#/, "");
    const normalized = raw.length === 3 ? raw.split("").map(function(char) { return char + char; }).join("") : raw;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return { r: 0, g: 0, b: 0 };
    const bigint = parseInt(normalized, 16);
    return { r: bigint >> 16 & 255, g: bigint >> 8 & 255, b: bigint & 255 };
  }

  function isProgressMarked(data, idx) {
    return data[idx] === PROGRESS_MARKER.r && data[idx + 1] === PROGRESS_MARKER.g && data[idx + 2] === PROGRESS_MARKER.b;
  }

  function isLinePixelColor(r, g, b, a) {
    return isHardLineCoreColor(r, g, b, a);
  }

  function isPaintableBasePixel(data, idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    return Boolean(isWhiteBaseColor(r, g, b, a));
  }

  function analyzePaintRegions(baseImageData, width = null, height = null) {
    if (!baseImageData) return [];
    const data = baseImageData.data || baseImageData;
    const sourceWidth = width || baseImageData.width;
    const sourceHeight = height || baseImageData.height;
    if (!data || !sourceWidth || !sourceHeight) return [];
    const visited = new Uint8Array(sourceWidth * sourceHeight);
    const queue = new Int32Array(sourceWidth * sourceHeight);
    const seeds = [];
    const getPixelIndex = (x, y) => (y * sourceWidth + x) * 4;
    for (let y = 4; y < sourceHeight - 4; y += 2) {
      for (let x = 4; x < sourceWidth - 4; x += 2) {
        const vIdx = y * sourceWidth + x;
        if (visited[vIdx]) continue;
        const pIdx = getPixelIndex(x, y);
        if (!isPaintableBasePixel(data, pIdx)) continue;
        let regionSize = 0;
        let isBackground = false;
        let head = 0;
        let tail = 1;
        queue[0] = vIdx;
        visited[vIdx] = 1;
        const enqueueIfPaintable = (nx, ny) => {
          if (nx < 0 || nx >= sourceWidth || ny < 0 || ny >= sourceHeight) return;
          const nvIdx = ny * sourceWidth + nx;
          if (visited[nvIdx]) return;
          if (!isPaintableBasePixel(data, getPixelIndex(nx, ny))) return;
          visited[nvIdx] = 1;
          queue[tail++] = nvIdx;
        };
        while (head < tail) {
          const pos = queue[head++];
          const cx = pos % sourceWidth;
          const cy = Math.floor(pos / sourceWidth);
          regionSize++;
          if (cx <= 35 || cy <= 35 || cx >= sourceWidth - 36 || cy >= sourceHeight - 36) {
            isBackground = true;
          }
          enqueueIfPaintable(cx + 4, cy);
          enqueueIfPaintable(cx - 4, cy);
          enqueueIfPaintable(cx, cy + 4);
          enqueueIfPaintable(cx, cy - 4);
        }
        if (regionSize > 5) {
          seeds.push({ x, y, size: regionSize, isBackground });
        }
      }
    }
    return seeds;
  }

  function isValidRegionMap(regionMap) {
    return Boolean(
      regionMap &&
      Number.isInteger(regionMap.width) &&
      Number.isInteger(regionMap.height) &&
      regionMap.width > 0 &&
      regionMap.height > 0 &&
      regionMap.labels &&
      regionMap.labels.length >= regionMap.width * regionMap.height &&
      Array.isArray(regionMap.regions)
    );
  }

  function buildPaintRegionMap(baseImageData, width = null, height = null) {
    if (!baseImageData) return null;
    const data = baseImageData.data || baseImageData;
    const sourceWidth = width || baseImageData.width;
    const sourceHeight = height || baseImageData.height;
    if (!data || !sourceWidth || !sourceHeight) return null;
    const labels = new Uint32Array(sourceWidth * sourceHeight);
    const queue = new Int32Array(sourceWidth * sourceHeight);
    const regions = [];
    const getPixelIndex = (x, y) => (y * sourceWidth + x) * 4;
    let nextLabel = 1;
    for (let y = 0; y < sourceHeight; y++) {
      for (let x = 0; x < sourceWidth; x++) {
        const startPos = y * sourceWidth + x;
        if (labels[startPos] !== 0) continue;
        if (!isFloodFillBasePixel(data, sourceWidth, sourceHeight, x, y)) continue;
        const label = nextLabel++;
        let head = 0;
        let tail = 1;
        let size = 0;
        let isBackground = false;
        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        queue[0] = startPos;
        labels[startPos] = label;
        while (head < tail) {
          const pos = queue[head++];
          const cx = pos % sourceWidth;
          const cy = Math.floor(pos / sourceWidth);
          size++;
          if (cx < minX) minX = cx;
          if (cy < minY) minY = cy;
          if (cx > maxX) maxX = cx;
          if (cy > maxY) maxY = cy;
          if (cx <= 35 || cy <= 35 || cx >= sourceWidth - 36 || cy >= sourceHeight - 36) {
            isBackground = true;
          }
          const neighbors = [pos + 1, pos - 1, pos + sourceWidth, pos - sourceWidth];
          for (let i = 0; i < neighbors.length; i++) {
            const next = neighbors[i];
            if (next < 0 || next >= labels.length || labels[next] !== 0) continue;
            const nx = next % sourceWidth;
            const ny = Math.floor(next / sourceWidth);
            if ((i === 0 && nx === 0) || (i === 1 && nx === sourceWidth - 1)) continue;
            if (!isFloodFillBasePixel(data, sourceWidth, sourceHeight, nx, ny)) continue;
            labels[next] = label;
            queue[tail++] = next;
          }
        }
        regions.push({ label, x, y, size, isBackground, minX, minY, maxX, maxY });
      }
    }
    return { width: sourceWidth, height: sourceHeight, labels, regions };
  }

  function decodePaintRegionMapImageData(regionMapImageData) {
    if (!isValidImageData(regionMapImageData)) return null;
    const width = regionMapImageData.width;
    const height = regionMapImageData.height;
    const source = regionMapImageData.data;
    const labels = new Uint32Array(width * height);
    const regionByLabel = new Map();
    for (let pos = 0; pos < labels.length; pos++) {
      const idx = pos * 4;
      const label = source[idx] + (source[idx + 1] << 8) + (source[idx + 2] << 16);
      if (!label) continue;
      labels[pos] = label;
      const x = pos % width;
      const y = Math.floor(pos / width);
      let region = regionByLabel.get(label);
      if (!region) {
        region = { label, x, y, size: 0, isBackground: false, minX: x, minY: y, maxX: x, maxY: y };
        regionByLabel.set(label, region);
      }
      region.size++;
      if (x < region.minX) region.minX = x;
      if (y < region.minY) region.minY = y;
      if (x > region.maxX) region.maxX = x;
      if (y > region.maxY) region.maxY = y;
      if (x <= 35 || y <= 35 || x >= width - 36 || y >= height - 36) {
        region.isBackground = true;
      }
    }
    return { width, height, labels, regions: Array.from(regionByLabel.values()).sort((a, b) => a.label - b.label) };
  }

  function getPaintRegionLabel(regionMap, x, y) {
    if (!isValidRegionMap(regionMap)) return 0;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return 0;
    if (x < 0 || x >= regionMap.width || y < 0 || y >= regionMap.height) return 0;
    return regionMap.labels[y * regionMap.width + x] || 0;
  }

  function getPaintRegionByLabel(regionMap, label) {
    if (!isValidRegionMap(regionMap) || !label) return null;
    return regionMap.regions.find((region) => region.label === label) || null;
  }

  function getPaintRegionMapSeeds(regionMap) {
    if (!isValidRegionMap(regionMap)) return [];
    return regionMap.regions
      .filter((region) => region.size > 5)
      .map((region) => ({
        x: region.x,
        y: region.y,
        size: region.size,
        isBackground: region.isBackground,
        label: region.label
      }));
  }

  function fillRegionMapLabel(imageData, regionMap, label, fillColor) {
    if (!isValidImageData(imageData) || !isValidRegionMap(regionMap) || !isValidRgbColor(fillColor) || !label) return null;
    if (imageData.width !== regionMap.width || imageData.height !== regionMap.height) return null;
    const region = getPaintRegionByLabel(regionMap, label);
    if (!region) return null;
    const data = imageData.data;
    const labels = regionMap.labels;
    const bounds = { painted: 0, minX: regionMap.width, minY: regionMap.height, maxX: 0, maxY: 0 };
    for (let y = region.minY; y <= region.maxY; y++) {
      for (let x = region.minX; x <= region.maxX; x++) {
        const pos = y * regionMap.width + x;
        if (labels[pos] !== label) continue;
        const idx = pos * 4;
        data[idx] = fillColor.r;
        data[idx + 1] = fillColor.g;
        data[idx + 2] = fillColor.b;
        data[idx + 3] = 255;
        bounds.painted++;
        if (x < bounds.minX) bounds.minX = x;
        if (y < bounds.minY) bounds.minY = y;
        if (x > bounds.maxX) bounds.maxX = x;
        if (y > bounds.maxY) bounds.maxY = y;
      }
    }
    return bounds.painted > 0 ? bounds : null;
  }

  function paintRegionMapSeed(fillLayerImageData, regionMap, seed, fillColor) {
    if (!seed) return null;
    return fillRegionMapLabel(fillLayerImageData, regionMap, getPaintRegionLabel(regionMap, seed.x, seed.y), fillColor);
  }

  function markProgressRegionMap(imageData, regionMap, x, y) {
    return fillRegionMapLabel(imageData, regionMap, getPaintRegionLabel(regionMap, x, y), PROGRESS_MARKER);
  }

  function findNearestUnpaintedStart(baseData, progressData, width, height, x, y, radius) {
    const canPaint = (px, py) => {
      if (px < 0 || px >= width || py < 0 || py >= height) return false;
      const idx = (py * width + px) * 4;
      return !isProgressMarked(progressData, idx) && isPaintableBasePixel(baseData, idx);
    };
    if (canPaint(x, y)) return { x, y };
    let best = null;
    let bestDistance = Infinity;
    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const px = x + dx;
          const py = y + dy;
          if (!canPaint(px, py)) continue;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            best = { x: px, y: py };
            bestDistance = distance;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function findNearestPaintedStart(baseData, progressData, width, height, x, y, radius) {
    const canRecolor = (px, py) => {
      if (px < 0 || px >= width || py < 0 || py >= height) return false;
      const idx = (py * width + px) * 4;
      return isProgressMarked(progressData, idx) && isPaintableBasePixel(baseData, idx);
    };
    if (canRecolor(x, y)) return { x, y };
    let best = null;
    let bestDistance = Infinity;
    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const px = x + dx;
          const py = y + dy;
          if (!canRecolor(px, py)) continue;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) {
            best = { x: px, y: py };
            bestDistance = distance;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function markProgressRegion(imageData, x, y, baseData = null) {
    fillConnectedRegion(imageData, baseData, { x, y }, PROGRESS_MARKER);
  }

  function paintFillLayerSeed(fillLayerImageData, baseData, seed, fillColor) {
    return fillConnectedRegion(fillLayerImageData, baseData, seed, fillColor);
  }

  function composePaintLayers(baseImageData, fillLayerImageData, lineLayerImageData = null) {
    const width = baseImageData.width;
    const height = baseImageData.height;
    const fillData = fillLayerImageData.data;
    const baseData = baseImageData.data;
    const lineData = lineLayerImageData ? lineLayerImageData.data : buildLineLayerImageData(baseImageData).data;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let idx = 0; idx < data.length; idx += 4) {
      const fillAlpha = fillData[idx + 3] / 255;
      const lineAlpha = lineData[idx + 3] / 255;
      if (fillAlpha === 0) {
        data[idx] = baseData[idx];
        data[idx + 1] = baseData[idx + 1];
        data[idx + 2] = baseData[idx + 2];
        data[idx + 3] = baseData[idx + 3] || 255;
        continue;
      }
      const baseR = 255;
      const baseG = 255;
      const baseB = 255;
      let r = Math.round(fillData[idx] * fillAlpha + baseR * (1 - fillAlpha));
      let g = Math.round(fillData[idx + 1] * fillAlpha + baseG * (1 - fillAlpha));
      let b = Math.round(fillData[idx + 2] * fillAlpha + baseB * (1 - fillAlpha));
      if (lineAlpha > 0) {
        r = Math.round(r * (1 - lineAlpha));
        g = Math.round(g * (1 - lineAlpha));
        b = Math.round(b * (1 - lineAlpha));
      }
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
    return createImageDataLike(width, height, data);
  }

  const safeArtworkFrameCache = new Map();

  function createSafeArtworkCanvas(img, cacheKey = "", layout = null, options = {}) {
    const mode = options.mode || "preview";
    const frameKey = cacheKey ? cacheKey + "::" + mode : "";
    if (frameKey && safeArtworkFrameCache.has(frameKey)) {
      return safeArtworkFrameCache.get(frameKey);
    }
    const width = img.width;
    const height = img.height;
    const padRatio = 0.065;
    const minPad = 32;
    const maxPad = 72;
    const inkPad = mode === "paint" ? 0 : 8;
    const pad = Math.min(maxPad, Math.max(minPad, Math.round(Math.min(width, height) * padRatio)));
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceCtx.fillStyle = "#fff";
    sourceCtx.fillRect(0, 0, width, height);
    sourceCtx.drawImage(img, 0, 0);
    const sourceData = sourceCtx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = sourceData[idx];
        const g = sourceData[idx + 1];
        const b = sourceData[idx + 2];
        const a = sourceData[idx + 3];
        if (a > 50 && r < 190 && g < 190 && b < 190) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const hasInk = maxX >= minX && maxY >= minY;
    const useFullPaintPage = mode === "paint";
    const sourceX = useFullPaintPage ? 0 : hasInk ? Math.max(0, minX - inkPad) : 0;
    const sourceY = useFullPaintPage ? 0 : hasInk ? Math.max(0, minY - inkPad) : 0;
    const sourceW = useFullPaintPage ? width : hasInk ? Math.min(width - sourceX, maxX - minX + inkPad * 2 + 1) : width;
    const sourceH = useFullPaintPage ? height : hasInk ? Math.min(height - sourceY, maxY - minY + inkPad * 2 + 1) : height;
    const innerWidth = Math.max(1, width - pad * 2);
    const innerHeight = Math.max(1, height - pad * 2);
    const layoutScale = layout && layout.scale ? layout.scale : 1;
    const paintPad = mode === "paint" ? 0 : 0;
    const paintMaxSide = Math.min(900, Math.max(width, height));
    const outputScale = mode === "paint" ? (paintMaxSide - paintPad * 2) / Math.max(sourceW, sourceH) : 1;
    const outputWidth = mode === "paint" ? Math.max(1, Math.round(sourceW * outputScale) + paintPad * 2) : width;
    const outputHeight = mode === "paint" ? Math.max(1, Math.round(sourceH * outputScale) + paintPad * 2) : height;
    const outputInnerWidth = mode === "paint" ? Math.max(1, outputWidth - paintPad * 2) : innerWidth;
    const outputInnerHeight = mode === "paint" ? Math.max(1, outputHeight - paintPad * 2) : innerHeight;
    const scale = Math.min(outputInnerWidth / sourceW, outputInnerHeight / sourceH) * layoutScale;
    const drawWidth = Math.round(sourceW * scale);
    const drawHeight = Math.round(sourceH * scale);
    const offsetX = Math.round(((mode === "paint" ? outputWidth : width) - drawWidth) / 2 + ((layout && layout.x) || 0));
    const offsetY = Math.round(((mode === "paint" ? outputHeight : height) - drawHeight) / 2 + ((layout && layout.y) || 0));
    const canvas = document.createElement("canvas");
    canvas.width = mode === "paint" ? outputWidth : width;
    canvas.height = mode === "paint" ? outputHeight : height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (mode === "preview") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceCanvas, sourceX, sourceY, sourceW, sourceH, offsetX, offsetY, drawWidth, drawHeight);
    const frame = { canvas, width: canvas.width, height: canvas.height, scale, offsetX, offsetY, sourceX, sourceY };
    if (frameKey) {
      safeArtworkFrameCache.set(frameKey, frame);
    }
    return frame;
  }

  function normalizeFillForFrame(fill, frame) {
    if (!fill || !frame) return fill;
    if (fill.v === 2) return fill;
    return {
      ...fill,
      x: Math.round(frame.offsetX + (fill.x - frame.sourceX) * frame.scale),
      y: Math.round(frame.offsetY + (fill.y - frame.sourceY) * frame.scale),
      v: 2
    };
  }

  window.PaintEngine = {
    doFloodFill,
    fillConnectedRegion,
    buildLineLayerImageData,
    createFillLayerImageData,
    paintFillLayerSeed,
    composePaintLayers,
    hexToRgb,
    isProgressMarked,
    isLinePixelColor,
    isPaintableBasePixel,
    analyzePaintRegions,
    buildPaintRegionMap,
    decodePaintRegionMapImageData,
    getPaintRegionLabel,
    getPaintRegionMapSeeds,
    paintRegionMapSeed,
    markProgressRegionMap,
    findNearestUnpaintedStart,
    findNearestPaintedStart,
    markProgressRegion,
    createSafeArtworkCanvas,
    normalizeFillForFrame
  };
})();
