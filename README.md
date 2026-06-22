# 오늘의 색칠

정적 웹으로 실행되는 컬러링 게임입니다. 별도 빌드 없이 `index.html`을 기준으로 실행되며, GitHub Pages에 바로 배포됩니다.

**실행 주소:** [https://seung-won-yu.github.io/today-coloring/](https://seung-won-yu.github.io/today-coloring/)

## 실행

로컬에서는 정적 서버만 켜면 됩니다.

```bash
python3 -m http.server 8002
```

브라우저에서 `http://localhost:8002`로 접속합니다.

## 구성

```text
assets/              앱 아이콘, 도안, 썸네일, line layer, region map
css/                 화면별 스타일과 테마
js/                  앱 로직, 데이터, UI 컴포넌트, 유틸, React vendor 파일
index.html           앱 시작 파일
manifest.webmanifest PWA 설정
sw.js                서비스워커 캐시
```

## 배포

`main` 브랜치에 푸시하면 GitHub Pages로 배포됩니다. 정적 파일 캐시를 쓰기 때문에 JS, CSS, 서비스워커를 바꿀 때는 `index.html`, `css/styles.css`, `sw.js`의 버전 query도 같이 갱신합니다.
