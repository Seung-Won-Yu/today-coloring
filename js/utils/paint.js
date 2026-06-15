(function() {
  function doFloodFill(imageData, startX, startY, fillColor, tolerance = 95, baseData = null) {
    const width = imageData.width;
    const height = imageData.height;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;
    const data = imageData.data;
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const canUseBasePixel = (x, y) => {
      if (!baseData) return true;
      return isPaintableBasePixel(baseData, getPixelIndex(x, y));
    };
    const targetIdx = getPixelIndex(startX, startY);
    if (!canUseBasePixel(startX, startY)) return;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];
    const fillR = fillColor.r;
    const fillG = fillColor.g;
    const fillB = fillColor.b;
    const colorDist = Math.abs(targetR - fillR) + Math.abs(targetG - fillG) + Math.abs(targetB - fillB);
    if (colorDist < 10) return;
    const isLinePixel = (r, g, b, a) => {
      if (a < 50) return false;
      return r < 75 && g < 75 && b < 75;
    };
    if (isLinePixel(targetR, targetG, targetB, targetA)) {
      return;
    }
    const colorMatch = (r, g, b, a, x, y) => {
      if (!canUseBasePixel(x, y)) return false;
      if (isLinePixel(r, g, b, a)) return false;
      if (targetR > 215 && targetG > 215 && targetB > 215) {
        const isGrayscale = Math.abs(r - g) < 50 && Math.abs(g - b) < 50 && Math.abs(r - b) < 50;
        if (isGrayscale) return r > 185 && g > 185 && b > 185;
      }
      return Math.abs(r - targetR) <= tolerance && Math.abs(g - targetG) <= tolerance && Math.abs(b - targetB) <= tolerance;
    };
    const queue = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;
    let head = 0;
    while (head < queue.length) {
      const [cx, cy] = queue[head++];
      const currIdx = getPixelIndex(cx, cy);
      data[currIdx] = fillR;
      data[currIdx + 1] = fillG;
      data[currIdx + 2] = fillB;
      data[currIdx + 3] = 255;
      const dirs = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];
      for (const [nx, ny] of dirs) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const vIdx = ny * width + nx;
          if (!visited[vIdx]) {
            const nIdx = getPixelIndex(nx, ny);
            if (colorMatch(data[nIdx], data[nIdx + 1], data[nIdx + 2], data[nIdx + 3], nx, ny)) {
              visited[vIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
  }

  const PROGRESS_MARKER = { r: 18, g: 52, b: 86 };

  function hexToRgb(hex) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    return { r: bigint >> 16 & 255, g: bigint >> 8 & 255, b: bigint & 255 };
  }

  function isProgressMarked(data, idx) {
    return data[idx] === PROGRESS_MARKER.r && data[idx + 1] === PROGRESS_MARKER.g && data[idx + 2] === PROGRESS_MARKER.b;
  }

  function isLinePixelColor(r, g, b, a) {
    if (a < 50) return false;
    return r < 75 && g < 75 && b < 75;
  }

  function isPaintableBasePixel(data, idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (isLinePixelColor(r, g, b, a)) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = r * 0.299 + g * 0.587 + b * 0.114;
    return min > 172 && luminance > 202 && max - min < 56;
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

  function shouldMergeTinyRegion(seed) {
    if (!seed || seed.isBackground) return false;
    return seed.size <= 18;
  }

  function shouldMergeLastSmallRegion(seed) {
    if (!seed || seed.isBackground) return false;
    return seed.size <= 48;
  }

  function markProgressRegion(imageData, x, y, baseData = null) {
    doFloodFill(imageData, x, y, PROGRESS_MARKER, 95, baseData);
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
    const sourceX = hasInk ? Math.max(0, minX - inkPad) : 0;
    const sourceY = hasInk ? Math.max(0, minY - inkPad) : 0;
    const sourceW = hasInk ? Math.min(width - sourceX, maxX - minX + inkPad * 2 + 1) : width;
    const sourceH = hasInk ? Math.min(height - sourceY, maxY - minY + inkPad * 2 + 1) : height;
    const innerWidth = Math.max(1, width - pad * 2);
    const innerHeight = Math.max(1, height - pad * 2);
    const layoutScale = layout && layout.scale ? layout.scale : 1;
    const paintPad = mode === "paint" ? Math.min(58, Math.max(28, Math.round(Math.min(sourceW, sourceH) * 0.045))) : 0;
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
    hexToRgb,
    isProgressMarked,
    isPaintableBasePixel,
    findNearestUnpaintedStart,
    findNearestPaintedStart,
    shouldMergeTinyRegion,
    shouldMergeLastSmallRegion,
    markProgressRegion,
    createSafeArtworkCanvas,
    normalizeFillForFrame
  };
})();
