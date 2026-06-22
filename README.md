# 오늘의 색칠

모바일과 태블릿에서 한 장씩 고르고 천천히 완성하는 정적 웹 컬러링 앱입니다. 별도 빌드 없이 실행되며, GitHub Pages에 바로 배포됩니다.

**실행 주소:** [https://seung-won-yu.github.io/today-coloring/](https://seung-won-yu.github.io/today-coloring/)

![오늘의 색칠 미리보기](assets/readme/preview.png)

## 주요 기능

- 40장 WebP 컬러링 도안과 썸네일
- 36색 팔레트, 현재 색 표시, 하단 팔레트 스크롤 버튼
- 사전 생성 region map 기반 색칠 엔진
- 선 레이어 합성으로 흰 테두리와 색 번짐 완화
- 미채색 영역 원본 톤 보존
- 되돌리기, 처음부터, 확대 보기
- 작품별 진행 저장과 undo 기록 유지
- 완성 작품 갤러리 보관, 스냅샷, 이미지 저장
- PWA manifest와 서비스워커 캐시
- 글씨 크기, 테마, 색칠 반응 설정

## 실행

로컬에서는 정적 서버만 켜면 됩니다.

```bash
python3 -m http.server 8002
```

브라우저에서 `http://localhost:8002`로 접속합니다.

## 테스트

전체 검증:

```bash
node tests/run-all.js
```

주요 테스트:

- `tests/cache-version-consistency.test.js`: `index.html`, `sw.js`, CSS import 캐시 버전 일치
- `tests/paint-engine.test.js`: 색칠 엔진, 레이어 합성, region map 동작
- `tests/region-map-assets.test.js`: 모든 도안의 region map 존재와 manifest 확인
- `tests/storage-version.test.js`: 진행/갤러리/설정 저장 포맷
- `tests/service-worker-fetch.test.js`: 서비스워커 캐시 정책

반응형 QA 기준은 [docs/responsive-qa.md](docs/responsive-qa.md)에 정리되어 있습니다.

## 색칠 엔진 구조

현재 색칠 흐름은 다음 순서로 동작합니다.

1. WebP 원본 도안을 안전한 paint 프레임으로 맞춥니다.
2. 사전 생성된 `assets/regionmaps/paint/*.png`를 읽어 영역 라벨을 사용합니다.
3. region map을 사용할 수 없으면 `paintFillLayerSeed` fallback으로 채웁니다.
4. 채움 레이어와 선 레이어를 합성합니다.
5. 칠하지 않은 픽셀은 원본 도안의 음영과 색을 보존합니다.

도안별 line layer와 region map은 `assets/linelayers/paint/`, `assets/regionmaps/paint/` 아래에 있습니다.

## 캐시 갱신 규칙

정적 배포라 파일을 바꾸면 캐시 버전을 같이 올립니다.

- JS 파일 변경: `index.html`의 해당 script query와 `sw.js`의 `APP_SHELL` query 갱신
- CSS 파일 변경: `css/styles.css` import query 또는 `index.html` stylesheet query 갱신
- 서비스워커 shell 변경: `CACHE_NAME`과 `sw.js?v=...` 갱신
- 도안/region map/line layer 변경: `js/data/artworks.js`의 artwork asset version 갱신

캐시 버전 일치는 `node tests/cache-version-consistency.test.js`로 확인합니다.

## 폴더 구조

```text
assets/              앱 아이콘, 도안, 썸네일, line layer, region map
css/                 화면별 스타일과 테마
docs/                반응형 QA 기준 문서
js/data/             도안과 팔레트 데이터
js/ui/               공용 UI 컴포넌트
js/utils/            저장소, 색칠 엔진, 에셋 로더, 이미지 저장 유틸
tests/               Node 기반 회귀 테스트
tools/               도안 보조 에셋 생성 스크립트
index.html           앱 시작 파일
manifest.webmanifest PWA 설정
sw.js                서비스워커 캐시
```

## 배포

`main` 브랜치에 푸시하면 GitHub Pages로 배포됩니다. 배포 전에는 최소한 아래를 확인합니다.

```bash
node tests/run-all.js
git status --short --branch
```
