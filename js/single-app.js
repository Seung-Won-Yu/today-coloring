(function() {
  if (window.COLORING_SINGLE_REDIRECTING) return;

  const e = React.createElement;
  const { Icon, isLight, Confetti } = window.UIComponents;
  const { ColoringScreen, CanvasArt, downloadCanvasPng, requestAppFullscreen } = window.ColoringRuntime;
  const MODES = window.COLORING_MODES || {};
  const RECENT_KEY = "sori_single_recent_v1";
  const VALID_DIFFICULTIES = ["easy", "normal", "hard"];

  function getParams() {
    return new URLSearchParams(window.location.search || "");
  }

  function getModeConfig() {
    const mode = getParams().get("mode") || "alarm";
    return MODES[mode] || MODES.alarm;
  }

  function getHostContext() {
    const params = getParams();
    return ["session_id", "content_id", "game_key"].reduce((acc, key) => {
      const value = params.get(key);
      if (value) acc[key] = value;
      return acc;
    }, {});
  }

  function readRecentIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function rememberRecentId(id, limit) {
    try {
      const next = [id].concat(readRecentIds().filter((item) => item !== id)).slice(0, limit);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (_) {
    }
  }

  function chooseRandom(list) {
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function chooseArtwork(modeConfig) {
    const params = getParams();
    const artworks = window.ARTWORKS || [];
    const requestedId = params.get("art") || params.get("artworkId");
    const requestedArt = artworks.find((art) => art.id === requestedId);
    if (requestedArt) return requestedArt;

    const requestedDifficulty = params.get("difficulty");
    let pool = artworks.slice();
    if (modeConfig.selectionPolicy === "care") {
      pool = artworks.filter((art) => art.difficulty === "easy");
    } else if (VALID_DIFFICULTIES.includes(requestedDifficulty)) {
      pool = artworks.filter((art) => art.difficulty === requestedDifficulty);
    } else {
      pool = artworks.slice();
    }
    if (!pool.length) pool = artworks.slice();

    const recentIds = readRecentIds();
    const freshPool = pool.filter((art) => !recentIds.includes(art.id));
    return chooseRandom(freshPool.length ? freshPool : pool);
  }

  function postHostMessage(type, payload) {
    const message = JSON.stringify({ type, payload });
    const bridge = window.ReactNativeWebView;
    if (bridge && typeof bridge.postMessage === "function") {
      bridge.postMessage(message);
      return true;
    }
    if (window.parent && window.parent !== window && typeof window.parent.postMessage === "function") {
      window.parent.postMessage(message, "*");
      return true;
    }
    window.dispatchEvent(new CustomEvent("coloring:host-message", { detail: { type, payload } }));
    return false;
  }

  function SingleIntro({ art, modeConfig, onStart }) {
    return e("main", { className: "single-intro" },
      e("section", { className: "single-intro__panel", "aria-label": "게임방법" },
        e("div", { className: "single-intro__art" },
          e("img", { src: art.thumbSrc || art.src, alt: art.title })
        ),
        e("div", { className: "single-intro__copy" },
          e("span", { className: "single-pill" }, e(Icon, { name: "pencil", size: 18 }), modeConfig.title),
          e("h1", null, modeConfig.introTitle),
          e("p", { className: "single-intro__subtitle" }, "오늘의 도안은 ", e("strong", null, art.title), "입니다. ", modeConfig.introText),
          e("div", { className: "single-intro__steps" },
            e("span", null, "원하는 색을 고르세요"),
            e("span", null, "그림을 눌러 색칠하세요"),
            e("span", null, "완성하면 저장하거나 돌아갈 수 있어요")
          ),
          e("button", { type: "button", className: "single-intro__start", onClick: onStart },
            e(Icon, { name: "check", size: 24 }),
            e("span", null, "시작하기")
          )
        )
      )
    );
  }

  function SingleCompletion({ art, fills, saved, remainingSeconds, returning, onSave, onMore, onReturn }) {
    const fillCount = Array.isArray(fills) ? fills.length : 0;
    return e("main", { className: "single-completion" },
      e(Confetti, null),
      e("div", { className: "single-completion__frame", "aria-label": "완성 작품" },
        e(CanvasArt, { art, fills, interactive: false, frameMode: "paint" })
      ),
      e("section", { className: "single-completion__copy" },
        e("span", { className: "single-pill" }, e(Icon, { name: saved ? "check" : "star", size: 18 }), saved ? "저장 완료" : "완성"),
        e("h1", null, saved ? "작품을 저장했어요" : "작품이 완성됐어요"),
        e("p", null, "조금 더 칠하거나, 저장한 뒤 효담콜 화면으로 돌아갈 수 있어요."),
        e("div", { className: "single-completion__certificate" },
          e("span", null, "완성 작품"),
          e("strong", null, art.title),
          e("small", null, fillCount, "번의 색칠 기록")
        ),
        e("div", { className: "single-completion__actions" },
          e("button", { type: "button", className: "single-completion__primary", onClick: onSave, disabled: returning },
            e(Icon, { name: "save", size: 24 }),
            e("span", null, "핸드폰에 저장")
          ),
          e("div", { className: "single-completion__row" },
            e("button", { type: "button", className: "single-completion__secondary", onClick: onMore, disabled: returning },
              e(Icon, { name: "pencil", size: 22 }),
              e("span", null, "더 칠하기")
            ),
            e("button", { type: "button", className: "single-completion__secondary", onClick: onReturn, disabled: returning },
              e(Icon, { name: "home", size: 22 }),
              e("span", null, "지금 돌아가기")
            )
          ),
          e("div", { className: "single-completion__timer", "aria-live": "polite" },
            returning ? "돌아가는 중입니다" : remainingSeconds + "초 후 자동으로 돌아갑니다"
          )
        )
      )
    );
  }

  function ReturningScreen() {
    return e("main", { className: "single-returning" },
      e("section", { className: "single-returning__panel" },
        e("span", { className: "single-pill" }, e(Icon, { name: "check", size: 18 }), "완료"),
        e("h1", null, "효담콜로 돌아갑니다"),
        e("p", null, "잠시만 기다려주세요.")
      )
    );
  }

  function SingleApp() {
    const modeConfig = React.useMemo(getModeConfig, []);
    const [art] = React.useState(() => chooseArtwork(modeConfig));
    const [screen, setScreen] = React.useState("intro");
    const [fills, setFills] = React.useState([]);
    const [history, setHistory] = React.useState([]);
    const [selected, setSelected] = React.useState((window.PALETTE && window.PALETTE[0] && window.PALETTE[0].c) || "#E0584F");
    const [saved, setSaved] = React.useState(false);
    const [remainingSeconds, setRemainingSeconds] = React.useState(Math.ceil((modeConfig.autoReturnMs || 10000) / 1000));
    const [returning, setReturning] = React.useState(false);
    const [toast, setToast] = React.useState("");
    const sentRef = React.useRef(false);
    const startedAtRef = React.useRef(Date.now());
    const playStartedAtRef = React.useRef(null);

    const flash = React.useCallback((message) => {
      setToast(message);
      window.setTimeout(() => setToast(""), 1800);
    }, []);

    const sendSessionEnd = React.useCallback((reason, patch) => {
      if (sentRef.current || !art) return;
      sentRef.current = true;
      const endedAt = Date.now();
      postHostMessage("COLORING_SESSION_END", {
        ...getHostContext(),
        mode: modeConfig.id,
        artworkId: art.id,
        title: art.title,
        difficulty: art.difficulty,
        startedAt: new Date(playStartedAtRef.current || startedAtRef.current).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        durationMs: endedAt - (playStartedAtRef.current || startedAtRef.current),
        completed: screen === "done",
        abandoned: screen !== "done",
        saved,
        fillCount: Array.isArray(fills) ? fills.length : 0,
        reason,
        ...(patch || {})
      });
    }, [art, fills, modeConfig.id, saved, screen]);

    const returnToHost = React.useCallback((reason) => {
      if (returning) return;
      setReturning(true);
      sendSessionEnd(reason, { completed: true, abandoned: false });
      setScreen("returning");
    }, [returning, sendSessionEnd]);

    React.useEffect(() => {
      if (!art) return;
      rememberRecentId(art.id, 5);
    }, [art]);

    React.useEffect(() => {
      const handlePageExit = () => {
        const completed = screen === "done" || screen === "returning";
        sendSessionEnd("page_exit", { completed, abandoned: !completed });
      };
      const handleVisibility = () => {
        if (document.visibilityState === "hidden") handlePageExit();
      };
      window.addEventListener("pagehide", handlePageExit);
      window.addEventListener("beforeunload", handlePageExit);
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        window.removeEventListener("pagehide", handlePageExit);
        window.removeEventListener("beforeunload", handlePageExit);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }, [sendSessionEnd]);

    React.useEffect(() => {
      if (screen !== "done" || returning) return;
      const timer = window.setInterval(() => {
        setRemainingSeconds((current) => {
          if (current <= 1) {
            window.clearInterval(timer);
            returnToHost("auto_return");
            return 0;
          }
          return current - 1;
        });
      }, 1000);
      return () => window.clearInterval(timer);
    }, [screen, returning, returnToHost]);

    if (!art) {
      return e("div", { className: "app single-app" },
        e("main", { className: "single-returning" },
          e("section", { className: "single-returning__panel" },
            e("h1", null, "도안을 불러오지 못했어요"),
            e("p", null, "잠시 후 다시 시도해주세요.")
          )
        )
      );
    }

    const startColoring = () => {
      playStartedAtRef.current = Date.now();
      requestAppFullscreen().finally(() => setScreen("color"));
    };

    const finish = () => {
      if ((fills || []).length < modeConfig.minPaintedToFinish) {
        flash("한 칸 이상 색칠한 뒤 완성할 수 있어요");
        return;
      }
      setRemainingSeconds(Math.ceil((modeConfig.autoReturnMs || 10000) / 1000));
      setScreen("done");
    };

    const save = async () => {
      try {
        await downloadCanvasPng(art, fills);
        setSaved(true);
        setRemainingSeconds(Math.ceil((modeConfig.autoReturnMs || 10000) / 1000));
        flash("이미지를 저장했어요");
      } catch (_) {
        flash("저장에 실패했어요");
      }
    };

    const more = () => {
      setReturning(false);
      setScreen("color");
    };

    return e("div", { className: "app single-app app--" + screen },
      screen === "intro" && e(SingleIntro, { art, modeConfig, onStart: startColoring }),
      screen === "color" && e(ColoringScreen, {
        art,
        fills,
        history,
        selected,
        onSelect: setSelected,
        onPaint: setFills,
        onHistoryChange: setHistory,
        onExit: () => setScreen("intro"),
        onFinish: finish,
        tweaks: { palettePos: "auto", paintFeedback: true },
        exitLabel: "안내",
        finishLabel: "완성하기"
      }),
      screen === "done" && e(SingleCompletion, {
        art,
        fills,
        saved,
        remainingSeconds,
        returning,
        onSave: save,
        onMore: more,
        onReturn: () => returnToHost("manual_return")
      }),
      screen === "returning" && e(ReturningScreen, null),
      toast && e("div", { className: "single-toast" }, toast)
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(e(SingleApp, null));
})();
