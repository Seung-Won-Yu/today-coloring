# 오늘의 색칠

모바일과 WebView 환경을 고려한 정적 웹 컬러링 앱입니다. 40개의 도안, 진행 기록과 갤러리, 알람·케어 단일 세션, PWA 설치와 호스트 앱 복귀 메시지를 별도 빌드 없이 제공합니다.

**[앱 실행](https://seung-won-yu.github.io/today-coloring/)** · **[테스트 허브](https://seung-won-yu.github.io/today-coloring/test-hub.html)** · **HTML/CSS/JavaScript** · **PWA**

## 실행 모드

| 모드 | 진입 주소 | 용도 |
| --- | --- | --- |
| 표준 | `index.html` | 도안을 선택하고 여러 작품을 이어서 색칠 |
| 알람 | `single.html?mode=alarm` | 자동 선택된 도안을 한 번 색칠한 뒤 호스트로 복귀 |
| 케어 | `single.html?mode=care` | 쉬운 도안 중심의 단일 세션 |
| 테스트 허브 | `test-hub.html` | 기기 프리셋, iframe 실행과 호스트 메시지 확인 |

## 주요 기능

- 난이도가 지정된 세로형 도안 40개
- 터치·마우스 색칠, 확대·이동과 반응형 캔버스
- 진행 중인 작품 자동 저장과 완성 작품 갤러리
- 최근 작품 40개 제한과 WebP 미리보기로 저장 공간 보호
- 표준·알람·케어 모드별 저장 정책 분리
- 25초 자동 복귀와 `COLORING_SESSION_END` 메시지
- PWA 전체화면·세로 방향 설정과 서비스워커 캐시
- 저사양 기기를 위한 변경 영역 중심 캔버스 갱신

## 로컬 실행

빌드 과정은 필요하지 않습니다. 저장소 루트에서 정적 서버를 실행합니다.

```bash
python3 -m http.server 8002
```

주요 로컬 주소:

```text
http://localhost:8002/
http://localhost:8002/single.html?mode=alarm
http://localhost:8002/single.html?mode=care
http://localhost:8002/test-hub.html
```

## 호스트 앱 연동

알람·케어 모드는 완료 후 사용자가 직접 돌아가거나, 마지막 상호작용으로부터 25초가 지나면 부모 창에 종료 메시지를 보냅니다.

```text
COLORING_SESSION_END
```

`test-hub.html`에서 iframe과 새 창 실행, 기기 프리셋, IN/OUT payload를 확인할 수 있습니다. 테스트 허브는 서비스워커 프리캐시에 포함하지 않습니다.

## 데이터와 캐시

- 표준모드는 진행 기록과 갤러리를 브라우저에 저장합니다.
- 알람·케어모드는 진행 기록을 복원하지 않고 항상 빈 도안으로 시작합니다.
- **색칠 기록 초기화**는 진행 중인 작품만 삭제하고 갤러리를 유지합니다.
- **기록 전체 삭제**는 2단계 확인 후 진행 기록과 갤러리를 삭제합니다.
- 스토리지 구조가 호환되지 않을 때만 `STORAGE_VERSION`을 올립니다.
- 정적 파일을 변경할 때는 HTML 자산 query와 `sw.js`의 `CACHE_VERSION`을 함께 갱신합니다.

## 프로젝트 구조

```text
assets/               앱 아이콘, 도안, 썸네일, line layer, region map
css/                  공통 화면, 색칠 UI와 테마
js/                   앱 상태, 데이터, UI 컴포넌트와 저장 로직
index.html            표준 모드 진입점
single.html           알람·케어 단일 세션 진입점
test-hub.html         통합 테스트 화면
manifest.webmanifest  PWA 메타데이터
sw.js                 정적 자산 캐시
```

## 성능 설계

- 색칠할 때 전체 캔버스를 다시 합성하지 않고 변경된 영역을 중심으로 갱신합니다.
- 화면 반영을 `requestAnimationFrame`에 맞춥니다.
- region map과 line layer 디코딩 결과를 짧게 캐시합니다.
- 확대·이동은 CSS transform을 사용해 불필요한 redraw를 줄입니다.

## 배포

`main` 브랜치의 정적 파일을 GitHub Pages에서 제공합니다. 앱을 갱신할 때는 서비스워커와 자산 query 버전을 같은 배포 번호로 맞춰 이전 캐시가 남지 않도록 합니다.

모바일 설치 기준은 전체화면 세로 모드이며, 지원 브라우저에서는 앱 시작 시 화면 방향 잠금을 추가로 시도합니다.

## 확인 항목

- 모바일·태블릿·데스크톱 표준 모드
- 알람·케어 단일 세션과 호스트 복귀 메시지
- 진행 기록·갤러리 저장과 삭제 정책
- PWA 설치, 서비스워커 등록과 캐시 갱신
- 터치 색칠, 확대·이동과 반응형 레이아웃
