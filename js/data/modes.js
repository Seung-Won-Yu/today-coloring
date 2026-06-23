(function() {
  window.COLORING_MODES = {
    alarm: {
      id: "alarm",
      title: "알람 색칠",
      introTitle: "오늘의 색칠을 시작해요",
      introText: "안내를 보고 시작하면 한 작품을 차분히 완성할 수 있어요.",
      selectionPolicy: "alarm",
      minPaintedToFinish: 1,
      autoReturnMs: 10000,
      returnToHost: true
    },
    care: {
      id: "care",
      title: "케어 색칠",
      introTitle: "가볍게 한 장 색칠해요",
      introText: "쉬운 도안부터 천천히 색을 채워볼게요.",
      selectionPolicy: "care",
      minPaintedToFinish: 1,
      autoReturnMs: 10000,
      returnToHost: true
    }
  };

})();
