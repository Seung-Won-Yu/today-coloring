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

알람/케어모드는 완료 화면에서 `핸드폰에 저장`, `더 칠하기`, `지금 돌아가기`를 제공합니다. 별도 조작이 없으면 25초 후 `COLORING_SESSION_END` 메시지를 전송해 호스트 앱으로 복귀할 수 있게 합니다. 완료 화면을 누르면 자동 종료 시간이 다시 25초로 늘어납니다.

## 저장 정책

표준모드는 진행 중인 색칠 기록과 갤러리 저장 기록을 유지합니다.

앱 배포 버전이나 파일 캐시 버전이 바뀌어도 표준모드 저장 데이터는 일괄 삭제하지 않습니다. 데이터 스키마가 바뀌는 경우에만 `js/utils/storage.js`의 `STORAGE_VERSION`을 올려 새 저장 키를 사용합니다. 앱 부팅 시 현재 저장 키가 아닌 구버전 `sori_*` 키는 자동 정리됩니다.

표준모드 설정에는 `색칠 기록 초기화`가 있습니다. 이 기능은 모든 도안의 진행 중 색칠 기록만 지우며, 갤러리에 보관한 완성 작품은 유지합니다.

설정 최하단의 `기록 전체 삭제`는 2단 확인 후 진행 작품과 갤러리만 모두 비웁니다. 글자 크기, 테마, 색칠 반응 같은 설정값은 유지됩니다.

갤러리는 저장 공간 보호를 위해 최근 40개까지 보관합니다. 갤러리 미리보기 이미지는 원본 크기가 아니라 표시용 WebP 스냅샷으로 저장합니다. 저장 공간이 부족하면 오래된 미리보기 스냅샷을 먼저 줄이고, 그래도 저장에 실패하면 사용자에게 안내 메시지를 표시합니다. 완성 기록 자체는 가능한 유지하는 방향으로 처리합니다.

알람/케어모드는 도안 이미지, region map, line layer 같은 정적 파일 캐시는 사용할 수 있지만, 색칠 진행 기록은 복원하지 않습니다. 같은 도안이 랜덤 로테이션으로 다시 선택되어도 항상 빈 도안으로 시작하며, 최근 선택 도안 ID만 로테이션 목적으로 저장합니다.

## 성능 최적화

색칠 화면은 저사양 기기에서의 체감 지연을 줄이기 위해 다음 최적화를 적용합니다.

- 색칠 후 전체 캔버스를 매번 다시 합성하지 않고 변경된 영역 중심으로 갱신합니다.
- 클릭/터치 후 화면 반영은 `requestAnimationFrame`에 맞춰 처리합니다.
- region map과 line layer 디코딩 결과를 짧게 캐시해 같은 도안 재진입 시 반복 작업을 줄입니다.
- 확대/이동은 CSS transform 기반으로 처리하며, 확대 상태에서 불필요한 전체 redraw를 피합니다.

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

`main` 브랜치에 푸시하면 GitHub Pages로 배포됩니다. 정적 파일 캐시를 쓰기 때문에 JS, CSS, 서비스워커를 바꿀 때는 `index.html`, `single.html`, `test-hub.html`, `css/styles.css`의 정적 파일 query와 `sw.js`의 `CACHE_VERSION`을 같은 배포 번호로 맞춥니다.

현재 정적 파일 캐시 버전은 `13`입니다. 서비스워커 프리캐시는 `CACHE_VERSION` 한 곳에서 query를 붙이므로, 수동으로 여러 파일 버전을 서로 다르게 관리하지 않습니다.

정식 배포 이후 파일 캐시 버전은 배포 갱신용 번호로 계속 증가시킵니다. 스토리지 버전은 데이터 구조가 호환되지 않을 때만 올리고, 사용자 색칠 기록 초기화는 캐시 버전 변경이 아니라 설정의 초기화 기능으로 처리합니다.

## 제출 패키지

최신 제출용 압축 파일은 `today-coloring-final-delivery-20260625-v13.zip`입니다. 압축 파일에는 실행에 필요한 `ColoringApp` 정적 파일만 포함하며, Git 메타데이터, 테스트 산출물, 작업 문서, 이전 제출 zip은 포함하지 않습니다.

## 최종 확인

v13 기준으로 다음 항목을 확인했습니다.

- JavaScript 문법 검사
- 서비스워커 등록
- 모바일, 태블릿, 데스크톱 표준모드 흐름
- 모바일, 태블릿, 데스크톱 알람모드 흐름
- 모바일, 태블릿, 데스크톱 케어모드 흐름
- 표준모드 갤러리 보관 및 저장 공간 보호 fallback
