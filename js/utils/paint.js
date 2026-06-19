(function() {
  function doFloodFill(imageData, startX, startY, fillColor, tolerance = 95, baseData = null) {
    const width = imageData.width;
    const height = imageData.height;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;
    const data = imageData.data;
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const canUseBasePixel = (x, y) => {
      if (!baseData) return true;
      return isPaintableBasePixel(baseData, getPixelIndex(x, y));
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
    if (colorDist < 10) return null;
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

  function smoothFillEdges(imageData, baseData, fillColor, passes = 2, bounds = null) {
    if (!imageData || !baseData || !fillColor) return;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const paintedSize = bounds && bounds.painted ? bounds.painted : 0;
    const isTinyFill = paintedSize > 0 && paintedSize <= 360;
    const isSmallFill = paintedSize > 0 && paintedSize <= 1400;
    const scanPad = isTinyFill ? 2 : isSmallFill ? 4 : 6;
    const minX = Math.max(1, (bounds ? bounds.minX : 1) - scanPad);
    const minY = Math.max(1, (bounds ? bounds.minY : 1) - scanPad);
    const maxX = Math.min(width - 2, (bounds ? bounds.maxX : width - 2) + scanPad);
    const maxY = Math.min(height - 2, (bounds ? bounds.maxY : height - 2) + scanPad);
    const isFillPixel = (idx) => {
      return Math.abs(data[idx] - fillColor.r) + Math.abs(data[idx + 1] - fillColor.g) + Math.abs(data[idx + 2] - fillColor.b) <= 22;
    };
    const isSoftEdgeFringe = (idx, darkNeighbors) => {
      const r = baseData[idx];
      const g = baseData[idx + 1];
      const b = baseData[idx + 2];
      const a = baseData[idx + 3];
      if (isLinePixelColor(r, g, b, a)) return false;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      const chroma = max - min;
      if (min >= 224 && luminance >= 228 && chroma <= 42) return true;
      return darkNeighbors > 0 && luminance >= 218 && chroma <= 72;
    };
    const countDarkBoundaryNeighbors = (x, y) => {
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const idx = getPixelIndex(x + dx, y + dy);
          if (isLinePixelColor(baseData[idx], baseData[idx + 1], baseData[idx + 2], baseData[idx + 3])) count++;
        }
      }
      return count;
    };
    const neighborOffsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1]
    ];
    const totalPasses = isTinyFill ? 0 : isSmallFill ? Math.min(1, passes) : Math.max(3, passes);
    for (let pass = 0; pass < totalPasses; pass++) {
      const candidates = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = getPixelIndex(x, y);
          if (isFillPixel(idx)) continue;
          const darkNeighbors = countDarkBoundaryNeighbors(x, y);
          if (!isSoftEdgeFringe(idx, darkNeighbors)) continue;
          let fillNeighbors = 0;
          for (const [dx, dy] of neighborOffsets) {
            if (isFillPixel(getPixelIndex(x + dx, y + dy))) {
              fillNeighbors++;
            }
          }
          const neededNeighbors = isSmallFill ? 3 : darkNeighbors >= 4 ? 3 : darkNeighbors > 0 ? (pass === 0 ? 1 : 2) : pass === 0 ? 1 : 3;
          if (fillNeighbors >= neededNeighbors) candidates.push(idx);
        }
      }
      if (candidates.length === 0) break;
      for (const idx of candidates) {
        data[idx] = fillColor.r;
        data[idx + 1] = fillColor.g;
        data[idx + 2] = fillColor.b;
        data[idx + 3] = 255;
      }
    }
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = getPixelIndex(x, y);
        if (isFillPixel(idx)) continue;
        const r = baseData[idx];
        const g = baseData[idx + 1];
        const b = baseData[idx + 2];
        const a = baseData[idx + 3];
        if (isLinePixelColor(r, g, b, a)) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luminance = r * 0.299 + g * 0.587 + b * 0.114;
        if (luminance < 92 || luminance > 224 || max - min > 72) continue;
        const darkNeighbors = countDarkBoundaryNeighbors(x, y);
        if (darkNeighbors === 0) continue;
        let fillNeighbors = 0;
        for (const [dx, dy] of neighborOffsets) {
          if (isFillPixel(getPixelIndex(x + dx, y + dy))) fillNeighbors++;
        }
        if (fillNeighbors < (isSmallFill ? 2 : 1)) continue;
        const inkAlpha = Math.max(0.14, Math.min(0.74, (238 - luminance) / 172 + Math.min(darkNeighbors, 3) * 0.035));
        const fillAlpha = 1 - inkAlpha;
        data[idx] = Math.round(fillColor.r * fillAlpha);
        data[idx + 1] = Math.round(fillColor.g * fillAlpha);
        data[idx + 2] = Math.round(fillColor.b * fillAlpha);
        data[idx + 3] = 255;
      }
    }
  }

  function mergeFillBounds(baseBounds, extraBounds, extraPainted) {
    if (!baseBounds) return extraBounds || null;
    if (!extraBounds) return baseBounds;
    return {
      painted: (baseBounds.painted || 0) + (extraPainted || extraBounds.painted || 0),
      minX: Math.min(baseBounds.minX, extraBounds.minX),
      minY: Math.min(baseBounds.minY, extraBounds.minY),
      maxX: Math.max(baseBounds.maxX, extraBounds.maxX),
      maxY: Math.max(baseBounds.maxY, extraBounds.maxY)
    };
  }

  function absorbNearbyPaintableIslands(imageData, baseData, fillColor, bounds) {
    if (!imageData || !baseData || !fillColor || !bounds) return bounds;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const paintedSize = bounds.painted || 0;
    const isTinyFill = paintedSize > 0 && paintedSize <= 420;
    const isSmallFill = paintedSize > 0 && paintedSize <= 1600;
    const scanPad = isTinyFill ? 72 : isSmallFill ? 52 : 18;
    const joinRadius = isTinyFill ? 10 : isSmallFill ? 8 : 5;
    const maxIslandSize = isTinyFill ? 1200 : isSmallFill ? 1800 : Math.min(1100, Math.max(220, Math.round(paintedSize * 0.07)));
    const passes = isTinyFill ? 5 : isSmallFill ? 4 : 2;
    const minX = Math.max(1, bounds.minX - scanPad);
    const minY = Math.max(1, bounds.minY - scanPad);
    const maxX = Math.min(width - 2, bounds.maxX + scanPad);
    const maxY = Math.min(height - 2, bounds.maxY + scanPad);
    const scanW = maxX - minX + 1;
    const scanH = maxY - minY + 1;
    if (scanW <= 0 || scanH <= 0) return bounds;

    const isFillPixel = (idx) => {
      return Math.abs(data[idx] - fillColor.r) + Math.abs(data[idx + 1] - fillColor.g) + Math.abs(data[idx + 2] - fillColor.b) <= 24;
    };
    const hasNearbyFill = (x, y) => {
      for (let dy = -joinRadius; dy <= joinRadius; dy++) {
        const py = y + dy;
        if (py < 0 || py >= height) continue;
        for (let dx = -joinRadius; dx <= joinRadius; dx++) {
          const px = x + dx;
          if (px < 0 || px >= width || dx * dx + dy * dy > joinRadius * joinRadius) continue;
          if (isFillPixel(getPixelIndex(px, py))) return true;
        }
      }
      return false;
    };

    let mergedBounds = bounds;
    for (let pass = 0; pass < passes; pass++) {
      const visited = new Uint8Array(scanW * scanH);
      let absorbedThisPass = 0;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const localStart = (y - minY) * scanW + (x - minX);
          if (visited[localStart]) continue;
          const startIdx = getPixelIndex(x, y);
          if (isFillPixel(startIdx) || !isPaintableBasePixel(baseData, startIdx)) {
            visited[localStart] = 1;
            continue;
          }
          const queue = [y * width + x];
          const pixels = [];
          const edgePixels = [];
          visited[localStart] = 1;
          let head = 0;
          let nearFill = false;
          let tooLarge = false;
          let islandBounds = { painted: 0, minX: x, minY: y, maxX: x, maxY: y };
          while (head < queue.length) {
            const pos = queue[head++];
            const cx = pos % width;
            const cy = Math.floor(pos / width);
            islandBounds.painted++;
            if (cx < islandBounds.minX) islandBounds.minX = cx;
            if (cy < islandBounds.minY) islandBounds.minY = cy;
            if (cx > islandBounds.maxX) islandBounds.maxX = cx;
            if (cy > islandBounds.maxY) islandBounds.maxY = cy;
            const pixelNearFill = (isTinyFill || isSmallFill || !tooLarge) && hasNearbyFill(cx, cy);
            if (pixelNearFill) {
              nearFill = true;
              if (edgePixels.length < maxIslandSize) edgePixels.push(pos);
            }
            if (!tooLarge) {
              pixels.push(pos);
              if (pixels.length > maxIslandSize) tooLarge = true;
            }
            const neighbors = [pos + 1, pos - 1, pos + width, pos - width];
            for (let i = 0; i < neighbors.length; i++) {
              const next = neighbors[i];
              if (next < 0 || next >= width * height) continue;
              const nx = next % width;
              const ny = Math.floor(next / width);
              if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
              if ((i === 0 && nx === 0) || (i === 1 && nx === width - 1)) continue;
              const localIdx = (ny - minY) * scanW + (nx - minX);
              if (visited[localIdx]) continue;
              const nIdx = next * 4;
              if (isFillPixel(nIdx) || !isPaintableBasePixel(baseData, nIdx)) continue;
              visited[localIdx] = 1;
              queue.push(next);
            }
          }
          if (!nearFill) continue;
          if (tooLarge && !isTinyFill && !isSmallFill) continue;
          const fillPixels = tooLarge ? edgePixels : pixels;
          if (fillPixels.length === 0) continue;
          const absorbedBounds = { painted: 0, minX: width, minY: height, maxX: 0, maxY: 0 };
          for (const pos of fillPixels) {
            const px = pos % width;
            const py = Math.floor(pos / width);
            const idx = pos * 4;
            data[idx] = fillColor.r;
            data[idx + 1] = fillColor.g;
            data[idx + 2] = fillColor.b;
            data[idx + 3] = 255;
            absorbedBounds.painted++;
            if (px < absorbedBounds.minX) absorbedBounds.minX = px;
            if (py < absorbedBounds.minY) absorbedBounds.minY = py;
            if (px > absorbedBounds.maxX) absorbedBounds.maxX = px;
            if (py > absorbedBounds.maxY) absorbedBounds.maxY = py;
          }
          absorbedThisPass += fillPixels.length;
          mergedBounds = mergeFillBounds(mergedBounds, absorbedBounds, fillPixels.length);
        }
      }
      if (absorbedThisPass === 0) break;
    }
    return mergedBounds;
  }

  function fillConnectedRegion(imageData, baseData, seed, fillColor, options = {}) {
    const tolerance = options.tolerance || 95;
    const shouldSmooth = options.smooth !== false;
    const fillBounds = doFloodFill(imageData, seed.x, seed.y, fillColor, tolerance, baseData);
    if (!fillBounds) return null;
    let mergedBounds = fillBounds;
    if (shouldSmooth) smoothFillEdges(imageData, baseData, fillColor, options.smoothPasses || 3, mergedBounds);
    mergedBounds = absorbNearbyPaintableIslands(imageData, baseData, fillColor, mergedBounds);
    if (shouldSmooth && mergedBounds !== fillBounds) {
      smoothFillEdges(imageData, baseData, fillColor, Math.min(2, options.smoothPasses || 2), mergedBounds);
      mergedBounds = absorbNearbyPaintableIslands(imageData, baseData, fillColor, mergedBounds);
      smoothFillEdges(imageData, baseData, fillColor, 1, mergedBounds);
      mergedBounds = absorbNearbyPaintableIslands(imageData, baseData, fillColor, mergedBounds);
    }
    return mergedBounds;
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
    return min > 238 && luminance > 247 && max - min < 28;
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
    fillConnectedRegion(imageData, baseData, { x, y }, PROGRESS_MARKER, { smooth: false });
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
    smoothFillEdges,
    hexToRgb,
    isProgressMarked,
    isPaintableBasePixel,
    findNearestUnpaintedStart,
    findNearestPaintedStart,
    markProgressRegion,
    createSafeArtworkCanvas,
    normalizeFillForFrame
  };
})();
