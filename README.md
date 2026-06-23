# 오늘의 색칠

정적 웹으로 실행되는 컬러링 게임입니다. 별도 빌드 없이 HTML/CSS/JS 파일만으로 실행되며, GitHub Pages에 바로 배포됩니다.

**실행 주소:** [https://seung-won-yu.github.io/today-coloring/](https://seung-won-yu.github.io/today-coloring/)

**테스트 허브:** [https://seung-won-yu.github.io/today-coloring/test-hub.html](https://seung-won-yu.github.io/today-coloring/test-hub.html)

## 실행

로컬에서는 정적 서버만 켜면 됩니다.

```bash
python3 -m http.server 8002
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:8002/index.html
http://localhost:8002/index.html?mode=standard
http://localhost:8002/single.html?mode=alarm
http://localhost:8002/single.html?mode=care
http://localhost:8002/test-hub.html
```

## 모드

`index.html`
: 표준모드입니다. 도안 목록에서 원하는 작품을 고르고 여러 작품을 이어서 색칠할 수 있습니다.

`index.html?mode=standard`
: 표준모드 명시 호출입니다. 공통 진입점에서 `single.html?mode=standard`로 들어오더라도 `index.html?mode=standard`로 이동합니다.

`single.html?mode=alarm`
: 알람모드입니다. 도안을 자동으로 고른 뒤 게임방법 안내를 거쳐 1회 플레이로 진행합니다.

`single.html?mode=care`
: 케어모드입니다. 쉬운 도안 위주로 자동 선택하고 알람모드와 같은 1회 플레이 흐름으로 진행합니다.

알람/케어모드는 완료 화면에서 `핸드폰에 저장`, `더 칠하기`, `지금 돌아가기`를 제공합니다. 별도 조작이 없으면 10초 후 `COLORING_SESSION_END` 메시지를 전송해 호스트 앱으로 복귀할 수 있게 합니다.

## 테스트 허브

`test-hub.html`
: 효담콜 WebView 없이 게임을 iframe 또는 새 창으로 실행하는 개발용 테스트 페이지입니다. `standard`는 `index.html` 표준모드를 열고, `alarm`, `care`는 `single.html` 단일 세션을 엽니다. 기기 프리셋을 바꿔가며 실행할 수 있고, 단일 세션 종료 시 넘어오는 `COLORING_SESSION_END` payload를 IN/OUT 패널에서 확인할 수 있습니다.

테스트 허브에서 `게임 실행`은 가운데 기기 프레임 안에서 실행하고, `새 창에서 실행`은 생성된 실제 URL을 새 탭으로 엽니다. 단일 세션 모드에서 도안을 비워두면 난이도 기준으로 랜덤 도안이 선택됩니다. 표준모드는 기존 목록 화면에서 직접 도안을 고르는 방식입니다.

테스트 허브는 서비스워커 프리캐시에 포함하지 않습니다. 로컬 서버나 GitHub Pages URL에서 직접 열어 사용합니다. GitHub Pages 캐시가 남아 있으면 브라우저에서 강력 새로고침 후 확인합니다.

## 구성

```text
assets/              앱 아이콘, 도안, 썸네일, line layer, region map
css/                 화면별 스타일과 테마
js/                  앱 로직, 데이터, UI 컴포넌트, 유틸, React vendor 파일
index.html           표준모드 시작 파일
single.html          알람/케어 단일 세션 시작 파일
test-hub.html        standard/alarm/care 개발 테스트 허브
manifest.webmanifest PWA 설정
sw.js                서비스워커 캐시
```

도안은 `vertical-01`부터 `vertical-40`까지 정리되어 있으며, 난이도 정보는 `js/data/artworks.js`의 `difficulty` 값 하나를 기준으로 사용합니다.

## 배포

`main` 브랜치에 푸시하면 GitHub Pages로 배포됩니다. 정적 파일 캐시를 쓰기 때문에 JS, CSS, 서비스워커를 바꿀 때는 `index.html`, `single.html`, `css/styles.css`, `sw.js`의 버전 query도 같이 갱신합니다.
