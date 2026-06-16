const AppStorage = window.AppStorage;
const {
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
} = window.PaintEngine;
const { loadArtworkBitmap } = window.AssetLoader;
const { Icon, BigButton, isLight, Palette, useOrientation, Confetti } = window.UIComponents;

function CanvasArt({ art, fills, onPaint, selected, interactive = true, frameMode = "preview", onProgressChange, onImageLoad, onRegionsChange }) {
  const canvasRef = React.useRef(null);
  const baseCanvasRef = React.useRef(null);
  const baseImageDataRef = React.useRef(null);
  const fillsArray = Array.isArray(fills) ? fills : [];
  const regionsRef = React.useRef(null);
  const frameRef = React.useRef(null);
  const lastArtSrcRef = React.useRef("");
  const [imageReady, setImageReady] = React.useState(false);
  const [paintPulse, setPaintPulse] = React.useState(null);
  const shouldAnalyzeRegions = interactive || Boolean(onProgressChange) || Boolean(onRegionsChange);
  if (lastArtSrcRef.current !== art.src) {
    regionsRef.current = null;
    baseImageDataRef.current = null;
    lastArtSrcRef.current = art.src;
  }
  const analyzeRegions = (imgData, width, height) => {
    try {
      const data = imgData.data;
      const visited = new Uint8Array(width * height);
      const seeds = [];
      const getPixelIndex = (x, y) => (y * width + x) * 4;
      for (let y = 4; y < height - 4; y += 2) {
        for (let x = 4; x < width - 4; x += 2) {
          const vIdx = y * width + x;
          if (visited[vIdx]) continue;
          const pIdx = getPixelIndex(x, y);
          if (isPaintableBasePixel(data, pIdx)) {
            let regionSize = 0;
            let isBackground = false;
            const queue = [[x, y]];
            visited[vIdx] = 1;
            let head = 0;
            while (head < queue.length) {
              const [cx, cy] = queue[head++];
              regionSize++;
              if (cx <= 35 || cy <= 35 || cx >= width - 36 || cy >= height - 36) {
                isBackground = true;
              }
              const dirs = [
                [cx + 4, cy],
                [cx - 4, cy],
                [cx, cy + 4],
                [cx, cy - 4]
              ];
              for (const [nx, ny] of dirs) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nvIdx = ny * width + nx;
                  if (!visited[nvIdx]) {
                    const npIdx = getPixelIndex(nx, ny);
                    if (isPaintableBasePixel(data, npIdx)) {
                      visited[nvIdx] = 1;
                      queue.push([nx, ny]);
                    }
                  }
                }
              }
            }
            if (regionSize > 5) {
              seeds.push({ x, y, size: regionSize, isBackground });
            }
          }
        }
      }
      regionsRef.current = seeds;
      if (onRegionsChange) onRegionsChange(seeds);
    } catch (e) {
      console.error("Error analyzing regions", e);
    }
  };
  React.useEffect(() => {
    let cancelled = false;
    setImageReady(false);
    setPaintPulse(null);
    loadArtworkBitmap(art.src).then((img) => {
      if (cancelled) return;
      const frame = createSafeArtworkCanvas(img, art.src, art.layout, { mode: frameMode });
      const cw = frame.width;
      const ch = frame.height;
      frameRef.current = frame;
      if (baseCanvasRef.current) {
        baseCanvasRef.current.width = cw;
        baseCanvasRef.current.height = ch;
        const ctx = baseCanvasRef.current.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(frame.canvas, 0, 0);
        baseImageDataRef.current = ctx.getImageData(0, 0, cw, ch);
        if (shouldAnalyzeRegions) {
          analyzeRegions(baseImageDataRef.current, cw, ch);
        } else {
          regionsRef.current = null;
        }
      }
      redraw(cw, ch);
      if (onImageLoad) {
        onImageLoad({ width: cw, height: ch });
      }
      setImageReady(true);
    }).catch((error) => {
      if (!cancelled) console.error("Error loading artwork", error);
    });
    return () => {
      cancelled = true;
    };
  }, [art.src, frameMode, shouldAnalyzeRegions]);
  const redraw = (cw, ch) => {
    if (!canvasRef.current || !baseCanvasRef.current) return;
    canvasRef.current.width = cw;
    canvasRef.current.height = ch;
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(baseCanvasRef.current, 0, 0);
    const imgData = ctx.getImageData(0, 0, cw, ch);
    const baseCtx = baseCanvasRef.current.getContext("2d", { willReadFrequently: true });
    const baseImgData = baseImageDataRef.current || baseCtx.getImageData(0, 0, cw, ch);
    const progressData = new Uint8ClampedArray(baseImgData.data);
    const progressImgData = { data: progressData, width: cw, height: ch };
    for (let f of fillsArray) {
      const normalizedFill = normalizeFillForFrame(f, frameRef.current);
      doFloodFill(imgData, normalizedFill.x, normalizedFill.y, hexToRgb(normalizedFill.color), 95, baseImgData.data);
      markProgressRegion(progressImgData, normalizedFill.x, normalizedFill.y, baseImgData.data);
    }
    ctx.putImageData(imgData, 0, 0);
    if (regionsRef.current && onProgressChange) {
      let coloredSize = 0;
      let totalSize = 0;
      const seeds = regionsRef.current;
      for (let s of seeds) {
        totalSize += s.size;
        const idx = (s.y * cw + s.x) * 4;
        if (isProgressMarked(progressData, idx)) {
          coloredSize += s.size;
        }
      }
      const pct = totalSize > 0 ? Math.min(100, Math.round(coloredSize / totalSize * 100)) : 0;
      setTimeout(() => {
        onProgressChange(pct);
      }, 0);
    }
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
    const progressData = new Uint8ClampedArray(baseImgData.data);
    const progressImgData = { data: progressData, width: cw, height: ch };
    for (let f of fillsArray) {
      const normalizedFill = normalizeFillForFrame(f, frameRef.current);
      markProgressRegion(progressImgData, normalizedFill.x, normalizedFill.y, baseImgData.data);
    }
    const snapRadius = Math.max(26, Math.round(Math.max(scaleX, scaleY) * 22));
    const clickedIdx = (y * cw + x) * 4;
    const clickedIsPaintable = isPaintableBasePixel(baseImgData.data, clickedIdx);
    const clickedIsColored = isProgressMarked(progressData, clickedIdx);
    const clickedR = baseImgData.data[clickedIdx];
    const clickedG = baseImgData.data[clickedIdx + 1];
    const clickedB = baseImgData.data[clickedIdx + 2];
    const clickedA = baseImgData.data[clickedIdx + 3];
    const clickedIsLine = clickedA >= 50 && clickedR < 75 && clickedG < 75 && clickedB < 75;
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
    if (!isPaintableBasePixel(baseImgData.data, pIdx)) return;
    const isAlreadyColored = isProgressMarked(progressData, pIdx);
    if (isAlreadyColored) {
      const pixel = ctx.getImageData(paintX, paintY, 1, 1).data;
      const selectedRgb = hexToRgb(selected);
      const dist = Math.abs(pixel[0] - selectedRgb.r) + Math.abs(pixel[1] - selectedRgb.g) + Math.abs(pixel[2] - selectedRgb.b);
      if (dist < 10) {
        return;
      }
    }
    const newFill = { x: paintX, y: paintY, color: selected, v: 2 };
    let nextFills = [...fillsArray, newFill];
    markProgressRegion(progressImgData, paintX, paintY, baseImgData.data);
    if (regionsRef.current) {
      const uncoloredSeeds = regionsRef.current.filter((s) => {
        const idx = (s.y * cw + s.x) * 4;
        return !isProgressMarked(progressData, idx);
      });
      const nearbyMergeRadius = Math.max(54, Math.min(cw, ch) * 0.13);
      const nearbyMergeRadiusSq = nearbyMergeRadius * nearbyMergeRadius;
      const isNearPaintPoint = (s) => {
        const dx = s.x - paintX;
        const dy = s.y - paintY;
        return dx * dx + dy * dy <= nearbyMergeRadiusSq;
      };
      const tinySeeds = uncoloredSeeds.filter((s) => shouldMergeTinyRegion(s) && isNearPaintPoint(s));
      const lastSmallSeeds = uncoloredSeeds.length <= 3 && uncoloredSeeds.every(shouldMergeLastSmallRegion) ? uncoloredSeeds : [];
      const mergeSeeds = [...tinySeeds, ...lastSmallSeeds].filter((seed, index, all) => {
        return all.findIndex((item) => item.x === seed.x && item.y === seed.y) === index;
      }).sort((a, b) => {
        const adx = a.x - paintX;
        const ady = a.y - paintY;
        const bdx = b.x - paintX;
        const bdy = b.y - paintY;
        return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
      }).slice(0, 18);
      if (mergeSeeds.length > 0) {
        mergeSeeds.forEach((s) => {
          markProgressRegion(progressImgData, s.x, s.y, baseImgData.data);
          nextFills.push({ x: s.x, y: s.y, color: selected, v: 2 });
        });
      }
    }
    const pulse = { id: Date.now(), x: paintX / cw * 100, y: paintY / ch * 100 };
    setPaintPulse(pulse);
    setTimeout(() => {
      setPaintPulse((current) => current && current.id === pulse.id ? null : current);
    }, 460);
    onPaint(nextFills);
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
function Thumb({ art, fills, lightweight = false, priority = false }) {
  const fillsArray = Array.isArray(fills) ? fills : [];
  if (lightweight && fillsArray.length === 0) {
    return /* @__PURE__ */ React.createElement(ArtworkImage, { art, priority });
  }
  return /* @__PURE__ */ React.createElement(CanvasArt, { art, fills: fillsArray, interactive: false, frameMode: fillsArray.length > 0 ? "paint" : "preview" });
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
    color: seed.isBackground ? "#F6D977" : SHOWCASE_PALETTE[(idx + Math.floor(seed.x / 120) + Math.floor(seed.y / 120)) % SHOWCASE_PALETTE.length]
  }));
}
const finishedThumbCache = new Map();
function FinishedThumb({ art, className = "", limit = 80 }) {
  const cacheKey = art ? `${art.id || art.src}:${limit}` : "";
  const [ready, setReady] = React.useState(() => finishedThumbCache.has(cacheKey));
  const [fills, setFills] = React.useState(() => finishedThumbCache.get(cacheKey) || []);
  const signatureRef = React.useRef("");
  React.useEffect(() => {
    if (!art) return;
    const cached = finishedThumbCache.get(cacheKey);
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
    if (cacheKey) finishedThumbCache.set(cacheKey, next);
    setFills(next);
  }, [cacheKey, limit]);
  return /* @__PURE__ */ React.createElement("div", { className: "finished-thumb " + className }, ready ? /* @__PURE__ */ React.createElement(CanvasArt, { art, fills, interactive: false, onRegionsChange: handleRegionsChange }) : /* @__PURE__ */ React.createElement(ArtworkImage, { art, priority: true }));
}
// Artwork data is loaded from js/data/artworks.js.
function getArtworkById(id) {
  return window.ARTWORKS.find((art) => art.id === id) || null;
}
function getThemeHint(category) {
  return THEME_HINTS[category] || "오늘의 도안";
}
// Palette data is loaded from js/data/palette.js.
function HowToModal({ featuredArt, onClose }) {
  const e = React.createElement;
  const [guideStep, setGuideStep] = React.useState(0);
  const guideTrackRef = React.useRef(null);
  const guideDragRef = React.useRef({ active: false, startX: 0, scrollLeft: 0 });
  const guideSlides = [
    {
      tag: "01",
      title: "세로 도안 고르기",
      text: "긴 페이지로 보기 좋은 도안을 천천히 살펴보고 골라요.",
      kind: "art",
      points: ["세로 페이지가 잘 보이는 카드", "도안을 누르면 이젤 화면으로 이동"]
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
      title: "이젤에서 색칠",
      text: "세로 도안을 크게 보고 빈칸을 눌러 차분하게 채워요.",
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
    setGuideStep(0);
    requestAnimationFrame(() => {
      if (guideTrackRef.current) guideTrackRef.current.scrollLeft = 0;
    });
  }, []);

  const scrollGuideTo = (idx) => {
    const next = Math.max(0, Math.min(guideSlides.length - 1, idx));
    setGuideStep(next);
    const track = guideTrackRef.current;
    if (track) {
      track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    }
  };
  const nextGuide = () => {
    if (guideStep === guideSlides.length - 1) {
      onClose();
      return;
    }
    scrollGuideTo(guideStep + 1);
  };
  const handleGuideScroll = () => {
    const track = guideTrackRef.current;
    if (!track) return;
    const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (next !== guideStep) setGuideStep(next);
  };
  const handleGuidePointerDown = (ev) => {
    const track = guideTrackRef.current;
    if (!track) return;
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
    scrollGuideTo(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
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
        e("button", { className: "guide-modal__prev", onClick: () => scrollGuideTo(guideStep - 1), disabled: guideStep === 0 }, "이전"),
        e("button", { className: "guide-modal__next", onClick: nextGuide }, guideStep === guideSlides.length - 1 ? "시작" : "다음")
      )
    )
  );
}

