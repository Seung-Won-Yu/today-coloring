// Shared presentational components used across screens.
(function() {
function Icon({ name, size = 26, color = "currentColor", stroke = 2.4 }) {
  const p = { fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    back: /* @__PURE__ */ React.createElement("g", { ...p, strokeWidth: Math.max(stroke, 3) }, /* @__PURE__ */ React.createElement("path", { d: "M13.5 5L6.5 12l7 7" }), /* @__PURE__ */ React.createElement("path", { d: "M7.5 12H20" })),
    chevronLeft: /* @__PURE__ */ React.createElement("path", { ...p, d: "M15 6l-6 6 6 6" }),
    chevronRight: /* @__PURE__ */ React.createElement("path", { ...p, d: "M9 6l6 6-6 6" }),
    grid: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("rect", { x: "4", y: "4", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "13", y: "4", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "4", y: "13", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "13", y: "13", width: "7", height: "7", rx: "1.5" })),
    undo: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M9 14l-5-5 5-5" }), /* @__PURE__ */ React.createElement("path", { d: "M4 9h10a5 5 0 010 10h-3" })),
    reset: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M4 4v6h6" }), /* @__PURE__ */ React.createElement("path", { d: "M5.4 14a7 7 0 101.8-7.1L4 10" }), /* @__PURE__ */ React.createElement("path", { d: "M12 9v4l3 2" })),
    zoom: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "7" }), /* @__PURE__ */ React.createElement("path", { d: "M16 16l4 4M11 8v6M8 11h6" })),
    zoomIn: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "7" }), /* @__PURE__ */ React.createElement("path", { d: "M16 16l4 4M11 8v6M8 11h6" })),
    zoomOut: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "7" }), /* @__PURE__ */ React.createElement("path", { d: "M16 16l4 4M8 11h6" })),
    save: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M12 4v10M12 14l-4-4M12 14l4-4" }), /* @__PURE__ */ React.createElement("path", { d: "M5 18h14" })),
    home: /* @__PURE__ */ React.createElement("path", { ...p, d: "M4 11l8-7 8 7M6 10v9h12v-9" }),
    check: /* @__PURE__ */ React.createElement("path", { ...p, d: "M5 12l5 5L19 7" }),
    star: /* @__PURE__ */ React.createElement("path", { ...p, d: "M12 4l2.3 4.9 5.2.7-3.8 3.6.9 5.3L12 16.9 7.4 18.5l.9-5.3L4.5 9.6l5.2-.7z" }),
    plus: /* @__PURE__ */ React.createElement("path", { ...p, d: "M12 5v14M5 12h14" }),
    trash: /* @__PURE__ */ React.createElement("g", { ...p, strokeWidth: Math.max(stroke, 2.7) }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V5.5A2.5 2.5 0 0111.5 3h1A2.5 2.5 0 0115 5.5V7" }), /* @__PURE__ */ React.createElement("path", { d: "M7 7l1 13h8l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v5M14 11v5" })),
    settings: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1A2 2 0 014.2 17l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1A2 2 0 017 4.2l.1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 001-1.6V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" })),
    brush: /* @__PURE__ */ React.createElement("path", { ...p, d: "M18 8a3 3 0 00-3-3l-10 10v3h3L18 8z M14 6l4 4" }),
    fill: /* @__PURE__ */ React.createElement("path", { ...p, d: "M12 22a7 7 0 007-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 007 7z" }),
    pencil: /* @__PURE__ */ React.createElement("path", { ...p, d: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" }),
    hand: /* @__PURE__ */ React.createElement("path", { ...p, d: "M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v5m-2-5a2 2 0 00-2-2v0a2 2 0 00-2 2v5m-2-3a2 2 0 00-2 2v0a2 2 0 00-2 2v6a7 7 0 007 7h2a9 9 0 009-9v-5a2 2 0 00-2-2v0a2 2 0 00-2 2" }),
    upload: /* @__PURE__ */ React.createElement("path", { ...p, d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" })
  };
  return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", style: { display: "block" } }, paths[name]);
}
function BigButton({ children, onClick, variant = "solid", icon, style }) {
  return /* @__PURE__ */ React.createElement("button", { className: "bigbtn bigbtn--" + variant, onClick, style }, icon && /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 28 }), /* @__PURE__ */ React.createElement("span", null, children));
}

function isLight(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 165;
}
function Palette({ selected, onSelect, layout }) {
  const side = layout === "side";
  const isDraggingRef = React.useRef(false);
  const lastSelectedRef = React.useRef(null);
  const trackRef = React.useRef(null);
  const [scrollState, setScrollState] = React.useState({ canPrev: false, canNext: false });
  const updateScrollState = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || side) {
      setScrollState({ canPrev: false, canNext: false });
      return;
    }
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const nextState = {
      canPrev: track.scrollLeft > 2,
      canNext: track.scrollLeft < maxScroll - 2
    };
    setScrollState((prev) => prev.canPrev === nextState.canPrev && prev.canNext === nextState.canNext ? prev : nextState);
  }, [side]);
  React.useEffect(() => {
    updateScrollState();
    if (side) return;
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateScrollState();
      });
    };
    track.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    const resizeObserver = window.ResizeObserver ? new ResizeObserver(scheduleUpdate) : null;
    if (resizeObserver) resizeObserver.observe(track);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      track.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [side, updateScrollState]);
  React.useEffect(() => {
    updateScrollState();
  }, [selected, updateScrollState]);
  const selectColor = React.useCallback((color) => {
    if (!color || lastSelectedRef.current === color) return;
    lastSelectedRef.current = color;
    onSelect(color);
  }, [onSelect]);
  const selectColorAtPoint = React.useCallback((x, y) => {
    const target = document.elementFromPoint(x, y);
    const swatch = target && target.closest ? target.closest("[data-palette-color]") : null;
    if (swatch) selectColor(swatch.dataset.paletteColor);
  }, [selectColor]);
  const stopDragging = () => {
    isDraggingRef.current = false;
    lastSelectedRef.current = null;
  };
  const scrollPalette = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(120, Math.round(track.clientWidth * 0.72)) * direction;
    if (track.scrollBy) {
      track.scrollBy({ left: amount, behavior: "smooth" });
    } else {
      track.scrollLeft += amount;
    }
    window.setTimeout(updateScrollState, 220);
  };
  const paletteClass = [
    "palette",
    side ? "palette--side" : "palette--bottom",
    scrollState.canPrev ? "palette--can-prev" : "",
    scrollState.canNext ? "palette--can-next" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ React.createElement("div", { className: paletteClass },
    !side && /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: "palette__nav palette__nav--prev",
      onClick: () => scrollPalette(-1),
      disabled: !scrollState.canPrev,
      "aria-label": "\uC774\uC804 \uC0C9 \uBCF4\uAE30"
    }, /* @__PURE__ */ React.createElement(Icon, { name: "chevronLeft", size: 20 })),
    /* @__PURE__ */ React.createElement("div", {
    ref: trackRef,
    className: "palette__track",
    onPointerMove: (ev) => {
      if (!isDraggingRef.current || ev.pointerType === "touch") return;
      selectColorAtPoint(ev.clientX, ev.clientY);
    },
    onPointerUp: stopDragging,
    onPointerCancel: stopDragging,
    onPointerLeave: stopDragging,
    onTouchMove: (ev) => {
      const touch = ev.touches && ev.touches[0];
      if (touch) selectColorAtPoint(touch.clientX, touch.clientY);
    },
    onTouchEnd: stopDragging,
    onTouchCancel: stopDragging
  }, PALETTE.map((p) => {
    const on = selected === p.c;
    const light = isLight(p.c);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.c,
        type: "button",
        "data-palette-color": p.c,
        className: "swatch" + (light ? " swatch--light" : "") + (on ? " swatch--on" : ""),
        style: {
          background: p.c,
          borderColor: light ? "rgba(74,56,30,.62)" : "rgba(255,255,255,.92)"
        },
        onPointerDown: () => {
          isDraggingRef.current = true;
          selectColor(p.c);
        },
        onPointerEnter: () => {
          if (isDraggingRef.current) selectColor(p.c);
        },
        onClick: () => onSelect(p.c),
        "aria-label": p.name
      },
      on && /* @__PURE__ */ React.createElement("span", { className: "swatch__check", style: { color: light ? "#33291F" : "#fff" } }, "\u2713")
    );
  })),
    !side && /* @__PURE__ */ React.createElement("button", {
      type: "button",
      className: "palette__nav palette__nav--next",
      onClick: () => scrollPalette(1),
      disabled: !scrollState.canNext,
      "aria-label": "\uB2E4\uC74C \uC0C9 \uBCF4\uAE30"
    }, /* @__PURE__ */ React.createElement(Icon, { name: "chevronRight", size: 20 }))
  );
}
function useOrientation() {
  const [orient, setOrient] = React.useState(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
  React.useEffect(() => {
    const handleResize = () => {
      setOrient(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return orient;
}

function Confetti() {
  const colors = ["#E0584F", "#EF9A3D", "#F6C84C", "#6FA84F", "#3E6FB0", "#9B6FB0"];
  return /* @__PURE__ */ React.createElement("div", { className: "confetti" }, [...Array(60)].map((_, i) => {
    const style = {
      left: Math.random() * 100 + "%",
      width: Math.random() * 8 + 4 + "px",
      height: Math.random() * 8 + 4 + "px",
      background: colors[Math.floor(Math.random() * colors.length)],
      animationDelay: Math.random() * 3 + "s",
      animationDuration: Math.random() * 2 + 2 + "s"
    };
    return /* @__PURE__ */ React.createElement("span", { key: i, style });
  }));
}

  window.UIComponents = {
    Icon,
    BigButton,
    isLight,
    Palette,
    useOrientation,
    Confetti
  };
})();
