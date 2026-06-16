// Shared presentational components used across screens.
(function() {
function Icon({ name, size = 26, color = "currentColor", stroke = 2.4 }) {
  const p = { fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    back: /* @__PURE__ */ React.createElement("g", { ...p, strokeWidth: Math.max(stroke, 3) }, /* @__PURE__ */ React.createElement("path", { d: "M13.5 5L6.5 12l7 7" }), /* @__PURE__ */ React.createElement("path", { d: "M7.5 12H20" })),
    grid: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("rect", { x: "4", y: "4", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "13", y: "4", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "4", y: "13", width: "7", height: "7", rx: "1.5" }), /* @__PURE__ */ React.createElement("rect", { x: "13", y: "13", width: "7", height: "7", rx: "1.5" })),
    undo: /* @__PURE__ */ React.createElement("path", { ...p, d: "M9 7H15a5 5 0 010 10H7M9 7L5 4M9 7L5 10" }),
    zoom: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "7" }), /* @__PURE__ */ React.createElement("path", { d: "M16 16l4 4M11 8v6M8 11h6" })),
    save: /* @__PURE__ */ React.createElement("g", { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M12 4v10M12 14l-4-4M12 14l4-4" }), /* @__PURE__ */ React.createElement("path", { d: "M5 18h14" })),
    home: /* @__PURE__ */ React.createElement("path", { ...p, d: "M4 11l8-7 8 7M6 10v9h12v-9" }),
    check: /* @__PURE__ */ React.createElement("path", { ...p, d: "M5 12l5 5L19 7" }),
    star: /* @__PURE__ */ React.createElement("path", { ...p, d: "M12 4l2.3 4.9 5.2.7-3.8 3.6.9 5.3L12 16.9 7.4 18.5l.9-5.3L4.5 9.6l5.2-.7z" }),
    plus: /* @__PURE__ */ React.createElement("path", { ...p, d: "M12 5v14M5 12h14" }),
    trash: /* @__PURE__ */ React.createElement("g", { ...p, strokeWidth: Math.max(stroke, 2.7) }, /* @__PURE__ */ React.createElement("path", { d: "M4 7h16" }), /* @__PURE__ */ React.createElement("path", { d: "M9 7V5.5A2.5 2.5 0 0111.5 3h1A2.5 2.5 0 0115 5.5V7" }), /* @__PURE__ */ React.createElement("path", { d: "M7 7l1 13h8l1-13" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v5M14 11v5" })),
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
  return /* @__PURE__ */ React.createElement("div", { className: "palette " + (side ? "palette--side" : "palette--bottom") }, /* @__PURE__ */ React.createElement("div", {
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
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.c,
        type: "button",
        "data-palette-color": p.c,
        className: "swatch" + (on ? " swatch--on" : ""),
        style: {
          background: p.c,
          borderColor: isLight(p.c) ? "rgba(74,64,54,.35)" : "transparent"
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
      on && /* @__PURE__ */ React.createElement("span", { className: "swatch__check", style: { color: isLight(p.c) ? "#4A4036" : "#fff" } }, "\u2713")
    );
  })));
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