function LobbyScreen({ onStart }) {
  const e = React.createElement;
  const [showGuide, setShowGuide] = React.useState(false);
  const featuredArt = window.ARTWORKS[0];
  const showcaseArts = [window.ARTWORKS[0], window.ARTWORKS[6], window.ARTWORKS[11]].filter(Boolean);
  const openGuide = () => setShowGuide(true);
  const closeGuide = () => setShowGuide(false);

  return e("div", { className: "lobby-screen" },
    e("div", { className: "lobby-overlay" },
      e("div", { className: "lobby-copy" },
        e("div", { className: "lobby-brand", "aria-label": "오늘의 색칠" },
          e("span", { className: "lobby-brand__mark" }, e(Icon, { name: "fill", size: 22, color: "#fff" })),
          e("span", { className: "lobby-brand__name" }, "오늘의 색칠")
        ),
        e("h1", { className: "lobby-title" }, "오늘의 한 장을 칠해볼까요?"),
        e("p", { className: "lobby-subtitle" }, "세로 도안을 이젤에 올리고 천천히 색을 채워보세요.")
      ),
      e("div", { className: "lobby-showcase", "aria-hidden": "true" },
        e("div", { className: "lobby-showcase__glow" }),
        showcaseArts.map((art, index) => e("div", { key: art.id, className: "lobby-showcase__card lobby-showcase__card--" + index },
          e(FinishedThumb, { art, limit: 90 })
        )),
        e("div", { className: "lobby-showcase__badge" },
          e(Icon, { name: "star", size: 16, color: "#fff" }),
          e("span", null, "세로 도안 60장")
        )
      ),
      e("div", { className: "lobby-theme-row", "aria-label": "특징" },
        ["세로 페이지", "큰 도안", "쉬운 색칠"].map((theme) => e("span", { key: theme }, theme))
      ),
      e("div", { className: "lobby-palette", "aria-hidden": "true" }, PALETTE.slice(0, 6).map((p) => e("span", { key: p.c, style: { background: p.c } }))),
      e("div", { className: "lobby-actions" },
        e("button", { className: "lobby-start-btn", onClick: onStart }, "도안 고르기"),
        e("button", { className: "lobby-guide-btn", onClick: openGuide }, e(Icon, { name: "pencil", size: 18, color: "#7C695E" }), "방법")
      )
    ),
    showGuide && e(HowToModal, { featuredArt, onClose: closeGuide })
  );
}
function HomeScreen({ onPick, onGallery, artworksList, progress, galleryCount }) {
  const e = React.createElement;
  const [cat, setCat] = React.useState("전체");
  const list = artworksList.filter((a) => cat === "전체" || a.category === cat);
  const totalCount = artworksList.length;
  const featuredArt = artworksList[0];
  const summaryArts = artworksList.slice(1, 3);
  const startedCount = artworksList.reduce((count, art) => {
    const saved = progress[art.id];
    return count + (AppStorage.getSavedPct(saved) > 0 ? 1 : 0);
  }, 0);
  return e("div", { className: "screen home" },
    e("header", { className: "appbar appbar--home" },
      e("div", { className: "appbar__brand" },
        e("span", { className: "appbar__logo" }, e(Icon, { name: "star", size: 24, color: "#fff" })),
        e("h1", { style: { whiteSpace: "nowrap" } }, "오늘의 색칠")
      ),
      e("div", { className: "appbar__count" }, totalCount, "장")
    ),
    e("section", { className: "home-summary", "aria-label": "도안 선택" },
      e("div", { className: "home-preview-showcase", "aria-hidden": "true" },
        featuredArt && e(FinishedThumb, { art: featuredArt, limit: 90 }),
        e("span", null, "3:4")
      ),
      e("div", { className: "home-summary__copy" },
        e("span", { className: "home-summary__eyebrow" }, "새 세로 도안"),
        e("h2", null, "길게 펼쳐 색칠해요"),
        e("p", null, "세로 페이지를 고르고 이젤 화면에서 편안하게 완성해요."),
        e("div", { className: "home-summary__actions" },
          featuredArt && e("button", { className: "home-summary__start", type: "button", onClick: () => onPick(featuredArt.id) },
            e(Icon, { name: "pencil", size: 18 }),
            e("span", null, "오늘의 한 장 시작")
          ),
          e("button", { className: "home-summary__gallery", type: "button", onClick: onGallery },
            e(Icon, { name: "star", size: 18 }),
            e("span", null, "보관함 ", galleryCount, "점")
          )
        )
      ),
      e("div", { className: "home-summary__stack", "aria-hidden": "true" },
        summaryArts.map((art) => e("div", { key: art.id, className: "home-summary__mini" },
          e(ArtworkImage, { art })
        ))
      )
    ),
    e("section", { className: "home-library-strip", "aria-label": "도안 현황" },
      e("div", null, e("span", null, "컬렉션"), e("strong", null, totalCount, "장")),
      e("div", null, e("span", null, "진행 중"), e("strong", null, startedCount, "장")),
      e("div", null, e("span", null, "보관함"), e("strong", null, galleryCount, "점"))
    ),
    e("div", { className: "cats" },
      window.CATEGORIES.map((c) => e("button", { key: c, className: "cat" + (c === cat ? " cat--on" : ""), onClick: () => setCat(c) }, c === "전체" ? "전체" : c))
    ),
    e("div", { className: "prompt" },
      e("span", null, cat === "전체" ? "전체 세로 도안" : cat),
      e("em", null, list.length, "장")
    ),
    e("div", { className: "cardgrid" }, list.map((a, idx) => {
    const pr = progress[a.id];
    const fillsArray = AppStorage.getSavedFills(pr);
    const savedPct = AppStorage.getSavedPct(pr);
    return e("button", { key: a.id, className: "artcard" + (savedPct > 0 ? " artcard--started" : ""), onClick: () => onPick(a.id) },
      e("div", { className: "artcard__thumb" },
        savedPct > 0 && e("span", { className: "artcard__progress" }, savedPct, "%"),
        e(Thumb, { art: a, fills: fillsArray, lightweight: true, priority: idx < 6 })
      ),
      e("div", { className: "artcard__body" },
        e("div", { className: "artcard__label" }, a.title),
        e("div", { className: "artcard__hint" }, savedPct > 0 ? "이어 색칠하기" : getThemeHint(a.category))
      )
    );
    }))
  );
}
function GalleryScreen({ items, onBack, onView, onDelete }) {
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
        e("span", null, "도안")
      )
    ),
    e("section", { className: "gallery-summary", "aria-label": "갤러리 요약" },
      e("div", { className: "gallery-summary__thumb", "aria-hidden": "true" },
        latestArt && latest ? e(Thumb, { art: latestArt, fills: latest.fills }) : e(Thumb, { art: latestArt })
      ),
      e("div", { className: "gallery-summary__copy" },
        e("span", { className: "gallery-summary__eyebrow" }, items.length > 0 ? "완성 보관함" : "첫 작품 준비"),
        e("h2", null, items.length > 0 ? "오늘의 색을 모아두었어요" : "완성하면 이곳에 걸려요"),
        e("p", null, items.length > 0 ? "저장한 작품을 다시 보고, 저장하거나 이어서 색칠할 수 있어요." : "마음에 드는 도안을 골라 천천히 완성해보세요.")
      ),
      e("div", { className: "gallery-summary__count" }, items.length, "점")
    ),
    items.length === 0 ? e("div", { className: "empty empty--gallery" },
      e("div", { className: "empty__art" }, e(Thumb, { art: window.ARTWORKS[0] })),
      e("p", { className: "empty__title" }, "아직 완성한 그림이 없어요"),
      e("p", { className: "empty__sub" }, "도안을 고르고 완성하면 보관함에 차곡차곡 모아둘 수 있어요."),
      e(BigButton, { icon: "plus", onClick: onBack }, "도안 고르러 가기")
    ) : e("div", { className: "cardgrid" }, items.map((it) => {
    const art = getArtworkById(it.artId);
    if (!art) return null;
    return e("div", { key: it.id, className: "artcard gallery-card" },
      e("button", { className: "artcard__thumb", onClick: () => onView(it), "aria-label": art.title + " 보기" },
        e(Thumb, { art, fills: it.fills })
      ),
      e("div", { className: "artcard__body gallery-card__body" },
        e("div", null,
          e("div", { className: "artcard__label" }, art.title),
          e("div", { className: "artcard__date" }, new Date(it.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }))
        ),
        e("button", { className: "gallery-card__delete", type: "button", onClick: () => onDelete(it.id), "aria-label": art.title + " 삭제" },
          e(Icon, { name: "trash", size: 18 }),
          e("span", null, "삭제")
        )
      )
    );
    }))
  );
}
function ColorToolbelt({ hasHistory, onUndo, onReset, onZoom }) {
  const e = React.createElement;
  return e("div", { className: "color-toolbelt", style: { zIndex: 18 } },
    e("button", { className: "color-toolbelt__btn", onClick: onUndo, disabled: !hasHistory, "aria-label": "\uB418\uB3CC\uB9AC\uAE30" }, e(Icon, { name: "undo", size: 22 })),
    e("button", { className: "color-toolbelt__btn", onClick: onReset, "aria-label": "\uCD08\uAE30\uD654" }, e(Icon, { name: "trash", size: 22 })),
    e("button", { className: "color-toolbelt__btn", onClick: onZoom, "aria-label": "\uB3CB\uBCF4\uAE30 \uD1A0\uAE00" }, e(Icon, { name: "zoom", size: 22 }))
  );
}
function ColoringScreen({ art, fills, selected, onSelect, onPaint, onExit, onFinish, tweaks, onProgressChange }) {
  const orient = useOrientation();
  const containerRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [history, setHistory] = React.useState([]);
  const [pct, setPct] = React.useState(0);
  const [complete, setComplete] = React.useState(false);
  const [aspect, setAspect] = React.useState(1);
  React.useEffect(() => {
    if (scale === 1) {
      setOffset({ x: 0, y: 0 });
    }
  }, [scale]);
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
      setScale(2.2);
      setOffset({ x: -180, y: -180 });
    }
    lastDragTimeRef.current = Date.now();
  };
  const handleUndo = () => {
    if (history.length === 0) return;
    const prevFills = history[history.length - 1];
    setHistory(history.slice(0, -1));
    onPaint(prevFills);
  };
  const handleReset = () => {
    if (window.confirm("\uB3C4\uC548\uC758 \uC0C9\uC0C1\uC744 \uBAA8\uB450 \uCD08\uAE30\uD654\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      onPaint([]);
      setHistory([]);
    }
  };
  const handleCanvasPaint = (newFills) => {
    if (Date.now() - lastDragTimeRef.current < 120) return;
    setHistory((prev) => [...prev, Array.isArray(fills) ? [...fills] : []]);
    onPaint(newFills);
  };
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
        setOffset({
          x: mx - (mx - state.offset.x) * scaleRatio + dx,
          y: my - (my - state.offset.y) * scaleRatio + dy
        });
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
            setOffset((prev) => ({
              x: prev.x + curDx,
              y: prev.y + curDy
            }));
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
        startMousePos = { x: e.clientX, y: e.clientY };
        startMouseOffset = { ...offset };
      }
    };
    const handleMouseMove = (e) => {
      if (isMouseDown) {
        const dx = e.clientX - startMousePos.x;
        const dy = e.clientY - startMousePos.y;
        if (Math.hypot(dx, dy) > 5) {
          setOffset({
            x: startMouseOffset.x + dx,
            y: startMouseOffset.y + dy
          });
          lastDragTimeRef.current = Date.now();
        }
      }
    };
    const handleMouseUp = () => {
      isMouseDown = false;
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
        setOffset({
          x: mx - (mx - offset.x) * scaleRatio,
          y: my - (my - offset.y) * scaleRatio
        });
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
  const layout = orient === "landscape" ? "side" : "bottom";
  const hasHistory = history.length > 0;
  const pageAspect = aspect >= 0.92 ? (layout === "side" ? 0.86 : 0.75) : aspect;
  const bottomChrome = window.innerWidth >= 768 ? 302 : 220;
  return /* @__PURE__ */ React.createElement("div", { className: "screen color color--" + layout }, /* @__PURE__ */ React.createElement("header", { className: "appbar appbar--color", style: { position: "relative" } }, /* @__PURE__ */ React.createElement("button", { className: "appbar__back", onClick: onExit }, /* @__PURE__ */ React.createElement(Icon, { name: "back", size: 28 }), /* @__PURE__ */ React.createElement("span", { className: "hide-narrow" }, "\uBAA9\uB85D")), /* @__PURE__ */ React.createElement("div", { className: "appbar__center-txt" }, pct, "% \uC644\uB8CC"), layout === "side" && /* @__PURE__ */ React.createElement("div", { className: "appbar__tools" }, /* @__PURE__ */ React.createElement("button", { className: "tool--pill", onClick: handleUndo, disabled: !hasHistory, "aria-label": "\uB418\uB3CC\uB9AC\uAE30" }, /* @__PURE__ */ React.createElement(Icon, { name: "undo", size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "hide-narrow" }, "\uB418\uB3CC\uB9AC\uAE30")), /* @__PURE__ */ React.createElement("button", { className: "tool--pill", onClick: handleReset, "aria-label": "\uCD08\uAE30\uD654" }, /* @__PURE__ */ React.createElement(Icon, { name: "trash", size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "hide-narrow" }, "\uCC98\uC74C\uBD80\uD130"))), /* @__PURE__ */ React.createElement("div", { className: "appbar__progress-line", style: { width: pct + "%" } })), /* @__PURE__ */ React.createElement("div", { className: "colorbody", style: { position: "relative", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "canvaswrap",
      ref: containerRef,
      style: {
        width: "100%",
        height: "100%",
        touchAction: "none",
        overflow: "hidden",
        cursor: scale > 1 ? "grab" : "default"
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "canvasinner",
        style: {
          width: layout === "side" ? `min(100%, calc((100dvh - 116px) * ${pageAspect}), calc(100dvw - 266px), 840px)` : `min(calc(100dvw - 10px), calc((100dvh - ${bottomChrome}px) * ${pageAspect}), 680px)`,
          aspectRatio: pageAspect,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          transition: touchStartRef.current.isPinching || touchStartRef.current.isDragging ? "none" : "transform 0.15s ease-out",
          willChange: "transform"
        }
      },
      /* @__PURE__ */ React.createElement(
        CanvasArt,
        {
          art,
          fills,
          onPaint: handleCanvasPaint,
          selected,
          interactive: true,
          frameMode: "paint",
          onProgressChange: (p) => {
            setPct(p);
            setComplete(p >= 85);
            if (onProgressChange) onProgressChange(p);
          },
          onImageLoad: ({ width, height }) => setAspect(width / height)
        }
      )
    ), layout === "side" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: toggleZoom,
        style: {
          position: "absolute",
          right: "20px",
          bottom: "20px",
          height: "46px",
          borderRadius: "23px",
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1.5px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          boxShadow: "var(--shadow)",
          zIndex: 10,
          cursor: "pointer"
        },
        className: "zoom-toggle-btn",
        "aria-label": "\uB3CB\uBCF4\uAE30 \uD1A0\uAE00"
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "zoom", size: 22, color: "var(--ink)" }),
      /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", fontSize: "15px", fontWeight: "bold", color: "var(--ink)" } }, scale > 1 ? "\uCD95\uC18C\uD558\uAE30 (1x)" : "\uD06C\uAC8C \uBCF4\uAE30 (2x)")
    ),
    complete && /* @__PURE__ */ React.createElement("button", { className: "finishbar", onClick: onFinish, style: { zIndex: 15 } }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 26, color: "#fff" }), " \uB2E4 \uCE60\uD588\uC5B4\uC694 \xB7 \uC644\uC131\uD558\uAE30")
  ), /* @__PURE__ */ React.createElement("div", { className: "palettezone palettezone--" + layout, style: { zIndex: 20 } }, layout === "bottom" && /* @__PURE__ */ React.createElement(ColorToolbelt, { hasHistory, onUndo: handleUndo, onReset: handleReset, onZoom: toggleZoom }), /* @__PURE__ */ React.createElement("div", { className: "curcolor", style: { background: selected, borderColor: isLight(selected) ? "rgba(74,64,54,.3)" : "transparent" } }, /* @__PURE__ */ React.createElement("span", { className: "curcolor__label", style: { color: isLight(selected) ? "#4A4036" : "#fff" } }, "\uD604\uC7AC \uC0C9"), /* @__PURE__ */ React.createElement("span", { className: "curcolor__name", style: { color: isLight(selected) ? "#4A4036" : "#fff", fontSize: "13px", fontWeight: "bold", marginTop: "2px" } }, PALETTE.find((p) => p.c === selected)?.name || "")), /* @__PURE__ */ React.createElement(Palette, { selected, onSelect, layout }))));
}
function CompletionScreen({ art, fills, onSave, onKeep, onNew, onBack, saved }) {
  const e = React.createElement;
  const fillCount = Array.isArray(fills) ? fills.length : 0;
  return e("div", { className: "screen completion" },
    e(Confetti, null),
    e("div", { className: "completion__inner" },
      e("p", { className: "completion__eyebrow" }, e(Icon, { name: saved ? "check" : "star", size: 20, color: "var(--ok)" }), saved ? " 보관 완료" : " 작품 완성"),
      e("h2", { className: "completion__title" }, saved ? "갤러리에 담았어요" : "오늘의 작품이 완성됐어요"),
      e("p", { className: "completion__sub" }, saved ? "기기에 저장하거나 다른 도안을 이어서 골라보세요." : "원하면 갤러리에 보관하고, 바로 이미지로 저장할 수 있어요."),
      e("div", { className: "completion__certificate", "aria-label": "완성 작품 정보" },
        e("span", null, saved ? "보관된 작품" : "완성 미리보기"),
        e("strong", null, art.title),
        e("small", null, fillCount, "번의 색칠 기록")
      ),
      e("div", { className: "completion__frame completion__frame--magic" }, e(CanvasArt, { art, fills, interactive: false, frameMode: "paint" })),
      e("div", { className: "completion__btns" },
        !saved ? e(BigButton, { icon: "check", onClick: onKeep }, "내 갤러리에 담기") : e(BigButton, { icon: "save", onClick: onSave }, "기기에 저장"),
        !saved ? e("div", { className: "completion__row" },
          e(BigButton, { icon: "save", onClick: onSave, variant: "soft" }, "기기에 저장"),
          e(BigButton, { icon: "plus", onClick: onNew, variant: "ghost" }, "새 그림")
        ) : e("div", { className: "completion__row" },
          e(BigButton, { icon: "star", onClick: onNew, variant: "soft" }, "다른 그림"),
          e(BigButton, { onClick: onBack, variant: "ghost" }, "조금 더 칠하기")
        ),
        !saved && e("button", { className: "completion__textbtn", type: "button", onClick: onBack }, "조금 더 칠하기")
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
      e("p", { className: "completion__eyebrow" }, art.title),
      e("h2", { className: "completion__title" }, new Date(item.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }), " 완성"),
      e("div", { className: "completion__certificate completion__certificate--view", "aria-label": "갤러리 작품 정보" },
        e("span", null, "갤러리 보관 작품"),
        e("strong", null, art.title),
        e("small", null, (item.fills || []).length, "번의 색칠 기록")
      ),
      e("div", { className: "completion__frame" }, e(CanvasArt, { art, fills: item.fills, interactive: false, frameMode: "paint" })),
      e("div", { className: "completion__btns" },
        e("div", { className: "completion__row" },
          e(BigButton, { icon: "save", onClick: onSave }, "기기에 저장"),
          e(BigButton, { icon: "trash", onClick: () => onDelete(item.id), variant: "danger" }, "삭제")
        ),
        e("div", { className: "completion__row" },
          e(BigButton, { onClick: onBack, variant: "ghost" }, "갤러리로"),
          e(BigButton, { onClick: onRecolor, variant: "soft" }, "다시 색칠")
        )
      )
    )
  );
}
function BottomNav({ active, galleryCount, onHome, onGallery }) {
  const items = [
    { key: "home", label: "\uB3C4\uC548", icon: "grid", onClick: onHome },
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
function downloadCanvasPng(art, fills) {
  return loadArtworkBitmap(art.src).then((img) => new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const frame = createSafeArtworkCanvas(img, art.src, art.layout, { mode: "paint" });
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(frame.canvas, 0, 0);
      const imgData = ctx.getImageData(0, 0, frame.width, frame.height);
      const baseData = new Uint8ClampedArray(imgData.data);
      const fillsArray = Array.isArray(fills) ? fills : [];
      for (let f of fillsArray) {
        const normalizedFill = normalizeFillForFrame(f, frame);
        doFloodFill(imgData, normalizedFill.x, normalizedFill.y, hexToRgb(normalizedFill.color), 95, baseData);
      }
      ctx.putImageData(imgData, 0, 0);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${art.title}_\uC644\uC131.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      resolve();
    } catch (e) {
      reject(e);
    }
  }));
}
const TWEAK_DEFAULTS = {
  "palettePos": "\uC790\uB3D9",
  "paintMode": "\uD0ED",
  "fontScale": 1,
  "theme": "\uB530\uB73B"
};
function App() {
  const t = TWEAK_DEFAULTS;
  const [screen, setScreen] = React.useState("lobby");
  const [artId, setArtId] = React.useState(null);
  const [fills, setFills] = React.useState([]);
  const [selected, setSelected] = React.useState(PALETTE[0].c);
  const [pct, setPct] = React.useState(0);
  const [progress, setProgress] = React.useState(() => AppStorage.loadProgress());
  const [gallery, setGallery] = React.useState(() => AppStorage.loadGallery());
  const [viewItem, setViewItem] = React.useState(null);
  const [justSaved, setJustSaved] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const artworksList = window.ARTWORKS;
  const art = getArtworkById(artId);
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };
  React.useEffect(() => {
    if (screen === "color" && artId) {
      const fillsArray = Array.isArray(fills) ? fills : [];
      const next = { ...progress };
      if (fillsArray.length === 0 && pct === 0) {
        delete next[artId];
      } else {
        next[artId] = { fills: fillsArray, pct };
      }
      setProgress(next);
      AppStorage.saveProgress(next);
    }
  }, [fills, pct, screen, artId]);
  const pickArt = (id) => {
    setArtId(id);
    const saved = progress[id];
    const fillsArray = AppStorage.getSavedFills(saved);
    const initialPct = AppStorage.getSavedPct(saved);
    setFills(fillsArray);
    setPct(initialPct);
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
    if (justSaved) return;
    const item = { id: "g" + Date.now(), artId, fills, date: Date.now() };
    const next = [item, ...gallery];
    setGallery(next);
    AppStorage.saveGallery(next);
    setJustSaved(true);
    flash("\uAC24\uB7EC\uB9AC\uC5D0 \uBCF4\uAD00\uD588\uC5B4\uC694");
  };
  const deleteGalleryItem = (itemId) => {
    if (!window.confirm("\uC774 \uC791\uD488\uC744 \uAC24\uB7EC\uB9AC\uC5D0\uC11C \uC0AD\uC81C\uD560\uAE4C\uC694?")) return;
    const next = gallery.filter((item) => item.id !== itemId);
    setGallery(next);
    AppStorage.saveGallery(next);
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
  return /* @__PURE__ */ React.createElement("div", { className: "app", "data-theme": themeAttr, style: { "--fs": t.fontScale } }, screen === "lobby" && /* @__PURE__ */ React.createElement(LobbyScreen, { onStart: () => setScreen("home") }), screen === "home" && /* @__PURE__ */ React.createElement(
    HomeScreen,
    {
      onPick: pickArt,
      onGallery: () => setScreen("gallery"),
      artworksList,
      progress,
      galleryCount: gallery.length
    }
  ), screen === "color" && art && /* @__PURE__ */ React.createElement(
    ColoringScreen,
    {
      art,
      fills,
      selected,
      onSelect: setSelected,
      onPaint: handlePaintChange,
      onExit: exitHome,
      onFinish: finish,
      tweaks: normTweaks,
      onProgressChange: setPct
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
      },
      onDelete: deleteGalleryItem
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
        setJustSaved(false);
        setScreen("color");
      },
      onDelete: deleteGalleryItem
    }
  ), toast && /* @__PURE__ */ React.createElement("div", { className: "toast" }, toast), showBottomNav && /* @__PURE__ */ React.createElement(
    BottomNav,
    {
      active: activeNav,
      galleryCount: gallery.length,
    onHome: () => setScreen("home"),
      onGallery: () => setScreen("gallery")
    }
  ));
}
window.App = App;
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
